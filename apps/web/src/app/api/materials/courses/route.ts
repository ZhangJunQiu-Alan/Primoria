import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { MAX_COURSE_SOURCE_CHARS, MAX_MATERIALS_PER_COURSE } from "@/lib/materials/limits";
import { getOrCreateMaterialGraph } from "@/lib/materials/material-graph-store";
import { scheduleMaterialIndexing } from "@/lib/materials/semantic-index";
import { getMaterialsByIds } from "@/lib/materials/store";
import { getUserPreferences } from "@/lib/settings/user-settings";
import type { LearningMaterialRow } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  materialIds: z.array(z.string().min(1).max(64)).min(1).max(MAX_MATERIALS_PER_COURSE),
  language: z.enum(["zh", "en"]).optional(),
}).strict();

// Explicit request → settings content language → the materials' own language.
function courseLanguage(requested: "zh" | "en" | undefined, preferred: string, materials: LearningMaterialRow[]): "zh" | "en" {
  if (requested) return requested;
  if (preferred === "zh" || preferred === "en") return preferred;
  const zhChars = materials.filter((m) => m.language === "zh").reduce((total, m) => total + m.charCount, 0);
  const allChars = materials.reduce((total, m) => total + m.charCount, 0);
  return zhChars * 2 >= allChars ? "zh" : "en";
}

function courseSummary(materials: LearningMaterialRow[], language: "zh" | "en"): string {
  const titles = materials.map((material) => material.title);
  return language === "zh"
    ? `基于你上传的资料${titles.map((title) => `《${title}》`).join("")}生成的课程`
    : `A course built from your uploaded material: ${titles.join(", ")}`;
}

// Material → course (docs/product/learning-materials.md §5.2): reuse or build
// the owner-private mat_* graph (one model call on a miss), then reuse the
// normal outline + lesson-job pipeline. The first lesson generates in a worker.
export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = user.id;

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: `Select between 1 and ${MAX_MATERIALS_PER_COURSE} materials.`, code: "invalid_request" },
      { status: 400 },
    );
  }

  try {
    const ids = [...new Set(body.materialIds)];
    const found = await getMaterialsByIds(ownerId, ids);
    if (found.length !== ids.length) return NextResponse.json({ error: "Material not found" }, { status: 404 });
    // Keep the learner's selection order: it is the order the graph builder reads.
    const materials = ids.map((id) => found.find((material) => material.id === id)!);
    if (materials.reduce((total, m) => total + m.charCount, 0) > MAX_COURSE_SOURCE_CHARS) {
      return NextResponse.json(
        { error: "The selected materials are too long for one course. Select fewer files.", code: "sources_too_long" },
        { status: 413 },
      );
    }

    const preferences = await getUserPreferences(ownerId);
    const language = courseLanguage(body.language, preferences.contentLanguage, materials);
    const built = await getOrCreateMaterialGraph({ ownerId, materials, language });
    if (!built) {
      return NextResponse.json(
        { error: "A course could not be designed from this material. Please retry, or try a different file.", code: "material_graph_failed" },
        { status: 422 },
      );
    }

    const { course, firstLesson, summary } = await initializeCourseOutline({
      ownerId,
      topic: built.record.title,
      source: "cold_start",
      language,
      generatedGraph: built.record.graph,
      summary: courseSummary(materials, language),
    });
    const enqueued = await enqueueLessonGenerationJob({ ownerId, courseId: course.id, lessonId: firstLesson.id });
    // Course Tutor Q&A searches these materials; backfill any chunk an upload
    // pass missed.
    scheduleMaterialIndexing(ownerId, ids);
    const job = enqueued.job ? toLessonGenerationJobSummary(enqueued.job) : null;
    return NextResponse.json({ courseId: course.id, lessonId: firstLesson.id, job, summary }, { status: 202 });
  } catch (error) {
    console.error("[materials/courses]", error);
    return NextResponse.json({ error: "Course creation failed. Please retry." }, { status: 503 });
  }
}
