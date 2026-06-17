"use client";

// Standalone Web-as-brain pipeline inspector. Independent of the homepage — it
// re-runs the exact browser-driven flow (intent signal → KG positioning →
// course build → produced course) against the real web endpoints and shows the
// request/response at every hop so you can watch data flow from input to output.
//
// Visit /debug/pipeline. Does not touch the normal tutor homepage.

import { useState } from "react";
import { buildKgContextPrompt, type CourseContext } from "@/lib/ai/deepagent/course-kg-context";

type StageStatus = "pending" | "running" | "ok" | "error" | "skipped";

type Stage = {
  key: string;
  label: string;
  status: StageStatus;
  note?: string;
  request?: unknown;
  response?: unknown;
  prompt?: string;
  durationMs?: number;
};

const EXAMPLES = [
  { label: "specific 「我想学导数」", query: "我想学导数" },
  { label: "broad 「我想学微积分」", query: "我想学微积分" },
  { label: "fallback「教我量子色动力学」", query: "教我量子色动力学" },
];

const C = {
  bg: "#0f1115",
  panel: "#171a21",
  panelAlt: "#1d212b",
  border: "#2a2f3a",
  text: "#e6e8ee",
  muted: "#9aa3b2",
  accent: "#7c9cff",
};

const statusColor: Record<StageStatus, string> = {
  pending: "#6b7280",
  running: "#d8a23a",
  ok: "#4a9d6a",
  error: "#c0556a",
  skipped: "#5b6472",
};

