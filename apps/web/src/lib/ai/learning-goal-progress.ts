import { detectKgLanguage } from "@/lib/knowledge-graph/display-name";

export function learningGoalProgressCopy(query: string) {
  const language = detectKgLanguage(query);
  const topic = query
    .trim()
    .replace(/[.!?。！？]+$/g, "")
    .replace(/^(?:i\s+)?(?:want|wanna|would\s+like)(?:\s+to)?\s+(?:learn(?:ing)?|study)\s+/i, "")
    .replace(/^(?:learn(?:ing)?|study)\s+/i, "")
    .replace(/^(?:我)?(?:想要|想|要|希望)(?:学习|学|了解|掌握)/, "")
    .replace(/^(?:学习|学|了解|掌握)/, "")
    .trim()
    .slice(0, 80);
  const subject = topic || (language === "zh" ? "这个目标" : "this goal");
  return language === "zh"
    ? `我来帮你规划学习${subject}的路径！`
    : `I'll help you plan a learning path for ${subject}.`;
}
