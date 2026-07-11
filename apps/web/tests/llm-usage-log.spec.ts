import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTutorModel } from "../src/lib/ai/deepagent/model";

// Pins the prompt-cache observability path end-to-end: a real ChatOpenAI
// streaming call against a local DeepSeek-shaped SSE endpoint must emit one
// "llm usage" log line with cacheReadTokens extracted from the usage chunk.

let server: Server;
let baseUrl: string;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  server = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const chunk = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
      res.write(chunk({ id: "1", object: "chat.completion.chunk", created: 0, model: "deepseek-chat", choices: [{ index: 0, delta: { role: "assistant", content: "ok" }, finish_reason: null }] }));
      res.write(chunk({ id: "1", object: "chat.completion.chunk", created: 0, model: "deepseek-chat", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }));
      res.write(chunk({
        id: "1", object: "chat.completion.chunk", created: 0, model: "deepseek-chat", choices: [],
        usage: {
          prompt_tokens: 100, completion_tokens: 1, total_tokens: 101,
          prompt_cache_hit_tokens: 64, prompt_cache_miss_tokens: 36,
          prompt_tokens_details: { cached_tokens: 64 },
        },
      }));
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/v1`;
  // Provider credentials come from env only (no BYOK); point them at the fake server.
  for (const key of ["AI_PROVIDER", "OPENAI_BASE_URL", "OPENAI_API_KEY"]) savedEnv[key] = process.env[key];
  process.env.AI_PROVIDER = "openai-compatible";
  process.env.OPENAI_BASE_URL = baseUrl;
  process.env.OPENAI_API_KEY = "fake";
});

afterAll(() => {
  server.close();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("llm usage logging", () => {
  it("emits one usage line with cache-read tokens from a streaming response", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => { lines.push(args.map(String).join(" ")); };
    try {
      const model = createTutorModel({ model: "deepseek-chat" });
      const result = await model.invoke([{ role: "user", content: "hi" }]);
      expect(String(result.content)).toBe("ok");
    } finally {
      console.log = original;
    }

    const usageLine = lines.find((line) => line.includes('"llm usage"'));
    expect(usageLine, `usage line missing in: ${JSON.stringify(lines)}`).toBeDefined();
    const parsed = JSON.parse(usageLine!) as Record<string, unknown>;
    expect(parsed.source).toBe("tutor-model");
    expect(parsed.inputTokens).toBe(100);
    expect(parsed.outputTokens).toBe(1);
    expect(parsed.cacheReadTokens).toBe(64);
  });
});
