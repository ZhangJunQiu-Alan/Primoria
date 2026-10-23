"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { msg } from "@/lib/i18n/client";
import { WIDGETS } from "./interactive";
import { InteractiveVisualization } from "./interactive-visualization";
import { useInteractiveT } from "./interactive/i18n";
import { reportVisualizationEvent } from "@/lib/telemetry/visualization-client";
import type { InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";

export type InteractiveComponentCardProps = {
  componentId: string;
  request: string;
  instanceId?: string;
  targetInstanceId?: string | null;
};

type ReadyState = InteractiveComponentPayload & { revision: number };
type CardState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; value: ReadyState };

export function InteractiveComponentCard(props: InteractiveComponentCardProps) {
  const [fallbackId] = useState(() => `legacy:${crypto.randomUUID()}`);
  const instanceId = props.instanceId ?? fallbackId;
  return <PersistedComponentCard key={`${props.componentId}:${instanceId}:${props.request}:${props.targetInstanceId ?? ""}`} {...props} instanceId={instanceId} />;
}

async function readResponse(response: Response): Promise<ReadyState & { ok: boolean; error?: string }> {
  const body = await response.json();
  if (!body.ok || !body.config || !Number.isInteger(body.revision) || !Number.isInteger(body.configVersion)) {
    throw new Error(body.error ?? "配置读取失败 / Configuration unavailable");
  }
  return body;
}

function PersistedComponentCard({ componentId, request, instanceId, targetInstanceId = null }: InteractiveComponentCardProps & { instanceId: string }) {
  const t = useInteractiveT().card;
  const [state, setState] = useState<CardState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);
  const revision = useRef(1);
  const pendingConfig = useRef<Record<string, unknown> | null>(null);
  const saving = useRef(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const supported = Object.hasOwn(WIDGETS, componentId);

  const savePending = useCallback(async () => {
    if (saving.current || !pendingConfig.current) return;
    saving.current = true;
    let inFlight: Record<string, unknown> | null = null;
    let conflict = false;
    try {
      while (pendingConfig.current) {
        const config = pendingConfig.current;
        inFlight = config;
        pendingConfig.current = null;
        const response = await fetch("/api/interactive-component", {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ instanceId, revision: revision.current, config }),
          keepalive: true,
        });
        if (!response.ok) {
          conflict = response.status === 409;
          throw new Error(conflict ? "其他页面已更新此场景，请刷新后继续。 / This scene changed in another tab. Refresh to continue." : "场景保存失败，请重试。 / Unable to save this scene.");
        }
        const value = await readResponse(response);
        revision.current = value.revision;
        if (alive.current) { setSaveError(null); setSaveConflict(false); }
      }
    } catch (error) {
      pendingConfig.current ??= inFlight;
      if (alive.current) { setSaveError(error instanceof Error ? error.message : t.requestFailed); setSaveConflict(conflict); }
    } finally {
      saving.current = false;
    }
  }, [instanceId, t.requestFailed]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); void savePending(); };
  }, [savePending]);

  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    const signal = controller.signal;
    const readUrl = `/api/interactive-component?instanceId=${encodeURIComponent(instanceId)}`;
    (async () => {
      try {
        let response = await fetch(readUrl, { signal, cache: "no-store" });
        if (response.status === 404) {
          response = await fetch("/api/interactive-component", {
            method: "POST", headers: { "content-type": "application/json" }, signal,
            body: JSON.stringify({ instanceId, targetInstanceId, componentId, prompt: request }),
          });
          if (response.status === 409) {
            const body = await response.clone().json();
            if (body.error === "request_in_progress") {
              for (let poll = 0; poll < 40; poll += 1) {
                await new Promise<void>((resolve, reject) => {
                  const abort = () => { clearTimeout(wait); reject(new DOMException("Aborted", "AbortError")); };
                  const wait = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1000);
                  signal.addEventListener("abort", abort, { once: true });
                });
                response = await fetch(readUrl, { signal, cache: "no-store" });
                if (response.status !== 404) break;
              }
            }
          }
        }
        const value = await readResponse(response);
        if (signal.aborted) return;
        if (value.componentId !== componentId) throw new Error("组件配置不匹配 / Component configuration mismatch");
        revision.current = value.revision;
        setState({ status: "ready", value });
        reportVisualizationEvent({ source: "interactive", topic: request, componentId, status: "rendered" });
      } catch {
        if (signal.aborted) return;
        setState({ status: "error", message: t.configFailed });
        reportVisualizationEvent({ source: "interactive", topic: request, componentId, status: "api_error" });
      }
    })();
    return () => controller.abort();
  }, [attempt, componentId, instanceId, request, supported, t.configFailed, targetInstanceId]);



  if (!supported) return <div className="message-row tool"><div className="tool-card status-card"><div className="tool-title">{t.unsupported}</div></div></div>;
  if (state.status === "loading") return <div className="message-row tool"><div className="tool-card status-card" aria-busy="true"><div className="tool-title"><span className="tool-spinner" />{t.preparing}</div></div></div>;
  if (state.status === "error") return <div className="message-row tool"><div className="tool-card status-card" role="alert"><p>{msg(t.generationFailed, { message: state.message })}</p><button type="button" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>重试 / Retry</button></div></div>;

  return <div className="message-row tool widget-renderer-row"><div style={{ width: "100%" }}>
    <InteractiveVisualization payload={state.value} onChange={(config) => {
      setState({ status: "ready", value: { ...state.value, config } });
      pendingConfig.current = config;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { void savePending(); }, 500);
    }} />
    {saveError ? <div role="alert"><p>{saveError}</p><button type="button" onClick={() => { if (saveConflict) window.location.reload(); else void savePending(); }}>{saveConflict ? "重新载入 / Reload" : "重试保存 / Retry save"}</button></div> : null}
  </div></div>;
}
