# OpenGenerativeUI patterns to adapt for Primoria Web

Primoria should borrow the architecture, not the exact visual skin.

## Web patterns we are adopting

- Chat-first shell: the tutor is the primary workspace.
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
- `/api/tutor/chat` is the current TypeScript route backed by an OpenAI-compatible provider.
- TypeScript tool pipeline now mirrors the first OpenGenerativeUI backend pattern:
  - tutor orchestrator decides whether a visual tool is needed
  - `planVisualization()` creates a plan artifact
  - `renderInteractiveWidget()` creates the iframe widget artifact
  - the chat renders both the plan card and widget card inline
- Tool execution now streams as NDJSON when the client passes `stream: true`:
  - `assistant_message`
  - `tool_status` executing/complete
  - `artifact_delta` for streaming widget HTML
  - `artifact`
  - `final`
- Chat messages persist locally and can be reset with New tutor chat.

## Still not adopted

- No CopilotKit runtime route yet.
- No real DeepAgent runtime yet.
- No LangGraph-style state/checkpointer yet.
- `usePrimoriaGenerativeUI` is not mounted in the app runtime yet.
