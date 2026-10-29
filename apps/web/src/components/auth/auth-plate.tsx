"use client";

/**
 * Deep-pine side plate for the auth pages. Sign-in (and password recovery)
 * shows what an account holds — a position on a concept path, mastery, and a
 * tutor thread; sign-up previews the three onboarding questions and the first
 * course they lead to. Purely illustrative, so the whole plate is aria-hidden.
 */
import { useEffect, useState } from "react";
import { ArrowIcon } from "@/components/arrow-icon";
import { PALETTE as C } from "@/components/landing/landing-palette";
import { usePrefersReducedMotion } from "@/components/landing/landing-walkthrough";
import { msg, useT } from "@/lib/i18n/client";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";

type PlateCopy = I18nDictionary["auth"]["plate"];

export function AuthPlate({ variant }: { variant: "sign-in" | "sign-up" }) {
  const t = useT();
  const copy = variant === "sign-up" ? t.auth.plate.signUp : t.auth.plate.signIn;
  return (
    <aside className="auth-plate-wrap" aria-hidden="true">
      <div className="auth-plate">
        <div className="auth-plate-head">
          <span className="auth-kicker">{copy.kicker}</span>
          <h2>{copy.title}</h2>
        </div>
        {variant === "sign-up" ? <SignUpSteps copy={t.auth.plate.signUp} /> : <SavedRecord copy={t.auth.plate.signIn} />}
      </div>
    </aside>
  );
}

/* ---------- Sign-in: the saved course path ---------- */

const PATH_NODES = [
  { x: 52, y: 136 },
  { x: 214, y: 92 },
  { x: 380, y: 128 },
  { x: 548, y: 86 },
  { x: 690, y: 118 },
] as const;
const FAINT_NODES = [[120, 40], [300, 34], [470, 182], [612, 178], [452, 26]] as const;
const FAINT_EDGES = "M52 136L120 40M214 92L120 40M214 92L300 34M380 128L470 182M548 86L452 26M548 86L612 178M690 118L612 178";
const CURRENT = 2;
const GOAL = PATH_NODES.length - 1;

function curve(from: { x: number; y: number }, to: { x: number; y: number }) {
  const mid = (from.x + to.x) / 2;
  return `C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`;
}
const DONE_PATH = `M${PATH_NODES[0].x} ${PATH_NODES[0].y} ${curve(PATH_NODES[0], PATH_NODES[1])} ${curve(PATH_NODES[1], PATH_NODES[2])}`;
const AHEAD_PATH = `M${PATH_NODES[2].x} ${PATH_NODES[2].y} ${curve(PATH_NODES[2], PATH_NODES[3])} ${curve(PATH_NODES[3], PATH_NODES[4])}`;

/** Last first-attempt answers per concept; mastery needs 3+ answers and 80% of the last five. */
const MASTERY_ANSWERS = [
  [true, true, false, true, true],
  [true, false, true, true, true],
  [true, false, true],
];
const LESSON_STEPS = 7;
const LESSON_STEP = 3;

