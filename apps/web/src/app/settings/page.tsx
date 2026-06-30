import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { BoltIcon, BookIcon, SparkleIcon } from "@/components/profile/profile-icons";
import { ContentLanguageSelect } from "@/components/profile/content-language-select";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { getUserPreferences } from "@/lib/settings/user-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/settings");

  const [facts, preferences] = user
    ? await Promise.all([listActiveFacts(user.id), getUserPreferences(user.id)])
    : [[], await getUserPreferences(null)] as const;
  const previewFacts = facts.slice(0, 2);

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace settings-workspace">
        <Link href="/profile" className="profile-back-link">← Back to Profile</Link>
        <header className="settings-heading">
          <span className="profile-eyebrow">Personalization</span>
          <h1 className="profile-detail-title">Settings</h1>
        </header>

        <div className="settings-stack">
          <article className="settings-card settings-card-tall">
            <div className="settings-card-copy">
              <span className="settings-icon memory"><SparkleIcon /></span>
              <div>
                <h2>Facts About You</h2>
                <p>The more you share, the better Primoria can shape lessons, practice, and conversations around you.</p>
              </div>
            </div>
            {previewFacts.length ? (
              <div className="settings-fact-preview" aria-label="Saved facts preview">
                {previewFacts.map((fact) => <span key={fact.id}>{fact.text}</span>)}
                {facts.length > previewFacts.length ? <em>+{facts.length - previewFacts.length} more</em> : null}
              </div>
            ) : (
              <p className="settings-muted">No saved facts yet. Add background, goals, or learning preferences when you are ready.</p>
            )}
            <Link href="/settings/facts" className="settings-wide-action">Edit facts</Link>
          </article>

          <article className="settings-card settings-card-tall">
            <div className="settings-card-copy">
              <span className="settings-icon language"><BookIcon /></span>
              <div>
                <h2>Content Language</h2>
                <p>The language used for generated learning content and AI responses.</p>
              </div>
            </div>
            <ContentLanguageSelect initialValue={preferences.contentLanguage} />
          </article>

          <section className="settings-secondary-grid" aria-label="More settings">
            <article className="settings-mini-card">
              <span className="settings-icon plan"><BoltIcon /></span>
              <div>
                <h2>Subscription</h2>
                <p>Current plan: Free</p>
              </div>
              <Link href="/upgrade">Upgrade to Pro</Link>
            </article>
            <article className="settings-mini-card">
              <span className="settings-icon info">i</span>
              <div>
                <h2>App Information</h2>
                <p>Primoria web app · Version 0.21.17</p>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
