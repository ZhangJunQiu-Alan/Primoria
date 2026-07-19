#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const FRAMEWORK_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/frameworks");
const MAPPING_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/mappings/pending");
const GAP_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/gaps/pending");
const OUTPUT_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/review/pending/curriculum-mapping");
const CONCEPT_REGISTRY_PATH = resolve(REPO_ROOT, "data/knowledge-graphs/governance/concept-registry.json");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const listJson = (directory) =>
  (existsSync(directory) ? readdirSync(directory) : [])
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson(resolve(directory, name)));

const coverageLabels = {
  full: "完整覆盖",
  partial: "部分覆盖",
  unmapped: "尚未映射",
  excluded: "有理由排除",
};

const frameworks = new Map(listJson(FRAMEWORK_DIR).map((framework) => [framework.framework_id, framework]));
const mappingSets = listJson(MAPPING_DIR);
const gapSets = new Map(listJson(GAP_DIR).map((gapSet) => [gapSet.framework_id, gapSet]));
const conceptRegistry = readJson(CONCEPT_REGISTRY_PATH);
const concepts = new Map(conceptRegistry.concepts.map((concept) => [concept.canonical_id, concept]));

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const mappingSet of mappingSets) {
  const framework = frameworks.get(mappingSet.framework_id);
  if (!framework) throw new Error(`Unknown framework_id: ${mappingSet.framework_id}`);
  const requirements = new Map(
    framework.requirements.map((requirement) => [requirement.requirement_id, requirement]),
  );
  const counts = Object.fromEntries(
    Object.keys(coverageLabels).map((status) => [
      status,
      mappingSet.mappings.filter((mapping) => mapping.coverage_status === status).length,
    ]),
  );
  const gapSet = gapSets.get(mappingSet.framework_id);
  const gapsByRequirement = new Map(
    (gapSet?.candidates ?? []).flatMap((candidate) =>
      candidate.requirement_ids.map((requirementId) => [requirementId, candidate]),
    ),
  );
  const gapCounts = Object.fromEntries(
    ["add_concept", "split_or_narrow_existing", "not_knowledge_concept"].map((action) => [
      action,
      (gapSet?.candidates ?? []).filter((candidate) => candidate.action === action).length,
    ]),
  );
  const lines = [
    `# ${framework.title_zh}：KG 映射待审核包`,
    "",
    "> 本文件只展示 AI 提出的待审建议。所有条目均为 `needs_review`，未经人工批准不会进入正式 KG。",
    mappingSet.mapping_scope === "topic_alignment"
      ? "> 当前集合是主题级导航映射，不是逐条学习成果覆盖矩阵；`部分覆盖` 不得解释为官方大纲已完整覆盖。"
      : "> 当前集合按官方逐条学习成果核对，可用于判断课程覆盖缺口。",
    "",
    `- 课程：\`${framework.curriculum_id}\``,
    `- 课程框架：\`${framework.framework_id}\``,
    `- 映射集合：\`${mappingSet.mapping_set_id}\``,
    `- 地区：\`${framework.jurisdiction}\``,
    `- 课程版本：\`${framework.content_version}\``,
    `- 映射版本：\`${mappingSet.content_version}\``,
    `- 映射范围：\`${mappingSet.mapping_scope}\``,
    `- 官方来源：${framework.source_ids.map((sourceId) => `\`${sourceId}\``).join("、")}`,
    `- 覆盖统计：完整 ${counts.full}；部分 ${counts.partial}；未映射 ${counts.unmapped}；排除 ${counts.excluded}`,
    gapSet
      ? `- KG 缺口建议：新增概念 ${gapCounts.add_concept}；拆分或收窄 ${gapCounts.split_or_narrow_existing}；不进入知识概念 ${gapCounts.not_knowledge_concept}`
      : "- KG 缺口建议：本主题级导航框架不生成逐成果缺口候选",
    "",
  ];

  mappingSet.mappings.forEach((mapping, index) => {
    const requirement = requirements.get(mapping.requirement_id);
    if (!requirement) throw new Error(`Unknown requirement_id: ${mapping.requirement_id}`);
    const conceptLabels = mapping.canonical_ids.length
      ? mapping.canonical_ids.map((canonicalId) => {
          const concept = concepts.get(canonicalId);
          if (!concept) throw new Error(`Unknown canonical_id: ${canonicalId}`);
          return `${concept.preferred_name_zh || concept.preferred_name}（\`${canonicalId}\`）`;
        })
      : ["无"];
    const gap = gapsByRequirement.get(mapping.requirement_id);
    lines.push(
      `## ${index + 1}. ${requirement.code}｜${requirement.title_zh}`,
      "",
      `- 课程要求 ID：\`${requirement.requirement_id}\``,
      `- 映射 ID：\`${mapping.mapping_id}\``,
      `- 中文释义：${requirement.summary_zh}`,
      `- 建议结论：${coverageLabels[mapping.coverage_status]}；关系 \`${mapping.relation}\`；置信度 \`${mapping.confidence}\``,
      `- 对应概念：${conceptLabels.join("；")}`,
      `- 判断理由：${mapping.rationale_zh}`,
      `- 官方证据：${mapping.evidence_refs.map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
      gap
        ? `- KG 后续动作：\`${gap.action}\`；候选“${gap.proposed_name_zh}”；${gap.rationale_zh}`
        : "- KG 后续动作：无，当前概念覆盖边界可接受",
      `- 审核状态：\`${mapping.review_status}\``,
      "",
    );
  });

  const outputPath = resolve(OUTPUT_DIR, `${mappingSet.mapping_set_id}.review.zh-CN.md`);
  writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(`wrote ${outputPath}\n`);
}
