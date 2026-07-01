import Link from "next/link";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { SparkleIcon } from "@/components/profile/profile-icons";
import { getCurrentDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const featureFlags = [
  [true, true],
  [false, true],
  [false, true],
  [false, true],
  [false, true],
  [false, true],
] as const;

export default async function UpgradePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  const { dictionary } = await getCurrentDictionary();
  const t = dictionary.upgrade;

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="upgrade-workspace">
        <div className="upgrade-card">
          <div className="upgrade-mascot" aria-hidden="true"><SparkleIcon /></div>
          <p className="landing-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <div className="upgrade-table">
            <div className="upgrade-table-head">
              <span>{t.feature}</span>
              <span>{t.free}</span>
              <span>{t.pro}</span>
            </div>
            {featureFlags.map(([free, pro], index) => (
              <div key={t.features[index]} className="upgrade-row">
                <span>{t.features[index]}</span>
                <strong>{free ? t.yes : "-"}</strong>
                <strong>{pro ? t.yes : "-"}</strong>
              </div>
            ))}
          </div>
          <Link className="upgrade-cta" href="/profile">{dictionary.common.continue}</Link>
        </div>
      </section>
    </main>
  );
}
