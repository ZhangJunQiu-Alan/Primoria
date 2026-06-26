#!/usr/bin/env tsx

import {
  enrichBroadMenuReasons,
  fallbackBroadMenuReason,
  type BroadMenuReasonModelInvoker,
} from "../src/lib/knowledge-graph/broad-menu-reasons.ts";
import type { BroadMenuItem } from "../src/lib/knowledge-graph/positioning.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const menu: BroadMenuItem[] = [
  {
    topicId: "t_arrays",
    name: "列表与数组",
    defaultOrder: 1,
    concepts: [
      { conceptId: "c_arrays", name: "数组", defaultOrder: 1 },
      { conceptId: "c_lists", name: "链表", defaultOrder: 2 },
    ],
  },
  {
    topicId: "t_trees",
    name: "树与二叉搜索树",
    defaultOrder: 2,
    concepts: [
      { conceptId: "c_tree", name: "树", defaultOrder: 1 },
      { conceptId: "c_bst", name: "二叉搜索树", defaultOrder: 2 },
    ],
  },
];

async function main() {
  const successInvoker: BroadMenuReasonModelInvoker = async () => ({
    reasons: [
      {
        topicId: "t_arrays",
        reason: "你想学数据结构，这里先解释连续存储和线性访问，方便后续理解更复杂结构。",
      },
      {
        topicId: "t_trees",
        reason: "这个入口直接连接层级结构和查找操作，适合作为理解 BST 的起点。",
      },
    ],
  });

  const enriched = await enrichBroadMenuReasons(
    { query: "我想要开始学习数据结构和算法", language: "zh", menu },
    successInvoker,
  );
  assert(enriched[0].topicId === "t_arrays", "enrichment preserves topic id");
  assert(enriched[0].name === "列表与数组", "enrichment preserves topic title");
  assert(enriched[0].reason.includes("连续存储"), "enrichment attaches model reason");
  assert(enriched[1].reason.includes("BST"), "enrichment keeps each topic's own reason");

  const failureInvoker: BroadMenuReasonModelInvoker = async () => {
    throw new Error("model unavailable");
  };
  const fallback = await enrichBroadMenuReasons(
    { query: "我想要开始学习数据结构和算法", language: "zh", menu },
    failureInvoker,
  );
  assert(fallback[0].topicId === "t_arrays", "fallback preserves topic id");
  assert(fallback[0].reason === fallbackBroadMenuReason(menu[0], "zh"), "fallback uses deterministic reason");
  assert(fallback[0].reason.includes("数组"), "fallback reason references topic concepts");

  process.stdout.write("[broad-menu-reasons.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
