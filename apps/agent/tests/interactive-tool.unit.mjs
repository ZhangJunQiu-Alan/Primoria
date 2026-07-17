import assert from "node:assert/strict";
import { openInteractiveComponentTool } from "../src/tools/interactive.mjs";

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

process.stdout.write("[interactive-tool.unit] ALL CHECKS PASSED\n");
