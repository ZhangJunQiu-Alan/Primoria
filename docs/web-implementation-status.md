# Primoria Web implementation status

## Current result

The Web app is now a real AI Tutor implementation, not a static mock.

Implemented:

- Next.js / React / TypeScript web app under `apps/web`
- Chat-first AI Tutor UI
- Light Primoria visual style
- Settings modal for OpenAI-compatible provider config
- CopilotKit thread history with New chat reset
- CopilotKit runtime route backed by the LangGraph `primoria_tutor` graph
- OpenAI-compatible and Anthropic-compatible model configuration
- DeepAgent/LangGraph tutor prompt
- Structured model response:
  - normal text reply
  - visualization plan artifact
  - `html_widget` artifact
  - `code` artifact
  - suggestions
- LangGraph visual tool pipeline:
  - prompt routing chooses course, visualization, STEM simulation, greeting, or concept answer
  - `plan_visualization`
  - `widgetRenderer`
  - `stemRenderer`
- Sandboxed iframe renderer for interactive HTML/CSS/JS widgets
- Runtime iframe resize bridge
- OpenGenerativeUI-style widget shell:
  - Primoria theme CSS injection
  - SVG helper classes
  - form/input default styles
  - import map for approved visualization modules
  - widget-to-tutor prompt bridge
- Local verification through CopilotKit and LangGraph Studio

## Runtime config

Server defaults live in `apps/web/.env.local`:

```env
OPENAI_BASE_URL=https://ai.orbitlink.me/v1
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4
```

The UI Settings modal can override:

- Base URL
- Model
- API key

Blank settings use server defaults.

## Verification

Passed:

- `pnpm --filter @primoria/web typecheck`
- `pnpm --filter @primoria/web build`
- Browser E2E: user prompt → API route → OpenAI-compatible backend → model generated `html_widget` → iframe render

## Next implementation steps

1. Route adaptive course requests through knowledge-graph positioning before generation.
2. Add explicit structured intent routing if prompt-only routing becomes unstable.
