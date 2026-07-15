"use client";

import { useState, type CSSProperties } from "react";
import { COMPONENT_REGISTRY, type LensRouteResponse, type SelectDecision } from "@/lib/interactive/components/registry";
import type { ComponentConfig } from "@/lib/interactive/components/types";
import { WIDGETS } from "@/components/generative-ui/interactive";

// QA page for the declarative-component engine experiment: the input below
// goes through the REAL fast-tier LLM (two-stage: select_component →
// configure_component). Generic over the component registry — adding a
// component must not require edits here.

type StageState = "idle" | "running" | "done" | "fail";

type Instance = { componentId: string; config: ComponentConfig };

type PatchEntry = {
  prompt: string;
  patch: ComponentConfig;
  ms: number;
};

type LastOutput =
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "chat"; decision: SelectDecision }
  | { kind: "fallback"; decision: SelectDecision }
  | { kind: "create"; decision: SelectDecision; instance: Instance; ms: number }
  | { kind: "patch"; decision: SelectDecision; patch: ComponentConfig; ms: number };

const EXAMPLE_PROMPTS = [
  "帮我演示焦距 10cm 的凸透镜,物距 30cm 时怎么成像",
  "让蜡烛离镜片更近些,放到焦点里面",
  "演示一下 0.1M 盐酸被 NaOH 滴定的 pH 曲线",
  "两列波相位差 180° 会怎么叠加",
  "用冒泡排序演示 [7,3,9,1,5] 怎么排好",
  "秦末到楚汉之争的因果时间线",
  "show a 90 degree angle",
  "什么是折射率?",
];

const COLORS = {
  bg: "#fbf7ee",
  ink: "#2f2a23",
  muted: "#6b6357",
  line: "#d8d2c4",
  accent: "#2e6e4e",
  warn: "#a05a1c",
  bad: "#a33d3d",
  codeBg: "#1b2620",
  codeInk: "#d6e4da",
};

const cardStyle: CSSProperties = {
  background: "#fff",
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: 16,
};

const codeStyle: CSSProperties = {
  background: COLORS.codeBg,
  color: COLORS.codeInk,
  borderRadius: 8,
  padding: "12px 14px",
  fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 12.5,
  lineHeight: 1.6,
  overflowX: "auto",
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

function StepChip({ label, state, detail }: { label: string; state: StageState; detail?: string }) {
  const palette: Record<StageState, { border: string; color: string }> = {
    idle: { border: COLORS.line, color: COLORS.muted },
    running: { border: COLORS.accent, color: COLORS.accent },
    done: { border: COLORS.accent, color: COLORS.accent },
    fail: { border: COLORS.warn, color: COLORS.warn },
  };
  const p = palette[state];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
      padding: "3px 10px", borderRadius: 999, border: `1px solid ${p.border}`, color: p.color, background: "#fff",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: state === "idle" ? COLORS.line : p.border,
      }} />
      {label}
      {detail ? <span style={{ opacity: 0.75 }}>{detail}</span> : null}
      {state === "running" ? <span style={{ opacity: 0.75 }}>…</span> : null}
    </span>
  );
}

