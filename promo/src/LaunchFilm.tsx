import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import type { CSSProperties, ReactNode } from 'react';
import { Brand, Cursor, Desk, EndFrame, KnowledgeWorld, Lesson, WaveExperiment } from './DirectionStudy';
import { fonts } from './theme/fonts';
import { PALETTE as c } from './theme/tokens';
import graph from './data/hero-graph.json';
import subjects from './data/film-subjects.json';

export const LAUNCH_DURATION = 2700;
export const launchScenes = [
  { id: 'question', start: 0, end: 240, title: 'Start with a question' },
  { id: 'knowledge', start: 240, end: 570, title: 'Find the connections' },
  { id: 'path', start: 570, end: 840, title: 'Find your next step' },
  { id: 'wave', start: 840, end: 1110, title: 'Change it. Understand it' },
  { id: 'lens', start: 1110, end: 1380, title: 'See what changes' },
  { id: 'tutor', start: 1380, end: 1710, title: 'Keep asking' },
  { id: 'materials', start: 1710, end: 2040, title: 'Make your materials work together' },
  { id: 'practice', start: 2040, end: 2310, title: 'Build understanding through practice' },
  { id: 'subjects', start: 2310, end: 2550, title: 'Follow your curiosity' },
  { id: 'brand', start: 2550, end: 2700, title: 'From a question to understanding' },
] as const;

const clamp = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => { const p = clamp(t); return p * p * (3 - 2 * p); };
const progress = (f: number, from: number, to: number) => smooth((f - from) / (to - from));
const mono: CSSProperties = { fontFamily: fonts.mono, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase' };
const caption: CSSProperties = { position: 'absolute', left: 88, bottom: 58, fontSize: 31, letterSpacing: '-0.03em', padding: '18px 26px', background: c.panel, color: c.ink };

function Scene({ children, first = false }: { children: ReactNode; first?: boolean }) {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: first ? 1 : progress(f, 0, 12), overflow: 'hidden' }}>{children}</AbsoluteFill>;
}

const pathOrder = ['c_mit1806_vectors', 'c_mit1806_elimination', 'c_mit1806_matrix_ops', 'dl_perceptron', 'dl_mlp', 'dl_rnn', 'dl_attention', 'dl_self_attention', 'dl_multihead', 'dl_positional', 'dl_transformer'];
const pathNodes = pathOrder.map((id, i) => {
  const node = graph.nodes.find((item) => item.id === id)!;
  const row = i < 6 ? 0 : 1;
  return { ...node, x: row === 0 ? 100 + i * 287 : 1535 - (i - 6) * 355, y: row === 0 ? 345 : 680 };
});
const pathById = new Map(pathNodes.map((node) => [node.id, node]));
const pathEdges = graph.edges.filter((edge) => pathById.has(edge.from) && pathById.has(edge.to));

