// Draw runtime: renders code-drawn shots (`draw:` in project.yaml) frame by frame, deterministically.
// Open /engine/hud/draw.html?project=<id>; window.drawShotFrame(shotId, frame) draws one frame of one shot and returns
// {cam, anchors} for the scene layer / HUD. Actors: engine/hud/draw/actors/* + projects/<id>/actors/*.js.
import * as lib from "../lib.js";
import { Item, ease, track, mix, noise, rng, hex, smoothPath, isTrack, TEXTY, SLOTS, GROUNDED, SURFACES } from "./core.js";
import BUILTIN from "./actors/index.js";
import rough from "../vendor/rough.esm.js";

const PID = new URLSearchParams(location.search).get("project");
const TL = await (await fetch(`/build/${PID}/timeline.json`, { cache: "no-store" })).json();
const W = TL.width, HH = TL.height, FPS = TL.fps;

function loadCss(href) {
  return new Promise((res) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.onload = res; l.onerror = res; l.href = href; document.head.appendChild(l); });
}
await loadCss(`/projects/${PID}/draw.css`);
await Promise.all(["500 20px Montserrat", "700 20px Montserrat", "800 20px Montserrat", "900 20px Montserrat", "italic 900 20px Montserrat",
  "700 20px Exo2", "900 20px Exo2", "400 20px JBM", "700 20px JBM", "600 20px Playfair", "800 20px Playfair", "800 20px Unbounded",
  "800 20px Rounded", "600 20px Klee", "700 20px Caveat", "500 20px Oswald", "700 20px Oswald", "400 20px 'IBM Plex Mono'", "600 20px 'IBM Plex Mono'", "600 20px Inter", "800 20px Inter"].map((f) => document.fonts.load(f, "АБВЖЯабвжяABCxyz0123あア起立礼")));

if (window.gsap) {
  const plugins = ["MorphSVGPlugin", "MotionPathPlugin", "DrawSVGPlugin", "CustomEase", "SplitText", "TextPlugin", "ScrambleTextPlugin", "CustomWiggle", "CustomBounce"];
  window.gsap.registerPlugin(...plugins.map((n) => window[n]).filter(Boolean));
  window.gsap.ticker.lagSmoothing(0);
}

// project actors: projects/<id>/actors/*.js (listed by compile)
const ACTORS = { ...BUILTIN };
for (const src of TL.draw_actors || []) Object.assign(ACTORS, await import(src));

