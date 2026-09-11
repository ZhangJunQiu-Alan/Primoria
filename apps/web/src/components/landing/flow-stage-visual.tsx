/**
 * One map illustration per hero flow stage.
 *
 * The hero previously drew a single knowledge-graph map for every stage, so the
 * feedback copy sat over a picture of a graph. Each stage now draws the thing it
 * is actually describing.
 *
 * All five reuse the existing map classes (`landing-map-node`,
 * `landing-map-edge`, `landing-map-gridline`, `landing-map-svg text`) so the
 * palette, stroke weights, and type stay defined in one place.
 *
 * Layout constraint, measured from the rendered page at both breakpoints rather
 * than guessed. The caption overlays the top of the stage — to y≈38 on desktop,
 * y≈115 on mobile, where it is taller. Below that the stage is clear to y 520.
 * Content therefore starts below y≈120 to read at both sizes. The four
 * compositions below are authored around y 130-320 and shifted down by
 * STAGE_OFFSET to sit centred in that space.
 *
 * Gradients are per-visual and uniquely identified. The shared
 * `landingPathGradient` is aimed along the Lesson path (74,390 → 590,96), and
 * painting a differently shaped stroke with it renders that stroke invisible —
 * verified in the browser, though the exact mechanism was not pinned down. Each
 * drawn curve therefore carries a gradient spanning its own extent.
 */

const SHARED_VIEWBOX = "0 0 720 520";

/** Vertical shift that centres a composition authored around y 130-320 in the
    space left below the caption. Applied as one transform so the drawings keep
    readable coordinates. */
const STAGE_OFFSET = "translate(0 90)";

function Grid() {
  return (
    <>
      <path className="landing-map-gridline" d="M80 96H642M80 202H642M80 308H642M80 414H642" />
      <path className="landing-map-gridline" d="M160 62V452M280 62V452M400 62V452M520 62V452" />
    </>
  );
}