function SavedRecord({ copy }: { copy: PlateCopy["signIn"] }) {
  const now = PATH_NODES[CURRENT];
  const goal = PATH_NODES[GOAL];
  const flagWidth = Math.max(112, copy.stoppedHere.length * 7.4 + 24);
  return (
    <div className="auth-plate-body">
      <article className="auth-course">
        <div className="auth-course-head">
          <span>{copy.courseLabel}</span>
          <strong>{copy.courseName}</strong>
          <span className="auth-course-example">{copy.example}</span>
        </div>
        <svg viewBox="0 0 744 214">
          <path d={FAINT_EDGES} stroke={C.lineSoft} strokeWidth={1} fill="none" />
          {FAINT_NODES.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={C.lineSoft} />
          ))}
          <path d={AHEAD_PATH} stroke={C.quiet} strokeWidth={1.5} strokeDasharray="4 6" fill="none" />
          <path className="auth-path-done" d={DONE_PATH} stroke={C.pine} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          {PATH_NODES.slice(0, CURRENT).map((node) => (
            <g key={node.x}>
              <circle cx={node.x} cy={node.y} r={11} fill={C.pine} />
              <path d={`M${node.x - 4.5} ${node.y}l3 3 6-6.5`} stroke={C.paper} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          ))}
          <circle className="auth-path-pulse" cx={now.x} cy={now.y} r={13} fill={C.amber} opacity={0.35} />
          <circle cx={now.x} cy={now.y} r={12} fill={C.panel} stroke={C.amber} strokeWidth={2.5} />
          <circle cx={now.x} cy={now.y} r={4.5} fill={C.amber} />
          <circle cx={PATH_NODES[3].x} cy={PATH_NODES[3].y} r={10} fill={C.panel} stroke={C.quiet} strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={goal.x} cy={goal.y} r={22} fill="none" stroke={C.pine} strokeWidth={1.2} opacity={0.28} />
          <circle cx={goal.x} cy={goal.y} r={14} fill={C.panel} stroke={C.pine} strokeWidth={2} />
          <circle cx={goal.x} cy={goal.y} r={5} fill={C.pine} />
          {copy.concepts.map((concept, index) => {
            const node = PATH_NODES[index];
            const tone = index === CURRENT ? "now" : index === GOAL ? "goal" : index > CURRENT ? "next" : "done";
            return (
              <text key={concept} x={node.x} y={node.y + (index === GOAL ? 42 : 34)} textAnchor="middle" className="auth-svg-label" data-tone={tone}>
                {concept}
              </text>
            );
          })}
          <rect x={now.x - flagWidth / 2} y={now.y - 62} width={flagWidth} height={28} rx={8} fill={C.ink} />
          <path d={`M${now.x - 6} ${now.y - 34.5}l6 7 6-7z`} fill={C.ink} />
          <text x={now.x} y={now.y - 43.5} textAnchor="middle" className="auth-svg-flag">{copy.stoppedHere}</text>
          <text x={goal.x} y={goal.y - 32} textAnchor="middle" className="auth-svg-mono">{copy.goal}</text>
        </svg>
        <div className="auth-resume">
          <div className="auth-resume-title">
            <span>{copy.lesson}</span>
            <strong>{copy.concepts[CURRENT]}</strong>
          </div>
          <div className="auth-resume-steps">
            <div className="auth-step-bars">
              {Array.from({ length: LESSON_STEPS }, (_, index) => (
                <i key={index} data-state={index < LESSON_STEP - 1 ? "done" : index === LESSON_STEP - 1 ? "now" : undefined} />
              ))}
            </div>
            <span>{copy.step}</span>
          </div>
          <span className="auth-resume-go">
            {copy.resume}
            <ArrowIcon size={13} />
          </span>
        </div>
      </article>
      <div className="auth-saved">
        <article className="auth-mini">
          <div className="auth-mini-head">
            <span>{copy.masteryTitle}</span>
            <span>{copy.masteryWindow}</span>
          </div>
          <div>
            {MASTERY_ANSWERS.map((answers, index) => {
              const mastered = answers.length >= 3 && answers.slice(-5).filter(Boolean).length / Math.min(answers.length, 5) >= 0.8;
              return (
                <div key={copy.concepts[index]} className="auth-mastery-row">
                  <span>{copy.concepts[index]}</span>
                  <span className="auth-answers">
                    {Array.from({ length: 5 }, (_, slot) => (
                      <i key={slot} data-answer={slot < answers.length ? String(answers[slot]) : undefined} />
                    ))}
                  </span>
                  <span className="auth-tag" data-tone={mastered ? "ready" : "preparing"}>{mastered ? copy.mastered : copy.learning}</span>
                </div>
              );
            })}
          </div>
        </article>
        <article className="auth-mini">
          <div className="auth-mini-head">
            <span>{copy.threadTitle}</span>
            <span>{copy.lesson}</span>
          </div>
          <div className="auth-thread">
            <p data-role="learner">{copy.question}</p>
            <p data-role="tutor">{copy.answer}</p>
          </div>
        </article>
      </div>
    </div>
  );
}

/* ---------- Sign-up: the three onboarding questions, played in turn ---------- */

type Phase = { active: number; typed: number; stage: boolean; curriculum: boolean; style: boolean };

const FINAL_PHASE = (goalLength: number): Phase => ({ active: -1, typed: goalLength, stage: true, curriculum: true, style: true });
const LESSON_TONES = ["ready", "preparing", "planned", "planned"] as const;

