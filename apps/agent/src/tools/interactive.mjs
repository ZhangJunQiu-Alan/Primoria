import { tool } from "@langchain/core/tools";
import { OpenInteractiveComponentArgsSchema } from "@primoria/contracts/artifacts/schemas";
import { INTERACTIVE_COMPONENT_IDS } from "@primoria/contracts/artifacts/interactive-catalog";

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
      request,
      instanceId,
      ...(target_instance_id ? { targetInstanceId: target_instance_id } : {}),
      ...(known ? {} : { error: "unknown_component" }),
    });
  },
  {
    name: "open_interactive_component",
    description:
      "Open one pedagogical interactive component from the Primoria catalog (the component list is in the system prompt). Use it when the learner's visualization request matches a catalog component. For a later adjustment, use the same component_id and copy the exact instanceId from the prior tool result into target_instance_id. Pass the learner's request verbatim as request. The UI generates parameters and renders the component; do not attempt to set concrete parameter values yourself.",
    schema: OpenInteractiveComponentArgsSchema,
    returnDirect: true,
  },
);
