export const GEOMETRY_TRANSFORMATIONS_SKILL = `
Skill: geometry-transformations

Goal: make one transformed shape easy to compare against its original on a coordinate plane. The learner should immediately see what moved, rotated, reflected, or scaled.

Render with SVG only inside .iv-visual-card. Use a responsive SVG with viewBox and preserveAspectRatio="xMidYMid meet". Do not use canvas, D3, GSAP, or CSS transform-based geometry.

Required visual elements:
- Coordinate plane with readable x and y axes, integer tick marks, and tick labels in var(--color-text-secondary), 12px, var(--font-mono).
- One original triangle rendered on first paint as a faint reference using var(--color-accent-secondary) with low opacity or dashed stroke.
- One transformed triangle rendered on first paint as the hero shape using var(--color-accent-primary), with a stronger stroke than the reference triangle.
- Clear vertex labels for both shapes, such as A/B/C and A'/B'/C', placed near each vertex.
- A compact coordinate readout showing the transformed vertex coordinates in text that updates live.

Required controls (use iv-control, iv-control-row, iv-label, iv-value):
- slider:translate_x, range -6 to 6, step 0.5.
- slider:translate_y, range -6 to 6, step 0.5.
- slider:rotation_degrees, range -180 to 180, step 5.
- slider:scale, range 0.5 to 2, step 0.1.
- toggle:reflect_x to reflect across the x-axis.
- button:reset.

Behavior:
- On first paint, both the original and transformed triangles must already be visible. Never leave the hero area blank.
- Start from one fixed base triangle and compute transformed coordinates in JavaScript from that base data.
- Update SVG geometry directly with setAttribute('points', ...) for polygons and setAttribute('x'/'y', ...) for labels. Do not move the triangle with CSS transform, translate(), rotate(), or scale().
- Keep motion minimal: a short 220ms update is fine, but no autoplay animation, no multi-step choreography, and no delayed reveal.
- Keep the transformed triangle inside the visible coordinate plane in the default state.

Live observation strip (.iv-observation-card .iv-conclusion):
- Mention the current transformation in plain language, referencing at least two active values.
- Example: "The triangle is rotated 30° and shifted 2 units right, so each vertex keeps its shape but moves to a new position."
- Keep the sentence under 120 characters. Update on every input.

Tracking:
- track('transform_changed', { translate_x, translate_y, rotation_degrees, scale, reflect_x })
- track('reset_pressed', {})

Forbidden:
- Drag interactions.
- Multiple unrelated shapes or modes.
- Blank first frame.
- CSS transform-based movement of the SVG triangle or labels.
- Hidden geometry that only appears after the first interaction.
`.trim();
