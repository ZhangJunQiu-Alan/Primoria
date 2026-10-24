import { and, eq } from "drizzle-orm";

import { createUtilityModel } from "../ai/deepagent/model";
import { getDb } from "../db/client";
import { materialTopicGraphs, type LearningMaterialRow } from "../db/schema";
import type { TopicGraph } from "../knowledge-graph/topic-graph";
import {
  buildMaterialDigest,
  buildMaterialGraphUserPrompt,
  MATERIAL_GRAPH_SYSTEM_PROMPT,
  materialGraphId,
  parseMaterialGraph,
  toMaterialTopicGraph,
} from "./material-graph";
import { listMaterialChunks } from "./store";
import type { MaterialChunkRef } from "./types";

// Reuse-or-build for owner-private material graphs. Unlike gen_* graphs
// (shared by normalized topic across users), a row here is keyed by owner +
// material set and is only ever read back with the same owner id.

export const MATERIAL_GRAPH_TIMEOUT_MS = 120_000;

export type MaterialGraphRecord = {
  graphId: string;
  ownerId: string;
  materialIds: string[];
  title: string;
  language: string | null;
  graph: TopicGraph;
  conceptSources: Record<string, MaterialChunkRef[]>;
};

export type MaterialGraphModelInvoker = (input: { system: string; user: string; signal?: AbortSignal }) => Promise<string>;

export const defaultMaterialGraphInvoker: MaterialGraphModelInvoker = async ({ system, user, signal }) => {
  const model = createUtilityModel({}, { maxTokens: 8192, timeoutMs: MATERIAL_GRAPH_TIMEOUT_MS });
  const response = await model.invoke(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { signal },
  );
  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
};

function toRecord(row: typeof materialTopicGraphs.$inferSelect): MaterialGraphRecord {
  return {
    graphId: row.graphId,
    ownerId: row.ownerId,
    materialIds: row.materialIds,
    title: row.title,
    language: row.language,
    graph: row.graph as TopicGraph,
    conceptSources: (row.conceptSources ?? {}) as Record<string, MaterialChunkRef[]>,
  };
}

export async function getMaterialGraph(graphId: string, ownerId: string): Promise<MaterialGraphRecord | null> {
  const rows = await getDb()
    .select()
    .from(materialTopicGraphs)
    .where(and(eq(materialTopicGraphs.graphId, graphId), eq(materialTopicGraphs.ownerId, ownerId)))
    .limit(1);
  return rows[0] ? toRecord(rows[0]) : null;
}

export type MaterialGraphResult = { record: MaterialGraphRecord; created: boolean };

/** Returns null when the model cannot produce a grounded, teachable graph. */
export async function getOrCreateMaterialGraph(
  input: { ownerId: string; materials: LearningMaterialRow[]; language: "zh" | "en" },
  invokeModel: MaterialGraphModelInvoker = defaultMaterialGraphInvoker,
  timeoutMs = MATERIAL_GRAPH_TIMEOUT_MS,
): Promise<MaterialGraphResult | null> {
  const { ownerId, materials, language } = input;
  const materialIds = materials.map((material) => material.id);
  const graphId = materialGraphId(ownerId, materialIds);

  const existing = await getMaterialGraph(graphId, ownerId);
  if (existing) return { record: existing, created: false };

  const chunks = await listMaterialChunks(ownerId, materialIds);
  const digest = buildMaterialDigest(materials.map((material) => ({ id: material.id, title: material.title })), chunks);
  if (digest.refsByIndex.length === 0) return null;

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let text: string;
  try {
    text = await Promise.race([
      invokeModel({ system: MATERIAL_GRAPH_SYSTEM_PROMPT, user: buildMaterialGraphUserPrompt(digest, language), signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(`Material graph timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    console.warn("[material-graph] generation failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  const raw = parseMaterialGraph(text, digest.refsByIndex);
  if (!raw) {
    console.warn(`[material-graph] model output was not a grounded graph (graph=${graphId})`);
    return null;
  }
  const { graph, conceptSources } = toMaterialTopicGraph(raw, graphId);

  const now = new Date();
  const [inserted] = await getDb()
    .insert(materialTopicGraphs)
    .values({
      graphId,
      ownerId,
      materialIds,
      title: graph.subject,
      language,
      graph,
      conceptSources,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: materialTopicGraphs.graphId })
    .returning();
  if (inserted) return { record: toRecord(inserted), created: true };

  // A concurrent build for the same owner + material set won the insert.
  const raced = await getMaterialGraph(graphId, ownerId);
  if (!raced) throw new Error("material graph insert conflicted without a readable row");
  return { record: raced, created: false };
}
