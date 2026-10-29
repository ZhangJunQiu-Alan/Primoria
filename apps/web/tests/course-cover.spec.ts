import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => unknown>,
  rows: [] as Array<{ id: string; cacheKey: string }>,
  queryError: null as Error | null,
}));

vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    mockState.afterCallbacks.push(callback);
  },
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: async () => {
          if (mockState.queryError) throw mockState.queryError;
          return mockState.rows;
        },
      }),
    }),
  }),
}));

import { buildCourseCoverPrompt, courseCoverCacheKey } from "../src/lib/courses/course-cover";
import { ensureCourseCover, scheduleCourseCover } from "../src/lib/courses/course-cover-store";
import { findCourseCoverUrls } from "../src/lib/courses/course-cover-lookup";
import type { MediaAssetStore, NewMediaAsset } from "../src/lib/ai/media/media-assets";
import type { MediaAssetRow } from "../src/lib/db/schema";
import type { Course, Lesson } from "../src/lib/courses/types";

function lesson(title: string, sortKey: number): Lesson {
  return {
    id: `l-${sortKey}`,
    title,
    description: "",
    role: "new",
    progress: "not_started",
    status: "planned",
    sortKey,
    blocks: null,
    estimatedMinutes: null,
    version: 1,
    createdAt: 0,
    updatedAt: 0,
  };
}

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-1",
    title: "Linear algebra for machine learning",
    topic: "Linear algebra",
    summary: "",
    estimatedMinutes: 0,
    graphId: "linear_algebra",
    scopeKey: "graph:linear_algebra:full",
    lessons: [lesson("Matrices as transformations", 2), lesson("Vectors", 1)],
    version: 1,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function memoryStore() {
  const rows = new Map<string, MediaAssetRow>();
  const inserted: NewMediaAsset[] = [];
  const store: MediaAssetStore = {
    async findByCacheKey(cacheKey) {
      return rows.get(cacheKey) ?? null;
    },
    async getById(id) {
      return [...rows.values()].find((row) => row.id === id) ?? null;
    },
    async insert(asset) {
      inserted.push(asset);
      const row = { ...asset, createdAt: new Date(), updatedAt: new Date() } as MediaAssetRow;
      rows.set(asset.cacheKey, row);
      return row;
    },
  };
  return { store, inserted };
}

const image = { mimeType: "image/png", dataBase64: Buffer.from("png").toString("base64"), model: "gemini-test" };

describe("course cover cache key", () => {
  it("shares one cover per learning scope and ignores the title there", () => {
    const a = courseCoverCacheKey(course());
    const b = courseCoverCacheKey(course({ id: "course-2", title: "线性代数" }));
    const other = courseCoverCacheKey(course({ scopeKey: "graph:linear_algebra:goal:abc" }));
    expect(a).toMatch(/^course-cover:cover-v1:[0-9a-f]{32}$/);
    expect(b).toBe(a);
    expect(other).not.toBe(a);
    expect(courseCoverCacheKey(course({ scopeKey: "graph:linear_algebra:full:prep:intake-1" }))).toBe(a);
  });

  it("falls back to the normalized title for scope-less courses", () => {
    const a = courseCoverCacheKey(course({ graphId: null, scopeKey: null, title: "Quantum  Basics" }));
    const b = courseCoverCacheKey(course({ graphId: null, scopeKey: null, title: "quantum basics" }));
    expect(a).toBe(b);
  });

  it("never keys a cover for a private material course", () => {
    expect(courseCoverCacheKey(course({ graphId: "mat_abc", scopeKey: "graph:mat_abc:full" }))).toBeNull();
  });
});

describe("course cover prompt", () => {
  it("describes the course content in lesson order and forbids text", () => {
    const prompt = buildCourseCoverPrompt(course());
    expect(prompt).toContain("Linear algebra for machine learning (Linear algebra)");
    expect(prompt).toContain("It covers: Vectors; Matrices as transformations.");
    expect(prompt).toContain("#F8F3E9");
    expect(prompt).toContain("Absolutely no text");
  });
});

describe("ensureCourseCover", () => {
  it("generates once and reuses the stored cover afterwards", async () => {
    const { store, inserted } = memoryStore();
    const generate = vi.fn(async () => image);
    const deps = { loadCourse: async () => course(), generate, store, objects: null };

    await ensureCourseCover("course-1", "owner-1", deps);
    await ensureCourseCover("course-1", "owner-1", deps);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      ownerId: null,
      cacheKey: courseCoverCacheKey(course()),
      brief: { kind: "course_cover", courseTitle: "Linear algebra for machine learning", styleVersion: "cover-v1" },
      dataBase64: image.dataBase64,
      storagePath: null,
    });
    expect(inserted[0].prompt).toContain("Absolutely no text");
  });

  it("skips material courses and missing courses", async () => {
    const { store } = memoryStore();
    const generate = vi.fn(async () => image);
    await ensureCourseCover("course-1", "owner-1", { loadCourse: async () => course({ graphId: "mat_abc" }), generate, store, objects: null });
    await ensureCourseCover("course-1", "owner-1", { loadCourse: async () => undefined, generate, store, objects: null });
    expect(generate).not.toHaveBeenCalled();
  });

  it("swallows a generation failure", async () => {
    const { store, inserted } = memoryStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      ensureCourseCover("course-1", "owner-1", {
        loadCourse: async () => course(),
        generate: async () => {
          throw new Error("quota");
        },
        store,
        objects: null,
      }),
    ).resolves.toBeUndefined();
    expect(inserted).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("scheduleCourseCover", () => {
  beforeEach(() => {
    mockState.afterCallbacks.length = 0;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing without a Gemini key", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    scheduleCourseCover(course(), "owner-1");
    expect(mockState.afterCallbacks).toHaveLength(0);
  });

  it("schedules after the response when configured, except material courses and the kill switch", () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    scheduleCourseCover(course(), "owner-1");
    scheduleCourseCover(course({ graphId: "mat_abc" }), "owner-1");
    expect(mockState.afterCallbacks).toHaveLength(1);

    vi.stubEnv("PRIMORIA_DISABLE_COURSE_COVERS", "1");
    scheduleCourseCover(course(), "owner-1");
    expect(mockState.afterCallbacks).toHaveLength(1);
  });
});

describe("findCourseCoverUrls", () => {
  beforeEach(() => {
    mockState.rows = [];
    mockState.queryError = null;
  });

  it("maps every course on a covered scope to the asset URL", async () => {
    const key = courseCoverCacheKey(course())!;
    mockState.rows = [{ id: "media_cover", cacheKey: key }];
    const urls = await findCourseCoverUrls([
      course(),
      course({ id: "course-2" }),
      course({ id: "course-3", scopeKey: "graph:other:full" }),
      course({ id: "course-4", graphId: "mat_abc" }),
    ]);
    expect(Object.fromEntries(urls)).toEqual({
      "course-1": "/api/media/assets/media_cover",
      "course-2": "/api/media/assets/media_cover",
    });
  });

  it("falls back to no covers when the lookup fails", async () => {
    mockState.queryError = new Error("db down");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await findCourseCoverUrls([course()])).size).toBe(0);
    warn.mockRestore();
  });
});
