"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
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
  { toolName: "render_interactive_widget", label: "Render widgets", approval: "always" },
  { toolName: "save_learning_artifact", label: "Save artifacts", approval: "always" },
  { toolName: "save_agent_memory", label: "Save memory", approval: "always" },
];

const EXAMPLE_PROMPTS = [
  "Explain science concepts to me",
  "Help me study more effectively",
  "Turn goals into weekly project tasks",
  "Create practice quizzes from our chats",
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [visibility, setVisibility] = useState<WorkspaceAgentProfile["visibility"]>("workspace");
  const [memoryScope, setMemoryScope] = useState<WorkspaceAgentProfile["memoryScope"]>("thread");
  const [selectedTools, setSelectedTools] = useState<string[]>(["summarize_thread"]);
  const [preservedCapabilities, setPreservedCapabilities] = useState<WorkspaceAgentCapabilityInput[]>([]);
  const [selectedStoreTemplateKey, setSelectedStoreTemplateKey] = useState(initialTemplates[0]?.key ?? "");
  const [storeInstallTarget, setStoreInstallTarget] = useState<WorkspaceAgentProfile["visibility"]>("workspace");
  const [editingId, setEditingId] = useState("");
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

  const canSave = Boolean(
    name.trim() &&
    description.trim() &&
    systemPrompt.trim() &&
    buildAgentCapabilityPayload(preservedCapabilities, selectedTools).some((capability) => capability.enabled),
  );

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
    if (editingId === profileId) clearForm();
  }

  function clearForm() {
    setEditingId("");
    setName("");
    setDescription("");
    setSystemPrompt("");
    setVisibility("workspace");
    setMemoryScope("thread");
    setSelectedTools(["summarize_thread"]);
    setPreservedCapabilities([]);
    setDraftPrompt("");
  }

  function loadProfile(profile: WorkspaceAgentProfile) {
    resetFeedback();
    setTab("agents");
    setEditingId(profile.id);
    setName(profile.displayName);
    setDescription(profile.description);
    setSystemPrompt(profile.systemPrompt);
    setVisibility(profile.visibility);
    setMemoryScope(profile.memoryScope);
    setSelectedTools(readEditableInternalToolNames(profile.capabilities));
    setPreservedCapabilities(readPreservedCapabilityInputs(profile.capabilities));
  }

  function useTemplate(template: WorkspaceAgentTemplate) {
    resetFeedback();
    setTab("agents");
    setEditingId("");
    setName(template.displayName);
    setDescription(template.description);
    setSystemPrompt(template.systemPrompt);
    setVisibility("workspace");
    setMemoryScope(template.memoryScope);
    setSelectedTools(readEditableInternalToolNames(template.capabilities));
    setPreservedCapabilities(readPreservedCapabilityInputs(template.capabilities));
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

  function toggleTool(toolName: string) {
    setSelectedTools((current) =>
      current.includes(toolName) ? current.filter((entry) => entry !== toolName) : [...current, toolName],
    );
  }

  async function draftWithAi(prompt = draftPrompt) {
    const input = prompt.trim();
    if (!input) return;
    setDrafting(true);
    resetFeedback();
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/agent-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      const data = (await response.json()) as {
        draft?: { displayName: string; description: string; systemPrompt: string; skills: string[] };
        error?: string;
      };
      if (!response.ok || !data.draft) throw new Error(data.error || "Draft could not be created.");
      setName(data.draft.displayName);
      setDescription(data.draft.description);
      setSystemPrompt(data.draft.systemPrompt);
      setSelectedTools(data.draft.skills.filter((skill) => TOOL_OPTIONS.some((tool) => tool.toolName === skill)));
      if (!editingId) {
        setMemoryScope("thread");
        setPreservedCapabilities([]);
      }
      setDraftPrompt(input);
      setFeedback("Draft ready. Review and save it.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Draft could not be created.");
    } finally {
      setDrafting(false);
    }
  }

  async function saveAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    resetFeedback();
    const payload = {
      displayName: name,
      description,
      systemPrompt,
      visibility,
      memoryScope,
      capabilities: buildAgentCapabilityPayload(preservedCapabilities, selectedTools),
    };
    try {
      const response = await fetch(
        editingId ? `/api/workspaces/${workspaceId}/agents/${editingId}` : `/api/workspaces/${workspaceId}/agents`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { profile?: WorkspaceAgentProfile; member?: WorkspaceMember; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || "Agent could not be saved.");
      mergeProfile(data.profile);
      mergeMember(data.member);
      setEditingId(data.profile.id);
      setFeedback(editingId ? "Agent updated." : "Agent created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function addToWorkspace(profile: WorkspaceAgentProfile) {
    setSaving(true);
    resetFeedback();
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });
      const data = (await response.json()) as { profile?: WorkspaceAgentProfile; member?: WorkspaceMember; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || "Agent could not be added.");
      mergeProfile(data.profile);
      mergeMember(data.member);
      setFeedback(`${data.profile.displayName} added to workspace.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent could not be added.");
    } finally {
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
          onClick={() => {
            clearForm();
            setTab("agents");
          }}
        >
          New blank
        </button>
      </div>

      {tab === "agents" ? (
        <div className="workspace-agent-simple-layout">
          <section className="workspace-agent-create-card" aria-label="Create agent">
            <form onSubmit={saveAgent}>
              <div className="workspace-agent-create-title">
                <strong>{editingId ? "Edit agent" : "Create agent"}</strong>
                {editingId ? <button type="button" onClick={clearForm}>Close</button> : null}
              </div>
              <label className="workspace-agent-prompt-box">
                <span>What should your agent do?</span>
                <textarea
                  value={draftPrompt}
                  onChange={(event) => setDraftPrompt(event.target.value)}
                  placeholder="Describe what your agent should do..."
                  rows={4}
                />
                <button type="button" onClick={() => void draftWithAi()} disabled={drafting || !draftPrompt.trim()}>
                  {drafting ? "Drafting..." : "AI create"}
                </button>
              </label>
              <div className="workspace-agent-examples">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button key={example} type="button" onClick={() => void draftWithAi(example)}>
                    {example}
                  </button>
                ))}
              </div>
              <label>
                <span>Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter agent name" required />
              </label>
              <label>
                <span>System instructions</span>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  placeholder="Goal, skills, workflow, constraints..."
                  rows={7}
                  required
                />
              </label>
              <label>
                <span>Short purpose</span>
                <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="One sentence purpose" required />
              </label>
              <div className="workspace-agent-compact-options">
                <label>
                  <span>Save as</span>
                  <select value={visibility} onChange={(event) => setVisibility(event.target.value as WorkspaceAgentProfile["visibility"])}>
                    <option value="workspace">Workspace agent</option>
                    <option value="private">Personal agent</option>
                  </select>
                </label>
                <label>
                  <span>Memory</span>
                  <select value={memoryScope} onChange={(event) => setMemoryScope(event.target.value as WorkspaceAgentProfile["memoryScope"])}>
                    <option value="thread">Thread memory</option>
                    <option value="workspace">Workspace memory</option>
                    <option value="user">Personal memory</option>
                    <option value="none">No memory</option>
                  </select>
                </label>
              </div>
              {preservedCapabilities.length ? (
                <div className="workspace-agent-preserved-skills" aria-label="Template skills">
                  {capabilityLabels(preservedCapabilities).map((label) => <span key={label}>{label}</span>)}
                </div>
              ) : null}
              <div className="workspace-agent-skill-strip" aria-label="Agent skills">
                {TOOL_OPTIONS.map((tool) => (
                  <label key={tool.toolName}>
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.toolName)}
                      onChange={() => toggleTool(tool.toolName)}
                    />
                    <span>{tool.label}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={saving || !canSave}>
                {editingId ? "Save agent" : visibility === "private" ? "Save to my agents" : "Create agent"}
              </button>
            </form>
            {feedback ? <p className="workspace-agent-manager-feedback">{feedback}</p> : null}
            {error ? <p className="workspace-agent-manager-error">{error}</p> : null}
          </section>

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
                    {!memberProfileIds.has(profile.id) ? (
                      <button type="button" onClick={() => void addToWorkspace(profile)} disabled={saving}>Add</button>
                    ) : null}
                    <button type="button" onClick={() => loadProfile(profile)}>Edit</button>
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
                      <div className="workspace-agent-manager-tags">
                        {installed ? <span>Installed</span> : null}
                        {capabilityLabels(template.capabilities).slice(0, 3).map((label) => <span key={label}>{label}</span>)}
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
                <div className="workspace-agent-manager-tags">
                  <span>{formatMemoryScope(selectedStoreTemplate.memoryScope)}</span>
                  {capabilityLabels(selectedStoreTemplate.capabilities).map((label) => <span key={label}>{label}</span>)}
                </div>
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
                  <button type="button" onClick={() => useTemplate(selectedStoreTemplate)}>Customize</button>
                  <button type="button" onClick={() => void installTemplate(selectedStoreTemplate)} disabled={saving || Boolean(installedStoreProfile)}>
                    {installedStoreProfile ? "Installed" : storeInstallTarget === "private" ? "Save to My agents" : "Install to workspace"}
                  </button>
                </div>
              </aside>
            ) : null}
          </div>
        </section>
      )}
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

function buildAgentCapabilityPayload(preserved: WorkspaceAgentCapabilityInput[], toolNames: string[]): WorkspaceAgentCapabilityInput[] {
  const editableToolNames = new Set(TOOL_OPTIONS.map((option) => option.toolName));
  const preservedInputs = preserved
    .map(capabilityInput)
    .filter((capability) => capability.kind !== "internal_tool" || !editableToolNames.has(capability.toolName));
  const next = [...preservedInputs, ...buildInternalToolCapabilities(toolNames)];
  const seen = new Set<string>();
  return next.filter((capability) => {
    const key = capabilityKey(capability);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readEditableInternalToolNames(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  const editableToolNames = new Set(TOOL_OPTIONS.map((option) => option.toolName));
  const names = capabilities.flatMap((capability) =>
    capability.kind === "internal_tool" && capability.enabled && editableToolNames.has(capability.toolName) ? [capability.toolName] : [],
  );
  return Array.from(new Set(names));
}

function readPreservedCapabilityInputs(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  const editableToolNames = new Set(TOOL_OPTIONS.map((option) => option.toolName));
  return capabilities
    .map(capabilityInput)
    .filter((capability) => capability.kind !== "internal_tool" || !editableToolNames.has(capability.toolName));
}

function capabilityInput(capability: WorkspaceAgentCapability | WorkspaceAgentCapabilityInput): WorkspaceAgentCapabilityInput {
  if (capability.kind === "skill") {
    return { kind: "skill", source: capability.source, path: capability.path, enabled: capability.enabled };
  }
  if (capability.kind === "internal_tool") {
    return { kind: "internal_tool", toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
  }
  if (capability.kind === "mcp_tool") {
    return {
      kind: "mcp_tool",
      connectionId: capability.connectionId,
      toolName: capability.toolName,
      approval: capability.approval,
      enabled: capability.enabled,
    };
  }
  return { kind: "subagent", agentProfileId: capability.agentProfileId, enabled: capability.enabled };
}

function capabilityKey(capability: WorkspaceAgentCapabilityInput) {
  if (capability.kind === "skill") return `skill:${capability.source}:${capability.path}`;
  if (capability.kind === "internal_tool") return `internal:${capability.toolName}`;
  if (capability.kind === "mcp_tool") return `mcp:${capability.connectionId}:${capability.toolName}`;
  return `subagent:${capability.agentProfileId}`;
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

function capabilityLabels(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  return capabilities
    .filter((capability) => capability.enabled)
    .map((capability) => {
      if (capability.kind === "skill") return capability.path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "skill";
      if (capability.kind === "internal_tool") return capability.toolName.replace(/_/g, " ");
      if (capability.kind === "mcp_tool") return capability.toolName.replace(/_/g, " ");
      return "delegate agent";
    });
}
