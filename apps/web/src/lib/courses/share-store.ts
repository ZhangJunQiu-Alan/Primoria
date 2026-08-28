import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Course, ImageBlock, Lesson } from "./types";
import { courseToRow, getCourse, lessonToRow } from "./store";
import { getDb } from "../db/client";
import { courses as coursesTable, courseShareLinks, courseShareVersions, lessons as lessonsTable, mediaAssets } from "../db/schema";

/** Sanitized course copy stored in course_share_versions.snapshot. */
export type CourseShareSnapshot = {
  course: Course;
  sharedAt: number;
};

export type CourseShareLink = {
  id: string;
  versionId: string;
  version: number;
  token: string;
  courseId: string;
  sharePath: string;
  revokedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type ImportShareResult =
  | { ok: true; courseId: string; alreadyImported: boolean }
  | { ok: false; reason: "not_found" | "duplicate_subject" };

export function sharePathForToken(token: string): string {
  return `/share/${encodeURIComponent(token)}`;
}

export function createShareToken(): string {
  return randomBytes(24).toString("base64url");
}

function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

/** Builds the public snapshot from a live course. Strips everything personal:
 * learning progress, remediation provenance, archival state. Image blocks whose
 * asset is not in the global pool (owner-scoped) are degraded to the inline
 * error state so private bytes never become publicly reachable. */
export function buildShareSnapshot(course: Course, globalAssetIds: Set<string>, sharedAt = Date.now()): CourseShareSnapshot {
  const lessons: Lesson[] = course.lessons.map((lesson) => ({
    ...lesson,
    progress: "not_started",
    triggeredFrom: null,
    blocks: lesson.blocks
      ? lesson.blocks.map((block) => {
          if (block.type !== "image" || !block.assetId || globalAssetIds.has(block.assetId)) return block;
          const degraded: ImageBlock = { ...block, assetId: "", imageUrl: "", status: "error" };
          return degraded;
        })
      : null,
  }));
  return {
    course: { ...course, lessons, archivedAt: null },
    sharedAt,
  };
}

/** The subset of a course's image-block asset ids that are in the global
 * (owner_id NULL) media pool and therefore publicly servable. */
async function listGlobalAssetIds(course: Course): Promise<Set<string>> {
  const assetIds = course.lessons
    .flatMap((lesson) => lesson.blocks ?? [])
    .filter((block): block is ImageBlock => block.type === "image")
    .map((block) => block.assetId)
    .filter(Boolean);
  if (assetIds.length === 0) return new Set();
  const rows = await getDb()
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(inArray(mediaAssets.id, assetIds), isNull(mediaAssets.ownerId)));
  return new Set(rows.map((row) => row.id));
}

function rowToShareLink(
  share: typeof courseShareLinks.$inferSelect,
  version: typeof courseShareVersions.$inferSelect,
): CourseShareLink {
  return {
    id: share.id,
    versionId: version.id,
    version: version.version,
    token: version.token,
    courseId: share.courseId,
    sharePath: sharePathForToken(version.token),
    revokedAt: version.revokedAt?.getTime() ?? null,
    createdAt: share.createdAt.getTime(),
    updatedAt: version.createdAt.getTime(),
  };
}

export async function getShareForCourse(courseId: string, ownerId: string): Promise<CourseShareLink | null> {
  const rows = await getDb()
    .select({ share: courseShareLinks, version: courseShareVersions })
    .from(courseShareLinks)
    .innerJoin(courseShareVersions, eq(courseShareVersions.shareId, courseShareLinks.id))
    .where(and(eq(courseShareLinks.courseId, courseId), eq(courseShareLinks.ownerId, ownerId)))
    .orderBy(desc(courseShareVersions.version))
    .limit(1);
  return rows[0] ? rowToShareLink(rows[0].share, rows[0].version) : null;
}

/** Publishes an immutable share version. Refreshing or re-enabling revokes the
 * prior capability token and inserts a new snapshot row in the same series. */
export async function upsertShare(courseId: string, ownerId: string): Promise<CourseShareLink | null> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return null;
  const snapshot = buildShareSnapshot(course, await listGlobalAssetIds(course));

  return getDb().transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(courseShareLinks)
      .values({ id: randomId("shr"), courseId, ownerId, createdAt: now, updatedAt: now })
      .onConflictDoNothing({ target: courseShareLinks.courseId });

    const shareRows = await tx
      .select()
      .from(courseShareLinks)
      .where(and(eq(courseShareLinks.courseId, courseId), eq(courseShareLinks.ownerId, ownerId)))
      .limit(1)
      .for("update");
    const share = shareRows[0];
    if (!share) return null;

    const versionRows = await tx
      .select()
      .from(courseShareVersions)
      .where(eq(courseShareVersions.shareId, share.id))
      .orderBy(desc(courseShareVersions.version))
      .limit(1);
    const latest = versionRows[0];
    if (latest && !latest.revokedAt) {
      await tx
        .update(courseShareVersions)
        .set({ revokedAt: now })
        .where(eq(courseShareVersions.id, latest.id));
    }

    const rows = await tx
      .insert(courseShareVersions)
      .values({
        id: randomId("shv"),
        shareId: share.id,
        version: (latest?.version ?? 0) + 1,
        token: createShareToken(),
        snapshot,
        revokedAt: null,
        createdAt: now,
      })
      .returning();
    await tx.update(courseShareLinks).set({ updatedAt: now }).where(eq(courseShareLinks.id, share.id));
    return rowToShareLink(share, rows[0]);
  });
}

