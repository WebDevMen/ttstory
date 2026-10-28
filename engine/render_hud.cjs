// Headless-Chromium renderers (Playwright):
//   node engine/render_hud.cjs video  <project> [workers]          HUD over scene frames -> build/<project>/video_hud.mp4
//   node engine/render_hud.cjs stills <project> <frame> [frame...]  -> build/<project>/stills/hud_XXXXX.png
//   node engine/render_hud.cjs draw   <project> [workers] [frame...] [--force]
//        code-drawn shots -> build/<project>/drawn/<shot>/<frame>.jpg + meta.json (camera + anchors per frame);
//        unchanged shots are skipped (hash of the shot spec + actor code), explicit frames are always rendered.
//   node engine/render_hud.cjs layout <project> [step] [mstep] [--shots=a,b] [--workers=3]   layout audit: item boxes + captions of sampled frames
//        of every draw shot -> build/<project>/layout/frames.json + f_XXXXX.jpg (analysed by engine/layout.py)
// Needs an http server serving the repository root on $PORT (vg.py starts one automatically).
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8765;
const ROOT = path.resolve(__dirname, "..");

async function openPage(browser, pid) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) console.error("[page]", m.text()); });
  page.on("pageerror", (e) => { console.error("[pageerror]", e.message); process.exitCode = 2; });
  await page.goto(`http://127.0.0.1:${PORT}/engine/hud/index.html?project=${encodeURIComponent(pid)}`);
  await page.waitForFunction(() => window.hudReady === true, null, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

function launch() {
  const opts = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync",
    "--font-render-hinting=none", "--force-color-profile=srgb",
    // CPU tile raster: with SwiftShader GPU raster, frames with many big glowing layers (box-shadows, filters) lose whole
    // 512 px tiles (they come out black). Compositing (and WebGL for three.js) stays on the GPU.
    "--disable-gpu-rasterization"] };
  if (process.env.CHROMIUM) opts.executablePath = process.env.CHROMIUM;
  return chromium.launch(opts);
}

function bg(pid, frame, info) {
  const f = path.join(ROOT, "build", pid, "frames", `${String(frame).padStart(5, "0")}.jpg`);
  if (fs.existsSync(f)) return `/build/${pid}/frames/${String(frame).padStart(5, "0")}.jpg`;
  return null;
}

