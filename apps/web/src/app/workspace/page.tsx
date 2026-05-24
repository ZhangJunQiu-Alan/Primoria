import { TutorNavRail } from "@/components/tutor/nav-rail";

export const dynamic = "force-dynamic";

const rooms = [
  { name: "General", meta: "5 people / 2 agents", active: true },
  { name: "Product", meta: "scope and decisions", active: false },
  { name: "Artifacts", meta: "apps and drafts", active: false },
];

const directChats = [
  { name: "Primoria Agent", meta: "AI teammate", active: false },
  { name: "Mina", meta: "human", active: false },
  { name: "Ops Agent", meta: "automation", active: false },
];

const messages = [
  {
    id: "m1",
    role: "human",
    name: "Jia",
    time: "09:12",
    body: "Let's turn the onboarding notes into a concrete launch checklist. Keep decisions, tasks, and shared apps in this room.",
  },
  {
    id: "m2",
    role: "agent",
    name: "Primoria Agent",
    time: "09:13",
    body: "I found three active threads: product scope, content assets, and follow-up tasks. I drafted a shared plan card and linked the app prototype below.",
  },
  {
    id: "m3",
    role: "human",
    name: "Mina",
    time: "09:15",
    body: "Can we separate what needs a human decision from what the agent can execute without waiting?",
  },
  {
    id: "m4",
    role: "agent",
    name: "Primoria Agent",
    time: "09:16",
    body: "Yes. I marked two approval gates and converted the rest into executable tasks. The workspace will keep updates visible to everyone in the room.",
  },
];

const members = [
  { name: "Jia", role: "Human", status: "reviewing plan" },
  { name: "Primoria Agent", role: "AI teammate", status: "routing work" },
  { name: "Mina", role: "Human", status: "setting priorities" },
  { name: "Leo", role: "Human", status: "checking assets" },
  { name: "Ops Agent", role: "AI teammate", status: "watching tasks" },
];

const tasks = [
  { title: "Launch checklist", scope: "Shared", due: "Today 18:00", progress: "6 / 10 done" },
  { title: "Prototype review", scope: "Human decision", due: "Thu 14:00", progress: "2 approvals needed" },
  { title: "Asset cleanup", scope: "Agent-assisted", due: "Fri 18:00", progress: "8 files queued" },
];

export default function WorkspacePage() {
  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace collaboration-workspace">
        <aside className="workspace-directory" aria-label="Workspace chats">
          <div className="workspace-directory-head">
            <div>
              <span className="course-block-tag">Workspace</span>
              <strong>Primoria</strong>
            </div>
            <button type="button" aria-label="New chat">+</button>
          </div>

          <div className="workspace-switcher" aria-label="Chat type">
            <button type="button" className="active">Rooms</button>
            <button type="button">Direct</button>
          </div>

          <section className="workspace-chat-section">
            <span>Rooms</span>
            {rooms.map((room) => (
              <button key={room.name} type="button" className={room.active ? "active" : ""}>
                <strong># {room.name}</strong>
                <small>{room.meta}</small>
              </button>
            ))}
          </section>

          <section className="workspace-chat-section">
            <span>Direct</span>
            {directChats.map((chat) => (
              <button key={chat.name} type="button" className={chat.active ? "active" : ""}>
                <strong>{chat.name}</strong>
                <small>{chat.meta}</small>
              </button>
            ))}
          </section>
        </aside>

        <section className="workspace-room" aria-label="Workspace group chat">
          <div className="workspace-room-header">
            <div>
              <strong># General</strong>
              <span>5 members / 2 agents online / 3 active tasks</span>
            </div>
            <div className="workspace-room-actions">
              <span className="workspace-live-dot">Live</span>
              <button type="button">Invite</button>
              <button type="button">New task</button>
            </div>
          </div>

          <div className="workspace-message-list">
            {messages.map((message) => (
              <article key={message.id} className={`workspace-message ${message.role}`}>
                <div className="workspace-avatar" aria-hidden="true">{message.name.slice(0, 1)}</div>
                <div className="workspace-message-body">
                  <div className="workspace-message-meta">
                    <strong>{message.name}</strong>
                    <span>{message.time}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              </article>
            ))}

            <article className="workspace-app-card">
              <div className="workspace-app-preview" aria-hidden="true">
                <span />
                <i />
                <b />
              </div>
              <div>
                <span className="course-block-tag">Shared application</span>
                <h2>Prototype Review App</h2>
                <p>Open the latest artifact, collect notes, and turn accepted changes into workspace tasks.</p>
                <div className="workspace-card-actions">
                  <button type="button">Open app</button>
                  <button type="button">Share</button>
                </div>
              </div>
            </article>

            <article className="workspace-assignment-card">
              <div>
                <span className="course-block-tag">Task card</span>
                <h2>Launch Plan</h2>
                <p>Tasks, owners, and agent actions generated from the current room context.</p>
              </div>
              <div className="workspace-assignment-groups">
                <span>Decisions / 2 pending</span>
                <span>Agent work / 6 queued</span>
                <span>Human work / 4 open</span>
              </div>
            </article>
          </div>

          <form className="workspace-composer">
            <input aria-label="Message" placeholder="Message #General, mention @Primoria, or attach an app..." />
            <button type="button" aria-label="Attach">+</button>
            <button type="submit">Send</button>
          </form>
        </section>

        <details className="workspace-side-drawer" aria-label="Room details">
          <summary>
            <span>Details</span>
          </summary>
          <aside className="workspace-side" aria-label="Workspace status">
            <section className="workspace-panel">
              <div className="workspace-panel-header">
                <strong>Members</strong>
                <span>{members.length}</span>
              </div>
              <ul className="workspace-member-list">
                {members.map((member) => (
                  <li key={member.name}>
                    <span className="workspace-member-avatar" aria-hidden="true">{member.name.slice(0, 1)}</span>
                    <span>
                      <strong>{member.name}</strong>
                      <small>{member.role} / {member.status}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="workspace-panel">
              <div className="workspace-panel-header">
                <strong>Tasks</strong>
                <span>3</span>
              </div>
              <ul className="workspace-homework-list">
                {tasks.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.scope}</span>
                    <small>{item.progress} / due {item.due}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section className="workspace-panel workspace-agent-panel">
              <span className="course-block-tag">Agent brief</span>
              <h2>Next best move</h2>
              <p>Ask for approval on the two scope decisions, then let Primoria execute the queued cleanup tasks.</p>
              <button type="button">Draft prompt</button>
            </section>
          </aside>
        </details>
      </section>
    </main>
  );
}