// ------------------------------------------------------------------ palette & helpers for actors
const PALETTE = {
  night: "#0a0f1f", navy: "#121a33", deep: "#070b16", wall: "#1c2541", ink: "#ffffff", dim: "#8a93b8", line: "#2c3a63",
  win_off: "#151c33", win_on: "#ffc35a", glow: "#ffd36b", red: "#ff3b4e", amber: "#ffb02e", teal: "#3fe0d0", green: "#46e68c",
  blue: "#4d9bff", sakura: "#ffb7c9", cream: "#fff4e0", paper: "#f6efe2", skin: "#ffd8b8", hair: "#2b1d1a", uniform: "#1f2d4f",
};
const SVGNS = "http://www.w3.org/2000/svg";
let uidN = 0;
const jsonCache = new Map();
const H = {
  frameW: TL.width || 1080,
  ...lib, ease, track, mix, noise, rng, hex, smoothPath, isTrack, rough,
  TL, PID, W, H: HH, fps: FPS, actors: ACTORS, palette: PALETTE,
  gsap: window.gsap, d3: window.d3, topojson: window.topojson, lottie: window.lottie,
  fonts: { display: "Montserrat", heavy: "Montserrat", body: "Montserrat", mono: "JBM", tech: "Exo2", serif: "Playfair",
    round: "Rounded", hand: "Caveat", chalk: "Caveat", jp: "Klee", wide: "Unbounded", caption: "Montserrat",
    cond: "Oswald", plex: "IBM Plex Mono", inter: "Inter" },
  async three() { return import("../vendor/three.module.min.js"); },
  uid(p = "u") { uidN += 1; return `${p}${uidN}`; },
  // any color spec (palette name, named color, #hex, "r,g,b", [r,g,b], css function) -> css color string
  col(c, a) {
    if (c == null) return "none";
    if (typeof c === "string" && H.palette[c] != null) c = H.palette[c];
    if (typeof c === "string" && /^(none|transparent|currentColor|url\(|var\(|rgba?\(|hsla?\(|linear-gradient|radial-gradient)/.test(c)) return c;
    return a == null ? `rgb(${lib.rgb(c)})` : `rgba(${lib.rgb(c)},${a})`;
  },
  rgbOf(c) {
    if (typeof c === "string" && H.palette[c] != null) c = H.palette[c];
    if (typeof c === "string" && c.startsWith("rgb")) return c.replace(/rgba?\(|\)/g, "").split(",").slice(0, 3).join(",");
    return lib.rgb(c);
  },
  rgba(c, a) { return `rgba(${H.rgbOf(c)},${a})`; },
  shade(c, k) {           // k < 0 darker, k > 0 lighter
    const v = H.rgbOf(c).split(",").map(Number);
    return `rgb(${v.map((x) => Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k)).join(",")})`;
  },
  mixc(a, b, f) { const x = H.rgbOf(a).split(",").map(Number), y = H.rgbOf(b).split(",").map(Number); return hex(x.map((v, i) => v + (y[i] - v) * f).join(",")); },
  svg(markup, w, h) {      // markup inside an <svg> of size w x h (local px), overflow visible
    const el = document.createElementNS(SVGNS, "svg");
    if (w != null) { el.setAttribute("width", w); el.setAttribute("height", h); el.setAttribute("viewBox", `0 0 ${w} ${h}`); }
    el.setAttribute("overflow", "visible");
    el.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
    el.innerHTML = markup;
    return el;
  },
  el(tag, attrs = {}, parent = null, ns = SVGNS) {
    const e = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  },
  div(css = "", html = "") {
    const d = document.createElement("div");
    d.style.cssText = `position:absolute;left:0;top:0;${css}`;
    d.innerHTML = html;
    return d;
  },
  asset(path) { return path.startsWith("/") || /^https?:/.test(path) ? path : `/projects/${PID}/${path}`; },
  async json(url) {
    if (!jsonCache.has(url)) jsonCache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`cannot load ${url}`); return r.json(); }));
    return jsonCache.get(url);
  },
  async text(url) { const r = await fetch(url); if (!r.ok) throw new Error(`cannot load ${url}`); return r.text(); },
  // build a nested item (full universal props) inside a parent actor's element; coordinates = parent's local px
  async child(spec, container, parent = H._current) {
    const def = ACTORS[spec.actor];
    if (!def) throw new Error(`unknown actor '${spec.actor}' (available: ${Object.keys(ACTORS).sort().join(", ")})`);
    const it = new Item(spec, H, parent);
    if (parent) parent.children.push(it);
    await it.build(def, container);
    return it;
  },
  anchorOf(ref) {
    const st = H.stage;
    if (!st || !ref) return null;
    const m = /^([^.:]+)(?:\.([^:]+))?(?::(.*))?$/.exec(ref);
    if (!m) return null;
    const it = st.find(m[1]);
    if (!it || !it.visible) return null;
    try {
      return it.anchor(m[2], m[3] ? m[3].split(",").map((x) => (isNaN(Number(x)) ? x : Number(x))) : []);
    } catch (e) {
      if (!H._anchorErr?.[ref]) { (H._anchorErr ||= {})[ref] = 1; console.error(`anchor '${ref}': ${e.message}`); }
      return null;
    }
  },
};

