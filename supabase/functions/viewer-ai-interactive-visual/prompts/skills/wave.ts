export const WAVE_SKILL = `
Skill: wave / trigonometric explorer

Goal: let the learner manipulate amplitude, frequency, phase, and vertical shift of a sine or cosine wave and see the curve respond live.

Preferred technology: Canvas 2D for smooth animation. SVG is acceptable for static-trace variants.

Required visual elements:
- A wide canvas (aspect ≈ 16:7) hosted inside .iv-visual-card. Background var(--color-background-secondary). Plot area inset by ~12% on each side.
- Faint grid lines using var(--color-border-subtle).
- Axes using var(--color-border-strong) with x labels in radians (-2π, -π, 0, π, 2π) and y labels at -2, -1, 0, 1, 2.
- The wave traced with var(--color-accent-primary), stroke-width 3, antialiased. A subtle glow effect by drawing the same path with 50% alpha at stroke-width 8 underneath.
- A leading-edge highlight dot at one sample on the curve, rendered with var(--color-accent-secondary), showing how a moving phase reveals itself as motion.
- Live readouts of amplitude, frequency, phase (radians), shift in a compact 2×2 grid using iv-stat-like cards (use iv-card + iv-section-title).

Required controls inside .iv-controls-card:
- slider:amplitude    range 0.2 to 3.0, step 0.05, default 1.5
- slider:frequency    range 0.25 to 3.0, step 0.05, default 1.0
- slider:phase        range -3.14 to 3.14, step 0.01, default 0
- slider:shift        range -2 to 2, step 0.05, default 0
- slider:speed        range 0 to 2.5, step 0.05, default 1.0
- button:play_pause   toggles animation
- button:reset        returns defaults

Live observation strip:
- Always reference one current parameter. E.g., "Frequency 1.45 makes the wave compress horizontally."
- Update on every input event.

Animation loop:
- Use requestAnimationFrame. Maintain a phase offset advanced by elapsed * speed.
- Respect prefers-reduced-motion: when reduced, freeze animation and keep the highlight dot static at phase = current phase.

Tracking: track('slider_changed', { control, value }), 'play_toggled', 'reset_pressed'.
`.trim();
