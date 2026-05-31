import Link from "next/link";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView, listWorkspaceAgentMemories } from "@/lib/workspaces/store";
import { createWorkspaceAgentSkillBackend } from "@/lib/workspaces/agent-skill-storage";
import type { WorkspaceAgentMemory, WorkspaceArtifact } from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

type ReviewTab = "artifacts" | "skills" | "memories";

type WorkspaceReviewPageProps = {
  searchParams?: Promise<{ tab?: string | string[] }>;
};

export default async function WorkspaceReviewPage({ searchParams }: WorkspaceReviewPageProps) {
  const params = (await searchParams) ?? {};
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab: ReviewTab = rawTab === "skills" || rawTab === "memories" ? rawTab : "artifacts";
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const view = await getWorkspaceView(ownerId);
  const memoryAudit = await listWorkspaceAgentMemories(ownerId, { workspaceId: view.workspace.id, includeArchived: true });
  const archivedMemories = memoryAudit.memories.filter((memory) => memory.archivedAt);
  const backend = createWorkspaceAgentSkillBackend();
  const skills = await backend.list({ workspaceId: view.workspace.id, ownerId: ownerId ?? undefined });
  const skillVersionsByPath = Object.fromEntries(
    await Promise.all(
      skills.map(async (skill) => [
        skill.path,
        await backend.versions({ workspaceId: view.workspace.id, ownerId: ownerId ?? undefined, path: skill.path }),
      ]),
    ),
  );
  const artifactsNeedingReview = view.artifacts.filter((artifact) => artifact.reviewStatus === "needs_review").length;

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace-review-page">
        <header className="workspace-review-header">
          <div>
            <span className="course-block-tag">Workspace memory</span>
            <h1>Review workspace outputs</h1>
            <p>Collected artifacts, custom agent skills, and reviewable agent memories from real workspace activity.</p>
          </div>
          <Link href="/workspace" className="workspace-review-back">Back to workspace</Link>
        </header>

        <nav className="workspace-review-tabs" aria-label="Workspace review sections">
          <Link
            href="/workspace/review?tab=artifacts"
            className={activeTab === "artifacts" ? "active" : ""}
            aria-current={activeTab === "artifacts" ? "page" : undefined}
          >
            Review artifacts
            <span>{view.artifacts.length}</span>
          </Link>
          <Link
            href="/workspace/review?tab=skills"
            className={activeTab === "skills" ? "active" : ""}
            aria-current={activeTab === "skills" ? "page" : undefined}
          >
            Review skills
            <span>{skills.length}</span>
          </Link>
          <Link
            href="/workspace/review?tab=memories"
            className={activeTab === "memories" ? "active" : ""}
            aria-current={activeTab === "memories" ? "page" : undefined}
          >
            Review memories
            <span>{view.agentMemories.length}</span>
          </Link>
        </nav>

        {activeTab === "artifacts" ? (
          <section className="workspace-review-section" aria-label="Review artifacts">
            <div className="workspace-review-summary">
              <strong>{artifactsNeedingReview} need review</strong>
              <span>Courses, saved artifacts, and task results are highlighted for follow-up.</span>
            </div>
            {view.artifacts.length ? (
              <div className="workspace-review-grid">
                {view.artifacts.map((artifact) => (
                  <article key={artifact.id} className="workspace-review-card workspace-artifact-card">
                    <span className={`workspace-artifact-kind ${artifact.kind}`}>{workspaceArtifactKindLabel(artifact.kind)}</span>
                    <h2>{artifact.title}</h2>
                    <p>{artifact.description}</p>
                    <dl>
                      <div>
                        <dt>Status</dt>
                        <dd>{formatWorkspaceArtifactReviewStatus(artifact.reviewStatus)}</dd>
                      </div>
                      <div>
                        <dt>Source message</dt>
                        <dd>{shortId(artifact.sourceMessageId)}</dd>
                      </div>
                      {artifact.sourceRunId ? (
                        <div>
                          <dt>Source run</dt>
                          <dd>{shortId(artifact.sourceRunId)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <ArtifactReviewStatusForm workspaceId={view.workspace.id} artifact={artifact} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="workspace-review-empty">
                <strong>No artifacts saved yet</strong>
                <p>Approved apps, courses, saved notes, and task results will appear here once workspace members create them.</p>
              </div>
            )}
          </section>
        ) : activeTab === "skills" ? (
          <section className="workspace-review-section" aria-label="Review skills">
            <div className="workspace-review-summary">
              <strong>{skills.length} custom skills</strong>
              <span>Personal and workspace skills are listed from the persisted skill backend.</span>
            </div>
            {skills.length ? (
              <div className="workspace-review-grid">
                {skills.map((skill) => (
                  <SkillReviewCard key={skill.path} workspaceId={view.workspace.id} skill={skill} versions={skillVersionsByPath[skill.path] ?? []} />
                ))}
              </div>
            ) : (
              <div className="workspace-review-empty">
                <strong>No custom skills yet</strong>
                <p>Create a personal or workspace skill from the agent builder, then review it here without opening every agent.</p>
              </div>
            )}
          </section>
        ) : (
          <section className="workspace-review-section" aria-label="Review memories">
            <div className="workspace-review-summary">
              <div>
                <strong>{view.agentMemories.length} saved memories</strong>
                <span>Review exactly what agents can remember. Archived memories are hidden from this default view.</span>
              </div>
              <BulkArchiveMemoriesForm workspaceId={view.workspace.id} memories={view.agentMemories} />
            </div>
            <div className="workspace-review-summary workspace-memory-audit-summary">
              <div>
                <strong>Archived memories: {archivedMemories.length}</strong>
                <span>Archive keeps audit history while removing memories from normal agent context.</span>
              </div>
              {archivedMemories.length ? (
                <details>
                  <summary>Recently archived</summary>
                  <ul>
                    {archivedMemories.slice(0, 5).map((memory) => (
                      <li key={memory.id}>
                        <span>{memory.title}</span>
                        <small>{memory.archivedAt ? new Date(memory.archivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Archived"}</small>
                        <RestoreMemoryForm workspaceId={view.workspace.id} memory={memory} />
                        <DeleteMemoryForm workspaceId={view.workspace.id} memory={memory} />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            {view.agentMemories.length ? (
              <div className="workspace-review-grid">
                {view.agentMemories.map((memory) => {
                  const profile = view.agentProfiles.find((entry) => entry.id === memory.agentProfileId);
                  return (
                    <article key={memory.id} className="workspace-review-card workspace-agent-memory-card">
                      <span className={`workspace-agent-memory-scope ${memory.scope}`}>{workspaceAgentMemoryScopeLabel(memory.scope)}</span>
                      <h2>{memory.title}</h2>
                      <p>{memory.summary}</p>
                      <dl>
                        <div>
                          <dt>Agent</dt>
                          <dd>{profile?.displayName ?? "Unknown agent"}</dd>
                        </div>
                        <div>
                          <dt>Scope</dt>
                          <dd>{workspaceAgentMemoryScopeLabel(memory.scope)}</dd>
                        </div>
                        {memory.sourceRunId ? (
                          <div>
                            <dt>Source run</dt>
                            <dd>{shortId(memory.sourceRunId)}</dd>
                          </div>
                        ) : null}
                        {memory.sourceMessageId ? (
                          <div>
                            <dt>Source message</dt>
                            <dd>{shortId(memory.sourceMessageId)}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="workspace-review-empty">
                <strong>No memories saved yet</strong>
                <p>When agents save reviewable thread, workspace, or personal context, it will appear here with source metadata.</p>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function BulkArchiveMemoriesForm({
  workspaceId,
  memories,
}: {
  workspaceId: string;
  memories: WorkspaceAgentMemory[];
}) {
  return (
    <form className="workspace-memory-bulk-archive" action={`/api/workspaces/${workspaceId}/agent-memories/bulk-archive`} method="post">
      {memories.map((memory) => (
        <input key={memory.id} type="hidden" name="memoryIds" value={memory.id} />
      ))}
      <button type="submit" disabled={!memories.length}>Archive visible memories</button>
    </form>
  );
}

function RestoreMemoryForm({
  workspaceId,
  memory,
}: {
  workspaceId: string;
  memory: WorkspaceAgentMemory;
}) {
  return (
    <form className="workspace-memory-restore" action={`/api/workspaces/${workspaceId}/agent-memories/${memory.id}?intent=restore`} method="post">
      <button type="submit">Restore memory</button>
    </form>
  );
}

function DeleteMemoryForm({
  workspaceId,
  memory,
}: {
  workspaceId: string;
  memory: WorkspaceAgentMemory;
}) {
  return (
    <form className="workspace-memory-delete" action={`/api/workspaces/${workspaceId}/agent-memories/${memory.id}?intent=delete`} method="post">
      <button type="submit">Delete memory</button>
    </form>
  );
}

function ArtifactReviewStatusForm({
  workspaceId,
  artifact,
}: {
  workspaceId: string;
  artifact: WorkspaceArtifact;
}) {
  const nextStatus = artifact.reviewStatus === "needs_review" ? "reviewed" : "needs_review";
  return (
    <form className="workspace-artifact-review-status" action={`/api/workspaces/${workspaceId}/artifacts/${artifact.id}`} method="post">
      <input type="hidden" name="reviewStatus" value={nextStatus} />
      <button type="submit">{nextStatus === "reviewed" ? "Mark reviewed" : "Reopen review"}</button>
    </form>
  );
}

function SkillReviewCard({
  workspaceId,
  skill,
  versions,
}: {
  workspaceId: string;
  skill: {
    source: "workspace" | "user";
    name: string;
    path: string;
    description?: string;
    instructions?: string;
    version: number;
  };
  versions: Array<{
    version: number;
    description?: string;
    instructions?: string;
  }>;
}) {
  const current = versions.find((version) => version.version === skill.version) ?? skill;
  const previous = [...versions].filter((version) => version.version < skill.version).sort((a, b) => b.version - a.version)[0];
  const compare = formatSkillVersionCompare(current, previous);
  return (
    <article className="workspace-review-card workspace-agent-skill-review-card">
      <header>
        <div>
          <strong>{skill.name}</strong>
          <span>{skill.description}</span>
        </div>
        <span className="workspace-agent-skill-source">{formatWorkspaceAgentSkillSource(skill.source)}</span>
      </header>
      <p>{skill.instructions}</p>
      <dl>
        <div>
          <dt>Version</dt>
          <dd>{skill.version}</dd>
        </div>
        <div>
          <dt>Path</dt>
          <dd>{skill.path}</dd>
        </div>
      </dl>
      <div className="workspace-skill-version-compare" aria-label="Compare latest skill version">
        <strong>Compare latest</strong>
        <span>{compare}</span>
      </div>
      <div className="workspace-skill-version-restore" aria-label="Restore skill version">
        <strong>Restore history</strong>
        {versions.filter((version) => version.version < skill.version).length ? (
          <div>
            {versions
              .filter((version) => version.version < skill.version)
              .sort((a, b) => b.version - a.version)
              .slice(0, 3)
              .map((version) => (
                <RestoreSkillVersionForm key={version.version} workspaceId={workspaceId} skillPath={skill.path} version={version.version} />
              ))}
          </div>
        ) : (
          <span>No earlier version to restore.</span>
        )}
      </div>
    </article>
  );
}

function RestoreSkillVersionForm({
  workspaceId,
  skillPath,
  version,
}: {
  workspaceId: string;
  skillPath: string;
  version: number;
}) {
  return (
    <form className="workspace-skill-restore" action={`/api/workspaces/${workspaceId}/agent-skills?intent=restore`} method="post">
      <input type="hidden" name="path" value={skillPath} />
      <input type="hidden" name="restoreVersion" value={version} />
      <button type="submit">Restore v{version}</button>
    </form>
  );
}

function formatSkillVersionCompare(
  current: { version: number; description?: string; instructions?: string },
  previous?: { version: number; description?: string; instructions?: string },
) {
  if (!previous) return "No earlier version to compare yet.";
  const changes = [
    current.description !== previous.description ? "description changed" : "",
    current.instructions !== previous.instructions ? "instructions changed" : "",
  ].filter(Boolean);
  if (!changes.length) return `Version ${current.version} matches version ${previous.version}.`;
  return `Version ${current.version} vs ${previous.version}: ${changes.join(", ")}.`;
}

function workspaceArtifactKindLabel(kind: WorkspaceArtifact["kind"]) {
  const labels: Record<WorkspaceArtifact["kind"], string> = {
    app: "App",
    course: "Course",
    saved_artifact: "Saved artifact",
    task_result: "Task result",
  };
  return labels[kind] ?? kind;
}

function formatWorkspaceArtifactReviewStatus(status: WorkspaceArtifact["reviewStatus"]) {
  return status === "needs_review" ? "Needs review" : "Reviewed";
}

function formatWorkspaceAgentSkillSource(source: "workspace" | "user") {
  return source === "user" ? "Personal skill" : "Workspace skill";
}

function workspaceAgentMemoryScopeLabel(scope: WorkspaceAgentMemory["scope"]) {
  const labels: Record<WorkspaceAgentMemory["scope"], string> = {
    thread: "This chat",
    workspace: "Workspace",
    user: "My preferences",
  };
  return labels[scope] ?? scope;
}

function shortId(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}
