"use client";

import { useEffect, useRef } from "react";
import type { MermaidArtifact } from "@/lib/agent-os";
import { loadBrowserScript } from "@/lib/browser-script-loader";

const MERMAID_CDN_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";
type MermaidModule = typeof import("mermaid")["default"];

function loadMermaid() {
  return loadBrowserScript<MermaidModule>(MERMAID_CDN_URL, "mermaid");
}

let mermaidRenderSequence = 0;
let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

function queueMermaidRender(mermaid: MermaidModule, definition: string) {
  const renderId = `mermaid-${++mermaidRenderSequence}`;
  const render = mermaidRenderQueue.then(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "inherit",
      securityLevel: "strict",
    });
    return mermaid.render(renderId, definition);
  });
  mermaidRenderQueue = render.then(() => undefined, () => undefined);
  return { render, renderId };
}

export function MermaidRenderer({ artifact, variant = "tool" }: { artifact: MermaidArtifact; variant?: "tool" | "course" }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !artifact.definition.trim()) return;
    let cancelled = false;
    let activeRenderId: string | null = null;

    void loadMermaid().then((mermaid) => {
      const { render, renderId } = queueMermaidRender(mermaid, artifact.definition);
      activeRenderId = renderId;
      return render
        .then(({ svg }) => {
          if (!cancelled && containerRef.current) {
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
        .catch((error) => {
          console.error("[visualization] Mermaid failed to render:", error);
          document.getElementById(`d${renderId}`)?.remove();
          if (!cancelled && containerRef.current) {
            containerRef.current.textContent = "Diagram syntax error — check the Mermaid definition.";
          }
        });
    }).catch((error) => {
      console.error("[visualization] Mermaid failed to load:", error);
      if (containerRef.current) containerRef.current.textContent = "Diagram library failed to load.";
    });

    return () => {
      cancelled = true;
      if (activeRenderId) document.getElementById(`d${activeRenderId}`)?.remove();
    };
  }, [artifact.definition]);

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
          <span>{artifact.title}</span>
        </div>
        {diagram}
      </div>
    </div>
  );
}
