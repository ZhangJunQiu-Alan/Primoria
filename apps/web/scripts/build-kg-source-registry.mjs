#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { REPO_ROOT, graphPath, listGraphIds, readJson } from "./kg-db-common.mjs";

const RETRIEVED_AT = "2026-07-17";
const OUT = resolve(REPO_ROOT, "data/knowledge-graphs/governance/sources.json");
const CAMBRIDGE_RIGHTS = {
  metadata: true,
  fulltext: false,
  excerpts: false,
  derivatives: false,
  redistribution: false,
  commercial_use: false,
};

const VERIFIED_SOURCES = [
  {
    source_id: "src_cambridge_9700_2025_2027",
    title: "Cambridge International AS & A Level Biology (9700) syllabus",
    publisher: "Cambridge University Press & Assessment",
    authority_tier: "A",
    verification_status: "verified",
    jurisdiction: "international",
    languages: ["en"],
    resource_type: "curriculum_standard",
    landing_page_url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-biology-9700/",
    document_url: "https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf",
    document_version: "Version 1 (2025-2027 examinations)",
    issued_at: "2022-09-07",
    valid_from: "2025-01-01",
    valid_to: "2027-12-31",
    retrieved_at: RETRIEVED_AT,
    sha256: "5e6fe634a2c2ae95bf823c742e585140e7a4495224373b5aaaccb78fe2e35db1",
    license_expression: "LicenseRef-Cambridge-Copyrighted-MetadataOnly",
    rights: CAMBRIDGE_RIGHTS,
    storage_policy: "metadata_only",
    notes_zh: "官方 syllabus 已通过页面、PDF 元数据、页数和 SHA-256 核验；公开下载不视为开放再发布许可。"
  },
  {
    source_id: "src_cambridge_9701_2025_2027",
    title: "Cambridge International AS & A Level Chemistry (9701) syllabus",
    publisher: "Cambridge University Press & Assessment",
    authority_tier: "A",
    verification_status: "verified",
    jurisdiction: "international",
    languages: ["en"],
    resource_type: "curriculum_standard",
    landing_page_url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/",
    document_url: "https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf",
    document_version: "Version 1 (2025-2027 examinations)",
    issued_at: "2022-09-07",
    valid_from: "2025-01-01",
    valid_to: "2027-12-31",
    retrieved_at: RETRIEVED_AT,
    sha256: "bc40af1d0789b3217524f380337d3a36e49264f5f28ab991e3e85c9102d53ad2",
    license_expression: "LicenseRef-Cambridge-Copyrighted-MetadataOnly",
    rights: CAMBRIDGE_RIGHTS,
    storage_policy: "metadata_only",
    notes_zh: "官方 syllabus 已通过页面、PDF 元数据、页数和 SHA-256 核验；公开下载不视为开放再发布许可。"
  },
  {
    source_id: "src_cambridge_9702_2025_2027",
    title: "Cambridge International AS & A Level Physics (9702) syllabus",
    publisher: "Cambridge University Press & Assessment",
    authority_tier: "A",
    verification_status: "verified",
    jurisdiction: "international",
    languages: ["en"],
    resource_type: "curriculum_standard",
    landing_page_url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/",
    document_url: "https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf",
    document_version: "Version 1 (2025-2027 examinations)",
    issued_at: "2022-09-07",
    valid_from: "2025-01-01",
    valid_to: "2027-12-31",
    retrieved_at: RETRIEVED_AT,
    sha256: "1cba1cdca33c51a39dd6dfdc69d612f48967abcd89b6ceacdf9ffd6fa2e2b195",
    license_expression: "LicenseRef-Cambridge-Copyrighted-MetadataOnly",
    rights: CAMBRIDGE_RIGHTS,
    storage_policy: "metadata_only",
    notes_zh: "官方 syllabus 已通过页面、PDF 元数据、页数和 SHA-256 核验；公开下载不视为开放再发布许可。"
  },
  {
    source_id: "src_cambridge_9709_2026_2027",
    title: "Cambridge International AS & A Level Mathematics (9709) syllabus",
    publisher: "Cambridge University Press & Assessment",
    authority_tier: "A",
    verification_status: "verified",
    jurisdiction: "international",
    languages: ["en"],
    resource_type: "curriculum_standard",
    landing_page_url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/",
    document_url: "https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf",
    document_version: "Version 4 (December 2025; 2026-2027 examinations)",
    issued_at: "2025-12-08",
    valid_from: "2026-01-01",
    valid_to: "2027-12-31",
    retrieved_at: RETRIEVED_AT,
    sha256: "dd0131f3cd8d4e3c270e7936cbb909c15f4cb8053f8337b67c16e8ec0b8bc5e5",
    license_expression: "LicenseRef-Cambridge-Copyrighted-MetadataOnly",
    rights: CAMBRIDGE_RIGHTS,
    storage_policy: "metadata_only",
    notes_zh: "官方 syllabus 已通过页面、PDF 元数据、页数和 SHA-256 核验；公开下载不视为开放再发布许可。"
  },
  {
    source_id: "src_cambridge_9709_2026_2027_update",
    title: "Syllabus update: Cambridge International AS & A Level Mathematics (9709)",
    publisher: "Cambridge University Press & Assessment",
    authority_tier: "A",
    verification_status: "verified",
    jurisdiction: "international",
    languages: ["en"],
    resource_type: "curriculum_standard",
    landing_page_url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/",
    document_url: "https://www.cambridgeinternational.org/Images/723728-2026-2027-syllabus-update.pdf",
    document_version: "Version 4 update (December 2025; 2026-2027 examinations)",
    issued_at: "2025-12-08",
    valid_from: "2026-01-01",
    valid_to: "2027-12-31",
    retrieved_at: RETRIEVED_AT,
    sha256: "69899b12b05f970d2dc210fa5002ba69943c4cbd1de8b982dbf3a480dc395505",
    license_expression: "LicenseRef-Cambridge-Copyrighted-MetadataOnly",
    rights: CAMBRIDGE_RIGHTS,
    storage_policy: "metadata_only",
    notes_zh: "数学 syllabus 的官方更新页，必须与主 syllabus 一并审核。"
  },
  {
    source_id: "src_mit_ocw_18_01sc_fall_2010",
    title: "MIT OpenCourseWare 18.01SC Single Variable Calculus, Fall 2010",
    publisher: "Massachusetts Institute of Technology",
    authority_tier: "B",
    verification_status: "verified",
    jurisdiction: "US",
    languages: ["en"],
    resource_type: "course_material",
    landing_page_url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
    document_url: null,
    document_version: "Fall 2010",
    issued_at: null,
    valid_from: null,
    valid_to: null,
    retrieved_at: RETRIEVED_AT,
    sha256: "42a35e19a23fee51628e0caabb9897fbb0085e71e6269843820c41470fb10535",
    license_expression: "CC-BY-NC-SA-4.0",
    rights: {
      "metadata": true,
      "fulltext": true,
      "excerpts": true,
      "derivatives": true,
      "redistribution": true,
      "commercial_use": false
    },
    storage_policy: "licensed_fulltext",
    notes_zh: "Browser 已核验课程页的 Creative Commons BY-NC-SA 4.0 标识；商业用途仍受 NC 限制。"
  }
];

