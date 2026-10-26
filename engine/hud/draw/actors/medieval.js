// Medieval village (series «Без тени»): half-timbered cottage, chapel with a bell tower, well, watermill, forge, anvil,
// cobbled square, distant forest, hut interior, crater with the black star stone, meteor, smoke, fire, candle, torch,
// bonfire, light pool, astrolabe, book, parchment, cast_shadow (a person's shadow cast from a light source — can lag
// behind or move on its own) and living_shadow (a free shadow creature with long arms, no face).
// Buildings, trees, props and figures stand on their origin (bottom center) unless noted.

const rr = (x, y, w, h, r, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

// ------------------------------------------------------------------ cottage: half-timbered house
// w, floors (1|2), wall (plaster), timber, roof, thatch (true = straw, false = shingles), seed, lit (track 0..1: windows),
// door (open door glow 0..1), chimney (true), shutters
export const cottage = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 7.5 },
  create(p, H) {
    const rnd = H.rng(p.seed ?? 5), id = H.uid("cot");
    const w = p.w ?? 340, fl = p.floors ?? (rnd() < 0.55 ? 2 : 1), fh = 150;
    const wall = H.col(p.wall ?? ["#e8dcc0", "#e2d2b0", "#ded6c4", "#eadfc6"][Math.floor(rnd() * 4)]);
    const timber = H.col(p.timber ?? ["#4a3020", "#3e2a1e", "#553522"][Math.floor(rnd() * 3)]);
    const thatch = p.thatch ?? rnd() < 0.6;
    const roof = H.col(p.roof ?? (thatch ? ["#b08a4a", "#a07a3e", "#9a8048"][Math.floor(rnd() * 3)] : ["#6a3a2a", "#5a3c32", "#734634"][Math.floor(rnd() * 3)]));
    const rh = p.roof_h ?? 190, over = 30;
    const body = fl * fh, h = body + rh, by = rh;            // wall top at y = rh
    const T = 9;
    let s = `<defs><linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${H.shade(roof, 0.12)}"/><stop offset="1" stop-color="${H.shade(roof, -0.22)}"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${H.shade(wall, -0.16)}"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.75"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect x="0" y="${by}" width="${w}" height="${body}" fill="url(#${id}w)"/>`;
    // stone plinth
    s += `<rect x="-4" y="${h - 26}" width="${w + 8}" height="26" fill="${H.shade(wall, -0.45)}"/>`;
    for (let x = 0; x < w; x += 34) s += `<rect x="${x + (rnd() * 6)}" y="${h - 24}" width="${26 + rnd() * 6}" height="10" rx="3" fill="${H.shade(wall, -0.35)}"/>`;
    // timber frame: posts, beams, braces
    const posts = Math.max(3, Math.round(w / 110) + 1);
    for (let f = 0; f < fl; f++) {
      const y0 = by + f * fh;
      s += `<rect x="-4" y="${y0}" width="${w + 8}" height="${T + 2}" fill="${timber}"/>`;
      for (let i = 0; i < posts; i++) {
        const x = (i / (posts - 1)) * (w - T);
        s += `<rect x="${x}" y="${y0}" width="${T}" height="${fh}" fill="${timber}"/>`;
        if (i < posts - 1 && (i + f) % 2 === 0) {
          const x2 = ((i + 1) / (posts - 1)) * (w - T);
          s += `<path d="M${x + T},${y0 + fh} L${x2},${y0 + T}" stroke="${timber}" stroke-width="${T}"/>`;
        }
      }
    }
    // windows (lit by `lit`), door on the ground floor
    const wins = [];
    const doorI = p.door_at ?? Math.floor(rnd() * (posts - 1));
    let door = null;
    for (let f = 0; f < fl; f++) for (let i = 0; i < posts - 1; i++) {
      const xa = (i / (posts - 1)) * (w - T) + T, xb = ((i + 1) / (posts - 1)) * (w - T), cx = (xa + xb) / 2;
      const y0 = by + f * fh;
      if (f === fl - 1 && i === doorI) { door = [cx - 32, y0 + fh - 112, 64, 112 - (f === fl - 1 ? 26 : 0)]; continue; }
      if ((i + f * 2 + (p.seed ?? 5)) % 3 === 2 && f < fl - 1) continue;
      const ww = 52, wh = 62, wx = cx - ww / 2, wy = y0 + 40;
      wins.push([wx, wy, ww, wh]);
    }
    for (const [x, y, ww, wh] of wins) {
      s += `<rect x="${x - 6}" y="${y - 6}" width="${ww + 12}" height="${wh + 12}" fill="${timber}"/>
        <rect class="cw" x="${x}" y="${y}" width="${ww}" height="${wh}" fill="#1c1a22"/>
        <path d="M${x + ww / 2},${y} V${y + wh} M${x},${y + wh / 2} H${x + ww}" stroke="${timber}" stroke-width="4"/>`;
      if (p.shutters !== false) s += `<rect x="${x - 26}" y="${y - 4}" width="18" height="${wh + 8}" fill="${H.shade(timber, 0.18)}"/><rect x="${x + ww + 8}" y="${y - 4}" width="18" height="${wh + 8}" fill="${H.shade(timber, 0.18)}"/>`;
    }
    if (door) {
      const [x, y, dw, dh] = door;
      s += `<path d="M${x - 8},${y + dh} V${y + 18} Q${x + dw / 2},${y - 14} ${x + dw + 8},${y + 18} V${y + dh} Z" fill="${timber}"/>
        <path class="dr" d="M${x},${y + dh} V${y + 20} Q${x + dw / 2},${y - 4} ${x + dw},${y + 20} V${y + dh} Z" fill="${H.shade(timber, 0.12)}"/>
        <path d="M${x + dw / 3},${y + 10} V${y + dh} M${x + (dw * 2) / 3},${y + 10} V${y + dh}" stroke="${H.shade(timber, -0.25)}" stroke-width="3"/>
        <circle cx="${x + dw - 12}" cy="${y + dh * 0.55}" r="3.5" fill="#c9a24a"/>`;
    }
    // chimney (behind the roof edge)
    const chx = w * (0.62 + rnd() * 0.18);
    const chim = p.chimney !== false ? `<rect x="${chx}" y="${by - rh * 0.95}" width="34" height="${rh * 0.7}" fill="${H.shade(wall, -0.5)}"/><rect x="${chx - 4}" y="${by - rh * 0.98}" width="42" height="12" fill="${H.shade(wall, -0.6)}"/>` : "";
    // roof
    const rp = `M${-over},${by + 8} L${w / 2},${by - rh + 10} L${w + over},${by + 8} Z`;
    s = s.replace("</defs>", "</defs>" + chim);
    s += `<path d="${rp}" fill="url(#${id}r)"/>`;
    if (thatch) {
      for (let i = 0; i < 70; i++) {
        const u = rnd(), v = rnd();
        const yy = by - rh + 20 + v * (rh - 10), half = (w / 2 + over) * ((yy - (by - rh + 10)) / (rh - 2));
        const x = w / 2 - half + u * half * 2;
        s += `<path d="M${x.toFixed(0)},${yy.toFixed(0)} l${(-4 + rnd() * 8).toFixed(0)},${(14 + rnd() * 12).toFixed(0)}" stroke="${H.shade(roof, rnd() < 0.5 ? -0.25 : 0.2)}" stroke-width="2.4"/>`;
      }
      s += `<path d="M${-over - 4},${by + 8} Q${w / 2},${by + 22} ${w + over + 4},${by + 8}" stroke="${H.shade(roof, -0.3)}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    } else {
      for (let k = 1; k < 7; k++) {
        const yy = by - rh + 10 + (rh - 2) * (k / 7), half = (w / 2 + over) * (k / 7);
        s += `<path d="M${w / 2 - half},${yy} H${w / 2 + half}" stroke="${H.shade(roof, -0.3)}" stroke-width="3"/>`;
      }
    }
    s += `<path d="M${w / 2 - 2},${by - rh + 6} L${w / 2 + 2},${by - rh + 6}" stroke="${H.shade(roof, -0.4)}" stroke-width="10" stroke-linecap="round"/>`;
    // window glow halos (only when lit)
    s += wins.map(([x, y, ww, wh]) => `<ellipse class="cg" cx="${x + ww / 2}" cy="${y + wh / 2}" rx="${ww * 1.4}" ry="${wh * 1.2}" fill="url(#${id}g)" opacity="0"/>`).join("");
    const svg = H.svg(s, w, h);
    const cw = [...svg.querySelectorAll(".cw")], cg = [...svg.querySelectorAll(".cg")], dr = svg.querySelector(".dr");
    const ph = wins.map(() => rnd() * 6);
    return {
      el: svg, w, h,
      update(t, it) {
        const l = it.v("lit", 0);
        cw.forEach((e, i) => {
          const on = H.clamp(l * (wins.length > 1 ? 1.35 - (i % 3) * 0.18 : 1));
          const f = 0.92 + 0.08 * Math.sin(t * 7 + ph[i]);
          e.setAttribute("fill", H.mixc("#1c1a22", "#ffc867", on * f));
          cg[i].setAttribute("opacity", (on * 0.7 * f).toFixed(3));
        });
        if (dr) { const d = it.v("door", 0); dr.setAttribute("fill", H.mixc(H.shade(timber, 0.12), "#ffcf73", d)); }
      },
      anchor(name, args) {
        if (name === "door" && door) return [door[0] + door[2] / 2, door[1] + door[3]];
        if (name === "win" && wins.length) { const q = wins[Math.min(wins.length - 1, Number(args?.[0] ?? 0))]; return [q[0] + q[2] / 2, q[1] + q[3] / 2]; }
        if (name === "chimney") return [chx + 17, by - rh * 0.98];
        if (name === "roof") return [w / 2, by - rh + 10];
        return null;
      },
    };
  },
};

// ------------------------------------------------------------------ chapel: stone nave + timber bell tower with a bell
// w, color (stone), roof, ring (track: swing amplitude 0..1), lit (track: windows)
export const chapel = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 18 },
  create(p, H) {
    const rnd = H.rng(p.seed ?? 2), id = H.uid("chp");
    const w = p.w ?? 420, stone = H.col(p.color ?? "#9a948a"), roof = H.col(p.roof ?? "#4a3a36"), wood = H.col(p.wood ?? "#4a3222");
    const nh = 260, tw = 150, th = 420, belfry = 120, spire = 190;
    const h = nh + th + spire - 120;                           // tower rises above the nave
    const ny = h - nh;                                          // nave wall top
    const tx = w * 0.06, ty = h - th - 140;                     // tower box (left)
    let s = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${H.shade(stone, 0.06)}"/><stop offset="1" stop-color="${H.shade(stone, -0.2)}"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.7"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>`;
    // nave
    s += `<rect x="${tw * 0.6}" y="${ny}" width="${w - tw * 0.6}" height="${nh}" fill="url(#${id}s)"/>`;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (rnd() < 0.35) s += `<rect x="${tw * 0.6 + 8 + c * ((w - tw * 0.6 - 16) / 9)}" y="${ny + 10 + r * 27}" width="${26 + rnd() * 10}" height="12" rx="3" fill="${H.shade(stone, -0.12 + rnd() * 0.08)}"/>`;
    s += `<path d="M${tw * 0.6 - 24},${ny + 6} L${(tw * 0.6 + w) / 2},${ny - 150} L${w + 24},${ny + 6} Z" fill="${roof}"/>`;
    s += `<path d="M${tw * 0.6 - 24},${ny + 6} L${w + 24},${ny + 6}" stroke="${H.shade(roof, -0.35)}" stroke-width="8"/>`;
    // arched windows
    const wins = [];
    for (let i = 0; i < 3; i++) { const x = tw * 0.6 + 60 + i * ((w - tw * 0.6 - 120) / 2); wins.push([x, ny + 70]); }
    for (const [x, y] of wins) s += `<path d="M${x - 18},${y + 80} V${y + 18} Q${x},${y - 6} ${x + 18},${y + 18} V${y + 80} Z" fill="${H.shade(stone, -0.4)}"/><path class="cw" d="M${x - 12},${y + 76} V${y + 20} Q${x},${y + 2} ${x + 12},${y + 20} V${y + 76} Z" fill="#1c1a22"/>`;
    // door
    const dx = (tw * 0.6 + w) / 2 + 40;
    s += `<path d="M${dx - 38},${h} V${h - 90} Q${dx},${h - 140} ${dx + 38},${h - 90} V${h} Z" fill="${H.shade(stone, -0.45)}"/><path d="M${dx - 30},${h} V${h - 88} Q${dx},${h - 128} ${dx + 30},${h - 88} V${h} Z" fill="${wood}"/>`;
    // tower: stone base + timber belfry + spire
    s += `<rect x="${tx}" y="${ty + belfry}" width="${tw}" height="${h - ty - belfry}" fill="url(#${id}s)"/>`;
    for (let r = 0; r < 14; r++) s += `<rect x="${tx + (r % 2 ? 0 : 20)}" y="${ty + belfry + 18 + r * 30}" width="${tw - 20}" height="3" fill="${H.shade(stone, -0.22)}" opacity="0.6"/>`;
    s += `<rect x="${tx - 8}" y="${ty}" width="${tw + 16}" height="${belfry + 10}" fill="${wood}"/>
      <rect x="${tx + 16}" y="${ty + 14}" width="${tw - 32}" height="${belfry - 16}" fill="#0e0c12"/>
      <path d="M${tx - 22},${ty + 4} L${tx + tw / 2},${ty - spire} L${tx + tw + 22},${ty + 4} Z" fill="${roof}"/>
      <path d="M${tx + tw / 2},${ty - spire - 46} V${ty - spire + 4} M${tx + tw / 2 - 16},${ty - spire - 28} H${tx + tw / 2 + 16}" stroke="${H.shade(wood, 0.3)}" stroke-width="6"/>
      <rect x="${tx + 16}" y="${ty + 14}" width="${tw - 32}" height="8" fill="${H.shade(wood, -0.3)}"/>`;
    const bx = tx + tw / 2, byy = ty + 22;
    s += `<g class="bell"><path d="M${bx},${byy} V${byy + 14}" stroke="#2a2420" stroke-width="5"/>
      <path d="M${bx - 30},${byy + 74} Q${bx - 28},${byy + 18} ${bx},${byy + 14} Q${bx + 28},${byy + 18} ${bx + 30},${byy + 74} Z" fill="#b58a3a"/>
      <path d="M${bx - 34},${byy + 74} H${bx + 34}" stroke="#8a6526" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${bx}" cy="${byy + 82}" r="7" fill="#6a4c1e"/></g>`;
    s += wins.map(([x, y]) => `<ellipse class="cg" cx="${x}" cy="${y + 45}" rx="60" ry="70" fill="url(#${id}g)" opacity="0"/>`).join("");
    s += `<rect x="-6" y="${h - 14}" width="${w + 12}" height="14" fill="${H.shade(stone, -0.4)}"/>`;
    const svg = H.svg(s, w, h);
    const bell = svg.querySelector(".bell"), cw = [...svg.querySelectorAll(".cw")], cg = [...svg.querySelectorAll(".cg")];
    return {
      el: svg, w, h,
      update(t, it) {
        const a = it.v("ring", 0);
        bell.setAttribute("transform", `rotate(${(a * 24 * Math.sin(t * 5.2)).toFixed(2)} ${bx} ${byy})`);
        const l = it.v("lit", 0);
        cw.forEach((e, i) => { e.setAttribute("fill", H.mixc("#1c1a22", "#ffc867", l)); cg[i].setAttribute("opacity", (l * 0.7).toFixed(3)); });
      },
      anchor(name) {
        if (name === "bell") return [bx, byy + 50];
        if (name === "top") return [bx, ty - spire - 46];
        if (name === "door") return [dx, h];
        return null;
      },
    };
  },
};

