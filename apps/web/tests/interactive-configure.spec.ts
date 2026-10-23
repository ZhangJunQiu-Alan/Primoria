import { beforeEach, describe, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/course-generation/model-json", () => ({ invokeJson: invoke }));
import { configureComponent } from "../src/lib/interactive/configure";
import { circuitLabComponent, DEFAULT_CIRCUIT_LAB_CONFIG } from "../src/lib/interactive/components/circuit-lab";

beforeEach(() => { invoke.mockReset(); });
describe("validated configuration recovery", () => {
  it("repairs a wrapped invalid response with schema feedback and one shared deadline", async () => {
    invoke.mockImplementationOnce(async () => { await new Promise((done) => setTimeout(done, 5)); return { config: DEFAULT_CIRCUIT_LAB_CONFIG }; });
    invoke.mockResolvedValueOnce({ ...DEFAULT_CIRCUIT_LAB_CONFIG, voltage: 12 });
    await expect(configureComponent("12V 电源", circuitLabComponent, "create", null)).resolves.toMatchObject({ ok: true, config: { voltage: 12 } });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[0][0]).toMatchObject({ utility: true, maxTokens: 4096 });
    expect(invoke.mock.calls[0][0].system).toContain(JSON.stringify(DEFAULT_CIRCUIT_LAB_CONFIG));
    expect(invoke.mock.calls[1][0].user).toContain("12V 电源");
    expect(invoke.mock.calls[1][0].user).toContain("未通过配置校验");
    expect(invoke.mock.calls[1][0].timeoutMs).toBeLessThan(invoke.mock.calls[0][0].timeoutMs);
  });
  it("retains the initial configuration when applying a corrected sparse patch", async () => {
    invoke.mockResolvedValueOnce({ switchClosed: "false" }).mockResolvedValueOnce({ switchClosed: false });
    const current = { componentId: circuitLabComponent.componentId, config: { ...DEFAULT_CIRCUIT_LAB_CONFIG, voltage: 9 } };
    await expect(configureComponent("断开开关，其他不变", circuitLabComponent, "adjust", current)).resolves.toMatchObject({ ok: true, patch: { switchClosed: false }, config: { ...current.config, switchClosed: false } });
  });
  it("rejects and repairs unknown fields rather than silently stripping them", async () => {
    invoke.mockResolvedValueOnce({ ...DEFAULT_CIRCUIT_LAB_CONFIG, unknownControl: "ignored" }).mockResolvedValueOnce(DEFAULT_CIRCUIT_LAB_CONFIG);
    await expect(configureComponent("演示电路", circuitLabComponent, "create", null)).resolves.toMatchObject({ ok: true, config: DEFAULT_CIRCUIT_LAB_CONFIG });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][0].user).toContain("unknownControl");
  });
  it("stops after one repair and exposes failed-call evidence instead of silently accepting defaults", async () => {
    invoke.mockImplementation(async (options) => { options.onModelCall({ model: "fixture", status: 200, usage: null, responseId: null }); return { voltage: 999 }; });
    const result = await configureComponent("演示电路", circuitLabComponent, "create", null);
    expect(result).toMatchObject({ ok: false, modelCalls: [{ model: "fixture" }, { model: "fixture" }] });
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
