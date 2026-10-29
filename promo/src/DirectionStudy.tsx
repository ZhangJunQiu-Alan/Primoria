import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import type { CSSProperties, ReactNode } from 'react';
import { fonts } from './theme/fonts';
import { PALETTE as c } from './theme/tokens';
import data from './data/hero-graph.json';

export const STUDY_DURATION = 540;
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const between = (f: number, a: number, b: number) => ease((f - a) / (b - a));
const label: CSSProperties = { fontFamily: fonts.mono, fontSize: 17, letterSpacing: '0.07em', textTransform: 'uppercase' };

export function Brand({ light = false, size = 32 }: { light?: boolean; size?: number }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.35, color: light ? c.paper : c.ink }}><Img src={staticFile('brand/primoria-mark.svg')} style={{ width: size, height: size * 1.1 }}/><span style={{ fontFamily: fonts.title, fontSize: size * 1.3, letterSpacing: '-0.04em' }}>Primoria</span></div>;
}

export function Cursor({ x, y, down = false }: { x: number; y: number; down?: boolean }) {
  return <svg width="42" height="52" viewBox="0 0 42 52" style={{ position: 'absolute', left: x, top: y, zIndex: 20, transform: `scale(${down ? 0.85 : 1})`, filter: 'drop-shadow(0px 3px 2px #0003)' }}><path d="M3 2L4 40 14 31 23 49 31 45 22 28 38 27Z" fill="#fffefb" stroke="#1a1814" strokeWidth="2" /></svg>;
}

export function AttentionDiagram({ small = false }: { small?: boolean }) {
  return <svg viewBox="0 0 600 300" width="100%" style={{ display: 'block' }}>
    {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}>{[0, 1, 2, 3, 4, 5].map((j) => <path key={j} d={`M${70 + i * 90} 60 Q${300 + (i - j) * 20} 145 ${70 + j * 90} 245`} stroke={i === 2 || j === 2 ? c.pine : c.pineSoft} strokeWidth={i === 2 && j === 2 ? 4 : 1.5} fill="none" opacity={i === 2 || j === 2 ? 0.8 : 0.2} />)}<circle cx={70 + i * 90} cy="60" r="14" fill={i === 2 ? c.amber : c.pine}/><circle cx={70 + i * 90} cy="245" r="14" fill={i === 2 ? c.amber : c.pine}/></g>)}
    {!small && <text x="300" y="160" textAnchor="middle" fontFamily={fonts.title} fontSize="32" fill={c.ink}>Attention(Q, K, V)</text>}
  </svg>;
}

export function Paper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', width: 430, minHeight: 500, padding: 44, background: '#fffef8', boxShadow: '0 24px 42px #17252120, 0 2px 3px #17252110', border: '1px solid #1e4d4010', ...style }}>{children}</div>;
}

