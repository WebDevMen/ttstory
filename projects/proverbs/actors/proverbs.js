// Project actors for «Пословицы-тормоза»: plank (a proverb board with a folk ornament that cracks and splits in two),
// hare (a galloping hare, side view), tape (a tailor's measuring tape that pulls out) and scissors (opening blades).

let UID = 0;

// ------------------------------------------------------------------ plank: proverb board with folk ornament
// text ("\n" = new line), w, h, size (font px, auto-fitted by default), color (board), ink (text), orn (ornament),
// crack (track 0..1: a jagged crack runs down the middle), split (track 0..1: the halves break apart and fall)
export const plank = {
  origin: "center",
  size_m: { w: 1.2 },
  create(p, H) {
    const w = p.w ?? 760, h = p.h ?? 190, id = `pl${++UID}`;
    const board = H.col(p.color ?? "#f3e6c8"), ink = H.col(p.ink ?? "#2a1a10"), orn = H.col(p.orn ?? "#c8323f");
    const lines = String(p.text ?? "").split("\n");
    const longest = Math.max(...lines.map((l) => l.length), 1);
    const band = h * 0.13, inner = h - band * 2;
    const fs = p.size ?? Math.min(inner / (lines.length * 1.18), (w * 0.86) / (longest * 0.66));
    const step = 22, cells = Math.floor((w - 40) / step), x0 = (w - cells * step) / 2;
    const ornRow = (y) => Array.from({ length: cells }, (_, i) => {
      const cx = x0 + (i + 0.5) * step, r = band * 0.34;
      return `<path d="M${cx},${y - r} L${cx + r},${y} L${cx},${y + r} L${cx - r},${y} Z" fill="${i % 2 ? orn : H.shade(orn, -0.25)}"/>`;
    }).join("");
    const body = `
      <rect x="0" y="0" width="${w}" height="${h}" rx="${h * 0.09}" fill="${board}"/>
      <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="${h * 0.07}" fill="none" stroke="${H.shade(board, -0.18)}" stroke-width="3"/>
      ${ornRow(band * 0.75)}${ornRow(h - band * 0.75)}
      <line x1="16" y1="${band * 1.45}" x2="${w - 16}" y2="${band * 1.45}" stroke="${H.rgba(orn, 0.5)}" stroke-width="2"/>
      <line x1="16" y1="${h - band * 1.45}" x2="${w - 16}" y2="${h - band * 1.45}" stroke="${H.rgba(orn, 0.5)}" stroke-width="2"/>
      ${lines.map((l, i) => `<text x="${w / 2}" y="${h / 2 + (i - (lines.length - 1) / 2) * fs * 1.16 + fs * 0.35}" text-anchor="middle"
        font-family="Playfair Display, serif" font-weight="900" font-size="${fs}" fill="${ink}">${l}</text>`).join("")}`;
    // jagged crack down the middle
    const pts = [[w * 0.5, 0]];
    const rnd = H.rng(p.seed ?? 7);
    for (let i = 1; i < 8; i++) pts.push([w * 0.5 + (rnd() - 0.5) * w * 0.07, (h * i) / 8]);
    pts.push([w * 0.5, h]);
    const crackD = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
    const leftClip = `M0,0 ${pts.map((q) => `L${q[0]},${q[1]}`).join(" ")} L0,${h} Z`;
    const rightClip = `M${w},0 ${pts.map((q) => `L${q[0]},${q[1]}`).join(" ")} L${w},${h} Z`;
    const svg = H.svg(`
      <defs><clipPath id="${id}l"><path d="${leftClip}"/></clipPath><clipPath id="${id}r"><path d="${rightClip}"/></clipPath></defs>
      <g class="hl" clip-path="url(#${id}l)">${body}</g>
      <g class="hr" clip-path="url(#${id}r)">${body}</g>
      <path class="ck" d="${crackD}" fill="none" stroke="#1a0f08" stroke-width="5" stroke-linejoin="round"/>`, w, h);
    const hl = svg.querySelector(".hl"), hr = svg.querySelector(".hr"), ck = svg.querySelector(".ck");
    const len = ck.getTotalLength ? ck.getTotalLength() || h * 1.2 : h * 1.2;
    ck.setAttribute("stroke-dasharray", len);
    return {
      el: svg, w, h,
      update(t, it) {
        const c = H.clamp(it.v("crack", 0)), s = H.clamp(it.v("split", 0));
        ck.setAttribute("stroke-dashoffset", len * (1 - c));
        ck.setAttribute("opacity", c > 0 && s < 0.05 ? 1 : 0);
        const dx = w * 0.06 * s, dy = h * 2.2 * s * s, a = 16 * s;
        hl.setAttribute("transform", `translate(${-dx},${dy}) rotate(${-a} ${w * 0.25} ${h * 0.5})`);
        hr.setAttribute("transform", `translate(${dx},${dy}) rotate(${a} ${w * 0.75} ${h * 0.5})`);
        svg.style.opacity = s > 0.75 ? 1 - (s - 0.75) / 0.25 : 1;
      },
    };
  },
};

