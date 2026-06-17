# Workspace Implementation Notes

This iteration turns Workspace from a static concept into a basic usable collaboration surface.

## Research-backed choices

- Next.js Route Handlers are the current fit for workspace reads and message writes because Primoria already uses App Router API routes, and the workspace needs ordinary request/response persistence before realtime complexity.
- React client state is used for room/direct selection, message draft handling, optimistic UI updates, and the details drawer because these are local interaction states.
- Drizzle/Postgres tables are used for the durable model because the app is already Postgres-first for auth, courses, apps, settings, and Copilot threads.
- Workspace interaction follows the common collaboration split of channels/rooms for shared context and direct messages for focused private context. Agent participants are modeled as normal members with a role/status so the UI can stay general-purpose instead of teacher/student-specific.
- Direct chats store participant rows and the persisted workspace view filters direct threads, messages, and tasks to participating users. Rooms remain visible to workspace members.
- Direct chat participants are stored in `workspace_thread_members` instead of JSON metadata so persisted permissions stay relational and queryable.
- Workspace invites use server-validated invite codes instead of purely client-side state. Joined users are granted access through `workspace_members`, which keeps the path open for real account-backed membership.
- Realtime uses a lightweight Server-Sent Events stream for the current workspace, with polling fallback if the stream fails. The schema tracks `updatedAt` on workspace, threads, and tasks, so WebSocket fanout can still be added later without reshaping the data model.
- Shared Library apps open in a contextual preview dialog and HTML apps render through the existing sandboxed iframe renderer. The workspace shell never injects app HTML directly into the host DOM.
- Workspace app cards snapshot the shared app template into the message artifact so collaborators can preview the same app even if they do not own the source Library record.
- Library app persistence keeps a local JSON fallback when Postgres is not configured or no user is signed in, so local workspace testing can still share and open saved apps.

Primary references checked before implementation:

- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- React `useState`: https://react.dev/reference/react/useState
- Drizzle schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration
- Slack conversation model: https://docs.slack.dev/reference/objects/conversation-object
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- MDN iframe sandbox guidance: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox

## Current capability

- Workspace page loads a server-provided workspace view.
- Users can switch between group chats and private chats.
- Users can create a new workspace with a default General room and owner member, without seeded demo messages or tasks.
- Users can switch between multiple workspaces from the left rail.
- Users can copy an invite code and join a workspace from an invite code.
- Users can create either a new shared room or a new direct chat.
- Users can target a direct chat to a workspace member, while rooms stay shared by default.
- Users can add human or AI teammate members from the details drawer.
- Users can send messages through `POST /api/workspaces/[id]/messages`.
- Users can attach and publish an application card into the current chat, including references to saved Library apps when available.
- Users can open shared HTML apps from workspace cards in a sandboxed preview dialog, and generator apps expose their saved prompt for follow-up.
- Users can create tasks, assign them to workspace members, submit result notes, and mark them complete/reopened from the task list.
- The workspace client streams current workspace updates through `GET /api/workspaces/[id]/events` and falls back to periodic refresh if streaming is unavailable.
- Local development without a signed-in user uses an in-memory empty workspace and `.primoria-capability-library.json` for saved apps so the UI remains usable.
- Signed-in Postgres mode creates an empty starter workspace when needed, then persists workspace, members, threads, messages, and tasks from real user actions.
- Database migrations load `.env.local` for local CLI runs, and `tests/workspace.db.ts` covers persisted invite/direct-message visibility.
- Details are collapsed by default and can be expanded for members, tasks, and the agent brief.

## Deliberately deferred

- Expiring invite links, email delivery, and role-based approvals.
- WebSocket-grade presence, typing indicators, and high-frequency realtime fanout.
- Rich task editing, assignment rules, submissions, and analytics.
- Recording app preview usage and app-specific completion results back into workspace task metadata.
