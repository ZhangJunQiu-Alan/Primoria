"use client";

import type { FormEventHandler, KeyboardEventHandler, Ref } from "react";
import type { WorkspaceMember, WorkspaceThread } from "@/lib/workspaces/types";

type WorkspaceComposerProps = {
  activeThread?: WorkspaceThread;
  composerInputRef: Ref<HTMLInputElement>;
  draft: string;
  error: string | null;
  mentionCandidates: WorkspaceMember[];
  mentionIndex: number;
  mentionPickerOpen: boolean;
  sending: boolean;
  onDraftChange: (value: string) => void;
  onInsertMention: (member: WorkspaceMember) => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function WorkspaceComposer({
  activeThread,
  composerInputRef,
  draft,
  error,
  mentionCandidates,
  mentionIndex,
  mentionPickerOpen,
  sending,
  onDraftChange,
  onInsertMention,
  onKeyDown,
  onSubmit,
}: WorkspaceComposerProps) {
  return (
    <form className="workspace-composer" onSubmit={onSubmit}>
      <div className="workspace-composer-field">
        {mentionPickerOpen ? (
          <AgentMentionPopover
            candidates={mentionCandidates}
            selectedIndex={mentionIndex}
            onInsertMention={onInsertMention}
          />
        ) : null}
        <input
          ref={composerInputRef}
          aria-label="Message"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={!activeThread}
          autoComplete="off"
          placeholder={
            activeThread
              ? `Message ${activeThread.type === "room" ? "#" : ""}${activeThread.name} or mention an agent...`
              : "Create or select a chat to send a message"
          }
        />
      </div>
      <button type="submit" disabled={sending || !draft.trim() || !activeThread}>{sending ? "Sending" : "Send"}</button>
      {error ? <p className="workspace-send-error">{error}</p> : null}
    </form>
  );
}

function AgentMentionPopover({
  candidates,
  selectedIndex,
  onInsertMention,
}: {
  candidates: WorkspaceMember[];
  selectedIndex: number;
  onInsertMention: (member: WorkspaceMember) => void;
}) {
  return (
    <div className="workspace-mention-popover" role="listbox" aria-label="Agent mentions">
      {candidates.map((member, index) => (
        <button
          key={member.id}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          className={index === selectedIndex ? "selected" : undefined}
          onMouseDown={(event) => {
            event.preventDefault();
            onInsertMention(member);
          }}
        >
          <span className="workspace-mention-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{member.displayName}</strong>
            <small>{member.status === "active" ? "Active agent" : member.role}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
