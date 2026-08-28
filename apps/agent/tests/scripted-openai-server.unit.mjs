import assert from "node:assert/strict";
import { once } from "node:events";
import { connect } from "node:net";
import { test } from "node:test";
import { startScriptedOpenAIServer } from "./helpers/scripted-openai-server.mjs";

test("scripted model teardown closes unfinished client connections", { timeout: 5_000 }, async () => {
  const server = await startScriptedOpenAIServer();
  const url = new URL(server.baseUrl);
  const socket = connect({ host: url.hostname, port: Number(url.port) });
  try {
    await once(socket, "connect");
    const closed = once(socket, "close");
    await server.close();
    await closed;
    assert.equal(socket.destroyed, true);
  } finally {
    socket.destroy();
    await server.close();
  }
});
