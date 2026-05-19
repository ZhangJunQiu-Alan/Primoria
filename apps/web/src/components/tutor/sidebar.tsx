export function TutorSidebar({ onNewChat }: { onNewChat?: () => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-symbol" aria-hidden="true" />
        <div className="brand-copy">
          <strong>Primoria</strong>
          <span>AI learning space</span>
        </div>
      </div>

      <button className="new-chat" onClick={onNewChat}>
        New tutor chat
      </button>

      <section>
        <div className="section-title">Chats</div>
        <div className="chat-list">
          <button className="chat-item active">
            <strong>Current tutor session</strong>
            <span>Live · OpenAI-compatible backend</span>
          </button>
        </div>
      </section>

      <div className="hint-panel">
        <strong>Tutor can generate UI</strong>
        <span>Charts, simulations, practice cards, code walkthroughs, and course drafts can appear directly inside the chat.</span>
      </div>
    </aside>
  );
}
