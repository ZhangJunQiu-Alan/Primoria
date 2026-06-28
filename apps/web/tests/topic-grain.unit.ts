#!/usr/bin/env tsx

import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function bump(counts: Map<number, number>, count: number) {
  counts.set(count, (counts.get(count) ?? 0) + 1);
}

function formatCounts(counts: Map<number, number>) {
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([count, total]) => `${count}:${total}`)
    .join(", ");
}

function validateSourceTopics(templeDir: string) {
  const failures: string[] = [];
  const counts = new Map<number, number>();
  const files = readdirSync(templeDir).filter(
    (file) => file.endsWith(".json") && !["cross_subject_edges.json", "kg_zh_labels.json"].includes(file),
  );

  for (const file of files) {
    const json = JSON.parse(readFileSync(join(templeDir, file), "utf8")) as {
      nodes?: Array<{ id?: string; kind?: string; topic?: string | null }>;
    };
    const nodes = json.nodes ?? [];
    const topics = nodes.filter((node) => node.kind === "topic" && node.id);
    const topicConceptCounts = new Map(topics.map((topic) => [String(topic.id), 0]));

    for (const concept of nodes.filter((node) => node.kind === "concept")) {
      const topicId = concept.topic ? String(concept.topic) : "";
      if (!topicConceptCounts.has(topicId)) {
        failures.push(`${file}: concept ${concept.id ?? "(missing id)"} points to missing topic ${topicId}`);
        continue;
      }
      topicConceptCounts.set(topicId, (topicConceptCounts.get(topicId) ?? 0) + 1);
    }

    for (const [topicId, count] of topicConceptCounts) {
      bump(counts, count);
      if (count < 2 || count > 3) failures.push(`${file}: topic ${topicId} has ${count} concepts`);
    }
  }

  assert(failures.length === 0, `source topic grain violations:\n${failures.join("\n")}`);
  return counts;
}

function validateGeneratedTopics(generatedDir: string) {
  const failures: string[] = [];
  const counts = new Map<number, number>();
  const files = readdirSync(generatedDir).filter((file) => file.startsWith("topic-graph.") && file.endsWith(".json"));

  for (const file of files) {
    const json = JSON.parse(readFileSync(join(generatedDir, file), "utf8")) as {
      topics?: Array<{ topicId?: string; conceptIds?: unknown[] }>;
    };
    for (const topic of json.topics ?? []) {
      const count = topic.conceptIds?.length ?? 0;
      bump(counts, count);
      if (count < 2 || count > 3) failures.push(`${file}: topic ${topic.topicId ?? "(missing id)"} has ${count} concepts`);
    }
  }

  assert(failures.length === 0, `generated topic grain violations:\n${failures.join("\n")}`);
  return counts;
}

async function main() {
  const testsDir = dirname(fileURLToPath(import.meta.url));
  const appRoot = join(testsDir, "..");
  const repoRoot = join(appRoot, "..", "..");

  const sourceCounts = validateSourceTopics(join(repoRoot, "temple"));
  const generatedCounts = validateGeneratedTopics(join(appRoot, "src/lib/knowledge-graph/data"));

  process.stdout.write(
    `[topic-grain.unit] source ${formatCounts(sourceCounts)}; generated ${formatCounts(generatedCounts)}; ${basename(repoRoot)} OK\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`[topic-grain.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
