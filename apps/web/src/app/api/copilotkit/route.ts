import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

const deploymentUrl = process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:2024";

const primoriaAgent = new LangGraphHttpAgent({
  url: deploymentUrl,
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
