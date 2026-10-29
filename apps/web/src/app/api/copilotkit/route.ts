import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";
import { normalizeCopilotMessagesWithAttachments } from "@/lib/agent-os";
import { getAgentInternalToken } from "@/lib/ai/agent-internal-auth";
import { getLearnerProfile } from "@/lib/learner-profile/store";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { selectPlannerFacts } from "@/lib/courses/lesson-generation-context";
import { factsDirective, type LearnerFact, type LearnerProfile } from "@/lib/learner-profile/types";
import { buildCourseMaterialTutorContext, MATERIAL_CONTEXT_MARKER } from "@/lib/materials/tutor-context";

import { requireAuthUser } from "@/lib/auth/guard";
import { exceedsAgentInputArrayLimit } from "@primoria/contracts/agent-input-limits";
import { resolveTutorLanguage } from "@primoria/contracts/tutor-language";
import { getUserPreferences, type ContentLanguage } from "@/lib/settings/user-settings";

const agentRuntimeBaseUrl = process.env.PRIMORIA_AGENT_URL ?? "http://localhost:2024";
const agentRuntimeUrl = `${agentRuntimeBaseUrl.replace(/\/$/, "")}/agent`;

function settingsFromEnvironment() {
  const provider = process.env.AI_PROVIDER === "anthropic-compatible" ? "anthropic-compatible" : "openai-compatible";
  return {
    provider,
    baseUrl: provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL,
    apiKey: provider === "anthropic-compatible" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY,
    model: provider === "anthropic-compatible" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL,
  } as const;
}

function flattenCourseBlocks(course: any) {
  if (Array.isArray(course?.blocks)) return course.blocks;
  if (!Array.isArray(course?.lessons)) return [];
  return [...course.lessons]
    .sort((a, b) => Number(a?.sortKey ?? 0) - Number(b?.sortKey ?? 0))
    .flatMap((lesson) => (Array.isArray(lesson?.blocks) ? lesson.blocks : []));
}

function formatAvailableBlocks(course: any) {
  return flattenCourseBlocks(course)
    .map((block: any, index: number) => `${block.index ?? index + 1}. ${block.title ?? block.type} [${block.type}, id=${block.id}]`)
    .join("; ");
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
      `Available blocks: ${formatAvailableBlocks(course)}`,
      "If selected text is present, treat phrases like this, selected part, make this simpler, rewrite this, or explain this as referring to that exact selected text and its owning block.",
      "For summarize/explain/practice questions, answer from this current course context. Only call request_course_intake if the learner explicitly asks for a new or different course.",
      "If asked to revise the selected text or selected block, call revise_selected_course_block.",
    ].join("\n");
  } catch {
    return "";
  }
}

// Tutor style is not part of this block: it travels as `primoria_tutor_style`
// run state and the Agent renders it into the system prompt.
function formatLearnerProfileContextForAgent(facts: LearnerFact[] = []) {
  // Same teaching-relevant facts the lesson Planner uses (preference /
  // prior_knowledge / learning_gap, ranked + capped); goal is profile-only.
  const selectedFacts = selectPlannerFacts(facts);
  if (selectedFacts.length === 0) return "";
  return [
    "PRIMORIA LEARNER PROFILE - hidden context.",
    factsDirective(selectedFacts),
    "This profile affects AI Tutor dialogue only. Do not use it to create or modify course lesson content.",
  ].join("\n");
}

function withHiddenAgentContext(content: unknown, contexts: string[]) {
  const visibleText = stripInjectedCourseContext(content);
  return [
    ...contexts.filter(Boolean),
    "",
    "Learner question:",
    visibleText,
  ].join("\n");
}

