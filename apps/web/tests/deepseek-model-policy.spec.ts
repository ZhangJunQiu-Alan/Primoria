import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTutorModel, createUtilityModel, fastTierSettings } from "../src/lib/ai/deepagent/model";

let server: Server;
let baseUrl: string;
const requests: Record<string, unknown>[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const request = JSON.parse(body);
      requests.push(request);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        id: "policy-test", object: "chat.completion", created: 0, model: request.model,
        choices: [{ index: 0, message: { role: "assistant", content: '{"route":"library"}' }, finish_reason: "stop" }],
        usage: { prompt_tokens: 8, completion_tokens: 5, total_tokens: 13 },
      }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing model test server address");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  requests.length = 0;
  vi.stubEnv("AI_PROVIDER", "openai-compatible");
  vi.stubEnv("OPENAI_BASE_URL", baseUrl);
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_MODEL", "deepseek-v4-pro");
  vi.stubEnv("AI_MODEL_FAST", "deepseek-flash");
  vi.stubEnv("PRIMORIA_LLM_USAGE_LOG", "0");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("DeepSeek request policy", () => {
  it("returns usable routing content with the 512-token non-thinking budget", async () => {
    const response = await createUtilityModel().invoke("Return a JSON route.");
    expect(JSON.parse(String(response.content))).toEqual({ route: "library" });
    expect(requests[0]).toMatchObject({
      model: "deepseek-flash", max_tokens: 512, stream: false, thinking: { type: "disabled" },
    });
    expect(requests[0]).not.toHaveProperty("reasoning_effort");
  });

  it("uses low thinking for fast-tier structured generation", async () => {
    await createTutorModel(fastTierSettings(), { streaming: false }).invoke("Plan a lesson.");
    expect(requests[0]).toMatchObject({
      model: "deepseek-flash", thinking: { type: "enabled" }, reasoning_effort: "low",
    });
  });

  it("keeps course generation on Pro with its existing thinking defaults", async () => {
    await createTutorModel({}, { streaming: false }).invoke("Explain a concept.");
    expect(requests[0].model).toBe("deepseek-v4-pro");
    expect(requests[0]).not.toHaveProperty("thinking");
    expect(requests[0]).not.toHaveProperty("reasoning_effort");
  });

  it("does not send DeepSeek fields to another OpenAI-compatible model", async () => {
    await createUtilityModel({ model: "gpt-5.4" }).invoke("Choose a route.");
    expect(requests[0].model).toBe("gpt-5.4");
    expect(requests[0]).not.toHaveProperty("thinking");
    expect(requests[0]).not.toHaveProperty("reasoning_effort");
  });

  it("preserves an explicitly selected quality model over the fast tier", async () => {
    await createTutorModel(fastTierSettings({ model: "deepseek-v4-pro" }), { streaming: false }).invoke("Compare sources.");
    expect(requests[0].model).toBe("deepseek-v4-pro");
    expect(requests[0]).not.toHaveProperty("reasoning_effort");
  });
});
