const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('js/form-backend.js', 'utf8');
function setup(response) {
  const calls = [];
  const ctx = {window:{location:{origin:'https://taxpower.co',pathname:'/home'}}, FormData:class {constructor(form){return Object.entries(form.data);}}, URLSearchParams, AbortController, setTimeout, clearTimeout, crypto:require('node:crypto').webcrypto, document:{dispatchEvent(){}}, CustomEvent:class{}, fetch:async(url, options)=>{calls.push({url, options});return response;}};
  vm.runInNewContext(source,ctx);
  return {send:ctx.window.sendDemoEnquiryToBackend,calls};
}
function form(detailed=false) {
  return {id:detailed?'demoEnquiryForm':'quickEnquiryForm',data:{name:'TEST',email:'test@example.com',website:'',product:'TaxPower GST Return, TaxPower E-Invoice & E-Way Bill, TaxPower TDS Return'},querySelector:()=>detailed?{}:null,querySelectorAll:()=>[{value:'TaxPower GST Return'},{value:'TaxPower TDS Return'}]};
}
(async()=>{
 for (const detailed of [false,true]) {
  const test=setup({ok:true,type:'cors',json:async()=>({success:'true'})});
  const f=form(detailed), a=test.send(f), b=test.send(f);
  assert.equal(a,b); assert.equal((await a).result,'success');
  const body=test.calls[0].options.body;
  assert.equal(test.calls[0].url,'https://formsubmit.co/ajax/sales@taxpower.co');
  assert.equal(body.get('_replyto'),'test@example.com');
  assert.equal(body.get('_honey'),'');
  assert.equal(body.get('product'),detailed?'TaxPower GST Return, TaxPower TDS Return':f.data.product);
 }
 for(const response of [{ok:false},{ok:true,type:'opaque'},{ok:true,type:'cors',json:async()=>({success:'false'})}]){
  await assert.rejects(setup(response).send(form()));
 }
 const spam=setup({});const f=form();f.data.website='spam';await assert.rejects(spam.send(f));assert.equal(spam.calls.length,0);
 console.log('Passed: both forms, products, pending deduplication, honeypot, provider failures. No live email sent.');
})();
