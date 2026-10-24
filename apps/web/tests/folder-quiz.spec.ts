import { describe, expect, it } from "vitest";

import { computeRollingMasteryUpdates, type RollingEvidence } from "../src/lib/mastery/rules";
import type { MasteryStatus } from "../src/lib/mastery/store";
import {
  allocateQuiz,
  buildFolderQuizUserPrompt,
  parseFolderQuiz,
  seededRandom,
  shuffleChoices,
  type QuizConcept,
  type QuizGenerationConcept,
} from "../src/lib/materials/folder-quiz";

const concepts = (statuses: MasteryStatus[]): QuizConcept[] => statuses.map((status, index) => ({ conceptId: `c${index + 1}`, status }));
const total = (allocation: Map<string, number>) => [...allocation.values()].reduce((sum, count) => sum + count, 0);

describe("allocateQuiz", () => {
  it("is deterministic per seed", () => {
    const input = concepts(["weak", "untested", "learning", "mastered", "untested", "weak", "learning"]);
    expect([...allocateQuiz(input, 10, seededRandom("s1"))]).toEqual([...allocateQuiz(input, 10, seededRandom("s1"))]);
  });

  it("caps two per concept and one review question while weaker concepts can fill the quiz", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const input = concepts(["mastered", "mastered", "mastered", "weak", "untested", "learning", "weak", "untested", "learning"]);
      const allocation = allocateQuiz(input, 10, seededRandom(seed));
      expect(total(allocation)).toBe(10);
      expect(Math.max(...allocation.values())).toBeLessThanOrEqual(2);
      const reviews = ["c1", "c2", "c3"].reduce((sum, id) => sum + (allocation.get(id) ?? 0), 0);
      expect(reviews).toBeLessThanOrEqual(1);
    }
  });

  it("weights weaker concepts more heavily", () => {
    const input = concepts(["weak", "learning", "mastered", ...Array.from({ length: 9 }, () => "untested" as const)]);
    const tally = new Map<string, number>();
    for (let i = 0; i < 400; i += 1) {
      for (const [id, count] of allocateQuiz(input, 10, seededRandom(`seed-${i}`))) tally.set(id, (tally.get(id) ?? 0) + count);
    }
    expect(tally.get("c1")!).toBeGreaterThan(tally.get("c2")!);
    expect(tally.get("c2")!).toBeGreaterThan(tally.get("c3")!);
  });

  it("shortens the quiz for small graphs and lets mastered concepts fill what weaker ones cannot", () => {
    expect(total(allocateQuiz(concepts(["weak", "untested"]), 10, seededRandom("x")))).toBe(4);
    const allMastered = allocateQuiz(concepts(["mastered", "mastered", "mastered"]), 10, seededRandom("y"));
    expect(total(allMastered)).toBe(6);
    expect(total(allocateQuiz([], 10, seededRandom("z")))).toBe(0);
  });
});

