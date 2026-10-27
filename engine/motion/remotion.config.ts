import {Config} from '@remotion/cli/config';

// Studio (`npm run studio`) can use the same headless shell as the renderer: VG_CHROME=/path/to/chrome-headless-shell
if (process.env.VG_CHROME) Config.setBrowserExecutable(process.env.VG_CHROME);
