// «Обратный прилив. Протокол 09» — actors of the final part (parts 1–2 come via actors/series.txt: tide, tide2).
// asphalt_top: the yard from a CCTV mast straight down: wet asphalt, puddles raining up, the DRY car-shaped rectangle.
// pebble: a small stone (wet = dark and glossy, dry = pale and matte); move it with anim.
// ground_scheme: archive document — section of the ground: the wet layer with the house tears off, the dry strip stays.
// bridge: concrete road bridge over Rechnaya, side view, with the pale DRY strip of asphalt under it (surface).
// lift_panel: basement wall, the lift's emergency-link box (open door, button, green lamp, speaker grille, gloved hand).
// pit_split: section through the shaft wall — basement on the left, concrete wall, lift cabin in the pit on the right.
// roof: flat roof of a panel block with parapet, TV antennas, exit hut with a hatch, vents, puddles; steam (track).
// barometer: round aneroid barometer (brass, Russian dial), needle (track p in mm Hg), drops on the glass.
// deep_cabin: under the upside-down sea — the drowned block's basement, the sealed lift cabin glowing, a hand with a
//             phone out of the hatch, air bubbles (they sink: water falls up here, so air goes down).
// Palette as parts 1–2: ink #0a0c0f, steel #3c4650, grey #8a96a2, white #f2f4f6, red #e3262f, sea #1f4a4c,
// dry asphalt #cfc6a4 (new: the colour of rescue), yellow #ffd23a (Sonya).

const RED = "#e3262f", WHITE = "#f2f4f6", GREY = "#8a96a2", DRY = "#cfc6a4", YEL = "#ffd23a";
const MONO = `'IBM Plex Mono', monospace`, COND = `'Oswald', sans-serif`;

// ------------------------------------------------------------------ asphalt_top: the yard from above
// w, h, dry (track 0..1: highlight of the dry rectangle), outline (track 0..1: dashed car contour), people (true: Gleb + Sonya
// seen from above at gx, gy), up (0..1: puddles rain up — rings + rising drops), seed
export const asphalt_top = {
  backdrop: true,
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, R = H.rng(p.seed ?? 5), id = H.uid("at");
    const cx = p.car_x ?? 560, cy = p.car_y ?? 900, cw = p.car_w ?? 380, chh = p.car_h ?? 820;   // the car stood here (top view)
    let s = `<defs><radialGradient id="${id}" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#2f363c"/><stop offset="1" stop-color="#1b2024"/></radialGradient>
      <filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .22 0"/></filter></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/><rect width="${w}" height="${h}" filter="url(#${id}n)"/>`;
    // curb + parking lines + a strip of lawn on the left
    s += `<rect x="0" y="0" width="120" height="${h}" fill="#26302a"/><rect x="118" y="0" width="22" height="${h}" fill="#5d656c"/>`;
    for (let y = 120; y < h; y += 620) s += `<rect x="${cx + cw / 2 + 60}" y="${y}" width="12" height="440" fill="#8a8f86" opacity=".35"/><rect x="${cx - cw / 2 - 72}" y="${y}" width="12" height="440" fill="#8a8f86" opacity=".35"/>`;
    // the dry rectangle: lighter, matte, rounded like a car body footprint
    s += `<g class="dry"><rect x="${cx - cw / 2}" y="${cy - chh / 2}" width="${cw}" height="${chh}" rx="70" fill="${DRY}" opacity=".88"/>
      <rect x="${cx - cw / 2}" y="${cy - chh / 2}" width="${cw}" height="${chh}" rx="70" fill="url(#${id})" opacity=".18"/>
      ${Array.from({ length: 40 }, () => `<circle cx="${cx - cw / 2 + 20 + R() * (cw - 40)}" cy="${cy - chh / 2 + 20 + R() * (chh - 40)}" r="${1 + R() * 3}" fill="#9a927a" opacity=".6"/>`).join("")}</g>
      <rect class="dryglow" x="${cx - cw / 2 - 10}" y="${cy - chh / 2 - 10}" width="${cw + 20}" height="${chh + 20}" rx="78" fill="none" stroke="${WHITE}" stroke-width="5" opacity="0"/>
      <g class="outline" opacity="0" fill="none" stroke="${WHITE}" stroke-width="4" stroke-dasharray="16 12">
        <path d="M${cx - cw / 2 + 30},${cy - chh / 2 + 120} Q${cx},${cy - chh / 2 - 20} ${cx + cw / 2 - 30},${cy - chh / 2 + 120} L${cx + cw / 2 - 20},${cy + chh / 2 - 90} Q${cx},${cy + chh / 2 + 10} ${cx - cw / 2 + 20},${cy + chh / 2 - 90} Z"/>
        <path d="M${cx - cw / 2 + 50},${cy - chh / 2 + 230} H${cx + cw / 2 - 50} M${cx - cw / 2 + 50},${cy + chh / 2 - 260} H${cx + cw / 2 - 50}"/></g>`;
    // puddles (dark mirrors), rings drawn in update
    const pud = [];
    for (let i = 0; i < (p.puddles ?? 7); i++) {
      let x, y;
      do { x = 180 + R() * (w - 260); y = 100 + R() * (h - 200); } while (Math.abs(x - cx) < cw / 2 + 110 && Math.abs(y - cy) < chh / 2 + 110);
      const rx = 70 + R() * 120, ry = 40 + R() * 70;
      pud.push([x, y, rx, ry, R() * 6]);
      s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#0f1417" opacity=".85"/><ellipse cx="${x - rx * 0.2}" cy="${y - ry * 0.3}" rx="${rx * 0.5}" ry="${ry * 0.25}" fill="#4a5864" opacity=".35"/>`;
    }
    // wet sheen streaks
    for (let i = 0; i < 30; i++) { const x = 150 + R() * (w - 150), y = R() * h; if (Math.abs(x - cx) < cw / 2 && Math.abs(y - cy) < chh / 2) continue; s += `<rect x="${x}" y="${y}" width="${30 + R() * 80}" height="3" fill="#7d8b96" opacity="${0.1 + R() * 0.15}"/>`; }
    s += `<g class="rings"></g><g class="ppl"></g>`;
    const svg = H.svg(s, w, h);
    const dry = svg.querySelector(".dryglow"), outline = svg.querySelector(".outline"), rings = svg.querySelector(".rings"), ppl = svg.querySelector(".ppl");
    // people from above: shoulders ellipse + head; Gleb dark jacket with a reflective stripe, Sonya yellow with two braids
    if (p.people) {
      const gx = p.gx ?? cx - cw / 2 - 120, gy = p.gy ?? cy + 80;
      ppl.innerHTML = `<g transform="translate(${gx},${gy})"><ellipse cx="0" cy="0" rx="78" ry="44" fill="#14181c"/><path d="M-70,8 H70" stroke="#c9d4dc" stroke-width="7" opacity=".8"/><circle cx="0" cy="-4" r="30" fill="#2a2420"/><ellipse cx="-56" cy="40" rx="18" ry="26" fill="#14181c"/></g>
        <g transform="translate(${gx + 40},${gy + 170})"><ellipse cx="0" cy="0" rx="50" ry="30" fill="${YEL}"/><circle cx="0" cy="-2" r="22" fill="#3a2a1c"/><circle cx="-24" cy="-6" r="8" fill="#3a2a1c"/><circle cx="24" cy="-6" r="8" fill="#3a2a1c"/>
          <path d="M-40,-8 L-90,-90" stroke="${YEL}" stroke-width="16" stroke-linecap="round"/></g>`;
    }
    return {
      el: svg, w, h,
      update(t, it) {
        const dk = it.v("dry", 0), ol = it.v("outline", 0), up = it.v("up", 1);
        dry.setAttribute("opacity", dk * (0.6 + 0.4 * Math.sin(t * 4)));
        outline.setAttribute("opacity", ol);
        let r = "";
        if (up > 0) for (const [x, y, rx, ry, ph] of pud) for (let k = 0; k < 3; k++) {
          const q = (t * 0.9 + ph + k / 3) % 1;
          r += `<ellipse cx="${x}" cy="${y}" rx="${rx * q}" ry="${ry * q}" fill="none" stroke="#a9c2d4" stroke-width="3" opacity="${(1 - q) * 0.6 * up}"/>`;
          r += `<circle cx="${x + Math.sin(ph * 9 + k) * rx * 0.5}" cy="${y + Math.cos(ph * 7 + k) * ry * 0.5}" r="${4 + 6 * q}" fill="#cfe3f0" opacity="${(1 - q) * 0.7 * up}"/>`;
        }
        rings.innerHTML = r;
      },
    };
  },
};

