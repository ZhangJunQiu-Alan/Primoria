#!/usr/bin/env tsx

import {
  applyAttachmentsToLatestUserMessage,
  buildAttachmentContext,
  modelSupportsVision,
  processAttachments,
} from "../src/lib/ai/attachments.ts";
import type { ChatAttachment } from "../src/lib/ai/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const settings = { provider: "openai-compatible" as const, baseUrl: "http://localhost:1", apiKey: "test", model: "gpt-4o" };

function textAttachment(name: string, text: string): ChatAttachment {
  return {
    id: name,
    name,
    type: "document",
    mimeType: name.endsWith(".md") ? "text/markdown" : "text/plain",
    size: Buffer.byteLength(text),
    base64Text: Buffer.from(text, "utf8").toString("base64"),
  };
}

async function main() {
  assert(modelSupportsVision(settings), "gpt-4o supports vision");
  assert(!modelSupportsVision({ ...settings, model: "text-only-small" }), "text-only model does not support vision");

  const processed = await processAttachments([textAttachment("notes.md", "# Notes\nEntropy example")], settings);
  assert(processed.length === 1 && processed[0].kind === "document", "processes markdown document");

  const context = buildAttachmentContext(processed);
  assert(context.includes("notes.md"), "context includes filename");
  assert(context.includes("Entropy example"), "context includes extracted text");

  const messages = applyAttachmentsToLatestUserMessage([{ role: "user", content: "Explain this" }], processed);
  assert(Array.isArray(messages[0].content), "latest user content becomes content parts");
  assert(JSON.stringify(messages[0].content).includes("Uploaded document context"), "content parts include document context");

  const unsupported: ChatAttachment = {
    id: "bad",
    name: "bad.zip",
    type: "document",
    mimeType: "application/zip",
    size: 12,
    base64Text: "ZmFrZQ==",
  };
  await processAttachments([unsupported], settings)
    .then(() => {
      throw new Error("unsupported file should fail");
    })
    .catch((error) => {
      assert(/Unsupported attachment type/.test(String(error)), "unsupported file reports clear error");
    });

  process.stdout.write("[attachments.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[attachments.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
