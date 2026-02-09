const authButtons = document.querySelectorAll('[data-auth-action]');
const statusEl = document.querySelector('[data-auth-status]');

if (authButtons.length && statusEl) {
  authButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      statusEl.textContent = 'Demo mode: authentication UI only.';
      statusEl.classList.add('active');
      setTimeout(() => statusEl.classList.remove('active'), 2000);
    });
  });
}
