import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

// One structured line per LLM call so prompt-cache hit rate is observable in
// dev/prod logs. Field names vary by provider; every lookup is best-effort.
// Disable with PRIMORIA_LLM_USAGE_LOG=0.
/** @param {string} source */
function usageLogCallbacks(source) {
  if (process.env.PRIMORIA_LLM_USAGE_LOG === "0") return [];
  return [
    {
      /** @param {any} output */
      handleLLMEnd(output) {
        try {
          const message = output?.generations?.[0]?.[0]?.message;
          const usage = message?.usage_metadata ?? {};
          const raw = message?.response_metadata?.usage ?? output?.llmOutput?.tokenUsage ?? {};
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

/**
 * @param {{ streaming?: boolean }} [options]
 */
export function createModel(options = {}) {
  const provider = process.env.AI_PROVIDER || "openai-compatible";
  const streaming = options.streaming ?? true;
  const baseUrl =
    provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL;
  const apiKey =
    provider === "anthropic-compatible" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
  const model =
    (provider === "anthropic-compatible" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL) ||
    (provider === "anthropic-compatible" ? "claude-3-5-sonnet-latest" : "gpt-5.4");
  if (!apiKey) throw new Error(`Missing ${provider === "anthropic-compatible" ? "ANTHROPIC" : "OPENAI"}_API_KEY`);

  if (provider === "anthropic-compatible") {
    return new ChatAnthropic({
      model,
      apiKey,
      anthropicApiUrl: baseUrl?.replace(/\/$/, ""),
      temperature: 0.2,
      maxTokens: streaming ? 24000 : 4096,
      streaming,
      callbacks: usageLogCallbacks("tutor-agent"),
      clientOptions: {
        timeout: 180_000,
        maxRetries: 1,
      },
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 24000,
    streaming,
    callbacks: usageLogCallbacks("tutor-agent"),
    configuration: { baseURL: baseUrl.replace(/\/$/, "") },
  });
}
