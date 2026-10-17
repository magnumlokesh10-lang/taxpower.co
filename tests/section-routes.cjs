// NODE_PATH=/path/to/node_modules node tests/section-routes.cjs (requires jsdom)
const {JSDOM} = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = file => fs.readFileSync(file, 'utf8');
function page(url) {
  const dom = new JSDOM(read('index.html'), {url, runScripts: 'outside-only'});
  const w = dom.window, d = w.document;
  Object.defineProperty(d, 'currentScript', {value: {src: new URL('js/section-routes.js', url.includes('github.io') ? 'https://example.github.io/project/' : 'https://taxpower.co/').href}});
  w.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
  w.requestAnimationFrame = () => 1;
  w.cancelAnimationFrame = () => {};
  w.scrollTo = value => { w.lastScroll = value; };
  w.IntersectionObserver = class {observe(){} disconnect(){}};
  w.ResizeObserver = class {observe(){} disconnect(){}};
  d.querySelector('[data-nav-slot]').outerHTML = read('nav.html');
  for (const id of ['taxpowergst','taxpowertds','pricing','downloads','aboutus','support']) {
    const doc = new w.DOMParser().parseFromString(read(id+'.html'), 'text/html');
    const main = doc.querySelector('main'); main.id=id;
    d.querySelector('[data-page-sections]').append(main);
  }
  w.eval(read('js/section-routes.js'));
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  return dom;
}
for (const url of ['https://taxpower.co/taxpowertds/', 'https://taxpower.co/index.html#taxpowertds', 'https://example.github.io/project/taxpowertds/']) {
  const dom=page(url), w=dom.window, r=w.TaxPowerRoutes;
  assert.equal(r.hash(),'#taxpowertds');
  assert.equal(w.location.hash,'');
  assert.ok(w.location.pathname.endsWith('/taxpowertds'));
  assert.ok(w.document.baseURI.endsWith(url.includes('github.io') ? '/project/' : 'taxpower.co/'));
  assert.equal(r.hashForURL('https://other.example/pricing'),'');
  assert.equal(r.hashForURL('https://taxpower.co/unknown'),'');
  r.write('#pricing-banner'); assert.equal(r.hash(),'#pricing-banner');
  r.write('#gst-billing-intro'); assert.equal(r.hash(),'#gst-billing-intro');
  r.write('#home'); assert.equal(r.hash(),'#home');
  dom.window.close();
}
const dom=page('https://taxpower.co/taxpowertds/');const w=dom.window,d=w.document;
w.eval(read('js/script.js'));w.initTaxPowerSite();
assert.equal(w.taxPowerSiteInitialized,true);
Object.defineProperty(d.documentElement,'scrollHeight',{value:10000});
d.getElementById('pricing-banner').getBoundingClientRect=()=>({top:2000});
const click=selector=>d.querySelector(selector).dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
click('.nav-item[data-nav-page="pricing.html"]');assert.equal(w.location.pathname,'/pricing');assert.equal(w.location.hash,'');assert.ok(w.lastScroll);
click('.nav-item[data-nav-page="taxpowertds.html"]');assert.equal(w.location.pathname,'/taxpowertds');
w.history.replaceState(null,'','/pricing');w.dispatchEvent(new w.PopStateEvent('popstate'));
assert.equal(d.querySelector('.nav-item.h-current').dataset.navPage,'pricing.html');
click('[data-logo-home-link]');assert.equal(w.location.pathname,'/');
click('[data-plan-action="quote"]');assert.equal(w.location.pathname,'/demo-enquiry');
assert.equal(d.querySelector('[name="purpose"]').value,'Pricing or Quotation');
assert.equal(d.querySelector('#demo-enquiry').open,true);
for(const route of ['taxpowergst','gst-return','gst-billing','taxpowertds','pricing','downloads','aboutus','support','technical-support','demo-enquiry']) {
 assert.equal(read(route+'/index.html'),read('index.html').replace('<head>','<head>\n  <base href="../">'));
}
dom.window.close();console.log('PASS: clean routes, legacy hashes, subpath hosting, nav clicks, history, demo context and 10 static entry pages.');
