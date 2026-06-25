"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import type { CodeBlock } from "@/lib/courses/types";
import { CourseMarkdown } from "@/components/course/course-markdown";
import { runnableLanguage, type RunPhase, type RunResult } from "@/lib/code-runner";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

function phaseLabel(phase: RunPhase): string {
  return phase === "loading-runtime" ? "正在加载运行环境…" : "运行中…";
}

export function CodeBlockView({
  block,
  courseId,
  onSaved,
}: {
  block: CodeBlock;
  courseId?: string;
  onSaved?: (block: CodeBlock) => void;
}) {
  const lang = runnableLanguage(block.language);

  if (!lang) {
    // Non-runnable languages (C, SQL, pseudocode, …) keep the read-only view.
    return (
      <>
        <CourseMarkdown markdown={block.explanation} className="course-block-text" />
        <pre className="code-card course-code">
          <span className="course-code-lang">{block.language}</span>
          <code>{block.code}</code>
        </pre>
      </>
    );
  }

  return <RunnableCodeBlock block={block} courseId={courseId} language={lang} onSaved={onSaved} />;
}

function RunnableCodeBlock({
  block,
  courseId,
  language,
  onSaved,
}: {
  block: CodeBlock;
  courseId?: string;
  language: "python" | "javascript";
  onSaved?: (block: CodeBlock) => void;
}) {
  // The AI-generated original, used by "restore original". block.code may already
  // be a user edit (originalCode is backfilled on first save).
  const originalCode = useMemo(() => block.originalCode ?? block.code, [block.originalCode, block.code]);

  const [code, setCode] = useState(block.code);
  const [savedCode, setSavedCode] = useState(block.code);
  const [phase, setPhase] = useState<RunPhase | null>(null);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Adopt external changes to block.code (AI-tutor revision, course refresh) but
  // only when the editor is clean, so unsaved edits are never silently dropped.
  // Render-phase sync (React docs "adjusting state on prop change") avoids the
  // extra render + flash a useEffect would cause.
  const [syncedCode, setSyncedCode] = useState(block.code);
  if (block.code !== syncedCode) {
    setSyncedCode(block.code);
    if (code === savedCode) {
      setCode(block.code);
      setSavedCode(block.code);
    }
  }

  const dirty = code !== savedCode;
  const running = phase !== null;
  const canSave = !!courseId && dirty && !saving;
  const canRestore = code !== originalCode;

  const extensions = useMemo(
    () => [language === "python" ? python() : javascript()],
    [language],
  );

  // Warn on tab close / refresh / back-navigation when there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleRun = useCallback(async () => {
    setOutput(null);
    setPhase("running");
    try {
      const { runCode } = await import("@/lib/code-runner");
      const result = await runCode(language, code, { onStatus: setPhase });
      setOutput(result);
    } catch (e) {
      setOutput({ status: "error", chunks: [], errorMessage: String(e) });
    } finally {
      setPhase(null);
    }
  }, [code, language]);

  const handleSave = useCallback(async () => {
    if (!courseId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "code", code }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `保存失败（${res.status}）`);
      }
      setSavedCode(code);
      // Lift the new code into the parent course state so the Copilot context and
      // any later remount read the saved version, not the stale generated one.
      // Mirrors the server's originalCode backfill.
      onSaved?.({ ...block, code, originalCode: block.originalCode ?? block.code });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [block, code, courseId, onSaved]);

  const handleRestore = useCallback(() => {
    setCode(originalCode);
  }, [originalCode]);

  return (
    <>
      <CourseMarkdown markdown={block.explanation} className="course-block-text" />
      <div className="course-code-runner" data-language={language}>
        <div className="course-code-editor">
          <CodeMirror
            value={code}
            extensions={extensions}
            editable={!running}
            onChange={setCode}
            basicSetup={{ lineNumbers: true, highlightActiveLine: false, foldGutter: false }}
            height="auto"
          />
        </div>

        <div className="course-code-toolbar">
          <span className="course-code-lang">{block.language}</span>
          <div className="course-code-actions">
            <button type="button" className="course-code-btn run" onClick={handleRun} disabled={running}>
              {running ? phaseLabel(phase!) : "▶ 运行"}
            </button>
            <button type="button" className="course-code-btn save" onClick={handleSave} disabled={!canSave}>
              {saving ? "保存中…" : dirty ? "保存 *" : "已保存"}
            </button>
            <button
              type="button"
              className="course-code-btn restore"
              onClick={handleRestore}
              disabled={!canRestore}
              title="恢复 AI 生成的初始代码"
            >
              恢复初始代码
            </button>
          </div>
        </div>

        {saveError ? <div className="course-code-save-error">{saveError}</div> : null}

        {(output || running) && (
          <OutputPanel output={output} running={running} phase={phase} />
        )}
      </div>
    </>
  );
}

function OutputPanel({
  output,
  running,
  phase,
}: {
  output: RunResult | null;
  running: boolean;
  phase: RunPhase | null;
}) {
  return (
    <div className={`course-code-output${output ? ` is-${output.status}` : " is-running"}`}>
      <div className="course-code-output-head">
        <span>输出</span>
        {running ? <span className="course-code-output-status">{phaseLabel(phase ?? "running")}</span> : null}
        {output && output.status === "timeout" ? (
          <span className="course-code-output-status error">已超时</span>
        ) : null}
        {output && output.status === "error" ? (
          <span className="course-code-output-status error">出错</span>
        ) : null}
      </div>
      <div className="course-code-output-body">
        {output?.errorMessage && output.chunks.length === 0 ? (
          <pre className="course-code-output-stderr">{output.errorMessage}</pre>
        ) : null}
        {output?.chunks.map((chunk, i) => {
          if (chunk.kind === "image") {
            return (
              // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not optimizable by next/image
              <img
                key={i}
                className="course-code-output-image"
                src={`data:${chunk.mime};base64,${chunk.dataBase64}`}
                alt="运行生成的图像"
              />
            );
          }
          return (
            <pre key={i} className={chunk.kind === "stderr" ? "course-code-output-stderr" : "course-code-output-stdout"}>
              {chunk.text}
            </pre>
          );
        })}
        {output && output.chunks.length === 0 && !output.errorMessage ? (
          <pre className="course-code-output-stdout course-code-output-empty">（无输出）</pre>
        ) : null}
      </div>
    </div>
  );
}
