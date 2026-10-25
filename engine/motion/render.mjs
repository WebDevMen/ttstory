// Motion renderer: renders every `motion:` shot of build/<id>/timeline.json with Remotion.
//   node engine/motion/render.mjs <project> [workers] [frame...] [--force]
// Full-frame shots   -> build/<id>/drawn/<shot>/<frame>.jpg (+ meta.json), picked up by the scene layer like draw shots.
// Overlays on plates -> build/<id>/motion/<shot>/<frame>.png (transparent), composited by the scene layer.
// Unchanged shots are skipped (hash of the shot, its words and the engine code).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderFrames, renderStill, selectComposition} from '@remotion/renderer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
// a Chromium headless shell: $VG_CHROME, or the one Playwright installed (cloud image / ~/.cache), else Remotion downloads its own
function findBrowser() {
  if (process.env.VG_CHROME) return process.env.VG_CHROME;
  const roots = ['/opt/pw-browsers', path.join(process.env.HOME || '', '.cache', 'ms-playwright')];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()) {
      const f = path.join(r, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
      if (fs.existsSync(f)) return f;
    }
  }
  return null;
}
const BROWSER = findBrowser();

const args = process.argv.slice(2);
const force = args.includes('--force');
const [pid, workersArg, ...rest] = args.filter((a) => a !== '--force');
const workers = Math.max(1, Number(workersArg || 4));
const only = rest.length ? new Set(rest.map(Number)) : null;

const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', pid, 'timeline.json'), 'utf8'));
const fps = tl.fps;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
function codeHash() {
  const h = crypto.createHash('sha1');
  for (const f of [...walk(path.join(HERE, 'src')), path.join(HERE, 'package.json')].sort()) h.update(f).update(fs.readFileSync(f));
  for (const f of walk(path.join(ROOT, 'projects', pid, 'art')).sort()) h.update(f).update(String(fs.statSync(f).mtimeMs));
  return h.digest('hex');
}

// frame ranges with a margin for transitions (same rule as the draw renderer)
const ranges = [];
tl.shots.forEach((s, i) => {
  if (!s.motion) return;
  const tr = s.transition || {}, next = tl.shots[i + 1], ntr = (next && next.transition) || {};
  const padB = tr.type && tr.type !== 'cut' && tr.type !== 'fade' ? (tr.dur ?? 0.36) / 2 + 0.1 : 0;
  const padA = next && ntr.type && ntr.type !== 'cut' && ntr.type !== 'fade' ? (ntr.dur ?? 0.36) / 2 + 0.1 : 0;
  const tail = tr.type === 'dissolve' || ntr.type === 'dissolve' ? 0.6 : 0;
  ranges.push({shot: s, overlay: !!s.plate, f0: Math.max(0, Math.floor((s.start - padB) * fps)), f1: Math.min(tl.frames, Math.ceil((s.end + padA + tail) * fps) + 1)});
});
if (!ranges.length) { console.log('  no motion shots'); process.exit(0); }

const code = codeHash();
const outDir = (r) => path.join(ROOT, 'build', pid, r.overlay ? 'motion' : 'drawn', r.shot.id);
const ext = (r) => (r.overlay ? 'png' : 'jpg');
const jobs = [];
for (const r of ranges) {
  const words = tl.words.filter((w) => w.start >= r.shot.start - 2 && w.start <= r.shot.end + 1).map(({text, start, end}) => ({text, start, end}));
  r.props = {pid, fps, words, overlay: r.overlay, f0: r.f0, frames: r.f1 - r.f0,
    shot: {id: r.shot.id, start: r.shot.start, end: r.shot.end, motion: r.shot.motion}};
  r.hash = crypto.createHash('sha1').update(JSON.stringify([r.props, code])).digest('hex');
  fs.mkdirSync(outDir(r), {recursive: true});
  const name = (f) => path.join(outDir(r), `${String(f).padStart(5, '0')}.${ext(r)}`);
  if (only) {
    const fr = [...only].filter((f) => f >= r.f0 && f < r.f1 && (force || !fs.existsSync(name(f)) || readHash(r) !== r.hash));
    if (fr.length) jobs.push({r, frames: fr, name});
    continue;
  }
  if (!force && readHash(r) === r.hash && fs.existsSync(name(r.f1 - 1))) { console.log(`  motion ${r.shot.id}: up to date`); continue; }
  jobs.push({r, frames: null, name});
}
function readHash(r) {
  const f = path.join(outDir(r), 'hash.txt');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
}
if (!jobs.length) process.exit(0);

