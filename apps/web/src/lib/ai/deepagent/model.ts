import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { TutorProviderSettings } from "../types";

export function resolveProviderSettings(settings: TutorProviderSettings = {}) {
  const provider = settings.provider || process.env.AI_PROVIDER || "openai-compatible";
  const baseUrl =
    settings.baseUrl ||
    (provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL);
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

export function createTutorModel(settings: TutorProviderSettings = {}) {
  const { provider, baseUrl, apiKey, model } = resolveProviderSettings(settings);
  if (provider === "anthropic-compatible") {
    return new ChatAnthropic({
      model,
      apiKey,
      anthropicApiUrl: baseUrl?.replace(/\/$/, ""),
      temperature: 0.2,
      maxTokens: 4096,
      streaming: true,
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 4096,
    streaming: true,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}
