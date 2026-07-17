"use client";

import { useEffect, useRef, useState } from "react";
import { msg } from "@/lib/i18n/client";
import { WIDGETS } from "./interactive";
import { useInteractiveT } from "./interactive/i18n";
import { reportVisualizationEvent } from "@/lib/telemetry/visualization-client";

// Browser-side stage-2 executor for open_interactive_component signals
// (Web-as-brain, like the course-card flow): the agent's tool choice was the
// catalog routing; this card calls the web API with the learner's session to
// turn the request into a validated config and renders the component.
//
// Instance state is keyed by the AG-UI tool-call id. Multiple cards can use the
// same component without sharing config. Adjustment tool calls explicitly name
// their source instance; the adjusted result receives its own instance id.

type ComponentConfig = Record<string, unknown>;

const instanceStore = new Map<string, ComponentConfig>();

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

type CardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; config: ComponentConfig };

function configCacheKey(instanceId: string) {
  return `icc:${instanceId}`;
}

function legacyInstanceId(componentId: string, request: string) {
  return `legacy:${componentId}:${hashText(request)}:${crypto.randomUUID()}`;
}

function readCachedConfig(instanceId: string): ComponentConfig | null {
  const inMemory = instanceStore.get(instanceId);
  if (inMemory) return inMemory;
  if (typeof window === "undefined") return null;
  try {
    const cached = window.sessionStorage.getItem(configCacheKey(instanceId));
    if (!cached) return null;
    const config = JSON.parse(cached) as ComponentConfig;
    instanceStore.set(instanceId, config);
    return config;
  } catch {
    return null;
  }
}

function writeCachedConfig(instanceId: string, config: ComponentConfig) {
  instanceStore.set(instanceId, config);
  try {
    window.sessionStorage.setItem(configCacheKey(instanceId), JSON.stringify(config));
  } catch {}
}

export function InteractiveComponentCard({
  componentId,
  request,
  instanceId: suppliedInstanceId,
  targetInstanceId = null,
}: {
  componentId: string;
  request: string;
  instanceId?: string;
  targetInstanceId?: string | null;
}) {
  const t = useInteractiveT().card;
  const [fallbackInstanceId] = useState(() => legacyInstanceId(componentId, request));
  const instanceId = suppliedInstanceId ?? fallbackInstanceId;
  const [state, setState] = useState<CardState>(() => {
    const cached = readCachedConfig(instanceId);
    return cached ? { status: "ready", config: cached } : { status: "loading" };
  });
  const fetchStartedRef = useRef(state.status === "ready");
  const renderWidget = WIDGETS[componentId];

  useEffect(() => {
    if (!renderWidget || fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const current = targetInstanceId ? readCachedConfig(targetInstanceId) : null;
        const response = await fetch("/api/interactive-component", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ instanceId, targetInstanceId, componentId, prompt: request, current }),
        });
        const json = (await response.json()) as { ok: boolean; config?: ComponentConfig; error?: string };
        if (cancelled) return;
        if (!json.ok || !json.config) {
          setState({ status: "error", message: json.error ?? t.configFailed });
          reportVisualizationEvent({
            source: "interactive",
            topic: request,
            componentId,
            status: response.status === 502 ? "config_invalid" : "api_error",
            detail: json.error ?? null,
          });
          return;
        }
        writeCachedConfig(instanceId, json.config);
        setState({ status: "ready", config: json.config });
        reportVisualizationEvent({ source: "interactive", topic: request, componentId, status: "rendered" });
      } catch (error) {
        if (cancelled) return;
        setState({ status: "error", message: error instanceof Error ? error.message : t.requestFailed });
        reportVisualizationEvent({ source: "interactive", topic: request, componentId, status: "api_error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [componentId, instanceId, request, renderWidget, t.configFailed, t.requestFailed, targetInstanceId]);

  if (!renderWidget) {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="tool-title"><span className="tool-dot" /><span>{t.unsupported}</span></div>
        </div>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card" aria-busy="true">
          <div className="tool-title"><span className="tool-spinner" /><span>{t.preparing}</span></div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="tool-title"><span className="tool-dot" /><span>{msg(t.generationFailed, { message: state.message })}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-row tool widget-renderer-row">
      <div style={{ width: "100%" }}>
        {renderWidget({
          config: state.config,
          onChange: (next) => {
            writeCachedConfig(instanceId, next);
            setState({ status: "ready", config: next });
          },
        })}
      </div>
    </div>
  );
}
