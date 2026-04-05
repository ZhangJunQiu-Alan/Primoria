# Primoria Agent Service v1

## Why this service exists

The React learner app now already has a dedicated `/ai-tutor` surface and a legacy
`viewer-ai-tutor` Supabase Edge Function. That function is good for simple single-shot
Gemini prompts, but it is not the right place for a memory-aware, tool-using, multi-step
learning copilot.

So the architecture becomes:

```txt
viewer-react (/ai-tutor)
  -> agent-service (FastAPI + LangChain Deep Agents)
  -> Supabase Auth / PostgREST / RPC
```

## v1 scope

- authenticated learner chat
- read-only learner tools
- learner profile / stats / enrollment / course / lesson context
- thread id plumbing from frontend
- backward-compatible fallback to `viewer-ai-tutor` for studio tools

## Current frontend integration

`packages/viewer-react/src/shared/api/geminiClient.ts`

Behavior:
- if `VITE_AGENT_SERVICE_URL` is set, normal tutor reply requests go to `POST /v1/chat`
- if not set, the current Edge Function path is unchanged
- mind map / quiz / presentation still use the existing `viewer-ai-tutor` function for now

## Planned next steps

1. add streaming endpoint `/v1/chat/stream`
2. add real short-term checkpointer
3. add user-scoped long-term memory store
4. add richer tools (`weak_concepts`, `daily_activity`, `achievements`)
5. migrate tutor tools (mind map / quiz / presentation) onto agent-service
6. connect lesson and library page context directly into tutor calls
