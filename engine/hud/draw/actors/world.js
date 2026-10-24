// World actors: sky, stars, cloud, skyline, building, school, house, street, train, tree, streetlight, ground.
// Buildings, trees, people stand on their origin (bottom center) unless noted.

// ------------------------------------------------------------------ sky: time of day drives everything
// hour (track 0..24) -> gradient, sun/moon position and color, stars, cloud tint. colors: [top, mid, bottom] overrides.
// stars (count, default 140), clouds (count, default 4), cloud_speed, sun, moon (true/false or [x, y]), horizon (y)
const SKY = [
  [0, "#060a18", "#0d1430", "#1a2350", "#2a3358", 1],
  [4.5, "#0b1030", "#1c2350", "#3a3a6a", "#3a3f66", 0.8],
  [5.8, "#2a3570", "#7a5a8a", "#f2a07a", "#d9a0a8", 0.15],
  [7, "#5f9fe0", "#a8d0f0", "#ffe6c8", "#ffffff", 0],
  [10, "#3d8ee6", "#7cbcf2", "#cfe8ff", "#ffffff", 0],
  [14.5, "#3a8ae0", "#78b8f0", "#d2eaff", "#ffffff", 0],
  [16.5, "#4a86d0", "#93bbe6", "#ffe2b0", "#fff6ea", 0],
  [18, "#3d3f86", "#c46a8a", "#ffad6a", "#ffc0a8", 0],
  [19.2, "#1a2156", "#4a3a7a", "#b0647a", "#8a6a98", 0.35],
  [20.5, "#0a0f2a", "#141c44", "#2a2f5e", "#3a3f66", 0.9],
  [24, "#060a18", "#0d1430", "#1a2350", "#2a3358", 1],
];
function skyAt(H, hour) {
  hour = ((hour % 24) + 24) % 24;
  for (let i = 0; i + 1 < SKY.length; i++) {
    const a = SKY[i], b = SKY[i + 1];
    if (hour >= a[0] && hour <= b[0]) {
      const f = (hour - a[0]) / (b[0] - a[0]);
      return { top: H.mixc(a[1], b[1], f), mid: H.mixc(a[2], b[2], f), bottom: H.mixc(a[3], b[3], f), cloud: H.mixc(a[4], b[4], f), stars: a[5] + (b[5] - a[5]) * f };
    }
  }
  return { top: SKY[0][1], mid: SKY[0][2], bottom: SKY[0][3], cloud: SKY[0][4], stars: 1 };
}
function cloudPath(w, h) {
  return `M${w * 0.1},${h} Q0,${h} 0,${h * 0.72} Q0,${h * 0.42} ${w * 0.2},${h * 0.45} Q${w * 0.22},${h * 0.05} ${w * 0.48},${h * 0.1}
    Q${w * 0.66},0 ${w * 0.74},${h * 0.32} Q${w},${h * 0.3} ${w},${h * 0.68} Q${w},${h} ${w * 0.88},${h} Z`;
}
export const sky = {
  create(p, H) {
    const w = p.w ?? H.W, h = p.h ?? H.H, id = H.uid("sky"), sg = H.uid("sun");
    const rnd = H.rng(p.seed ?? 3);
    const ns = p.stars ?? 140, nc = p.clouds ?? 4, horizon = p.horizon ?? h * 0.66;
    const stars = Array.from({ length: ns }, () => [rnd() * w, rnd() * horizon * 0.95, 0.6 + rnd() * 1.8, rnd() * 6.28, 0.6 + rnd() * 2]);
    const clouds = Array.from({ length: nc }, (_, i) => ({ x: rnd() * w, y: h * (0.08 + 0.38 * rnd()), s: 0.6 + rnd() * 0.9, v: 6 + rnd() * 10, i }));
    const svg = H.svg(`<defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0"/><stop offset="0.55"/><stop offset="1"/></linearGradient>
        <radialGradient id="${sg}"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.25" stop-opacity="0.5"/><stop offset="1" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>
      <g class="stars">${stars.map((s) => `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2]}" fill="#fff"/>`).join("")}</g>
      <g class="moon"><circle r="70" fill="#fff6dc" opacity="0.18"/><circle r="46" fill="#fff6dc"/><circle cx="-12" cy="-8" r="9" fill="#efe3c0"/><circle cx="14" cy="12" r="6" fill="#efe3c0"/></g>
      <g class="sun"><circle r="230" fill="url(#${sg})"/><circle r="62" class="core"/></g>
      <g class="clouds">${clouds.map((c) => `<path d="${cloudPath(240 * c.s, 90 * c.s)}"/>`).join("")}</g>`, w, h);
    const stops = [...svg.querySelectorAll(`#${id} stop`)];
    const sunStops = [...svg.querySelectorAll(`#${sg} stop`)];
    const starEls = [...svg.querySelectorAll(".stars circle")], cloudEls = [...svg.querySelectorAll(".clouds path")];
    const sun = svg.querySelector(".sun"), core = sun.querySelector(".core"), moon = svg.querySelector(".moon");
    return {
      el: svg, w, h,
      update(t, it) {
        const hour = it.v("hour", 12);
        const k = skyAt(H, hour);
        const cols = it.v("colors", null);
        [cols?.[0] ?? k.top, cols?.[1] ?? k.mid, cols?.[2] ?? k.bottom].forEach((c, i) => stops[i].setAttribute("stop-color", H.col(c)));
        const sa = it.v("star_alpha", k.stars);
        starEls.forEach((e, i) => { const s = stars[i]; e.setAttribute("opacity", sa * (0.55 + 0.45 * Math.sin(t * s[4] + s[3]))); });
        // sun
        const day = (hour - 5.6) / 14;
        const sunOn = p.sun !== false && day > -0.02 && day < 1.02;
        sun.style.display = sunOn ? "" : "none";
        if (sunOn) {
          const sp = Array.isArray(p.sun) ? p.sun : [w * (0.12 + 0.76 * day), horizon - Math.sin(Math.PI * H.clamp(day)) * horizon * 0.85];
          const low = 1 - Math.sin(Math.PI * H.clamp(day));
          const c = H.mixc("#fff3b8", "#ff8a3c", Math.pow(low, 1.5));
          sun.setAttribute("transform", `translate(${sp[0]},${sp[1]})`);
          core.setAttribute("fill", c);
          sunStops.slice(1).forEach((s) => s.setAttribute("stop-color", c));
        }
        const night = H.clamp(sa);
        moon.style.display = p.moon === false || night < 0.05 ? "none" : "";
        const mp = Array.isArray(p.moon) ? p.moon : [w * 0.76, h * 0.13];
        moon.setAttribute("transform", `translate(${mp[0]},${mp[1]})`);
        moon.setAttribute("opacity", night);
        cloudEls.forEach((e, i) => {
          const c = clouds[i], cw = 240 * c.s;
          const x = ((c.x + t * c.v * (p.cloud_speed ?? 1)) % (w + cw * 2)) - cw;
          e.setAttribute("transform", `translate(${x},${c.y})`);
          e.setAttribute("fill", H.col(k.cloud));
          e.setAttribute("opacity", 0.85 - 0.35 * night);
        });
      },
    };
  },
};

