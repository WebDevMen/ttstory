// Project actors for «Польза азартных игр»: opera_house (Sydney Opera House) and mc_dots (Monte Carlo throws).
// roulette and walks moved to the library: engine/hud/draw/actors/odds.js.

// ------------------------------------------------------------------ opera_house: Sydney Opera House, side view
// w, rise (track 0..1: the sails rise one by one), color (shells), shade (shell shadow side), base (podium color),
// tickets (track 0..1: every shell turns into a striped lottery ticket), reflect (true/false: mirror in the water)
export const opera_house = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 940, h = w * 0.5, s = w / 940;
    const col = H.col(p.color ?? "#f4ead8"), shd = H.col(p.shade ?? "#c9bba4"), base = H.col(p.base ?? "#b98f62");
    // shells: [x of the foot, width, height, lean]; two groups (concert hall, opera theatre) + restaurant
    const shells = [
      [120, 120, 150, 0.55], [200, 150, 210, 0.6], [300, 170, 270, 0.62], [410, 160, 300, 0.58],
      [520, 120, 230, 0.6], [600, 140, 250, 0.6], [690, 150, 200, 0.62], [780, 110, 140, 0.6],
    ];
    const by = h - 70 * s;
    let g = "";
    shells.forEach(([x, sw, sh, lean], i) => {
      x *= s; sw *= s; sh *= s;
      const tipX = x + sw * lean, tipY = by - sh;
      const d = `M${x},${by} Q${x + sw * 0.05},${by - sh * 0.75} ${tipX},${tipY} Q${x + sw * 0.85},${by - sh * 0.45} ${x + sw},${by} Z`;
      const d2 = `M${tipX},${tipY} Q${x + sw * 0.85},${by - sh * 0.45} ${x + sw},${by} L${x + sw * 0.72},${by} Q${x + sw * 0.66},${by - sh * 0.4} ${tipX},${tipY} Z`;
      g += `<g class="sh" data-i="${i}" style="transform-origin:${x + sw / 2}px ${by}px">
        <path d="${d}" fill="${col}"/><path d="${d2}" fill="${shd}"/>
        <g class="tk" opacity="0">${[0.25, 0.45, 0.65].map((k) => `<path d="M${x + sw * 0.1},${by - sh * k} L${x + sw * 0.9},${by - sh * k}" stroke="#ff3b4e" stroke-width="${6 * s}" stroke-dasharray="${10 * s} ${8 * s}"/>`).join("")}</g>
        ${[0.2, 0.4, 0.6, 0.8].map((k) => `<path d="M${x + sw * k},${by} Q${x + sw * (k * 0.6 + 0.2)},${by - sh * 0.5} ${tipX},${tipY}" stroke="${H.rgba(shd, 0.6)}" stroke-width="${2 * s}" fill="none"/>`).join("")}
      </g>`;
    });
    const podium = `<path d="M${40 * s},${by} L${900 * s},${by} L${930 * s},${h} L${10 * s},${h} Z" fill="${base}"/>
      <rect x="${40 * s}" y="${by}" width="${860 * s}" height="${12 * s}" fill="${H.shade(base, 0.2)}"/>
      ${Array.from({ length: 14 }, (_, i) => `<rect x="${(70 + i * 60) * s}" y="${by + 26 * s}" width="${30 * s}" height="${28 * s}" fill="${H.rgba("#ffd34d", 0.85)}"/>`).join("")}`;
    const reflect = p.reflect !== false;
    const H2 = reflect ? h * 1.6 : h;
    const svg = H.svg(`<g class="main">${podium}${g}</g>
      ${reflect ? `<g class="refl" transform="translate(0 ${2 * h}) scale(1 -1)" opacity="0.28">${podium}${g}</g>` : ""}`, w, H2);
    const sh = [...svg.querySelectorAll(".main .sh")], shR = [...svg.querySelectorAll(".refl .sh")];
    const tk = [...svg.querySelectorAll(".tk")];
    return {
      el: svg, w, h: H2,
      origin: [w / 2, h],
      update(t, it) {
        const gr = it.v("rise", 1), n = sh.length;
        const apply = (arr) => arr.forEach((e, i) => {
          const k = H.clamp(gr * (n + 2) / 1 - i * 1) ;
          const kk = H.clamp(k), e2 = 1 - Math.pow(1 - kk, 3);
          e.style.transform = `scaleY(${e2})`;
          e.style.opacity = kk > 0 ? 1 : 0;
        });
        apply(sh); apply(shR);
        const tq = H.clamp(it.v("tickets", 0));
        tk.forEach((e) => e.setAttribute("opacity", tq));
      },
      anchor(name) { return name === "top" ? [w / 2, by - 300 * s] : null; },
    };
  },
};

// ------------------------------------------------------------------ mc_dots: the classic Monte Carlo picture — random throws
// into a square with an inscribed circle; points inside are coloured, outside grey. size, count, from (time the first dot
// lands), dur (seconds until all dots are in), color, out (colour outside), seed
export const mc_dots = {
  origin: "center",
  create(p, H) {
    const s = p.size ?? 640, n = p.count ?? 900, c = H.col(p.color ?? "#4de1ff"), o = H.col(p.out ?? "#6b7486");
    const rnd = H.rng(p.seed ?? 11);
    const svg = H.svg(`<rect x="3" y="3" width="${s - 6}" height="${s - 6}" fill="none" stroke="${H.rgba("#ffffff", 0.7)}" stroke-width="5"/>
      <circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 3}" fill="none" stroke="${c}" stroke-width="5"/>`, s, s);
    const dots = Array.from({ length: n }, () => {
      const x = rnd() * s, y = rnd() * s, inside = Math.hypot(x - s / 2, y - s / 2) < s / 2;
      return H.el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 5, fill: inside ? c : o, opacity: 0 }, svg);
    });
    const from = p.from ?? 0, dur = p.dur ?? 1;
    return {
      el: svg, w: s, h: s,
      update(t) {
        const k = H.clamp((t - from) / dur), shown = Math.floor(n * k * k * (3 - 2 * k));
        dots.forEach((d, i) => d.setAttribute("opacity", i < shown ? 0.9 : 0));
      },
    };
  },
};