function stripInjectedCourseContext(content: unknown) {
  const text = contentToText(content);
  const marker = "Learner question:";
  const hasHiddenContext = text.includes("COURSE DETAIL MODE") || text.includes("PRIMORIA LEARNER PROFILE") || text.includes(MATERIAL_CONTEXT_MARKER);
  if (!hasHiddenContext || !text.includes(marker)) return text;
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

function normalizeAgentMessages(messages: any[] = [], context?: unknown, learnerFacts: LearnerFact[] = [], materialContext = "") {
  const normalized = messages
    .filter((message) => message?.role !== "reasoning" && message?.role !== "activity")
    .map((message) => {
      if (message?.role === "developer") {
        return { ...message, role: "system" };
      }
      return message;
    });
  const courseContext = formatCourseDetailContextForAgent(context);
  const profileContext = formatLearnerProfileContextForAgent(learnerFacts);
  // Material excerpts only accompany course detail mode (they are retrieved
  // for a material course the learner has open).
  const excerptContext = courseContext ? materialContext : "";
  if (!courseContext && !profileContext) return normalized;
  const lastUserIndex = normalized.findLastIndex((message) => message?.role === "user");
  if (lastUserIndex < 0) return normalized;
  const contexts = [profileContext, courseContext, excerptContext].filter(Boolean);
  return normalized.map((message, index) =>
    index === lastUserIndex
      ? { ...message, content: withHiddenAgentContext(message.content, contexts) }
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

class PrimoriaHttpAgent extends LangGraphHttpAgent {
  ownerId: string | null;
  learnerProfile: LearnerProfile | null;
  learnerFacts: LearnerFact[];
  materialContext: string;
  runtimeBaseUrl: string;
  activeRunId: string | null;
  contentLanguage: ContentLanguage;

  constructor(config: ConstructorParameters<typeof LangGraphHttpAgent>[0] & { runtimeBaseUrl: string; ownerId?: string | null; learnerProfile?: LearnerProfile | null; learnerFacts?: LearnerFact[]; materialContext?: string; contentLanguage?: ContentLanguage }) {
    const { runtimeBaseUrl, ownerId, learnerProfile, learnerFacts, materialContext, contentLanguage, ...agentConfig } = config;
    super(agentConfig);
    this.runtimeBaseUrl = runtimeBaseUrl;
    this.ownerId = ownerId ?? null;
    this.learnerProfile = learnerProfile ?? null;
    this.learnerFacts = learnerFacts ?? [];
    this.materialContext = materialContext ?? "";
    this.activeRunId = null;
    this.contentLanguage = contentLanguage ?? "auto";
  }

  clone() {
    const cloned = super.clone() as PrimoriaHttpAgent;
    cloned.runtimeBaseUrl = this.runtimeBaseUrl;
    cloned.ownerId = this.ownerId;
    cloned.learnerProfile = this.learnerProfile;
    cloned.learnerFacts = this.learnerFacts;
    cloned.materialContext = this.materialContext;
    cloned.activeRunId = this.activeRunId;
    cloned.contentLanguage = this.contentLanguage;
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
    this.activeRunId = input.runId;
    const ownerId = this.ownerId ?? undefined;
    const appContext = Array.isArray(input?.context) ? input.context : [];
    const sanitizedState = sanitizeAgentState(input?.state);
    return super.run({
      ...input,
      threadId: input.runId,
      messages: normalizeAgentMessages(input?.messages, appContext, this.learnerFacts, this.materialContext),
      state: {
        ...sanitizedState,
        primoria_owner_id: ownerId,
        user_id: ownerId,
        // Always set server-side so a client-supplied value never survives the spread.
        primoria_tutor_style: this.learnerProfile?.tutorStyle ?? null,
        primoria_content_language: resolveTutorLanguage(this.contentLanguage, input?.messages),
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

  abortRun() {
    super.abortRun();
    if (!this.activeRunId) return;
    void fetch(`${this.runtimeBaseUrl.replace(/\/$/, "")}/runs/${encodeURIComponent(this.activeRunId)}/cancel`, {
      method: "POST",
      headers: {
        "x-primoria-agent-token": getAgentInternalToken(),
        "x-primoria-owner-id": this.ownerId ?? "local-dev",
      },
    }).catch(() => {});
  }
}

export const POST = async (req: NextRequest) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  const ownerId = user?.id ?? "local-dev";
  const json = await readJsonBody(req);
  if (exceedsAgentInputArrayLimit(json?.body)) return Response.json({ error: "agent_input_too_large" }, { status: 413 });

  const [learnerProfile, learnerFacts, materialContext, preferences] = user?.id
    ? await Promise.all([getLearnerProfile(user.id), listActiveFacts(user.id), materialContextFor(user.id, json?.body), getUserPreferences(user.id)])
    : [null, [] as LearnerFact[], "", { contentLanguage: "auto" as const }];
  const normalizedRequest = json ? await requestWithNormalizedAttachments(req, json.body) : req;
  const primoriaAgent = new PrimoriaHttpAgent({
    url: agentRuntimeUrl,
    agentId: "primoria_tutor",
    runtimeBaseUrl: agentRuntimeBaseUrl,
    ownerId,
    learnerProfile,
    learnerFacts,
    materialContext,
    contentLanguage: preferences.contentLanguage,
    headers: {
      "x-request-id": requestId,
      "x-primoria-agent-token": getAgentInternalToken(),
      "x-primoria-owner-id": ownerId,
    },
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
  const response = await handleRequest(normalizedRequest);
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/event-stream; charset=utf-8");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
};

// Retrieval for the learner's latest question when the course rail is open on
// a material course. Grounding is an enhancement: any failure answers from the
// ordinary course context instead of failing the run.
async function materialContextFor(ownerId: string, body: any): Promise<string> {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const latestUser = [...messages].reverse().find((message: any) => message?.role === "user");
  if (!latestUser || !Array.isArray(body?.context)) return "";
  try {
    return await buildCourseMaterialTutorContext({
      ownerId,
      context: body.context,
      question: stripInjectedCourseContext(latestUser.content),
    });
  } catch (error) {
    console.warn("[copilotkit] material retrieval failed:", error instanceof Error ? error.message : error);
    return "";
  }
}

async function readJsonBody(req: NextRequest): Promise<{ body: any } | null> {
  try {
    return { body: await req.clone().json() };
  } catch {
    // Request has no JSON body or is empty
    return null;
  }
}

async function requestWithNormalizedAttachments(req: NextRequest, body: any) {
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
