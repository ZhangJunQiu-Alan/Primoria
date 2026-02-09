const authOverlay = document.querySelector('[data-auth-overlay]');
const openAuthButtons = document.querySelectorAll('[data-open-auth]');
const closeAuthButtons = document.querySelectorAll('[data-close-auth]');

const openAuth = () => {
  if (!authOverlay) return;
  authOverlay.classList.add('active');
  document.body.classList.add('modal-open');
  authOverlay.setAttribute('aria-hidden', 'false');
};

const closeAuth = () => {
  if (!authOverlay) return;
  authOverlay.classList.remove('active');
  document.body.classList.remove('modal-open');
  authOverlay.setAttribute('aria-hidden', 'true');
};

openAuthButtons.forEach((btn) => btn.addEventListener('click', openAuth));
closeAuthButtons.forEach((btn) => btn.addEventListener('click', closeAuth));

if (authOverlay) {
  authOverlay.addEventListener('click', (event) => {
    if (event.target === authOverlay) {
      closeAuth();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeAuth();
  }
});

const urlParams = new URLSearchParams(window.location.search);
if (window.location.hash === '#auth' || urlParams.get('auth') === '1') {
  openAuth();
}
