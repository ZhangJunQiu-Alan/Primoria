import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getImplementedComponent,
  type LensRouteResponse,
} from "@/lib/interactive/components/registry";
import { configureComponent, type CurrentInstance } from "@/lib/interactive/configure";
import { selectInteractiveComponent } from "@/lib/interactive/select-component";

// Experimental two-stage declarative-component router (QA only):
// stage 1 sees only the component catalog (one line each) and picks a
// component + intent; stage 2 gets the full config schema of the selected
// component and emits a create config or a minimal patch. Mirrors the planned
// agent flow (select_component → configure_component). Generic over the
// registry — adding a component must not require edits here.

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

function isQaRouteAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.PRIMORIA_ENABLE_QA_ROUTES === "1";
}

export async function POST(request: Request) {
  if (!isQaRouteAllowed()) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  try {
    const body = RequestSchema.parse(await request.json());
    const current = body.current ?? null;

    // Stage 1: catalog-only routing.
    const { decision, ms: stage1Ms } = await selectInteractiveComponent(body.prompt, current);

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
      const result = await configureComponent(body.prompt, component, decision.intent, current);
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
      response.stage2 =
        result.mode === "patch"
          ? { mode: "patch", patch: result.patch, ms: result.ms }
          : { mode: "create", config: result.config, ms: result.ms };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[qa/declarative-lens]", error);
    const message = error instanceof Error ? error.message : "路由请求失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
