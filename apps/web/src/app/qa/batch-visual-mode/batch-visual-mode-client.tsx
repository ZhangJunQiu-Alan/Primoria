"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ToolCard } from "@/components/generative-ui/tool-card";
import { isTutorArtifact } from "@primoria/contracts/artifacts";
import type { TutorArtifact, TutorStreamEvent } from "@/lib/agent-os";

type RunStatus = "queued" | "running" | "passed" | "failed";

type BatchCase = {
  id: string;
  prompt: string;
  status: RunStatus;
  elapsedMs?: number;
  toolSequence: string[];
  reply: string;
  actualType: string;
  finalArtifact?: TutorArtifact;
  previewArtifact?: TutorArtifact;
  error?: string;
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; runId: string; routePath: string; resultsPath: string }
  | { status: "error"; error: string };

type SavedResponse = {
  ok: boolean;
  runId?: string;
  routePath?: string;
  resultsPath?: string;
  error?: string;
};

const INITIAL_RUN_ID = "batch-not-started";

const EXPECTED_TYPES: Array<{ label: string; value: TutorArtifact["type"] }> = [
  { label: "3D Science / HTML widget", value: "html_widget" },
  { label: "Algorithm visualization", value: "algorithm_visualization" },
  { label: "Math explorer", value: "math_explorer" },
  { label: "Physics scene", value: "physics_scene" },
  { label: "Chart", value: "echarts_widget" },
  { label: "Diagram", value: "mermaid_diagram" },
];

const DEFAULT_PROMPTS = [
  {
    id: "01-vector-addition",
    prompt:
      "做一个 3D Science Mode：3D vector addition 可视化。用 THREE.js 展示向量 A、B、A+B，提供滑块调节 A/B 的 x,y,z 分量，OrbitControls 可旋转，带坐标轴、网格、标签和实时读数。",
  },
  {
    id: "02-electric-field",
    prompt:
      "做一个 3D Science Mode：两个点电荷的 3D electric field 可视化。场线/箭头应围绕正负电荷分布，提供电荷强度滑块、OrbitControls、标签、网格和实时说明。",
  },
  {
    id: "03-magnetic-field-wire",
    prompt:
      "做一个 3D Science Mode：通电直导线周围 magnetic field 的 3D 可视化。用环形箭头展示右手定则，提供电流方向/强度控制，带导线、网格、标签和读数。",
  },
  {
    id: "04-orbital-mechanics",
    prompt:
      "做一个 3D Science Mode：orbital mechanics 可视化。展示恒星、行星椭圆轨道、半长轴/偏心率滑块、扫过面积高亮、OrbitControls、标签和实时轨道参数。",
  },
  {
    id: "05-water-vsepr",
    prompt:
      "做一个 3D Science Mode：水分子 H2O 的 VSEPR 3D 分子结构。展示氧原子、两个氢原子、孤电子对、键角滑块、OrbitControls、标签和角度读数。",
  },
  {
    id: "06-crystal-lattice",
    prompt:
      "做一个 3D Science Mode：NaCl crystal lattice 3D 晶格。展示交替离子球、晶胞边框、重复单元滑块、OrbitControls、网格、标签和离子说明。",
  },
  {
    id: "07-wave-propagation",
    prompt:
      "做一个 3D Science Mode：3D wave propagation 可视化。展示空间中的正弦波面/粒子阵列，提供振幅、波长、速度控制，支持播放暂停、OrbitControls、标签和实时读数。",
  },
  {
    id: "08-cross-product",
    prompt:
      "做一个 3D Science Mode：cross product 几何意义。展示向量 u、v、u×v、平行四边形面积，提供角度和长度滑块，OrbitControls、网格、标签和面积读数。",
  },
  {
    id: "09-gravity-field",
    prompt:
      "做一个 3D Science Mode：行星周围 gravitational field 3D 可视化。展示中心质量、场强箭头、等势壳层，提供质量/距离控制，OrbitControls、标签和场强读数。",
  },
  {
    id: "10-surface-gradient",
    prompt:
      "做一个 3D Science Mode：函数曲面 z=sin(x)*cos(y) 的 surface gradient 可视化。展示 3D 曲面、切平面、梯度箭头，提供点坐标滑块、OrbitControls、标签和梯度读数。",
  },
];

