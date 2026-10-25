// Draw core: an "item" is one actor instance placed in a draw shot. Items share universal props
// (position, scale, rotation, opacity, enter/exit, loops, filters, anim steps), any prop can change over time
// (value tracks), and actors can build other items inside themselves (H.child) — the same machinery all the way down.
import { clamp, lerp, P, E, hash, rgb } from "../lib.js";

// ------------------------------------------------------------------ easing (built-ins + every GSAP ease string)
const ALIAS = { in: "inCubic", out: "outCubic", inout: "inOut", back: "outBack", expo: "outExpo" };
Object.assign(E, {
  inQuad: (x) => clamp(x) ** 2,
  outQuad: (x) => 1 - (1 - clamp(x)) ** 2,
  inOutSine: (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x)),
  outBounce: (x) => {
    x = clamp(x);
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
  outElastic: (x) => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
  step: (x) => (x >= 1 ? 1 : 0),
});
const easeCache = new Map();
export function ease(name) {
  if (typeof name === "function") return name;
  if (!name) return E.inOut;
  if (easeCache.has(name)) return easeCache.get(name);
  let f = E[ALIAS[name] || name];
  if (!f && window.gsap) {
    try { const g = window.gsap.parseEase(name); if (g) f = (x) => g(clamp(x)); } catch (e) { f = null; }
  }
  if (!f) { console.error(`unknown ease '${name}'`); f = E.inOut; }
  easeCache.set(name, f);
  return f;
}

// ------------------------------------------------------------------ colors
export function hex(c) {
  const v = rgb(c).split(",").map(Number);
  return "#" + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");
}
function mixHex(a, b, f) {
  const x = rgb(a).split(",").map(Number), y = rgb(b).split(",").map(Number);
  return hex(x.map((v, i) => v + (y[i] - v) * f).join(","));
}

// ------------------------------------------------------------------ value tracks
// A prop is a track when it is {at, to|v, ...} or a list of such keys: [{at, v, dur|until, ease, from}].
// Numbers, number arrays and "#rrggbb" colors are interpolated; anything else switches at `at`.
const isKey = (k) => k != null && typeof k === "object" && !Array.isArray(k) && "at" in k;
const CONFIG_KEYS = new Set(["count", "reveal", "grow", "routes", "spins", "bursts", "rain", "enter", "exit", "follow", "highlight"]);
export const isTrack = (v) => (Array.isArray(v) ? v.length > 0 && v.every(isKey) && v.some((k) => "v" in k || "to" in k) : isKey(v) && ("to" in v || "v" in v));
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const lerpable = (a, b) => (typeof a === "number" && typeof b === "number")
  || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x) => typeof x === "number"))
  || (typeof a === "string" && typeof b === "string" && a[0] === "#" && b[0] === "#")
  || (isObj(a) && isObj(b));
export function mix(a, b, f) {
  if (typeof a === "number") return a + (b - a) * f;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * f);
  if (isObj(a)) {                      // objects (e.g. poses): mix shared interpolable keys, switch the rest
    const o = { ...a };
    for (const [k, v] of Object.entries(b)) o[k] = k in a && lerpable(a[k], v) ? mix(a[k], v, f) : f >= 0.5 ? v : a[k] ?? v;
    return o;
  }
  return mixHex(a, b, f);
}
export function track(spec, t, def) {
  if (!isTrack(spec)) return spec === undefined ? def : spec;
  const keys = Array.isArray(spec) ? spec : [spec];
  let v = keys[0].from !== undefined ? keys[0].from : Array.isArray(spec) && !keys[0]._anim ? (keys[0].v ?? keys[0].to) : def;
  for (const k of keys) {
    if (t < k.at) break;
    const target = k.v !== undefined ? k.v : k.to;
    if (k.from !== undefined && k !== keys[0]) v = k.from;
    if (v === undefined || !lerpable(v, target)) { v = target; continue; }
    const d = k.until != null ? k.until - k.at : (k.dur ?? 0.4);
    v = mix(v, target, ease(k.ease)(P(t, k.at, d)));
  }
  return v;
}

