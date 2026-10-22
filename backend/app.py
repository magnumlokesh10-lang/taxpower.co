"""Private SMTP enquiry API. Run behind HTTPS; never serve this directory as static files."""
import hashlib
import json
import os
import re
import smtplib
import sqlite3
import ssl
import time
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import parse_qs

PRODUCTS = {'TaxPower GST Return', 'TaxPower E-Invoice & E-Way Bill', 'TaxPower TDS Return'}
PURPOSES = {'Free Trial / Demo', 'Want to Purchase', 'Pricing or Quotation', 'Renewal of License'}
FIELDS = ['name', 'company', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'product', 'purpose', 'page']

class Rejected(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

def validate(data):
    if any(not isinstance(v, str) for v in data.values()):
        raise Rejected(400, 'Invalid fields.')
    data = {k: v.strip() for k, v in data.items()}
    quick = data.get('enquiryType') == 'quick'
    if data.get('enquiryType', 'detailed') not in ('quick', 'detailed') or data.get('website'):
        raise Rejected(400, 'Invalid enquiry.')
    required = ['name', 'mobile', 'email', 'product', 'purpose', 'requestId']
    if not quick:
        required += ['company', 'city', 'state']
    if any(not data.get(k) for k in required):
        raise Rejected(400, 'Please complete required fields.')
    if any(len(v) > (2000 if k == 'page' else 500 if k == 'address' else 250) for k, v in data.items()):
        raise Rejected(400, 'Details too long.')
    if not re.fullmatch(r'TP-[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}', data['requestId']):
        raise Rejected(400, 'Invalid reference.')
    if not re.fullmatch(r'[0-9]{10}', data['mobile']) or not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', data['email']):
        raise Rejected(400, 'Invalid contact details.')
    selected = data['product'].split(', ')
    if not 1 <= len(selected) <= 3 or len(set(selected)) != len(selected) or not set(selected) <= PRODUCTS:
        raise Rejected(400, 'Invalid products.')
    if data['purpose'] not in ({'Request a Callback'} if quick else PURPOSES):
        raise Rejected(400, 'Invalid purpose.')
    if data.get('gstin') and not re.fullmatch(r'[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]', data['gstin']):
        raise Rejected(400, 'Invalid GSTIN.')
    return {k: data.get(k, '') for k in FIELDS + ['requestId', 'enquiryType']}

def send_mail(data):
    user, password = os.environ.get('SMTP_USER'), os.environ.get('SMTP_PASSWORD')
    if not user or not password:
        raise Rejected(503, 'Enquiry service is not configured yet.')
    message = EmailMessage()
    message['From'] = user
    message['To'] = 'sales@taxpower.co'
    message['Reply-To'] = data['email']
    kind = 'Callback' if data['enquiryType'] == 'quick' else 'Detailed enquiry'
    message['Subject'] = 'TaxPower ' + kind + ' — ' + data['requestId']
    message.set_content(kind + '\n\n' + '\n'.join(k.title() + ': ' + (data.get(k) or '-') for k in FIELDS + ['requestId']))
    with smtplib.SMTP_SSL(os.environ.get('SMTP_HOST', 'smtpout.secureserver.net'),
                          int(os.environ.get('SMTP_PORT', '465')), timeout=15,
                          context=ssl.create_default_context()) as smtp:
        smtp.login(user, password)
        if smtp.send_message(message):
            raise Rejected(502, 'Email service could not accept this enquiry.')

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def deliver(data, ip):
    # No enquiry content is persisted. Store hashes/counters for 24 hours only.
    directory = Path(os.environ.get('STATE_DIR', '/tmp/taxpower-enquiry'))
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    con = sqlite3.connect(directory / 'metadata.sqlite3', timeout=20)
    try:
        con.execute('CREATE TABLE IF NOT EXISTS sent (id TEXT PRIMARY KEY, fingerprint TEXT, at REAL)')
        con.execute('CREATE TABLE IF NOT EXISTS attempts (ip TEXT, email TEXT, at REAL)')
        con.execute('BEGIN IMMEDIATE')
        now = time.time()
        con.execute('DELETE FROM sent WHERE at < ?', (now - 86400,))
        con.execute('DELETE FROM attempts WHERE at < ?', (now - 86400,))
        ref, fingerprint = digest(data['requestId']), digest(json.dumps(data, sort_keys=True))
        previous = con.execute('SELECT fingerprint FROM sent WHERE id = ?', (ref,)).fetchone()
        if previous:
            if previous[0] != fingerprint:
                raise Rejected(409, 'Reference already used for different details.')
            return
        iphash, emailhash = digest(ip), digest(data['email'].lower())
        count = con.execute('SELECT COUNT(*) FROM attempts WHERE at > ? AND (ip = ? OR email = ?)', (now-600, iphash, emailhash)).fetchone()[0]
        daily = con.execute('SELECT COUNT(*) FROM attempts').fetchone()[0]
        if count >= 5 or daily >= int(os.environ.get('DAILY_LIMIT', '100')):
            raise Rejected(429, 'Please try again later or contact sales@taxpower.co.')
        con.execute('INSERT INTO attempts VALUES (?, ?, ?)', (iphash, emailhash, now))
        # Commit failed attempts too, so failures cannot bypass throttling.
        try:
            send_mail(data)
        except Exception:
            con.commit()
            raise
        con.execute('INSERT INTO sent VALUES (?, ?, ?)', (ref, fingerprint, now))
        con.commit()
    finally:
        con.close()

def application(environ, start_response):
    origin = environ.get('HTTP_ORIGIN', '')
    allowed = os.environ.get('ALLOWED_ORIGINS', 'https://taxpower.co,https://www.taxpower.co').split(',')
    headers = [('Content-Type', 'application/json'), ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'), ('Vary', 'Origin')]
    status, payload = 200, {}
    try:
        if environ.get('PATH_INFO') != '/enquiry':
            raise Rejected(404, 'Not found.')
        if origin not in allowed:
            raise Rejected(403, 'Origin not allowed.')
        headers += [('Access-Control-Allow-Origin', origin)]
        method = environ.get('REQUEST_METHOD')
        if method == 'OPTIONS':
            headers += [('Access-Control-Allow-Methods', 'POST, OPTIONS'), ('Access-Control-Allow-Headers', 'Content-Type')]
        elif method == 'POST':
            try:
                length = int(environ.get('CONTENT_LENGTH') or 0)
            except ValueError:
                raise Rejected(400, 'Invalid request size.')
            if not 0 < length <= 16384:
                raise Rejected(413, 'Invalid request size.')
            if environ.get('CONTENT_TYPE', '').split(';')[0] != 'application/x-www-form-urlencoded':
                raise Rejected(415, 'Unsupported content type.')
            try:
                parsed = parse_qs(environ['wsgi.input'].read(length).decode('utf-8'), keep_blank_values=True, max_num_fields=30)
            except (ValueError, UnicodeError):
                raise Rejected(400, 'Invalid form data.')
            if any(len(values) != 1 for values in parsed.values()):
                raise Rejected(400, 'Duplicate fields.')
            data = validate({k: v[0] for k, v in parsed.items()})
            # Do not trust arbitrary X-Forwarded-For headers. Configure proxy limits separately.
            deliver(data, environ.get('REMOTE_ADDR', 'unknown'))
            payload = {'result': 'success', 'reference': data['requestId']}
        else:
            raise Rejected(405, 'Method not allowed.')
    except Rejected as exc:
        status, payload = exc.status, {'result': 'error', 'message': exc.message}
    except Exception:
        status, payload = 503, {'result': 'error', 'message': 'Unable to confirm email delivery. Please retry or email sales@taxpower.co.'}
    from http import HTTPStatus
    start_response(str(status) + ' ' + HTTPStatus(status).phrase, headers)
    return [json.dumps(payload).encode()]

if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    with make_server('127.0.0.1', 8000, application) as server:
        server.serve_forever()
