/* Delegated interactions work on support.html and the dynamically loaded home page. */
(() => {
  let opener;
  function openDetailedFromHash() {
    if (location.hash === '#demo-enquiry') {
      const details = document.getElementById('demo-enquiry');
      if (details?.tagName === 'DETAILS') details.open = true;
    }
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-quick-enquiry-open]');
    const dialog = document.getElementById('quickEnquiryDialog');
    if (trigger && dialog) {
      opener = trigger;
      dialog.showModal();
      dialog.querySelector('input[name="name"]').focus();
    }
    if (event.target.closest('[data-quick-enquiry-close]') && dialog) dialog.close();
    if (event.target.closest('a[href$="#demo-enquiry"], [data-demo-form-open]')) {
      const details = document.getElementById('demo-enquiry');
      if (details?.tagName === 'DETAILS') details.open = true;
    }
  }, true);
  document.addEventListener('close', event => {
    if (event.target.id === 'quickEnquiryDialog' && opener?.isConnected) opener.focus();
  }, true);
  window.addEventListener('hashchange', openDetailedFromHash);
  document.addEventListener('taxpower:sections-loaded', openDetailedFromHash);
  openDetailedFromHash();

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
      status.textContent = 'Thank you! Our sales team will contact you.' + (result.reference ? ' Reference: ' + result.reference : '');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Retry callback request';
      status.classList.add('is-error');
      status.textContent = 'We could not confirm your request. Your details are saved here. Please retry or email support@taxpower.co.';
    } finally {
      fields.forEach(input => { input.disabled = false; });
      delete form.dataset.sending;
      form.removeAttribute('aria-busy');
    }
  });
})();
