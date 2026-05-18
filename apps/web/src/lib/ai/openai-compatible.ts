type CompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CompletionChoice = {
  message?: {
    content?: string;
  };
};

type CompletionResponse = {
  choices?: CompletionChoice[];
  error?: {
    message?: string;
  };
};

export type OpenAICompatibleSettings = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

function isRetryableProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|socket|closed|timeout|502|503|504|network/i.test(message);
}

async function postCompletion(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<CompletionResponse & { status: number; ok: boolean }> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json().catch(() => ({}))) as CompletionResponse;
      const result = { ...json, status: response.status, ok: response.ok };

      if (response.ok || response.status < 500 || attempt === 2) return result;
      lastError = new Error(json.error?.message ?? `OpenAI-compatible request failed: ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    }

    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI-compatible request failed");
}

export async function createChatCompletion(messages: CompletionMessage[], settings: OpenAICompatibleSettings = {}) {
  const baseUrl = settings.baseUrl || process.env.OPENAI_BASE_URL;
  const apiKey = settings.apiKey || process.env.OPENAI_API_KEY;
  const model = settings.model || process.env.OPENAI_MODEL || "gpt-5.4";

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const resolvedBaseUrl = baseUrl;
  const resolvedApiKey = apiKey;

  async function requestWithModel(modelName: string) {
    const requestBody = {
      model: modelName,
      messages,
      temperature: 0.35,
      max_tokens: 4096,
    };

    let json: CompletionResponse & { status: number; ok: boolean };

    try {
      json = await postCompletion(resolvedBaseUrl, resolvedApiKey, {
        ...requestBody,
        response_format: { type: "json_object" },
      });
    } catch (error) {
      if (!isRetryableProviderError(error)) throw error;
      json = await postCompletion(resolvedBaseUrl, resolvedApiKey, requestBody);
    }

    // Some OpenAI-compatible routers implement json_object imperfectly. If their
    // validation rejects response_format, retry without it and rely on our system
    // prompt + parser. This keeps Primoria usable across compatible providers.
    if (!json.ok && /json|format|response_format/i.test(json.error?.message ?? "")) {
      json = await postCompletion(resolvedBaseUrl, resolvedApiKey, requestBody);
    }

    if (!json.ok) {
      throw new Error(json.error?.message ?? `OpenAI-compatible request failed: ${json.status}`);
    }

    return json;
  }

  let json: CompletionResponse;
  try {
    json = await requestWithModel(model);
  } catch (error) {
    if (settings.model || model === "gpt-5.4-mini" || !isRetryableProviderError(error)) throw error;
    json = await requestWithModel("gpt-5.4-mini");
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model returned an empty response");

  return content;
}
