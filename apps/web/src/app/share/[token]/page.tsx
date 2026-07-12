import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedCourseView } from "@/components/share/shared-course-view";
import { getCurrentUserForRsc } from "@/lib/auth/session";
import { getActiveShareByToken } from "@/lib/courses/share-store";

export const dynamic = "force-dynamic";

// Share previews are capability-URL pages: reachable only with the token,
// never indexed.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const share = await getActiveShareByToken(token);
  return {
    title: share ? `${share.snapshot.course.title} | Primoria` : "Primoria",
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getActiveShareByToken(token);
  if (!share) notFound();
  const user = await getCurrentUserForRsc();

  return <SharedCourseView token={token} course={share.snapshot.course} signedIn={Boolean(user)} />;
}
