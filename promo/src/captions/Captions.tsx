import { useCurrentFrame } from 'remotion';
import { fonts } from '../theme/fonts';
import { timeline } from '../timeline';

export function Captions({ frameOffset }: { frameOffset: number }) {
  const frame = useCurrentFrame() + frameOffset;
  for (const shot of timeline) {
    const vo = shot.vo;
    if (!vo) continue;
    const local = frame - shot.start - vo.offsetFrames;
    if (local < 0 || local >= shot.voFrames) continue;
    const weights = vo.captions.map((caption) => caption.lines.join(' ').split(/\s+/).length);
    const total = weights.reduce((sum, value) => sum + value, 0);
    const wordPosition = local / shot.voFrames * total;
    let cursor = 0;
    const index = weights.findIndex((weight) => { cursor += weight; return wordPosition < cursor; });
    const caption = vo.captions[Math.max(0, index)];
    return <div style={{ position: 'absolute', bottom: 151, left: 240, right: 240, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}><div style={{ fontFamily: fonts.body, fontSize: 33, lineHeight: 1.35, fontWeight: 400, color: '#fffefb', textAlign: 'center', background: 'rgba(26,24,20,0.91)', padding: '12px 24px', whiteSpace: 'pre-line' }}>{caption.lines.join('\n')}</div></div>;
  }
  return null;
}