// stars: twinkling dots in a region [x0, y0, x1, y1] (screen-like night backgrounds)
export const stars = {
  create(p, H) {
    const [x0, y0, x1, y1] = p.region ?? [0, 0, H.W, H.H * 0.6];
    const rnd = H.rng(p.seed ?? 7);
    const n = p.count ?? 120;
    const s = Array.from({ length: n }, () => [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), (p.size ?? 1.6) * (0.5 + rnd()), rnd() * 6.28, 0.5 + rnd() * 2.5]);
    const svg = H.svg(s.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="${q[2]}" fill="${H.col(p.color ?? "white")}"/>`).join(""), x1, y1);
    const els = [...svg.children];
    return { el: svg, update(t, it) { const a = it.v("alpha", 1); els.forEach((e, i) => e.setAttribute("opacity", a * (0.45 + 0.55 * Math.abs(Math.sin(t * s[i][4] * 0.6 + s[i][3]))))); } };
  },
};

// cloud: one flat cloud (w, color, opacity); drift with anim or `speed` (px/s)
export const cloud = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 300, h = w * 0.38;
    const svg = H.svg(`<path d="${cloudPath(w, h)}" fill="${H.col(p.color ?? "white")}"/>`, w, h);
    return { el: svg, w, h, update(t) { if (p.speed) svg.style.transform = `translateX(${t * p.speed}px)`; } };
  },
};

// ------------------------------------------------------------------ skyline: city silhouette with lit windows
// w, h (max building height), count, color, color2 (far row), win (lit window color), lit (track 0..1), seed, far (true)
export const skyline = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 700, rnd = H.rng(p.seed ?? 11), n = p.count ?? 12;
    const parts = [];
    const wins = [];
    const row = (yoff, scale, col, alpha, winOn) => {
      let x = -20;
      while (x < w) {
        const bw = 80 + rnd() * 120, bh = h * scale * (0.35 + rnd() * 0.65);
        parts.push(`<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh + 2}" fill="${col}" opacity="${alpha}"/>`);
        if (rnd() < 0.3) parts.push(`<rect x="${x + bw * 0.4}" y="${h - bh - 30}" width="4" height="30" fill="${col}" opacity="${alpha}"/>`);
        if (winOn) {
          const cw = p.cell ?? 22;
          for (let yy = h - bh + 18; yy < h - 14; yy += cw * 1.25)
            for (let xx = x + 12; xx < x + bw - 14; xx += cw) wins.push({ x: xx, y: yy, k: rnd(), f: rnd() });
        }
        x += bw + 4 + rnd() * 18;
      }
    };
    if (p.far !== false) row(0, 1.1, H.col(p.color2 ?? "#141a36"), 1, false);
    row(0, 0.85, H.col(p.color ?? "#1d2347"), 1, true);
    const cw = p.cell ?? 22;
    const svg = H.svg(parts.join("") + `<g class="w">${wins.map((q) => `<rect x="${q.x}" y="${q.y}" width="${cw * 0.45}" height="${cw * 0.62}" rx="1.5" fill="${H.col(p.win ?? "#ffc35a")}"/>`).join("")}</g>`, w, h);
    const we = [...svg.querySelectorAll(".w rect")];
    void n;
    return {
      el: svg, w, h,
      update(t, it) {
        const lit = it.v("lit", 0.28);
        we.forEach((e, i) => {
          const q = wins[i];
          let on = q.k < lit;
          if (p.flicker && q.f < 0.04) on = on && Math.sin(t * (3 + q.f * 40)) > -0.6;
          e.style.display = on ? "" : "none";
        });
      },
    };
  },
};

