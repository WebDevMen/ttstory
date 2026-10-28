// «Чёрный рынок невозможного» — macro items of the market: the lot box (red string, lead seal, tag), the price tag
// with three lines, the death watch (pocket / wrist), the +24 h mirror (reflection = nested actors), the cassette of
// conditional bullets, the appraiser's desk with the leather chair, the frosted thermometer.
// Practical light from the top-left; brass and paper are the only warm surfaces; red = string, seal, danger.

const RED = "#e0283a", WARM = "#f2ede4", SODIUM = "#e8a23a";
const MONO = `"IBM Plex Mono", monospace`, COND = `"Oswald", sans-serif`;

// ------------------------------------------------------------------ lot_box: cardboard box, 3/4 view, origin bottom
// w (front width), label (tag text, "\n" — new line), open (track 0..1: lid lifts and falls back), string (track 0..1: tied),
// seal (track 0..1: intact), hole (track 0..1: bullet hole through), tag (track 0..1: tag visible), swing (tag sway amp),
// inside_tag (text of the tag lying on the bottom, shown when open)
export const lot_box = {
  origin: "bottom",
  grounded: true,
  size_m: { w: 0.4 },
  create(p, H) {
    const fw = p.w ?? 420, fh = Math.round(fw * 0.62), dx = Math.round(fw * 0.42), dy = Math.round(fw * 0.26);
    const w = fw + dx + 40, h = fh + dy + 260, x0 = 10, y0 = h - fh - 10, id = H.uid("lb");
    const card = p.color ?? "#6f675a", cardL = H.shade(card, 0.12), cardD = H.shade(card, -0.35), cardT = H.shade(card, 0.22);
    const label = String(p.label ?? "НЕ ОТКРЫВАТЬ\nДО 05:00").split("\n");
    // geometry: front face (x0,y0)-(x0+fw,y0+fh); right face skews up by (dx,-dy); top face
    const F = [[x0, y0], [x0 + fw, y0], [x0 + fw, y0 + fh], [x0, y0 + fh]];
    const R = [[x0 + fw, y0], [x0 + fw + dx, y0 - dy], [x0 + fw + dx, y0 - dy + fh], [x0 + fw, y0 + fh]];
    const T = [[x0, y0], [x0 + dx, y0 - dy], [x0 + fw + dx, y0 - dy], [x0 + fw, y0]];
    const pts = (a) => a.map((q) => q.join(",")).join(" ");
    const cx = x0 + fw / 2 + dx / 2, cy = y0 - dy / 2;    // centre of the top = knot
    const svg = H.svg(`<defs>
        <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cardL}"/><stop offset="1" stop-color="${H.shade(card, -0.15)}"/></linearGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${cardD}"/><stop offset="1" stop-color="${H.shade(card, -0.55)}"/></linearGradient>
        <radialGradient id="${id}s" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#c4c8cc"/><stop offset=".6" stop-color="#7d8288"/><stop offset="1" stop-color="#4a4e53"/></radialGradient>
        <filter id="${id}b"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <ellipse cx="${x0 + fw / 2 + dx / 2}" cy="${y0 + fh + 2}" rx="${fw * 0.7}" ry="${dy * 0.5}" fill="#000" opacity=".55" filter="url(#${id}b)"/>
      <polygon points="${pts(F)}" fill="url(#${id}f)"/>
      <polygon points="${pts(R)}" fill="url(#${id}r)"/>
      <g class="inner"><polygon points="${pts(T)}" fill="#0b0c0e"/>
        <polygon points="${x0 + 14},${y0} ${x0 + dx},${y0 - dy + 10} ${x0 + dx},${y0 - dy + fh * 0.5} ${x0 + 14},${y0 + 4}" fill="${H.shade(card, -0.6)}"/>
        <polygon points="${x0 + dx},${y0 - dy + 10} ${x0 + fw + dx - 12},${y0 - dy + 10} ${x0 + fw + dx - 12},${y0 - dy + fh * 0.5} ${x0 + dx},${y0 - dy + fh * 0.5}" fill="${H.shade(card, -0.5)}"/>
        <g class="dust"></g><g class="itag"></g></g>
      <g class="hole" opacity="0"><circle cx="${x0 + fw * 0.3}" cy="${y0 + fh * 0.42}" r="13" fill="#050506"/><circle cx="${x0 + fw * 0.3}" cy="${y0 + fh * 0.42}" r="18" fill="none" stroke="${cardT}" stroke-width="3" stroke-dasharray="4 5"/>
        <circle cx="${x0 + fw + dx * 0.55}" cy="${y0 - dy * 0.55 + fh * 0.4}" r="11" fill="#050506"/></g>
      <g class="str"><path d="M${x0 + fw / 2},${y0} V${y0 + fh} M${x0},${y0 + fh * 0.5} H${x0 + fw} M${x0 + fw},${y0 + fh * 0.5} L${x0 + fw + dx},${y0 - dy + fh * 0.5}" stroke="${RED}" stroke-width="7" fill="none"/>
        <path d="M${x0 + fw / 2},${y0} L${x0 + fw / 2 + dx},${y0 - dy} M${x0 + dx / 2},${y0 - dy / 2} L${x0 + fw + dx / 2},${y0 - dy / 2}" stroke="${RED}" stroke-width="6" fill="none"/></g>
      <g class="lid"><polygon points="${pts(T)}" fill="${cardT}"/><path d="M${x0 + dx / 2},${y0 - dy / 2} L${x0 + fw + dx / 2},${y0 - dy / 2}" stroke="${H.shade(card, -0.2)}" stroke-width="3"/>
        <path class="lstr" d="M${x0 + fw / 2},${y0} L${x0 + fw / 2 + dx},${y0 - dy} M${x0 + dx / 2},${y0 - dy / 2} L${x0 + fw + dx / 2},${y0 - dy / 2}" stroke="${RED}" stroke-width="7" fill="none"/></g>
      <g class="seal"><circle cx="${cx}" cy="${cy}" r="22" fill="url(#${id}s)"/><path d="M${cx - 10},${cy - 4} h20 M${cx - 8},${cy + 5} h16" stroke="#3b3f44" stroke-width="3"/>
        <path d="M${cx},${cy + 18} q-10,30 -26,44 M${cx},${cy + 18} q12,26 30,36" stroke="${RED}" stroke-width="5" fill="none"/></g>
      <g class="sealbits" opacity="0"><path d="M${cx - 30},${cy} a14,14 0 0 1 14,-16 l4,16 Z" fill="#7d8288"/><path d="M${cx + 30},${cy + 8} a14,14 0 0 1 -14,16 l-2,-18 Z" fill="#5d6268"/></g>
      <g class="tag"></g>`, w, h);
    const lid = svg.querySelector(".lid"), str = svg.querySelector(".str"), seal = svg.querySelector(".seal"), bits = svg.querySelector(".sealbits");
    const hole = svg.querySelector(".hole"), tag = svg.querySelector(".tag"), itag = svg.querySelector(".itag"), dust = svg.querySelector(".dust"), lstr = svg.querySelector(".lstr");
    const tw = Math.min(260, fw * 0.62), th = 46 + label.length * 38;
    const tagSvg = `<g><path d="M0,0 L-14,40" stroke="#c9c2b2" stroke-width="2"/><g transform="translate(-14,40)">
      <path d="M0,0 L${tw},0 L${tw},${th} L0,${th} L0,26 Z" fill="${WARM}" opacity=".95"/><circle cx="20" cy="22" r="8" fill="#20232a"/><circle cx="20" cy="22" r="12" fill="none" stroke="#b8b0a0" stroke-width="3"/>
      ${label.map((l, i) => `<text x="${tw / 2 + 12}" y="${52 + i * 38}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="${Math.min(30, (tw - 40) / Math.max(1, l.length) * 1.7)}" fill="${i === 0 ? RED : "#1a1c20"}">${l}</text>`).join("")}</g></g>`;
    const R2 = H.rng(p.seed ?? 4), motes = Array.from({ length: 26 }, () => [x0 + 30 + R2() * (fw + dx - 60), y0 - dy + 20 + R2() * fh * 0.5, R2(), 0.5 + R2()]);
    return {
      el: svg, w, h,
      update(t, it) {
        const open = it.v("open", 0), st = it.v("string", 1), sl = it.v("seal", 1), ho = it.v("hole", 0), tg = it.v("tag", p.tag ?? 1);
        // lid: lifts, rotates back around the far edge
        const a = Math.min(1, open);
        lid.setAttribute("transform", `translate(${a * 30},${-a * 260}) rotate(${-a * 28},${x0 + dx + fw / 2},${y0 - dy})`);
        lid.setAttribute("opacity", 1 - Math.max(0, open - 0.7) / 0.3);
        str.setAttribute("opacity", st); lstr.setAttribute("opacity", st);
        seal.setAttribute("opacity", sl); seal.setAttribute("transform", sl < 1 ? `translate(0,${(1 - sl) * 10})` : "");
        bits.setAttribute("opacity", sl < 1 && sl > 0.02 ? 1 - sl : 0);
        hole.setAttribute("opacity", ho);
        const sw = (p.swing ?? 4) * Math.sin(t * 1.7);
        tag.innerHTML = tg > 0 ? `<g transform="translate(${cx + 10},${cy + 30}) rotate(${12 + sw})" opacity="${tg * st}">${tagSvg}</g>` : "";
        dust.innerHTML = open > 0.5 ? motes.map(([x, y, ph, sp]) => { const k = (t * 0.08 * sp + ph) % 1; return `<circle cx="${x + Math.sin(t * sp + ph * 6) * 8}" cy="${y - k * 120}" r="${1.5 + ph * 2}" fill="${WARM}" opacity="${(open - 0.5) * 1.4 * (1 - k) * 0.7}"/>`; }).join("") : "";
        itag.innerHTML = open > 0.6 && p.inside_tag ? `<g transform="translate(${x0 + fw * 0.45},${y0 - dy * 0.35}) skewX(-30) scale(1,0.55)" opacity="${(open - 0.6) * 2.5}"><rect width="${fw * 0.5}" height="70" fill="${WARM}"/><text x="${fw * 0.25}" y="46" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="26" fill="#1a1c20">${p.inside_tag}</text></g>` : "";
      },
      anchor(name) { if (name === "seal") return [cx, cy]; if (name === "hole") return [x0 + fw * 0.3, y0 + fh * 0.42]; if (name === "top") return [cx, y0 - dy]; return null; },
    };
  },
};

