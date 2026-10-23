// Deterministic HUD timeline. window.renderFrame(frameIndex) draws the HUD for that frame.
import { makeStill, makeShip } from "./holo.js";

const q = (s) => document.querySelector(s);
const TL = await (await fetch("../../build/timeline.json")).json();
let CAM = null;
try { CAM = await (await fetch("../../build/camera.json")).json(); } catch (e) { CAM = null; }
const C = TL.cues;
// make sure every face is loaded before the first screenshot (hidden elements would not trigger loading)
await Promise.all(["500 20px Exo2", "600 20px Exo2", "700 20px Exo2", "800 20px Exo2", "900 20px Exo2", "italic 800 20px Exo2",
  "italic 900 20px Exo2", "400 20px JBM", "500 20px JBM", "700 20px JBM"].map((f) => document.fonts.load(f, "АБВЖЯабвжяABCxyz0123")));
const SC = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const SH = Object.fromEntries(TL.shots.map((s) => [s.id, s]));

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const P = (t, a, d) => clamp((t - a) / d);
const E = {
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inCubic: (x) => x * x * x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const frameNoise = (t, seed) => hash(Math.floor(t * 30) * 13.37 + seed * 71.1) * 2 - 1;
function show(el, on) { el.style.display = on ? "" : "none"; return on; }
// in/out envelope with optional glitch on exit
function envl(t, a, b, din = 0.35, dout = 0.22) {
  return { on: t >= a && t <= b, i: P(t, a, din), o: P(t, b - dout, dout) };
}
function glitchX(t, e, seed, amp = 26) {
  return e.o > 0 || e.i < 0.3 ? frameNoise(t, seed) * amp * Math.max(e.o, 0.3 - e.i) * 3 : 0;
}
function word(scene, text, nth = 0, edge = "start") {
  const hits = TL.words.filter((w) => w.scene === scene && w.text.toLowerCase() === text.toLowerCase());
  return hits[nth][edge];
}
function sceneAt(t) { return TL.scenes.find((s) => t >= s.start && t < s.end) || TL.scenes[TL.scenes.length - 1]; }
function shotAt(t) { return TL.shots.find((s) => t >= s.start && t < s.end) || TL.shots[TL.shots.length - 1]; }

let camFrame = null;
function anchor(name, fallback) {
  if (camFrame && camFrame.anchors && camFrame.anchors[name]) return camFrame.anchors[name];
  return fallback;
}

// ------------------------------------------------------------------ static setup
const still = makeStill(q("#cv-still"));
const ship = makeShip(q("#cv-ship"));
q("#cv-still").style.filter = "drop-shadow(0 0 4px rgba(70,255,150,.9)) drop-shadow(0 0 12px rgba(70,255,150,.45))";
q("#cv-ship").style.filter = "drop-shadow(0 0 3px rgba(64,255,230,.9)) drop-shadow(0 0 12px rgba(64,255,230,.4))";
const stillLabels = q("#still-labels");
const SL = [["sun", "СОЛНЦЕ", "255,190,60"], ["sheet", "ПЛЁНКА · КОНДЕНСАТ", "200,255,240"], ["sea", "МОРСКАЯ ВОДА", "60,200,255"], ["cup", "ПРЕСНАЯ ВОДА", "70,255,150"]]
  .map(([k, txt, c]) => { const d = document.createElement("div"); d.className = "hlabel"; d.textContent = txt; d.style.setProperty("--c", c); stillLabels.appendChild(d); return [k, d]; });
q("#hull-segs").innerHTML = "<i></i>".repeat(20);
q("#fuel-segs").innerHTML = "<i></i>".repeat(12);

const TITLE = "ВЫЖИВАНИЕ\nНА СУДНЕ";
const SCRAMBLE = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%&@";

// captions -----------------------------------------------------------
const SHORT = new Set(["а", "и", "в", "на", "с", "по", "за", "без", "к", "не", "ни", "до", "для", "но", "или", "ты", "бы"]);
function buildChunks(words) {
  const chunks = [];
  let cur = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (cur.length && cur[0].scene !== w.scene) { chunks.push(cur); cur = []; }
    cur.push(w);
    const next = words[i + 1];
    const len = cur.reduce((s, x) => s + x.text.length + 1, 0);
    const strong = /[.!?:…—]/.test(w.post);
    const comma = /,/.test(w.post);
    let brk = strong || comma || cur.length >= 4 || (next && len + next.text.length > 19);
    if (!next || next.scene !== w.scene) brk = true;
    if (brk && !strong && !comma && next && next.scene === w.scene) {
      // never leave a dangling preposition/conjunction at the end of a caption
      const carry = [];
      while (cur.length > 1 && SHORT.has(cur[cur.length - 1].text.toLowerCase())) carry.unshift(cur.pop());
      if (carry.length) { chunks.push(cur); cur = carry; continue; }
    }
    if (brk) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  return chunks.map((ws, i) => ({ words: ws, start: ws[0].start - 0.06, endWord: ws[ws.length - 1].end }));
}
const CHUNKS = buildChunks(TL.words);
CHUNKS.forEach((c, i) => {
  const nxt = CHUNKS[i + 1];
  c.end = nxt && nxt.start - c.endWord < 0.7 ? nxt.start : c.endWord + 0.35;
});
const CAP_COLOR = { s1: "64,255,230", s2: "70,255,150", s3: "255,70,90", s4: "255,190,60", s5: "255,190,90" };
const capEl = q("#caption");
let capBuilt = -1;
function capText(w) {
  let s = (w.pre || "") + w.text;
  if (w.post && /^[»…,.!?:]/.test(w.post)) s += w.post.replace(/—/g, "").trim();
  return s;
}

// ------------------------------------------------------------------ per-frame update
function update(t) {
  const scene = sceneAt(t);
  const shot = shotAt(t);
  const hud = q("#hud");

  // --- global shake & dimming
  const shake = camFrame && camFrame.shake ? camFrame.shake : [0, 0];
  const dimOff = t >= C.s4_light_off && t < SC.s4.end ? lerp(1, 0.38, P(t, C.s4_light_off, 0.12)) : 1;
  hud.style.transform = `translate(${shake[0] * 0.6}px, ${shake[1] * 0.6}px)`;
  hud.style.opacity = dimOff;
  capEl.style.translate = `${shake[0] * 0.6}px ${shake[1] * 0.6}px`;

  // --- accent colour per scene
  const accent = { s1: "64,255,230", s2: "70,255,150", s3: "255,60,80", s4: "255,60,80", s5: "255,170,90" }[scene.id];
  document.documentElement.style.setProperty("--c", accent);

  // --- brackets + topbar boot
  const boot = E.outExpo(P(t, 0.05, 0.6));
  document.querySelectorAll(".bracket").forEach((b, i) => {
    const dx = [1, -1, 1, -1][i] * (1 - boot) * 380, dy = [1, 1, -1, -1][i] * (1 - boot) * 760;
    const hit = t >= C.s1_not_alone && t < C.s1_not_alone + 0.5 ? (Math.floor(t * 20) % 2 ? "255,60,80" : accent) : accent;
    b.style.setProperty("--c", hit);
    b.style.transform = `translate(${dx}px, ${dy}px)`;
    b.style.opacity = 0.85 * boot;
  });
  const tb = q("#topbar");
  tb.style.opacity = P(t, 0.35, 0.3) * (Math.floor(t * 30) % 47 === 0 ? 0.4 : 1);
  const clock = { s1: [47, 7, 12], s2: [47, 14, 38], s3: [47, 23, 41], s4: [48, 2, 17], s5: [48, 19, 26] }[scene.id];
  const sec = Math.floor(t - scene.start);
  q("#clock").textContent = `ДЕНЬ ${clock[0]} · ${String(clock[1]).padStart(2, "0")}:${String(clock[2]).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  // --- red edge (scene 4) + "not alone" pulse in scene 1
  const edge = q("#edge");
  let edgeA = 0;
  if (scene.id === "s4") {
    edgeA = P(t, SC.s4.start, 0.3) * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.15)));
    edgeA *= 1 - P(t, SC.s4.end - 0.15, 0.15);
  }
  if (t >= C.s1_not_alone && t < C.s1_not_alone + 0.8) edgeA = Math.max(edgeA, 0.75 * (1 - P(t, C.s1_not_alone, 0.8)));
  edge.style.opacity = edgeA;
  edge.style.display = edgeA > 0.001 ? "" : "none";

  // ================= scene 1
  {
    const e = envl(t, C.s1_stats - 0.1, SC.s1.end + 0.05, 0.45, 0.25);
    const el = q("#stats");
    if (show(el, e.on)) {
      const k = E.outCubic(e.i);
      el.style.opacity = k * (1 - e.o);
      el.style.transform = `perspective(1000px) translateX(${lerp(-80, 0, k) + glitchX(t, e, 1)}px) rotateY(${lerp(40, 16, k) + Math.sin(t * 1.3) * 2}deg) rotateX(${3 + Math.sin(t * 0.9) * 1.5}deg)`;
      el.style.setProperty("--sheen", `${lerp(-100, 420, P(t, C.s1_stats + 0.5, 0.7))}%`);
      const rows = el.querySelectorAll(".row");
      const vals = [[75, "%", "#v-hp", "#b-hp"], [20, "%", "#v-rad", "#b-rad"], [1.5, " л", "#v-h2o", "#b-h2o"]];
      rows.forEach((r, i) => {
        const a = C.s1_stats + 0.12 + i * 0.22;
        const ri = E.outBack(P(t, a, 0.35));
        r.style.opacity = P(t, a, 0.15);
        r.style.transform = `translateX(${(1 - ri) * -30}px)`;
        const cnt = E.outCubic(P(t, a + 0.05, 0.7));
        const [v, unit, vs, bs] = vals[i];
        const cur = v * cnt;
        q(vs).textContent = (unit === " л" ? cur.toFixed(1) : Math.round(cur)) + unit;
        q(bs).style.width = `${(unit === " л" ? (cur / 3) * 100 : cur)}%`;
      });
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.25)), 12);
      rows[0].querySelector(".ico").style.transform = `scale(${1 + beat * 0.18})`;
      rows[1].querySelector(".ico").style.transform = `rotate(${t * 40}deg)`;
      rows[2].querySelector(".ico").style.transform = `translateY(${Math.sin(t * 3) * 3}px)`;
    }
  }
  {
    const e = envl(t, C.s1_title - 0.08, SC.s1.end + 0.03, 0.3, 0.2);
    const el = q("#title");
    if (show(el, e.on)) {
      const k = E.outExpo(e.i);
      el.style.opacity = (1 - e.o) * clamp(e.i * 4);
      el.style.transform = `perspective(1200px) translateX(${glitchX(t, e, 2, 40)}px) scaleY(${lerp(0.04, 1, k)}) rotateX(${(1 - k) * 30 + Math.sin(t * 1.1) * 3}deg) scale(${1 + 0.06 * e.o})`;
      el.style.setProperty("--sheen", `${lerp(-100, 520, P(t, C.s1_title + 0.55, 0.6))}%`);
      const a0 = C.s1_title + 0.12;
      let out = "";
      [...TITLE].forEach((ch, i) => {
        if (ch === "\n") { out += "<br>"; return; }
        const ts = a0 + i * 0.028;
        if (t < ts) out += "<span style='opacity:0'>" + ch + "</span>";
        else if (t < ts + 0.14 && ch !== " ") out += SCRAMBLE[Math.floor(hash(i * 7 + Math.floor(t * 30)) * SCRAMBLE.length)];
        else out += ch;
      });
      q("#title-b").innerHTML = out;
      q("#title-k").style.opacity = P(t, C.s1_title, 0.2);
      q("#title-k").style.letterSpacing = `${lerp(30, 9, E.outCubic(P(t, C.s1_title, 0.5)))}px`;
      q("#title-r").style.width = `${80 * E.outCubic(P(t, C.s1_title + 0.35, 0.6))}%`;
    }
  }

  // ================= section markers
  const markers = [["#mk-do", C.s2_marker, SC.s2.end], ["#mk-dont", C.s3_marker, SC.s3.end], ["#mk-threat", C.s4_marker, C.s4_scrape - 0.05]];
  markers.forEach(([sel, a, b], i) => {
    const el = q(sel);
    const e = envl(t, a, b, 0.5, 0.2);
    if (show(el, e.on)) {
      const k = E.outBack(e.i);
      const gl = sel === "#mk-dont" ? glitchX(t, { i: e.i * 0.6, o: e.o }, 5 + i, 60) : glitchX(t, e, 5 + i);
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transform = `translateX(-50%) translateX(${gl}px) translateY(${Math.sin(t * 2.4) * 7 + (1 - k) * -30}px) perspective(800px) rotateX(${Math.sin(t * 1.7) * 6}deg) scale(${lerp(0.6, 1, k)})`;
      el.querySelector(".ic").style.transform = `scale(${1 + 0.12 * Math.pow(Math.max(0, Math.sin((t - a) * Math.PI * 1.6)), 6)})`;
    }
  });

  // ================= scene 2
  {
    const e = envl(t, C.s2_never - 0.05, C.s2_schematic - 0.05, 0.3, 0.2);
    const el = q("#chip-sea");
    if (show(el, e.on)) {
      el.style.left = "50%"; el.style.top = "340px";
      el.style.opacity = clamp(e.i * 3) * (1 - e.o) * (Math.floor(t * 6) % 6 === 0 ? 0.55 : 1);
      el.style.transform = `translateX(-50%) translateX(${glitchX(t, e, 9)}px) scale(${lerp(0.8, 1, E.outBack(e.i))})`;
    }
  }
  {
    const e = envl(t, C.s2_schematic - 0.1, SH.tarp.end + 0.02, 0.5, 0.22);
    const el = q("#distiller");
    if (show(el, e.on)) {
      const k = E.outCubic(e.i);
      el.style.opacity = clamp(e.i * 2.5) * (1 - e.o);
      el.style.transform = `perspective(1100px) translateX(${lerp(-60, 0, k) + glitchX(t, e, 11)}px) rotateY(${lerp(-50, 14, k) + Math.sin(t * 1.2) * 3}deg) rotateX(${4 + Math.sin(t * 0.8) * 2}deg)`;
      const evap = P(t, C.s2_evaporator - 0.1, 0.4);
      const pts = still.render(t - C.s2_schematic, { fill: 0.15 + 0.6 * P(t, C.s2_schematic, 3.2), glow: 0.6 + 0.4 * evap });
      SL.forEach(([key, d], i) => {
        const [x, y] = pts[key];
        const li = P(t, C.s2_schematic + 0.35 + i * 0.18, 0.25);
        d.style.left = `${x}px`; d.style.top = `${y + 60}px`;
        d.style.opacity = li;
        d.style.transform = `translate(-50%, -50%) scale(${lerp(0.7, 1, E.outBack(li))})`;
      });
      q("#st1").style.opacity = lerp(0.3, 1, P(t, C.s2_schematic + 0.3, 0.2));
      q("#st2").style.opacity = lerp(0.3, 1, P(t, C.s2_schematic + 1.2, 0.2));
      q("#st3").style.opacity = lerp(0.3, 1, P(t, C.s2_evaporator, 0.2));
      q("#dist-title").textContent = t >= C.s2_evaporator ? "3D-СХЕМА · ИСПАРИТЕЛЬ" : "3D-СХЕМА · ДИСТИЛЛЯТОР";
    }
  }
  {
    const e = envl(t, C.s2_map - 0.15, SC.s2.end + 0.02, 0.4, 0.2);
    const el = q("#shipmap");
    if (show(el, e.on)) {
      const k = E.outExpo(e.i);
      // minimise into the upper-left corner when the door shot starts
      const mz = E.inOut(P(t, SH.door.start - 0.05, 0.45));
      const s = lerp(1, 0.5, mz);
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transformOrigin = "0% 0%";
      el.style.transform = `translate(${lerp(0, -25, mz) + glitchX(t, e, 13)}px, ${lerp(0, 15, mz)}px) perspective(1300px) rotateX(${lerp(12, 6, mz) + Math.sin(t * 0.9) * 2}deg) rotateY(${lerp(0, 14, mz)}deg) scale(${s}) scaleY(${lerp(0.03, 1, k)})`;
      const scanP = P(t, C.s2_map, C.s2_safezone - C.s2_map + 0.25);
      const safe = E.outCubic(P(t, C.s2_safezone, 0.4));
      const locked = P(t, C.s2_door_slam, 0.2);
      const pts = ship.render(t - C.s2_map, { reveal: E.outCubic(P(t, C.s2_map - 0.1, 0.5)), scanX: scanP < 1 ? lerp(4.3, -4.3, scanP) : null, safe, locked });
      q("#ship-scan").textContent = `СКАН ${String(Math.round(scanP * 100)).padStart(3, "0")}%`;
      const lab = q("#safe-label");
      const [bx, by] = pts.bridge;
      lab.style.left = `${bx}px`; lab.style.top = `${by + 56}px`;
      lab.style.opacity = safe;
      lab.style.transform = `translate(-50%, -100%) translateY(${(1 - E.outBack(safe)) * -26}px) scale(${1 + 0.04 * Math.sin(t * 7)})`;
      lab.querySelector(".s1").textContent = locked > 0 ? "ЗОНА ЗАБЛОКИРОВАНА" : "БЕЗОПАСНАЯ ЗОНА";
    }
  }
  {
    const e = envl(t, C.s2_door_slam, SC.s2.end + 0.02, 0.18, 0.15);
    const el = q("#stamp");
    if (show(el, e.on)) {
      const k = E.outBack(e.i);
      el.style.opacity = clamp(e.i * 4) * (1 - e.o);
      el.style.transform = `translate(-50%, -50%) scale(${lerp(1.9, 1, k)}) rotate(${lerp(-8, -3, k)}deg)`;
      el.style.top = "1060px";
    }
  }

  // ================= scene 3
  {
    const e = envl(t, C.s3_flare_block - 0.06, SH.flare.end + 0.02, 0.4, 0.2);
    const el = q("#block");
    if (show(el, e.on)) {
      const [ax, ay] = anchor("flare", [800, 560]);
      const k = E.outBack(P(t, C.s3_flare_block - 0.06, 0.45));
      const pulse = 1 + 0.03 * Math.sin(t * 9);
      el.style.left = `${ax}px`; el.style.top = `${ay}px`;
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transform = `translate(-50%, -50%) translateX(${glitchX(t, e, 17, 40)}px) scale(${lerp(1.5, 1, k) * pulse})`;
      const ring = q("#blk-ring"), slash = q("#blk-slash");
      const circ = 2 * Math.PI * 160;
      ring.setAttribute("stroke-dasharray", circ);
      ring.setAttribute("stroke-dashoffset", circ * (1 - E.outCubic(P(t, C.s3_flare_block, 0.32))));
      ring.setAttribute("transform", "rotate(-90)");
      const sl = 320;
      slash.setAttribute("stroke-dasharray", sl);
      slash.setAttribute("stroke-dashoffset", sl * (1 - E.outCubic(P(t, C.s3_flare_block + 0.25, 0.18))));
      q("#blk-ticks").setAttribute("transform", `rotate(${t * 60})`);
      const lb = el.querySelector(".lbl");
      lb.style.opacity = P(t, C.s3_flare_block + 0.35, 0.2);
      lb.style.transform = `translateX(-50%) translateY(${(1 - E.outCubic(P(t, C.s3_flare_block + 0.35, 0.3))) * 20}px)`;
    }
  }
  {
    const e = envl(t, C.s3_not_only_people - 0.05, SH.flare.end + 0.02, 0.3, 0.2);
    const el = q("#chip-sonar");
    if (show(el, e.on)) {
      el.style.left = "60px"; el.style.top = "990px";
      el.style.opacity = clamp(e.i * 3) * (1 - e.o) * (0.6 + 0.4 * (Math.floor(t * 4) % 2));
      el.style.transform = `translateX(${glitchX(t, e, 19)}px)`;
    }
  }
  {
    const e = envl(t, C.s3_biohazard - 0.06, SC.s3.end + 0.02, 0.5, 0.2);
    const el = q("#bio");
    if (show(el, e.on)) {
      const [ax, ay] = anchor("hatch", [520, 900]);
      const k = E.outBack(e.i);
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.6);
      el.style.left = `${ax}px`; el.style.top = `${ay}px`;
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transform = `translate(-50%, -100%) translateX(${glitchX(t, e, 23)}px) perspective(700px) rotateX(${lerp(88, 24, k)}deg) rotateZ(${Math.sin(t * 1.3) * 2}deg) scale(${1 + 0.05 * pulse})`;
      el.querySelector(".plate3d").style.boxShadow = `0 0 ${30 + 40 * pulse}px rgba(200,255,60,${0.35 + 0.4 * pulse}), inset 0 0 22px rgba(200,255,60,.3)`;
    }
  }
  {
    const e = envl(t, C.s3_breaths - 0.08, SC.s3.end + 0.02, 0.3, 0.2);
    const el = q("#breaths");
    if (show(el, e.on)) {
      const [ax, ay] = anchor("hatch", [520, 900]);
      el.style.left = `${ax}px`; el.style.top = `${ay + 40}px`;
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transform = `translateX(-50%) translateX(${glitchX(t, e, 29)}px) scale(${lerp(0.8, 1, E.outBack(e.i))})`;
      const offs = [word("s3", "три"), word("s3", "вдоха"), word("s3", "вдоха", 0, "end")];
      el.querySelectorAll(".pips i").forEach((p, i) => {
        const gone = t >= offs[i];
        p.style.background = gone ? "transparent" : "rgba(255,60,80,.9)";
        p.style.opacity = gone ? 0.35 : 1;
        p.style.transform = `scale(${gone ? 0.8 : 1 + 0.15 * Math.max(0, 1 - (offs[i] - t) * 3) * (Math.floor(t * 12) % 2)})`;
      });
      const sk = el.querySelector(".skull");
      const ks = P(t, offs[2], 0.2);
      sk.style.opacity = 0.25 + 0.75 * ks;
      sk.style.transform = `scale(${1 + 0.4 * Math.sin(ks * Math.PI)})`;
    }
  }

  // ================= scene 4
  {
    const e = envl(t, C.s4_leak - 0.1, SH.leak.end + 0.02, 0.45, 0.2);
    const el = q("#hull");
    if (show(el, e.on)) {
      const k = E.outCubic(e.i);
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transform = `perspective(1000px) translateX(${lerp(80, 0, k) + glitchX(t, e, 31)}px) rotateY(${lerp(-40, -14, k) + Math.sin(t * 1.2) * 2}deg)`;
      const v = lerp(64, 52, P(t, C.s4_leak, C.s4_rot - C.s4_leak)) - 11 * E.outCubic(P(t, C.s4_rot, 0.6));
      q("#hull-v").textContent = `${Math.round(v)}%`;
      el.querySelectorAll("#hull-segs i").forEach((s, i) => s.classList.toggle("on", i < Math.round(v / 5)));
      const crit = t >= C.s4_rot;
      q("#hull-w").textContent = crit ? "ДНО: КРИТИЧЕСКИЙ УРОВЕНЬ" : "ПРОТЕЧКА · ОТСЕК 4";
      el.querySelector(".warn").style.opacity = crit ? 0.55 + 0.45 * (Math.floor(t * 5) % 2) : 1;
    }
  }
  {
    const e = envl(t, SH.porthole.start + 0.25, SC.s4.end + 0.02, 0.5, 0.2);
    const el = q("#radar");
    if (show(el, e.on)) {
      const k = E.outBack(e.i);
      el.style.opacity = clamp(e.i * 3) * (1 - e.o);
      el.style.transform = `scale(${lerp(0.6, 1, k)}) translateX(${glitchX(t, e, 37)}px)`;
      el.querySelector(".disc").style.transform = `rotateX(${lerp(80, 54, k)}deg) rotateZ(${Math.sin(t * 0.7) * 6}deg)`;
      const sweepDeg = (t * 200) % 360;
      q("#sweep").setAttribute("transform", `rotate(${sweepDeg})`);
      const blip = q("#blip");
      const bA = C.s4_guests + 0.35;
      if (t >= bA) {
        const app = E.inOut(P(t, bA, C.s4_lock - bA));
        const r = lerp(150, 58, app), th = (-38 + app * 25) * Math.PI / 180;
        const bx = Math.cos(th) * r, by = Math.sin(th) * r;
        // brightness fades after the sweep passes the blip
        const bd = ((th * 180 / Math.PI) + 360) % 360;
        const since = ((sweepDeg - bd) + 360) % 360;
        const lum = Math.max(0.35, Math.exp(-since / 120));
        blip.setAttribute("transform", `translate(${bx},${by})`);
        blip.style.opacity = lum * P(t, bA, 0.15);
        const rp = (t * 1.6) % 1;
        q("#blip-ring").setAttribute("r", 12 + rp * 26);
        q("#blip-ring").style.opacity = 1 - rp;
        const dist = Math.round(lerp(120, 35, app));
        q("#radar-l").textContent = `КОНТАКТ · ${dist} М`;
      } else {
        blip.style.opacity = 0;
        q("#radar-l").textContent = "СОНАР · ПОИСК";
      }
    }
  }
  {
    const e = envl(t, C.s4_scrape - 0.05, SC.s4.end + 0.02, 0.3, 0.2);
    const el = q("#alert");
    if (show(el, e.on)) {
      const strobe = t < C.s4_scrape + 0.7 ? (Math.floor(t * 10) % 2 ? 1 : 0.25) : 0.75 + 0.25 * Math.sin(t * 10);
      el.style.opacity = clamp(e.i * 3) * (1 - e.o) * strobe;
      el.style.transform = `translateX(-50%) translateX(${glitchX(t, e, 41, 40)}px) scale(${lerp(1.3, 1, E.outBack(e.i))})`;
    }
  }

  // ================= scene 5
  {
    const e = envl(t, C.s5_fuel - 0.1, TL.duration + 1, 0.45, 0.2);
    const el = q("#fuel");
    if (show(el, e.on)) {
      const k = E.outCubic(e.i);
      el.style.opacity = clamp(e.i * 3);
      el.style.transform = `perspective(1000px) translateX(${lerp(-70, 0, k)}px) rotateY(${lerp(40, 14, k) + Math.sin(t * 1.1) * 2}deg)`;
      const blink = Math.floor(t * 3) % 2;
      el.querySelectorAll("#fuel-segs i").forEach((s, i) => s.classList.toggle("on", i === 0 && blink === 1));
      q("#fuel-v").style.opacity = 0.65 + 0.35 * blink;
    }
  }
  {
    const e = envl(t, C.s5_city - 0.1, TL.duration + 1, 0.5, 0.2);
    const el = q("#city");
    if (show(el, e.on)) {
      const [ax, ay] = anchor("city", [420, 760]);
      const k = E.outCubic(e.i);
      const w = 380 * lerp(1.7, 1, k), h = 230 * lerp(1.7, 1, k);
      Object.assign(el.style, { left: `${ax - w / 2}px`, top: `${ay - h / 2}px`, width: `${w}px`, height: `${h}px`, opacity: clamp(e.i * 3) });
      el.querySelector(".tl").style.opacity = P(t, C.s5_city + 0.2, 0.25);
    }
  }
  {
    const e = envl(t, C.s5_storm - 0.05, TL.duration + 1, 0.5, 0.2);
    const el = q("#storm");
    if (show(el, e.on)) {
      const [ax, ay] = anchor("storm", [880, 520]);
      const k = E.outCubic(e.i);
      const w = 230 * lerp(1.6, 1, k), h = 190 * lerp(1.6, 1, k);
      Object.assign(el.style, { left: `${ax - w / 2}px`, top: `${ay - h / 2}px`, width: `${w}px`, height: `${h}px`, opacity: clamp(e.i * 3) * (0.75 + 0.25 * Math.sin(t * 6)) });
      const tl = el.querySelector(".tl");
      tl.style.opacity = P(t, C.s5_storm + 0.2, 0.25);
      tl.style.left = "auto"; tl.style.right = "0";
      q("#storm-v").textContent = `↑ ${8 + Math.min(1, Math.floor(P(t, C.s5_storm + 0.8, 2) * 2))}`;
    }
  }
  {
    const e = envl(t, C.s5_choice - 0.06, TL.duration + 1, 0.5, 0.2);
    const el = q("#choices");
    if (show(el, e.on)) {
      ["#ch-a", "#ch-b"].forEach((sel, i) => {
        const c = q(sel);
        const a = C.s5_choice - 0.06 + i * 0.16;
        const k = E.outBack(P(t, a, 0.5));
        let hl = 0;
        if (i === 0 && t >= C.s5_choice_a && t < C.s5_choice_b) hl = 1;
        if (i === 1 && t >= C.s5_choice_b && t < C.s5_comment) hl = 1;
        if (t >= C.s5_comment) hl = Math.floor((t - C.s5_comment) / 0.75) % 2 === i ? 1 : 0.15;
        hl *= P(t, i === 0 ? C.s5_choice_a : C.s5_choice_b, 0.15);
        c.style.opacity = P(t, a, 0.2);
        c.style.transform = `rotateX(${lerp(-95, 0, k)}deg) translateZ(${hl * 30}px) scale(${1 + hl * 0.035})`;
        c.style.boxShadow = `0 0 ${30 + hl * 40}px rgba(var(--c), ${0.4 + hl * 0.45}), inset 0 0 22px rgba(var(--c), ${0.22 + hl * 0.25}), 0 16px 40px rgba(0,0,0,.45)`;
        c.style.setProperty("--sheen", `${lerp(-120, 480, ((t - a) * 0.55) % 1.6)}%`);
      });
    }
  }
  {
    const e = envl(t, C.s5_comment - 0.06, TL.duration + 1, 0.45, 0.2);
    const el = q("#cta");
    if (show(el, e.on)) {
      const k = E.outBack(e.i);
      el.style.opacity = clamp(e.i * 3);
      el.style.transform = `translateX(-50%) translateY(${(1 - k) * 50}px) scale(${1 + 0.03 * Math.sin(t * 7)})`;
      el.querySelector("img").style.transform = `translateY(${Math.abs(Math.sin(t * 6)) * 9}px)`;
    }
  }

  // ================= captions
  {
    let idx = CHUNKS.findIndex((c) => t >= c.start && t < c.end);
    if (scene.id === "s5" && t >= C.s5_choice - 0.1) idx = -1;
    if (idx < 0) { capEl.style.display = "none"; }
    else {
      capEl.style.display = "";
      const ch = CHUNKS[idx];
      if (capBuilt !== idx) {
        capEl.innerHTML = ch.words.map((w) => `<span class="w">${capText(w)}</span>`).join("");
        capBuilt = idx;
      }
      capEl.style.setProperty("--cap", CAP_COLOR[ch.words[0].scene]);
      const top = { deck: 1250, tarp: 1250, corridor: 1250, door: 1250, flare: 1250, hatch: 1300, leak: 1250, porthole: 1250, compass: 1210 }[shot.id];
      capEl.style.top = `${top}px`;
      const pin = P(t, ch.start, 0.1);
      capEl.style.opacity = clamp(pin * 2);
      capEl.style.transform = `scale(${lerp(0.88, 1, E.outBack(pin))})`;
      capEl.querySelectorAll(".w").forEach((s, i) => {
        const w = ch.words[i];
        const nxt = ch.words[i + 1];
        const on = t >= w.start - 0.03 && (nxt ? t < nxt.start - 0.03 : true);
        s.classList.toggle("on", on);
        s.style.transform = on ? `scale(${1 + 0.07 * (1 - P(t, w.start, 0.15))})` : "scale(1)";
      });
    }
  }
}

// ------------------------------------------------------------------ entry points
const img = q("#frame");
window.renderFrame = async (frame, src) => {
  const t = frame / TL.fps;
  camFrame = CAM ? CAM.frames[Math.min(frame, CAM.frames.length - 1)] : null;
  if (src) {
    if (img.getAttribute("src") !== src) {
      img.src = src;
      await img.decode();
    }
  }
  update(t);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
};
window.hudReady = true;