export async function revokeShare(courseId: string, ownerId: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const shares = await tx
      .select({ id: courseShareLinks.id })
      .from(courseShareLinks)
      .where(and(eq(courseShareLinks.courseId, courseId), eq(courseShareLinks.ownerId, ownerId)))
      .limit(1)
      .for("update");
    if (!shares[0]) return false;
    const now = new Date();
    const rows = await tx
      .update(courseShareVersions)
      .set({ revokedAt: now })
      .where(and(eq(courseShareVersions.shareId, shares[0].id), isNull(courseShareVersions.revokedAt)))
      .returning({ id: courseShareVersions.id });
    if (rows.length > 0) {
      await tx.update(courseShareLinks).set({ updatedAt: now }).where(eq(courseShareLinks.id, shares[0].id));
    }
    return rows.length > 0;
  });
}

export type ActiveShare = {
  id: string;
  versionId: string;
  version: number;
  courseId: string;
  snapshot: CourseShareSnapshot;
  updatedAt: number;
};

export async function getActiveShareByToken(token: string): Promise<ActiveShare | null> {
  if (!token) return null;
  const rows = await getDb()
    .select({ share: courseShareLinks, version: courseShareVersions })
    .from(courseShareVersions)
    .innerJoin(courseShareLinks, eq(courseShareLinks.id, courseShareVersions.shareId))
    .where(and(eq(courseShareVersions.token, token), isNull(courseShareVersions.revokedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.share.id,
    versionId: row.version.id,
    version: row.version.version,
    courseId: row.share.courseId,
    snapshot: row.version.snapshot as CourseShareSnapshot,
    updatedAt: row.version.createdAt.getTime(),
  };
}

/** Rebuilds a snapshot course as a fresh copy owned by the importer: new
 * course/lesson ids (both are global primary keys), progress reset, version 1.
 * Block ids stay stable — they only live inside the lesson jsonb. */
export function snapshotToImportedCourse(snapshot: CourseShareSnapshot, now = Date.now()): Course {
  const source = snapshot.course;
  return {
    ...source,
    id: randomId("crs"),
    lessons: source.lessons.map((lesson) => ({
      ...lesson,
      id: randomId("lsn"),
      progress: "not_started",
      triggeredFrom: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })),
    archivedAt: null,
    scopeKey: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const err = error as { code?: string; constraint_name?: string; constraint?: string; message?: string };
  const name = err?.constraint_name ?? err?.constraint ?? "";
  return err?.code === "23505" && (name === constraint || Boolean(err?.message?.includes(constraint)));
}

export async function importSharedCourse(token: string, ownerId: string): Promise<ImportShareResult> {
  const share = await getActiveShareByToken(token);
  if (!share) return { ok: false, reason: "not_found" };

  const db = getDb();
  const existing = await db
    .select({ id: coursesTable.id })
    .from(coursesTable)
    .where(and(eq(coursesTable.ownerId, ownerId), eq(coursesTable.importedFromShareId, share.id)))
    .limit(1);
  if (existing[0]) return { ok: true, courseId: existing[0].id, alreadyImported: true };

  const sourceGraphId = share.snapshot.course.graphId;
  if (sourceGraphId) {
    const duplicateSubject = await db
      .select({ id: coursesTable.id })
      .from(coursesTable)
      .where(
        and(
          eq(coursesTable.ownerId, ownerId),
          eq(coursesTable.graphId, sourceGraphId),
          isNull(coursesTable.archivedAt),
        ),
      )
      .limit(1);
    if (duplicateSubject[0]) return { ok: false, reason: "duplicate_subject" };
  }

  const course = snapshotToImportedCourse(share.snapshot);
  const courseRow = { ...courseToRow(course, ownerId), importedFromShareId: share.id };
  const lessonRows = course.lessons.map((lesson) => lessonToRow(lesson, course.id, ownerId));

  try {
    await db.transaction(async (tx) => {
      await tx.insert(coursesTable).values(courseRow);
      for (const row of lessonRows) {
        await tx.insert(lessonsTable).values(row);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error, "courses_owner_imported_share_uidx")) {
      const raced = await db
        .select({ id: coursesTable.id })
        .from(coursesTable)
        .where(and(eq(coursesTable.ownerId, ownerId), eq(coursesTable.importedFromShareId, share.id)))
        .limit(1);
      if (raced[0]) return { ok: true, courseId: raced[0].id, alreadyImported: true };
    }
    throw error;
  }
  return { ok: true, courseId: course.id, alreadyImported: false };
}
