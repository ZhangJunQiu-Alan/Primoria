#!/usr/bin/env tsx

import { GET } from "../src/app/api/workspaces/agent-runtime/health/route.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const ENV_KEYS = [
  "NODE_ENV",
  "PRIMORIA_WORKSPACE_OPERATOR_TOKEN",
  "PRIMORIA_WORKSPACE_DEEPAGENT",
  "PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE",
  "PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL",
  "PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL",
  "PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_NAME",
  "DATABASE_URL",
  "AI_PROVIDER",
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

type EnvKey = (typeof ENV_KEYS)[number];
type TestEnv = Partial<Record<EnvKey, string | undefined>>;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as TestEnv;

function applyEnv(env: TestEnv) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env) as Array<[EnvKey, string | undefined]>) {
    if (value !== undefined) process.env[key] = value;
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnv) as Array<[EnvKey, string | undefined]>) {
    if (value !== undefined) process.env[key] = value;
  }
}

async function requestHealth(headers: HeadersInit = {}) {
  return GET(new Request("http://primoria.test/api/workspaces/agent-runtime/health", { headers }));
}

async function main() {
  try {
    applyEnv({
      NODE_ENV: "production",
      PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret",
      PRIMORIA_WORKSPACE_DEEPAGENT: "1",
      PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
      DATABASE_URL: "postgres://secret-database-url",
      OPENAI_BASE_URL: "https://secret-provider.example/v1",
      OPENAI_API_KEY: "secret-openai-key",
    });

    const unauthorized = await requestHealth();
    assert(unauthorized.status === 401, "production health route rejects missing operator token");
    const unauthorizedBody = await unauthorized.json();
    assert(unauthorizedBody.ok === false && unauthorizedBody.error === "Unauthorized", "unauthorized health route response is explicit JSON");

    applyEnv({
      NODE_ENV: "production",
      PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret",
      PRIMORIA_WORKSPACE_DEEPAGENT: "1",
      PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "memory",
      DATABASE_URL: "postgres://secret-database-url",
      OPENAI_BASE_URL: "https://secret-provider.example/v1",
      OPENAI_API_KEY: "secret-openai-key",
      PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL: "1",
    });
    const misconfigured = await requestHealth({ authorization: "Bearer operator-secret" });
    assert(misconfigured.status === 503, "production health route returns 503 when enabled DeepAgent runtime is not ready");
    const misconfiguredBody = await misconfigured.json();
    assert(misconfiguredBody.ok === false, "misconfigured production health response marks ok false");
    assert(misconfiguredBody.runtimeMode === "deepagent", "misconfigured production health response reports DeepAgent mode");
    assert(misconfiguredBody.deepAgent?.ready === false, "misconfigured production health response marks DeepAgent not ready");
    assert(
      misconfiguredBody.deepAgent?.errors?.some((error: string) => error.includes("PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres")),
      "misconfigured production health response includes actionable postgres persistence error",
    );
    const misconfiguredJson = JSON.stringify(misconfiguredBody);
    assert(!misconfiguredJson.includes("operator-secret"), "health route does not expose operator token");
    assert(!misconfiguredJson.includes("secret-database-url"), "health route does not expose DATABASE_URL");
    assert(!misconfiguredJson.includes("secret-openai-key"), "health route does not expose provider API key");

    applyEnv({
      NODE_ENV: "production",
      PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret",
      PRIMORIA_WORKSPACE_DEEPAGENT: "1",
      PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
      DATABASE_URL: "postgres://secret-database-url",
      OPENAI_BASE_URL: "https://secret-provider.example/v1",
      OPENAI_API_KEY: "secret-openai-key",
    });
    const ready = await requestHealth({ "x-primoria-operator-token": "operator-secret" });
    assert(ready.status === 200, "production health route returns 200 when DeepAgent runtime gate is ready");
    const readyBody = await ready.json();
    assert(readyBody.ok === true, "ready production health response marks ok true");
    assert(readyBody.runtimeMode === "deepagent", "ready production health response reports DeepAgent mode");
    assert(readyBody.deepAgent?.ready === true, "ready production health response marks DeepAgent ready");
    assert(readyBody.deepAgent?.persistenceMode === "postgres", "ready production health response reports postgres persistence");

    applyEnv({
      NODE_ENV: "production",
      PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret",
    });
    const placeholder = await requestHealth({ authorization: "Bearer operator-secret" });
    assert(placeholder.status === 200, "production health route returns 200 when placeholder runtime is intentionally active");
    const placeholderBody = await placeholder.json();
    assert(placeholderBody.ok === true, "placeholder production health response marks ok true");
    assert(placeholderBody.runtimeMode === "placeholder", "placeholder production health response reports placeholder mode");

    process.stdout.write("[workspace-agent-runtime-health-route.unit] ALL ROUTE HEALTH CHECKS PASSED\n");
  } finally {
    restoreEnv();
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    restoreEnv();
    process.stderr.write(`[workspace-agent-runtime-health-route.unit] FAILED: ${(error as Error).message}\n`);
    process.exit(1);
  });
