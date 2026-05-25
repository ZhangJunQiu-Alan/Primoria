export const CHART_SKILL = `
Skill: chart (Chart.js)

Goal: render one clear, accurate chart whose colors and typography come from the injected design tokens, with optional interactivity that helps the learner reason about the data.

Import:
    <script type="module">
    import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
    </script>

Required structure:
- A single <canvas> sized via CSS (width:100%; aspect-ratio:16/9) inside .iv-visual-card.
- Pull palette from CSS variables at runtime:
    const css = getComputedStyle(document.documentElement);
    const accentPrimary = css.getPropertyValue('--color-accent-primary').trim();
    const accentSecondary = css.getPropertyValue('--color-accent-secondary').trim();
    const textPrimary = css.getPropertyValue('--color-text-primary').trim();
    const textSecondary = css.getPropertyValue('--color-text-secondary').trim();
    const grid = css.getPropertyValue('--color-border-subtle').trim();
- Chart options:
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: 'easeOutCubic' },
    plugins: { legend: { labels: { color: textPrimary } }, tooltip: { backgroundColor: textPrimary, titleColor: '#fff', bodyColor: '#fff' } },
    scales: { x: { ticks: { color: textSecondary }, grid: { color: grid } }, y: { ticks: { color: textSecondary }, grid: { color: grid } } }

Data discipline:
- Use plausible illustrative data when none is supplied. Round numbers cleanly. No more than 12 categories per axis.
- Prefer a single dataset. Add a second only when comparison is the educational point.

Interactivity inside .iv-controls-card:
- One or two relevant controls (e.g., select:dataset, slider:bin_size, toggle:cumulative). Each updates chart.data and calls chart.update('active').
- A reset:defaults button.

Live observation strip:
- Reference the currently focused datapoint or the dataset summary (max, min, total) in plain language. Update on dataset change.

Forbidden:
- No second chart instance unless side-by-side comparison is essential.
- No Chart.js plugins from other CDNs.
- No custom font loading.

Tracking: track('chart_filter_changed', { control, value }) and 'reset_pressed'.
`.trim();