export function Desk({ duration = 120 }: { duration?: number }) {
  const f = useCurrentFrame() * 120 / duration;
  const move = between(f, 0, 120);
  const prompt = between(f, 12, 38);
  const question = 'Help me understand how Transformers work.';
  const typed = question.slice(0, Math.floor(interpolate(f, [33, 76], [0, question.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const exit = between(f, 100, 120);
  return <AbsoluteFill style={{ background: '#e9eee7', overflow: 'hidden', perspective: 1800 }}>
    <div style={{ position: 'absolute', inset: -150, transform: `translate(${move * -50}px, ${move * 40}px) rotate(${move * 3 - 2}deg) scale(${1 + move * 0.08})`, filter: `blur(${prompt * 1.5}px)` }}>
      <Paper style={{ left: 180, top: -90, transform: 'rotate(-16deg)', background: '#e6e0cf' }}><div style={{ ...label, fontSize: 13 }}>LECTURE 03 / NEURAL NETWORKS</div><div style={{ fontFamily: fonts.title, fontSize: 40, margin: '24px 0' }}>Attention is a relationship.</div><AttentionDiagram small/><div style={{ fontFamily: fonts.title, fontSize: 31, marginTop: 20 }}>softmax(QKᵀ / √dₖ)V</div></Paper>
      <Paper style={{ left: 1150, top: -130, width: 520, transform: 'rotate(14deg)' }}><div style={{ ...label, fontSize: 14 }}>LINEAR ALGEBRA</div><svg viewBox="0 0 440 330" width="100%"><path d="M60 280L380 280M110 315L110 30" stroke={c.muted} strokeWidth="1"/><path d="M110 280L320 60M110 280L390 170" stroke={c.pine} strokeWidth="4"/><path d="M110 280L340 170L390 60L160 170Z" fill={c.pine} opacity="0.1"/><text x="290" y="105" fontSize="26" fontFamily={fonts.title}>u + v</text></svg><div style={{ fontFamily: fonts.title, fontSize: 38 }}>A different perspective.</div></Paper>
      <Paper style={{ left: -20, top: 700, transform: 'rotate(11deg)', width: 520, background: '#173f35', color: '#e3ece6' }}><div style={{ ...label, fontSize: 13 }}>EXPERIMENT 07</div><svg viewBox="0 0 520 230" width="100%"><path d={Array.from({ length: 200 }, (_, i) => `${i ? 'L' : 'M'}${i * 2.6},${120 + Math.sin(i / 12) * 75}`).join(' ')} fill="none" stroke="#c8881a" strokeWidth="3"/></svg><div style={{ fontFamily: fonts.title, fontSize: 48 }}>Waves, in motion.</div></Paper>
      <Paper style={{ left: 1310, top: 700, transform: 'rotate(-13deg)', background: '#d9d2ba' }}><div style={{ ...label, fontSize: 13 }}>YOUR NOTES</div>{['What connects these ideas?', 'Where should I start?', 'Why does this work?'].map((line) => <div key={line} style={{ fontFamily: fonts.title, fontSize: 33, marginTop: 38, borderBottom: '1px solid #1e4d4033', paddingBottom: 16 }}>{line}</div>)}</Paper>
    </div>
    <div style={{ position: 'absolute', top: 90, left: 95 }}><Brand size={38}/></div>
    <div style={{ position: 'absolute', left: 340 - exit * 1100, top: 405 - prompt * 75, width: 1240, transform: `perspective(1800px) rotateX(${8 - prompt * 8}deg) translateY(${(1 - prompt) * 60}px) scale(${0.94 + prompt * 0.06 + exit * 0.9})`, opacity: prompt, boxShadow: '0 32px 90px #18392b24', borderRadius: 22, background: c.panel, border: '1px solid #fff', padding: '42px 48px 28px' }}>
      <div style={{ fontSize: 43, lineHeight: 1.4, height: 155, color: c.ink, letterSpacing: '-0.03em' }}>{typed}<span style={{ color: c.pine }}>│</span></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: c.muted, fontSize: 23 }}><div style={{ display: 'flex', gap: 28, alignItems: 'center' }}><span style={{ fontSize: 38 }}>＋</span><span>AI Tutor</span><span style={{ color: '#9a9d95', fontSize: 19 }}>Deep Learning</span></div><div style={{ width: 65, height: 65, display: 'grid', placeItems: 'center', borderRadius: '50%', background: c.pine, color: 'white', fontSize: 38, transform: `scale(${1 - between(f, 88, 93) * 0.08 + between(f, 94, 99) * 0.08})` }}>↑</div></div>
    </div>
    <Cursor x={1400 + between(f, 65, 87) * 95} y={730 - between(f, 65, 87) * 146} down={f >= 88 && f <= 94}/>
    <div style={{ position: 'absolute', left: 95, bottom: 85, fontSize: 23, color: c.muted }}>Start with a question.</div>
  </AbsoluteFill>;
}

const nodes = data.nodes.map((node, i) => {
  const angle = i * 2.399963;
  const y = 1 - i / (data.nodes.length - 1) * 2;
  const r = Math.sqrt(1 - y * y);
  return { ...node, x: Math.cos(angle) * r * 760, y: y * 490, z: Math.sin(angle) * r * 630 };
});

export function KnowledgeWorld({ duration = 120 }: { duration?: number }) {
  const f = useCurrentFrame() * 120 / duration;
  const time = f / 30;
  const turn = -0.12 + time * 0.12;
  const camera = 0.86 + between(f, 0, 110) * 0.1;
  const points = nodes.map((node) => {
    const x = node.x * Math.cos(turn) - node.z * Math.sin(turn);
    const z = node.x * Math.sin(turn) + node.z * Math.cos(turn);
    const scale = 1600 / (1600 + z);
    return { ...node, sx: 1020 + x * scale * camera, sy: 530 + node.y * scale * camera, z, scale };
  });
  const byId = new Map(points.map((node) => [node.id, node]));
  const reveal = between(f, 0, 75);
  return <AbsoluteFill style={{ background: '#eef0e7', overflow: 'hidden' }}>
    <svg width="1920" height="1080" style={{ position: 'absolute' }}>
      {data.edges.map((edge, i) => {
        const a = byId.get(edge.from)!; const b = byId.get(edge.to)!;
        const active = a.inPath && b.inPath;
        return <path key={`${edge.from}-${edge.to}-${i}`} d={`M${a.sx} ${a.sy}Q${(a.sx + b.sx) / 2 + (a.z - b.z) * 0.06} ${(a.sy + b.sy) / 2 - 40} ${b.sx} ${b.sy}`} stroke={active ? c.pine : '#a8b5a2'} opacity={active ? 0.62 : 0.22} strokeWidth={active ? 2.6 : 1} fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={active ? 1 - reveal : 0}/>;
      })}
      {points.map((node, i) => <circle key={node.id} cx={node.sx} cy={node.sy} r={(node.inPath ? 9 : 4) * node.scale} fill={node.inPath ? c.pine : '#a3b29d'} opacity={node.inPath ? Math.max(0, Math.min(1, reveal * 2 - i * 0.005)) : 0.45}/>)}
    </svg>
    {points.filter((node) => node.inPath).sort((a, b) => b.z - a.z).map((node) => <div key={node.id} style={{ position: 'absolute', left: Math.max(65, Math.min(1570, node.sx + 19 * node.scale)), top: Math.max(155, Math.min(860, node.sy - 14)), fontFamily: fonts.body, fontSize: 21 * node.scale, color: c.pine, maxWidth: 270, lineHeight: 1.2, opacity: reveal * (1 - between(node.z, 260, 530)) * between(node.sx, 0, 150) * (1 - between(node.sx, 1760, 1920)), background: '#eef0e7b3', padding: '4px 7px' }}>{node.name}</div>)}
    <div style={{ position: 'absolute', left: 88, top: 80 }}><Brand size={31}/></div>
    <div style={{ position: 'absolute', left: 88, bottom: 85, background: '#fffefbe8', padding: '20px 27px', fontSize: 31, letterSpacing: '-0.03em', border: '1px solid #fff' }}>Find the connections.</div>
    <div style={{ position: 'absolute', right: 95, bottom: 90, ...label, fontSize: 14, color: '#657563' }}>SOURCE KNOWLEDGE / LEARNING GOAL</div>
  </AbsoluteFill>;
}

export function WaveExperiment({ duration = 120 }: { duration?: number }) {
  const f = useCurrentFrame() * 120 / duration;
  const phase = between(f, 18, 90) * Math.PI * 2;
  const time = f / 30 * 2.5;
  const path = (kind: number) => Array.from({ length: 500 }, (_, i) => {
    const x = i / 499 * 1540;
    const a = Math.sin(i / 499 * Math.PI * 6 - time);
    const b = Math.sin(i / 499 * Math.PI * 6 - time + phase);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(295 - (kind === 0 ? a : kind === 1 ? b : a + b) * 100).toFixed(1)}`;
  }).join(' ');
  const slider = 460 + phase / (Math.PI * 2) * 820;
  return <AbsoluteFill style={{ background: '#123f34', color: c.paper, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 76, left: 90 }}><Brand light size={31}/></div>
    <div style={{ position: 'absolute', top: 80, right: 100, ...label, fontSize: 16, color: '#b9cbbf' }}>INTERACTIVE / WAVE SUPERPOSITION</div>
    <div style={{ position: 'absolute', left: 140, top: 210, width: 1640, transform: `scale(${1 + f * 0.0004})` }}>
      <svg viewBox="0 0 1540 590" width="100%">
        {Array.from({ length: 15 }, (_, i) => <line key={`v${i}`} x1={i * 110} x2={i * 110} y1="0" y2="590" stroke="#b9cbbf" opacity="0.08"/>)}
        {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="0" x2="1540" y1={i * 98} y2={i * 98} stroke="#b9cbbf" opacity="0.08"/>)}
        <line x1="0" x2="1540" y1="295" y2="295" stroke="#b9cbbf" opacity="0.4"/>
        <path d={path(0)} fill="none" stroke="#b9cbbf" strokeWidth="2" opacity="0.55"/>
        <path d={path(1)} fill="none" stroke="#d3a64f" strokeWidth="2" opacity="0.6"/>
        <path d={path(2)} fill="none" stroke="#fffefb" strokeWidth="5"/>
      </svg>
    </div>
    <div style={{ position: 'absolute', left: 460, top: 860, width: 820, height: 3, background: '#b9cbbf55' }}><div style={{ width: `${phase / (2 * Math.PI) * 100}%`, height: 3, background: '#d3a64f' }}/></div>
    <div style={{ position: 'absolute', left: slider - 10, top: 851, width: 22, height: 22, background: '#fffefb', borderRadius: '50%', boxShadow: '0 0 0 7px #fffefb10' }}/>
    <div style={{ position: 'absolute', left: 460, top: 895, color: '#b9cbbf', fontSize: 20 }}>Phase difference</div><div style={{ position: 'absolute', left: 1260, top: 895, color: '#fffefb', fontFamily: fonts.mono, fontSize: 22 }}>{Math.round(phase / Math.PI * 180)}°</div>
    <Cursor x={slider + 4} y={868} down/>
    <div style={{ position: 'absolute', left: 88, bottom: 58, background: c.paper, padding: '19px 27px', color: c.ink, fontSize: 31, letterSpacing: '-0.03em' }}>Change it. Understand it.</div>
  </AbsoluteFill>;
}

export function Lesson({ duration = 105, styles = false }: { duration?: number; styles?: boolean }) {
  const f = useCurrentFrame() * 105 / duration;
  const zoom = 1 + between(f, 0, 100) * 0.1;
  const styleIndex = styles ? (f < 32 ? 0 : f < 68 ? 1 : 2) : 1;
  const answers = [
    'Which words would you need to look at to understand what “it” refers to?',
    'Think of each word as asking a question. Attention finds the words that can help answer it.',
    'Start with Q, K and V. Compare Q with each key, normalize the scores, then take a weighted sum of V.',
  ];
  const answer = answers[styleIndex];
  const answerStart = styles ? [2, 34, 70][styleIndex] : 6;
  const answerEnd = styles ? [25, 61, 97][styleIndex] : 80;
  return <AbsoluteFill style={{ background: '#eceee5', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: '58px 80px', display: 'flex', background: c.panel, border: `1px solid ${c.lineStrong}`, boxShadow: '0 16px 70px #1e4d4015', transform: `perspective(2200px) rotateY(${2 - f * 0.025}deg) scale(${zoom})`, transformOrigin: '55% 52%' }}>
      <div style={{ width: 240, borderRight: `1px solid ${c.lineSoft}`, padding: '32px 24px', background: c.paper }}><Brand size={27}/><div style={{ marginTop: 80, ...label, fontSize: 12 }}>YOUR COURSE</div>{['Neural networks', 'Attention', 'Transformers'].map((item, i) => <div key={item} style={{ marginTop: 32, fontSize: 18, padding: '15px 10px', color: i === 1 ? c.pine : c.muted, background: i === 1 ? '#e3ece6' : undefined }}>{String(i + 1).padStart(2, '0')}　{item}</div>)}</div>
      <div style={{ flex: 1, padding: '42px 55px' }}><div style={{ ...label, fontSize: 13, color: c.muted }}>DEEP LEARNING / ATTENTION</div><div style={{ fontFamily: fonts.title, fontSize: 66, marginTop: 47, letterSpacing: '-0.04em' }}>Every word has a question.</div><div style={{ fontSize: 24, lineHeight: 1.6, color: c.muted, marginTop: 20 }}>Self-attention learns which words matter<br/>to each other. Explore the connections.</div><div style={{ marginTop: 42, background: '#eef0e7', padding: 30 }}><AttentionDiagram/></div><div style={{ display: 'flex', gap: 14, marginTop: 30 }}>{['The', 'cat', 'sat', 'on', 'the', 'mat'].map((word, i) => <span key={`${word}${i}`} style={{ padding: '9px 16px', background: i === 2 ? c.pine : '#eeeae0', color: i === 2 ? '#fffefb' : c.ink, fontFamily: fonts.mono, fontSize: 19 }}>{word}</span>)}</div></div>
      <div style={{ width: 375, borderLeft: `1px solid ${c.lineSoft}`, padding: '42px 27px' }}><div style={{ ...label, fontSize: 14, color: c.pine }}>AI TUTOR</div><div style={{ marginTop: 65, padding: 22, background: c.paper, lineHeight: 1.5, fontSize: 23 }}>Can you explain it another way?</div><div style={{ marginTop: 40, fontSize: 23, lineHeight: 1.65, color: c.ink }}>{answer.slice(0, Math.floor(between(f, answerStart, answerEnd) * answer.length))}</div><div style={{ marginTop: 60, color: c.pine, fontSize: 20, borderTop: `1px solid ${c.lineSoft}`, paddingTop: 20 }}>{['Socratic', 'Feynman', 'Euclid'][styleIndex]} style</div></div>
    </div>
    <div style={{ position: 'absolute', bottom: 36, left: 88, padding: '16px 24px', background: '#fffefbe8', fontSize: 29 }}>Keep asking.</div>
  </AbsoluteFill>;
}

export function EndFrame({ duration = 75 }: { duration?: number }) {
  const f = useCurrentFrame() * 75 / duration;
  const p = spring({ frame: f, fps: 30, config: { damping: 200 }, durationInFrames: 30 });
  return <AbsoluteFill style={{ background: c.paper, alignItems: 'center', justifyContent: 'center' }}><div style={{ transform: `translateY(${(1 - p) * 35}px) scale(${0.94 + p * 0.06})`, opacity: p }}><Brand size={100}/></div><div style={{ fontSize: 31, letterSpacing: '-0.02em', marginTop: 44, color: c.muted, opacity: between(f, 12, 30) }}>From a question to understanding.</div><div style={{ position: 'absolute', bottom: 80, ...label, fontSize: 15, color: c.pine }}>PRIMORIA.APP</div></AbsoluteFill>;
}

export function DirectionStudy() {
  return <AbsoluteFill style={{ fontFamily: fonts.body, color: c.ink }}>
    <Sequence from={0} durationInFrames={120}><Desk/></Sequence>
    <Sequence from={120} durationInFrames={120}><KnowledgeWorld/></Sequence>
    <Sequence from={240} durationInFrames={120}><WaveExperiment/></Sequence>
    <Sequence from={360} durationInFrames={105}><Lesson/></Sequence>
    <Sequence from={465} durationInFrames={75}><EndFrame/></Sequence>
    <Img src={staticFile('textures/paper.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025, pointerEvents: 'none' }}/>
    <Audio src={staticFile('sfx/direction-study.wav')}/>
  </AbsoluteFill>;
}
