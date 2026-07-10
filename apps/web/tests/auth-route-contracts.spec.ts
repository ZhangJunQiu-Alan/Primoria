import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RAW_DRIVER_MESSAGE = 'relation "public.sessions" does not exist at 10.0.0.12';

const routeState = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOptionalAuthUser: vi.fn(),
  requireConfiguredAuthUser: vi.fn(),
  getDb: vi.fn(),
  getCourse: vi.fn(),
  markLessonProgress: vi.fn(),
  getProviderSettings: vi.fn(),
  saveProviderSettings: vi.fn(),
  recordLearningEvent: vi.fn(),
  enqueueLearningProgressJob: vi.fn(),
  enqueueExtractorJob: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({
  getOptionalAuthUser: routeState.getOptionalAuthUser,
  requireConfiguredAuthUser: routeState.requireConfiguredAuthUser,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: routeState.getCurrentUser,
  isAuthEnabled: () => true,
}));

vi.mock("@/lib/db/client", () => ({
  getDb: routeState.getDb,
  hasDatabaseUrl: () => true,
}));

vi.mock("@/lib/courses/store", () => ({
  getCourse: routeState.getCourse,
  markLessonProgress: routeState.markLessonProgress,
}));

vi.mock("@/lib/settings/user-settings", () => ({
  getProviderSettings: routeState.getProviderSettings,
  saveProviderSettings: routeState.saveProviderSettings,
}));

vi.mock("@/lib/learning-events/store", () => ({
  recordLearningEvent: routeState.recordLearningEvent,
}));

vi.mock("@/lib/courses/learning-progress-jobs", () => ({
  enqueueLearningProgressJob: routeState.enqueueLearningProgressJob,
}));

vi.mock("@/lib/courses/extractor-jobs", () => ({
  enqueueExtractorJob: routeState.enqueueExtractorJob,
}));

function unavailableResponse() {
  return Response.json(
    { error: "Authentication is temporarily unavailable.", code: "auth_unavailable" },
    { status: 503 },
  );
}

describe("representative auth route contracts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps /api/auth/me connection closure to a safe 503", async () => {
    routeState.getCurrentUser.mockRejectedValue(
      Object.assign(new Error(RAW_DRIVER_MESSAGE), { code: "CONNECTION_CLOSED" }),
    );
    const { GET } = await import("../src/app/api/auth/me/route");

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Authentication is temporarily unavailable.",
      code: "auth_unavailable",
    });
  });

  it("propagates optional-auth outages from provider settings", async () => {
    routeState.getOptionalAuthUser.mockResolvedValue({ denied: unavailableResponse(), user: null });
    const { GET } = await import("../src/app/api/settings/provider/route");

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "auth_unavailable" });
    expect(routeState.getProviderSettings).not.toHaveBeenCalled();
  });

  it("propagates required-auth outages from profile writes", async () => {
    routeState.requireConfiguredAuthUser.mockResolvedValue({ denied: unavailableResponse(), user: null });
    const { PATCH } = await import("../src/app/api/profile/route");

    const response = await PATCH(new Request("http://localhost/api/profile", { method: "PATCH" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "auth_unavailable" });
    expect(routeState.getDb).not.toHaveBeenCalled();
  });

  it("does not expose raw driver messages from quiz persistence", async () => {
    routeState.requireConfiguredAuthUser.mockResolvedValue({ denied: null, user: { id: "u1" } });
    routeState.getCourse.mockResolvedValue(null);
    routeState.getDb.mockReturnValue({
      insert: () => ({
        values: async () => {
          throw Object.assign(new Error(RAW_DRIVER_MESSAGE), { code: "42P01" });
        },
      }),
    });
    const { POST } = await import("../src/app/api/courses/[id]/quiz/route");
    const request = new Request("http://localhost/api/courses/c1/quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blockId: "b1", answers: [], score: 0, total: 1 }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "c1" }) });
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Failed to save quiz attempt.", code: "internal_error" });
    expect(JSON.stringify(body)).not.toContain("public.sessions");
    expect(JSON.stringify(body)).not.toContain("10.0.0.12");
  });
});
