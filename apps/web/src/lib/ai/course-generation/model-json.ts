import type { z } from "zod";
import type { TutorProviderSettings } from "../types";
import { createTutorModel, resolveProviderSettings } from "../deepagent/model";

// Generic structured-JSON invocation for the lesson pipeline. Mirrors the
// provider handling in deepagent/course-generator.ts (structured output with a
// JSON-prompt fallback, plus a raw Anthropic path for providers that reject
// withStructuredOutput) but is generic over the system prompt and returns the
// untrusted parsed value for the caller's own Zod validation.

type ProviderSettings = ReturnType<typeof resolveProviderSettings>;

function shouldSkipStructuredOutput(settings: ProviderSettings): boolean {
  return settings.provider === "anthropic-compatible" && /minimax/i.test(settings.model);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text: unknown }).text);
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function* extractBalancedJson(text: string): Generator<string> {
  const opens = "{[";
  const closes = "}]";
  for (let i = 0; i < text.length; i += 1) {
    if (!opens.includes(text[i])) continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j += 1) {
      const ch = text[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (opens.includes(ch)) depth += 1;
      else if (closes.includes(ch)) {
        depth -= 1;
        if (depth === 0) {
          yield text.slice(i, j + 1);
          break;
        }
      }
    }
  }
}

/** Best-effort extraction of one JSON value from model text: raw, fenced, or a
 * balanced brace/bracket span. Throws if nothing parses. */
export function parseJsonValue(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [];
  const push = (value?: string) => {
    const v = String(value ?? "").trim();
    if (v && !candidates.includes(v)) candidates.push(v);
  };
  push(trimmed);
  for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) push(match[1]);
  for (const candidate of extractBalancedJson(trimmed)) push(candidate);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // try next candidate
    }
  }
  throw new Error(`model did not return valid JSON. Preview: ${trimmed.replace(/\s+/g, " ").slice(0, 200)}`);
}

async function rawAnthropicJson(settings: ProviderSettings, system: string, user: string): Promise<string> {
  if (!settings.baseUrl) throw new Error("Missing ANTHROPIC_BASE_URL");
  if (!settings.apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 8192,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(json.error?.message ?? `model request failed: ${response.status}`);
    const out = (json.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (!out) throw new Error("model returned no text content");
    return out;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Invoke the model and return parsed JSON (untrusted — caller validates).
 * When `schema` is provided and the provider supports it, native structured
 * output is attempted first; otherwise (or on failure) a JSON-prompt fallback
 * runs and the text is extracted with {@link parseJsonValue}.
 */
export async function invokeJson(args: {
  system: string;
  user: string;
  settings?: TutorProviderSettings;
  schema?: z.ZodTypeAny;
  schemaName?: string;
  timeoutMs?: number;
}): Promise<unknown> {
  const { system, user, schema, schemaName = "result", timeoutMs = 90_000 } = args;
  const settings = resolveProviderSettings(args.settings ?? {});
  const model = createTutorModel(args.settings ?? {});

  if (shouldSkipStructuredOutput(settings)) {
    return parseJsonValue(await rawAnthropicJson(settings, system, user));
  }

  if (schema) {
    try {
      const structured = model.withStructuredOutput(schema, { name: schemaName });
      return await withTimeout(
        structured.invoke([
          { role: "system", content: system },
          { role: "user", content: user },
        ]),
        timeoutMs,
        `${schemaName} structured output timed out`,
      );
    } catch {
      // fall through to JSON-prompt mode
    }
  }

  const result = await withTimeout(
    model.invoke([
      { role: "system", content: system },
      { role: "user", content: user },
    ]),
    timeoutMs,
    `${schemaName} JSON generation timed out`,
  );
  return parseJsonValue(messageContentToString(result.content));
}
