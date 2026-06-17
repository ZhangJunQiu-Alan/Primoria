import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import type { CourseBlock } from "@/lib/courses/types";
import { createTutorModel, generateCourse } from "@/lib/agent-os/ai";
import { AttachmentsSchema, buildAttachmentContext, buildCourseUserContent, processAttachments } from "@/lib/agent-os";
import {
  createMemoryProvider,
  formatCourseMemoryForPrompt,
  recordCourseInteraction,
  searchCourseMemory,
} from "@primoria/memory";
import { requireAuth } from "@/lib/auth/guard";

const RequestSchema = z.object({
  message: z.string().min(1),
  selectedBlockId: z.string().nullable().optional(),
  settings: z
    .object({
      provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
  attachments: AttachmentsSchema,
});

function blockToPrompt(block: CourseBlock) {
  const title = block.title ?? block.type;
  if (block.type === "text") return `Block ${title} (text):\n${block.markdown}`;
  if (block.type === "analogy") {
    return `Block ${title} (analogy):\nFamiliar: ${block.source}\nTarget: ${block.target}\nMapping: ${block.mapping}`;
  }
  if (block.type === "transfer") {
    return `Block ${title} (transfer):\nFrom: ${block.fromDomain}\nTo: ${block.toDomain}\nExplanation: ${block.explanation}\nExample: ${block.example}`;
  }
  if (block.type === "visual") {
    return `Block ${title} (visual):\nDescription: ${block.description}\nHTML summary: ${(block.html ?? "").slice(0, 700)}`;
  }
  if (block.type === "quiz") {
    const qs = block.questions.map((q, i) => `Q${i + 1} [${q.kind}]: ${q.question}`).join("\n");
    return `Block ${title} (quiz):\n${qs}`;
  }
  if (block.type === "mind_map") {
    return `Block ${title} (mind_map): root="${block.root.topic}", ${block.root.children?.length ?? 0} top-level branches`;
  }
  if (block.type === "slide") {
    const summary = block.slides.map((s, i) => `${i + 1}. ${s.title}`).join("; ");
    return `Block ${title} (slide, ${block.slides.length} slides): ${summary}`;
  }
  if (block.type === "worksheet") {
    const summary = block.items.map((it, i) => `${i + 1}[${it.kind}]: ${it.prompt.slice(0, 60)}`).join("; ");
    return `Block ${title} (worksheet, ${block.items.length} items): ${summary}`;
  }
  return `Block ${title} (code/${block.language}):\nExplanation: ${block.explanation}\nCode:\n${block.code}`;
}

function wantsFollowUpCourse(message: string) {
  return /(继续|再|另|新|创建|生成|做|create|make|build).{0,16}(课程|教程|微课|course|lesson)|进阶课程|相关的进阶/i.test(message);
}

function inferFollowUpTopic(message: string, courseTopic: string) {
  const cleaned = message
    .replace(/^(继续|再|另|新|帮我|请|please|create|make|build|生成|创建|做)\s*/i, "")
    .replace(/(一门|一个|一节|a|an)?\s*(课程|教程|微课|course|lesson)$/i, "")
    .replace(/[。.!！?？]+$/g, "")
    .trim();
  if (cleaned && cleaned.length >= 4 && !/^相关|^进阶/.test(cleaned)) return cleaned;
  return `${courseTopic}的进阶应用`;
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text: unknown }).text);
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;
    const { id } = await context.params;
    const body = RequestSchema.parse(await request.json());
    const course = await getCourse(id);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    const user = await getCurrentUser();

    const selectedBlock = body.selectedBlockId
      ? course.blocks.find((block) => block.id === body.selectedBlockId) ?? null
      : null;

    if (wantsFollowUpCourse(body.message)) {
      const topic = inferFollowUpTopic(body.message, course.topic);
      const { summary } = await generateCourse(
        {
          topic,
          contextHint: `Learner is currently studying "${course.title}" (${course.topic}). Current selected block: ${selectedBlock?.title ?? selectedBlock?.type ?? "none"}.`,
        },
        body.settings,
      );
      return NextResponse.json({
        reply: `我已经基于「${course.topic}」创建了一门新的进阶课程：${summary.title}。`,
        courseCard: summary,
      });
    }

    const model = createTutorModel(body.settings, { streaming: false });
    const memoryProvider = createMemoryProvider({
      apiKey: process.env.MEM0_API_KEY,
      host: process.env.MEM0_HOST,
      provider: process.env.MEMORY_PROVIDER === "mem0" ? "mem0" : "disabled",
    });
    const outline = course.blocks
      .map((block, index) => `${index + 1}. [${block.type}] ${block.title ?? block.type}`)
      .join("\n");
    const selected = selectedBlock ? blockToPrompt(selectedBlock) : "No selected block; answer from the whole course.";
    const processedAttachments = await processAttachments(body.attachments ?? [], body.settings);
    const attachmentContext = buildAttachmentContext(processedAttachments);
    const memoryContext = user
      ? await searchCourseMemory(
          memoryProvider,
          {
            userId: user.id,
            courseId: course.id,
            courseTitle: course.title,
            courseTopic: course.topic,
            selectedBlockId: selectedBlock?.id ?? null,
            selectedBlockTitle: selectedBlock?.title ?? null,
            selectedBlockType: selectedBlock?.type ?? null,
          },
          body.message,
        )
      : null;
    const memoryPrompt = memoryContext ? formatCourseMemoryForPrompt(memoryContext) : "No relevant long-term memory found.";
    const userContent = buildCourseUserContent(
      [
        `Course: ${course.title}`,
        `Topic: ${course.topic}`,
        `Summary: ${course.summary}`,
        `Relevant memory:\n${memoryPrompt}`,
        `Outline:\n${outline}`,
        `Selected context:\n${selected}`,
        "",
        body.message,
      ].join("\n"),
      attachmentContext,
      processedAttachments,
    );
    const result = await model.invoke([
      {
        role: "system",
        content: `You are Primoria Course Copilot. Answer using the current course context. Be concise, practical, and learner-friendly. If the user writes Chinese, answer in Chinese. If they ask for exercises, provide 2-4 questions with short hints. If they ask to modify the course content, explain that you can revise the selected block when they phrase the requested change clearly.`,
      },
      {
        role: "user",
        content: userContent,
      },
    ]);
    const reply = messageContentToString(result.content).trim();
    if (user) {
      void recordCourseInteraction(memoryProvider, {
        userId: user.id,
        courseId: course.id,
        courseTitle: course.title,
        courseTopic: course.topic,
        selectedBlockId: selectedBlock?.id ?? null,
        selectedBlockTitle: selectedBlock?.title ?? null,
        selectedBlockType: selectedBlock?.type ?? null,
      }, {
        user: body.message,
        assistant: reply,
      }).catch((error: unknown) => {
        console.error("[course/chat][memory]", error);
      });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[course/chat]", error);
    const message = error instanceof Error ? error.message : "Course chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