// ------------------------------------------------------------------ building: panel apartment block (reference style)
// floors, cols, cell [w, h], color, seams, win_off, win_on, lit (track), seed, entrances (count),
// lights: [{at, floor, col, on}], target: {floor, col, at, color, brackets} -> anchor "win:floor,col"
export const building = {
  origin: "bottom",
  create(p, H) {
    const F = p.floors ?? 9, N = p.cols ?? 12, [cw, ch] = p.cell ?? [64, 72];
    const pad = 26, w = N * cw + pad * 2, roof = 26, h = F * ch + roof + 40;
    const rnd = H.rng(p.seed ?? 5);
    const wall = H.col(p.color ?? "#1a2140"), seam = H.col(p.seams ?? "#232c52");
    const off = H.col(p.win_off ?? "#0f1530"), on = H.col(p.win_on ?? "#f2b45a");
    const ww = cw * 0.52, wh = ch * 0.56;
    const winXY = (f, c) => [pad + (c - 1) * cw + cw / 2, h - 40 - (f - 1) * ch - ch / 2];
    let s = `<rect x="0" y="${roof - 6}" width="${w}" height="${h - roof + 6}" fill="${wall}"/>
      <rect x="-8" y="${roof - 14}" width="${w + 16}" height="14" fill="${H.shade(wall, -0.25)}"/>`;
    for (let f = 1; f < F; f++) s += `<rect x="0" y="${h - 40 - f * ch - 1}" width="${w}" height="2" fill="${seam}"/>`;
    for (let c = 1; c < N; c += 2) s += `<rect x="${pad + c * cw - 1}" y="${roof}" width="2" height="${h - roof - 40}" fill="${seam}" opacity="0.6"/>`;
    const wins = [];
    for (let f = 1; f <= F; f++) for (let c = 1; c <= N; c++) {
      const [x, y] = winXY(f, c);
      wins.push({ f, c, k: rnd() });
      s += `<rect class="win" x="${x - ww / 2}" y="${y - wh / 2}" width="${ww}" height="${wh}" rx="2" fill="${off}"/>`;
    }
    const ent = p.entrances ?? 4;
    for (let i = 0; i < ent; i++) {
      const x = pad + ((i + 0.5) / ent) * (N * cw);
      s += `<rect x="${x - 26}" y="${h - 46}" width="52" height="46" fill="${H.shade(wall, -0.35)}"/><rect x="${x - 34}" y="${h - 54}" width="68" height="8" fill="${H.shade(wall, 0.15)}"/>`;
    }
    s += `<g class="tg"></g>`;
    const svg = H.svg(s, w, h);
    const winEls = [...svg.querySelectorAll(".win")];
    const tgt = p.target;
    let tg = null;
    if (tgt) {
      const [x, y] = winXY(tgt.floor, tgt.col), b = 14, bw = ww / 2 + 12, bh = wh / 2 + 12;
      const col = H.col(tgt.color ?? "#ffe14a");
      tg = svg.querySelector(".tg");
      tg.innerHTML = `<rect x="${x - ww / 2}" y="${y - wh / 2}" width="${ww}" height="${wh}" rx="2" fill="${col}" style="filter:drop-shadow(0 0 10px ${col}) drop-shadow(0 0 26px ${col})"/>
        ${tgt.brackets === false ? "" : `<path class="br" d="M${x - bw},${y - bh + b} V${y - bh} H${x - bw + b} M${x + bw - b},${y - bh} H${x + bw} V${y - bh + b} M${x + bw},${y + bh - b} V${y + bh} H${x + bw - b} M${x - bw + b},${y + bh} H${x - bw} V${y + bh - b}" fill="none" stroke="${col}" stroke-width="3"/>`}`;
    }
    return {
      el: svg, w, h,
      update(t, it) {
        const lit = it.v("lit", 0.18);
        winEls.forEach((e, i) => {
          const q = wins[i];
          let o = q.k < lit;
          for (const l of p.lights || []) if (t >= l.at && l.floor === q.f && l.col === q.c) o = !!l.on;
          e.setAttribute("fill", o ? on : off);
        });
        if (tg) {
          const k = H.P(t, tgt.at ?? it.at, 0.35);
          tg.style.display = t >= (tgt.at ?? it.at) ? "" : "none";
          const [x, y] = winXY(tgt.floor, tgt.col);
          const br = tg.querySelector(".br");
          if (br) br.setAttribute("transform", `translate(${x},${y}) scale(${H.lerp(1.8, 1, H.E.outBack(k))}) translate(${-x},${-y})`);
          tg.style.opacity = H.clamp(k * 3) * (0.85 + 0.15 * Math.sin(t * 6));
        }
      },
      anchor(name, args) { if (name === "win") return winXY(args[0], args[1]); if (name === "roof") return [w / 2, roof]; return null; },
    };
  },
};

