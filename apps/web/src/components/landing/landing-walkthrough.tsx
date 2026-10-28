"use client";

/**
 * Hero walkthrough: one learning loop in five scenes (goal → graph position →
 * course path → interactive visual → mastery feedback). Scenes autoplay like
 * video chapters; hover, focus, or the pause button holds the current one, and
 * dragging the light-response chart hands control to the visitor.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";
import { PALETTE as C, accentStyle, isCjk } from "@/components/landing/landing-palette";

type LandingCopy = I18nDictionary["landing"];
type WalkthroughCopy = LandingCopy["walkthrough"];
type StageId = LandingCopy["flowStages"][number]["id"];

/** Autoplay dwell per scene; the visual scene runs longer so its sweep can finish. */
const STAGE_SECONDS: Record<StageId, number> = { goal: 7, kg: 6.5, lesson: 6.5, visual: 8.5, feedback: 6.5 };
const STAGE_ACCENTS: Record<StageId, string> = {
  goal: "var(--amber-ink)",
  kg: "var(--pine)",
  lesson: "var(--coral-ink)",
  visual: "var(--lavender-ink)",
  feedback: C.correct,
};
const VIEWBOX = "0 0 800 340";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

function Label({ x, y, children, anchor, mono, size, fill, weight }: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  size?: number;
  fill?: string;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={mono ? "landing-svg-mono" : "landing-svg-text"}
      style={{ fontSize: size, fill, fontWeight: weight }}
    >
      {children}
    </text>
  );
}

