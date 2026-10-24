import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import {
  folderQuizAnswers,
  folderQuizQuestions,
  folderQuizSessions,
  learningMaterials,
  materialFolders,
  type FolderQuizQuestionRow,
} from "../db/schema";
import { applyMasteryProgression } from "../gamification/store";
import { resolveKgDisplayName } from "../knowledge-graph/display-name";
import { listConceptMasteryByOwner, masteryTableFor, upsertConceptMasteryByOwner } from "../mastery/owner-store";
import { computeRollingMasteryUpdates, type RollingEvidence } from "../mastery/rules";
import type { MasteryStatus } from "../mastery/store";
import { getUserPreferences } from "../settings/user-settings";
import { folderGraphId } from "./folder-graph";
import { assembleState, loadFolderLectures, majorityLanguage } from "./folder-graph-store";
import {
  allocateQuiz,
  buildFolderQuizUserPrompt,
  FOLDER_QUIZ_GENERATOR_VERSION,
  FOLDER_QUIZ_SYSTEM_PROMPT,
  parseFolderQuiz,
  seededRandom,
  shuffleChoices,
  type FolderQuizItem,
  type FolderQuizMasteryChange,
  type FolderQuizOutcome,
  type FolderQuizResult,
  type FolderQuizStart,
  type QuizGenerationConcept,
} from "./folder-quiz";
import { conceptSourceRefs, selectExcerptEntries } from "./grounding";
import { defaultMaterialGraphInvoker, type MaterialGraphModelInvoker } from "./material-graph-store";
import { getChunkLocators, getChunksByRefs } from "./store";
import type { MaterialChunkRef } from "./types";

// Start and submit subject-folder quizzes (docs/product/subject-folders.md
// §4.5, §5). Generation is one bounded model call per start, only for the
// concepts whose unanswered bank ran dry; submit is idempotent and applies the
// rolling-window mastery rule under a per-folder lock.

export type FolderQuizErrorCode =
  | "folder_not_found"
  | "no_graph"
  | "generation_failed"
  | "session_not_found"
  | "already_submitted"
  | "idempotency_conflict"
  | "invalid_answers";

export class FolderQuizError extends Error {
  constructor(readonly code: FolderQuizErrorCode, message: string) {
    super(message);
    this.name = "FolderQuizError";
  }
}

const QUIZ_GENERATION_TIMEOUT_MS = 90_000;
const QUIZ_EXCERPT_BUDGET_CHARS = 24_000;
const QUIZ_CONCEPT_EXCERPT_CHARS = 3_000;

const randomId = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}${Date.now().toString(36)}`;

export type FolderQuizDeps = { invoke: MaterialGraphModelInvoker; random?: () => number; sessionId?: string };

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`folder quiz generation timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Settings content language, else the folder material's majority language. */
function quizLanguage(preferred: string, fallback: "zh" | "en"): "zh" | "en" {
  return preferred === "zh" || preferred === "en" ? preferred : fallback;
}

