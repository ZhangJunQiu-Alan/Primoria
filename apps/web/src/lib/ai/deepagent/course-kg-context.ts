// Pure knowledge-graph course-context helper. No server-only imports, so it is
// safe to import from both the server course generator and client components
// (e.g. the /debug/pipeline inspector).

import type { ConceptVisual } from "../../knowledge-graph/topic-graph";
import type { FactCategory, KnowledgeBackground } from "../../learner-profile/types";
import type { MasteryStatus } from "../../mastery/store";

export type CourseContextConcept = {
  conceptId: string;
  name: string;
  defaultOrder: number;
  // Optional KG visualization affordance + one-line hint; drives the lesson
  // planner's per-concept visual requirement (absent = no forced visual).
  visual?: ConceptVisual;
  visualHint?: string;
  // Global reverse-PageRank importance (0..1, max-normalized) over the whole KG.
  // High = many later concepts depend on this one; signals the planner to teach
  // it thoroughly. Absent = uncomputed. Distinct from defaultOrder (sequence).
  centrality?: number;
  // Learner's prior mastery of this concept (from user_concept_mastery). Absent
  // = no record yet → treat as first-time learning. Shapes teaching DEPTH only;
  // coverage and mandated visual/quiz blocks are unaffected.
  mastery?: MasteryStatus;
  // Authored one-line rationale for why this concept follows an earlier concept in
  // the same lesson (from the KG prereq edge landing on it). Lets the planner
  // motivate the ordering. Absent = no authored rationale.
  prereqReason?: string;
};

// A concept at/above this max-normalized centrality is "core": load-bearing
// across the KG (~top 6% of concepts). Marked in the planner prompt so
// foundational concepts get thorough teaching. Tunable single source.
export const KG_CORE_CENTRALITY = 0.3;

export type CourseContextTopic = {
  topicId: string;
  name: string;
  concepts: CourseContextConcept[];
};

export type CourseContext = {
  learningPathType: "linear";
  graphId: string;
  startTopic: CourseContextTopic;
  targetConceptId: string | null;
  nextTopic: CourseContextTopic | null;
  // Learner's content language (e.g. "zh", "en"), carried from the course so
  // generated lesson prose matches the language of their original topic prompt.
  language?: string | null;
  // First-run onboarding signal. It controls teaching depth, not topic coverage.
  knowledgeBackground?: KnowledgeBackground | null;
  // Distilled learner facts (preference / prior_knowledge / learning_gap) that
  // personalize HOW the Planner designs this lesson. Already filtered + capped by
  // the loader; the Planner bakes them into each block's writerInstruction.
  facts?: { text: string; category: FactCategory }[];
  // Subject-level code-teaching allowance decided at graph level (generated
  // graphs carry codeAdapted from their creation-time LLM judgment). true lets
  // the plan include code blocks without matching code-eligibility.ts patterns.
  codeEligible?: boolean;
};

// Explicit content-language directive for generation prompts. KG topic/concept
// names are English for indexing, so prompts must NOT infer language from them —
// they must follow the learner's detected language instead.
export function languageDirective(language?: string | null): string {
  const lang = (language ?? "").trim().toLowerCase();
  if (/^zh\b|^zh[-_]|chinese|中文/.test(lang)) {
    return "Write ALL learner-facing content (titles, prose, questions, explanations) in Simplified Chinese (简体中文). The topic and concept names below are in English for indexing only — do NOT let them dictate the output language. Keep code, symbols, and standard technical terms as-is.";
  }
  return "Write ALL learner-facing content in English.";
}

// Compact knowledge-graph hint appended to the lesson prompt: the start topic's
// concepts (with default order), an optional target concept to emphasize, and
// the next topic only as preview context. Each generation call produces exactly
// one lesson for the start topic; later topics remain lazy outline nodes.
export function buildKgContextPrompt(kg?: CourseContext): string {
  if (!kg?.startTopic) return "";
  const isCore = (c: CourseContextConcept) =>
    typeof c.centrality === "number" && c.centrality >= KG_CORE_CENTRALITY;
  const fmtTopic = (t: CourseContextTopic) => {
    const list = (t.concepts ?? [])
      .map((c) => `${c.defaultOrder}. ${c.name} (${c.conceptId})${isCore(c) ? " [core]" : ""}`)
      .join("; ");
    return `${t.name} (${t.topicId})${list ? ` — concepts: ${list}` : ""}`;
  };

  const lines = [
    "Knowledge graph linear learning path (follow it exactly):",
    `Start topic: ${fmtTopic(kg.startTopic)}`,
  ];
  if ((kg.startTopic.concepts ?? []).some(isCore)) {
    lines.push(
      "Concepts marked [core] are foundational — many later concepts depend on them; teach them thoroughly and do not rush.",
    );
  }
  const rationale = (kg.startTopic.concepts ?? []).filter((c) => c.prereqReason);
  if (rationale.length > 0) {
    lines.push("Why this order (use it to motivate transitions, do not quote verbatim):");
    for (const c of rationale) lines.push(`- ${c.name}: ${c.prereqReason}`);
  }
  if (kg.targetConceptId) {
    lines.push(`The learner is aiming at concept ${kg.targetConceptId} — make the first lesson center on it.`);
  }
  if (kg.nextTopic) {
    lines.push(`Next topic: ${fmtTopic(kg.nextTopic)}`);
    lines.push(
      "Generate exactly ONE lesson for the start topic. The next topic is preview context only: do not teach its concepts now, and mention it only in the final closure block.",
    );
  } else {
    lines.push("This is a leaf topic — generate exactly ONE lesson covering the start topic's concepts.");
  }
  return lines.join("\n");
}