// smooth deterministic noise in [-1, 1]
export function noise(t, seed = 0, freq = 0.2) {
  const a = hash(seed * 3.1 + 1) * 6.283, b = hash(seed * 7.7 + 2) * 6.283, c = hash(seed * 1.3 + 3) * 6.283;
  return (Math.sin(6.283 * freq * t + a) + 0.5 * Math.sin(6.283 * freq * 2.31 * t + b) + 0.25 * Math.sin(6.283 * freq * 4.73 * t + c)) / 1.75;
}
export function rng(seed) {             // deterministic PRNG (mulberry32)
  let s = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------------ enter / exit presets
function opt(spec, k, d) { return spec && typeof spec === "object" && spec[k] !== undefined ? spec[k] : d; }
export function enterFx(type, k, spec) {
  const o = { x: 0, y: 0, s: 1, sx: 1, sy: 1, rot: 0, rx: 0, ry: 0, op: 1, blur: 0, clip: null, draw: null };
  const dist = opt(spec, "dist", null);
  switch (type) {
    case "none": break;
    case "fade": o.op = k; break;
    case "pop": o.s = lerp(0.5, 1, E.outBack(k)); o.op = clamp(k * 3); break;
    case "zoom": o.s = lerp(1.6, 1, E.outCubic(k)); o.op = clamp(k * 2); break;
    case "stamp": o.s = lerp(2.1, 1, E.outBack(k)); o.rot = lerp(-9, 0, E.outBack(k)); o.op = clamp(k * 4); break;
    case "grow": o.s = Math.max(0, E.outBack(k)); o.op = k > 0 ? 1 : 0; break;
    case "grow_y": o.sy = Math.max(0.001, E.outCubic(k)); o.op = k > 0 ? 1 : 0; break;
    case "grow_x": o.sx = Math.max(0.001, E.outCubic(k)); o.op = k > 0 ? 1 : 0; break;
    case "slide_up": o.y = (1 - E.outCubic(k)) * (dist ?? 140); o.op = clamp(k * 2.5); break;
    case "slide_down": o.y = -(1 - E.outCubic(k)) * (dist ?? 140); o.op = clamp(k * 2.5); break;
    case "slide_left": o.x = (1 - E.outCubic(k)) * (dist ?? 160); o.op = clamp(k * 2.5); break;
    case "slide_right": o.x = -(1 - E.outCubic(k)) * (dist ?? 160); o.op = clamp(k * 2.5); break;
    case "rise": o.y = (1 - E.outBack(k)) * (dist ?? 70); o.op = clamp(k * 3); break;
    case "drop": o.y = -(1 - E.outBounce(k)) * (dist ?? 420); o.op = clamp(k * 5); break;
    case "fly_left": o.x = (1 - E.outCubic(k)) * (dist ?? 1200); break;
    case "fly_right": o.x = -(1 - E.outCubic(k)) * (dist ?? 1200); break;
    case "fly_up": o.y = (1 - E.outCubic(k)) * (dist ?? 1400); break;
    case "fly_down": o.y = -(1 - E.outCubic(k)) * (dist ?? 1400); break;
    case "spin": o.rot = lerp(-200, 0, E.outBack(k)); o.s = E.outBack(k); o.op = clamp(k * 3); break;
    case "flip_x": o.rx = lerp(90, 0, E.outBack(k)); o.op = clamp(k * 3); break;
    case "flip_y": o.ry = lerp(90, 0, E.outBack(k)); o.op = clamp(k * 3); break;
    case "blur": o.blur = (1 - k) * 24; o.op = k; break;
    case "wipe_right": o.clip = `inset(-20% ${(1 - E.outCubic(k)) * 120 - 20}% -20% -20%)`; break;
    case "wipe_left": o.clip = `inset(-20% -20% -20% ${(1 - E.outCubic(k)) * 120 - 20}%)`; break;
    case "wipe_up": o.clip = `inset(${(1 - E.outCubic(k)) * 120 - 20}% -20% -20% -20%)`; break;
    case "wipe_down": o.clip = `inset(-20% -20% ${(1 - E.outCubic(k)) * 120 - 20}% -20%)`; break;
    case "iris": o.clip = k >= 1 ? null : `circle(${E.outCubic(k) * 75}% at 50% 50%)`; break;
    case "draw": o.draw = k; break;
    default: o.op = k;
  }
  return o;
}
export function exitFx(type, k, spec) {
  const o = { x: 0, y: 0, s: 1, sx: 1, sy: 1, rot: 0, rx: 0, ry: 0, op: 1, blur: 0, clip: null, draw: null };
  if (k <= 0) return o;
  const dist = opt(spec, "dist", null);
  switch (type) {
    case "none": break;
    case "shrink": case "pop": o.s = 1 - E.inCubic(k) * 0.6; o.op = 1 - E.inCubic(k); break;
    case "zoom": o.s = 1 + 0.4 * E.inCubic(k); o.op = 1 - k; break;
    case "slide_up": o.y = -E.inCubic(k) * (dist ?? 140); o.op = 1 - k; break;
    case "slide_down": o.y = E.inCubic(k) * (dist ?? 140); o.op = 1 - k; break;
    case "slide_left": o.x = -E.inCubic(k) * (dist ?? 160); o.op = 1 - k; break;
    case "slide_right": o.x = E.inCubic(k) * (dist ?? 160); o.op = 1 - k; break;
    case "fall": o.y = E.inQuad(k) * (dist ?? 900); o.rot = k * 25; break;
    case "fly_left": o.x = -E.inCubic(k) * (dist ?? 1200); break;
    case "fly_right": o.x = E.inCubic(k) * (dist ?? 1200); break;
    case "fly_up": o.y = -E.inCubic(k) * (dist ?? 1400); break;
    case "fly_down": o.y = E.inCubic(k) * (dist ?? 1400); break;
    case "blur": o.blur = k * 24; o.op = 1 - k; break;
    case "wipe_right": o.clip = `inset(-20% -20% -20% ${E.inCubic(k) * 120 - 20}%)`; break;
    case "wipe_left": o.clip = `inset(-20% ${E.inCubic(k) * 120 - 20}% -20% -20%)`; break;
    case "iris": o.clip = `circle(${(1 - E.inCubic(k)) * 75}% at 50% 50%)`; break;
    case "draw": o.draw = 1 - k; break;
    default: o.op = 1 - k;
  }
  return o;
}

// ------------------------------------------------------------------ layout rules (docs/DRAW.md §10.1)
// text-bearing actors: auto-fit to the frame width (fit), measured by the layout audit
export const TEXTY = new Set(["text", "badge", "timetag", "callout", "bubble", "card", "checklist", "meter", "neon_sign", "mail"]);
export const FIT_MARGIN = 48;            // auto-fit keeps a text at least this far from both frame edges
// named places for the main kinds of on-screen text (screen space, centred on the vertical axis)
export const SLOTS = { tag: 200, title: 400, subtitle: 540, main: 880, lower: 1200, footer: 1420 };

// real-world sizes in metres ({h} = height, {w} = width) — with `draw.px_per_m` on a shot, items of these actors are
// scaled to their real size automatically (their `scale` then means depth: 0.8 = a bit further away), and the layout
// audit compares the proportions of everything in the frame. Project actors can declare `size_m: {h|w}` on their def.
export const REAL = {
  person: (p) => ({ h: { adult: 1.75, student: 1.62, kid: 1.25 }[(p.look && p.look.age) || "student"] ?? 1.62 }),
  slot_machine: { h: 1.8 }, roulette: { w: 0.8 }, playing_card: { h: 0.089 }, chips: { w: 0.04 }, phone: { h: 0.15 },
  desk: { h: 0.76 }, streetlight: { h: 4.5 }, clock: { w: 0.35 }, shoe: { w: 0.26 },
};
// actors that stand on the ground (origin = bottom): with `draw.floor` they are checked for floor contact
export const GROUNDED = new Set(["person", "slot_machine", "desk", "streetlight", "tree", "house", "building", "school", "lockers"]);
// surfaces things stand on: the layout audit checks that every grounded object (above, or a project actor with
// `grounded: true` on its def) has one right under its base, on the same parallax layer (docs/DRAW.md §10.6).
// Project actors that are surfaces declare `surface: true` on their def.
export const SURFACES = new Set(["ground", "street", "room", "shape", "image", "svg", "sketch", "poker_table"]);

// ------------------------------------------------------------------ items
const UNIVERSAL = new Set(["actor", "id", "x", "y", "scale", "sx", "sy", "rot", "opacity", "flip", "par", "space", "at", "until",
  "enter", "enter_dur", "enter_ease", "exit", "exit_dur", "anim", "float", "bob", "wiggle", "sway", "pulse", "spin", "blink",
  "flicker", "shakes", "glow", "glow_k", "shadow", "blur", "brightness", "saturate", "contrast", "hue", "grayscale", "blend",
  "origin", "sfx", "sfx_gain", "z", "visible", "note", "persp", "tilt_x", "tilt_y", "clip", "fit", "slot", "real", "size_m", "depth", "air", "ground"]);
const TRACKABLE = ["x", "y", "scale", "sx", "sy", "rot", "opacity", "blur", "brightness", "saturate", "contrast", "hue", "grayscale",
  "glow_k", "tilt_x", "tilt_y", "visible"];
const TIMING = new Set(["at", "dur", "until", "ease", "path", "orient", "from"]);

function resolveOrigin(o, w, h) {
  if (Array.isArray(o)) return [Number(o[0]), Number(o[1])];
  const m = { center: [0.5, 0.5], bottom: [0.5, 1], top: [0.5, 0], left: [0, 0.5], right: [1, 0.5], "top-left": [0, 0], "top-right": [1, 0],
    "bottom-left": [0, 1], "bottom-right": [1, 1], none: [0, 0] }[o || "none"] || [0, 0];
  return [m[0] * (w || 0), m[1] * (h || 0)];
}

// path helpers for anim steps with `path`: [[x,y], ...] (smooth curve through points) or an SVG path string
const SVGNS = "http://www.w3.org/2000/svg";
let pathHost = null;
function pathEl(path) {
  if (!pathHost) { pathHost = document.createElementNS(SVGNS, "svg"); pathHost.style.cssText = "position:absolute;width:0;height:0"; document.body.appendChild(pathHost); }
  const el = document.createElementNS(SVGNS, "path");
  el.setAttribute("d", typeof path === "string" ? path : smoothPath(path));
  pathHost.appendChild(el);
  return el;
}
export function smoothPath(pts, closed = false) {   // Catmull-Rom through points -> cubic Bezier path
  if (pts.length < 3) return `M${pts.map((p) => p.join(",")).join(" L")}`;
  const P_ = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < P_.length - 2; i++) {
    const [p0, p1, p2, p3] = [P_[i - 1], P_[i], P_[i + 1], P_[i + 2]];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return closed ? d + "Z" : d;
}

export class Item {
  constructor(spec, H, parent = null) {
    this.spec = spec;
    this.H = H;
    this.parent = parent;
    this.children = [];
    this.over = {};
    this.id = spec.id;
    this.at = spec.at ?? -1e9;
    this.until = spec.until ?? 1e9;
    this.seed = hash((H.nextSeed = (H.nextSeed || 0) + 1) * 1.37) * 1000;
    this.tracks = {};
    this.paths = [];
    this.matrix = new DOMMatrix();
    this.visible = false;
    // static props for create(); track-valued props are passed with their value at the item's start
    const props = {};
    // config objects that look like a one-step track ({at, from, to, dur}) but are not animated values
    const raw = (k, v) => CONFIG_KEYS.has(k) || !isTrack(v);
    for (const [k, v] of Object.entries(spec)) props[k] = raw(k, v) ? v : track(v, this.at > -1e8 ? this.at : 0, undefined);
    this.props = props;
    for (const [k, v] of Object.entries(spec)) if (!raw(k, v)) this.tracks[k] = v;
    // anim: [{at, dur, ease, x, dx, y, dy, scale, rot, opacity, <any actor prop>, path, orient}]
    const steps = [...(spec.anim || [])].sort((a, b) => a.at - b.at);
    const cur = {};
    for (const st of steps) {
      if (st.path) {
        this.paths.push({ at: st.at, dur: st.dur ?? 1, ease: st.ease || "inOut", el: pathEl(st.path), orient: st.orient });
        const last = typeof st.path === "string" ? null : st.path[st.path.length - 1];
        if (last) { cur.x = last[0]; cur.y = last[1]; }
        continue;
      }
      for (const [k0, v] of Object.entries(st)) {
        if (TIMING.has(k0)) continue;
        let k = k0, target = v;
        if (k0 === "dx" || k0 === "dy") {
          k = k0 === "dx" ? "x" : "y";
          target = (cur[k] ?? spec[k] ?? 0) + v;
        }
        if (!this.tracks[k]) {
          const base = spec[k] !== undefined && !isTrack(spec[k]) ? spec[k] : undefined;
          this.tracks[k] = base !== undefined ? [{ at: -1e9, v: base, dur: 0 }] : [];
        } else if (!Array.isArray(this.tracks[k])) this.tracks[k] = [this.tracks[k]];
        this.tracks[k].push({ at: st.at, v: target, dur: st.dur ?? 0.5, until: st.until, ease: st.ease || "inOut", _anim: true });
        cur[k] = target;
      }
    }
  }

  // current value of a prop (parent overrides > tracks > static)
  v(name, def, t = this.t) {
    if (name in this.over) return this.over[name];
    if (name in this.tracks) return track(this.tracks[name], t, this.spec[name] !== undefined && !isTrack(this.spec[name]) ? this.spec[name] : def);
    const s = this.spec[name];
    return s === undefined ? def : s;
  }

  async build(def, container) {
    const H = this.H;
    this.def = def;
    this.wrap = document.createElement("div");
    this.wrap.className = "di";
    if (this.spec.actor) this.wrap.dataset.actor = this.spec.actor;
    if (this.id) this.wrap.dataset.id = this.id;
    this.fx = document.createElement("div");
    this.fx.className = "dfx";
    this.wrap.appendChild(this.fx);
    container.appendChild(this.wrap);
    const prev = H._current;
    H._current = this;
    this.inst = await def.create(this.props, H, this);
    H._current = prev;
    if (this.inst.el && !this.inst.el.parentNode) this.fx.appendChild(this.inst.el);
    const w = this.inst.w ?? def.w, h = this.inst.h ?? def.h;
    this.w = typeof w === "function" ? w(this.props) : w;
    this.h = typeof h === "function" ? h(this.props) : h;
    if ((this.w == null || this.h == null) && this.inst.el) {
      // auto-sized (HTML) items are re-measured after every update (render), so a late web font or a growing counter
      // keeps the item on its origin instead of drifting to one side
      if (this.inst.el instanceof HTMLElement) this.autoSize = [this.w == null, this.h == null];
      // children of a group / phone screen are built before their parent is in the document: measure on first show
      if (!this.inst.el.isConnected) this.remeasure = [this.w == null, this.h == null];
      const r = this.inst.el.getBoundingClientRect(), el = this.inst.el;
      // content wider than its box (a long word in a fixed-width text) counts, so the origin stays on the real centre
      // (plain text only: containers and boxed actors have parts placed outside their box on purpose)
      const sc = this.spec.actor === "text";
      this.w ??= sc ? Math.max(r.width, el.scrollWidth || 0) : r.width; this.h ??= sc ? Math.max(r.height, el.scrollHeight || 0) : r.height;
    }
    if (this.w != null) { this.fx.style.width = `${this.w}px`; this.fx.style.height = `${this.h}px`; }
    this.origin = resolveOrigin(this.spec.origin ?? this.inst.origin ?? def.origin, this.w, this.h);
    // real size: scale from metres when the shot sets px_per_m (explicit `scale` is then a depth factor only with real: true)
    const rm = this.spec.size_m ?? def.size_m ?? REAL[this.spec.actor];
    this.realM = this.spec.real === false ? null : typeof rm === "function" ? rm(this.props) : rm || null;
    this.realK = 1;
    const pxm = H.shot && H.shot.draw && H.shot.draw.px_per_m;
    if (pxm && this.realM && !this.parent && (this.spec.scale == null || this.spec.real === true)) {
      const nat = this.realM.h ? this.h : this.w, m = this.realM.h ?? this.realM.w;
      if (nat) this.realK = (pxm * m) / nat;
    }
    this.fitK = 1;
    this.fitOn = this.spec.fit !== false && (this.spec.fit != null || (!this.parent && TEXTY.has(this.spec.actor)));
    if (this.fitOn) this.updateFit();
    if (this.spec.blend) this.wrap.style.mixBlendMode = this.spec.blend;
    if (this.spec.clip) this.fx.style.clipPath = this.spec.clip;
    return this;
  }

  // phase 1: visibility + local matrix (recursive)
  prepare(t) {
    this.t = t;
    // (only once the element is laid out: inside a hidden parent it still measures 0 x 0)
    const rm = this.remeasure && this.inst.el.isConnected ? this.inst.el.getBoundingClientRect() : null;
    if (rm && rm.width > 0 && rm.height > 0) {
      const el = this.inst.el, [mw, mh] = this.remeasure;
      const bw = el.offsetWidth ?? rm.width, bh = el.offsetHeight ?? rm.height;
      if (mw) this.w = bw;
      if (mh) this.h = bh;
      this.fx.style.width = `${this.w}px`; this.fx.style.height = `${this.h}px`;
      this.origin = resolveOrigin(this.spec.origin ?? this.inst.origin ?? this.def.origin, this.w, this.h);
      this.remeasure = null;
    }
    const vis = this.v("visible", true);
    this.visible = vis !== false && vis !== 0 && t >= this.at - 1e-6 && t <= this.until + 1e-6;
    if (!this.visible) return;
    const sp = this.spec;
    const ent = sp.enter ? (typeof sp.enter === "string" ? sp.enter : sp.enter.type) : null;
    const ext = sp.exit ? (typeof sp.exit === "string" ? sp.exit : sp.exit.type) : null;
    const ed = sp.enter_dur ?? opt(sp.enter, "dur", 0.45), xd = sp.exit_dur ?? opt(sp.exit, "dur", 0.35);
    this.ei = ent ? ease(opt(sp.enter, "ease", "linear"))(P(t, this.at + opt(sp.enter, "delay", 0), ed)) : 1;
    this.eo = ext ? P(t, this.until - xd, xd) : 0;
    const a = ent ? enterFx(ent, this.ei, sp.enter) : null, b = ext ? exitFx(ext, this.eo, sp.exit) : null;
    let x = this.v("x", 0), y = this.v("y", 0), rot = this.v("rot", 0);
    const s = this.v("scale", 1) * (this.fitK ?? 1) * (this.realK ?? 1);
    let sx = s * this.v("sx", 1) * (this.v("flip", false) ? -1 : 1), sy = s * this.v("sy", 1);
    for (const p of this.paths) {
      if (t < p.at) continue;
      const L = p.el.getTotalLength(), f = ease(p.ease)(P(t, p.at, p.dur));
      const pt = p.el.getPointAtLength(L * f);
      x = pt.x; y = pt.y;
      if (p.orient) {
        const q = p.el.getPointAtLength(Math.min(L, L * f + 1)), q0 = p.el.getPointAtLength(Math.max(0, L * f - 1));
        rot += (Math.atan2(q.y - q0.y, q.x - q0.x) * 180) / Math.PI + (typeof p.orient === "number" ? p.orient : 0);
      }
    }
    // loops
    const T = t, sd = this.seed;
    const num = (v, k, d) => (typeof v === "number" ? (k === "amp" || k === "rot" ? v : d) : v?.[k] ?? d);
    if (sp.float) { const f = num(sp.float, "freq", 0.35); y += Math.sin(T * 6.283 * f + num(sp.float, "phase", sd)) * num(sp.float, "amp", 8); }
    if (sp.bob) { const f = num(sp.bob, "freq", 2); y -= Math.abs(Math.sin(T * 3.1416 * f + num(sp.bob, "phase", 0))) * num(sp.bob, "amp", 8); }
    if (sp.wiggle) { const f = num(sp.wiggle, "freq", 1.4); rot += Math.sin(T * 6.283 * f + num(sp.wiggle, "phase", sd)) * num(sp.wiggle, "rot", 4); }
    if (sp.sway) rot += noise(T, sd, num(sp.sway, "freq", 0.25)) * num(sp.sway, "rot", 3);
    if (sp.spin) rot += T * (typeof sp.spin === "number" ? sp.spin : sp.spin.speed ?? 90);
    let pulse = 1;
    if (sp.pulse) pulse = 1 + Math.sin(T * 6.283 * num(sp.pulse, "freq", 1) + num(sp.pulse, "phase", 0)) * num(sp.pulse, "amp", 0.05);
    for (const sh of sp.shakes || []) {
      if (T >= sh.at && T <= sh.at + (sh.dur ?? 0.4)) {
        const k = Math.exp((-4 * (T - sh.at)) / (sh.dur ?? 0.4)), fr = sh.freq ?? 18, amp = sh.amp ?? 12;
        x += amp * k * Math.sin(6.283 * fr * (T - sh.at)); y += amp * k * Math.cos(6.283 * fr * 0.87 * (T - sh.at));
        rot += (sh.rot ?? 0) * k * Math.sin(6.283 * fr * 0.7 * (T - sh.at));
      }
    }
    const fx = { x: (a?.x ?? 0) + (b?.x ?? 0), y: (a?.y ?? 0) + (b?.y ?? 0), rot: (a?.rot ?? 0) + (b?.rot ?? 0),
      s: (a?.s ?? 1) * (b?.s ?? 1) * pulse, sx: (a?.sx ?? 1) * (b?.sx ?? 1), sy: (a?.sy ?? 1) * (b?.sy ?? 1) };
    this.fxv = { a, b };
    const [ox, oy] = this.origin;
    this.matrix = new DOMMatrix().translate(x + fx.x, y + fx.y).rotate(rot + fx.rot).scale(sx * fx.s * fx.sx, sy * fx.s * fx.sy).translate(-ox, -oy);
    this.rx = (a?.rx ?? 0) + (b?.rx ?? 0) + this.v("tilt_x", 0);
    this.ry = (a?.ry ?? 0) + (b?.ry ?? 0) + this.v("tilt_y", 0);
    for (const c of this.children) c.prepare(t);
  }

  // matrix from local actor coordinates to screen
  screenMatrix() {
    let m = this.matrix, root = this;
    while (root.parent) { root = root.parent; m = root.matrix.multiply(m); }
    return (root.layer ? root.layer.matrix : new DOMMatrix()).multiply(m);
  }
  toScreen(lx, ly) { const q = this.screenMatrix().transformPoint(new DOMPoint(lx, ly)); return [q.x, q.y]; }
  anchor(name, args) {
    if (!name) return this.toScreen(this.origin[0], this.origin[1]);
    const pt = this.inst.anchor ? this.inst.anchor(name, args, this) : null;
    if (!pt) throw new Error(`actor '${this.spec.actor}' (${this.id}) has no anchor '${name}'`);
    return this.toScreen(pt[0], pt[1]);
  }

  // phase 2: styles + actor update (recursive)
  render(t) {
    const w = this.wrap;
    if (!this.visible) { if (w.style.display !== "none") w.style.display = "none"; return; }
    w.style.display = "";
    const { a, b } = this.fxv;
    const m = this.matrix;
    const tilt = this.rx || this.ry;
    if (tilt) {
      const [ox, oy] = this.origin;
      w.style.transform = `translate(${m.e + ox * m.a + oy * m.c}px, ${m.f + ox * m.b + oy * m.d}px) perspective(${this.spec.persp ?? 1200}px) rotateX(${this.rx}deg) rotateY(${this.ry}deg) matrix(${m.a},${m.b},${m.c},${m.d},0,0) translate(${-ox}px, ${-oy}px)`;
    } else w.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
    let op = this.v("opacity", 1) * (a?.op ?? 1) * (b?.op ?? 1);
    const sp = this.spec;
    if (sp.blink) { const f = sp.blink.freq ?? 1.5; op *= Math.sin(t * 6.283 * f + (sp.blink.phase ?? 0)) > (sp.blink.duty ?? -0.2) ? 1 : sp.blink.min ?? 0.15; }
    if (sp.flicker) { const fr = Math.floor(t * 30); if (hash(fr * 1.7 + this.seed) > 1 - (sp.flicker.prob ?? 0.06)) op *= sp.flicker.min ?? 0.35; }
    w.style.opacity = op;
    this.fx.style.filter = this.filters(a, b);
    const clip = a?.clip || b?.clip;
    if (clip || this._clipped) { this.fx.style.clipPath = clip || this.spec.clip || ""; this._clipped = !!clip; }
    const drawK = a?.draw ?? b?.draw ?? null;
    if (drawK != null || this._drawn) this.applyDraw(drawK ?? 1);
    if (this.inst.update) this.inst.update(t, this);
    if (this.autoSize && !this.remeasure) this.refit(tilt);
    else if (this.fitOn) this.updateFit();
    for (const c of this.children) c.render(t);
  }

  // fit: shrink the item (never enlarge) so its rotated box fits the frame width minus margins, or fit.w / fit.h.
  // Default for top-level text-bearing actors; `fit: false` turns it off, `fit: 700` / `fit: {w, h}` sets the box.
  updateFit(bw = this.w, bh = this.h) {
    const f = this.spec.fit, el = this.inst.el, tx = this.spec.actor === "text";
    const nw = Math.max(bw || 0, tx ? el?.scrollWidth || 0 : 0), nh = Math.max(bh || 0, tx ? el?.scrollHeight || 0 : 0);
    if (!nw || !nh) return;
    const W = this.H.frameW ?? 1080;
    const maxW = typeof f === "number" ? f : f?.w ?? W - 2 * FIT_MARGIN, maxH = (typeof f === "object" && f?.h) || Infinity;
    const sc = Math.abs(this.v("scale", 1)), sx = sc * Math.abs(this.v("sx", 1)), sy = sc * Math.abs(this.v("sy", 1));
    const r = (Math.abs(this.v("rot", 0)) % 180) * Math.PI / 180, c = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r));
    const aw = nw * sx * c + nh * sy * sn, ah = nw * sx * sn + nh * sy * c;
    const k = Math.min(1, maxW / Math.max(1, aw), maxH / Math.max(1, ah));
    if (Math.abs(k - (this.fitK ?? 1)) > 1e-4) this.H.layoutDirty = true;
    this.fitK = k;
  }

  // auto-sized item: if its content changed size, update the box and shift by the origin difference (same frame)
  refit(tilt) {
    const el = this.inst.el, [mw, mh] = this.autoSize;
    const sc = this.spec.actor === "text";
    const bw = mw ? (sc ? Math.max(el.offsetWidth, el.scrollWidth || 0) : el.offsetWidth) : this.w;
    const bh = mh ? (sc ? Math.max(el.offsetHeight, el.scrollHeight || 0) : el.offsetHeight) : this.h;
    if (this.fitOn) this.updateFit(bw, bh);
    if (!bw || !bh || (Math.abs(bw - this.w) < 0.5 && Math.abs(bh - this.h) < 0.5)) return;
    this.H.layoutDirty = true;
    this.w = bw; this.h = bh;
    this.fx.style.width = `${bw}px`; this.fx.style.height = `${bh}px`;
    const [ox0, oy0] = this.origin;
    this.origin = resolveOrigin(this.spec.origin ?? this.inst.origin ?? this.def.origin, bw, bh);
    const [ox, oy] = this.origin;
    this.matrix = this.matrix.translate(ox0 - ox, oy0 - oy);
    const m = this.matrix;
    if (tilt) this.wrap.style.transform = `translate(${m.e + ox * m.a + oy * m.c}px, ${m.f + ox * m.b + oy * m.d}px) perspective(${this.spec.persp ?? 1200}px) rotateX(${this.rx}deg) rotateY(${this.ry}deg) matrix(${m.a},${m.b},${m.c},${m.d},0,0) translate(${-ox}px, ${-oy}px)`;
    else this.wrap.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
  }

  filters(a, b) {
    const sp = this.spec, f = [];
    const blur = this.v("blur", 0) + (a?.blur ?? 0) + (b?.blur ?? 0);
    if (blur > 0.05) f.push(`blur(${blur}px)`);
    for (const k of ["brightness", "saturate", "contrast", "grayscale"]) { const v = this.v(k, null); if (v != null) f.push(`${k}(${v})`); }
    const hue = this.v("hue", null);
    if (hue != null) f.push(`hue-rotate(${hue}deg)`);
    if (sp.glow) {
      const g = typeof sp.glow === "object" && !Array.isArray(sp.glow) ? sp.glow : { color: sp.glow };
      const k = this.v("glow_k", 1), c = this.H.rgbOf(g.color ?? "white"), r = g.r ?? 16, al = (g.a ?? 0.85) * k;
      if (al > 0.01) f.push(`drop-shadow(0 0 ${r * 0.3}px rgba(${c},${al})) drop-shadow(0 0 ${r}px rgba(${c},${al * 0.6}))`);
    }
    if (sp.shadow) {
      const s = sp.shadow === true ? {} : sp.shadow;
      f.push(`drop-shadow(${s.x ?? 0}px ${s.y ?? 14}px ${s.blur ?? 22}px rgba(${this.H.rgbOf(s.color ?? "black")},${s.a ?? 0.35}))`);
    }
    return f.join(" ");
  }

  applyDraw(k) {
    if (!this._strokes) {
      this._strokes = [...this.fx.querySelectorAll("path, line, polyline, polygon, circle, rect, ellipse")].filter((e) => {
        const cs = getComputedStyle(e);
        return cs.stroke && cs.stroke !== "none";
      }).map((e) => { let L = 0; try { L = e.getTotalLength(); } catch (err) { L = 0; } return [e, L, getComputedStyle(e).fillOpacity]; });
    }
    this._drawn = k < 1;
    for (const [e, L, fo] of this._strokes) {
      if (!L) continue;
      e.style.strokeDasharray = k < 1 ? `${L} ${L}` : "";
      e.style.strokeDashoffset = k < 1 ? `${L * (1 - k)}` : "";
      e.style.fillOpacity = k < 1 ? String(Number(fo) * clamp((k - 0.55) / 0.45)) : "";
    }
  }

  find(id) {
    if (this.id === id) return this;
    for (const c of this.children) { const r = c.find(id); if (r) return r; }
    return null;
  }
  destroy() {
    for (const c of this.children) c.destroy();
    if (this.inst && this.inst.destroy) this.inst.destroy();
    for (const p of this.paths) p.el.remove();
  }
}

export { UNIVERSAL, TRACKABLE };
