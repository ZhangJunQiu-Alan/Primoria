import { Config } from '@remotion/cli/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

Config.setVideoImageFormat('png');
Config.setDisableSharedMemoryCapture(true);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(16);
Config.setChromiumOpenGlRenderer(process.platform === 'darwin' ? 'angle' : 'swangle');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browserExecutable = process.env.PROMO_BROWSER_EXECUTABLE ?? (process.platform === 'darwin' && existsSync(chrome) ? resolve('scripts/chrome-render.sh') : undefined);
if (browserExecutable && existsSync(browserExecutable)) Config.setBrowserExecutable(browserExecutable);
