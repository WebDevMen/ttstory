// Post-apocalyptic city: ruined high-rise, smoke column, fire, rubble pile, abandoned car (side view).
// All stand on their origin (bottom center).

// ruined high-rise: floors, cols, cell [w,h], color, seed, burn (share of burning windows), break (floors torn off the top
// at the deepest notch), rim (colour of the back light on the right edge)
export const ruin = {
  origin: "bottom",
  create(p, H) {
    const F = p.floors ?? 14, N = p.cols ?? 6, [cw, ch] = p.cell ?? [80, 84];
    const pad = 24, w = N * cw + pad * 2, base = 40, h = F * ch + base;
    const rnd = H.rng(p.seed ?? 7), id = H.uid("ruin");
    const wall = H.col(p.color ?? "#1d1513"), rim = H.col(p.rim ?? "#ff7a3a");
    const brk = (p.break ?? 3.5) * ch;
    // jagged top profile: a few chunks torn off, the deepest one off-centre
    const notch = 0.25 + rnd() * 0.5, pts = [];
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * w, d = Math.exp(-((i / 12 - notch) ** 2) / 0.03);
      pts.push([x, Math.max(0, brk * (0.15 + 0.85 * d) * (0.55 + 0.45 * rnd()) - (i % 3 === 0 ? rnd() * 30 : 0))]);
    }
    const top = (x) => { const i = Math.min(11, Math.floor((x / w) * 12)), k = (x / w) * 12 - i; return H.lerp(pts[i][1], pts[i + 1][1], k); };
    const outline = `M0,${h} L0,${pts[0][1]} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + ` L${w},${h} Z`;
    let s = `<defs>
        <clipPath id="${id}c"><path d="${outline}"/></clipPath>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.35"/>
          <stop offset="0.8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="${rim}" stop-opacity="0.28"/></linearGradient>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff5a1a"/></linearGradient>
      </defs><g clip-path="url(#${id}c)">
      <rect width="${w}" height="${h}" fill="${wall}"/>`;
    for (let f = 1; f < F; f++) s += `<rect x="0" y="${h - base - f * ch - 3}" width="${w}" height="6" fill="${H.shade(wall, 0.12)}"/>`;
    const ww = cw * 0.56, wh = ch * 0.58, fires = [];
    for (let f = 1; f <= F; f++) for (let c = 1; c <= N; c++) {
      const x = pad + (c - 1) * cw + cw / 2, y = h - base - (f - 1) * ch - ch / 2, k = rnd();
      if (y - wh / 2 < top(x) + 6) continue;                       // torn-off part
      if (k < (p.burn ?? 0.06)) {
        fires.push(fires.length);
        s += `<rect class="fw" x="${x - ww / 2}" y="${y - wh / 2}" width="${ww}" height="${wh}" fill="url(#${id}f)"/>`;
      } else {
        s += `<rect x="${x - ww / 2}" y="${y - wh / 2}" width="${ww}" height="${wh}" fill="${k < 0.55 ? "#0a0706" : H.shade(wall, -0.45)}"/>`;
        if (k > 0.9) { const a = rnd(), b = rnd(); s += `<path d="M${x - ww / 2},${y - wh / 2 + wh * a * 0.6} L${x - ww / 2 + ww * (0.2 + b * 0.5)},${y + wh * (b - 0.3)} L${x - ww / 2},${y + wh / 2} Z" fill="${H.shade(wall, 0.25)}" opacity="0.45"/>`; }
      }
    }
    // cracks and a blast hole
    for (let i = 0; i < 4; i++) {
      let x = rnd() * w, y = top(x) + 40 + rnd() * h * 0.4, d = `M${x.toFixed(0)},${y.toFixed(0)}`;
      for (let j = 0; j < 6; j++) { x += (rnd() - 0.5) * 60; y += 30 + rnd() * 50; d += ` L${x.toFixed(0)},${y.toFixed(0)}`; }
      s += `<path d="${d}" fill="none" stroke="#080505" stroke-width="${2 + rnd() * 3}" opacity="0.8"/>`;
    }
    s += `<rect width="${w}" height="${h}" fill="url(#${id}g)"/></g>`;
    // rebar sticking out of the torn edge
    for (let i = 0; i < 7; i++) {
      const x = pad + rnd() * (w - pad * 2), y = top(x) + 2;
      s += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l${((rnd() - 0.5) * 30).toFixed(0)},${(-20 - rnd() * 30).toFixed(0)}" stroke="${H.shade(wall, 0.2)}" stroke-width="3" fill="none"/>`;
    }
    s += `<rect x="-14" y="${h - 10}" width="${w + 28}" height="10" fill="${H.shade(wall, -0.3)}"/>`;
    const svg = H.svg(s, w, h);
    const fw = [...svg.querySelectorAll(".fw")];
    return {
      el: svg, w, h,
      update(t) { fw.forEach((e, i) => e.setAttribute("opacity", (0.8 + 0.2 * H.noise(t, i + 1, 1.8)).toFixed(3))); },
      anchor(name) { return name === "top" ? [pts[Math.round(notch * 12)][0], pts[Math.round(notch * 12)][1]] : null; },
    };
  },
};