function LearningPath() {
  const f = useCurrentFrame();
  const focus = progress(f, 145, 220);
  return <AbsoluteFill style={{ background: c.paper }}>
    <div style={{ position: 'absolute', left: 88, top: 80 }}><Brand size={31}/></div>
    <div style={{ position: 'absolute', left: 100, top: 180, fontFamily: fonts.title, fontSize: 72, letterSpacing: '-0.04em' }}>A way into the idea.</div>
    <div style={{ position: 'absolute', right: 100, top: 200, ...mono, color: c.muted, fontSize: 14 }}>LINEAR ALGEBRA → DEEP LEARNING</div>
    <div style={{ position: 'absolute', inset: 0, transform: `translate(${focus * 15}px, ${focus * -10}px) scale(${1 + focus * 0.03})`, transformOrigin: '65% 60%' }}>
      <svg width="1920" height="1080" style={{ position: 'absolute' }}>
        {pathEdges.map((edge, i) => {
          const a = pathById.get(edge.from)!; const b = pathById.get(edge.to)!;
          const amount = progress(f, 10 + i * 7, 43 + i * 7);
          return <path key={`${edge.from}-${edge.to}`} d={a.y === b.y ? `M${a.x + 108} ${a.y + 43}L${b.x + 108} ${b.y + 43}` : `M${a.x + 108} ${a.y + 43}C${a.x + 330} ${a.y + 43} ${b.x + 330} ${b.y + 43} ${b.x + 108} ${b.y + 43}`} fill="none" stroke={c.pine} strokeWidth="2.5" opacity="0.4" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - amount}/>;
        })}
      </svg>
      {pathNodes.map((node, i) => {
        const reveal = progress(f, 6 + i * 7, 30 + i * 7);
        const selected = node.id === 'dl_self_attention';
        return <div key={node.id} style={{ position: 'absolute', left: node.x, top: node.y + (1 - reveal) * 25, width: 218, minHeight: 107, padding: '23px 19px', background: selected ? c.pine : c.panel, color: selected ? c.paper : c.ink, border: `1px solid ${selected ? c.pine : c.lineStrong}`, borderRadius: 4, opacity: reveal, boxShadow: selected ? `0 ${10 + focus * 15}px 40px #1e4d4028` : '0 6px 14px #1a181406', transform: `scale(${selected ? 1 + focus * 0.12 : 1})` }}><div style={{ ...mono, fontSize: 11, color: selected ? c.pineSoft : c.quiet, marginBottom: 12 }}>{selected ? 'NEXT TO EXPLORE' : i < 3 ? 'FOUNDATION' : 'CONCEPT'}</div><div style={{ fontSize: 22, lineHeight: 1.3 }}>{node.name}</div></div>;
      })}
    </div>
    <div style={caption}>Your next step, made clear.</div>
  </AbsoluteFill>;
}

function LensExperiment() {
  const f = useCurrentFrame();
  const slide = progress(f, 35, 175);
  const focal = 180;
  const u = 540 - slide * 225;
  const v = focal * u / (u - focal);
  const lensX = 1000;
  const axis = 550;
  const height = 160;
  const objectX = lensX - u;
  const imageX = lensX + v;
  const imageY = axis + height * v / u;
  const ray = (d: string, color: string) => <path d={d} stroke={color} strokeWidth="3.5" fill="none" strokeLinejoin="round"/>;
  return <AbsoluteFill style={{ background: '#ede9de' }}>
    <div style={{ position: 'absolute', left: 88, top: 80 }}><Brand size={31}/></div>
    <div style={{ position: 'absolute', top: 86, right: 100, ...mono, color: c.muted }}>INTERACTIVE / LENS IMAGING</div>
    <div style={{ position: 'absolute', left: 110, top: 190, fontFamily: fonts.title, fontSize: 72, letterSpacing: '-0.04em' }}>A small change.<br/>A different picture.</div>
    <svg width="1920" height="1080" style={{ position: 'absolute' }}>
      <line x1="110" x2="1800" y1={axis} y2={axis} stroke={c.quiet} strokeWidth="1.5"/>
      <path d={`M${lensX} 250Q${lensX + 94} ${axis} ${lensX} 850Q${lensX - 94} ${axis} ${lensX} 250Z`} fill={c.pineSoft} fillOpacity="0.35" stroke={c.pine} strokeWidth="2"/>
      {[lensX - focal, lensX + focal].map((x) => <g key={x}><line x1={x} x2={x} y1={axis - 10} y2={axis + 10} stroke={c.ink} strokeWidth="2"/><text x={x} y={axis + 38} textAnchor="middle" fontSize="21" fill={c.muted} fontFamily={fonts.mono}>F</text></g>)}
      {ray(`M${objectX} ${axis - height}L${lensX} ${axis - height}L${imageX} ${imageY}`, c.amber)}
      {ray(`M${objectX} ${axis - height}L${imageX} ${imageY}`, c.coral)}
      <path d={`M${objectX} ${axis}V${axis - height}m-13 20l13-20 13 20`} fill="none" stroke={c.pine} strokeWidth="7"/>
      <path d={`M${imageX} ${axis}V${imageY}m-13-20l13 20 13-20`} fill="none" stroke={c.pine} strokeWidth="7"/>
      <text x={objectX} y={axis + 62} textAnchor="middle" fontSize="21" fill={c.pine} fontFamily={fonts.body}>Object</text>
      <text x={imageX} y={imageY + 50} textAnchor="middle" fontSize="21" fill={c.pine} fontFamily={fonts.body}>Image</text>
      <circle cx={objectX} cy={axis + 93} r="8" fill={c.pine}/>
      <path d={`M320 ${axis + 93}H740`} fill="none" stroke={c.pine} opacity="0.25" strokeWidth="2"/>
    </svg>
    <Cursor x={objectX + 5} y={axis + 100} down/>
    <div style={{ position: 'absolute', top: 245, right: 150, color: c.pine, width: 360 }}><div style={{ ...mono, fontSize: 12 }}>IMAGE MAGNIFICATION</div><div style={{ fontFamily: fonts.title, fontSize: 100, marginTop: 12 }}>{(v / u).toFixed(2)}<span style={{ fontSize: 48 }}>×</span></div></div>
    <div style={caption}>See what changes.</div>
  </AbsoluteFill>;
}

