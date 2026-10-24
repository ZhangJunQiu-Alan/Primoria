import { and, eq } from "drizzle-orm";

import { ContextError, IrParseError, LeaseLostError } from "../ai/course-generation/generation-errors";
import { createUtilityModel } from "../ai/deepagent/model";
import { getDb } from "../db/client";
import { learningMaterials, materialSubgraphs } from "../db/schema";
import { toLectureSubgraph, type LectureSubgraph } from "./folder-graph";
import { assembleState, loadFolderLectures, rebuildFolderGraph } from "./folder-graph-store";
import { completeLectureKgJobTx, setMaterialKgStatus, type LectureKgClaim, type LectureKgFence } from "./lecture-kg-jobs";
import {
  buildLectureOrderUserPrompt,
  LECTURE_ORDER_SYSTEM_PROMPT,
  parseLectureOrder,
  positionAfter,
  type LectureOutline,
} from "./lecture-order";
import {
  buildLectureGraphUserPrompt,
  buildMaterialDigest,
  LECTURE_GRAPH_SYSTEM_PROMPT,
  parseMaterialGraph,
  type ExistingConcept,
} from "./material-graph";
import { defaultMaterialGraphInvoker, MATERIAL_GRAPH_TIMEOUT_MS, type MaterialGraphModelInvoker } from "./material-graph-store";
import { listMaterialChunks } from "./store";

// One claimed lecture KG job: small KG for the lecture (with the folder's
// existing concepts so the model can merge instead of duplicating), an AI
// position when the file name gave none, then — in one fenced transaction —
// the subgraph, the position, the file status, and the re-assembled folder graph.

export type LectureKgDeps = {
  invokeGraph: MaterialGraphModelInvoker;
  invokeOrder: (input: { system: string; user: string }) => Promise<string>;
};

const defaultOrderInvoker: LectureKgDeps["invokeOrder"] = async ({ system, user }) => {
  const model = createUtilityModel({}, { maxTokens: 64, timeoutMs: 20_000 });
  const response = await model.invoke([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
};

export const defaultLectureKgDeps: LectureKgDeps = { invokeGraph: defaultMaterialGraphInvoker, invokeOrder: defaultOrderInvoker };

export type LectureKgOutcome = { materialId: string; folderId: string; status: "ready" | "skipped"; concepts: number; merged: number; reordered: boolean };

const MAX_EXISTING_CONCEPTS = 300;

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`lecture graph timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function conceptNames(subgraph: LectureSubgraph | undefined): string[] {
  return (subgraph?.topics ?? []).flatMap((topic) => topic.concepts.map((concept) => concept.nameZh || concept.name));
}

async function finishSkipped(claim: LectureKgClaim, fence: LectureKgFence, materialId: string, folderId: string): Promise<LectureKgOutcome> {
  await getDb().transaction(async (tx) => {
    await setMaterialKgStatus(tx, claim.job.ownerId, materialId, "skipped");
    if (!(await completeLectureKgJobTx(tx, fence))) throw new LeaseLostError("lease lost before skipping lecture KG job");
  });
  return { materialId, folderId, status: "skipped", concepts: 0, merged: 0, reordered: false };
}

export async function processLectureKgJob(claim: LectureKgClaim, deps: LectureKgDeps = defaultLectureKgDeps): Promise<LectureKgOutcome> {
  const { ownerId, materialId } = claim.job;
  const fence: LectureKgFence = { jobId: claim.job.id, workerId: claim.workerId, leaseToken: claim.leaseToken };
  const [material] = await getDb()
    .select()
    .from(learningMaterials)
    .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)))
    .limit(1);
  if (!material) throw new ContextError(`material ${materialId} no longer exists`);

  const state = await loadFolderLectures(ownerId, material.folderId);
  if (!state || state.folder.kind !== "subject" || material.role !== "lecture") {
    return finishSkipped(claim, fence, materialId, material.folderId);
  }

  // Existing folder concepts (this lecture excluded), labelled K1… in order.
  const existing = assembleState(state, materialId);
  const titleById = new Map(state.materials.map((entry) => [entry.id, entry.title]));
  const existingConcepts: ExistingConcept[] = [];
  const conceptIdByLabel = new Map<string, string>();
  for (const topic of existing.graph.topics) {
    for (const concept of topic.conceptIds) {
      if (existingConcepts.length >= MAX_EXISTING_CONCEPTS) break;
      const label = `K${existingConcepts.length + 1}`;
      conceptIdByLabel.set(label, concept.conceptId);
      existingConcepts.push({
        label,
        name: concept.name,
        nameZh: concept.nameZh ?? null,
        lecture: titleById.get(existing.conceptLecture[concept.conceptId]) ?? "",
      });
    }
  }

  const chunks = await listMaterialChunks(ownerId, [materialId]);
  const digest = buildMaterialDigest([{ id: material.id, title: material.title }], chunks);
  if (digest.refsByIndex.length === 0) throw new ContextError(`material ${materialId} has no chunks`);
  const language = material.language === "zh" ? "zh" : "en";
  const text = await withTimeout(
    (signal) => deps.invokeGraph({ system: LECTURE_GRAPH_SYSTEM_PROMPT, user: buildLectureGraphUserPrompt(digest, language, existingConcepts), signal }),
    MATERIAL_GRAPH_TIMEOUT_MS,
  );
  const raw = parseMaterialGraph(text, digest.refsByIndex);
  if (!raw) throw new IrParseError(`lecture graph for ${materialId} was not a grounded graph`);
  const subgraph = toLectureSubgraph(raw, conceptIdByLabel);

  // A file whose name carried no lecture number gets an AI position, unless
  // the learner already ordered this folder (orderSource would be "manual").
  let position: number | null = null;
  if (material.orderSource === "upload") {
    const others = state.materials.filter((entry) => entry.id !== materialId && entry.role === "lecture");
    if (others.length > 0) {
      try {
        const outlines: LectureOutline[] = others.map((entry) => ({ title: entry.title, concepts: conceptNames(state.subgraphs.get(entry.id)) }));
        const answer = await deps.invokeOrder({
          system: LECTURE_ORDER_SYSTEM_PROMPT,
          user: buildLectureOrderUserPrompt(outlines, { title: material.title, concepts: conceptNames(subgraph) }),
        });
        const after = parseLectureOrder(answer, others.length);
        if (after !== null) position = positionAfter(others.map((entry) => entry.position), after);
      } catch (error) {
        console.warn("[lecture-kg] AI ordering skipped:", error instanceof Error ? error.message : error);
      }
    }
  }

  await getDb().transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(materialSubgraphs)
      .values({ materialId, ownerId, folderId: material.folderId, graph: subgraph, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: materialSubgraphs.materialId, set: { folderId: material.folderId, graph: subgraph, updatedAt: now } });
    await tx
      .update(learningMaterials)
      .set({ kgStatus: "ready", ...(position !== null ? { position, orderSource: "ai" } : {}), updatedAt: now })
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)));
    await rebuildFolderGraph(ownerId, material.folderId, tx);
    if (!(await completeLectureKgJobTx(tx, fence))) throw new LeaseLostError("lease lost before publishing lecture KG");
  });

  const concepts = subgraph.topics.reduce((total, topic) => total + topic.concepts.length, 0);
  const merged = subgraph.topics.reduce((total, topic) => total + topic.concepts.filter((concept) => concept.sameAs).length, 0);
  return { materialId, folderId: material.folderId, status: "ready", concepts, merged, reordered: position !== null };
}
