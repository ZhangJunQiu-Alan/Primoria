import { notFound, redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { FolderDetail } from "@/components/materials/folder-detail";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { getFolder, listFolderMaterials, listFolders } from "@/lib/materials/folders";

export const dynamic = "force-dynamic";

export default async function MaterialFolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (!authEnabled || !user) redirect("/materials");

  const [{ dictionary: t }, folder, materials, folders] = await Promise.all([
    getDictionaryForUser(user.id),
    getFolder(user.id, folderId),
    listFolderMaterials(user.id, folderId),
    listFolders(user.id),
  ]);
  if (!folder) notFound();

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace library-workspace">
        <header className="library-page-header">
          <h1>{t.folders.pageTitle}</h1>
        </header>
        <FolderDetail
          folder={{ id: folder.id, name: folder.name, kind: folder.kind as "subject" | "unsorted" }}
          folders={folders.map((entry) => ({ id: entry.id, name: entry.name, kind: entry.kind }))}
          initialMaterials={materials}
        />
      </section>
    </main>
  );
}
