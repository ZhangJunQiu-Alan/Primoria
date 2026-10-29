import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { durationInFrames, timeline } from '../src/timeline';

const animatic = process.argv.includes('--animatic');
await mkdir('out', { recursive: true });
const output = animatic ? 'out/primoria-animatic-v01.mp4' : 'out/primoria-film.mp4';
const started = performance.now();
execFileSync('pnpm', ['exec', 'remotion', 'render', 'src/index.ts', 'PromoFilm', output, '--codec=h264', '--crf=16', '--audio-codec=aac', '--audio-bitrate=192k', '--pixel-format=yuv420p', `--scale=${animatic ? 0.5 : 1}`, '--concurrency=2'], { stdio: 'inherit' });
const report = { stage: 'phase-0 animatic; placeholder visuals and temporary narration', file: output, frames: durationInFrames, durationSeconds: durationInFrames / 30, renderSeconds: (performance.now() - started) / 1000, resolution: animatic ? '960x540' : '1920x1080', shots: timeline.map(({ id, start, contentFrames }) => ({ id, startSeconds: start / 30, durationSeconds: contentFrames / 30 })) };
await writeFile('out/render-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
