(() => {
  'use strict';
  // Existing taxpower.co prices; [one-time installation, annual AMC].
  const prices = {
    professional: { gst: [7000, 5000], billing: [5000, 3000], tds: [5000, 2500], 'gst+billing': [11000, 7000], 'gst+tds': [11000, 7000], 'billing+tds': [9000, 5000], 'gst+billing+tds': [15000, 8000] },
    business: { gst: [12000, 6000], billing: [7000, 4000], tds: [7000, 3500], 'gst+billing': [15000, 8000], 'gst+tds': [16000, 8500], 'billing+tds': [12000, 6500], 'gst+billing+tds': [20000, 10000] }
  };
  const labels = { gst: 'TaxPower GST', billing: 'TaxPower Billing', tds: 'TaxPower TDS' };
  const products = { gst: 'TaxPower GST Return', billing: 'TaxPower E-Invoice & E-Way Bill', tds: 'TaxPower TDS Return' };
  const money = value => '₹' + value.toLocaleString('en-IN');
  function init() {
    document.querySelectorAll('[data-pricing-builder]').forEach(builder => {
      if (builder.dataset.ready) return;
      builder.dataset.ready = 'true';
      const get = name => builder.querySelector('[data-plan-' + name + ']');
      const actions = [...builder.querySelectorAll('[data-plan-action]')];
      // Start a newly loaded chooser from the HTML defaults, including restored controls.
      builder.querySelectorAll('[name="tp-module"], [name="tp-edition"]').forEach(input => { input.checked = input.defaultChecked; });
      function renderBadges(selected, animate) {
        const container = get('badges');
        const motion = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        container.querySelectorAll('[data-exit]').forEach(node => node.remove());
        const previous = new Map([...container.children].map(node => [node.dataset.product, { node, rect: node.getBoundingClientRect() }]));
        const bounds = container.getBoundingClientRect();
        previous.forEach(({ node, rect }, key) => {
          node.getAnimations?.().forEach(animation => animation.cancel());
          if (!selected.includes(key)) {
            if (motion && node.animate) {
              const ghost = node.cloneNode(true);
              ghost.removeAttribute('data-product');
              ghost.dataset.exit = '';
              ghost.setAttribute('aria-hidden', 'true');
              Object.assign(ghost.style, { position: 'absolute', left: (rect.left - bounds.left) + 'px', top: (rect.top - bounds.top) + 'px', width: rect.width + 'px' });
              container.append(ghost);
              ghost.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(14px)' }], { duration: 180, easing: 'ease-out' }).finished.then(() => ghost.remove(), () => ghost.remove());
            }
            node.remove();
          }
        });
        selected.forEach(key => {
          let node = previous.get(key)?.node;
          if (!node) {
            node = document.createElement('span');
            node.className = 'tp-selected-badge';
            node.dataset.product = key;
            node.textContent = labels[key];
          }
          container.append(node);
        });
        if (motion) selected.forEach(key => {
          const node = container.querySelector('[data-product="' + key + '"]');
          const old = previous.get(key)?.rect;
          const rect = node.getBoundingClientRect();
          const x = old ? old.left - rect.left : -36;
          const y = old ? old.top - rect.top : 0;
          if (!old || x || y) node.animate?.([
            { opacity: old ? 1 : 0, transform: 'translate(' + x + 'px,' + y + 'px)' },
            { opacity: 1, transform: 'translate(0,0)' }
          ], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
        });
      }
      function update(animate = false) {
        const edition = builder.querySelector('[name="tp-edition"]:checked').value;
        const selected = [...builder.querySelectorAll('[name="tp-module"]:checked')].map(input => input.value);
        const plan = prices[edition][selected.join('+')];
        get('count').textContent = selected.length + (selected.length === 1 ? ' product selected' : ' products selected');
        get('edition').textContent = edition === 'business' ? 'BUSINESS EDITION' : 'PROFESSIONAL EDITION';
        renderBadges(selected, animate);
        get('price').textContent = plan ? money(plan[0]) : '—';
        get('renewal').textContent = plan ? money(plan[1]) : '—';
        const separate = selected.reduce((sum, key) => sum + prices[edition][key][0], 0);
        const saving = plan ? separate - plan[0] : 0;
        get('original').hidden = !saving;
        get('original').textContent = saving ? money(separate) : '';
        get('saving').hidden = !saving;
        get('saving').textContent = saving ? 'Save ' + money(saving) + ' on installation vs separate modules' : '';
        get('mobile-price').textContent = money(plan[0]);
        actions.forEach(action => {
          action.dataset.demoProduct = selected.map(key => products[key]).join(',');
          action.dataset.demoPurpose = action.dataset.planAction === 'quote' ? 'Pricing or Quotation' : 'Free Trial / Demo';
        });
        if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          get('price-details').getAnimations?.().forEach(animation => animation.cancel());
          get('price-details').animate?.([{ opacity: .5 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
        }
      }
      builder.addEventListener('change', event => {
        get('message').textContent = '';
        if (!builder.querySelector('[name="tp-module"]:checked')) {
          event.target.checked = true;
          get('message').textContent = 'Keep at least one product selected. Select another product first to switch.';
        }
        update(true);
      });
      update();
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          builder.classList.toggle('tp-plan-in-view', entries[0].isIntersecting);
        });
        observer.observe(builder);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('taxpower:sections-loaded', init);
})();
