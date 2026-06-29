import Link from "next/link";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { SparkleIcon } from "@/components/profile/profile-icons";

export const dynamic = "force-dynamic";

const features = [
  ["Personalized courses", true, true],
  ["Unlimited lessons", false, true],
  ["Unlimited AI chats", false, true],
  ["Up to 15 courses/mo", false, true],
  ["Jump ahead in courses", false, true],
  ["Early access to memory", false, true],
] as const;

export default async function UpgradePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="upgrade-workspace">
        <div className="upgrade-card">
          <div className="upgrade-mascot" aria-hidden="true"><SparkleIcon /></div>
          <p className="landing-eyebrow">Primoria Pro</p>
          <h1>Learn without limits with Pro</h1>
          <div className="upgrade-table">
            <div className="upgrade-table-head">
              <span>Feature</span>
              <span>Free</span>
              <span>Pro</span>
            </div>
            {features.map(([label, free, pro]) => (
              <div key={label} className="upgrade-row">
                <span>{label}</span>
                <strong>{free ? "Yes" : "-"}</strong>
                <strong>{pro ? "Yes" : "-"}</strong>
              </div>
            ))}
          </div>
          <Link className="upgrade-cta" href="/profile">CONTINUE</Link>
        </div>
      </section>
    </main>
  );
}
