/* Redeploy google-apps-script/taxpower-enquiry.gs for validation and references.
 * Never treat an opaque response as a confirmed save. */
window.TAXPOWER_FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz8GTacY-V0Loi3-MtnOdzExnGv3b5uCqRLTgqhEiR_ibXYGRF9t9ETljXDKbxdesIQ/exec';
(function () {
  'use strict';
  const pending = new WeakMap();
  const requests = new WeakMap();
  window.sendDemoEnquiryToBackend = function (form) {
    if (pending.has(form)) return pending.get(form);
    const data = Object.fromEntries(new FormData(form));
    Object.keys(data).forEach(key => { data[key] = String(data[key]).trim(); });
    data.product = Array.from(form.querySelectorAll('input[name="product"]:checked')).map(i => i.value).join(', ');
    data.page = window.location.href;
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
      if (result.result !== 'success') throw new Error('Enquiry not accepted');
      return result;
    }).finally(() => { clearTimeout(timer); pending.delete(form); });
    pending.set(form, promise);
    return promise;
  };
})();
