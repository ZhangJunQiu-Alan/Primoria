import { describe, expect, it } from "vitest";

import {
  CHUNK_MAX_CHARS,
  chunkMaterial,
  detectMaterialLanguage,
  isHeadingLine,
  normalizeMaterialText,
  paragraphsFromWrappedLines,
  splitLongParagraph,
} from "../src/lib/materials/chunking";
import { MaterialInputError, prepareMaterial } from "../src/lib/materials/ingest";
import { materialFormatFor, materialTitleFromFileName } from "../src/lib/materials/limits";

const paragraph = (seed: string, length: number) => `${seed} `.repeat(Math.ceil(length / (seed.length + 1))).slice(0, length).trim() + ".";

describe("material text normalization", () => {
  it("drops pdf page markers, and bare page numbers only on paged text", () => {
    const text = "Intro line\n-- 1 of 3 --\n12\n\n\n\nNext paragraph";
    expect(normalizeMaterialText(text, { paged: true })).toBe("Intro line\n\nNext paragraph");
    expect(normalizeMaterialText(text)).toBe("Intro line\n12\n\nNext paragraph");
  });

  it("strips control characters and normalizes line endings", () => {
    expect(normalizeMaterialText("a\r\nb\u0007c d")).toBe("a\nbc d");
  });
});

describe("heading detection", () => {
  it.each([
    "# Limits",
    "## 2.1 Continuity",
    "第三章 函数的极限",
    "第2节 导数",
    "Chapter 4 Probability",
    "1.2 Vector spaces",
    "三、实验步骤",
  ])("treats %s as a heading", (line) => {
    expect(isHeadingLine(line)).toBe(true);
  });

  it.each([
    "1. Compute the derivative of x squared, then simplify.",
    "This is an ordinary sentence.",
    "A heading-like line\nthat spans two lines",
    "x".repeat(90),
  ])("does not treat %s as a heading", (line) => {
    expect(isHeadingLine(line)).toBe(false);
  });
});

describe("paragraphsFromWrappedLines (PDF pages)", () => {
  it("rebuilds paragraphs from hard-wrapped lines and isolates headings", () => {
    const page = [
      "第一章 向量",
      "向量是同时具有大小和方向的量，可以用有向线段表示。向量是同时具有大小和方向的量，可以用有向线段表",
      "示。",
      "Vectors can be added head to tail; the result is called the re-",
      "sultant vector of the two arrows that we drew on the plane.",
      "1.1 Addition",
      "Short closing line.",
    ].join("\n");
    expect(paragraphsFromWrappedLines(page)).toEqual([
      "第一章 向量",
      "向量是同时具有大小和方向的量，可以用有向线段表示。向量是同时具有大小和方向的量，可以用有向线段表示。",
      "Vectors can be added head to tail; the result is called the resultant vector of the two arrows that we drew on the plane.",
      "1.1 Addition",
      "Short closing line.",
    ]);
  });

  it("chunks a PDF page by its detected headings with page numbers", () => {
    const chunks = chunkMaterial([
      { text: `第一章 向量\n${"向量是有大小和方向的量。".repeat(8)}\n1.1 向量加法\n${"首尾相接得到和向量。".repeat(8)}`, page: 1 },
      { text: `第二章 矩阵\n${"矩阵是数表。".repeat(8)}\n-- 2 of 2 --`, page: 2 },
    ]);
    expect(chunks.map((chunk) => [chunk.heading, chunk.pageStart, chunk.pageEnd])).toEqual([
      ["第一章 向量", 1, 1],
      ["1.1 向量加法", 1, 1],
      ["第二章 矩阵", 2, 2],
    ]);
  });
});

