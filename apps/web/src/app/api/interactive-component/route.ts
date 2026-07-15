import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { getImplementedComponent } from "@/lib/interactive/components/registry";
import { configureComponent, type CurrentInstance } from "@/lib/interactive/configure";

// Production stage-2 of the declarative-component flow. Stage-1 (component
// selection) already happened as the tutor agent's tool choice
// (open_interactive_component); the browser card calls this route with the
// learner's session to turn the request into a validated config. If the card
// already holds an instance of the same component, the request is treated as
// an adjustment and produces a merged patched config.
const RequestSchema = z.object({
  componentId: z.string().min(1).max(100),
  prompt: z.string().min(1).max(2000),
  current: z.record(z.string(), z.unknown()).nullish(),
});

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("interactive-component");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    const component = getImplementedComponent(body.componentId);
    if (!component) {
      // The agent hallucinated an id outside the catalog — the browser card
      // falls back to a plain notice; sandbox fallback stays agent-driven.
      return NextResponse.json({ ok: false, error: "unknown_component" }, { status: 404 });
    }

    const current: CurrentInstance | null = body.current
      ? { componentId: body.componentId, config: body.current }
      : null;
    const result = await configureComponent(body.prompt, component, current ? "adjust" : "create", current);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });

    return NextResponse.json({
      ok: true,
      componentId: component.componentId,
      name: component.name,
      mode: result.mode,
      config: result.config,
      ...(result.mode === "patch" ? { patch: result.patch } : {}),
      ms: result.ms,
    });
  } catch (error) {
    console.error("[interactive-component]", error);
    return NextResponse.json({ ok: false, error: "配置生成失败" }, { status: 500 });
  }
}