// ------------------------------------------------------------------ well: round stone curb, posts, little roof, bucket
export const well = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 2.6 },
  create(p, H) {
    const w = p.w ?? 220, h = 300, stone = H.col(p.color ?? "#8f8a80"), wood = H.col(p.wood ?? "#5a3c26"), roof = H.col(p.roof ?? "#6a3a2a");
    const rnd = H.rng(p.seed ?? 3);
    let s = `<rect x="${w * 0.16}" y="40" width="12" height="${h - 120}" fill="${wood}"/><rect x="${w * 0.84 - 12}" y="40" width="12" height="${h - 120}" fill="${wood}"/>
      <path d="M${w * 0.02},62 L${w / 2},4 L${w * 0.98},62 Z" fill="${roof}"/><path d="M${w * 0.02},62 H${w * 0.98}" stroke="${H.shade(roof, -0.35)}" stroke-width="7"/>
      <rect x="${w * 0.16}" y="110" width="${w * 0.68}" height="10" fill="${H.shade(wood, 0.15)}"/>
      <path d="M${w / 2},118 V182" stroke="#3a2a1e" stroke-width="3"/>
      <path d="M${w / 2 - 16},182 L${w / 2 + 16},182 L${w / 2 + 12},212 L${w / 2 - 12},212 Z" fill="${H.shade(wood, 0.1)}"/>
      <path d="M${w * 0.84},114 l26,0 l0,24" stroke="#3a2a1e" stroke-width="6" fill="none"/>
      <ellipse cx="${w / 2}" cy="${h - 92}" rx="${w / 2}" ry="18" fill="${H.shade(stone, -0.5)}"/>
      <path d="M0,${h - 92} V${h - 6} Q${w / 2},${h + 10} ${w},${h - 6} V${h - 92} Q${w / 2},${h - 74} 0,${h - 92} Z" fill="${stone}"/>`;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) s += `<rect x="${6 + c * (w / 5) + (r % 2) * 18}" y="${h - 84 + r * 26}" width="${w / 5 - 10}" height="20" rx="5" fill="${H.shade(stone, -0.1 + rnd() * 0.16)}"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ watermill: stone house, turning wheel on the right
// w, speed (deg/s, track), color, wood
export const watermill = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 9 },
  create(p, H) {
    const w = p.w ?? 420, R = p.wheel ?? 120, wall = H.col(p.color ?? "#a29a8c"), wood = H.col(p.wood ?? "#4e3422"), roof = H.col(p.roof ?? "#6b4a2e");
    const bw = w - R - 20, bh = 250, rh = 160, h = bh + rh, rnd = H.rng(p.seed ?? 6);
    let s = `<rect x="0" y="${rh}" width="${bw}" height="${bh}" fill="${wall}"/>`;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) if (rnd() < 0.45) s += `<rect x="${8 + c * (bw / 6)}" y="${rh + 10 + r * 30}" width="${bw / 6 - 12}" height="14" rx="4" fill="${H.shade(wall, -0.15 + rnd() * 0.1)}"/>`;
    s += `<path d="M-24,${rh + 8} L${bw / 2},10 L${bw + 24},${rh + 8} Z" fill="${roof}"/>
      <rect x="${bw * 0.3}" y="${rh + 80}" width="48" height="56" fill="#1c1a22" class="mw"/><rect x="${bw * 0.62}" y="${h - 110}" width="60" height="110" fill="${wood}"/>`;
    const cx = bw + R * 0.55, cy = h - R * 0.75;
    let spokes = "";
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; spokes += `<path d="M0,0 L${(Math.cos(a) * R).toFixed(1)},${(Math.sin(a) * R).toFixed(1)}" stroke="${wood}" stroke-width="9"/>`; }
    let paddles = "";
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 360; paddles += `<rect x="${R - 6}" y="-12" width="28" height="24" fill="${H.shade(wood, 0.15)}" transform="rotate(${a})"/>`; }
    s += `<g class="wh" transform="translate(${cx},${cy})"><circle r="${R}" fill="none" stroke="${wood}" stroke-width="12"/><circle r="${R * 0.62}" fill="none" stroke="${wood}" stroke-width="6"/>${spokes}${paddles}<circle r="16" fill="${H.shade(wood, -0.3)}"/></g>`;
    s += `<rect x="${bw - 6}" y="${cy - 10}" width="${R * 0.55 + 10}" height="18" fill="${H.shade(wood, -0.2)}"/>`;
    const svg = H.svg(s, w, h);
    const wh = svg.querySelector(".wh"), mw = svg.querySelector(".mw");
    return {
      el: svg, w, h,
      update(t, it) {
        const sp = it.v("speed", 30);
        wh.setAttribute("transform", `translate(${cx},${cy}) rotate(${(t * sp) % 360})`);
        mw.setAttribute("fill", H.mixc("#1c1a22", "#ffc867", it.v("lit", 0)));
      },
    };
  },
};

// ------------------------------------------------------------------ forge: stone smithy with an open arch and a glowing hearth
export const forge = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 6 },
  create(p, H) {
    const w = p.w ?? 460, h = 400, stone = H.col(p.color ?? "#7d756a"), roof = H.col(p.roof ?? "#5a3c30"), wood = H.col(p.wood ?? "#4a3020");
    const rnd = H.rng(p.seed ?? 8), id = H.uid("frg");
    let s = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.5" stop-color="#ff7a24"/><stop offset="1" stop-color="#7a1a0a" stop-opacity="0"/></radialGradient></defs>
      <rect x="${w * 0.72}" y="0" width="60" height="200" fill="${H.shade(stone, -0.25)}"/>
      <rect x="0" y="130" width="${w}" height="${h - 130}" fill="${stone}"/>`;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) if (rnd() < 0.5) s += `<rect x="${6 + c * (w / 7)}" y="${142 + r * 28}" width="${w / 7 - 12}" height="14" rx="4" fill="${H.shade(stone, -0.14 + rnd() * 0.1)}"/>`;
    s += `<path d="M-30,140 L${w / 2},40 L${w + 30},140 Z" fill="${roof}"/><path d="M-30,140 H${w + 30}" stroke="${H.shade(roof, -0.35)}" stroke-width="9"/>
      <path d="M${w * 0.12},${h} V${h - 160} Q${w * 0.32},${h - 250} ${w * 0.52},${h - 160} V${h} Z" fill="#120d0c"/>
      <ellipse class="hg" cx="${w * 0.32}" cy="${h - 60}" rx="110" ry="80" fill="url(#${id})"/>
      <rect x="${w * 0.2}" y="${h - 54}" width="${w * 0.24}" height="54" fill="${H.shade(stone, -0.35)}"/>
      <rect x="${w * 0.62}" y="${h - 150}" width="90" height="70" fill="#1c1a22"/><path d="M${w * 0.62 + 45},${h - 150} V${h - 80}" stroke="${wood}" stroke-width="5"/>`;
    const svg = H.svg(s, w, h);
    const hg = svg.querySelector(".hg");
    return { el: svg, w, h, update(t) { hg.setAttribute("opacity", (0.75 + 0.25 * H.noise(t, 3, 2)).toFixed(3)); } };
  },
};

