// Interior actors: room, blackboard, desk, classroom, lockers, shoe, tray, prop, window_grid.

// ------------------------------------------------------------------ room: back wall + floor in soft perspective
// w, h, wall, floor, floor_y, windows: [{x, y, w, h}] (show sky: hour), board (notice board), clock: {x, y, time},
// cubbies: {x, y, cols, rows}, lights (ceiling light glow)
export const room = {
  async create(p, H) {
    const w = p.w ?? H.W, h = p.h ?? H.H, fy = p.floor_y ?? 1180;
    const wall = H.col(p.wall ?? "#f1e7d6"), floor = H.col(p.floor ?? "#c9935f");
    const id = H.uid("fl"), vx = w / 2, vy = fy - 900;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(floor, -0.12)}"/><stop offset="1" stop-color="${floor}"/></linearGradient></defs>
      <rect width="${w}" height="${fy}" fill="${wall}"/><rect y="${fy}" width="${w}" height="${h - fy}" fill="url(#${id})"/>`;
    for (let i = -10; i <= 10; i++) {                       // planks converging to a vanishing point
      const x0 = vx + i * 130;
      const k = (h - vy) / (fy - vy);
      s += `<path d="M${vx + (x0 - vx)},${fy} L${vx + (x0 - vx) * k},${h}" stroke="${H.shade(floor, -0.22)}" stroke-width="2" opacity="0.5"/>`;
    }
    for (let j = 1; j < 6; j++) { const y = fy + (h - fy) * Math.pow(j / 6, 1.6); s += `<rect x="0" y="${y}" width="${w}" height="2" fill="${H.shade(floor, -0.2)}" opacity="0.35"/>`; }
    s += `<rect y="${fy - 18}" width="${w}" height="18" fill="${H.shade(wall, -0.25)}"/>`;
    for (const wd of p.windows || []) {
      s += `<rect class="rw" x="${wd.x}" y="${wd.y}" width="${wd.w}" height="${wd.h}" fill="#9fd0f2" stroke="#ffffff" stroke-width="10"/>
        <path d="M${wd.x + wd.w / 2},${wd.y} V${wd.y + wd.h} M${wd.x},${wd.y + wd.h / 2} H${wd.x + wd.w}" stroke="#ffffff" stroke-width="6"/>
        <rect x="${wd.x - 26}" y="${wd.y - 16}" width="34" height="${wd.h + 30}" rx="8" fill="${H.col(p.curtain ?? "#e9dcc0")}"/>
        <rect x="${wd.x + wd.w - 8}" y="${wd.y - 16}" width="34" height="${wd.h + 30}" rx="8" fill="${H.col(p.curtain ?? "#e9dcc0")}"/>`;
    }
    if (p.board) {
      const b = p.board;
      s += `<rect x="${b.x}" y="${b.y}" width="${b.w ?? 300}" height="${b.h ?? 200}" rx="6" fill="#c89a64"/><rect x="${b.x + 10}" y="${b.y + 10}" width="${(b.w ?? 300) - 20}" height="${(b.h ?? 200) - 20}" fill="#e7cfa8"/>`;
      const rnd = H.rng(3);
      for (let i = 0; i < 5; i++) s += `<rect x="${b.x + 22 + rnd() * ((b.w ?? 300) - 110)}" y="${b.y + 22 + rnd() * ((b.h ?? 200) - 100)}" width="${60 + rnd() * 30}" height="${50 + rnd() * 30}" fill="${["#ffffff", "#fff3b0", "#d8ecff", "#ffe0e8"][i % 4]}" transform="rotate(${(rnd() - 0.5) * 8})"/>`;
    }
    if (p.cubbies) {
      const c = p.cubbies, cw = c.cw ?? 90, chh = c.ch ?? 80, rnd = H.rng(8);
      s += `<rect x="${c.x - 8}" y="${c.y - 8}" width="${c.cols * cw + 16}" height="${c.rows * chh + 16}" fill="#b8875a"/>`;
      for (let r = 0; r < c.rows; r++) for (let k = 0; k < c.cols; k++) {
        const x = c.x + k * cw, y = c.y + r * chh;
        s += `<rect x="${x + 4}" y="${y + 4}" width="${cw - 8}" height="${chh - 8}" fill="#6e4b33"/>`;
        if (rnd() < 0.7) s += `<rect x="${x + 14}" y="${y + chh - 40}" width="${cw - 28}" height="32" rx="6" fill="${["#c4283a", "#2b2f3a", "#3a5fb8", "#e8a33a"][Math.floor(rnd() * 4)]}"/>`;
      }
    }
    const svg = H.svg(s, w, h);
    let el = svg;
    if (p.clock) {
      el = H.div();
      el.appendChild(svg);
      await H.child({ actor: "clock", r: 60, ...p.clock }, el);
    }
    const rw = [...svg.querySelectorAll(".rw")];
    return {
      el, w, h,
      update(t, it) {
        if (!it.tracks.hour && p.hour == null) return;
        const hr = it.v("hour", 12);
        rw.forEach((e) => e.setAttribute("fill", hr > 19 || hr < 5.5 ? "#1c2550" : hr > 17 ? "#f2b08a" : "#9fd0f2"));
      },
    };
  },
};

