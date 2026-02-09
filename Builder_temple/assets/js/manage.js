if (document.querySelector('[data-tab]')) {
const tabs = document.querySelectorAll('[data-tab]');
const panels = document.querySelectorAll('[data-panel]');

if (tabs.length && panels.length) {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== target;
      });
    });
  });
}

const sortButton = document.querySelector('[data-sort]');
if (sortButton) {
  sortButton.addEventListener('click', () => {
    const current = sortButton.dataset.sort;
    const next = current === 'time' ? 'popularity' : 'time';
    sortButton.dataset.sort = next;
    sortButton.textContent = `Sort by ${next}`;
  });
}

}
