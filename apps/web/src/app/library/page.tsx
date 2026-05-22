import Link from "next/link";
import { listCourses } from "@/lib/courses/store";
import { listApps } from "@/lib/capability-library/store";
import { TutorNavRail } from "@/components/tutor/nav-rail";

export const dynamic = "force-dynamic";

type TabKey = "courses" | "apps";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab: TabKey = rawTab === "apps" ? "apps" : "courses";

  const courses = listCourses();
  const apps = listApps();

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace library-workspace">
        <header className="library-header">
          <h1>Library</h1>
          <p>
            Courses and capability apps Primoria has built up for you. They live on disk for this server install.
          </p>
        </header>

        <nav className="library-tabs" aria-label="Library sections">
          <Link
            href="/library"
            className={`library-tab${activeTab === "courses" ? " library-tab-active" : ""}`}
            aria-current={activeTab === "courses" ? "page" : undefined}
          >
            Courses
            <span className="library-tab-count">{courses.length}</span>
          </Link>
          <Link
            href="/library?tab=apps"
            className={`library-tab${activeTab === "apps" ? " library-tab-active" : ""}`}
            aria-current={activeTab === "apps" ? "page" : undefined}
          >
            My Apps
            <span className="library-tab-count">{apps.length}</span>
          </Link>
        </nav>

        {activeTab === "courses" ? (
          courses.length === 0 ? (
            <div className="library-empty">
              <p>No courses yet.</p>
              <p>
                Go back to the <Link href="/">tutor</Link> and ask something like &ldquo;教我熵的直觉&rdquo;.
              </p>
            </div>
          ) : (
            <ul className="library-grid">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link href={`/course/${course.id}`} className="library-card">
                    <strong>{course.title}</strong>
                    <p className="library-card-summary">{course.summary}</p>
                    <span className="library-card-meta">
                      {course.outline.length} blocks · ~{course.estimatedMinutes} min
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : apps.length === 0 ? (
          <div className="library-empty">
            <p>No apps yet.</p>
            <p>
              Apps appear here automatically when the tutor produces an interactive widget worth keeping. Try asking for &ldquo;做一个牛顿摆动量传递的可视化&rdquo;.
            </p>
          </div>
        ) : (
          <ul className="library-grid">
            {apps.map((app) => (
              <li key={app.id}>
                <article className="library-card library-card-app">
                  <strong>{app.displayName}</strong>
                  {app.description ? <p className="library-card-summary">{app.description}</p> : null}
                  {app.tags.length > 0 ? (
                    <ul className="library-tag-list" aria-label="tags">
                      {app.tags.slice(0, 6).map((tag) => (
                        <li key={tag} className="library-tag">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <span className="library-card-meta">
                    {originLabel(app.origin.kind)} · used {app.metadata.usageCount}× · {formatRelative(app.metadata.lastUsedAt)}
                  </span>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function originLabel(kind: "agent_generated" | "user_forked" | "system_seed"): string {
  switch (kind) {
    case "agent_generated":
      return "auto-sedimented";
    case "user_forked":
      return "your fork";
    case "system_seed":
      return "seeded";
  }
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
