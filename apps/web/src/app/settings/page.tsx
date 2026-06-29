import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const settingsSections = [
  {
    title: "Facts About You",
    body: "Background information that helps Primoria personalize generated lessons.",
    action: "EDIT FACTS",
  },
  {
    title: "Content Language",
    body: "Language used for generated explanations and responses.",
    action: "Simplified Chinese",
  },
  {
    title: "Subscription",
    body: "Current plan: Free",
    action: "UPGRADE TO PRO",
    href: "/upgrade",
  },
  {
    title: "Community",
    body: "Join the learner community and product updates.",
    action: "JOIN OUR DISCORD",
  },
  {
    title: "App Information",
    body: "Version 0.21.17",
    action: null,
  },
  {
    title: "Account",
    body: "Danger zone for permanent account actions.",
    action: "DELETE ACCOUNT",
    danger: true,
  },
];

export default async function SettingsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/settings");

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace settings-workspace">
        <Link href="/profile" className="profile-back-link">← Back to Profile</Link>
        <h1 className="profile-detail-title">Settings</h1>
        <div className="settings-stack">
          {settingsSections.map((section) => (
            <article key={section.title} className="settings-card">
              <div>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>
              {section.action ? (
                section.href ? (
                  <Link className={`settings-action${section.danger ? " danger" : ""}`} href={section.href}>{section.action}</Link>
                ) : (
                  <button type="button" className={`settings-action${section.danger ? " danger" : ""}`}>{section.action}</button>
                )
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
