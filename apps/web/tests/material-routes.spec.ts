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
  ensureUnsortedFolder: vi.fn(),
  getFolder: vi.fn(),
  createFolder: vi.fn(),
  listFolders: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  listFolderMaterials: vi.fn(),
  reorderFolder: vi.fn(),
  updateMaterialPlacement: vi.fn(),
  retryLectureKg: vi.fn(),
  loadFolderOverview: vi.fn(),
  startFolderQuiz: vi.fn(),
  submitFolderQuiz: vi.fn(),
  createFolderCourse: vi.fn(),
  syncFolderCourse: vi.fn(),
  loadFolderCourseState: vi.fn(),
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
vi.mock("../src/lib/materials/folders", async () => {
  const { FolderInputError } = await vi.importActual<typeof import("../src/lib/materials/folders")>("../src/lib/materials/folders");
  return {
    FolderInputError,
    ensureUnsortedFolder: state.ensureUnsortedFolder,
    getFolder: state.getFolder,
    createFolder: state.createFolder,
    listFolders: state.listFolders,
    renameFolder: state.renameFolder,
    deleteFolder: state.deleteFolder,
    listFolderMaterials: state.listFolderMaterials,
    reorderFolder: state.reorderFolder,
    updateMaterialPlacement: state.updateMaterialPlacement,
    retryLectureKg: state.retryLectureKg,
  };
});
vi.mock("../src/lib/materials/folder-overview", () => ({ loadFolderOverview: state.loadFolderOverview }));
vi.mock("../src/lib/materials/folder-quiz-store", async () => {
  const { FolderQuizError } = await vi.importActual<typeof import("../src/lib/materials/folder-quiz-store")>("../src/lib/materials/folder-quiz-store");
  return { FolderQuizError, startFolderQuiz: state.startFolderQuiz, submitFolderQuiz: state.submitFolderQuiz };
});
vi.mock("../src/lib/materials/folder-course", async () => {
  const { FolderCourseError } = await vi.importActual<typeof import("../src/lib/materials/folder-course")>("../src/lib/materials/folder-course");
  return {
    FolderCourseError,
    createFolderCourse: state.createFolderCourse,
    syncFolderCourse: state.syncFolderCourse,
    loadFolderCourseState: state.loadFolderCourseState,
  };
});
vi.mock("../src/lib/i18n/server", () => ({ resolveUiLanguageForUser: async () => "zh" }));
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
    state.ensureUnsortedFolder.mockResolvedValue({ id: "mf_inbox", kind: "unsorted" });
    state.getFolder.mockImplementation(async (ownerId: string, id: string) =>
      ownerId === "u1" && id === "mf_sec" ? { id, kind: "subject", name: "Information Security" } : null,
    );
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
    const [ownerId, prepared, placement] = state.insertMaterial.mock.calls[0];
    expect(ownerId).toBe("u1");
    expect(prepared.chunks.length).toBeGreaterThan(0);
    expect(placement).toEqual({ folderId: "mf_inbox", role: "lecture" });

    const duplicate = await POST(upload(new File([longText], "notes.txt", { type: "text/plain" })));
    expect(duplicate.status).toBe(200);
  });

  it("files an upload into the learner's own folder with the chosen role", async () => {
    state.insertMaterial.mockResolvedValue({ material: { id: "lm_1" }, duplicate: false });
    const { POST } = await import("../src/app/api/materials/route");
    const withFolder = (folderId: string, role?: string) => {
      const form = new FormData();
      form.append("file", new File([longText], "第3讲.txt", { type: "text/plain" }));
      form.append("folderId", folderId);
      if (role) form.append("role", role);
      return new Request("http://primoria.test/api/materials", { method: "POST", body: form });
    };

    expect((await POST(withFolder("mf_sec", "reference"))).status).toBe(201);
    expect(state.insertMaterial.mock.calls[0][2]).toEqual({ folderId: "mf_sec", role: "reference" });

    expect((await POST(withFolder("mf_someone_else"))).status).toBe(404);
    expect((await POST(withFolder("mf_sec", "homework"))).status).toBe(400);
    expect(state.insertMaterial).toHaveBeenCalledTimes(1);
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

  it("manages folders with safe error codes", async () => {
    const { FolderInputError } = await import("../src/lib/materials/folders");
    const folders = await import("../src/app/api/folders/route");
    const folder = await import("../src/app/api/folders/[id]/route");
    const order = await import("../src/app/api/folders/[id]/order/route");
    const params = { params: Promise.resolve({ id: "mf_sec" }) };

    state.createFolder.mockRejectedValueOnce(new FolderInputError("duplicate_name", "exists"));
    const duplicate = await folders.POST(jsonRequest("http://primoria.test/api/folders", { name: "Information Security" }));
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).code).toBe("duplicate_name");

    state.createFolder.mockResolvedValueOnce({ id: "mf_new", name: "H5+CSS3", kind: "subject" });
    expect((await folders.POST(jsonRequest("http://primoria.test/api/folders", { name: "H5+CSS3" }))).status).toBe(201);

    state.deleteFolder.mockRejectedValueOnce(new FolderInputError("unsorted_locked", "locked"));
    expect((await folder.DELETE(new Request("http://primoria.test/api/folders/mf_inbox", { method: "DELETE" }), params)).status).toBe(403);

    state.reorderFolder.mockRejectedValueOnce(new FolderInputError("order_mismatch", "mismatch"));
    const mismatch = await order.PUT(
      new Request("http://primoria.test/api/folders/mf_sec/order", { method: "PUT", body: JSON.stringify({ materialIds: ["lm_1"] }) }),
      params,
    );
    expect(mismatch.status).toBe(409);
    expect(state.reorderFolder).toHaveBeenCalledWith("u1", "mf_sec", ["lm_1"]);

    state.getFolder.mockResolvedValueOnce(null);
    expect((await folder.GET(new Request("http://primoria.test/api/folders/mf_x"), params)).status).toBe(404);
  });

  it("moves a material between the owner's folders", async () => {
    const { PATCH } = await import("../src/app/api/materials/[id]/route");
    const params = { params: Promise.resolve({ id: "lm_1" }) };
    const patch = (body: unknown) => new Request("http://primoria.test/api/materials/lm_1", { method: "PATCH", body: JSON.stringify(body) });

    state.updateMaterialPlacement.mockResolvedValueOnce({ id: "lm_1", folderId: "mf_sec", role: "lecture" });
    expect((await PATCH(patch({ folderId: "mf_sec" }), params)).status).toBe(200);
    expect(state.updateMaterialPlacement).toHaveBeenCalledWith("u1", "lm_1", { folderId: "mf_sec" });

    state.updateMaterialPlacement.mockResolvedValueOnce(null);
    expect((await PATCH(patch({ folderId: "mf_someone_else" }), params)).status).toBe(404);
    expect((await PATCH(patch({}), params)).status).toBe(400);
    expect((await PATCH(patch({ role: "homework" }), params)).status).toBe(400);
  });

  it("re-queues only a failed lecture KG and reads the folder graph overview", async () => {
    const kg = await import("../src/app/api/materials/[id]/kg/route");
    const graph = await import("../src/app/api/folders/[id]/graph/route");
    const materialParams = { params: Promise.resolve({ id: "lm_1" }) };
    const folderParams = { params: Promise.resolve({ id: "mf_sec" }) };

    state.retryLectureKg.mockResolvedValueOnce({ id: "lm_1", kgStatus: "pending" });
    const retried = await kg.POST(new Request("http://primoria.test/api/materials/lm_1/kg", { method: "POST" }), materialParams);
    expect(retried.status).toBe(200);
    expect((await retried.json()).material.kgStatus).toBe("pending");
    expect(state.retryLectureKg).toHaveBeenCalledWith("u1", "lm_1");

    state.retryLectureKg.mockResolvedValueOnce(null);
    const refused = await kg.POST(new Request("http://primoria.test/api/materials/lm_1/kg", { method: "POST" }), materialParams);
    expect(refused.status).toBe(409);
    expect((await refused.json()).code).toBe("not_retryable");

    state.retryLectureKg.mockRejectedValueOnce(new Error("relation does not exist"));
    const broken = await kg.POST(new Request("http://primoria.test/api/materials/lm_1/kg", { method: "POST" }), materialParams);
    expect(broken.status).toBe(503);
    expect(JSON.stringify(await broken.json())).not.toContain("relation");

    const overview = { graphId: "mat_0123456789abcdef", conceptCount: 1, lectures: [] };
    state.loadFolderOverview.mockResolvedValueOnce(overview);
    const read = await graph.GET(new Request("http://primoria.test/api/folders/mf_sec/graph"), folderParams);
    expect(read.status).toBe(200);
    expect((await read.json()).overview).toEqual(overview);
    expect(state.loadFolderOverview).toHaveBeenCalledWith("u1", "mf_sec", "zh");

    state.loadFolderOverview.mockResolvedValueOnce(null);
    expect((await graph.GET(new Request("http://primoria.test/api/folders/mf_x/graph"), folderParams)).status).toBe(404);
  });

  it("starts a folder quiz with a validated size and safe error codes", async () => {
    const { FolderQuizError } = await import("../src/lib/materials/folder-quiz-store");
    const { POST } = await import("../src/app/api/folders/[id]/quizzes/route");
    const params = { params: Promise.resolve({ id: "mf_sec" }) };
    const start = (body?: unknown) =>
      POST(new Request("http://primoria.test/api/folders/mf_sec/quizzes", { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), params);

    state.startFolderQuiz.mockResolvedValue({ sessionId: "fqs_1", size: 10, questions: [] });
    expect((await start()).status).toBe(201);
    expect(state.startFolderQuiz).toHaveBeenLastCalledWith({ ownerId: "u1", folderId: "mf_sec", size: 10 });
    expect((await start({ size: 20 })).status).toBe(201);
    expect(state.startFolderQuiz).toHaveBeenLastCalledWith({ ownerId: "u1", folderId: "mf_sec", size: 20 });
    expect((await start({ size: 15 })).status).toBe(400);

    state.startFolderQuiz.mockRejectedValueOnce(new FolderQuizError("no_graph", "none"));
    expect((await start({ size: 10 })).status).toBe(409);
    state.startFolderQuiz.mockRejectedValueOnce(new FolderQuizError("generation_failed", "none"));
    const failed = await start({ size: 10 });
    expect(failed.status).toBe(503);
    expect((await failed.json()).code).toBe("quiz_generation_failed");
    state.startFolderQuiz.mockRejectedValueOnce(new FolderQuizError("folder_not_found", "none"));
    expect((await start({ size: 10 })).status).toBe(404);
    state.startFolderQuiz.mockRejectedValueOnce(new Error("relation does not exist"));
    const broken = await start({ size: 10 });
    expect(broken.status).toBe(503);
    expect(JSON.stringify(await broken.json())).not.toContain("relation");
  });

  it("submits a folder quiz idempotently", async () => {
    const { FolderQuizError } = await import("../src/lib/materials/folder-quiz-store");
    const { POST } = await import("../src/app/api/folders/[id]/quizzes/[sessionId]/submit/route");
    const params = { params: Promise.resolve({ id: "mf_sec", sessionId: "fqs_1" }) };
    const submissionId = "6f1c1c2e-8c8a-4c1e-9b7e-3b8f2b0c9d11";
    const submit = (body: unknown) =>
      POST(new Request("http://primoria.test/api/folders/mf_sec/quizzes/fqs_1/submit", { method: "POST", body: JSON.stringify(body) }), params);
    const answers = [{ questionId: "fqq_1", selectedId: "b" }];

    state.submitFolderQuiz.mockResolvedValueOnce({ sessionId: "fqs_1", score: 1, total: 1, results: [], masteryChanges: [], replayed: true });
    const ok = await submit({ submissionId, answers });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ outcome: { sessionId: "fqs_1", score: 1, total: 1, results: [], masteryChanges: [] }, deduplicated: true });
    expect(state.submitFolderQuiz).toHaveBeenCalledWith({ ownerId: "u1", folderId: "mf_sec", sessionId: "fqs_1", submissionId, answers });

    expect((await submit({ submissionId: "not-a-uuid", answers })).status).toBe(400);
    expect((await submit({ submissionId, answers, score: 10 })).status).toBe(400);
    for (const [code, status] of [["session_not_found", 404], ["already_submitted", 409], ["idempotency_conflict", 409], ["invalid_answers", 400]] as const) {
      state.submitFolderQuiz.mockRejectedValueOnce(new FolderQuizError(code, "x"));
      const response = await submit({ submissionId, answers });
      expect(response.status).toBe(status);
      expect((await response.json()).code).toBe(code);
    }
  });

  it("builds, reads, and syncs the folder course", async () => {
    const { FolderCourseError } = await import("../src/lib/materials/folder-course");
    const course = await import("../src/app/api/folders/[id]/course/route");
    const sync = await import("../src/app/api/folders/[id]/course/sync/route");
    const params = { params: Promise.resolve({ id: "mf_sec" }) };
    const req = (method: string, path = "") => new Request(`http://primoria.test/api/folders/mf_sec/course${path}`, { method });

    state.createFolderCourse.mockResolvedValueOnce({ courseId: "crs_1", created: true });
    const created = await course.POST(req("POST"), params);
    expect(created.status).toBe(202);
    expect(await created.json()).toEqual({ courseId: "crs_1", created: true });
    expect(state.createFolderCourse).toHaveBeenCalledWith("u1", "mf_sec");
    state.createFolderCourse.mockResolvedValueOnce({ courseId: "crs_1", created: false });
    expect((await course.POST(req("POST"), params)).status).toBe(200);
    state.createFolderCourse.mockRejectedValueOnce(new FolderCourseError("no_graph", "none"));
    expect((await course.POST(req("POST"), params)).status).toBe(409);
    state.createFolderCourse.mockRejectedValueOnce(new Error("relation does not exist"));
    const broken = await course.POST(req("POST"), params);
    expect(broken.status).toBe(503);
    expect(JSON.stringify(await broken.json())).not.toContain("relation");

    state.loadFolderCourseState.mockResolvedValueOnce({ courseId: "crs_1", title: "S", lessonCount: 3, newConceptCount: 2 });
    expect(await (await course.GET(req("GET"), params)).json()).toEqual({ course: { courseId: "crs_1", title: "S", lessonCount: 3, newConceptCount: 2 } });
    state.loadFolderCourseState.mockResolvedValueOnce(null);
    expect(await (await course.GET(req("GET"), params)).json()).toEqual({ course: null });

    state.syncFolderCourse.mockResolvedValueOnce({ courseId: "crs_1", added: 2 });
    expect(await (await sync.POST(req("POST", "/sync"), params)).json()).toEqual({ courseId: "crs_1", added: 2 });
    state.syncFolderCourse.mockRejectedValueOnce(new FolderCourseError("no_course", "none"));
    expect((await sync.POST(req("POST", "/sync"), params)).status).toBe(404);
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
