import { after } from "next/server";
import { generateGeminiImageFromPrompt } from "@/lib/ai/media/gemini-image";
import { dbMediaAssetStore, storeGeneratedImage, type GeneratedImage, type MediaAssetStore } from "@/lib/ai/media/media-assets";
import type { MediaObjectStore } from "@/lib/ai/media/media-storage";
import { getCourse } from "./store";
import type { Course } from "./types";
import { buildCourseCoverPrompt, COURSE_COVER_STYLE_VERSION, courseCoverCacheKey } from "./course-cover";

/** Covers need a Gemini key and can be switched off without touching it. */
export function courseCoversEnabled(): boolean {
  return process.env.PRIMORIA_DISABLE_COURSE_COVERS !== "1" && Boolean(process.env.GEMINI_API_KEY);
}

export type EnsureCourseCoverDeps = {
  loadCourse?: (courseId: string, ownerId: string) => Promise<Course | undefined>;
  generate?: (prompt: string) => Promise<GeneratedImage>;
  store?: MediaAssetStore;
  objects?: MediaObjectStore | null;
};

/** Generates the course's cover once, unless an asset already exists for its
 * scope. Best-effort: a failure leaves the library's line-art fallback. */
export async function ensureCourseCover(courseId: string, ownerId: string, deps: EnsureCourseCoverDeps = {}): Promise<void> {
  try {
    const course = await (deps.loadCourse ?? getCourse)(courseId, ownerId);
    if (!course) return;
    const cacheKey = courseCoverCacheKey(course);
    if (!cacheKey) return;
    const store = deps.store ?? dbMediaAssetStore;
    if (await store.findByCacheKey(cacheKey)) return;
    const prompt = buildCourseCoverPrompt(course);
    const generated = await (deps.generate ?? generateGeminiImageFromPrompt)(prompt);
    // Ownerless like lesson images: the cover depicts course content only and
    // is shared by every learner on the same scope.
    await storeGeneratedImage({
      cacheKey,
      ownerId: null,
      model: generated.model,
      generated,
      prompt,
      brief: { kind: "course_cover", courseTitle: course.title, styleVersion: COURSE_COVER_STYLE_VERSION },
      alt: "",
      caption: "",
      objects: deps.objects,
    }, store);
  } catch (error) {
    console.warn(`[course-cover] cover generation failed for course=${courseId}`, error);
  }
}

/** Runs after the creating request responds. Outside a request scope (workers)
 * the promise simply runs on in the long-lived process. */
export function scheduleCourseCover(course: Pick<Course, "id" | "title" | "graphId" | "scopeKey">, ownerId: string) {
  if (!courseCoversEnabled() || !courseCoverCacheKey(course)) return;
  const run = () => ensureCourseCover(course.id, ownerId);
  try {
    after(run);
  } catch {
    void run();
  }
}