async function renderRange(browser, pid, fps, start, end, outFile) {
  const page = await openPage(browser, pid);
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", outFile], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = start; f < end; f++) {
    const src = bg(pid, f);
    if (!src) throw new Error(`missing scene frame ${f} — run: python3 vg.py scene ${pid}`);
    await page.evaluate(([fr, s]) => window.renderFrame(fr, s), [f, src]);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if ((f - start) % 90 === 0) console.log(`  [${start}-${end}] frame ${f} (${((Date.now() - t0) / (f - start + 1)).toFixed(0)} ms/f)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await page.close();
}

// ------------------------------------------------------------------ draw shots
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
function codeHash(pid) {
  const h = crypto.createHash("sha1");
  const files = [...walk(path.join(ROOT, "engine", "hud", "draw")), path.join(ROOT, "engine", "hud", "lib.js"),
    ...walk(path.join(ROOT, "projects", pid, "actors")), path.join(ROOT, "projects", pid, "draw.css")].filter((f) => fs.existsSync(f)).sort();
  for (const f of files) h.update(f).update(fs.readFileSync(f));
  return h.digest("hex");
}
function drawRanges(tl) {
  const out = [];
  tl.shots.forEach((s, i) => {
    if (!s.draw || s.draw.engine === "motion") return;
    const tr = s.transition || {}, next = tl.shots[i + 1], ntr = (next && next.transition) || {};
    const padB = tr.type && tr.type !== "cut" && tr.type !== "fade" ? (tr.dur ?? 0.36) / 2 + 0.1 : 0;
    const padA = next && ntr.type && ntr.type !== "cut" && ntr.type !== "fade" ? (ntr.dur ?? 0.36) / 2 + 0.1 : 0;
    out.push({ shot: s, f0: Math.max(0, Math.floor((s.start - padB) * tl.fps)), f1: Math.min(tl.frames, Math.ceil((s.end + padA) * tl.fps) + 1) });
  });
  return out;
}

async function drawMode(browser, pid, tl, workers, frames, force) {
  const ranges = drawRanges(tl);
  if (!ranges.length) { console.log("  no draw shots"); return; }
  const code = codeHash(pid);
  const dir = (sid) => path.join(ROOT, "build", pid, "drawn", sid);
  const jobs = [], full = new Set();
  for (const r of ranges) {
    const sid = r.shot.id;
    fs.mkdirSync(dir(sid), { recursive: true });
    const words = tl.words.filter((w) => w.scene === r.shot.scene);
    r.hash = crypto.createHash("sha1").update(JSON.stringify([r.shot, words, tl.fps, r.f0, r.f1, tl.hud.map((x) => x.anchor || null), code])).digest("hex");
    if (frames) { for (const f of frames) if (f >= r.f0 && f < r.f1) jobs.push([sid, f]); continue; }
    const hf = path.join(dir(sid), "hash.txt");
    const done = !force && fs.existsSync(hf) && fs.readFileSync(hf, "utf8") === r.hash && fs.existsSync(path.join(dir(sid), `${String(r.f1 - 1).padStart(5, "0")}.jpg`));
    if (done) { console.log(`  draw ${sid}: up to date`); continue; }
    full.add(sid);
    for (let f = r.f0; f < r.f1; f++) jobs.push([sid, f]);
  }
  if (!jobs.length) return;
  console.log(`  drawing ${jobs.length} frames of ${new Set(jobs.map((j) => j[0])).size} shot(s) with ${workers} workers`);
  const meta = {};
  const per = Math.ceil(jobs.length / workers);
  const t0 = Date.now();
  let count = 0;
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, async (_, w) => {
    const page = await browser.newPage({ viewport: { width: tl.width, height: tl.height }, deviceScaleFactor: 1 });
    page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) console.error("[draw]", m.text()); });
    page.on("pageerror", (e) => { console.error("[draw pageerror]", e.message); process.exitCode = 2; });
    await page.goto(`http://127.0.0.1:${PORT}/engine/hud/draw.html?project=${encodeURIComponent(pid)}`);
    await page.waitForFunction(() => window.drawReady === true, null, { timeout: 180000 });
    for (const [sid, f] of jobs.slice(w * per, (w + 1) * per)) {
      const m = await page.evaluate(([s, fr]) => window.drawShotFrame(s, fr), [sid, f]);
      fs.writeFileSync(path.join(dir(sid), `${String(f).padStart(5, "0")}.jpg`), await page.screenshot({ type: "jpeg", quality: 95 }));
      (meta[sid] ||= {})[f] = m;
      if (++count % 150 === 0) console.log(`  ${count}/${jobs.length} (${((Date.now() - t0) / count).toFixed(0)} ms/frame)`);
    }
    await page.close();
  }));
  for (const r of ranges) {
    const sid = r.shot.id;
    if (!meta[sid]) continue;
    const mf = path.join(dir(sid), "meta.json");
    const old = !full.has(sid) && fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")).frames : {};
    fs.writeFileSync(mf, JSON.stringify({ f0: r.f0, f1: r.f1, frames: { ...old, ...meta[sid] } }));
    if (full.has(sid)) fs.writeFileSync(path.join(dir(sid), "hash.txt"), r.hash);
  }
  console.log(`  drawn ${count} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// ------------------------------------------------------------------ layout audit
// Shots are split between `workers` browser tabs (each with its own draw + HUD page) and measured in parallel;
// `only` limits the audit to the named shots (re-check what changed). captions.json (picked bands) survives a rerun.
async function layoutMode(browser, pid, tl, step, mstep, only = null, workers = 3) {
  const out = path.join(ROOT, "build", pid, "layout");
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (f !== "captions.json") fs.rmSync(path.join(out, f), { recursive: true, force: true });
  const shots = tl.shots.filter((s) => s.draw && s.draw.engine !== "motion" && (!only || only.includes(s.id)));
  if (only) for (const id of only) if (!tl.shots.some((s) => s.id === id)) console.error(`  unknown shot '${id}'`);
  const n = Math.max(1, Math.min(workers, shots.length));
  // balance by duration: longest shots first, each to the least busy tab
  const groups = Array.from({ length: n }, () => ({ load: 0, shots: [] }));
  for (const s of [...shots].sort((a, b) => (b.end - b.start) - (a.end - a.start))) {
    const g = groups.reduce((m, x) => (x.load < m.load ? x : m));
    g.shots.push(s); g.load += s.end - s.start;
  }
  const res = [], mot = [];
  await Promise.all(groups.map(async (g) => {
    if (!g.shots.length) return;
    const dpage = await browser.newPage({ viewport: { width: tl.width, height: tl.height }, deviceScaleFactor: 1 });
    dpage.on("pageerror", (e) => { console.error("[draw pageerror]", e.message); process.exitCode = 2; });
    await dpage.goto(`http://127.0.0.1:${PORT}/engine/hud/draw.html?project=${encodeURIComponent(pid)}`);
    await dpage.waitForFunction(() => window.drawReady === true, null, { timeout: 180000 });
    await dpage.evaluate(() => document.fonts.ready);
    const hpage = await openPage(browser, pid);
    for (const s of g.shots) {
      const f0 = Math.ceil(s.start * tl.fps) + 2, f1 = Math.floor(s.end * tl.fps) - 2;
      const fr = [];
      for (let f = f0; f < f1; f += step) fr.push(f);
      if (f1 > f0 && fr[fr.length - 1] !== f1) fr.push(f1);
      for (const f of fr) {
        const { cam, realScene, items } = await dpage.evaluate(([sid, x]) => window.drawLayout(sid, x), [s.id, f]);
        const hud = await hpage.evaluate((x) => window.hudLayout(x), f);
        const shotFile = `f_${String(f).padStart(5, "0")}.jpg`;
        fs.writeFileSync(path.join(out, shotFile), await dpage.screenshot({ type: "jpeg", quality: 80 }));
        res.push({ frame: f, t: Math.round((f / tl.fps) * 100) / 100, shot: s.id, scene: s.scene, image: shotFile, cam, real_scene: realScene, items, caption: hud.caption });
      }
      // motion pass: positions of every item on every `mstep`-th frame (no screenshots) — jumps, jitter, flicker
      if (mstep > 0) {
        const m0 = Math.ceil(s.start * tl.fps) + 1, m1 = Math.floor(s.end * tl.fps) - 1;
        for (let f = m0; f <= m1; f += mstep) {
          const { cam, items } = await dpage.evaluate(([sid, x]) => window.drawLayout(sid, x), [s.id, f]);
          mot.push({ frame: f, shot: s.id, cam, items: items.map((it) => ({ path: it.path, actor: it.actor, id: it.id, text: it.text, box: it.box, op: it.op,
            moving: it.moving, loops: !!it.loops, space: it.space })) });
        }
      }
    }
    await dpage.close(); await hpage.close();
  }));
  res.sort((a, b) => a.frame - b.frame); mot.sort((a, b) => a.frame - b.frame);
  fs.writeFileSync(path.join(out, "frames.json"), JSON.stringify({ width: tl.width, height: tl.height, frames: res }));
  console.log(`  measured ${res.length} frames of ${shots.length} shot(s) in ${n} tab(s)`);
  if (mstep > 0) {
    fs.writeFileSync(path.join(out, "motion.json"), JSON.stringify({ fps: tl.fps, step: mstep, frames: mot }));
    console.log(`  motion: ${mot.length} frames`);
  }
}

