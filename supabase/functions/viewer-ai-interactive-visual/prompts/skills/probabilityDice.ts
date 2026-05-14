export const PROBABILITY_DICE_SKILL = `
Skill: probability-dice

Goal: make experimental probability visible immediately and easy to compare with theory as trials accumulate.

Render with SVG only inside .iv-visual-card. Do not use canvas, Chart.js, D3, GSAP, or delayed chart creation.

Required visual elements:
- On first paint, show a histogram that is already populated with a small starter sample for 2 dice so the visual is never blank.
- Experimental bars in var(--color-accent-primary).
- A simple theoretical probability overlay using dots, a line, or slim markers in var(--color-accent-secondary).
- Clear x-axis labels for outcomes and y-axis labels for counts or percentages.
- A compact stats readout for total rolls and the currently most common outcome.

Required controls:
- select:number_of_dice with 1, 2, or 3 dice.
- button:roll_1.
- button:roll_25.
- button:reset.

Behavior:
- Seed the first frame with a small fixed sample so bars are visible before any interaction.
- Updating the dice count should immediately redraw the histogram and theoretical overlay for that mode.
- Rolling more trials should append to the current sample and refresh the bars live.
- Keep the implementation deterministic enough to audit: use plain arrays and direct SVG updates.
- No autoplay rolling and no empty chart containers.

Live observation strip (.iv-observation-card .iv-conclusion):
- Mention total trials and whether the experimental distribution is moving closer to theory.
- Example: "After 49 rolls, the middle sums are appearing most often, which is closer to the theoretical pattern."
- Keep the sentence under 120 characters. Update after every roll action.

Tracking:
- track('dice_count_changed', { dice })
- track('roll_batch', { amount, dice })
- track('reset_pressed', {})

Forbidden:
- Blank first frame.
- Hidden histogram bars below the fold.
- More than one chart.
- Animation-library timing derived from CSS duration tokens.
`.trim();
