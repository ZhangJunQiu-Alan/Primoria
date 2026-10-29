import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { imageAssetUrl } from "@/lib/ai/media/media-assets";
import type { Course } from "./types";
import { courseCoverCacheKey } from "./course-cover";

/** Cover URL per course id, for the courses whose cover exists. One indexed
 * lookup; a failure only drops back to line-art covers. */
export async function findCourseCoverUrls(courses: Array<Pick<Course, "id" | "title" | "graphId" | "scopeKey">>): Promise<Map<string, string>> {
  const keyByCourse = new Map<string, string>();
  for (const course of courses) {
    const key = courseCoverCacheKey(course);
    if (key) keyByCourse.set(course.id, key);
  }
  const urls = new Map<string, string>();
  if (keyByCourse.size === 0) return urls;
  try {
    const rows = await getDb()
      .select({ id: mediaAssets.id, cacheKey: mediaAssets.cacheKey })
      .from(mediaAssets)
      .where(inArray(mediaAssets.cacheKey, [...new Set(keyByCourse.values())]));
    const assetByKey = new Map(rows.map((row) => [row.cacheKey, row.id]));
    for (const [courseId, key] of keyByCourse) {
      const assetId = assetByKey.get(key);
      if (assetId) urls.set(courseId, imageAssetUrl(assetId));
    }
  } catch (error) {
    console.warn("[course-cover] cover lookup failed", error);
  }
  return urls;
}