// ------------------------------------------------------------------ school: Japanese school building with a clock tower
// floors (4), cols (14), color, trim, glass, roof, time (track, hours: 8.5 = 8:30), lit (0..1 windows glowing at night),
// flag (true), plaque (text). Anchors: clock, door, roof, win:floor,col
export const school = {
  origin: "bottom",
  create(p, H) {
    const F = p.floors ?? 4, N = p.cols ?? 14, cw = p.cell_w ?? 64, fh = p.floor_h ?? 96;
    const pad = 30, w = N * cw + pad * 2, base = 30, roofY = 120;
    const h = roofY + F * fh + base;
    const wall = H.col(p.color ?? "#f3ecdc"), trim = H.col(p.trim ?? "#d6ccb9"), glass = H.col(p.glass ?? "#9fd2f2"), roofC = H.col(p.roof ?? "#8592a8");
    const tw = cw * 3 + 20, tx = w / 2 - tw / 2, towerTop = 0;
    const winXY = (f, c) => [pad + (c - 0.5) * cw, h - base - (f - 0.5) * fh];
    let s = `<rect x="0" y="${roofY}" width="${w}" height="${h - roofY}" fill="${wall}"/>
      <rect x="-10" y="${roofY - 14}" width="${w + 20}" height="18" rx="3" fill="${roofC}"/>
      <rect x="0" y="${h - base}" width="${w}" height="${base}" fill="${H.shade(wall, -0.12)}"/>`;
    for (let f = 1; f <= F; f++) {
      const y = h - base - f * fh;
      s += `<rect x="0" y="${y + fh - 10}" width="${w}" height="10" fill="${trim}"/>`;
    }
    const wins = [];
    for (let f = 1; f <= F; f++) for (let c = 1; c <= N; c++) {
      const [x, y] = winXY(f, c);
      if (c >= N / 2 - 0.5 && c <= N / 2 + 1.5 && f === 1) continue;          // entrance
      const ww = cw * 0.78, wh = fh * 0.56;
      wins.push([x, y]);
      s += `<g class="win"><rect x="${x - ww / 2 - 3}" y="${y - wh / 2 - 6}" width="${ww + 6}" height="${wh + 6}" fill="#ffffff"/>
        <rect class="gl" x="${x - ww / 2}" y="${y - wh / 2 - 3}" width="${ww}" height="${wh}" fill="${glass}"/>
        <rect x="${x - 1.5}" y="${y - wh / 2 - 3}" width="3" height="${wh}" fill="#ffffff"/>
        <path d="M${x - ww / 2 + 6},${y + wh / 2 - 8} L${x - ww / 2 + 18},${y - wh / 2 + 4}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="5"/></g>`;
    }
    // tower with clock
    s += `<rect x="${tx}" y="${towerTop + 40}" width="${tw}" height="${roofY}" fill="${wall}"/>
      <path d="M${tx - 14},${towerTop + 44} L${w / 2},${towerTop} L${tx + tw + 14},${towerTop + 44} Z" fill="${roofC}"/>
      <circle cx="${w / 2}" cy="${towerTop + 100}" r="44" fill="#ffffff" stroke="${H.shade(roofC, -0.2)}" stroke-width="7"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return `<rect x="${w / 2 - 2}" y="${towerTop + 62}" width="4" height="${i % 3 ? 6 : 10}" fill="#3a3f4f" transform="rotate(${i * 30} ${w / 2} ${towerTop + 100})"/>`; }).join("")}
      <rect class="hh" x="${w / 2 - 3}" y="${towerTop + 76}" width="6" height="26" rx="3" fill="#2a2f3e"/>
      <rect class="mh" x="${w / 2 - 2}" y="${towerTop + 66}" width="4" height="36" rx="2" fill="#2a2f3e"/>
      <circle cx="${w / 2}" cy="${towerTop + 100}" r="4" fill="#c8323f"/>`;
    // entrance
    const ex = w / 2, ey = h - base;
    s += `<rect x="${ex - cw * 1.4}" y="${ey - fh * 0.82}" width="${cw * 2.8}" height="${fh * 0.82}" fill="${H.shade(glass, -0.35)}"/>
      <rect x="${ex - 2}" y="${ey - fh * 0.82}" width="4" height="${fh * 0.82}" fill="#ffffff"/>
      <rect x="${ex - cw * 1.7}" y="${ey - fh * 0.9}" width="${cw * 3.4}" height="12" rx="3" fill="${roofC}"/>`;
    if (p.plaque) s += `<rect x="${ex - 120}" y="${roofY + 14}" width="240" height="40" rx="6" fill="#ffffff" stroke="${trim}" stroke-width="3"/>
      <text x="${ex}" y="${roofY + 44}" text-anchor="middle" font-family="Klee, Rounded" font-weight="600" font-size="26" fill="#3a3f4f">${p.plaque}</text>`;
    if (p.flag) s += `<rect x="${w - 46}" y="${-60}" width="5" height="${roofY + 50}" fill="#c9ced8"/><rect x="${w - 41}" y="-56" width="70" height="46" fill="#ffffff" stroke="#e1e4ea"/><circle cx="${w - 6}" cy="-33" r="13" fill="#d9283a"/>`;
    const svg = H.svg(s, w, h);
    const hh = svg.querySelector(".hh"), mh = svg.querySelector(".mh"), gls = [...svg.querySelectorAll(".gl")];
    const rnd = H.rng(p.seed ?? 2), ks = gls.map(() => rnd());
    const cx = w / 2, cy = towerTop + 100;
    return {
      el: svg, w, h,
      update(t, it) {
        const time = it.v("time", 8.5);
        hh.setAttribute("transform", `rotate(${(time % 12) * 30} ${cx} ${cy})`);
        mh.setAttribute("transform", `rotate(${(time % 1) * 360} ${cx} ${cy})`);
        const lit = it.v("lit", 0);
        if (lit > 0 || it.tracks.lit) gls.forEach((g, i) => g.setAttribute("fill", ks[i] < lit ? "#ffd36b" : glass));
      },
      anchor(name, args) {
        if (name === "clock") return [cx, cy];
        if (name === "door") return [ex, ey - fh * 0.4];
        if (name === "roof") return [w / 2, roofY];
        if (name === "win") return winXY(args[0], args[1]);
        return null;
      },
    };
  },
};