// ------------------------------------------------------------------ camera
const lerp = lib.lerp;
function camState(shot, t) {
  const d = shot.draw, c = d.camera || {};
  const world = d.world || [W, HH];
  const u = t - shot.start;
  const keys = c.keys && c.keys.length ? c.keys : [{ t: 0 }];
  let cur = { x: world[0] / 2, y: world[1] / 2, z: 1, roll: 0 };
  const full = keys.map((k) => { cur = { ...cur, ...Object.fromEntries(["x", "y", "z", "roll"].filter((n) => k[n] != null).map((n) => [n, Number(k[n])])) }; return [k.t ?? 0, cur, k.ease]; });
  let v = { ...full[0][1] };
  if (u >= full[full.length - 1][0]) v = { ...full[full.length - 1][1] };
  else for (let i = 0; i + 1 < full.length; i++) {
    const [t0, a] = full[i], [t1, b, ez] = full[i + 1];
    if (u >= t0 && u < t1) { const f = ease(ez || "inOut")((u - t0) / Math.max(1e-6, t1 - t0)); v = Object.fromEntries(Object.keys(a).map((n) => [n, a[n] + (b[n] - a[n]) * f])); break; }
  }
  const base = full[0][1];
  if (c.follow) {
    const f = c.follow, it = H.stage.find(f.id);
    if (it && it.visible) {
      const p = it.matrix.transformPoint(new DOMPoint(it.origin[0], it.origin[1]));
      const k = f.k ?? 1;
      if ((f.axis ?? "x").includes("x")) v.x = lerp(v.x, p.x + (f.dx ?? 0), k);
      if ((f.axis ?? "x").includes("y")) v.y = lerp(v.y, p.y + (f.dy ?? 0), k);
    }
  }
  const seed = (TL.shots.findIndex((s) => s.id === shot.id) + 1) * 101;
  if (c.sway) {
    const f = c.sway.freq ?? 0.15;
    v.x += (c.sway.x ?? 0) * noise(t, seed + 1, f);
    v.y += (c.sway.y ?? 0) * noise(t, seed + 2, f * 1.1);
    v.roll += (c.sway.roll ?? 0) * noise(t, seed + 3, f * 0.9);
  }
  let sx = 0, sy = 0;
  (c.shakes || []).forEach((s, i) => {
    const at = s.at, amp = s.amp ?? 20, dd = s.dur ?? 0.5, fr = s.freq ?? 17;
    if (t >= at && t <= at + dd) {
      const a = amp * Math.exp((-5 * (t - at)) / dd);
      sx += a * Math.sin(2 * Math.PI * fr * (t - at) + i);
      sy += a * Math.cos(2 * Math.PI * fr * 0.87 * (t - at) + 2 * i);
    }
  });
  return { ...v, sx, sy, x0: base.x, y0: base.y, z0: base.z };
}
function layerMatrix(cam, par) {
  const z = cam.z0 + (cam.z - cam.z0) * par, cx = cam.x0 + (cam.x - cam.x0) * par, cy = cam.y0 + (cam.y - cam.y0) * par;
  return new DOMMatrix().translate(W / 2 + cam.sx * Math.min(1, par), HH / 2 + cam.sy * Math.min(1, par)).rotate(par > 0 ? cam.roll : 0).scale(z).translate(-cx, -cy);
}

// ------------------------------------------------------------------ shots
const root = document.getElementById("root");
const STAGES = new Map();

function background(bg) {
  if (!bg) return "#000";
  if (Array.isArray(bg)) return `linear-gradient(180deg, ${bg.map((c) => H.col(c)).join(", ")})`;
  if (typeof bg === "object") {
    const stops = (bg.stops || []).map((s) => (Array.isArray(s) ? `${H.col(s[1])} ${s[0] * 100}%` : H.col(s))).join(", ");
    return bg.type === "radial" ? `radial-gradient(circle at ${bg.at || "50% 40%"}, ${stops})` : `linear-gradient(${bg.angle ?? 180}deg, ${stops})`;
  }
  return H.col(bg);
}

async function buildStage(shot) {
  const d = shot.draw;
  const el = document.createElement("div");
  el.className = "stage";
  root.appendChild(el);
  const st = { shot, el, layers: [], items: [], palette: { ...PALETTE, ...(d.palette || {}) } };
  st.find = (id) => { for (const it of st.items) { const r = it.find(id); if (r) return r; } return null; };
  H.palette = st.palette;
  H.stage = st;
  H.shot = shot;
  H.nextSeed = 0;
  el.style.background = background(d.bg);
  let layer = null;
  for (const spec0 of d.layers || []) {
    // slot: tag | title | subtitle | main | lower | footer — a named place on the vertical axis (screen space)
    let spec = spec0.slot ? { x: 540, y: SLOTS[spec0.slot] ?? Number(spec0.slot), space: "screen", ...spec0 } : spec0;
    // y: floor / ground: true — stand on the shot's floor line (draw.floor, world px)
    if (spec.y === "floor" || spec.ground === true) {
      if (d.floor == null) throw new Error(`shot ${shot.id}: '${spec.actor}' uses the floor, but draw.floor is not set`);
      spec = { ...spec, y: d.floor };
    }
    if (spec0.slot && !(spec0.slot in SLOTS) && Number.isNaN(Number(spec0.slot))) throw new Error(`shot ${shot.id}: unknown slot '${spec0.slot}' (${Object.keys(SLOTS).join(", ")})`);
    // full-screen actors (world3d) live in screen space unless the YAML sets `space`
    const space = spec.space === "screen" || (spec.space == null && ACTORS[spec.actor]?.screen) ? "screen" : "world";
    const par = space === "screen" ? null : Number(spec.par ?? 1);
    if (!layer || layer.space !== space || layer.par !== par) {
      layer = { space, par, el: document.createElement("div"), matrix: new DOMMatrix() };
      layer.el.className = "layer";
      el.appendChild(layer.el);
      st.layers.push(layer);
    }
    const def = ACTORS[spec.actor];
    if (!def) throw new Error(`shot ${shot.id}: unknown actor '${spec.actor}' (available: ${Object.keys(ACTORS).sort().join(", ")})`);
    const it = new Item(spec, H, null);
    it.layer = layer;
    H._current = null;
    await it.build(def, layer.el);
    st.items.push(it);
  }
  // anchors to export: names used by HUD items + this shot's `anchors:` map
  const names = new Set(TL.hud.map((h) => h.anchor).filter(Boolean));
  for (const k of Object.keys(shot.anchors || {})) names.add(k);
  st.exportNames = [...names];
  return st;
}