export const anvil = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 0.9 },
  create(p, H) {
    const w = 200, h = 170, iron = H.col(p.color ?? "#3a3c44"), wood = H.col(p.wood ?? "#5a3c26");
    const s = `<path d="M50,${h} L60,90 L140,90 L150,${h} Z" fill="${wood}"/><ellipse cx="100" cy="90" rx="42" ry="8" fill="${H.shade(wood, 0.2)}"/>
      <path d="M58,84 L70,56 L130,56 L142,84 Z" fill="${iron}"/>
      <path d="M10,30 Q40,28 52,24 L170,24 Q192,26 196,40 L170,56 L40,56 Q20,50 10,30 Z" fill="${iron}"/>
      <path d="M52,24 L170,24" stroke="${H.shade(iron, 0.4)}" stroke-width="4"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ cobbles: cobbled square surface (origin top-left)
export const cobbles = {
  surface: true,
  create(p, H) {
    const w = p.w ?? 2200, h = p.h ?? 700, c = H.col(p.color ?? "#6e665c"), rnd = H.rng(p.seed ?? 2), id = H.uid("cb");
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(c, -0.25)}"/><stop offset="1" stop-color="${H.shade(c, -0.05)}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
    let y = 6, row = 0;
    while (y < h) {
      const k = 0.35 + 0.65 * (y / h), sh = 10 + 30 * k, sw = 20 + 50 * k;
      for (let x = (row % 2) * sw * 0.5 - sw; x < w + sw; x += sw * (0.95 + rnd() * 0.15)) s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(sw * 0.86).toFixed(0)}" height="${(sh * 0.8).toFixed(0)}" rx="${(sh * 0.3).toFixed(0)}" fill="${H.shade(c, -0.18 + rnd() * 0.22)}"/>`;
      y += sh; row++;
    }
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ forest: a band of tree silhouettes, optionally on a hill
// w, h (tree height), color, hill (px, height of the hill bump, 0 = flat), seed, density
export const forest = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 1600, th = p.h ?? 160, hill = p.hill ?? 0, c = H.col(p.color ?? "#24302c"), rnd = H.rng(p.seed ?? 4);
    const h = th + hill + 20, n = Math.round((w / 26) * (p.density ?? 1));
    const ground = (x) => h - hill * Math.sin(Math.PI * H.clamp(x / w)) ** 1.2;
    let s = `<path d="M0,${h} ${Array.from({ length: 21 }, (_, i) => `L${(i / 20) * w},${ground((i / 20) * w).toFixed(1)}`).join(" ")} L${w},${h} Z" fill="${c}"/>`;
    const trees = Array.from({ length: n }, () => [rnd() * w, th * (0.55 + rnd() * 0.45), rnd()]).sort((a, b) => a[2] - b[2]);
    for (const [x, hh, k] of trees) {
      const g = ground(x) + 4, ww = hh * 0.36, col = H.shade(c, (k - 0.5) * 0.12);
      if (k < 0.6) s += `<path d="M${x},${g - hh} L${x + ww / 2},${g - hh * 0.35} L${x + ww * 0.3},${g - hh * 0.38} L${x + ww * 0.62},${g} L${x - ww * 0.62},${g} L${x - ww * 0.3},${g - hh * 0.38} L${x - ww / 2},${g - hh * 0.35} Z" fill="${col}"/>`;
      else s += `<ellipse cx="${x}" cy="${g - hh * 0.55}" rx="${ww * 0.75}" ry="${hh * 0.5}" fill="${col}"/><rect x="${x - 3}" y="${g - hh * 0.2}" width="6" height="${hh * 0.2}" fill="${col}"/>`;
    }
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ hut_interior: timber walls, beams, plank floor (full frame)
// w, h, floor_y, wall, timber, floor, window: {x, y, w, h, night: true}, light: [x, y] (warm pool), light_r, light_k (track)
export const hut_interior = {
  surface: true,
  create(p, H) {
    const w = p.w ?? H.W, h = p.h ?? H.H, fy = p.floor_y ?? 1300, id = H.uid("hut"), rnd = H.rng(p.seed ?? 3);
    const wall = H.col(p.wall ?? "#5a4634"), timber = H.col(p.timber ?? "#2e2018"), floor = H.col(p.floor ?? "#4a3628");
    let s = `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(floor, -0.3)}"/><stop offset="1" stop-color="${floor}"/></linearGradient>
      <radialGradient id="${id}l"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.55"/><stop offset="0.45" stop-color="#ff9a3a" stop-opacity="0.18"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>
      <rect width="${w}" height="${fy}" fill="${wall}"/>`;
    for (let i = 0; i < 40; i++) s += `<rect x="${rnd() * w}" y="${rnd() * fy}" width="${30 + rnd() * 80}" height="${4 + rnd() * 8}" rx="3" fill="${H.shade(wall, -0.12 + rnd() * 0.1)}" opacity="0.6"/>`;
    for (let x = 60; x < w; x += 330) s += `<rect x="${x}" y="0" width="34" height="${fy}" fill="${timber}"/>`;
    s += `<rect x="0" y="${fy * 0.18}" width="${w}" height="30" fill="${timber}"/><rect x="0" y="${fy - 30}" width="${w}" height="30" fill="${timber}"/>`;
    if (p.window) {
      const q = p.window;
      s += `<rect x="${q.x - 14}" y="${q.y - 14}" width="${q.w + 28}" height="${q.h + 28}" fill="${timber}"/><rect class="hw" x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.night === false ? "#bcd6e8" : "#16203a"}"/>
        <path d="M${q.x + q.w / 2},${q.y} V${q.y + q.h} M${q.x},${q.y + q.h / 2} H${q.x + q.w}" stroke="${timber}" stroke-width="8"/>`;
      if (q.night !== false) s += `<circle cx="${q.x + q.w * 0.7}" cy="${q.y + q.h * 0.3}" r="14" fill="#e8e2c8" opacity="0.8"/>`;
    }
    s += `<rect y="${fy}" width="${w}" height="${h - fy}" fill="url(#${id}f)"/>`;
    for (let j = 1; j < 7; j++) { const y = fy + (h - fy) * Math.pow(j / 7, 1.5); s += `<rect x="0" y="${y}" width="${w}" height="3" fill="${H.shade(floor, -0.35)}" opacity="0.6"/>`; }
    const L = p.light;
    if (L) s += `<ellipse class="lp" cx="${L[0]}" cy="${L[1]}" rx="${p.light_r ?? 520}" ry="${(p.light_r ?? 520) * 0.9}" fill="url(#${id}l)"/>`;
    const svg = H.svg(s, w, h);
    const lp = svg.querySelector(".lp");
    return {
      el: svg, w, h,
      update(t, it) { if (lp) lp.setAttribute("opacity", (it.v("light_k", 1) * (0.9 + 0.1 * H.noise(t, 7, 3))).toFixed(3)); },
    };
  },
};

