/* Clean section URLs; real directory entry pages keep refreshes working on Pages. */
(() => {
  const base = new URL('../', document.currentScript.src);
  let baseElement = document.querySelector('base');
  if (!baseElement) { baseElement = document.createElement('base'); document.head.prepend(baseElement); }
  baseElement.href = base.href;
  const routes = {
    home: 'home', taxpowergst: 'taxpowergst', dashboard_bg: 'gst-return',
    'gst-return': 'gst-return', 'gst-billing-intro': 'gst-billing', 'gst-einvoice': 'gst-billing',
    taxpowertds: 'taxpowertds', pricing: 'pricing', 'pricing-banner': 'pricing',
    downloads: 'downloads', 'downloads-banner': 'downloads', aboutus: 'aboutus',
    support: 'support', 'technical-support': 'technical-support', 'demo-enquiry': 'demo-enquiry'
  };
  const sections = {'': 'home', home: 'home', taxpowergst: 'taxpowergst', 'gst-return': 'dashboard_bg',
    'gst-billing': 'gst-billing-intro', taxpowertds: 'taxpowertds', pricing: 'pricing-banner',
    downloads: 'downloads', aboutus: 'aboutus', support: 'support',
    'technical-support': 'technical-support', 'demo-enquiry': 'demo-enquiry'};
  const titles = {
  "home": "TaxPower | GST, Billing & TDS Software",
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
  const routeMetadata = {
  "home": {
    "section": "home",
    "title": "TaxPower | GST, Billing & TDS Software",
    "description": "Explore TaxPower GST, Billing and TDS software with Siddharth Enterprises. Compare plans and request a demo, installation assistance, training or renewal support."
  },
  "taxpowergst": {
    "section": "taxpowergst",
    "title": "TaxPower GST | GST Return Filing Software",
    "description": "Prepare GST returns, reconcile ITC and manage multiple GSTINs with TaxPower GST. Explore features, compare plans and request a demo from Siddharth Enterprises."
  },
  "gst-return": {
    "section": "taxpowergst",
    "canonical": "taxpowergst",
    "title": "TaxPower GST | GST Return Filing Software",
    "description": "Explore TaxPower GST return preparation, filing dashboards and reconciliation workflows. Request a guided software demo from Siddharth Enterprises."
  },
  "gst-billing": {
    "section": "taxpowergst",
    "heading": "gst-billing-intro-title",
    "title": "TaxPower Billing | E-Invoice & E-Way Bill Software",
    "description": "Explore TaxPower Billing for invoices, e-invoices, e-way bills, customer masters and reports. Compare software plans and book a guided demonstration."
  },
  "taxpowertds": {
    "section": "taxpowertds",
    "title": "TaxPower TDS | TDS Return Filing Software",
    "description": "Prepare TDS and TCS returns, manage challans, generate FVU files and work with TRACES using TaxPower TDS. View features and request a software demo."
  },
  "pricing": {
    "section": "pricing",
    "title": "TaxPower Pricing | GST, Billing & TDS",
    "description": "Compare TaxPower GST, Billing and TDS plans for professionals and businesses. View installation fees, annual renewal costs and bundle savings, then request a quotation."
  },
  "downloads": {
    "section": "downloads",
    "title": "TaxPower Downloads | GST, Billing & TDS Software",
    "description": "Download TaxPower GST, TDS and MVAT setup files and supporting utilities. Contact Siddharth Enterprises for installation help and software support."
  },
  "aboutus": {
    "section": "aboutus",
    "title": "About TaxPower | GST, Billing & TDS Software Solutions",
    "description": "Meet Siddharth Enterprises, an authorized TaxPower dealer in Nagpur, and Magnum Infosystem, the software developer. Find company details and contact information."
  },
  "support": {
    "section": "support",
    "title": "TaxPower Customer Support",
    "description": "Get help with TaxPower GST, Billing and TDS demos, installation, software queries and renewals. Contact Siddharth Enterprises or request a callback."
  },
  "technical-support": {
    "section": "support",
    "canonical": "support",
    "title": "TaxPower Technical Support",
    "description": "Contact the TaxPower support team for installation, updates, licensing and software queries. Keep your customer ID, product version and error details ready."
  },
  "demo-enquiry": {
    "section": "support",
    "canonical": "support",
    "title": "Book a TaxPower Demo | GST, Billing & TDS Software",
    "description": "Request a TaxPower GST, Billing or TDS software demo, quotation or sales callback from Siddharth Enterprises. Select the products that fit your work."
  }
};
  function updateTitle() {
    const hash = hashForURL(location.href);
    const route = routes[hash.slice(1)];
    if (route === undefined) return;
    document.title = titles[route];
    const meta = routeMetadata[route];
    const canonical = 'https://taxpower.co/' + (meta.canonical || route);
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    for (const [property, value] of Object.entries({'og:title': titles[route], 'og:description': meta.description, 'og:url': canonical})) {
      document.querySelector('meta[property="' + property + '"]')?.setAttribute('content', value);
    }
    for (const [name, value] of Object.entries({'twitter:title': titles[route], 'twitter:description': meta.description})) {
      document.querySelector('meta[name="' + name + '"]')?.setAttribute('content', value);
    }
    // Keep one semantic primary heading as visitors navigate the same visual page.
    const primary = document.getElementById(meta.section);
    if (!primary) return;
    function retag(node, tag) {
      if (node.tagName.toLowerCase() === tag) return node;
      const replacement = document.createElement(tag);
      for (const attribute of node.attributes) replacement.setAttribute(attribute.name, attribute.value);
      replacement.append(...node.childNodes); node.replaceWith(replacement); return replacement;
    }
    const heading = meta.heading ? document.getElementById(meta.heading) : primary.querySelector('[data-page-heading]');
    document.querySelectorAll('h1').forEach(node => { if (node !== heading) retag(node, 'h2'); });
    if (heading) {
      const h = retag(heading, 'h1');
      if (!h.id) h.id = 'page-heading-' + meta.section;
      primary.setAttribute('aria-labelledby', h.id);
    }
    // Use landmarks without replacing section containers or losing event listeners.
    document.querySelectorAll('[data-route-section]').forEach(node => {
      node.setAttribute('role', node.id === meta.section ? 'main' : 'region');
    });
    const schema = document.getElementById('site-structured-data');
    if (schema && schema.dataset.route !== route) {
      const data = JSON.parse(schema.textContent);
      data['@graph'] = data['@graph'].filter(item => !['WebPage','ContactPage','AboutPage','BreadcrumbList','SoftwareApplication','ItemList'].includes(item['@type']));
      data['@graph'].push({'@type': meta.section === 'support' ? 'ContactPage' : route === 'aboutus' ? 'AboutPage' : 'WebPage', '@id': canonical + '#webpage', url: canonical, name: titles[route], description: meta.description, isPartOf: {'@id': 'https://taxpower.co/#website'}});
      schema.textContent = JSON.stringify(data);
      schema.dataset.route = route;
    }
  }
  window.addEventListener('popstate', updateTitle);
  window.addEventListener('hashchange', updateTitle);
  function hashForURL(value) {
    const url = new URL(value, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return '';
    let path = url.pathname.slice(base.pathname.length).replace(/\/$/, '');
    if (path.endsWith('.html') && Object.hasOwn(sections, path.slice(0, -5))) path = path.slice(0, -5);
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
