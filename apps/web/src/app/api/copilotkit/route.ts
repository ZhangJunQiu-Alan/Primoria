import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";
import { normalizeCopilotMessagesWithAttachments } from "@/lib/agent-os";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

import { requireAuth } from "@/lib/auth/guard";

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

function formatCourseDetailContextForAgent(context: unknown) {
  const items = Array.isArray(context) ? context : [];
  const item = items.find((entry: any) => entry?.description === "Primoria course detail mode");
  if (!item?.value) return "";
  try {
    const parsed = JSON.parse(String(item.value));
    const course = parsed?.course;
    const selected = parsed?.selectedBlock;
    const selectedText = parsed?.selectedText;
    if (!course?.title) return "";
    return [
      "COURSE DETAIL MODE — highest priority for this run.",
      "The learner is inside an existing course detail page. Do not create a new course by default.",
      `Course id: ${course.id ?? ""}`,
      `Current course: ${course.title}`,
      `Topic: ${course.topic ?? ""}`,
      `Summary: ${course.summary ?? ""}`,
      `Selected block: ${selected ? `${selected.title ?? selected.type} (${selected.type}, id=${selected.id})` : "none; answer from the whole course"}`,
      `Selected text: ${selectedText?.text ? `"${String(selectedText.text)}" (block id=${selectedText.blockId}, ${selectedText.blockType ?? "block"})` : "none"}`,
      `Available blocks: ${(course.blocks ?? []).map((block: any) => `${block.index}. ${block.title} [${block.type}, id=${block.id}]`).join("; ")}`,
      "If selected text is present, treat phrases like this, selected part, make this simpler, rewrite this, or explain this as referring to that exact selected text and its owning block.",
      "For summarize/explain/practice questions, answer from this current course context. Only call generate_course if the learner explicitly asks for a new or different course.",
      "If asked to revise the selected text or selected block, call revise_selected_course_block.",
    ].join("\n");
  } catch {
    return "";
  }
}

function withCourseDetailContext(content: unknown, courseContext: string) {
  const visibleText = stripInjectedCourseContext(content);
  return [
    courseContext,
    "",
    "Learner question:",
    visibleText,
  ].join("\n");
}

function stripInjectedCourseContext(content: unknown) {
  const text = contentToText(content);
  const marker = "Learner question:";
  if (!text.includes("COURSE DETAIL MODE") || !text.includes(marker)) return text;
  const index = text.lastIndexOf(marker);
  return text.slice(index + marker.length).trimStart();
}

function contentToText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
        return "";
      })
      .join("\n");
  }
  return String(content ?? "");
}

function normalizeAgentMessages(messages: any[] = [], context?: unknown) {
  const normalized = messages
    .filter((message) => message?.role !== "reasoning" && message?.role !== "activity")
    .map((message) => {
      if (message?.role === "developer") {
        return { ...message, role: "system" };
      }
      return message;
    });
  const courseContext = formatCourseDetailContextForAgent(context);
  if (!courseContext) return normalized;
  const lastUserIndex = normalized.findLastIndex((message) => message?.role === "user");
  if (lastUserIndex < 0) return normalized;
  return normalized.map((message, index) =>
    index === lastUserIndex
      ? { ...message, content: withCourseDetailContext(message.content, courseContext) }
      : message,
  );
}

function sanitizeAgentState(state: any) {
  if (!state || !Array.isArray(state.messages)) return state ?? {};
  return {
    ...state,
    messages: state.messages.map((message: any) => ({
      ...message,
      content: stripInjectedCourseContext(message?.content),
    })),
  };
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

  connect() {
    // Product chat history is restored from Postgres on the web side. Avoid
    // attaching CopilotKit's UI thread directly to a LangGraph checkpoint on
    // mount, because stale dev checkpoints can re-inject old/malformed messages
    // before the learner sends anything.
    return { subscribe: (subscriber: any) => { subscriber?.complete?.(); return { unsubscribe() {} }; } } as any;
  }

  run(input: any) {
    // Keep Primoria product chat history in Postgres while using a fresh
    // LangGraph runtime checkpoint per run. This avoids stale dev checkpoints
    // causing @ag-ui/langgraph "Message not found" errors.
    const runtimeThreadId = crypto.randomUUID();
    const ownerId = this.ownerId ?? undefined;
    const appContext = Array.isArray(input?.context) ? input.context : [];
    const sanitizedState = sanitizeAgentState(input?.state);
    return super.run({
      ...input,
      threadId: runtimeThreadId,
      messages: normalizeAgentMessages(input?.messages, appContext),
      state: {
        ...sanitizedState,
        primoria_owner_id: ownerId,
        user_id: ownerId,
        copilotkit: {
          ...(input?.state?.copilotkit ?? {}),
          context: appContext,
        },
      },
      // Keep CopilotKit/AG-UI readable context as the array shape expected by
      // the LangGraph adapter. Owner data is passed via state/config below.
      context: appContext,
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
  const denied = await requireAuth();
  if (denied) return denied;

  const user = await getCurrentUser();
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