// ------------------------------------------------------------------ hare: galloping hare, side view (faces right)
// w, color, run (track, strides/s; 0 = sits), ears (track 0..1: ears up)
export const hare = {
  origin: "bottom",
  size_m: { h: 0.45 },
  create(p, H) {
    const w = p.w ?? 300, h = w * 0.8, c = H.col(p.color ?? "#b9926a"), dk = H.shade(c, -0.3), lt = H.shade(c, 0.45);
    const svg = H.svg(`
      <ellipse class="sh" cx="${w * 0.5}" cy="${h * 0.985}" rx="${w * 0.34}" ry="${h * 0.025}" fill="rgba(0,0,0,.35)"/>
      <g class="bd">
        <g class="hind"><path d="M0,0 C${w * 0.12},${h * 0.06} ${w * 0.1},${h * 0.26} ${w * 0.02},${h * 0.3} L${w * 0.18},${h * 0.32} L${w * 0.18},${h * 0.28} L${w * 0.08},${h * 0.26} C${w * 0.12},${h * 0.16} ${w * 0.1},${h * 0.04} ${w * 0.04},-${h * 0.04} Z" fill="${dk}"/></g>
        <g class="front"><path d="M0,0 L${w * 0.03},${h * 0.26} L${w * 0.1},${h * 0.27} L${w * 0.1},${h * 0.24} L${w * 0.06},${h * 0.23} L${w * 0.04},0 Z" fill="${dk}"/></g>
        <ellipse cx="${w * 0.46}" cy="${h * 0.56}" rx="${w * 0.27}" ry="${h * 0.17}" fill="${c}"/>
        <ellipse cx="${w * 0.48}" cy="${h * 0.62}" rx="${w * 0.17}" ry="${h * 0.08}" fill="${lt}" opacity=".55"/>
        <circle cx="${w * 0.17}" cy="${h * 0.5}" r="${w * 0.055}" fill="#f4efe6"/>
        <g class="head">
          <g class="ears">
            <ellipse cx="${w * 0.7}" cy="${h * 0.2}" rx="${w * 0.035}" ry="${h * 0.16}" fill="${dk}" transform="rotate(-18 ${w * 0.7} ${h * 0.34})"/>
            <ellipse cx="${w * 0.75}" cy="${h * 0.2}" rx="${w * 0.04}" ry="${h * 0.17}" fill="${c}" transform="rotate(-8 ${w * 0.75} ${h * 0.35})"/>
            <ellipse cx="${w * 0.75}" cy="${h * 0.21}" rx="${w * 0.018}" ry="${h * 0.12}" fill="#f2b6b0" transform="rotate(-8 ${w * 0.75} ${h * 0.35})"/>
          </g>
          <ellipse cx="${w * 0.76}" cy="${h * 0.44}" rx="${w * 0.12}" ry="${h * 0.11}" fill="${c}"/>
          <circle cx="${w * 0.8}" cy="${h * 0.41}" r="${w * 0.018}" fill="#1a120c"/>
          <circle cx="${w * 0.805}" cy="${h * 0.405}" r="${w * 0.006}" fill="#fff"/>
          <circle cx="${w * 0.875}" cy="${h * 0.46}" r="${w * 0.014}" fill="#e98a8a"/>
        </g>
      </g>`, w, h);
    const bd = svg.querySelector(".bd"), hind = svg.querySelector(".hind"), front = svg.querySelector(".front"), ears = svg.querySelector(".ears");
    const hx = w * 0.28, hy = h * 0.66, fx = w * 0.62, fy = h * 0.68;
    let ph = 0, lastT = null;
    return {
      el: svg, w, h,
      update(t, it) {
        const r = it.v("run", 2.5);
        if (lastT == null || t < lastT) { ph = t * r; } else ph += (t - lastT) * r;
        lastT = t;
        const a = Math.sin(ph * Math.PI * 2), on = r > 0.05 ? 1 : 0;
        hind.setAttribute("transform", `translate(${hx},${hy}) rotate(${on * a * 38})`);
        front.setAttribute("transform", `translate(${fx},${fy}) rotate(${-on * a * 34})`);
        const lift = on * Math.max(0, Math.sin(ph * Math.PI * 2 + 0.6)) * h * 0.12;
        bd.setAttribute("transform", `translate(0,${-lift}) rotate(${on * a * 5} ${w * 0.5} ${h * 0.6})`);
        ears.setAttribute("transform", `rotate(${on * (10 + a * 6)} ${w * 0.72} ${h * 0.36})`);
      },
    };
  },
};