// ------------------------------------------------------------------ price_tag: manila tag with three lines (origin center)
// rows: [{k, v}], show (track 0..N: rows revealed, fraction types the row), title (header), danger (row index in red),
// stamp (text), stamp_k (track 0..1), w, sign (track 0..1: signature drawn on the bottom line)
export const price_tag = {
  origin: "center",
  create(p, H) {
    const rows = p.rows ?? [{ k: "ЦЕНА", v: "—" }, { k: "ОГРАНИЧЕНИЕ", v: "—" }, { k: "ПОБОЧНО", v: "—" }];
    const w = p.w ?? 700, rh = 92, top = p.title ? 120 : 70, h = top + rows.length * rh + (p.sign_line ? 90 : 40), id = H.uid("pt");
    const R = H.rng(p.seed ?? 6);
    let spots = "";
    for (let i = 0; i < 30; i++) spots += `<ellipse cx="${R() * w}" cy="${R() * h}" rx="${8 + R() * 40}" ry="${4 + R() * 20}" fill="#6b5a3a" opacity="${0.03 + R() * 0.06}"/>`;
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3d6b8"/><stop offset="1" stop-color="#c7b791"/></linearGradient>
        <filter id="${id}s" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".6"/></filter></defs>
      <path d="M-120,-160 Q-40,-60 60,${h / 2 - 20}" stroke="#bfb6a2" stroke-width="3" fill="none"/>
      <g filter="url(#${id}s)"><path d="M90,0 L${w},0 L${w},${h} L90,${h} L0,${h / 2 + 40} L0,${h / 2 - 40} Z" fill="url(#${id})"/></g>
      ${spots}
      <circle cx="62" cy="${h / 2}" r="22" fill="#14161a"/><circle cx="62" cy="${h / 2}" r="30" fill="none" stroke="#9a8e74" stroke-width="7"/>
      ${p.title ? `<text x="130" y="76" font-family="${MONO}" font-weight="600" font-size="34" letter-spacing="4" fill="#5a4c34">${p.title}</text><line x1="130" x2="${w - 40}" y1="96" y2="96" stroke="#5a4c34" stroke-width="2" opacity=".5"/>` : ""}
      <g class="rows"></g><g class="sig"></g><g class="stamp"></g>`, w, h);
    const rowsG = svg.querySelector(".rows"), stampG = svg.querySelector(".stamp"), sig = svg.querySelector(".sig");
    return {
      el: svg, w, h,
      update(t, it) {
        const show = it.v("show", rows.length);
        let s = "";
        rows.forEach((r, i) => {
          const k = Math.max(0, Math.min(1, show - i));
          if (k <= 0) return;
          const y = top + i * rh + 58, vtxt = String(r.v), n = Math.ceil(vtxt.length * Math.min(1, k * 1.4));
          const red = p.danger === i || r.red;
          s += `<text x="130" y="${y - 34}" font-family="${MONO}" font-weight="600" font-size="24" letter-spacing="3" fill="#6d5e42" opacity="${Math.min(1, k * 3)}">${r.k}</text>
            <text x="130" y="${y + 14}" font-family="${COND}" font-weight="700" font-size="${p.size ?? 50}" fill="${red ? RED : "#16181c"}">${vtxt.slice(0, n)}</text>
            <line x1="130" x2="${w - 40}" y1="${y + 28}" y2="${y + 28}" stroke="#6d5e42" stroke-width="1.5" opacity=".35"/>`;
        });
        rowsG.innerHTML = s;
        const sg = it.v("sign", 0);
        sig.innerHTML = sg > 0 ? `<path d="M140,${h - 46} c30,-40 50,30 80,-6 s40,-30 60,4 s30,10 70,-16 s40,20 70,-4" stroke="#1b2a4a" stroke-width="4" fill="none" stroke-dasharray="600" stroke-dashoffset="${600 * (1 - sg)}"/>` : "";
        const sk = it.v("stamp_k", 0);
        stampG.innerHTML = p.stamp && sk > 0 ? `<g transform="translate(${w * 0.62},${h * 0.56}) rotate(-8) scale(${1 + (1 - Math.min(1, sk)) * 0.6})" opacity="${Math.min(1, sk * 1.5) * 0.9}">
            <rect x="-${p.stamp.length * 15 + 30}" y="-44" width="${p.stamp.length * 30 + 60}" height="88" fill="none" stroke="${RED}" stroke-width="7" rx="6"/>
            <text x="0" y="16" text-anchor="middle" font-family="${COND}" font-weight="700" font-size="46" fill="${RED}" letter-spacing="2">${p.stamp}</text></g>` : "";
      },
    };
  },
};

// ------------------------------------------------------------------ death_watch: market watch, macro (origin center)
// kind: pocket | wrist; display (track text in the aperture), disp_color, glow (track 0..1), hands: real time from `time` (track,
// hours) + seconds ticking; tick (bool), r (case radius), shake (track px: jumping display), stopped (track 0..1: hands stop)
export const death_watch = {
  origin: "center",
  create(p, H) {
    const kind = p.kind ?? "pocket", r = p.r ?? (kind === "wrist" ? 210 : 260), id = H.uid("dw");
    const w = r * 2 + 160, h = r * 2 + (kind === "wrist" ? 420 : 300), cx = w / 2, cy = kind === "wrist" ? h / 2 : h / 2 + 60;
    const metal = kind === "wrist" ? ["#cfd4d9", "#7b8188", "#3d4248"] : ["#f0cf86", "#b88a3a", "#5e431a"];
    let s = `<defs><radialGradient id="${id}c" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${metal[0]}"/><stop offset=".55" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/></radialGradient>
      <radialGradient id="${id}d" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#23262b"/><stop offset="1" stop-color="#0c0d10"/></radialGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter></defs>`;
    if (kind === "wrist") {
      s += `<path d="M${cx - r * 0.62},0 L${cx + r * 0.62},0 L${cx + r * 0.55},${cy - r + 10} L${cx - r * 0.55},${cy - r + 10} Z" fill="#1d1a17"/>
        <path d="M${cx - r * 0.55},${cy + r - 10} L${cx + r * 0.55},${cy + r - 10} L${cx + r * 0.62},${h} L${cx - r * 0.62},${h} Z" fill="#1d1a17"/>`;
      for (let y = 30; y < cy - r; y += 46) s += `<line x1="${cx - r * 0.5}" x2="${cx + r * 0.5}" y1="${y}" y2="${y}" stroke="#2b2622" stroke-width="3"/>`;
      for (let y = cy + r + 20; y < h; y += 46) s += `<line x1="${cx - r * 0.5}" x2="${cx + r * 0.5}" y1="${y}" y2="${y}" stroke="#2b2622" stroke-width="3"/>`;
      s += `<rect x="${cx + r - 6}" y="${cy - 26}" width="34" height="52" rx="8" fill="url(#${id}c)"/>`;
    } else {
      s += `<path d="M${cx},${cy - r - 70} C${cx - 220},${cy - r - 120} ${cx - 300},${cy - r - 40} ${-60},${cy - r - 160}" stroke="${metal[1]}" stroke-width="10" fill="none" stroke-dasharray="16 6"/>
        <circle cx="${cx}" cy="${cy - r - 52}" r="34" fill="none" stroke="url(#${id}c)" stroke-width="12"/><rect x="${cx - 24}" y="${cy - r - 30}" width="48" height="40" rx="8" fill="url(#${id}c)"/>`;
    }
    s += `<circle cx="${cx + 10}" cy="${cy + 16}" r="${r + 8}" fill="#000" opacity=".55" filter="url(#${id}b)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}c)"/><circle cx="${cx}" cy="${cy}" r="${r * 0.88}" fill="url(#${id}d)"/>`;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, big = i % 5 === 0, r1 = r * 0.84, r2 = r * (big ? 0.74 : 0.8);
      s += `<line x1="${cx + Math.sin(a) * r1}" y1="${cy - Math.cos(a) * r1}" x2="${cx + Math.sin(a) * r2}" y2="${cy - Math.cos(a) * r2}" stroke="${big ? "#d9d2c2" : "#6d6a64"}" stroke-width="${big ? 4 : 1.6}"/>`;
    }
    const aw = r * 0.95, ah = r * (kind === "wrist" ? 0.34 : 0.26), ay = cy + r * 0.2;
    s += `<rect x="${cx - aw / 2}" y="${ay}" width="${aw}" height="${ah}" rx="10" fill="#050506" stroke="${metal[1]}" stroke-width="4"/>
      <g class="disp"></g>
      <g class="hands"></g>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.88}" fill="url(#${id}g)"/>
      <path d="M${cx - r * 0.6},${cy - r * 0.55} Q${cx - r * 0.2},${cy - r * 0.86} ${cx + r * 0.3},${cy - r * 0.8}" stroke="#fff" stroke-opacity=".35" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    const svg = H.svg(s, w, h);
    const disp = svg.querySelector(".disp"), hands = svg.querySelector(".hands");
    const dcol = H.col(p.disp_color ?? SODIUM);
    return {
      el: svg, w, h,
      update(t, it) {
        const stop = it.v("stopped", 0), tm = it.v("time", p.time ?? 3.2) + (stop ? 0 : 0);
        const sec = stop >= 1 ? (p.stop_sec ?? 0) : (p.tick === false ? 0 : Math.floor(t * (p.tick_rate ?? 1)) % 60);
        const ha = (tm % 12) / 12 * 360, ma = (tm % 1) * 360, sa = sec * 6;
        const hand = (a, len, wd, c) => `<line x1="${cx - Math.sin(a * Math.PI / 180) * len * 0.18}" y1="${cy + Math.cos(a * Math.PI / 180) * len * 0.18}" x2="${cx + Math.sin(a * Math.PI / 180) * len}" y2="${cy - Math.cos(a * Math.PI / 180) * len}" stroke="${c}" stroke-width="${wd}" stroke-linecap="round"/>`;
        hands.innerHTML = hand(ha, r * 0.45, 9, "#e8e1d0") + hand(ma, r * 0.66, 6, "#e8e1d0") + hand(sa, r * 0.74, 2.5, RED) + `<circle cx="${cx}" cy="${cy}" r="9" fill="${metal[1]}"/>`;
        const txt = String(it.v("display", p.display ?? "--.--.---- --:--")), gl = it.v("glow", 1), shk = it.v("shake", 0);
        const jx = shk ? (H.rng(Math.floor(t * 30))() - 0.5) * shk : 0;
        const fs = Math.min(ah * 0.62, (aw - 30) / Math.max(1, txt.length) * 1.62);
        disp.innerHTML = `<text x="${cx + jx}" y="${ay + ah / 2 + fs * 0.36}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="${fs}" fill="${dcol}" opacity="${0.35 + 0.65 * gl}" style="filter:drop-shadow(0 0 ${8 * gl}px ${dcol})">${txt}</text>`;
      },
      anchor(name) { if (name === "display") return [cx, ay + ah / 2]; if (name === "top") return [cx, cy - r]; return null; },
    };
  },
};

