#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  const agentGraph = read("../agent/src/graph.mjs");
  const generativeUi = read("src/hooks/use-primoria-copilot.tsx");
  const chatSurface = read("src/components/tutor/copilot-chat-surface.tsx");
  const styles = read("src/app/globals.css");
  const chatQuizCardSource = generativeUi.slice(
    generativeUi.indexOf("function ChatQuizCard"),
    generativeUi.indexOf("function ChatQuizQuestionView"),
  );

  assert(agentGraph.includes('name: "render_chat_quiz"'), "agent exposes render_chat_quiz tool");
  assert(agentGraph.includes("renderChatQuizTool"), "agent registers render_chat_quiz in the tool list");
  assert(agentGraph.includes("call render_chat_quiz"), "course detail mode routes quiz requests to chat quiz");
  assert(agentGraph.includes("Do NOT call add_course_block"), "course detail mode forbids creating course quiz blocks");
  assert(!agentGraph.includes('call add_course_block with targetType "quiz"'), "old course-block quiz instruction is removed");
  assert(agentGraph.includes("Do not output <think>"), "agent prompt forbids think-tag output");

  assert(generativeUi.includes("const ChatQuizParams"), "web UI defines chat quiz parameters");
  assert(generativeUi.includes('name: "render_chat_quiz"'), "web UI registers chat quiz renderer");
  assert(generativeUi.includes("function ChatQuizCard"), "web UI renders a controlled chat quiz card");
  assert(generativeUi.includes("course-quiz-submit"), "chat quiz reuses existing quiz submit styling");
  assert(chatQuizCardSource.includes('className="course-chat-quiz"'), "chat quiz success state uses a dedicated light container");
  assert(chatQuizCardSource.includes("course-chat-quiz-intro"), "chat quiz description renders without a title bar");
  assert(!chatQuizCardSource.includes("tool-card status-card"), "chat quiz success state does not render the generic bordered tool card");
  assert(!chatQuizCardSource.includes("tool-title"), "chat quiz success state does not render the generated quiz title header");
  assert(styles.includes(".course-chat-quiz"), "chat quiz has dedicated styling");
  assert(styles.includes(".course-chat-quiz .course-quiz-question"), "chat quiz questions have lighter scoped styling");
  assert(!generativeUi.includes("/api/courses/${courseId}/quiz"), "chat quiz renderer does not submit course quiz attempts");
  assert(generativeUi.includes("stripCopilotThinkTags"), "web UI exposes think-tag stripping");
  assert(generativeUi.includes("parsed?.type === \"chat_quiz\""), "assistant text sanitizer hides raw chat quiz tool JSON");

  assert(chatSurface.includes("sanitizeCopilotAssistantText(stripInjectedCourseContext(message.content))"), "assistant rendering strips injected context and think text");
  assert(chatSurface.includes("message.role === \"assistant\""), "chat history sanitizes assistant messages by role");
  assert(chatSurface.includes("sanitizeCopilotAssistantText(stripInjectedCourseContext(message.content))"), "restored assistant messages are sanitized");

  process.stdout.write("[chat-quiz-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
