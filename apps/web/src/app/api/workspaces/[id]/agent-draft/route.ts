import { NextResponse } from "next/server";
import { z } from "zod";
import { draftAgentCompletion } from "@/lib/agent-os/ai";
import { getCurrentUser } from "@/lib/auth/session";
import { hasDatabaseUrl } from "@/lib/db/client";
import { getProviderSettings } from "@/lib/settings/user-settings";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView } from "@/lib/workspaces/store";

const DraftSchema = z.object({
  prompt: z.string().min(3).max(1200),
});

const AgentDraftSchema = z.object({
  displayName: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  systemPrompt: z.string().min(1).max(6000),
  skills: z.array(z.enum([
    "summarize_thread",
    "search_workspace_messages",
    "create_workspace_task",
    "update_workspace_task",
    "create_quiz",
    "generate_course",
    "save_learning_artifact",
    "save_agent_memory",
  ])).min(1).max(9),
});

function extractJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? value;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Agent draft was not valid JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function fallbackDraft(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  const firstWords = compact.split(" ").slice(0, 5).join(" ");
  return {
    displayName: titleCase(firstWords || "Learning Agent").slice(0, 80),
    description: compact.slice(0, 240) || "Helps with focused learning work.",
    systemPrompt: [
      `You are a focused learning agent. Your purpose is: ${compact || "help the user make progress"}.`,
      "Ask concise clarifying questions when the goal is ambiguous.",
      "Produce concrete next steps, short explanations, and useful artifacts when appropriate.",
      "Keep responses grounded in the current workspace context.",
    ].join("\n"),
    skills: ["summarize_thread", "search_workspace_messages"],
  };
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = DraftSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Agent draft request is invalid." }, { status: 400 });

  const providerSettings = user && hasDatabaseUrl() ? await getProviderSettings(user.id) : {};
  try {
    const content = await draftAgentCompletion([
      {
        role: "system",
        content:
          "Create a concise Primoria learning agent draft. Return only JSON with displayName, description, systemPrompt, and skills. Skills must be selected from summarize_thread, search_workspace_messages, create_workspace_task, update_workspace_task, create_quiz, generate_course, save_learning_artifact, save_agent_memory.",
      },
      {
        role: "user",
        content: parsed.data.prompt,
      },
    ], providerSettings);
    const draft = AgentDraftSchema.parse(extractJson(content));
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ draft: fallbackDraft(parsed.data.prompt), fallback: true });
  }
}
