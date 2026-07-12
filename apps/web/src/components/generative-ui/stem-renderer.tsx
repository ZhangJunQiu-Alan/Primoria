"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { StemRendererArgsSchema } from "@primoria/contracts/artifacts/schemas";
import { validateStemCode } from "@/lib/ai/stem-code";
import { ExportOverlay } from "./export-overlay";
import { assembleStemIframeShell, assembleStemStandaloneHtml } from "./export-utils";

// Shared with the agent's stemRenderer tool schema (cross-runtime contract).
export const StemRendererProps = StemRendererArgsSchema;

export type StemRendererStatus = "executing" | "inProgress" | "complete";
type StemRendererPropsType = z.infer<typeof StemRendererProps> & {
  status: StemRendererStatus;
};

export function StemRenderer({
  subject,
  title,
  description,
  code,
  status,
}: StemRendererPropsType) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shellSubjectRef = useRef<string | null>(null);
  const codeExecutedRef = useRef(false);
  const [height, setHeight] = useState(500);
  const [error, setError] = useState<{ message: string; stack: string; key: string } | null>(null);

  const isComplete = status === "complete";
  const runKey = `${subject}:${code}`;
  const validation = useMemo(() => validateStemCode(code), [code]);
  const visibleError = error?.key === runKey ? error : null;
  const exportHtml = useMemo(
    () => (isComplete ? assembleStemStandaloneHtml({ subject, title, description, code }) : undefined),
    [code, description, isComplete, subject, title],
  );

  const executeCode = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || codeExecutedRef.current) return;
    if (!validation.ok) {
      setError({ message: validation.reason, stack: "", key: runKey });
      return;
    }
    codeExecutedRef.current = true;
    iframe.contentWindow.postMessage({ type: "execute-code", code }, "*");
  }, [code, runKey, validation]);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const { type } = e.data ?? {};

      if (type === "stem-ready" && isComplete) executeCode();

      if (type === "widget-resize" && typeof e.data.height === "number") {
        setHeight(Math.max(200, Math.min(e.data.height, 2000)));
      }

      if (type === "stem-error") {
        setError({ message: e.data.message ?? "Unknown error", stack: e.data.stack ?? "", key: runKey });
      }
    },
    [executeCode, isComplete, runKey]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    codeExecutedRef.current = false;
  }, [code, subject]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!isComplete || !iframe) return;
    if (shellSubjectRef.current !== subject) {
      shellSubjectRef.current = subject;
      codeExecutedRef.current = false;
      iframe.srcdoc = assembleStemIframeShell(subject, title);
      return;
    }
    executeCode();
  }, [executeCode, isComplete, subject, title]);

  if (!isComplete) {
    return (
      <div
        className="w-full my-3 rounded-xl"
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "var(--color-background-secondary, #f7f3ea)",
          border: "1px solid var(--color-border-tertiary, rgba(23,19,15,0.12))",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid rgba(0,0,0,0.1)",
            borderTopColor: "#ef7358",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, color: "var(--color-text-secondary, #6f675f)" }}>
          Building {subject === "math" ? "math visualization" : subject === "cs" ? "CS visualization…" : `${subject} simulation`}…
        </span>
      </div>
    );
  }

  if (visibleError) {
    return (
      <div
        className="w-full my-3 rounded-xl p-4"
        style={{
          background: "var(--color-background-danger, #fff0ea)",
          border: "1px solid var(--color-text-danger, #9d3d2d)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-danger, #9d3d2d)", marginBottom: 6 }}>
          {subject === "math" ? "MathGL" : subject === "cs" ? "AlgoViz" : "Physics"} runtime error
        </div>
        <pre
          style={{
            fontSize: 12,
            color: "var(--color-text-danger, #9d3d2d)",
            whiteSpace: "pre-wrap",
            margin: 0,
            fontFamily: "var(--font-mono, monospace)",
            opacity: 0.85,
          }}
        >
          {visibleError.message}
          {visibleError.stack ? "\n\n" + visibleError.stack : ""}
        </pre>
      </div>
    );
  }

  return (
    <ExportOverlay title={title} exportHtml={exportHtml} ready={isComplete && validation.ok}>
      <div className="w-full my-3">
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        style={{
          height,
          display: "block",
          background: "transparent",
          borderRadius: 12,
          border: "1px solid var(--color-border-tertiary, rgba(23,19,15,0.12))",
          transition: "height 200ms ease-out",
          overflow: "hidden",
        }}
        title={title}
      />
      </div>
    </ExportOverlay>
  );
}
