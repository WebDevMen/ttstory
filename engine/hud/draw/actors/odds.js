// Odds actors: roulette (single-zero wheel from above with a ball and a glowing zero) and walks (random-walk lines:
// a fan of scenarios or one player's balance). First made for projects/benefit («Польза азартных игр»).

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// ------------------------------------------------------------------ roulette: single-zero wheel seen from above
// w (diameter), speed (wheel °/s), ball (true/false), ball_speed (°/s, opposite direction), land (time the ball drops
// into the zero pocket), zero (track 0..1: zero pocket glows, the other pockets dim), numbers (true/false)
export const roulette = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, R = w / 2, n = ORDER.length, step = 360 / n;
    const rOut = R * 0.95, rIn = R * 0.66, rNum = R * 0.86, rPocket = R * 0.62, rCone = R * 0.5;
    const pt = (r, a) => [R + r * Math.sin((a * Math.PI) / 180), R - r * Math.cos((a * Math.PI) / 180)];
    const sector = (r0, r1, a0, a1) => {
      const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
      return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
    };
    let cells = "", nums = "", frets = "";
    ORDER.forEach((num, i) => {
      const a0 = i * step - step / 2, a1 = a0 + step;
      const fill = num === 0 ? "#12a150" : RED.has(num) ? "#c8102e" : "#15151c";
      cells += `<path class="${num === 0 ? "zero" : "cell"}" d="${sector(rIn, rOut, a0, a1)}" fill="${fill}" stroke="#d9b45a" stroke-width="2"/>`;
      cells += `<path d="${sector(rPocket * 0.86, rIn, a0, a1)}" fill="${num === 0 ? "#0b5e30" : "#2a1d12"}" stroke="#d9b45a" stroke-width="1.5"/>`;
      if (p.numbers !== false) {
        const [x, y] = pt(rNum, i * step);
        nums += `<text x="${x}" y="${y}" transform="rotate(${i * step} ${x} ${y})" text-anchor="middle" dominant-baseline="middle"
          font-family="Montserrat" font-weight="800" font-size="${R * 0.075}" fill="#fff">${num}</text>`;
      }
      const [fx0, fy0] = pt(rPocket * 0.86, a0), [fx1, fy1] = pt(rIn, a0);
      frets += `<line x1="${fx0}" y1="${fy0}" x2="${fx1}" y2="${fy1}" stroke="#f3d27a" stroke-width="3"/>`;
    });
    const spokes = [0, 90, 180, 270].map((a) => {
      const [x, y] = pt(rCone * 0.9, a);
      return `<line x1="${R}" y1="${R}" x2="${x}" y2="${y}" stroke="#f3d27a" stroke-width="${R * 0.035}" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y}" r="${R * 0.035}" fill="#f3d27a"/>`;
    }).join("");
    const svg = H.svg(`
      <defs>
        <radialGradient id="rimg"><stop offset="0.82" stop-color="#3b2414"/><stop offset="0.95" stop-color="#6b4321"/><stop offset="1" stop-color="#1c0f07"/></radialGradient>
        <radialGradient id="coneg"><stop offset="0" stop-color="#7a5a2c"/><stop offset="1" stop-color="#2b1a0d"/></radialGradient>
      </defs>
      <circle cx="${R}" cy="${R}" r="${R}" fill="url(#rimg)"/>
      <circle cx="${R}" cy="${R}" r="${rOut + 4}" fill="none" stroke="#f3d27a" stroke-width="4"/>
      <g class="wheel">${cells}${frets}${nums}
        <circle cx="${R}" cy="${R}" r="${rCone}" fill="url(#coneg)" stroke="#f3d27a" stroke-width="4"/>${spokes}
        <circle cx="${R}" cy="${R}" r="${R * 0.07}" fill="#f3d27a"/></g>
      <circle class="ball" r="${R * 0.035}" fill="#f7f7f2" stroke="#9a9a9a" stroke-width="1.5"/>`, w, w);
    for (const g of svg.querySelectorAll("radialGradient")) {
      const id = H.uid(g.id), old = g.id;
      g.id = id;
      svg.querySelectorAll(`[fill="url(#${old})"]`).forEach((e) => e.setAttribute("fill", `url(#${id})`));
    }
    const wheel = svg.querySelector(".wheel"), ball = svg.querySelector(".ball"), zero = svg.querySelector(".zero");
    const cellEls = [...svg.querySelectorAll(".cell")];
    const speed = p.speed ?? 40, bs = p.ball_speed ?? 260, land = p.land ?? 1e9;
    return {
      el: svg, w, h: w,
      update(t, it) {
        const wa = speed * t;
        wheel.setAttribute("transform", `rotate(${wa} ${R} ${R})`);
        if (p.ball === false) ball.style.opacity = 0;
        else {
          let ba, br;
          if (t < land - 0.6) { ba = -bs * t; br = R * 0.9; }
          else if (t < land) {             // ball spirals inward and catches the zero
            const k = H.clamp((t - (land - 0.6)) / 0.6), e = k * k * (3 - 2 * k);
            const free = -bs * t, target = wa + 360 * Math.ceil((free - wa) / 360);
            ba = free + (wa - (free - 360 * Math.round((free - wa) / 360))) * e;
            br = R * 0.9 + (R * 0.6 - R * 0.9) * e;
            void target;
          } else { ba = wa; br = R * 0.6; }
          const [x, y] = pt(br, ba);
          ball.setAttribute("cx", x); ball.setAttribute("cy", y);
        }
        const z = H.clamp(it.v("zero", 0));
        zero.setAttribute("fill", z > 0 ? `rgb(${18 + 60 * z},${161 + 94 * z},${80 + 60 * z})` : "#12a150");
        zero.style.filter = z > 0 ? `drop-shadow(0 0 ${R * 0.06 * z}px #3cff8a)` : "none";
        for (const c of cellEls) c.style.opacity = 1 - 0.55 * z;
      },
    };
  },
};