export async function startFolderQuiz(
  input: { ownerId: string; folderId: string; size: number },
  deps: FolderQuizDeps = { invoke: defaultMaterialGraphInvoker },
): Promise<FolderQuizStart> {
  const { ownerId, folderId, size } = input;
  const state = await loadFolderLectures(ownerId, folderId);
  if (!state || state.folder.kind !== "subject") throw new FolderQuizError("folder_not_found", "Folder not found.");
  const assembled = assembleState(state);
  const concepts = assembled.graph.topics.flatMap((topic) => topic.conceptIds);
  if (concepts.length === 0) throw new FolderQuizError("no_graph", "This folder has no analyzed lectures yet.");

  const graphId = folderGraphId(folderId);
  const sessionId = deps.sessionId ?? randomId("fqs");
  const random = deps.random ?? seededRandom(sessionId);
  const [preferences, mastery] = await Promise.all([getUserPreferences(ownerId), listConceptMasteryByOwner(ownerId, graphId)]);
  const language = quizLanguage(preferences.contentLanguage, majorityLanguage(state.materials));
  const status = new Map<string, MasteryStatus>(mastery.map((row) => [row.conceptId, row.status]));
  const allocation = allocateQuiz(
    concepts.map((concept) => ({ conceptId: concept.conceptId, status: status.get(concept.conceptId) ?? "untested" })),
    size,
    random,
  );
  const allocatedIds = [...allocation.keys()];

  // The bank for these concepts, oldest first, with whether the learner has
  // already answered each question.
  const bank = await getDb()
    .select({
      question: folderQuizQuestions,
      answered: sql<boolean>`exists (select 1 from folder_quiz_answers a where a.owner_id = ${folderQuizQuestions.ownerId} and a.question_id = ${folderQuizQuestions.id})`,
    })
    .from(folderQuizQuestions)
    .where(and(
      eq(folderQuizQuestions.ownerId, ownerId),
      eq(folderQuizQuestions.folderId, folderId),
      eq(folderQuizQuestions.language, language),
      inArray(folderQuizQuestions.conceptId, allocatedIds),
    ))
    .orderBy(asc(folderQuizQuestions.createdAt));
  const fresh = new Map<string, FolderQuizQuestionRow[]>();
  const known = new Map<string, string[]>();
  for (const { question, answered } of bank) {
    known.set(question.conceptId, [...(known.get(question.conceptId) ?? []), question.question]);
    if (!answered) fresh.set(question.conceptId, [...(fresh.get(question.conceptId) ?? []), question]);
  }

  const conceptById = new Map(concepts.map((concept) => [concept.conceptId, concept]));
  const deficits = allocatedIds
    .map((conceptId) => ({ conceptId, count: (allocation.get(conceptId) ?? 0) - (fresh.get(conceptId)?.length ?? 0) }))
    .filter((entry) => entry.count > 0);
  if (deficits.length > 0) {
    const generated = await generateQuestions({ ownerId, folderId, language, state, assembled, deficits, known, conceptById, deps, random });
    for (const row of generated) fresh.set(row.conceptId, [...(fresh.get(row.conceptId) ?? []), row]);
  }

  // Questions grouped in KG order, so a quiz reads lecture by lecture.
  const titleById = new Map(state.materials.map((material) => [material.id, material.title]));
  const picked: { row: FolderQuizQuestionRow; item: FolderQuizItem }[] = [];
  for (const concept of concepts) {
    const wanted = allocation.get(concept.conceptId) ?? 0;
    for (const row of (fresh.get(concept.conceptId) ?? []).slice(0, wanted)) {
      picked.push({
        row,
        item: {
          questionId: row.id,
          conceptId: concept.conceptId,
          conceptName: resolveKgDisplayName(concept, language),
          lectureTitle: titleById.get(assembled.conceptLecture[concept.conceptId]) ?? "",
        },
      });
    }
  }
  if (picked.length === 0) throw new FolderQuizError("generation_failed", "No quiz questions could be prepared.");

  await getDb().insert(folderQuizSessions).values({
    id: sessionId,
    ownerId,
    folderId,
    graphId,
    size,
    items: picked.map((entry) => entry.item),
    createdAt: new Date(),
  });
  return {
    sessionId,
    size,
    questions: picked.map(({ row, item }) => ({ ...item, question: row.question, choices: row.choices as { id: string; text: string }[] })),
  };
}