// ------------------------------------------------------------------ tape: tailor's measuring tape pulled from a case
// w (full length), h (tape width), pull (track 0..1: how far the tape is out), color, ink, unit (cm per tick label)
export const tape = {
  origin: "left",
  create(p, H) {
    const w = p.w ?? 820, th = p.h ?? 64, c = H.col(p.color ?? "#ffd34d"), ink = H.col(p.ink ?? "#2a1a10");
    const box = th * 2.2, H2 = box, ticks = [];
    for (let x = 0, i = 0; x <= w; x += 12, i++) {
      const big = i % 10 === 0, mid = i % 5 === 0;
      ticks.push(`<line x1="${x}" y1="0" x2="${x}" y2="${big ? th * 0.5 : mid ? th * 0.36 : th * 0.22}" stroke="${ink}" stroke-width="${big ? 3 : 2}"/>`);
      if (big && i) ticks.push(`<text x="${x - 4}" y="${th * 0.86}" text-anchor="end" font-family="JetBrains Mono, monospace" font-weight="700" font-size="${th * 0.34}" fill="${ink}">${i / 10 * (p.unit ?? 10)}</text>`);
    }
    const svg = H.svg(`
      <defs><clipPath id="tp${++UID}"><rect class="cl" x="${box * 0.5}" y="${(H2 - th) / 2 - 2}" width="0" height="${th + 4}"/></clipPath></defs>
      <g clip-path="url(#tp${UID})"><g class="strip" transform="translate(${box * 0.5},${(H2 - th) / 2})">
        <rect x="0" y="0" width="${w}" height="${th}" fill="${c}"/>${ticks.join("")}
        <rect x="${w - 10}" y="-6" width="16" height="${th + 12}" rx="3" fill="#8a8f99"/></g></g>
      <rect x="0" y="0" width="${box}" height="${H2}" rx="${box * 0.22}" fill="#c8323f"/>
      <circle cx="${box / 2}" cy="${H2 / 2}" r="${box * 0.26}" fill="${H.shade("#c8323f", -0.25)}"/>
      <circle cx="${box / 2}" cy="${H2 / 2}" r="${box * 0.1}" fill="#f3e6c8"/>`, w + box, H2);
    const cl = svg.querySelector(".cl"), strip = svg.querySelector(".strip");
    return {
      el: svg, w: w + box, h: H2,
      update(t, it) {
        const k = H.clamp(it.v("pull", 1)), len = w * k;
        cl.setAttribute("width", len + 10);
        strip.setAttribute("transform", `translate(${box * 0.5 + len - w},${(H2 - th) / 2})`);
      },
    };
  },
};

