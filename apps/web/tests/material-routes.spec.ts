import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requireConfiguredAuthUser: vi.fn(),
  countMaterials: vi.fn(),
  insertMaterial: vi.fn(),
  listMaterials: vi.fn(),
  deleteMaterial: vi.fn(),
  getMaterialsByIds: vi.fn(),
  getOrCreateMaterialGraph: vi.fn(),
  initializeCourseOutline: vi.fn(),
  enqueueLessonGenerationJob: vi.fn(),
  getUserPreferences: vi.fn(),
  getCourse: vi.fn(),
}));

vi.mock("../src/lib/auth/guard", () => ({ requireConfiguredAuthUser: state.requireConfiguredAuthUser }));
vi.mock("../src/lib/materials/store", () => ({
  countMaterials: state.countMaterials,
  insertMaterial: state.insertMaterial,
  listMaterials: state.listMaterials,
  deleteMaterial: state.deleteMaterial,
  getMaterialsByIds: state.getMaterialsByIds,
}));
vi.mock("../src/lib/materials/material-graph-store", () => ({ getOrCreateMaterialGraph: state.getOrCreateMaterialGraph }));
vi.mock("../src/lib/ai/deepagent/course-generator", () => ({ initializeCourseOutline: state.initializeCourseOutline }));
vi.mock("../src/lib/courses/lesson-generation-jobs", () => ({
  enqueueLessonGenerationJob: state.enqueueLessonGenerationJob,
  toLessonGenerationJobSummary: (job: unknown) => job,
}));
vi.mock("../src/lib/settings/user-settings", () => ({ getUserPreferences: state.getUserPreferences }));
vi.mock("../src/lib/courses/store", () => ({ getCourse: state.getCourse, courseToRow: vi.fn(), lessonToRow: vi.fn() }));

const user = { id: "u1", email: "u1@example.com", displayName: "U1" };

function upload(file: File | null, init: RequestInit = {}) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://primoria.test/api/materials", { method: "POST", body: form, ...init });
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function materialRow(id: string, overrides: Record<string, unknown> = {}) {
  return { id, ownerId: "u1", title: `Title ${id}`, charCount: 5_000, language: "en", ...overrides };
}

const longText = "Entropy measures the average uncertainty of a random variable. ".repeat(10);

