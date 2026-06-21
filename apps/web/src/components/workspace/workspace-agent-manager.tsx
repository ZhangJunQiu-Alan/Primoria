"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  WorkspaceAgentCapability,
  WorkspaceAgentCapabilityInput,
  WorkspaceAgentProfile,
  WorkspaceAgentTemplate,
  WorkspaceMember,
} from "@/lib/workspaces/types";

type AgentManagerProps = {
  workspaceId: string;
  initialTemplates: WorkspaceAgentTemplate[];
  initialProfiles: WorkspaceAgentProfile[];
  initialMembers: WorkspaceMember[];
};

type ManagerTab = "agents" | "store";

const TOOL_OPTIONS: Array<{
  toolName: Extract<WorkspaceAgentCapabilityInput, { kind: "internal_tool" }>["toolName"];
  label: string;
  approval: Extract<WorkspaceAgentCapabilityInput, { kind: "internal_tool" }>["approval"];
}> = [
  { toolName: "summarize_thread", label: "Summarize", approval: "never" },
  { toolName: "search_workspace_messages", label: "Search workspace", approval: "never" },
  { toolName: "create_workspace_task", label: "Create tasks", approval: "on_risk" },
  { toolName: "update_workspace_task", label: "Update tasks", approval: "on_risk" },
  { toolName: "create_quiz", label: "Create quizzes", approval: "never" },
  { toolName: "generate_course", label: "Generate courses", approval: "always" },
  { toolName: "save_learning_artifact", label: "Save artifacts", approval: "always" },
  { toolName: "save_agent_memory", label: "Save memory", approval: "always" },
];