export function DeclarativeLensClient() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [stage1, setStage1] = useState<StageState>("idle");
  const [stage1Ms, setStage1Ms] = useState<number | null>(null);
  const [stage2, setStage2] = useState<StageState>("idle");
  const [stage2Ms, setStage2Ms] = useState<number | null>(null);
  const [output, setOutput] = useState<LastOutput>({ kind: "none" });
  const [patchLog, setPatchLog] = useState<PatchEntry[]>([]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setStage1("running");
    setStage1Ms(null);
    setStage2("idle");
    setStage2Ms(null);
    try {
      const response = await fetch("/api/qa/declarative-lens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, current: instance }),
      });
      const json = (await response.json()) as LensRouteResponse | { ok: false; error: string };
      if (!json.ok) {
        setStage1("fail");
        setOutput({ kind: "error", message: json.error });
        return;
      }
      const { decision } = json.stage1;
      setStage1("done");
      setStage1Ms(json.stage1.ms);

      if (json.stage2) {
        setStage2("done");
        setStage2Ms(json.stage2.ms);
        if (json.stage2.mode === "create" && decision.componentId) {
          const next: Instance = { componentId: decision.componentId, config: json.stage2.config };
          setInstance(next);
          setOutput({ kind: "create", decision, instance: next, ms: json.stage2.ms });
        } else if (json.stage2.mode === "patch") {
          const patch = json.stage2.patch;
          const ms = json.stage2.ms;
          setInstance((prev) => (prev ? { ...prev, config: { ...prev.config, ...patch } } : prev));
          setOutput({ kind: "patch", decision, patch, ms });
          setPatchLog((log) => [{ prompt: trimmed, patch, ms }, ...log]);
        }
      } else if (decision.intent === "chat") {
        setOutput({ kind: "chat", decision });
      } else {
        setStage2("fail");
        setOutput({ kind: "fallback", decision });
      }
    } catch (error) {
      setStage1("fail");
      setOutput({ kind: "error", message: error instanceof Error ? error.message : "请求失败" });
    } finally {
      setBusy(false);
    }
  }

  const renderWidget = instance ? WIDGETS[instance.componentId] : undefined;

  const toolCallJson =
    output.kind === "create"
      ? JSON.stringify({ tool: "configure_component", componentId: output.instance.componentId, config: output.instance.config }, null, 2)
      : output.kind === "patch"
        ? JSON.stringify({ tool: "patch_component", componentId: instance?.componentId, patch: output.patch }, null, 2)
        : null;

  return (
    <main style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.ink, padding: 24 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 18 }}>
        <header style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>声明式组件引擎 · 真实 LLM 路由(QA)</h1>
          <p style={{ margin: 0, color: COLORS.muted, lineHeight: 1.6, maxWidth: "78ch" }}>
            输入经过真实 fast-tier LLM 的两段式路由:①{" "}
            <code>select_component</code>(只看组件目录,{COMPONENT_REGISTRY.length} 行)→ ②{" "}
            <code>configure_component</code>(注入选中组件的完整 schema,产出 config 或最小补丁)。
            组件实例存在时,调整类指令走补丁路径,组件原地更新。
          </p>
        </header>

        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit(prompt);
              }}
              placeholder="试试:帮我演示焦距 10cm 的凸透镜,物距 30cm 时怎么成像"
              aria-label="学习 prompt"
              style={{
                flex: 1, font: "inherit", padding: "10px 14px", borderRadius: 8,
                border: `1.5px solid ${COLORS.line}`, background: COLORS.bg, minWidth: 0,
              }}
            />
            <button
              type="button"
              onClick={() => void submit(prompt)}
              disabled={busy}
              style={{
                font: "inherit", fontWeight: 600, padding: "10px 22px", borderRadius: 8, border: "none",
                background: busy ? COLORS.muted : COLORS.accent, color: "#fff", cursor: busy ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {busy ? "生成中…" : "生成"}
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={busy}
                onClick={() => {
                  setPrompt(example);
                  void submit(example);
                }}
                style={{
                  font: "inherit", fontSize: 12.5, padding: "4px 12px", borderRadius: 999,
                  border: `1px solid ${COLORS.line}`, background: "#f3efe4", color: COLORS.muted,
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                {example}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <StepChip label="① select_component" state={stage1} detail={stage1Ms !== null ? `${stage1Ms}ms` : undefined} />
            <span style={{ color: COLORS.muted }}>→</span>
            <StepChip
              label="② configure_component"
              state={stage2}
              detail={stage2Ms !== null ? `${stage2Ms}ms` : stage2 === "fail" ? "未命中/降级" : undefined}
            />
            <span style={{ color: COLORS.muted }}>→</span>
            <StepChip label="Zod 校验 + 渲染" state={stage2 === "done" ? "done" : "idle"} />
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            {instance && renderWidget ? (
              renderWidget({
                config: instance.config,
                onChange: (next) => setInstance({ componentId: instance.componentId, config: next }),
              })
            ) : instance ? (
              <div style={{ ...cardStyle, border: `1.5px solid ${COLORS.bad}`, color: COLORS.bad, fontSize: 13 }}>
                组件 {instance.componentId} 未在 WIDGETS 注册。
              </div>
            ) : (
              <div style={{
                ...cardStyle, borderStyle: "dashed", color: COLORS.muted, textAlign: "center",
                padding: "64px 24px", lineHeight: 1.7,
              }}>
                <b>还没有组件被实例化</b>
                <div style={{ fontSize: 13 }}>
                  请求会经真实 LLM 两段路由命中目录中 19 个学科组件之一;
                  <br />目录外的可视化请求会展示沙箱降级决策。
                </div>
              </div>
            )}
            {output.kind === "fallback" ? (
              <div style={{ ...cardStyle, border: `1.5px dashed ${COLORS.warn}`, color: COLORS.muted, lineHeight: 1.7 }}>
                <b style={{ color: COLORS.warn }}>
                  {output.decision.componentId
                    ? `目录命中「${output.decision.componentId}」,但该组件未实现`
                    : "组件目录未命中"}
                </b>
                <div style={{ fontSize: 13 }}>
                  LLM 判定:{output.decision.reason}
                  <br />
                  生产环境中这里自动降级到命令式沙箱(widgetRenderer 现写 HTML/JS)。降级即扩库信号:同类请求频繁出现时,把它工程化为新组件。
                </div>
              </div>
            ) : null}
            {output.kind === "chat" ? (
              <div style={{ ...cardStyle, color: COLORS.muted, fontSize: 13, lineHeight: 1.7 }}>
                LLM 判定为普通问答,不触发可视化组件:{output.decision.reason}
              </div>
            ) : null}
            {output.kind === "error" ? (
              <div style={{ ...cardStyle, border: `1.5px solid ${COLORS.bad}`, color: COLORS.bad, fontSize: 13 }}>
                {output.message}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.muted }}>
                路由决策(stage 1)
              </h2>
              <pre style={codeStyle}>
                {output.kind === "none"
                  ? "// 等待输入 —— 这里显示真实 LLM 的 select_component 输出。"
                  : output.kind === "error"
                    ? `// 请求失败\n// ${output.message}`
                    : JSON.stringify(output.decision, null, 2)}
              </pre>
            </div>
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.muted }}>
                组件配置(stage 2){" "}
                {toolCallJson ? (
                  <span style={{
                    fontFamily: "ui-monospace, SF Mono, Menlo, monospace", fontSize: 11,
                    background: "#e2eee6", color: "#245a40", padding: "2px 9px", borderRadius: 999, textTransform: "none",
                  }}>
                    ≈ {Math.max(4, Math.round(toolCallJson.length / 3.2))} tokens
                  </span>
                ) : null}
              </h2>
              <pre style={codeStyle}>
                {toolCallJson ?? "// 只有目录命中已实现组件时才有 stage 2。\n// 注意补丁路径:只包含变化的字段。"}
              </pre>
            </div>
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.muted }}>
                对话式调整记录
              </h2>
              {patchLog.length === 0 ? (
                <div style={{ fontSize: 12.5, color: COLORS.muted }}>
                  暂无 —— 组件渲染后试试「把物距调大一点」「换成凹透镜」。
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {patchLog.map((entry, index) => (
                    <div key={`${entry.prompt}-${index}`} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                      <div>「{entry.prompt}」</div>
                      <div style={{ fontFamily: "ui-monospace, SF Mono, Menlo, monospace", fontSize: 11.5, color: "#245a40", wordBreak: "break-all" }}>
                        → {JSON.stringify(entry.patch)} <span style={{ color: COLORS.muted }}>({entry.ms}ms,组件原地更新)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
