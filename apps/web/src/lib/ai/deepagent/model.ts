import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { TutorProviderSettings } from "../types";

function normalizeOpenAICompatibleBaseUrl(baseUrl?: string) {
  if (!baseUrl) return baseUrl;
  const trimmed = baseUrl.replace(/\/$/, "");
  return /\/v\d+(?:\/)?$/i.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

export function resolveProviderSettings(settings: TutorProviderSettings = {}) {
  const provider = settings.provider || process.env.AI_PROVIDER || "openai-compatible";
  const rawBaseUrl =
    settings.baseUrl ||
    (provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL);
  const baseUrl = provider === "openai-compatible" ? normalizeOpenAICompatibleBaseUrl(rawBaseUrl) : rawBaseUrl;
  const apiKey =
    settings.apiKey ||
    (provider === "anthropic-compatible" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY);
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
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens,
    streaming,
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
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}
