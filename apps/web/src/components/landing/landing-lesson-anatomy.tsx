"use client";

/**
 * A sample lesson beside the list of block types. Hovering or focusing either
 * side highlights the matching block in both, so each type is shown, not told.
 */
import { useState, type FocusEvent, type ReactNode } from "react";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";
import { PALETTE as C, accentStyle } from "@/components/landing/landing-palette";

type LandingCopy = I18nDictionary["landing"];
type SampleCopy = LandingCopy["lessonSample"];

const BLOCKS = [
  { key: "concept", accent: "var(--pine)" },
  { key: "analogy", accent: "var(--amber-ink)" },
  { key: "visual", accent: "var(--lavender-ink)" },
  { key: "code", accent: "var(--ink)" },
  { key: "challenge", accent: "var(--coral-ink)" },
  { key: "quiz", accent: C.correct },
] as const;

type BlockKey = (typeof BLOCKS)[number]["key"];

function SampleContent({ kind, copy }: { kind: BlockKey; copy: SampleCopy }): ReactNode {
  switch (kind) {
    case "concept":
      return <p className="landing-block-serif">{copy.concept}</p>;
    case "analogy":
      return <p>{copy.analogy}</p>;
    case "visual":
      return (
        <div className="landing-mini-viz">
          <svg viewBox="0 0 300 56" preserveAspectRatio="none">
            <path d="M0 54 C 50 20, 100 10, 300 8 V56 H0Z" fill={C.lavenderTint} />
            <path d="M0 54 C 50 20, 100 10, 300 8" fill="none" stroke={C.lavender} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <line x1={138} y1={0} x2={138} y2={56} stroke={C.lavender} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="landing-mini-slider">
            <span>CO₂ · 400 ppm</span>
            <span className="landing-mini-track" />
          </div>
        </div>
      );
    case "code":
      return (
        <>
          <pre className="landing-block-code">
            <span className="landing-code-kw">def</span>{" "}<span className="landing-code-fn">o2_rate</span>{"(light, co2):\n    "}
            <span className="landing-code-kw">return</span>{" "}<span className="landing-code-nb">min</span>{"(0.03 * light, 0.06 * co2)\n\no2_rate(1200, 400)  "}
            <span className="landing-code-cm">{copy.codeComment}</span>
          </pre>
          <div className="landing-block-run">
            <b>
              <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 1v8l7-4z" fill="currentColor" /></svg>
              {copy.run}
            </b>
            <span>→ 24.0</span>
          </div>
        </>
      );
    case "challenge":
      return <p>{copy.challenge}</p>;
    case "quiz":
      return (
        <>
          <p>{copy.quizQuestion}</p>
          <div className="landing-quiz-options">
            <span className="landing-quiz-option" data-correct="true">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              RuBP
            </span>
            <span className="landing-quiz-option">{copy.quizDistractor}</span>
            <span className="landing-quiz-option">O₂</span>
          </div>
        </>
      );
  }
}

export function LandingLessonAnatomy({ copy }: { copy: LandingCopy }) {
  const [highlight, setHighlight] = useState<BlockKey | null>(null);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHighlight(null);
  };

  return (
    <div className="landing-anatomy" data-focus={highlight ? "true" : "false"} onPointerLeave={() => setHighlight(null)} onBlur={onBlur}>
      <div className="landing-lesson-sample" aria-hidden="true">
        <div className="landing-lesson-sample-head">
          <strong>{copy.lessonSample.title}</strong>
          <span>{copy.lessonSample.count}</span>
        </div>
        {BLOCKS.map((block, index) => (
          <div
            key={block.key}
            className="landing-block"
            data-highlight={highlight === block.key ? "true" : "false"}
            style={accentStyle(block.accent)}
            onPointerEnter={() => setHighlight(block.key)}
          >
            <span className="landing-block-tag">{copy.lessonBlocks[index].title}</span>
            <SampleContent kind={block.key} copy={copy.lessonSample} />
          </div>
        ))}
      </div>
      <ol className="landing-block-list">
        {BLOCKS.map((block, index) => {
          const item = copy.lessonBlocks[index];
          return (
            <li key={block.key} data-highlight={highlight === block.key ? "true" : "false"} style={accentStyle(block.accent)}>
              <button
                type="button"
                onClick={() => setHighlight(block.key)}
                onPointerEnter={() => setHighlight(block.key)}
                onFocus={() => setHighlight(block.key)}
              >
                <span className="landing-block-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>
                  <span>{item.title}</span>
                  <em>{item.tag}</em>
                </strong>
                <span className="landing-block-desc">{item.desc}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
