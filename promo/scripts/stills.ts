import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { timeline } from '../src/timeline';

await mkdir('out/stills', { recursive: true });
for (const shot of timeline) {
  const frame = shot.start + Math.floor(shot.contentFrames * 0.6);
  execFileSync('pnpm', ['exec', 'remotion', 'still', 'src/index.ts', 'Stills', `out/stills/${shot.id}.png`, `--frame=${frame}`, '--image-format=png'], { stdio: 'inherit' });
}
