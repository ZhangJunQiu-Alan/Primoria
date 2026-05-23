import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";
import { normalizeCopilotMessagesWithAttachments } from "@/lib/ai/copilot-attachments";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

const deploymentUrl = process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:2024";

function settingsFromEnvironment() {
  const provider = process.env.AI_PROVIDER === "anthropic-compatible" ? "anthropic-compatible" : "openai-compatible";
  return {
    provider,
    baseUrl: provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL,
    apiKey: provider === "anthropic-compatible" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY,
    model: provider === "anthropic-compatible" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL,
  } as const;
}

function normalizeAgentMessages(messages: any[] = []) {
  return messages
    .filter((message) => message?.role !== "reasoning" && message?.role !== "activity")
    .map((message) => {
      if (message?.role === "developer") {
        return { ...message, role: "system" };
      }
      return message;
    });
}

class PrimoriaLangGraphAgent extends LangGraphAgent {
  ownerId: string | null;

  constructor(config: ConstructorParameters<typeof LangGraphAgent>[0] & { ownerId?: string | null }) {
    const { ownerId, ...agentConfig } = config;
    super(agentConfig);
    this.ownerId = ownerId ?? null;
  }

  clone() {
    const cloned = super.clone() as PrimoriaLangGraphAgent;
    cloned.ownerId = this.ownerId;
    return cloned;
  }

  run(input: any) {
    // Keep Primoria product chat history in Postgres while using a fresh
    // LangGraph runtime checkpoint per run. This avoids stale dev checkpoints
    // causing @ag-ui/langgraph "Message not found" errors.
    const runtimeThreadId = crypto.randomUUID();
    const ownerId = this.ownerId ?? undefined;
    return super.run({
      ...input,
      threadId: runtimeThreadId,
      messages: normalizeAgentMessages(input?.messages),
      state: {
        ...(input?.state ?? {}),
        primoria_owner_id: ownerId,
        user_id: ownerId,
      },
      context: {
        ...(input?.context ?? {}),
        primoria_owner_id: ownerId,
        user_id: ownerId,
      },
      forwardedProps: {
        ...(input?.forwardedProps ?? {}),
        config: {
          ...(input?.forwardedProps?.config ?? {}),
          configurable: {
            ...(input?.forwardedProps?.config?.configurable ?? {}),
            primoria_owner_id: ownerId,
          },
          metadata: {
            ...(input?.forwardedProps?.config?.metadata ?? {}),
            primoria_owner_id: ownerId,
          },
        },
      },
    });
  }
}

export const POST = async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) {
    return Response.json({ error: "Sign in required to use Primoria Tutor." }, { status: 401 });
  }

  const normalizedRequest = await requestWithNormalizedAttachments(req);
  const primoriaAgent = new PrimoriaLangGraphAgent({
    deploymentUrl,
    graphId: "primoria_tutor",
    ownerId: user?.id ?? null,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime: new CopilotRuntime({
      agents: {
        primoria_tutor: primoriaAgent as any,
      },
    }),
  });
  return handleRequest(normalizedRequest);
};

async function requestWithNormalizedAttachments(req: NextRequest) {
  const body = await req.json();
  const messages = await normalizeCopilotMessagesWithAttachments(body?.messages, settingsFromEnvironment());
  const headers = new Headers(req.headers);
  headers.set("content-type", "application/json");

  return new NextRequest(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify({
      ...body,
      messages,
    }),
  });
}