function Check({ x, y, color, size = 1 }: { x: number; y: number; color: string; size?: number }) {
  return (
    <path
      d={`M${x - 6 * size} ${y}l${4 * size} ${4 * size} ${8 * size}-${8 * size}`}
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/* ---------- 01 Goal ---------- */

const GOAL_TEXT_X = 62;

function GoalScene({ copy, typing, reducedMotion }: { copy: WalkthroughCopy; typing: boolean; reducedMotion: boolean }) {
  const full = copy.goalText;
  const [count, setCount] = useState(typing ? 0 : full.length);
  const textRef = useRef<SVGTextElement>(null);
  const caretRef = useRef<SVGRectElement>(null);
  const shown = reducedMotion ? full : full.slice(0, count);

  useEffect(() => {
    if (!typing || reducedMotion) return;
    let typed = 0;
    const timer = window.setInterval(() => {
      typed += 1;
      setCount(typed);
      if (typed >= full.length) window.clearInterval(timer);
    }, isCjk(full) ? 90 : 48);
    return () => window.clearInterval(timer);
  }, [full, typing, reducedMotion]);

  // The caret follows the last rendered glyph, so it never drifts away from the text.
  const placeCaret = useCallback(() => {
    const text = textRef.current;
    const width = text?.textContent ? text.getComputedTextLength() : 0;
    caretRef.current?.setAttribute("x", (GOAL_TEXT_X + width + 3).toFixed(1));
  }, []);

  useLayoutEffect(() => {
    placeCaret();
  }, [placeCaret, shown]);

  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) placeCaret();
    });
    return () => {
      live = false;
    };
  }, [placeCaret]);

  const readings = [
    { y: 100, fill: C.amberTint, stroke: C.amber },
    { y: 170, fill: C.pineTint, stroke: C.pine },
    { y: 240, fill: C.roseTint, stroke: C.coral },
  ];

  return (
    <svg viewBox={VIEWBOX} aria-hidden="true">
      <Label x={40} y={118} mono>{copy.youType}</Label>
      <rect x={31} y={133} width={418} height={74} rx={22} fill={C.amberTint} opacity={0.75} />
      <rect x={40} y={142} width={400} height={56} rx={14} fill={C.panel} stroke={C.lineStrong} strokeWidth={1.5} />
      <text ref={textRef} x={GOAL_TEXT_X} y={176} className="landing-svg-text" style={{ fontSize: 18, fill: C.ink }}>
        {shown}
      </text>
      <rect ref={caretRef} className="landing-caret" x={GOAL_TEXT_X + 3} y={159} width={2} height={22} rx={1} fill={C.amber} />
      <rect x={392} y={150} width={40} height={40} rx={10} fill={C.pine} />
      <path d="M404 170h16M414 164l6 6-6 6" fill="none" stroke={C.paper} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Label x={560} y={58} mono>{copy.readingGoal}</Label>
      <g className="landing-flow-dash" fill="none" stroke={C.lineStrong} strokeWidth={1.5} strokeDasharray="4 5">
        <path d="M440 170 C 500 170, 506 104, 556 100" />
        <path d="M440 170 H 556" />
        <path d="M440 170 C 500 170, 506 236, 556 240" />
      </g>
      {copy.goalReadings.map((reading, index) => {
        const style = readings[index];
        return (
          <g key={reading.label} className="landing-reveal" style={{ animationDelay: `${0.15 * (index + 1)}s` }}>
            <circle cx={568} cy={style.y} r={12} fill={style.fill} stroke={style.stroke} strokeWidth={2} />
            <Label x={592} y={style.y - 7} mono>{reading.label}</Label>
            <Label x={592} y={style.y + 13} size={15} fill={C.ink}>{reading.value}</Label>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 02 Locate ---------- */

function LocateScene({ copy }: { copy: WalkthroughCopy }) {
  const entryLines = copy.entryConcept.split(" ");
  const entryTop = 196 - (entryLines.length - 1) * 8.5;
  const ahead = [
    { x: 480, y: 120, near: true },
    { x: 480, y: 260, near: true },
    { x: 600, y: 120, near: false },
    { x: 600, y: 260, near: false },
  ];

  return (
    <svg viewBox={VIEWBOX} aria-hidden="true">
      <Label x={100} y={48} anchor="middle" mono>{copy.mastered}</Label>
      <Label x={300} y={48} anchor="middle" mono fill={C.amberInk}>{copy.start}</Label>
      <Label x={540} y={48} anchor="middle" mono>{copy.ahead}</Label>
      <Label x={720} y={48} anchor="middle" mono>{copy.goal}</Label>
      <g fill="none" strokeWidth={1.5}>
        <path d="M115 136 C 190 150, 230 170, 262 180" stroke={C.lineStrong} />
        <path d="M115 244 C 190 230, 230 208, 262 200" stroke={C.lineStrong} />
        <path className="landing-draw" style={{ animationDelay: "0.2s" }} d="M336 178 C 400 150, 430 124, 467 121" stroke={C.pine} strokeWidth={2} />
        <path className="landing-draw" style={{ animationDelay: "0.3s" }} d="M336 202 C 400 230, 430 256, 467 259" stroke={C.pine} strokeWidth={2} />
        <g stroke={C.pineSoft} strokeDasharray="4 5">
          <path d="M493 120 H 587" />
          <path d="M493 260 H 587" />
          <path d="M612 124 C 660 140, 680 170, 701 182" />
          <path d="M612 256 C 660 240, 680 210, 701 198" />
        </g>
      </g>
      {copy.masteredConcepts.map((concept, index) => {
        const y = index === 0 ? 130 : 250;
        return (
          <g key={concept}>
            <circle cx={100} cy={y} r={15} fill={C.paperDeep} stroke={C.quiet} strokeWidth={1.5} />
            <Check x={100} y={y} color={C.muted} />
            <Label x={100} y={y + 36} anchor="middle" size={13} fill={C.muted}>{concept}</Label>
          </g>
        );
      })}
      <circle className="landing-pulse" cx={300} cy={190} r={40} fill="none" stroke={C.pine} strokeWidth={2} />
      <circle cx={300} cy={190} r={40} fill={C.pine} />
      <text textAnchor="middle" className="landing-svg-text" style={{ fontSize: 14, fill: C.paper, fontWeight: 500 }}>
        {entryLines.map((line, index) => (
          <tspan key={line} x={300} y={entryTop + index * 17}>{line}</tspan>
        ))}
      </text>
      {copy.aheadConcepts.map((concept, index) => {
        const node = ahead[index];
        return (
          <g key={concept} className="landing-reveal" style={{ animationDelay: `${node.near ? 0.45 : 0.6}s` }}>
            <circle cx={node.x} cy={node.y} r={12} fill={C.panel} stroke={node.near ? C.pine : C.pineSoft} strokeWidth={2} />
            <Label x={node.x} y={node.y + 32} anchor="middle" size={13} fill={node.near ? C.ink2 : C.muted}>{concept}</Label>
          </g>
        );
      })}
      <g className="landing-reveal" style={{ animationDelay: "0.75s" }}>
        <circle cx={720} cy={190} r={20} fill={C.amberTint} stroke={C.amber} strokeWidth={2} />
        <path d="M714 199v-18l12 5-12 5" fill="none" stroke={C.amberInk} strokeWidth={1.6} strokeLinejoin="round" />
        <Label x={720} y={232} anchor="middle" size={13}>{copy.goalConcept}</Label>
      </g>
    </svg>
  );
}

/* ---------- 03 Course ---------- */

/** Lesson nodes along the generated path; labels alternate above/below to stay clear of the curve. */
const LESSON_NODES = [
  { x: 210, y: 180, labelY: 146, above: true },
  { x: 340, y: 215, labelY: 250, above: false },
  { x: 470, y: 150, labelY: 124, above: true },
  { x: 590, y: 190, labelY: 225, above: false },
  { x: 720, y: 120, labelY: 92, above: true },
];

function CourseScene({ copy }: { copy: WalkthroughCopy }) {
  const [first, ...rest] = copy.lessons;
  return (
    <svg viewBox={VIEWBOX} aria-hidden="true">
      <defs>
        <linearGradient id="landing-course-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={C.amber} />
          <stop offset="1" stopColor={C.coral} />
        </linearGradient>
      </defs>
      <Label x={40} y={48} mono>{copy.courseMeta}</Label>
      <path
        d="M210 180 C 260 180, 290 215, 340 215 S 420 150, 470 150 S 550 190, 590 190 S 680 132, 720 120"
        fill="none"
        stroke={C.lineStrong}
        strokeWidth={2}
        strokeDasharray="5 6"
      />
      <path className="landing-draw" style={{ animationDelay: "0.15s" }} d="M80 250 C 120 232, 160 180, 210 180" fill="none" stroke="url(#landing-course-gradient)" strokeWidth={4} strokeLinecap="round" />
      <circle cx={80} cy={250} r={42} fill={C.amberTint} opacity={0.8} />
      <circle cx={80} cy={250} r={25} fill={C.pine} />
      <Label x={80} y={256} anchor="middle" mono size={15} fill={C.paper}>1</Label>
      <Label x={80} y={312} anchor="middle" size={14} fill={C.ink} weight={500}>{first}</Label>
      <Label x={80} y={330} anchor="middle" mono fill={C.amberInk}>{copy.now}</Label>
      {rest.map((lesson, index) => {
        const node = LESSON_NODES[index];
        const isNext = index === 0;
        const isLast = index === rest.length - 1;
        return (
          <g key={lesson} className="landing-reveal" style={{ animationDelay: `${0.55 + index * 0.1}s` }}>
            <circle
              cx={node.x}
              cy={node.y}
              r={isNext ? 18 : isLast ? 15 : 12}
              fill={isLast ? C.amberTint : C.panel}
              stroke={isNext ? C.coral : isLast ? C.amber : C.lineStrong}
              strokeWidth={isNext ? 3 : 2}
            />
            <Label x={node.x} y={node.y + (isNext ? 5 : 4)} anchor="middle" mono size={isNext ? 13 : 11} fill={isNext ? C.coral : isLast ? C.amberInk : C.quiet}>
              {index + 2}
            </Label>
            {isNext ? <Label x={node.x} y={node.labelY - 22} anchor="middle" mono fill={C.coral}>{copy.next}</Label> : null}
            <Label x={node.x} y={node.labelY} anchor="middle" size={isNext ? 14 : 13} fill={isNext ? C.ink : C.muted}>{lesson}</Label>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 04 Visual ---------- */

const X0 = 100;
const X1 = 720;
const Y0 = 290;
const PLOT_HEIGHT = 230;
const P_SCALE = 26;
const I_MAX = 2000;
/** Light-response curve P = Pmax(1 − e^(−I/k)); past the plateau start the visual reads as CO₂-limited. */
const P_MAX = 24;
const K = 380;
const PLATEAU = 1100;

const xOf = (light: number) => X0 + (light / I_MAX) * (X1 - X0);
const yOf = (rate: number) => Y0 - (rate / P_SCALE) * PLOT_HEIGHT;
const rateAt = (light: number) => P_MAX * (1 - Math.exp(-light / K));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const CURVE_PATH = Array.from({ length: I_MAX / 20 + 1 }, (_, index) => {
  const light = index * 20;
  return `${index ? "L" : "M"}${xOf(light).toFixed(1)} ${yOf(rateAt(light)).toFixed(1)}`;
}).join(" ");
const AREA_PATH = `${CURVE_PATH} L${X1} ${Y0} L${X0} ${Y0}Z`;
const PLATEAU_X = xOf(PLATEAU);

function VisualScene({ copy, active, reducedMotion, onInteract }: {
  copy: WalkthroughCopy;
  active: boolean;
  reducedMotion: boolean;
  onInteract: () => void;
}) {
  const [light, setLight] = useState(300);
  const [touched, setTouched] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const shownLight = touched || !reducedMotion ? light : 1500;

  useEffect(() => {
    if (!active || touched || reducedMotion) return;
    const from = 150;
    const to = 1700;
    const duration = 4200;
    const start = performance.now() + 500;
    let frame = requestAnimationFrame(function tick(now) {
      const t = clamp((now - start) / duration, 0, 1);
      setLight(from + (to - from) * easeInOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, touched, reducedMotion]);

  const takeOver = () => {
    setTouched(true);
    onInteract();
  };

  const updateFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    setLight(clamp(((point.x - X0) / (X1 - X0)) * I_MAX, 0, I_MAX));
  };

  const onKnobKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const step = event.shiftKey ? 200 : 50;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = shownLight + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = shownLight - step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = I_MAX;
    if (next === null) return;
    event.preventDefault();
    takeOver();
    setLight(clamp(next, 0, I_MAX));
  };

  const x = xOf(shownLight);
  const y = yOf(rateAt(shownLight));
  const limited = shownLight >= PLATEAU;
  const sliderLabel = copy.lightIntensity.replace(/\s*→$/, "");

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      className="landing-chart"
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        takeOver();
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current) updateFromPointer(event);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <path d="M100 201.5H720M100 113H720" stroke={C.lineSoft} />
      <g className="landing-svg-mono" textAnchor="end" style={{ fontSize: 10.5 }}>
        <text x={90} y={294}>0</text>
        <text x={90} y={205}>10</text>
        <text x={90} y={117}>20</text>
      </g>
      <g className="landing-svg-mono" textAnchor="middle" style={{ fontSize: 10.5 }}>
        {[0, 500, 1000, 1500, 2000].map((tick) => (
          <text key={tick} x={xOf(tick)} y={310}>{tick}</text>
        ))}
      </g>
      <path d="M100 290H724M100 290V52" fill="none" stroke={C.quiet} strokeWidth={1.2} />
      <Label x={100} y={40} mono>{copy.oxygenOutput}</Label>
      <Label x={720} y={332} anchor="end" mono>{copy.lightIntensity}</Label>
      <path d={AREA_PATH} fill={C.lavenderTint} opacity={0.55} />
      <path d={CURVE_PATH} fill="none" stroke={C.lavender} strokeWidth={2.5} strokeLinecap="round" />
      <g className="landing-chart-limit" opacity={limited ? 1 : 0.35}>
        <line x1={PLATEAU_X} y1={64} x2={PLATEAU_X} y2={290} stroke={C.amber} strokeWidth={1.2} strokeDasharray="3 4" />
        <path d={`M${PLATEAU_X} 290H${X1}`} stroke={C.amber} strokeWidth={3.5} />
      </g>
      <text
        x={PLATEAU_X + 11}
        y={272}
        className="landing-svg-text landing-chart-limit-label"
        data-visible={limited ? "true" : "false"}
        style={{ fontSize: 14, fontWeight: 500, fill: C.amberInk }}
      >
        {copy.limitingFactor}
      </text>
      <Label x={720} y={40} anchor="end" mono fill={C.ink}>
        {`${copy.lightReadout} ${Math.round(shownLight)} · O₂ ${rateAt(shownLight).toFixed(1)} µmol·m⁻²·s⁻¹`}
      </Label>
      <line x1={x} x2={x} y1={y + 10} y2={290} stroke={C.lavender} strokeWidth={1.2} strokeDasharray="3 4" />
      <g
        className="landing-chart-knob"
        tabIndex={0}
        role="slider"
        aria-label={sliderLabel}
        aria-valuemin={0}
        aria-valuemax={I_MAX}
        aria-valuenow={Math.round(shownLight)}
        aria-valuetext={`${Math.round(shownLight)} µmol·m⁻²·s⁻¹`}
        onKeyDown={onKnobKeyDown}
      >
        <circle cx={x} cy={y} r={24} fill="transparent" />
        <circle cx={x} cy={y} r={16} fill={C.lavender} opacity={0.14} />
        <circle className="landing-chart-knob-ring" cx={x} cy={y} r={8.5} fill={C.panel} stroke={C.lavender} strokeWidth={3} />
      </g>
      <Label x={112} y={278} mono fill={C.quiet}>{copy.dragHint}</Label>
    </svg>
  );
}

/* ---------- 05 Feedback ---------- */

const QUIZ_RESULTS = [true, true, false, true];

function FeedbackScene({ copy }: { copy: WalkthroughCopy }) {
  return (
    <svg viewBox={VIEWBOX} aria-hidden="true">
      <Label x={60} y={52} mono>{copy.quizMeta}</Label>
      <text x={60} y={86} className="landing-svg-display" style={{ fontSize: 26 }}>{copy.feedbackConcept}</text>
      {QUIZ_RESULTS.map((correct, index) => {
        const x = 60 + index * 60;
        return (
          <g key={index} className="landing-reveal" style={{ animationDelay: `${0.1 * (index + 1)}s` }}>
            <rect
              x={x}
              y={112}
              width={48}
              height={48}
              rx={10}
              fill={correct ? C.correctTint : C.wrongTint}
              stroke={correct ? C.correct : C.wrong}
              strokeWidth={1.5}
            />
            {correct ? (
              <path d={`M${x + 14} 136l7 7 13-14`} fill="none" stroke={C.correct} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d={`M${x + 16} 128l16 16M${x + 32} 128l-16 16`} fill="none" stroke={C.wrong} strokeWidth={2.2} strokeLinecap="round" />
            )}
            <Label x={x + 24} y={178} anchor="middle" mono size={10.5} fill={C.quiet}>{`Q${index + 1}`}</Label>
          </g>
        );
      })}
      <rect x={60} y={230} width={480} height={10} rx={5} fill={C.paperDeep} />
      <rect className="landing-grow" x={60} y={230} width={360} height={10} rx={5} fill={C.pine} />
      <line x1={444} y1={220} x2={444} y2={250} stroke={C.amber} strokeWidth={2} />
      <Label x={444} y={212} anchor="middle" mono fill={C.amberInk}>80%</Label>
      <Label x={60} y={272} mono fill={C.ink}>{copy.feedbackScore}</Label>
      <g className="landing-flow-dash" fill="none" stroke={C.lineStrong} strokeWidth={1.5} strokeDasharray="4 5">
        <path d="M548 235 C 570 235, 572 150, 596 146" />
        <path d="M548 235 C 570 235, 572 252, 596 252" />
      </g>
      <g className="landing-reveal" style={{ animationDelay: "0.7s" }}>
        <rect x={598} y={114} width={168} height={64} rx={12} fill={C.pineTint} />
        <Label x={614} y={140} size={13.5} fill={C.ink}>{copy.ifCorrect}</Label>
        <Label x={614} y={162} mono size={12} fill={C.pine}>{copy.toMastered}</Label>
      </g>
      <g className="landing-reveal" style={{ animationDelay: "0.85s" }}>
        <rect x={598} y={220} width={168} height={64} rx={12} fill={C.roseTint} />
        <Label x={614} y={246} size={13.5} fill={C.ink}>{copy.ifMiss}</Label>
        <Label x={614} y={268} mono size={12} fill={C.roseInk}>{copy.toRemedial}</Label>
      </g>
    </svg>
  );
}

/* ---------- Walkthrough shell ---------- */

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="3" y="2" width="2.6" height="10" rx="1" fill="currentColor" />
      <rect x="8.4" y="2" width="2.6" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M4 2.5v9l7.5-4.5z" fill="currentColor" />
    </svg>
  );
}

export function LandingWalkthrough({ copy }: { copy: LandingCopy }) {
  const stages = copy.flowStages;
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  // Bumped on every selection so the active chapter bar and typing restart.
  const [run, setRun] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const autoplay = !reducedMotion && !userPaused;

  const select = useCallback(
    (index: number) => {
      setActive((index + stages.length) % stages.length);
      setRun((value) => value + 1);
    },
    [stages.length],
  );
  const pauseForInteraction = useCallback(() => setUserPaused(true), []);

  // Roving-tabindex keyboard support: arrows move between scenes, Home/End jump to the ends.
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = stages.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === lastIndex ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? lastIndex : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = lastIndex;
    if (next === null) return;
    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
  };

  const renderScene = (id: StageId, isActive: boolean) => {
    switch (id) {
      case "goal":
        return <GoalScene key={isActive ? `typing-${run}` : "idle"} copy={copy.walkthrough} typing={isActive} reducedMotion={reducedMotion} />;
      case "kg":
        return <LocateScene copy={copy.walkthrough} />;
      case "lesson":
        return <CourseScene copy={copy.walkthrough} />;
      case "visual":
        return <VisualScene copy={copy.walkthrough} active={isActive} reducedMotion={reducedMotion} onInteract={pauseForInteraction} />;
      case "feedback":
        return <FeedbackScene copy={copy.walkthrough} />;
    }
  };

  return (
    <div
      className="landing-hero-visual"
      data-paused={!autoplay || held ? "true" : "false"}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={onBlur}
    >
      <div className="landing-map-stage">
        <div className="landing-scenes">
          {stages.map((stage, index) => {
            const isActive = index === active;
            return (
              <div
                key={stage.id}
                id={`landing-flow-panel-${stage.id}`}
                className="landing-scene"
                data-active={isActive ? "true" : "false"}
                role="tabpanel"
                aria-labelledby={`landing-flow-tab-${stage.id}`}
                inert={!isActive}
              >
                <div className="landing-scene-head" style={accentStyle(STAGE_ACCENTS[stage.id])}>
                  <span className="landing-scene-kicker">{stage.kicker}</span>
                  <p className="landing-scene-title">{stage.title}</p>
                </div>
                <div className="landing-scene-canvas">{renderScene(stage.id, isActive)}</div>
              </div>
            );
          })}
        </div>
        <div className="landing-stage-foot">
          <div className="landing-chapters" role="tablist" aria-label={copy.flowLabel}>
            {stages.map((stage, index) => {
              const isActive = index === active;
              return (
                <button
                  key={stage.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`landing-flow-tab-${stage.id}`}
                  className="landing-chapter"
                  data-done={index < active ? "true" : "false"}
                  aria-controls={`landing-flow-panel-${stage.id}`}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <span className="landing-chapter-bar" aria-hidden="true">
                    <i
                      key={isActive ? run : "idle"}
                      style={{ animationDuration: `${STAGE_SECONDS[stage.id]}s` }}
                      onAnimationEnd={isActive && autoplay ? () => select(index + 1) : undefined}
                    />
                  </span>
                  <span>
                    <span className="landing-chapter-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="landing-chapter-label">{stage.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {reducedMotion ? null : (
            <button
              type="button"
              className="landing-playpause"
              aria-label={userPaused ? copy.flowPlay : copy.flowPause}
              onClick={() => setUserPaused((value) => !value)}
            >
              {userPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
