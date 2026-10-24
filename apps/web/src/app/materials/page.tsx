import Link from "next/link";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { FolderList } from "@/components/materials/folder-list";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { listFolders } from "@/lib/materials/folders";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  // Materials need a persisted identity (the API fails closed without auth).
  const signedIn = authEnabled && Boolean(user);
  const [{ dictionary: t }, folders] = await Promise.all([
    getDictionaryForUser(user?.id ?? null),
    signedIn && user ? listFolders(user.id).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace library-workspace">
        <header className="library-page-header">
          <h1>{t.folders.pageTitle}</h1>
          <p>{t.folders.intro}</p>
        </header>
        {signedIn ? (
          <FolderList initialFolders={folders} />
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