describe("shuffleChoices", () => {
  it("keeps the answer attached to its text", () => {
    for (const seed of ["1", "2", "3", "4", "5"]) {
      const { choices, correctId } = shuffleChoices(["right", "w1", "w2", "w3"], 0, seededRandom(seed));
      expect(choices.map((choice) => choice.id)).toEqual(["a", "b", "c", "d"]);
      expect(choices.find((choice) => choice.id === correctId)?.text).toBe("right");
      expect(choices.map((choice) => choice.text).sort()).toEqual(["right", "w1", "w2", "w3"]);
    }
  });

  it("does not always put the answer first", () => {
    const positions = new Set(Array.from({ length: 20 }, (_, i) => shuffleChoices(["r", "a", "b", "c"], 0, seededRandom(`p${i}`)).correctId));
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe("folder quiz prompt and parser", () => {
  const ref = (materialId: string, ordinal: number) => ({ materialId, ordinal });
  const quizConcepts: QuizGenerationConcept[] = [
    { label: "C1", conceptId: "fc_sym", name: "Symmetric Key", nameZh: "对称密钥", assessmentHint: "explain key sharing", count: 2, existing: ["什么是对称密钥？"] },
    { label: "C2", conceptId: "fc_hash", name: "Hash Function", nameZh: null, count: 1, existing: [] },
  ];
  const refsByLabel = new Map([
    ["S1", { ref: ref("lm_1", 0), conceptIds: ["fc_sym"] }],
    ["S2", { ref: ref("lm_1", 1), conceptIds: ["fc_sym"] }],
    ["S3", { ref: ref("lm_2", 4), conceptIds: ["fc_hash"] }],
  ]);
  const good = (concept: string, question: string, extra: Record<string, unknown> = {}) => ({
    concept,
    question,
    choices: ["A", "B", "C", "D"],
    answer: 2,
    explanation: "Because the material says so.",
    sources: ["S1"],
    ...extra,
  });

  it("lists concepts with counts, hints, existing questions, and labelled excerpts", () => {
    const prompt = buildFolderQuizUserPrompt({
      language: "zh",
      concepts: quizConcepts,
      excerpts: [{ label: "S1", conceptIds: ["fc_sym"], materialTitle: "第1讲", locator: "第 3 页", heading: "密钥", text: "对称加密使用同一个密钥。" }],
    });
    expect(prompt).toContain("QUIZ LANGUAGE: Simplified Chinese");
    expect(prompt).toContain("[C1] Symmetric Key / 对称密钥 — write 2 question(s). Skill to check: explain key sharing");
    expect(prompt).toContain("[C2] Hash Function — write 1 question(s).");
    expect(prompt).toContain("[C1] 什么是对称密钥？");
    expect(prompt).toContain("[S1] {C1} (第1讲 · 第 3 页 · § 密钥)\n对称加密使用同一个密钥。");
  });

  it("keeps valid questions up to each concept's count and scopes sources to the concept", () => {
    const parsed = parseFolderQuiz(
      JSON.stringify({
        questions: [
          good("C1", "Why must both parties hold the key?", { sources: ["S2", "S3"] }),
          good("[c1]", "Which property does a symmetric key need?"),
          good("C1", "A third C1 question beyond the count"),
          good("C2", "What does a hash function output?", { sources: ["S1"] }),
          good("C9", "Unknown concept"),
        ],
      }),
      quizConcepts,
      refsByLabel,
    );
    expect(parsed.map((question) => [question.conceptId, question.question])).toEqual([
      ["fc_sym", "Why must both parties hold the key?"],
      ["fc_sym", "Which property does a symmetric key need?"],
      ["fc_hash", "What does a hash function output?"],
    ]);
    expect(parsed[0].refs).toEqual([ref("lm_1", 1)]);
    // S1 belongs to another concept, so the hash question falls back to its own excerpts.
    expect(parsed[2].refs).toEqual([ref("lm_2", 4)]);
    expect(parsed[0].answerIndex).toBe(2);
  });

  it("drops malformed and repeated questions", () => {
    const parsed = parseFolderQuiz(
      `Here you go: ${JSON.stringify({
        questions: [
          good("C1", "什么是对称密钥？"),
          good("C1", "Three choices", { choices: ["A", "B", "C"] }),
          good("C1", "Duplicate choices", { choices: ["A", "a", "B", "C"] }),
          good("C1", "Bad answer index", { answer: 4 }),
          good("C2", "  Valid   hash question  "),
          good("C2", "valid hash question"),
        ],
      })}`,
      quizConcepts,
      refsByLabel,
    );
    expect(parsed.map((question) => question.question)).toEqual(["Valid hash question"]);
    expect(parseFolderQuiz("no json", quizConcepts, refsByLabel)).toEqual([]);
    expect(parseFolderQuiz('{"questions": "nope"}', quizConcepts, refsByLabel)).toEqual([]);
  });
});

describe("computeRollingMasteryUpdates", () => {
  const run = (evidence: Record<string, RollingEvidence>, current: Record<string, MasteryStatus> = {}) =>
    Object.fromEntries(
      computeRollingMasteryUpdates(new Map(Object.entries(evidence)), new Map(Object.entries(current))).map((update) => [update.conceptId, update.status]),
    );

  it("needs at least three answers at 80% inside the last five", () => {
    expect(run({ a: { recent: [true, true], newWrong: false } })).toEqual({ a: "learning" });
    expect(run({ a: { recent: [true, true, true], newWrong: false } })).toEqual({ a: "mastered" });
    expect(run({ a: { recent: [true, true, true, false, true], newWrong: false } })).toEqual({ a: "mastered" });
    expect(run({ a: { recent: [true, false, true, false, true], newWrong: false } })).toEqual({ a: "learning" });
    // Only the newest five count.
    expect(run({ a: { recent: [true, true, true, true, false, false, false], newWrong: false } })).toEqual({ a: "mastered" });
    expect(run({ a: { recent: [false], newWrong: true } })).toEqual({ a: "weak" });
  });

  it("drops a mastered concept only on a new wrong answer, and never for a short correct window", () => {
    expect(run({ a: { recent: [false, true, true, true], newWrong: true } }, { a: "mastered" })).toEqual({ a: "learning" });
    expect(run({ a: { recent: [true], newWrong: false } }, { a: "mastered" })).toEqual({ a: "mastered" });
    expect(run({ a: { recent: [], newWrong: false } })).toEqual({});
  });
});
