import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { timeline, durationInFrames, FPS, voiceDurations } from '../src/timeline';
import { voiceovers } from '../src/data/vo';

assert.equal(timeline.length, 16);
assert.equal(new Set(timeline.map((shot) => shot.id)).size, 16);
assert.ok(durationInFrames >= 85 * FPS && durationInFrames <= 95 * FPS, `Duration ${durationInFrames / FPS}s is outside 85–95s`);
for (const vo of voiceovers) {
  const shot = timeline.find((item) => item.id === vo.shot)!;
  assert.ok(voiceDurations[vo.id]?.frames > 0, `Unmeasured ${vo.id}`);
  assert.ok(existsSync(`public/vo/${vo.id}.wav`), `Missing ${vo.id}.wav`);
  assert.ok(vo.offsetFrames + voiceDurations[vo.id].frames + 12 <= shot.contentFrames, `Narration overflows ${vo.shot}`);
  for (const caption of vo.captions) {
    assert.ok(caption.lines.length >= 1 && caption.lines.length <= 2);
    for (const line of caption.lines) assert.ok(line.length <= 42, `Caption too long (${line.length}): ${line}`);
  }
}
assert.equal(voiceovers.find((vo) => vo.id === 'VO12')?.text.includes('every answer'), false);
console.log(`Timeline verified: ${durationInFrames} frames / ${(durationInFrames / FPS).toFixed(2)} seconds; 16 shots, 13 measured voiceovers, captions within limits.`);