// ------------------------------------------------------------------ house: Japanese two-storey house with a tiled roof
// w, floors (1|2), wall, roof, seed, lit (window glow at night)
export const house = {
  origin: "bottom",
  create(p, H) {
    const rnd = H.rng(p.seed ?? 4);
    const w = p.w ?? 300, fl = p.floors ?? (rnd() < 0.7 ? 2 : 1), fh = 120;
    const wall = H.col(p.wall ?? ["#f2ead8", "#e8dcc8", "#dfe6ec", "#efe1cf"][Math.floor(rnd() * 4)]);
    const roof = H.col(p.roof ?? ["#4a5a74", "#5b4a44", "#3a4256", "#6a6f7a"][Math.floor(rnd() * 4)]);
    const h = fl * fh + 70, by = h - fl * fh;
    const eave = (y, ext, rise) => `<path d="M${-ext},${y} Q${w / 2},${y - 12} ${w + ext},${y} L${w + ext - 34},${y - rise} L${34 - ext},${y - rise} Z" fill="${roof}"/>
      ${Array.from({ length: 10 }, (_, i) => { const u = i / 9; return `<path d="M${34 - ext + u * (w + 2 * ext - 68)},${y - rise + 2} L${-ext + 8 + u * (w + 2 * ext - 16)},${y - 5}" stroke="${H.shade(roof, -0.2)}" stroke-width="3"/>`; }).join("")}
      <path d="M${-ext},${y} Q${w / 2},${y - 12} ${w + ext},${y}" stroke="${H.shade(roof, -0.35)}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    let s = `<rect x="0" y="${by}" width="${w}" height="${h - by}" fill="${wall}"/><rect x="0" y="${h - 14}" width="${w}" height="14" fill="${H.shade(wall, -0.2)}"/>`;
    for (let f = 0; f < fl; f++) {
      const y = h - (f + 1) * fh, n = w > 260 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = w * ((i + 0.5) / n) - 40;
        if (f === 0 && i === n - 1) { s += `<rect x="${x + 8}" y="${y + 34}" width="58" height="${fh - 48}" fill="#8a6a4c"/><circle cx="${x + 56}" cy="${y + 80}" r="3" fill="#e8c27a"/>`; continue; }
        s += `<rect class="hw" x="${x}" y="${y + 30}" width="80" height="54" fill="#cfe4f2" stroke="#ffffff" stroke-width="5"/>
          <path d="M${x + 40},${y + 30} V${y + 84} M${x},${y + 57} H${x + 80}" stroke="#ffffff" stroke-width="3"/>`;
      }
    }
    for (let f = 1; f < fl; f++) s += eave(h - f * fh + 10, 14, 34);
    s += eave(by + 4, 30, 62);
    const svg = H.svg(s, w, h);
    const hw = [...svg.querySelectorAll(".hw")];
    return { el: svg, w, h, update(t, it) { const l = it.v("lit", 0); hw.forEach((e) => e.setAttribute("fill", l > 0.5 ? "#ffd78a" : "#cfe4f2")); } };
  },
};

// ------------------------------------------------------------------ street: sidewalk + road + utility poles with sagging wires
// w (length), road (height), color, poles (spacing px, 0 = none), pole_h; origin: top-left = sidewalk line
export const street = {
  create(p, H) {
    const w = p.w ?? 2400, road = p.road ?? 280, sp = p.poles ?? 520, ph = p.pole_h ?? 560;
    const asphalt = H.col(p.color ?? "#5b6070"), walk = H.col(p.walk ?? "#c9c3b8");
    let s = `<rect x="0" y="0" width="${w}" height="46" fill="${walk}"/><rect x="0" y="40" width="${w}" height="10" fill="${H.shade(walk, -0.25)}"/>
      <rect x="0" y="50" width="${w}" height="${road}" fill="${asphalt}"/>
`;
    for (let x = 0; x < w; x += 110) s += `<rect x="${x}" y="${50 + road / 2 - 4}" width="60" height="8" fill="#f4f1e8"/>`;
    s += `<rect x="0" y="${50 + road}" width="${w}" height="40" fill="${walk}"/>`;
    if (sp > 0) {
      const poles = [];
      for (let x = sp / 2; x < w + sp; x += sp) poles.push(x);
      for (const x of poles) s += `<rect x="${x - 8}" y="${-ph}" width="16" height="${ph + 6}" fill="#9aa0ab"/><rect x="${x - 50}" y="${-ph + 40}" width="100" height="9" fill="#7d838f"/><rect x="${x - 36}" y="${-ph + 80}" width="72" height="8" fill="#7d838f"/>`;
      for (const [y0, dx, sag] of [[-ph + 44, -44, 60], [-ph + 44, 44, 44], [-ph + 84, 0, 52]]) {
        for (let i = 0; i + 1 < poles.length; i++) s += `<path d="M${poles[i] + dx},${y0} Q${(poles[i] + poles[i + 1]) / 2 + dx},${y0 + sag} ${poles[i + 1] + dx},${y0}" stroke="#2c2f38" stroke-width="2.5" fill="none"/>`;
        s += `<path d="M${poles[0] - sp + dx},${y0} Q${poles[0] - sp / 2 + dx},${y0 + sag} ${poles[0] + dx},${y0}" stroke="#2c2f38" stroke-width="2.5" fill="none"/>`;
      }
    }
    const svg = H.svg(s, w, road + 90);
    return { el: svg, w, h: road + 90 };
  },
};

// ------------------------------------------------------------------ train: side view commuter train (JR-like)
// cars (3), color, stripe, speed (px/s, from `at`), rail (true), viaduct (true: elevated track; viaduct_h, span [x0, x1]). Origin bottom-left (rail level).
export const train = {
  origin: "bottom-left",
  create(p, H) {
    const cars = p.cars ?? 3, cl = 520, chh = 150, gap = 14;
    const body = H.col(p.color ?? "#eef1f4"), stripe = H.col(p.stripe ?? "#2fa84f");
    const w = cars * (cl + gap), h = chh + 40;
    let s = p.rail === false ? "" : `<rect x="-2000" y="${h - 10}" width="${w + 4000}" height="10" fill="#6d727e"/>`;
    if (p.viaduct) {                                      // elevated concrete track with pillars (span: x range, height)
      const vh = p.viaduct_h ?? 300, [vx0, vx1] = p.span ?? [-2000, w + 2000];
      s += `<rect x="${vx0}" y="${h}" width="${vx1 - vx0}" height="34" fill="#b9bec8"/><rect x="${vx0}" y="${h + 30}" width="${vx1 - vx0}" height="8" fill="#9aa0ab"/>`;
      for (let x = vx0 + 150; x < vx1; x += 420) s += `<rect x="${x}" y="${h + 34}" width="46" height="${vh}" fill="#aab0bb"/><rect x="${x - 14}" y="${h + 34}" width="74" height="16" fill="#9aa0ab"/>`;
    }
    for (let i = 0; i < cars; i++) {
      const x = i * (cl + gap);
      const nose = i === cars - 1 ? 40 : 0;
      s += `<path d="M${x},${10} H${x + cl - nose} Q${x + cl},${10} ${x + cl},${50} V${chh + 10} H${x} Z" fill="${body}"/>
        <rect x="${x}" y="${chh - 22}" width="${cl}" height="16" fill="${stripe}"/>
        <rect x="${x}" y="${10}" width="${cl}" height="8" fill="${H.shade(body, -0.1)}"/>`;
      for (let k = 0; k < 6; k++) {
        const wx = x + 26 + k * 82;
        if (k === 2 || k === 4) { s += `<rect x="${wx}" y="40" width="44" height="${chh - 44}" rx="4" fill="${H.shade(body, -0.12)}"/><rect x="${wx + 6}" y="48" width="14" height="40" rx="3" fill="#2c3e5c"/><rect x="${wx + 24}" y="48" width="14" height="40" rx="3" fill="#2c3e5c"/>`; continue; }
        s += `<rect x="${wx}" y="44" width="62" height="46" rx="6" fill="#2c3e5c"/><path d="M${wx + 10},84 L${wx + 26},50" stroke="#ffffff" stroke-opacity="0.35" stroke-width="5"/>`;
      }
      s += `<rect x="${x + 40}" y="${chh + 10}" width="110" height="20" rx="6" fill="#3a3e48"/><rect x="${x + cl - 150}" y="${chh + 10}" width="110" height="20" rx="6" fill="#3a3e48"/>
        <circle cx="${x + 70}" cy="${chh + 26}" r="12" fill="#2a2d35"/><circle cx="${x + 120}" cy="${chh + 26}" r="12" fill="#2a2d35"/>
        <circle cx="${x + cl - 120}" cy="${chh + 26}" r="12" fill="#2a2d35"/><circle cx="${x + cl - 70}" cy="${chh + 26}" r="12" fill="#2a2d35"/>`;
      if (i === 0) s += `<path d="M${x + 200},10 L${x + 230},-26 L${x + 290},-26" stroke="#3a3e48" stroke-width="4" fill="none"/>`;
    }
    const svg = H.svg(`<g class="tr">${s}</g>`, w, h);
    const g = svg.querySelector(".tr");
    return { el: svg, w, h, update(t, it) { if (p.speed) g.setAttribute("transform", `translate(${Math.max(0, t - (p.start ?? it.at)) * p.speed},0)`); } };
  },
};

// ------------------------------------------------------------------ tree: sakura | round | pine | bush
// h (height), kind, color (crown base), seed, sway (degrees)
export const tree = {
  origin: "bottom",
  create(p, H) {
    const kind = p.kind ?? "sakura", hgt = p.h ?? 420, rnd = H.rng(p.seed ?? 9);
    const w = hgt * 0.95, trunk = H.col(p.trunk ?? "#6b4a3a");
    const pal = { sakura: ["#ffc6d3", "#ffb2c5", "#ff9fb6", "#ffe0e8"], round: ["#5fae5a", "#4c9a4c", "#73c068", "#8fd47e"], bush: ["#5fae5a", "#4c9a4c", "#73c068", "#8fd47e"], pine: ["#2f6b4a", "#3a7d57", "#255a3e", "#4c9068"] }[kind] ?? ["#5fae5a", "#4c9a4c", "#73c068", "#8fd47e"];
    const cols = p.color ? [H.col(p.color), H.shade(H.col(p.color), -0.1), H.shade(H.col(p.color), 0.15), H.shade(H.col(p.color), 0.3)] : pal;
    let trunkS = "", crown = "";
    const cx = w / 2, ty = hgt * (kind === "bush" ? 0.9 : 0.42);
    if (kind === "pine") {
      trunkS = `<rect x="${cx - 12}" y="${hgt * 0.7}" width="24" height="${hgt * 0.3}" fill="${trunk}"/>`;
      for (let i = 0; i < 4; i++) { const y0 = hgt * (0.08 + i * 0.18), ww = w * (0.28 + i * 0.12); crown += `<path d="M${cx},${y0} L${cx + ww},${y0 + hgt * 0.3} L${cx - ww},${y0 + hgt * 0.3} Z" fill="${cols[i % 3]}"/>`; }
    } else {
      if (kind !== "bush") trunkS = `<path d="M${cx - 16},${hgt} Q${cx - 6},${hgt * 0.7} ${cx - 10},${ty} L${cx + 10},${ty} Q${cx + 8},${hgt * 0.7} ${cx + 18},${hgt} Z" fill="${trunk}"/>
        <path d="M${cx - 6},${hgt * 0.62} Q${cx - 50},${hgt * 0.5} ${cx - 80},${hgt * 0.4}" stroke="${trunk}" stroke-width="12" fill="none" stroke-linecap="round"/>
        <path d="M${cx + 6},${hgt * 0.56} Q${cx + 46},${hgt * 0.45} ${cx + 86},${hgt * 0.36}" stroke="${trunk}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
      const n = kind === "bush" ? 9 : 16, cy = kind === "bush" ? hgt * 0.62 : hgt * 0.3, rx = w * 0.42, ry = kind === "bush" ? hgt * 0.32 : hgt * 0.24;
      const blobs = Array.from({ length: n }, () => { const a = rnd() * 6.283, r = Math.sqrt(rnd()); return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, (kind === "bush" ? 0.22 : 0.17) * w * (0.7 + rnd() * 0.6)]; });
      blobs.sort((a, b) => a[1] - b[1]);
      crown = blobs.map((b, i) => `<circle cx="${b[0]}" cy="${b[1]}" r="${b[2]}" fill="${cols[i % 3]}"/>`).join("")
        + blobs.filter((_, i) => i % 3 === 0).map((b) => `<circle cx="${b[0] - b[2] * 0.3}" cy="${b[1] - b[2] * 0.35}" r="${b[2] * 0.4}" fill="${cols[3]}" opacity="0.7"/>`).join("");
      if (kind === "sakura") crown += Array.from({ length: 26 }, () => `<circle cx="${cx + (rnd() - 0.5) * rx * 2}" cy="${cy + (rnd() - 0.5) * ry * 2}" r="${3 + rnd() * 4}" fill="#ffffff" opacity="0.75"/>`).join("");
    }
    const svg = H.svg(`${trunkS}<g class="cr">${crown}</g>`, w, hgt);
    const cr = svg.querySelector(".cr");
    const sw = p.sway ?? 1.5, ph = rnd() * 6;
    return { el: svg, w, h: hgt, update(t) { cr.setAttribute("transform", `rotate(${Math.sin(t * 0.9 + ph) * sw} ${cx} ${ty})`); } };
  },
};

