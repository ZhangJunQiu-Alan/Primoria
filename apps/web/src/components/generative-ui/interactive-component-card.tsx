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
type CardState = { status: "loading" } | { status: "error"; message: string; retryable: boolean } | { status: "ready"; value: ReadyState };

// Tool results recorded before instance IDs existed have no stable call id. A
// content-derived id makes remounts reuse the saved instance instead of
// generating (and paying for) a new one each time.
function legacyInstanceId(...parts: string[]) {
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (const char of parts.join("\u0000")) {
    const code = char.codePointAt(0) ?? 0;
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x5bd1e995);
  }
  return `legacy:${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

export function InteractiveComponentCard(props: InteractiveComponentCardProps) {
  const instanceId = props.instanceId ?? legacyInstanceId(props.componentId, props.request, props.targetInstanceId ?? "");
  return <PersistedComponentCard key={`${props.componentId}:${instanceId}:${props.request}:${props.targetInstanceId ?? ""}`} {...props} instanceId={instanceId} />;
}

async function readResponse(response: Response): Promise<ReadyState & { ok: boolean; error?: string }> {
  const body = await response.json();
  if (!body.ok || !body.config || !Number.isInteger(body.revision) || !Number.isInteger(body.configVersion)) {
    throw new Error(typeof body.error === "string" ? body.error : "configuration_unavailable");
  }
  return body;
}

// Load errors a retry cannot change: the saved scene, or the scene an
// adjustment builds on, is unreadable or gone.
const PERMANENT_LOAD_ERRORS = {
  unsupported_saved_configuration: "unsupportedSaved",
  unsupported_target_version: "unsupportedTarget",
  target_not_found: "targetMissing",
} as const;

class SaveError extends Error {
  constructor(message: string, readonly action: "retry" | "reload" | null) { super(message); }
}

function PersistedComponentCard({ componentId, request, instanceId, targetInstanceId = null }: InteractiveComponentCardProps & { instanceId: string }) {
  const t = useInteractiveT().card;
  const [state, setState] = useState<CardState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState<{ message: string; action: "retry" | "reload" | null } | null>(null);
  const revision = useRef(1);
  const configVersion = useRef<number | null>(null);
  const pendingConfig = useRef<Record<string, unknown> | null>(null);
  const saving = useRef(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const supported = Object.hasOwn(WIDGETS, componentId);

  const savePending = useCallback(async () => {
    if (saving.current || !pendingConfig.current) return;
    saving.current = true;
    let inFlight: Record<string, unknown> | null = null;
    try {
      while (pendingConfig.current) {
        const config = pendingConfig.current;
        inFlight = config;
        pendingConfig.current = null;
        const response = await fetch("/api/interactive-component", {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ instanceId, revision: revision.current, ...(configVersion.current ? { configVersion: configVersion.current } : {}), config }),
          keepalive: true,
        });
        if (!response.ok) {
          const error = await response.json().then((body: { error?: unknown }) => body.error, () => null);
          if (response.status === 409 && error === "unsupported_saved_configuration") throw new SaveError(t.unsupportedSaved, null);
          throw response.status === 409 ? new SaveError(t.saveConflict, "reload") : new SaveError(t.saveFailed, "retry");
        }
        const value = await readResponse(response);
        revision.current = value.revision;
        configVersion.current = value.configVersion;
        if (alive.current) setSaveError(null);
      }
    } catch (error) {
      pendingConfig.current ??= inFlight;
      if (alive.current) setSaveError(error instanceof SaveError ? { message: error.message, action: error.action } : { message: t.saveFailed, action: "retry" });
    } finally {
      saving.current = false;
    }
  }, [instanceId, t.saveFailed, t.saveConflict, t.unsupportedSaved]);

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
        if (value.componentId !== componentId) throw new Error("component_mismatch");
        revision.current = value.revision;
        configVersion.current = value.configVersion;
        setState({ status: "ready", value });
        reportVisualizationEvent({ source: "interactive", topic: request, componentId, status: "rendered" });
      } catch (error) {
        if (signal.aborted) return;
        const code = error instanceof Error && Object.hasOwn(PERMANENT_LOAD_ERRORS, error.message) ? error.message as keyof typeof PERMANENT_LOAD_ERRORS : null;
        setState(code ? { status: "error", message: t[PERMANENT_LOAD_ERRORS[code]], retryable: false } : { status: "error", message: t.configFailed, retryable: true });
        reportVisualizationEvent({ source: "interactive", topic: request, componentId, status: "api_error" });
      }
    })();
    return () => controller.abort();
  }, [attempt, componentId, instanceId, request, supported, t, targetInstanceId]);



  if (!supported) return <div className="message-row tool"><div className="tool-card status-card"><div className="tool-title">{t.unsupported}</div></div></div>;
  if (state.status === "loading") return <div className="message-row tool"><div className="tool-card status-card" aria-busy="true"><div className="tool-title"><span className="tool-spinner" />{t.preparing}</div></div></div>;
  if (state.status === "error") return <div className="message-row tool"><div className="tool-card status-card" role="alert"><p>{state.retryable ? msg(t.generationFailed, { message: state.message }) : state.message}</p>{state.retryable ? <button type="button" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>{t.retry}</button> : null}</div></div>;

  return <div className="message-row tool widget-renderer-row"><div style={{ width: "100%" }}>
    <InteractiveVisualization payload={state.value} onChange={(config) => {
      setState({ status: "ready", value: { ...state.value, config } });
      pendingConfig.current = config;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { void savePending(); }, 500);
    }} />
    {saveError ? <div role="alert"><p>{saveError.message}</p>{saveError.action ? <button type="button" onClick={() => { if (saveError.action === "reload") window.location.reload(); else void savePending(); }}>{saveError.action === "reload" ? t.reload : t.retrySave}</button> : null}</div> : null}
  </div></div>;
}