function makeRunId() {
  return `batch-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function createInitialCases(): BatchCase[] {
  return DEFAULT_PROMPTS.map((item) => ({
    ...item,
    status: "queued" as const,
    toolSequence: [],
    reply: "",
    actualType: "none",
  }));
}

function artifactTitle(artifact: TutorArtifact | undefined, fallback: string) {
  if (!artifact || !("title" in artifact) || typeof artifact.title !== "string") return fallback;
  return artifact.title;
}

function errorArtifact(description: string): TutorArtifact {
  return {
    type: "tool_status",
    name: "batch_visual_mode",
    status: "error",
    description,
  };
}


export function BatchVisualModeClient() {
  const [cases, setCases] = useState<BatchCase[]>(() => createInitialCases());
  const [expectedMode, setExpectedMode] = useState("3D SCIENCE MODE");
  const [expectedType, setExpectedType] = useState<TutorArtifact["type"]>("html_widget");
  const [runId, setRunId] = useState(INITIAL_RUN_ID);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const completedCases = useMemo(
    () => cases.filter((item) => item.status === "passed" || item.status === "failed"),
    [cases],
  );
  const running = cases.some((item) => item.status === "running");
  const passed = cases.filter((item) => item.status === "passed").length;
  const failed = cases.filter((item) => item.status === "failed").length;

  const updateCase = useCallback((id: string, updater: (item: BatchCase) => BatchCase) => {
    setCases((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }, []);

  const setPrompt = useCallback((id: string, prompt: string) => {
    updateCase(id, (item) => ({
      ...item,
      prompt,
      status: "queued",
      elapsedMs: undefined,
      toolSequence: [],
      reply: "",
      actualType: "none",
      finalArtifact: undefined,
      previewArtifact: undefined,
      error: undefined,
    }));
    setSaveState({ status: "idle" });
  }, [updateCase]);

  const handleStreamEvent = useCallback((id: string, event: TutorStreamEvent) => {
    updateCase(id, (item) => {
      if (event.type === "tool_status") {
        return {
          ...item,
          toolSequence: [...item.toolSequence, `${event.artifact.name}:${event.artifact.status}`],
        };
      }
      if (event.type === "assistant_message") {
        return { ...item, reply: event.reply };
      }
      if (event.type === "artifact") {
        return {
          ...item,
          finalArtifact: event.artifact,
          actualType: event.artifact.type,
        };
      }
      if (event.type === "artifact_delta" && isTutorArtifact(event.artifact)) {
        return {
          ...item,
          previewArtifact: event.artifact,
          actualType: item.finalArtifact?.type ?? event.artifact.type,
        };
      }
      if (event.type === "final") {
        const artifact = event.result.artifacts.at(-1);
        return artifact
          ? { ...item, finalArtifact: artifact, actualType: artifact.type, reply: event.result.reply || item.reply }
          : { ...item, reply: event.result.reply || item.reply };
      }
      if (event.type === "error") {
        return { ...item, error: event.reply };
      }
      return item;
    });
  }, [updateCase]);

  const runOne = useCallback(async (
    id: string,
    prompt: string,
    expectedArtifactType: TutorArtifact["type"],
    runSessionId: string,
  ) => {
    const trimmed = prompt.trim();
    const startedAt = performance.now();
    if (!trimmed) {
      updateCase(id, (item) => ({
        ...item,
        status: "failed",
        error: "Prompt is empty.",
        elapsedMs: 0,
        actualType: "none",
        finalArtifact: errorArtifact("Prompt is empty."),
      }));
      return;
    }

    updateCase(id, (item) => ({
      ...item,
      status: "running",
      elapsedMs: undefined,
      toolSequence: [],
      reply: "",
      actualType: "none",
      finalArtifact: undefined,
      previewArtifact: undefined,
      error: undefined,
    }));

    const message = "Batch runner removed: the legacy /api/tutor/chat endpoint no longer exists. Use the CopilotKit/LangGraph tutor path instead.";
    updateCase(id, (item) => ({
      ...item,
      status: "failed",
      elapsedMs: Math.round(performance.now() - startedAt),
      actualType: "none",
      finalArtifact: errorArtifact(message),
      error: message,
    }));
  }, [updateCase]);

  const runAll = useCallback(() => {
    const nextRunId = makeRunId();
    setRunId(nextRunId);
    setSaveState({ status: "idle" });
    const snapshot = cases.map((item) => ({ id: item.id, prompt: item.prompt }));
    void Promise.all(snapshot.map((item) => runOne(item.id, item.prompt, expectedType, nextRunId)));
  }, [cases, expectedType, runOne]);

  const retryOne = useCallback((item: BatchCase) => {
    const nextRunId = runId === INITIAL_RUN_ID ? makeRunId() : runId;
    if (nextRunId !== runId) setRunId(nextRunId);
    setSaveState({ status: "idle" });
    void runOne(item.id, item.prompt, expectedType, nextRunId);
  }, [expectedType, runId, runOne]);

  const resetPrompts = useCallback(() => {
    setCases(createInitialCases());
    setRunId(INITIAL_RUN_ID);
    setSaveState({ status: "idle" });
  }, []);

  const saveResults = useCallback(async () => {
    const results = completedCases.map((item, index) => {
      const artifact = item.finalArtifact ?? item.previewArtifact ?? errorArtifact(item.error || "No artifact generated.");
      return {
        id: item.id,
        prompt: item.prompt,
        expectedMode,
        actualType: item.actualType || artifact.type,
        title: artifactTitle(artifact, item.id),
        codeKind: expectedType,
        codeFile: `/qa-results/${runId}/results.json#${encodeURIComponent(item.id)}`,
        artifact,
        status: item.status === "passed" ? "passed" as const : "failed" as const,
        error: item.error,
        order: index + 1,
      };
    });

    if (results.length === 0) {
      setSaveState({ status: "error", error: "No completed results to save." });
      return;
    }

    setSaveState({ status: "saving" });
    try {
      const response = await fetch("/api/qa/batch-visual-mode/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runId,
          generatedAt: new Date().toISOString(),
          results,
        }),
      });
      const payload = (await response.json()) as SavedResponse;
      if (!response.ok || !payload.ok || !payload.runId || !payload.routePath || !payload.resultsPath) {
        throw new Error(payload.error || `Save failed with ${response.status}`);
      }
      setSaveState({
        status: "saved",
        runId: payload.runId,
        routePath: payload.routePath,
        resultsPath: payload.resultsPath,
      });
    } catch (error) {
      setSaveState({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }, [completedCases, expectedMode, expectedType, runId]);

  return (
    <main style={{ minHeight: "100vh", background: "#fbf7ee", color: "#2f2a23", padding: 24 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 18 }}>
        <header style={{ display: "grid", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0 }}>Batch visual mode QA</h1>
          <p style={{ margin: 0, color: "#6b6357", lineHeight: 1.5 }}>
            Fill up to 10 prompts, run them concurrently through the real tutor stream, then save the artifacts for the
            standard ToolCard result page.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gap: 12,
            padding: 14,
            border: "1px solid #eadfce",
            borderRadius: 8,
            background: "#fffaf2",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(180px, 1fr)", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#3a352d" }}>
              Expected mode label
              <input
                value={expectedMode}
                onChange={(event) => setExpectedMode(event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#3a352d" }}>
              Expected artifact type
              <select
                value={expectedType}
                onChange={(event) => setExpectedType(event.target.value as TutorArtifact["type"])}
                style={inputStyle}
              >
                {EXPECTED_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={runAll} disabled={running} style={primaryButtonStyle}>
              Run all 10
            </button>
            <button type="button" onClick={saveResults} disabled={running || completedCases.length === 0} style={buttonStyle}>
              {saveState.status === "saving" ? "Saving..." : "Save results"}
            </button>
            <button type="button" onClick={resetPrompts} disabled={running} style={buttonStyle}>
              Reset prompts
            </button>
            <span style={{ color: "#6b6357", fontSize: 13 }}>
              runId: <code>{runId}</code> · passed {passed} · failed {failed} · completed {completedCases.length}/10
            </span>
          </div>
          {saveState.status === "saved" ? (
            <p style={{ margin: 0, color: "#2f6b43", fontSize: 13 }}>
              Saved <a href={saveState.resultsPath}>{saveState.resultsPath}</a> ·{" "}
              <a href={saveState.routePath}>Open ToolCard results</a>
            </p>
          ) : null}
          {saveState.status === "error" ? (
            <p style={{ margin: 0, color: "#9d3d2d", fontSize: 13 }}>{saveState.error}</p>
          ) : null}
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          {cases.map((item, index) => {
            const artifact = item.finalArtifact ?? item.previewArtifact;
            return (
              <article
                key={item.id}
                data-testid={`batch-visual-case-${item.id}`}
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 14,
                  border: "1px solid #eadfce",
                  borderRadius: 8,
                  background: "#fffaf2",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "start" }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{index + 1}. {item.id}</strong>
                      <StatusBadge status={item.status} />
                      <span style={{ color: "#6b6357", fontSize: 12 }}>
                        {item.actualType || "none"}
                        {item.elapsedMs != null ? ` · ${(item.elapsedMs / 1000).toFixed(1)}s` : ""}
                      </span>
                    </div>
                    <textarea
                      value={item.prompt}
                      onChange={(event) => setPrompt(item.id, event.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => retryOne(item)}
                    disabled={running && item.status !== "running"}
                    style={buttonStyle}
                  >
                    {item.status === "running" ? "Running" : "Run"}
                  </button>
                </div>

                {item.toolSequence.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {item.toolSequence.map((tool, toolIndex) => (
                      <code
                        key={`${tool}-${toolIndex}`}
                        style={{
                          border: "1px solid #eadfce",
                          borderRadius: 6,
                          padding: "3px 6px",
                          background: "#fbf7ee",
                          color: "#6b6357",
                          fontSize: 12,
                        }}
                      >
                        {tool}
                      </code>
                    ))}
                  </div>
                ) : null}

                {item.error ? (
                  <p style={{ margin: 0, color: "#9d3d2d", fontSize: 13 }}>{item.error}</p>
                ) : null}

                {artifact ? (
                  <div data-testid={`batch-visual-artifact-${item.id}`}>
                    <ToolCard artifact={artifact} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const styles: Record<RunStatus, { bg: string; border: string; color: string }> = {
    queued: { bg: "#f1ede4", border: "#b0a99c", color: "#6b6357" },
    running: { bg: "#fbeed3", border: "#a66f10", color: "#7c560e" },
    passed: { bg: "#e3f2e8", border: "#2e7d4f", color: "#2f6b43" },
    failed: { bg: "#fbeae6", border: "#c2452f", color: "#8f3344" },
  };
  const style = styles[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 24,
        border: `1px solid ${style.border}`,
        borderRadius: 999,
        background: style.bg,
        color: style.color,
        padding: "2px 9px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

const inputStyle = {
  width: "100%",
  minHeight: 38,
  border: "1px solid #d5c9b8",
  borderRadius: 8,
  background: "#fffdf8",
  color: "#2f2a23",
  padding: "8px 10px",
  font: "inherit",
} satisfies CSSProperties;

const buttonStyle = {
  minHeight: 38,
  border: "1px solid #d5c9b8",
  borderRadius: 8,
  background: "#fffdf8",
  color: "#2f2a23",
  padding: "8px 12px",
  font: "inherit",
  cursor: "pointer",
} satisfies CSSProperties;

const primaryButtonStyle = {
  ...buttonStyle,
  borderColor: "#a66f10",
  background: "#fff2de",
  fontWeight: 700,
} satisfies CSSProperties;