// ------------------------------------------------------------------ blackboard: green board with chalk writing
// w, h, color, lines: [{text, x, y, size, color, at, speed (chars/s), font, align}], date (text at the right edge), erase_at
export const blackboard = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 420, fid = H.uid("chalk");
    const el = H.div(`width:${w}px;height:${h}px`);
    el.innerHTML = `<svg width="0" height="0" style="position:absolute"><filter id="${fid}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
        <feDisplacementMap in="SourceGraphic" scale="2.5"/><feComposite operator="in" in2="SourceGraphic"/></filter></svg>
      <div style="position:absolute;inset:0;border-radius:10px;background:#8a5c38;box-shadow:0 18px 40px rgba(0,0,0,.25)"></div>
      <div style="position:absolute;left:18px;top:18px;right:18px;bottom:18px;border-radius:4px;background:radial-gradient(ellipse at 40% 35%, ${H.col(p.color ?? "#356b52")}, ${H.shade(H.col(p.color ?? "#356b52"), -0.25)});overflow:hidden" class="bd"></div>
      <div style="position:absolute;left:60px;right:60px;bottom:-4px;height:16px;border-radius:4px;background:#7a5030"></div>
      <div style="position:absolute;left:${w * 0.7}px;bottom:4px;width:46px;height:9px;border-radius:3px;background:#fff"></div>
      <div style="position:absolute;left:${w * 0.7 + 60}px;bottom:2px;width:70px;height:16px;border-radius:3px;background:#3a3f55"></div>`;
    const bd = el.querySelector(".bd");
    const lines = (p.lines || (p.text ? [{ text: p.text }] : [])).map((l, i) => {
      const d = document.createElement("div");
      const size = l.size ?? 64;
      d.style.cssText = `position:absolute;left:${l.x ?? 40}px;top:${l.y ?? 30 + i * size * 1.3}px;font-family:"${H.fonts[l.font] ?? l.font ?? "Caveat"}","Caveat","Klee","Rounded",sans-serif;
        font-weight:${l.weight ?? 700};font-size:${size}px;line-height:1.15;color:${H.col(l.color ?? "#f6f6ee")};white-space:pre;filter:url(#${fid});opacity:.95;${l.align === "center" ? `width:${w - 36 - 2 * (l.x ?? 40)}px;text-align:center` : ""}`;
      const chars = [...String(l.text)].map((c) => { const s = document.createElement("span"); s.textContent = c; d.appendChild(s); return s; });
      bd.appendChild(d);
      return { l, chars };
    });
    if (p.date) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;right:30px;top:24px;writing-mode:vertical-rl;font-family:Klee,Rounded;font-weight:600;font-size:34px;color:#f6f6ee;filter:url(#${fid});opacity:.85;line-height:1.3`;
      d.textContent = p.date;
      bd.appendChild(d);
    }
    return {
      el, w, h,
      update(t, it) {
        const er = p.erase_at != null ? H.P(t, p.erase_at, 0.6) : 0;
        for (const { l, chars } of lines) {
          const at = l.at ?? it.at, sp = l.speed ?? 9;
          chars.forEach((c, i) => { c.style.opacity = t >= at + i / sp ? 1 - er : 0; });
        }
      },
    };
  },
};

