import { NextResponse } from "next/server";
import { z } from "zod";
import { applyAttachmentsToLatestUserMessage, AttachmentsSchema, processAttachments } from "@/lib/ai/attachments";
import { runTutorAgent, runTutorAgentStream } from "@/lib/ai/tutor-agent";
import type { TutorStreamEvent } from "@/lib/ai/types";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { hasDatabaseUrl } from "@/lib/db/client";

const ContentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string() }) }),
]);

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.union([z.string(), z.array(ContentPartSchema)]),
    }),
  ),
  settings: z
    .object({
      provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
  stream: z.boolean().optional(),
  attachments: AttachmentsSchema,
});

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/Missing OPENAI/i.test(message)) {
    return "Provider settings are missing. Open Settings and configure an OpenAI-compatible base URL and API key.";
  }

  if (/insufficient.*balance|balance.*insufficient|quota|credit/i.test(message)) {
    return "The configured model provider says this account has insufficient balance or credits. Add credits, switch API keys, or choose another provider in Settings.";
  }

  if (/fetch failed|socket|closed|timeout|502|503|504|network|OpenAI-compatible request failed/i.test(message)) {
    return "The model provider connection was interrupted. Please retry in a moment, or switch to a faster model in Settings.";
  }

  if (/openai_error/i.test(message)) {
    return "The model provider rejected this request with a generic OpenAI-compatible error. Check the API key, account credits, and selected model in Settings.";
  }

  return "The tutor backend could not complete this request. Please retry.";
}

export async function POST(request: Request) {
  try {
    if (isAuthEnabled() && !(await getCurrentUser())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = RequestSchema.parse(await request.json());
    const providerSettings = isAuthEnabled() || hasDatabaseUrl() ? body.settings : undefined;
    const processedAttachments = await processAttachments(body.attachments ?? [], providerSettings);
    const messages = applyAttachmentsToLatestUserMessage(body.messages, processedAttachments);

    if (body.stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          const emit = (event: TutorStreamEvent) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          };

          void runTutorAgentStream(messages, providerSettings, emit)
            .catch((error) => {
              console.error("[tutor/chat:stream]", error);
              emit({
                type: "error",
                reply: userFacingError(error),
              });
            })
            .finally(() => controller.close());
        },
      });

      return new Response(stream, {
        headers: {
          "content-type": "application/x-ndjson; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
      });
    }

    const result = await runTutorAgent(messages, providerSettings);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[tutor/chat]", error);
    return NextResponse.json(
      {
        label: "Tutor team",
        reply: userFacingError(error),
        artifacts: [],
        suggestions: [],
      },
      { status: 503 },
    );
  }
}
