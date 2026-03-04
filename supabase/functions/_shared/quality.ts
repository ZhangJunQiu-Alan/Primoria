/**
 * Course quality evaluation logic.
 * Shared by utils-evaluate-course-quality (HTTP endpoint)
 * and agentic-generate-course (inline Stage 3.5).
 */

export type QualityIssueType =
  | 'MISSING_INTERACTIVE'  // a lesson has no interactive blocks
  | 'LOW_QUESTION_COUNT'   // course total question blocks < lesson count
  | 'TEXT_TOO_LONG'        // a text block exceeds TEXT_MAX_CHARS
  | 'BEGINNER_KEYWORD';    // beginner course uses advanced terminology

export interface QualityIssue {
  type:        QualityIssueType;
  message:     string;
  location:    string;     // e.g. "pages[0]", "pages[1].blocks[2]"
  lessonIndex: number;     // 0-based page index; -1 for course-level issues
  qualityHint: string;     // injected into ai-generate-lesson-blocks qualityHints
}

export interface QualityReport {
  score:   number;         // 0-100
  passed:  boolean;        // score >= MIN_SCORE_TO_PASS
  issues:  QualityIssue[];
  summary: string;
}

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const INTERACTIVE_BLOCK_TYPES = new Set([
  'code-playground', 'multiple-choice', 'fill-blank', 'true-false', 'matching',
]);

const QUESTION_BLOCK_TYPES = new Set([
  'multiple-choice', 'fill-blank', 'true-false', 'matching',
]);

const ADVANCED_KEYWORDS: string[] = [
  'recursion', 'recursive', 'polymorphism', 'concurrency', 'multithreading',
  'asynchronous', 'eigenvalue', 'gradient descent', 'backpropagation',
  'dynamic programming', 'memoization', 'binary tree', 'graph algorithm',
  'big-o notation', 'time complexity',
];

const TEXT_MAX_CHARS          = 600;
const MIN_SCORE_TO_PASS       = 80;
const DEDUCT_MISSING_INTERACTIVE = 12;
const DEDUCT_LOW_QUESTION        = 15;
const DEDUCT_TEXT_TOO_LONG       = 4;
const DEDUCT_BEGINNER_KEYWORD    = 5;

// ────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────

export function evaluateCourseQuality(courseJson: unknown): QualityReport {
  const issues: QualityIssue[] = [];
  let deduction = 0;

  if (typeof courseJson !== 'object' || courseJson === null || Array.isArray(courseJson)) {
    return {
      score: 0, passed: false, issues: [],
      summary: 'Invalid course JSON — not an object.',
    };
  }

  const course   = courseJson as Record<string, unknown>;
  const meta     = course.metadata as Record<string, unknown> | undefined;
  const difficulty       = meta?.difficulty as string | undefined;
  const isBeginnerCourse = difficulty === 'beginner';

  const pages = course.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    return {
      score: 0, passed: false, issues: [],
      summary: 'No pages found in course JSON.',
    };
  }

  let totalQuestions = 0;

  (pages as unknown[]).forEach((page, i) => {
    const p        = page as Record<string, unknown>;
    const pageLoc  = `pages[${i}]`;
    const blocks   = p.blocks;
    if (!Array.isArray(blocks)) return;

    let lessonInteractive = 0;

    (blocks as unknown[]).forEach((block, j) => {
      const b    = block as Record<string, unknown>;
      const type = b.type as string | undefined;
      if (!type) return;

      if (INTERACTIVE_BLOCK_TYPES.has(type)) lessonInteractive++;
      if (QUESTION_BLOCK_TYPES.has(type))    totalQuestions++;

      // ── Rule: text block length ≤ TEXT_MAX_CHARS ──────────────────
      if (type === 'text') {
        const value = (b.content as Record<string, unknown> | undefined)?.value as string | undefined;
        if (typeof value === 'string' && value.length > TEXT_MAX_CHARS) {
          issues.push({
            type:        'TEXT_TOO_LONG',
            message:     `Text block at ${pageLoc}.blocks[${j}] is ${value.length} chars (limit ${TEXT_MAX_CHARS})`,
            location:    `${pageLoc}.blocks[${j}]`,
            lessonIndex: i,
            qualityHint: `Keep each text block concise (≤${TEXT_MAX_CHARS} characters). Split long explanations into shorter paragraphs or add more interactive blocks to break up the reading.`,
          });
          deduction += DEDUCT_TEXT_TOO_LONG;
        }
      }

      // ── Rule: no advanced keywords in beginner courses ─────────────
      if (isBeginnerCourse) {
        const blockText = JSON.stringify(b).toLowerCase();
        for (const kw of ADVANCED_KEYWORDS) {
          if (blockText.includes(kw)) {
            issues.push({
              type:        'BEGINNER_KEYWORD',
              message:     `Advanced concept "${kw}" found in a beginner lesson (${pageLoc}.blocks[${j}])`,
              location:    `${pageLoc}.blocks[${j}]`,
              lessonIndex: i,
              qualityHint: `This is a beginner course. Avoid advanced concepts like "${kw}". Use simpler explanations and foundational examples only.`,
            });
            deduction += DEDUCT_BEGINNER_KEYWORD;
            break; // one keyword hit per block is enough
          }
        }
      }
    });

    // ── Rule: each lesson must have ≥1 interactive block ────────────
    if (lessonInteractive === 0) {
      const lessonTitle = typeof p.title === 'string' ? p.title : String(p.pageId ?? `lesson ${i + 1}`);
      issues.push({
        type:        'MISSING_INTERACTIVE',
        message:     `Lesson ${i + 1} ("${lessonTitle}") has no interactive blocks`,
        location:    pageLoc,
        lessonIndex: i,
        qualityHint: 'Add at least 1 interactive block (multiple-choice, fill-blank, true-false, matching, or code-playground) to reinforce active learning in this lesson.',
      });
      deduction += DEDUCT_MISSING_INTERACTIVE;
    }
  });

  // ── Rule: total question count ≥ lesson count ────────────────────
  if (totalQuestions < pages.length) {
    issues.push({
      type:        'LOW_QUESTION_COUNT',
      message:     `Course has ${totalQuestions} question block${totalQuestions !== 1 ? 's' : ''} across ${pages.length} lessons (target ≥${pages.length})`,
      location:    '$.pages',
      lessonIndex: -1,
      qualityHint: 'Add at least 1 question block per lesson (multiple-choice, fill-blank, true-false, or matching) to check comprehension.',
    });
    deduction += DEDUCT_LOW_QUESTION;
  }

  const score  = Math.max(0, 100 - deduction);
  const passed = score >= MIN_SCORE_TO_PASS;
  return { score, passed, issues, summary: buildSummary(score, issues) };
}

function buildSummary(score: number, issues: QualityIssue[]): string {
  if (issues.length === 0) return `Quality check passed. Score: ${score}/100.`;
  const counts: Partial<Record<QualityIssueType, number>> = {};
  for (const { type } of issues) counts[type] = (counts[type] ?? 0) + 1;
  const parts = Object.entries(counts).map(([t, n]) => `${n}× ${t}`);
  const passedStr = score >= MIN_SCORE_TO_PASS ? 'passed' : 'failed';
  return `Quality ${passedStr}. Score: ${score}/100. ${issues.length} issue${issues.length > 1 ? 's' : ''}: ${parts.join(', ')}.`;
}
