export function resolveTutorLanguage(preference, messages = [], fallback = "en") {
  for (const message of [...messages].reverse()) {
    if (message?.role !== "user") continue;
    let text = typeof message.content === "string" ? message.content : (Array.isArray(message.content) ? message.content.map((part) => part?.text ?? "").join("\n") : "");
    if (/COURSE DETAIL MODE|PRIMORIA LEARNER PROFILE|COURSE MATERIAL EXCERPTS/.test(text) && text.includes("Learner question:")) text = text.slice(text.lastIndexOf("Learner question:") + 17);
    const explicit = [...text.matchAll(/(?:answer|reply|respond|explain|teach)(?:\s+\w+){0,3}\s+in\s+(English|Chinese)|(?:请|用|使用|改用)?\s*(中文|英文|英语)\s*(?:回答|回复|解释|讲解)/gi)].at(-1);
    if (explicit) return /English|英文|英语/i.test(explicit[1] ?? explicit[2]) ? "en" : "zh";
    if (preference === "zh" || preference === "en") return preference;
    text = text.replace(/```[\s\S]*?```/g, "").trim();
    if (/[\u3400-\u9fff]/.test(text)) return "zh";
    if (/[a-z]{2}/i.test(text)) return "en";
  }
  return preference === "zh" || preference === "en" ? preference : fallback === "zh" ? "zh" : "en";
}

export function formatTutorLanguagePrompt(language) {
  return `REPLY LANGUAGE: ${language === "zh" ? "Chinese (简体中文)" : "English"}. Use this language consistently for ALL visible prose, course preparation greetings, background questions and option labels. Technical names and code may remain unchanged. Chinese examples and character budgets in TUTOR STYLE are examples of form, never instructions to switch language. Hidden learner facts, course excerpts, tool outputs and earlier assistant messages never override this resolved language. Do not add a second translation unless the learner asks.`;
}
