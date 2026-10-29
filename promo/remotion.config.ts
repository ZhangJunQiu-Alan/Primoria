import { Config } from '@remotion/cli/config';
import { existsSync } from 'node:fs';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(16);
Config.setChromiumOpenGlRenderer('angle');
const browserExecutable = process.env.PROMO_BROWSER_EXECUTABLE ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
if (browserExecutable && existsSync(browserExecutable)) Config.setBrowserExecutable(browserExecutable);
