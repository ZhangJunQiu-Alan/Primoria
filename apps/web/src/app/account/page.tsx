import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountForm } from "@/components/auth/account-form";
import { ArrowLeftIcon } from "@/components/profile/profile-icons";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getDictionaryForUser } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUserForRsc();
  if (!user) redirect("/login");
  const { dictionary } = await getDictionaryForUser(user.id);
  const t = dictionary.account;

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled: isAuthEnabled(), user }} />
      <section className="profile-detail-workspace">
        <Link href="/settings" className="profile-back-link"><ArrowLeftIcon />{dictionary.settings.backSettings}</Link>
        <header className="profile-page-header">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>
        <div className="settings-stack">
          <article className="settings-card">
            <div className="settings-card-copy">
              <h2>{t.emailLabel}</h2>
            </div>
            <div className="settings-card-control settings-account">
              <span><strong>{user.email ?? "—"}</strong></span>
            </div>
          </article>
          <article className="settings-card">
            <div className="settings-card-copy">
              <h2>{t.profileSection}</h2>
            </div>
            <div className="settings-card-control">
              <AccountForm initialDisplayName={user.displayName ?? ""} />
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
