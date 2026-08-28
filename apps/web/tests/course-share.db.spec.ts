import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { courseShareLinks, courseShareVersions, courses } from "@/lib/db/schema";
import {
  getActiveShareByToken,
  importSharedCourse,
  revokeShare,
  upsertShare,
} from "@/lib/courses/share-store";
import {
  resetTestDb,
  seedCourse,
  seedLesson,
  seedUser,
  setupTestDb,
  teardownTestDb,
  TEST_DB_AVAILABLE,
} from "./helpers/test-db";

const run = process.env.RUN_COURSE_SHARE_DB === "1" && TEST_DB_AVAILABLE;
const suite = run ? describe : describe.skip;

suite("course share database invariants", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  let ownerId: string;
  let receiverId: string;
  let courseId: string;

  beforeAll(async () => {
    sql = await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb(sql);
    ownerId = `share_owner_test_${randomUUID()}`;
    receiverId = `share_receiver_test_${randomUUID()}`;
    courseId = `share_course_test_${randomUUID()}`;
    await seedUser(sql, ownerId);
    await seedUser(sql, receiverId);
    await seedCourse(sql, { id: courseId, ownerId, graphId: "share_graph_test" });
    await seedLesson(sql, { id: `lesson_${randomUUID()}`, courseId, ownerId, status: "generated" });
  });

  afterAll(async () => {
    await resetTestDb(sql);
    await teardownTestDb(sql);
  });

  it("publishes refreshes as immutable versions and revokes the old token", async () => {
    const first = await upsertShare(courseId, ownerId);
    expect(first).not.toBeNull();
    expect(first?.version).toBe(1);

    await sql`update courses set title = 'Updated course', updated_at = now() where id = ${courseId}`;
    const second = await upsertShare(courseId, ownerId);

    expect(second?.id).toBe(first?.id);
    expect(second?.version).toBe(2);
    expect(second?.versionId).not.toBe(first?.versionId);
    expect(second?.token).not.toBe(first?.token);
    expect(await getActiveShareByToken(first?.token ?? "")).toBeNull();
    expect((await getActiveShareByToken(second?.token ?? ""))?.snapshot.course.title).toBe("Updated course");

    const versions = await getDb()
      .select()
      .from(courseShareVersions)
      .where(eq(courseShareVersions.shareId, first?.id ?? ""))
      .orderBy(asc(courseShareVersions.version));
    expect(versions).toHaveLength(2);
    expect(versions[0].revokedAt).not.toBeNull();
    expect(versions[1].revokedAt).toBeNull();
    expect((versions[0].snapshot as { course: { title: string } }).course.title).toBe("T");
    expect((versions[1].snapshot as { course: { title: string } }).course.title).toBe("Updated course");
  });

  it("revokes only the active version and re-enables with a new version", async () => {
    const first = await upsertShare(courseId, ownerId);
    expect(await revokeShare(courseId, ownerId)).toBe(true);
    expect(await revokeShare(courseId, ownerId)).toBe(false);
    expect(await getActiveShareByToken(first?.token ?? "")).toBeNull();

    const second = await upsertShare(courseId, ownerId);
    expect(second?.id).toBe(first?.id);
    expect(second?.version).toBe(2);
    expect(second?.token).not.toBe(first?.token);
  });

  it("keeps share creation and revocation owner-scoped", async () => {
    expect(await upsertShare(courseId, receiverId)).toBeNull();
    const share = await upsertShare(courseId, ownerId);
    expect(share).not.toBeNull();
    expect(await revokeShare(courseId, receiverId)).toBe(false);
    expect(await getActiveShareByToken(share?.token ?? "")).not.toBeNull();
  });

  it("makes concurrent and repeated imports idempotent", async () => {
    const share = await upsertShare(courseId, ownerId);
    const [first, second] = await Promise.all([
      importSharedCourse(share?.token ?? "", receiverId),
      importSharedCourse(share?.token ?? "", receiverId),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.courseId).toBe(second.courseId);
    expect([first.alreadyImported, second.alreadyImported]).toContain(true);

    const repeated = await importSharedCourse(share?.token ?? "", receiverId);
    expect(repeated).toEqual({ ok: true, courseId: first.courseId, alreadyImported: true });
    const importedRows = await getDb()
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.importedFromShareId, share?.id ?? ""));
    expect(importedRows).toHaveLength(1);
  });

  it("rejects an import when the receiver already has an active course for the subject", async () => {
    const existingCourseId = `share_existing_test_${randomUUID()}`;
    await seedCourse(sql, { id: existingCourseId, ownerId: receiverId, graphId: "share_graph_test" });
    const share = await upsertShare(courseId, ownerId);

    expect(await importSharedCourse(share?.token ?? "", receiverId)).toEqual({
      ok: false,
      reason: "duplicate_subject",
    });
  });

  it("does not mutate an imported copy when the owner publishes a new version", async () => {
    const firstShare = await upsertShare(courseId, ownerId);
    const imported = await importSharedCourse(firstShare?.token ?? "", receiverId);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    await sql`update courses set title = 'Owner v2', updated_at = now() where id = ${courseId}`;
    const secondShare = await upsertShare(courseId, ownerId);
    expect(secondShare?.version).toBe(2);

    const importedRows = await getDb()
      .select({ title: courses.title })
      .from(courses)
      .where(eq(courses.id, imported.courseId));
    expect(importedRows[0]?.title).toBe("T");
  });

  it("keeps exactly one stable share series per course", async () => {
    await Promise.all([upsertShare(courseId, ownerId), upsertShare(courseId, ownerId)]);
    const links = await getDb()
      .select({ id: courseShareLinks.id })
      .from(courseShareLinks)
      .where(eq(courseShareLinks.courseId, courseId));
    expect(links).toHaveLength(1);
  });

  it("serializes concurrent publication and revocation without deadlocks", async () => {
    const first = await upsertShare(courseId, ownerId);
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, index) =>
      index % 2 === 0 ? revokeShare(courseId, ownerId) : upsertShare(courseId, ownerId),
    ));
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    const versions = await getDb().select().from(courseShareVersions)
      .where(eq(courseShareVersions.shareId, first?.id ?? ""))
      .orderBy(asc(courseShareVersions.version));
    expect(versions).toHaveLength(7);
    expect(versions.map((version) => version.version)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(versions.filter((version) => !version.revokedAt).length).toBeLessThanOrEqual(1);
    expect(await getActiveShareByToken(first?.token ?? "")).toBeNull();
  });

  it("migrates a legacy share without changing its token, snapshot, or revocation", async () => {
    const migration = readFileSync(new URL("../drizzle/0051_fantastic_angel.sql", import.meta.url), "utf8");
    const rollback = new Error("rollback synthetic legacy-schema fixture");
    await expect(sql.begin(async (tx) => {
      await tx`drop table course_share_versions`;
      await tx`drop index course_share_links_owner_idx`;
      await tx`alter table course_share_links add column token text not null, add column snapshot jsonb not null, add column revoked_at timestamptz`;
      await tx`create unique index course_share_links_token_uidx on course_share_links (token)`;
      await tx`
        insert into course_share_links (id, course_id, owner_id, token, snapshot, revoked_at, created_at, updated_at)
        values ('legacy_share_test', ${courseId}, ${ownerId}, 'legacy-capability-token',
          '{"course":{"title":"Legacy snapshot"}}'::jsonb, '2026-01-02T00:00:00Z',
          '2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z')
      `;
      await tx.unsafe(migration);
      const [version] = await tx`select * from course_share_versions where share_id = 'legacy_share_test'`;
      expect(version.id).toBe("legacy_share_test_v1");
      expect(version.version).toBe(1);
      expect(version.token).toBe("legacy-capability-token");
      expect(version.snapshot).toEqual({ course: { title: "Legacy snapshot" } });
      expect(new Date(version.revoked_at).toISOString()).toBe("2026-01-02T00:00:00.000Z");
      expect(new Date(version.created_at).toISOString()).toBe("2026-01-03T00:00:00.000Z");
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
