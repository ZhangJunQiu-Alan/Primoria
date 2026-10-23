import { invokeJson, type JsonModelCall } from "@/lib/ai/course-generation/model-json";
import { contentTierSettings, fastTierSettings } from "@/lib/ai/deepagent/model";
import type { ImplementedComponent } from "@/lib/interactive/components/types";
import { assertNoUnknownConfigFields } from "./payload";
import { ZodError } from "zod";

// Stage-2 of the declarative-component flow: given a selected component,
// generate a full config (create) or a minimal patch (adjust) with the
// the catalog-appropriate LLM tier and validate it against the component's Zod
// schema. Shared by the production route and the QA experiment.

export const CONFIGURE_TIMEOUT_MS = 30_000;

const CONTENT_QUALITY_COMPONENTS = new Set([
  "general.timeline-causality",
  "humanities.source-comparison",
]);

export function usesContentQualityTier(componentId: string) {
  return CONTENT_QUALITY_COMPONENTS.has(componentId);
}

export type CurrentInstance = { componentId: string; config: Record<string, unknown> };

export function buildConfigurePrompts(
  prompt: string,
  component: ImplementedComponent,
  intent: "create" | "adjust",
  current: CurrentInstance | null,
) {
  if (intent === "adjust" && current && current.componentId === component.componentId) {
    const system = `你在调整一个已渲染的「${component.name}」组件。根据学生消息输出一个最小 config 补丁:只包含学生明确要求改变的字段,不要重复未变化的字段。学生要求保持的量必须原样保留。不得为了配合自己的解释额外修改 mode、view、类型或其他设置；视图枚举与输入量相互独立，除非学生明确要求切换视图。

${component.schemaDoc}
${component.patchHints ? `\n语义提示:${component.patchHints}` : ""}
只返回补丁 JSON。`;
    const user = `当前 config:${JSON.stringify(current.config)}\n\n学生消息:${prompt}`;
    return { system, user, mode: "patch" as const };
  }
  const defaults = component.configSchema.safeParse({});
  const system = `你在为「${component.name}」组件生成初始 config。从学生消息中提取参数;没提到的数值/枚举字段用默认值。文本内容字段(如材料、事件、标注)要根据学生的主题写出具体、教学上成立的内容,禁止输出「待补充」之类的占位文本。

${component.schemaDoc}
${defaults.success ? `\n配置模板（直接输出这些字段，不要包在 config 或其他对象中）:${JSON.stringify(defaults.data)}` : ""}

只返回完整 config JSON。`;
  const user = `学生消息:${prompt}`;
  return { system, user, mode: "create" as const };
}

export type ConfigureResult =
  | { ok: true; mode: "create"; config: Record<string, unknown>; ms: number; modelCalls: JsonModelCall[] }
  | { ok: true; mode: "patch"; config: Record<string, unknown>; patch: Record<string, unknown>; ms: number; modelCalls: JsonModelCall[] }
  | { ok: false; error: string; ms: number; modelCalls: JsonModelCall[] };

export async function configureComponent(
  prompt: string,
  component: ImplementedComponent,
  intent: "create" | "adjust",
  current: CurrentInstance | null,
  signal?: AbortSignal,
): Promise<ConfigureResult> {
  const configure = buildConfigurePrompts(prompt, component, intent, current);
  const start = Date.now();
  const modelCalls: JsonModelCall[] = [];
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rawValue = await invokeJson({
      system: configure.system,
      user: configure.user + feedback,
      settings: usesContentQualityTier(component.componentId) ? contentTierSettings() : fastTierSettings(),
      schema: configure.mode === "patch" ? component.patchSchema : component.configSchema,
      schemaName: "configure_component",
      utility: true,
      maxTokens: usesContentQualityTier(component.componentId) ? 8192 : 4096,
      timeoutMs: Math.max(1, CONFIGURE_TIMEOUT_MS - (Date.now() - start)),
      signal,
      onModelCall: (call) => modelCalls.push(call),
    });
    try {
      const value = (configure.mode === "patch" ? component.patchSchema : component.configSchema).parse(rawValue) as Record<string, unknown>;
      assertNoUnknownConfigFields(rawValue, value);
      const config = configure.mode === "patch" ? component.configSchema.parse({ ...current?.config, ...value }) as Record<string, unknown> : value;
      return configure.mode === "patch"
        ? { ok: true, mode: "patch", config, patch: value, ms: Date.now() - start, modelCalls }
        : { ok: true, mode: "create", config, ms: Date.now() - start, modelCalls };
    } catch (error) {
      const issues = error instanceof ZodError ? error.issues.map(({ path, message }) => ({ path, message })) : [{ path: [], message: error instanceof Error ? error.message : "Invalid configuration" }];
      feedback = `\n上次返回的JSON未通过配置校验。请仅修正列出的错误并重新返回${configure.mode === "patch" ? "最小补丁" : "完整配置"}，保留学生请求。\n错误:${JSON.stringify(issues)}\n上次JSON:${JSON.stringify(rawValue)}`;
    }
  }
  return { ok: false, error: "config 未通过 Zod 校验", ms: Date.now() - start, modelCalls };
}
