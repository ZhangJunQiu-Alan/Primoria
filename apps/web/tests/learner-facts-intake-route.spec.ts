import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requireConfiguredAuthUser: vi.fn(),
  enqueueProfileFactIntakeJob: vi.fn(),
  getProfileFactIntakeJob: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({
  requireConfiguredAuthUser: state.requireConfiguredAuthUser,
}));

vi.mock("@/lib/learner-facts/intake-jobs", () => ({
  enqueueProfileFactIntakeJob: state.enqueueProfileFactIntakeJob,
  getProfileFactIntakeJob: state.getProfileFactIntakeJob,
  ProfileFactIntakeBusyError: class ProfileFactIntakeBusyError extends Error {},
}));

describe("learner facts intake API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.requireConfiguredAuthUser.mockResolvedValue({ denied: null, user: { id: "owner-1" } });
  });

  it("queues settings text and returns immediately", async () => {
    state.enqueueProfileFactIntakeJob.mockResolvedValue({
      kind: "queued",
      job: { id: "job-1", status: "queued" },
    });
    const { POST } = await import("../src/app/api/learner-facts/intake/route");
    const request = new Request("http://localhost/api/learner-facts/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "I am interested in algorithms" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ jobId: "job-1", status: "queued" });
    expect(state.enqueueProfileFactIntakeJob).toHaveBeenCalledWith({
      ownerId: "owner-1",
      sourceKind: "settings",
      sourceText: "I am interested in algorithms",
    });
  });

  it("reads status through the authenticated owner scope", async () => {
    state.getProfileFactIntakeJob.mockResolvedValue({
      id: "job-1",
      status: "completed",
      result: { added: 2, reinforced: 0, skipped: 1 },
    });
    const { GET } = await import("../src/app/api/learner-facts/intake/route");

    const response = await GET(new Request("http://localhost/api/learner-facts/intake?jobId=job-1"));

    expect(response.status).toBe(200);
    expect(state.getProfileFactIntakeJob).toHaveBeenCalledWith("owner-1", "job-1");
    expect(await response.json()).toMatchObject({ status: "completed", result: { added: 2, skipped: 1 } });
  });

  it("does not reveal a job outside the authenticated owner scope", async () => {
    state.getProfileFactIntakeJob.mockResolvedValue(null);
    const { GET } = await import("../src/app/api/learner-facts/intake/route");

    const response = await GET(new Request("http://localhost/api/learner-facts/intake?jobId=someone-elses-job"));

    expect(response.status).toBe(404);
    expect(state.getProfileFactIntakeJob).toHaveBeenCalledWith("owner-1", "someone-elses-job");
  });
});
