// «Обратный прилив» — city: Soviet panel block, sedan, rain that stops and falls up, puddle with upward jets,
// yellow umbrella, street lamp, wet asphalt, a torn-off city block with its underside (soil, pipes, roots).
// Grounded actors stand on their origin (bottom centre). Cold steel palette; the umbrella is the only warm colour.

const pad2 = (v) => String(v).padStart(2, "0");

// ------------------------------------------------------------------ panel_block: 9-storey prefab apartment block
// floors, cols, cell [w, h], color (panel), lit (share of lit windows, track), seed, entrances [col…], loggias (every n-th col),
// stains (rain streaks 0..1), wet (darker plinth), roof (antennas), far (simplified: fewer details for distant planes)
export const panel_block = {
  backdrop: true,
  origin: "bottom",
  grounded: true,
  size_m: { h: 28 },
  create(p, H) {
    const fl = p.floors ?? 9, cols = p.cols ?? 8, [cw, ch] = p.cell ?? [96, 78];
    const plinth = p.plinth ?? 46, roofH = 26, w = cols * cw, h = fl * ch + plinth + roofH;
    const R = H.rng(p.seed ?? 4), col = p.color ?? "#7d858c", dark = H.shade(col, -0.35), lite = H.shade(col, 0.12);
    const far = !!p.far, ents = new Set(p.entrances ?? [Math.floor(cols / 2)]), logg = p.loggias ?? 3;
    const gid = H.uid("pb");
    let s = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lite}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      <linearGradient id="${gid}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${p.wet ?? 0.35}"/></linearGradient></defs>`;
    s += `<rect x="0" y="${roofH}" width="${w}" height="${h - roofH}" fill="url(#${gid})"/>`;
    // parapet + roof gear
    s += `<rect x="-4" y="${roofH - 8}" width="${w + 8}" height="12" fill="${dark}"/>`;
    if (!far && p.roof !== false) {
      s += `<rect x="${w * 0.18}" y="${roofH - 34}" width="${cw * 0.9}" height="30" fill="${dark}"/><rect x="${w * 0.66}" y="${roofH - 30}" width="${cw * 0.7}" height="26" fill="${dark}"/>`;
      for (let i = 0; i < 4; i++) { const x = w * (0.1 + 0.25 * i + R() * 0.1); s += `<path d="M${x},${roofH - 8} v-${40 + R() * 40} m-14,10 h28 m-22,12 h16" stroke="${dark}" stroke-width="3" fill="none"/>`; }
    }
    // panel seams
    if (!far) {
      for (let f = 1; f < fl; f++) s += `<line x1="0" x2="${w}" y1="${roofH + f * ch}" y2="${roofH + f * ch}" stroke="${dark}" stroke-opacity=".45" stroke-width="2"/>`;
      for (let c = 1; c < cols; c++) s += `<line y1="${roofH}" y2="${h - plinth}" x1="${c * cw}" x2="${c * cw}" stroke="${dark}" stroke-opacity=".3" stroke-width="2"/>`;
    }
    // rain stains under the windows
    const stains = p.stains ?? 0.5;
    for (let i = 0; i < cols * 3 * stains; i++) {
      const x = R() * w, y0 = roofH + R() * (h - plinth - roofH) * 0.6, len = 60 + R() * 260;
      s += `<rect x="${x}" y="${y0}" width="${4 + R() * 10}" height="${len}" fill="#1b2026" opacity="${0.06 + R() * 0.1}"/>`;
    }
    // windows
    const wins = [];
    for (let f = 0; f < fl; f++) for (let c = 0; c < cols; c++) {
      const isL = !far && logg && c % logg === 1;
      const x = c * cw, y = roofH + f * ch;
      if (isL) {   // glazed loggia
        s += `<rect x="${x + 6}" y="${y + ch * 0.18}" width="${cw - 12}" height="${ch * 0.74}" fill="${H.shade(col, -0.2)}"/>
          <rect x="${x + 6}" y="${y + ch * 0.58}" width="${cw - 12}" height="${ch * 0.34}" fill="${H.shade(col, 0.05)}"/>`;
      }
      const ww = cw * (isL ? 0.62 : 0.5), wh = ch * (isL ? 0.36 : 0.5), wx = x + (cw - ww) / 2, wy = y + ch * (isL ? 0.2 : 0.22);
      wins.push({ x: wx, y: wy, w: ww, h: wh, r: R(), warm: R() < 0.75, curt: R() });
      s += `<rect class="win" x="${wx}" y="${wy}" width="${ww}" height="${wh}"/>`;
      if (!far) s += `<path d="M${wx + ww * 0.5},${wy} v${wh} M${wx},${wy + wh * 0.3} h${ww * 0.5}" stroke="${H.shade(col, 0.25)}" stroke-width="3"/>
        <rect x="${wx - 3}" y="${wy + wh}" width="${ww + 6}" height="5" fill="${lite}"/>`;
      if (!far && R() < 0.06) s += `<rect x="${wx + ww * 0.15}" y="${wy + wh + 6}" width="${ww * 0.7}" height="${ch * 0.16}" rx="3" fill="#c9cdd0"/>`; // AC unit
      if (!far && R() < 0.05) s += `<ellipse cx="${x + cw * 0.85}" cy="${y + ch * 0.4}" rx="11" ry="13" fill="#d9dcdf" stroke="${dark}" stroke-width="2"/>`;
    }
    // plinth + entrances
    s += `<rect x="0" y="${h - plinth}" width="${w}" height="${plinth}" fill="${H.shade(col, -0.45)}"/>`;
    for (const c of ents) {
      const x = c * cw + cw * 0.1, dw = cw * 0.8;
      s += `<rect x="${x + dw * 0.15}" y="${h - plinth - ch * 0.62}" width="${dw * 0.7}" height="${ch * 0.62 + plinth}" fill="#2a2f35"/>
        <rect x="${x + dw * 0.2}" y="${h - plinth - ch * 0.56}" width="${dw * 0.6}" height="${ch * 0.56 + plinth - 4}" fill="#3a4148"/>
        <rect x="${x - 10}" y="${h - plinth - ch * 0.7}" width="${dw + 20}" height="12" fill="${H.shade(col, -0.15)}"/>
        <circle class="elamp" cx="${x + dw / 2}" cy="${h - plinth - ch * 0.7 + 18}" r="7" fill="#e8eef2"/>`;
    }
    s += `<rect x="0" y="${roofH}" width="${w}" height="${h - roofH}" fill="url(#${gid}w)"/>`;
    const svg = H.svg(s, w, h);
    const winEls = [...svg.querySelectorAll(".win")], lamp = svg.querySelectorAll(".elamp");
    const glass = p.glass ?? "#3d4a57", warm = p.warm ?? "#e9d9a8", cold = p.cold ?? "#b9c9d6";
    return {
      el: svg, w, h,
      update(t, it) {
        const lit = it.v("lit", p.lit ?? 0.25);
        winEls.forEach((e, i) => {
          const W = wins[i];
          const on = W.r < lit;
          e.setAttribute("fill", on ? (W.warm ? warm : cold) : glass);
          e.setAttribute("opacity", on ? 0.55 + 0.4 * W.curt : 0.9);
        });
        lamp.forEach((e) => e.setAttribute("opacity", it.v("lamp", 1)));
      },
      anchor(name, args) {
        if (name === "win") { const [f, c] = args; const W = wins[(fl - f) * cols + (c - 1)] ?? wins[0]; return [W.x + W.w / 2, W.y + W.h / 2]; }
        if (name === "door") { const c = [...ents][0]; return [c * cw + cw / 2, h - plinth / 2]; }
        if (name === "roof") return [w / 2, roofH];
        return null;
      },
    };
  },
};

// ------------------------------------------------------------------ sedan (side view, facing right)
// color, lights (0..1 track), wet (sheen), tilt is done with rot; drip_up (0..1): drops leave the body upwards
export const sedan = {
  origin: "bottom",
  grounded: true,
  size_m: { w: 4.5 },
  create(p, H) {
    const w = 460, h = 150, col = p.color ?? "#5d6a74", d = H.shade(col, -0.4), l = H.shade(col, 0.3), id = H.uid("car");
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="${d}"/></linearGradient>
        <radialGradient id="${id}h"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${w / 2}" cy="${h - 4}" rx="${w * 0.48}" ry="10" fill="#000" opacity=".45"/>
      <path d="M14,${h - 34} Q8,90 40,82 L120,74 Q160,28 210,24 L320,24 Q360,26 392,70 L440,80 Q458,86 456,108 L452,${h - 30} Q450,${h - 22} 440,${h - 22} L22,${h - 22} Q12,${h - 24} 14,${h - 34} Z" fill="url(#${id})" stroke="${d}" stroke-width="2"/>
      <path d="M134,74 Q168,34 212,32 L262,32 L262,74 Z" fill="#1e252c"/><path d="M272,32 L318,32 Q350,34 378,72 L272,74 Z" fill="#1e252c"/>
      <path d="M146,70 Q172,40 210,37 L222,37 L170,70 Z" fill="#cfd8df" opacity=".18"/>
      <path d="M40,96 L446,96" stroke="${l}" stroke-opacity=".5" stroke-width="2"/>
      <path d="M262,74 v50 M150,80 v44" stroke="${d}" stroke-width="2"/>
      <rect x="226" y="88" width="22" height="5" rx="2" fill="${d}"/><rect x="330" y="88" width="22" height="5" rx="2" fill="${d}"/>
      <g class="whl"><circle cx="102" cy="${h - 26}" r="30" fill="#121518"/><circle cx="102" cy="${h - 26}" r="17" fill="#8a96a2"/><circle cx="102" cy="${h - 26}" r="6" fill="#3c4650"/></g>
      <g class="whl"><circle cx="370" cy="${h - 26}" r="30" fill="#121518"/><circle cx="370" cy="${h - 26}" r="17" fill="#8a96a2"/><circle cx="370" cy="${h - 26}" r="6" fill="#3c4650"/></g>
      <rect x="440" y="88" width="14" height="14" rx="4" fill="#e9eef1"/><rect x="10" y="90" width="12" height="14" rx="3" fill="#8a1c22"/>
      <g class="beam" opacity="0"><path d="M452,95 L760,40 L760,160 Z" fill="url(#${id}h)" opacity=".35"/><circle cx="452" cy="95" r="26" fill="url(#${id}h)"/></g>
      <g class="tail" opacity="0"><circle cx="14" cy="97" r="22" fill="#e3262f" opacity=".35"/></g>
      <g class="drips"></g>`, w, h);
    const beam = svg.querySelector(".beam"), tail = svg.querySelector(".tail"), drips = svg.querySelector(".drips");
    const R = H.rng(p.seed ?? 9), dr = Array.from({ length: 26 }, () => [30 + R() * 410, 30 + R() * 90, R(), 0.6 + R()]);
    return {
      el: svg, w, h,
      update(t, it) {
        const li = it.v("lights", p.lights ?? 0);
        beam.setAttribute("opacity", li); tail.setAttribute("opacity", li);
        const up = it.v("drip_up", 0);
        drips.innerHTML = up > 0 ? dr.map(([x, y, ph, sp]) => {
          const k = (t * sp * 0.9 + ph) % 1, yy = y - k * 260 * up;
          return `<rect x="${x}" y="${yy}" width="3" height="${8 + 14 * up}" rx="1.5" fill="#b9d4e6" opacity="${(1 - k) * 0.8 * Math.min(1, up * 2)}"/>`;
        }).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ rain: streaks that fall, freeze, then fall up
// region [x0, y0, w, h] (local, origin top-left), count, len, speed (px/s), color, alpha, width;
// v (track, -1..1): direction and speed share; 1 down, 0 frozen (round drops), -1 up. Positions integrate v over time.
export const rain = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, n = p.count ?? 260, R = H.rng(p.seed ?? 5);
    const cv = document.createElement("canvas");
    const sc = p.res ?? 0.5;
    cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px`;
    const ctx = cv.getContext("2d");
    const drops = Array.from({ length: n }, () => ({ x: R() * w, y: R() * h, k: 0.55 + R() * 0.7, a: 0.35 + R() * 0.65, z: R() }));
    const sp = p.speed ?? 1500, len = p.len ?? 70, col = H.rgbOf(p.color ?? "#cfe3f0"), alpha = p.alpha ?? 0.55, lw = p.width ?? 2.2;
    const slant = p.slant ?? 0.08;
    let cacheT = null, cacheS = 0;
    const dispAt = (it, t) => {   // integral of v from the item's start to t (1/30 s steps)
      const t0 = it.at > -1e8 ? it.at : (H.shot?.start ?? 0);
      let s = 0, tt = t0;
      if (cacheT != null && t >= cacheT && cacheT >= t0) { s = cacheS; tt = cacheT; }
      while (tt < t) { const dt = Math.min(1 / 30, t - tt); s += it.v("v", 1, tt + dt / 2) * dt; tt += dt; }
      cacheT = t; cacheS = s;
      return s;
    };
    return {
      el: cv, w, h,
      update(t, it) {
        const v = it.v("v", 1), s = dispAt(it, t) * sp;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.lineCap = "round";
        for (const d of drops) {
          const L = len * d.k * Math.max(0.06, Math.abs(v)) , span = h + 2 * len;
          let y = ((d.y + s * d.k) % span + span) % span - len;
          const x = d.x + y * slant * Math.sign(v || 1);
          const dir = v >= 0 ? 1 : -1;
          ctx.strokeStyle = `rgba(${col},${alpha * d.a})`;
          ctx.lineWidth = lw * (0.6 + d.z) * sc * (Math.abs(v) < 0.15 ? 2 : 1);
          ctx.beginPath();
          ctx.moveTo(x * sc, y * sc);
          ctx.lineTo((x - L * slant * dir) * sc, (y - L * dir) * sc);
          ctx.stroke();
        }
      },
    };
  },
};

// ------------------------------------------------------------------ puddle: dark mirror with ripples; up (track 0..1) -> jets of rain upwards
export const puddle = {
  backdrop: true,
  origin: "center",
  create(p, H) {
    const w = p.w ?? 360, h = p.h ?? 70, R = H.rng(p.seed ?? 2), id = H.uid("pd");
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="${p.sky ?? "#5a6874"}"/><stop offset=".8" stop-color="#232a31"/><stop offset="1" stop-color="#1a1f24" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#${id})"/>
      <ellipse cx="${w * 0.42}" cy="${h * 0.44}" rx="${w * 0.22}" ry="${h * 0.12}" fill="${p.light ?? "#dfe8ee"}" opacity=".22"/>
      <g class="rip" fill="none" stroke="#cfe3f0"></g><g class="jet"></g>`, w, h);
    const rip = svg.querySelector(".rip"), jet = svg.querySelector(".jet");
    const pts = Array.from({ length: 9 }, () => [w * (0.15 + R() * 0.7), h * (0.3 + R() * 0.4), R()]);
    const jets = Array.from({ length: p.jets ?? 22 }, () => [w * (0.1 + R() * 0.8), h * (0.3 + R() * 0.4), R(), 0.7 + R() * 0.6]);
    return {
      el: svg, w, h,
      update(t, it) {
        const up = it.v("up", 0), rp = it.v("ripples", 1) * (1 - up);
        rip.innerHTML = rp > 0 ? pts.map(([x, y, ph]) => { const k = (t * 1.3 + ph) % 1; return `<ellipse cx="${x}" cy="${y}" rx="${6 + k * 44}" ry="${2 + k * 9}" stroke-width="2" opacity="${(1 - k) * 0.6 * rp}"/>`; }).join("") : "";
        jet.innerHTML = up > 0 ? jets.map(([x, y, ph, sp]) => {
          const k = (t * sp * 1.6 + ph) % 1, yy = y - k * 520 * up;
          return `<rect x="${x}" y="${yy - 26}" width="3" height="26" rx="1.5" fill="#cfe3f0" opacity="${(1 - k) * 0.85 * Math.min(1, up * 1.5)}"/>`;
        }).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ umbrella: yellow, open (track 0..1); origin = handle bottom
export const umbrella = {
  origin: "bottom",
  create(p, H) {
    const w = 320, h = 360, col = p.color ?? "#ffd23a", d = H.shade(col, -0.3);
    const svg = H.svg(`<g class="can"></g><path d="M160,120 V330 q0,24 -22,24 q-18,0 -18,-18" stroke="#2a2f35" stroke-width="9" fill="none" stroke-linecap="round"/>`, w, h);
    const can = svg.querySelector(".can");
    return {
      el: svg, w, h,
      update(t, it) {
        const o = it.v("open", p.open ?? 1), rw = 20 + 140 * o, top = 40 + (1 - o) * 30, bot = 140 + (1 - o) * 120;
        let s = `<path d="M${160 - rw},${bot} Q${160 - rw * 0.9},${top + 10} 160,${top} Q${160 + rw * 0.9},${top + 10} ${160 + rw},${bot}`;
        const n = 6;
        for (let i = n; i >= 0; i--) { const x = 160 - rw + (2 * rw * i) / n; s += ` ${i === n ? "" : ""}Q${x + rw / n},${bot - 20 * o} ${x},${bot}`; }
        s += ` Z" fill="${col}" stroke="${d}" stroke-width="3"/>`;
        for (let i = 1; i < n; i++) { const x = 160 - rw + (2 * rw * i) / n; s += `<path d="M160,${top} Q${(160 + x) / 2},${top + 20} ${x},${bot - 4}" stroke="${d}" stroke-width="2" fill="none" opacity=".6"/>`; }
        s += `<path d="M160,${top} v-26" stroke="#2a2f35" stroke-width="6"/><path d="M${160 - rw * 0.55},${top + 30} Q160,${top + 6} ${160 + rw * 0.2},${top + 22}" stroke="#fff" stroke-opacity=".35" stroke-width="10" fill="none"/>`;
        can.innerHTML = s;
      },
    };
  },
};

// ------------------------------------------------------------------ lamp_post: concrete pole with a cobra-head lamp; on (track), light cone
export const lamp_post = {
  backdrop: true,
  origin: "bottom",
  grounded: true,
  size_m: { h: 8 },
  create(p, H) {
    const w = 260, h = p.h ?? 640, id = H.uid("lp"), flip = p.left ? -1 : 1;
    const svg = H.svg(`<defs><radialGradient id="${id}" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#eef3f6" stop-opacity=".55"/><stop offset="1" stop-color="#eef3f6" stop-opacity="0"/></radialGradient></defs>
      <g transform="translate(${w / 2},0) scale(${flip},1)">
      <path class="cone" d="M90,46 L-40,${h} L230,${h} Z" fill="url(#${id})"/>
      <rect x="-9" y="20" width="18" height="${h - 20}" fill="#5a6168"/><rect x="-9" y="20" width="6" height="${h - 20}" fill="#7b838a"/>
      <path d="M0,30 Q10,0 60,10 L104,26" stroke="#5a6168" stroke-width="9" fill="none"/>
      <path d="M70,22 L124,30 Q130,44 116,48 L72,40 Z" fill="#3c4650"/><path class="bulb" d="M78,40 L118,46 L112,52 L80,46 Z" fill="#f2f4f6"/></g>`, w, h);
    const cone = svg.querySelector(".cone"), bulb = svg.querySelector(".bulb");
    return {
      el: svg, w, h,
      update(t, it) { const on = it.v("on", p.on ?? 1); cone.setAttribute("opacity", on); bulb.setAttribute("opacity", 0.3 + 0.7 * on); },
    };
  },
};

// ------------------------------------------------------------------ wet_ground: asphalt band with reflections of lights; origin top-left
// w, h, color, lights: [[x, color, width]], lines (road marking y or false), curb (y of the curb, or false)
export const wet_ground = {
  backdrop: true,
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1600, h = p.h ?? 700, id = H.uid("wg"), R = H.rng(p.seed ?? 3), col = p.color ?? "#2b3036";
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(col, 0.12)}"/><stop offset="1" stop-color="${H.shade(col, -0.45)}"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".55" stop-color="#fff"/><stop offset="1" stop-opacity="0" stop-color="#fff"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
    for (const [x, c, lw] of p.lights ?? []) s += `<rect x="${x - (lw ?? 30) / 2}" y="0" width="${lw ?? 30}" height="${h * 0.8}" fill="${c ?? "#dfe8ee"}" opacity=".22" style="filter:blur(10px)"/>`;
    for (let i = 0; i < 60; i++) s += `<ellipse cx="${R() * w}" cy="${R() * h}" rx="${20 + R() * 90}" ry="${3 + R() * 7}" fill="#9fb2c0" opacity="${0.03 + R() * 0.06}"/>`;
    if (p.curb != null && p.curb !== false) s += `<rect x="0" y="${p.curb}" width="${w}" height="14" fill="#7b838a"/><rect x="0" y="${p.curb + 14}" width="${w}" height="10" fill="#1a1f24" opacity=".6"/>`;
    if (p.lines != null && p.lines !== false) for (let x = 20; x < w; x += 220) s += `<rect x="${x}" y="${p.lines}" width="120" height="10" fill="#cfd6dc" opacity=".55"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ city_chunk: a city block torn off the ground, side view
// w, soil (depth px), buildings: [{x, floors, cols, color, seed}] (panel_block, x from the left edge), view: side;
// drip (0..1): water and dirt fall UP from the underside; crack (0..1): glow line along the tear; ground (asphalt colour);
// flat: true — a level underside at y = soil + 30 (people stand on it upside down); weed (0..1): sea weed on the underside
export const city_chunk = {
  backdrop: true,
  origin: "top-left",
  surface: true,
  async create(p, H) {
    const w = p.w ?? 900, soil = p.soil ?? 420, R = H.rng(p.seed ?? 8), id = H.uid("cc");
    const el = H.div(`width:${w}px;height:${soil + 40}px`);
    // underside: jagged bottom contour
    let bot = `M0,30`;
    const n = 18;
    for (let i = 0; i <= n; i++) { const x = (w * i) / n, depth = p.flat ? soil * (i === 0 || i === n ? 0.7 : 1 - 0.03 * R()) : soil * (0.55 + 0.45 * Math.sin(Math.PI * i / n)) * (0.85 + R() * 0.3); bot += ` L${x},${30 + depth}`; }
    bot += ` L${w},30 Z`;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4038"/><stop offset=".35" stop-color="#3a322b"/><stop offset=".7" stop-color="#2a2622"/><stop offset="1" stop-color="#1c1a18"/></linearGradient>
      <clipPath id="${id}c"><path d="${bot}"/></clipPath></defs>
      <path d="${bot}" fill="url(#${id})"/><g clip-path="url(#${id}c)">`;
    // strata
    for (let k = 0; k < 6; k++) { const y = 30 + soil * (0.08 + k * 0.15); s += `<path d="M0,${y} Q${w * 0.3},${y + 14 - R() * 28} ${w * 0.6},${y + R() * 16} T${w},${y}" stroke="#000" stroke-opacity=".25" stroke-width="${3 + R() * 6}" fill="none"/>`; }
    for (let i = 0; i < 70; i++) s += `<ellipse cx="${R() * w}" cy="${40 + R() * soil}" rx="${3 + R() * 12}" ry="${2 + R() * 8}" fill="#8a8078" opacity="${0.15 + R() * 0.25}"/>`;
    // pipes (cut ends), cables, metro-like tunnel, roots
    for (let i = 0; i < 4; i++) { const y = 60 + R() * soil * 0.4, r = 10 + R() * 18, x0 = R() * w * 0.2;
      s += `<rect x="${x0}" y="${y - r}" width="${w * (0.4 + R() * 0.6)}" height="${2 * r}" fill="#5a6168"/><rect x="${x0}" y="${y - r}" width="${w}" height="${r * 0.5}" fill="#7b838a" opacity=".5"/>`; }
    for (let i = 0; i < 6; i++) { const y = 50 + R() * soil * 0.3; s += `<path d="M0,${y} Q${w / 2},${y + 30} ${w},${y - 10}" stroke="#121518" stroke-width="4" fill="none"/>`; }
    if (p.tunnel !== false) { const tx = w * (0.3 + R() * 0.3), ty = 30 + soil * 0.45; s += `<ellipse cx="${tx}" cy="${ty}" rx="70" ry="60" fill="#121518"/><ellipse cx="${tx}" cy="${ty}" rx="70" ry="60" fill="none" stroke="#6a7178" stroke-width="10"/><rect x="${tx - 50}" y="${ty + 30}" width="100" height="6" fill="#6a7178"/>`; }
    s += `</g>`;
    for (let i = 0; i < 26; i++) { let x = R() * w, y = 34, d = `M${x},${y}`; for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 40; y += 20 + R() * 40; d += ` L${x},${y}`; } s += `<path d="${d}" stroke="#2a221c" stroke-width="${1.5 + R() * 3}" fill="none" opacity=".8"/>`; }
    // top surface (asphalt + curb)
    s += `<rect x="0" y="16" width="${w}" height="20" fill="${p.ground ?? "#3a4046"}"/><rect x="0" y="12" width="${w}" height="6" fill="#7b838a"/>`;
    // weed (0..1): sea weed stuck to the underside, pressed up against the soil (wet things fall up), drips upward
    if (p.weed) for (let i = 0; i < 30 * p.weed; i++) { const x = w * (0.04 + 0.92 * R()), y = 30 + soil * (p.flat ? 0.97 : 0.6), l = 50 + R() * 90;
      s += `<path d="M${x},${y} q${-14 + R() * 28},${-l * 0.4} ${-20 + R() * 40},${-l * 0.5} t${-10 + R() * 20},${-l * 0.5}" stroke="${R() < 0.5 ? "#2f4a33" : "#3e5a3c"}" stroke-width="${4 + R() * 6}" fill="none" stroke-linecap="round" opacity=".9"/>`; }
    s += `<path class="crack" d="${bot}" fill="none" stroke="#dfe8ee" stroke-width="3" opacity="0"/><g class="drip"></g>`;
    const svg = H.svg(s, w, soil + 40);
    svg.style.top = "0px";
    el.append(svg);
    const drip = svg.querySelector(".drip"), crack = svg.querySelector(".crack");
    const dr = Array.from({ length: p.drops ?? 40 }, () => [R() * w, 30 + soil * (0.6 + R() * 0.4), R(), 0.6 + R()]);
    // buildings on top (bottom at y = 18)
    svg.remove();
    // b.x is the building's bottom centre; a building never sticks out past the block's edge (it would hang in the air)
    for (const b of p.buildings ?? []) await H.child({ actor: "panel_block", x: Math.min(w - 16 - ((b.cols ?? 6) * (b.cell ?? [70, 56])[0]) / 2, Math.max(16 + ((b.cols ?? 6) * (b.cell ?? [70, 56])[0]) / 2, b.x)), y: 22, floors: b.floors ?? 9, cols: b.cols ?? 6, cell: b.cell ?? [70, 56], color: b.color ?? "#7d858c", seed: b.seed ?? Math.floor(R() * 99), lit: b.lit ?? 0.2, far: b.far ?? true, stains: 0.3 }, el);
    el.append(svg);   // soil drawn over building bases
    return {
      el, w, h: soil + 40,
      update(t, it) {
        const dp = it.v("drip", p.drip ?? 0.6), ck = it.v("crack", 0);
        crack.setAttribute("opacity", ck); crack.style.filter = ck ? "blur(2px)" : "";
        drip.innerHTML = dp > 0 ? dr.map(([x, y, ph, sp]) => { const k = (t * sp * 0.5 + ph) % 1; return `<rect x="${x}" y="${y - k * 160}" width="${2 + sp * 2}" height="${6 + sp * 8}" rx="2" fill="#a9c2d4" opacity="${(1 - k) * 0.7 * dp}"/>`; }).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ cloud_bank: soft heavy rain clouds (blurred blobs), drifting; origin top-left
// w, h, color, shade (underside), n, blur, speed (px/s), seed
export const cloud_bank = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1600, h = p.h ?? 600, n = p.n ?? 26, R = H.rng(p.seed ?? 3), col = p.color ?? "#7b8590", sh = p.shade ?? "#3a434c";
    const blobs = Array.from({ length: n }, () => ({ x: R() * w, y: h * (0.2 + R() * 0.6), rx: 120 + R() * 260, ry: 60 + R() * 120, c: R() < 0.55 ? col : sh, a: 0.5 + R() * 0.5, v: 0.5 + R() }));
    const svg = H.svg(`<g style="filter:blur(${p.blur ?? 26}px)">${blobs.map((b) => `<ellipse class="b" cx="${b.x}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" fill="${b.c}" opacity="${b.a}"/>`).join("")}</g>`, w, h);
    const els = [...svg.querySelectorAll(".b")], sp = p.speed ?? 8;
    return {
      el: svg, w, h,
      update(t) { els.forEach((e, i) => e.setAttribute("cx", blobs[i].x + t * sp * blobs[i].v)); },
    };
  },
};
