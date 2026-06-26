// Pure knowledge-graph course-context helper. No server-only imports, so it is
// safe to import from both the server course generator and client components
// (e.g. the /debug/pipeline inspector).

import type { ConceptVisual } from "../../knowledge-graph/topic-graph";
import type { MasteryStatus } from "../../mastery/store";

export type CourseContextConcept = {
  conceptId: string;
  name: string;
  defaultOrder: number;
  // Optional KG visualization affordance + one-line hint; drives the lesson
  // planner's per-concept visual requirement (absent = no forced visual).
  visual?: ConceptVisual;
  visualHint?: string;
  // Learner's prior mastery of this concept (from user_concept_mastery). Absent
  // = no record yet → treat as first-time learning. Shapes teaching DEPTH only;
  // coverage and mandated visual/quiz blocks are unaffected.
  mastery?: MasteryStatus;
};

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
  const fmtTopic = (t: CourseContextTopic) => {
    const list = (t.concepts ?? [])
      .map((c) => `${c.defaultOrder}. ${c.name} (${c.conceptId})`)
      .join("; ");
    return `${t.name} (${t.topicId})${list ? ` — concepts: ${list}` : ""}`;
  };

  const lines = [
    "Knowledge graph linear learning path (follow it exactly):",
    `Start topic: ${fmtTopic(kg.startTopic)}`,
  ];
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
