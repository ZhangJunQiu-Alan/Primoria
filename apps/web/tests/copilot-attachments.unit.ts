#!/usr/bin/env tsx

import { normalizeCopilotMessagesWithAttachments } from "../src/lib/agent-os/index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const visionSettings = {
  provider: "openai-compatible" as const,
  baseUrl: "http://localhost:1",
  apiKey: "test",
  model: "gpt-4o",
};

const textOnlySettings = {
  ...visionSettings,
  model: "text-only-small",
};

function dataSource(text: string, mimeType: string) {
  return {
    type: "data",
    value: Buffer.from(text, "utf8").toString("base64"),
    mimeType,
  };
}

async function main() {
  const textOnly = await normalizeCopilotMessagesWithAttachments(
    [{ id: "1", role: "user", content: "Explain entropy" }],
    visionSettings,
  );
  assert(textOnly.length === 1, "keeps text-only message");
  assert(textOnly[0].content === "Explain entropy", "preserves text-only content");

  const withDocument = await normalizeCopilotMessagesWithAttachments(
    [
      {
        id: "2",
        role: "user",
        content: [
          { type: "text", text: "Turn this into practice questions." },
          {
            type: "file",
            source: dataSource("# Notes\nEntropy worksheet", "text/markdown"),
            metadata: { filename: "notes.md" },
          },
        ],
      },
    ],
    visionSettings,
  );
  assert(Array.isArray(withDocument[0].content), "document message becomes content parts");
  const documentJson = JSON.stringify(withDocument[0].content);
  assert(documentJson.includes("Uploaded document context"), "document context is included");
  assert(documentJson.includes("notes.md"), "document filename is included");
  assert(documentJson.includes("Entropy worksheet"), "document text is included");

  const withImage = await normalizeCopilotMessagesWithAttachments(
    [
      {
        id: "3",
        role: "user",
        content: [
          { type: "text", text: "Explain this screenshot." },
          {
            type: "image",
            source: dataSource("fake-image", "image/png"),
            metadata: { filename: "screen.png" },
          },
        ],
      },
    ],
    visionSettings,
  );
  assert(Array.isArray(withImage[0].content), "image message becomes content parts");
  assert(JSON.stringify(withImage[0].content).includes('"image_url"'), "image_url part is included");

  await normalizeCopilotMessagesWithAttachments(
    [
      {
        id: "4",
        role: "user",
        content: [
          { type: "text", text: "Read this archive." },
          {
            type: "file",
            source: dataSource("bad", "application/zip"),
            metadata: { filename: "bad.zip" },
          },
        ],
      },
    ],
    visionSettings,
  )
    .then(() => {
      throw new Error("unsupported file should fail");
    })
    .catch((error) => {
      assert(/Unsupported attachment type/.test(String(error)), "unsupported type reports clear error");
    });

  await normalizeCopilotMessagesWithAttachments(
    [
      {
        id: "5",
        role: "user",
        content: [
          { type: "text", text: "Explain this image." },
          {
            type: "image",
            source: dataSource("fake-image", "image/png"),
            metadata: { filename: "screen.png" },
          },
        ],
      },
    ],
    textOnlySettings,
  )
    .then(() => {
      throw new Error("text-only image should fail");
    })
    .catch((error) => {
      assert(/vision-capable model/.test(String(error)), "vision limitation reports clear error");
    });

  process.stdout.write("[copilot-attachments.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[copilot-attachments.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
