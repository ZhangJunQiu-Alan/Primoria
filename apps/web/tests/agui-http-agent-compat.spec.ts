import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { afterAll, beforeAll, expect, it } from "vitest";

let server: Server;
let endpoint: string;
let receivedInput: Record<string, unknown> | null = null;

beforeAll(async () => {
  server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    receivedInput = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    response.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
    });
    for (const event of [
      { type: "RUN_STARTED", threadId: "thread-compat", runId: "run-compat" },
      { type: "TEXT_MESSAGE_START", messageId: "assistant-compat", role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "assistant-compat", delta: "compatible" },
      { type: "TEXT_MESSAGE_END", messageId: "assistant-compat" },
      { type: "RUN_FINISHED", threadId: "thread-compat", runId: "run-compat" },
    ]) {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  endpoint = `http://127.0.0.1:${address.port}/agent`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

it("keeps the CopilotKit LangGraphHttpAgent compatible with Primoria AG-UI SSE", async () => {
  const agent = new LangGraphHttpAgent({
    url: endpoint,
    agentId: "primoria_tutor",
    threadId: "thread-compat",
    initialMessages: [{ id: "user-compat", role: "user", content: "hello" }],
  });

  const result = await agent.runAgent({ runId: "run-compat" });

  expect(receivedInput).toMatchObject({
    threadId: "thread-compat",
    runId: "run-compat",
    messages: [{ id: "user-compat", role: "user", content: "hello" }],
  });
  expect(result.newMessages).toContainEqual({
    id: "assistant-compat",
    role: "assistant",
    content: "compatible",
  });
});
