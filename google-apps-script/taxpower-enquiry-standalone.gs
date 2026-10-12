/**
 * TaxPower – Demo / Enquiry form backend (STANDALONE version)
 *
 * Ye version Sheet ke andar nahi, aapke Google account mein alag project ke
 * roop mein save hota hai — Sheet band karne ya delete karne par bhi ye
 * script kabhi nahi hatega.
 *
 * SETUP (sirf ek baar):
 *  1. Browser mein kholein: https://script.google.com  (magnumlokesh10@gmail.com se login)
 *  2. Top-left "New project" (+) par click karein.
 *  3. Code.gs ka purana content delete karke YE PURA FILE paste karein, Save (Ctrl+S).
 *  4. Neeche SHEET_ID mein apni Google Sheet ki ID paste karein
 *     (Sheet ke URL se: docs.google.com/spreadsheets/d/YE_WALA_HISSA/edit).
 *  5. Deploy -> New deployment -> type "Web app"
 *       Execute as: Me
 *       Who has access: Anyone
 *     Copy karein naya /exec URL.
 *  6. Wo URL mujhe (Lokesh ko) bhej dein ya public/js/form-backend.js mein
 *     TAXPOWER_FORM_ENDPOINT mein paste kar dein.
 *
 * CallMeBot WhatsApp API key: WhatsApp par +34 644 51 95 23 ko
 * "I allow callmebot to send me messages" bhejein — reply mein apikey milegi,
 * neeche WHATSAPP_APIKEY mein paste karein.
 */

// >>> Sheet URL se ID yahan paste karein <<<
var SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

var SHEET_NAME = 'Enquiries';
var NOTIFY_EMAIL = 'magnumlokesh10@gmail.com';
var WHATSAPP_PHONE = '918080631102';          // country code + number, no +
var WHATSAPP_APIKEY = 'PASTE_YOUR_CALLMEBOT_APIKEY';

var FIELDS = [
  ['submittedAt', 'Submitted At'],
  ['name', 'Full Name'],
  ['company', 'Company'],
  ['mobile', 'Mobile'],
  ['email', 'Email'],
  ['gstin', 'GSTIN'],
  ['address', 'Address'],
  ['city', 'City'],
  ['state', 'State'],
  ['product', 'Products'],
  ['purpose', 'Purpose'],
  ['page', 'Page URL'],
  ['requestId', 'Enquiry Reference']
];

