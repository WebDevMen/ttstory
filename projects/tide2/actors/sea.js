// «Обратный прилив. Протокол 08» — actors of part 2 (part 1 actors come from projects/tide via actors/series.txt).
// laundry_facade: panel facade close-up with balconies; the wet laundry on the lines stands UP like flames.
// sheet: one wet bedsheet on a cord, pulling upward (origin = the knot at the bottom of the cord).
// sheet_rig: the lift cabin hanging under a canopy of wet bedsheets on ropes (the "laundry lift").
// lift_scheme: archive document — lift with counterweight → cabin under N sheets, live weight balance.
// sky_sea: the sea upside down above the clouds: surface facing down, hanging wave crests, foam = clouds,
//          sunken city blocks with lit windows, caustics, rain entering the surface from below.
// Palette as part 1: ink #0a0c0f, steel #3c4650, grey #8a96a2, white #f2f4f6, red #e3262f; sea #1f4a4c (twist only).

const RED = "#e3262f", WHITE = "#f2f4f6", GREY = "#8a96a2";
const MONO = `'IBM Plex Mono', monospace`, COND = `'Oswald', sans-serif`;   // single quotes: these also go inside style="…" attributes

// a cloth panel anchored at (x, y) by its bottom edge, rising by `len` in direction dir (-1 up, +1 down)
// flutter: travelling wave along the cloth, stronger at the free end. Returns an SVG path.
function cloth(x, y, w, len, dir, t, ph, amp = 1, freq = 1.6) {
  const n = 7, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, yy = y + dir * len * k, a = amp * w * 0.22 * k * k;
    const dx = Math.sin(t * freq * 3.2 + ph - k * 3.1) * a + Math.sin(t * freq * 5.3 + ph * 1.7 - k * 4.4) * a * 0.35;
    const narrow = 1 - 0.12 * k * Math.abs(Math.sin(t * freq * 2 + ph));
    L.push([x - (w / 2) * narrow + dx, yy]);
    R.push([x + (w / 2) * narrow + dx, yy + Math.sin(t * freq * 4 + ph + k * 2) * 6 * k]);
  }
  let d = `M${L[0][0]},${L[0][1]}`;
  for (let i = 1; i <= n; i++) d += ` L${L[i][0].toFixed(1)},${L[i][1].toFixed(1)}`;
  // free end: wavy edge
  const a = L[n], b = R[n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + dir * Math.sin(t * freq * 4 + ph) * w * 0.08;
  d += ` Q${mx},${my} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  for (let i = n - 1; i >= 0; i--) d += ` L${R[i][0].toFixed(1)},${R[i][1].toFixed(1)}`;
  return { d: d + " Z", tip: [mx, my], mid: L.map((p, i) => [(p[0] + R[i][0]) / 2, p[1]]) };
}
// fold lines inside a cloth (follow its centre line)
const folds = (c, col, a) => {
  let s = "";
  for (const off of [-0.22, 0.18]) {
    let d = "";
    c.mid.forEach(([x, y], i) => { if (i < 2) return; d += `${d ? " L" : "M"}${(x + off * 60).toFixed(1)},${y.toFixed(1)}`; });
    s += `<path d="${d}" stroke="${col}" stroke-width="5" opacity="${a}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
};
const CLOTH = ["#f2f4f6", "#e4e9ec", "#d3dbe1", "#c6d4de", "#dfe3e0", "#b9c7d2", "#eceae4"];

