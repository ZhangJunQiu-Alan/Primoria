/**
 * One map illustration per hero flow stage. Each stage draws the thing its
 * caption describes: the typed goal, its place on the concept graph, the
 * generated path, the manipulable visual, and the quiz evidence.
 *
 * The caption overlays the top of the stage, so every composition sits below
 * y≈120 in the shared 640×480 viewBox. Copy comes from the dictionary so the
 * drawings follow the interface language.
 */
import type { I18nDictionary } from "@/lib/i18n/dictionaries";

type VisualLabels = I18nDictionary["landing"]["visualLabels"];

const VIEWBOX = "0 0 640 480";

const INK = "#1a1814";
const PINE = "#1e4d40";
const AMBER = "#c8881a";
const AMBER_INK = "#8a5c0e";
const CORAL = "#d9603f";
const MUTED = "#6b655c";
const LINE = "#d5cdbf";
const PANEL = "#fffefb";

function Grid() {
  return (
    <path
      className="landing-map-gridline"
      d="M0 120H640M0 220H640M0 320H640M0 420H640M110 0V480M230 0V480M350 0V480M470 0V480M590 0V480"
    />
  );
}

function Label({ x, y, children, anchor = "start", fill = MUTED, size = 14, weight }: {
  x: number;
  y: number;
  children: React.ReactNode;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  size?: number;
  weight?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight={weight}>
      {children}
    </text>
  );
}

function GoalVisual({ labels }: { labels: VisualLabels }) {
  const [first, second, third] = labels.goalOptions;
  return (
    <svg className="landing-map-svg" viewBox={VIEWBOX} role="img" aria-label={labels.goalText}>
      <Grid />
      <rect x="44" y="222" width="360" height="72" rx="36" fill={PANEL} stroke="#e3cfa6" strokeWidth="6" opacity="0.6" />
      <rect x="48" y="226" width="352" height="64" rx="32" fill={PANEL} stroke={INK} strokeOpacity="0.16" strokeWidth="2" />
      <Label x={78} y={265} fill={INK} size={19}>{labels.goalText}</Label>
      <rect className="landing-goal-cursor" x="370" y="244" width="3" height="28" rx="1.5" fill={AMBER} />
      <path className="landing-map-edge faint" d="M400 258C456 244 480 196 512 176" />
      <path className="landing-map-edge faint" d="M400 258H520" />
      <path className="landing-map-edge faint" d="M400 258C456 272 480 320 512 340" />
      <circle cx="534" cy="166" r="20" fill="#fbeed3" stroke={AMBER} strokeWidth="2.5" />
      <circle cx="546" cy="258" r="20" fill="#dcede3" stroke={PINE} strokeWidth="2.5" />
      <circle cx="534" cy="350" r="20" fill="#f9e3ea" stroke={CORAL} strokeWidth="2.5" />
      <Label x={562} y={171}>{first}</Label>
      <Label x={574} y={263}>{second}</Label>
      <Label x={562} y={355}>{third}</Label>
    </svg>
  );
}

function KgVisual({ labels }: { labels: VisualLabels }) {
  return (
    <svg className="landing-map-svg" viewBox={VIEWBOX} role="img" aria-label={`${labels.mastered} · ${labels.start} · ${labels.ahead}`}>
      <Grid />
      <path d="M92 330L192 300M192 300L318 252" stroke={PINE} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path className="landing-map-edge faint" d="M360 232C410 206 450 190 494 176M362 270C414 298 456 318 500 336M352 214C366 188 380 172 400 160M500 336L586 300" />
      <circle className="landing-map-halo" cx="330" cy="250" r="64" fill={CORAL} opacity="0.25" />
      <circle cx="92" cy="330" r="24" fill={PINE} />
      <circle cx="192" cy="300" r="24" fill={PINE} />
      <path d="M82 330l7 7 13-14M182 300l7 7 13-14" stroke="#f6f3ec" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="330" cy="250" r="42" fill={PANEL} stroke={CORAL} strokeWidth="4" />
      <Label x={330} y={256} anchor="middle" fill={INK} size={16} weight={500}>{labels.entryConcept}</Label>
      <circle cx="414" cy="154" r="16" fill={PANEL} stroke="#b9b0a1" strokeWidth="2" />
      <circle cx="510" cy="172" r="18" fill={PANEL} stroke="#b9b0a1" strokeWidth="2" />
      <circle cx="514" cy="340" r="18" fill={PANEL} stroke="#b9b0a1" strokeWidth="2" />
      <circle cx="598" cy="296" r="16" fill={PANEL} stroke="#b9b0a1" strokeWidth="2" />
      <Label x={70} y={378} fill={PINE}>{labels.mastered}</Label>
      <Label x={300} y={320} fill={CORAL}>{labels.start}</Label>
      <Label x={490} y={250}>{labels.ahead}</Label>
    </svg>
  );
}