// ------------------------------------------------------------------ pebble: origin = centre; wet (glossy dark) or dry (pale matte)
export const pebble = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 34, wet = !!p.wet, id = H.uid("pb");
    const R = H.rng(p.seed ?? 3);
    let d = "";
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = r * (0.82 + R() * 0.3); d += `${i ? "L" : "M"}${(r * 1.3 + Math.cos(a) * rr * 1.15).toFixed(1)},${(r * 1.3 + Math.sin(a) * rr * 0.9).toFixed(1)} `; }
    const base = wet ? "#2e3338" : "#b8b09a", lite = wet ? "#9fb6c6" : "#ded6bd";
    const svg = H.svg(`<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${lite}"/><stop offset=".45" stop-color="${base}"/><stop offset="1" stop-color="${H.shade(base, -0.4)}"/></radialGradient></defs>
      <path d="${d}Z" fill="url(#${id})" stroke="${H.shade(base, -0.5)}" stroke-width="2" stroke-linejoin="round"/>
      ${wet ? `<ellipse cx="${r * 0.95}" cy="${r * 0.85}" rx="${r * 0.28}" ry="${r * 0.14}" fill="#fff" opacity=".75"/><circle cx="${r * 1.7}" cy="${r * 2.2}" r="${r * 0.12}" fill="#cfe3f0" opacity=".9"/>` : ""}`, r * 2.6, r * 2.6);
    return { el: svg, w: r * 2.6, h: r * 2.6 };
  },
};