// ------------------------------------------------------------------ mirror_24: cast-iron framed mirror; reflection = children (origin center)
// w, h, children (actors in the glass's local px, 0..w-2*border), ripple (track 0..1: the reflection wobbles),
// tint, frost (0..1), crack (bool), stamp ("+24 Ч" corner tag)
export const mirror_24 = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? 640, h = p.h ?? 900, b = p.border ?? 46, id = H.uid("mr");
    const el = H.div(`width:${w}px;height:${h}px`);
    const iw = w - 2 * b, ih = h - 2 * b;
    const arch = `M${b},${b + iw * 0.35} Q${b},${b} ${w / 2},${b} Q${w - b},${b} ${w - b},${b + iw * 0.35} L${w - b},${h - b} L${b},${h - b} Z`;
    const frame = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4f56"/><stop offset=".5" stop-color="#1c1f23"/><stop offset="1" stop-color="#2d3136"/></linearGradient>
        <clipPath id="${id}c"><path d="${arch}"/></clipPath></defs>
      <path d="M0,${iw * 0.35 + b} Q0,0 ${w / 2},0 Q${w},0 ${w},${iw * 0.35 + b} L${w},${h} L0,${h} Z" fill="url(#${id})"/>
      <path d="M8,${iw * 0.35 + b} Q8,8 ${w / 2},8 Q${w - 8},8 ${w - 8},${iw * 0.35 + b}" stroke="#7b828a" stroke-width="3" fill="none" opacity=".7"/>
      ${Array.from({ length: 9 }, (_, i) => `<circle cx="${w / 2 + Math.cos(Math.PI + (i / 8) * Math.PI) * (w / 2 - 22)}" cy="${b + iw * 0.35 + Math.sin(Math.PI + (i / 8) * Math.PI) * (iw * 0.35 + b - 22)}" r="7" fill="#5b6168"/>`).join("")}
      <path d="${arch}" fill="#0d1014"/>`, w, h);
    const glass = H.div(`left:${b}px;top:${b}px;width:${iw}px;height:${ih}px;overflow:hidden`);
    // clip with svg-path coordinates relative to the glass box
    const rel = `M0,${iw * 0.35} Q0,0 ${iw / 2},0 Q${iw},0 ${iw},${iw * 0.35} L${iw},${ih} L0,${ih} Z`;
    glass.style.clipPath = `path('${rel}')`;
    const content = H.div(`width:${iw}px;height:${ih}px`);
    glass.append(content);
    for (const c of p.children || []) await H.child(c, content);
    const over = H.svg(`<defs><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#e8f2ff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}f" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#cfd8e0" stop-opacity="0"/><stop offset="1" stop-color="#cfd8e0" stop-opacity=".5"/></radialGradient></defs>
      <path d="${arch}" fill="${p.tint ?? "rgba(120,150,180,.12)"}"/>
      <path class="sheen" d="M${b},${h * 0.7} L${b + 120},${h * 0.7} L${w - b},${b + 80} L${w - b - 120},${b + 80} Z" fill="url(#${id}s)"/>
      <path d="${arch}" fill="url(#${id}f)" opacity="${p.frost ?? 0.6}"/>
      ${p.crack ? `<path d="M${w * 0.7},${h * 0.2} l-40,90 l30,40 l-60,120 M${w * 0.7 - 40},${h * 0.2 + 90} l-70,20" stroke="#dfe6ec" stroke-width="2" fill="none" opacity=".6"/>` : ""}
      ${p.stamp ? `<g transform="translate(${w - b - 20},${h - b - 30})"><rect x="-150" y="-40" width="150" height="52" fill="rgba(7,8,10,.75)"/><text x="-75" y="-5" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="30" fill="${WARM}">${p.stamp}</text></g>` : ""}`, w, h);
    const sheen = over.querySelector(".sheen");
    el.append(frame, glass, over);
    return {
      el, w, h,
      update(t, it) {
        const rp = it.v("ripple", 0);
        content.style.filter = rp > 0.01 ? `blur(${rp * 7}px) brightness(${1 + rp * 0.6})` : "";
        content.style.transform = rp > 0.01 ? `skewX(${Math.sin(t * 20) * rp * 4}deg) scale(${1 + rp * 0.04})` : "";
        sheen.setAttribute("transform", `translate(${Math.sin(t * 0.4) * 40},0)`);
      },
    };
  },
};

// ------------------------------------------------------------------ bullet_macro: wooden cassette with brass cartridges (origin center)
// n (holes), count (track: cartridges present), engrave (text on the cases), glow (track 0..1: engraving lights up)
export const bullet_macro = {
  origin: "center",
  create(p, H) {
    const n = p.n ?? 6, cw = 92, gap = 26, w = n * (cw + gap) + 120, h = 560, id = H.uid("bm");
    let s = `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4a22"/><stop offset=".25" stop-color="#e6c06a"/><stop offset=".45" stop-color="#fff0c0"/><stop offset=".7" stop-color="#b98a3a"/><stop offset="1" stop-color="#5a3c18"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a2a14"/><stop offset=".35" stop-color="#d0804a"/><stop offset=".55" stop-color="#f4b884"/><stop offset="1" stop-color="#4a2210"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2717"/><stop offset="1" stop-color="#1c120a"/></linearGradient>
      <filter id="${id}f"><feGaussianBlur stdDeviation="6"/></filter></defs>
      <ellipse cx="${w / 2}" cy="${h - 20}" rx="${w * 0.5}" ry="26" fill="#000" opacity=".6" filter="url(#${id}f)"/>
      <path d="M30,${h - 200} L${w - 30},${h - 200} L${w - 10},${h - 40} L10,${h - 40} Z" fill="url(#${id}w)"/>
      <path d="M30,${h - 200} L${w - 30},${h - 200} L${w - 40},${h - 230} L40,${h - 230} Z" fill="#4c331d"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M${40 + i * 6},${h - 160 + i * 12} Q${w / 2},${h - 170 + i * 14} ${w - 40 - i * 6},${h - 158 + i * 12}" stroke="#2a1a0e" stroke-width="2" fill="none" opacity=".6"/>`;
    s += `<g class="carts"></g>`;
    const svg = H.svg(s, w, h), carts = svg.querySelector(".carts");
    const words = String(p.engrave ?? "БЕГУЩЕГО").split("");
    return {
      el: svg, w, h,
      update(t, it) {
        const cnt = it.v("count", n), gl = it.v("glow", 0);
        let c = "";
        for (let i = 0; i < n; i++) {
          const x = 60 + gap / 2 + i * (cw + gap), y = h - 214;
          c += `<ellipse cx="${x + cw / 2}" cy="${y}" rx="${cw / 2 + 6}" ry="16" fill="#120b06"/>`;
          if (i >= cnt) continue;
          c += `<rect x="${x}" y="${y - 230}" width="${cw}" height="230" fill="url(#${id}b)"/><ellipse cx="${x + cw / 2}" cy="${y}" rx="${cw / 2}" ry="12" fill="#7a5a26"/>
            <path d="M${x + 4},${y - 230} Q${x + cw / 2},${y - 400} ${x + cw - 4},${y - 230} Z" fill="url(#${id}h)"/>
            <rect x="${x}" y="${y - 236}" width="${cw}" height="10" fill="#8a6a2c"/>
            <text x="${x + cw / 2}" y="${y - 120}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="22" fill="${gl > 0.05 ? SODIUM : "#5a3c18"}" opacity="${0.55 + gl * 0.45}" transform="rotate(-90 ${x + cw / 2} ${y - 120})" style="${gl > 0.05 ? `filter:drop-shadow(0 0 ${6 * gl}px ${SODIUM})` : ""}" letter-spacing="2">${words.join("")}</text>`;
        }
        carts.innerHTML = c;
      },
    };
  },
};

