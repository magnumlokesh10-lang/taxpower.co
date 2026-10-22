/** TaxPower email-only backend. Paste this entire file into a standalone Apps Script project. */
var NOTIFY_EMAIL = 'sales@taxpower.co';
var FIELDS = ['name', 'company', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'product', 'purpose', 'page', 'requestId'];

function validateEnquiry(data) {
  var quick = data.enquiryType === 'quick';
  if (data.enquiryType && !quick && data.enquiryType !== 'detailed') throw new Error('Invalid enquiry type.');
  (quick ? ['name', 'email', 'mobile', 'product', 'purpose', 'requestId'] : ['company', 'name', 'city', 'state', 'email', 'mobile', 'product', 'purpose', 'requestId']).forEach(function (key) {
    data[key] = String(data[key] || '').trim();
    if (!data[key] || data[key].length > 250) throw new Error('Please check required fields.');
  });
  if (quick) {
    ['company', 'city', 'state', 'gstin', 'address'].forEach(function (key) { data[key] = ''; });
  }
  if (data.website) throw new Error('Request rejected.');
  if (!/^TP-[a-f0-9-]{36}$/i.test(data.requestId)) throw new Error('Invalid reference.');
  if (!/^[0-9]{10}$/.test(data.mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Invalid contact details.');
  data.gstin = String(data.gstin || '').trim().toUpperCase();
  if (data.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(data.gstin)) throw new Error('Invalid GSTIN.');
  if (String(data.address || '').length > 500 || String(data.page || '').length > 2000) throw new Error('Details too long.');
  if (!quick && ["01 - Jammu & Kashmir", "02 - Himachal Pradesh", "03 - Punjab", "04 - Chandigarh", "05 - Uttarakhand", "06 - Haryana", "07 - Delhi", "08 - Rajasthan", "09 - Uttar Pradesh", "10 - Bihar", "11 - Sikkim", "12 - Arunachal Pradesh", "13 - Nagaland", "14 - Manipur", "15 - Mizoram", "16 - Tripura", "17 - Meghalaya", "18 - Assam", "19 - West Bengal", "20 - Jharkhand", "21 - Odisha", "22 - Chhattisgarh", "23 - Madhya Pradesh", "24 - Gujarat", "26 - Dadra & Nagar Haveli and Daman & Diu", "27 - Maharashtra", "29 - Karnataka", "30 - Goa", "31 - Lakshadweep", "32 - Kerala", "33 - Tamil Nadu", "34 - Puducherry", "35 - Andaman & Nicobar Islands", "36 - Telangana", "37 - Andhra Pradesh", "38 - Ladakh", "97 - Other Territory", "99 - Other Country"].indexOf(data.state) < 0) throw new Error('Invalid state.');
  var selected = data.product.split(', ');
  if (!selected.length || selected.length > 3 || selected.some(function (item) { return ["TaxPower GST Return", "TaxPower E-Invoice & E-Way Bill", "TaxPower TDS Return"].indexOf(item) < 0; })) throw new Error('Invalid products.');
  if ((quick ? ['Request a Callback'] : ['Free Trial / Demo', 'Want to Purchase', 'Pricing or Quotation', 'Renewal of License']).indexOf(data.purpose) < 0) throw new Error('Invalid purpose.');
}


function doGet() {
  return jsonOut({result: 'ok', service: 'TaxPower email-only enquiry'});
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || e.postData.length > 16000) throw new Error('Invalid request.');
    var data = {};
    Object.keys(e.parameter || {}).forEach(function(key) {
      if (e.parameters && e.parameters[key] && e.parameters[key].length !== 1) throw new Error('Duplicate field.');
      data[key] = String(e.parameter[key]).trim();
    });
    validateEnquiry(data);
    lock.waitLock(10000);
    var props = PropertiesService.getScriptProperties();
    var now = Date.now();
    var values = props.getProperties();
    // Persist only hashes, counters and timestamps; never store enquiry contents.
    Object.keys(values).forEach(function(key) {
      if (key.indexOf('tp:') !== 0) return;
      try { if (JSON.parse(values[key]).expires <= now) props.deleteProperty(key); }
      catch (ignore) { props.deleteProperty(key); }
    });
    var ref = 'tp:sent:' + hash(data.requestId);
    var fingerprint = hash(FIELDS.map(function(key) {return data[key] || '';}).join('\n'));
    var previous = props.getProperty(ref);
    if (previous) {
      if (JSON.parse(previous).fingerprint !== fingerprint) throw new Error('Reference conflict.');
      return jsonOut({result: 'success', reference: data.requestId});
    }
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Email quota reached.');
    var day = 'tp:daily:' + Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
    var email = 'tp:rate:' + hash(data.email.toLowerCase());
    var daily = JSON.parse(props.getProperty(day) || '{"count":0}');
    var rate = JSON.parse(props.getProperty(email) || '{"count":0}');
    if (daily.count >= 80 || rate.count >= 5) throw new Error('Please try later.');
    props.setProperty(day, JSON.stringify({count: daily.count + 1, expires: now + 86400000}));
    props.setProperty(email, JSON.stringify({count: rate.count + 1, expires: rate.expires || now + 600000}));
    sendEnquiryEmail(data);
    props.setProperty(ref, JSON.stringify({fingerprint: fingerprint, expires: now + 86400000}));
    return jsonOut({result: 'success', reference: data.requestId});
  } catch (err) {
    // No submitted details or internal errors in public responses/logs.
    return jsonOut({result: 'error', message: 'Unable to send enquiry. Please retry later or email sales@taxpower.co.'});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function sendEnquiryEmail(data) {
  var kind = data.enquiryType === 'quick' ? 'Callback request' : 'Detailed enquiry';
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    name: 'TaxPower Website',
    replyTo: data.email,
    subject: 'TaxPower New Enquairy',
    body: kind + '\n\n' + FIELDS.filter(function(key) { return key !== 'requestId'; }).map(function(key) { return key + ': ' + (data[key] || '-'); }).join('\n')
  });
}

// Run this once from the editor to authorize sending and test the sales inbox.
function testEmail() {
  MailApp.sendEmail({to: NOTIFY_EMAIL, subject: 'TaxPower — Apps Script email test',
    body: 'TEST ONLY: Your Google Apps Script can send email to sales@taxpower.co. No customer data.',
    name: 'TaxPower Website'});
}

function hash(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value));
}
function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