// ------------------------------------------------------------------ crater: impact pit in a forest clearing (origin bottom center)
// w, depth, color (earth), trees (fallen trunks around), glow (track 0..1: orange glow from the pit)
export const crater = {
  origin: "bottom",
  surface: true,
  create(p, H) {
    const w = p.w ?? 900, d = p.depth ?? 220, h = d + 120, c = H.col(p.color ?? "#3a2a20"), rnd = H.rng(p.seed ?? 5), id = H.uid("crt");
    const top = 120;                                              // rim line
    let s = `<defs><radialGradient id="${id}" cx="0.5" cy="0.7"><stop offset="0" stop-color="#ff8a3a" stop-opacity="0.7"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(c, -0.55)}"/><stop offset="1" stop-color="${H.shade(c, -0.25)}"/></linearGradient></defs>`;
    // fallen trunks radiating outward behind the rim
    if (p.trees !== false) for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1, x0 = w / 2 + side * (w * 0.32 + rnd() * w * 0.12), y0 = top - 6 - rnd() * 30, L = 120 + rnd() * 140, a = side * (10 + rnd() * 30);
      s += `<g transform="translate(${x0},${y0}) rotate(${a})"><rect x="${side > 0 ? 0 : -L}" y="-8" width="${L}" height="16" rx="7" fill="#3a2a1e"/>
        <circle cx="${side > 0 ? L : -L}" cy="-6" r="${26 + rnd() * 16}" fill="#1e2a22"/></g>`;
    }
    // raised rim mounds
    s += `<path d="M0,${top + 30} Q${w * 0.12},${top - 30} ${w * 0.3},${top - 10} Q${w * 0.5},${top - 40} ${w * 0.7},${top - 12} Q${w * 0.88},${top - 34} ${w},${top + 30} L${w},${h} L0,${h} Z" fill="${c}"/>`;
    // the pit (an ellipse cut into the rim)
    s += `<ellipse cx="${w / 2}" cy="${top + d * 0.32}" rx="${w * 0.36}" ry="${d * 0.42}" fill="url(#${id}p)"/>
      <ellipse class="cg" cx="${w / 2}" cy="${top + d * 0.4}" rx="${w * 0.4}" ry="${d * 0.6}" fill="url(#${id})" opacity="0"/>`;
    for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI, r = w * 0.36; s += `<circle cx="${w / 2 + Math.cos(a) * r * (rnd() < 0.5 ? -1 : 1)}" cy="${top + d * 0.32 - Math.sin(a) * d * 0.42 * 0.6 + d * 0.1}" r="${4 + rnd() * 9}" fill="${H.shade(c, 0.15)}"/>`; }
    s += `<path d="M0,${top + 30} Q${w / 2},${top + d * 0.85} ${w},${top + 30} L${w},${h} L0,${h} Z" fill="${H.shade(c, 0.05)}"/>`;
    const svg = H.svg(s, w, h);
    const cg = svg.querySelector(".cg");
    return {
      el: svg, w, h,
      update(t, it) { cg.setAttribute("opacity", (it.v("glow", 0) * (0.85 + 0.15 * H.noise(t, 4, 2))).toFixed(3)); },
      anchor(name) { return name === "pit" ? [w / 2, top + d * 0.42] : null; },
    };
  },
};

// ------------------------------------------------------------------ star_stone: the black stone that does not reflect light
// r, heat (track 0..1: shimmer above), drink (track 0..1: threads of light pulled in), crack (track 0..1: glowing cracks), rim
export const star_stone = {
  origin: "center",
  size_m: { w: 0.35 },
  create(p, H) {
    const r = p.r ?? 70, W = r * 6, id = H.uid("st"), rnd = H.rng(p.seed ?? 9), c = W / 2;
    const threads = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * 6.283 + rnd() * 0.4, L: r * (1.6 + rnd() * 1.2), ph: rnd() }));
    const cracks = Array.from({ length: 7 }, () => { let a = rnd() * 6.283, x = c + Math.cos(a) * r * 0.15, y = c + Math.sin(a) * r * 0.15, d = `M${x.toFixed(1)},${y.toFixed(1)}`; for (let j = 0; j < 4; j++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * r * 0.24; y += Math.sin(a) * r * 0.24; d += ` L${x.toFixed(1)},${y.toFixed(1)}`; } return d; });
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="#e8f0ff" stop-opacity="0.9"/><stop offset="1" stop-color="#e8f0ff" stop-opacity="0"/></radialGradient></defs>
      <g class="th">${threads.map(() => `<path fill="none" stroke="#ffd9a0" stroke-width="3" stroke-linecap="round"/>`).join("")}</g>
      <g class="ht">${[0, 1, 2].map(() => `<path fill="none" stroke="rgba(255,190,120,0.35)" stroke-width="3"/>`).join("")}</g>
      <circle cx="${c}" cy="${c}" r="${r * 1.05}" fill="${H.col(p.rim ?? "#2a1840")}" opacity="0.35" style="filter:blur(6px)"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="#000000"/>
      <g class="ck" opacity="0">${cracks.map((d) => `<path d="${d}" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>`).join("")}</g>
      <circle class="fl" cx="${c}" cy="${c}" r="${r * 2.4}" fill="url(#${id})" opacity="0"/>`, W, W);
    const th = [...svg.querySelectorAll(".th path")], ht = [...svg.querySelectorAll(".ht path")], ck = svg.querySelector(".ck"), fl = svg.querySelector(".fl");
    return {
      el: svg, w: W, h: W,
      update(t, it) {
        const heat = it.v("heat", 0), drink = it.v("drink", 0), crack = it.v("crack", 0);
        ht.forEach((e, i) => {
          const x0 = c - r * 0.5 + i * r * 0.5, y0 = c - r * 1.1, q = Math.sin(t * 4 + i) * 10;
          e.setAttribute("d", `M${x0},${y0} q${q},-20 0,-40 q${-q},-20 0,-40`);
          e.setAttribute("opacity", (heat * (0.6 + 0.4 * Math.sin(t * 3 + i))).toFixed(3));
        });
        threads.forEach((q, i) => {
          const k = (q.ph + t * 0.6) % 1, L0 = r + q.L * (1 - k), L1 = r + q.L * Math.max(0, 1 - k - 0.25);
          th[i].setAttribute("d", `M${(c + Math.cos(q.a) * L0).toFixed(1)},${(c + Math.sin(q.a) * L0).toFixed(1)} L${(c + Math.cos(q.a) * L1).toFixed(1)},${(c + Math.sin(q.a) * L1).toFixed(1)}`);
          th[i].setAttribute("opacity", (drink * Math.sin(Math.PI * k)).toFixed(3));
        });
        ck.setAttribute("opacity", Math.min(1, crack * 1.5).toFixed(3));
        fl.setAttribute("opacity", Math.max(0, crack * 2 - 1).toFixed(3));
      },
    };
  },
};

// ------------------------------------------------------------------ meteor: fireball with a tail (origin = head)
// len (tail), angle (deg, direction the tail points to), r (head)
export const meteor = {
  origin: "center",
  create(p, H) {
    const L = p.len ?? 520, r = p.r ?? 26, a = p.angle ?? 210, id = H.uid("met"), W = L + r * 4;
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3c0"/><stop offset="0.2" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}h"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff7a24" stop-opacity="0"/></radialGradient></defs>
      <g transform="translate(${W / 2},${W / 2}) rotate(${a})">
        <path class="tl" d="M0,${-r} L${L},-3 L${L},3 L0,${r} Z" fill="url(#${id})"/>
        <circle r="${r * 3.2}" fill="url(#${id}h)" opacity="0.8"/><circle r="${r * 0.7}" fill="#ffffff"/></g>`, W, W);
    const tl = svg.querySelector(".tl");
    return { el: svg, w: W, h: W, update(t) { tl.setAttribute("opacity", (0.85 + 0.15 * Math.sin(t * 30)).toFixed(3)); } };
  },
};