// ------------------------------------------------------------------ laundry_facade: balconies with laundry standing up
// w, h, rows, cols, color (panel), up (track 0 hanging .. 1 standing up), cut (track 0..1: share of items already cut off),
// lit (share of lit windows), seed, drip (0..1 drops flying up from the tips)
export const laundry_facade = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, rows = p.rows ?? 5, cols = p.cols ?? 3, R = H.rng(p.seed ?? 6);
    const col = p.color ?? "#7d858c", dark = H.shade(col, -0.38), lite = H.shade(col, 0.12), id = H.uid("lf");
    const fh = h / rows, cw = w / cols;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lite}"/><stop offset=".6" stop-color="${col}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
    // panel seams + rain streaks
    for (let r = 0; r <= rows; r++) s += `<rect x="0" y="${r * fh - 3}" width="${w}" height="6" fill="${dark}" opacity=".55"/>`;
    for (let c = 0; c <= cols; c++) s += `<rect x="${c * cw - 3}" y="0" width="6" height="${h}" fill="${dark}" opacity=".45"/>`;
    for (let i = 0; i < 40; i++) { const x = R() * w, y = R() * h; s += `<rect x="${x}" y="${y}" width="${2 + R() * 4}" height="${80 + R() * 260}" fill="#20262b" opacity="${0.06 + R() * 0.1}"/>`; }
    const items = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const bx = c * cw + cw * 0.08, bw = cw * 0.84, top = r * fh, rail = top + fh * 0.78, slab = top + fh * 0.97;
      const lit = R() < (p.lit ?? 0.35);
      // window + balcony door behind the railing
      s += `<rect x="${bx + bw * 0.08}" y="${top + fh * 0.2}" width="${bw * 0.5}" height="${fh * 0.6}" fill="${lit ? "#e8dcb0" : "#1d2328"}" opacity="${lit ? 0.75 : 0.95}"/>
        <rect x="${bx + bw * 0.66}" y="${top + fh * 0.14}" width="${bw * 0.26}" height="${fh * 0.7}" fill="${lit ? "#cdbf94" : "#161b1f"}"/>
        <path d="M${bx + bw * 0.33},${top + fh * 0.2} v${fh * 0.6}" stroke="${dark}" stroke-width="5"/>`;
      // the balcony: side walls, railing panel, slab
      s += `<rect x="${bx}" y="${rail}" width="${bw}" height="${slab - rail}" fill="${H.shade(col, -0.12)}"/><rect x="${bx}" y="${rail}" width="${bw}" height="10" fill="${lite}"/>
        <rect x="${bx}" y="${slab}" width="${bw}" height="${fh * 0.04}" fill="${dark}"/><rect x="${bx}" y="${rail}" width="${bw}" height="${slab - rail}" fill="url(#${id}s)"/>`;
      for (let k = 0; k < 6; k++) s += `<rect x="${bx + 14 + k * (bw - 28) / 5}" y="${rail + 12}" width="4" height="${slab - rail - 14}" fill="${dark}" opacity=".35"/>`;
      // clothesline posts at the railing
      const ly = rail - 6;
      s += `<path d="M${bx + 10},${rail} v-26 M${bx + bw - 10},${rail} v-26" stroke="#30363b" stroke-width="5"/><path d="M${bx + 10},${ly - 18} L${bx + bw - 10},${ly - 18}" stroke="#30363b" stroke-width="3"/>`;
      const n = 1 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const big = R() < 0.55, iw = big ? bw * (0.3 + R() * 0.12) : bw * (0.14 + R() * 0.08);
        items.push({ x: bx + 22 + (k + 0.5) * ((bw - 44) / n), y: ly - 18, w: Math.min(iw, (bw - 44) / n * 0.96), len: big ? fh * (0.55 + R() * 0.25) : fh * (0.3 + R() * 0.15),
          c: CLOTH[Math.floor(R() * CLOTH.length)], ph: R() * 6.28, order: R(), f: 1.3 + R() * 0.6 });
      }
    }
    const svg = H.svg(s + `<g class="cl"></g>`, w, h);
    const cl = svg.querySelector(".cl");
    return {
      el: svg, w, h,
      update(t, it) {
        const up = it.v("up", p.up ?? 1), cut = it.v("cut", 0), dp = it.v("drip", p.drip ?? 1);
        const dir = 1 - 2 * up;   // +1 hangs down, -1 stands up
        let d = "";
        for (const c of items) {
          if (c.order < cut) continue;
          const len = c.len * (0.35 + 0.65 * Math.abs(dir));
          const k = cloth(c.x, c.y, c.w, len, dir >= 0 ? 1 : -1, t, c.ph, 0.4 + 1.3 * up, c.f);
          d += `<path d="${k.d}" fill="${c.c}" stroke="${H.shade(c.c, -0.25)}" stroke-width="2"/>${folds(k, H.shade(c.c, -0.18), 0.5)}`;
          d += `<rect x="${c.x - c.w / 2 + 4}" y="${c.y - 8}" width="10" height="16" fill="#3c4650"/><rect x="${c.x + c.w / 2 - 14}" y="${c.y - 8}" width="10" height="16" fill="#3c4650"/>`;
          if (dp > 0 && up > 0.5) for (let j = 0; j < 3; j++) {
            const q = (t * 0.9 + c.ph + j / 3) % 1;
            d += `<rect x="${k.tip[0] - 12 + j * 12}" y="${k.tip[1] - q * 220}" width="3" height="${12 + 10 * (1 - q)}" rx="1.5" fill="#cfe3f0" opacity="${(1 - q) * 0.8 * dp}"/>`;
          }
        }
        cl.innerHTML = d;
      },
    };
  },
};

