import type { z } from "zod";
import type { TutorProviderSettings } from "../types";
import { createTutorModel, resolveProviderSettings } from "../deepagent/model";

// Generic structured-JSON invocation for the lesson pipeline. Mirrors the
// provider handling in deepagent/course-generator.ts (structured output with a
// JSON-prompt fallback, plus a raw Anthropic path for providers that reject
// withStructuredOutput) but is generic over the system prompt and returns the
// untrusted parsed value for the caller's own Zod validation.

type ProviderSettings = ReturnType<typeof resolveProviderSettings>;

export type InvokeJsonArgs = {
  system: string;
  user: string;
  settings?: TutorProviderSettings;
  schema?: z.ZodTypeAny;
  schemaName?: string;
  /** Deadline for the WHOLE operation (structured attempt + fallback share it). */
  timeoutMs?: number;
  /** Caller cancellation; combined with the internal deadline. */
  signal?: AbortSignal;
};

export const MODEL_JSON_TIMEOUT_CODE = "model_json_timeout";

export class ModelJsonTimeoutError extends Error {
  readonly code = MODEL_JSON_TIMEOUT_CODE;
  constructor(message: string) {
    super(message);
    this.name = "ModelJsonTimeoutError";
  }
}

function shouldSkipStructuredOutput(settings: ProviderSettings): boolean {
  return settings.provider === "anthropic-compatible" && /minimax/i.test(settings.model);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new ModelJsonTimeoutError(message)), timeoutMs);
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
  let cleaned = text.trim();
  // Some models (e.g. MiniMax) emit a stray quote at the junction between two
  // block tuples after a visual block, producing `],"[` (or escaped `],\"[`)
  // where valid IR has `],[`. Only repair when the `[` opens the next tuple
  // (i.e. is followed by its integer order) so we never corrupt a legitimate
  // goal string that happens to start with `[`.
  cleaned = cleaned.replace(/\],(?:\\*)"(\s*)\[(?=\s*\d)/g, '],[');

  const candidates: string[] = [];
  const push = (value?: string) => {
    const v = String(value ?? "").trim();
    if (v && !candidates.includes(v)) candidates.push(v);
  };
  push(cleaned);
  for (const match of cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) push(match[1]);
  for (const candidate of extractBalancedJson(cleaned)) push(candidate);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // try next candidate
    }
  }
  throw new Error(`model did not return valid JSON. Preview: ${cleaned.replace(/\s+/g, " ").slice(0, 200)}`);
}

async function rawAnthropicJson(
  settings: ProviderSettings,
  system: string,
  user: string,
  signal: AbortSignal,
): Promise<string> {
  if (!settings.baseUrl) throw new Error("Missing ANTHROPIC_BASE_URL");
  if (!settings.apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal,
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
}

/**
 * Invoke the model and return parsed JSON (untrusted — caller validates).
 * When `schema` is provided and the provider supports it, native structured
 * output is attempted first; otherwise (or on failure) a JSON-prompt fallback
 * runs and the text is extracted with {@link parseJsonValue}.
 *
 * `timeoutMs` is a single deadline for the whole operation: the fallback only
 * gets whatever time the structured attempt left, and hitting the deadline
 * aborts the in-flight network request (LangChain signal / fetch signal).
 */
export async function invokeJson(args: InvokeJsonArgs): Promise<unknown> {
  const { system, user, schema, schemaName = "result", timeoutMs = 90_000 } = args;
  const settings = resolveProviderSettings(args.settings ?? {});
  const model = createTutorModel(args.settings ?? {});

  const deadlineAt = Date.now() + timeoutMs;
  const controller = new AbortController();
  const deadlineTimer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = args.signal ? AbortSignal.any([args.signal, controller.signal]) : controller.signal;
  const remainingMs = () => Math.max(deadlineAt - Date.now(), 0);
  // The underlying request's own abort rejection can win the race against
  // withTimeout, so deadline-abort errors are re-classified to keep the
  // timeout code stable. Caller aborts are propagated as-is.
  const attempt = async <T>(promise: Promise<T>, label: string): Promise<T> => {
    const message = `${schemaName} ${label} timed out`;
    try {
      return await withTimeout(promise, remainingMs(), message);
    } catch (error) {
      if (error instanceof ModelJsonTimeoutError) throw error;
      if (controller.signal.aborted && !args.signal?.aborted) throw new ModelJsonTimeoutError(message);
      throw error;
    }
  };
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  try {
    if (shouldSkipStructuredOutput(settings)) {
      return parseJsonValue(await attempt(rawAnthropicJson(settings, system, user, signal), "JSON generation"));
    }

    if (schema) {
      try {
        const structured = model.withStructuredOutput(schema, { name: schemaName });
        return await attempt(structured.invoke(messages, { signal }), "structured output");
      } catch (error) {
        if (error instanceof ModelJsonTimeoutError || args.signal?.aborted) throw error;
        // fall through to JSON-prompt mode with the remaining budget
      }
    }

    const result = await attempt(model.invoke(messages, { signal }), "JSON generation");
    return parseJsonValue(messageContentToString(result.content));
  } finally {
    clearTimeout(deadlineTimer);
  }
}
