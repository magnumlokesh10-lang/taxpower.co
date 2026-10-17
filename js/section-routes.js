/* Clean section URLs; real directory entry pages keep refreshes working on Pages. */
(() => {
  const base = new URL('../', document.currentScript.src);
  let baseElement = document.querySelector('base');
  if (!baseElement) { baseElement = document.createElement('base'); document.head.prepend(baseElement); }
  baseElement.href = base.href;
  const routes = {
    home: '', taxpowergst: 'taxpowergst', dashboard_bg: 'gst-return',
    'gst-return': 'gst-return', 'gst-billing-intro': 'gst-billing', 'gst-einvoice': 'gst-billing',
    taxpowertds: 'taxpowertds', pricing: 'pricing', 'pricing-banner': 'pricing',
    downloads: 'downloads', 'downloads-banner': 'downloads', aboutus: 'aboutus',
    support: 'support', 'technical-support': 'technical-support', 'demo-enquiry': 'demo-enquiry'
  };
  const sections = {'': 'home', taxpowergst: 'taxpowergst', 'gst-return': 'dashboard_bg',
    'gst-billing': 'gst-billing-intro', taxpowertds: 'taxpowertds', pricing: 'pricing-banner',
    downloads: 'downloads', aboutus: 'aboutus', support: 'support',
    'technical-support': 'technical-support', 'demo-enquiry': 'demo-enquiry'};
  const titles = {
  "": "TaxPower | GST, Billing & TDS Software",
  "taxpowergst": "TaxPower GST | GST Return Filing Software",
  "gst-return": "TaxPower GST | GST Return Filing Software",
  "gst-billing": "TaxPower Billing | E-Invoice & E-Way Bill Software",
  "taxpowertds": "TaxPower TDS | TDS Return Filing Software",
  "pricing": "TaxPower Pricing | GST, Billing & TDS",
  "downloads": "TaxPower Downloads | GST, Billing & TDS Software",
  "aboutus": "About TaxPower | GST, Billing & TDS Software Solutions",
  "support": "TaxPower Customer Support",
  "technical-support": "TaxPower Technical Support",
  "demo-enquiry": "Book a TaxPower Demo | GST, Billing & TDS Software"
};
  function updateTitle() {
    const hash = hashForURL(location.href);
    const route = routes[hash.slice(1)];
    if (route !== undefined) document.title = titles[route];
  }
  window.addEventListener('popstate', updateTitle);
  window.addEventListener('hashchange', updateTitle);
  function hashForURL(value) {
    const url = new URL(value, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return '';
    const path = url.pathname.slice(base.pathname.length).replace(/\/$/, '');
    if (url.hash && (path === '' || path === 'index.html' || Object.hasOwn(sections, path))) {
      return Object.hasOwn(routes, url.hash.slice(1)) ? url.hash : '';
    }
    if (path === 'index.html') return '#home';
    return Object.hasOwn(sections, path) ? '#' + sections[path] : '';
  }
  function urlFor(hash) {
    const route = routes[hash.replace(/^#/, '')];
    return route === undefined ? null : new URL(route, base);
  }
  function write(hash, replace = false) {
    const url = urlFor(hash);
    if (!url) return;
    url.search = location.search;
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url);
    updateTitle();
  }
  function cleanLinks() {
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.getAttribute('href') === '#') return;
      const hash = hashForURL(link.href);
      if (!hash) return;
      const url = urlFor(hash);
      url.search = new URL(link.href).search;
      link.href = url.href;
    });
  }
  window.TaxPowerRoutes = {hash: () => hashForURL(location.href), hashForURL, urlFor, write, cleanLinks};
  function ready() {
    if (document.querySelector('[data-page-sections]')) {
      const hash = hashForURL(location.href);
      if (hash) write(hash, true);
    }
    updateTitle();
    cleanLinks();
  }
  document.addEventListener('DOMContentLoaded', ready);
  ['taxpower:navigation-loaded', 'taxpower:sections-loaded', 'taxpower:footer-loaded'].forEach(name =>
    document.addEventListener(name, cleanLinks));
})();
