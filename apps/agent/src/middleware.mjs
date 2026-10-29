import { createMiddleware } from "langchain";
import { z } from "zod";
import { formatTutorStylePrompt } from "@primoria/contracts/tutor-style-prompt";
import { formatTutorLanguagePrompt, resolveTutorLanguage } from "@primoria/contracts/tutor-language";
import { trimAgentHistory } from "./context-trim.mjs";
import { formatCourseDetailSystemPrompt } from "./prompts.mjs";

// One zod schema for middleware state and agent context. langchain v1
// middleware/agent APIs validate these as zod objects — Annotation.Root only
// appeared to work here because the langgraph dev server bypasses ReactAgent's
// middleware-state validation; bare graph.invoke() throws on it.
export const PrimoriaContextSchema = z.object({
  primoria_owner_id: z.string().optional(),
  user_id: z.string().optional(),
  primoria_tutor_style: z.string().nullish(),
  primoria_content_language: z.enum(["zh", "en"]).optional(),
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

// The learner's chosen Tutor persona. Web passes the stored profile value (or
// null) as run state, and the runner copies it into the runtime context, which
// also reaches subagents. Deliberately no stateSchema: on concept-agent it would
// make every task return these keys to the parent, and two parallel tasks would
// then collide on the parent's last-value channels. Unknown/missing values
// resolve to the shared default style.
export const primoriaTutorStyleMiddleware = createMiddleware({
  name: "PrimoriaTutorStyleMiddleware",
  contextSchema: PrimoriaContextSchema,
  wrapModelCall: async (request, handler) => {
    const requestAny = /** @type {any} */ (request);
    const style = requestAny?.runtime?.context?.primoria_tutor_style ?? requestAny?.state?.primoria_tutor_style;
    const language = requestAny?.runtime?.context?.primoria_content_language ?? requestAny?.state?.primoria_content_language
      ?? resolveTutorLanguage("auto", request.messages.map((message) => ({ role: message.type === "human" ? "user" : message.type, content: message.content })));
    return handler({
      ...request,
      systemMessage: request.systemMessage.concat(`\n\n${formatTutorStylePrompt(style)}\n\n${formatTutorLanguagePrompt(language)}`),
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
