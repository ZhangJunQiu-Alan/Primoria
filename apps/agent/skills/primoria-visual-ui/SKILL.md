---
name: "primoria-visual-ui"
description: "Use for interactive educational widgets, algorithm visualizations, simulations, diagrams, and visual explanations in Primoria."
allowed-tools: []
---

# Primoria visual UI

## Response pattern

For visual requests, use the OpenGenerativeUI-style pipeline:

1. Acknowledge briefly in 1-2 sentences.
2. Call `plan_visualization` with the approach, technology, and 2-4 key elements.
3. Call `widgetRenderer` with a complete self-contained HTML fragment.
4. Stop after the widget tool returns; the widget itself is the answer.

Never paste HTML/CSS/JS in normal assistant text. HTML belongs only inside `widgetRenderer.html`.

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
