export const CHEMICAL_REACTIONS_SKILL = `
Skill: chemical-reactions

Goal: show one safe, understandable chemical reaction with a visible particle view and a live balanced-equation check.

Render with SVG only inside .iv-visual-card. Do not use canvas, D3, GSAP, CSS transform-based particle motion, or freeform chemistry sandboxes.

Required visual elements:
- On first paint, show one simple reaction already visible, such as 2H2 + O2 -> 2H2O.
- Separate reactant and product zones with a clear reaction arrow between them.
- A balanced equation readout with large, readable coefficients.
- A particle view made of labeled atoms or molecules using simple circles, bonds, and labels that stay visible on first paint.
- A compact legend that distinguishes at least two atom types by color and label.

Required controls (use iv-control, iv-control-row, iv-label, iv-value):
- stepper or button controls for the three coefficients in the displayed reaction.
- slider:temperature, range from low to high with a readable numeric label.
- button:reset.

Behavior:
- Keep the reaction set fixed and safe. Do not let the learner invent arbitrary chemicals.
- On first paint, the displayed coefficients should already be balanced.
- When coefficients change, update the equation and particle counts immediately.
- When temperature changes, show its effect through a simple collision-energy or reaction-speed indicator, not through a second unrelated simulation.
- Use short direct SVG updates only. No autoplay and no delayed reveal.

Live observation strip (.iv-observation-card .iv-conclusion):
- State whether the reaction is balanced and mention the current temperature state.
- Example: "The equation is balanced, and higher temperature means particles collide with more energy."
- Keep the sentence under 120 characters. Update on every input.

Tracking:
- track('reaction_changed', { coefficients, temperature })
- track('reset_pressed', {})

Forbidden:
- Blank first frame.
- Unsafe freeform mixing.
- More than one reaction scene at a time.
- Hidden particles that only appear after interaction.
`.trim();
