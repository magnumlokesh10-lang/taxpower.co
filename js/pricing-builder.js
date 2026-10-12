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
      function update(animate = false) {
        const edition = builder.querySelector('[name="tp-edition"]:checked').value;
        const selected = [...builder.querySelectorAll('[name="tp-module"]:checked')].map(input => input.value);
        const plan = prices[edition][selected.join('+')];
        get('count').textContent = selected.length + (selected.length === 1 ? ' product selected' : ' products selected');
        get('edition').textContent = edition === 'business' ? 'BUSINESS EDITION' : 'PROFESSIONAL EDITION';
        get('name').textContent = selected.length ? selected.map(key => labels[key]).join(' + ') : 'Select at least one product';
        get('price').textContent = plan ? money(plan[0]) : '—';
        get('renewal').textContent = plan ? money(plan[1]) : '—';
        const separate = selected.reduce((sum, key) => sum + prices[edition][key][0], 0);
        const saving = plan ? separate - plan[0] : 0;
        get('original').hidden = !saving;
        get('original').textContent = saving ? money(separate) : '';
        get('saving').hidden = !saving;
        get('saving').textContent = saving ? 'Save ' + money(saving) + ' on installation vs separate modules' : '';
        get('base').textContent = money(plan[0]);
        get('gst').textContent = money(Math.round(plan[0] * .18));
        const total = money(plan[0] + Math.round(plan[0] * .18));
        get('total').textContent = total;
        get('mobile-total').textContent = total;
        actions.forEach(action => {
          action.dataset.demoProduct = selected.map(key => products[key]).join(',');
          action.dataset.demoPurpose = action.dataset.planAction === 'quote' ? 'Pricing or Quotation' : 'Free Trial / Demo';
        });
        if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          get('output').animate?.([{ opacity: .45, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: 'ease-out' });
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