// ------------------------------------------------------------------ walks: random-walk lines (a fan of scenarios or one balance line)
// w, h, n (number of lines), steps, drift (per step, in fractions of h), vol (step size), start (0..1 from the bottom),
// draw (track 0..1: lines are drawn left → right), color (or colors: [...]), width, axis (true: base line at the start level),
// history (0..1: share of the width drawn as one common line before the fan splits), seed, dot (true: a dot on each line end)
export const walks = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 600, n = p.n ?? 1, steps = p.steps ?? 80, rnd = H.rng(p.seed ?? 3);
    const drift = p.drift ?? 0, vol = p.vol ?? 0.04, y0 = h * (1 - (p.start ?? 0.5)), hist = p.history ?? 0;
    const cols = p.colors || [p.color ?? "#4de1ff"];
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
    const histPts = [];
    let hy = y0;
    const hs = Math.round(steps * hist);
    for (let i = 0; i <= hs; i++) { histPts.push([(i / steps) * w, hy]); hy -= (drift + vol * gauss()) * h * 0.5; hy = Math.min(h - 6, Math.max(6, hy)); }
    const svg = H.svg(p.axis ? `<line x1="0" y1="${y0}" x2="${w}" y2="${y0}" stroke="${H.rgba("#ffffff", 0.45)}" stroke-width="3" stroke-dasharray="12 10"/>` : "", w, h);
    const lines = Array.from({ length: n }, (_, li) => {
      const pts = histPts.slice();
      let y = pts[pts.length - 1][1];
      for (let i = hs + 1; i <= steps; i++) { y -= (drift + vol * gauss()) * h; y = Math.min(h - 6, Math.max(6, y)); pts.push([(i / steps) * w, y]); }
      const d = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
      const c = H.col(cols[li % cols.length]);
      const path = H.el("path", { d, fill: "none", stroke: c, "stroke-width": p.width ?? 6, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: n > 1 ? 0.75 : 1 }, svg);
      const len = path.getTotalLength();
      path.setAttribute("stroke-dasharray", `${len} ${len}`);
      const dot = p.dot ? H.el("circle", { r: (p.width ?? 6) * 1.8, fill: c }, svg) : null;
      return { path, len, dot };
    });
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("draw", 1));
        for (const l of lines) {
          l.path.setAttribute("stroke-dashoffset", l.len * (1 - k));
          if (l.dot) {
            const q = l.path.getPointAtLength(Math.max(0.01, l.len * k));
            l.dot.setAttribute("cx", q.x); l.dot.setAttribute("cy", q.y); l.dot.setAttribute("opacity", k > 0 ? 1 : 0);
          }
        }
      },
    };
  },
};
