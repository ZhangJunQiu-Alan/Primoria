/**
 * One working picture per product capability, so the section shows the loop
 * instead of describing it: graph positioning, the lesson engine, the course
 * tutor, and the rolling-window mastery rule.
 */
import type { I18nDictionary } from "@/lib/i18n/dictionaries";
import { PALETTE as C } from "@/components/landing/landing-palette";

type VisualCopy = I18nDictionary["landing"]["capabilityVisuals"];

const VIEWBOX = "0 0 700 290";

/* ---------- 01 Positioning ---------- */

const FAINT_NODES = [
  [292, 62], [372, 52], [468, 66], [548, 44], [664, 58],
  [684, 196], [628, 240], [540, 252], [392, 258], [262, 236],
] as const;
const FAINT_EDGES =
  "M292 62L372 52M372 52L420 140M468 66L420 140M468 66L548 44M548 44L610 125M664 58L610 125M684 196L610 125M628 240L510 180M540 252L510 180M392 258L330 190M262 236L330 190M292 62L330 190M664 58L684 196";
/** Prerequisite chain from a mastered concept to the goal concept. */
const CHAIN = [
  { x: 330, y: 190, labelY: 220 },
  { x: 420, y: 140, labelY: 116 },
  { x: 510, y: 180, labelY: 210 },
  { x: 610, y: 125, labelY: 174 },
] as const;

export function PositioningVisual({ copy }: { copy: VisualCopy }) {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={FAINT_EDGES} stroke={C.pineSoft} strokeWidth={1} opacity={0.9} />
      {FAINT_NODES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={5} fill={C.pineSoft} />
      ))}
      <path d="M240 140 C 330 30, 520 20, 594 104" fill="none" stroke={C.pine} strokeWidth={1.5} strokeDasharray="4 5" />
      <path
        className="landing-capability-chain"
        d={`M${CHAIN.map((node) => `${node.x} ${node.y}`).join(" L")}`}
        fill="none"
        stroke={C.pine}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <rect x={26} y={98} width={214} height={84} rx={12} fill={C.panel} stroke={C.lineStrong} />
      <text x={44} y={124} className="landing-svg-mono" style={{ fill: C.pine }}>{copy.goal}</text>
      {copy.goalLines.map((line, index) => (
        <text key={line} x={44} y={148 + index * 20} className="landing-svg-display" style={{ fontSize: 16 }}>{line}</text>
      ))}
      <circle cx={330} cy={190} r={11} fill={C.panel} stroke={C.quiet} strokeWidth={1.5} />
      <path d="M325 190l3.5 3.5 6.5-7" fill="none" stroke={C.muted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={420} cy={140} r={11} fill={C.panel} stroke={C.pine} strokeWidth={2} />
      <circle cx={510} cy={180} r={11} fill={C.panel} stroke={C.pine} strokeWidth={2} />
      <circle cx={610} cy={125} r={28} fill="none" stroke={C.pine} strokeWidth={1.5} opacity={0.3} />
      <circle cx={610} cy={125} r={17} fill={C.pine} />
      {copy.chain.map((concept, index) => {
        const node = CHAIN[index];
        const isGoal = index === CHAIN.length - 1;
        return (
          <text
            key={concept}
            x={node.x}
            y={node.labelY}
            textAnchor="middle"
            className="landing-svg-text"
            style={{ fontSize: isGoal ? 13 : 12.5, fontWeight: isGoal ? 500 : undefined, fill: isGoal ? C.pine : index === 0 ? C.muted : C.ink2 }}
          >
            {concept}
          </text>
        );
      })}
      <text x={330} y={236} textAnchor="middle" className="landing-svg-mono" style={{ fontSize: 10, fill: C.quiet }}>{copy.mastered}</text>
    </svg>
  );
}

/* ---------- 02 Lesson engine ---------- */

export function EngineVisual({ copy }: { copy: VisualCopy }) {
  return (
    <div className="landing-engine" aria-hidden="true">
      <div className="landing-engine-lesson" data-state="done">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7.5" fill={C.pine} />
          <path d="M4.8 8.2l2.2 2.2 4.2-4.6" fill="none" stroke={C.paper} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{copy.doneLesson}</span>
        <span className="landing-engine-meta">{copy.done}</span>
      </div>
      <div className="landing-engine-lesson" data-state="now">
        <div className="landing-engine-meta">
          <span>{copy.currentLesson}</span>
          <b>{copy.currentStatus}</b>
        </div>
        <strong>{copy.currentTitle}</strong>
        <p>{copy.currentBody}</p>
        <div className="landing-engine-progress">
          {Array.from({ length: 7 }, (_, index) => (
            <i key={index} data-done={index < 3 ? "true" : "false"} />
          ))}
        </div>
      </div>
      <div className="landing-engine-lesson" data-state="next">
        <div className="landing-engine-meta">
          <span>{copy.nextLesson}</span>
          <span className="landing-engine-preparing">{copy.preparing}</span>
        </div>
        <strong>{copy.nextTitle}</strong>
        <div className="landing-skeleton"><i /></div>
      </div>
    </div>
  );
}

/* ---------- 03 Course tutor ---------- */

