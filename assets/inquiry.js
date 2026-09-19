(function () {
  const forms = document.querySelectorAll('form[data-project-inquiry]');
  forms.forEach(form => {
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.inquiry-status');
    if (!button || !status) return;
    const label = button.textContent;
    let pending = false;
    let sent = false;
    function show(message, state) {
      status.hidden = false;
      status.dataset.state = state;
      status.textContent = message;
    }
    form.addEventListener('input', () => {
      if (sent && !pending) {
        sent = false;
        button.disabled = false;
        button.textContent = label;
        status.hidden = true;
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending || sent || !form.reportValidity()) return;
      pending = true;
      button.disabled = true;
      button.textContent = 'SENDING…';
      show('Sending your project brief. Please wait.', 'pending');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        delete data.redirect;
        data.source_page = window.location.origin + window.location.pathname;
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          body: JSON.stringify(data),
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok || result.success !== true) throw new Error('Submission not confirmed');
        sent = true;
        button.textContent = 'PROJECT BRIEF SENT';
        show('Thank you. Your project brief has been submitted. Our team will contact you using the details provided. You can also send project files using the WhatsApp button.', 'success');
        // No personal details are sent to analytics. Connect this event in your analytics account.
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({event: 'project_inquiry_success', form_id: form.id || 'contact', page_path: window.location.pathname});
      } catch (error) {
        const message = error.name === 'AbortError'
          ? 'We could not confirm receipt in time. Your details are still here. Please contact us on WhatsApp to check before sending again.'
          : 'We could not confirm your submission. Your details are still here. Please try again, email sales@sportenvo.com or use the WhatsApp button.';
        show(message, 'error');
        button.textContent = label;
      } finally {
        clearTimeout(timer);
        pending = false;
        button.disabled = sent;
        status.focus();
      }
    });
  });
})();
