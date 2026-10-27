// Project actors for «Казино не виновато»: gavel (judge's hammer with strikes), scales (scales of justice with a tilting
// beam) and lotto_ticket (a lottery ticket with numbered balls and fine print).

// ------------------------------------------------------------------ gavel: judge's hammer above a sound block
// w, strikes: [t, …] (each strike: the hammer swings down and bounces back), color (wood), band (metal bands)
export const gavel = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 520, h = w * 0.8, wood = H.col(p.color ?? "#7a3f1c"), band = H.col(p.band ?? "#e0b04a");
    const svg = H.svg(`
      <ellipse cx="${w * 0.5}" cy="${h * 0.92}" rx="${w * 0.36}" ry="${h * 0.06}" fill="rgba(0,0,0,.45)"/>
      <rect x="${w * 0.2}" y="${h * 0.78}" width="${w * 0.6}" height="${h * 0.12}" rx="${h * 0.03}" fill="${H.shade(wood, -0.2)}"/>
      <rect x="${w * 0.22}" y="${h * 0.76}" width="${w * 0.56}" height="${h * 0.05}" rx="${h * 0.02}" fill="${H.shade(wood, 0.15)}"/>
      <g class="hm">
        <rect x="${w * 0.47}" y="${h * 0.3}" width="${w * 0.6}" height="${h * 0.055}" rx="${h * 0.02}" fill="${H.shade(wood, 0.05)}"/>
        <rect x="${w * 0.25}" y="${h * 0.14}" width="${w * 0.24}" height="${h * 0.38}" rx="${h * 0.05}" fill="${wood}"/>
        <rect x="${w * 0.25}" y="${h * 0.2}" width="${w * 0.24}" height="${h * 0.035}" fill="${band}"/>
        <rect x="${w * 0.25}" y="${h * 0.43}" width="${w * 0.24}" height="${h * 0.035}" fill="${band}"/>
        <rect x="${w * 0.25}" y="${h * 0.14}" width="${w * 0.06}" height="${h * 0.38}" rx="${h * 0.03}" fill="rgba(255,255,255,.12)"/>
      </g>`, w, h);
    const hm = svg.querySelector(".hm"), strikes = [].concat(p.strikes || []);
    const px = w * 0.9, py = h * 0.33;          // pivot at the end of the handle
    return {
      el: svg, w, h,
      update(t) {
        const last = strikes.filter((s) => s - 0.25 <= t).pop();
        let a = -28;                             // resting: raised
        if (last != null) {
          const u = t - (last - 0.25);
          if (u < 0.25) a = -28 + 46 * (u / 0.25) ** 2;            // swing down
          else if (u < 0.55) a = 18 - 30 * Math.sin(((u - 0.25) / 0.3) * Math.PI / 2) * Math.exp(-(u - 0.25) * 4);
          else a = Math.max(-28, 18 - 46 * Math.min(1, (u - 0.55) / 0.5));
          if (u >= 0.25 && u < 0.55) a = Math.max(a, 4);
        }
        hm.setAttribute("transform", `rotate(${a} ${px} ${py})`);
      },
    };
  },
};

// ------------------------------------------------------------------ scales: scales of justice
// w, tilt (track, degrees: + → the right pan goes down), color (metal), left / right (labels under the pans)
export const scales = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = w * 0.9, c = H.col(p.color ?? "#e0b04a"), cx = w / 2, top = h * 0.18, arm = w * 0.38;
    const svg = H.svg(`
      <rect x="${cx - w * 0.015}" y="${top}" width="${w * 0.03}" height="${h * 0.66}" fill="${c}"/>
      <path d="M${cx - w * 0.16},${h * 0.92} L${cx + w * 0.16},${h * 0.92} L${cx + w * 0.06},${h * 0.82} L${cx - w * 0.06},${h * 0.82} Z" fill="${H.shade(c, -0.15)}"/>
      <circle cx="${cx}" cy="${top}" r="${w * 0.03}" fill="${c}"/>
      <g class="beam"><rect x="${cx - arm}" y="${top - w * 0.012}" width="${arm * 2}" height="${w * 0.024}" rx="${w * 0.012}" fill="${c}"/></g>
      ${["l", "r"].map((k) => `<g class="pan_${k}">
        <line class="s1" stroke="${c}" stroke-width="3"/><line class="s2" stroke="${c}" stroke-width="3"/>
        <path class="bowl" fill="${H.shade(c, -0.1)}"/>
        <text class="lb" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${w * 0.055}" fill="#fff">${k === "l" ? p.left ?? "" : p.right ?? ""}</text></g>`).join("")}`, w, h);
    const beam = svg.querySelector(".beam");
    const pans = ["l", "r"].map((k, i) => ({ g: svg.querySelector(`.pan_${k}`), side: i ? 1 : -1 }));
    return {
      el: svg, w, h,
      update(t, it) {
        const a = it.v("tilt", 0), r = (a * Math.PI) / 180;
        beam.setAttribute("transform", `rotate(${a} ${cx} ${top})`);
        for (const pn of pans) {
          const ex = cx + pn.side * arm * Math.cos(r), ey = top + pn.side * arm * Math.sin(r);
          const by = ey + h * 0.34, bw = w * 0.16;
          const q = (sel) => pn.g.querySelector(sel);
          q(".s1").setAttribute("x1", ex); q(".s1").setAttribute("y1", ey); q(".s1").setAttribute("x2", ex - bw); q(".s1").setAttribute("y2", by);
          q(".s2").setAttribute("x1", ex); q(".s2").setAttribute("y1", ey); q(".s2").setAttribute("x2", ex + bw); q(".s2").setAttribute("y2", by);
          q(".bowl").setAttribute("d", `M${ex - bw},${by} Q${ex},${by + h * 0.12} ${ex + bw},${by} Z`);
          q(".lb").setAttribute("x", ex); q(".lb").setAttribute("y", by + h * 0.16);
        }
      },
    };
  },
};

