import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

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
  run(input: any) {
    return super.run({
      ...input,
      messages: normalizeAgentMessages(input?.messages),
    });
  }
}

const primoriaAgent = new PrimoriaLangGraphAgent({
  deploymentUrl,
  graphId: "primoria_tutor",
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime: new CopilotRuntime({
      agents: {
        primoria_tutor: primoriaAgent,
      },
    }),
  });
  return handleRequest(req);
};
