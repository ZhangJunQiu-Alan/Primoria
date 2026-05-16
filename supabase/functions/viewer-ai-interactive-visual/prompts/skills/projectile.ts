export const PROJECTILE_SKILL = `
Skill: projectile motion explorer

Goal: show one clear projectile path with live flight metrics so learners can compare angle and speed without extra scene clutter.

Preferred technology: SVG only inside .iv-visual-card. Keep the layout static and auditable.

Required visual elements:
- A labeled coordinate view with a ground baseline, launch point, x/y axes, and one projectile trajectory already visible on first paint.
- The current trajectory path in var(--color-accent-primary), stroke-width 4, plus a faint comparison arc in var(--color-border-subtle) for the default launch settings.
- A visible apex marker and landing marker with short labels for max height and range.
- A compact metrics strip showing angle, launch speed, max height, range, and flight time with live numeric updates.

Required controls inside .iv-controls-card:
- slider:launch_angle   range 10 to 80, step 1, default 45
- slider:launch_speed   range 8 to 30, step 0.5, default 20
- button:reset          returns defaults

Physics rules:
- Use a simple no-drag projectile model with constant gravity 9.8 m/s^2.
- Recompute the trajectory directly from the current angle and speed on every input event.
- Keep all calculations local and deterministic. Do not use canvas, GSAP, D3, physics engines, or remote data.

Live observation strip:
- Always mention the current angle or speed and compare height vs range in one short sentence.
- Example: "At 60 degrees the arc peaks higher, but the range is shorter than the flatter launch."

Tracking: track('projectile_changed', { control, value }) and track('projectile_reset', {}).
`.trim();
