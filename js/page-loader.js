(() => {
  const pageSections = [
    { url: 'taxpowergst.html', id: 'taxpowergst' },
    { url: 'taxpowertds.html', id: 'taxpowertds' },
    { url: 'pricing.html', id: 'pricing' },
    { url: 'downloads.html', id: 'downloads' },
    { url: 'aboutus.html', id: 'aboutus' },
    { url: 'support.html', id: 'support' }
  ];

  async function loadPageSection({ url, id }) {
    const response = await fetch(url, { cache: 'no-cache' });

    if (!response.ok) {
      throw new Error(`Unable to load ${url}: ${response.status}`);
    }

    const html = await response.text();
    const page = new DOMParser().parseFromString(html, 'text/html');
    const main = page.querySelector('main');

    if (!main) {
      throw new Error(`${url} does not have a main section.`);
    }

    const section = main.cloneNode(true);
    section.id = id;
    section.classList.add('loaded-page-section');
    section.setAttribute('data-loaded-page', url);
    return section;
  }

  async function loadAllPageSections() {
    const container = document.querySelector('[data-page-sections]');
    if (!container) return;

    container.setAttribute('aria-busy', 'true');

    try {
      const sections = await Promise.all(pageSections.map(loadPageSection));
      container.replaceChildren(...sections);
      container.removeAttribute('aria-busy');
      document.dispatchEvent(new CustomEvent('taxpower:sections-loaded'));

      const sectionHash = window.TaxPowerRoutes?.hash() || window.location.hash;
      if (sectionHash) {
        requestAnimationFrame(() => {
          const target = document.getElementById(sectionHash.slice(1));
          if (!target) return;

          const targetTop = target.getBoundingClientRect().top + window.scrollY - (document.querySelector('.header')?.offsetHeight || 64) - 16;
          window.scrollTo({ top: targetTop, behavior: 'auto' });
        });
      }
    } catch (error) {
      console.error(error);
      container.removeAttribute('aria-busy');
      container.innerHTML = '<p class="page-section-load-error">Page sections could not be loaded.</p>';
    }
  }

  async function loadSharedFooter() {
    const slot = document.querySelector('[data-footer-slot]');
    if (!slot) return;

    try {
      const response = await fetch('footer.html', { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error(`Unable to load footer.html: ${response.status}`);
      }

      const html = await response.text();
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      slot.replaceWith(template.content.cloneNode(true));

      const yearNode = document.querySelector('[data-current-year]');
      if (yearNode) {
        yearNode.textContent = new Date().getFullYear();
      }

      document.dispatchEvent(new CustomEvent('taxpower:footer-loaded'));
    } catch (error) {
      console.error(error);
      slot.innerHTML = '<p class="footer-load-error">Footer could not be loaded.</p>';
    }
  }

  function loadSharedPageParts() {
    loadAllPageSections();
    loadSharedFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSharedPageParts, { once: true });
  } else {
    loadSharedPageParts();
  }
})();
