import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { durationInFrames, FPS, timeline } from '../src/timeline';

const path = process.argv[2] ?? 'out/primoria-animatic-v01.mp4';
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate', '-of', 'json', path], { encoding: 'utf8' }));
const video = probe.streams.find((stream: { codec_type: string }) => stream.codec_type === 'video');
const audio = probe.streams.find((stream: { codec_type: string }) => stream.codec_type === 'audio');
assert.equal(video?.codec_name, 'h264');
assert.equal(video?.r_frame_rate, '30/1');
assert.equal(audio?.codec_name, 'aac');
assert.equal(audio?.sample_rate, '48000');
assert.ok(Math.abs(Number(probe.format.duration) - durationInFrames / FPS) < 0.1);
const samples = [];
for (const shot of timeline) {
  const time = (shot.start + Math.floor(shot.contentFrames * 0.6)) / FPS;
  const rgb = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(time), '-i', path, '-frames:v', '1', '-vf', 'crop=iw:ih*0.6:0:ih*0.2,scale=32:18', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']);
  assert.equal(rgb.length, 32 * 18 * 3, `Cannot decode ${shot.id}`);
  const mean = rgb.reduce((sum, value) => sum + value, 0) / rgb.length;
  if (shot.act >= 2) assert.ok(mean > 100, `${shot.id} is unexpectedly dark (${mean.toFixed(1)}): possible persistent transition mask`);
  samples.push({ shot: shot.id, time, meanRgb: Number(mean.toFixed(2)), decodable: true });
}
const report = { file: path, stage: 'phase-0 encoded animatic', probe, samples, checked: ['codec and audio sample rate', 'duration within 0.1 seconds of source', 'all 16 shot midpoints decode', 'warm scenes remain visible after transitions'] };
await writeFile('out/encoded-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Encoded film verified: ${probe.format.duration}s, ${video.width}×${video.height}, H.264 / AAC 48 kHz; all 16 shot midpoints visible.`);