/** A gradient spanning one specific stroke, so it never renders past its stops. */
function StrokeGradient({
  id,
  x1,
  y1,
  x2,
  y2,
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return (
    <defs>
      <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
        <stop stopColor="#c8881a" />
        <stop offset="0.48" stopColor="#ef7358" />
        <stop offset="1" stopColor="#17130f" />
      </linearGradient>
    </defs>
  );
}

/** Goal — a goal typed in plain language, not yet resolved to anything. */
function GoalVisual() {
  return (
    <svg
      className="landing-map-svg"
      viewBox={SHARED_VIEWBOX}
      role="img"
      aria-label="A learning goal typed in plain language, with three unresolved directions leading from it"
    >
      <Grid />

      <g transform={STAGE_OFFSET}>
      {/* The typed goal */}
      <rect
        x="64"
        y="170"
        width="404"
        height="96"
        rx="48"
        fill="rgba(255, 253, 248, 0.94)"
        stroke="rgba(23, 19, 15, 0.16)"
        strokeWidth="4"
      />
      <text x="104" y="230" fontSize="26">
        photosynthesis
      </text>
      <rect x="368" y="196" width="4" height="44" rx="2" fill="rgba(23, 19, 15, 0.45)" />

      {/* Directions it could resolve into — none chosen yet */}
      <path className="landing-map-edge faint" d="M468 218C524 206 548 176 574 152" />
      <path className="landing-map-edge faint" d="M468 218H586" />
      <path className="landing-map-edge faint" d="M468 218C524 230 548 260 572 284" />
      <circle className="landing-map-node small" cx="592" cy="146" r="26" />
      <circle className="landing-map-node small" cx="616" cy="218" r="26" />
      <circle className="landing-map-node small" cx="588" cy="290" r="26" />
      </g>
    </svg>
  );
}

/** KG — the goal positioned against the concept graph. */
function KgVisual() {
  return (
    <svg
      className="landing-map-svg"
      viewBox={SHARED_VIEWBOX}
      role="img"
      aria-label="The goal matched into a concept graph, with two prerequisite concepts mastered and six still ahead"
    >
      <Grid />

      <g transform={STAGE_OFFSET}>
      <path className="landing-map-edge" d="M104 276H196" />
      <path className="landing-map-edge" d="M244 262C296 242 318 232 330 218" />
      <path className="landing-map-edge faint" d="M402 192C456 172 510 156 560 148" />
      <path className="landing-map-edge faint" d="M404 224C458 244 512 264 566 282" />
      <path className="landing-map-edge faint" d="M388 160C404 152 424 146 448 142" />

      {/* Mastered */}
      <circle className="landing-map-node next" cx="104" cy="276" r="32" />
      <circle className="landing-map-node next" cx="212" cy="262" r="32" />
      <text x="62" y="318" fontSize="18">
        Mastered
      </text>

      {/* Entry point */}
      <circle className="landing-map-node active" cx="358" cy="206" r="50" />
      <text x="318" y="214" fontSize="19">
        Start
      </text>

      {/* Still ahead */}
      <circle className="landing-map-node small" cx="580" cy="142" r="26" />
      <circle className="landing-map-node small" cx="586" cy="292" r="26" />
      <circle className="landing-map-node small" cx="468" cy="136" r="26" />
      <text x="516" y="202" fontSize="18">
        6 ahead
      </text>
      </g>
    </svg>
  );
}

/** Lesson — the ordered path through the concepts of this lesson. */
function LessonVisual() {
  return (
    <svg
      className="landing-map-svg"
      viewBox={SHARED_VIEWBOX}
      role="img"
      aria-label="A generated lesson path running from the goal through the current concept to the next one"
    >
      <defs>
        <linearGradient
          id="landingPathGradient"
          x1="74"
          y1="390"
          x2="590"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c8881a" />
          <stop offset="0.48" stopColor="#ef7358" />
          <stop offset="1" stopColor="#17130f" />
        </linearGradient>
      </defs>
      <Grid />
      <path className="landing-map-edge faint" d="M144 384C214 242 290 184 390 205" />
      <path className="landing-map-edge faint" d="M390 205C452 132 522 112 606 150" />
      <path className="landing-map-edge faint" d="M390 205C424 298 500 356 596 390" />
      <path className="landing-map-path" d="M144 384C226 318 284 258 390 205C475 162 530 126 606 150" />
      <circle className="landing-map-node muted" cx="144" cy="384" r="44" />
      <circle className="landing-map-node active" cx="390" cy="205" r="64" />
      <circle className="landing-map-node next" cx="606" cy="150" r="42" />
      <circle className="landing-map-node small" cx="596" cy="390" r="34" />
      <circle className="landing-map-node small warm" cx="268" cy="160" r="28" />
      <text x="118" y="391">Goal</text>
      <text x="344" y="213">Light</text>
      <text x="576" y="157">Next</text>
    </svg>
  );
}

/** Visual — the saturating rate curve the learner can actually manipulate. */
function VisualVisual() {
  return (
    <svg
      className="landing-map-svg"
      viewBox={SHARED_VIEWBOX}
      role="img"
      aria-label="Oxygen output plotted against light intensity: the curve rises then flattens once another factor becomes limiting"
    >
      <StrokeGradient id="landingCurveGradient" x1={118} y1={300} x2={624} y2={164} />
      <Grid />

      <g transform={STAGE_OFFSET}>
      {/* Axes */}
      <path className="landing-map-edge" d="M118 300H628" strokeWidth="5" />
      <path className="landing-map-edge" d="M118 300V140" strokeWidth="5" />

      {/* Where more light stops helping */}
      <path
        d="M118 166H616"
        fill="none"
        stroke="rgba(23, 19, 15, 0.26)"
        strokeWidth="3"
        strokeDasharray="12 12"
      />
      <text x="614" y="196" fontSize="17" textAnchor="end">
        limiting factor
      </text>

      {/* Steep, then saturating */}
      <path
        className="landing-map-draw"
        stroke="url(#landingCurveGradient)"
        d="M118 300C196 300 250 232 306 202C372 166 470 168 616 168"
      />
      <circle className="landing-map-node active" cx="306" cy="202" r="26" />

      <text x="622" y="290" fontSize="18" textAnchor="end">
        Light intensity →
      </text>
      <text x="92" y="222" fontSize="18" transform="rotate(-90 92 222)" textAnchor="middle">
        O₂ output
      </text>
      </g>
    </svg>
  );
}

/** Feedback — quiz evidence and the concept mastery it moved. */
function FeedbackVisual() {
  const answers = [true, true, false, true];
  return (
    <svg
      className="landing-map-svg"
      viewBox={SHARED_VIEWBOX}
      role="img"
      aria-label="Four quiz answers, three correct and one wrong, above a partly filled mastery bar for limiting factors"
    >
      <Grid />

      <g transform={STAGE_OFFSET}>
      {answers.map((correct, index) => {
        const x = 96 + index * 116;
        return (
          <g key={x}>
            <rect
              x={x}
              y="130"
              width="92"
              height="92"
              rx="28"
              fill={correct ? "rgba(167, 227, 189, 0.72)" : "rgba(255, 229, 143, 0.85)"}
              stroke={correct ? "rgba(73, 142, 93, 0.34)" : "rgba(201, 136, 26, 0.42)"}
              strokeWidth="5"
            />
            {correct ? (
              <path
                d={`M${x + 28} 176l16 16 22-30`}
                fill="none"
                stroke="rgba(37, 92, 58, 0.78)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d={`M${x + 32} 160l28 28M${x + 60} 160l-28 28`}
                fill="none"
                stroke="rgba(150, 96, 12, 0.78)"
                strokeWidth="9"
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}

      <text x="96" y="266" fontSize="19">
        Limiting factors
      </text>
      <rect
        x="96"
        y="284"
        width="456"
        height="34"
        rx="17"
        fill="rgba(23, 19, 15, 0.06)"
        stroke="rgba(23, 19, 15, 0.1)"
        strokeWidth="3"
      />
      <rect x="96" y="284" width="342" height="34" rx="17" fill="rgba(255, 229, 143, 0.9)" />
      </g>
    </svg>
  );
}

const VISUALS = {
  goal: GoalVisual,
  kg: KgVisual,
  lesson: LessonVisual,
  visual: VisualVisual,
  feedback: FeedbackVisual,
} as const;

export type FlowStageId = keyof typeof VISUALS;

export function FlowStageVisual({ stageId }: { stageId: string }) {
  const Visual = VISUALS[stageId as FlowStageId] ?? LessonVisual;
  return <Visual />;
}
