import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { imageCacheKey } from "../../src/lib/ai/media/image-brief";
import { assertImageTextQuality } from "../../src/lib/ai/media/image-text-quality";

async function main() {
  const root = resolve(__dirname, "../../../../.private/image-prewarm/en");
  const requireFromNext = createRequire(require.resolve("next/package.json"));
  const sharp = requireFromNext("sharp");
  await mkdir(resolve(root, "assets"), { recursive: true });
  const concepts = (await readFile(resolve(root, "concepts.en.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
  const expected = new Map(concepts.map((concept) => [concept.conceptId, concept]));
  const records = [];
  for (const name of (await readdir(resolve(root, "records"))).filter((name) => name.endsWith(".json")).sort()) {
    const path = resolve(root, "records", name);
    const record = JSON.parse(await readFile(path, "utf8"));
    assertImageTextQuality(record.brief);
    const concept = expected.get(record.conceptId);
    if (!concept || record.language !== "en" || record.brief.language !== "en") throw new Error(`Unexpected concept/language: ${name}`);
    if (record.brief.conceptIds.length !== 1 || record.brief.conceptIds[0] !== record.conceptId) throw new Error(`Concept mismatch: ${name}`);
    if (imageCacheKey(record.brief) !== concept.cacheKey) throw new Error(`Cache-key mismatch: ${name}`);
    if (!/^[a-z0-9_]+$/.test(record.conceptId)) throw new Error("Unsafe concept filename");
    const file = resolve(root, record.file);
    const source = await readFile(record.originalOutput);
    const originalSha256 = createHash("sha256").update(source).digest("hex");
    try {
      const existing = await readFile(file);
      if (!existing.equals(source)) throw new Error(`Refusing to replace a different original: ${name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await copyFile(record.originalOutput, file);
    }
    const sourceInfo = await sharp(source).metadata();
    const assetFile = `assets/${record.conceptId}.webp`;
    let bytes: Buffer | undefined;
    if (record.originalSha256 === originalSha256 && record.assetFile === assetFile && record.compressionQuality === 90) {
      try {
        const cached = await readFile(resolve(root, assetFile));
        if (createHash("sha256").update(cached).digest("hex") === record.sha256) bytes = cached;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const finalBytes: Buffer = bytes ?? await sharp(source).webp({ quality: 90, effort: 6 }).toBuffer();
    await writeFile(resolve(root, assetFile), finalBytes);
    Object.assign(record, {
      cacheKey: concept.cacheKey, graphId: concept.graphId,
      width: sourceInfo.width, height: sourceInfo.height,
      originalMimeType: `image/${sourceInfo.format}`, originalBytes: source.length,
      originalSha256, compressionQuality: 90,
      assetFile, mimeType: "image/webp", bytes: finalBytes.length,
      sha256: createHash("sha256").update(finalBytes).digest("hex"),
    });
    await writeFile(path, JSON.stringify(record, null, 2) + "\n");
    records.push(record);
  }
  const summary = {
    expected: concepts.length, generated: records.length,
    reviewedByCodex: records.filter((record) => record.reviewStatus === "reviewed_by_codex").length,
    missing: concepts.length - records.length,
    remaining: concepts.length - records.filter((record) => record.reviewStatus === "reviewed_by_codex").length,
    compressedBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    originalBytes: records.reduce((sum, record) => sum + record.originalBytes, 0),
    imported: records.filter((record) => record.imported).length,
    complete: records.length === concepts.length && records.every((record) => record.reviewStatus === "reviewed_by_codex"),
  };
  await writeFile(resolve(root, "progress.json"), JSON.stringify(summary, null, 2) + "\n");
  const escape = (value: string) => value.replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
  const cards = records.map((record) => `<figure><a href="${record.file}"><img src="${record.assetFile}" loading="lazy" alt="${escape(record.brief.alt)}"></a><figcaption><h2>${escape(expected.get(record.conceptId).name)}</h2><p>${escape(record.brief.caption)}</p><small>${escape(record.conceptId)} · ${escape(record.reviewStatus)} · ${Math.round(record.bytes / 1024)} KB</small></figcaption></figure>`).join("\n");
  await writeFile(resolve(root, "review.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Primoria English concept images</title><style>body{font:16px system-ui;background:#fbf7ee;color:#29241c;max-width:1600px;margin:32px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:24px}figure{margin:0;background:white;border:1px solid #e7dfd0}img{display:block;width:100%;height:auto}figcaption{padding:18px}h2{font-size:19px}small{overflow-wrap:anywhere}@media(max-width:480px){main{grid-template-columns:1fr}}</style><h1>English concept images: ${summary.generated} / ${summary.expected}</h1><p>Built-in image generation. Codex review is distinct from user approval. Imported: ${summary.imported}. Pending: ${summary.remaining}.</p><main>${cards}</main></html>`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(() => { console.error("Local image finalization failed; no cloud writes were made."); process.exitCode = 1; });
