import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { extractPdfText } from "../src/lib/ai/document-text";
import { prepareMaterial } from "../src/lib/materials/ingest";
import { pdfWithText } from "./helpers/pdf";

const pages = [
  "Data preprocessing improves data quality. Handle missing values, duplicate records, noise, and inconsistent attributes before mining.",
  "Data normalization rescales numeric attributes. Data integration combines sources. Data reduction preserves useful information with less data.",
];

describe("real PDF extraction", () => {
  it("extracts an unlocked PDF with page numbers using the installed worker", async () => {
    const parsed = await extractPdfText(pdfWithText(pages));
    expect(parsed.pages).toHaveLength(2);
    for (const [i, text] of pages.entries()) {
      expect(parsed.pages[i]).toMatchObject({ num: i + 1, text: expect.stringContaining(text) });
      expect(parsed.text).toContain(text);
    }
  });

  it("prepares a PDF upload with its source page range", async () => {
    const prepared = await prepareMaterial({ fileName: "Lecture 02-Preprocessing.pdf", mimeType: "application/pdf", bytes: pdfWithText(pages) });
    expect(prepared.pageCount).toBe(2);
    expect(prepared.charCount).toBeGreaterThan(100);
    expect(prepared.chunks[0]).toMatchObject({ pageStart: 1, pageEnd: 2 });
    expect(prepared.chunks.map((chunk) => chunk.text).join("\n")).toContain(pages[1]);
  });

  it("loads the PDF worker from CommonJS without import.meta.resolve", () => {
    const output = execFileSync(process.execPath, ["--require", "tsx/cjs", "--eval", `
      const { readFileSync } = require("node:fs");
      const { extractPdfText } = require("./src/lib/ai/document-text.ts");
      extractPdfText(readFileSync(0)).then(result => {
        console.log(JSON.stringify(result.pages));
      }).catch(error => { console.error(error); process.exitCode = 1; });
    `], { cwd: process.cwd(), input: pdfWithText(pages), encoding: "utf8", timeout: 30_000 });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toMatchObject({ num: 2, text: expect.stringContaining(pages[1]) });
  });
});
