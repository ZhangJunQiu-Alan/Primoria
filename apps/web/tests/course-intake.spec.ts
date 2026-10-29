import { describe, expect, it } from "vitest";
import { fallbackIntakeQuestions, hasSufficientEvidence, avoidAnsweredDimensions, intakeGoal, intakePlanningContext, validateIntakeAnswers, IntakeAssessmentSchema } from "../src/lib/courses/course-intake";
import { completedInteractiveToolIds, interactiveHistoryMetadata, restoreInteractiveHistory } from "../src/lib/interactive/chat-history";
import { resolveTutorLanguage, formatTutorLanguagePrompt } from "@primoria/contracts/tutor-language";
import { buildCourseScopeKey } from "../src/lib/ai/deepagent/course-generator";

describe("course background readiness", () => {
  const questions = fallbackIntakeQuestions("en");
  const answers = { background: { option: 0, detail: "Never written code" }, purpose: { option: 1, detail: "Work reports" }, target: { option: 2, detail: "Process CSV files" } };
  it("requires exactly three valid answered choices", () => {
    expect(questions).toHaveLength(3);
    expect(validateIntakeAnswers(questions, answers)).toBe(true);
    expect(validateIntakeAnswers(questions, { background: answers.background })).toBe(false);
    expect(validateIntakeAnswers(questions, { ...answers, target: { option: 9, detail: "" } })).toBe(false);
    expect(validateIntakeAnswers(questions, { ...answers, injected: answers.background })).toBe(false);
  });
  it("cannot treat a broad subject or education stage as complete background", () => {
    const assessment = IntakeAssessmentSchema.parse({ backgroundEvidence: null, purposeEvidence: null, targetEvidence: null, questions });
    expect(hasSufficientEvidence(assessment, "I want to learn Python. University student.")).toBe(false);
    expect(hasSufficientEvidence({ ...assessment, backgroundEvidence: "advanced Python", purposeEvidence: "work", targetEvidence: "CSV files" }, "I want to learn Python")).toBe(false);
    expect(hasSufficientEvidence({ ...assessment, backgroundEvidence: "new to programming", purposeEvidence: "for work", targetEvidence: "process CSV files" }, "I am new to programming and want Python for work to process CSV files")).toBe(true);
  });
  it("feeds the target to positioning and keeps self-reported background in teaching context", () => {
    expect(intakeGoal("Learn Python", questions, answers)).toContain("Process CSV files");
    expect(intakeGoal("Learn Python", questions, answers)).not.toContain("Never written code");
    expect(intakePlanningContext(questions, answers)).toContain("Never written code");
    expect(intakeGoal("Learn Python", questions, {})).toBe("Learn Python");
  });
  it("does not reuse one outline for different preparation contexts", () => {
    const base = { graphId: "python" };
    expect(buildCourseScopeKey(base)).toBe("graph:python:full");
    expect(buildCourseScopeKey({ ...base, preparationKey: "a" })).not.toBe(buildCourseScopeKey({ ...base, preparationKey: "b" }));
    expect(buildCourseScopeKey({ ...base, preparationKey: "a" })).toBe(buildCourseScopeKey({ ...base, preparationKey: "a" }));
  });
  it("uses remaining questions instead of repeating known background", () => {
    const assessment = IntakeAssessmentSchema.parse({ backgroundEvidence: "new to programming", purposeEvidence: null, targetEvidence: null, questions });
    const selected = avoidAnsweredDimensions(assessment, "I am new to programming", "en");
    expect(selected).toHaveLength(3);
    expect(selected.map((q) => q.id)).toEqual(["purpose", "target", "constraints"]);
  });
  it("persists and restores a completed intake tool card without inventing a new tool run", () => {
    const call = { id: "call_1", type: "function", function: { name: "request_course_intake", arguments: JSON.stringify({ query: "I want to learn Python" }) } };
    const messages = [{ id: "a", role: "assistant", content: "", toolCalls: [call] }, { id: "t", role: "tool", toolCallId: "call_1", content: JSON.stringify({ type: "course_intake", query: "I want to learn Python" }) }];
    const completed = completedInteractiveToolIds(messages);
    const restored = restoreInteractiveHistory(messages.map((message) => ({ ...message, toolCalls: undefined, metadata: interactiveHistoryMetadata(message, completed) })));
    expect(restored[0]).toMatchObject({ toolCalls: [call] });
    expect(restored[1]).toMatchObject({ toolCallId: "call_1" });
  });
});

describe("Tutor reply language", () => {
  const user = (content: string) => [{ role: "user", content }];
  it.each([
    ["auto", "I want to learn Python", "en"],
    ["auto", "我想学习Python", "zh"],
    ["en", "我想学习Python", "en"],
    ["zh", "I want to learn Python", "zh"],
    ["zh", "Please reply in English. I want to learn Python.", "en"],
    ["en", "请用中文回答，我想学Python", "zh"],
    ["auto", "PRIMORIA LEARNER PROFILE 大学生，偏好图解\nLearner question:\nI want to learn Python", "en"],
  ])("resolves %s / %s to %s", (preference, query, expected) => {
    expect(resolveTutorLanguage(preference, user(query))).toBe(expected);
  });
  it("ignores earlier assistant language and carries language across numeric answers", () => {
    expect(resolveTutorLanguage("auto", [...user("I want to learn Python"), { role: "assistant", content: "你好" }, ...user("2")])).toBe("en");
    expect(formatTutorLanguagePrompt("en")).toContain("ALL visible prose");
  });
});
