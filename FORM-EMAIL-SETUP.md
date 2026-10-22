# Google Apps Script → sales@taxpower.co (email only)

FormSubmit and the custom Python backend are removed. No Google Sheet, spreadsheet ID, SMTP password or paid hosting is needed. Both website forms use the same standalone script. Messages are sent by the Google account that owns/executes the deployment to sales@taxpower.co; Reply-To is the customer's email.

## One-time setup

1. Open https://script.google.com with your Gmail account. Click New project and name it `TaxPower Website Mail`.
2. Replace all Code.gs contents with `google-apps-script/taxpower-mail.gs` from this repository. Save.
3. Select `testEmail` in the function dropdown and click Run. Review permissions using the same Gmail account and authorize email sending. Only authorize your own project after reviewing the pasted code. If an unverified-app screen appears, confirm the project is yours; do not bypass a managed-account/admin restriction.
4. Check sales@taxpower.co Inbox/Spam for `TaxPower — Apps Script email test`. This isolates mailbox delivery from the website. If missing, inspect Apps Script Executions and check ordinary Gmail-to-sales email delivery before deploying.
5. Deploy → New deployment → select Web app. Execute as: Me. Who has access: Anyone (not 'Anyone with a Google account'). Deploy and authorize if requested. If Anyone is unavailable, account/admin restrictions must be resolved; visitors must not need Google sign-in.
6. Copy the Web app URL ending `/exec` and send that public endpoint URL to the website maintainer. Do not send passwords or OAuth tokens. `/dev` is for editors only.
7. Set that URL in `js/form-backend.js` → TAXPOWER_FORM_ENDPOINT and push. It is currently blank, so public forms will report an error until this step is completed.
8. Open `/exec` while signed out: it should return JSON identifying the TaxPower email-only service. Test one quick callback and one detailed enquiry from the actual website; verify receipt in the sales inbox, All Products, Reply-To, and retry reference handling. No live deployment or delivery has been verified by the repository update.

For future script edits use Deploy → Manage deployments → Edit → New version → Deploy to preserve the same endpoint. Never treat an opaque no-cors response as success: website code requires readable JSON and a matching enquiry reference.

## Limits and privacy

MailApp has Google-account daily quotas, shared with other scripts. The backend checks remaining quota and limits attempts to 80/day globally and five per email per ten minutes. This is basic abuse protection; email addresses can be forged and an attacker could exhaust the global cap. No customer confirmation/autoreply is sent. Monitor Executions and inbox delivery.

Script Properties store only hashes/fingerprints, counters and expiry timestamps for throttling and 24-hour duplicate suppression. Expired records are removed on subsequent validated requests. Enquiry content is not stored in Sheets or Script Properties. Google processes the request and email; your Titan inbox retains mail under its normal settings. No FormSubmit requests are made; historical FormSubmit submissions/activation are not erased by removing website code.

MailApp returning successfully is acceptance for sending, not a delivery receipt. A rare interruption after sending but before saving the request hash can lead to a duplicate retry. No automatic retries occur. The same browser request reference suppresses ordinary duplicate submissions for 24 hours.

Official deployment docs: https://developers.google.com/apps-script/guides/web
MailApp: https://developers.google.com/apps-script/reference/mail/mail-app
