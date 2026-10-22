import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlencode
import app

class EnquiryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'STATE_DIR': self.tmp.name})
        self.env.start()
        self.data = dict(enquiryType='quick', name='Test', email='test@example.com', mobile='9999999999', product=', '.join(sorted(app.PRODUCTS)), purpose='Request a Callback', requestId='TP-12345678-1234-1234-1234-123456789abc')
    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()
    def request(self, data=None, origin='https://taxpower.co', method='POST'):
        body = urlencode(data or self.data).encode()
        env = {'PATH_INFO':'/enquiry', 'REQUEST_METHOD':method, 'HTTP_ORIGIN':origin, 'CONTENT_TYPE':'application/x-www-form-urlencoded', 'CONTENT_LENGTH':str(len(body)), 'wsgi.input':io.BytesIO(body), 'REMOTE_ADDR':'127.0.0.1'}
        result = []
        payload = b''.join(app.application(env, lambda status, headers: result.append((status, headers))))
        return int(result[0][0].split()[0]), json.loads(payload)
    @patch('app.send_mail')
    def test_both_forms_all_products_and_duplicate(self, send):
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(send.call_count, 1)
        detail = dict(self.data, enquiryType='detailed', company='Test Co', city='Nagpur', state='27 - Maharashtra', purpose='Free Trial / Demo', requestId='TP-22345678-1234-1234-1234-123456789abc')
        self.assertEqual(self.request(detail)[0], 200)
        self.assertEqual(send.call_count, 2)
    @patch('app.send_mail')
    def test_rejects_spam_bad_data_and_foreign_origin(self, send):
        self.assertEqual(self.request(origin='https://evil.example')[0], 403)
        for data in [dict(self.data, website='bot'), dict(self.data, product='Invalid'), dict(self.data, email='x@example.com\r\nBcc:attacker@example.com'), dict(self.data, mobile='1')]:
            self.assertEqual(self.request(data)[0], 400)
        send.assert_not_called()
    @patch('app.send_mail', side_effect=RuntimeError('SMTP failed'))
    def test_failure_not_success_and_rate_limited(self, send):
        for _ in range(5):
            code, result = self.request()
            self.assertEqual(code, 503)
            self.assertEqual(result['result'], 'error')
        self.assertEqual(self.request()[0], 429)
    @patch('app.send_mail')
    def test_reference_conflict(self, send):
        self.request()
        self.assertEqual(self.request(dict(self.data, name='Different'))[0], 409)
        self.assertEqual(send.call_count, 1)
    @patch('app.smtplib.SMTP_SSL')
    def test_fixed_recipient_and_reply_to(self, smtp):
        smtp.return_value.__enter__.return_value.send_message.return_value = {}
        with patch.dict(os.environ, {'SMTP_USER':'sales@taxpower.co', 'SMTP_PASSWORD':'test-only'}):
            app.send_mail(app.validate(self.data))
        message = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
        self.assertEqual(message['To'], 'sales@taxpower.co')
        self.assertEqual(message['Reply-To'], 'test@example.com')
        self.assertEqual(smtp.call_args.args, ('smtpout.secureserver.net',465))

if __name__ == '__main__':
    unittest.main()
