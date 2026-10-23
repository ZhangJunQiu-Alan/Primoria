import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), reserve: vi.fn(), complete: vi.fn(), fail: vi.fn(), configure: vi.fn() }));
vi.mock("@/lib/auth/guard", () => ({ requireConfiguredAuthUser: mocks.auth }));
vi.mock("@/lib/interactive/instance-store", () => ({ getInteractiveInstance: mocks.get, createInteractiveInstance: mocks.create, updateInteractiveInstance: mocks.update }));
vi.mock("@/lib/interactive/request-budget", () => ({ hashInteractiveRequest: (input: unknown) => JSON.stringify(input), reserveInteractiveRequest: mocks.reserve, completeInteractiveRequest: mocks.complete, failInteractiveRequest: mocks.fail }));
vi.mock("@/lib/interactive/configure", () => ({ configureComponent: mocks.configure }));
import { GET, POST, PATCH } from "../src/app/api/interactive-component/route";
const config = { lensType: "convex", focalLength: 10, objectDistance: 30, objectHeight: 8, showRays: true };
const request = { instanceId: "new", componentId: "physics.lens-imaging", prompt: "lens" };
const saved = { ...request, ownerId: "owner", configVersion: 1, config, revision: 1, requestHash: JSON.stringify({ componentId: request.componentId, prompt: request.prompt, targetInstanceId: null }) };
const req = (body: unknown, method = "POST") => new Request("http://localhost/api/interactive-component", { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ denied: null, user: { id: "owner" } });
  mocks.get.mockResolvedValue(null);
  mocks.reserve.mockResolvedValue({ kind: "execute", requestId: "reserved" });
  mocks.configure.mockResolvedValue({ ok: true, mode: "create", config, ms: 1 });
  mocks.create.mockResolvedValue(saved);
});
describe("authenticated durable interactive component API", () => {
  it("releases a failed configuration request so the same card can retry", async () => {
    mocks.configure.mockResolvedValue({ ok: false, error: "invalid config", ms: 2, modelCalls: [{ model: "fixture", status: 200, usage: null, responseId: null }] });
    const response = await POST(req(request));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, modelCalls: [{ model: "fixture" }] });
    expect(mocks.fail).toHaveBeenCalledWith("reserved", "owner");
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("checks auth before reading or writing configurations", async () => {
    mocks.auth.mockResolvedValue({ denied: new Response("unauthorized", { status: 401 }), user: null });
    expect((await GET(new Request("http://localhost/api/interactive-component?instanceId=x"))).status).toBe(401);
    expect((await POST(req(request))).status).toBe(401);
    expect((await PATCH(req({ instanceId: "new", revision: 1, config }, "PATCH"))).status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("reads only the authenticated owner's saved output without calling a model", async () => {
    mocks.get.mockResolvedValue(saved);
    const response = await GET(new Request("http://localhost/api/interactive-component?instanceId=new"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.get).toHaveBeenCalledWith("owner", "new");
    expect(mocks.configure).not.toHaveBeenCalled();
    expect(await response.json()).not.toHaveProperty("ownerId");
  });
  it("does not regenerate an instance after the short request cache expires", async () => {
    mocks.get.mockResolvedValue(saved);
    expect((await POST(req(request))).status).toBe(200);
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();
  });
  it("rejects reuse of an instance id with a changed request", async () => {
    mocks.get.mockResolvedValue(saved);
    expect((await POST(req({ ...request, prompt: "different" }))).status).toBe(409);
    expect(mocks.configure).not.toHaveBeenCalled();
  });
  it("rejects missing or differently typed adjustment targets instead of creating defaults", async () => {
    expect((await POST(req({ ...request, targetInstanceId: "other-owner-instance", current: config }))).status).toBe(404);
    expect(mocks.configure).not.toHaveBeenCalled();
    mocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...saved, componentId: "music.rhythm-pattern" });
    expect((await POST(req({ ...request, targetInstanceId: "wrong-type" }))).status).toBe(404);
  });
  it("uses the server-owned target config and persists the new result", async () => {
    mocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce(saved);
    mocks.create.mockImplementation(async (input: Record<string, unknown>) => ({ ...saved, ...input, revision: 1 }));
    const response = await POST(req({ ...request, targetInstanceId: "old", current: { focalLength: 999 } }));
    expect(response.status).toBe(200);
    expect(mocks.configure).toHaveBeenCalledWith("lens", expect.anything(), "adjust", { componentId: request.componentId, config }, expect.any(AbortSignal));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "owner", instanceId: "new", configVersion: 1 }));
    expect(mocks.complete).toHaveBeenCalled();
  });
  it("enforces optimistic revision updates", async () => {
    mocks.update.mockResolvedValue({ kind: "conflict" });
    expect((await PATCH(req({ instanceId: "new", revision: 1, config }, "PATCH"))).status).toBe(409);
    expect(mocks.update).toHaveBeenCalledWith("owner", "new", 1, config);
  });
  it("rejects invalid requests before reserving model capacity", async () => {
    expect((await POST(req({ ...request, extra: true }))).status).toBe(400);
    expect((await PATCH(req({ instanceId: "new", revision: -1, config }, "PATCH"))).status).toBe(400);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
});
