#!/usr/bin/env tsx

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

const analogy = {
  type: "analogy" as const,
  title: "难点类比",
  source: "熟悉场景",
  target: "目标概念",
  mapping: "把熟悉场景中的关系映射到目标概念。",
};

const transfer = {
  type: "transfer" as const,
  title: "综合迁移",
  fromDomain: "当前主题",
  toDomain: "真实应用",
  explanation: "把本节概念迁移到一个新的真实场景。",
  example: "使用全部概念分析一个综合问题。",
};

const visual = {
  type: "visual" as const,
  title: "关键关系可视化",
  description: "展示最难概念之间的关系。",
  engine: "mermaid" as const,
  mermaidDefinition: "flowchart LR\nA[概念 A] --> B[概念 B]",
};

const quiz = {
  type: "quiz" as const,
  title: "综合检测",
  questions: Array.from({ length: 5 }, (_, index) => ({
    kind: "single" as const,
    id: `q${index + 1}`,
    question: `第 ${index + 1} 个概念检测问题是什么？`,
    choices: [
      { id: "a", text: "正确理解" },
      { id: "b", text: "常见误解" },
    ],
    correctId: "a",
    explanation: "正确选项符合本节建立的概念关系。",
  })),
};

function draft(blockCount: number) {
  const textCount = blockCount - 4;
  return {
    title: "测试 Lesson",
    summary: "验证 Lesson Block 数量与构成规则。",
    estimatedMinutes: 45,
    blocks: [
      ...Array.from({ length: textCount }, (_, index) => text(index + 1)),
      analogy,
      visual,
      transfer,
      quiz,
    ],
  };
}

function main() {
  assert(normalizeCourseDraft(draft(15), "测试主题", 4).blocks.length === 15, "four concepts accept 15 blocks");
  assert(normalizeCourseDraft(draft(16), "测试主题", 4).blocks.length === 16, "four concepts accept 16 blocks");
  assert(normalizeCourseDraft(draft(17), "测试主题", 5).blocks.length === 17, "five concepts accept 17 blocks");
  assert(normalizeCourseDraft(draft(18), "测试主题", 5).blocks.length === 18, "five concepts accept 18 blocks");

  assertThrows(() => normalizeCourseDraft(draft(14), "测试主题", 4), "four concepts reject fewer than 15 blocks");
  assertThrows(() => normalizeCourseDraft(draft(17), "测试主题", 4), "four concepts reject more than 16 blocks");
  assertThrows(() => normalizeCourseDraft(draft(16), "测试主题", 5), "five concepts reject fewer than 17 blocks");
  assertThrows(() => normalizeCourseDraft(draft(19), "测试主题", 5), "five concepts reject more than 18 blocks");

  const withoutQuiz = draft(15);
  withoutQuiz.blocks.splice(-1, 1, text(99));
  assertThrows(() => normalizeCourseDraft(withoutQuiz, "测试主题", 4), "lesson requires exactly one quiz");

  process.stdout.write("[course-lesson-composition.unit] ALL CHECKS PASSED\n");
}

main();