// ------------------------------------------------------------------ sheet: one wet bedsheet on a cord; origin = the knot (bottom)
// cord (px), w, len, color, up (track 0..1), drip
export const sheet = {
  origin: [200, 900],
  create(p, H) {
    const W = 400, Hh = 900, cord = p.cord ?? 260, sw = p.w ?? 220, len = p.len ?? 420, c = p.color ?? "#e8edf0", ph = H.rng(p.seed ?? 3)() * 6;
    const svg = H.svg(`<g class="g"></g>`, W, Hh);
    const g = svg.querySelector(".g");
    return {
      el: svg, w: W, h: Hh,
      update(t, it) {
        const up = it.v("up", 1), tense = it.v("tense", 1);
        const top = Hh - cord * (0.6 + 0.4 * tense);
        const k = cloth(200, top, sw, len * (0.4 + 0.6 * up), -1, t, ph, 0.6 + 0.6 * up, 1.5);
        const sag = (1 - tense) * 60;
        let d = `<path d="M200,${Hh} Q${200 + sag},${(Hh + top) / 2} 200,${top}" stroke="#d9d4c7" stroke-width="5" fill="none"/>`;
        d += `<path d="${k.d}" fill="${c}" stroke="${H.shade(c, -0.25)}" stroke-width="2.5"/>${folds(k, H.shade(c, -0.2), 0.55)}<circle cx="200" cy="${top}" r="8" fill="#8a8478"/>`;
        for (let j = 0; j < 5; j++) { const q = (t * 0.8 + ph + j / 5) % 1; d += `<rect x="${k.tip[0] - 40 + j * 20}" y="${k.tip[1] - q * 260}" width="3.5" height="${14 + 10 * (1 - q)}" rx="1.5" fill="#cfe3f0" opacity="${(1 - q) * 0.85 * up * it.v("drip", 1)}"/>`; }
        g.innerHTML = d;
      },
    };
  },
};