// rising smoke column: w (spread), h (height), color, n (puffs), speed (px/s), drift (sideways share of h)
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
        const v = it.v("speed", 60) / h, drift = it.v("drift", -0.35);
        puffs.forEach((q, i) => {
          const k = (q.ph + t * v) % 1, e = els[i];
          const x = w / 2 + drift * h * k ** 1.6 + Math.sin(t * 0.7 + q.j) * 18 * k;
          e.setAttribute("cx", x.toFixed(1)); e.setAttribute("cy", (h - k * h).toFixed(1));
          e.setAttribute("r", ((30 + k * w * 0.45) * q.r).toFixed(1));
          e.setAttribute("opacity", (Math.min(1, k * 8) * (1 - k) * 0.85).toFixed(3));
        });
      },
    };
  },
};

// flickering flames: w, h, tongues
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
      update(t) {
        tg.forEach((q, i) => {
          const f = 0.82 + 0.18 * H.noise(t, q.s, 2.2), sw = H.noise(t, q.s + 3, 1.2) * 8;
          els[i].setAttribute("d", tongue(q.x + sw * 0.3, h * q.hk * f, w * q.wk));
          core[i].setAttribute("d", tongue(q.x + sw * 0.15, h * q.hk * f * 0.45, w * q.wk * 0.5));
        });
        gl.setAttribute("opacity", (0.26 + 0.08 * H.noise(t, 5, 3)).toFixed(3));
      },
    };
  },
};

// pile of concrete debris: w, h, color, seed
export const rubble = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 420, h = p.h ?? 140, rnd = H.rng(p.seed ?? 9), col = H.col(p.color ?? "#261a16");
    let s = `<path d="M0,${h} Q${w * 0.5},${-h * 0.2} ${w},${h} Z" fill="${H.shade(col, -0.25)}"/>`;
    for (let i = 0; i < 26; i++) {
      const u = rnd(), cx = w * (0.08 + 0.84 * u), lim = h - h * 1.6 * Math.min(u, 1 - u) * 1.2;
      const cy = Math.max(lim, h - rnd() * h * 0.7), r = 10 + rnd() * 26, a = rnd() * 6.28, k = 3 + Math.floor(rnd() * 3);
      const pts = Array.from({ length: k }, (_, j) => {
        const b = a + (j / k) * 6.28, rr = r * (0.6 + rnd() * 0.5);
        return `${(cx + Math.cos(b) * rr).toFixed(0)},${(cy + Math.sin(b) * rr * 0.7).toFixed(0)}`;
      });
      s += `<polygon points="${pts.join(" ")}" fill="${H.shade(col, (rnd() - 0.6) * 0.3)}"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const x = w * (0.2 + rnd() * 0.6), y = h * (0.3 + rnd() * 0.4);
      s += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l${((rnd() - 0.5) * 50).toFixed(0)},${(-15 - rnd() * 25).toFixed(0)}" stroke="#4a3a32" stroke-width="3"/>`;
    }
    return { el: H.svg(s, w, h), w, h };
  },
};

