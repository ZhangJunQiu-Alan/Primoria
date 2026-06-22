// Pure knowledge-graph course-context helper. No server-only imports, so it is
// safe to import from both the server course generator and client components
// (e.g. the /debug/pipeline inspector).

export type CourseContextTopic = {
  topicId: string;
  name: string;
  concepts: { conceptId: string; name: string; defaultOrder: number }[];
};

export type CourseContext = {
  learningPathType: "linear";
  graphId: string;
  startTopic: CourseContextTopic;
  targetConceptId: string | null;
  nextTopic: CourseContextTopic | null;
};

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
