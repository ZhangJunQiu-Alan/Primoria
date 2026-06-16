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

// Compact knowledge-graph hint appended to the course prompt: the start topic's
// concepts (with default order), an optional target concept to emphasize, and
// whether to produce a two-lesson linear path (next topic) or a single lesson
// (leaf topic).
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
      'Produce TWO lessons in linear order: lesson 1 teaches the start topic\'s concepts, lesson 2 teaches the next topic\'s concepts. Make the two-lesson structure explicit in the block titles (e.g. "第一课 / 第二课").',
    );
  } else {
    lines.push("This is a leaf topic — produce ONE lesson covering the start topic's concepts. Do not invent a second lesson.");
  }
  return lines.join("\n");
}
