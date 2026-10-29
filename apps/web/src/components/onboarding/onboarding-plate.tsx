"use client";

/**
 * Deep-pine side plate for onboarding. The top row is the learner's profile,
 * one card per question reached; the stage below pairs an illustration with
 * what the current answer changes (goal placement, syllabus routing, tutor
 * voice, first-course status). Purely illustrative, so it is aria-hidden.
 */
import Image from "next/image";
import { useEffect, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePrefersReducedMotion } from "@/components/landing/landing-walkthrough";
import type { EducationCurriculum, EducationStage, TutorStyle } from "@/lib/learner-profile/types";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/client";

export type GoalMode = "subject" | "topic";
export type DoneState = keyof I18nDictionary["onboarding"]["done"]["states"];
export type PlateStep = "goal" | "facts" | "style" | "done";

export const TUTOR_PORTRAITS: Record<TutorStyle, string> = {
  socratic: "/onboarding/tutors/socratic.webp",
  feynman: "/onboarding/tutors/feynman.webp",
  euclid: "/onboarding/tutors/euclid.webp",
};

const ILLUSTRATIONS = {
  goal: "/onboarding/illustrations/goal.svg",
  facts: "/onboarding/illustrations/start.svg",
  done: "/onboarding/illustrations/done.svg",
};

const STEP_INDEX: Record<PlateStep, number> = { goal: 0, facts: 1, style: 2, done: 3 };
const GOAL_MODE_INTERVAL_MS = 4200;

type OnboardingPlateProps = {
  step: PlateStep;
  goal: { text: string; skipped: boolean; status: string | null; typing: boolean };
  start: { stage: EducationStage | null; curriculum: EducationCurriculum | null; options: readonly EducationCurriculum[]; note: string };
  style: TutorStyle;
  doneState: DoneState;
  courseName: string;
  goalMode: GoalMode;
  setGoalMode: Dispatch<SetStateAction<GoalMode>>;
  goalModeLocked: boolean;
};

export function OnboardingPlate(props: OnboardingPlateProps) {
  const t = useT();
  const plate = t.onboarding.plate;
  const reached = STEP_INDEX[props.step];
  const cardState = (index: number) => (index < reached ? "done" : index === reached ? "now" : "todo");
  const { goal, start, style } = props;

  const cards = [
    {
      id: "goal",
      label: plate.cards.goal,
      value: goal.skipped ? null : goal.text.trim() || null,
      empty: goal.skipped ? plate.skipped : plate.waiting,
      meta: !goal.skipped && reached > 0 ? goal.status : null,
      metaTone: "pine",
    },
    {
      id: "start",
      label: plate.cards.start,
      value: start.stage
        ? [t.onboarding.stages[start.stage], start.curriculum ? t.onboarding.curricula[start.curriculum] : null].filter(Boolean).join(" · ")
        : null,
      empty: plate.waiting,
      meta: start.note.trim() ? plate.note : null,
      metaTone: "muted",
    },
    {
      id: "style",
      label: plate.cards.style,
      value: t.onboarding.styles[style].title,
      empty: plate.waiting,
      meta: t.onboarding.styles[style].meta,
      metaTone: "muted",
    },
  ].slice(0, Math.min(reached, 2) + 1);

  return (
    <aside className="onboarding-plate-wrap" aria-hidden="true">
      <div className="onboarding-plate">
        <div className="onboarding-plate-head">
          <span className="onboarding-kicker">{plate.kicker}</span>
          <span>{plate.saved}</span>
        </div>
        <div className="onboarding-spine">
          {cards.map((card, index) => (
            <article key={card.id} className="onboarding-card" data-state={cardState(index)}>
              <div className="onboarding-card-head">
                <span>{`0${index + 1}`}</span>
                {card.label}
                {cardState(index) === "done" ? (
                  <i>
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                  </i>
                ) : null}
              </div>
              {card.value ? (
                <p className="onboarding-card-value">
                  {card.value}
                  {card.id === "goal" && goal.typing ? <span className="onboarding-caret" /> : null}
                </p>
              ) : (
                <p className="onboarding-card-empty">{card.empty}</p>
              )}
              {card.meta ? <p className="onboarding-card-meta" data-tone={card.metaTone}>{card.meta}</p> : null}
            </article>
          ))}
        </div>
        <section className="onboarding-stage">
          {props.step === "goal" ? <GoalStage {...props} /> : null}
          {props.step === "facts" ? <FactsStage start={start} /> : null}
          {props.step === "style" ? <StyleStage style={style} /> : null}
          {props.step === "done" ? <DoneStage doneState={props.doneState} courseName={props.courseName} /> : null}
        </section>
      </div>
    </aside>
  );
}

