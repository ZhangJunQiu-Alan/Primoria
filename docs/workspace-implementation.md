# Workspace Implementation Notes

This iteration turns Workspace from a static communication mock into a basic usable collaboration surface.

## Research-backed choices

- Next.js Route Handlers are the current fit for workspace reads and message writes because Primoria already uses App Router API routes, and the workspace needs ordinary request/response persistence before realtime complexity.
- React client state is used for room/direct selection, message draft handling, optimistic UI updates, and the details drawer because these are local interaction states.
- Drizzle/Postgres tables are used for the durable model because the app is already Postgres-first for auth, courses, apps, settings, and Copilot threads.
- Workspace interaction follows the common collaboration split of channels/rooms for shared context and direct messages for focused private context. Agent participants are modeled as normal members with a role/status so the UI can stay general-purpose instead of teacher/student-specific.
- Realtime fanout is intentionally deferred. The client uses lightweight polling for a basic live view, and the schema tracks `updatedAt` on workspace, threads, and tasks, so SSE or WebSocket fanout can be added without reshaping the data model.

Primary references checked before implementation:

- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- React `useState`: https://react.dev/reference/react/useState
- Drizzle schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration
- Slack conversation model: https://docs.slack.dev/reference/objects/conversation-object
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

## Current capability

- Workspace page loads a server-provided workspace view.
- Users can switch between Rooms and Direct chats.
- Users can create a new workspace with a default General room, owner member, AI teammate, and welcome message.
- Users can create either a new shared room or a new direct chat.
- Users can add simulated human or AI teammate members from the details drawer.
- Users can send messages through `POST /api/workspaces/[id]/messages`.
- Users can attach and publish a basic application card into the current chat.
- Users can create tasks and mark them complete/reopened from the task list.
- The workspace client refreshes the current view periodically so changes made through API calls are visible without a manual reload.
- Local development without `DATABASE_URL` uses an in-memory seed workspace so the UI remains usable.
- Signed-in Postgres mode seeds and persists workspace, members, threads, messages, and tasks.
- Details are collapsed by default and can be expanded for members, tasks, and the agent brief.

## Deliberately deferred

- True invite/join flow.
- Multi-user realtime fanout.
- Rich task editing, assignment rules, submissions, and analytics.
- Sharing real LearningApp records into workspace messages instead of manually entered app cards.
