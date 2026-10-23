"use client";

import { Component, useState, type ReactNode } from "react";
import type { InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";
import { INTERACTIVE_COMPONENT_VERSIONS } from "@primoria/contracts/artifacts/interactive-versions";
import { WIDGETS } from "./interactive";

class VisualizationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">可视化暂时无法显示，请刷新页面重试。 / Unable to display this visualization.</p> : this.props.children;
  }
}

export function InteractiveVisualization({ payload, onChange }: {
  payload: InteractiveComponentPayload;
  onChange?: (next: Record<string, unknown>) => void;
}) {
  return <VisualizationBoundary key={`${payload.componentId}:${payload.configVersion}`}><VisualizationContent payload={payload} onChange={onChange} /></VisualizationBoundary>;
}

function VisualizationContent({ payload, onChange }: {
  payload: InteractiveComponentPayload;
  onChange?: (next: Record<string, unknown>) => void;
}) {
  const [local, setLocal] = useState({ source: payload.config, config: payload.config });
  const config = local.source === payload.config ? local.config : payload.config;
  const Renderer = Object.hasOwn(WIDGETS, payload.componentId) ? WIDGETS[payload.componentId] : null;
  if (!Renderer || INTERACTIVE_COMPONENT_VERSIONS[payload.componentId] !== payload.configVersion) {
    return <p role="alert">此可视化版本暂不支持，请更新后查看。 / Unsupported visualization version.</p>;
  }
  return <div data-component-id={payload.componentId} data-config-version={payload.configVersion}><Renderer config={config} onChange={(next) => { setLocal({ source: payload.config, config: next }); onChange?.(next); }} /></div>;
}
