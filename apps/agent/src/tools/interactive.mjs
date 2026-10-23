import { tool } from "@langchain/core/tools";
import { OpenInteractiveComponentArgsSchema, SearchInteractiveComponentsArgsSchema } from "@primoria/contracts/artifacts/schemas";
import { INTERACTIVE_COMPONENT_IDS } from "@primoria/contracts/artifacts/interactive-catalog";
import { searchInteractiveComponents, INTERACTIVE_CATALOG_HASH } from "@primoria/contracts/artifacts/interactive-search";

/** @param {any} messages */
export function learnerRequestFromMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const message = [...messages].reverse().find((item) => item?.role === "user" || item?.type === "human" || item?.getType?.() === "human");
  const content = typeof message?.content === "string" ? message.content : Array.isArray(message?.content) ? message.content.map(/** @param {any} part */ (part) => typeof part === "string" ? part : part?.text ?? "").join("\n") : null;
  if (!content) return null;
  const marker = "Learner question:";
  const visible = (content.includes("COURSE DETAIL MODE") || content.includes("PRIMORIA LEARNER PROFILE")) && content.includes(marker) ? content.slice(content.lastIndexOf(marker) + marker.length).trimStart() : content;
  return visible.length <= 2000 ? visible : null;
}

export const searchInteractiveComponentsTool = tool(
  async (input) => JSON.stringify({ catalogHash: INTERACTIVE_CATALOG_HASH, candidates: searchInteractiveComponents(input) }),
  {
    name: "search_interactive_components",
    description: "Read-only search of trusted teaching visualizations. Search the learner's concept and intended interaction, optionally with an explicit discipline/stage. Returns bounded candidates and exclusions, never configurations. Use before opening a component when the directory is large or the match is unclear.",
    schema: SearchInteractiveComponentsArgsSchema,
  },
);

/**
 * Stateless signal, mirroring position_learning_goal (Web-as-brain): choosing
 * this tool with a component_id IS the stage-1 catalog routing. The browser
 * card calls the web API (learner session attached) to generate the validated
 * config (stage-2) and renders the component; the agent never sees configs.
 */
export const openInteractiveComponentTool = tool(
  async ({ component_id, request, target_instance_id }, runtime) => {
    const known = INTERACTIVE_COMPONENT_IDS.includes(component_id);
    const instanceId = runtime?.toolCall?.id;
    if (!instanceId) throw new Error("Interactive component tool call id is unavailable");
    return JSON.stringify({
      type: "interactive_component_request",
      componentId: component_id,
      request: learnerRequestFromMessages(runtime && "state" in runtime ? runtime.state?.messages : undefined) ?? request,
      instanceId,
      ...(target_instance_id ? { targetInstanceId: target_instance_id } : {}),
      ...(known ? {} : { error: "unknown_component" }),
    });
  },
  {
    name: "open_interactive_component",
    description:
      "Open one pedagogical interactive component from the Primoria catalog (use search_interactive_components for candidates). Use it when the learner's visualization request matches a catalog component. For a later adjustment, use the same component_id and copy the exact instanceId from the prior tool result into target_instance_id. Pass the learner's request verbatim as request. The UI generates parameters and renders the component; do not attempt to set concrete parameter values yourself.",
    schema: OpenInteractiveComponentArgsSchema,
    returnDirect: true,
  },
);
