import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { staticFile } from 'remotion';
import { CameraPlane, cameraEase } from '../camera/Camera3D';
import { fonts } from '../theme/fonts';
import { PALETTE as c } from '../theme/tokens';
import { acts } from '../data/shots';
import type { timeline } from '../timeline';

type TimedShot = typeof timeline[number];
const mono = { fontFamily: fonts.mono, letterSpacing: '0.08em', fontSize: 20 };

function Schematic({ shot, frame }: { shot: TimedShot; frame: number }) {
  const progress = interpolate(frame, [0, shot.contentFrames], [0, 1], { extrapolateRight: 'clamp', easing: cameraEase });
  if (shot.act === 3 || shot.id === 'S15') {
    const points = Array.from({ length: 11 }, (_, index) => ({ x: 70 + index % 4 * 130, y: 80 + Math.floor(index / 4) * 150 }));
    return <svg viewBox="0 0 560 480" width="100%" height="100%">
      {points.slice(1).map((p, i) => <path key={`e${i}`} d={`M ${points[Math.max(0, i - 2)].x} ${points[Math.max(0, i - 2)].y} L ${p.x} ${p.y}`} stroke={c.lineStrong} strokeWidth="2" />)}
      {points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === 10 ? 22 : 12} fill={i / 11 <= progress ? c.pine : c.paperDeep} stroke={i === 10 ? c.amber : c.pineSoft} strokeWidth="2" /><path d={`M ${p.x - 30} ${p.y + 34} h 60`} stroke={c.lineStrong} strokeWidth="5" /></g>)}
    </svg>;
  }
  if (shot.id === 'S10') return <svg viewBox="0 0 560 480" width="100%" height="100%"><path d={Array.from({ length: 240 }, (_, i) => `${i ? 'L' : 'M'} ${i * 2.3} ${210 + Math.sin(i / 17 + progress * 5) * (70 + progress * 30)}`).join(' ')} stroke={c.pine} strokeWidth="4" fill="none"/><path d="M60 370H500" stroke={c.lineStrong} strokeWidth="3"/><circle cx={90 + 350 * progress} cy="370" r="12" fill={c.amber}/></svg>;
  if (shot.id === 'S04') return <svg viewBox="0 0 560 480" width="100%" height="100%"><circle cx="280" cy={130 + progress * 100} r={15 + progress * 45} fill={c.ink}/><ellipse cx="280" cy="330" rx={100 * progress} ry={12 * progress} fill={c.ink} opacity="0.1"/></svg>;
  const count = shot.id === 'S11' ? 3 : shot.id === 'S13' ? 4 : 1;
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 18 }}>
    {Array.from({ length: count }, (_, i) => <div key={i} style={{ width: count > 1 ? 450 / count : 400, height: count > 1 ? 260 : 350, background: c.panel, border: `1px solid ${c.lineStrong}`, padding: 25, transform: `perspective(900px) rotateY(${(i - (count - 1) / 2) * 8}deg)` }}>
      <div style={{ width: 28, height: 4, background: c.pine, marginBottom: 28 }}/>
      {Array.from({ length: 6 }, (_, row) => <div key={row} style={{ height: row === 0 ? 14 : 5, background: row === 0 ? c.pineSoft : c.lineSoft, width: `${row === 5 ? 55 : 100}%`, marginBottom: row === 0 ? 25 : 13 }}/>) }
      {shot.id === 'S12' && <div style={{ fontSize: 68, color: c.correct, marginTop: 10 }}>✓</div>}
    </div>)}
  </div>;
}

export function StoryboardShot({ shot }: { shot: TimedShot }) {
  const frame = useCurrentFrame();
  const cold = shot.act === 1;
  const ink = cold ? '#ece9e1' : c.ink;
  const muted = cold ? '#a4aaa9' : c.muted;
  const reveal = interpolate(frame, [0, 14], [0, 100], { extrapolateRight: 'clamp', easing: cameraEase });
  return <AbsoluteFill style={{ backgroundColor: cold ? '#24282b' : c.paper, color: ink, fontFamily: fonts.body, filter: cold ? 'saturate(0.15) brightness(0.9)' : undefined }}>
    <CameraPlane duration={shot.contentFrames}>
      <div style={{ position: 'absolute', left: 150, top: 200, ...mono, color: muted }}>ACT {String(shot.act).padStart(2, '0')} / {acts[shot.act - 1]}</div>
      <div style={{ position: 'absolute', left: 150, top: 280, width: 990, overflow: 'hidden', clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
        <div style={{ fontFamily: fonts.title, fontSize: shot.id === 'S02' ? 116 : 94, lineHeight: 1.03, fontWeight: 400, letterSpacing: '-0.045em', maxWidth: 1000 }}>{shot.name}</div>
      </div>
      <div style={{ position: 'absolute', left: 155, top: 555, width: 810, fontSize: 30, lineHeight: 1.55, color: muted }}>{shot.description}</div>
      <div style={{ position: 'absolute', left: 155, top: 740, ...mono, fontSize: 17, color: cold ? '#969c9a' : c.pine }}>{shot.camera}</div>
      <div style={{ position: 'absolute', right: 125, top: 275, width: 540, height: 455, opacity: cold ? 0.2 : 0.8 }}>
        {shot.id === 'S16' ? <div style={{ textAlign: 'center', paddingTop: 65 }}><Img src={staticFile('brand/primoria-mark.svg')} style={{ width: 140, height: 154 }}/><div style={{ fontFamily: fonts.title, fontSize: 74, marginTop: 32 }}>Primoria</div></div> : shot.id === 'S02' ? <div style={{ height: 100, width: 3, background: '#ece9e1', position: 'absolute', top: 150, left: 250, opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0.2 }}/> : <Schematic shot={shot} frame={frame}/>}
      </div>
    </CameraPlane>
  </AbsoluteFill>;
}
