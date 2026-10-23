// Composite the HUD over the rendered scene frames with headless Chromium and stream to ffmpeg.
//
//   node render_hud.cjs video  <framesDir> <out.mp4> [workers]   full render (frames/%05d.jpg as background)
//   node render_hud.cjs stills <outDir> <frame> [<frame> ...]     debug PNGs (uses frames if present, else plates)
//
// Expects an http server serving the repository root on PORT (default 8765).
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8765;
const ROOT = path.resolve(__dirname, "..");
const URL = `http://127.0.0.1:${PORT}/tools/hud/index.html`;
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, "build/timeline.json"), "utf8"));

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error") console.error("[page]", m.text()); });
  page.on("pageerror", (e) => console.error("[pageerror]", e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.hudReady === true, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

function launch() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync",
      "--font-render-hinting=none", "--force-color-profile=srgb"],
  });
}

function bgFor(frame, framesDir) {
  const f = path.join(framesDir, `${String(frame).padStart(5, "0")}.jpg`);
  if (fs.existsSync(f)) return "/" + path.relative(ROOT, f);
  const t = frame / TL.fps;
  const shot = TL.shots.find((s) => t >= s.start && t < s.end) || TL.shots[TL.shots.length - 1];
  return `/assets/plates/${shot.plate}.png`;
}

async function renderRange(browser, framesDir, start, end, outFile) {
  const page = await openPage(browser);
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(TL.fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", outFile], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = start; f < end; f++) {
    await page.evaluate(([fr, src]) => window.renderFrame(fr, src), [f, bgFor(f, framesDir)]);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if ((f - start) % 60 === 0) console.log(`[${start}-${end}] frame ${f} (${((Date.now() - t0) / (f - start + 1)).toFixed(0)} ms/f)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await page.close();
}

(async () => {
  const [mode, a, ...rest] = process.argv.slice(2);
  const browser = await launch();
  if (mode === "stills") {
    fs.mkdirSync(a, { recursive: true });
    const page = await openPage(browser);
    for (const fr of rest.map(Number)) {
      await page.evaluate(([f, src]) => window.renderFrame(f, src), [fr, bgFor(fr, path.join(ROOT, "build/frames"))]);
      await page.screenshot({ path: path.join(a, `hud_${String(fr).padStart(5, "0")}.png`) });
    }
  } else if (mode === "video") {
    const framesDir = path.resolve(a);
    const out = path.resolve(rest[0]);
    const workers = Number(rest[1] || 3);
    const total = TL.frames;
    const per = Math.ceil(total / workers);
    const parts = [];
    const jobs = [];
    for (let w = 0; w < workers; w++) {
      const s = w * per, e = Math.min(total, s + per);
      const part = `${out}.part${w}.mp4`;
      parts.push(part);
      jobs.push(renderRange(browser, framesDir, s, e, part));
    }
    await Promise.all(jobs);
    const list = `${out}.parts.txt`;
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
    await new Promise((r) => spawn("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out], { stdio: "inherit" }).on("close", r));
    parts.forEach((p) => fs.unlinkSync(p));
    fs.unlinkSync(list);
  }
  await browser.close();
})();
