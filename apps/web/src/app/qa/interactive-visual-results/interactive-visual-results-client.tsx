"use client";

import { useEffect, useState } from "react";
import { ToolCard } from "@/components/generative-ui/tool-card";
import type { TutorArtifact } from "@/lib/ai/types";

type VisualQaResult = {
  id: string;
  prompt: string;
  expectedMode: string;
  actualType: string;
  title: string;
  codeKind: string;
  codeFile: string;
  artifact: TutorArtifact;
  status: "passed" | "failed";
  error?: string;
};

type VisualQaData = {
  runId: string;
  generatedAt: string;
  results: VisualQaResult[];
};

export function InteractiveVisualResultsClient({ run }: { run: string }) {
  const [data, setData] = useState<VisualQaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/qa-results/${encodeURIComponent(run)}/results.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load QA results: ${response.status}`);
        return response.json() as Promise<VisualQaData>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [run]);

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Interactive visual QA results</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Interactive visual QA results</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 24, background: "#fbf7ee", minHeight: "100vh" }}>
      <header>
        <h1 style={{ margin: 0 }}>Interactive visual QA results</h1>
        <p style={{ margin: "8px 0 0", color: "#6b6357" }}>
          {data.runId} · {data.generatedAt}
        </p>
      </header>

      {data.results.map((item, index) => (
        <section
          key={item.id}
          data-testid={`visual-result-${item.id}`}
          style={{
            display: "grid",
            gap: 12,
            padding: 16,
            border: "1px solid #eadfce",
            borderRadius: 8,
            background: "#fffaf2",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <strong>
              {index + 1}. {item.title}
            </strong>
            <span style={{ color: "#6b6357" }}>
              {item.expectedMode}{" -> "}{item.actualType} · {item.status}
            </span>
            <p style={{ margin: 0 }}>{item.prompt}</p>
            <code style={{ color: "#6b6357" }}>{item.codeFile}</code>
            {item.error ? <p style={{ color: "#9f2d2d", margin: 0 }}>{item.error}</p> : null}
          </div>
          <ToolCard artifact={item.artifact} />
        </section>
      ))}
    </main>
  );
}
