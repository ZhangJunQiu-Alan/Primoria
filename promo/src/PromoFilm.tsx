import { Fragment } from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, getStaticFiles, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { z } from 'zod';
import { StoryboardShot } from './shots/StoryboardShot';
import { FilmTexture, Letterbox } from './fx/FilmTexture';
import { InkDissolve } from './fx/InkDissolve';
import { Captions } from './captions/Captions';
import { fonts } from './theme/fonts';
import { durationInFrames, timeline } from './timeline';

export const filmSchema = z.object({ captions: z.boolean().default(true), music: z.boolean().default(true) });
export type FilmProps = z.infer<typeof filmSchema>;
export const defaultProps: FilmProps = { captions: true, music: true };

function Chrome({ offset }: { offset: number }) {
  const frame = useCurrentFrame() + offset;
  const shot = timeline.find((entry) => frame >= entry.start && frame < entry.start + entry.contentFrames) ?? timeline[timeline.length - 1];
  const warmStart = timeline[2].start;
  const endStart = timeline[15].start;
  const letterbox = frame < warmStart ? 1 : frame < warmStart + 30 ? interpolate(frame, [warmStart, warmStart + 30], [1, 0], { easing: Easing.bezier(0.83, 0, 0.17, 1) }) : frame >= endStart + 90 ? interpolate(frame, [endStart + 90, endStart + 135], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <FilmTexture frame={frame} cold={shot.act === 1}/>
    <Letterbox amount={letterbox}/>
    <div style={{ position: 'absolute', top: 44, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: shot.act === 1 || letterbox > 0.5 ? '#eee9df' : '#6b655c', fontFamily: fonts.mono, fontSize: 17, letterSpacing: '0.09em' }}><span>PRIMORIA / A DROP OF INK</span><span>ANIMATIC 01 · TEMP VO · PLACEHOLDER VISUALS</span></div>
    <div style={{ position: 'absolute', bottom: 45, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', color: shot.act === 1 || letterbox > 0.5 ? '#eee9df' : '#6b655c', fontFamily: fonts.mono, fontSize: 17, letterSpacing: '0.08em' }}><span>{shot.id} / 16</span><span>{(frame / 30).toFixed(1).padStart(4, '0')}s / {(durationInFrames / 30).toFixed(1)}s</span></div>
    <div style={{ position: 'absolute', bottom: 0, height: 3, left: 0, width: `${frame / durationInFrames * 100}%`, background: '#c8881a' }}/>
  </AbsoluteFill>;
}

export function PromoFilm({ captions, music, act }: FilmProps & { act?: number }) {
  const selected = timeline.filter((shot) => act === undefined || shot.act === act);
  const offset = selected[0].start;
  const assets = getStaticFiles();
  const score = assets.some((file) => file.name === 'music/score.mp3');
  return <AbsoluteFill>
    <TransitionSeries>
      {selected.map((shot, index) => <Fragment key={shot.id}>
        <TransitionSeries.Sequence durationInFrames={shot.duration - (index === selected.length - 1 ? shot.overlap : 0)}><StoryboardShot shot={shot}/></TransitionSeries.Sequence>
        {shot.overlap > 0 && index < selected.length - 1 ? <TransitionSeries.Transition timing={linearTiming({ durationInFrames: shot.overlap })} presentation={{ component: InkDissolve, props: {} }}/> : null}
      </Fragment>)}
    </TransitionSeries>
    {selected.map((shot) => shot.vo ? <Sequence key={shot.vo.id} from={shot.start - offset + shot.vo.offsetFrames} durationInFrames={shot.voFrames}><Audio src={staticFile(`vo/${shot.vo.id}.wav`)}/></Sequence> : null)}
    {music && score ? <Audio src={staticFile('music/score.mp3')} volume={(localFrame) => {
      const frame = localFrame + offset;
      let gain = 0.2;
      for (const shot of timeline) {
        if (!shot.vo) continue;
        const start = shot.start + shot.vo.offsetFrames;
        const end = start + shot.voFrames;
        if (frame >= start - 6 && frame <= end + 6) gain = Math.min(gain, interpolate(frame, [start - 6, start, end, end + 6], [0.2, 0.05, 0.05, 0.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
      }
      return gain;
    }}/> : null}
    {music && !score && assets.some((file) => file.name === 'sfx/preview-beat.wav') ? <Audio src={staticFile('sfx/preview-beat.wav')} startFrom={offset}/> : null}
    <Chrome offset={offset}/>
    {captions && <Captions frameOffset={offset}/>}
  </AbsoluteFill>;
}
