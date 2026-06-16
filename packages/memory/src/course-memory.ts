import type { MemoryProvider } from "./types";

export type CourseMemoryContext = {
  userId: string;
  courseId: string;
  courseTitle?: string;
  courseTopic?: string;
  selectedBlockId?: string | null;
  selectedBlockTitle?: string | null;
  selectedBlockType?: string | null;
};

export type CourseMemoryMessagePair = {
  user: string;
  assistant: string;
};

export async function searchCourseMemory(
  provider: MemoryProvider,
  context: CourseMemoryContext,
  query: string,
) {
  const [userMemory, courseMemory] = await Promise.all([
    provider.search({
      scope: { type: "user", userId: context.userId },
      query,
      topK: 4,
    }),
    provider.search({
      scope: { type: "user_course", userId: context.userId, courseId: context.courseId },
      query,
      topK: 6,
      metadata: {
        "metadata.course_id": context.courseId,
      },
    }),
  ]);

  return { userMemory, courseMemory };
}

export function formatCourseMemoryForPrompt(memories: Awaited<ReturnType<typeof searchCourseMemory>>) {
  const lines = [
    ...memories.userMemory.map((memory) => `User memory: ${memory.text}`),
    ...memories.courseMemory.map((memory) => `Course memory: ${memory.text}`),
  ];
  if (lines.length === 0) return "No relevant long-term memory found.";
  return lines.slice(0, 10).join("\n");
}

export async function recordCourseInteraction(
  provider: MemoryProvider,
  context: CourseMemoryContext,
  pair: CourseMemoryMessagePair,
) {
  const metadata = {
    source: "course_chat",
    course_id: context.courseId,
    course_title: context.courseTitle,
    course_topic: context.courseTopic,
    selected_block_id: context.selectedBlockId ?? undefined,
    selected_block_title: context.selectedBlockTitle ?? undefined,
    selected_block_type: context.selectedBlockType ?? undefined,
  };

  return provider.add({
    scope: { type: "user_course", userId: context.userId, courseId: context.courseId },
    messages: [
      { role: "user", content: pair.user },
      { role: "assistant", content: pair.assistant },
    ],
    metadata,
  });
}
