import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { CallbackHandlerMethods } from "@langchain/core/callbacks/base";
import type { TutorProviderSettings } from "../types";

// One structured line per LLM call so prompt-cache hit rate is observable
// (DeepSeek reports prompt_cache_hit_tokens; OpenAI-style providers report
// prompt_tokens_details.cached_tokens; Anthropic reports cache_read). Every
// lookup is best-effort. Disable with PRIMORIA_LLM_USAGE_LOG=0.
export function llmUsageCallbacks(source: string): CallbackHandlerMethods[] {
  if (process.env.PRIMORIA_LLM_USAGE_LOG === "0") return [];
  return [
    {
      handleLLMEnd(output) {
        try {
          type LooseRecord = Record<string, any>;
          const message = (output as LooseRecord)?.generations?.[0]?.[0]?.message;
          const usage = message?.usage_metadata ?? {};
          const raw = message?.response_metadata?.usage ?? (output as LooseRecord)?.llmOutput?.tokenUsage ?? {};
          console.log(
            JSON.stringify({
              ts: new Date().toISOString(),
              message: "llm usage",
              source,
              model: message?.response_metadata?.model_name ?? message?.response_metadata?.model ?? null,
              inputTokens: usage.input_tokens ?? raw.prompt_tokens ?? raw.promptTokens ?? null,
              outputTokens: usage.output_tokens ?? raw.completion_tokens ?? raw.completionTokens ?? null,
              cacheReadTokens:
                usage.input_token_details?.cache_read ??
                raw.prompt_cache_hit_tokens ??
                raw.prompt_tokens_details?.cached_tokens ??
                null,
              cacheWriteTokens: usage.input_token_details?.cache_creation ?? null,
            }),
          );
        } catch {
          // observability must never break the call
        }
      },
    },
  ];
}

function normalizeOpenAICompatibleBaseUrl(baseUrl?: string) {
  if (!baseUrl) return baseUrl;
  const trimmed = baseUrl.replace(/\/$/, "");
  return /\/v\d+(?:\/)?$/i.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

export function resolveProviderSettings(settings: TutorProviderSettings = {}) {
  const provider = process.env.AI_PROVIDER || "openai-compatible";
  const rawBaseUrl =
    provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL;
  const baseUrl = provider === "openai-compatible" ? normalizeOpenAICompatibleBaseUrl(rawBaseUrl) : rawBaseUrl;
  const apiKey =
    provider === "anthropic-compatible" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
  const model =
    settings.model ||
    (provider === "anthropic-compatible" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL) ||
    (provider === "anthropic-compatible" ? "claude-3-5-sonnet-latest" : "gpt-5.4");

  if (!apiKey) throw new Error(`Missing ${provider === "anthropic-compatible" ? "ANTHROPIC" : "OPENAI"}_API_KEY`);
  if (provider === "openai-compatible" && !baseUrl) throw new Error("Missing OPENAI_BASE_URL");

  return { provider, baseUrl, apiKey, model };
}

// Model tiering: cheap/fast structured tasks (planning, quiz/summary/activation
// batches, outline enrichment) may run on AI_MODEL_FAST while quality-sensitive
// work stays on the default model. Returns the settings unchanged when the caller
// already pinned a model or AI_MODEL_FAST is unset — so the default (no env) is a
// pure no-op and disabling the tier is a one-line env removal.
export function fastTierSettings(settings: TutorProviderSettings = {}): TutorProviderSettings {
  if (settings.model) return settings;
  const fast = process.env.AI_MODEL_FAST?.trim();
  return fast ? { ...settings, model: fast } : settings;
}

export function createTutorModel(
  settings: TutorProviderSettings = {},
  options: { streaming?: boolean; maxTokens?: number } = {},
) {
  const { provider, baseUrl, apiKey, model } = resolveProviderSettings(settings);
  const streaming = options.streaming ?? true;
  const maxTokens = options.maxTokens ?? 16384;
  if (provider === "anthropic-compatible") {
    return new ChatAnthropic({
      model,
      apiKey,
      anthropicApiUrl: baseUrl?.replace(/\/$/, ""),
      temperature: 0.2,
      maxTokens,
      streaming,
      callbacks: llmUsageCallbacks("tutor-model"),
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens,
    streaming,
    callbacks: llmUsageCallbacks("tutor-model"),
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}

// Lightweight, deterministic, non-streaming model for one-shot utility calls
// (e.g. cold-start KG routing). Temperature 0 keeps decisions reproducible. Runs
// on the fast tier: these calls have a small token budget, so a heavy reasoning
// model could spend it all on reasoning and return empty output.
export function createUtilityModel(
  settings: TutorProviderSettings = {},
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
) {
  const { provider, baseUrl, apiKey, model } = resolveProviderSettings(fastTierSettings(settings));
  const temperature = options.temperature ?? 0;
  const maxTokens = options.maxTokens ?? 512;
  const timeout = options.timeoutMs ?? 12_000;
  if (provider === "anthropic-compatible") {
    return new ChatAnthropic({
      model,
      apiKey,
      anthropicApiUrl: baseUrl?.replace(/\/$/, ""),
      temperature,
      maxTokens,
      streaming: false,
      maxRetries: 1,
      callbacks: llmUsageCallbacks("utility-model"),
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature,
    maxTokens,
    streaming: false,
    maxRetries: 1,
    timeout,
    callbacks: llmUsageCallbacks("utility-model"),
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}
