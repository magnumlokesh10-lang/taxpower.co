// Run with jsdom available in NODE_PATH. No requests or enquiries are sent.
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const routes=JSON.parse(read('scripts/seo-routes.json'));
function make(route){
 const dom=new JSDOM(read(route+'/index.html'),{url:'https://taxpower.co/'+route+'/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 Object.defineProperty(d,'currentScript',{value:{src:'https://taxpower.co/js/section-routes.js'}});
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.scrollTo=()=>{};
 w.IntersectionObserver=class{observe(){} disconnect(){}};w.ResizeObserver=class{observe(){} disconnect(){}};
 w.fetch=()=>{throw Error('Unexpected section/navigation request')};
 w.eval(read('js/section-routes.js'));w.eval(read('js/nav-loader.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 return dom;
}
for(const [route,meta] of Object.entries(routes)){
 assert.equal(read(route+'.html'),read(route+'/index.html'),'Slash and extension variants must serve identical content');
 const dom=make(route),w=dom.window,d=w.document;
 assert.equal(d.title,meta.title);assert.equal(d.querySelectorAll('h1').length,1);
 assert.equal(d.querySelector('link[rel="canonical"]').href,'https://taxpower.co/'+(meta.canonical||route));
 assert.equal(d.querySelector('meta[name="description"]').content,meta.description);
 assert.equal(w.location.pathname,'/'+route);
 assert.equal(d.querySelectorAll('[data-prerendered] > [data-loaded-page]').length,6);
 assert.ok(d.querySelector('script[type="application/ld+json"]'));
 assert.ok(!d.documentElement.innerHTML.includes('github.io'));
 for(const next of ['home','taxpowergst','gst-billing','taxpowertds','pricing','support','aboutus']){
  w.TaxPowerRoutes.write('#'+(next==='gst-billing'?'gst-billing-intro':next));
  assert.equal(d.title,routes[next].title);assert.equal(d.querySelectorAll('h1').length,1);
  assert.equal(d.querySelector('meta[name="description"]').content,routes[next].description);
 }
 dom.window.close();
}
const dom=make('home'),w=dom.window,d=w.document;
w.eval(read('js/script.js'));w.initTaxPowerSite();
w.eval(read('js/pricing-builder.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
const products=[...d.querySelectorAll('[name="tp-module"]')];
for(const edition of d.querySelectorAll('[name="tp-edition"]')){
 edition.checked=true;
 for(let mask=1;mask<8;mask++){
  products.forEach((p,i)=>p.checked=!!(mask&(1<<i)));products[0].dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(d.querySelector('[data-plan-price]').textContent.includes('₹'));
  assert.equal(d.querySelectorAll('[data-plan-badges] [data-product]').length,products.filter(p=>p.checked).length);
 }
}
const click=s=>d.querySelector(s).dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
click('.nav-item[data-nav-page="taxpowertds.html"]');assert.equal(w.location.pathname,'/taxpowertds');
click('[data-plan-action="quote"]');assert.equal(w.location.pathname,'/demo-enquiry');
assert.equal(d.querySelector('[name="purpose"]').value,'Pricing or Quotation');assert.equal(d.querySelector('#demo-enquiry').open,true);
w.history.replaceState(null,'','/home');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(d.title,routes.home.title);
w.eval(read('js/page-loader.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
dom.window.close();
console.log('PASS: 11 static route pairs, metadata, headings, no section fetches, 14 pricing combinations, navigation/history and demo prefill.');
