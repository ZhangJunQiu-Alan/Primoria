import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { FactsAboutYou } from "@/components/profile/facts-about-you";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listActiveFacts } from "@/lib/learner-facts/store";

export const dynamic = "force-dynamic";

export default async function FactsSettingsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/settings/facts");

  const facts = user ? await listActiveFacts(user.id) : [];
  const factViews = facts.map((fact) => ({ id: fact.id, text: fact.text, category: fact.category }));

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace settings-facts-workspace">
        <Link href="/settings" className="profile-back-link">← Back to Settings</Link>
        <header className="settings-heading">
          <span className="profile-eyebrow">Memory</span>
          <h1 className="profile-detail-title">Facts About You</h1>
          <p>Saved facts help Primoria tailor lessons, practices, and conversations to your background, goals, preferences, and context.</p>
        </header>
        <FactsAboutYou initialFacts={factViews} />
      </section>
    </main>
  );
}
