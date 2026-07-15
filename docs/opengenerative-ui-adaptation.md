# OpenGenerativeUI Patterns Adapted For Primoria Web

Status: current implementation reference, July 2026. Primoria borrows the
architectural patterns, not the exact visual skin or backend stack.

## Web patterns we are adopting

- Chat-first shell: the tutor is the primary learning surface.
- Tool rendering: agent calls become inline UI blocks inside the chat.
- Controlled generative UI: 19 reviewed React components registered by id and
  validated schema in the all-subject visualization catalog.
- Sandboxed widget renderer: arbitrary HTML/SVG/CSS/JS renders inside an iframe.
- Resize bridge: the iframe reports its height to the parent for seamless layout.
- Frontend tools: safe browser actions like opening the library or changing view state.
- Default tool renderer: unrecognized tools still show status instead of disappearing.
- Review gates: generated graph candidates should be reviewed before promotion;
  course creation itself is persisted through the app-owned Postgres course flow.

## Primoria-specific changes

- Visual style stays light, warm, and education-oriented.
- No dark chat bubbles or heavy black code panels by default.
- AI identity is represented as an agent cluster, not a single avatar.
- The product backend is Web-owned TypeScript plus a plain-ESM Node Agent
  runtime. The Python agent from OpenGenerativeUI is not copied.

## Implementation status

- `apps/web` is the production Next.js application and owner of product data,
  authentication, policy, course generation, and interactive-component config.
- `WidgetRenderer` implements the sandboxed iframe shell pattern with:
  - persistent iframe shell
  - postMessage content updates
  - Primoria theme variables
  - SVG utility classes
  - default form control styling
  - dependencies validated against the shared allowlist in
    `packages/contracts/src/artifacts/widget-dependencies.mjs`
  - resize bridge
  - widget-to-tutor prompt bridge via `window.sendPrompt()` and `data-prompt`
- The active Tutor route is Browser CopilotKit UI →
  `apps/web/src/app/api/copilotkit/route.ts` → `PrimoriaHttpAgent` → internal
  AG-UI `POST /agent` → `apps/agent/src/graph.mjs`.
- LangGraph owns intent/tool orchestration. For course creation, the agent emits
  `position_learning_goal`; the web side performs KG positioning, persistence,
  and lesson-job enqueueing.
- For common interactive explanations, the main model chooses
  `open_interactive_component` from a compact catalog projection. The frontend
  tool handler calls authenticated `/api/interactive-component`; the Web stage
  creates a full validated config or a minimal patch, and
  `InteractiveComponentCard` renders it. The Agent never receives that config.
- Specialized structured renderers cover common diagrams, charts, maps,
  timelines, equations, and comparisons. `plan_visualization` →
  `widgetRenderer` is the open-ended sandbox fallback.
- CopilotKit renders tool results in the chat. Thread history is persisted
  through the app-owned Postgres chat tables.

## Still not adopted

- Arbitrary sandbox widgets are not automatically saved or published as apps.
- A user-facing generated-app library, review lifecycle, and reuse router remain
  future work.