function Figure({ src, caption, portrait = false }: { src: string; caption?: string; portrait?: boolean }) {
  return (
    <figure className="onboarding-figure" data-portrait={portrait || undefined}>
      <Image src={src} alt="" fill sizes="320px" unoptimized />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function StageHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="onboarding-stage-head">
      <span className="onboarding-kicker">{kicker}</span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

/* ---------- 01 · how a goal is placed ---------- */

/* Functions, Limits, Continuity, Derivatives, Product rule, Chain rule, Optimization, Integrals, Substitution */
const GRAPH_NODES = [
  [150, 56], [74, 136], [226, 136], [150, 216], [40, 296], [172, 296], [40, 376], [296, 296], [240, 376],
] as const;
const GRAPH_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [3, 7], [4, 6], [7, 8], [5, 8]] as const;
/** The chain rule's prerequisite closure, in study order. */
const CHAIN_RULE_PATH = [0, 1, 2, 3, 5];
const CHAIN_RULE = 5;

function edgePath(from: number, to: number) {
  const [x1, y1] = GRAPH_NODES[from];
  const [x2, y2] = GRAPH_NODES[to];
  const midY = (y1 + y2) / 2;
  return `M${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function GoalStage({ goalMode: mode, setGoalMode, goalModeLocked }: OnboardingPlateProps) {
  const t = useT();
  const copy = t.onboarding.plate.goalStage;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || goalModeLocked) return;
    const timer = window.setInterval(() => setGoalMode((current) => (current === "subject" ? "topic" : "subject")), GOAL_MODE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [goalModeLocked, reduced, setGoalMode]);

  const lit = (index: number) => mode === "subject" || CHAIN_RULE_PATH.includes(index);
  const order = (index: number) => (mode === "subject" ? index + 1 : CHAIN_RULE_PATH.indexOf(index) + 1);
  const [startX, startY] = GRAPH_NODES[0];
  const flagWidth = Math.max(86, copy.startsHere.length * 7 + 26);

  return (
    <>
      <Figure src={ILLUSTRATIONS.goal} caption={t.onboarding.plate.figures.goal} />
      <div className="onboarding-stage-main">
        <StageHead kicker={copy.kicker} title={copy.title}>
          <div className="onboarding-seg">
            <span data-on={mode === "subject"}>{copy.subject}</span>
            <span data-on={mode === "topic"}>{copy.topic}</span>
          </div>
        </StageHead>
        <p className="onboarding-goal-example">
          <span>{copy.example}</span>“{mode === "subject" ? copy.subjectGoal : copy.topicGoal}”
        </p>
        <div className="onboarding-stage-body">
          <svg className="onboarding-graph" viewBox="-20 20 400 380">
            {GRAPH_EDGES.map(([from, to]) => (
              <path key={`${from}-${to}`} className="onboarding-graph-edge" data-lit={lit(from) && lit(to)} d={edgePath(from, to)} />
            ))}
            {GRAPH_NODES.map(([x, y], index) => (
              <g key={copy.concepts[index]} className="onboarding-graph-node" data-lit={lit(index)} data-goal={mode === "topic" && index === CHAIN_RULE}>
                <circle className="onboarding-graph-ring" cx={x} cy={y} r={19} />
                <circle className="onboarding-graph-dot" cx={x} cy={y} r={11} />
                <text className="onboarding-graph-order" x={x} y={y + 3.5} textAnchor="middle">{order(index)}</text>
                <text className="onboarding-graph-label" x={x + 18} y={y + 4.5}>{copy.concepts[index]}</text>
              </g>
            ))}
            <g className="onboarding-graph-flag">
              <rect x={startX - flagWidth - 20} y={startY - 12} width={flagWidth} height={24} rx={7} />
              <path d={`M${startX - 20.5} ${startY - 5}l6 5-6 5z`} />
              <text x={startX - 20 - flagWidth / 2} y={startY + 4} textAnchor="middle">{copy.startsHere}</text>
            </g>
          </svg>
        </div>
        <p className="onboarding-stage-foot">{mode === "subject" ? copy.subjectFoot : copy.topicFoot}</p>
      </div>
    </>
  );
}

/* ---------- 02 · one topic, several syllabi ---------- */

const ROUTE_HEIGHT = 236;
const ROUTE_NODE_HEIGHT = 36;
const ROUTE_GAP = 12;

function FactsStage({ start }: { start: OnboardingPlateProps["start"] }) {
  const t = useT();
  const copy = t.onboarding.plate.factsStage;
  const count = start.options.length;
  const total = count * ROUTE_NODE_HEIGHT + Math.max(0, count - 1) * ROUTE_GAP;
  const top = (ROUTE_HEIGHT - total) / 2;
  return (
    <>
      <Figure src={ILLUSTRATIONS.facts} caption={t.onboarding.plate.figures.facts} />
      <div className="onboarding-stage-main">
        <StageHead kicker={copy.kicker} title={copy.title} />
        <div className="onboarding-stage-body">
          <div className="onboarding-routes">
            <svg viewBox={`0 0 100 ${ROUTE_HEIGHT}`} preserveAspectRatio="none">
              {start.options.map((option, index) => {
                const y = top + index * (ROUTE_NODE_HEIGHT + ROUTE_GAP) + ROUTE_NODE_HEIGHT / 2;
                return (
                  <path
                    key={option}
                    data-on={start.curriculum === option}
                    d={`M36 ${ROUTE_HEIGHT / 2} C 46 ${ROUTE_HEIGHT / 2}, 46 ${y}, 54 ${y}`}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            <div className="onboarding-route-from">
              <span>{copy.topicLabel}</span>
              <strong>{copy.topic}</strong>
            </div>
            {count ? (
              <div className="onboarding-route-to">
                {start.options.map((option) => (
                  <div key={option} className="onboarding-route-node" data-on={start.curriculum === option}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                    {t.onboarding.curricula[option]}
                  </div>
                ))}
              </div>
            ) : (
              <p className="onboarding-route-empty">{copy.empty}</p>
            )}
          </div>
          {start.note.trim() ? <p className="onboarding-note-quote">{start.note.trim()}</p> : null}
        </div>
        <p className="onboarding-stage-foot">{copy.foot}</p>
      </div>
    </>
  );
}

/* ---------- 03 · the tutor's voice ---------- */

function StyleStage({ style }: { style: TutorStyle }) {
  const t = useT();
  const copy = t.onboarding.plate.styleStage;
  const persona = t.onboarding.styles[style];
  return (
    <>
      <Figure src={TUTOR_PORTRAITS[style]} portrait />
      <div className="onboarding-stage-main">
        <StageHead kicker={copy.kicker} title={persona.title}>
          <p className="onboarding-persona">{persona.person}</p>
        </StageHead>
        <div className="onboarding-stage-body">
          <div className="onboarding-chat">
            <p data-role="learner">{copy.question}</p>
            <p data-role="tutor" key={style}>{copy.replies[style]}</p>
          </div>
        </div>
        <p className="onboarding-stage-foot">{copy.foot}</p>
      </div>
    </>
  );
}

/* ---------- done · the first course ---------- */

const OUTLINE_WIDTHS = [62, 48, 70, 40];
const STATUS_TONE: Partial<Record<DoneState, string>> = {
  building: "preparing",
  preparingPath: "preparing",
  personalizing: "preparing",
  ready: "ready",
  failed: "failed",
};

function DoneStage({ doneState, courseName }: { doneState: DoneState; courseName: string }) {
  const t = useT();
  const state = t.onboarding.done.states[doneState];
  const showOutline = doneState !== "skipped";
  return (
    <>
      <Figure src={ILLUSTRATIONS.done} caption={t.onboarding.plate.figures.done} />
      <div className="onboarding-stage-main">
        <StageHead kicker={t.onboarding.plate.doneStage.kicker} title={state.plateTitle} />
        <div className="onboarding-stage-body">
          {showOutline ? (
            <div className="onboarding-outline" data-state={STATUS_TONE[doneState] ?? "idle"}>
              <div className="onboarding-outline-head">
                <strong>{courseName}</strong>
                <span className="onboarding-tag" data-tone={STATUS_TONE[doneState]}>{state.status}</span>
              </div>
              {OUTLINE_WIDTHS.map((width, index) => (
                <div key={width} className="onboarding-outline-lesson">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i style={{ width: `${width}%` }} />
                </div>
              ))}
            </div>
          ) : null}
          {doneState === "ready" ? (
            <p className="onboarding-ready-note">
              <b>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.5l3.2 3.2L13 5" />
                </svg>
              </b>
              {t.onboarding.done.readyNote}
            </p>
          ) : doneState === "failed" ? (
            <p className="onboarding-ready-note" data-tone="muted">{t.onboarding.done.failedNote}</p>
          ) : null}
        </div>
        <p className="onboarding-stage-foot">{state.plateFoot}</p>
      </div>
    </>
  );
}