function validateEnquiry(data) {
  ['company', 'name', 'city', 'state', 'email', 'mobile', 'product', 'purpose', 'requestId'].forEach(function (key) {
    data[key] = String(data[key] || '').trim();
    if (!data[key] || data[key].length > 250) throw new Error('Please check required fields.');
  });
  if (data.website) throw new Error('Request rejected.');
  if (!/^TP-[a-f0-9-]{36}$/i.test(data.requestId)) throw new Error('Invalid reference.');
  if (!/^[0-9]{10}$/.test(data.mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Invalid contact details.');
  data.gstin = String(data.gstin || '').trim().toUpperCase();
  if (data.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(data.gstin)) throw new Error('Invalid GSTIN.');
  if (String(data.address || '').length > 500 || String(data.page || '').length > 2000) throw new Error('Details too long.');
  if (["01 - Jammu & Kashmir", "02 - Himachal Pradesh", "03 - Punjab", "04 - Chandigarh", "05 - Uttarakhand", "06 - Haryana", "07 - Delhi", "08 - Rajasthan", "09 - Uttar Pradesh", "10 - Bihar", "11 - Sikkim", "12 - Arunachal Pradesh", "13 - Nagaland", "14 - Manipur", "15 - Mizoram", "16 - Tripura", "17 - Meghalaya", "18 - Assam", "19 - West Bengal", "20 - Jharkhand", "21 - Odisha", "22 - Chhattisgarh", "23 - Madhya Pradesh", "24 - Gujarat", "26 - Dadra & Nagar Haveli and Daman & Diu", "27 - Maharashtra", "29 - Karnataka", "30 - Goa", "31 - Lakshadweep", "32 - Kerala", "33 - Tamil Nadu", "34 - Puducherry", "35 - Andaman & Nicobar Islands", "36 - Telangana", "37 - Andhra Pradesh", "38 - Ladakh", "97 - Other Territory", "99 - Other Country"].indexOf(data.state) < 0) throw new Error('Invalid state.');
  var selected = data.product.split(', ');
  if (!selected.length || selected.length > 3 || selected.some(function (item) { return ["TaxPower GST Return", "TaxPower E-Invoice & E-Way Bill", "TaxPower TDS Return"].indexOf(item) < 0; })) throw new Error('Invalid products.');
  if (['Free Trial / Demo', 'Want to Purchase', 'Pricing or Quotation', 'Renewal of License'].indexOf(data.purpose) < 0) throw new Error('Invalid purpose.');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var data;
  try {
    data = parseRequest(e);
    validateEnquiry(data);
    lock.waitLock(15000);
    var sheet = getEnquirySheet();
    var referenceColumn = FIELDS.length;
    // Durable deduplication survives notification failures and client timeouts.
    if (sheet.getLastRow() > 1 && sheet.getRange(2, referenceColumn, sheet.getLastRow() - 1, 1).createTextFinder(data.requestId).matchEntireCell(true).findNext()) {
      return jsonOut({result: 'success', reference: data.requestId});
    }
    var cache = CacheService.getScriptCache();
    var rateKey = 'enquiry:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data.email.toLowerCase()));
    var count = Number(cache.get(rateKey) || 0);
    if (count >= 5) throw new Error('Please try again later.');
    data.submittedAt = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MM-yyyy HH:mm:ss');
    saveToSheet(data, sheet);
    cache.put(rateKey, String(count + 1), 600);
  } catch (err) {
    return jsonOut({result: 'error', message: 'Unable to accept enquiry. Please check your details or retry later.'});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
  // The enquiry is already saved: notification errors must not prompt duplicate submissions.
  try { sendEmailAlert(data); } catch (err) { console.error('Enquiry email notification failed'); }
  try { sendWhatsAppAlert(data); } catch (err) { console.error('Enquiry WhatsApp notification failed'); }
  return jsonOut({result: 'success', reference: data.requestId});
}

function doGet() {
  return jsonOut({ result: 'ok', message: 'TaxPower enquiry endpoint is live.' });
}

function parseRequest(e) {
  var data = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (key) { data[key] = e.parameter[key]; });
  }
  if (e && e.postData && e.postData.type === 'application/json' && e.postData.contents) {
    var json = JSON.parse(e.postData.contents);
    Object.keys(json).forEach(function (key) { data[key] = json[key]; });
  }
  return data;
}

function getEnquirySheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(FIELDS.map(function (f) { return f[1]; }));
    sheet.getRange(1, 1, 1, FIELDS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(1, FIELDS.length).setValue('Enquiry Reference');
  }
  return sheet;
}

function saveToSheet(data, sheet) {
  sheet.appendRow(FIELDS.map(function (f) {
    var value = String(data[f[0]] || '');
    // Preserve user text without interpreting spreadsheet formulas.
    return /^[=+@-]/.test(value) ? "'" + value : value;
  }));
}

function sendEmailAlert(data) {
  var lines = FIELDS.map(function (f) {
    return '<tr><td style="padding:6px 12px;font-weight:bold;">' + f[1] +
      '</td><td style="padding:6px 12px;">' + escapeHtml(data[f[0]] || '-') + '</td></tr>';
  }).join('');

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'New TaxPower Enquiry: ' + (data.name || 'Unknown') + ' (' + (data.company || '-') + ')',
    htmlBody: '<h2 style="font-family:Arial">New enquiry from the TaxPower website</h2>' +
      '<table style="font-family:Arial;font-size:14px;border-collapse:collapse;">' + lines + '</table>'
  });
}

function sendWhatsAppAlert(data) {
  if (!WHATSAPP_APIKEY || WHATSAPP_APIKEY.indexOf('PASTE') === 0) return;

  var text = 'New TaxPower Enquiry\n' + FIELDS.map(function (f) {
    return f[1] + ': ' + (data[f[0]] || '-');
  }).join('\n');

  var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(WHATSAPP_PHONE) +
    '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(WHATSAPP_APIKEY);

  UrlFetchApp.fetch(url, { muteHttpExceptions: true });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
