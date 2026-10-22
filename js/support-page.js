/* Delegated interactions work on support.html and the dynamically loaded home page. */
(() => {
  if (window.taxPowerQuickEnquiryInitialized) return;
  window.taxPowerQuickEnquiryInitialized = true;
  let opener, dialog, loading, autoTimer, mobilePrompt;
  let shown = false;
  const cooldownKey = 'taxpower-quick-enquiry-until';
  const day = 24 * 60 * 60 * 1000;
  let cooldownUntil = 0;
  function readCooldown() {
    for (const storageName of ['localStorage', 'sessionStorage']) {
      try {
        const value = Number(window[storageName].getItem(cooldownKey));
        if (Number.isFinite(value)) cooldownUntil = Math.max(cooldownUntil, value);
      } catch (_) { /* In-memory protection remains when storage is unavailable. */ }
    }
    return cooldownUntil;
  }
  function suppressAutoPopup(duration) {
    cooldownUntil = Math.max(readCooldown(), Date.now() + duration);
    for (const storageName of ['localStorage', 'sessionStorage']) {
      try { window[storageName].setItem(cooldownKey, String(cooldownUntil)); } catch (_) {}
    }
    clearTimeout(autoTimer);
    autoTimer = null;
    if (mobilePrompt) mobilePrompt.hidden = true;
  }
  const autoBlocked = () => readCooldown() > Date.now();
  document.addEventListener('taxpower:enquiry-saved', () => suppressAutoPopup(7 * day));
  window.addEventListener('storage', event => {
    if (event.key === cooldownKey && autoBlocked()) {
      clearTimeout(autoTimer);
      autoTimer = null;
      if (mobilePrompt) mobilePrompt.hidden = true;
    }
  });
  const root = document.createElement('div');
  root.id = 'quickEnquiryRoot';
  const floating = document.createElement('button');
  floating.type = 'button';
  floating.className = 'quick-enquiry-floating';
  floating.dataset.quickEnquiryOpen = '';
  floating.setAttribute('aria-haspopup', 'dialog');
  floating.setAttribute('aria-controls', 'quickEnquiryDialog');
  floating.innerHTML = '<span aria-hidden="true">✉</span><span>Quick Enquiry</span>';
  root.appendChild(floating);
  document.body.appendChild(root);
  mobilePrompt = document.createElement('div');
  mobilePrompt.className = 'quick-enquiry-prompt';
  mobilePrompt.hidden = true;
  mobilePrompt.innerHTML = '<button type="button" data-quick-enquiry-open>Need a demo? Request a callback →</button><button type="button" class="quick-enquiry-prompt-dismiss" aria-label="Dismiss callback suggestion">×</button>';
  root.appendChild(mobilePrompt);
  mobilePrompt.querySelector('.quick-enquiry-prompt-dismiss').addEventListener('click', () => {
    suppressAutoPopup(day);
    floating.focus();
  });

  function adoptDialog(candidate) {
    if (!dialog && candidate) {
      dialog = candidate;
      root.appendChild(dialog);
    }
    // The home page may load its support section after a standalone copy was fetched.
    document.querySelectorAll('#quickEnquiryDialog').forEach(node => {
      if (dialog && node !== dialog) node.remove();
    });
    return dialog;
  }
  function ensureDialog() {
    const existing = adoptDialog(document.getElementById('quickEnquiryDialog'));
    if (existing) return Promise.resolve(existing);
    if (loading) return loading;
    loading = fetch('support.html', {cache: 'no-cache'})
      .then(response => { if (!response.ok) throw new Error('Unable to load enquiry'); return response.text(); })
      .then(html => {
        const page = new DOMParser().parseFromString(html, 'text/html');
        const candidate = document.getElementById('quickEnquiryDialog') || page.getElementById('quickEnquiryDialog');
        if (!candidate) throw new Error('Enquiry form unavailable');
        return adoptDialog(candidate);
      }).finally(() => { loading = null; });
    return loading;
  }
  function showEnquiry(trigger) {
    if (!dialog || dialog.open) return;
    opener = trigger || floating;
    mobilePrompt.hidden = true;
    dialog.showModal();
    floating.hidden = true;
    shown = true;
    clearTimeout(autoTimer);
    dialog.querySelector('input[name="name"]').focus();
  }
  function scheduleAutoPopup() {
    if (shown || autoTimer || autoBlocked()) return;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (shown || autoBlocked()) return;
      // Wait if the visitor is already typing or using another dialog.
      if (document.hidden || document.querySelector('dialog[open]') ||
          document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) {
        scheduleAutoPopup(); return;
      }
      const mobile = window.matchMedia ? window.matchMedia('(max-width: 650px)').matches : window.innerWidth <= 650;
      if (mobile) {
        mobilePrompt.hidden = false;
        shown = true;
      } else showEnquiry();
    }, 10000);
  }
  function openDetailedFromHash() {
    if ((window.TaxPowerRoutes?.hash() || location.hash) === '#demo-enquiry') {
      const details = document.getElementById('demo-enquiry');
      if (details?.tagName === 'DETAILS') details.open = true;
    }
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-quick-enquiry-open]');
    if (trigger) {
      if (dialog) showEnquiry(trigger);
      else {
        trigger.disabled = true;
        ensureDialog().then(() => showEnquiry(trigger)).catch(() => {
          window.location.href = 'support.html';
        }).finally(() => { trigger.disabled = false; });
      }
    }
    if (event.target.closest('[data-quick-enquiry-close]') && dialog) dialog.close();
    if (event.target.closest('a[href$="#demo-enquiry"], [data-demo-form-open]')) {
      const details = document.getElementById('demo-enquiry');
      if (details?.tagName === 'DETAILS') details.open = true;
    }
  }, true);
  document.addEventListener('close', event => {
    if (event.target.id !== 'quickEnquiryDialog') return;
    suppressAutoPopup(day);
    floating.hidden = false;
    if (opener?.isConnected) opener.focus();
  }, true);
  window.addEventListener('hashchange', openDetailedFromHash);
  document.addEventListener('taxpower:sections-loaded', () => {
    openDetailedFromHash();
    adoptDialog(document.getElementById('quickEnquiryDialog'));
    if (dialog) scheduleAutoPopup();
  });
  openDetailedFromHash();
  ensureDialog().then(scheduleAutoPopup).catch(() => { /* Floating button retries on demand. */ });

  function errorFor(input, message) {
    input.setAttribute('aria-invalid', String(Boolean(message)));
    const error = input.parentElement.querySelector('.quick-field-error');
    if (error) {
      error.id = 'quick-error-' + input.name;
      input.setAttribute('aria-describedby', error.id);
      error.textContent = message;
    }
  }
  document.addEventListener('input', event => {
    const form = event.target.closest('#quickEnquiryForm');
    if (!form || form.dataset.sending) return;
    errorFor(event.target, '');
    if (form.dataset.sent) {
      delete form.dataset.sent;
      form.querySelector('[type="submit"]').disabled = false;
      form.querySelector('[type="submit"]').textContent = 'Request a callback →';
      form.querySelector('.quick-enquiry-status').textContent = '';
    }
  });
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.id !== 'quickEnquiryForm') return;
    event.preventDefault();
    if (form.dataset.sending || form.dataset.sent) return;
    const fields = Array.from(form.querySelectorAll('[required]'));
    let firstInvalid;
    fields.forEach(input => {
      input.value = input.value.trim();
      if (input.name === 'mobile') {
        let value = input.value.replace(/\D/g, '');
        if (value.length === 12 && value.startsWith('91')) value = value.slice(2);
        if (value.length === 11 && value.startsWith('0')) value = value.slice(1);
        input.value = value;
      }
      const message = !input.value ? 'Please complete this field.' : !input.checkValidity() ?
        (input.name === 'mobile' ? 'Enter a 10-digit mobile number.' : 'Please enter a valid email address.') : '';
      errorFor(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector('.quick-enquiry-status');
    form.dataset.sending = 'true';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = 'Sending…';
    status.classList.remove('is-error');
    status.textContent = 'Sending your callback request…';
    try {
      if (typeof window.sendDemoEnquiryToBackend !== 'function') throw new Error('Service unavailable');
      const submission = window.sendDemoEnquiryToBackend(form);
      fields.forEach(input => { input.disabled = true; });
      const result = await submission;
      if (result?.result !== 'success') throw new Error('Unconfirmed submission');
      form.dataset.sent = 'true';
      button.textContent = 'Request received';
      status.textContent = 'Thank you! Our sales team will contact you.';
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Retry callback request';
      status.classList.add('is-error');
      status.textContent = 'We could not confirm your request. Your details are saved here. Please retry or email sales@taxpower.co.';
    } finally {
      fields.forEach(input => { input.disabled = false; });
      delete form.dataset.sending;
      form.removeAttribute('aria-busy');
    }
  });
})();