const files = ['Lecture 01 · Vectors', 'Lecture 02 · Matrix operations', 'Lecture 03 · Attention'];
function MaterialSheet({ index }: { index: number }) {
  const f = useCurrentFrame();
  const settle = progress(f, 10 + index * 12, 75 + index * 12);
  return <div style={{ position: 'absolute', left: 150 + index * 55 + settle * (index === 0 ? 10 : -index * 25), top: 285 + index * 50, width: 480, height: 440, padding: 35, overflow: 'hidden', background: index === 1 ? '#e4e9de' : c.panel, border: `1px solid ${c.lineStrong}`, transform: `rotate(${(index - 1) * (11 - settle * 4)}deg) translateX(${(1 - settle) * -350}px)`, boxShadow: '0 16px 30px #17252112', opacity: progress(f, index * 12, 30 + index * 12) }}><div style={{ ...mono, fontSize: 11, color: c.quiet }}>LECTURE {String(index + 1).padStart(2, '0')} / EXTRACTED NOTES</div><div style={{ margin: '28px 0', fontFamily: fonts.title, fontSize: 39, lineHeight: 1.05 }}>{['Vectors in context.', 'The language of matrices.', 'Attention connects ideas.'][index]}</div><svg viewBox="0 0 400 170" width="100%">{Array.from({ length: 6 }, (_, i) => <g key={i}><circle cx={40 + i * 60} cy={80 + Math.sin(i) * 40} r="8" fill={i === index ? c.amber : c.pine}/>{i > 0 ? <line x1={40 + (i - 1) * 60} y1={80 + Math.sin(i - 1) * 40} x2={40 + i * 60} y2={80 + Math.sin(i) * 40} stroke={c.pine} opacity="0.4"/> : null}</g>)}</svg>{[95, 85, 97, 70, 90, 65].map((w, i) => <div key={i} style={{ height: 7, marginTop: 17, width: `${w}%`, background: c.lineStrong, opacity: 0.5 }}/>)}</div>;
}