// bundle once per code version (public dir = the project folder, so `src: art/x.png` works)
const bdir = path.join(ROOT, 'build', pid, 'motion-bundle');
const bkey = path.join(bdir, 'key.txt');
let serveUrl = path.join(bdir, 'site');
if (!fs.existsSync(bkey) || fs.readFileSync(bkey, 'utf8') !== code) {
  const t0 = Date.now();
  fs.rmSync(bdir, {recursive: true, force: true});
  fs.mkdirSync(bdir, {recursive: true});
  serveUrl = await bundle({entryPoint: path.join(HERE, 'src', 'index.ts'), publicDir: path.join(ROOT, 'projects', pid), outDir: serveUrl,
    onProgress: () => {}});
  fs.writeFileSync(bkey, code);
  console.log(`  motion bundle ready (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

const browser = await openBrowser('chrome', {browserExecutable: BROWSER, logLevel: 'error', chromiumOptions: {gl: 'swangle'}});
const t0 = Date.now();
let total = 0;
for (const {r, frames, name} of jobs) {
  const comp = await selectComposition({serveUrl, id: 'Shot', inputProps: r.props, puppeteerInstance: browser, browserExecutable: BROWSER, logLevel: 'error'});
  const fmt = r.overlay ? 'png' : 'jpeg';
  if (frames) {
    for (const f of frames) {
      await renderStill({composition: comp, serveUrl, inputProps: r.props, frame: f - r.f0, output: name(f), imageFormat: fmt, ...(fmt === 'jpeg' ? {jpegQuality: 94} : {}),
        puppeteerInstance: browser, browserExecutable: BROWSER, logLevel: 'error', overwrite: true});
      total++;
    }
  } else {
    const tmp = path.join(outDir(r), '_tmp');
    fs.rmSync(tmp, {recursive: true, force: true});
    fs.mkdirSync(tmp, {recursive: true});
    await renderFrames({composition: comp, serveUrl, inputProps: r.props, outputDir: tmp, imageFormat: fmt, ...(fmt === 'jpeg' ? {jpegQuality: 94} : {}),
      concurrency: workers, puppeteerInstance: browser, browserExecutable: BROWSER, logLevel: 'error', onStart: () => {}, onFrameUpdate: () => {},
      imageSequencePattern: '[frame].[ext]'});
    const num = (f) => Number(f.match(/(\d+)\.\w+$/)[1]);
    const files = fs.readdirSync(tmp).filter((f) => /\d+\.(jpe?g|png)$/.test(f)).sort((a, b) => num(a) - num(b));
    files.forEach((f, i) => fs.renameSync(path.join(tmp, f), name(r.f0 + i)));
    fs.rmSync(tmp, {recursive: true, force: true});
    fs.writeFileSync(path.join(outDir(r), 'hash.txt'), r.hash);
    total += files.length;
    console.log(`  motion ${r.shot.id}: ${files.length} frames`);
  }
  if (!r.overlay) {          // camera/anchors for the scene layer (static: the motion engine moves its own camera)
    const meta = {f0: r.f0, f1: r.f1, frames: {}};
    for (let f = r.f0; f < r.f1; f++) meta.frames[f] = {cam: {x: 540, y: 960, z: 1}, anchors: {}};
    fs.writeFileSync(path.join(outDir(r), 'meta.json'), JSON.stringify(meta));
  }
}
await browser.close({silent: true});
console.log(`  motion: ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
