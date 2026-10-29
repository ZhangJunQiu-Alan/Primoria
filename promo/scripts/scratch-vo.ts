import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { voiceovers } from '../src/data/vo';

await mkdir('public/vo', { recursive: true });
for (const vo of voiceovers) {
  const spoken = vo.text.replace(/^…/, '').replace(/…$/, '.').replace('—', ',');
  execFileSync('say', ['-v', 'Samantha', '-r', '165', '-o', `public/vo/${vo.id}.aiff`, spoken]);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', `public/vo/${vo.id}.aiff`, '-ar', '48000', '-ac', '1', `public/vo/${vo.id}.wav`]);
  console.log(`${vo.id}: generated temporary Samantha narration`);
}
await writeFile('public/vo/provenance.json', JSON.stringify({ kind: 'temporary animatic narration', engine: 'macOS say', voice: 'Samantha', rate: 165 }, null, 2) + '\n');