// ------------------------------------------------------------------ ground_scheme: archive drawing «ДОК. 09-01»
// lift (track 0..1): the wet block (soil + house) rises, the dry strip under the bridge stays; title
export const ground_scheme = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, gy = 1180;
    let s = `<rect width="${w}" height="${h}" fill="#15191d"/>`;
    for (let x = 0; x < w; x += 40) s += `<line x1="${x}" x2="${x}" y1="0" y2="${h}" stroke="#1f252b" stroke-width="2"/>`;
    for (let y = 0; y < h; y += 40) s += `<line y1="${y}" y2="${y}" x1="0" x2="${w}" stroke="#1f252b" stroke-width="2"/>`;
    s += `<text x="70" y="400" font-family="IBM Plex Mono" font-size="26" fill="${GREY}" letter-spacing="2">${p.title ?? "ДОК. 09-01 · РАЗРЕЗ ГРУНТА · УЛ. РЕЧНАЯ"}</text>`;
    // static: dry strip under the bridge (right) + bedrock line
    s += `<g><rect x="700" y="${gy}" width="300" height="220" fill="${DRY}" opacity=".22"/>
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${700 + i * 22},${gy} l40,220" stroke="${DRY}" stroke-width="3" opacity=".5"/>`).join("")}
      <rect x="700" y="${gy}" width="300" height="220" fill="none" stroke="${DRY}" stroke-width="4"/>
      <path d="M680,${gy - 150} H1020 M720,${gy - 150} V${gy} M980,${gy - 150} V${gy}" stroke="${WHITE}" stroke-width="5" fill="none"/>
      <text x="850" y="${gy - 172}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="26" fill="${WHITE}">МОСТ</text>
      <text x="850" y="${gy + 290}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="${DRY}">СУХО</text>
      <text x="850" y="${gy + 330}" text-anchor="middle" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">ОСТАЁТСЯ</text></g>
      <path d="M60,${gy + 420} H1020" stroke="${GREY}" stroke-width="3" stroke-dasharray="10 8"/><text x="70" y="${gy + 460}" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">СУХОЙ ГРУНТ</text>`;
    // moving: wet block with the house
    s += `<g class="blk"><rect x="80" y="${gy}" width="600" height="220" fill="#7fa8c4" opacity=".28"/>
      ${Array.from({ length: 26 }, (_, i) => `<path d="M${80 + i * 23},${gy + 220} l20,-30" stroke="#7fa8c4" stroke-width="3" opacity=".6"/>`).join("")}
      <rect x="80" y="${gy}" width="600" height="220" fill="none" stroke="#9fc4dc" stroke-width="4"/>
      <rect x="200" y="${gy - 470}" width="300" height="470" fill="none" stroke="${WHITE}" stroke-width="4"/>
      ${Array.from({ length: 8 }, (_, i) => `<line x1="200" x2="500" y1="${gy - 470 + (i + 1) * 52}" y2="${gy - 470 + (i + 1) * 52}" stroke="${WHITE}" stroke-width="2" opacity=".6"/>`).join("")}
      <text x="380" y="${gy + 125}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="#cfe3f0">МОКРО</text>
      <g class="arr" opacity="0">${[260, 440].map((x) => `<path d="M${x},${gy - 520} v-150 m-26,36 l26,-36 l26,36" stroke="#cfe3f0" stroke-width="7" fill="none"/>`).join("")}</g></g>
      <path class="crack" d="M690,${gy} l-12,60 l14,50 l-10,60 l8,50" stroke="${WHITE}" stroke-width="4" fill="none" opacity="0"/>`;
    const svg = H.svg(s, w, h);
    const blk = svg.querySelector(".blk"), arr = svg.querySelector(".arr"), crack = svg.querySelector(".crack");
    return {
      el: svg, w, h,
      update(t, it) {
        const k = it.v("lift", 0);
        blk.setAttribute("transform", `translate(0,${-k * 260})`);
        arr.setAttribute("opacity", Math.min(1, k * 3));
        crack.setAttribute("opacity", Math.min(1, k * 4));
      },
    };
  },
};

