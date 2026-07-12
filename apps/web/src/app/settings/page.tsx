import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { BookIcon, ChartIcon, SparkleIcon } from "@/components/profile/profile-icons";
import { ContentLanguageSelect } from "@/components/profile/content-language-select";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { getUserPreferences } from "@/lib/settings/user-settings";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/settings");

  const settingsDataPromise = user
    ? Promise.all([listActiveFacts(user.id), getUserPreferences(user.id)])
    : Promise.all([Promise.resolve([]), getUserPreferences(null)]);
  const [{ dictionary }, [facts, preferences]] = await Promise.all([
    getDictionaryForUser(user?.id ?? null),
    settingsDataPromise,
  ]);
  const t = dictionary.settings;
  const previewFacts = facts.slice(0, 2);

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace settings-workspace">
        <Link href="/profile" className="profile-back-link">← {t.backProfile}</Link>
        <header className="settings-heading">
          <span className="profile-eyebrow">{t.personalization}</span>
          <h1 className="profile-detail-title">{t.title}</h1>
        </header>

        <div className="settings-stack">
          <article className="settings-card settings-card-tall">
            <div className="settings-card-copy">
              <span className="settings-icon memory"><SparkleIcon /></span>
              <div>
                <h2>{t.factsTitle}</h2>
                <p>{t.factsCopy}</p>
              </div>
            </div>
            {previewFacts.length ? (
              <div className="settings-fact-preview" aria-label={t.factsTitle}>
                {previewFacts.map((fact) => <span key={fact.id}>{fact.text}</span>)}
                {facts.length > previewFacts.length ? <em>{formatMessage(t.moreFacts, { count: facts.length - previewFacts.length })}</em> : null}
              </div>
            ) : (
              <p className="settings-muted">{t.noFacts}</p>
            )}
            <Link href="/settings/facts" className="settings-wide-action">{t.editFacts}</Link>
          </article>

          <article className="settings-card settings-card-tall">
            <div className="settings-card-copy">
              <span className="settings-icon language"><ChartIcon /></span>
              <div>
                <h2>{dictionary.language.interfaceTitle}</h2>
                <p>{dictionary.language.interfaceDescription}</p>
              </div>
            </div>
            <LanguageSwitcher className="settings-wide-select" />
          </article>

          <article className="settings-card settings-card-tall">
            <div className="settings-card-copy">
              <span className="settings-icon language"><BookIcon /></span>
              <div>
                <h2>{dictionary.language.contentTitle}</h2>
                <p>{dictionary.language.contentDescription}</p>
              </div>
            </div>
            <ContentLanguageSelect initialValue={preferences.contentLanguage} />
          </article>

          <section className="settings-secondary-grid" aria-label={t.title}>
            <article className="settings-mini-card">
              <span className="settings-icon info">i</span>
              <div>
                <h2>{t.appInformation}</h2>
                <p>{t.appVersion}</p>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
