/* Paste the new email-only Apps Script Web app /exec URL here after deployment. */
window.TAXPOWER_FORM_ENDPOINT = '';
(function () {
  'use strict';
  const pending = new WeakMap();
  const requests = new WeakMap();
  window.sendDemoEnquiryToBackend = function (form) {
    if (!window.TAXPOWER_FORM_ENDPOINT) return Promise.reject(new Error('Email service is not configured yet.'));
    if (pending.has(form)) return pending.get(form);
    const data = Object.fromEntries(new FormData(form));
    Object.keys(data).forEach(key => { data[key] = String(data[key]).trim(); });
    if (form.querySelector('input[name="product"]')) data.product = Array.from(form.querySelectorAll('input[name="product"]:checked')).map(i => i.value).join(', ');
    if (data.website) return Promise.reject(new Error('Request rejected.'));
    data.page = window.location.origin + window.location.pathname;
    const fingerprint = JSON.stringify(data);
    let request = requests.get(form);
    if (!request || request.fingerprint !== fingerprint) {
      request = {fingerprint, id: 'TP-' + crypto.randomUUID()};
      requests.set(form, request);
    }
    data.requestId = request.id;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const promise = fetch(window.TAXPOWER_FORM_ENDPOINT, {
      method: 'POST', body: new URLSearchParams(data), signal: controller.signal,
      credentials: 'omit', redirect: 'follow'
    }).then(async response => {
      if (!response.ok || response.type === 'opaque') throw new Error('Unconfirmed response');
      const result = await response.json();
      if (result.result !== 'success' || result.reference !== request.id) throw new Error('Enquiry not accepted');
      document.dispatchEvent(new CustomEvent('taxpower:enquiry-saved'));
      // MailApp acceptance is not proof of final inbox delivery.
      return { result: 'success', reference: request.id };
    }).finally(() => { clearTimeout(timer); pending.delete(form); });
    pending.set(form, promise);
    return promise;
  };
})();
