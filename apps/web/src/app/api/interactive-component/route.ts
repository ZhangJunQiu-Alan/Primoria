import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { getImplementedComponent } from "@/lib/interactive/components/registry";
import { configureComponent, type CurrentInstance } from "@/lib/interactive/configure";
import { INTERACTIVE_COMPONENT_VERSIONS } from "@primoria/contracts/artifacts/interactive-versions";
import { getInteractiveInstance, createInteractiveInstance, updateInteractiveInstance } from "@/lib/interactive/instance-store";
import { parseInteractivePayload } from "@/lib/interactive/payload";
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
}).strict();

export async function GET(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("interactive-component-read");
  if (denied) return denied;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const instanceId = new URL(request.url).searchParams.get("instanceId");
  if (!instanceId || instanceId.length > 200) return NextResponse.json({ ok: false, error: "invalid_instance" }, { status: 400 });
  try {
    const instance = await getInteractiveInstance(user.id, instanceId);
    if (!instance) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    try { parseInteractivePayload({ componentId: instance.componentId, configVersion: instance.configVersion, config: instance.config }); }
    catch { return NextResponse.json({ ok: false, error: "unsupported_saved_configuration" }, { status: 409 }); }
    return NextResponse.json({ ok: true, ...publicInstance(instance) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[interactive-component-read]", error);
    return NextResponse.json({ ok: false, error: "读取失败，请稍后重试" }, { status: 503 });
  }
}

const UpdateSchema = z.object({
  instanceId: z.string().min(1).max(200), revision: z.number().int().positive(), config: z.record(z.unknown()),
}).strict();

export async function PATCH(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("interactive-component-update");
  if (denied) return denied;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = UpdateSchema.parse(await request.json());
    const result = await updateInteractiveInstance(user.id, body.instanceId, body.revision, body.config);
    if (result.kind !== "updated") return NextResponse.json({ ok: false, error: result.kind }, { status: result.kind === "not_found" ? 404 : 409 });
    return NextResponse.json({ ok: true, ...publicInstance(result.instance) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "invalid_config" }, { status: 400 });
    console.error("[interactive-component-update]", error);
    return NextResponse.json({ ok: false, error: "保存失败，请稍后重试" }, { status: 503 });
  }
}

function publicInstance(instance: NonNullable<Awaited<ReturnType<typeof getInteractiveInstance>>>) {
  return { componentId: instance.componentId, configVersion: instance.configVersion, config: instance.config, revision: instance.revision };
}

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("interactive-component");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    const requestHash = hashInteractiveRequest({ componentId: body.componentId, prompt: body.prompt, targetInstanceId: body.targetInstanceId ?? null });
    const saved = await getInteractiveInstance(user.id, body.instanceId);
    if (saved) {
      if (saved.requestHash !== requestHash) return NextResponse.json({ ok: false, error: "idempotency_key_conflict" }, { status: 409 });
      return NextResponse.json({ ok: true, ...publicInstance(saved) });
    }
    const component = getImplementedComponent(body.componentId);
    if (!component) {
      // The agent hallucinated an id outside the catalog — the browser card
      // falls back to a plain notice; sandbox fallback stays agent-driven.
      return NextResponse.json({ ok: false, error: "unknown_component" }, { status: 404 });
    }

    const target = body.targetInstanceId ? await getInteractiveInstance(user.id, body.targetInstanceId) : null;
    if (body.targetInstanceId && (!target || target.componentId !== body.componentId)) {
      return NextResponse.json({ ok: false, error: "target_not_found" }, { status: 404 });
    }
    if (target && target.configVersion !== INTERACTIVE_COMPONENT_VERSIONS[body.componentId]) {
      return NextResponse.json({ ok: false, error: "unsupported_target_version" }, { status: 409 });
    }
    const current: CurrentInstance | null = target
      ? { componentId: body.componentId, config: parseInteractivePayload({ componentId: target.componentId, configVersion: target.configVersion, config: target.config }).config }
      : null;
    const reservation = await reserveInteractiveRequest({
      ownerId: user.id,
      idempotencyKey: body.instanceId,
      requestHash,
    });
    if (reservation.kind === "cached") {
      if (reservation.response.ok && reservation.response.config) {
        const restored = await createInteractiveInstance({ ownerId: user.id, instanceId: body.instanceId, requestHash, componentId: body.componentId, configVersion: INTERACTIVE_COMPONENT_VERSIONS[body.componentId], config: reservation.response.config as Record<string, unknown> });
        if (restored) return NextResponse.json({ ...reservation.response, ...publicInstance(restored) }, { status: reservation.status });
      }
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
      const result = await configureComponent(body.prompt, component, body.targetInstanceId ? "adjust" : "create", current, request.signal);
      if (!result.ok) {
        await failInteractiveRequest(reservation.requestId, user.id);
        return NextResponse.json({ ok: false, error: result.error, ms: result.ms, modelCalls: result.modelCalls }, { status: 502 });
      }
      const status = 200;
      const responseBody: Record<string, unknown> = {
        ok: true,
        componentId: component.componentId,
        name: component.name,
        mode: result.mode,
        config: result.config,
        configVersion: INTERACTIVE_COMPONENT_VERSIONS[body.componentId],
        revision: 1,
        ...(result.mode === "patch" ? { patch: result.patch } : {}),
        ms: result.ms,
        modelCalls: result.modelCalls,
      };
      const instance = await createInteractiveInstance({ ownerId: user.id, instanceId: body.instanceId, requestHash, componentId: component.componentId, configVersion: INTERACTIVE_COMPONENT_VERSIONS[body.componentId], config: result.config });
      if (!instance || instance.requestHash !== requestHash) throw new Error("Interactive instance persistence conflict");
      Object.assign(responseBody, publicInstance(instance));
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
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
    console.error("[interactive-component]", error);
    return NextResponse.json({ ok: false, error: "配置生成失败" }, { status: 500 });
  }
}