// ------------------------------------------------------------------ bridge: concrete road bridge, side view; origin top-left
// w, deck (y of the deck top), ground (y of the ground), span: [x0, x1] of the dry strip, piers: [x…], dry (track 0..1 glow),
// lamps (true), haze (0..1 far tint)
export const bridge = {
  backdrop: true,
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1400, gy = p.ground ?? 1400, dy = p.deck ?? gy - 330, [s0, s1] = p.span ?? [w * 0.15, w * 0.85], R = H.rng(p.seed ?? 7), id = H.uid("br");
    const piers = p.piers ?? [s0 + 30, (s0 + s1) / 2, s1 - 30], th = p.thick ?? 70;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9196"/><stop offset="1" stop-color="#5d6469"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`;
    // the dry strip under the bridge (top surface of the ground) + its shadow
    s += `<rect x="${s0}" y="${gy}" width="${s1 - s0}" height="${p.strip_h ?? 260}" fill="${DRY}"/>
      ${Array.from({ length: 50 }, () => `<circle cx="${s0 + R() * (s1 - s0)}" cy="${gy + 6 + R() * ((p.strip_h ?? 260) - 12)}" r="${1 + R() * 3}" fill="#9a927a" opacity=".6"/>`).join("")}
      <rect x="${s0}" y="${gy}" width="${s1 - s0}" height="60" fill="url(#${id}s)" opacity=".7"/>
      <rect class="glow" x="${s0}" y="${gy - 4}" width="${s1 - s0}" height="${(p.strip_h ?? 260) + 8}" fill="none" stroke="${WHITE}" stroke-width="6" opacity="0"/>`;
    // piers
    for (const x of piers) s += `<rect x="${x - 34}" y="${dy + th}" width="68" height="${gy - dy - th + 10}" fill="url(#${id})"/><rect x="${x - 34}" y="${dy + th}" width="18" height="${gy - dy - th + 10}" fill="#a8adb0" opacity=".4"/>
      <rect x="${x - 50}" y="${dy + th - 4}" width="100" height="24" fill="#6a7176"/>`;
    // deck: beam + railing + lamp posts
    s += `<rect x="-20" y="${dy}" width="${w + 40}" height="${th}" fill="url(#${id})"/><rect x="-20" y="${dy + th - 10}" width="${w + 40}" height="10" fill="#3e4448"/>
      <rect x="-20" y="${dy - 6}" width="${w + 40}" height="8" fill="#9da3a7"/>
      <path d="M-20,${dy - 46} H${w + 20}" stroke="#4a5156" stroke-width="6"/>`;
    for (let x = 0; x < w; x += 36) s += `<rect x="${x}" y="${dy - 46}" width="5" height="42" fill="#4a5156"/>`;
    if (p.lamps !== false) for (let x = 120; x < w; x += 420) s += `<path d="M${x},${dy - 6} V${dy - 190} q0,-20 30,-20 h26" stroke="#3e4448" stroke-width="7" fill="none"/><rect x="${x + 50}" y="${dy - 216}" width="34" height="12" fill="#c9d4dc"/>`;
    // water stains / drips falling UP from the deck edge
    for (let i = 0; i < 26; i++) s += `<rect x="${R() * w}" y="${dy + 10}" width="${3 + R() * 6}" height="${20 + R() * 50}" fill="#30373c" opacity="${0.2 + R() * 0.3}"/>`;
    s += `<g class="drip"></g>`;
    const svg = H.svg(s, w, gy + (p.strip_h ?? 260));
    const glow = svg.querySelector(".glow"), drip = svg.querySelector(".drip");
    const dr = Array.from({ length: 24 }, () => [R() * w, R(), 0.6 + R()]);
    return {
      el: svg, w, h: gy + (p.strip_h ?? 260),
      update(t, it) {
        const g = it.v("dry", 0), dp = it.v("drip", p.drip ?? 1);
        glow.setAttribute("opacity", g * (0.55 + 0.45 * Math.sin(t * 4)));
        drip.innerHTML = dp > 0 ? dr.map(([x, ph, sp]) => { const k = (t * sp * 0.6 + ph) % 1; return `<rect x="${x}" y="${dy - 10 - k * 200}" width="3" height="${10 + sp * 8}" rx="1.5" fill="#a9c2d4" opacity="${(1 - k) * 0.7 * dp}"/>`; }).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ lift_panel: helmet-cam view of the emergency-link box
// on (track 0..1 green lamp), talk (track 0..1 speaker vibration), press (track 0..1 hand presses the button), open (track door)
export const lift_panel = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, id = H.uid("lp"), bx = 250, by = 540, bw = 580, bh = 820;
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d656c"/><stop offset=".5" stop-color="#8a9298"/><stop offset="1" stop-color="#4f575e"/></linearGradient>
        <radialGradient id="${id}v" cx=".5" cy=".45" r=".75"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
        <radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7dffa8"/><stop offset="1" stop-color="#7dffa8" stop-opacity="0"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="#3a3f43"/>
      ${Array.from({ length: 24 }, (_, i) => `<rect x="${(i % 6) * 190 - 20}" y="${Math.floor(i / 6) * 500}" width="186" height="496" fill="#43494e" opacity=".55"/>`).join("")}
      <path d="M0,230 H${w}" stroke="#5a3a26" stroke-width="30"/><path d="M0,300 H${w}" stroke="#30363b" stroke-width="18"/><path d="M0,335 H${w}" stroke="#7b838a" stroke-width="10"/>
      <path d="M140,0 V${h}" stroke="#2a2f33" stroke-width="22"/><path d="M950,0 V${h}" stroke="#2a2f33" stroke-width="14"/>
      <path d="M${bx + bw / 2},${by} V340" stroke="#121518" stroke-width="12"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="#4c5459"/><rect x="${bx + 20}" y="${by + 20}" width="${bw - 40}" height="${bh - 40}" fill="#2a2f33"/>
      <text x="${bx + bw / 2}" y="${by + 90}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="#c9d4dc">ЛИФТ П-2 · ПОДЪЕЗД 2</text>
      <text x="${bx + bw / 2}" y="${by + 130}" text-anchor="middle" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">АВАРИЙНАЯ СВЯЗЬ · КАБИНА</text>
      <g class="spk"><circle cx="${bx + bw / 2}" cy="${by + 330}" r="130" fill="#1a1e21"/>${Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => { const x = bx + bw / 2 - 96 + c * 32, y = by + 234 + r * 32; return Math.hypot(x - bx - bw / 2, y - by - 330) < 112 ? `<circle cx="${x}" cy="${y}" r="9" fill="#05070a"/>` : ""; }).join("")).join("")}</g>
      <circle class="lampg" cx="${bx + 140}" cy="${by + 560}" r="70" fill="url(#${id}l)" opacity="0"/><circle class="lamp" cx="${bx + 140}" cy="${by + 560}" r="22" fill="#1f3a28"/>
      <text x="${bx + 140}" y="${by + 620}" text-anchor="middle" font-family="IBM Plex Mono" font-size="22" fill="${GREY}">СВЯЗЬ</text>
      <circle cx="${bx + bw - 160}" cy="${by + 560}" r="62" fill="#7a1418"/><circle class="btn" cx="${bx + bw - 160}" cy="${by + 560}" r="50" fill="${RED}"/>
      <text x="${bx + bw - 160}" y="${by + 660}" text-anchor="middle" font-family="IBM Plex Mono" font-size="22" fill="${GREY}">ВЫЗОВ КАБИНЫ</text>
      <rect class="door" x="${bx - 6}" y="${by - 6}" width="${bw + 12}" height="${bh + 12}" rx="10" fill="url(#${id})"/>
      <path class="glove" d="M${bx + bw - 120},${h} L${bx + bw - 210},${by + 720} C${bx + bw - 230},${by + 640} ${bx + bw - 200},${by + 600} ${bx + bw - 170},${by + 596} C${bx + bw - 120},${by + 600} ${bx + bw - 100},${by + 660} ${bx + bw - 90},${by + 730} L${bx + bw + 60},${h} Z" fill="#2b2f33"/>
      <rect width="${w}" height="${h}" fill="url(#${id}v)"/>`, w, h);
    const lamp = svg.querySelector(".lamp"), lampg = svg.querySelector(".lampg"), spk = svg.querySelector(".spk"), btn = svg.querySelector(".btn"), door = svg.querySelector(".door"), glove = svg.querySelector(".glove");
    return {
      el: svg, w, h,
      update(t, it) {
        const on = it.v("on", 0), talk = it.v("talk", 0), pr = it.v("press", 0), op = it.v("open", 1);
        lamp.setAttribute("fill", on > 0.5 ? "#6dff9a" : "#1f3a28"); lampg.setAttribute("opacity", on * (0.7 + 0.3 * Math.sin(t * 9)));
        const v = talk * (1 + Math.abs(H.noise(t * 14, 3, 1)) * 0.06);
        spk.style.transformOrigin = `${bx + bw / 2}px ${by + 330}px`; spk.style.transform = `scale(${talk ? v : 1})`;
        btn.setAttribute("r", 50 - pr * 6);
        door.style.transformOrigin = `${bx}px ${by}px`; door.style.transform = `scaleX(${1 - op * 0.94})`; door.setAttribute("opacity", 1 - op * 0.2);
        glove.style.transform = `translate(${-pr * 30}px, ${(1 - Math.min(1, pr * 1.6 + 0.2)) * 700}px)`;
        glove.setAttribute("opacity", it.v("hand", 1));
      },
    };
  },
};

// ------------------------------------------------------------------ pit_split: section through the shaft wall (document-like cinema)
// light (cabin light 0..1, track), wire (track 0..1 pulse along the wire), side: which side talks (track -1 left / 1 right),
// open (track 0..1: the cabin doors open, a bar of light). People are added as separate person actors.
export const pit_split = {
  backdrop: true,
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1600, h = 1920, id = H.uid("ps"), fy = p.floor_y ?? 1500, wx = p.wall_x ?? 760, ww = 120;
    const cx = wx + ww + 120, cw = 520, ch = 640, cy = fy - ch;
    const svg = H.svg(`<defs><linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f1e6"/><stop offset="1" stop-color="#b9b3a3"/></linearGradient>
        <radialGradient id="${id}b" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#4a5055"/><stop offset="1" stop-color="#22272b"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id}b)"/>
      <path d="M0,520 H${wx}" stroke="#5a3a26" stroke-width="26"/><path d="M0,580 H${wx}" stroke="#30363b" stroke-width="16"/>
      <rect x="0" y="${fy}" width="${wx}" height="${h - fy}" fill="#2a2e31"/>
      <circle cx="${wx * 0.45}" cy="420" r="140" fill="#fff6e0" opacity=".12"/><circle cx="${wx * 0.45}" cy="420" r="18" fill="#fffaf0"/>
      <rect x="${wx - 210}" y="${fy - 860}" width="170" height="250" rx="8" fill="#4c5459"/><circle cx="${wx - 160}" cy="${fy - 690}" r="12" fill="#6dff9a"/><circle cx="${wx - 90}" cy="${fy - 690}" r="18" fill="${RED}"/>
      <!-- concrete wall with rebar -->
      <rect x="${wx}" y="0" width="${ww}" height="${h}" fill="#6f7377"/>
      ${Array.from({ length: 22 }, (_, i) => `<circle cx="${wx + 30 + (i % 2) * 60}" cy="${60 + i * 88}" r="7" fill="#3a3e42"/>`).join("")}
      ${Array.from({ length: 40 }, (_, i) => `<circle cx="${wx + 8 + (i * 37) % (ww - 16)}" cy="${(i * 211) % h}" r="${2 + (i % 3)}" fill="#8b8f92" opacity=".6"/>`).join("")}
      <!-- shaft -->
      <rect x="${wx + ww}" y="0" width="${w - wx - ww}" height="${h}" fill="#1a1e21"/>
      <rect x="${cx - 60}" y="0" width="16" height="${h}" fill="#3c4650"/><rect x="${cx + cw + 44}" y="0" width="16" height="${h}" fill="#3c4650"/>
      <path d="M${cx + cw / 2 - 20},0 V${cy} M${cx + cw / 2 + 20},0 V${cy}" stroke="#7b838a" stroke-width="5"/>
      <rect x="${wx + ww}" y="${fy}" width="${w - wx - ww}" height="${h - fy}" fill="#141719"/>
      <rect x="${cx + 40}" y="${fy}" width="70" height="40" fill="#3c4650"/><rect x="${cx + cw - 110}" y="${fy}" width="70" height="40" fill="#3c4650"/>
      <g class="cab"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="url(#${id}c)"/>
        <rect x="${cx}" y="${cy + ch - 70}" width="${cw}" height="70" fill="#6a5a4a"/>
        <rect x="${cx + 180}" y="${cy + 14}" width="160" height="24" rx="6" fill="#fffef6"/>
        <rect x="${cx + cw - 70}" y="${cy + 240}" width="40" height="150" rx="6" fill="#5d656c"/><circle class="spk2" cx="${cx + cw - 50}" cy="${cy + 270}" r="12" fill="#6dff9a"/>
        ${[0, 1, 2].map((i) => `<rect x="${cx + 4}" y="${cy + 120 + i * 150}" width="40" height="18" fill="#c9b98a" opacity=".9" transform="rotate(${i % 2 ? 4 : -3} ${cx + 24} ${cy + 129 + i * 150})"/>`).join("")}</g>
      <rect class="doorL" x="${cx}" y="${cy}" width="${cw / 2}" height="${ch}" fill="#8a96a2" opacity="0"/>
      <rect x="${cx - 6}" y="${cy - 6}" width="${cw + 12}" height="${ch + 6}" fill="none" stroke="#2a2f33" stroke-width="12"/>
      <path class="wire" d="M${wx - 125},${fy - 860} V${fy - 940} H${cx + cw - 50} V${cy + 240}" stroke="#ffd23a" stroke-width="4" fill="none" stroke-dasharray="14 10" opacity=".7"/>
      <text x="${wx + ww / 2}" y="${fy + 120}" text-anchor="middle" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">СТЕНА ШАХТЫ</text>
      <text x="${cx + cw / 2}" y="${fy + 120}" text-anchor="middle" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">ЯМА ЛИФТА</text>`, w, h);
    const cab = svg.querySelector(".cab"), wire = svg.querySelector(".wire"), spk2 = svg.querySelector(".spk2");
    return {
      el: svg, w, h,
      update(t, it) {
        const li = it.v("light", 1), wp = it.v("wire", 1);
        cab.style.filter = `brightness(${0.45 + 0.55 * li * (H.noise(t * 6, 4, 1) > 0.92 ? 0.6 : 1)})`;
        wire.setAttribute("stroke-dashoffset", (-t * 60 * it.v("side", 1)).toFixed(1)); wire.setAttribute("opacity", 0.25 + 0.6 * wp);
        spk2.setAttribute("opacity", 0.5 + 0.5 * Math.sin(t * 8));
      },
    };
  },
};

