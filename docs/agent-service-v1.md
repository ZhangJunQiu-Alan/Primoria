# Primoria Agent Service v1

## Why this service exists

The React learner app now has a dedicated `/ai-tutor` surface backed by
`agent-service`. The old single-shot edge-function path has been retired in favor of
a memory-aware, tool-using, multi-step learning copilot.

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
- thread + message persistence in Supabase
- tool endpoints for mind map / quiz / presentation
- thread list + message history endpoints
- course detail aggregation endpoint

## Current frontend integration

`packages/viewer-react/src/shared/api/geminiClient.ts`

Behavior:
- tutor replies go to `POST /v1/chat` and `POST /v1/chat/stream`
- tutor tools go to:
  - `POST /v1/tools/mindmap`
  - `POST /v1/tools/quiz`
  - `POST /v1/tools/presentation`
- thread bootstrap and history go to:
  - `POST /v1/threads`
  - `GET /v1/threads`
  - `GET /v1/threads/:id/messages`
- course detail can be served by `GET /v1/courses/:id/detail`

## Planned next steps

1. connect lesson/page/block context from more viewer surfaces
2. expose thread rename/archive endpoints
3. add richer tutor tools (`weak_concepts`, `daily_activity`, `achievements`)
4. add server-side summarization / artifact caching for tutor tools
