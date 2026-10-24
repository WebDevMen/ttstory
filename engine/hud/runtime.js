// HUD runtime: instantiates components from build/<project>/timeline.json and draws them deterministically per frame.
// Open as /engine/hud/index.html?project=<id>  —  window.renderFrame(frameIndex, backgroundSrc) renders one frame.
import COMPONENTS from "./components/index.js";
import { clamp, lerp, P, E, hash, rgb, icon, emoji, markup, html, fmt, ramp } from "./lib.js";

const q = (s) => document.querySelector(s);
const PID = new URLSearchParams(location.search).get("project");
const TL = await (await fetch(`/build/${PID}/timeline.json`, { cache: "no-store" })).json();
let CAM = null;
try { const r = await fetch(`/build/${PID}/camera.json`, { cache: "no-store" }); if (r.ok) CAM = await r.json(); } catch (e) { CAM = null; }

function loadCss(id, href) {
  return new Promise((res) => { const l = q(id); l.onload = res; l.onerror = res; l.href = href; });
}
await loadCss("#theme", `themes/${TL.theme.preset || "scifi"}.css`);
await loadCss("#project-css", `/projects/${PID}/hud.css`);
await Promise.all(["500 20px Exo2", "700 20px Exo2", "800 20px Exo2", "900 20px Exo2", "italic 900 20px Exo2", "400 20px JBM", "700 20px JBM",
  "500 20px Montserrat", "700 20px Montserrat", "800 20px Montserrat", "900 20px Montserrat", "italic 900 20px Montserrat",
  "600 20px Playfair", "800 20px Playfair", "italic 600 20px Playfair", "600 20px Unbounded", "800 20px Unbounded"]
  .map((f) => document.fonts.load(f, "АБВЖЯабвжяABCxyz0123")));

// ------------------------------------------------------------------ helpers shared with components (lib.js)
const sceneById = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const sceneAt = (t) => TL.scenes.find((s) => t >= s.start && t < s.end) || TL.scenes[TL.scenes.length - 1];
const shotAt = (t) => TL.shots.find((s) => t >= s.start && t < s.end) || TL.shots[TL.shots.length - 1];
let camFrame = null;
function anchor(name, fallback) {
  if (name && camFrame && camFrame.anchors && camFrame.anchors[name]) return camFrame.anchors[name];
  return fallback;
}
const frameNoise = (t, seed) => hash(Math.floor(t * TL.fps) * 13.37 + seed * 71.1) * 2 - 1;
const H = { TL, clamp, lerp, P, E, hash, rgb, icon, emoji, markup, html, fmt, ramp, anchor, sceneAt, shotAt, sceneById, frameNoise,
  words: TL.words, get cam() { return camFrame; } };

// ------------------------------------------------------------------ instances
const hudEl = q("#hud");
const ALIGN = { left: 0, center: 50, right: 100, top: 0, middle: 50, bottom: 100 };
const items = TL.hud.map((inst) => {
  const def = COMPONENTS[inst.component];
  if (!def) throw new Error(`unknown HUD component '${inst.component}'`);
  const wrap = document.createElement("div");
  wrap.className = "hi";
  const fx = document.createElement("div");
  fx.className = "fx";
  wrap.appendChild(fx);
  const c = def.create(inst, H);
  fx.appendChild(c.el);
  hudEl.appendChild(wrap);
  const [ax, ay] = (inst.align || def.align || "left top").split(/\s+/);
  return { inst, def, c, wrap, fx, ax: ALIGN[ax] ?? 0, ay: ALIGN[ay] ?? 0, seed: inst.index * 7 + 3 };
});