// ------------------------------------------------------------------ scissors: tailor's scissors, blades open/close
// w, open (track, degrees between the blades: 0 = closed), color (handles), metal
export const scissors = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 420, h = w * 0.5, c = H.col(p.color ?? "#2b2f3a"), m = H.col(p.metal ?? "#d9dee8");
    const cx = w * 0.46, cy = h * 0.5;
    const blade = (sgn) => `<g class="b${sgn > 0 ? "u" : "d"}">
        <path d="M${cx},${cy} L${w},${cy - sgn * h * 0.02} Q${w * 0.8},${cy + sgn * h * 0.1} ${cx},${cy + sgn * h * 0.08} Z" fill="${m}" stroke="${H.shade(m, -0.35)}" stroke-width="2"/>
        <path d="M${cx},${cy} L${w * 0.2},${cy + sgn * h * 0.22}" stroke="${c}" stroke-width="${h * 0.09}" stroke-linecap="round"/>
        <ellipse cx="${w * 0.12}" cy="${cy + sgn * h * 0.27}" rx="${w * 0.11}" ry="${h * 0.17}" fill="none" stroke="${c}" stroke-width="${h * 0.08}"/></g>`;
    const svg = H.svg(`${blade(1)}${blade(-1)}<circle cx="${cx}" cy="${cy}" r="${h * 0.05}" fill="${H.shade(m, -0.4)}"/>`, w, h);
    const bu = svg.querySelector(".bu"), bdn = svg.querySelector(".bd");
    return {
      el: svg, w, h,
      update(t, it) {
        const a = it.v("open", 24) / 2;
        bu.setAttribute("transform", `rotate(${a} ${cx} ${cy})`);
        bdn.setAttribute("transform", `rotate(${-a} ${cx} ${cy})`);
      },
    };
  },
};

// ------------------------------------------------------------------ jump_stand: high-jump uprights with a height scale
// span (px between the uprights), top (px above the floor: upright height), bar (px above the floor), px_per_m (scale marks),
// color (uprights), bar_color, marks (true: metres every 0.5 m on the left upright). Origin = middle of the floor line.
export const jump_stand = {
  origin: "bottom",
  create(p, H) {
    const span = p.span ?? 380, top = p.top ?? 900, pm = p.px_per_m ?? 360, w = span + 120, h = top + 20;
    const c = H.col(p.color ?? "#e8ecf4"), bc = H.col(p.bar_color ?? "#ffd34d"), x0 = 60, x1 = 60 + span;
    const marks = [];
    if (p.marks !== false) for (let m = 0.5; m * pm < top - 20; m += 0.5) {
      const y = h - m * pm, big = Math.abs(m % 1) < 0.01;
      marks.push(`<line x1="${x0 - (big ? 26 : 16)}" y1="${y}" x2="${x0}" y2="${y}" stroke="${c}" stroke-width="${big ? 4 : 3}"/>`);
      if (big) marks.push(`<text x="${x0 - 34}" y="${y + 9}" text-anchor="end" font-family="JetBrains Mono, monospace" font-weight="700" font-size="26" fill="${H.rgba(c, 0.8)}">${m} м</text>`);
    }
    const upright = (x) => `<rect x="${x - 9}" y="${h - top}" width="18" height="${top}" rx="5" fill="${c}"/>
      <rect x="${x - 9}" y="${h - top}" width="6" height="${top}" fill="rgba(255,255,255,.5)"/>
      <rect x="${x - 34}" y="${h - 12}" width="68" height="12" rx="4" fill="${H.shade(c, -0.35)}"/>`;
    const svg = H.svg(`${marks.join("")}${upright(x0)}${upright(x1)}
      <g class="bar"><rect x="${x0 - 14}" y="-8" width="${span + 28}" height="16" rx="8" fill="${bc}"/>
      <rect x="${x0}" y="-8" width="${span}" height="5" rx="2" fill="rgba(255,255,255,.55)"/>
      ${Array.from({ length: Math.floor(span / 60) }, (_, i) => `<rect x="${x0 + 30 + i * 60}" y="-8" width="26" height="16" fill="${H.shade(bc, -0.25)}"/>`).join("")}</g>
      <rect x="${x0 - 22}" y="0" width="16" height="10" class="peg" fill="${H.shade(c, -0.3)}"/>
      <rect x="${x1 + 6}" y="0" width="16" height="10" class="peg" fill="${H.shade(c, -0.3)}"/>`, w, h);
    const bar = svg.querySelector(".bar"), pegs = svg.querySelectorAll(".peg");
    return {
      el: svg, w, h,
      update(t, it) {
        const y = h - it.v("bar", 864), wob = it.v("wobble", 0);
        bar.setAttribute("transform", `translate(0,${y}) rotate(${Math.sin(t * 40) * wob * 2} ${w / 2} 0)`);
        pegs.forEach((g) => g.setAttribute("transform", `translate(0,${y + 8})`));
      },
    };
  },
};

