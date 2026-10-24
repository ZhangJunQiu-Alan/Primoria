"use client";

import { Component, useState, type ReactNode } from "react";
import type { InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";
import { INTERACTIVE_COMPONENT_VERSIONS } from "@primoria/contracts/artifacts/interactive-versions";
import { WIDGETS } from "./interactive";
import { useInteractiveT } from "./interactive/i18n";

class VisualizationBoundary extends Component<{ children: ReactNode; fallback: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">{this.props.fallback}</p> : this.props.children;
  }
}

export function InteractiveVisualization({ payload, onChange }: {
  payload: InteractiveComponentPayload;
  onChange?: (next: Record<string, unknown>) => void;
}) {
  const t = useInteractiveT().card;
  return <VisualizationBoundary key={`${payload.componentId}:${payload.configVersion}`} fallback={t.renderFailed}><VisualizationContent payload={payload} onChange={onChange} unsupported={t.unsupportedVersion} /></VisualizationBoundary>;
}

function VisualizationContent({ payload, onChange, unsupported }: {
  payload: InteractiveComponentPayload;
  onChange?: (next: Record<string, unknown>) => void;
  unsupported: string;
}) {
  const [local, setLocal] = useState({ source: payload.config, config: payload.config });
  const config = local.source === payload.config ? local.config : payload.config;
  const Renderer = Object.hasOwn(WIDGETS, payload.componentId) ? WIDGETS[payload.componentId] : null;
  if (!Renderer || INTERACTIVE_COMPONENT_VERSIONS[payload.componentId] !== payload.configVersion) {
    return <p role="alert">{unsupported}</p>;
  }
  return <div data-component-id={payload.componentId} data-config-version={payload.configVersion}><Renderer config={config} onChange={(next) => { setLocal({ source: payload.config, config: next }); onChange?.(next); }} /></div>;
}
