#!/usr/bin/env tsx

import { buildImagePrompt, type ImageBrief } from "../src/lib/ai/media/image-brief.ts";
import { generateGeminiImage, resolveGeminiConfig } from "../src/lib/ai/media/gemini-image.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const BRIEF: ImageBrief = {
  conceptIds: ["c1"],
  learningGoal: "Recognize the chloroplast",
  imageKind: "structure_diagram",
  prompt: "A flat illustration of a chloroplast cross-section",
  alt: "Chloroplast",
  caption: "The stacked thylakoids sit in the stroma.",
  negativePrompt: "photorealism, clutter",
};

const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Mirrors the verified real response: the image part also carries a
// thoughtSignature, the inlineData part is NOT first, and a trailing text part
// follows — so the parser must .find the inline part.
function okResponse(): Response {
  const json = {
    candidates: [
      {
        content: {
          role: "model",
          parts: [
            { text: "Here is the illustration." },
            { inlineData: { mimeType: "image/jpeg", data: tinyPng }, thoughtSignature: "xxxx" },
          ],
        },
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      totalTokenCount: 1435,
      candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
    },
    modelVersion: "gemini-3.1-flash-image",
  };
  return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
}

function testPromptGuardsAgainstText() {
  const prompt = buildImagePrompt(BRIEF);
  assert(prompt.includes("A flat illustration of a chloroplast cross-section"), "prompt keeps the brief prompt");
  assert(/Do not render any text/i.test(prompt), "prompt forbids embedded text/labels");
  assert(prompt.includes("Avoid: photorealism, clutter."), "prompt folds in the negative prompt");
  assert(prompt.includes("Aspect ratio: 16:9."), "prompt includes aspect ratio hint");
}

function testConfigRequiresKey() {
  let threw = false;
  try {
    resolveGeminiConfig({ apiKey: undefined, model: "m" });
  } catch (e) {
    threw = true;
    assert(!(e as Error).message.includes("secret"), "config error does not leak secrets");
  }
  // Only assert the throw when the ambient env has no key.
  if (!process.env.GEMINI_API_KEY) assert(threw, "missing api key throws");
  const cfg = resolveGeminiConfig({ apiKey: "k", model: "custom-model" });
  assert(cfg.model === "custom-model" && cfg.apiKey === "k", "explicit opts win over env");
}

async function testSuccessfulParse() {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return okResponse();
  }) as unknown as typeof fetch;

  const result = await generateGeminiImage(BRIEF, { apiKey: "secret-key-123", model: "gemini-3.1-flash-image", fetchImpl });

  assert(result.dataBase64 === tinyPng, "extracts the inlineData part, not parts[0]");
  assert(result.mimeType === "image/jpeg", "uses the returned mime type");
  assert(result.model === "gemini-3.1-flash-image", "reports the model version from the response");
  assert(result.usage?.imageTokens === 1120, "captures image token usage");
  assert(result.usage?.totalTokens === 1435, "captures total token usage");
  assert(result.width === null && result.height === null, "dimensions are null (not returned by the API)");

  // Request shape.
  assert(capturedUrl.includes("gemini-3.1-flash-image:generateContent"), "calls the generateContent endpoint for the model");
  const headers = capturedInit?.headers as Record<string, string>;
  assert(headers["x-goog-api-key"] === "secret-key-123", "passes the key in the x-goog-api-key header");
  const body = JSON.parse(String(capturedInit?.body));
  assert(JSON.stringify(body.generationConfig.responseModalities) === JSON.stringify(["IMAGE"]), "requests IMAGE modality");
  assert(typeof body.contents[0].parts[0].text === "string" && body.contents[0].parts[0].text.includes("Do not render any text"), "sends the guarded prompt");
}

async function testHttpErrorDoesNotLeakKey() {
  const fetchImpl = (async () => new Response("quota exceeded for project", { status: 429, statusText: "Too Many Requests" })) as unknown as typeof fetch;
  let message = "";
  try {
    await generateGeminiImage(BRIEF, { apiKey: "secret-key-123", model: "m", fetchImpl });
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("429"), "surfaces the HTTP status");
  assert(!message.includes("secret-key-123"), "error never contains the api key");
}

async function testMissingImageThrows() {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "no image here" }] } }] }), { status: 200 })) as unknown as typeof fetch;
  let threw = false;
  try {
    await generateGeminiImage(BRIEF, { apiKey: "k", model: "m", fetchImpl });
  } catch {
    threw = true;
  }
  assert(threw, "a response with no inline image throws");
}

async function main() {
  testPromptGuardsAgainstText();
  testConfigRequiresKey();
  await testSuccessfulParse();
  await testHttpErrorDoesNotLeakKey();
  await testMissingImageThrows();
  process.stdout.write("[gemini-image.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
