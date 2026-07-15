import { invokeJson } from "@/lib/ai/course-generation/model-json";
import { fastTierSettings } from "@/lib/ai/deepagent/model";
import {
  COMPONENT_REGISTRY,
  SelectDecisionSchema,
  getRegistryEntry,
  type SelectDecision,
} from "@/lib/interactive/components/registry";
import type { CurrentInstance } from "@/lib/interactive/configure";

export const SELECT_COMPONENT_TIMEOUT_MS = 30_000;

export function buildSelectComponentPrompts(prompt: string, current: CurrentInstance | null) {
  const catalogLines = COMPONENT_REGISTRY.map(
    (entry) => `- ${entry.componentId}(${entry.name}):${entry.catalogDescription}`,
  ).join("\n");
  const system = `你是教学可视化的组件路由器。根据学生的消息,判断是否需要交互可视化组件,以及用哪个。

组件目录(componentId — 描述):
${catalogLines}

判定规则:
- 消息需要新的交互可视化,且目录中有贴切的组件 → intent="create",componentId 取该组件。
- 已存在组件实例,且消息是对它的调整(改参数、换类型、移动物体等)→ intent="adjust",componentId 取当前实例的组件。
- 消息需要可视化,但目录中没有任何贴切的组件 → intent="off_catalog",componentId=null。
- 消息是普通问答/闲聊,不需要可视化 → intent="chat",componentId=null。

componentId 只能取目录中出现过的值或 null。reason 用一句中文说明判定依据。
只返回 JSON:{"intent":"...","componentId":"...或null","reason":"..."}`;
  const user = current
    ? `当前组件实例:${current.componentId},config=${JSON.stringify(current.config)}\n\n学生消息:${prompt}`
    : `当前没有组件实例。\n\n学生消息:${prompt}`;
  return { system, user };
}

export async function selectInteractiveComponent(
  prompt: string,
  current: CurrentInstance | null,
): Promise<{ decision: SelectDecision; ms: number }> {
  const selectPrompts = buildSelectComponentPrompts(prompt, current);
  const startedAt = Date.now();
  const rawDecision = await invokeJson({
    system: selectPrompts.system,
    user: selectPrompts.user,
    settings: fastTierSettings(),
    schema: SelectDecisionSchema,
    schemaName: "select_component",
    timeoutMs: SELECT_COMPONENT_TIMEOUT_MS,
  });
  const decision = SelectDecisionSchema.parse(rawDecision);
  if (decision.componentId && !getRegistryEntry(decision.componentId)) {
    throw new Error(`路由返回了目录外的组件 id:${decision.componentId}`);
  }
  return { decision, ms: Date.now() - startedAt };
}