(async () => {
  const [mode, pid, ...rest] = process.argv.slice(2);
  const tl = JSON.parse(fs.readFileSync(path.join(ROOT, "build", pid, "timeline.json"), "utf8"));
  const browser = await launch();
  if (mode === "draw") {
    const force = rest.includes("--force");
    const args = rest.filter((a) => a !== "--force");
    const frames = args.length > 1 ? args.slice(1).map(Number) : null;
    await drawMode(browser, pid, tl, Number(args[0] || 3), frames, force);
  } else if (mode === "layout") {
    const opt = (k) => (rest.find((x) => x.startsWith(`--${k}=`)) || "").split("=")[1];
    const only = opt("shots") ? opt("shots").split(",").filter(Boolean) : null;
    await layoutMode(browser, pid, tl, Number(rest[0] || 12), Number(rest[1] ?? 2), only, Number(opt("workers") || 3));
  } else if (mode === "stills") {
    const dir = path.join(ROOT, "build", pid, "stills");
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, pid);
    for (const fr of rest.map(Number)) {
      await page.evaluate(([f, s]) => window.renderFrame(f, s), [fr, bg(pid, fr) || ""]);
      await page.screenshot({ path: path.join(dir, `hud_${String(fr).padStart(5, "0")}.png`) });
    }
  } else if (mode === "video") {
    const workers = Number(rest[0] || 3);
    const out = path.join(ROOT, "build", pid, "video_hud.mp4");
    const per = Math.ceil(tl.frames / workers);
    const parts = [];
    const jobs = [];
    for (let w = 0; w < workers; w++) {
      const s = w * per, e = Math.min(tl.frames, s + per);
      if (s >= e) break;
      const part = `${out}.part${w}.mp4`;
      parts.push(part);
      jobs.push(renderRange(browser, pid, tl.fps, s, e, part));
    }
    await Promise.all(jobs);
    const list = `${out}.parts.txt`;
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
    await new Promise((r) => spawn("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out], { stdio: "inherit" }).on("close", r));
    parts.forEach((p) => fs.unlinkSync(p));
    fs.unlinkSync(list);
    console.log(`  written ${out}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