// ------------------------------------------------------------------ desk: school desk (front view) with the chair behind it
// part: desk | chair | both (default desk); scale via item scale. Origin: bottom center (floor).
export const desk = {
  origin: "bottom",
  create(p, H) {
    const w = 210, h = 200, wood = H.col(p.wood ?? "#d9a96b"), metal = H.col(p.metal ?? "#8d96a6");
    const part = p.part ?? "desk";
    let s = "";
    if (part !== "desk") s += `<rect x="${w / 2 - 70}" y="10" width="140" height="70" rx="10" fill="${wood}"/><rect x="${w / 2 - 70}" y="10" width="140" height="10" rx="4" fill="${H.shade(wood, 0.15)}"/>
      <rect x="${w / 2 - 66}" y="80" width="8" height="${h - 80}" fill="${metal}"/><rect x="${w / 2 + 58}" y="80" width="8" height="${h - 80}" fill="${metal}"/>`;
    if (part !== "chair") s += `<rect x="12" y="${h - 112}" width="${w - 24}" height="26" rx="5" fill="${wood}"/><rect x="12" y="${h - 112}" width="${w - 24}" height="7" rx="3" fill="${H.shade(wood, 0.2)}"/>
      <rect x="20" y="${h - 86}" width="${w - 40}" height="36" rx="3" fill="${H.shade(metal, -0.25)}"/>
      <rect x="22" y="${h - 86}" width="9" height="86" fill="${metal}"/><rect x="${w - 31}" y="${h - 86}" width="9" height="86" fill="${metal}"/>
      <rect x="22" y="${h - 22}" width="${w - 44}" height="6" fill="${metal}"/>`;
    if (p.bag && part !== "chair") s += `<rect x="${w - 24}" y="${h - 76}" width="30" height="38" rx="6" fill="${H.col(p.bag === true ? "#2b2f3a" : p.bag)}"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ classroom: rows of desks with students (front view)
// rows, cols, students (true), uniform: mixed|sailor|gakuran|blazer|kyushoku|pe, empty: [[r, c]...],
// pose (track for everyone, each student starts a little later: stagger), face (track), seed,
// front_y / back_y (row placement), spread (x spacing at the front). Anchor seat:r,c (student's head)
export const classroom = {
  async create(p, H, item) {
    const rows = p.rows ?? 3, cols = p.cols ?? 4, rnd = H.rng(p.seed ?? 12);
    const el = H.div();
    const fy = p.front_y ?? 1650, by = p.back_y ?? 1180, spread = p.spread ?? 250;
    const empty = new Set((p.empty || []).map((x) => x.join(",")));
    const seats = [];
    const poseSpec = item.spec.pose ?? "sit", faceSpec = item.spec.face ?? "smile";
    const shift = (spec, d) => (H.isTrack(spec) ? (Array.isArray(spec) ? spec : [spec]).map((k) => ({ ...k, at: k.at + d })) : spec);
    for (let r = 0; r < rows; r++) {                         // back row first (drawn behind)
      const u = rows === 1 ? 1 : r / (rows - 1);
      const y = by + (fy - by) * u, sc = (p.back_scale ?? 0.62) + (1 - (p.back_scale ?? 0.62)) * u;
      for (let c = 0; c < cols; c++) {
        const x = H.W / 2 + (c - (cols - 1) / 2) * spread * sc;
        seats.push({ r, c, x, y, sc });
      }
    }
    const uni = p.uniform ?? "mixed";
    let k = 0;
    for (const st of seats) {
      await H.child({ actor: "desk", part: "chair", x: st.x, y: st.y - 70 * st.sc, scale: st.sc }, el);
      if (p.students !== false && !empty.has(`${st.r},${st.c}`)) {
        const girl = uni === "sailor" || uni === "blazer_skirt" || (uni === "mixed" && (st.r + st.c + (p.seed ?? 0)) % 2 === 0);
        const outfit = uni === "mixed" ? (girl ? "sailor" : "gakuran") : uni;
        const d = (p.stagger ?? 0.22) * rnd();
        st.item = await H.child({ actor: "person", x: st.x, y: st.y - 26 * st.sc, scale: st.sc * (p.person_scale ?? 0.92), seed: k * 7 + (p.seed ?? 0),
          look: { outfit, hair: girl ? ["bob", "long", "ponytail", "twintails"][k % 4] : ["short", "spiky", "side", "buzz"][k % 4], ...(p.look || {}) },
          pose: shift(poseSpec, d), face: shift(faceSpec, d * 0.5), talk: p.talk }, el);
        k += 1;
      }
      await H.child({ actor: "desk", part: "desk", x: st.x, y: st.y + 30 * st.sc, scale: st.sc, bag: rnd() < 0.5 }, el);
    }
    return {
      el,
      anchor(name, args) {
        if (name !== "seat") return null;
        const st = seats.find((s) => s.r === args[0] && s.c === args[1]);
        return st ? [st.x, st.y - 330 * st.sc] : null;
      },
    };
  },
};

// ------------------------------------------------------------------ shoe: sneaker | uwabaki (indoor school slipper) | loafer
// color, toe (uwabaki toe band color), w. Side view, origin bottom.
export const shoe = {
  origin: "bottom",
  create(p, H) {
    const kind = p.kind ?? "uwabaki", w = p.w ?? 240, h = w * 0.42, c = H.col(p.color ?? (kind === "sneaker" ? "#e2463f" : kind === "loafer" ? "#3a2a26" : "#fbfbf6"));
    let s;
    if (kind === "uwabaki") {
      const toe = H.col(p.toe ?? "#3a6fd8");
      s = `<path d="M10,${h - 12} Q4,${h * 0.45} ${w * 0.22},${h * 0.35} L${w * 0.5},${h * 0.32} Q${w * 0.92},${h * 0.3} ${w - 6},${h * 0.7} L${w - 6},${h - 12} Z" fill="${c}" stroke="#d9dde4" stroke-width="3"/>
        <path d="M${w * 0.62},${h * 0.34} Q${w * 0.93},${h * 0.32} ${w - 6},${h * 0.7} L${w - 6},${h - 12} L${w * 0.62},${h - 12} Z" fill="${toe}"/>
        <rect x="${w * 0.25}" y="${h * 0.42}" width="${w * 0.3}" height="${h * 0.16}" rx="6" fill="${toe}" opacity="0.9"/>
        <rect x="6" y="${h - 16}" width="${w - 10}" height="16" rx="7" fill="${toe}"/>`;
    } else if (kind === "sneaker") {
      s = `<path d="M10,${h - 12} Q4,${h * 0.3} ${w * 0.25},${h * 0.18} L${w * 0.45},${h * 0.2} Q${w * 0.62},${h * 0.42} ${w * 0.8},${h * 0.5} Q${w},${h * 0.6} ${w - 4},${h - 12} Z" fill="${c}"/>
        <path d="M${w * 0.3},${h * 0.3} L${w * 0.55},${h * 0.5} M${w * 0.36},${h * 0.24} L${w * 0.6},${h * 0.44}" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <path d="M${w * 0.12},${h * 0.55} Q${w * 0.4},${h * 0.75} ${w * 0.86},${h * 0.62}" stroke="#ffffff" stroke-width="7" fill="none" opacity="0.9"/>
        <rect x="4" y="${h - 18}" width="${w - 6}" height="18" rx="8" fill="#f4f4f2"/>`;
    } else {
      s = `<path d="M10,${h - 10} Q6,${h * 0.45} ${w * 0.25},${h * 0.4} L${w * 0.55},${h * 0.38} Q${w * 0.95},${h * 0.4} ${w - 6},${h - 10} Z" fill="${c}"/>
        <rect x="${w * 0.42}" y="${h * 0.42}" width="${w * 0.2}" height="${h * 0.1}" rx="4" fill="${H.shade(c, 0.25)}"/><rect x="6" y="${h - 12}" width="${w - 10}" height="12" rx="5" fill="#1d1715"/>`;
    }
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ lockers: getabako shoe cubbies (rows x cols)
// cell [w, h], fill (0..1 occupied), highlight: {row, col, at, color, label}, swap: {row, col, at} (uwabaki -> sneakers)
export const lockers = {
  origin: "center",
  create(p, H) {
    const R = p.rows ?? 5, C = p.cols ?? 5, [cw, ch] = p.cell ?? [150, 110], rnd = H.rng(p.seed ?? 21);
    const w = C * cw + 40, h = R * ch + 60, wood = H.col(p.wood ?? "#c8975f");
    const cellXY = (r, c) => [20 + (c - 0.5) * cw, 30 + (r - 0.5) * ch];
    let s = `<rect x="0" y="0" width="${w}" height="${h}" rx="8" fill="${wood}"/><rect x="0" y="0" width="${w}" height="16" rx="6" fill="${H.shade(wood, 0.15)}"/>`;
    const shoesIn = (x, y, kind, color) => {
      const sw = cw * 0.36, sh = sw * 0.42;
      const one = (dx) => kind === "uwabaki"
        ? `<g transform="translate(${x + dx - sw / 2},${y + ch * 0.36 - sh})"><path d="M2,${sh - 3} Q0,${sh * 0.4} ${sw * 0.2},${sh * 0.3} L${sw * 0.5},${sh * 0.28} Q${sw * 0.9},${sh * 0.3} ${sw},${sh * 0.7} L${sw},${sh - 3} Z" fill="#fbfbf6"/><rect x="${sw * 0.62}" y="${sh * 0.35}" width="${sw * 0.38}" height="${sh * 0.62}" rx="3" fill="${color}"/><rect x="0" y="${sh - 5}" width="${sw}" height="5" rx="2" fill="${color}"/></g>`
        : `<g transform="translate(${x + dx - sw / 2},${y + ch * 0.36 - sh})"><path d="M2,${sh - 3} Q0,${sh * 0.3} ${sw * 0.25},${sh * 0.18} L${sw * 0.45},${sh * 0.2} Q${sw * 0.7},${sh * 0.45} ${sw},${sh * 0.62} L${sw},${sh - 3} Z" fill="${color}"/><rect x="0" y="${sh - 6}" width="${sw}" height="6" rx="3" fill="#f2f2f0"/></g>`;
      return one(-sw * 0.52) + one(sw * 0.52);
    };
    const cells = [];
    for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) {
      const [x, y] = cellXY(r, c);
      s += `<rect x="${x - cw / 2 + 8}" y="${y - ch / 2 + 6}" width="${cw - 16}" height="${ch - 14}" rx="4" fill="#5d3d28"/>
        <rect x="${x - cw / 2 + 8}" y="${y - ch / 2 + 6}" width="${cw - 16}" height="10" fill="#4a3020"/>`;
      const sw = p.swap && p.swap.row === r && p.swap.col === c;
      const occupied = sw || rnd() < (p.fill ?? 0.8);
      const kind = rnd() < 0.15 ? "sneaker" : "uwabaki";
      const sc = ["#e2463f", "#3a6fd8", "#2b2f3a", "#e8a33a", "#3aa86a"][Math.floor(rnd() * 5)];
      if (occupied && !sw) s += shoesIn(x, y, kind, kind === "uwabaki" ? H.col(p.toe ?? "#3a6fd8") : sc);
      if (sw) s += `<g class="sw-a">${shoesIn(x, y, "uwabaki", H.col(p.toe ?? "#3a6fd8"))}</g><g class="sw-b">${shoesIn(x, y, "sneaker", H.col(p.swap.color ?? "#e2463f"))}</g>`;
      cells.push([r, c]);
      s += `<rect x="${x - cw / 2 + 4}" y="${y + ch / 2 - 10}" width="${cw - 8}" height="10" fill="${H.shade(wood, -0.1)}"/>`;
    }
    s += `<g class="hl"></g>`;
    const svg = H.svg(s, w, h);
    const hl = svg.querySelector(".hl"), swA = svg.querySelector(".sw-a"), swB = svg.querySelector(".sw-b");
    if (p.highlight) {
      const [x, y] = cellXY(p.highlight.row, p.highlight.col), col = H.col(p.highlight.color ?? "#ffe14a");
      hl.innerHTML = `<rect x="${x - cw / 2 + 2}" y="${y - ch / 2}" width="${cw - 4}" height="${ch}" rx="8" fill="none" stroke="${col}" stroke-width="6" style="filter:drop-shadow(0 0 10px ${col})"/>
        ${p.highlight.label ? `<g transform="translate(${x},${y + ch / 2 + 30})"><rect x="-56" y="-24" width="112" height="48" rx="12" fill="rgba(20,16,10,.85)" stroke="${col}" stroke-width="3"/><text y="11" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="28" fill="#fff">${p.highlight.label}</text></g>` : ""}`;
    }
    return {
      el: svg, w, h,
      update(t, it) {
        if (p.highlight) { const k = H.P(t, p.highlight.at ?? it.at, 0.3); hl.style.opacity = k; hl.style.display = k > 0 ? "" : "none"; }
        if (p.swap) { const k = H.P(t, p.swap.at ?? 1e9, 0.4); swA.style.opacity = 1 - k; swB.style.opacity = k; swB.setAttribute("transform", `translate(0,${(1 - H.E.outBack(k)) * -30})`); }
      },
      anchor(name, args) { return name === "cell" ? cellXY(args[0], args[1]) : null; },
    };
  },
};

// ------------------------------------------------------------------ tray: school lunch (kyushoku), top-down view
// items: rice, soup, main (fish|karaage|curry), salad, milk, chopsticks, bread, fruit; show: [{item, at}] or at + stagger
export const tray = {
  origin: "center",
  create(p, H) {
    const w = 720, h = 500;
    const items = {
      rice: [200, 330, `<circle r="92" fill="#ffffff" stroke="#e3e6ec" stroke-width="6"/><circle r="74" fill="#fbfaf2"/><circle cx="-20" cy="-10" r="14" fill="#ffffff"/><circle cx="18" cy="8" r="10" fill="#ffffff"/>`],
      soup: [420, 330, `<circle r="86" fill="#7a3b2a"/><circle r="70" fill="#c98a4a"/><circle r="70" fill="url(#soupg)"/><rect x="-24" y="-8" width="18" height="18" rx="3" fill="#f6f2e2"/><rect x="10" y="10" width="16" height="16" rx="3" fill="#f6f2e2"/><path d="M-30,24 q10,-8 22,0" stroke="#3a7a3a" stroke-width="6" fill="none"/>`],
      main: [200, 140, `<ellipse rx="128" ry="74" fill="#ffffff" stroke="#e3e6ec" stroke-width="6"/><path d="M-80,6 Q-40,-38 30,-26 Q70,-18 86,0 Q70,18 30,26 Q-40,38 -80,6 Z" fill="#c9884a"/><path d="M86,0 L112,-20 L108,0 L112,20 Z" fill="#b47038"/><path d="M-30,-12 L-10,14 M0,-16 L20,12 M30,-14 L46,10" stroke="#8a5428" stroke-width="5"/>`],
      salad: [430, 140, `<circle r="70" fill="#ffffff" stroke="#e3e6ec" stroke-width="6"/><circle cx="-16" cy="-8" r="26" fill="#7cc46a"/><circle cx="16" cy="6" r="24" fill="#5fae5a"/><circle cx="4" cy="-22" r="12" fill="#e2463f"/><rect x="-28" y="12" width="26" height="9" rx="4" fill="#f2a43a"/>`],
      milk: [610, 170, `<rect x="-42" y="-80" width="84" height="150" rx="6" fill="#ffffff" stroke="#e3e6ec" stroke-width="4"/><path d="M-42,-80 L0,-110 L42,-80 Z" fill="#f4f6fb" stroke="#e3e6ec" stroke-width="4"/><rect x="-42" y="-30" width="84" height="44" fill="#3a6fd8"/><text y="0" text-anchor="middle" font-family="Rounded" font-weight="800" font-size="26" fill="#fff">牛乳</text>`],
      chopsticks: [380, 450, `<rect x="-160" y="-8" width="320" height="8" rx="4" fill="#b47038"/><rect x="-160" y="6" width="320" height="8" rx="4" fill="#b47038"/>`],
      bread: [610, 380, `<rect x="-60" y="-70" width="120" height="140" rx="40" fill="#e0a95e"/><rect x="-46" y="-56" width="92" height="112" rx="32" fill="#f2c98a"/>`],
      fruit: [610, 380, `<circle r="52" fill="#f2a43a"/><path d="M0,-52 q8,-16 22,-14" stroke="#5a8a3a" stroke-width="6" fill="none"/>`],
    };
    const list = p.items ?? ["rice", "soup", "main", "salad", "milk", "chopsticks"];
    const svg = H.svg(`<defs><radialGradient id="soupg"><stop offset="0.6" stop-color="#c98a4a" stop-opacity="0"/><stop offset="1" stop-color="#7a3b2a" stop-opacity="0.5"/></radialGradient></defs>
      <rect x="0" y="0" width="${w}" height="${h}" rx="34" fill="${H.col(p.color ?? "#f0c27f")}"/><rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="26" fill="${H.shade(H.col(p.color ?? "#f0c27f"), 0.12)}"/>
      ${list.map((k) => `<g class="it" data-k="${k}" transform="translate(${items[k][0]},${items[k][1]})"><g class="in">${items[k][2]}</g></g>`).join("")}`, w, h);
    const els = [...svg.querySelectorAll(".it")];
    const show = p.show;
    return {
      el: svg, w, h,
      update(t, it) {
        els.forEach((e, i) => {
          const k = e.dataset.k;
          const at = Array.isArray(show) ? (show.find((s) => s.item === k)?.at ?? -1e9) : (p.at0 ?? it.at) + i * (p.stagger ?? 0);
          const f = H.P(t, at, 0.35);
          e.firstChild.setAttribute("transform", `scale(${H.E.outBack(f)})`);
          e.style.display = f > 0 ? "" : "none";
        });
      },
      anchor(name) { return items[name] ? [items[name][0], items[name][1]] : null; },
    };
  },
};

// ------------------------------------------------------------------ prop: small objects. kind: bucket|broom|mop|rag|book|bento|onigiri|milk|bell|ball|bat|trumpet|shinai|pot|cart|plant|sparkle|heart|question
// size (scale-free: use item scale), color. Origin bottom.
export const prop = {
  origin: "bottom",
  create(p, H) {
    const c = p.color ? H.col(p.color) : null;
    const K = {
      bucket: [140, 150, `<path d="M14,20 L126,20 L112,150 L28,150 Z" fill="${c ?? "#3a7bd9"}"/><rect x="8" y="12" width="124" height="16" rx="6" fill="${H.shade(c ?? "#3a7bd9", 0.15)}"/><path d="M20,20 Q70,-30 120,20" stroke="#8d96a6" stroke-width="6" fill="none"/><ellipse cx="70" cy="24" rx="52" ry="7" fill="#9fd2f2"/>`],
      broom: [90, 420, `<rect x="41" y="0" width="8" height="330" rx="4" fill="#b88a57"/><path d="M15,330 L75,330 L90,420 L0,420 Z" fill="${c ?? "#d8b46a"}"/><path d="M20,350 H70 M14,380 H76" stroke="#b48a46" stroke-width="5"/>`],
      mop: [120, 420, `<rect x="56" y="0" width="8" height="350" rx="4" fill="#9aa3b5"/><rect x="10" y="346" width="100" height="18" rx="6" fill="${c ?? "#3d7bd9"}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${12 + i * 11}" y="360" width="8" height="60" rx="4" fill="#e9eef8"/>`).join("")}`],
      rag: [110, 46, `<rect x="0" y="8" width="110" height="38" rx="6" fill="${c ?? "#ffffff"}" stroke="#cfd6e2" stroke-width="3"/><path d="M8,20 H102 M8,32 H102" stroke="#cfd6e2" stroke-width="3" stroke-dasharray="6 6"/>`],
      book: [150, 110, `<path d="M0,20 Q40,0 75,20 Q110,0 150,20 L150,110 Q110,90 75,110 Q40,90 0,110 Z" fill="#ffffff" stroke="#d9dde4" stroke-width="3"/><path d="M75,20 V110" stroke="#c9ced8" stroke-width="3"/><rect x="0" y="100" width="150" height="10" fill="${c ?? "#e85d5d"}"/>`],
      bento: [220, 120, `<rect x="0" y="10" width="220" height="110" rx="16" fill="${c ?? "#c4283a"}"/><rect x="12" y="22" width="196" height="86" rx="10" fill="#fbfaf2"/><rect x="118" y="22" width="90" height="86" fill="#7cc46a"/><circle cx="62" cy="64" r="14" fill="#e2463f"/><rect x="140" y="40" width="46" height="26" rx="10" fill="#f2c94c"/>`],
      onigiri: [150, 130, `<path d="M75,4 Q100,4 140,100 Q148,128 120,128 L30,128 Q2,128 10,100 Q50,4 75,4 Z" fill="#ffffff" stroke="#e3e6ec" stroke-width="3"/><rect x="38" y="82" width="74" height="46" fill="#1f3a2e"/>`],
      milk: [80, 150, `<rect x="0" y="40" width="80" height="110" rx="5" fill="#ffffff" stroke="#e3e6ec" stroke-width="3"/><path d="M0,40 L40,8 L80,40 Z" fill="#f4f6fb" stroke="#e3e6ec" stroke-width="3"/><rect x="0" y="70" width="80" height="40" fill="${c ?? "#3a6fd8"}"/>`],
      bell: [160, 170, `<path d="M80,10 Q130,10 134,90 L150,140 L10,140 L26,90 Q30,10 80,10 Z" fill="${c ?? "#e8b23a"}"/><rect x="4" y="134" width="152" height="14" rx="7" fill="${H.shade(c ?? "#e8b23a", -0.2)}"/><circle cx="80" cy="156" r="14" fill="${H.shade(c ?? "#e8b23a", -0.3)}"/><path d="M52,40 Q58,26 70,22" stroke="#fff" stroke-opacity=".6" stroke-width="7" fill="none" stroke-linecap="round"/>`],
      ball: [110, 110, `<circle cx="55" cy="55" r="52" fill="#ffffff" stroke="#e3e6ec" stroke-width="3"/><path d="M20,22 Q42,55 20,88 M90,22 Q68,55 90,88" stroke="#e2463f" stroke-width="4" fill="none" stroke-dasharray="7 5"/>`],
      bat: [40, 420, `<path d="M14,0 L26,0 L34,300 Q20,320 6,300 Z" fill="${c ?? "#c9a06a"}" transform="translate(0,100)"/><rect x="12" y="380" width="16" height="40" rx="6" fill="#3a3e48"/>`],
      trumpet: [260, 120, `<rect x="20" y="52" width="160" height="16" rx="8" fill="${c ?? "#e8b23a"}"/><path d="M170,30 L250,0 L250,120 L170,90 Z" fill="${c ?? "#e8b23a"}"/><rect x="60" y="28" width="12" height="30" rx="5" fill="#c99520"/><rect x="84" y="28" width="12" height="30" rx="5" fill="#c99520"/><rect x="108" y="28" width="12" height="30" rx="5" fill="#c99520"/><rect x="0" y="54" width="26" height="12" rx="4" fill="#c99520"/>`],
      shinai: [40, 440, `<rect x="16" y="0" width="8" height="380" rx="4" fill="${c ?? "#d8c08a"}"/><rect x="10" y="300" width="20" height="10" rx="3" fill="#2b2f3a"/><rect x="12" y="380" width="16" height="60" rx="5" fill="#f1efe8"/>`],
      pot: [260, 200, `<rect x="10" y="40" width="240" height="160" rx="22" fill="${c ?? "#c7ccd6"}"/><rect x="0" y="30" width="260" height="24" rx="10" fill="${H.shade(c ?? "#c7ccd6", -0.15)}"/><rect x="-20" y="80" width="30" height="16" rx="6" fill="#8d96a6"/><rect x="250" y="80" width="30" height="16" rx="6" fill="#8d96a6"/><path d="M60,0 Q70,-20 80,0 M120,-6 Q130,-26 140,-6 M180,0 Q190,-20 200,0" stroke="#ffffff" stroke-opacity=".7" stroke-width="6" fill="none"/>`],
      cart: [420, 260, `<rect x="0" y="40" width="420" height="24" rx="8" fill="#9aa3b5"/><rect x="0" y="170" width="420" height="20" rx="8" fill="#9aa3b5"/><rect x="10" y="40" width="12" height="190" fill="#8d96a6"/><rect x="398" y="40" width="12" height="190" fill="#8d96a6"/><circle cx="40" cy="240" r="18" fill="#3a3e48"/><circle cx="380" cy="240" r="18" fill="#3a3e48"/>`],
      plant: [140, 200, `<path d="M20,110 L120,110 L104,200 L36,200 Z" fill="${c ?? "#d9783f"}"/><path d="M70,110 Q30,60 40,10 M70,110 Q100,50 120,30 M70,110 Q66,60 80,20" stroke="#4c9a4c" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="20" rx="20" ry="12" fill="#5fae5a"/><ellipse cx="118" cy="34" rx="20" ry="12" fill="#5fae5a"/><ellipse cx="80" cy="18" rx="16" ry="10" fill="#73c068"/>`],
      sparkle: [100, 100, `<path d="M50,0 Q56,44 100,50 Q56,56 50,100 Q44,56 0,50 Q44,44 50,0 Z" fill="${c ?? "#fff4b0"}"/>`],
      heart: [100, 90, `<path d="M50,90 L10,48 Q-10,20 18,6 Q38,-2 50,18 Q62,-2 82,6 Q110,20 90,48 Z" fill="${c ?? "#ff5a7a"}"/>`],
      question: [80, 120, `<path d="M14,36 Q14,4 42,4 Q72,4 72,32 Q72,52 50,62 Q42,66 42,80" stroke="${c ?? "#ffffff"}" stroke-width="14" fill="none" stroke-linecap="round"/><circle cx="42" cy="108" r="9" fill="${c ?? "#ffffff"}"/>`],
    };
    const k = K[p.kind];
    if (!k) throw new Error(`prop: unknown kind '${p.kind}' (${Object.keys(K).join(", ")})`);
    return { el: H.svg(k[2], k[0], k[1]), w: k[0], h: k[1] };
  },
};