// ------------------------------------------------------------------ cloth: a folded piece of fabric on a table, seen from above,
// with a chalk cutting line; cut (track 0..1: the two halves slide apart along the line), color, color2 (weave), chalk
export const cloth = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 560, id = `cl${++UID}`, c = H.col(p.color ?? "#2f5fb8"), c2 = H.col(p.color2 ?? "#244a92");
    const chalk = H.col(p.chalk ?? "#fff6d8");
    const half = (side) => `<g class="${side}" clip-path="url(#${id}${side})">
        <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="url(#${id}w)"/>
        <path d="M0,${h * 0.18} Q${w * 0.5},${h * 0.12} ${w},${h * 0.2}" stroke="rgba(255,255,255,.08)" stroke-width="22" fill="none"/>
        <path d="M0,${h * 0.78} Q${w * 0.5},${h * 0.86} ${w},${h * 0.74}" stroke="rgba(0,0,0,.12)" stroke-width="30" fill="none"/>
        <rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="8" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3" stroke-dasharray="14 10"/></g>`;
    const svg = H.svg(`<defs>
        <pattern id="${id}w" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${c}"/>
          <rect width="6" height="6" fill="${c2}"/><rect x="6" y="6" width="6" height="6" fill="${c2}"/></pattern>
        <clipPath id="${id}a"><rect x="0" y="0" width="${w / 2}" height="${h}"/></clipPath>
        <clipPath id="${id}b"><rect x="${w / 2}" y="0" width="${w / 2}" height="${h}"/></clipPath></defs>
      <rect x="6" y="18" width="${w}" height="${h}" rx="10" fill="rgba(0,0,0,.35)"/>
      ${half("a")}${half("b")}
      <line class="ln" x1="${w / 2}" y1="-20" x2="${w / 2}" y2="${h + 20}" stroke="${chalk}" stroke-width="5" stroke-dasharray="18 12" opacity=".9"/>`, w, h);
    const a = svg.querySelector(".a"), b = svg.querySelector(".b"), ln = svg.querySelector(".ln");
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("cut", 0)), d = 60 * k;
        a.setAttribute("transform", `translate(${-d},0) rotate(${-4 * k} ${w * 0.25} ${h / 2})`);
        b.setAttribute("transform", `translate(${d},0) rotate(${4 * k} ${w * 0.75} ${h / 2})`);
        ln.setAttribute("opacity", 0.9 * (1 - k));
      },
    };
  },
};

