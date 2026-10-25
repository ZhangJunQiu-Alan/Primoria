import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { imageCacheKey, type ImageBrief } from "../../src/lib/ai/media/image-brief";
import { getTopicGraph, listTopicGraphIds } from "../../src/lib/knowledge-graph/topic-graph";

async function main() {
const root = resolve(__dirname, "../../../..");
const directory = resolve(root, ".private/image-prewarm/en");
await mkdir(directory, { recursive: true });
const rows = [];
const ids = new Set<string>();
for (const graphId of listTopicGraphIds()) {
  const graph = getTopicGraph(graphId);
  const source = JSON.parse(await readFile(resolve(root, `data/knowledge-graphs/source/${graphId}.json`), "utf8"));
  const sourceConcepts = new Map<string, { description?: string }>(source.nodes.filter((node: { kind: string }) => node.kind === "concept").map((node: { id: string }) => [node.id, node]));
  let count = 0;
  for (const topic of graph.topics) {
    for (const concept of topic.conceptIds) {
      if (ids.has(concept.conceptId)) throw new Error(`Duplicate concept: ${concept.conceptId}`);
      ids.add(concept.conceptId);
      const brief: ImageBrief = {
        conceptIds: [concept.conceptId], language: "en", imageKind: "educational_illustration",
        learningGoal: `Understand ${concept.name} in ${topic.name}.`,
        prompt: "", alt: "", caption: "",
      };
      rows.push({
        conceptId: concept.conceptId, graphId, graphTitle: graph.subject,
        graphReviewStatus: graph.reviewStatus ?? "approved", topicId: topic.topicId,
        topicName: topic.name, name: concept.name, nameZh: concept.nameZh,
        description: sourceConcepts.get(concept.conceptId)?.description ?? "",
        visual: concept.visual, visualHint: concept.visualHint,
        cacheKey: imageCacheKey(brief), brief,
      });
      count += 1;
    }
  }
  console.log(`${graphId}: ${count}`);
}
if (rows.length !== 1456 || ids.size !== 1456) throw new Error(`Expected 1456 concepts; got ${rows.length}`);
await writeFile(resolve(directory, "concepts.en.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
await writeFile(resolve(directory, "run.json"), JSON.stringify({
  language: "en", targetCount: rows.length, generationMethod: "built-in image_gen",
  visualReference: "candidates/cn_sh_bio_plasma_membrane_functions.v2.png",
  authorization: "2026-10-24: generate all English concept images, then import to Supabase",
  importPolicy: "Wait until the complete English set is generated and quality-reviewed; preserve existing cache entries",
}, null, 2) + "\n");
console.log(`Exported ${rows.length} unique concepts to ${directory}`);
}

main().catch(() => { console.error("Concept export failed; no cloud state was changed."); process.exitCode = 1; });
