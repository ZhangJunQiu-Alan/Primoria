export type ImageTextIssue = {
  field: "alt" | "caption";
  code: "empty" | "duplicate" | "generic_alt" | "word_number_glue" | "short_alt" | "title_as_alt";
  severity: "error" | "review";
};

// A prose word glued onto the number after it ("increase of3seats",
// "differentiates to2x", "receives100J", "the integral1/2"). Only function words
// and verbs count, plus any word glued onto a fraction: nouns are left alone so
// identifiers such as area1, factor2, score2, binary32, IPv4 and CO2 stay valid.
const PROSE_WORD_NUMBER_GLUE = /\b(?:of|to|by|at|is|are|was|be|as|than|from|with|and|the|into|onto|per|among|equals?|gives?|yields?|becomes?|makes?|takes?|reaches?|receives?|delivers?|rejects?|requires?|exceeds?|selects?|integrating|gaining|losing|stretched)\d/i;
const WORD_FRACTION_GLUE = /\b[a-z]{3,}\d+\/\d/;
const GENERIC_ALT = /^(?:an?\s+)(?:(?:english[- ]labelled|labelled|teaching|educational|conceptual|python|linear algebra|networking|physics|biology)\s+)*(?:diagram|illustration|example|image)\s+(?:explaining|of|illustrating)\b|\billustrated with labelled (?:examples|structures and processes)\.?$/i;
const CONCRETE_CONTENT = /\b(?:shows?|showing|with|connects?|connecting|arrows?|compares?|comparing|before|after|labelled as|branches|branching)\b|[=→]/i;

export function imageTextIssues(text: { alt: string; caption: string; language?: string; title?: string }): ImageTextIssue[] {
  const issues: ImageTextIssue[] = [];
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").replace(/[.!?。！？」]+$/u, "").toLowerCase();
  for (const field of ["alt", "caption"] as const) {
    if (!text[field].trim()) issues.push({ field, code: "empty", severity: "error" });
  }
  if (text.alt.trim() && normalize(text.alt) === normalize(text.caption)) {
    issues.push({ field: "alt", code: "duplicate", severity: "error" });
  }
  const english = !text.language || /^en(?:[-_]|$)/i.test(text.language);
  if (english) {
    if (text.alt.trim().length <= 120 && GENERIC_ALT.test(text.alt.trim()) && !CONCRETE_CONTENT.test(text.alt.replace(/illustrated with labelled (?:examples|structures and processes)/i, ""))) {
      issues.push({ field: "alt", code: "generic_alt", severity: "error" });
    }
    for (const field of ["alt", "caption"] as const) {
      if (PROSE_WORD_NUMBER_GLUE.test(text[field]) || WORD_FRACTION_GLUE.test(text[field])) issues.push({ field, code: "word_number_glue", severity: "error" });
    }
    if (text.alt.trim().length < 50) issues.push({ field: "alt", code: "short_alt", severity: "review" });
  }
  if (text.title?.trim() && normalize(text.alt) === normalize(text.title)) {
    issues.push({ field: "alt", code: "title_as_alt", severity: "review" });
  }
  return issues;
}

export function assertImageTextQuality(text: Parameters<typeof imageTextIssues>[0]): void {
  const errors = imageTextIssues(text).filter(issue => issue.severity === "error");
  if (errors.length) throw new Error(`Invalid image text: ${errors.map(issue => `${issue.field}:${issue.code}`).join(", ")}`);
}

const ISSUE_FIX: Record<ImageTextIssue["code"], string> = {
  empty: "must not be empty",
  duplicate: "must differ from caption: alt describes what is pictured, caption says what to notice and why",
  generic_alt: "must describe the pictured objects, values or relationships, not a generic topic label",
  word_number_glue: "needs a space between a prose word and the number after it",
  short_alt: "is short; describe what is pictured",
  title_as_alt: "repeats the title; describe what is pictured",
};

/** Writer-facing repair text for image text issues. */
export function describeImageTextIssues(issues: ImageTextIssue[]): string {
  return issues.map((issue) => `${issue.field} ${ISSUE_FIX[issue.code]}`).join("; ");
}