function enterFx(type, k, seed, t) {
  const o = { x: 0, y: 0, rx: 0, ry: 0, s: 1, sy: 1, rot: 0, op: 1 };
  switch (type) {
    case "fade": o.op = k; break;
    case "pop": o.s = lerp(0.6, 1, E.outBack(k)); o.op = clamp(k * 3); break;
    case "zoom": o.s = lerp(1.5, 1, E.outBack(k)); o.op = clamp(k * 3); break;
    case "stamp": o.s = lerp(1.9, 1, E.outBack(k)); o.rot = lerp(-8, 0, E.outBack(k)); o.op = clamp(k * 4); break;
    case "slide_left": o.x = lerp(-80, 0, E.outCubic(k)); o.op = clamp(k * 2.5); break;
    case "slide_right": o.x = lerp(80, 0, E.outCubic(k)); o.op = clamp(k * 2.5); break;
    case "slide_up": o.y = lerp(50, 0, E.outBack(k)); o.op = clamp(k * 3); break;
    case "slide_down": o.y = lerp(-40, 0, E.outBack(k)); o.op = clamp(k * 3); break;
    case "swing_left": o.x = lerp(-80, 0, E.outCubic(k)); o.ry = lerp(24, 0, E.outCubic(k)); o.op = clamp(k * 2.5); break;
    case "swing_right": o.x = lerp(80, 0, E.outCubic(k)); o.ry = lerp(-26, 0, E.outCubic(k)); o.op = clamp(k * 2.5); break;
    case "flip_x": o.rx = lerp(-95, 0, E.outBack(k)); o.op = clamp(k * 3); break;
    case "flip_up": o.rx = lerp(64, 0, E.outBack(k)); o.op = clamp(k * 3); break;
    case "unfold": o.sy = lerp(0.03, 1, E.outExpo(k)); o.op = clamp(k * 4); break;
    case "glitch": o.x = k < 0.6 ? frameNoise(t, seed) * 60 * (1 - k) : 0; o.op = clamp(k * 3) * (k < 0.5 && Math.floor(t * 30) % 3 === 0 ? 0.3 : 1); break;
    case "none": break;
    default: o.op = k;
  }
  return o;
}
function exitFx(type, k, seed, t) {
  const o = { x: 0, s: 1, op: 1 };
  if (k <= 0) return o;
  switch (type) {
    case "glitch": o.x = frameNoise(t, seed) * 26 * k * 3; o.op = 1 - k; break;
    case "zoom_out": o.s = 1 + 0.08 * k; o.op = 1 - k; break;
    case "shrink": o.s = 1 - 0.3 * k; o.op = 1 - k; break;
    case "none": break;
    default: o.op = 1 - k;
  }
  return o;
}

