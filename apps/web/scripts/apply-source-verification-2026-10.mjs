#!/usr/bin/env node
/**
 * Apply the October 2026 source re-verification of the China/Singapore overlay
 * corpus (graphs, cross edges, curricula, pedagogy).
 *
 * Every page locator change comes from
 * `data/knowledge-graphs/review/pending/source-verification/2026-10-25.locator-rewrites.json`,
 * which was produced by re-extracting the official PDFs page by page:
 *   - China: 2020-revision evidence re-located in the 2025 routine revision
 *     (日常修订版, 2017年版2025年修订) by module + content-requirement code;
 *   - Singapore MOE: printed page numbers converted to PDF pages;
 *   - SEAB: each outcome moved to the PDF page it is actually printed on.
 * The repository stores no syllabus text, only locators and checksums.
 *
 * It also removes H2 Physics requirement 18(h), which does not exist in SEAB 9478.
 * Review status is not touched: everything stays `needs_review`.
 *
 * Idempotent. Usage:
 *   node apps/web/scripts/apply-source-verification-2026-10.mjs            # dry run
 *   node apps/web/scripts/apply-source-verification-2026-10.mjs --apply
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-10-25";
const APPLY = process.argv.includes("--apply");
const TABLE = resolve(DATA, "review/pending/source-verification/2026-10-25.locator-rewrites.json");
const CHANGELOG = "按 2026-10-25 官方来源复核更新证据定位（中国课标迁至 2025 日常修订版、新加坡页码校正），状态保持 needs_review。";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const bump = (version) => {
  const parts = String(version).split(".").map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
};

// Rewrites are page shifts (p.41 -> p.42 while an original p.42 -> p.43), so a
// second pass would shift twice. The new 2025 sources mark the table as applied.
const sourcesPath = resolve(DATA, "governance/sources.json");
const registry = readJson(sourcesPath);
if (registry.sources.some((s) => s.source_id === "src_cn_moe_senior_high_physics_2025")) {
  process.stdout.write("[source-verification] already applied; nothing to do.\n");
  process.exit(0);
}

const table = readJson(TABLE);
const sourceSwap = new Map(table.source_replacements.map((r) => [r.source_id_from, r.source_id_to]));
const rewrites = new Map(
  table.locator_rewrites.map((r) => [`${r.source_id_from}\u0000${r.locator_from}`, r]),
);
const removed = table.removed_requirements;
const removedRequirementIds = new Set(removed.map((r) => r.requirement_id));
const removedMappingIds = new Set(removed.map((r) => r.mapping_id));

// ------------------------------------------------------------- source registry

const restricted = {
  metadata: true,
  fulltext: false,
  excerpts: false,
  derivatives: false,
  redistribution: false,
  commercial_use: false,
};

const cnStandard = (subject, slug, sha256, documentUrl, pdfPages) => ({
  source_id: `src_cn_moe_senior_high_${slug}_2025`,
  title: `普通高中${subject}课程标准日常修订版（2017年版2025年修订）`,
  publisher: "中华人民共和国教育部",
  authority_tier: "A",
  verification_status: "verified",
  jurisdiction: "CN-MAINLAND",
  languages: ["zh-CN"],
  resource_type: "curriculum_standard",
  landing_page_url: null,
  document_url: documentUrl,
  document_version: `2017年版2025年修订（日常修订版）；PDF ${pdfPages} 页，生成于 2025-10-31`,
  issued_at: null,
  valid_from: null,
  valid_to: null,
  retrieved_at: TODAY,
  sha256,
  license_expression: "LicenseRef-China-MOE-Copyrighted-MetadataOnly",
  rights: restricted,
  storage_policy: "metadata_only",
  notes_zh:
    "教育部于 2025 年 10 月印发义务教育、普通高中课程方案和课程标准日常修订版（新华网 2026-01-05 年度盘点报道）。" +
    "教育部官网未检索到通知原文与附件，本 PDF 取自第三方转载地址；四科 PDF 元数据一致（2025-10-31 生成、无转载水印），" +
    "目录、章节编号与内容要求编号与 2020 修订版逐条对应。sha256 对应该 PDF 文件。只保存元数据、页码定位和释义；" +
    "取得教育部官方原件后应复核校验值。",
});

const newSources = [
  cnStandard(
    "物理",
    "physics",
    "bd3df92fb779dbac6ce5bbc55dd4f5f0c9cecd45d34a14b99245739db88ab559",
    "https://cdn.zizzs.com/zixunzhan/%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86%E6%97%A5%E5%B8%B8%E4%BF%AE%E8%AE%A2%E7%89%88%EF%BC%882017%E5%B9%B4%E7%89%882025%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%891762761470592.pdf",
    74,
  ),
  cnStandard(
    "化学",
    "chemistry",
    "f731543b5cd3fe3dc95657d410ab92d91fe081b31045ee62693cdad8eebeef7f",
    "http://www.hxzxs.cn/uploads/soft/%EF%BC%882017%E5%B9%B4%E7%89%882025%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%89%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E5%8C%96%E5%AD%A6%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86.pdf",
    108,
  ),
  cnStandard(
    "生物学",
    "biology",
    "f5924aedf3b776a8031f159c90893384a876891f261d8eb00a5b8b7840199cbf",
    "https://cdn.zizzs.com/zixunzhan/%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E7%94%9F%E7%89%A9%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86%E6%97%A5%E5%B8%B8%E4%BF%AE%E8%AE%A2%E7%89%88%EF%BC%882017%E5%B9%B4%E7%89%882025%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%891762856973305.pdf",
    94,
  ),
  cnStandard(
    "数学",
    "math",
    "fc9258bb37ed2e052a4b1be608865a5481f770ae7e28ce536e835d2354353f86",
    "https://cdn.zizzs.com/zixunzhan/%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E6%95%B0%E5%AD%A6%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86%E6%97%A5%E5%B8%B8%E4%BF%AE%E8%AE%A2%E7%89%88%EF%BC%882017%E5%B9%B4%E7%89%882025%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%891762759330338.pdf",
    171,
  ),
];

const SUPERSEDED_NOTE = "已被 2025 年 10 月印发的日常修订版（2017年版2025年修订）取代；仓库证据于 2026-10-25 迁至对应 *_2025 来源，本条仅作历史记录。";
const seabUpdates = {
  src_sg_seab_h2_math_9758_2026: {
    document_url: "https://isomer-user-content.by.gov.sg/334/f27e37f7-f0ec-4a35-b1e8-3a5e88ae2f81/9758_y26_sy.pdf",
    note: "2026-10-25 复核：原 seab.gov.sg/files 地址已 404，SEAB 2026 页面现链接 isomer 地址，文件 sha256 不变。2027 考试版 9758_y27_sy.pdf（sha256 42f4f83c184f…）除年份外内容一致。",
  },
  src_sg_seab_h2_physics_9478_2026: {
    document_url: "https://isomer-user-content.by.gov.sg/334/2dc32e71-8fb4-4272-9262-f21be46fbaeb/9478_y26_sy.pdf",
    note: "2026-10-25 复核：原 seab.gov.sg/files 地址已 404，SEAB 2026 页面现链接 isomer 地址，文件 sha256 不变。2027 考试版 9478_y27_sy.pdf（sha256 50d3ae46fcb9…）除年份与版权年外内容一致。",
  },
  src_sg_seab_h2_chemistry_9476_2026: {
    note: "2026-10-25 复核：文件与 sha256 不变。2027 考试版 9476_y27_sy.pdf（sha256 e18154a09e0c…）除年份与版权年外内容一致。",
  },
  src_sg_seab_h2_biology_9477_2026: {
    note: "2026-10-25 复核：原文件仍可访问且 sha256 不变；SEAB 2026 页面现链接重新上传版（isomer …/3fed64fd…/9477_y26_sy.pdf，sha256 062d049c1bcb…），仅修正字体嵌入，逐页内容一致。2027 考试版 9477_y27_sy.pdf（sha256 8c2744bc2253…）除年份外内容一致。",
  },
};

function updateSources(registry) {
  const byId = new Map(registry.sources.map((s) => [s.source_id, s]));
  for (const source of newSources) byId.set(source.source_id, source);
  for (const oldId of sourceSwap.keys()) {
    const source = byId.get(oldId);
    if (source && !source.notes_zh.includes(SUPERSEDED_NOTE)) source.notes_zh = `${source.notes_zh}${SUPERSEDED_NOTE}`;
  }
  for (const [id, update] of Object.entries(seabUpdates)) {
    const source = byId.get(id);
    if (!source) throw new Error(`missing source ${id}`);
    if (update.document_url) source.document_url = update.document_url;
    if (!source.notes_zh.includes(update.note)) source.notes_zh = `${source.notes_zh}${update.note}`;
    source.retrieved_at = TODAY;
  }
  registry.sources = [...byId.values()].sort((a, b) => a.source_id.localeCompare(b.source_id));
}

// ------------------------------------------------------------ corpus rewrite

const SKIP = new Set(["governance/sources.json", "governance/review-decisions.json", relative(DATA, TABLE)]);
const files = [];
const collect = (dir) => {
  for (const name of readdirSync(dir).sort()) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) collect(path);
    else if (name.endsWith(".json") && !SKIP.has(relative(DATA, path))) files.push(path);
  }
};
collect(DATA);

const stats = { refs: 0, sourceIds: 0, removed: 0, files: 0 };
const unmatched = new Set();

function rewrite(node) {
  if (Array.isArray(node)) {
    let changed = false;
    for (let i = node.length - 1; i >= 0; i -= 1) {
      const item = node[i];
      if (typeof item === "string" && sourceSwap.has(item)) {
        node[i] = sourceSwap.get(item);
        stats.sourceIds += 1;
        changed = true;
      } else if (
        item &&
        typeof item === "object" &&
        (removedRequirementIds.has(item.requirement_id) && !item.mapping_id && "code" in item ||
          removedMappingIds.has(item.mapping_id))
      ) {
        node.splice(i, 1);
        stats.removed += 1;
        changed = true;
      } else if (rewrite(item)) changed = true;
    }
    return changed;
  }
  if (!node || typeof node !== "object") return false;
  let changed = false;
  if (typeof node.source_id === "string" && typeof node.locator === "string") {
    const hit = rewrites.get(`${node.source_id}\u0000${node.locator}`);
    if (hit) {
      node.source_id = hit.source_id_to;
      node.locator = hit.locator_to;
      stats.refs += 1;
      changed = true;
    } else if (sourceSwap.has(node.source_id)) {
      unmatched.add(`${node.source_id} | ${node.locator}`);
    }
  } else if (typeof node.source_id === "string" && sourceSwap.has(node.source_id)) {
    node.source_id = sourceSwap.get(node.source_id);
    stats.sourceIds += 1;
    changed = true;
  }
  for (const value of Object.values(node)) if (rewrite(value)) changed = true;
  return changed;
}

const outputs = [];
for (const path of files) {
  const doc = readJson(path);
  if (!rewrite(doc)) continue;
  if (typeof doc.title_zh === "string") doc.title_zh = doc.title_zh.replace(/2017 ?年版 ?2020 ?年修订/g, "2017 年版 2025 年修订");
  if (typeof doc.content_version === "string" && Array.isArray(doc.changelog)) {
    if (!doc.changelog.some((entry) => entry.summary_zh === CHANGELOG)) {
      doc.content_version = bump(doc.content_version);
      doc.changelog.push({ version: doc.content_version, date: TODAY, summary_zh: CHANGELOG });
    }
  }
  outputs.push([path, doc]);
}

if (unmatched.size > 0) {
  process.stderr.write(`[source-verification] ${unmatched.size} superseded-source refs have no rewrite:\n`);
  for (const ref of unmatched) process.stderr.write(`  ${ref}\n`);
  process.exit(1);
}

updateSources(registry);

stats.files = outputs.length;
process.stdout.write(
  `[source-verification] files=${stats.files} refs=${stats.refs} source_ids=${stats.sourceIds} removed_items=${stats.removed}\n`,
);
if (!APPLY) {
  process.stdout.write("Dry run. Re-run with --apply to write.\n");
  process.exit(0);
}
for (const [path, doc] of outputs) writeJson(path, doc);
writeJson(sourcesPath, registry);