function Json({ value }: { value: unknown }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        background: "#0b0d11",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color: "#cdd3df",
        fontSize: 12.5,
        lineHeight: 1.5,
        overflowX: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight: 420,
        overflowY: "auto",
      }}
    >
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.panel, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: C.panelAlt,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: statusColor[stage.status],
            boxShadow: stage.status === "running" ? `0 0 0 3px ${statusColor.running}33` : undefined,
          }}
        />
        <strong style={{ fontSize: 14 }}>{stage.label}</strong>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
          {stage.status}
          {stage.durationMs != null ? ` · ${stage.durationMs}ms` : ""}
        </span>
      </div>
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        {stage.note ? <div style={{ fontSize: 13, color: C.muted }}>{stage.note}</div> : null}
        {stage.request !== undefined ? (
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: C.muted, marginBottom: 6 }}>
              Request
            </div>
            <Json value={stage.request} />
          </div>
        ) : null}
        {stage.prompt !== undefined ? (
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#c9a96a", marginBottom: 6 }}>
              KG context injected into build prompt (buildKgContextPrompt)
            </div>
            <Json value={stage.prompt} />
          </div>
        ) : null}
        {stage.response !== undefined ? (
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: C.muted, marginBottom: 6 }}>
              Response
            </div>
            <Json value={stage.response} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PipelineDebugPage() {
  const [query, setQuery] = useState("我想学导数");
  const [graphId, setGraphId] = useState("");
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [summary, setSummary] = useState<string>("");

  function reset(initial: Stage[]) {
    setStages(initial);
  }

  function patch(key: string, next: Partial<Stage>) {
    setStages((cur) => cur.map((s) => (s.key === key ? { ...s, ...next } : s)));
  }

  async function call(key: string, method: string, url: string, body?: unknown) {
    patch(key, { status: "running", request: { method, url, body } });
    const started = performance.now();
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const durationMs = Math.round(performance.now() - started);
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => "<no body>");
    }
    patch(key, {
      status: res.ok ? "ok" : "error",
      durationMs,
      response: { httpStatus: res.status, ...(typeof data === "object" && data ? data : { body: data }) },
    });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return data as Record<string, unknown>;
  }

  async function run() {
    if (!running && query.trim()) {
      setRunning(true);
      setSummary("");
      const trimmed = query.trim();
      const gid = graphId.trim() || undefined;

      reset([
        { key: "input", label: "1 · 用户输入", status: "ok", request: { query: trimmed, graphId: gid ?? "(default)" } },
        {
          key: "agent",
          label: "2 · Agent 意图信号 · position_learning_goal",
          status: "ok",
          note: "Web-as-brain 下 LangGraph agent 只发出这个工具信号（不调 web、不建课）。真正的定位与建课由浏览器驱动 —— 即下面的步骤。",
          response: { type: "learning_goal_position", query: trimmed, graph_id: gid },
        },
        { key: "position", label: "3 · KG 定位 · POST /api/knowledge-graph/position", status: "pending" },
        { key: "build", label: "4 · 建课 · POST /api/learning/course", status: "pending" },
        { key: "course", label: "5 · 产出课程 · GET /api/courses/{id}", status: "pending" },
      ]);

      try {
        const pos = await call("position", "POST", "/api/knowledge-graph/position", { query: trimmed, graphId: gid });
        const plan = (pos.plan ?? {}) as Record<string, any>;
        const branch = plan.branch as string | undefined;

        if (branch !== "specific") {
          patch("build", { status: "skipped", note: `branch = ${branch ?? "?"} — 不建课` });
          patch("course", { status: "skipped" });
          if (branch === "broad") {
            const names = (plan.menu ?? []).map((m: any) => m.name).join(" / ");
            setSummary(`输入「${trimmed}」 → branch=broad → 返回菜单：${names || "(空)"}（不建课）`);
          } else {
            setSummary(`输入「${trimmed}」 → branch=${branch} → ${plan.message ?? "提示用户换更具体的目标"}（不建课）`);
          }
          return;
        }

        patch("build", { prompt: buildKgContextPrompt(plan.courseContext as CourseContext) });
        const build = await call("build", "POST", "/api/learning/course", { courseContext: plan.courseContext });
        const courseId = build.courseId as string | undefined;
        if (!courseId) {
          patch("course", { status: "skipped", note: "build 未返回 courseId" });
          setSummary(`输入「${trimmed}」 → branch=specific → 建课成功但缺 courseId`);
          return;
        }

        const course = await call("course", "GET", `/api/courses/${encodeURIComponent(courseId)}`);
        const c = (course.course ?? {}) as Record<string, any>;
        const startName = (plan.courseContext as any)?.startTopic?.name;
        const nextName = (plan.courseContext as any)?.nextTopic?.name;
        setSummary(
          `输入「${trimmed}」 → branch=specific（${startName}${nextName ? ` → ${nextName}（两课时）` : "（单课时）"}）` +
            ` → courseId=${courseId} → 「${c.title}」，${(c.blocks?.length ?? 0)} 个 block`,
        );
      } catch (error) {
        setSummary(`流程中断：${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setRunning(false);
      }
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 20 }}>
        <header>
          <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>Web-as-brain 流程检查器</h1>
          <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>
            模拟首页输入，逐跳展示 用户输入 → Agent 信号 → KG 定位 → 建课 → 产出课程 的请求与响应。独立于首页，不影响正常使用。
          </p>
        </header>

        <div style={{ display: "grid", gap: 10, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            placeholder="想学点什么？例如：我想学导数"
            style={{
              width: "100%",
              resize: "vertical",
              background: "#0b0d11",
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={graphId}
              onChange={(e) => setGraphId(e.target.value)}
              placeholder="graphId（可空 = 跨全部学科图召回）"
              style={{
                flex: "1 1 240px",
                background: "#0b0d11",
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
              }}
            />
            <button
              onClick={run}
              disabled={running || !query.trim()}
              style={{
                background: running ? "#3a4053" : C.accent,
                color: "#0b0d11",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: running ? "default" : "pointer",
              }}
            >
              {running ? "运行中…" : "运行流程"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.query}
                onClick={() => setQuery(ex.query)}
                disabled={running}
                style={{
                  background: "transparent",
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {summary ? (
          <div
            style={{
              background: "#13211a",
              border: "1px solid #2c4a3a",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13.5,
              color: "#bfe6cf",
            }}
          >
            {summary}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 14 }}>
          {stages.map((stage) => (
            <StageCard key={stage.key} stage={stage} />
          ))}
        </div>

        {stages.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>输入一个学习目标并点「运行流程」。</p>
        ) : null}
      </div>
    </main>
  );
}