function updateItem(it, t, sceneNow) {
  const { inst, def, c, wrap, fx } = it;
  if (t < inst.at || t > inst.until) { wrap.style.display = "none"; return; }
  wrap.style.display = "";
  const enter = inst.enter || def.enter || "fade", exit = inst.exit || def.exit || "glitch";
  const ed = inst.enter_dur ?? def.enter_dur ?? 0.4, xd = inst.exit_dur ?? def.exit_dur ?? 0.22;
  const ei = P(t, inst.at, ed);
  const lastsToEnd = inst.until >= TL.duration - 0.02 && !inst.exit;
  const eo = lastsToEnd ? 0 : P(t, inst.until - xd, xd);
  const scene = inst.scene ? H.sceneById[inst.scene] : sceneNow;
  const accent = rgb(inst.color) || scene.accent;
  wrap.style.setProperty("--accent", accent);

  // position: anchor (moves with the picture) or fixed x/y, optional animated moves
  let x = inst.x ?? def.x ?? 540, y = inst.y ?? def.y ?? 960, sc = inst.scale ?? 1;
  if (inst.anchor) { const a = anchor(inst.anchor, [x, y]); x = a[0]; y = a[1]; }
  if (inst.offset) { x += inst.offset[0]; y += inst.offset[1]; }
  let mry = 0;
  for (const m of inst.moves || []) {
    const f = E.inOut(P(t, m.at, m.dur ?? 0.45));
    if (m.x != null) x = lerp(x, m.x, f);
    if (m.y != null) y = lerp(y, m.y, f);
    if (m.scale != null) sc = lerp(sc, m.scale, f);
    if (m.tilt_y != null) mry = lerp(mry, m.tilt_y, f);
  }
  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;
  wrap.style.transformOrigin = `${it.ax}% ${it.ay}%`;
  wrap.style.transform = `translate(${-it.ax}%, ${-it.ay}%) scale(${sc})`;

  const a = enterFx(enter, ei, it.seed, t), b = exitFx(exit, eo, it.seed, t);
  const tilt = inst.tilt || def.tilt || {};
  const sway = tilt.sway ?? 0, tf = tilt.freq ?? 0.2;
  const rx = (tilt.x ?? 0) + a.rx + Math.sin(t * 2 * Math.PI * tf * 0.7) * sway * 0.7;
  const ry = (tilt.y ?? 0) + a.ry + mry + Math.sin(t * 2 * Math.PI * tf) * sway;
  const fl = inst.float || def.float;
  const fy = fl ? Math.sin(t * 2 * Math.PI * (fl.freq ?? 0.38)) * (fl.amp ?? 7) : 0;
  fx.style.transformOrigin = inst.origin || def.origin || "50% 50%";
  fx.style.transform = `perspective(${tilt.perspective ?? 1000}px) translate(${a.x + b.x}px, ${a.y + fy}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${(tilt.z ?? 0) + a.rot}deg) scale(${a.s * b.s}) scaleY(${a.sy})`;
  fx.style.opacity = a.op * b.op;
  c.update(t, { ei, eo, local: t - inst.at, accent, scene, x, y });
}

// ------------------------------------------------------------------ captions
const CAP = TL.theme.captions || {};
const capEl = q("#caption");
capEl.className = `cap-${CAP.style || "neon_word"}`;
if (CAP.size) capEl.style.setProperty("--cap-size", `${CAP.size}px`);
const SHORT = new Set(["а", "и", "в", "на", "с", "по", "за", "без", "к", "не", "ни", "до", "для", "но", "или", "ты", "бы", "о", "у", "из", "от", "что", "как"]);
function buildChunks(words) {
  const maxW = CAP.max_words || 4, maxC = CAP.max_chars || 19;
  const chunks = [];
  let cur = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (cur.length && cur[0].scene !== w.scene) { chunks.push(cur); cur = []; }
    cur.push(w);
    const next = words[i + 1];
    const len = cur.reduce((s, x) => s + x.text.length + 1, 0);
    const strong = /[.!?:…—–;]/.test(w.post), comma = /,/.test(w.post);
    let brk = strong || comma || cur.length >= maxW || (next && len + next.text.length > maxC);
    if (!next || next.scene !== w.scene) brk = true;
    if (brk && !strong && !comma && next && next.scene === w.scene) {
      const carry = [];
      while (cur.length > 1 && SHORT.has(cur[cur.length - 1].text.toLowerCase())) carry.unshift(cur.pop());
      if (carry.length) { chunks.push(cur); cur = carry; continue; }
    }
    if (brk) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  const out = chunks.map((ws) => ({ words: ws, start: ws[0].start - 0.06, endWord: ws[ws.length - 1].end }));
  out.forEach((c, i) => { const n = out[i + 1]; c.end = n && n.start - c.endWord < 0.7 ? n.start : c.endWord + 0.35; });
  return out;
}
const CHUNKS = CAP.enabled === false ? [] : buildChunks(TL.words);
let capBuilt = -1;
function capText(w) {
  let s = (w.pre || "") + w.text;
  if (w.post && /^[»…,.!?:;)]/.test(w.post)) s += w.post.replace(/[—–]/g, "").trim();
  return markup(CAP.uppercase === false ? s : s.toUpperCase());
}
function updateCaptions(t, scene, shot) {
  let idx = CHUNKS.findIndex((c) => t >= c.start && t < c.end);
  for (const h of CAP.hide || []) if (t >= h.from && t < (h.until ?? 1e9)) idx = -1;
  if (idx < 0) { capEl.style.display = "none"; return; }
  capEl.style.display = "";
  const ch = CHUNKS[idx];
  if (capBuilt !== idx) { capEl.innerHTML = ch.words.map((w) => `<span class="w${w.mark ? " mk" : ""}"${w.mark ? ` style="--mk:${w.mark}"` : ""}>${capText(w)}</span>`).join(""); capBuilt = idx; }
  const sc = H.sceneById[ch.words[0].scene];
  capEl.style.setProperty("--cap", sc.caption_color || sc.accent);
  capEl.style.top = `${shot.captions_top ?? sc.captions_top ?? CAP.top ?? 1250}px`;
  const pin = P(t, ch.start, 0.1);
  capEl.style.opacity = clamp(pin * 2);
  const anim = CAP.animation || "pop";
  capEl.style.transform = anim === "pop" ? `scale(${lerp(0.88, 1, E.outBack(pin))})` : anim === "rise" ? `translateY(${(1 - E.outCubic(pin)) * 24}px)` : "none";
  capEl.querySelectorAll(".w").forEach((s, i) => {
    const w = ch.words[i], nx = ch.words[i + 1];
    const on = t >= w.start - 0.03 && (nx ? t < nx.start - 0.03 : true);
    s.classList.toggle("on", on);
    s.classList.toggle("past", t >= w.start - 0.03 && !on);
    // the pop grows the word up, but sideways only by ~6 px per side, so it never eats the gap to its neighbours
    const pop = 1 + (CAP.pop ?? 0.07) * (1 - P(t, w.start, 0.15));
    s.style.transform = on ? `scale(${Math.min(pop, 1 + 12 / (s.offsetWidth || 1e9))}, ${pop})` : "scale(1)";
  });
}

