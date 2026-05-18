import { TutorSidebar } from "@/components/tutor/sidebar";
import { TutorWorkspaceClient } from "@/components/tutor/tutor-workspace-client";

export default function HomePage() {
  return (
    <main className="app-shell">
      <TutorSidebar />
      <TutorWorkspaceClient />
    </main>
  );
}
