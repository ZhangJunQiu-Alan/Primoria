---
name: "primoria-visual-ui"
description: "Use only for custom interactive educational widgets that do not fit the reviewed catalog or a specialized structured renderer."
allowed-tools: ["plan_visualization", "widgetRenderer"]
---

# Primoria visual UI

## Response pattern

Use the production routing order before applying this fallback:

1. If a reviewed Catalog component fits, call `open_interactive_component`; do not use this skill.
2. If a specialized chart, diagram, physics, algorithm, math, 3D, wave, graph, or molecule renderer fits, call that renderer directly; do not use this skill.
3. Only for a remaining custom sandbox case, acknowledge briefly, call `plan_visualization`, then immediately call `widgetRenderer` with a complete self-contained HTML fragment.
4. Stop after `widgetRenderer` returns; the widget itself is the answer.

`plan_visualization` and `widgetRenderer` are an inseparable fallback pair. Never paste HTML/CSS/JS in normal assistant text; HTML belongs only inside `widgetRenderer.html`.

## Widget rules

- Return an HTML fragment only: no `<!doctype>`, `<html>`, `<head>`, or `<body>`.
- Inline `<style>` and `<script>` are allowed.
- Use Primoria's soft palette: cream backgrounds `#fbf7ee` / `#fffaf2`; tinted highlight fills with matching borders:
  - amber `#fff2de` + `#c8881a`
  - sage `#e8f3ea` + `#4a7a5a`
  - lavender `#efe7d7` + `#7c6ad0`
  - rose `#fbeaf0` + `#b56474`
- Avoid black, neon, heavy shadows, emoji decoration, dead controls, and external non-module scripts.
- Prefer HTML + inline SVG for algorithms/processes; use Chart.js only for real data; use Three.js only when 3D is essential.
- Every control must visibly change the widget.
- Keep widgets compact enough for a chat card.
- Use `window.sendPrompt("...")` or `data-prompt="..."` only for useful follow-up drilldowns.
