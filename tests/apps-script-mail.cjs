const assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const store={},sent=[];let fail=false,quota=100;
const ctx={MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:m=>{if(fail)throw Error('SMTP');sent.push(m);}},LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...store}),getProperty:k=>store[k]||null,setProperty:(k,v)=>store[k]=v,deleteProperty:k=>delete store[k]})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>crypto.createHash(a).update(s).digest(),base64EncodeWebSafe:b=>b.toString('base64url'),formatDate:()=>new Date().toISOString().slice(0,10)},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('google-apps-script/taxpower-mail.gs','utf8'),ctx);
const base={enquiryType:'quick',name:'TEST',email:'test@example.com',mobile:'9999999999',product:'TaxPower GST Return, TaxPower E-Invoice & E-Way Bill, TaxPower TDS Return',purpose:'Request a Callback',requestId:'TP-12345678-1234-1234-1234-123456789abc'};
function post(data){return ctx.doPost({postData:{length:1000},parameter:data});}
assert.equal(post(base).result,'success');assert.equal(sent.length,1);assert.equal(sent[0].to,'sales@taxpower.co');assert.equal(sent[0].replyTo,base.email);
assert.equal(post(base).result,'success');assert.equal(sent.length,1);
assert.equal(post({...base,name:'Different'}).result,'error');
const detailed={...base,enquiryType:'detailed',company:'TEST CO',city:'Nagpur',state:'27 - Maharashtra',purpose:'Free Trial / Demo',requestId:'TP-22345678-1234-1234-1234-123456789abc'};
assert.equal(post(detailed).result,'success');assert.equal(sent.length,2);
assert.equal(post({...base,website:'bot'}).result,'error');
assert.equal(post({...base,email:'bad\r\nBcc:me@example.com'}).result,'error');
fail=true;const retry={...base,requestId:'TP-32345678-1234-1234-1234-123456789abc'};
assert.equal(post(retry).result,'error');fail=false;assert.equal(post(retry).result,'success');
quota=0;assert.equal(post({...base,requestId:'TP-42345678-1234-1234-1234-123456789abc'}).result,'error');
assert(!JSON.stringify(store).includes(base.email));assert(!JSON.stringify(store).includes(base.mobile));
console.log('Passed: both forms, All Products, deduplication, conflict, validation, failed-send retry, quota and metadata privacy. No email sent.');