// ------------------------------------------------------------------ streetlight: pole + lamp + light cone (on: track 0..1)
export const streetlight = {
  origin: "bottom",
  create(p, H) {
    const h = p.h ?? 520, w = 300, lc = H.col(p.light ?? "#ffd98a"), id = H.uid("sl");
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lc}" stop-opacity="0.55"/><stop offset="1" stop-color="${lc}" stop-opacity="0"/></linearGradient></defs>
      <path class="cone" d="M${w / 2 + 60},${44} L${w / 2 + 170},${h} L${w / 2 - 50},${h} Z" fill="url(#${id})"/>
      <rect x="${w / 2 - 7}" y="20" width="14" height="${h - 20}" fill="${H.col(p.color ?? "#4a4f5c")}"/>
      <path d="M${w / 2},${24} Q${w / 2 + 10},0 ${w / 2 + 60},14" stroke="${H.col(p.color ?? "#4a4f5c")}" stroke-width="10" fill="none"/>
      <rect x="${w / 2 + 36}" y="10" width="50" height="16" rx="6" fill="${H.col(p.color ?? "#4a4f5c")}"/>
      <ellipse class="lamp" cx="${w / 2 + 61}" cy="30" rx="22" ry="8" fill="${lc}" style="filter:drop-shadow(0 0 14px ${lc})"/>`, w, h);
    const cone = svg.querySelector(".cone"), lamp = svg.querySelector(".lamp");
    return { el: svg, w, h, update(t, it) { const on = it.v("on", 1); cone.setAttribute("opacity", on); lamp.setAttribute("opacity", 0.25 + 0.75 * on); } };
  },
};

// ground: a filled band (w, h, color | [top, bottom] gradient), optional grass tufts
export const ground = {
  create(p, H) {
    const w = p.w ?? 3000, h = p.h ?? 600, id = H.uid("gr");
    const c = Array.isArray(p.color) ? p.color : [p.color ?? "#7bb661", H.shade(H.col(p.color ?? "#7bb661"), -0.2)];
    const rnd = H.rng(p.seed ?? 1);
    const tufts = p.grass ? Array.from({ length: Math.floor(w / 60) }, () => { const x = rnd() * w, y = 20 + rnd() * (h - 40); return `<path d="M${x},${y} l6,-16 l4,14 l6,-18 l4,20 Z" fill="${H.shade(H.col(c[0]), -0.15)}"/>`; }).join("") : "";
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.col(c[0])}"/><stop offset="1" stop-color="${H.col(c[1])}"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>${tufts}`, w, h);
    return { el: svg, w, h };
  },
};
