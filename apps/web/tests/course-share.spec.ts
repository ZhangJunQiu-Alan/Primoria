import { describe, expect, it } from "vitest";

import { isPublicPath } from "../src/lib/auth/routes";
import {
  buildShareSnapshot,
  createShareToken,
  sharePathForToken,
  snapshotToImportedCourse,
} from "../src/lib/courses/share-store";
import type { Course, ImageBlock, QuizBlock } from "../src/lib/courses/types";

function fixtureCourse(): Course {
  const image: ImageBlock = {
    id: "blk_img",
    type: "image",
    assetId: "asset_global",
    imageUrl: "/api/media/assets/asset_global",
    alt: "alt",
    caption: "caption",
    imageKind: "educational_illustration",
  };
  const privateImage: ImageBlock = { ...image, id: "blk_img_private", assetId: "asset_private", imageUrl: "/api/media/assets/asset_private" };
  const quiz: QuizBlock = {
    id: "blk_quiz",
    type: "quiz",
    title: "Quiz",
    questions: [
      { kind: "single", id: "q1", prompt: "p", choices: [{ id: "a", text: "a" }, { id: "b", text: "b" }], answerId: "a" },
    ],
  } as QuizBlock;
  return {
    id: "crs_source",
    title: "Course",
    topic: "Topic",
    summary: "Summary",
    estimatedMinutes: 30,
    anchorConceptId: null,
    graphId: "mit_calculus",
    language: "zh",
    archivedAt: 123,
    version: 7,
    createdAt: 1,
    updatedAt: 2,
    lessons: [
      {
        id: "lsn_1",
        title: "Lesson 1",
        description: "d",
        role: "core",
        progress: "completed",
        status: "generated",
        sortKey: 1,
        topicId: null,
        triggeredFrom: "lsn_0",
        blocks: [image, privateImage, quiz],
        estimatedMinutes: 10,
        version: 3,
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: "lsn_2",
        title: "Planned lesson",
        description: "d",
        role: "core",
        progress: "not_started",
        status: "planned",
        sortKey: 2,
        topicId: null,
        triggeredFrom: null,
        blocks: null,
        estimatedMinutes: null,
        version: 1,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
  } as Course;
}

describe("course share snapshot", () => {
  it("preserves validated component versions in immutable snapshots and imported copies", () => {
    const course = fixtureCourse();
    course.lessons[0].blocks!.push({ id: "interactive", type: "visual", description: "Observe rays", engine: "interactive", interactive: { componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 10 } } });
    const snapshot = buildShareSnapshot(course, new Set(["asset_global"]));
    const imported = snapshotToImportedCourse(snapshot);
    const original = course.lessons[0].blocks!.at(-1)!;
    if (original.type !== "visual") throw new Error("fixture");
    original.interactive!.config.focalLength = 20;
    const shared = snapshot.course.lessons[0].blocks!.at(-1)!;
    const copied = imported.lessons[0].blocks!.at(-1)!;
    expect(shared).toMatchObject({ engine: "interactive", interactive: { configVersion: 1, config: { focalLength: 10 } } });
    if (copied.type !== "visual") throw new Error("fixture");
    copied.interactive!.config.focalLength = 25;
    expect(shared).toMatchObject({ interactive: { config: { focalLength: 10 } } });
  });
  it("shares and imports a course whose trusted block cannot be upgraded, without copying its unvalidated config", () => {
    const course = fixtureCourse();
    course.lessons[0].blocks!.push({ id: "future", type: "visual", description: "Observe rays", engine: "interactive", interactive: { componentId: "physics.lens-imaging", configVersion: 99, config: { focalLength: 10 } } });
    const snapshot = buildShareSnapshot(course, new Set(["asset_global"]));
    expect(snapshot.course.lessons[0].blocks!.at(-1)).toMatchObject({ id: "future", engine: "interactive", description: "Observe rays" });
    expect(snapshot.course.lessons[0].blocks!.at(-1)).not.toHaveProperty("interactive");
    const legacySnapshot = structuredClone(snapshot);
    legacySnapshot.course.lessons[0].blocks!.push({ id: "unknown", type: "visual", description: "Removed component", engine: "interactive", interactive: { componentId: "retired.component", configVersion: 1, config: {} } });
    const imported = snapshotToImportedCourse(legacySnapshot);
    expect(imported.lessons[0].blocks!.at(-1)).not.toHaveProperty("interactive");
  });
  it("strips learner progress and archival state", () => {
    const snapshot = buildShareSnapshot(fixtureCourse(), new Set(["asset_global"]));

    expect(snapshot.course.archivedAt).toBeNull();
    for (const lesson of snapshot.course.lessons) {
      expect(lesson.progress).toBe("not_started");
      expect(lesson.triggeredFrom).toBeNull();
    }
  });

  it("keeps global-pool images and degrades owner-scoped images to the error state", () => {
    const snapshot = buildShareSnapshot(fixtureCourse(), new Set(["asset_global"]));
    const blocks = snapshot.course.lessons[0].blocks ?? [];
    const kept = blocks.find((block) => block.id === "blk_img") as ImageBlock;
    const degraded = blocks.find((block) => block.id === "blk_img_private") as ImageBlock;

    expect(kept.assetId).toBe("asset_global");
    expect(kept.imageUrl).toContain("asset_global");
    expect(degraded.assetId).toBe("");
    expect(degraded.imageUrl).toBe("");
    expect(degraded.status).toBe("error");
  });

  it("leaves planned lessons as outline-only nodes", () => {
    const snapshot = buildShareSnapshot(fixtureCourse(), new Set());
    expect(snapshot.course.lessons[1].blocks).toBeNull();
  });
});

describe("share import mapping", () => {
  it("mints new course and lesson ids but keeps block ids", () => {
    const source = fixtureCourse();
    const snapshot = buildShareSnapshot(source, new Set(["asset_global"]));
    const imported = snapshotToImportedCourse(snapshot);

    expect(imported.id).not.toBe(source.id);
    expect(imported.id).toMatch(/^crs_/);
    const [first, second] = imported.lessons;
    expect(first.id).not.toBe("lsn_1");
    expect(first.id).toMatch(/^lsn_/);
    expect(second.id).not.toBe("lsn_2");
    expect(first.blocks?.map((block) => block.id)).toEqual(["blk_img", "blk_img_private", "blk_quiz"]);
  });

  it("resets versions and progress on the imported copy", () => {
    const imported = snapshotToImportedCourse(buildShareSnapshot(fixtureCourse(), new Set()));

    expect(imported.version).toBe(1);
    expect(imported.archivedAt).toBeNull();
    for (const lesson of imported.lessons) {
      expect(lesson.version).toBe(1);
      expect(lesson.progress).toBe("not_started");
      expect(lesson.triggeredFrom).toBeNull();
    }
  });
});

describe("share tokens and routes", () => {
  it("generates long url-safe tokens", () => {
    const token = createShareToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(createShareToken()).not.toBe(token);
  });

  it("exposes /share as a public route and keeps the app private", () => {
    expect(isPublicPath(sharePathForToken(createShareToken()))).toBe(true);
    expect(isPublicPath("/share")).toBe(true);
    expect(isPublicPath("/library")).toBe(false);
    expect(isPublicPath("/course/abc")).toBe(false);
  });
});