// abandoned sedan, side view facing right: color, burnt (charred, no tyres), rust (0..1), dust (ash on the roof)
export const car = {
  origin: "bottom",
  size_m: { w: 4.6 },
  create(p, H) {
    const w = 464, h = 158, id = H.uid("car"), rnd = H.rng(p.seed ?? 3);
    const burnt = !!p.burnt, sink = burnt ? 12 : 0;
    const body = H.col(burnt ? "#2a2421" : p.color ?? "#5a6670"), dark = H.shade(body, -0.4);
    const G = h - sink, wy = G - 34;
    const shape = `M8,${G - 46} L8,${G - 72} Q10,${G - 86} 32,${G - 90} L132,${G - 96} L178,${G - 132} Q185,${G - 138} 198,${G - 138}
      L330,${G - 138} Q345,${G - 138} 356,${G - 128} L398,${G - 96} L440,${G - 90} Q456,${G - 86} 456,${G - 70} L456,${G - 46}
      Q456,${G - 36} 446,${G - 36} L412,${G - 36} A42,42 0 0 0 328,${G - 36} L142,${G - 36} A42,42 0 0 0 58,${G - 36} L18,${G - 36} Q8,${G - 36} 8,${G - 46} Z`;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(body, 0.18)}"/>
        <stop offset="0.5" stop-color="${body}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
        <clipPath id="${id}c"><path d="${shape}"/></clipPath></defs>
      <ellipse cx="${w / 2}" cy="${h - 3}" rx="${w * 0.52}" ry="9" fill="#000" opacity="0.45"/>`;
    const wheel = (cx) => burnt
      ? `<circle cx="${cx}" cy="${wy}" r="26" fill="#1a1715"/><circle cx="${cx}" cy="${wy}" r="18" fill="none" stroke="#4a403a" stroke-width="5"/>`
      : `<circle cx="${cx}" cy="${wy}" r="34" fill="#141313"/><circle cx="${cx}" cy="${wy}" r="19" fill="#6c6a68"/><circle cx="${cx}" cy="${wy}" r="6" fill="#2c2b2a"/>`;
    s += wheel(100) + wheel(370);
    s += `<path d="${shape}" fill="url(#${id})"/><g clip-path="url(#${id}c)">`;
    // windows: broken glass (dark with shards)
    const win = [`M188,${G - 128} L260,${G - 128} L260,${G - 98} L146,${G - 96} Z`, `M268,${G - 128} L330,${G - 128} Q340,${G - 128} 348,${G - 120} L376,${G - 98} L268,${G - 98} Z`];
    win.forEach((d, i) => {
      s += `<path d="${d}" fill="#0b0b0d"/>`;
      if (!burnt) s += `<path d="${d}" fill="#9fb0bb" opacity="0.18" transform="translate(0,0)"/>
        <path d="M${i ? 300 : 200},${G - 128} l${i ? 18 : 24},22 l${i ? -10 : 14},8" fill="none" stroke="#c9d3d8" stroke-width="1.5" opacity="0.5"/>`;
    });
    s += `<path d="M264,${G - 132} L264,${G - 40}" stroke="${dark}" stroke-width="3"/><path d="M146,${G - 92} L146,${G - 42}" stroke="${dark}" stroke-width="2" opacity="0.6"/>
      <rect x="282" y="${G - 84}" width="22" height="5" rx="2" fill="${dark}"/><rect x="168" y="${G - 84}" width="22" height="5" rx="2" fill="${dark}"/>
      <rect x="8" y="${G - 62}" width="450" height="5" fill="${dark}" opacity="0.5"/>`;
    // rust / soot patches, a dent, ash on the roof
    const rust = burnt ? 1 : p.rust ?? 0.5;
    for (let i = 0; i < Math.round(rust * 9); i++)
      s += `<ellipse cx="${(30 + rnd() * 400).toFixed(0)}" cy="${(G - 40 - rnd() * 60).toFixed(0)}" rx="${(10 + rnd() * 28).toFixed(0)}" ry="${(5 + rnd() * 12).toFixed(0)}"
        fill="${burnt ? "#4b3b30" : "#6e3e22"}" opacity="${(0.35 + rnd() * 0.35).toFixed(2)}"/>`;
    s += `<path d="M${330 + rnd() * 60},${G - 80} q16,10 34,2" fill="none" stroke="${dark}" stroke-width="3" opacity="0.7"/>`;
    if (p.dust !== false) s += `<rect x="0" y="${G - 142}" width="${w}" height="12" fill="#8a7d72" opacity="${burnt ? 0.25 : 0.45}"/>`;
    s += `</g><rect x="446" y="${G - 78}" width="10" height="10" rx="2" fill="${burnt ? "#3a302a" : "#8c8a80"}"/>
      <rect x="8" y="${G - 78}" width="8" height="12" rx="2" fill="${burnt ? "#3a302a" : "#5a1c18"}"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};
