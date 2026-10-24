// Composite the HUD over rendered scene frames in headless Chromium and stream the result to ffmpeg.
//   node engine/render_hud.cjs video  <project> [workers]          -> build/<project>/video_hud.mp4
//   node engine/render_hud.cjs stills <project> <frame> [frame...]  -> build/<project>/stills/hud_XXXXX.png
// Needs an http server serving the repository root on $PORT (vg.py starts one automatically).
const { chromium } = require("playwright");
const { spawn } = require("child_process");
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
    "--font-render-hinting=none", "--force-color-profile=srgb"] };
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

(async () => {
  const [mode, pid, ...rest] = process.argv.slice(2);
  const tl = JSON.parse(fs.readFileSync(path.join(ROOT, "build", pid, "timeline.json"), "utf8"));
  const browser = await launch();
  if (mode === "stills") {
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
