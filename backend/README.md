# TaxPower private email backend

Status: ready for local testing, NOT deployed. The website endpoint is deliberately blank until a working HTTPS backend is available. Both forms will retain details and show an error until setup is complete. GitHub Pages cannot execute this Python service.

Both forms POST to `/enquiry`. This service sends plain-text email to the fixed `sales@taxpower.co` recipient using GoDaddy/Titan SMTP over certificate-verified TLS. Customer email becomes Reply-To, never the sender or recipient. No Google Sheets, Apps Script, WhatsApp or external form service is used.

## Try locally

Requires Python 3.11+. Run `cd backend && python -m unittest -v`. Tests mock SMTP and do not send email. For a real local test, securely set the environment variables in `.env.example` in your terminal/hosting secrets, then run `python app.py`. The example file is documentation only, not automatically loaded. Never commit a real password or paste it in chat. Use a locally served frontend with its endpoint set to `http://127.0.0.1:8000/enquiry` and add that exact frontend origin to ALLOWED_ORIGINS. Do not put localhost URLs into the live site.

## Deploy

1. Choose Python hosting with outbound TCP port 465 permitted and a persistent writable directory. PHP-only hosting will not run this backend. No hosting account or plan has been purchased.
2. Install `pip install -r requirements.txt` in an isolated virtual environment. Set the variables from `.env.example` via hosting secrets. Use a private persistent STATE_DIR, outside any static web root, writable only by the service user.
3. Run `gunicorn --bind 127.0.0.1:8000 --workers 2 --timeout 60 app:application` from this directory. Put an HTTPS reverse proxy in front. Bind publicly only as required by a managed hosting platform with HTTPS ingress.
4. Point `api.taxpower.co` to the backend host and issue a TLS certificate, or use the host's HTTPS service URL. DNS/hosting access is required. The backend directory must never be served as static content.
5. Reverse proxy: limit body size to 16 KB, rate-limit per real client IP, disable request-body logging, and preserve the Origin header. The application deliberately does not trust arbitrary X-Forwarded-For values. Behind a proxy, app-level IP throttling is conservative and may group clients; configure ingress rate limits. CORS is not bot authentication.
6. Set `window.TAXPOWER_FORM_ENDPOINT` in `js/form-backend.js` to the deployed HTTPS URL ending `/enquiry`, push, then hard-refresh. This is the only frontend deployment setting.
7. Send one explicitly marked TEST enquiry from each form and check the Titan inbox/spam folder. Verify All Products, Reply-To and retry behaviour. Only a confirmed SMTP acceptance returns success; that still does not guarantee final inbox delivery.

Official GoDaddy SMTP settings: https://www.godaddy.com/en-au/help/set-up-third-party-plugins-or-websites-using-smtp-settings-42788 — smtpout.secureserver.net, SSL port 465. Use your full email address as SMTP_USER. If login fails, confirm external SMTP access with GoDaddy/Titan.

## Data and operational limits

No enquiry content is written to a database. SQLite stores hashes of request IDs, payload fingerprints, email/IP identifiers and timestamps for throttling and retry suppression. Expired metadata is pruned on subsequent valid requests after 24 hours. Run one service instance with shared persistent storage; do not horizontally scale without a shared state store. Default limits: five attempts per IP/email per ten minutes and 100 total per day. Adjust to actual mailbox capacity after monitoring. No automatic background retries are sent.

SMTP acceptance and local metadata cannot be one atomic transaction. A timeout/crash after SMTP accepts mail but before recording success can result in a duplicate on retry; request references help identify these. User data is still processed by your hosting and email providers. Backups and email retention remain your responsibility. To erase temporary metadata, stop the service and remove the metadata database. Never log SMTP credentials or request bodies.
