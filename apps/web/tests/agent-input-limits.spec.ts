import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AGENT_INPUT_MAX_ARRAY_ITEMS, exceedsAgentInputArrayLimit } from "@primoria/contracts/agent-input-limits";

const items = (n: number, value: unknown = 0) => Array.from({ length: n }, () => value);

describe("exceedsAgentInputArrayLimit", () => {
  it("allows inputs at the limit and rejects one element over it", () => {
    expect(exceedsAgentInputArrayLimit({ messages: items(AGENT_INPUT_MAX_ARRAY_ITEMS) })).toBe(false);
    expect(exceedsAgentInputArrayLimit({ messages: items(AGENT_INPUT_MAX_ARRAY_ITEMS + 1) })).toBe(true);
  });

  it("sums messages, tools, context, toolCalls, and content parts", () => {
    const quarter = AGENT_INPUT_MAX_ARRAY_ITEMS / 4;
    const input = {
      messages: [
        { role: "assistant", toolCalls: items(quarter - 1) },
        { role: "user", content: items(quarter - 1) },
      ],
      tools: items(quarter),
      context: items(quarter),
    };
    expect(exceedsAgentInputArrayLimit(input)).toBe(false);
    input.context.push(0);
    expect(exceedsAgentInputArrayLimit(input)).toBe(true);
  });

  it("ignores non-object bodies and string message content", () => {
    for (const body of [null, undefined, "x", 1, []]) expect(exceedsAgentInputArrayLimit(body)).toBe(false);
    expect(exceedsAgentInputArrayLimit({ messages: [{ role: "user", content: "x".repeat(AGENT_INPUT_MAX_ARRAY_ITEMS * 2) }] })).toBe(false);
  });
});

describe("agent input limit wiring", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("rejects oversized Tutor input before CopilotKit parses it", () => {
    const route = read("../src/app/api/copilotkit/route.ts");
    const post = route.slice(route.indexOf("export const POST"));
    expect(post.indexOf("exceedsAgentInputArrayLimit(json?.body)")).toBeGreaterThan(-1);
    expect(post.indexOf("exceedsAgentInputArrayLimit(json?.body)")).toBeLessThan(post.indexOf("handleRequest("));
  });

  it("rejects oversized Agent input before AG-UI parses it", () => {
    const server = read("../../agent/src/server.mjs");
    expect(server.indexOf("exceedsAgentInputArrayLimit(input)")).toBeGreaterThan(-1);
    expect(server.indexOf("exceedsAgentInputArrayLimit(input)")).toBeLessThan(server.indexOf("RunAgentInputSchema.safeParse(input)"));
  });
});