// ------------------------------------------------------------------ sheet_rig: lift cabin hanging under a canopy of wet sheets
// origin = bottom centre of the cabin. n (track 0..100: sheets still on the canopy), crew (0..2 heads in the hatch),
// hatch (track 0..1 open), drip, swing (deg amplitude), cabin_only (no canopy), lights (window lamp inside 0..1)
export const sheet_rig = {
  origin: [500, 1300],
  grounded: false,
  create(p, H) {
    const W = 1000, Hh = 1300, R = H.rng(p.seed ?? 11), cx = 500;
    const cabW = 230, cabH = 270, cabTop = Hh - cabH, ringY = cabTop - 300;
    // canopy: up to 100 sheets in a dome above the rope ring (drawn back-to-front)
    const sheets = [];
    for (let i = 0; i < 100; i++) {
      const a = (R() - 0.5) * Math.PI * 0.95, r = 0.25 + 0.75 * Math.sqrt(R());
      sheets.push({ x: cx + Math.sin(a) * 420 * r, y: ringY - 40 - Math.cos(a) * 330 * r - R() * 90, w: 60 + R() * 60, len: 90 + R() * 110,
        c: CLOTH[Math.floor(R() * CLOTH.length)], ph: R() * 6.28, z: R(), order: R(), f: 1.2 + R() * 0.8 });
    }
    sheets.sort((a, b) => a.z - b.z);
    const id = H.uid("rig");
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa3aa"/><stop offset=".45" stop-color="#c3cacf"/><stop offset="1" stop-color="#5d656c"/></linearGradient></defs>
      <g class="rig"><g class="ropes"></g><g class="can"></g>
      <g class="cab">
        <rect x="${cx - cabW / 2}" y="${cabTop}" width="${cabW}" height="${cabH}" fill="url(#${id})" stroke="#3c4650" stroke-width="4"/>
        <rect x="${cx - cabW / 2 - 8}" y="${cabTop - 14}" width="${cabW + 16}" height="18" fill="#5d656c"/>
        <path d="M${cx},${cabTop + 26} V${cabTop + cabH}" stroke="#3c4650" stroke-width="4"/>
        <rect x="${cx - cabW / 2 + 22}" y="${cabTop + 26}" width="${cabW - 44}" height="${cabH - 26}" fill="none" stroke="#7b838a" stroke-width="3"/>
        <rect x="${cx - cabW / 2}" y="${cabTop + cabH * 0.55}" width="${cabW}" height="14" fill="#e8eef2" opacity=".75"/>
        <text x="${cx - cabW / 2 + 14}" y="${cabTop + 54}" font-family="IBM Plex Mono" font-weight="600" font-size="22" fill="#30363b">П-2</text>
        <rect x="${cx - 70}" y="${cabTop + 90}" width="140" height="18" fill="#c9b98a" opacity=".9" transform="rotate(-4 ${cx} ${cabTop + 99})"/>
        <rect x="${cx - 70}" y="${cabTop + 170}" width="140" height="18" fill="#c9b98a" opacity=".9" transform="rotate(3 ${cx} ${cabTop + 179})"/>
        <g class="crew"></g>
        <rect class="lid" x="${cx - 60}" y="${cabTop - 22}" width="120" height="12" fill="#30363b"/>
        <path d="M${cx - cabW / 2},${cabTop - 6} L${cx},${ringY} L${cx + cabW / 2},${cabTop - 6}" stroke="#d9d4c7" stroke-width="5" fill="none"/>
      </g><g class="drip"></g></g>`, W, Hh);
    const rig = svg.querySelector(".rig"), ropes = svg.querySelector(".ropes"), can = svg.querySelector(".can"), crew = svg.querySelector(".crew"), lid = svg.querySelector(".lid"), drip = svg.querySelector(".drip");
    const only = !!p.cabin_only;
    return {
      el: svg, w: W, h: Hh,
      update(t, it) {
        const n = only ? 0 : it.v("n", 100), dp = it.v("drip", 1), hatch = it.v("hatch", 0), cw = it.v("crew", 0);
        const sw = (p.swing ?? 1.5) * Math.sin(t * 0.9);
        rig.setAttribute("transform", `rotate(${sw.toFixed(2)} ${cx} ${ringY - 200})`);
        let rp = "", cn = "", dr = "";
        const vis = sheets.filter((s) => s.order * 100 < n);
        for (const s of vis) {
          const k = cloth(s.x, s.y + 40, s.w, s.len, -1, t, s.ph, 1.5, s.f * 1.2);
          if (s.z < 0.5 || vis.length < 30) rp += `<path d="M${cx},${ringY} L${s.x.toFixed(1)},${(s.y + 40).toFixed(1)}" stroke="#d9d4c7" stroke-width="2" opacity="${0.35 + s.z * 0.5}"/>`;
          const sh = H.shade(s.c, -0.12 - (1 - s.z) * 0.25);
          cn += `<path d="${k.d}" fill="${sh}" stroke="${H.shade(s.c, -0.35)}" stroke-width="1.5"/>`;
          if (s.z > 0.4) cn += folds(k, H.shade(s.c, -0.3), 0.35);
          if (dp > 0 && s.z > 0.6) { const q = (t * 0.8 + s.ph) % 1; dr += `<rect x="${k.tip[0]}" y="${k.tip[1] - q * 240}" width="3" height="${12 + 10 * (1 - q)}" rx="1.5" fill="#cfe3f0" opacity="${(1 - q) * 0.75 * dp}"/>`; }
        }
        if (!only && n > 0) rp += `<path d="M${cx},${ringY} V${ringY - 50}" stroke="#d9d4c7" stroke-width="5"/><circle cx="${cx}" cy="${ringY}" r="9" fill="#5d656c"/>`;
        ropes.innerHTML = rp; can.innerHTML = cn; drip.innerHTML = dr;
        lid.setAttribute("transform", `rotate(${-hatch * 80} ${cx - 60} ${cabTop - 16})`);
        let c = "";
        for (let i = 0; i < Math.round(cw); i++) {
          const x = cx - 16 + i * 42, s = i ? 0.75 : 1, y = cabTop - 6;
          c += `<path d="M${x - 30 * s},${y} Q${x - 30 * s},${y - 34 * s} ${x},${y - 38 * s} Q${x + 30 * s},${y - 34 * s} ${x + 30 * s},${y} Z" fill="${i ? "#6b5718" : "#14181c"}"/><circle cx="${x}" cy="${y - 54 * s}" r="${20 * s}" fill="${i ? "#6b5718" : "#14181c"}"/>`;
        }
        crew.innerHTML = c;
      },
    };
  },
};