function LessonVisual({ labels }: { labels: VisualLabels }) {
  return (
    <svg className="landing-map-svg" viewBox={VIEWBOX} role="img" aria-label={`${labels.goal} → ${labels.entryConcept} → ${labels.nextConcept}`}>
      <Grid />
      <path className="landing-map-edge faint" d="M330 262C366 338 440 380 540 396M330 262C380 220 420 226 470 250" />
      <path className="landing-map-draw" pathLength={1} d="M96 400C170 350 240 300 330 262" stroke={AMBER} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path className="landing-map-draw" pathLength={1} d="M330 262C418 222 470 168 548 182" stroke={CORAL} strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="400" r="30" fill="#fbeed3" stroke={AMBER} strokeWidth="3" />
      <circle className="landing-map-halo" cx="330" cy="262" r="70" fill={CORAL} opacity="0.22" />
      <circle cx="330" cy="262" r="48" fill={PINE} />
      <circle cx="548" cy="182" r="34" fill={PANEL} stroke={CORAL} strokeWidth="4" />
      <circle cx="540" cy="396" r="22" fill={PANEL} stroke={LINE} strokeWidth="2" />
      <circle cx="470" cy="250" r="16" fill={PANEL} stroke={LINE} strokeWidth="2" />
      <Label x={96} y={405} anchor="middle" fill={AMBER_INK}>{labels.goal}</Label>
      <Label x={330} y={268} anchor="middle" fill="#f6f3ec" size={16} weight={500}>{labels.entryConcept}</Label>
      <Label x={548} y={187} anchor="middle" fill={INK} size={13}>{labels.nextConcept}</Label>
      <Label x={548} y={240} anchor="middle" fill={CORAL} size={12}>{labels.next}</Label>
    </svg>
  );
}

function VisualVisual({ labels }: { labels: VisualLabels }) {
  return (
    <svg className="landing-map-svg" viewBox={VIEWBOX} role="img" aria-label={`${labels.oxygenOutput} · ${labels.lightIntensity} · ${labels.limitingFactor}`}>
      <Grid />
      <path d="M90 390H590M90 390V140" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M90 190H580" stroke={INK} strokeOpacity="0.3" strokeWidth="2" strokeDasharray="8 8" />
      <path className="landing-map-draw" pathLength={1} d="M90 390C160 390 210 300 270 250" stroke={AMBER} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path className="landing-map-draw" pathLength={1} d="M270 250C340 196 440 194 580 194" stroke={CORAL} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M270 250V390" stroke={PINE} strokeWidth="1.5" strokeDasharray="3 5" />
      <circle className="landing-map-halo" cx="270" cy="250" r="30" fill={PINE} opacity="0.25" />
      <circle cx="270" cy="250" r="14" fill={PINE} stroke={PANEL} strokeWidth="4" />
      <Label x={580} y={178} anchor="end">{labels.limitingFactor}</Label>
      <Label x={590} y={420} anchor="end">{labels.lightIntensity}</Label>
      <text x="64" y="270" textAnchor="middle" transform="rotate(-90 64 270)" fill={MUTED} fontSize="14">{labels.oxygenOutput}</text>
      <rect x="200" y="426" width="140" height="6" rx="3" fill="#e2dcd0" />
      <rect x="200" y="426" width="62" height="6" rx="3" fill={PINE} />
      <circle cx="262" cy="429" r="10" fill={PANEL} stroke={PINE} strokeWidth="3" />
    </svg>
  );
}

function FeedbackVisual({ labels }: { labels: VisualLabels }) {
  const answers = [true, true, false, true];
  return (
    <svg className="landing-map-svg" viewBox={VIEWBOX} role="img" aria-label={`${labels.feedbackConcept} · ${labels.feedbackScore}`}>
      <Grid />
      {answers.map((correct, index) => {
        const x = 72 + index * 124;
        return (
          <g key={x} className={`landing-feedback-card feedback-${index}`}>
            <rect
              x={x}
              y="156"
              width="96"
              height="96"
              rx="22"
              fill={correct ? "#dcede3" : "#fbeed3"}
              stroke={correct ? "#2e6b52" : AMBER}
              strokeOpacity={correct ? 0.4 : 0.6}
              strokeWidth="3"
            />
            {correct ? (
              <path d={`M${x + 28} 204l14 14 26-30`} stroke="#2e6b52" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d={`M${x + 32} 188l32 32M${x + 64} 188l-32 32`} stroke={AMBER_INK} strokeWidth="7" strokeLinecap="round" />
            )}
          </g>
        );
      })}
      <Label x={72} y={316} fill={INK} size={16} weight={500}>{labels.feedbackConcept}</Label>
      <Label x={540} y={316} anchor="end">{labels.feedbackScore}</Label>
      <rect x="72" y="332" width="468" height="20" rx="10" fill="#f0ebe1" />
      <rect className="landing-mastery-fill" x="72" y="332" width="351" height="20" rx="10" fill={AMBER} />
      <path d="M446 324V360" stroke={INK} strokeWidth="2" strokeDasharray="3 4" />
      <Label x={72} y={396}>{labels.feedbackNote}</Label>
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

export function FlowStageVisual({ stageId, labels }: { stageId: string; labels: VisualLabels }) {
  const Visual = VISUALS[stageId as FlowStageId] ?? LessonVisual;
  return <Visual labels={labels} />;
}
