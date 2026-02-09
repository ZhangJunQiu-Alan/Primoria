const blockItems = document.querySelectorAll('[data-block]');
const canvas = document.querySelector('[data-canvas]');
const canvasList = document.querySelector('[data-canvas-list]');
const properties = document.querySelector('[data-properties]');
const categoryToggles = document.querySelectorAll('[data-category-toggle]');

const updateProperties = (title, type) => {
  if (!properties) return;
  properties.innerHTML = `
    <div><strong>Block</strong> ${title}</div>
    <div><strong>Type</strong> ${type}</div>
    <div><strong>Status</strong> Draft</div>
    <div><strong>Last update</strong> Just now</div>
  `;
};

const addBlockToCanvas = (label, type) => {
  if (!canvasList) return;
  const item = document.createElement('div');
  item.className = 'canvas-block';
  item.innerHTML = `
    <span>${label}</span>
    <button type="button">Configure</button>
  `;
  item.addEventListener('click', () => updateProperties(label, type));
  canvasList.appendChild(item);
  const placeholder = document.querySelector('.builder-canvas .placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  updateProperties(label, type);
};

blockItems.forEach((block) => {
  block.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', JSON.stringify({
      label: block.dataset.block,
      type: block.dataset.type
    }));
  });

  const addButton = block.querySelector('[data-add]');
  if (addButton) {
    addButton.addEventListener('click', () => {
      addBlockToCanvas(block.dataset.block, block.dataset.type);
    });
  }
});

if (canvas) {
  canvas.addEventListener('dragover', (event) => {
    event.preventDefault();
    canvas.classList.add('active');
  });

  canvas.addEventListener('dragleave', () => {
    canvas.classList.remove('active');
  });

  canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    canvas.classList.remove('active');
    const payload = event.dataTransfer.getData('text/plain');
    if (!payload) return;
    const data = JSON.parse(payload);
    addBlockToCanvas(data.label, data.type);
  });
}

categoryToggles.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const category = toggle.closest('[data-category]');
    if (!category) return;
    const isOpen = category.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    const chevron = toggle.querySelector('.chevron');
    if (chevron) {
      chevron.textContent = isOpen ? '-' : '+';
    }
  });
});
