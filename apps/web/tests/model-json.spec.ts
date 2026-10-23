import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hardening handoff issue 5: invokeJson's timeoutMs is a single deadline for
// the whole operation. The JSON-prompt fallback only gets the time the
// structured attempt left, hitting the deadline aborts the in-flight request,
// and the MiniMax raw-Anthropic path obeys the caller's timeout instead of a
// hardcoded 180s.

const mockState = vi.hoisted(() => ({
  resolveProviderSettings: vi.fn(),
  createTutorModel: vi.fn(),
  createUtilityModel: vi.fn(),
}));

vi.mock("@/lib/ai/deepagent/model", () => ({
  resolveProviderSettings: mockState.resolveProviderSettings,
  createTutorModel: mockState.createTutorModel,
  createUtilityModel: mockState.createUtilityModel,
}));

type InvokeCall = { signal?: AbortSignal };

function hangUntilAbort(onCall?: (call: InvokeCall) => void) {
  return vi.fn(
    (_messages: unknown, options?: { signal?: AbortSignal }) =>
      new Promise((_, reject) => {
        onCall?.({ signal: options?.signal });
        options?.signal?.addEventListener("abort", () => reject(new Error("request aborted")), { once: true });
      }),
  );
}

function makeModel(overrides: { structuredInvoke?: ReturnType<typeof vi.fn>; invoke?: ReturnType<typeof vi.fn> }) {
  const structuredInvoke = overrides.structuredInvoke ?? vi.fn();
  const invoke = overrides.invoke ?? vi.fn();
  return {
    model: {
      withStructuredOutput: vi.fn(() => ({ invoke: structuredInvoke })),
      invoke,
    },
    structuredInvoke,
    invoke,
  };
}

const openAiSettings = { provider: "openai-compatible", model: "gpt-test", baseUrl: "https://x", apiKey: "k" };
const miniMaxSettings = {
  provider: "anthropic-compatible",
  model: "MiniMax-Text-01",
  baseUrl: "https://mm.example",
  apiKey: "k",
};

async function loadInvokeJson() {
  const mod = await import("../src/lib/ai/course-generation/model-json");
  return mod;
}