// ------------------------------------------------------------------ frame update
function update(t) {
  const scene = sceneAt(t), shot = shotAt(t);
  document.documentElement.style.setProperty("--accent", scene.accent);
  const shake = camFrame && camFrame.shake ? camFrame.shake : [0, 0];
  hudEl.style.transform = `translate(${shake[0] * 0.6}px, ${shake[1] * 0.6}px)`;
  capEl.style.translate = `${shake[0] * 0.6}px ${shake[1] * 0.6}px`;
  let dim = 1;
  for (const d of TL.dim || []) if (t >= d.at && t < (d.until ?? 1e9)) dim = Math.min(dim, lerp(1, d.level ?? 0.4, P(t, d.at, d.dur ?? 0.12)));
  hudEl.style.opacity = dim;
  for (const it of items) updateItem(it, t, scene);
  updateCaptions(t, scene, shot);
}

const img = q("#frame");
window.renderFrame = async (frame, src) => {
  const t = frame / TL.fps;
  camFrame = CAM ? CAM.frames[Math.min(frame, CAM.frames.length - 1)] : null;
  if (src && img.getAttribute("src") !== src) { img.src = src; await img.decode(); }
  update(t);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
};
// layout audit (vg.py layout): where the captions are on this frame (null when hidden)
window.hudLayout = async (frame) => {
  update(frame / TL.fps);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (capEl.style.display === "none" || !capEl.textContent.trim()) return { caption: null };
  const spans = [...capEl.querySelectorAll(".w")].map((s) => s.getBoundingClientRect()).filter((r) => r.width > 0);
  if (!spans.length) return { caption: null };
  const box = [Math.min(...spans.map((r) => r.left)), Math.min(...spans.map((r) => r.top)), Math.max(...spans.map((r) => r.right)), Math.max(...spans.map((r) => r.bottom))];
  const text = [...capEl.querySelectorAll(".w")].map((s) => s.textContent.trim()).join(" ");
  return { caption: { box: box.map((v) => Math.round(v)), text } };
};
window.hudInfo = { duration: TL.duration, frames: TL.frames, fps: TL.fps };
window.hudReady = true;
