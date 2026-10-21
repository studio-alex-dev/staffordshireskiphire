(() => {
  const status = (form, text) => {
    let node = form.querySelector('.static-form-status');
    if (!node) {
      node = document.createElement('p');
      node.className = 'static-form-status';
      node.setAttribute('role', 'status');
      form.append(node);
    }
    node.textContent = text;
  };
  document.addEventListener('keyup', event => {
    if (event.target.matches('form input[name="s"]')) event.stopImmediatePropagation();
  }, true);
  // Capture before the old Enfold AJAX listener can POST to a static page.
  document.addEventListener('submit', async event => {
    const form = event.target.closest('form');
    if (!form) return;
    const type = form.dataset.staticForm || (form.querySelector('[name="s"]') ? 'search' : null);
    if (!type) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (type === 'search') {
      const query = String(new FormData(form).get('s') ?? '').trim().toLowerCase();
      if (!query) return status(form, 'Please enter a search term.');
      try {
        const response = await fetch('/migration/search.json');
        if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
        const pages = await response.json();
        const matches = pages.filter(page => `${page.title} ${page.description}`.toLowerCase().includes(query));
        status(form, matches.length ? `${matches.length} matching pages:` : 'No matching pages found.');
        const list = document.createElement('ul');
        for (const page of matches) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = page.url;
          link.textContent = page.title;
          item.append(link);
          list.append(item);
        }
        form.querySelector('.static-form-status').append(list);
      } catch (error) {
        console.error('Static site search failed', error);
        status(form, 'Search is unavailable. Please use the navigation menu or call 01782 551 222.');
      }
      return;
    }
    if (type !== 'contact') {
      status(form, 'Online submission is not available on this archived page. Please call 01782 551 222.');
      return;
    }
    const endpoint = document.body.dataset.contactEndpoint;
    if (!endpoint) {
      status(form, 'Online enquiries are not yet enabled on this preview. No message has been sent. Please call 01782 551 222.');
      return;
    }
    const inputs = form.querySelectorAll('input[type="submit"],button[type="submit"]');
    inputs.forEach(input => { input.disabled = true; });
    try {
      const data = new FormData(form);
      const payload = {
        name: String(data.get('avia_1_1') ?? '').trim(),
        email: String(data.get('avia_2_1') ?? '').trim(),
        phone: String(data.get('avia_3_1') ?? '').trim(),
        subject: 'Staffordshire Skip Hire website enquiry',
        message: String(data.get('avia_4_1') ?? '').trim(),
        _gotcha: String(data.get('avia_5_1') ?? '')
      };
      if (!payload.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || !payload.phone || !payload.message) {
        status(form, 'Please enter your name, a valid email address, a phone number and your message.');
        return;
      }
      const captcha = form.querySelector('input.captcha');
      if (captcha) {
        const question = captcha.closest('p')?.querySelector('.value_verifier_label')?.textContent ?? '';
        const operands = question.match(/(\d+)\s*\+\s*(\d+)/);
        if (!operands || Number(captcha.value) !== Number(operands[1]) + Number(operands[2]) || !captcha.value.trim()) {
          status(form, 'Please answer the arithmetic question correctly.');
          return;
        }
      }
      const response = await fetch(endpoint, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`Enquiry HTTP ${response.status}`);
      location.assign('/services/thank-you/');
    } catch (error) {
      console.error('Enquiry delivery failed', error);
      status(form, 'Your message could not be sent. Please try again or call 01782 551 222.');
    } finally {
      inputs.forEach(input => { input.disabled = false; });
    }
  }, true);
})();
