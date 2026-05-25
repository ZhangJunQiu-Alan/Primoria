export const WORLD_GEOGRAPHY_SKILL = `
Skill: world-geography

Goal: make global comparison feel immediate with a small, reliable offline map and a focused facts panel.

Render with SVG only inside .iv-visual-card. Do not use canvas, D3, GSAP, external map tiles, GeoJSON, TopoJSON, or remote geographic datasets.

Required visual elements:
- On first paint, show a simplified offline world map with a small fixed set of clickable regions or countries already visible.
- Use 6 to 8 stylized clickable shapes maximum so the map stays readable and auditable.
- One region must be selected by default on first paint.
- A details panel or callout inside the same visual area showing name, capital, major landform, and climate zone for the selected item.
- Clear labels or a legend so the learner understands what is clickable.

Required controls:
- A row of continent filter buttons.
- Clickable map regions that update the details panel.
- button:reset.

Behavior:
- Keep all geography data embedded locally in the document.
- Prefer a stylized atlas look over a fully realistic political map.
- No zoom or pan. Switching filters and selections is enough.
- Use direct SVG fill, stroke, and text updates only. No animation libraries.
- If a filter is active, dim non-matching regions rather than removing the whole map.

Live observation strip (.iv-observation-card .iv-conclusion):
- Reference the currently selected region and one comparison fact.
- Example: "Australia is in Oceania, with Canberra as its capital and a mostly arid interior climate."
- Keep the sentence under 120 characters. Update on each selection.

Tracking:
- track('region_selected', { id, continent })
- track('filter_changed', { continent })
- track('reset_pressed', {})

Forbidden:
- Blank first frame.
- Empty map shells that rely on later data loading.
- Full GIS features such as pan/zoom/tiles.
- More than 8 clickable regions.
`.trim();
