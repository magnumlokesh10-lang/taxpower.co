# FormSubmit email setup

Both quick callback and detailed enquiry forms share `js/form-backend.js` and send to https://formsubmit.co/ajax/sales@taxpower.co. All Products expands to GST, Billing and TDS. No Python hosting, SMTP password, Google Sheet, Apps Script or database is required.

## Activate and verify

1. After GitHub Pages deploys, hard-refresh https://taxpower.co/home and submit a clearly marked TEST callback with your own contact details.
2. Open sales@taxpower.co in Titan. Check Inbox and Spam for FormSubmit's activation email and confirm the website/email pairing.
3. Submit a fresh test after activation. Check the enquiry email arrives. Then test the detailed form and All Products. Activation and inbox delivery have NOT been verified by the code change.
4. The two forms use the same recipient endpoint. Follow any additional activation prompt if FormSubmit requests it for another origin. Never share your mailbox password.

The browser requires a readable successful JSON response. Provider rejection, HTTP errors and timeouts keep the details and show a retry message. A success response means FormSubmit accepted the request; it is not proof of final mailbox delivery or activation. No automatic retry is performed. A manual retry after a timeout can duplicate an email: use the included reference to identify duplicates. Pending requests on the same form are coalesced locally.

AJAX preserves the existing inline success/error UI. CAPTCHA is disabled for this flow; the existing hidden website field is checked and mapped to FormSubmit's `_honey` field. This is basic spam filtering, not a server-enforced rate limit. Monitor abuse; use FormSubmit's native CAPTCHA flow if stronger filtering is needed.

All entered form details, including optional GSTIN/address when supplied, are processed by FormSubmit and emailed to sales. Their documentation states that submissions are retained in an archive for 30 days. Inform customers appropriately in your privacy notice. Do not collect passwords, OTPs or tax documents.

Documentation: https://formsubmit.co/documentation
