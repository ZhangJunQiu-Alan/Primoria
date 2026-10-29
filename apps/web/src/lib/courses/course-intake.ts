import { z } from "zod";

const boundedText = z.string().trim().min(1).max(300);
export const IntakeQuestionSchema = z.object({
  id: z.enum(["background", "purpose", "target", "constraints", "format"]),
  question: boundedText,
  options: z.array(boundedText).min(3).max(5),
});
export const IntakeAssessmentSchema = z.object({
  backgroundEvidence: z.string().max(500).nullable(),
  purposeEvidence: z.string().max(500).nullable(),
  targetEvidence: z.string().max(500).nullable(),
  questions: z.array(IntakeQuestionSchema).length(3).refine((items) => new Set(items.map((q) => q.id)).size === 3),
});
export const IntakeAnswersSchema = z.record(z.string(), z.object({ option: z.number().int().min(0).max(4), detail: z.string().trim().max(500).default("") }));
export type IntakeQuestion = z.infer<typeof IntakeQuestionSchema>;
export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;
export type CourseIntakeView = { id: string; query: string; language: "en" | "zh"; ready: boolean; questions: IntakeQuestion[]; answers: IntakeAnswers | null; goal: string };

export function hasSufficientEvidence(assessment: z.infer<typeof IntakeAssessmentSchema>, sources: string) {
  return [assessment.backgroundEvidence, assessment.purposeEvidence, assessment.targetEvidence]
    .every((evidence) => evidence && evidence.length >= 4 && sources.includes(evidence));
}

export function validateIntakeAnswers(questions: IntakeQuestion[], answers: IntakeAnswers) {
  return Object.keys(answers).length === questions.length && questions.every((q) => {
    const answer = answers[q.id];
    return answer && Number.isInteger(answer.option) && answer.option >= 0 && answer.option < q.options.length;
  });
}

export function avoidAnsweredDimensions(assessment: z.infer<typeof IntakeAssessmentSchema>, sources: string, language: "en" | "zh"): IntakeQuestion[] {
  if (hasSufficientEvidence(assessment, sources)) return assessment.questions;
  const known = new Set(["background", "purpose", "target"].filter((key) => {
    const evidence = assessment[`${key}Evidence` as "backgroundEvidence" | "purposeEvidence" | "targetEvidence"];
    return evidence && evidence.length >= 4 && sources.includes(evidence);
  }));
  const extras: IntakeQuestion[] = language === "en" ? [
    { id: "constraints", question: "How much time can you usually spend per session?", options: ["About 10 minutes", "About 30 minutes", "About an hour", "I am flexible"] },
    { id: "format", question: "What kind of practice would help you most?", options: ["Guided examples", "Short exercises", "A small project", "Recommend a mix"] },
  ] : [
    { id: "constraints", question: "你每次通常可以学习多久？", options: ["约10分钟", "约30分钟", "约1小时", "时间比较灵活"] },
    { id: "format", question: "哪种练习方式更适合你？", options: ["跟着示例练习", "简短练习题", "一个小项目", "请推荐合适的组合"] },
  ];
  const pool = [...assessment.questions, ...fallbackIntakeQuestions(language), ...extras];
  const selected: IntakeQuestion[] = [];
  for (const q of pool) if (!known.has(q.id) && !selected.some((item) => item.id === q.id) && selected.length < 3) selected.push(q);
  return selected;
}

export function intakePlanningContext(questions: IntakeQuestion[], answers: IntakeAnswers) {
  return questions.map((q) => `${q.id}: ${q.question}\nAnswer: ${q.options[answers[q.id].option]}${answers[q.id].detail ? `; ${answers[q.id].detail}` : ""}`).join("\n");
}

export function intakeGoal(query: string, questions: IntakeQuestion[], answers: IntakeAnswers | null) {
  const targets = answers && Object.keys(answers).length ? questions.filter((q) => q.id === "target" || q.id === "purpose")
    .map((q) => `${q.id}: ${q.options[answers[q.id].option]}${answers[q.id].detail ? `; ${answers[q.id].detail}` : ""}`) : [];
  return [query, ...targets].join(". ").slice(0, 300);
}

export function fallbackIntakeQuestions(language: "en" | "zh"): IntakeQuestion[] {
  return language === "en" ? [
    { id: "background", question: "What experience do you have with this subject?", options: ["I am starting from scratch", "I know a few basics", "I have studied related subjects", "I am comfortable with the fundamentals"] },
    { id: "purpose", question: "What will you mainly use it for?", options: ["School or university", "Work or a practical project", "Personal interest", "An exam or qualification"] },
    { id: "target", question: "What would you like to achieve first?", options: ["Understand the fundamentals", "Solve a specific kind of problem", "Build a small practical project", "Recommend a starting goal for me"] },
  ] : [
    { id: "background", question: "你对这个学科有多少基础？", options: ["完全从零开始", "了解一些基础", "学过相关学科", "已经掌握基本知识"] },
    { id: "purpose", question: "你主要想把它用在哪里？", options: ["学校或大学课程", "工作或实际项目", "个人兴趣", "考试或资格认证"] },
    { id: "target", question: "你首先希望达到什么目标？", options: ["理解基本原理", "解决一类具体问题", "完成一个小项目", "请推荐适合的入门目标"] },
  ];
}
