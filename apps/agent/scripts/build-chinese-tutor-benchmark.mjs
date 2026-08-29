#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TutorBenchmarkDatasetSchema } from "../src/evaluation/tutor-benchmark.mjs";
import { buildChineseTutorBenchmarkDataset } from "../evals/tutor-benchmark.zh.v1.source.mjs";

const datasetPath = fileURLToPath(new URL("../evals/tutor-benchmark.zh.v1.json", import.meta.url));
const reviewPath = fileURLToPath(new URL("../../../docs/Primoria中文TutorBench-v1-审阅稿.md", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

const domainLabels = {
  mathematics: "数学",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  computer_science: "计算机科学",
  economics: "经济学",
};

const taskLabels = {
  concept_understanding: "概念理解",
  problem_solving: "问题求解",
  application: "应用",
  comparison: "比较",
};

function frequencies(values) {
  return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
}

function assertCoverage(dataset) {
  const profileCounts = frequencies(dataset.cases.map((item) => item.learnerProfileId));
  const taskCounts = frequencies(dataset.cases.map((item) => item.tutorBenchTaskType));
  const failures = [];
  if (dataset.cases.length !== 60) failures.push(`expected 60 cases, got ${dataset.cases.length}`);
  if (Object.keys(profileCounts).length !== 20) failures.push(`expected 20 profiles, got ${Object.keys(profileCounts).length}`);
  if (new Set(dataset.cases.map((item) => item.domain)).size !== 6) failures.push("expected 6 domains");
  if (dataset.cases.some((item) => item.language !== "zh-CN")) failures.push("all cases must be zh-CN");
  for (const [profileId, count] of Object.entries(profileCounts)) {
    if (count !== 3) failures.push(`${profileId} must have 3 cases, got ${count}`);
    const item = dataset.cases.find((candidate) => candidate.learnerProfileId === profileId);
    if (item.learnerContext.misconceptions.length !== 3) failures.push(`${profileId} must have 3 misconceptions`);
  }
  const expectedTasks = { concept_understanding: 18, problem_solving: 18, application: 12, comparison: 12 };
  for (const [type, expected] of Object.entries(expectedTasks)) {
    if (taskCounts[type] !== expected) failures.push(`${type}: expected ${expected}, got ${taskCounts[type] ?? 0}`);
  }
  for (const item of dataset.cases) {
    if (item.sources.length !== 1) failures.push(`${item.id} must have exactly one source`);
    if (item.followUps.length !== 1) failures.push(`${item.id} must have exactly one review follow-up`);
    if (!item.checks.some((check) => check.kind === "citation_ids")) failures.push(`${item.id} is missing citation validation`);
    for (const source of item.sources) {
      if (source.origin?.startsWith("data/") && !existsSync(resolve(repositoryRoot, source.origin))) {
        failures.push(`${item.id} references missing local source ${source.origin}`);
      }
    }
  }
  if (failures.length) throw new Error(`Chinese benchmark coverage failed:\n${failures.join("\n")}`);
}

function list(values) {
  return values.map((value) => `- ${value}`).join("\n");
}

function renderReview(dataset) {
  const domainCounts = frequencies(dataset.cases.map((item) => item.domain));
  const taskCounts = frequencies(dataset.cases.map((item) => item.tutorBenchTaskType));
  const profileIds = [...new Set(dataset.cases.map((item) => item.learnerProfileId))];
  const lines = [
    "# Primoria 中文 TutorBench v1 审阅稿",
    "",
    "> 状态：待产品负责人逐条审阅。机器 JSON 由同一份数据源生成；本文件用于内容审阅，不是测试结果报告。",
    "",
    "## 1. 规模与方法",
    "",
    `- 学习者画像：${profileIds.length}`,
    `- 中文任务：${dataset.cases.length}`,
    `- 学科：${Object.keys(domainCounts).length}`,
    "- 每个画像：3 个明确误区、3 个任务、1 条每任务追问",
    "- 每个任务：资料片段、正确性合同、引用校验、个性化与教学性检查",
    "- 发布门槛：正确性、资料引用、安全性三个维度必须全部通过；总分还需达到 80%",
    "",
    "港大 TUTORBENCH 使用 90 个画像、270 个多轮任务和 30 个知识库。本 v1 先采用 20/60 的可审阅规模；任务类型比例保持为概念理解 30%、问题求解 30%、应用 20%、比较 20%。参考：[DeepTutor 官方论文](https://arxiv.org/abs/2604.26962)。",
    "",
    "> 当前自动 runner 只执行并评分首轮题目。第二轮追问用于人工审阅和后续多轮 runner，现阶段不能算入自动通过率。",
    "",
    "## 2. 覆盖统计",
    "",
    "### 学科",
    "",
    "| 学科 | 任务数 |",
    "| --- | ---: |",
    ...Object.entries(domainCounts).map(([domain, count]) => `| ${domainLabels[domain]} | ${count} |`),
    "",
    "### 任务类型",
    "",
    "| 类型 | 任务数 | 占比 |",
    "| --- | ---: | ---: |",
    ...Object.entries(taskCounts).map(([type, count]) => `| ${taskLabels[type]} | ${count} | ${(count / dataset.cases.length * 100).toFixed(0)}% |`),
    "",
    "## 3. 审阅标准",
    "",
    "逐条检查：题目是否自然；资料是否足够且准确；误区是否真实；机器验收条件是否会误判正确同义表达；追问是否真正测试适应而不是重复。",
    "",
  ];

  profileIds.forEach((profileId, profileIndex) => {
    const items = dataset.cases.filter((item) => item.learnerProfileId === profileId);
    const first = items[0];
    const source = first.sources[0];
    lines.push(
      `## ${profileIndex + 4}. ${profileId}`,
      "",
      `- 学科：${domainLabels[first.domain]}`,
      `- 知识库：${first.knowledgeBaseId}`,
      `- 已有知识：${first.learnerContext.priorKnowledge.join("；")}`,
      `- 学习偏好：${first.learnerContext.preferences.join("；")}`,
      `- 学习目标：${first.learnerContext.goals.join("；")}`,
      "",
      "学习误区：",
      "",
      list(first.learnerContext.misconceptions),
      "",
      `资料：**${source.title}**（${source.origin ?? "未标注来源"}）`,
      "",
      `> ${source.content}`,
      "",
    );
    items.forEach((item, taskIndex) => {
      lines.push(
        `### ${profileIndex + 1}.${taskIndex + 1} ${taskLabels[item.tutorBenchTaskType]} — ${item.id}`,
        "",
        "**首轮题目**",
        "",
        item.prompt,
        "",
        "**机器验收条件**",
        "",
        ...item.checks.map((check) => `- [${check.dimension}] ${check.description}`),
        "",
        "**第二轮追问**",
        "",
        item.followUps[0].prompt,
        "",
        `预期适应：${item.followUps[0].expectedAdaptation}`,
        "",
        "**人工审阅**",
        "",
        "- [ ] 题目与资料准确",
        "- [ ] 学习者误区真实",
        "- [ ] 验收条件不过拟合措辞",
        "- 审阅意见：",
        "",
      );
    });
  });
  return `${lines.join("\n")}\n`;
}

async function main() {
  const dataset = TutorBenchmarkDatasetSchema.parse(buildChineseTutorBenchmarkDataset());
  assertCoverage(dataset);
  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  const review = renderReview(dataset);
  if (process.argv.includes("--check")) {
    const [existingJson, existingReview] = await Promise.all([readFile(datasetPath, "utf8"), readFile(reviewPath, "utf8")]);
    if (existingJson !== json) throw new Error(`${datasetPath} is stale; rebuild the Chinese benchmark`);
    if (existingReview !== review) throw new Error(`${reviewPath} is stale; rebuild the Chinese benchmark review`);
    process.stdout.write(`Chinese TutorBench is in sync: ${dataset.cases.length} cases across ${new Set(dataset.cases.map((item) => item.domain)).size} domains.\n`);
    return;
  }
  await Promise.all([writeFile(datasetPath, json, "utf8"), writeFile(reviewPath, review, "utf8")]);
  process.stdout.write(`Wrote ${datasetPath}\nWrote ${reviewPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