// ------------------------------------------------------------------ appraiser_desk: desk front, banker's lamp, scale, loupe; chair behind
// w, chair (bool), chair_dx, lamp (track 0..1), scale_text (track: dial display), book (bool), lamp_x
export const appraiser_desk = {
  origin: "bottom",
  grounded: true,
  surface: true,
  size_m: { w: 1.8 },
  create(p, H) {
    const w = p.w ?? 980, dh = 360, ch = p.chair === false ? 0 : 520, h = dh + Math.max(ch + 12, 200), id = H.uid("ad");
    const top = h - dh, lx = p.lamp_x ?? 200, cdx = p.chair_dx ?? 0;
    let s = `<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a281a"/><stop offset="1" stop-color="#150d07"/></linearGradient>
      <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d12"/><stop offset="1" stop-color="#46301d"/></linearGradient>
      <radialGradient id="${id}l" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a0f0b"/><stop offset=".45" stop-color="#4a2a1c"/><stop offset="1" stop-color="#140c08"/></linearGradient></defs>`;
    if (ch) {
      const cx = w / 2 + cdx;
      s += `<path d="M${cx - 190},${top + 30} L${cx - 200},${top - ch + 90} Q${cx - 196},${top - ch} ${cx - 120},${top - ch - 8} L${cx + 120},${top - ch - 8} Q${cx + 196},${top - ch} ${cx + 200},${top - ch + 90} L${cx + 190},${top + 30} Z" fill="url(#${id}c)"/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += `<circle cx="${cx - 120 + c * 80}" cy="${top - ch + 70 + r * 90}" r="5" fill="#8a5a36" opacity=".8"/>`;
      s += `<path d="M${cx - 250},${top + 20} L${cx - 240},${top - 200} Q${cx - 250},${top - 260} ${cx - 190},${top - 250} L${cx - 180},${top + 20} Z M${cx + 250},${top + 20} L${cx + 240},${top - 200} Q${cx + 250},${top - 260} ${cx + 190},${top - 250} L${cx + 180},${top + 20} Z" fill="#26150e"/>
        <path d="M${cx - 120},${top - ch - 8} Q${cx},${top - ch - 20} ${cx + 120},${top - ch - 8}" stroke="#a0704a" stroke-width="4" fill="none" opacity=".5"/>`;
    }
    s += `<g class="pool"><ellipse cx="${lx + 60}" cy="${top + 10}" rx="420" ry="70" fill="url(#${id}l)"/></g>
      <path d="M-20,${top} L${w + 20},${top} L${w + 40},${top + 34} L-40,${top + 34} Z" fill="url(#${id}t)"/>
      <rect x="-40" y="${top + 34}" width="${w + 80}" height="${dh - 34}" fill="url(#${id}w)"/>
      <rect x="20" y="${top + 70}" width="${w * 0.36}" height="110" fill="none" stroke="#5a3e26" stroke-width="4"/><rect x="${w - 20 - w * 0.36}" y="${top + 70}" width="${w * 0.36}" height="110" fill="none" stroke="#5a3e26" stroke-width="4"/>
      <circle cx="${20 + w * 0.18}" cy="${top + 125}" r="8" fill="#b48a4a"/><circle cx="${w - 20 - w * 0.18}" cy="${top + 125}" r="8" fill="#b48a4a"/>
      <rect x="20" y="${top + 200}" width="${w * 0.36}" height="110" fill="none" stroke="#5a3e26" stroke-width="4"/><rect x="${w - 20 - w * 0.36}" y="${top + 200}" width="${w * 0.36}" height="110" fill="none" stroke="#5a3e26" stroke-width="4"/>`;
    // banker's lamp
    s += `<g class="lamp"><rect x="${lx + 40}" y="${top - 16}" width="80" height="16" rx="6" fill="#a8823e"/><rect x="${lx + 74}" y="${top - 120}" width="12" height="104" fill="#a8823e"/>
      <path d="M${lx - 10},${top - 110} Q${lx + 80},${top - 180} ${lx + 170},${top - 110} Z" fill="#1d5a3a"/><path d="M${lx - 10},${top - 110} Q${lx + 80},${top - 180} ${lx + 170},${top - 110}" stroke="#4f9a6e" stroke-width="3" fill="none"/>
      <path class="glowl" d="M${lx},${top - 110} L${lx + 160},${top - 110} L${lx + 150},${top - 102} L${lx + 10},${top - 102} Z" fill="#fff1c8"/></g>`;
    // loupe + ledger
    s += `<g transform="translate(${w * 0.44},${top - 6})"><ellipse cx="0" cy="0" rx="34" ry="10" fill="#111"/><rect x="-26" y="-40" width="52" height="40" rx="10" fill="#1a1c20"/><ellipse cx="0" cy="-40" rx="24" ry="7" fill="#7b8a96"/></g>`;
    if (p.book !== false) s += `<path d="M${w * 0.52},${top - 4} L${w * 0.7},${top - 4} L${w * 0.72},${top - 22} L${w * 0.54},${top - 22} Z" fill="#3a1a14"/><path d="M${w * 0.54},${top - 22} L${w * 0.72},${top - 22} L${w * 0.73},${top - 28} L${w * 0.55},${top - 28} Z" fill="#d8ccb0"/>`;
    // dial scale (right)
    const sx = w - 150, sy = top;
    s += `<g><path d="M${sx - 90},${sy} L${sx + 90},${sy} L${sx + 70},${sy - 60} L${sx - 70},${sy - 60} Z" fill="#5f666d"/><rect x="${sx - 110}" y="${sy - 76}" width="220" height="16" rx="6" fill="#8a9198"/>
      <circle cx="${sx}" cy="${sy - 30}" r="26" fill="#e8e2d4"/><line class="needle" x1="${sx}" y1="${sy - 30}" x2="${sx}" y2="${sy - 52}" stroke="${RED}" stroke-width="3"/>
      <rect x="${sx - 56}" y="${sy - 20}" width="112" height="0" fill="#000"/></g><g class="sdisp"></g>`;
    const svg = H.svg(s, w, h);
    const pool = svg.querySelector(".pool"), glowl = svg.querySelector(".glowl"), sdisp = svg.querySelector(".sdisp");
    return {
      el: svg, w, h,
      update(t, it) {
        const on = it.v("lamp", 1);
        pool.setAttribute("opacity", on); glowl.setAttribute("opacity", 0.25 + 0.75 * on);
        const st = it.v("scale_text", p.scale_text ?? "");
        sdisp.innerHTML = st ? `<rect x="${sx - 70}" y="${sy - 136}" width="140" height="48" rx="6" fill="#050506"/><text x="${sx}" y="${sy - 101}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="30" fill="${SODIUM}">${st}</text>` : "";
      },
      anchor(name) { if (name === "top") return [w / 2, top]; if (name === "scale") return [sx, sy - 112]; if (name === "lamp") return [lx + 80, top - 110]; if (name === "chair") return [w / 2 + cdx, top - ch / 2]; return null; },
    };
  },
};

