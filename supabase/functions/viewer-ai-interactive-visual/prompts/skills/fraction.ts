export const FRACTION_SKILL = `
Skill: fraction explorer

Goal: make fraction relationships instantly visible and easy to edit. The learner should understand the current value without needing to infer it from the controls.

Layout:
- The hero region inside .iv-visual-card must render a complete first frame immediately.
- For each fraction state, render a self-contained illustration set with a full pie chart in a square visual area and the decimal conversion directly below the pie chart.
- Keep the current fraction text close to that illustration set so the learner can read the value immediately.
- For comparison requests, show side-by-side fraction states only when the prompt explicitly asks for comparing multiple values, with a maximum of two illustration sets per row and additional sets wrapped onto the next row.

Default state:
- On first paint, render a fully populated state for numerator 1 and denominator 1. Never leave the hero area blank.
- The 1/1 default must render as a full filled pie chart circle, not a partial arc or clipped shape.
- Show the current value at minimum as fraction form, one full pie chart, and the decimal conversion directly below the pie chart.
- Only add percentage, number-line, or other secondary representations when the learner request explicitly asks for them.
- Denominator must never fall below 1.

Controls:
- The primary control is a text input labeled clearly, such as "Enter fraction or decimal".
- Accept values like 2/5, 7/3, 0.032, or 1, then normalize the visual state from that input.
- Do NOT use a select dropdown as the main fraction picker.
- Include both a numerator slider and a denominator slider for these fraction-editing visuals.
- Numerator and denominator sliders must stay synchronized with the typed value, support both increasing and decreasing the value, and update labels while dragging via the input event.
- Only add add/remove comparison controls when the learner request explicitly asks to compare multiple fractions.

Behavior:
- Parse either fraction or decimal input and update the displays immediately.
- When any control changes, update the fraction text, decimal conversion, and pie fill within 220ms.
- If comparison is requested, keep fraction illustration sets side by side with at most two per row while preserving the same input-and-slider behavior for each set.
- The live observation should reference the current value in at least two forms, e.g. "2/5 equals 0.4."

Tracking:
- track('value_typed', { raw })
- track('fraction_changed', { numerator, denominator, decimal })
- track('reset_pressed')

Forbidden:
- Blank first frame.
- Clipped or partial default pie charts for 1/1.
- Unsynchronized sliders and labels.
- Missing numerator or denominator sliders.
- Fraction visuals without a decimal conversion directly below the pie chart.
- One-way slider behavior where values only increase or only decrease during drag.
- Comparison layouts that stack every fraction vertically when two-per-row space is available.
- Dropdown-only fraction selection for arbitrary numeric entry.
`.trim();
