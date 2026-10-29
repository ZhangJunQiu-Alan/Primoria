import { shots } from './data/shots';
import { voiceovers } from './data/vo';
import measured from './data/vo-durations.json';

export const FPS = 30;
export const BPM = 100;
export const beatOffsetFrames = 0;
export const DISSOLVE_FRAMES = 15;
export const voiceDurations = measured as Record<string, { seconds: number; frames: number }>;

export const timeline = (() => {
  let cursor = 0;
  return shots.map((shot) => {
    const vo = voiceovers.find((item) => item.shot === shot.id);
    const tailFrames = shot.id === 'S02' ? 15 : 12;
    const voFrames = vo ? (voiceDurations[vo.id]?.frames ?? 0) : 0;
    const contentFrames = Math.max(shot.seconds * FPS, (vo?.offsetFrames ?? 0) + voFrames + tailFrames);
    const overlap = shot.dissolve ? DISSOLVE_FRAMES : 0;
    const entry = { ...shot, vo, voFrames, start: cursor, contentFrames, duration: contentFrames + overlap, overlap };
    cursor += contentFrames;
    return entry;
  });
})();

export const durationInFrames = timeline.reduce((sum, shot) => sum + shot.contentFrames, 0);
export const beatFrame = (frame: number) => Math.round((frame - beatOffsetFrames) / (FPS * 60 / BPM)) * (FPS * 60 / BPM) + beatOffsetFrames;
export const shotAtFrame = (frame: number) => timeline.find((shot) => frame >= shot.start && frame < shot.start + shot.contentFrames) ?? timeline[timeline.length - 1];