// ------------------------------------------------------------------ anvil: blacksmith's anvil with glowing iron and a hammer
// w, strikes: [t, …] (the hammer swings down; the iron flashes), glow (0..1 heat of the iron)
export const anvil = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 420, h = w * 0.95, iron = "#2b2f3a", hl = "#4a5162";
    const svg = H.svg(`
      <ellipse cx="${w * 0.5}" cy="${h * 0.985}" rx="${w * 0.42}" ry="${h * 0.03}" fill="rgba(0,0,0,.4)"/>
      <path d="M${w * 0.3},${h} L${w * 0.36},${h * 0.72} L${w * 0.64},${h * 0.72} L${w * 0.7},${h} Z" fill="${iron}"/>
      <path d="M${w * 0.02},${h * 0.5} Q${w * 0.18},${h * 0.5} ${w * 0.24},${h * 0.46} L${w * 0.94},${h * 0.46} L${w * 0.94},${h * 0.6}
        L${w * 0.68},${h * 0.62} L${w * 0.62},${h * 0.74} L${w * 0.38},${h * 0.74} L${w * 0.32},${h * 0.62} L${w * 0.2},${h * 0.6} Q${w * 0.08},${h * 0.58} ${w * 0.02},${h * 0.5} Z" fill="${iron}"/>
      <rect x="${w * 0.24}" y="${h * 0.46}" width="${w * 0.7}" height="${h * 0.025}" fill="${hl}"/>
      <rect class="hot" x="${w * 0.42}" y="${h * 0.405}" width="${w * 0.3}" height="${h * 0.055}" rx="${h * 0.02}" fill="#ff8a2e"/>
      <g class="hm">
        <rect x="${w * 0.6}" y="${h * 0.02}" width="${w * 0.4}" height="${h * 0.04}" rx="${h * 0.02}" fill="#7a4a24"/>
        <rect x="${w * 0.5}" y="${-h * 0.05}" width="${w * 0.14}" height="${h * 0.18}" rx="${h * 0.02}" fill="#5a606e"/>
        <rect x="${w * 0.5}" y="${-h * 0.05}" width="${w * 0.04}" height="${h * 0.18}" fill="#8a909e"/>
      </g>`, w, h);
    const hm = svg.querySelector(".hm"), hot = svg.querySelector(".hot"), strikes = [].concat(p.strikes || []);
    const px = w * 0.98, py = h * 0.04;
    return {
      el: svg, w, h,
      update(t, it) {
        const last = strikes.filter((s) => s - 0.2 <= t).pop();
        let a = -35, flash = 0;
        if (last != null) {
          const u = t - (last - 0.2);
          if (u < 0.2) a = -35 + 35 * (u / 0.2) ** 2;
          else { a = -35 * Math.min(1, (u - 0.2) / 0.45); flash = Math.exp(-(u - 0.2) * 5); }
        }
        hm.setAttribute("transform", `translate(${-w * 0.08},${h * 0.32}) rotate(${-a} ${px} ${py})`);
        const g = H.clamp(it.v("glow", 1) * 0.7 + flash * 0.6);
        hot.setAttribute("fill", H.mixc("#8a3a1a", "#ffd25a", g));
      },
    };
  },
};

// ------------------------------------------------------------------ snail: a slow snail with a spiral shell (side view, faces right)
// w, color (shell), body, crawl (track: px/s the body stretches — a gentle wave)
export const snail = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 260, h = w * 0.7, sh = H.col(p.color ?? "#d98b3a"), bd = H.col(p.body ?? "#c9d27a");
    const svg = H.svg(`
      <g class="bd"><path d="M${w * 0.05},${h} Q${w * 0.05},${h * 0.8} ${w * 0.3},${h * 0.8} L${w * 0.8},${h * 0.8} Q${w * 0.92},${h * 0.8} ${w * 0.92},${h * 0.6}
        L${w * 0.95},${h * 0.42} Q${w * 1.0},${h * 0.5} ${w * 0.98},${h * 0.7} Q${w},${h} ${w * 0.75},${h} Z" fill="${bd}"/>
        <line x1="${w * 0.9}" y1="${h * 0.55}" x2="${w * 0.88}" y2="${h * 0.22}" stroke="${bd}" stroke-width="${w * 0.025}" stroke-linecap="round"/>
        <line x1="${w * 0.95}" y1="${h * 0.5}" x2="${w * 0.99}" y2="${h * 0.2}" stroke="${bd}" stroke-width="${w * 0.025}" stroke-linecap="round"/>
        <circle cx="${w * 0.88}" cy="${h * 0.2}" r="${w * 0.03}" fill="#1a120c"/><circle cx="${w * 0.99}" cy="${h * 0.18}" r="${w * 0.03}" fill="#1a120c"/></g>
      <circle cx="${w * 0.45}" cy="${h * 0.48}" r="${h * 0.38}" fill="${sh}"/>
      <path d="M${w * 0.45},${h * 0.48} m0,0 a${h * 0.06},${h * 0.06} 0 1 1 ${h * 0.1},${h * 0.03} a${h * 0.14},${h * 0.14} 0 1 1 ${-h * 0.24},${-h * 0.08}
        a${h * 0.22},${h * 0.22} 0 1 1 ${h * 0.4},${h * 0.12}" fill="none" stroke="${H.shade(sh, -0.35)}" stroke-width="${w * 0.03}" stroke-linecap="round"/>
      <circle cx="${w * 0.36}" cy="${h * 0.3}" r="${h * 0.07}" fill="rgba(255,255,255,.3)"/>`, w, h);
    const b = svg.querySelector(".bd");
    return { el: svg, w, h, update(t) { b.setAttribute("transform", `translate(${Math.sin(t * 3) * w * 0.015},0)`); } };
  },
};

