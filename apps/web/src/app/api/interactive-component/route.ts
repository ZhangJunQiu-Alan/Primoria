import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { getImplementedComponent } from "@/lib/interactive/components/registry";
import { configureComponent, type CurrentInstance } from "@/lib/interactive/configure";
import {
  completeInteractiveRequest,
  failInteractiveRequest,
  hashInteractiveRequest,
  reserveInteractiveRequest,
} from "@/lib/interactive/request-budget";

// Production stage-2 of the declarative-component flow. Stage-1 (component
// selection) already happened as the tutor agent's tool choice
// (open_interactive_component); the browser card calls this route with the
// learner's session to turn the request into a validated config. An adjustment
// names an explicit target tool-call instance and produces a merged patch.
const RequestSchema = z.object({
  instanceId: z.string().min(1).max(200),
  targetInstanceId: z.string().min(1).max(200).nullish(),
  componentId: z.string().min(1).max(100),
  prompt: z.string().min(1).max(2000),
  current: z.record(z.string(), z.unknown()).nullish(),
}).superRefine((value, context) => {
  if (Boolean(value.targetInstanceId) !== Boolean(value.current)) {
    context.addIssue({ code: "custom", message: "targetInstanceId and current must be provided together" });
  }
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

    const parsedCurrent = body.current ? component.configSchema.safeParse(body.current) : null;
    if (parsedCurrent && !parsedCurrent.success) {
      return NextResponse.json({ ok: false, error: "invalid_current_config" }, { status: 400 });
    }
    const current: CurrentInstance | null = parsedCurrent?.success
      ? { componentId: body.componentId, config: parsedCurrent.data as Record<string, unknown> }
      : null;
    const reservation = await reserveInteractiveRequest({
      ownerId: user.id,
      idempotencyKey: body.instanceId,
      requestHash: hashInteractiveRequest({
        componentId: body.componentId,
        prompt: body.prompt,
        targetInstanceId: body.targetInstanceId ?? null,
        current: current?.config ?? null,
      }),
    });
    if (reservation.kind === "cached") {
      return NextResponse.json(reservation.response, { status: reservation.status });
    }
    if (reservation.kind === "conflict") {
      return NextResponse.json({ ok: false, error: "idempotency_key_conflict" }, { status: 409 });
    }
    if (reservation.kind === "in_progress") {
      return NextResponse.json(
        { ok: false, error: "request_in_progress" },
        { status: 409, headers: { "Retry-After": String(reservation.retryAfterSeconds) } },
      );
    }
    if (reservation.kind === "rate_limited" || reservation.kind === "concurrency_limited") {
      return NextResponse.json(
        { ok: false, error: reservation.kind },
        { status: 429, headers: { "Retry-After": String(reservation.retryAfterSeconds) } },
      );
    }

    try {
      const result = await configureComponent(body.prompt, component, body.targetInstanceId ? "adjust" : "create", current);
      const status = result.ok ? 200 : 502;
      const responseBody: Record<string, unknown> = result.ok
        ? {
            ok: true,
            componentId: component.componentId,
            name: component.name,
            mode: result.mode,
            config: result.config,
            ...(result.mode === "patch" ? { patch: result.patch } : {}),
            ms: result.ms,
          }
        : { ok: false, error: result.error };
      await completeInteractiveRequest({
        requestId: reservation.requestId,
        ownerId: user.id,
        status,
        response: responseBody,
      });
      return NextResponse.json(responseBody, { status });
    } catch (error) {
      await failInteractiveRequest(reservation.requestId, user.id).catch((releaseError) => {
        console.error("[interactive-component] failed to release request budget", releaseError);
      });
      throw error;
    }
  } catch (error) {
    console.error("[interactive-component]", error);
    return NextResponse.json({ ok: false, error: "配置生成失败" }, { status: 500 });
  }
}
