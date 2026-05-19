# Primoria Web implementation status

## Current result

The Web app is now a real AI Tutor implementation, not a static mock.

Implemented:

- Next.js / React / TypeScript web app under `apps/web`
- Chat-first AI Tutor UI
- Light Primoria visual style
- Settings modal for OpenAI-compatible provider config
- Local chat persistence with New chat reset
- TypeScript backend route: `POST /api/tutor/chat`
- OpenAI-compatible chat completions client
- Lightweight DeepAgent-style tutor team prompt
- Structured model response:
  - normal text reply
  - visualization plan artifact
  - `html_widget` artifact
  - `code` artifact
  - suggestions
- TypeScript visual tool pipeline:
  - orchestrator decides whether a visual is needed
  - `planVisualization`
  - `renderInteractiveWidget`
- Streaming tool events over NDJSON:
  - assistant message
  - tool status
  - widget HTML delta
  - artifact
  - final result
- Sandboxed iframe renderer for interactive HTML/CSS/JS widgets
- Runtime iframe resize bridge
- OpenGenerativeUI-style widget shell:
  - Primoria theme CSS injection
  - SVG helper classes
  - form/input default styles
  - import map for approved visualization modules
  - widget-to-tutor prompt bridge
- Real browser E2E verification against `https://ai.orbitlink.me/v1`

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

Preview artifacts:

- `docs/primoria-web-settings.png`
- `docs/primoria-web-real-widget.png`

## Next implementation steps

1. Add streaming response so the user sees progress before the model finishes.
2. Add real tool registry:
   - `render_interactive_widget`
   - `generate_practice`
   - `generate_course`
   - `save_course`
3. Add Library/Course pages after AI Tutor feels polished.
4. Replace the prompt-only DeepAgent style with an explicit TypeScript orchestration pipeline if needed:
   - classify intent
   - plan
   - generate explanation
   - generate widget
   - validate artifact
   - render response
