import { invokeJson } from "@/lib/ai/course-generation/model-json";
import { fastTierSettings } from "@/lib/ai/deepagent/model";
import type { ImplementedComponent } from "@/lib/interactive/components/types";

// Stage-2 of the declarative-component flow: given a selected component,
// generate a full config (create) or a minimal patch (adjust) with the
// fast-tier LLM and validate it against the component's Zod schema. Shared by
// the production route (/api/interactive-component) and the QA experiment.

export const CONFIGURE_TIMEOUT_MS = 30_000;

export type CurrentInstance = { componentId: string; config: Record<string, unknown> };

export function buildConfigurePrompts(
  prompt: string,
  component: ImplementedComponent,
  intent: "create" | "adjust",
  current: CurrentInstance | null,
) {
  if (intent === "adjust" && current && current.componentId === component.componentId) {
    const system = `你在调整一个已渲染的「${component.name}」组件。根据学生消息输出一个最小 config 补丁:只包含需要改变的字段,不要重复未变化的字段。

${component.schemaDoc}
${component.patchHints ? `\n语义提示:${component.patchHints}` : ""}
只返回补丁 JSON。`;
    const user = `当前 config:${JSON.stringify(current.config)}\n\n学生消息:${prompt}`;
    return { system, user, mode: "patch" as const };
  }
  const system = `你在为「${component.name}」组件生成初始 config。从学生消息中提取参数;没提到的数值/枚举字段用默认值。文本内容字段(如材料、事件、标注)要根据学生的主题写出具体、教学上成立的内容,禁止输出「待补充」之类的占位文本。

${component.schemaDoc}

只返回完整 config JSON。`;
  const user = `学生消息:${prompt}`;
  return { system, user, mode: "create" as const };
}

export type ConfigureResult =
  | { ok: true; mode: "create"; config: Record<string, unknown>; ms: number }
  | { ok: true; mode: "patch"; config: Record<string, unknown>; patch: Record<string, unknown>; ms: number }
  | { ok: false; error: string };

export async function configureComponent(
  prompt: string,
  component: ImplementedComponent,
  intent: "create" | "adjust",
  current: CurrentInstance | null,
): Promise<ConfigureResult> {
  const configure = buildConfigurePrompts(prompt, component, intent, current);
  const start = Date.now();
  const rawValue = await invokeJson({
    system: configure.system,
    user: configure.user,
    settings: fastTierSettings(),
    schema: configure.mode === "patch" ? component.patchSchema : component.configSchema,
    schemaName: "configure_component",
    timeoutMs: CONFIGURE_TIMEOUT_MS,
  });
  const ms = Date.now() - start;

  if (configure.mode === "patch") {
    const patch = component.patchSchema.safeParse(rawValue);
    if (!patch.success) return { ok: false, error: "config 补丁未通过 Zod 校验" };
    // Merge onto the current instance and re-validate the merged whole, so a
    // patch can never produce an invalid full config.
    const merged = component.configSchema.safeParse({
      ...(current?.config ?? {}),
      ...(patch.data as Record<string, unknown>),
    });
    if (!merged.success) return { ok: false, error: "补丁合并后的 config 未通过 Zod 校验" };
    return {
      ok: true,
      mode: "patch",
      config: merged.data as Record<string, unknown>,
      patch: patch.data as Record<string, unknown>,
      ms,
    };
  }

  const config = component.configSchema.safeParse(rawValue);
  if (!config.success) return { ok: false, error: "config 未通过 Zod 校验" };
  return { ok: true, mode: "create", config: config.data as Record<string, unknown>, ms };
}