describe("material routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    state.requireConfiguredAuthUser.mockResolvedValue({ denied: null, user });
    state.countMaterials.mockResolvedValue(0);
    state.getUserPreferences.mockResolvedValue({ contentLanguage: "auto", uiLanguage: null, timeZone: "UTC" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails closed without a configured identity", async () => {
    state.requireConfiguredAuthUser.mockResolvedValue({ denied: Response.json({ error: "Authentication unavailable" }, { status: 503 }), user: null });
    const { GET, POST } = await import("../src/app/api/materials/route");
    expect((await GET()).status).toBe(503);
    expect((await POST(upload(new File([longText], "notes.txt")))).status).toBe(503);
    expect(state.insertMaterial).not.toHaveBeenCalled();
  });

  it("stores an uploaded text material and reports duplicates", async () => {
    const material = { id: "lm_1", title: "notes" };
    state.insertMaterial.mockResolvedValueOnce({ material, duplicate: false }).mockResolvedValueOnce({ material, duplicate: true });
    const { POST } = await import("../src/app/api/materials/route");

    const created = await POST(upload(new File([longText], "notes.txt", { type: "text/plain" })));
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ material, duplicate: false });
    const [ownerId, prepared] = state.insertMaterial.mock.calls[0];
    expect(ownerId).toBe("u1");
    expect(prepared.chunks.length).toBeGreaterThan(0);

    const duplicate = await POST(upload(new File([longText], "notes.txt", { type: "text/plain" })));
    expect(duplicate.status).toBe(200);
  });

  it("rejects bad uploads with safe codes before storing", async () => {
    const { POST } = await import("../src/app/api/materials/route");
    const unsupported = await POST(upload(new File(["x"], "archive.zip", { type: "application/zip" })));
    expect(unsupported.status).toBe(415);
    expect((await unsupported.json()).code).toBe("unsupported_type");

    const missing = await POST(upload(null));
    expect(missing.status).toBe(400);

    const oversized = await POST(upload(new File(["x"], "a.txt"), { headers: { "content-length": String(20 * 1024 * 1024) } }));
    expect(oversized.status).toBe(413);

    state.countMaterials.mockResolvedValue(50);
    const quota = await POST(upload(new File([longText], "notes.txt")));
    expect(quota.status).toBe(409);
    expect((await quota.json()).code).toBe("quota_exceeded");
    expect(state.insertMaterial).not.toHaveBeenCalled();
  });

  it("refuses to delete a material a course still uses", async () => {
    state.deleteMaterial.mockResolvedValue({ ok: false, reason: "in_use", courses: [{ id: "crs_1", title: "Entropy" }] });
    const { DELETE } = await import("../src/app/api/materials/[id]/route");
    const response = await DELETE(new Request("http://primoria.test/api/materials/lm_1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "lm_1" }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "material_in_use", courses: [{ id: "crs_1", title: "Entropy" }] });
    expect(state.deleteMaterial).toHaveBeenCalledWith("u1", "lm_1");
  });

  it("builds a course from owned materials through the normal outline + job pipeline", async () => {
    state.getMaterialsByIds.mockResolvedValue([materialRow("lm_b", { language: "zh" }), materialRow("lm_a", { language: "zh" })]);
    const graph = { graphId: "mat_0123456789abcdef", subject: "熵与信息", topics: [] };
    state.getOrCreateMaterialGraph.mockResolvedValue({ record: { graphId: graph.graphId, title: graph.subject, graph }, created: true });
    state.initializeCourseOutline.mockResolvedValue({ course: { id: "crs_1" }, firstLesson: { id: "lsn_1" }, summary: { id: "crs_1" } });
    state.enqueueLessonGenerationJob.mockResolvedValue({ job: { id: "ljob_1" } });

    const { POST } = await import("../src/app/api/materials/courses/route");
    const response = await POST(jsonRequest("http://primoria.test/api/materials/courses", { materialIds: ["lm_a", "lm_b", "lm_a"] }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ courseId: "crs_1", lessonId: "lsn_1", job: { id: "ljob_1" }, summary: { id: "crs_1" } });

    const graphInput = state.getOrCreateMaterialGraph.mock.calls[0][0];
    expect(graphInput.ownerId).toBe("u1");
    expect(graphInput.materials.map((m: { id: string }) => m.id)).toEqual(["lm_a", "lm_b"]);
    expect(graphInput.language).toBe("zh");
    expect(state.initializeCourseOutline).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "u1", generatedGraph: graph, language: "zh", summary: "基于你上传的资料《Title lm_a》《Title lm_b》生成的课程" }),
    );
    expect(state.enqueueLessonGenerationJob).toHaveBeenCalledWith({ ownerId: "u1", courseId: "crs_1", lessonId: "lsn_1" });
  });

  it("returns 404 for materials the learner does not own and 422 when no grounded graph results", async () => {
    const { POST } = await import("../src/app/api/materials/courses/route");
    state.getMaterialsByIds.mockResolvedValue([materialRow("lm_a")]);
    const notOwned = await POST(jsonRequest("http://primoria.test/api/materials/courses", { materialIds: ["lm_a", "lm_other"] }));
    expect(notOwned.status).toBe(404);

    state.getOrCreateMaterialGraph.mockResolvedValue(null);
    const ungrounded = await POST(jsonRequest("http://primoria.test/api/materials/courses", { materialIds: ["lm_a"] }));
    expect(ungrounded.status).toBe(422);
    expect((await ungrounded.json()).code).toBe("material_graph_failed");
    expect(state.initializeCourseOutline).not.toHaveBeenCalled();

    const invalid = await POST(jsonRequest("http://primoria.test/api/materials/courses", { materialIds: [] }));
    expect(invalid.status).toBe(400);
  });

  it("refuses share links for material courses", async () => {
    state.getCourse.mockResolvedValue({ id: "crs_1", graphId: "mat_0123456789abcdef", lessons: [] });
    const { upsertShare, CourseShareNotAllowedError } = await import("../src/lib/courses/share-store");
    await expect(upsertShare("crs_1", "u1")).rejects.toBeInstanceOf(CourseShareNotAllowedError);

    const { POST } = await import("../src/app/api/courses/[id]/share/route");
    const response = await POST(new Request("http://primoria.test/api/courses/crs_1/share", { method: "POST" }), {
      params: Promise.resolve({ id: "crs_1" }),
    });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("material_course_share_disabled");
  });
});
