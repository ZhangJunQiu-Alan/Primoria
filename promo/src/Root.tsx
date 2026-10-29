import { LaunchFilm, LAUNCH_DURATION } from './LaunchFilm';
import { Composition } from 'remotion';
import { PromoFilm, defaultProps, filmSchema } from './PromoFilm';
import { FPS, durationInFrames, timeline } from './timeline';
import { DirectionStudy, STUDY_DURATION } from './DirectionStudy';

export function RemotionRoot() {
  return <>
    <Composition id="LaunchFilm" component={LaunchFilm} width={1920} height={1080} fps={FPS} durationInFrames={LAUNCH_DURATION}/>
    <Composition id="DirectionStudy" component={DirectionStudy} width={1920} height={1080} fps={FPS} durationInFrames={STUDY_DURATION}/>
    <Composition id="PromoFilm" component={PromoFilm} width={1920} height={1080} fps={FPS} durationInFrames={durationInFrames} defaultProps={{ captions: true, music: true }} schema={filmSchema} calculateMetadata={() => ({ durationInFrames })}/>
    {Array.from({ length: 6 }, (_, index) => {
      const act = index + 1;
      const duration = timeline.filter((shot) => shot.act === act).reduce((sum, shot) => sum + shot.contentFrames, 0);
      return <Composition key={act} id={`Act${act}`} component={PromoFilm} width={1920} height={1080} fps={FPS} durationInFrames={duration} defaultProps={{ ...defaultProps, act }} />;
    })}
    <Composition id="Stills" component={PromoFilm} width={1920} height={1080} fps={FPS} durationInFrames={durationInFrames} defaultProps={{ captions: false, music: false }}/>
  </>;
}
