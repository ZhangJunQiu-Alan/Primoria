import Link from "next/link";
import { listCourses } from "@/lib/courses/store";
import { listApps } from "@/lib/capability-library/store";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

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

  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  const shouldGate = authEnabled && !user;
  const [courses, apps] = shouldGate ? [[], []] : await Promise.all([listCourses(user?.id), listApps(user?.id)]);

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace library-workspace">
        <header className="library-header">
          <h1>Library</h1>
          <p>
            Courses and capability apps Primoria has built up for you. Your workspace is saved to Postgres and only appears when you are signed in.
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

        {shouldGate ? (
          <div className="library-empty library-auth-empty">
            <span className="course-block-tag">Private workspace</span>
            <h2>Sign in to view your Library</h2>
            <p>Your courses, apps, chat threads, and settings are tied to your account.</p>
            <div className="auth-required-actions">
              <Link href="/auth/sign-in">Sign in</Link>
              <Link href="/auth/sign-up">Create account</Link>
            </div>
          </div>
        ) : activeTab === "courses" ? (
          courses.length === 0 ? (
            <div className="library-empty">
              <p>No courses yet.</p>
            </div>
          ) : (
            <ul className="library-grid">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link href={`/course/${course.id}`} className="library-card">
                    <strong>{course.title}</strong>
                    <p className="library-card-summary">{course.summary}</p>
                    <span className="library-card-meta">
                      {course.outline.length} blocks · v{course.version} · ~{course.estimatedMinutes} min
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : apps.length === 0 ? (
          <div className="library-empty">
            <p>No apps yet.</p>
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
                    {originLabel(app.origin.kind)} · v{app.version} · used {app.metadata.usageCount}× · {formatRelative(app.metadata.lastUsedAt)}
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
