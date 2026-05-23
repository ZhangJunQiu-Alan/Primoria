import { NextResponse } from "next/server";
import { z } from "zod";
import { runTutorAgent, runTutorAgentStream } from "@/lib/ai/tutor-agent";
import type { TutorStreamEvent } from "@/lib/ai/types";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
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
    if (body.stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          const emit = (event: TutorStreamEvent) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          };

          void runTutorAgentStream(body.messages, body.settings, emit)
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

    const result = await runTutorAgent(body.messages, body.settings);
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
