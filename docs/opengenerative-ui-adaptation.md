# OpenGenerativeUI patterns to adapt for Primoria Web

Primoria should borrow the architecture, not the exact visual skin.

## Web patterns we are adopting

- Chat-first shell: the tutor is the primary learning surface.
- Tool rendering: agent calls become inline UI blocks inside the chat.
- Controlled generative UI: React components registered by name and schema.
- Sandboxed widget renderer: arbitrary HTML/SVG/CSS/JS renders inside an iframe.
- Resize bridge: the iframe reports its height to the parent for seamless layout.
- Frontend tools: safe browser actions like opening the library or changing view state.
- Default tool renderer: unrecognized tools still show status instead of disappearing.
- Human review gates: generated courses should be reviewed before saving/publishing.

## Primoria-specific changes

- Visual style stays light, warm, and education-oriented.
- No dark chat bubbles or heavy black code panels by default.
- AI identity is represented as an agent cluster, not a single avatar.
- Backend should be TypeScript first. The Python agent from OpenGenerativeUI is not copied.

## Implementation status

- `apps/web` now contains the first Next.js/TypeScript Web scaffold.
- `WidgetRenderer` implements the sandboxed iframe shell pattern with:
  - persistent iframe shell
  - postMessage content updates
  - Primoria theme variables
  - SVG utility classes
  - default form control styling
  - approved import map modules: `three`, `gsap`, `d3`, `chart.js`
  - resize bridge
  - widget-to-tutor prompt bridge via `window.sendPrompt()` and `data-prompt`
- `usePrimoriaGenerativeUI` sketches the CopilotKit registration layer.
- The active tutor route is CopilotKit -> LangGraph `primoria_tutor`.
- LangGraph owns intent routing and tool calls for course generation, widget rendering, and STEM simulations.
- CopilotKit renders tool results in the chat and stores local thread history by thread id.

## Still not adopted

- Reuse of saved apps through a router agent remains future work.
