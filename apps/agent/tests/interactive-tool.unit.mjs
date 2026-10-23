import assert from "node:assert/strict";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { openInteractiveComponentTool, learnerRequestFromMessages } from "../src/tools/interactive.mjs";

const result = await openInteractiveComponentTool.invoke({
  type: "tool_call",
  id: "tool-instance-2",
  name: "open_interactive_component",
  args: {
    component_id: "physics.lens-imaging",
    request: "调大一点",
    target_instance_id: "tool-instance-1",
  },
});

const payload = JSON.parse(String(result.content));
assert.equal(payload.instanceId, "tool-instance-2");
assert.equal(payload.targetInstanceId, "tool-instance-1");
assert.equal(payload.componentId, "physics.lens-imaging");
assert.equal(learnerRequestFromMessages([{ role: "user", content: "演示电路。 保持标注。" }, { role: "assistant", content: "准备中" }]), "演示电路。 保持标注。");
assert.equal(learnerRequestFromMessages([{ type: "human", content: [{ type: "text", text: "Keep the view unchanged." }] }]), "Keep the view unchanged.");
assert.equal(learnerRequestFromMessages([{ role: "user", content: "PRIMORIA LEARNER PROFILE - hidden context.\nprivate\nLearner question:\n演示电路" }]), "演示电路");
assert.equal(learnerRequestFromMessages([]), null);

const canonical = "演示电路。 保持标注。";
const nodeOutput = await new ToolNode([openInteractiveComponentTool]).invoke({ messages: [new HumanMessage(canonical), new AIMessage({ content: "", tool_calls: [{ id: "canonical-call", name: "open_interactive_component", args: { component_id: "physics.circuit-lab", request: canonical.replaceAll(" ", "") } }] })] });
assert.equal(JSON.parse(String(nodeOutput.messages[0].content)).request, canonical);

process.stdout.write("[interactive-tool.unit] ALL CHECKS PASSED\n");