// ------------------------------------------------------------------ window_grid: grid of windows, some lit with people (reference style)
// rows, cols, cell [w, h], gap, lit: [[r, c], ...] | fraction, people (true), frame, glow (lit border color),
// you: {row, col, label, color, at} -> highlighted cell (lights up at `at`). Anchor cell:r,c
export const window_grid = {
  origin: "center",
  create(p, H) {
    const R = p.rows ?? 4, C = p.cols ?? 4, [cw, ch] = p.cell ?? [190, 210], gap = p.gap ?? 22, rnd = H.rng(p.seed ?? 31);
    const w = C * cw + (C - 1) * gap + 60, h = R * ch + (R - 1) * gap + 60;
    const xy = (r, c) => [30 + (c - 1) * (cw + gap) + cw / 2, 30 + (r - 1) * (ch + gap) + ch / 2];
    const litSet = Array.isArray(p.lit) ? new Set(p.lit.map((x) => x.join(","))) : null;
    const glow = H.col(p.glow ?? "#ff4a5a"), litC = H.col(p.lit_color ?? "#ffe9a8"), dark = H.col(p.dark ?? "#14121a");
    let s = `<rect width="${w}" height="${h}" rx="10" fill="${H.col(p.frame ?? "#1a1820")}"/>`, top = "";
    const cells = [];
    for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) {
      const [x, y] = xy(r, c);
      const you = p.you && p.you.row === r && p.you.col === c;
      const lit = !you && (litSet ? litSet.has(`${r},${c}`) : rnd() < (p.lit ?? 0.6));
      cells.push({ r, c, lit, you });
      s += `<g class="cell" data-lit="${lit ? 1 : 0}"><rect x="${x - cw / 2}" y="${y - ch / 2}" width="${cw}" height="${ch}" rx="4" fill="${lit ? litC : dark}" ${lit ? `stroke="${glow}" stroke-width="4" style="filter:drop-shadow(0 0 12px ${glow})"` : `stroke="#2a2733" stroke-width="3"`}/>`;
      if (lit) s += `<path d="M${x},${y - ch / 2} V${y + ch / 2} M${x - cw / 2},${y - ch * 0.05} H${x + cw / 2}" stroke="${H.shade(litC, -0.25)}" stroke-width="5"/>`;
      if (lit && p.people !== false) s += `<g fill="#6a3b2c"><circle cx="${x}" cy="${y + ch * 0.02}" r="${cw * 0.12}"/><path d="M${x - cw * 0.3},${y + ch / 2} Q${x - cw * 0.3},${y + ch * 0.16} ${x},${y + ch * 0.16} Q${x + cw * 0.3},${y + ch * 0.16} ${x + cw * 0.3},${y + ch / 2} Z"/></g>`;
      if (you) {
        s += `<rect class="you" x="${x - cw / 2}" y="${y - ch / 2}" width="${cw}" height="${ch}" rx="4" fill="${H.col(p.you.fill ?? "#fff2a8")}" stroke="${H.col(p.you.color ?? "#ffe14a")}" stroke-width="6" style="filter:drop-shadow(0 0 16px ${H.col(p.you.color ?? "#ffe14a")})"/>`;
        if (p.you.label) top += `<g class="you-label" transform="translate(${x},${y + ch / 2 + 6})"><rect x="-50" y="-28" width="100" height="56" rx="12" fill="rgba(20,16,10,.92)" stroke="${H.col(p.you.color ?? "#ffe14a")}" stroke-width="3"/><text y="12" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="30" fill="#fff">${p.you.label}</text></g>`;
      }
      s += `</g>`;
    }
    const svg = H.svg(s + top, w, h);                // labels on top of every cell
    const you = svg.querySelector(".you"), youLabel = svg.querySelector(".you-label");
    return {
      el: svg, w, h,
      update(t) {                                   // you.at: the highlighted window lights up at that moment
        if (!you || p.you.at == null) return;
        const on = t >= p.you.at || (t >= p.you.at - 0.15 && Math.floor(t * 30) % 2 === 0);
        you.style.opacity = on ? 1 : 0;
        if (youLabel) youLabel.style.opacity = H.P(t, p.you.at + 0.1, 0.25);
      },
      anchor(name, args) { return name === "cell" ? xy(args[0], args[1]) : null; },
    };
  },
};