describe("invokeJson deadline contract", () => {
  it("uses the non-thinking utility factory without replacing an explicitly selected quality model", async () => {
    mockState.resolveProviderSettings.mockReturnValue({ ...openAiSettings, model: "quality-pro" });
    mockState.createUtilityModel.mockReturnValue({ invoke: vi.fn().mockResolvedValue({ content: '{"x":1}' }) });
    const { invokeJson } = await loadInvokeJson();
    await expect(invokeJson({ system: "s", user: "u", utility: true, settings: { model: "quality-pro" }, maxTokens: 2048, timeoutMs: 5000 })).resolves.toEqual({ x: 1 });
    expect(mockState.createUtilityModel).toHaveBeenCalledWith({ model: "quality-pro" }, { maxTokens: 2048, timeoutMs: 5000 });
    expect(mockState.createTutorModel).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockState.resolveProviderSettings.mockReturnValue(openAiSettings);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the structured result within the deadline", async () => {
    const { model } = makeModel({ structuredInvoke: vi.fn().mockResolvedValue({ items: [] }) });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson } = await loadInvokeJson();

    await expect(
      invokeJson({ system: "s", user: "u", schema: {} as never, timeoutMs: 1_000 }),
    ).resolves.toEqual({ items: [] });
  });

  it("passes a task-specific output limit to the model", async () => {
    const { model } = makeModel({ invoke: vi.fn().mockResolvedValue({ content: "{}" }) });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson } = await loadInvokeJson();

    await invokeJson({ system: "s", user: "u", maxTokens: 8192 });

    expect(mockState.createTutorModel).toHaveBeenCalledWith({}, { streaming: false, maxTokens: 8192 });
  });

  it("gives the fallback only the remaining budget, not a fresh timeout", async () => {
    // Structured attempt burns 600ms of a 1000ms budget, fallback hangs: the
    // whole call must fail at ~1000ms total, not 600ms + another 1000ms.
    const structuredInvoke = vi.fn(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("provider rejected")), 600)),
    );
    const invoke = hangUntilAbort();
    const { model } = makeModel({ structuredInvoke, invoke });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson, ModelJsonTimeoutError } = await loadInvokeJson();

    const pending = invokeJson({ system: "s", user: "u", schema: {} as never, timeoutMs: 1_000 });
    const outcome = pending.then(
      () => ({ settledAt: Date.now(), error: undefined }),
      (error: unknown) => ({ settledAt: Date.now(), error }),
    );
    const startedAt = Date.now();
    await vi.advanceTimersByTimeAsync(2_500);
    const { settledAt, error } = await outcome;

    expect(error).toBeInstanceOf(ModelJsonTimeoutError);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(settledAt - startedAt).toBeLessThanOrEqual(1_000);
  });

  it("aborts the in-flight request when the deadline hits", async () => {
    let seenSignal: AbortSignal | undefined;
    const invoke = hangUntilAbort((call) => {
      seenSignal = call.signal;
    });
    const { model } = makeModel({ invoke });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson, ModelJsonTimeoutError } = await loadInvokeJson();

    const pending = invokeJson({ system: "s", user: "u", timeoutMs: 1_000 });
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await outcome).toBeInstanceOf(ModelJsonTimeoutError);
    expect(seenSignal?.aborted).toBe(true);
  });

  it("propagates the caller's AbortSignal to the request", async () => {
    let seenSignal: AbortSignal | undefined;
    const invoke = hangUntilAbort((call) => {
      seenSignal = call.signal;
    });
    const { model } = makeModel({ invoke });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson } = await loadInvokeJson();

    const caller = new AbortController();
    const pending = invokeJson({ system: "s", user: "u", timeoutMs: 60_000, signal: caller.signal });
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );
    caller.abort();
    await vi.advanceTimersByTimeAsync(0);

    expect(await outcome).toBeInstanceOf(Error);
    expect(seenSignal?.aborted).toBe(true);
  });

  it("MiniMax raw path obeys the caller timeout instead of a hardcoded 180s", async () => {
    mockState.resolveProviderSettings.mockReturnValue(miniMaxSettings);
    const { model } = makeModel({});
    mockState.createTutorModel.mockReturnValue(model);
    let fetchSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          fetchSignal = init?.signal;
          init?.signal?.addEventListener("abort", () => reject(new Error("fetch aborted")), { once: true });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { invokeJson, ModelJsonTimeoutError } = await loadInvokeJson();

    const pending = invokeJson({ system: "s", user: "u", schema: {} as never, timeoutMs: 30_000 });
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(30_000);

    expect(await outcome).toBeInstanceOf(ModelJsonTimeoutError);
    expect(fetchSignal?.aborted).toBe(true);
    expect(model.withStructuredOutput).not.toHaveBeenCalled();
  });

  it("timeout errors carry a stable code for log aggregation", async () => {
    const { ModelJsonTimeoutError, MODEL_JSON_TIMEOUT_CODE } = await loadInvokeJson();
    const error = new ModelJsonTimeoutError("x timed out");
    expect(error.code).toBe(MODEL_JSON_TIMEOUT_CODE);
    expect(MODEL_JSON_TIMEOUT_CODE).toBe("model_json_timeout");
  });
  it("captures provider usage and response ids without exposing credentials", async () => {
    const { model } = makeModel({ structuredInvoke: vi.fn().mockResolvedValue({ parsed: { answer: 2 }, raw: { id: "response-1", usage_metadata: { input_tokens: 8, output_tokens: 4, total_tokens: 12 } } }) });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson } = await loadInvokeJson();
    const calls: unknown[] = [];
    expect(await invokeJson({ system: "s", user: "u", schema: {} as never, onModelCall: (call) => calls.push(call) })).toEqual({ answer: 2 });
    expect(calls).toEqual([{ model: "gpt-test", status: 200, responseId: "response-1", usage: { input_tokens: 8, output_tokens: 4, total_tokens: 12 } }]);
    expect(JSON.stringify(calls)).not.toContain("apiKey");
  });
  it("retains failed structured attempts when a JSON fallback succeeds", async () => {
    const { model } = makeModel({ structuredInvoke: vi.fn().mockRejectedValue(new Error("unsupported")), invoke: vi.fn().mockResolvedValue({ content: '{"answer":2}' }) });
    mockState.createTutorModel.mockReturnValue(model);
    const { invokeJson } = await loadInvokeJson();
    const calls: Array<{ status: number; usage: unknown }> = [];
    expect(await invokeJson({ system: "s", user: "u", schema: {} as never, onModelCall: (call) => calls.push(call) })).toEqual({ answer: 2 });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ status: 0, usage: null });
    expect(calls[1]).toMatchObject({ status: 200, usage: null });
  });
});
