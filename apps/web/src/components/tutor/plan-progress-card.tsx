"use client";

import { useState } from "react";
import { useTodosStore } from "@/lib/todos-store";

function mapStatus(s?: "pending" | "in_progress" | "completed"): "pending" | "in_progress" | "done" {
  if (s === "completed") return "done";
  if (s === "in_progress") return "in_progress";
  return "pending";
}

const emojiPrefix = /^\s*\p{Extended_Pictographic}+\s*/u;

export function PlanProgressCard() {
  const todos = useTodosStore();
  const [expanded, setExpanded] = useState(false);

  if (todos.length === 0) return null;

  const total = todos.length;
  const done = todos.filter((t) => t.status === "completed").length;
  const current = todos.find((t) => t.status === "in_progress");
  const currentLabel = current
    ? (current.title ?? current.content ?? "").replace(emojiPrefix, "").trim()
    : "";

  return (
    <div className="plan-progress" data-expanded={expanded || undefined}>
      <button
        type="button"
        className="plan-progress-head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="plan-progress-dot" />
        <span className="plan-progress-title">{current ? currentLabel : "Plan"}</span>
        <span className="plan-progress-count">
          {done}/{total}
        </span>
        <span className="plan-progress-chevron" aria-hidden="true">
          {expanded ? "▴" : "▾"}
        </span>
      </button>
      {expanded ? (
        <ol className="plan-progress-list">
          {todos.map((todo, index) => {
            const status = mapStatus(todo.status);
            const raw = (todo.title ?? todo.content ?? "").trim();
            const clean = raw.replace(emojiPrefix, "").trim() || raw;
            return (
              <li key={todo.id ?? `${index}-${clean}`} className={`plan-progress-item ${status}`}>
                <span className={`plan-progress-indicator ${status}`} />
                <span className="plan-progress-text">{clean}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
