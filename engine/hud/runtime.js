// HUD runtime: instantiates components from build/<project>/timeline.json and draws them deterministically per frame.
// Open as /engine/hud/index.html?project=<id>  —  window.renderFrame(frameIndex, backgroundSrc) renders one frame.
import COMPONENTS from "./components/index.js";

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
let EMOJI = new Set();
try { EMOJI = new Set(await (await fetch("vendor/emoji/index.json")).json()); } catch (e) { /* optional */ }
await Promise.all(["500 20px Exo2", "700 20px Exo2", "800 20px Exo2", "900 20px Exo2", "italic 900 20px Exo2", "400 20px JBM", "700 20px JBM",
  "500 20px Montserrat", "700 20px Montserrat", "800 20px Montserrat", "900 20px Montserrat", "italic 900 20px Montserrat",
  "600 20px Playfair", "800 20px Playfair", "italic 600 20px Playfair", "600 20px Unbounded", "800 20px Unbounded"]
  .map((f) => document.fonts.load(f, "АБВЖЯабвжяABCxyz0123")));

// ------------------------------------------------------------------ helpers shared with components
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const P = (t, a, d) => (d > 0 ? clamp((t - a) / d) : t >= a ? 1 : 0);
const E = {
  linear: (x) => clamp(x),
  outCubic: (x) => 1 - Math.pow(1 - clamp(x), 3),
  inCubic: (x) => Math.pow(clamp(x), 3),
  inOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  outBack: (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x))),
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const NAMED = { teal: "64,255,230", green: "70,255,150", red: "255,60,80", amber: "255,176,40", toxic: "200,255,60", violet: "200,120,255",
  pink: "255,120,200", orange: "255,170,90", white: "255,255,255", gold: "255,200,110", blue: "80,170,255", black: "0,0,0" };
function rgb(c) {
  if (c == null) return null;
  if (Array.isArray(c)) { const m = Math.max(...c) <= 1 ? 255 : 1; return c.slice(0, 3).map((v) => Math.round(v * m)).join(","); }
  let s = String(c).trim();
  if (NAMED[s]) return NAMED[s];
  if (s[0] === "#") { s = s.slice(1); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)).join(","); }
  return s.replace(/\s+/g, "");
}
function emoji(ch, cls = "emoji") {
  const cps = [...ch].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== "fe0f");
  const code = cps.join("-");
  if (EMOJI.has(code)) return `<img class="${cls}" src="vendor/emoji/${code}.svg" alt="">`;
  return `<span class="${cls}" style="font-family:'Noto Color Emoji';width:auto;height:auto">${ch}</span>`;
}
const SVG = {
  check: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="0.9em" height="0.9em"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>',
  warning: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 3 2 21h20L12 3z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 10v5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></svg>',
  warning_solid: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 3 2 21h20L12 3z" fill="rgb(255,60,80)"/><path d="M12 10v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="#fff"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em"><path fill="currentColor" d="M12 21.3 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.3z"/></svg>',
  drop: '<svg viewBox="0 0 24 24" width="1.05em" height="1.1em"><path fill="currentColor" d="M12 2.2S5 10 5 14.6A7 7 0 0 0 19 14.6C19 10 12 2.2 12 2.2z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" fill="currentColor"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
  fuel: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M5 3h9a1 1 0 0 1 1 1v8h1.5A2.5 2.5 0 0 1 19 14.5V18a1 1 0 0 0 2 0V9l-2.3-2.3 1.4-1.4L23 8.2V18a3 3 0 0 1-6 0v-3.5a.5.5 0 0 0-.5-.5H15v7H4V4a1 1 0 0 1 1-1zm1 2v5h7V5H6z"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 10.5v7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="7" r="1.6" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 6.5V12l4 2.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  arrow_down: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 4v15M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M7 4.5v15l12-7.5z"/></svg>',
  target: '<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M20 3C9 3 4 8.5 4 15c0 1.7.4 3.3 1.1 4.6L3.5 21l1.4 1.4 1.6-1.6C7.8 21.6 9.3 22 11 22c6.5 0 10-6 9-19zM8 18c2-4 5-7 9-9-3 3-5.5 6-7 10l-2-1z"/></svg>',
  question: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M8.5 9a3.5 3.5 0 1 1 5.2 3c-1.1.6-1.7 1.3-1.7 2.5V15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>',
};
const GLYPH = { radiation: "☢", biohazard: "☣", skull: "☠", bolt_glyph: "ϟ", target_glyph: "◎", sonar: "◉", cross: "✕" };
function icon(name) {
  if (!name) return "";
  if (SVG[name]) return SVG[name];
  if (GLYPH[name]) return `<span class="sym">${GLYPH[name]}</span>`;
  if (/^\p{Extended_Pictographic}/u.test(name)) return emoji(name);
  return `<span class="sym">${name}</span>`;
}
function markup(s) {
  if (s == null) return "";
  let h = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  h = h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  h = h.replace(/\p{Extended_Pictographic}(️)?/gu, (m) => emoji(m));
  return h;
}
function html(s) { const d = document.createElement("div"); d.innerHTML = s.trim(); return d.firstElementChild; }
function fmt(tpl, vars) { return String(tpl ?? "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)); }
// value over time: number | [{at, v, dur?, ease?}] (steps animate over dur) | {at, dur, from, to, ease}
function ramp(spec, t, def = 0) {
  if (spec == null) return def;
  if (typeof spec === "number") return spec;
  if (Array.isArray(spec)) {
    let v = spec.length ? (spec[0].from ?? spec[0].v) : def;
    for (const k of spec) {
      const d = k.until != null ? k.until - k.at : (k.dur ?? 0.4);
      const f = (E[k.ease] || E.inOut)(P(t, k.at, d));
      v = lerp(v, k.v, f);
    }
    return v;
  }
  const d = spec.until != null ? spec.until - spec.at : (spec.dur ?? 0.5);
  return lerp(spec.from ?? 0, spec.to ?? 1, (E[spec.ease] || E.inOut)(P(t, spec.at, d)));
}
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
  if (capBuilt !== idx) { capEl.innerHTML = ch.words.map((w) => `<span class="w">${capText(w)}</span>`).join(""); capBuilt = idx; }
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
    s.style.transform = on ? `scale(${1 + (CAP.pop ?? 0.07) * (1 - P(t, w.start, 0.15))})` : "scale(1)";
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
window.hudInfo = { duration: TL.duration, frames: TL.frames, fps: TL.fps };
window.hudReady = true;
