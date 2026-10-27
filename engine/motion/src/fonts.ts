// Fonts are bundled from @fontsource (offline, Cyrillic included); the render waits until they are ready,
// so text is always measured and drawn with the real typeface.
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/800.css';
import '@fontsource/unbounded/900.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/kurale/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import {continueRender, delayRender} from 'remotion';

const FACES = ['600 40px Unbounded', '800 40px Unbounded', '900 40px Unbounded', '700 40px Manrope', '800 40px Manrope', '400 40px Kurale', '700 40px "JetBrains Mono"'];
const TEXT = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789ABCabc«»—%+−';

export const fontsHandle = delayRender('fonts');
Promise.all(FACES.map((f) => document.fonts.load(f, TEXT)))
  .then(() => document.fonts.ready)
  .then(() => continueRender(fontsHandle))
  .catch((e) => { console.error('font load failed', e); continueRender(fontsHandle); });