// ------------------------------------------------------------------ smoke: rising smoke column (w spread, h height, color, speed, drift)
export const smoke = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 360, h = p.h ?? 900, n = p.n ?? 16, rnd = H.rng(p.seed ?? 4), col = H.col(p.color ?? "#2a2220");
    const puffs = Array.from({ length: n }, (_, i) => ({ ph: i / n, r: 0.6 + rnd() * 0.5, j: rnd() * 6.28, sh: rnd() * 0.25 }));
    const svg = H.svg(`<g style="filter:blur(${p.blur ?? 10}px)">${puffs.map((q) => `<circle fill="${H.shade(col, q.sh)}"/>`).join("")}</g>`, w, h);
    const els = [...svg.querySelectorAll("circle")];
    return {
      el: svg, w, h,
      update(t, it) {
        const v = it.v("speed", 60) / h, drift = it.v("drift", -0.35), al = it.v("alpha", 0.85);
        puffs.forEach((q, i) => {
          const k = (q.ph + t * v) % 1, e = els[i];
          e.setAttribute("cx", (w / 2 + drift * h * k ** 1.6 + Math.sin(t * 0.7 + q.j) * 18 * k).toFixed(1));
          e.setAttribute("cy", (h - k * h).toFixed(1));
          e.setAttribute("r", ((p.r0 ?? 30) + k * w * 0.45) * q.r);
          e.setAttribute("opacity", (Math.min(1, k * 8) * (1 - k) * al).toFixed(3));
        });
      },
    };
  },
};

// ------------------------------------------------------------------ fire: flickering flames (w, h, tongues, k: track 0..1 size)
export const fire = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 160, h = p.h ?? 200, n = p.tongues ?? 5, rnd = H.rng(p.seed ?? 2), id = H.uid("fire");
    const tg = Array.from({ length: n }, (_, i) => ({ x: w * (0.15 + 0.7 * (n > 1 ? i / (n - 1) : 0.5)) + (rnd() - 0.5) * 16, hk: 0.4 + rnd() * 0.6, wk: 0.1 + rnd() * 0.1, s: rnd() * 9 }));
    const tongue = (x, hh, ww) => `M${x - ww},${h} C${x - ww},${h - hh * 0.45} ${x - ww * 0.2},${h - hh * 0.6} ${x},${h - hh} C${x + ww * 0.25},${h - hh * 0.6} ${x + ww},${h - hh * 0.45} ${x + ww},${h} Z`;
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe7a0"/>
        <stop offset="0.45" stop-color="#ff8a24"/><stop offset="1" stop-color="#d1300c" stop-opacity="0.2"/></linearGradient></defs>
      <ellipse class="gl" cx="${w / 2}" cy="${h - 10}" rx="${w * 0.9}" ry="${h * 0.35}" fill="#ff7a24" opacity="0.25" style="filter:blur(16px)"/>
      ${tg.map(() => `<path class="t" fill="url(#${id})"/>`).join("")}${tg.map(() => `<path class="c" fill="#ffe9b0" opacity="0.7"/>`).join("")}`, w, h);
    const els = [...svg.querySelectorAll(".t")], core = [...svg.querySelectorAll(".c")], gl = svg.querySelector(".gl");
    return {
      el: svg, w, h,
      update(t, it) {
        const K = it.v("k", 1), lean = it.v("lean", 0);
        tg.forEach((q, i) => {
          const f = (0.82 + 0.18 * H.noise(t, q.s, 2.2)) * K, sw = H.noise(t, q.s + 3, 1.2) * 8 + lean * h * q.hk * f;
          els[i].setAttribute("d", tongue(q.x + sw * 0.3, h * q.hk * f, w * q.wk));
          core[i].setAttribute("d", tongue(q.x + sw * 0.15, h * q.hk * f * 0.45, w * q.wk * 0.5));
        });
        gl.setAttribute("opacity", ((0.26 + 0.08 * H.noise(t, 5, 3)) * K).toFixed(3));
      },
    };
  },
};

// ------------------------------------------------------------------ light_pool: soft radial light (origin center)
// r, color, k (track 0..1), flicker (0..1), sy (vertical squash)
export const light_pool = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 300, id = H.uid("lp"), c = H.col(p.color ?? "#ffb04a");
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${p.a ?? 0.55}"/><stop offset="0.5" stop-color="${c}" stop-opacity="${(p.a ?? 0.55) * 0.3}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${r}" cy="${r}" rx="${r}" ry="${r * (p.sy ?? 1)}" fill="url(#${id})"/>`, r * 2, r * 2);
    const e = svg.querySelector("ellipse");
    return { el: svg, w: r * 2, h: r * 2, update(t, it) { e.setAttribute("opacity", (it.v("k", 1) * (1 - (p.flicker ?? 0.12) + (p.flicker ?? 0.12) * H.noise(t, 11, 4))).toFixed(3)); } };
  },
};

// ------------------------------------------------------------------ candle: holder, wax, flame, halo; on (track 0..1)
export const candle = {
  origin: "bottom",
  size_m: { h: 0.3 },
  create(p, H) {
    const w = 90, h = 150, id = H.uid("cdl"), halo = p.halo ?? 0;
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffe2a0" stop-opacity="0.75"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>
      ${halo ? `<circle class="hl" cx="${w / 2}" cy="38" r="${halo}" fill="url(#${id})"/>` : ""}
      <ellipse cx="${w / 2}" cy="${h - 8}" rx="40" ry="9" fill="#6a5a3a"/><rect x="${w / 2 - 34}" y="${h - 16}" width="68" height="10" rx="5" fill="#8a7448"/>
      <rect x="${w / 2 - 13}" y="62" width="26" height="${h - 74}" rx="4" fill="#efe4c8"/><path d="M${w / 2 - 13},70 q6,10 3,22" stroke="#e2d4b0" stroke-width="5" fill="none"/>
      <path d="M${w / 2},62 V52" stroke="#2a2420" stroke-width="2.5"/>
      <g class="fl"><ellipse cx="${w / 2}" cy="40" rx="14" ry="24" fill="#ffb347" opacity="0.55" style="filter:blur(4px)"/>
      <path d="M${w / 2},12 C${w / 2 + 12},32 ${w / 2 + 10},50 ${w / 2},54 C${w / 2 - 10},50 ${w / 2 - 12},32 ${w / 2},12 Z" fill="#ffd27a"/>
      <path d="M${w / 2},28 C${w / 2 + 6},40 ${w / 2 + 5},50 ${w / 2},52 C${w / 2 - 5},50 ${w / 2 - 6},40 ${w / 2},28 Z" fill="#fff6dc"/></g>
      <path class="sm" d="" stroke="#bbb4aa" stroke-width="3" fill="none" opacity="0"/>`, w, h);
    const fl = svg.querySelector(".fl"), hl = svg.querySelector(".hl"), sm = svg.querySelector(".sm");
    let offAt = null;
    return {
      el: svg, w, h,
      update(t, it) {
        const on = it.v("on", 1), f = 0.9 + 0.1 * H.noise(t, 2, 6), sk = H.noise(t, 5, 2) * 6;
        fl.setAttribute("transform", `translate(${w / 2 + sk * 0.3},54) scale(${on * f * (p.size ?? 1)},${on * f * (p.size ?? 1)}) skewX(${sk}) translate(${-w / 2},-54)`);
        fl.setAttribute("opacity", on.toFixed(3));
        if (hl) hl.setAttribute("opacity", (on * f).toFixed(3));
        if (on < 0.5 && offAt == null) offAt = t; if (on >= 0.5) offAt = null;
        const k = offAt == null ? 0 : H.clamp((t - offAt) / 2);
        sm.setAttribute("d", `M${w / 2},50 q${10 * Math.sin(t * 3)},-30 0,-60 q${-12 * Math.sin(t * 2.5)},-30 0,-60`);
        sm.setAttribute("opacity", (offAt == null ? 0 : (1 - k) * 0.7).toFixed(3));
      },
      anchor(name) { return name === "flame" ? [w / 2, 36] : null; },
    };
  },
};

// ------------------------------------------------------------------ torch: wooden stick with a burning head (origin = bottom of the stick)
// len, halo, rot via universal props
export const torch = {
  origin: "bottom",
  create(p, H) {
    const L = p.len ?? 170, w = 120, h = L + 110, id = H.uid("trc"), halo = p.halo ?? 0;
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.6"/><stop offset="1" stop-color="#ff8a24" stop-opacity="0"/></radialGradient></defs>
      ${halo ? `<circle class="hl" cx="${w / 2}" cy="70" r="${halo}" fill="url(#${id})"/>` : ""}
      <rect x="${w / 2 - 7}" y="96" width="14" height="${L}" rx="5" fill="#5a3c24"/>
      <path d="M${w / 2 - 15},92 L${w / 2 + 15},92 L${w / 2 + 11},124 L${w / 2 - 11},124 Z" fill="#3a2a1e"/>
      <path d="M${w / 2 - 15},100 H${w / 2 + 15} M${w / 2 - 13},112 H${w / 2 + 13}" stroke="#7a5a3a" stroke-width="3"/>
      <g class="fl"></g>`, w, h);
    const flG = svg.querySelector(".fl"), hl = svg.querySelector(".hl");
    const tg = [[0, 1, 0.3], [-9, 0.7, 1.7], [9, 0.75, 3.1]];
    const els = tg.map(() => H.el("path", { fill: "#ff9a2a" }, flG)), core = H.el("path", { fill: "#fff0b8" }, flG);
    const tongue = (x, hh, ww) => `M${x - ww},96 C${x - ww},${96 - hh * 0.45} ${x - ww * 0.2},${96 - hh * 0.6} ${x},${96 - hh} C${x + ww * 0.25},${96 - hh * 0.6} ${x + ww},${96 - hh * 0.45} ${x + ww},96 Z`;
    return {
      el: svg, w, h,
      update(t, it) {
        const K = it.v("k", 1), lean = it.v("lean", 0);
        tg.forEach(([dx, hk, s], i) => { const f = (0.8 + 0.2 * H.noise(t, s, 3)) * K; els[i].setAttribute("d", tongue(w / 2 + dx + lean * 30 + H.noise(t, s + 2, 2) * 4, 80 * hk * f, 15)); });
        core.setAttribute("d", tongue(w / 2 + lean * 14, 40 * K * (0.85 + 0.15 * H.noise(t, 9, 3)), 8));
        if (hl) hl.setAttribute("opacity", (K * (0.85 + 0.15 * H.noise(t, 4, 4))).toFixed(3));
      },
      anchor(name) { return name === "flame" ? [w / 2, 60] : null; },
    };
  },
};

