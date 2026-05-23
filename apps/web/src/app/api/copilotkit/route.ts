import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

const deploymentUrl = process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:2024";

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
  ownerId?: string | null;

  run(input: any) {
    // First-principles fix for dev/runtime stability:
    // CopilotKit's threadId is a product/UI conversation id that we persist in
    // Primoria Postgres. LangGraph dev server currently uses in-memory
    // checkpoints. If we reuse the product threadId as the LangGraph runtime
    // threadId, stale checkpoints can make @ag-ui/langgraph enter its
    // "regenerate from checkpoint" path and throw `Message not found`.
    //
    // The request already carries the current CopilotKit messages, so LangGraph
    // does not need a long-lived MemorySaver thread for our current product
    // behavior. Use a fresh runtime thread per run and keep product history in DB.
    const runtimeThreadId = crypto.randomUUID();
    return super.run({
      ...input,
      threadId: runtimeThreadId,
      messages: normalizeAgentMessages(input?.messages),
      context: {
        ...(input?.context ?? {}),
        primoria_owner_id: this.ownerId ?? undefined,
      },
      forwardedProps: {
        ...(input?.forwardedProps ?? {}),
        config: {
          ...(input?.forwardedProps?.config ?? {}),
          configurable: {
            ...(input?.forwardedProps?.config?.configurable ?? {}),
            primoria_owner_id: this.ownerId ?? undefined,
          },
        },
      },
    });
  }
}

const primoriaAgent = new PrimoriaLangGraphAgent({
  deploymentUrl,
  graphId: "primoria_tutor",
});

export const POST = async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) {
    return Response.json({ error: "Sign in required to use Primoria Tutor." }, { status: 401 });
  }
  primoriaAgent.ownerId = user?.id ?? null;
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime: new CopilotRuntime({
      agents: {
        primoria_tutor: primoriaAgent,
      },
    }),
  });
  try {
    return await handleRequest(req);
  } finally {
    primoriaAgent.ownerId = null;
  }
};
