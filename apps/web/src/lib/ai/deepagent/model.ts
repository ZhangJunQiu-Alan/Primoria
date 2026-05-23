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

export function createTutorModel(settings: TutorProviderSettings = {}, options: { streaming?: boolean } = {}) {
  const { provider, baseUrl, apiKey, model } = resolveProviderSettings(settings);
  const streaming = options.streaming ?? true;
  if (provider === "anthropic-compatible") {
    return new ChatAnthropic({
      model,
      apiKey,
      anthropicApiUrl: baseUrl?.replace(/\/$/, ""),
      temperature: 0.2,
      maxTokens: 4096,
      streaming,
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 4096,
    streaming,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}