async function generateQuestions(input: {
  ownerId: string;
  folderId: string;
  language: "zh" | "en";
  state: NonNullable<Awaited<ReturnType<typeof loadFolderLectures>>>;
  assembled: ReturnType<typeof assembleState>;
  deficits: { conceptId: string; count: number }[];
  known: Map<string, string[]>;
  conceptById: Map<string, { conceptId: string; name: string; nameZh?: string | null; assessmentHint?: string }>;
  deps: FolderQuizDeps;
  random: () => number;
}): Promise<FolderQuizQuestionRow[]> {
  const { ownerId, folderId, language, state, assembled, deficits, known, conceptById, deps, random } = input;
  const conceptIds = deficits.map((entry) => entry.conceptId);
  const refs = conceptIds.flatMap((id) => assembled.conceptSources[id] ?? []);
  const chunks = await getChunksByRefs(ownerId, refs);
  const entries = selectExcerptEntries({
    conceptIds,
    conceptSources: assembled.conceptSources,
    chunks,
    materialTitles: new Map(state.materials.map((material) => [material.id, material.title])),
    language,
    budget: QUIZ_EXCERPT_BUDGET_CHARS,
    conceptBudget: QUIZ_CONCEPT_EXCERPT_CHARS,
  });
  // A concept without any excerpt cannot be grounded, so it gets no question.
  const grounded = new Set(entries.flatMap((entry) => entry.excerpt.conceptIds));
  const concepts: QuizGenerationConcept[] = deficits
    .filter((entry) => grounded.has(entry.conceptId))
    .map((entry, index) => {
      const concept = conceptById.get(entry.conceptId)!;
      return {
        label: `C${index + 1}`,
        conceptId: entry.conceptId,
        name: concept.name,
        nameZh: concept.nameZh ?? null,
        ...(concept.assessmentHint ? { assessmentHint: concept.assessmentHint } : {}),
        count: entry.count,
        existing: known.get(entry.conceptId) ?? [],
      };
    });
  if (concepts.length === 0) return [];

  let text: string;
  try {
    text = await withTimeout(
      (signal) => deps.invoke({
        system: FOLDER_QUIZ_SYSTEM_PROMPT,
        user: buildFolderQuizUserPrompt({ language, concepts, excerpts: entries.map((entry) => entry.excerpt) }),
        signal,
      }),
      QUIZ_GENERATION_TIMEOUT_MS,
    );
  } catch (error) {
    console.warn("[folder-quiz] generation failed:", error instanceof Error ? error.message : error);
    return [];
  }
  const refsByLabel = new Map(entries.map((entry) => [entry.excerpt.label, { ref: entry.ref, conceptIds: entry.excerpt.conceptIds }]));
  const questions = parseFolderQuiz(text, concepts, refsByLabel);
  if (questions.length === 0) {
    console.warn(`[folder-quiz] model output had no usable questions (folder=${folderId})`);
    return [];
  }
  const now = new Date();
  const rows = questions.map((question) => {
    const { choices, correctId } = shuffleChoices(question.choices, question.answerIndex, random);
    return {
      id: randomId("fqq"),
      ownerId,
      folderId,
      conceptId: question.conceptId,
      language,
      question: question.question,
      choices,
      correctId,
      explanation: question.explanation,
      sources: question.refs,
      generatorVersion: FOLDER_QUIZ_GENERATOR_VERSION,
      createdAt: now,
    };
  });
  return getDb().insert(folderQuizQuestions).values(rows).returning();
}

export type SubmittedAnswer = { questionId: string; selectedId: string };

const fingerprint = (answers: SubmittedAnswer[]) =>
  JSON.stringify([...answers].sort((a, b) => a.questionId.localeCompare(b.questionId)).map((a) => [a.questionId, a.selectedId]));

type StoredResults = { results: FolderQuizResult[]; masteryChanges: FolderQuizMasteryChange[] };