// ------------------------------------------------------------------ thermometer: dial gauge on a frosted pipe (origin center)
// value (track °C), drip (bool: a drop forms and falls from the valve every ~2.5 s)
export const thermometer = {
  origin: "center",
  create(p, H) {
    const w = 1300, h = 900, cx = 640, cy = 380, r = 220, id = H.uid("th");
    const R = H.rng(p.seed ?? 3);
    let s = `<defs><linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ab"/><stop offset=".45" stop-color="#d5dde3"/><stop offset="1" stop-color="#4b535a"/></linearGradient>
      <radialGradient id="${id}d" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#f0ebe0"/><stop offset="1" stop-color="#bdb6a6"/></radialGradient>
      <filter id="${id}b"><feGaussianBlur stdDeviation="2"/></filter></defs>
      <rect x="-200" y="${cy + 230}" width="${w + 400}" height="170" fill="url(#${id}p)"/>`;
    for (let i = 0; i < 160; i++) { const x = -200 + R() * (w + 400), y = cy + 220 + R() * 190; s += `<path d="M${x},${y} l${4 + R() * 8},${-6 - R() * 10} m-${2 + R() * 4},${3} l${6 + R() * 6},2" stroke="#f4f8fb" stroke-width="${1 + R() * 2}" opacity="${0.4 + R() * 0.5}"/>`; }
    s += `<rect x="${cx - 26}" y="${cy + r - 10}" width="52" height="90" fill="#6a737b"/>
      <circle cx="${cx}" cy="${cy}" r="${r + 26}" fill="#3d444b"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}d)"/>`;
    for (let v = -40; v <= 40; v += 5) {
      const a = (-135 + ((v + 40) / 80) * 270) * Math.PI / 180, big = v % 10 === 0;
      s += `<line x1="${cx + Math.sin(a) * r * 0.86}" y1="${cy - Math.cos(a) * r * 0.86}" x2="${cx + Math.sin(a) * r * (big ? 0.72 : 0.78)}" y2="${cy - Math.cos(a) * r * (big ? 0.72 : 0.78)}" stroke="${v < 0 ? "#1c3a5a" : "#5a1c1c"}" stroke-width="${big ? 4 : 2}"/>`;
      if (big) s += `<text x="${cx + Math.sin(a) * r * 0.58}" y="${cy - Math.cos(a) * r * 0.58 + 10}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="28" fill="#20242a">${v}</text>`;
    }
    s += `<text x="${cx}" y="${cy + r * 0.48}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="30" fill="#20242a">°C</text>
      <g class="ndl"></g><circle cx="${cx}" cy="${cy}" r="16" fill="#2a2f35"/>
      <path d="M${cx - r * 0.7},${cy - r * 0.5} Q${cx - r * 0.2},${cy - r * 0.95} ${cx + r * 0.4},${cy - r * 0.8}" stroke="#fff" stroke-opacity=".45" stroke-width="12" fill="none" stroke-linecap="round"/>
      <g transform="translate(${cx + 400},${cy + 230})"><rect x="-30" y="-70" width="60" height="70" fill="#7b2a22"/><rect x="-70" y="-90" width="140" height="22" rx="10" fill="#9a3a2e"/></g>
      <g class="drop"></g>`;
    for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, rr = r + 10 + R() * 24; s += `<circle cx="${cx + Math.cos(a) * rr}" cy="${cy + Math.sin(a) * rr}" r="${1 + R() * 3}" fill="#f4f8fb" opacity="${0.5 + R() * 0.5}"/>`; }
    const svg = H.svg(s, w, h), ndl = svg.querySelector(".ndl"), drop = svg.querySelector(".drop");
    return {
      el: svg, w, h,
      update(t, it) {
        const v = it.v("value", p.value ?? -18) + Math.sin(t * 13) * 0.5;
        const a = -135 + ((v + 40) / 80) * 270;
        ndl.innerHTML = `<line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(a * Math.PI / 180) * r * 0.8}" y2="${cy - Math.cos(a * Math.PI / 180) * r * 0.8}" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>`;
        if (p.drip !== false) {
          const k = (t % 2.6) / 2.6, dx = cx + 400, dy = cy + 236;
          drop.innerHTML = k < 0.7 ? `<ellipse cx="${dx}" cy="${dy + k * 18}" rx="${4 + k * 8}" ry="${5 + k * 12}" fill="#cfe3f0" opacity=".85"/>` : `<ellipse cx="${dx}" cy="${dy + 14 + (k - 0.7) * 1400}" rx="7" ry="12" fill="#cfe3f0" opacity=".8"/>`;
        }
      },
    };
  },
};
