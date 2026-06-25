"use client";

import { useEffect, useRef } from "react";
import type { EChartsArtifact } from "@/lib/agent-os";

export function EChartsRenderer({ artifact, variant = "tool" }: { artifact: EChartsArtifact; variant?: "tool" | "course" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import("echarts").ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    import("echarts").then((echarts) => {
      if (disposed || !containerRef.current) return;
      const chart = echarts.init(containerRef.current, undefined, { renderer: "svg" });
      chartRef.current = chart;
      chart.setOption(artifact.option);

      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
      };
    });

    return () => {
      disposed = true;
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [artifact.option]);

  // Update option in-place without re-init when same chart instance exists
  useEffect(() => {
    chartRef.current?.setOption(artifact.option, { notMerge: false });
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
          <span>render_chart · {artifact.title}</span>
        </div>
        {chart}
        {artifact.description && (
          <p className="tool-note" style={{ padding: "8px 12px 10px" }}>{artifact.description}</p>
        )}
      </div>
    </div>
  );
}