// ------------------------------------------------------------------ toolbox: open wooden box with a front label
// w, h, title (painted on the front), color (wood), ink. Draw the box in two layers: back (part: back) behind the content,
// front (part: front) over it, so items dropped "into" the box sink behind its front board.
export const toolbox = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 760, h = p.h ?? 300, c = H.col(p.color ?? "#8a5a2c"), ink = H.col(p.ink ?? "#f3e6c8"), part = p.part ?? "front";
    const planks = (y0, n) => Array.from({ length: n }, (_, i) => `<line x1="10" y1="${y0 + ((h - y0) * (i + 1)) / (n + 1)}" x2="${w - 10}" y2="${y0 + ((h - y0) * (i + 1)) / (n + 1)}" stroke="${H.shade(c, -0.25)}" stroke-width="3"/>`).join("");
    const svg = part === "back"
      ? H.svg(`<rect x="${w * 0.04}" y="${-h * 0.22}" width="${w * 0.92}" height="${h * 0.5}" rx="10" fill="${H.shade(c, -0.45)}"/>
          <path d="M${w * 0.38},${-h * 0.22} L${w * 0.38},${-h * 0.42} L${w * 0.62},${-h * 0.42} L${w * 0.62},${-h * 0.22}" fill="none" stroke="${H.shade(c, -0.15)}" stroke-width="16" stroke-linejoin="round"/>`, w, h)
      : H.svg(`<rect x="0" y="0" width="${w}" height="${h}" rx="16" fill="${c}"/>${planks(0, 3)}
          <rect x="0" y="0" width="${w}" height="${h * 0.12}" rx="8" fill="${H.shade(c, 0.15)}"/>
          ${[[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#c9b07a"/>`).join("")}
          <rect x="${w * 0.12}" y="${h * 0.32}" width="${w * 0.76}" height="${h * 0.44}" rx="10" fill="${H.shade(c, -0.3)}"/>
          <text x="${w / 2}" y="${h * 0.6}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${p.size ?? h * 0.16}" fill="${ink}">${p.title ?? ""}</text>`, w, h);
    return { el: svg, w, h };
  },
};

// ------------------------------------------------------------------ bench: park bench, front view (origin = floor centre)
// w, seat (seat height px), color (slats), frame
export const bench = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 600, seat = p.seat ?? 140, h = seat + 130, c = H.col(p.color ?? "#9a6434"), f = H.col(p.frame ?? "#2b2f3a");
    const slat = (y, hh) => `<rect x="0" y="${y}" width="${w}" height="${hh}" rx="6" fill="${c}"/><rect x="0" y="${y}" width="${w}" height="${hh * 0.3}" rx="4" fill="${H.shade(c, 0.18)}"/>`;
    const svg = H.svg(`
      <rect x="${w * 0.08}" y="${h - seat - 120}" width="14" height="${seat + 120}" fill="${f}"/>
      <rect x="${w * 0.92 - 14}" y="${h - seat - 120}" width="14" height="${seat + 120}" fill="${f}"/>
      ${slat(h - seat - 120, 24)}${slat(h - seat - 82, 24)}
      ${slat(h - seat - 14, 28)}
      <rect x="${w * 0.08 - 6}" y="${h - 10}" width="26" height="10" rx="3" fill="${f}"/>
      <rect x="${w * 0.92 - 20}" y="${h - 10}" width="26" height="10" rx="3" fill="${f}"/>`, w, h);
    return { el: svg, w, h };
  },
};