// ------------------------------------------------------------------ bonfire: crossed logs, stones, flames, embers
export const bonfire = {
  origin: "bottom",
  size_m: { w: 1.2 },
  async create(p, H, item) {
    const w = 260, h = 300, rnd = H.rng(p.seed ?? 7);
    const host = H.div(`width:${w}px;height:${h}px;`, "");
    const back = H.svg(`<path d="M40,${h - 20} L220,${h - 52}" stroke="#4a3020" stroke-width="22" stroke-linecap="round"/>`, w, h);
    host.appendChild(back);
    const fireIt = await H.child({ actor: "fire", x: w / 2, y: h - 34, w: 200, h: 230, tongues: 6, seed: p.seed ?? 7, origin: "bottom" }, host, item);
    const front = H.svg(`<path d="M40,${h - 52} L220,${h - 20}" stroke="#3a2618" stroke-width="22" stroke-linecap="round"/>
      ${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${30 + i * 33}" cy="${h - 10 + (i % 2) * 3}" rx="20" ry="12" fill="${H.shade("#7a7268", -0.1 + rnd() * 0.2)}"/>`).join("")}`, w, h);
    host.appendChild(front);
    return {
      el: host, w, h,
      update(t, it) { fireIt.over.k = it.v("k", 1); },
      anchor(name) { return name === "flame" ? [w / 2, h - 150] : null; },
    };
  },
};

// ------------------------------------------------------------------ astrolabe (origin center), book (open, origin center), parchment
export const astrolabe = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 90, W = r * 2 + 20, c = W / 2, brass = H.col(p.color ?? "#c9a24a");
    let s = `<circle cx="${c}" cy="${c}" r="${r}" fill="${H.shade(brass, -0.2)}"/><circle cx="${c}" cy="${c}" r="${r - 10}" fill="${brass}"/>
      <circle cx="${c}" cy="${c}" r="${r * 0.62}" fill="none" stroke="${H.shade(brass, -0.35)}" stroke-width="3"/><circle cx="${c}" cy="${c}" r="${r * 0.3}" fill="none" stroke="${H.shade(brass, -0.35)}" stroke-width="3"/>`;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; s += `<path d="M${c + Math.cos(a) * (r - 10)},${c + Math.sin(a) * (r - 10)} L${c + Math.cos(a) * (r - 22)},${c + Math.sin(a) * (r - 22)}" stroke="${H.shade(brass, -0.4)}" stroke-width="2.5"/>`; }
    s += `<g class="ar"><path d="M${c - r * 0.85},${c} L${c + r * 0.85},${c}" stroke="${H.shade(brass, -0.5)}" stroke-width="6" stroke-linecap="round"/></g><circle cx="${c}" cy="${c}" r="7" fill="${H.shade(brass, -0.5)}"/>
      <circle cx="${c}" cy="${c - r - 4}" r="12" fill="none" stroke="${brass}" stroke-width="6"/>`;
    const svg = H.svg(s, W, W);
    const ar = svg.querySelector(".ar");
    return { el: svg, w: W, h: W, update(t, it) { ar.setAttribute("transform", `rotate(${it.v("turn", 0) + t * (p.spin_speed ?? 6)} ${c} ${c})`); } };
  },
};

export const book = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 300, h = w * 0.62, paper = H.col(p.paper ?? "#e9dcbc"), cover = H.col(p.color ?? "#5a2a22"), ink = H.col(p.ink ?? "#3a2a20");
    let s = `<path d="M0,${h * 0.12} Q${w * 0.25},0 ${w / 2},${h * 0.1} Q${w * 0.75},0 ${w},${h * 0.12} L${w},${h} Q${w * 0.75},${h * 0.9} ${w / 2},${h} Q${w * 0.25},${h * 0.9} 0,${h} Z" fill="${cover}"/>
      <path d="M${w * 0.04},${h * 0.1} Q${w * 0.26},0 ${w / 2},${h * 0.08} V${h * 0.94} Q${w * 0.26},${h * 0.86} ${w * 0.04},${h * 0.94} Z" fill="${paper}"/>
      <path d="M${w * 0.96},${h * 0.1} Q${w * 0.74},0 ${w / 2},${h * 0.08} V${h * 0.94} Q${w * 0.74},${h * 0.86} ${w * 0.96},${h * 0.94} Z" fill="${H.shade(paper, -0.06)}"/>`;
    const lines = p.lines ?? 9;
    for (let i = 0; i < lines; i++) for (const sd of [0, 1]) { const x0 = sd ? w * 0.56 : w * 0.1, y = h * 0.22 + i * h * 0.075; s += `<path class="ln" d="M${x0},${y} H${x0 + w * 0.34 * (0.6 + ((i * 7 + sd * 3) % 5) / 12)}" stroke="${ink}" stroke-width="2.5" opacity="0.7"/>`; }
    const svg = H.svg(s, w, h);
    const ln = [...svg.querySelectorAll(".ln")];
    return { el: svg, w, h, update(t, it) { const k = it.v("write", 1); ln.forEach((e, i) => e.setAttribute("opacity", i / ln.length < k ? 0.7 : 0)); } };
  },
};

// parchment: aged paper card for diagrams (origin center): w, h, color
export const parchment = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 700, c = H.col(p.color ?? "#e6d6b0"), id = H.uid("pch"), rnd = H.rng(p.seed ?? 4);
    const edge = (n) => Array.from({ length: n }, (_, i) => (rnd() - 0.5) * 10);
    const e1 = edge(14), e2 = edge(14);
    const top = e1.map((d, i) => `L${(i / 13) * w},${d}`).join(" "), bot = e2.map((d, i) => `L${w - (i / 13) * w},${h + d}`).join(" ");
    const svg = H.svg(`<defs><radialGradient id="${id}" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${H.shade(c, -0.35)}"/></radialGradient></defs>
      <path d="M0,0 ${top} L${w},${h} ${bot} Z" fill="url(#${id})"/>
      ${Array.from({ length: 6 }, () => `<circle cx="${rnd() * w}" cy="${rnd() * h}" r="${20 + rnd() * 50}" fill="${H.shade(c, -0.12)}" opacity="0.25"/>`).join("")}`, w, h);
    return { el: svg, w, h };
  },
};

// ------------------------------------------------------------------ cast_shadow: a person's shadow (silhouette of a nested person)
// look, view, flip, pose, walk (as for person; the shadow can have its OWN pose — it moves on its own),
// angle (deg: 0 = straight up — on a wall behind; > 20 — on the ground: 180 = toward the viewer, 120 = down-right, 240 = down-left),
// len (track: length factor, 0 = shrunk to the feet), flat (vertical squash for a ground shadow), color, alpha, soft (blur px),
// lag (track, seconds: the shadow repeats the person's motion this much later)
export const cast_shadow = {
  origin: [0, 0],
  async create(p, H, item) {
    const host = H.div("", "");
    const inner = H.div("transform-origin:0 0;", "");
    host.appendChild(inner);
    const spec = { actor: "person", x: 0, y: 0, view: p.view, flip: p.flip, look: { ...(p.look || {}), silhouette: p.color ?? "#07070c" }, shadow: false, seed: p.seed };
    for (const k of ["pose", "walk", "run", "hold", "hold_l", "hold_rot", "look_dx"]) if (item.spec[k] !== undefined) spec[k] = item.spec[k];
    const child = await H.child(spec, inner, item);
    const prep = child.prepare.bind(child), rend = child.render.bind(child);
    child.prepare = (t) => prep(t - item.v("lag", 0, t));
    child.render = (t) => rend(t - item.v("lag", 0, t));
    return {
      el: host, w: 1, h: 1,
      update(t, it) {
        const a = it.v("angle", 90), L = it.v("len", 1), fl = it.v("flat", 0.32), al = it.v("alpha", 0.62), soft = it.v("soft", 3);
        // ground: flipped down onto the floor, squashed by perspective and slanted away from the light (skew);
        // wall: upright, enlarged (a light low in front throws a tall shadow on the wall behind)
        const ground = Math.abs(a) > 20;
        const sk = Math.max(-75, Math.min(75, 180 - a));
        inner.style.transform = ground ? `skewX(${sk}deg) scale(1,${-fl * L})` : `rotate(${a}deg) scale(${it.v("wide", 1)},${L})`;
        inner.style.opacity = al;
        inner.style.filter = soft > 0.2 ? `blur(${soft}px)` : "";
      },
    };
  },
};

// ------------------------------------------------------------------ living_shadow: a free shadow creature (no face, long arms)
// h (height), color, alpha, reach (track 0..1: right arm stretches forward), arms_up (track 0..1), lean (track deg),
// crawl (track 0..1: lies flat along the ground/wall), walk (track: steps/s — legs fade into smoke and sway), turn (track -1..1)
export const living_shadow = {
  origin: "bottom",
  create(p, H) {
    const hh = p.h ?? 420, w = hh * 1.3, h = hh, c = H.col(p.color ?? "#06060a"), id = H.uid("ls");
    const svg = H.svg(`<defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${p.soft ?? 2.2}"/></filter></defs>
      <g filter="url(#${id})"><g class="b"><path class="tail" fill="${c}"/><path class="body" fill="${c}"/><ellipse class="head" fill="${c}"/>
      <path class="al" fill="none" stroke="${c}" stroke-linecap="round"/><path class="ar" fill="none" stroke="${c}" stroke-linecap="round"/>
      <g class="fl"></g><g class="fr"></g></g></g>`, w, h);
    const q = (s) => svg.querySelector(s);
    const tail = q(".tail"), body = q(".body"), head = q(".head"), al = q(".al"), ar = q(".ar"), fl = q(".fl"), fr = q(".fr"), B = q(".b");
    const fingers = (g) => Array.from({ length: 4 }, () => H.el("path", { fill: "none", stroke: c, "stroke-linecap": "round", "stroke-width": hh * 0.012 }, g));
    const FL = fingers(fl), FR = fingers(fr);
    const cx = w / 2, hipY = h * 0.52, shY = h * 0.2, sw = hh * 0.11, armL = hh * 0.52;
    const armPath = (sx, sy, ang, len, bend) => {
      const ex = sx + Math.sin(ang) * len * 0.5 + bend, ey = sy + Math.cos(ang) * len * 0.5;
      const hx = sx + Math.sin(ang) * len, hy = sy + Math.cos(ang) * len;
      return [`M${sx},${sy} Q${ex},${ey} ${hx},${hy}`, hx, hy];
    };
    const hand = (els, hx, hy, ang, t, ph) => els.forEach((e, i) => {
      const a = ang + (i - 1.5) * 0.22 + Math.sin(t * 2 + i + ph) * 0.06, L = hh * (0.07 + 0.015 * (i % 2));
      e.setAttribute("d", `M${hx},${hy} q${Math.sin(a) * L * 0.6},${Math.cos(a) * L * 0.6} ${Math.sin(a) * L},${Math.cos(a) * L}`);
    });
    return {
      el: svg, w, h,
      update(t, it) {
        const reach = it.v("reach", 0), up = it.v("arms_up", 0), lean = it.v("lean", 0), crawl = it.v("crawl", 0), wk = it.v("walk", 0), turn = it.v("turn", 0);
        const sway = Math.sin(t * 1.3 + (p.seed ?? 0)) * 3 + wk * Math.sin(t * wk * 3) * 4;
        B.setAttribute("transform", `rotate(${lean + sway + crawl * 82} ${cx} ${h}) translate(${turn * hh * 0.02},0)`);
        // smoky tail instead of legs
        const wv = (k) => Math.sin(t * 2.4 + k) * hh * 0.025;
        tail.setAttribute("d", `M${cx - sw * 0.9},${hipY} Q${cx - sw * 1.3 + wv(1)},${h * 0.78} ${cx - sw * 0.6 + wv(2)},${h} L${cx + sw * 0.7 + wv(3)},${h} Q${cx + sw * 1.2 + wv(4)},${h * 0.78} ${cx + sw * 0.9},${hipY} Z`);
        tail.setAttribute("opacity", "0.85");
        body.setAttribute("d", `M${cx - sw * 1.25},${shY} Q${cx},${shY - hh * 0.04} ${cx + sw * 1.25},${shY} L${cx + sw * 0.95},${hipY + hh * 0.04} Q${cx},${hipY + hh * 0.1} ${cx - sw * 0.95},${hipY + hh * 0.04} Z`);
        head.setAttribute("cx", cx + turn * sw * 0.3); head.setAttribute("cy", shY - hh * 0.095); head.setAttribute("rx", hh * 0.07); head.setAttribute("ry", hh * 0.088);
        const aw = hh * 0.042;
        al.setAttribute("stroke-width", aw); ar.setAttribute("stroke-width", aw);
        // left arm: hangs, rises with arms_up; right arm: reaches forward with reach
        const aL = H.lerp(0.18, 2.6, up) + Math.sin(t * 1.1) * 0.05, aR = H.lerp(-0.18, -1.45, Math.max(reach, 0)) + H.lerp(0, -1.0, up) + Math.sin(t * 1.3 + 1) * 0.05;
        const [dl, lx, ly] = armPath(cx - sw * 1.1, shY + 4, aL, armL, -hh * 0.02);
        const [dr, rx, ry] = armPath(cx + sw * 1.1, shY + 4, aR, armL * (1 + reach * 0.35), hh * 0.02);
        al.setAttribute("d", dl); ar.setAttribute("d", dr);
        hand(FL, lx, ly, aL, t, 0); hand(FR, rx, ry, aR, t, 2);
        svg.style.opacity = it.v("alpha", 0.92);
      },
      anchor(name) { return name === "head" ? [cx, shY - hh * 0.095] : null; },
    };
  },
};

// ------------------------------------------------------------------ eclipse: the sun and the moon's disc sliding over it (origin center)
// r (sun radius), cover (track 0..1: 0 — moon off to the side, 1 — full eclipse), from (deg: where the moon comes from),
// ring (track 0..1: «diamond ring» flash on the edge where the light returns), corona (auto when covered)
export const eclipse = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 120, W = r * 7, c = W / 2, id = H.uid("ecl"), rnd = H.rng(p.seed ?? 3);
    const rays = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * 6.283 + rnd() * 0.2, L = r * (1.5 + rnd() * 1.4); return `<path d="M${c + Math.cos(a) * r * 1.02},${c + Math.sin(a) * r * 1.02} L${c + Math.cos(a) * L},${c + Math.sin(a) * L}" stroke="#eef4ff" stroke-width="${2 + rnd() * 5}" stroke-linecap="round"/>`; }).join("");
    const svg = H.svg(`<defs><radialGradient id="${id}s"><stop offset="0" stop-color="#fff8dc"/><stop offset="0.7" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffb347"/></radialGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#fff2c0" stop-opacity="0.75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}r"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
      <mask id="${id}m"><rect width="${W}" height="${W}" fill="#fff"/><circle class="mm" r="${r * 1.02}" fill="#000"/></mask></defs>
      <circle class="gl" cx="${c}" cy="${c}" r="${r * 3}" fill="url(#${id}g)"/>
      <g class="co" style="filter:blur(3px)">${rays}<circle cx="${c}" cy="${c}" r="${r * 1.35}" fill="#e8f0ff" opacity="0.55"/></g>
      <circle cx="${c}" cy="${c}" r="${r}" fill="url(#${id}s)" mask="url(#${id}m)"/>
      <circle class="mo" r="${r * 1.02}" fill="#0a0c14"/>
      <circle class="dr" r="${r * 0.9}" fill="url(#${id}r)" opacity="0"/>`, W, W);
    const mm = svg.querySelector(".mm"), mo = svg.querySelector(".mo"), co = svg.querySelector(".co"), gl = svg.querySelector(".gl"), dr = svg.querySelector(".dr");
    const a0 = ((p.from ?? 200) * Math.PI) / 180;
    return {
      el: svg, w: W, h: W,
      update(t, it) {
        const k = H.clamp(it.v("cover", 0)), d = (1 - k) * r * 2.3;
        const mx = c + Math.cos(a0) * d, my = c + Math.sin(a0) * d;
        mm.setAttribute("cx", mx); mm.setAttribute("cy", my); mo.setAttribute("cx", mx); mo.setAttribute("cy", my);
        const full = H.clamp((k - 0.93) / 0.07);
        co.setAttribute("opacity", (full * (0.85 + 0.15 * Math.sin(t * 2))).toFixed(3));
        gl.setAttribute("opacity", (1 - full * 0.9).toFixed(3));
        const ring = it.v("ring", 0), ra = a0 + Math.PI;
        dr.setAttribute("cx", c + Math.cos(ra) * r * 0.98); dr.setAttribute("cy", c + Math.sin(ra) * r * 0.98);
        dr.setAttribute("opacity", ring.toFixed(3)); dr.setAttribute("r", (r * (0.4 + ring * 0.9)).toFixed(1));
      },
    };
  },
};

// ------------------------------------------------------------------ village_map: parchment map of the village seen from above (origin center)
// w, h, out (track 0..1: share of house lights gone out), stain (track 0..1: black shadow stains spread along the streets)
export const village_map = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 900, rnd = H.rng(p.seed ?? 6), id = H.uid("vm"), ink = "#5a3e28";
    let s = `<defs><radialGradient id="${id}" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#e6d6b0"/><stop offset="1" stop-color="#b89c6c"/></radialGradient></defs>
      <rect width="${w}" height="${h}" rx="10" fill="url(#${id})"/>
      <path d="M${w * 0.08},${h * 0.5} Q${w * 0.5},${h * 0.42} ${w * 0.92},${h * 0.52} M${w * 0.5},${h * 0.08} Q${w * 0.46},${h * 0.5} ${w * 0.52},${h * 0.92} M${w * 0.15},${h * 0.2} Q${w * 0.4},${h * 0.3} ${w * 0.5},${h * 0.46} M${w * 0.85},${h * 0.82} Q${w * 0.6},${h * 0.7} ${w * 0.52},${h * 0.56}"
        stroke="#c8b088" stroke-width="34" fill="none" stroke-linecap="round"/>
      <path d="M0,${h * 0.86} Q${w * 0.3},${h * 0.8} ${w * 0.6},${h * 0.92} T${w},${h * 0.9}" stroke="#7a98b0" stroke-width="18" fill="none" opacity="0.7"/>
      <circle cx="${w * 0.5}" cy="${h * 0.49}" r="${w * 0.045}" fill="none" stroke="${ink}" stroke-width="4"/>
      <path d="M${w * 0.47},${h * 0.32} h${w * 0.06} v${w * 0.06} h-${w * 0.06} Z M${w * 0.5},${h * 0.3} v-${w * 0.04} M${w * 0.485},${h * 0.285} h${w * 0.03}" stroke="${ink}" stroke-width="4" fill="#cdb48a"/>`;
    const houses = [];
    for (let i = 0; i < 46; i++) {
      let x, y, ok = false;
      for (let k = 0; k < 20 && !ok; k++) { x = w * (0.08 + rnd() * 0.84); y = h * (0.08 + rnd() * 0.74); ok = Math.hypot(x - w * 0.5, y - h * 0.49) > w * 0.09 && houses.every((q) => Math.hypot(q[0] - x, q[1] - y) > 44); }
      if (!ok) continue;
      const hw = 26 + rnd() * 14, hh = 20 + rnd() * 10, a = (rnd() - 0.5) * 30;
      houses.push([x, y, rnd()]);
      s += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) rotate(${a.toFixed(0)})"><rect x="${-hw / 2}" y="${-hh / 2}" width="${hw}" height="${hh}" fill="#cdb48a" stroke="${ink}" stroke-width="3"/><path d="M${-hw / 2},0 H${hw / 2}" stroke="${ink}" stroke-width="2"/></g>`;
    }
    s += `<g class="st"></g>`;
    s += houses.map(([x, y]) => `<circle class="lt" cx="${x}" cy="${y - 2}" r="9" fill="#ffc867"/>`).join("");
    const svg = H.svg(s, w, h);
    const lts = [...svg.querySelectorAll(".lt")], stG = svg.querySelector(".st");
    const order = houses.map((q, i) => [q[2], i]).sort((a, b) => a[0] - b[0]).map((q) => q[1]);
    const blobs = Array.from({ length: 14 }, () => { const e = H.el("ellipse", { fill: "#100a08", opacity: 0.85 }, stG); return { e, x: w * (0.1 + rnd() * 0.8), y: h * (0.1 + rnd() * 0.72), r: 20 + rnd() * 30, ph: rnd() * 6 }; });
    return {
      el: svg, w, h,
      update(t, it) {
        const out = it.v("out", 0), stain = it.v("stain", 0);
        order.forEach((idx, j) => { const off = j / order.length < out; lts[idx].setAttribute("fill", off ? "#3a2a1e" : "#ffc867"); lts[idx].setAttribute("opacity", off ? 0.8 : 0.85 + 0.15 * Math.sin(t * 6 + j)); });
        blobs.forEach((b, i) => {
          const k = H.clamp(stain * 1.3 - i / blobs.length * 0.3);
          b.e.setAttribute("cx", (b.x + Math.sin(t * 0.8 + b.ph) * 14).toFixed(1)); b.e.setAttribute("cy", (b.y + Math.cos(t * 0.7 + b.ph) * 10).toFixed(1));
          b.e.setAttribute("rx", (b.r * k * 1.4).toFixed(1)); b.e.setAttribute("ry", (b.r * k).toFixed(1));
        });
      },
    };
  },
};