export function TutorVisual({ copy }: { copy: VisualCopy }) {
  return (
    <div className="landing-tutor" aria-hidden="true">
      <div className="landing-tutor-card">
        <span className="landing-tutor-card-head">{copy.tutorCard}</span>
        <div className="landing-tutor-line" />
        <div className="landing-tutor-line" data-focus="true">{copy.tutorFocus}</div>
        <div className="landing-tutor-line" data-short="true" />
      </div>
      <div className="landing-tutor-chat">
        <div className="landing-tutor-bubble" data-role="learner">{copy.tutorQuestion}</div>
        <div className="landing-tutor-bubble" data-role="tutor">
          <span className="landing-tutor-context">{copy.tutorContext}</span>
          <span>{copy.tutorAnswer}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 04 Mastery loop ---------- */

/** First-attempt answers on one concept; mastery reads the rolling accuracy of the last five. */
const ANSWERS = [true, false, true, false, true, true, true, true];
const ATTEMPT_X = ANSWERS.map((_, index) => 50 + index * 60);
const WINDOW = 5;
const MIN_ANSWERS = 3;
const accuracyY = (accuracy: number) => 196 - accuracy * 150;
const ROLLING = ANSWERS.map((_, index) => {
  if (index + 1 < MIN_ANSWERS) return null;
  const recent = ANSWERS.slice(Math.max(0, index + 1 - WINDOW), index + 1);
  return recent.filter(Boolean).length / recent.length;
});
const ROLLING_POINTS = ROLLING.flatMap((accuracy, index) => (accuracy === null ? [] : [{ x: ATTEMPT_X[index], y: accuracyY(accuracy), index }]));
const DIP_INDEX = 3;
const MASTERED_INDEX = 6;

export function MasteryVisual({ copy }: { copy: VisualCopy }) {
  const dip = ROLLING_POINTS.find((point) => point.index === DIP_INDEX)!;
  const mastered = ROLLING_POINTS.find((point) => point.index === MASTERED_INDEX)!;
  const windowStart = ATTEMPT_X[MASTERED_INDEX - WINDOW + 1];
  const windowEnd = ATTEMPT_X[MASTERED_INDEX];
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={`M${windowStart} 30V24H${windowEnd}V30`} fill="none" stroke={C.lavender} strokeWidth={1.2} />
      <text x={(windowStart + windowEnd) / 2} y={18} textAnchor="middle" className="landing-svg-mono" style={{ fill: C.lavender }}>{copy.masteryWindow}</text>
      <line x1={50} y1={accuracyY(0.8)} x2={500} y2={accuracyY(0.8)} stroke={C.pine} strokeWidth={1.2} strokeDasharray="4 5" />
      <text x={50} y={accuracyY(0.8) - 8} className="landing-svg-mono" style={{ fill: C.pine }}>{copy.masteryThreshold}</text>
      <line x1={38} y1={196} x2={500} y2={196} stroke={C.lavenderLine} />
      <path
        d={`M${ROLLING_POINTS.map((point) => `${point.x} ${point.y.toFixed(1)}`).join(" L")}`}
        fill="none"
        stroke={C.lavender}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {ROLLING_POINTS.filter((point) => point.index !== DIP_INDEX && point.index !== MASTERED_INDEX).map((point) => (
        <circle key={point.index} cx={point.x} cy={point.y} r={5} fill={C.panel} stroke={C.lavender} strokeWidth={2} />
      ))}
      <circle cx={dip.x} cy={dip.y} r={6} fill={C.panel} stroke={C.coral} strokeWidth={2.4} />
      <path d={`M${dip.x} ${dip.y + 7}V146`} stroke={C.coral} strokeWidth={1.4} strokeDasharray="3 3" />
      <rect x={dip.x - 64} y={146} width={128} height={30} rx={8} fill={C.panel} stroke={C.coral} strokeWidth={1.3} />
      <text x={dip.x} y={165} textAnchor="middle" className="landing-svg-mono" style={{ fill: C.roseInk }}>{copy.remedial}</text>
      <circle cx={mastered.x} cy={mastered.y} r={9} fill={C.pine} />
      <path d={`M${mastered.x - 4.5} ${mastered.y}l3 3 6-6.5`} fill="none" stroke={C.paper} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <text x={mastered.x} y={mastered.y - 22} textAnchor="middle" className="landing-svg-mono" style={{ fill: C.pine }}>{copy.masteredLabel}</text>
      {ANSWERS.map((correct, index) => {
        const x = ATTEMPT_X[index] - 12;
        return (
          <g key={index}>
            <rect x={x} y={210} width={24} height={24} rx={6} fill={correct ? C.correctTint : C.wrongTint} stroke={correct ? C.correct : C.wrong} />
            {correct ? (
              <path d={`M${x + 6} 222l4 4 8-8`} fill="none" stroke={C.correct} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d={`M${x + 7} 217l10 10M${x + 17} 217l-10 10`} fill="none" stroke={C.wrong} strokeWidth={1.8} strokeLinecap="round" />
            )}
            <text x={ATTEMPT_X[index]} y={252} textAnchor="middle" className="landing-svg-mono" style={{ fontSize: 10, fill: C.quiet }}>{index + 1}</text>
          </g>
        );
      })}
      <text x={260} y={274} textAnchor="middle" className="landing-svg-mono" style={{ fontSize: 10 }}>{copy.masteryAxis}</text>
      <line x1={530} y1={40} x2={530} y2={250} stroke={C.lavenderLine} />
      <text x={550} y={70} className="landing-svg-mono" style={{ fill: C.lavender }}>{copy.masteryRule}</text>
      {copy.masteryRuleLines.map((line, index) => (
        <text key={line} x={550} y={98 + index * 22} className="landing-svg-text" style={{ fontSize: 13.5, fill: C.ink }}>{line}</text>
      ))}
      {copy.masteryWeakLines.map((line, index) => (
        <text key={line} x={550} y={164 + index * 20} className="landing-svg-text" style={{ fontSize: 13.5, fill: C.muted }}>{line}</text>
      ))}
    </svg>
  );
}