// ------------------------------------------------------------------ lift_scheme: archive drawing — counterweight → sheet canopy
// mode: lift (classic shaft: cabin + rope over the pulley + counterweight; morph (track 0..1) turns the counterweight into sheets)
//       rig (cabin 400 kg under N sheets: n track, live sum 400 − 4n, arrow down/zero/up)
export const lift_scheme = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, kg = p.kg ?? 400, per = p.per ?? 4;
    let s = `<rect width="${w}" height="${h}" fill="#15191d"/>`;
    for (let x = 0; x < w; x += 40) s += `<line x1="${x}" x2="${x}" y1="0" y2="${h}" stroke="#1f252b" stroke-width="2"/>`;
    for (let y = 0; y < h; y += 40) s += `<line y1="${y}" y2="${y}" x1="0" x2="${w}" stroke="#1f252b" stroke-width="2"/>`;
    s += `<text x="70" y="400" font-family="IBM Plex Mono" font-size="26" fill="${GREY}" letter-spacing="2">${p.title ?? "ДОК. 08-02 · ЛИФТ БЕЗ ШАХТЫ · ГЛЕБ, ЛИФТЁР П-2"}</text>`;
    const svg = H.svg(s + `<g class="g"></g>`, w, h);
    const g = svg.querySelector(".g");
    const icon = (x, y, sc, a) => `<path d="M${x - 14 * sc},${y} L${x - 10 * sc},${y - 30 * sc} Q${x},${y - 36 * sc} ${x + 10 * sc},${y - 30 * sc} L${x + 14 * sc},${y} Z" fill="${WHITE}" opacity="${a}"/>`;
    return {
      el: svg, w, h,
      update(t, it) {
        let d = "";
        if ((p.mode ?? "rig") === "lift") {
          const m = it.v("morph", 0), py = 560, cx = 400, qx = 700;
          const cabY = 1060 + m * 40, cwY = 860;
          d += `<circle cx="${(cx + qx) / 2}" cy="${py}" r="${(qx - cx) / 2}" fill="none" stroke="${WHITE}" stroke-width="5"/><circle cx="${(cx + qx) / 2}" cy="${py}" r="10" fill="${WHITE}"/>
            <path d="M${cx},${py} V${cabY}" stroke="${WHITE}" stroke-width="4"/><path d="M${qx},${py} V${cwY}" stroke="${WHITE}" stroke-width="4" opacity="${1 - m}"/>
            <rect x="${cx - 110}" y="${cabY}" width="220" height="260" fill="none" stroke="${WHITE}" stroke-width="5"/>
            <text x="${cx}" y="${cabY + 145}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="${WHITE}">КАБИНА</text>
            <g opacity="${1 - m}"><rect x="${qx - 60}" y="${cwY}" width="120" height="220" fill="${GREY}" opacity=".35" stroke="${WHITE}" stroke-width="5"/>
            <text x="${qx + 80}" y="${cwY + 120}" font-family="IBM Plex Mono" font-weight="600" font-size="28" fill="${WHITE}">ПРОТИВОВЕС</text></g>`;
          if (m > 0) {
            // the counterweight becomes a cloud of sheets pulling up over the cabin
            for (let i = 0; i < 30; i++) { const a = (i * 2.4) % 6.28, r = 40 + (i * 37) % 150; d += icon(cx + Math.cos(a) * r * 1.4, 760 - Math.sin(a) * r * 0.6 - 40 + Math.sin(t * 2 + i) * 4, 1.1, m); }
            d += `<path d="M${cx},${cabY} V820" stroke="${WHITE}" stroke-width="4" opacity="${m}"/>
              <path d="M${cx + 240},900 v-160 m-26,30 l26,-30 l26,30" stroke="${WHITE}" stroke-width="6" fill="none" opacity="${m}"/>
              <text x="${cx + 290}" y="820" font-family="IBM Plex Mono" font-weight="600" font-size="28" fill="${WHITE}" opacity="${m}">МОКРОЕ ↑</text>
              <path d="M${cx + 240},${cabY + 60} v160 m-26,-30 l26,30 l26,-30" stroke="${WHITE}" stroke-width="6" fill="none" opacity="${m}"/>
              <text x="${cx + 290}" y="${cabY + 170}" font-family="IBM Plex Mono" font-weight="600" font-size="28" fill="${WHITE}" opacity="${m}">СУХОЕ ↓</text>`;
          }
        } else {
          const n = Math.round(it.v("n", 0)), tot = kg - per * n, cx = 540, cabY = 1180;
          // 100 sheet icons in a 20×5 grid over the cabin
          for (let i = 0; i < 100; i++) {
            const c = i % 20, r = Math.floor(i / 20), x = 160 + c * 40 + (r % 2) * 20, y = 620 + r * 64 + Math.sin(t * 2 + i) * 3;
            d += icon(x, y, 1, i < n ? 0.92 : 0.12);
          }
          d += `<path d="M${cx},${cabY} L${cx},960 M${cx - 110},${cabY} L${cx},960 L${cx + 110},${cabY}" stroke="${WHITE}" stroke-width="4" fill="none"/>
            <rect x="${cx - 110}" y="${cabY}" width="220" height="250" fill="none" stroke="${WHITE}" stroke-width="5"/>
            <text x="${cx}" y="${cabY + 115}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="28" fill="${WHITE}">КАБИНА</text>
            <text x="${cx}" y="${cabY + 160}" text-anchor="middle" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">+ ГЛЕБ + СОНЯ</text>
            <text x="${cx}" y="${cabY + 205}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="34" fill="${WHITE}">${kg} КГ</text>
            <text x="160" y="580" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="${WHITE}">ПРОСТЫНЕЙ: ${n} × −${per} КГ</text>`;
          const arrowY = cabY + 300, col = tot === 0 ? WHITE : tot > 0 ? WHITE : RED;
          d += `<text x="${cx}" y="${arrowY + 60}" text-anchor="middle" font-family="${COND}" font-weight="700" font-size="84" fill="${col}">${tot > 0 ? "+" : tot < 0 ? "−" : ""}${Math.abs(tot)} КГ ${tot > 0 ? "▼" : tot < 0 ? "▲" : "●"}</text>`;
        }
        g.innerHTML = d;
      },
    };
  },
};

