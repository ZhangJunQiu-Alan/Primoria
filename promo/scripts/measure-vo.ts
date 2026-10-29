import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { voiceovers } from '../src/data/vo';

const durations: Record<string, { seconds: number; frames: number }> = {};
for (const { id } of voiceovers) {
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', `public/vo/${id}.wav`], { encoding: 'utf8' }).trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Invalid audio duration: ${id}`);
  durations[id] = { seconds, frames: Math.ceil(seconds * 30) };
}
await writeFile('src/data/vo-durations.json', JSON.stringify(durations, null, 2) + '\n');
console.log(durations);
