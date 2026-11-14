(() => {
  const dialog = document.querySelector('#booking-dialog');
  const opener = document.querySelector('[data-open-booking]');
  const close = dialog.querySelector('.dialog-close');
  const message = dialog.querySelector('#booking-message');
  const copy = dialog.querySelector('.copy-enquiry');
  const email = dialog.querySelector('.email-enquiry');
  const status = dialog.querySelector('.copy-status');

  const updateEmail = () => {
    email.href = `mailto:shrookmusic@gmail.com?subject=${encodeURIComponent('Shrook booking inquiry')}&body=${encodeURIComponent(message.value)}`;
  };
  opener.addEventListener('click', () => {
    status.textContent = '';
    updateEmail();
    dialog.showModal();
    message.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  message.addEventListener('input', updateEmail);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message.value);
    } catch (_) {
      message.focus();
      message.select();
      document.execCommand('copy');
    }
    status.textContent = 'Message copied. Paste it into your email or messaging app.';
    copy.textContent = 'Copied';
    setTimeout(() => { copy.textContent = 'Copy message'; }, 1800);
  });
})();
