#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { normalizeCourseDraft } from "../src/lib/ai/deepagent/course-generator.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function assertThrows(run: () => unknown, message: string) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function text(index: number) {
  return {
    type: "text" as const,
    title: `教学步骤 ${index}`,
    markdown: `这是第 ${index} 个具体教学步骤，用于解释概念、展示例子或完成总结。`,
  };
}

function visual(index: number) {
  return {
    type: "visual" as const,
    title: `关键关系可视化 ${index}`,
    description: "展示最难概念之间的关系。",
    engine: "mermaid" as const,
    mermaidDefinition: "flowchart LR\nA[概念 A] --> B[概念 B]",
  };
}

function quiz(index: number) {
  return {
    type: "quiz" as const,
    title: `概念 ${index} 检测`,
    questions: [{
      kind: "single" as const,
      id: `q${index}`,
      question: `第 ${index} 个概念检测问题是什么？`,
      choices: [
        { id: "a", text: "正确理解" },
        { id: "b", text: "常见误解" },
      ],
      correctId: "a",
      explanation: "正确选项符合本节建立的概念关系。",
    }],
  };
}

const transfer = {
  type: "transfer" as const,
  title: "综合迁移",
  fromDomain: "当前主题",
  toDomain: "真实应用",
  explanation: "把本节概念迁移到一个新的真实场景。",
  example: "使用全部概念分析一个综合问题。",
};

const code = {
  type: "code" as const,
  title: "实现样例",
  language: "python",
  code: "print('hello')",
  explanation: "用代码实现当前概念。",
};

function draft(blockCount: number, conceptCount: number, visualCount: number, includeCode = false) {
  const fixedBlocks = [
    ...Array.from({ length: visualCount }, (_, index) => visual(index + 1)),
    ...Array.from({ length: conceptCount }, (_, index) => quiz(index + 1)),
    transfer,
    ...(includeCode ? [code] : []),
  ];
  const textCount = blockCount - fixedBlocks.length;
  return {
    title: "测试 Lesson",
    summary: "验证 Lesson Block 数量与构成规则。",
    estimatedMinutes: 45,
    blocks: [
      ...Array.from({ length: textCount }, (_, index) => text(index + 1)),
      ...fixedBlocks,
    ],
  };
}

function main() {
  const generatorSource = readFileSync(new URL("../src/lib/ai/deepagent/course-generator.ts", import.meta.url), "utf8");
  assert(!/at most one per course|include at most one/i.test(generatorSource), "legacy generator no longer caps visuals at one");

  assert(normalizeCourseDraft(draft(13, 2, 4), "测试主题", 2).blocks.length === 13, "two concepts accept 13 blocks");
  assert(normalizeCourseDraft(draft(15, 2, 5), "测试主题", 2).blocks.length === 15, "two concepts accept 15 blocks");
  assert(normalizeCourseDraft(draft(16, 3, 5), "测试主题", 3).blocks.length === 16, "three concepts accept 16 blocks");
  assert(normalizeCourseDraft(draft(20, 3, 9), "测试主题", 3).blocks.length === 20, "three concepts accept 20 blocks");

  assertThrows(() => normalizeCourseDraft(draft(12, 2, 4), "测试主题", 2), "two concepts reject fewer than 13 blocks");
  assertThrows(() => normalizeCourseDraft(draft(16, 2, 5), "测试主题", 2), "two concepts reject more than 15 blocks");
  assertThrows(() => normalizeCourseDraft(draft(15, 3, 5), "测试主题", 3), "three concepts reject fewer than 16 blocks");
  assertThrows(() => normalizeCourseDraft(draft(21, 3, 9), "测试主题", 3), "three concepts reject more than 20 blocks");

  assertThrows(() => normalizeCourseDraft(draft(13, 2, 1), "测试主题", 2), "media density below 15 percent rejected");
  assertThrows(() => normalizeCourseDraft(draft(13, 2, 8), "测试主题", 2), "media density above 60 percent rejected");
  assertThrows(() => normalizeCourseDraft(draft(13, 1, 4), "测试主题", 2), "missing per-concept quiz rejected");

  assertThrows(() => normalizeCourseDraft(draft(13, 2, 4, true), "光合作用", 2), "code rejected for non-code topic");
  assertThrows(() => normalizeCourseDraft(draft(13, 2, 4, true), "自我实现", 2), "bare 实现 topic does not allow code");
  assertThrows(() => normalizeCourseDraft(draft(13, 2, 4, true), "实现共同富裕的社会机制", 2), "social-science 实现 topic does not allow code");
  assert(normalizeCourseDraft(draft(13, 2, 4, true), "Python 编程", 2).blocks.some((block) => block.type === "code"), "code allowed for code-eligible topic");
  assert(normalizeCourseDraft(draft(13, 2, 4, true), "我要用 Python 实现二分查找", 2).blocks.some((block) => block.type === "code"), "explicit code intent allows code");

  process.stdout.write("[course-lesson-composition.unit] ALL CHECKS PASSED\n");
}

main();