describe("chunkMaterial", () => {
  it("starts a new chunk at each heading and keeps consecutive headings together", () => {
    const chunks = chunkMaterial([
      {
        text: [
          "Chapter 1 Basics",
          "1.1 Sets",
          paragraph("sets", 500),
          "1.2 Functions",
          paragraph("functions", 500),
        ].join("\n\n"),
        page: null,
      },
    ]);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].heading).toBe("1.1 Sets");
    expect(chunks[0].text.startsWith("Chapter 1 Basics\n\n1.1 Sets")).toBe(true);
    expect(chunks[1].heading).toBe("1.2 Functions");
    expect(chunks.map((chunk) => chunk.ordinal)).toEqual([0, 1]);
  });

  it("packs paragraphs to the target size and tracks page spans", () => {
    // 4 × ~300 chars: the first three pack into one chunk that crosses the page
    // break; the fourth would pass the 1200-char target and starts a new chunk.
    const chunks = chunkMaterial([
      { text: [paragraph("alpha", 300), paragraph("beta", 300)].join("\n\n"), page: 1 },
      { text: [paragraph("gamma", 300), paragraph("delta", 300)].join("\n\n"), page: 2 },
    ]);
    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) expect(chunk.charCount).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
    expect([chunks[0].pageStart, chunks[0].pageEnd]).toEqual([1, 2]);
    expect([chunks[1].pageStart, chunks[1].pageEnd]).toEqual([2, 2]);
    expect(chunks[1].text.startsWith("delta")).toBe(true);
  });

  it("splits an oversized paragraph at sentence boundaries under the cap", () => {
    const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} explains one idea in detail.`).join(" ");
    const pieces = splitLongParagraph(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) expect(piece.length).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
    expect(pieces.join(" ")).toBe(long);
    const chunks = chunkMaterial([{ text: long, page: null }]);
    for (const chunk of chunks) expect(chunk.charCount).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
  });

  it("returns no chunks for whitespace-only input", () => {
    expect(chunkMaterial([{ text: " \n\n \t", page: 1 }])).toEqual([]);
  });
});

describe("material language and file handling", () => {
  it("detects Chinese only when CJK text dominates", () => {
    expect(detectMaterialLanguage("线性代数研究向量空间和线性映射。矩阵是线性映射的表示。")).toBe("zh");
    expect(detectMaterialLanguage("Linear algebra studies vector spaces. The term 矩阵 means matrix.")).toBe("en");
  });

  it("prefers the extension over the browser MIME type", () => {
    expect(materialFormatFor("notes.md", "application/octet-stream")).toBe("markdown");
    expect(materialFormatFor("paper.PDF", "")).toBe("pdf");
    expect(materialFormatFor("unknown", "text/plain")).toBe("text");
    expect(materialFormatFor("archive.zip", "application/zip")).toBeNull();
    expect(materialTitleFromFileName("week_3_lecture notes.pdf")).toBe("week 3 lecture notes");
  });
});

describe("prepareMaterial", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  it("chunks a text upload and fingerprints its bytes", async () => {
    const text = `# Entropy\n\n${paragraph("entropy measures uncertainty", 900)}`;
    const prepared = await prepareMaterial({ fileName: "entropy.md", mimeType: "", bytes: bytes(text) });
    expect(prepared.format).toBe("markdown");
    expect(prepared.mimeType).toBe("text/markdown");
    expect(prepared.title).toBe("entropy");
    expect(prepared.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(prepared.chunks[0].heading).toBe("Entropy");
    expect(prepared.charCount).toBe(prepared.chunks.reduce((total, chunk) => total + chunk.charCount, 0));
    expect(prepared.language).toBe("en");
  });

  it("maps every rejection to a stable error code", async () => {
    const codeOf = async (input: Parameters<typeof prepareMaterial>[0], extract?: Parameters<typeof prepareMaterial>[1]) => {
      try {
        await prepareMaterial(input, extract);
        return "ok";
      } catch (error) {
        expect(error).toBeInstanceOf(MaterialInputError);
        return (error as MaterialInputError).code;
      }
    };
    expect(await codeOf({ fileName: "a.zip", mimeType: "application/zip", bytes: bytes("x") })).toBe("unsupported_type");
    expect(await codeOf({ fileName: "a.txt", mimeType: "text/plain", bytes: new Uint8Array() })).toBe("empty_file");
    expect(await codeOf({ fileName: "a.txt", mimeType: "text/plain", bytes: new Uint8Array(9 * 1024 * 1024) })).toBe("file_too_large");
    expect(await codeOf({ fileName: "a.txt", mimeType: "text/plain", bytes: bytes("too short") })).toBe("too_short");
    expect(
      await codeOf({ fileName: "scan.pdf", mimeType: "application/pdf", bytes: bytes("%PDF") }, async () => ({
        segments: [{ text: "  ", page: 1 }],
        pageCount: 1,
      })),
    ).toBe("no_text");
    expect(
      await codeOf({ fileName: "bad.pdf", mimeType: "application/pdf", bytes: bytes("%PDF") }, async () => {
        throw new Error("raw parser detail that must not leak");
      }),
    ).toBe("parse_failed");
    expect(
      await codeOf({ fileName: "huge.txt", mimeType: "text/plain", bytes: bytes("x") }, async () => ({
        segments: [{ text: paragraph("long", 410_000), page: null }],
        pageCount: null,
      })),
    ).toBe("too_long");
  });
});