function useOnboardingPreview(goal: string, reduced: boolean) {
  const chars = Array.from(goal);
  const [phase, setPhase] = useState<Phase>(() => FINAL_PHASE(chars.length));
  const [run, setRun] = useState(0);
  const total = chars.length;
  const charDelay = /[㐀-鿿]/.test(goal) ? 95 : 42;

  useEffect(() => {
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, next: Partial<Phase>) => timers.push(setTimeout(() => setPhase((current) => ({ ...current, ...next })), ms));
    at(0, { active: 0, typed: 0, stage: false, curriculum: false, style: false });
    for (let index = 1; index <= total; index += 1) at(500 + index * charDelay, { typed: index });
    const typed = 500 + total * charDelay;
    at(typed + 900, { active: 1 });
    at(typed + 1600, { stage: true });
    at(typed + 2300, { curriculum: true });
    at(typed + 3300, { active: 2 });
    at(typed + 4000, { style: true });
    at(typed + 5100, { active: 3 });
    timers.push(setTimeout(() => setRun((value) => value + 1), typed + 9200));
    return () => timers.forEach(clearTimeout);
  }, [charDelay, reduced, run, total]);

  return reduced ? FINAL_PHASE(total) : phase;
}

function SignUpSteps({ copy }: { copy: PlateCopy["signUp"] }) {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const phase = useOnboardingPreview(copy.goalExample, reduced);
  const goalChars = Array.from(copy.goalExample);
  const typing = phase.active === 0;
  const stages = [t.onboarding.stages.high_school, t.onboarding.stages.undergraduate, t.onboarding.stages.professional];
  const curricula = [t.onboarding.curricula.cambridge_international_a_level, t.onboarding.curricula.singapore_h2, t.onboarding.curricula.self_directed];
  const styles = [t.onboarding.styles.socratic, t.onboarding.styles.feynman, t.onboarding.styles.euclid];
  const lessonTags = { ready: copy.ready, preparing: copy.preparing, planned: copy.planned };

  return (
    <div className="auth-plate-body">
      <div className="auth-steps">
        <article className="auth-step" data-active={phase.active === 0}>
          <div className="auth-step-head"><span>01</span><strong>{copy.goalStep}</strong></div>
          <div className="auth-step-body">
            <div className="auth-composer" data-ready={phase.typed === goalChars.length}>
              <p>
                {goalChars.slice(0, phase.typed).join("")}
                {typing ? <span className="auth-caret" /> : null}
              </p>
              <span className="auth-composer-send"><ArrowIcon size={12} /></span>
            </div>
          </div>
          <div className="auth-step-note">{copy.goalNote}</div>
        </article>
        <article className="auth-step" data-active={phase.active === 1}>
          <div className="auth-step-head"><span>02</span><strong>{copy.startStep}</strong></div>
          <div className="auth-step-body">
            <ChipGroup label={copy.stageLabel} options={stages} selected={phase.stage} />
            <ChipGroup label={copy.curriculumLabel} options={curricula} selected={phase.curriculum} />
          </div>
          <div className="auth-step-note">{copy.startNote}</div>
        </article>
        <article className="auth-step" data-active={phase.active === 2}>
          <div className="auth-step-head"><span>03</span><strong>{copy.styleStep}</strong></div>
          <div className="auth-step-body">
            <div className="auth-styles">
              {styles.map((style, index) => (
                <div key={style.title} className="auth-style" data-selected={phase.style && index === 1}>
                  <i />
                  <b>{style.title}</b>
                  <small>{style.meta}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="auth-step-note">{copy.styleNote}</div>
        </article>
      </div>
      <div className="auth-outcome" data-active={phase.active === 3}>
        <div className="auth-outcome-copy">
          <span className="auth-kicker">{copy.thenKicker}</span>
          <strong>{copy.thenTitle}</strong>
        </div>
        <div className="auth-outline">
          <div className="auth-outline-head">
            <span>{t.auth.plate.signIn.courseName}</span>
            <span>{msg(copy.lessonCount, { count: copy.lessons.length })}</span>
          </div>
          {copy.lessons.map((lesson, index) => (
            <div key={lesson} className="auth-outline-lesson" data-tone={LESSON_TONES[index]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{lesson}</span>
              <span className="auth-tag" data-tone={LESSON_TONES[index]}>{lessonTags[LESSON_TONES[index]]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipGroup({ label, options, selected }: { label: string; options: string[]; selected: boolean }) {
  return (
    <div className="auth-chip-group">
      <span>{label}</span>
      <div>
        {options.map((option, index) => (
          <span key={option} className="auth-chip" data-selected={selected && index === 0}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8.5l3.2 3.2L13 5" />
            </svg>
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}
