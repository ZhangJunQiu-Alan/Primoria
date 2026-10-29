import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';

await mkdir('out/launch-stills', { recursive: true });
const serveUrl = await bundle({ entryPoint: resolve('src/index.ts') });
const chromiumOptions = { gl: 'swangle' as const };
const preferred = process.env.PROMO_BROWSER_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await openBrowser('chrome', { browserExecutable: existsSync(preferred) ? preferred : undefined, chromiumOptions });
try {
  const composition = await selectComposition({ serveUrl, id: 'LaunchFilm', puppeteerInstance: browser, chromiumOptions });
  for (const [scene, frame] of [['question', 155], ['knowledge', 410], ['path', 780], ['wave', 1000], ['lens', 1300], ['tutor', 1570], ['materials', 1990], ['practice', 2260], ['subjects', 2440], ['brand', 2640]] as const) {
    if (process.argv.length > 2 && !process.argv.slice(2).includes(scene)) continue;
    await renderStill({ serveUrl, composition, puppeteerInstance: browser, chromiumOptions, frame, output: `out/launch-stills/${scene}.png`, imageFormat: 'png', scale: 0.5 });
    console.log(scene, frame);
  }
} finally {
  await browser.close({ silent: true });
}
