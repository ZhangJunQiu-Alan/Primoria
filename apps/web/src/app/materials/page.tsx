import Link from "next/link";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { MaterialLibrary } from "@/components/materials/material-library";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { listMaterials } from "@/lib/materials/store";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  // Materials need a persisted identity (the API fails closed without auth).
  const signedIn = authEnabled && Boolean(user);
  const [{ dictionary: t }, materials] = await Promise.all([
    getDictionaryForUser(user?.id ?? null),
    signedIn && user ? listMaterials(user.id).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace library-workspace">
        <header className="library-page-header">
          <h1>{t.materials.pageTitle}</h1>
          <p>{t.materials.intro}</p>
        </header>
        {signedIn ? (
          <MaterialLibrary initialMaterials={materials} />
        ) : (
          <div className="library-empty library-auth-empty">
            <span className="course-block-tag">{t.library.privateWorkspace}</span>
            <h2>{t.materials.signInTitle}</h2>
            <p>{t.materials.signInCopy}</p>
            <div className="auth-required-actions">
              <Link href="/auth/sign-in">{t.common.signIn}</Link>
              <Link href="/auth/sign-up">{t.common.signUp}</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
