import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";

function probe(source: string) {
  execFileSync(process.execPath, ["-e", `
    const assert = require("node:assert/strict");
    const { createRequire } = require("node:module");
    const runtimeRequire = createRequire(require.resolve("@copilotkit/runtime"));
    const scalars = runtimeRequire("graphql-scalars");
    ${source}
  `], { encoding: "utf8", timeout: 5_000, stdio: ["ignore", "pipe", "pipe"] });
}

describe("CopilotKit scalar dependency compatibility", () => {
  it("preserves the runtime JSON scalars and TypeGraphQL ISO date scalar", () => {
    probe(`
      const payload = { messages: [{ role: "user", content: "hello" }], state: { step: 1 } };
      assert.deepEqual(scalars.GraphQLJSON.parseValue(payload), payload);
      assert.deepEqual(scalars.GraphQLJSONObject.parseValue(payload), payload);
      assert.deepEqual(scalars.GraphQLJSONObject.serialize(payload), payload);
      const { GraphQLISODateTime } = runtimeRequire("type-graphql");
      const timestamp = "2026-10-29T00:00:00.000Z";
      assert.equal(GraphQLISODateTime.serialize(new Date(timestamp)), timestamp);
    `);
  });

  it("rejects an adversarial phone number within a bounded child process", () => {
    probe(`
      assert.equal(scalars.GraphQLPhoneNumber.parseValue("+41791234567"), "+41791234567");
      assert.throws(() => scalars.GraphQLPhoneNumber.parseValue("1".repeat(40) + "x"));
    `);
  });
});
