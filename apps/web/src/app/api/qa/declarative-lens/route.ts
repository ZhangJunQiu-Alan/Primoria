import { NextResponse } from "next/server";
import { z } from "zod";
import { invokeJson } from "@/lib/ai/course-generation/model-json";
import { fastTierSettings } from "@/lib/ai/deepagent/model";
import {
  COMPONENT_REGISTRY,
  SelectDecisionSchema,
  getImplementedComponent,
  getRegistryEntry,
  type LensRouteResponse,
} from "@/lib/qa/components/registry";
import type { ImplementedComponent } from "@/lib/qa/components/types";

// Experimental two-stage declarative-component router (QA only):
// stage 1 sees only the component catalog (one line each) and picks a
// component + intent; stage 2 gets the full config schema of the selected
// component and emits a create config or a minimal patch. Mirrors the planned
// agent flow (select_component → configure_component). Generic over the
// registry — adding a component must not require edits here.

const STAGE_TIMEOUT_MS = 30_000;

const RequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  current: z
    .object({
      componentId: z.string(),
      config: z.record(z.string(), z.unknown()),
    })
    .nullable()
    .optional(),
});

type CurrentInstance = { componentId: string; config: Record<string, unknown> };

function isQaRouteAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.PRIMORIA_ENABLE_QA_ROUTES === "1";
}

function buildSelectPrompts(prompt: string, current: CurrentInstance | null) {
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

function buildConfigurePrompts(
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

export async function POST(request: Request) {
  if (!isQaRouteAllowed()) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  try {
    const body = RequestSchema.parse(await request.json());
    const current = body.current ?? null;

    // Stage 1: catalog-only routing.
    const selectPrompts = buildSelectPrompts(body.prompt, current);
    const stage1Start = Date.now();
    const rawDecision = await invokeJson({
      system: selectPrompts.system,
      user: selectPrompts.user,
      settings: fastTierSettings(),
      schema: SelectDecisionSchema,
      schemaName: "select_component",
      timeoutMs: STAGE_TIMEOUT_MS,
    });
    const stage1Ms = Date.now() - stage1Start;
    const decisionParsed = SelectDecisionSchema.safeParse(rawDecision);
    if (!decisionParsed.success) {
      return NextResponse.json({ ok: false, error: "路由输出未通过校验" }, { status: 502 });
    }
    const decision = decisionParsed.data;
    if (decision.componentId && !getRegistryEntry(decision.componentId)) {
      // Hallucinated id — the exact failure mode the catalog is meant to bound.
      return NextResponse.json({ ok: false, error: `路由返回了目录外的组件 id:${decision.componentId}` }, { status: 502 });
    }

    const response: LensRouteResponse = {
      ok: true,
      stage1: { decision, ms: stage1Ms },
      stage2: null,
    };

    // Stage 2 only for implemented components; planned components fall back.
    const component =
      decision.intent === "create" || decision.intent === "adjust"
        ? getImplementedComponent(decision.componentId)
        : undefined;
    if (component && (decision.intent === "create" || decision.intent === "adjust")) {
      const configure = buildConfigurePrompts(body.prompt, component, decision.intent, current);
      const stage2Start = Date.now();
      const rawValue = await invokeJson({
        system: configure.system,
        user: configure.user,
        settings: fastTierSettings(),
        schema: configure.mode === "patch" ? component.patchSchema : component.configSchema,
        schemaName: "configure_component",
        timeoutMs: STAGE_TIMEOUT_MS,
      });
      const stage2Ms = Date.now() - stage2Start;
      if (configure.mode === "patch") {
        const patch = component.patchSchema.safeParse(rawValue);
        if (!patch.success) return NextResponse.json({ ok: false, error: "config 补丁未通过 Zod 校验" }, { status: 502 });
        response.stage2 = { mode: "patch", patch: patch.data as Record<string, unknown>, ms: stage2Ms };
      } else {
        const config = component.configSchema.safeParse(rawValue);
        if (!config.success) return NextResponse.json({ ok: false, error: "config 未通过 Zod 校验" }, { status: 502 });
        response.stage2 = { mode: "create", config: config.data as Record<string, unknown>, ms: stage2Ms };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[qa/declarative-lens]", error);
    const message = error instanceof Error ? error.message : "路由请求失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
