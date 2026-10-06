import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ChevronRightIcon } from "@/components/profile/profile-icons";
import { ContentLanguageSelect } from "@/components/profile/content-language-select";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { getUserPreferences } from "@/lib/settings/user-settings";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

const FACT_PREVIEW_LIMIT = 3;

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
  const previewFacts = facts.slice(0, FACT_PREVIEW_LIMIT);

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace settings-workspace">
        <header className="profile-page-header">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>

        <div className="settings-stack">
          <article className="settings-card">
            <div className="settings-card-copy">
              <h2>{t.factsTitle}</h2>
              <p>{t.factsCopy}</p>
            </div>
            <div className="settings-card-control">
              {previewFacts.length ? (
                <ul className="settings-fact-preview" aria-label={t.factsTitle}>
                  {previewFacts.map((fact) => <li key={fact.id}>{fact.text}</li>)}
                  {facts.length > previewFacts.length ? <li className="more">{formatMessage(t.moreFacts, { count: facts.length - previewFacts.length })}</li> : null}
                </ul>
              ) : (
                <p className="settings-muted">{t.noFacts}</p>
              )}
              <Link href="/settings/facts" className="settings-wide-action">
                {t.editFacts}
                <ChevronRightIcon />
              </Link>
            </div>
          </article>

          <article className="settings-card">
            <div className="settings-card-copy">
              <h2>{dictionary.language.interfaceTitle}</h2>
              <p>{dictionary.language.interfaceDescription}</p>
            </div>
            <div className="settings-card-control">
              <LanguageSwitcher className="settings-wide-select" />
            </div>
          </article>

          <article className="settings-card">
            <div className="settings-card-copy">
              <h2>{dictionary.language.contentTitle}</h2>
              <p>{dictionary.language.contentDescription}</p>
            </div>
            <div className="settings-card-control">
              <ContentLanguageSelect initialValue={preferences.contentLanguage} />
            </div>
          </article>

          {user ? (
            <article className="settings-card">
              <div className="settings-card-copy">
                <h2>{dictionary.account.title}</h2>
                <p>{dictionary.account.subtitle}</p>
              </div>
              <div className="settings-card-control settings-account">
                <span>
                  <strong>{user.displayName ?? user.email}</strong>
                  {user.email ? <em>{user.email}</em> : null}
                </span>
                <Link href="/account" className="settings-wide-action">
                  {dictionary.profile.editProfile}
                  <ChevronRightIcon />
                </Link>
              </div>
            </article>
          ) : null}

          <article className="settings-card">
            <div className="settings-card-copy">
              <h2>{t.appInformation}</h2>
            </div>
            <div className="settings-card-control">
              <span className="settings-version">{t.appVersion}</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
