const ready = (fn) => {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
};

ready(() => {
  document.body.classList.add('loaded');

  const toggleButtons = document.querySelectorAll('[data-toggle="sidebar"]');
  const overlay = document.querySelector('[data-overlay]');

  const closeSidebar = () => document.body.classList.remove('sidebar-open');
  const openSidebar = () => document.body.classList.add('sidebar-open');

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (document.body.classList.contains('sidebar-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  });

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  const countups = document.querySelectorAll('[data-countup]');
  if (countups.length) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = Number(el.dataset.countup || el.textContent.replace(/[^0-9.]/g, ''));
          const suffix = el.dataset.suffix || '';
          const duration = 900;
          const start = performance.now();
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.floor(progress * target);
            el.textContent = `${value}${suffix}`;
            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
          obs.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );

    countups.forEach((el) => observer.observe(el));
  }
});
