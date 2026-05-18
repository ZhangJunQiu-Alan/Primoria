import { NextResponse } from "next/server";
import { z } from "zod";
import { runTutorAgent } from "@/lib/ai/tutor-agent";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  settings: z
    .object({
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
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

  return "The tutor backend could not complete this request. Please retry.";
}

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
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