async function stageFor(shotId) {
  if (!STAGES.has(shotId)) {
    const shot = TL.shots.find((s) => s.id === shotId);
    if (!shot || !shot.draw) throw new Error(`shot '${shotId}' is not a draw shot`);
    for (const [k, s] of STAGES) if (k !== shotId) { s.items.forEach((it) => it.destroy()); s.el.remove(); STAGES.delete(k); }
    STAGES.set(shotId, await buildStage(shot));
    await document.fonts.ready;            // fonts used by the new stage are loaded before its first frame
  }
  const st = STAGES.get(shotId);
  for (const s of STAGES.values()) s.el.style.display = s === st ? "" : "none";
  return st;
}

// a frame is final when the layout settled: auto-sized items, fits and stacks may change sizes during the first
// render (fonts, counters), so render again until nothing moves (max 4 passes) — every frame is the same whichever
// worker draws it and in whatever order
function renderSettled(st, t) {
  let cam;
  for (let i = 0; i < 4; i++) {
    H.layoutDirty = false;
    cam = renderStage(st, t);
    if (!H.layoutDirty) break;
  }
  return cam;
}

function renderStage(st, t) {
  H.stage = st; H.palette = st.palette; H.shot = st.shot;
  for (const it of st.items) it.prepare(t);
  const cam = camState(st.shot, t);
  for (const l of st.layers) {
    l.matrix = l.space === "screen" ? new DOMMatrix() : layerMatrix(cam, l.par);
    const m = l.matrix;
    l.el.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
  }
  for (const it of st.items) it.render(t);
  return cam;
}

