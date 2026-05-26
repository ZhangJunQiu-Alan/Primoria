"use client";

import { useState } from "react";
import type { QuizArtifact, QuizQuestion } from "@/lib/ai/types";

// ---- State types ----
interface MCState    { kind: "multiple_choice"; sel: number | null; checked: boolean }
interface MSState    { kind: "multi_select";    sel: number[];       checked: boolean }
interface FillState  { kind: "fill_blank";      input: string;       checked: boolean }
interface MatchState {
  kind: "matching";
  active: number | null;
  rightOrder: number[];           // rightOrder[visPos] = original pairIndex
  pairs: Record<number, number>;  // leftIdx → rightVisPos
  checked: boolean;
}
type QState = MCState | MSState | FillState | MatchState;

function mkState(q: QuizQuestion, qi: number): QState {
  if (q.kind === "multiple_choice") return { kind: "multiple_choice", sel: null, checked: false };
  if (q.kind === "multi_select")    return { kind: "multi_select", sel: [], checked: false };
  if (q.kind === "fill_blank")      return { kind: "fill_blank", input: "", checked: false };
  const n = q.pairs.length;
  const order = [...Array(n).keys()];
  let s = ((qi + 1) * 2654435761) >>> 0;
  for (let i = n - 1; i > 0; i--) {
    s = ((s ^ (s >>> 16)) * 0x45d9f3b) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { kind: "matching", active: null, rightOrder: order, pairs: {}, checked: false };
}

function normalize(s: string) { return s.trim().toLowerCase().replace(/\s+/g, " "); }

function isCorrect(q: QuizQuestion, s: QState): boolean {
  if (q.kind === "multiple_choice" && s.kind === "multiple_choice")
    return s.sel === q.correct;
  if (q.kind === "multi_select" && s.kind === "multi_select") {
    const cor = new Set(q.correct);
    return new Set(s.sel).size === cor.size && s.sel.every(i => cor.has(i));
  }
  if (q.kind === "fill_blank" && s.kind === "fill_blank") {
    const n = normalize(s.input);
    return n === normalize(q.answer) || (q.alternates ?? []).some(a => normalize(a) === n);
  }
  if (q.kind === "matching" && s.kind === "matching") {
    const n = q.pairs.length;
    return (
      Object.keys(s.pairs).length === n &&
      [...Array(n).keys()].every(l => s.rightOrder[s.pairs[l]] === l)
    );
  }
  return false;
}

const PAIR_COLORS = ["#c8881a", "#4a7a5a", "#7c6ad0", "#b56474", "#2a8a8a", "#8a5a2a"];

// ---- Root component ----

export function QuizRenderer({ artifact }: { artifact: QuizArtifact }) {
  const [states, setStates] = useState<QState[]>(() => artifact.questions.map(mkState));

  function upd(i: number, s: QState) {
    setStates(prev => prev.map((q, idx) => (idx === i ? s : q)));
  }

  const allChecked =
    artifact.questions.length > 0 && states.every(s => s.checked);
  const correctCount = allChecked
    ? states.filter((s, i) => isCorrect(artifact.questions[i], s)).length
    : 0;

  return (
    <div className="message-row tool">
      <div className="tool-card" style={{ overflow: "hidden" }}>
        <div className="tool-title">
          <span className="tool-dot" />
          <span>render_quiz · {artifact.title}</span>
        </div>

        {allChecked && (
          <ScoreBanner
            score={correctCount}
            total={states.length}
            onRetry={() => setStates(artifact.questions.map(mkState))}
          />
        )}

        {artifact.description && (
          <div style={{ padding: "6px 16px 0", fontSize: 13, color: "#666" }}>
            {artifact.description}
          </div>
        )}

        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {artifact.questions.map((q, i) => (
            <QuestionCard
              key={i}
              q={q}
              idx={i}
              state={states[i]}
              onChange={s => upd(i, s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Score banner ----

function ScoreBanner({ score, total, onRetry }: { score: number; total: number; onRetry: () => void }) {
  const pct = Math.round((score / total) * 100);
  const perfect = score === total;
  const good = score >= total * 0.6;
  return (
    <div style={{
      padding: "10px 16px",
      borderBottom: "1px solid #ddd0c0",
      background: perfect ? "#e8f5ee" : good ? "#fff3e0" : "#fde8eb",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          {score} / {total} correct ({pct}%)
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 1 }}>
          {perfect ? "All correct!" : good ? "Good — review the explanations below." : "Keep practicing!"}
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{ fontSize: 12, padding: "5px 12px", borderRadius: 5, background: "#2a2a3a", color: "#fff", border: "none", cursor: "pointer" }}
      >
        Retry
      </button>
    </div>
  );
}

// ---- Question card wrapper ----

function QuestionCard({ q, idx, state, onChange }: {
  q: QuizQuestion; idx: number; state: QState; onChange: (s: QState) => void;
}) {
  const correct = state.checked ? isCorrect(q, state) : null;
  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${state.checked ? (correct ? "#4a7a5a" : "#b56474") : "#ddd0c0"}`,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "9px 14px",
        background: state.checked ? (correct ? "#e8f5ee" : "#fde8eb") : "#f9f5ee",
        borderBottom: "1px solid #ddd0c0",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: "#999", flexShrink: 0, paddingTop: 1 }}>
          Q{idx + 1}
        </span>
        <span style={{ fontSize: 14, color: "#2a2010", lineHeight: 1.5, flex: 1 }}>
          {q.question}
        </span>
        {state.checked && (
          <span style={{ fontWeight: 700, fontSize: 13, color: correct ? "#4a7a5a" : "#b56474", flexShrink: 0 }}>
            {correct ? "Correct" : "Incorrect"}
          </span>
        )}
      </div>

      <div style={{ padding: "12px 14px", background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
        {q.kind === "multiple_choice" && state.kind === "multiple_choice" && (
          <MCBody q={q} state={state} onChange={onChange as (s: MCState) => void} />
        )}
        {q.kind === "multi_select" && state.kind === "multi_select" && (
          <MSBody q={q} state={state} onChange={onChange as (s: MSState) => void} />
        )}
        {q.kind === "fill_blank" && state.kind === "fill_blank" && (
          <FillBody q={q} state={state} onChange={onChange as (s: FillState) => void} />
        )}
        {q.kind === "matching" && state.kind === "matching" && (
          <MatchBody q={q} state={state} onChange={onChange as (s: MatchState) => void} />
        )}

        {state.checked && q.explanation && (
          <div style={{
            padding: "8px 10px", borderRadius: 5,
            background: "#f0f4f8", border: "1px solid #d0d8e0",
            fontSize: 13, color: "#334", lineHeight: 1.5,
          }}>
            <strong>Note:</strong> {q.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Multiple choice ----

function MCBody({ q, state, onChange }: {
  q: Extract<QuizQuestion, { kind: "multiple_choice" }>;
  state: MCState;
  onChange: (s: MCState) => void;
}) {
  const safeCorrect = q.correct >= 0 && q.correct < q.options.length ? q.correct : -1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {q.options.map((opt, i) => {
        const isRight = i === safeCorrect;
        const isSel = i === state.sel;
        let bg = "#faf8f4", bdr = "1px solid #ddd0c0", color = "#2a2010";
        if (state.checked) {
          if (isRight)             { bg = "#e8f5ee"; bdr = "1px solid #4a7a5a"; color = "#1a4a2a"; }
          else if (isSel && !isRight) { bg = "#fde8eb"; bdr = "1px solid #b56474"; color = "#6a1020"; }
        } else if (isSel) {
          bg = "#fff3e0"; bdr = "1px solid #c8881a"; color = "#6a3800";
        }
        const badgeBg = state.checked
          ? (isRight ? "#4a7a5a" : isSel ? "#b56474" : "#ddd0c0")
          : isSel ? "#c8881a" : "#ddd0c0";
        const badgeColor = state.checked && (isRight || isSel) ? "#fff" : isSel ? "#fff" : "#666";
        return (
          <button
            key={i}
            onClick={() => !state.checked && onChange({ ...state, sel: i, checked: true })}
            disabled={state.checked}
            style={{
              textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 14,
              cursor: state.checked ? "default" : "pointer",
              background: bg, border: bdr, color,
              display: "flex", alignItems: "center", gap: 10, transition: "all 0.12s",
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12, background: badgeBg, color: badgeColor,
            }}>
              {state.checked
                ? (isRight ? "✓" : isSel ? "✗" : String.fromCharCode(65 + i))
                : String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---- Multi-select ----

function MSBody({ q, state, onChange }: {
  q: Extract<QuizQuestion, { kind: "multi_select" }>;
  state: MSState;
  onChange: (s: MSState) => void;
}) {
  function toggle(i: number) {
    if (state.checked) return;
    const sel = state.sel.includes(i) ? state.sel.filter(x => x !== i) : [...state.sel, i];
    onChange({ ...state, sel });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#888" }}>
        {q.correct.length === 1 ? "Select the correct answer." : `Select all that apply (${q.correct.length} correct).`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.options.map((opt, i) => {
          const isRight = q.correct.includes(i);
          const isSel = state.sel.includes(i);
          let bg = "#faf8f4", bdr = "1px solid #ddd0c0", color = "#2a2010";
          if (state.checked) {
            if (isRight && isSel)  { bg = "#e8f5ee"; bdr = "1px solid #4a7a5a"; color = "#1a4a2a"; }
            else if (isRight)      { bg = "#f0faf4"; bdr = "2px dashed #4a7a5a"; color = "#1a4a2a"; }
            else if (isSel)        { bg = "#fde8eb"; bdr = "1px solid #b56474"; color = "#6a1020"; }
          } else if (isSel) {
            bg = "#fff3e0"; bdr = "1px solid #c8881a"; color = "#6a3800";
          }
          const cbBg = isSel
            ? (state.checked ? (isRight ? "#4a7a5a" : "#b56474") : "#c8881a")
            : "#ddd0c0";
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={state.checked}
              style={{
                textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 14,
                cursor: state.checked ? "default" : "pointer",
                background: bg, border: bdr, color,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                background: cbBg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700,
              }}>
                {isSel ? (state.checked ? (isRight ? "✓" : "✗") : "✓") : ""}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {!state.checked && (
        <button
          onClick={() => onChange({ ...state, checked: true })}
          disabled={state.sel.length === 0}
          style={{
            alignSelf: "flex-start", padding: "6px 16px", borderRadius: 5,
            cursor: state.sel.length > 0 ? "pointer" : "default",
            background: state.sel.length > 0 ? "#c8881a" : "#e0d8cc",
            color: state.sel.length > 0 ? "#fff" : "#aaa",
            border: "none", fontSize: 13, fontWeight: 600,
          }}
        >
          Check
        </button>
      )}
    </div>
  );
}

// ---- Fill in the blank ----

function FillBody({ q, state, onChange }: {
  q: Extract<QuizQuestion, { kind: "fill_blank" }>;
  state: FillState;
  onChange: (s: FillState) => void;
}) {
  function check() {
    if (state.input.trim()) onChange({ ...state, checked: true });
  }
  const correct = state.checked ? isCorrect(q, state) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={state.input}
          onChange={e => !state.checked && onChange({ ...state, input: e.target.value })}
          onKeyDown={e => e.key === "Enter" && check()}
          disabled={state.checked}
          placeholder="Type your answer…"
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 5, fontSize: 14,
            border: state.checked
              ? `1px solid ${correct ? "#4a7a5a" : "#b56474"}`
              : "1px solid #ddd0c0",
            background: state.checked ? (correct ? "#e8f5ee" : "#fde8eb") : "#fff",
            color: "#2a2010", outline: "none",
          }}
        />
        {!state.checked && (
          <button
            onClick={check}
            disabled={!state.input.trim()}
            style={{
              padding: "7px 16px", borderRadius: 5,
              cursor: state.input.trim() ? "pointer" : "default",
              background: state.input.trim() ? "#c8881a" : "#e0d8cc",
              color: state.input.trim() ? "#fff" : "#aaa",
              border: "none", fontSize: 13, fontWeight: 600,
            }}
          >
            Check
          </button>
        )}
      </div>
      {state.checked && !correct && (
        <div style={{ fontSize: 13, color: "#4a7a5a" }}>
          Correct answer: <strong>{q.answer}</strong>
          {q.alternates?.length ? ` (also: ${q.alternates.join(", ")})` : ""}
        </div>
      )}
    </div>
  );
}

// ---- Matching ----

function MatchBody({ q, state, onChange }: {
  q: Extract<QuizQuestion, { kind: "matching" }>;
  state: MatchState;
  onChange: (s: MatchState) => void;
}) {
  const n = q.pairs.length;
  const allPaired = Object.keys(state.pairs).length === n;

  function clickLeft(l: number) {
    if (state.checked) return;
    onChange({ ...state, active: state.active === l ? null : l });
  }

  function clickRight(visPos: number) {
    if (state.checked || state.active === null) return;
    const l = state.active;
    const newPairs = { ...state.pairs };
    // Remove any other left that was paired to this visPos
    for (const k of Object.keys(newPairs)) {
      if (newPairs[Number(k)] === visPos) delete newPairs[Number(k)];
    }
    newPairs[l] = visPos;
    onChange({ ...state, active: null, pairs: newPairs });
  }

  // Build reverse map: visPos → leftIdx
  const visToLeft: Record<number, number> = {};
  for (const [l, v] of Object.entries(state.pairs)) visToLeft[v] = Number(l);

  const correctCount = state.checked
    ? [...Array(n).keys()].filter(l => state.pairs[l] !== undefined && state.rightOrder[state.pairs[l]] === l).length
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#888" }}>
        {state.checked ? `${correctCount} / ${n} pairs correct.` : "Click a left item, then its match on the right."}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {q.pairs.map((pair, l) => {
            const visPos = state.pairs[l];
            const isPaired = visPos !== undefined;
            const isActive = state.active === l;
            const pairCorrect = state.checked && isPaired && state.rightOrder[visPos] === l;
            const pairWrong = state.checked && isPaired && state.rightOrder[visPos] !== l;
            const color = PAIR_COLORS[l % PAIR_COLORS.length];
            return (
              <button
                key={l}
                onClick={() => clickLeft(l)}
                disabled={state.checked}
                style={{
                  textAlign: "left", padding: "7px 10px", borderRadius: 5, fontSize: 13,
                  cursor: state.checked ? "default" : "pointer",
                  background: pairCorrect ? "#e8f5ee" : pairWrong ? "#fde8eb" : isActive ? "#fff3e0" : "#faf8f4",
                  border: pairCorrect ? "1px solid #4a7a5a" : pairWrong ? "1px solid #b56474"
                    : isActive ? `2px solid #c8881a` : isPaired ? `1px solid ${color}` : "1px solid #ddd0c0",
                  color: pairCorrect ? "#1a4a2a" : pairWrong ? "#6a1020" : "#2a2010",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {isPaired && !state.checked && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                )}
                {pair.left}
              </button>
            );
          })}
        </div>
        {/* Right column (shuffled) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {state.rightOrder.map((pairIdx, visPos) => {
            const pairedLeft = visToLeft[visPos];
            const isPaired = pairedLeft !== undefined;
            const pairCorrect = state.checked && isPaired && state.rightOrder[visPos] === pairedLeft;
            const pairWrong = state.checked && isPaired && !pairCorrect;
            const color = isPaired ? PAIR_COLORS[pairedLeft % PAIR_COLORS.length] : "#ddd0c0";
            const canClick = !state.checked && state.active !== null;
            return (
              <button
                key={visPos}
                onClick={() => clickRight(visPos)}
                disabled={state.checked || !canClick}
                style={{
                  textAlign: "left", padding: "7px 10px", borderRadius: 5, fontSize: 13,
                  cursor: state.checked ? "default" : canClick ? "pointer" : "default",
                  background: pairCorrect ? "#e8f5ee" : pairWrong ? "#fde8eb" : "#faf8f4",
                  border: pairCorrect ? "1px solid #4a7a5a" : pairWrong ? "1px solid #b56474"
                    : canClick ? "1px dashed #c8881a" : isPaired ? `1px solid ${color}` : "1px solid #ddd0c0",
                  color: pairCorrect ? "#1a4a2a" : pairWrong ? "#6a1020" : "#2a2010",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {isPaired && !state.checked && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                )}
                {q.pairs[pairIdx].right}
              </button>
            );
          })}
        </div>
      </div>
      {!state.checked && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onChange({ ...state, checked: true })}
            disabled={!allPaired}
            style={{
              padding: "6px 16px", borderRadius: 5,
              cursor: allPaired ? "pointer" : "default",
              background: allPaired ? "#c8881a" : "#e0d8cc",
              color: allPaired ? "#fff" : "#aaa",
              border: "none", fontSize: 13, fontWeight: 600,
            }}
          >
            Check Answers
          </button>
          {Object.keys(state.pairs).length > 0 && (
            <button
              onClick={() => onChange({ ...state, active: null, pairs: {} })}
              style={{ padding: "6px 12px", borderRadius: 5, cursor: "pointer", background: "#f5f0e8", color: "#666", border: "1px solid #ddd0c0", fontSize: 13 }}
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
