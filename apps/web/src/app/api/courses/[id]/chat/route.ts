import { NextResponse } from "next/server";
import { z } from "zod";
import { getCourse } from "@/lib/courses/store";
import type { CourseBlock } from "@/lib/courses/types";
import { createTutorModel } from "@/lib/ai/deepagent/model";
import { generateCourse } from "@/lib/ai/deepagent/course-generator";
import { AttachmentsSchema, buildAttachmentContext, buildCourseUserContent, processAttachments } from "@/lib/ai/attachments";

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
    const { id } = await context.params;
    const body = RequestSchema.parse(await request.json());
    const course = await getCourse(id);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

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
    const outline = course.blocks
      .map((block, index) => `${index + 1}. [${block.type}] ${block.title ?? block.type}`)
      .join("\n");
    const selected = selectedBlock ? blockToPrompt(selectedBlock) : "No selected block; answer from the whole course.";
    const processedAttachments = await processAttachments(body.attachments ?? [], body.settings);
    const attachmentContext = buildAttachmentContext(processedAttachments);
    const userContent = buildCourseUserContent(
      [
        `Course: ${course.title}`,
        `Topic: ${course.topic}`,
        `Summary: ${course.summary}`,
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

    return NextResponse.json({ reply: messageContentToString(result.content).trim() });
  } catch (error) {
    console.error("[course/chat]", error);
    const message = error instanceof Error ? error.message : "Course chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
