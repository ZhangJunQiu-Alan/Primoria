import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// AI provider credentials must come from ONE source. baseUrl, apiKey and model
// are read independently downstream (see deepagent/model.ts), so a stray shell
// `ANTHROPIC_API_KEY` combined with `.env.local`'s `ANTHROPIC_BASE_URL` would
// mix a real key with the wrong endpoint and 401. Treat these as a group: if
// `.env.local` defines ANY of them, `.env.local` wins for the WHOLE group.
const PROVIDER_KEY_PREFIXES = ["ANTHROPIC_", "OPENAI_"];
const PROVIDER_KEYS = new Set(["AI_PROVIDER"]);

function isProviderKey(key: string) {
  return PROVIDER_KEYS.has(key) || PROVIDER_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function loadLocalEnv() {
  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;

  const parsed: Array<{ key: string; value: string }> = [];
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key) continue;
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    parsed.push({ key, value });
  }

  // If .env.local touches the provider group, clear the whole group from the
  // outer environment first so credentials cannot be sourced half-and-half.
  if (parsed.some((entry) => isProviderKey(entry.key))) {
    for (const key of Object.keys(process.env)) {
      if (isProviderKey(key)) delete process.env[key];
    }
  }

  for (const { key, value } of parsed) {
    // Provider keys were just cleared, so they always take the .env.local value.
    // Everything else keeps the conventional "outer environment wins" behavior.
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}
