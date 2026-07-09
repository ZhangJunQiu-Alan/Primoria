import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { FactsAboutYou } from "@/components/profile/facts-about-you";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { getDictionaryForUser } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function FactsSettingsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/settings/facts");

  const [{ dictionary }, facts] = await Promise.all([
    getDictionaryForUser(user?.id ?? null),
    user ? listActiveFacts(user.id) : Promise.resolve([]),
  ]);
  const t = dictionary.settings;
  const factViews = facts.map((fact) => ({ id: fact.id, text: fact.text, category: fact.category }));

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace settings-facts-workspace">
        <Link href="/settings" className="profile-back-link">← {t.backSettings}</Link>
        <header className="settings-heading">
          <span className="profile-eyebrow">{t.memory}</span>
          <h1 className="profile-detail-title">{t.factsTitle}</h1>
          <p>{t.factsPageCopy}</p>
        </header>
        <FactsAboutYou initialFacts={factViews} />
      </section>
    </main>
  );
}
