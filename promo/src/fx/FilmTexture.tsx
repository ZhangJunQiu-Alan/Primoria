import { AbsoluteFill, Img, interpolate, staticFile } from 'remotion';

export function FilmTexture({ frame, cold }: { frame: number; cold: boolean }) {
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <Img src={staticFile('textures/paper.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, mixBlendMode: 'multiply' }} />
    <Img src={staticFile(`textures/grain-${String(frame % 24).padStart(2, '0')}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }} />
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.25 }}><defs><radialGradient id="optical-vignette"><stop offset="45%" stopColor="black" stopOpacity="0" /><stop offset="100%" stopColor="black" stopOpacity="1" /></radialGradient></defs><rect width="100%" height="100%" fill="url(#optical-vignette)" /></svg>
    {cold && <AbsoluteFill style={{ background: '#1a2230', opacity: 0.2 }} />}
  </AbsoluteFill>;
}

export function Letterbox({ amount }: { amount: number }) {
  const height = interpolate(amount, [0, 1], [0, (1080 - 1920 / 2.39) / 2]);
  return <AbsoluteFill style={{ pointerEvents: 'none' }}><div style={{ position: 'absolute', top: 0, width: '100%', height, background: '#11110f' }} /><div style={{ position: 'absolute', bottom: 0, width: '100%', height, background: '#11110f' }} /></AbsoluteFill>;
}
