#!/usr/bin/env tsx

import { encodeKnowledgeGraphQuery } from "../src/lib/knowledge-graph/query-encoding.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`assertion failed: ${message}`);
  }
}

function caseFor(rawQuery: string, expectedCoreQuery: string) {
  const encoded = encodeKnowledgeGraphQuery(rawQuery);
  assert(encoded.coreQuery === expectedCoreQuery, `${rawQuery} -> ${encoded.coreQuery}, expected ${expectedCoreQuery}`);
  assert(
    encoded.embeddingQuery === `学习目标检索: ${expectedCoreQuery}`,
    `${rawQuery} embedding query should carry the stable prefix`,
  );
}

async function main() {
  caseFor("我想学套娃求导", "套娃求导");
  caseFor("洛必达怎么用？", "洛必达");
  caseFor("不会求收敛半径", "收敛半径");
  caseFor("什么是变上限积分函数", "变上限积分函数");
  caseFor("请帮我讲讲链式法则是什么", "链式法则");
  caseFor("u substitution 凑微分", "u substitution 凑微分");

  const fallback = encodeKnowledgeGraphQuery("我想学?");
  assert(fallback.coreQuery === "我想学", "very short stripped queries fall back to normalized raw query");

  process.stdout.write("[knowledge-graph-query.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[knowledge-graph-query.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
