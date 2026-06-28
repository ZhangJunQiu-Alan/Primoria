import { buildImagePrompt, type ImageBrief } from "./image-brief";
import type { GeneratedImage } from "./media-assets";

// Direct REST against Google's Generative Language API — no SDK dependency.
// Response contract verified against a real call (see project memory): the image
// lives in candidates[].content.parts[].inlineData; the parts array holds more
// than one element in an unspecified order, so we .find the inlineData part
// rather than assuming parts[0]. Default output mime is image/jpeg.
const DEFAULT_MODEL = "gemini-3.1-flash-image";

function endpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

export type GeminiImageOptions = {
  apiKey?: string;
  model?: string;
  /** Injectable for tests — defaults to global fetch. Tests must pass a mock; we
   * never hit the real API in unit tests. */
  fetchImpl?: typeof fetch;
};

export function resolveGeminiConfig(opts: GeminiImageOptions = {}): { apiKey: string; model: string } {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  const model = opts.model ?? process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_MODEL;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return { apiKey, model };
}

type InlinePart = { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mimeType?: string; mime_type?: string; data?: string } };

function extractInlineImage(json: unknown): { mimeType: string; data: string } | null {
  const candidates = (json as { candidates?: Array<{ content?: { parts?: InlinePart[] } }> })?.candidates;
  for (const candidate of candidates ?? []) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const inline = part?.inlineData ?? part?.inline_data;
      const data = inline?.data;
      if (typeof data === "string" && data.length > 0) {
        const mimeType = inline?.mimeType ?? (inline as { mime_type?: string })?.mime_type ?? "image/jpeg";
        return { mimeType, data };
      }
    }
  }
  return null;
}

function extractUsage(json: unknown): GeneratedImage["usage"] {
  const usage = (json as { usageMetadata?: { totalTokenCount?: number; candidatesTokensDetails?: Array<{ modality?: string; tokenCount?: number }> } })?.usageMetadata;
  if (!usage) return undefined;
  const imageTokens = usage.candidatesTokensDetails?.find((d) => d.modality === "IMAGE")?.tokenCount;
  return { totalTokens: usage.totalTokenCount, imageTokens };
}

async function safeErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    // Never echo request headers; the API key lives only in the header, not the
    // body, so the body is safe to surface (truncated).
    return text.slice(0, 300);
  } catch {
    return "";
  }
}

/** Calls Gemini and returns the raw generated image. No caching/persistence here
 * — that's media-assets. Throws on transport failure or a response with no image. */
export async function generateGeminiImage(brief: ImageBrief, opts: GeminiImageOptions = {}): Promise<GeneratedImage> {
  const { apiKey, model } = resolveGeminiConfig(opts);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const prompt = buildImagePrompt(brief);

  const res = await fetchImpl(endpoint(model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!res.ok) {
    const detail = await safeErrorDetail(res);
    throw new Error(`Gemini image request failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }

  const json = (await res.json()) as { modelVersion?: string };
  const image = extractInlineImage(json);
  if (!image) throw new Error("Gemini image response contained no inline image data");

  return {
    mimeType: image.mimeType,
    dataBase64: image.data,
    model: typeof json.modelVersion === "string" ? json.modelVersion : model,
    width: null,
    height: null,
    usage: extractUsage(json),
  };
}