function Materials() {
  const f = useCurrentFrame();
  const panel = progress(f, 62, 100);
  const answer = 'In your lectures, vectors describe the inputs. Matrix operations transform them. Attention then uses those transformed representations to connect relevant words.';
  const typed = answer.slice(0, Math.floor(progress(f, 118, 230) * answer.length));
  return <AbsoluteFill style={{ background: '#e5eade' }}>
    <div style={{ position: 'absolute', left: 88, top: 80 }}><Brand size={31}/></div>
    <div style={{ position: 'absolute', left: 100, top: 170, fontFamily: fonts.title, fontSize: 60, letterSpacing: '-0.04em' }}>Your lectures. Connected.</div>
    {[2, 1, 0].map((i) => <MaterialSheet key={i} index={i}/>)}
    <div style={{ position: 'absolute', left: 800 + (1 - panel) * 180, top: 195, width: 995, height: 680, background: c.panel, border: `1px solid ${c.lineStrong}`, borderRadius: 9, boxShadow: '0 22px 60px #17252112', opacity: panel, padding: 36, transform: `scale(${0.97 + panel * 0.03})` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 26, borderBottom: `1px solid ${c.lineSoft}` }}><div style={{ fontSize: 27 }}>Deep Learning</div><div style={{ ...mono, fontSize: 12, color: c.pine }}>SUBJECT FOLDER</div></div>
      <div style={{ display: 'flex', gap: 30, marginTop: 25 }}><div style={{ width: 270 }}>{files.map((file, i) => <div key={file} style={{ padding: '18px 0', borderBottom: `1px solid ${c.lineSoft}`, color: c.muted, fontSize: 17, lineHeight: 1.5 }}><span style={{ color: c.pine, fontFamily: fonts.mono, marginRight: 9 }}>0{i + 1}</span>{file}</div>)}<div style={{ color: c.pine, fontSize: 17, marginTop: 35 }}>Concepts · Course · Quiz</div></div><div style={{ flex: 1, paddingLeft: 28, borderLeft: `1px solid ${c.lineSoft}` }}><div style={{ background: c.paper, fontSize: 24, padding: 22, lineHeight: 1.45 }}>How do these lectures fit together?</div><div style={{ fontSize: 24, lineHeight: 1.55, marginTop: 27, minHeight: 215 }}>{typed}</div><div style={{ opacity: progress(f, 232, 253), paddingTop: 18, borderTop: `1px solid ${c.lineSoft}`, color: c.pine, fontSize: 17, lineHeight: 1.8 }}>↗ Lecture 01 · p. 2　↗ Lecture 02 · p. 4<br/>↗ Lecture 03 · p. 3</div></div></div>
    </div>
    <div style={caption}>Grounded in your materials.</div>
  </AbsoluteFill>;
}

function Practice() {
  const f = useCurrentFrame();
  const selected = progress(f, 75, 90);
  const result = progress(f, 140, 165);
  const options = ['Their amplitudes add.', 'They cancel each other.', 'Their frequency doubles.'];
  return <AbsoluteFill style={{ background: c.paper }}>
    <div style={{ position: 'absolute', left: 88, top: 80 }}><Brand size={31}/></div>
    <div style={{ position: 'absolute', left: 120, top: 220, width: 1040 }}><div style={{ ...mono, fontSize: 14, color: c.muted }}>CONCEPT CHECK / WAVE SUPERPOSITION</div><div style={{ fontFamily: fonts.title, fontSize: 62, lineHeight: 1.1, marginTop: 32, letterSpacing: '-0.03em' }}>Equal waves.<br/>180° out of phase.<br/>What happens?</div><div style={{ marginTop: 40 }}>{options.map((option, i) => <div key={option} style={{ padding: '22px 26px', marginTop: 15, width: 850, border: `1px solid ${i === 1 && selected > 0 ? c.pine : c.lineStrong}`, background: i === 1 ? `rgba(185,203,191,${selected * 0.5})` : c.panel, display: 'flex', gap: 23, fontSize: 25 }}><span style={{ fontFamily: fonts.mono, color: c.muted }}>{'ABC'[i]}</span>{option}<span style={{ marginLeft: 'auto', color: c.pine, opacity: i === 1 ? selected : 0 }}>✓</span></div>)}</div><div style={{ fontSize: 22, color: c.pine, marginTop: 23, opacity: progress(f, 100, 125) }}>Correct. Equal and opposite displacements sum to zero.</div></div>
    <div style={{ position: 'absolute', left: 1260, top: 255, width: 490 }}><div style={{ ...mono, fontSize: 13, color: c.muted }}>RECENT FIRST ATTEMPTS</div>{[0, 1, 2].map((i) => <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 28, color: c.pine, fontSize: 22, opacity: i === 2 ? progress(f, 110, 140) : 1 }}><div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: '50%', background: c.pineTint }}>✓</div>Question {i + 1} · Correct</div>)}<div style={{ opacity: result, transform: `translateY(${(1 - result) * 18}px)`, marginTop: 48, borderTop: `1px solid ${c.lineStrong}`, paddingTop: 33 }}><div style={{ fontFamily: fonts.title, fontSize: 76, color: c.pine }}>3 / 3</div><div style={{ fontSize: 25, marginTop: 10 }}>Wave superposition</div><div style={{ fontSize: 18, marginTop: 18, color: c.correct }}>● Mastered</div><div style={{ fontSize: 16, marginTop: 32, color: c.muted, lineHeight: 1.6 }}>Mastery requires at least 3 answers<br/>and 80% accuracy.</div></div></div>
    <div style={{ opacity: 1 - progress(f, 100, 115) }}><Cursor x={940 - progress(f, 25, 70) * 260} y={800 - progress(f, 25, 70) * 150} down={f > 75}/></div>
    <div style={caption}>Build understanding through practice.</div>
  </AbsoluteFill>;
}