// ------------------------------------------------------------------ roof: flat roof of a 9-storey panel block, side view
// w, y (top surface of the slab, local), color, hatch (track 0..1 hatch lid opens), steam (track 0..1 vapour off the slab),
// wet (sheen 0..1), antennas (n), far (true: other roofs behind at a lower level, lighter), seed
export const roof = {
  backdrop: true,
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1400, top = p.y ?? 1300, depth = p.depth ?? 700, R = H.rng(p.seed ?? 12), id = H.uid("rf");
    const col = p.color ?? "#4f565c";
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(col, 0.15)}"/><stop offset="1" stop-color="${H.shade(col, -0.35)}"/></linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e767d"/><stop offset="1" stop-color="#3a4046"/></linearGradient></defs>`;
    // facade below the slab (the top floor windows), so the roof never floats
    s += `<rect x="0" y="${top + 60}" width="${w}" height="${depth}" fill="url(#${id}f)"/>`;
    for (let x = 60; x < w - 60; x += 150) for (let r = 0; r < 4; r++) s += `<rect x="${x}" y="${top + 120 + r * 170}" width="70" height="90" fill="${R() < 0.2 ? "#e8d9a0" : "#1c252e"}" opacity="${0.8}"/>`;
    // slab (top surface seen slightly from above: a band) + parapet
    s += `<path d="M0,${top} L${w},${top} L${w},${top + 60} L0,${top + 60} Z" fill="url(#${id})"/>
      <rect x="0" y="${top - 26}" width="${w}" height="30" fill="${H.shade(col, -0.2)}"/><rect x="0" y="${top - 30}" width="${w}" height="8" fill="${H.shade(col, 0.25)}"/>
      <rect x="0" y="${top + 54}" width="${w}" height="10" fill="#22272b"/>`;
    // exit hut with the hatch / door
    const hx = p.hut_x ?? w * 0.68, hw = 240, hh = 230;
    s += `<rect x="${hx}" y="${top - hh}" width="${hw}" height="${hh}" fill="${H.shade(col, -0.05)}"/><rect x="${hx - 10}" y="${top - hh - 16}" width="${hw + 20}" height="20" fill="${H.shade(col, -0.3)}"/>
      <rect x="${hx + 70}" y="${top - 190}" width="100" height="190" fill="#1a1e22"/><rect class="hdoor" x="${hx + 70}" y="${top - 190}" width="100" height="190" fill="#5d656c"/>
      <text x="${hx + hw / 2}" y="${top - hh + 50}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="24" fill="#c9d4dc">ВЫХОД</text>`;
    // vents
    for (const x of [w * 0.12, w * 0.4]) s += `<rect x="${x}" y="${top - 90}" width="60" height="90" fill="${H.shade(col, -0.15)}"/><rect x="${x - 8}" y="${top - 100}" width="76" height="14" fill="${H.shade(col, -0.35)}"/>`;
    // TV antennas
    for (let i = 0; i < (p.antennas ?? 4); i++) {
      const x = w * (0.08 + 0.22 * i + R() * 0.06), hgt = 200 + R() * 140;
      s += `<path d="M${x},${top} V${top - hgt}" stroke="#2a2f33" stroke-width="6"/>`;
      for (let k = 0; k < 4; k++) s += `<path d="M${x - 50 + k * 6},${top - hgt + 20 + k * 26} H${x + 50 - k * 6}" stroke="#2a2f33" stroke-width="4"/>`;
    }
    // puddles on the slab (sheen) + rising drops (update)
    for (let i = 0; i < 6; i++) s += `<ellipse cx="${R() * w}" cy="${top + 18 + R() * 30}" rx="${40 + R() * 90}" ry="7" fill="#8fa3b2" opacity="${0.18 * (p.wet ?? 1)}"/>`;
    s += `<g class="steam" style="filter:blur(14px)"></g>`;
    const svg = H.svg(s, w, top + 60 + depth);
    const steam = svg.querySelector(".steam"), hdoor = svg.querySelector(".hdoor");
    const puffs = Array.from({ length: 22 }, () => [R() * w, R(), 0.5 + R()]);
    return {
      el: svg, w, h: top + 60 + depth,
      update(t, it) {
        const st = it.v("steam", 0), hd = it.v("hatch", 0);
        hdoor.setAttribute("x", hx + 70 + hd * 92); hdoor.setAttribute("width", 100 - hd * 92);
        steam.innerHTML = st > 0 ? puffs.map(([x, ph, sp]) => { const k = (t * 0.25 * sp + ph) % 1; return `<ellipse cx="${x + Math.sin(t + ph * 9) * 20}" cy="${top - k * 260}" rx="${40 + k * 70}" ry="${18 + k * 30}" fill="#e8eef0" opacity="${(1 - k) * 0.45 * st}"/>`; }).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ barometer: round aneroid, origin = centre
// r (radius), p (track: pressure mm Hg, 720..780), ref (reference needle mm), drops (0..1: drops on the glass rise up)
export const barometer = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 360, id = H.uid("bm"), S = r * 2.3, c = S / 2, R = H.rng(p.seed ?? 4);
    const ang = (mm) => (-135 + (mm - 710) / 80 * 270) * Math.PI / 180;    // 710 → -135°, 790 → +135°
    let ticks = "";
    for (let mm = 710; mm <= 790; mm += 2) {
      const a = ang(mm), big = mm % 10 === 0, r0 = r * (big ? 0.78 : 0.82), r1 = r * 0.88;
      ticks += `<line x1="${c + Math.sin(a) * r0}" y1="${c - Math.cos(a) * r0}" x2="${c + Math.sin(a) * r1}" y2="${c - Math.cos(a) * r1}" stroke="#1e1a14" stroke-width="${big ? 5 : 2.5}"/>`;
      if (big) ticks += `<text x="${c + Math.sin(a) * r * 0.68}" y="${c - Math.cos(a) * r * 0.68 + 10}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="${r * 0.08}" fill="#1e1a14">${mm}</text>`;
    }
    const words = [[725, "БУРЯ"], [740, "ДОЖДЬ"], [755, "ПЕРЕМ."], [770, "ЯСНО"], [784, "СУШЬ"]];
    for (const [mm, wd] of words) { const a = ang(mm); ticks += `<text x="${c + Math.sin(a) * r * 0.47}" y="${c - Math.cos(a) * r * 0.47 + 12}" text-anchor="middle" font-family="${COND}" font-weight="700" font-size="${r * 0.1}" fill="${mm === 740 ? "#7a1418" : "#2a241c"}">${wd}</text>`; }
    const svg = H.svg(`<defs><radialGradient id="${id}b" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e9c77a"/><stop offset=".5" stop-color="#a4782e"/><stop offset="1" stop-color="#5a3d12"/></radialGradient>
        <radialGradient id="${id}d" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#f4ecd6"/><stop offset="1" stop-color="#d6c9a6"/></radialGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <circle cx="${c}" cy="${c + 14}" r="${r * 1.08}" fill="#000" opacity=".35" style="filter:blur(12px)"/>
      <circle cx="${c}" cy="${c}" r="${r * 1.08}" fill="url(#${id}b)"/><circle cx="${c}" cy="${c}" r="${r * 0.97}" fill="#3a2a10"/>
      <circle cx="${c}" cy="${c}" r="${r * 0.94}" fill="url(#${id}d)"/>${ticks}
      <text x="${c}" y="${c + r * 0.42}" text-anchor="middle" font-family="IBM Plex Mono" font-size="${r * 0.07}" fill="#3a2f20">БАРОМЕТР-АНЕРОИД · ММ РТ. СТ.</text>
      <g class="ref"><path d="M${c},${c} L${c},${c - r * 0.86}" stroke="#a4782e" stroke-width="5"/></g>
      <g class="ndl"><path d="M${c - 9},${c + r * 0.18} L${c},${c - r * 0.84} L${c + 9},${c + r * 0.18} Z" fill="#1a1a1c"/><circle cx="${c}" cy="${c - r * 0.6}" r="${r * 0.05}" fill="none" stroke="#1a1a1c" stroke-width="5"/></g>
      <circle cx="${c}" cy="${c}" r="${r * 0.07}" fill="#a4782e"/><circle cx="${c}" cy="${c}" r="${r * 0.03}" fill="#3a2a10"/>
      <circle cx="${c}" cy="${c}" r="${r * 0.94}" fill="url(#${id}g)"/><g class="drops"></g>`, S, S);
    const ndl = svg.querySelector(".ndl"), ref = svg.querySelector(".ref"), drops = svg.querySelector(".drops");
    const dd = Array.from({ length: 14 }, () => [c + (R() - 0.5) * r * 1.4, R(), 0.5 + R(), 6 + R() * 10]);
    return {
      el: svg, w: S, h: S,
      update(t, it) {
        const mm = it.v("p", 738) + Math.sin(t * 7) * 0.25, rf = it.v("ref", p.ref ?? 738);
        ndl.setAttribute("transform", `rotate(${(ang(mm) * 180 / Math.PI).toFixed(2)} ${c} ${c})`);
        ref.setAttribute("transform", `rotate(${(ang(rf) * 180 / Math.PI).toFixed(2)} ${c} ${c})`);
        const dk = it.v("drops", p.drops ?? 1);
        drops.innerHTML = dk > 0 ? dd.map(([x, ph, sp, rr]) => { const k = (t * sp * 0.25 + ph) % 1, y = c + r * 0.8 - k * r * 1.6; return Math.hypot(x - c, y - c) < r * 0.9 ? `<ellipse cx="${x}" cy="${y}" rx="${rr * 0.7}" ry="${rr}" fill="#dfeaf0" opacity="${0.55 * dk}"/><ellipse cx="${x - rr * 0.2}" cy="${y - rr * 0.3}" rx="${rr * 0.2}" ry="${rr * 0.25}" fill="#fff" opacity="${0.8 * dk}"/>` : ""; }).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ deep_cabin: the sealed lift cabin on the sea bottom (zone 06)
// light (track 0..1), phone (track 0..1: the hand with the glowing phone out of the hatch), bubbles (0..1; air sinks DOWN here),
// zoom is done with the camera; origin top-left, 1080 × 1920
export const deep_cabin = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, id = H.uid("dc"), R = H.rng(p.seed ?? 21);
    const cx = w / 2 - 210, cy = 980, cw = 420, ch = 520;
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03100f"/><stop offset=".55" stop-color="#0b2a2b"/><stop offset="1" stop-color="#1f4a4c"/></linearGradient>
        <radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f5f1e6" stop-opacity=".55"/><stop offset="1" stop-color="#f5f1e6" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f1e6"/><stop offset="1" stop-color="#b9b3a3"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>
      <!-- the drowned house above: dark basement ceiling, cut walls, the shaft -->
      <rect x="0" y="0" width="${w}" height="420" fill="#061614"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${60 + (i % 6) * 170}" y="${80 + Math.floor(i / 6) * 160}" width="70" height="90" fill="${R() < 0.35 ? "#e8d9a0" : "#03100f"}" opacity="${0.35 + R() * 0.3}"/>`).join("")}
      <rect x="${cx - 60}" y="380" width="${cw + 120}" height="${h}" fill="#081d1c"/>
      <rect x="${cx - 70}" y="380" width="14" height="${h}" fill="#1a3433"/><rect x="${cx + cw + 56}" y="380" width="14" height="${h}" fill="#1a3433"/>
      <rect x="0" y="${cy + ch + 40}" width="${w}" height="${h - cy - ch - 40}" fill="#081816"/>
      <circle class="halo" cx="${cx + cw / 2}" cy="${cy + ch / 2}" r="460" fill="url(#${id}l)"/>
      <g class="cab"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="url(#${id}c)"/>
        <rect x="${cx}" y="${cy + ch - 60}" width="${cw}" height="60" fill="#6a5a4a"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="${cx + cw / 2 - 90}" y="${cy + 70 + i * 110}" width="180" height="30" fill="#c9b98a" transform="rotate(${i % 2 ? 4 : -3} ${cx + cw / 2} ${cy + 85 + i * 110})"/>`).join("")}
        <line x1="${cx + cw / 2}" y1="${cy}" x2="${cx + cw / 2}" y2="${cy + ch}" stroke="#5d656c" stroke-width="5"/></g>
      <rect x="${cx + 130}" y="${cy - 30}" width="160" height="30" fill="#30363b"/>
      <g class="arm"><path d="M${cx + 170},${cy - 10} C${cx + 160},${cy - 120} ${cx + 210},${cy - 200} ${cx + 250},${cy - 230}" stroke="#14181c" stroke-width="44" fill="none" stroke-linecap="round"/>
        <rect x="${cx + 225}" y="${cy - 330}" width="64" height="120" rx="12" fill="#050607" transform="rotate(18 ${cx + 257} ${cy - 270})"/>
        <rect class="scr" x="${cx + 232}" y="${cy - 322}" width="50" height="100" rx="8" fill="#cfe3f0" transform="rotate(18 ${cx + 257} ${cy - 270})"/>
        <circle class="scrg" cx="${cx + 260}" cy="${cy - 270}" r="110" fill="#cfe3f0" opacity=".2" style="filter:blur(20px)"/></g>
      <g class="bub"></g><g class="caus"></g>`, w, h);
    const cab = svg.querySelector(".cab"), halo = svg.querySelector(".halo"), arm = svg.querySelector(".arm"), bub = svg.querySelector(".bub"), caus = svg.querySelector(".caus");
    const bb = Array.from({ length: 40 }, () => [cx + 150 + R() * 140, R(), 0.6 + R() * 0.8, 4 + R() * 12]);
    return {
      el: svg, w, h,
      update(t, it) {
        const li = it.v("light", 1), ph = it.v("phone", 1), bu = it.v("bubbles", 1);
        cab.style.filter = `brightness(${0.35 + 0.65 * li * (H.noise(t * 5, 2, 1) > 0.9 ? 0.7 : 1)})`;
        halo.setAttribute("opacity", 0.4 + 0.6 * li);
        arm.setAttribute("opacity", ph); arm.style.transform = `translateY(${(1 - ph) * 140}px)`;
        // air sinks: bubbles leave the hatch and go DOWN past the cabin (water falls up in this world)
        bub.innerHTML = bu > 0 ? bb.map(([x, p0, sp, r]) => { const k = (t * sp * 0.35 + p0) % 1, y = cy - 200 + k * 1100, xx = x + Math.sin(t * 2 + p0 * 9) * 18 + (x - cx - cw / 2) * k * 0.8;
          return `<circle cx="${xx}" cy="${y}" r="${r}" fill="none" stroke="#cfeee6" stroke-width="2.5" opacity="${(1 - k) * 0.8 * bu}"/>`; }).join("") : "";
        let cs = "";
        for (let i = 0; i < 6; i++) { let d = ""; for (let x = -20; x <= w + 20; x += 45) d += `${d ? " L" : "M"}${x},${(470 + i * 60 + 18 * Math.sin(x * 0.015 + t * 1.6 + i)).toFixed(1)}`; cs += `<path d="${d}" stroke="#bfe6df" stroke-width="3" opacity="${0.12 - i * 0.015}" fill="none"/>`; }
        caus.innerHTML = cs;
      },
    };
  },
};