const verifiedGraphIds = new Set([
  "a_level_biology",
  "a_level_chemistry",
  "a_level_mathematics",
  "a_level_physics",
  "mit_calculus"
]);

const placeholders = listGraphIds()
  .filter((graphId) => !verifiedGraphIds.has(graphId))
  .map((graphId) => {
    const graph = readJson(graphPath(graphId));
    return {
      source_id: `src_unverified_${graphId}`,
      title: `${graph.subject} 当前 KG 来源待确认`,
      publisher: "来源待确认",
      authority_tier: "D",
      verification_status: "unverified",
      jurisdiction: "unknown",
      languages: ["en", "zh"],
      resource_type: "unverified_origin",
      landing_page_url: null,
      document_url: null,
      document_version: "baseline-unverified-2026-07-17",
      issued_at: null,
      valid_from: null,
      valid_to: null,
      retrieved_at: RETRIEVED_AT,
      sha256: null,
      license_expression: "LicenseRef-Unverified-MetadataOnly",
      rights: {
        metadata: true,
        fulltext: false,
        excerpts: false,
        derivatives: false,
        redistribution: false,
        commercial_use: false
      },
      storage_policy: "metadata_only",
      notes_zh: "只作为现有图的来源占位。未确认原始资料、版本和许可前，不得提升审核状态或保存正文。"
    };
  });

placeholders.push({
  source_id: "src_unverified_cross_subject_prerequisites",
  title: "跨学科先修关系来源待确认",
  publisher: "来源待确认",
  authority_tier: "D",
  verification_status: "unverified",
  jurisdiction: "unknown",
  languages: ["en", "zh"],
  resource_type: "unverified_origin",
  landing_page_url: null,
  document_url: null,
  document_version: "baseline-unverified-2026-07-17",
  issued_at: null,
  valid_from: null,
  valid_to: null,
  retrieved_at: RETRIEVED_AT,
  sha256: null,
  license_expression: "LicenseRef-Unverified-MetadataOnly",
  rights: {
    metadata: true,
    fulltext: false,
    excerpts: false,
    derivatives: false,
    redistribution: false,
    commercial_use: false
  },
  storage_policy: "metadata_only",
  notes_zh: "跨学科边未经逐条来源审核，不能提升为 approved。"
});

mkdirSync(resolve(OUT, ".."), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ schema_version: "1.0.0", sources: [...VERIFIED_SOURCES, ...placeholders] }, null, 2)}\n`
);
process.stdout.write(
  `[build-kg-source-registry] ${VERIFIED_SOURCES.length} verified and ${placeholders.length} placeholder sources -> ${OUT}\n`
);
