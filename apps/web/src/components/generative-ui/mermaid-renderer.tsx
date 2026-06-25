"use client";

import { useEffect, useId, useRef } from "react";
import type { MermaidArtifact } from "@/lib/agent-os";

export function MermaidRenderer({ artifact, variant = "tool" }: { artifact: MermaidArtifact; variant?: "tool" | "course" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const renderId = `mermaid-${uid}`;

  useEffect(() => {
    if (!containerRef.current || !artifact.definition.trim()) return;

    import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        fontFamily: "inherit",
        securityLevel: "strict",
      });

      mermaid
        .render(renderId, artifact.definition)
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
            // Make SVG responsive
            const svgEl = containerRef.current.querySelector("svg");
            if (svgEl) {
              svgEl.removeAttribute("height");
              svgEl.style.width = "100%";
              svgEl.style.height = "auto";
            }
          }
        })
        .catch(() => {
          if (containerRef.current) {
            containerRef.current.textContent = "Diagram syntax error — check the Mermaid definition.";
          }
        });
    });
  }, [artifact.definition, renderId]);

  const diagram = (
    <div
      ref={containerRef}
      className={variant === "course" ? "course-visual-canvas mermaid-course-canvas" : undefined}
      style={{ padding: "16px", overflowX: "auto" }}
      aria-label={artifact.title}
    />
  );

  if (variant === "course") return diagram;

  return (
    <div className="message-row tool">
      <div className="tool-card widget-card mermaid-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>render_diagram · {artifact.title}</span>
        </div>
        {diagram}
      </div>
    </div>
  );
}
