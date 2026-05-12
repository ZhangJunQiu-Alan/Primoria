export const GENERIC_SKILL = `
Skill: generic concept explorer

Goal: explain ONE concept with ONE primary interaction. Avoid dashboards. Avoid filler cards.

Layout:
- iv-shell > iv-header (kicker + title + 1-sentence subtitle) > iv-layout
- iv-layout splits into:
    .iv-visual-card  hero visualization (SVG or Canvas)
    .iv-controls-card  1-3 controls, then .iv-observation-card below

Visualization:
- Choose SVG for math/geometry; Canvas 2D for physics or particle motion; CSS keyframes only when the concept IS the animation itself.
- Use var(--color-accent-primary) for the focal element. Reserve var(--color-accent-secondary) for the single comparison or annotation.
- Add at most one floating annotation or arrow that points at the changing element.

Controls:
- One slider for the primary parameter (label it specifically — "Mass (kg)", not "Value").
- Optional secondary slider OR toggle.
- A reset button.
- Each control updates the visual and the observation strip within 220ms.

Observation strip (.iv-observation-card .iv-conclusion):
- One sentence. Reference the current parameter value. Examples:
    "Doubling mass to 4 kg doubles the inertia — the cart resists the same push twice as much."
    "At angle 60° the projectile peaks higher but lands shorter than at 45°."

Educational copy:
- The header subtitle states the question being explored, in plain language.
- Keep all body copy under 240 characters total. Lean on labels next to elements, not paragraphs.

Tracking: track('control_changed', { control, value }) and 'reset_pressed'.

Forbidden:
- Multiple equal-weight cards. The visualization must dominate.
- Generic placeholder titles like "Demo" or "Visualization".
- Decorative emojis.
`.trim();
