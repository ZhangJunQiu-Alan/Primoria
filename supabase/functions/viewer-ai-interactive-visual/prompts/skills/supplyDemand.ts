export const SUPPLY_DEMAND_SKILL = `
Skill: supply-demand

Goal: keep supply, demand, equilibrium, and market imbalance visible in one static graph that updates live.

Render with SVG only inside .iv-visual-card. Do not use canvas, Chart.js, D3, or hidden secondary charts.

Required visual elements:
- On first paint, show labeled price and quantity axes.
- Show one demand curve, one supply curve, and a marked equilibrium point immediately.
- Include one market-price reference line so shortages or surpluses can be explained directly.
- Keep all graph content above the fold.

Required controls:
- slider:demand_shift
- slider:supply_shift
- slider:market_price
- button:reset

Behavior:
- Redraw both curves directly in SVG when controls change.
- Update equilibrium price and quantity live.
- Explain shortage versus surplus from the difference between quantity demanded and quantity supplied at the chosen market price.
- Avoid blank graph containers and overly decorative economics cards.

Live observation strip (.iv-observation-card .iv-conclusion):
- Mention the current market condition and why it happens.
- Example: "At this price, demand exceeds supply, so a shortage appears until the market moves back toward equilibrium."
- Keep the sentence under 120 characters.

Tracking:
- track('market_shifted', { control, value })
- track('market_reset', {})
`.trim();