// ------------------------------------------------------------------ lotto_ticket: lottery ticket with balls and fine print
// w, numbers: [..], title, fine (fine-print line at the bottom), color (accent), fine_hl (track 0..1: fine print highlighted)
export const lotto_ticket = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 800, h = w * 0.5, c = H.col(p.color ?? "#ff3b4e"), nums = p.numbers ?? [7, 14, 23, 31, 42, 9];
    const r = w * 0.055, gap = (w * 0.8) / nums.length;
    const svg = H.svg(`
      <rect x="0" y="0" width="${w}" height="${h}" rx="${w * 0.03}" fill="#f6efe0"/>
      <rect x="0" y="0" width="${w}" height="${h * 0.24}" rx="${w * 0.03}" fill="${c}"/>
      <rect x="0" y="${h * 0.12}" width="${w}" height="${h * 0.12}" fill="${c}"/>
      <text x="${w * 0.05}" y="${h * 0.16}" font-family="Montserrat" font-weight="900" font-size="${h * 0.12}" fill="#fff">${p.title ?? "LOTTO"}</text>
      ${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i + 0.5) * (w / 24)}" cy="${h}" r="${w * 0.008}" fill="#c9bea6"/>`).join("")}
      ${nums.map((n, i) => { const x = w * 0.1 + gap * (i + 0.5), y = h * 0.5, last = i === nums.length - 1;
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${last ? c : "#ffffff"}" stroke="${last ? H.shade(c, -0.2) : "#2a2a2a"}" stroke-width="4"/>
          <text x="${x}" y="${y + r * 0.38}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${r * 1.05}" fill="${last ? "#fff" : "#1a1a1a"}">${n}</text>`; }).join("")}
      <rect class="hl" x="${w * 0.04}" y="${h * 0.76}" width="${w * 0.92}" height="${h * 0.13}" rx="6" fill="#ffd34d" opacity="0"/>
      <text x="${w * 0.5}" y="${h * 0.85}" text-anchor="middle" font-family="JBM, monospace" font-weight="700" font-size="${h * 0.065}" fill="#4a4436">${p.fine ?? ""}</text>`, w, h);
    const hl = svg.querySelector(".hl");
    return { el: svg, w, h, update(t, it) { hl.setAttribute("opacity", 0.85 * H.clamp(it.v("fine_hl", 0))); } };
  },
};

// ------------------------------------------------------------------ streak: a run of roulette results appearing one by one
// n, cols, size (ball diameter), gap, from (time the first ball appears), dur (until the last one), color, ring (outline colour)
export const streak = {
  origin: "center",
  create(p, H) {
    const n = p.n ?? 26, cols = p.cols ?? 13, d = p.size ?? 62, g = p.gap ?? 12, rows = Math.ceil(n / cols);
    const w = cols * d + (cols - 1) * g, h = rows * d + (rows - 1) * g;
    const svg = H.svg("", w, h);
    const balls = Array.from({ length: n }, (_, i) => {
      const x = (i % cols) * (d + g) + d / 2, y = Math.floor(i / cols) * (d + g) + d / 2;
      return H.el("circle", { cx: x, cy: y, r: d / 2 - 3, fill: H.col(p.color ?? "#15151c"), stroke: H.col(p.ring ?? "#e9d9b0"), "stroke-width": 4, opacity: 0 }, svg);
    });
    const from = p.from ?? 0, dur = p.dur ?? 1.5;
    return {
      el: svg, w, h,
      update(t) {
        balls.forEach((b, i) => {
          const ti = from + (dur * i) / Math.max(1, n - 1), k = H.clamp((t - ti) / 0.12);
          b.setAttribute("opacity", k);
          b.setAttribute("r", (d / 2 - 3) * (0.4 + 0.6 * k));
        });
      },
    };
  },
};