function SubjectWorld() {
  const f = useCurrentFrame();
  const orbit = f * 0.0015;
  const reveal = progress(f, 4, 45);
  const points = subjects.map((subject, i) => {
    const angle = i * 2.399963 + orbit;
    const radius = 225 + (i % 5) * 95;
    return { ...subject, x: 960 + Math.cos(angle) * radius * 1.35, y: 520 + Math.sin(angle) * radius * 0.71, i };
  });
  return <AbsoluteFill style={{ background: '#143f34', color: c.paper }}>
    <svg width="1920" height="1080" style={{ position: 'absolute', opacity: reveal }}>{points.map((p, i) => <g key={p.id}><path d={`M960 520Q${p.x + 80} ${520 + (p.y - 520) * 0.5} ${p.x} ${p.y}`} stroke={i % 5 === 0 ? '#cda55a' : '#91ac9c'} strokeWidth="1.4" opacity="0.25" fill="none"/><circle cx={p.x} cy={p.y} r={i % 5 === 0 ? 6 : 3} fill={i % 5 === 0 ? '#cda55a' : '#b9cbbf'}/></g>)}</svg>
    {points.map((p) => <div key={p.id} style={{ position: 'absolute', left: p.x + 12, top: p.y - 10, maxWidth: 230, fontSize: p.i % 5 === 0 ? 20 : 15, lineHeight: 1.2, color: p.i % 5 === 0 ? c.paper : '#b9cbbf', opacity: reveal * (p.i % 5 === 0 ? 1 : 0.55) * smooth((Math.max(Math.abs(p.x - 960) / 450, Math.abs(p.y - 520) / 195) - 0.8) / 0.35), transform: `translateY(${(1 - reveal) * 15}px)` }}>{p.name}</div>)}
    <div style={{ position: 'absolute', left: 88, top: 80 }}><Brand light size={31}/></div>
    <div style={{ position: 'absolute', left: 560, top: 378, width: 800, textAlign: 'center', padding: '48px 0', background: '#143f34ee' }}><div style={{ fontFamily: fonts.title, fontSize: 80, letterSpacing: '-0.04em', lineHeight: 1.02 }}>Follow your<br/>curiosity.</div><div style={{ display: 'flex', justifyContent: 'center', gap: 38, marginTop: 31, color: c.pineSoft, fontSize: 17 }}><span>31 knowledge graphs</span><span>49 interactive components</span></div></div>
    <div style={{ position: 'absolute', bottom: 75, left: 0, right: 0, textAlign: 'center', color: c.pineSoft, ...mono, fontSize: 14 }}>ASK · EXPLORE · PRACTICE · UNDERSTAND</div>
  </AbsoluteFill>;
}

function TutorScene({ duration }: { duration?: number }) {
  return <Lesson duration={duration} styles/>;
}

const content = [Desk, KnowledgeWorld, LearningPath, WaveExperiment, LensExperiment, TutorScene, Materials, Practice, SubjectWorld, EndFrame];
export function LaunchFilm() {
  return <AbsoluteFill style={{ fontFamily: fonts.body, color: c.ink, background: c.paper }}>
    {launchScenes.map((scene, i) => {
      const Content = content[i];
      const length = scene.end - scene.start;
      return <Sequence key={scene.id} from={scene.start} durationInFrames={length + (i === content.length - 1 ? 0 : 12)}><Scene first={i === 0}><Content duration={length}/></Scene></Sequence>;
    })}
    <Img src={staticFile('textures/paper.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.022, pointerEvents: 'none', mixBlendMode: 'multiply' }}/>
    <Audio src={staticFile('sfx/launch-score.wav')}/>
  </AbsoluteFill>;
}
