import { mkdir, writeFile } from 'node:fs/promises';
import { BPM, FPS, durationInFrames, timeline } from '../src/timeline';

const rate = 48000;
const duration = durationInFrames / FPS;
const samples = Math.ceil(duration * rate);
const buffer = Buffer.alloc(44 + samples * 2);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + samples * 2, 4);
buffer.write('WAVEfmt ', 8);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(rate, 24);
buffer.writeUInt32LE(rate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(samples * 2, 40);
const from = timeline.find((shot) => shot.id === 'S09')!.start / FPS;
const to = timeline.find((shot) => shot.id === 'S13')!.start / FPS;
for (let i = Math.ceil(from * rate); i < Math.min(samples, Math.ceil(to * rate)); i++) {
  const time = i / rate - from;
  const phase = time % (60 / BPM);
  if (phase > 0.045) continue;
  const bar = Math.floor(time / (60 / BPM)) % 4;
  const tone = Math.sin(2 * Math.PI * (bar === 0 ? 660 : 440) * phase);
  const gain = 0.025 * Math.exp(-phase * 110) * Math.min(1, phase * 1000);
  buffer.writeInt16LE(Math.round(tone * gain * 32767), 44 + i * 2);
}
await mkdir('public/sfx', { recursive: true });
await writeFile('public/sfx/preview-beat.wav', buffer);
console.log(`Generated quiet ${BPM} BPM preview click, Act 4 only. Not a final score.`);
