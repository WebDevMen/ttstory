// Helpers shared by the HUD runtime, HUD components, the draw runtime and draw actors:
// easing, ramps, colors, Twemoji, icons, text markup (**accent**, [colored](red), emoji), tiny DOM helpers.
export let EMOJI = new Set();
const EMOJI_BASE = new URL("vendor/emoji/", import.meta.url).pathname;
try { EMOJI = new Set(await (await fetch(new URL("vendor/emoji/index.json", import.meta.url))).json()); } catch (e) { /* optional */ }

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
  if (s[0] === "#") { s = s.slice(1); if (s.length <= 4) s = [...s.slice(0, 3)].map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)).join(","); }
  return s.replace(/\s+/g, "");
}
function emoji(ch, cls = "emoji") {
  const cps = [...ch].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== "fe0f");
  const code = cps.join("-");
  if (EMOJI.has(code)) return `<img class="${cls}" src="${EMOJI_BASE}${code}.svg" alt="">`;
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
  h = h.replace(/\[([^\]\n]+)\]\(([#\w,. ]+)\)/g, (m, txt, c) => `<span class="mk" style="--mk:${rgb(c)};color:rgb(${rgb(c)})">${txt}</span>`);
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

export { clamp, lerp, P, E, hash, NAMED, rgb, emoji, SVG, GLYPH, icon, markup, html, fmt, ramp };
