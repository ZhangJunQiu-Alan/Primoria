"use client";

import { useEffect, useRef } from "react";
import type { EChartsArtifact } from "@/lib/agent-os";
import { loadBrowserScript } from "@/lib/browser-script-loader";
import { LO_GRID, LO_INK, LO_MUTED, SERIES_FILLS, SERIES_STROKES } from "./style-tokens";

// The learning-object chart style is applied at render time (theme + series
// defaults) so the model never writes colors into the option; the agent prompt
// only says "colors come from the Primoria theme".

let themeRegistered = false;
const ECHARTS_CDN_URL = "https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js";
type EChartsModule = typeof import("echarts");

function loadECharts() {
  return loadBrowserScript<EChartsModule>(ECHARTS_CDN_URL, "echarts");
}

function ensurePrimoriaTheme(echarts: EChartsModule) {
  if (themeRegistered) return;
  themeRegistered = true;
  const axis = {
    axisLine: { lineStyle: { color: LO_MUTED } },
    axisTick: { lineStyle: { color: LO_MUTED } },
    axisLabel: { color: LO_MUTED },
    splitLine: { lineStyle: { color: LO_GRID } },
  };
  echarts.registerTheme("primoria", {
    color: [...SERIES_STROKES],
    backgroundColor: "transparent",
    textStyle: { color: LO_INK },
    title: { textStyle: { color: LO_INK }, subtextStyle: { color: LO_MUTED } },
    legend: { textStyle: { color: LO_MUTED } },
    categoryAxis: axis,
    valueAxis: axis,
    logAxis: axis,
    timeAxis: axis,
  });
}

/** Bars get the pale-fill + 2px darker-stroke pair when the model left colors
 * unset; other series types keep the theme's stroke palette. */
function withSeriesDefaults(option: EChartsArtifact["option"]): EChartsArtifact["option"] {
  if (!option || typeof option !== "object") return option;
  const opt = option as Record<string, unknown>;
  const raw = opt.series;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (list.length === 0) return option;
  const series = list.map((entry, i) => {
    if (!entry || typeof entry !== "object") return entry;
    const s = entry as Record<string, unknown>;
    if (s.type !== "bar" || s.itemStyle || s.color) return entry;
    const idx = i % SERIES_FILLS.length;
    return {
      ...s,
      itemStyle: {
        color: SERIES_FILLS[idx],
        borderColor: SERIES_STROKES[idx],
        borderWidth: 2,
        borderRadius: [3, 3, 0, 0],
      },
    };
  });
  return { ...opt, series: Array.isArray(raw) ? series : series[0] } as EChartsArtifact["option"];
}

export function EChartsRenderer({ artifact, variant = "tool" }: { artifact: EChartsArtifact; variant?: "tool" | "course" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import("echarts").ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void loadECharts().then((echarts) => {
      if (disposed || !containerRef.current) return;
      ensurePrimoriaTheme(echarts);
      const chart = echarts.init(containerRef.current, "primoria", { renderer: "svg" });
      chartRef.current = chart;
      chart.setOption(withSeriesDefaults(artifact.option));

      resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(containerRef.current);
    }).catch((error) => console.error("[visualization] ECharts failed to load:", error));

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [artifact.option]);

  // Update option in-place without re-init when same chart instance exists
  useEffect(() => {
    chartRef.current?.setOption(withSeriesDefaults(artifact.option), { notMerge: false });
  }, [artifact.option]);

  const height = artifact.height ?? 400;

  const chart = (
    <div
      ref={containerRef}
      className={variant === "course" ? "course-visual-canvas echarts-course-canvas" : undefined}
      style={{ width: "100%", height }}
      aria-label={artifact.title}
    />
  );

  if (variant === "course") return chart;

  return (
    <div className="message-row tool">
      <div className="tool-card widget-card echarts-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{artifact.title}</span>
        </div>
        {chart}
        {artifact.description && (
          <p className="tool-note" style={{ padding: "8px 12px 10px" }}>{artifact.description}</p>
        )}
      </div>
    </div>
  );
}