window.drawShotFrame = async (shotId, frame) => {
  const st = await stageFor(shotId);
  const t = frame / FPS;
  let cam = renderSettled(st, t);
  // an item shown for the first time may start loading a font: wait for it and lay the frame out again
  if (document.fonts.status !== "loaded") { await document.fonts.ready; cam = renderSettled(st, t); }
  if (H.pending && H.pending.length) { await Promise.all(H.pending); H.pending = []; }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const anchors = {};
  for (const name of st.exportNames) {
    const ref = (st.shot.anchors || {})[name] ?? name;
    try { const p = typeof ref === "string" ? H.anchorOf(ref) : null; if (p) anchors[name] = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]; } catch (e) { /* not an item ref */ }
  }
  return { cam: { x: cam.x, y: cam.y, z: cam.z, roll: cam.roll, sx: cam.sx, sy: cam.sy }, anchors };
};
// layout audit (vg.py layout): the on-screen box of every visible item of one frame — text lines measured tightly
// (Range client rects), the rest by the item box; entering/exiting items are flagged so the checker can skip them.
function layoutOf(it, out, parentPath, parentMoving) {
  if (!it.visible) return;
  const path = `${parentPath}${parentPath ? "/" : ""}${it.id || it.spec.actor}#${it.index ?? 0}`;
  // entering/exiting, or a text still revealing word by word (slam/pop overshoot)
  const rv = it.spec.reveal, words = String(it.spec.text ?? "").split(/\s+/).length;
  const revealing = rv && it.t < it.at + (rv.dur ?? 0.5) + (rv.stagger ?? 0.06) * words * (rv.by === "char" ? 6 : 1) + 0.15;
  const moving = parentMoving || it.ei < 1 || it.eo > 0 || !!revealing;
  let op = 1;
  for (let e = it.wrap; e && !e.classList.contains("stage"); e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || "1");
  const r = it.fx.getBoundingClientRect();
  const rec = { actor: it.spec.actor, id: it.id || null, path, space: it.spec.space || "world", op: Math.round(op * 100) / 100, moving,
    backdrop: !!(it.def && it.def.backdrop),
    blur: Math.round(it.v("blur", 0) * 10) / 10,
    box: [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v)), texty: TEXTY.has(it.spec.actor), lines: [], text: "", overflow: false };
  if (rec.texty || it.spec.actor === "text") {
    const walker = document.createTreeWalker(it.fx, NodeFilter.SHOW_TEXT);
    const parts = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const pe = n.parentElement;
      if (pe && (getComputedStyle(pe).visibility === "hidden" || parseFloat(getComputedStyle(pe).opacity) === 0)) continue;
      parts.push(n.textContent.trim());
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const lr of rg.getClientRects()) if (lr.width > 1 && lr.height > 1) rec.lines.push([lr.left, lr.top, lr.right, lr.bottom].map((v) => Math.round(v)));
    }
    rec.text = parts.join(" ").slice(0, 60);
    const el = it.inst.el;
    if (el && el.scrollWidth && el.clientWidth && el.scrollWidth > el.clientWidth + 3 && getComputedStyle(el).overflow !== "visible") rec.overflow = true;
  }
  // real size (proportions), floor contact, pose limits
  if (it.realM && it.spec.real !== false) {
    const m = it.screenMatrix(), dim = it.realM.h ? "h" : "w";
    const px = dim === "h" ? it.h * Math.hypot(m.b, m.d) : it.w * Math.hypot(m.a, m.c);
    rec.real = { m: it.realM.h ?? it.realM.w, dim, px: Math.round(px), depth: Number(it.spec.depth ?? 1), par: it.layer ? it.layer.par : null };
  }
  const floor = H.shot && H.shot.draw && H.shot.draw.floor;
  if (floor != null && !it.parent && GROUNDED.has(it.spec.actor) && (it.spec.space ?? "world") !== "screen" && (it.layer?.par ?? 1) === Number(H.shot.draw.floor_par ?? 1)) {
    rec.ground = { y: Math.round(it.v("y", 0)), floor, air: !!it.spec.air };
  }
  // support: grounded objects need a surface under their base on the same parallax layer (layout audit «support»)
  if (!it.parent && (it.spec.space ?? "world") !== "screen") {
    rec.par = it.layer ? it.layer.par : 1;
    if (GROUNDED.has(it.spec.actor) || it.def.grounded) rec.stands = { air: !!it.spec.air };
    // "floor": a real ground/floor (turns the check on for the shot); true: something one can stand on (shape, image…)
    if (SURFACES.has(it.spec.actor) || it.def.surface) rec.surface = it.def.surface || ["ground", "street", "room"].includes(it.spec.actor) ? "floor" : true;
  }
  if (it.poseClamped) rec.pose_clamped = it.poseClamped;
  // appears with a hard cut (no enter, no reveal/count/opacity animation) after the shot has started
  const sp = it.spec, shotStart = H.shot ? H.shot.start : 0;
  if (!it.parent && it.at > shotStart + 0.08 && !sp.enter && !sp.reveal && !sp.count && !(sp.anim || []).some((a) => "opacity" in a)) rec.pop = true;
  // deliberate motion loops: their wobble is not jitter
  if (sp.shakes || sp.wiggle || sp.float || sp.sway || sp.bob || sp.pulse || sp.spin || sp.blink || sp.flicker || it.spec.actor === "particles") rec.loops = true;
  out.push(rec);
  it.children.forEach((c, j) => { c.index = j; layoutOf(c, out, path, moving); });
}
window.drawLayout = async (shotId, frame) => {
  const st = await stageFor(shotId);
  renderSettled(st, frame / FPS);
  if (document.fonts.status !== "loaded") { await document.fonts.ready; renderSettled(st, frame / FPS); }
  if (H.pending && H.pending.length) { await Promise.all(H.pending); H.pending = []; }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = [];
  st.items.forEach((it, i) => { it.index = i; layoutOf(it, out, "", false); });
  const cam = camState(st.shot, frame / FPS);
  return { cam: { x: cam.x, y: cam.y, z: cam.z, shake: Math.round((Math.abs(cam.sx || 0) + Math.abs(cam.sy || 0)) * 10) / 10 }, realScene: !!(st.shot.draw && st.shot.draw.px_per_m), items: out };
};
window.drawInfo = { shots: TL.shots.filter((s) => s.draw && s.draw.engine !== "motion").map((s) => s.id), fps: FPS, actors: Object.keys(ACTORS).sort() };
window.drawReady = true;
