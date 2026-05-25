export const LINEAR_FUNCTION_SKILL = `
Skill: linear-function

Goal: let the learner FEEL how slope a and intercept b change y = ax + b.

Render with SVG (preferred) inside .iv-visual-card. The SVG must scale to its container — set viewBox and preserveAspectRatio="xMidYMid meet" and width="100%" height="100%".

Required visual elements:
- Coordinate plane with x and y axes drawn with var(--color-border-strong). Tick marks every integer from -6 to 6 on both axes. Tick labels in var(--color-text-secondary), 12px, var(--font-mono).
- The line y = ax + b drawn with stroke var(--color-accent-primary), stroke-width 3, stroke-linecap round. Animate the d/path attribute change with a 220ms transition so changes feel alive.
- Y-intercept marker: a filled circle of radius 6 at (0, b) using var(--color-accent-primary), with a small label "b = <value>" anchored above the dot.
- Slope triangle: a dashed right triangle attached to the line illustrating Δx=1, Δy=a. Hypotenuse coincides with the line segment, the horizontal leg labelled "1" and the vertical leg labelled "a = <value>". Use var(--color-accent-secondary) for the dashed legs.
- Live formula readout in .iv-formula: render "y = <a> x + <b>" with the actual numbers, tabular-nums, var(--font-mono).

Required controls (use iv-control, iv-control-row, iv-label, iv-value):
- slider:a, range -5 to 5, step 0.1, default 1.
- slider:b, range -5 to 5, step 0.1, default 0.
- button:reset that returns a=1, b=0.

Live observation strip (.iv-observation-card .iv-conclusion):
- When |a| grows, say the line is rotating steeper around (0, b).
- When sign of a flips, say the line is reflecting through (0, b).
- When b changes, say the line is shifting vertically; the y-intercept moves to (0, <b>).
- Keep the sentence under 90 characters. Update on every input.

Tracking: call window.PrimoriaInteractive?.track?.('slider_changed', { control: 'a' | 'b', value }) and 'reset_pressed'.

Do not add unrelated controls (no color pickers, no zoom). Keep the chrome quiet so the line is the hero.
`.trim();