export function WorkspaceAgentManager({
  workspaceId,
  initialTemplates,
  initialProfiles,
  initialMembers,
}: AgentManagerProps) {
  const [tab, setTab] = useState<ManagerTab>("agents");
  const [profiles, setProfiles] = useState(initialProfiles);
  const [members, setMembers] = useState(initialMembers);
  const [agentQuery, setAgentQuery] = useState("");
  const [storeQuery, setStoreQuery] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [selectedStoreTemplateKey, setSelectedStoreTemplateKey] = useState(initialTemplates[0]?.key ?? "");
  const [storeInstallTarget, setStoreInstallTarget] = useState<WorkspaceAgentProfile["visibility"]>("workspace");
  const [agentComposerOpen, setAgentComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const memberProfileIds = useMemo(
    () => new Set(members.flatMap((member) => (member.agentProfileId ? [member.agentProfileId] : []))),
    [members],
  );
  const normalizedAgentQuery = agentQuery.trim().toLowerCase();
  const normalizedStoreQuery = storeQuery.trim().toLowerCase();
  const filteredProfiles = profiles.filter((profile) =>
    [profile.displayName, profile.handle, profile.description, profile.systemPrompt, ...capabilityLabels(profile.capabilities)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedAgentQuery),
  );
  const filteredTemplates = initialTemplates.filter((template) =>
    [template.displayName, template.handle, template.description, template.systemPrompt, ...capabilityLabels(template.capabilities)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedStoreQuery),
  );
  const selectedStoreTemplate =
    filteredTemplates.find((template) => template.key === selectedStoreTemplateKey) ??
    filteredTemplates[0];
  const installedStoreProfile = selectedStoreTemplate
    ? findInstalledTemplateProfile(profiles, memberProfileIds, selectedStoreTemplate.key, storeInstallTarget)
    : undefined;

  function resetFeedback() {
    setFeedback("");
    setError("");
  }

  function mergeProfile(profile: WorkspaceAgentProfile) {
    setProfiles((current) => [profile, ...current.filter((entry) => entry.id !== profile.id)]);
  }

  function mergeMember(member?: WorkspaceMember) {
    if (!member) return;
    setMembers((current) => [member, ...current.filter((entry) => entry.id !== member.id)]);
  }

  function removeProfile(profileId: string) {
    setProfiles((current) => current.filter((profile) => profile.id !== profileId));
    setMembers((current) => current.filter((member) => member.agentProfileId !== profileId));
  }

  function clearForm() {
    setDraftPrompt("");
  }

  function openAgentComposer() {
    resetFeedback();
    clearForm();
    setAgentComposerOpen(true);
  }

  function closeAgentComposer() {
    resetFeedback();
    clearForm();
    setAgentComposerOpen(false);
  }

  function applyTemplate(template: WorkspaceAgentTemplate) {
    resetFeedback();
    setTab("agents");
    setAgentComposerOpen(true);
    setDraftPrompt(template.description);
  }

  async function installTemplate(template: WorkspaceAgentTemplate) {
    if (findInstalledTemplateProfile(profiles, memberProfileIds, template.key, storeInstallTarget)) return;
    setSaving(true);
    resetFeedback();
    try {
      const payload: {
        templateKey: string;
        displayName: string;
        visibility?: WorkspaceAgentProfile["visibility"];
      } = {
        templateKey: template.key,
        displayName: template.displayName,
      };
      if (storeInstallTarget === "private") payload.visibility = "private";
      const response = await fetch(`/api/workspaces/${workspaceId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { profile?: WorkspaceAgentProfile; member?: WorkspaceMember; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || "Template could not be installed.");
      mergeProfile(data.profile);
      mergeMember(data.member);
      setTab("agents");
      setFeedback(storeInstallTarget === "private" ? "Template saved to My agents." : "Template installed in this workspace.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Template could not be installed.");
    } finally {
      setSaving(false);
    }
  }

  async function createAgentFromPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = draftPrompt.trim();
    if (!input) return;
    setSaving(true);
    setDrafting(true);
    resetFeedback();
    try {
      const draftResponse = await fetch(`/api/workspaces/${workspaceId}/agent-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      const draftData = (await draftResponse.json()) as {
        draft?: { displayName: string; description: string; systemPrompt: string; skills: string[] };
        error?: string;
      };
      if (!draftResponse.ok || !draftData.draft) throw new Error(draftData.error || "Agent could not be created.");
      const response = await fetch(`/api/workspaces/${workspaceId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: draftData.draft.displayName,
          description: draftData.draft.description,
          systemPrompt: draftData.draft.systemPrompt,
          visibility: "workspace",
          memoryScope: "thread",
          capabilities: buildInternalToolCapabilities(draftData.draft.skills),
        }),
      });
      const data = (await response.json()) as { profile?: WorkspaceAgentProfile; member?: WorkspaceMember; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || "Agent could not be created.");
      mergeProfile(data.profile);
      mergeMember(data.member);
      setAgentComposerOpen(false);
      clearForm();
      setFeedback("Agent created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent could not be created.");
    } finally {
      setDrafting(false);
      setSaving(false);
    }
  }

  async function deleteAgent(profile: WorkspaceAgentProfile) {
    if (!window.confirm(`Delete ${profile.displayName}? This removes the saved agent and its workspace membership.`)) return;
    setSaving(true);
    resetFeedback();
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/agents/${profile.id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Agent could not be deleted.");
      removeProfile(profile.id);
      setFeedback(`${profile.displayName} deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!agentComposerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setFeedback("");
      setError("");
      setDraftPrompt("");
      setAgentComposerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agentComposerOpen]);

  return (
    <section className="workspace-agent-manager simple">
      <header className="workspace-agent-manager-header">
        <div>
          <span className="course-block-tag">Agent hub</span>
          <h1>Agents</h1>
          <p>Create simple workspace agents, keep your saved agents tidy, and use Store templates when you need a starting point.</p>
        </div>
        <div className="workspace-agent-manager-actions">
          <Link href="/workspace">Workspace</Link>
          <Link href="/workspace/review">Review</Link>
        </div>
      </header>

      <nav className="workspace-agent-tabs" aria-label="Agent manager sections">
        <button type="button" className={tab === "agents" ? "active" : ""} onClick={() => setTab("agents")}>
          My agents
        </button>
        <button type="button" className={tab === "store" ? "active" : ""} onClick={() => setTab("store")}>
          Store
        </button>
      </nav>

      <div className="workspace-agent-search-row">
        <input
          aria-label={tab === "agents" ? "Search my agents" : "Search store"}
          value={tab === "agents" ? agentQuery : storeQuery}
          onChange={(event) => (tab === "agents" ? setAgentQuery(event.target.value) : setStoreQuery(event.target.value))}
          placeholder={tab === "agents" ? "Search my agents" : "Search templates and marketplace"}
        />
        <button
          type="button"
          className="primary"
          onClick={openAgentComposer}
        >
          Create agent
        </button>
      </div>
      {feedback || error ? (
        <div className="workspace-agent-manager-status" aria-live="polite">
          {feedback ? <p className="workspace-agent-manager-feedback">{feedback}</p> : null}
          {error ? <p className="workspace-agent-manager-error">{error}</p> : null}
        </div>
      ) : null}

      {tab === "agents" ? (
        <div className="workspace-agent-simple-layout">
          <section className="workspace-agent-list simple" aria-label="My agents">
            <div className="workspace-agent-section-heading">
              <strong>My agents</strong>
              <span>{filteredProfiles.length}</span>
            </div>
            <div className="workspace-agent-list-rows">
              {filteredProfiles.map((profile) => (
                <article key={profile.id} className="workspace-agent-row-card">
                  <div>
                    <span className="workspace-agent-manager-avatar" aria-hidden="true">{profile.displayName.slice(0, 1)}</span>
                    <span>
                      <strong>{profile.displayName}</strong>
                      <small>{profile.description}</small>
                    </span>
                  </div>
                  <div className="workspace-agent-manager-tags">
                    <span>{profile.visibility === "private" ? "Personal" : "Workspace"}</span>
                    {memberProfileIds.has(profile.id) ? <span>Member</span> : <span>Saved</span>}
                    {capabilityLabels(profile.capabilities).slice(0, 3).map((label) => <span key={label}>{label}</span>)}
                  </div>
                  <div className="workspace-agent-card-actions">
                    <button type="button" className="danger" onClick={() => void deleteAgent(profile)} disabled={saving}>Delete</button>
                  </div>
                </article>
              ))}
              {!filteredProfiles.length ? (
                <div className="workspace-agent-manager-empty">
                  <strong>No agents yet</strong>
                  <p>Create a blank agent or start from the Store.</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <section className="workspace-agent-store" aria-label="Agent store">
          <div className="workspace-agent-store-layout">
            <div className="workspace-agent-store-list">
              <div className="workspace-agent-section-heading">
                <strong>Primoria Store</strong>
                <span>{filteredTemplates.length}</span>
              </div>
              <div className="workspace-agent-store-grid">
                {filteredTemplates.map((template) => {
                  const installed = findInstalledTemplateProfile(profiles, memberProfileIds, template.key, storeInstallTarget);
                  const templateSkills = capabilityLabelsByKind(template.capabilities, "skill");
                  const templateActions = capabilityLabelsByKind(template.capabilities, "internal_tool");
                  return (
                    <button
                      key={template.key}
                      type="button"
                      className={`workspace-agent-store-card${selectedStoreTemplate?.key === template.key ? " active" : ""}`}
                      aria-pressed={selectedStoreTemplate?.key === template.key}
                      onClick={() => setSelectedStoreTemplateKey(template.key)}
                    >
                      <div>
                        <span className="workspace-agent-manager-avatar" aria-hidden="true">{template.displayName.slice(0, 1)}</span>
                        <span>
                          <strong>{template.displayName}</strong>
                          <small>{template.description}</small>
                        </span>
                      </div>
                      <div className="workspace-agent-store-card-meta">
                        {installed ? <span>Installed</span> : null}
                        <span>{templateSkills.length} skills</span>
                        <span>{templateActions.length} actions</span>
                      </div>
                    </button>
                  );
                })}
                {!filteredTemplates.length ? (
                  <div className="workspace-agent-manager-empty">
                    <strong>No store results</strong>
                    <p>Try another search or create a blank agent.</p>
                  </div>
                ) : null}
              </div>
            </div>
            {selectedStoreTemplate ? (
              <aside className="workspace-agent-store-detail" aria-label="Store agent preview">
                <div className="workspace-agent-store-detail-head">
                  <span className="workspace-agent-manager-avatar" aria-hidden="true">{selectedStoreTemplate.displayName.slice(0, 1)}</span>
                  <div>
                    <span>Primoria template</span>
                    <strong>{selectedStoreTemplate.displayName}</strong>
                    <p>{selectedStoreTemplate.description}</p>
                  </div>
                </div>
                <div className="workspace-agent-store-scope">
                  <span>{formatMemoryScope(selectedStoreTemplate.memoryScope)}</span>
                </div>
                <AgentCapabilitySummary capabilities={selectedStoreTemplate.capabilities} />
                <div className="workspace-agent-store-instructions">
                  <strong>System instructions</strong>
                  <p>{selectedStoreTemplate.systemPrompt}</p>
                </div>
                <label className="workspace-agent-store-target">
                  <span>Install target</span>
                  <select value={storeInstallTarget} onChange={(event) => setStoreInstallTarget(event.target.value as WorkspaceAgentProfile["visibility"])}>
                    <option value="workspace">Workspace agent</option>
                    <option value="private">My agents only</option>
                  </select>
                </label>
                <div className="workspace-agent-store-actions">
                  <button type="button" onClick={() => applyTemplate(selectedStoreTemplate)}>Customize</button>
                  <button type="button" onClick={() => void installTemplate(selectedStoreTemplate)} disabled={saving || Boolean(installedStoreProfile)}>
                    {installedStoreProfile ? "Installed" : storeInstallTarget === "private" ? "Save to My agents" : "Install to workspace"}
                  </button>
                </div>
              </aside>
            ) : null}
          </div>
        </section>
      )}

      {agentComposerOpen ? (
        <div className="workspace-agent-modal" role="dialog" aria-modal="true" aria-label="Create agent">
          <button
            type="button"
            className="workspace-agent-modal-backdrop"
            aria-label="Close agent editor"
            onClick={closeAgentComposer}
          />
          <form className="workspace-agent-modal-panel" onSubmit={createAgentFromPrompt}>
            <header className="workspace-agent-modal-header">
              <div>
                <span className="course-block-tag">Agent editor</span>
                <h2>Create agent</h2>
                <p>Describe what you want. The system will draft and create the agent for you.</p>
              </div>
              <button type="button" className="workspace-agent-modal-close" onClick={closeAgentComposer} aria-label="Close">
                Close
              </button>
            </header>
            <div className="workspace-agent-modal-body">
              <label className="workspace-agent-prompt-box">
                <span>What should your agent do?</span>
                <textarea
                  value={draftPrompt}
                  onChange={(event) => setDraftPrompt(event.target.value)}
                  placeholder="Describe what your agent should do..."
                  rows={10}
                />
              </label>
            </div>
            <footer className="workspace-agent-modal-footer">
              <div className="workspace-agent-modal-messages">
                {feedback ? <p className="workspace-agent-manager-feedback">{feedback}</p> : null}
                {error ? <p className="workspace-agent-manager-error">{error}</p> : null}
              </div>
              <button type="button" className="ghost-btn" onClick={closeAgentComposer}>
                Cancel
              </button>
              <button type="submit" className="soft-btn" disabled={saving || drafting || !draftPrompt.trim()}>
                {drafting ? "Creating..." : "Create agent"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function formatMemoryScope(scope: WorkspaceAgentProfile["memoryScope"]) {
  if (scope === "none") return "No memory";
  if (scope === "user") return "Personal memory";
  if (scope === "workspace") return "Workspace memory";
  return "Thread memory";
}

function buildInternalToolCapabilities(toolNames: string[]): WorkspaceAgentCapabilityInput[] {
  return TOOL_OPTIONS.filter((option) => toolNames.includes(option.toolName)).map((option) => ({
    kind: "internal_tool",
    toolName: option.toolName,
    approval: option.approval,
    enabled: true,
  }));
}

function findInstalledTemplateProfile(
  profiles: WorkspaceAgentProfile[],
  memberProfileIds: Set<string>,
  templateKey: string,
  target: WorkspaceAgentProfile["visibility"],
) {
  return profiles.find((profile) => {
    if (profile.templateKey !== templateKey) return false;
    if (target === "private") return profile.visibility === "private";
    return memberProfileIds.has(profile.id);
  });
}

function AgentCapabilitySummary({ capabilities }: { capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput> }) {
  const skillLabels = capabilityLabelsByKind(capabilities, "skill");
  const actionLabels = capabilityLabelsByKind(capabilities, "internal_tool");
  const connectionLabels = capabilityLabelsByKind(capabilities, "mcp_tool");
  const delegateLabels = capabilityLabelsByKind(capabilities, "subagent");

  return (
    <div className="workspace-agent-store-capabilities" aria-label="Agent skills and actions">
      <CapabilitySection title="Skills" labels={skillLabels} emptyLabel="No dedicated skills" />
      <CapabilitySection title="Actions" labels={actionLabels} emptyLabel="No tool actions" />
      {connectionLabels.length ? <CapabilitySection title="Connections" labels={connectionLabels} /> : null}
      {delegateLabels.length ? <CapabilitySection title="Delegates" labels={delegateLabels} /> : null}
    </div>
  );
}

function CapabilitySection({ title, labels, emptyLabel }: { title: string; labels: string[]; emptyLabel?: string }) {
  return (
    <section className="workspace-agent-capability-section">
      <strong>{title}</strong>
      <div>
        {labels.length ? labels.map((label) => <span key={label}>{label}</span>) : <span>{emptyLabel ?? "None"}</span>}
      </div>
    </section>
  );
}

function capabilityLabels(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  return capabilities
    .filter((capability) => capability.enabled)
    .map(capabilityLabel);
}

function capabilityLabelsByKind<K extends WorkspaceAgentCapabilityInput["kind"]>(
  capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>,
  kind: K,
) {
  return capabilities
    .filter((capability) => capability.enabled && capability.kind === kind)
    .map(capabilityLabel);
}

function capabilityLabel(capability: WorkspaceAgentCapability | WorkspaceAgentCapabilityInput) {
  if (capability.kind === "skill") return capability.path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "skill";
  if (capability.kind === "internal_tool") return capability.toolName.replace(/_/g, " ");
  if (capability.kind === "mcp_tool") return capability.toolName.replace(/_/g, " ");
  return "delegate agent";
}