// ------------------------------------------------------------------ sky_sea: the sea upside down over the city
// w, h, level (y of the hanging surface, local px; track), amp (wave height), blocks: [{x, y, w, floors, cols, lit}]
// sunk blocks (normal orientation, inside the water), foam (0..1 cloud-foam band under the surface), rain (0..1 drops
// rising into the surface), deep / mid / surf colours, glow (lit windows under water 0..1, track)
export const sky_sea = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1600, h = p.h ?? 1400, R = H.rng(p.seed ?? 9), id = H.uid("sea");
    const deep = p.deep ?? "#081a1d", mid = p.mid ?? "#1f4a4c", surf = p.surf ?? "#5f8f8c";
    const el = H.div(`width:${w}px;height:${h}px`);
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset=".6" stop-color="${mid}"/><stop offset="1" stop-color="${surf}"/></linearGradient>
        <clipPath id="${id}c"><path class="clipd"/></clipPath>
        <radialGradient id="${id}l" cx=".5" cy="1" r=".8"><stop offset="0" stop-color="#bfe6df" stop-opacity=".35"/><stop offset="1" stop-color="#bfe6df" stop-opacity="0"/></radialGradient></defs>
      <g clip-path="url(#${id}c)"><rect width="${w}" height="${h}" fill="url(#${id})"/><g class="blk"></g><rect width="${w}" height="${h}" fill="url(#${id}l)"/><g class="caus"></g></g>
      <path class="edge" fill="none" stroke="#dff2ee" stroke-width="5" opacity=".75"/><g class="foam" style="filter:blur(16px)"></g><g class="rn"></g>`, w, h);
    el.append(svg);
    const clipd = svg.querySelector(".clipd"), edge = svg.querySelector(".edge"), blk = svg.querySelector(".blk"), caus = svg.querySelector(".caus"), foam = svg.querySelector(".foam"), rn = svg.querySelector(".rn");
    // sunk blocks: static silhouettes with window cells (lit flicker in update)
    const wins = [];
    let bs = "";
    for (const b of p.blocks ?? []) {
      const fl = b.floors ?? 9, cols = b.cols ?? 6, bw = b.w ?? 240, ch = (b.cell ?? bw / cols * 0.8), bh = fl * ch, x0 = b.x - bw / 2, y0 = b.y - bh;
      const fade = b.fade ?? 0.5;
      bs += `<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" fill="#0d2427" opacity="${0.55 + fade * 0.4}"/>`;
      if (b.soil) bs += `<path d="M${x0 - 30},${b.y} L${x0 + bw + 30},${b.y} L${x0 + bw + 10},${b.y + b.soil * 0.55} Q${b.x},${b.y + b.soil * 0.75} ${x0 - 10},${b.y + b.soil * 0.5} Z" fill="#0a1c1e" opacity="${0.6 + fade * 0.3}"/>`;
      for (let r = 0; r < fl; r++) for (let c = 0; c < cols; c++) {
        const lit = R() < (b.lit ?? 0.4);
        if (lit) wins.push({ x: x0 + c * (bw / cols) + bw / cols * 0.22, y: y0 + r * ch + ch * 0.25, w: bw / cols * 0.56, h: ch * 0.5, ph: R() * 6, fade });
        else bs += `<rect x="${x0 + c * (bw / cols) + bw / cols * 0.22}" y="${y0 + r * ch + ch * 0.25}" width="${bw / cols * 0.56}" height="${ch * 0.5}" fill="#06100f" opacity=".7"/>`;
      }
    }
    blk.innerHTML = bs + `<g class="wl"></g>`;
    const wl = blk.querySelector(".wl");
    const foamB = Array.from({ length: p.foamn ?? 30 }, () => ({ x: R() * w, dy: R() * 40, rx: 50 + R() * 130, ry: 16 + R() * 30, a: 0.3 + R() * 0.45, v: 0.5 + R() }));
    const drops = Array.from({ length: p.drops ?? 60 }, () => ({ x: R() * w, ph: R(), sp: 0.6 + R() * 0.8 }));
    const ampB = p.amp ?? 60;
    const surfY = (x, t, lv) => {
      // hanging crests: sharpened downward peaks, travelling waves
      const a = Math.sin(x * 0.006 + t * 0.7), b = Math.sin(x * 0.013 - t * 1.1 + 1.3), c = Math.sin(x * 0.031 + t * 1.9);
      const crest = Math.pow((a + 1) / 2, 3);
      return lv + ampB * (crest * 1.4 + 0.3 * b) + 8 * c;
    };
    return {
      el, w, h,
      update(t, it) {
        const lv = it.v("level", p.level ?? h * 0.6), fo = it.v("foam", p.foam ?? 1), gw = it.v("glow", 1), rr = it.v("rain", p.rain ?? 1);
        const pts = [];
        for (let x = -20; x <= w + 20; x += 16) pts.push([x, surfY(x, t, lv)]);
        const line = pts.map((q, i) => `${i ? "L" : "M"}${q[0]},${q[1].toFixed(1)}`).join(" ");
        // clip: top edge, then the surface from right to left
        const rev = [...pts].reverse().map((q) => `L${q[0]},${q[1].toFixed(1)}`).join(" ");
        clipd.setAttribute("d", `M-20,-20 L${w + 20},-20 ${rev} Z`);
        edge.setAttribute("d", line);
        // caustics: bright wavy lines near the surface (inside the water)
        let cs = "";
        for (let i = 0; i < 9; i++) {
          let d = "";
          for (let x = -20; x <= w + 20; x += 40) d += `${d ? " L" : "M"}${x},${(surfY(x, t, lv) - 40 - i * 34 + 14 * Math.sin(x * 0.02 + t * 2 + i)).toFixed(1)}`;
          cs += `<path d="${d}" stroke="#cfeee6" stroke-width="${3 - i * 0.25}" opacity="${0.22 - i * 0.02}" fill="none"/>`;
        }
        // crest relief: lighter band just inside the hanging surface + dark troughs
        let rel = "";
        for (let x = -20; x <= w + 20; x += 16) { const y = surfY(x, t, lv), y2 = surfY(x + 16, t, lv); rel += `<path d="M${x},${(y - 3).toFixed(1)} L${x + 16},${(y2 - 3).toFixed(1)}" stroke="#9fd0c6" stroke-width="${10 + 8 * Math.max(0, (y - lv) / ampB)}" opacity=".35"/>`; }
        caus.innerHTML = cs + rel;
        wl.innerHTML = wins.map((q) => `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#e8d9a0" opacity="${(0.25 + 0.55 * (0.6 + 0.4 * Math.sin(t * 3 + q.ph))) * gw * (0.5 + 0.5 * q.fade)}"/>`).join("");
        foam.innerHTML = fo > 0 ? foamB.map((b) => `<ellipse cx="${(b.x + t * 12 * b.v) % (w + 200) - 100}" cy="${surfY(b.x, t, lv) + 10 + b.dy}" rx="${b.rx}" ry="${b.ry}" fill="#d8e2e6" opacity="${b.a * fo}"/>`).join("") : "";
        rn.innerHTML = rr > 0 ? drops.map((q) => {
          const sy = surfY(q.x, t, lv), k = (t * q.sp + q.ph) % 1, y = sy + 420 * (1 - k);
          return `<rect x="${q.x}" y="${y}" width="2.5" height="26" fill="#cfe3f0" opacity="${0.55 * rr * k}"/>`;
        }).join("") : "";
      },
    };
  },
};
