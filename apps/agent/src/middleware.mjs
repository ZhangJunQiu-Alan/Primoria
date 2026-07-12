import { createMiddleware } from "langchain";
import { z } from "zod";
import { trimAgentHistory } from "./context-trim.mjs";
import { formatCourseDetailSystemPrompt } from "./prompts.mjs";

// One zod schema for middleware state and agent context. langchain v1
// middleware/agent APIs validate these as zod objects — Annotation.Root only
// appeared to work here because the langgraph dev server bypasses ReactAgent's
// middleware-state validation; bare graph.invoke() throws on it.
export const PrimoriaContextSchema = z.object({
  primoria_owner_id: z.string().optional(),
  user_id: z.string().optional(),
  copilotkit: z.any().optional(),
});

/**
 * @param {unknown} items
 */
function parseCourseDetailContextItems(items) {
  if (!Array.isArray(items)) return null;
  const item = items.find((entry) => entry?.description === "Primoria course detail mode");
  if (!item?.value) return null;
  try {
    return JSON.parse(String(item.value));
  } catch {
    return null;
  }
}

/**
 * @param {unknown} request
 */
function getCourseDetailContext(request) {
  const requestAny = /** @type {any} */ (request);
  return parseCourseDetailContextItems(requestAny?.runtime?.context?.copilotkit?.context)
    ?? parseCourseDetailContextItems(requestAny?.state?.copilotkit?.context)
    ?? parseCourseDetailContextItems(requestAny?.runtime?.state?.copilotkit?.context)
    ?? parseCourseDetailContextItems(requestAny?.runtime?.context?.["ag-ui"]?.context)
    ?? parseCourseDetailContextItems(requestAny?.state?.["ag-ui"]?.context)
    ?? parseCourseDetailContextItems(requestAny?.runtime?.state?.["ag-ui"]?.context)
    ?? null;
}

export const primoriaCourseDetailMiddleware = createMiddleware({
  name: "PrimoriaCourseDetailMiddleware",
  contextSchema: PrimoriaContextSchema,
  wrapModelCall: async (request, handler) => {
    const courseDetail = getCourseDetailContext(request);
    const extra = formatCourseDetailSystemPrompt(courseDetail);
    if (!extra) return handler(request);
    return handler({
      ...request,
      systemMessage: request.systemMessage.concat(`\n\n${extra}`),
    });
  },
});

export const primoriaContextMiddleware = createMiddleware({
  name: "PrimoriaContextMiddleware",
  contextSchema: PrimoriaContextSchema,
  stateSchema: PrimoriaContextSchema,
});

// Per-request history hygiene (state is untouched): compacts bulky payloads in
// past turns and caps total history size at turn boundaries, keeping the
// request prefix byte-stable so provider prompt caches keep hitting.
export const primoriaHistoryTrimMiddleware = createMiddleware({
  name: "PrimoriaHistoryTrimMiddleware",
  contextSchema: PrimoriaContextSchema,
  wrapModelCall: async (request, handler) => {
    const messages = /** @type {typeof request.messages} */ (trimAgentHistory(request.messages));
    if (messages === request.messages) return handler(request);
    return handler({ ...request, messages });
  },
});
