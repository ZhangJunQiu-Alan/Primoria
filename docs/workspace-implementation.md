# Workspace Implementation Notes

This iteration turns Workspace from a static communication mock into a basic usable collaboration surface.

## Research-backed choices

- Next.js Route Handlers are the current fit for workspace reads and message writes because Primoria already uses App Router API routes, and the workspace needs ordinary request/response persistence before realtime complexity.
- React client state is used for room/direct selection, message draft handling, optimistic UI updates, and the details drawer because these are local interaction states.
- Drizzle/Postgres tables are used for the durable model because the app is already Postgres-first for auth, courses, apps, settings, and Copilot threads.
- Realtime is intentionally deferred. The schema tracks `updatedAt` on workspace, threads, and tasks, so polling, SSE, or WebSocket fanout can be added without reshaping the data model.

Primary references checked before implementation:

- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- React `useState`: https://react.dev/reference/react/useState
- Drizzle schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

## Current capability

- Workspace page loads a server-provided workspace view.
- Users can switch between Rooms and Direct chats.
- Users can send messages through `POST /api/workspaces/[id]/messages`.
- Local development without `DATABASE_URL` uses an in-memory seed workspace so the UI remains usable.
- Signed-in Postgres mode seeds and persists workspace, members, threads, messages, and tasks.
- Details are collapsed by default and can be expanded for members, tasks, and the agent brief.

## Deliberately deferred

- True invite/join flow.
- Multi-user realtime fanout.
- Task creation/editing UI.
- Sharing real LearningApp records into workspace messages.
