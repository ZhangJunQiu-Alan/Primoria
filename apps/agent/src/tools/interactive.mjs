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
  async ({ component_id, request }) => {
    const known = INTERACTIVE_COMPONENT_IDS.includes(component_id);
    return JSON.stringify({
      type: "interactive_component_request",
      componentId: component_id,
      request,
      ...(known ? {} : { error: "unknown_component" }),
    });
  },
  {
    name: "open_interactive_component",
    description:
      "Open one pedagogical interactive component from the Primoria catalog (the component list is in the system prompt). Use it when the learner's visualization request matches a catalog component, and again with the same component_id when they ask to adjust it. Pass the learner's request verbatim as `request`. The UI generates parameters and renders the component; do not attempt to set concrete parameter values yourself.",
    schema: OpenInteractiveComponentArgsSchema,
    returnDirect: true,
  },
);
