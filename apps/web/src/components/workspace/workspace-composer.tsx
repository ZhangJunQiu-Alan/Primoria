"use client";

import type { FormEventHandler, KeyboardEventHandler, Ref } from "react";
import type { WorkspaceMember, WorkspaceThread } from "@/lib/workspaces/types";

export type LibraryAppOption = {
  id: string;
  displayName: string;
  description?: string;
  version: number;
};

type WorkspaceComposerProps = {
  activeThread?: WorkspaceThread;
  attachmentDescription: string;
  attachmentOpen: boolean;
  attachmentTitle: string;
  composerInputRef: Ref<HTMLInputElement>;
  draft: string;
  error: string | null;
  libraryApps: LibraryAppOption[];
  loadingApps: boolean;
  mentionCandidates: WorkspaceMember[];
  mentionIndex: number;
  mentionPickerOpen: boolean;
  selectedAppId: string;
  sending: boolean;
  onAttachmentDescriptionChange: (value: string) => void;
  onAttachmentTitleChange: (value: string) => void;
  onDraftChange: (value: string) => void;
  onInsertMention: (member: WorkspaceMember) => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onSelectApp: (appId: string) => void;
  onShareAppCard: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onToggleAttachment: () => void;
};

export function WorkspaceComposer({
  activeThread,
  attachmentDescription,
  attachmentOpen,
  attachmentTitle,
  composerInputRef,
  draft,
  error,
  libraryApps,
  loadingApps,
  mentionCandidates,
  mentionIndex,
  mentionPickerOpen,
  selectedAppId,
  sending,
  onAttachmentDescriptionChange,
  onAttachmentTitleChange,
  onDraftChange,
  onInsertMention,
  onKeyDown,
  onSelectApp,
  onShareAppCard,
  onSubmit,
  onToggleAttachment,
}: WorkspaceComposerProps) {
  return (
    <form className="workspace-composer" onSubmit={onSubmit}>
      {attachmentOpen ? (
        <div className="workspace-attachment-tray">
          <div className="workspace-quick-form horizontal">
            <select
              aria-label="Saved application"
              value={selectedAppId}
              onChange={(event) => onSelectApp(event.target.value)}
            >
              <option value="">{loadingApps ? "Loading apps" : "Manual card"}</option>
              {libraryApps.map((app) => (
                <option key={app.id} value={app.id}>{app.displayName}</option>
              ))}
            </select>
            <input
              aria-label="Application title"
              value={attachmentTitle}
              onChange={(event) => onAttachmentTitleChange(event.target.value)}
              placeholder="Application title"
            />
            <input
              aria-label="Application description"
              value={attachmentDescription}
              onChange={(event) => onAttachmentDescriptionChange(event.target.value)}
              placeholder="What should this card do?"
            />
            <button type="button" disabled={sending} onClick={onShareAppCard}>Share app</button>
          </div>
        </div>
      ) : null}
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
              ? `Message ${activeThread.type === "room" ? "#" : ""}${activeThread.name}, mention an agent, or attach an app...`
              : "Create or select a chat to send a message"
          }
        />
      </div>
      <button type="button" aria-label="Attach" disabled={!activeThread} onClick={onToggleAttachment}>+</button>
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