export async function submitFolderQuiz(input: {
  ownerId: string;
  folderId: string;
  sessionId: string;
  submissionId: string;
  answers: SubmittedAnswer[];
}): Promise<FolderQuizOutcome & { replayed: boolean }> {
  const { ownerId, folderId, sessionId, submissionId, answers } = input;

  // Immutable inputs are read before the transaction: the session's items,
  // their questions, and the source locators shown with each answer.
  const [session] = await getDb()
    .select()
    .from(folderQuizSessions)
    .where(and(eq(folderQuizSessions.id, sessionId), eq(folderQuizSessions.ownerId, ownerId), eq(folderQuizSessions.folderId, folderId)))
    .limit(1);
  if (!session) throw new FolderQuizError("session_not_found", "Quiz not found.");
  const items = session.items as FolderQuizItem[];
  const itemIds = new Set(items.map((item) => item.questionId));
  const seen = new Set<string>();
  for (const answer of answers) {
    if (!itemIds.has(answer.questionId) || seen.has(answer.questionId)) {
      throw new FolderQuizError("invalid_answers", "Unknown or duplicate quiz question.");
    }
    seen.add(answer.questionId);
  }
  const questionRows = await getDb()
    .select()
    .from(folderQuizQuestions)
    .where(and(eq(folderQuizQuestions.ownerId, ownerId), inArray(folderQuizQuestions.id, [...itemIds])));
  const questionById = new Map(questionRows.map((row) => [row.id, row]));
  const allRefs = questionRows.flatMap((row) => row.sources as MaterialChunkRef[]);
  const sourceMaterialIds = [...new Set(allRefs.map((ref) => ref.materialId))];
  const [locators, materials, preferences] = await Promise.all([
    getChunkLocators(ownerId, allRefs),
    sourceMaterialIds.length
      ? getDb()
          .select({ id: learningMaterials.id, title: learningMaterials.title })
          .from(learningMaterials)
          .where(and(eq(learningMaterials.ownerId, ownerId), inArray(learningMaterials.id, sourceMaterialIds)))
      : Promise.resolve([]),
    getUserPreferences(ownerId),
  ]);
  const locatorByKey = new Map(locators.map((chunk) => [`${chunk.materialId}#${chunk.ordinal}`, chunk]));
  const materialTitles = new Map(materials.map((material) => [material.id, material.title]));

  return getDb().transaction(async (tx) => {
    // One submission per folder at a time: the rolling window and the
    // first-attempt flags must see every earlier submission.
    const [folder] = await tx
      .select({ id: materialFolders.id })
      .from(materialFolders)
      .where(and(eq(materialFolders.ownerId, ownerId), eq(materialFolders.id, folderId)))
      .for("update");
    const [locked] = folder
      ? await tx.select().from(folderQuizSessions).where(eq(folderQuizSessions.id, sessionId)).for("update")
      : [];
    if (!locked) throw new FolderQuizError("session_not_found", "Quiz not found.");
    if (locked.status === "submitted") {
      if (locked.submissionId !== submissionId) throw new FolderQuizError("already_submitted", "This quiz was already submitted.");
      if (fingerprint((locked.answers ?? []) as SubmittedAnswer[]) !== fingerprint(answers)) {
        throw new FolderQuizError("idempotency_conflict", "Submission ID was already used for different answers.");
      }
      const stored = locked.results as StoredResults;
      return { sessionId, score: locked.score ?? 0, total: locked.total ?? items.length, ...stored, replayed: true };
    }

    const selectedById = new Map(answers.map((answer) => [answer.questionId, answer.selectedId]));
    const answeredIds = items.map((item) => item.questionId).filter((id) => selectedById.has(id) && questionById.has(id));
    const prior = answeredIds.length
      ? await tx
          .select({ questionId: folderQuizAnswers.questionId })
          .from(folderQuizAnswers)
          .where(and(eq(folderQuizAnswers.ownerId, ownerId), eq(folderQuizAnswers.firstAttempt, true), inArray(folderQuizAnswers.questionId, answeredIds)))
      : [];
    const answeredBefore = new Set(prior.map((row) => row.questionId));

    const now = new Date();
    const results: FolderQuizResult[] = [];
    const answerRows: (typeof folderQuizAnswers.$inferInsert)[] = [];
    const newWrong = new Set<string>();
    items.forEach((item, ordinal) => {
      const question = questionById.get(item.questionId);
      if (!question) return;
      const selectedId = selectedById.get(item.questionId) ?? null;
      const correct = selectedId === question.correctId;
      const firstAttempt = selectedId !== null && !answeredBefore.has(item.questionId);
      if (selectedId !== null) {
        answerRows.push({
          sessionId,
          questionId: item.questionId,
          ownerId,
          graphId: session.graphId,
          conceptId: item.conceptId,
          ordinal,
          selectedId,
          isCorrect: correct,
          firstAttempt,
          createdAt: now,
        });
        if (firstAttempt && !correct) newWrong.add(item.conceptId);
      }
      results.push({
        questionId: item.questionId,
        conceptId: item.conceptId,
        selectedId,
        correctId: question.correctId,
        correct,
        explanation: question.explanation,
        sources: conceptSourceRefs({
          refs: question.sources as MaterialChunkRef[],
          chunks: locatorByKey,
          materialTitles,
          language: question.language === "zh" ? "zh" : "en",
        }),
        firstAttempt,
      });
    });
    if (answerRows.length) await tx.insert(folderQuizAnswers).values(answerRows);

    // Rolling window over first attempts only (this submission included).
    const evidenceConcepts = [...new Set(answerRows.filter((row) => row.firstAttempt).map((row) => row.conceptId))];
    const masteryChanges: FolderQuizMasteryChange[] = [];
    if (evidenceConcepts.length > 0) {
      const windowRows = await tx
        .select({ conceptId: folderQuizAnswers.conceptId, isCorrect: folderQuizAnswers.isCorrect })
        .from(folderQuizAnswers)
        .where(and(
          eq(folderQuizAnswers.ownerId, ownerId),
          eq(folderQuizAnswers.graphId, session.graphId),
          eq(folderQuizAnswers.firstAttempt, true),
          inArray(folderQuizAnswers.conceptId, evidenceConcepts),
        ))
        .orderBy(desc(folderQuizAnswers.createdAt), desc(folderQuizAnswers.ordinal));
      const evidence = new Map<string, RollingEvidence>(
        evidenceConcepts.map((conceptId) => [conceptId, { recent: [], newWrong: newWrong.has(conceptId) }]),
      );
      for (const row of windowRows) evidence.get(row.conceptId)?.recent.push(row.isCorrect);

      const table = masteryTableFor(session.graphId);
      const currentRows = await tx
        .select({ conceptId: table.conceptId, status: table.status })
        .from(table)
        .where(and(eq(table.ownerId, ownerId), eq(table.graphId, session.graphId), inArray(table.conceptId, evidenceConcepts)));
      const current = new Map(currentRows.map((row) => [row.conceptId, row.status as MasteryStatus]));
      const nameById = new Map(items.map((item) => [item.conceptId, item.conceptName]));
      for (const update of computeRollingMasteryUpdates(evidence, current)) {
        const previous = current.get(update.conceptId);
        await upsertConceptMasteryByOwner(ownerId, session.graphId, update.conceptId, update.status, update.score, tx);
        await applyMasteryProgression(tx, {
          ownerId,
          graphId: session.graphId,
          conceptId: update.conceptId,
          sourceId: sessionId,
          previousStatus: previous,
          nextStatus: update.status,
          timeZone: preferences.timeZone,
          occurredAt: now,
        });
        if ((previous ?? "untested") !== update.status) {
          masteryChanges.push({ conceptId: update.conceptId, conceptName: nameById.get(update.conceptId) ?? "", from: previous ?? "untested", to: update.status });
        }
      }
    }

    const score = results.filter((result) => result.correct).length;
    const total = items.length;
    const stored: StoredResults = { results, masteryChanges };
    await tx
      .update(folderQuizSessions)
      .set({ status: "submitted", submissionId, answers, score, total, results: stored, submittedAt: now })
      .where(eq(folderQuizSessions.id, sessionId));
    return { sessionId, score, total, ...stored, replayed: false };
  });
}