// ------------------------------------------------------------------ sword: a long sword (origin = grip), swing via rot; trail (track 0..1: motion arc)
export const sword = {
  origin: [60, 330],
  create(p, H) {
    const w = 120, h = 360, id = H.uid("swd");
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa2b0"/><stop offset="0.5" stop-color="#eef2f8"/><stop offset="1" stop-color="#8a92a0"/></linearGradient></defs>
      <path class="tr" d="M60,330 m0,-300 a300,300 0 0,1 260,150" stroke="rgba(230,240,255,0.5)" stroke-width="26" fill="none" stroke-linecap="round" opacity="0"/>
      <path d="M50,250 L52,30 L60,4 L68,30 L70,250 Z" fill="url(#${id})"/><path d="M60,20 V245" stroke="#7a8290" stroke-width="2"/>
      <rect x="16" y="248" width="88" height="14" rx="5" fill="#8a7a50"/><rect x="52" y="262" width="16" height="70" rx="5" fill="#4a3020"/><circle cx="60" cy="340" r="11" fill="#8a7a50"/>`, w, h);
    const tr = svg.querySelector(".tr");
    return { el: svg, w, h, update(t, it) { tr.setAttribute("opacity", it.v("trail", 0).toFixed(3)); } };
  },
};

// ------------------------------------------------------------------ shield: round shield polished like a mirror (origin center)
// r, color (rim), shine (track 0..1: bright highlight sweep), boss
export const shield = {
  origin: "center",
  size_m: { w: 0.7 },
  create(p, H) {
    const r = p.r ?? 120, W = r * 2 + 20, c = W / 2, id = H.uid("shd"), rim = H.col(p.color ?? "#8a6a3a");
    const svg = H.svg(`<defs><radialGradient id="${id}" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#f4f6fa"/><stop offset="0.5" stop-color="#b8c0cc"/><stop offset="1" stop-color="#6a7280"/></radialGradient>
      <clipPath id="${id}c"><circle cx="${c}" cy="${c}" r="${r * 0.9}"/></clipPath></defs>
      <circle cx="${c}" cy="${c}" r="${r}" fill="${rim}"/><circle cx="${c}" cy="${c}" r="${r * 0.9}" fill="url(#${id})"/>
      <g clip-path="url(#${id}c)"><rect class="sh" x="${c - r}" y="${c - r * 1.4}" width="${r * 0.35}" height="${r * 2.8}" fill="#ffffff" opacity="0" transform="rotate(25 ${c} ${c})"/></g>
      <circle cx="${c}" cy="${c}" r="${r * 0.16}" fill="${H.shade(rim, 0.2)}"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return `<circle cx="${c + Math.cos(a) * r * 0.95}" cy="${c + Math.sin(a) * r * 0.95}" r="4" fill="${H.shade(rim, 0.35)}"/>`; }).join("")}`, W, W);
    const sh = svg.querySelector(".sh");
    return {
      el: svg, w: W, h: W,
      update(t, it) { const k = it.v("shine", 0); sh.setAttribute("opacity", (k * 0.8).toFixed(3)); sh.setAttribute("x", (c - r + ((t * 0.8) % 1) * r * 2).toFixed(1)); },
    };
  },
};

// ------------------------------------------------------------------ hourglass (origin center): flow (track 0..1: sand moved to the bottom)
export const hourglass = {
  origin: "center",
  create(p, H) {
    const w = 140, h = 240, wood = H.col(p.wood ?? "#5a3a22"), sand = H.col(p.sand ?? "#e8c27a");
    const svg = H.svg(`<rect x="0" y="0" width="${w}" height="18" rx="5" fill="${wood}"/><rect x="0" y="${h - 18}" width="${w}" height="18" rx="5" fill="${wood}"/>
      <rect x="8" y="14" width="10" height="${h - 28}" fill="${wood}"/><rect x="${w - 18}" y="14" width="10" height="${h - 28}" fill="${wood}"/>
      <path d="M30,18 L110,18 Q110,90 74,120 Q110,150 110,${h - 18} L30,${h - 18} Q30,150 66,120 Q30,90 30,18 Z" fill="rgba(200,220,240,0.25)" stroke="#d8e4ee" stroke-width="3"/>
      <path class="top" fill="${sand}"/><path class="bot" fill="${sand}"/><path class="str" stroke="${sand}" stroke-width="3"/>`, w, h);
    const top = svg.querySelector(".top"), bot = svg.querySelector(".bot"), str = svg.querySelector(".str");
    return {
      el: svg, w, h,
      update(t, it) {
        const f = H.clamp(it.v("flow", 0)), ty = 40 + f * 72, by = h - 22 - (1 - (1 - f)) * 80;
        top.setAttribute("d", f < 0.99 ? `M${36 + f * 30},${ty} L${104 - f * 30},${ty} Q100,95 74,118 L66,118 Q40,95 ${36 + f * 30},${ty} Z` : "");
        bot.setAttribute("d", `M34,${h - 20} L106,${h - 20} Q100,${by + 20} 70,${by} Q40,${by + 20} 34,${h - 20} Z`);
        str.setAttribute("d", f > 0.01 && f < 0.99 ? `M70,120 V${h - 22}` : "");
      },
    };
  },
};
