export const PROGRAMMING_LOGIC_FLOW_SKILL = `
Skill: programming-logic-flow

Goal: make program state changes visible step by step through a fixed, auditable example with conditions and loops.

Render with SVG only inside .iv-visual-card. Do not use canvas, GSAP, or freeform code execution.

Required visual elements:
- On first paint, show a complete small flowchart already visible.
- Highlight exactly one current step at a time.
- Show a compact variable-state panel with at least a loop variable and one accumulated value.
- Show a small pseudocode list or labeled step list beside the flowchart.

Required controls:
- button:step
- button:auto
- button:reset

Behavior:
- Use one fixed example such as a loop with an odd/even branch. Do not generate arbitrary code from user input.
- Each step must advance deterministically and update both the highlighted node and the variable panel.
- Auto mode may replay the same step logic on a timer, but it must remain stoppable.
- Keep the diagram visible on first paint and avoid large empty cards.

Live observation strip (.iv-observation-card .iv-conclusion):
- Explain what the current branch or loop step is doing to state.
- Example: "Only odd values are added, so total increases when i reaches 3."
- Keep the sentence under 120 characters.

Tracking:
- track('logic_step', { current, i, total })
- track('logic_auto_start', {})
- track('logic_auto_stop', {})
- track('logic_reset', {})
`.trim();
