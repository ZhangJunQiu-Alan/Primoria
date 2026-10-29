import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { timeline } from '../src/timeline';

await mkdir('out/verification', { recursive: true });
const serveUrl = await bundle({ entryPoint: resolve('src/index.ts'), outDir: resolve('out/verification/bundle') });
const preferred = process.env.PROMO_BROWSER_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromiumOptions = { gl: 'swangle' as const };
const browser = await openBrowser('chrome', { browserExecutable: existsSync(preferred) ? preferred : undefined, chromiumOptions });
try {
  const composition = await selectComposition({ serveUrl, id: 'PromoFilm', puppeteerInstance: browser, chromiumOptions, inputProps: { captions: true, music: false } });
  const checks = [];
  for (const id of ['S02', 'S05', 'S06', 'S13', 'S15', 'S16']) {
    const shot = timeline.find((item) => item.id === id)!;
    const frame = shot.start + Math.floor(shot.contentFrames * 0.6);
    const hashes = [];
    for (const pass of ['a', 'b']) {
      const output = `out/verification/${id}-${pass}.png`;
      await renderStill({ serveUrl, composition, puppeteerInstance: browser, chromiumOptions, frame, output, imageFormat: 'png', scale: 0.5, inputProps: { captions: true, music: false } });
      hashes.push(createHash('sha256').update(await readFile(output)).digest('hex'));
    }
    assert.equal(hashes[0], hashes[1], `Frame ${frame} differs between renders`);
    checks.push({ shot: id, frame, renderer: 'swangle', sha256: hashes[0], identical: true });
    console.log(`${id}: frame ${frame} rendered twice, identical PNG bytes`);
  }
  await writeFile('out/verification/frame-determinism.json', JSON.stringify(checks, null, 2) + '\n');
} finally {
  await browser.close({ silent: true });
}
