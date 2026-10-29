import Image from "next/image";
import { courseCoverKind, courseCoverMarkup } from "./course-cover-art";

/** A course's cover: the generated image when one exists, otherwise the
 * deterministic line-art drawing for its subject. */
export function CourseCover({
  title,
  topic,
  fromMaterials = false,
  coverUrl,
  sizes = "360px",
}: {
  title: string;
  topic?: string;
  fromMaterials?: boolean;
  coverUrl?: string | null;
  sizes?: string;
}) {
  if (coverUrl) return <Image src={coverUrl} alt="" fill sizes={sizes} unoptimized />;
  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: courseCoverMarkup(courseCoverKind(`${title} ${topic ?? ""}`, fromMaterials)) }}
    />
  );
}
