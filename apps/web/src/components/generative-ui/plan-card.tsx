"use client";

import { useEffect, useRef } from "react";

export interface PlanCardProps {
  status: "executing" | "inProgress" | "complete";
  approach?: string;
  technology?: string;
  keyElements?: string[];
}

export function PlanCard({ status, approach, technology, keyElements }: PlanCardProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const isRunning = status === "executing" || status === "inProgress";

  useEffect(() => {
    if (!detailsRef.current) return;
    detailsRef.current.open = isRunning;
  }, [isRunning]);

  return (
    <div className="message-row tool inline-plan-row">
      <details ref={detailsRef} className="inline-plan-card" open>
        <summary className="inline-plan-summary">
          <span className={isRunning ? "tool-spinner inline-plan-indicator" : "inline-plan-check"} aria-hidden="true">
            {isRunning ? null : "✓"}
          </span>
          <span className="inline-plan-title">
            {isRunning ? "Planning visualization…" : `Plan: ${technology || "visualization"}`}
          </span>
          <span className="inline-plan-chevron" aria-hidden="true">▼</span>
        </summary>
        {approach ? (
          <div className="inline-plan-body">
            {technology ? <span className="inline-plan-badge">{technology}</span> : null}
            <p>{approach}</p>
            {keyElements && keyElements.length > 0 ? (
              <ul>
                {keyElements.map((element) => (
                  <li key={element}>{element}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </details>
    </div>
  );
}
