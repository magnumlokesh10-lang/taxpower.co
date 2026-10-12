# Sales enquiry backend update

The website uses one Google Apps Script endpoint. GitHub Pages does not host an `/api/public/enquiry` API. An opaque `no-cors` response is not proof that an enquiry was saved.

## Update the existing deployment

1. Open the Apps Script project serving the `/exec` URL in `js/form-backend.js`.
2. Use `taxpower-enquiry.gs` for a spreadsheet-bound project, or `taxpower-enquiry-standalone.gs` for a standalone project. Do not paste both files into one project.
3. Preserve the existing Sheet ID (standalone), sheet name, notification email and any configured WhatsApp credentials. Repository placeholders are not working credentials.
4. Save the code. Choose **Deploy → Manage deployments → Edit → New version → Deploy**, executing as the owner with public web-app access. Updating the existing deployment preserves its URL.
5. If creating a different deployment, update `window.TAXPOWER_FORM_ENDPOINT` in `js/form-backend.js` to its `/exec` URL.
6. From the actual website, submit one clearly identified test enquiry. Confirm one row in the Google Sheet, the displayed enquiry reference, and the email notification. Repeating the same request ID should not create another row.

The existing 12 columns retain their order; column 13 becomes Enquiry Reference. Confirm that this column is available before deployment if the live sheet has custom columns. The server validates fields, escapes formula-like sheet values, uses a honeypot, and limits new requests per email with a short-lived cache. This is basic spam protection, not a complete anti-abuse service.

The browser expects readable JSON `{ "result": "success", "reference": "TP-…" }`. Existing backend versions returning `{ "result": "success" }` remain compatible but do not provide a reference or the new server protections. If access settings or CORS prevent reading a response, the form retains details and reports that confirmation was unavailable; it never assumes that saving failed or succeeded. Retry IDs are retained in the current page session. Reloading starts a new session.

Saving the row is authoritative. Notification failures are logged separately and do not turn a successful save into an error. Monitor Apps Script executions for failed alerts. GitHub changes alone do not deploy Apps Script. No live test enquiry was submitted during the code update.
