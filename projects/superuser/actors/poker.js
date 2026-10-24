// Project actors for «Он видел карты всех игроков» (афера №2): monitor, spreadsheet, bell_curve, waveform.
// Times in params are absolute seconds after compile ("@слово" works in YAML).

const MONO = (H) => `"${H.fonts.mono}", monospace`;

// ------------------------------------------------------------------ monitor: an app window on a dark screen
// w, h, title, color (title bar accent), children (items in window-local px, origin = top-left of the content area),
// bg (content background). Anchor: screen (content centre)
export const monitor = {
  origin: "center",
  async create(p, H, item) {
    const w = p.w ?? 900, h = p.h ?? 620, bar = 54, acc = H.col(p.color ?? "#4de1ff");
    const el = H.div(`width:${w}px;height:${h}px;border-radius:18px;background:#0b0f18;overflow:hidden;
      box-shadow:0 0 0 3px ${H.rgba(acc, 0.45)}, 0 0 50px ${H.rgba(acc, 0.25)}, 0 30px 60px rgba(0,0,0,.6)`);
    el.innerHTML = `<div style="position:absolute;left:0;top:0;width:${w}px;height:${bar}px;background:#161c2a;display:flex;align-items:center;gap:12px;padding:0 20px;box-sizing:border-box">
        <span style="width:16px;height:16px;border-radius:50%;background:#ff5f57"></span><span style="width:16px;height:16px;border-radius:50%;background:#febc2e"></span>
        <span style="width:16px;height:16px;border-radius:50%;background:#28c840"></span>
        <span style="margin-left:16px;font:700 24px ${MONO(H)};color:#aab4c8;white-space:nowrap">${H.markup(p.title ?? "")}</span></div>`;
    const body = H.div(`left:0;top:${bar}px;width:${w}px;height:${h - bar}px;overflow:hidden;background:${H.col(p.bg ?? "#0b0f18")}`);
    el.appendChild(body);
    if (item?.fx && !el.parentNode) item.fx.appendChild(el);
    for (const c of p.children || []) await H.child(c, body);
    return { el, w, h, anchor(name) { return name === "screen" ? [w / 2, bar + (h - bar) / 2] : null; } };
  },
};

// ------------------------------------------------------------------ spreadsheet: a table with running rows (Excel look)
// columns: [{name, w}], rows: [[cell, …]] (fixed rows on top), gen: {count, seed} (generate hand-history rows below),
// marks: [{row, at, color, solid}] (row lights up; solid: a filled bar with white text), mark_col: {col, at, color} (a column lights up), scroll (track: rows
// scrolled), w, h, row_h, size. Cells may use **bold** / [text](#color) markup.
export const spreadsheet = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 1000, h = p.h ?? 1100, rh = p.row_h ?? 56, size = p.size ?? 26;
    const cols = p.columns || [{ name: "A", w: 0.25 }, { name: "B", w: 0.25 }, { name: "C", w: 0.25 }, { name: "D", w: 0.25 }];
    const tot = cols.reduce((a, c) => a + (c.w ?? 1), 0);
    const cw = cols.map((c) => ((c.w ?? 1) / tot) * (w - 70));
    const rnd = H.rng(p.gen?.seed ?? 11);
    const R = "AKQJT98765432", S = ["♠", "♥", "♦", "♣"], nick = ["Ace_Hunter", "lucky_lena", "Marco_K", "bluffmaster", "riverRat", "NIGHTOWL", "Frodo77", "chipleader", "Svetik", "DonkeyKong"];
    const card = () => { const r = R[Math.floor(rnd() * 13)], s = S[Math.floor(rnd() * 4)]; return `${r === "T" ? "10" : r}${s}`; };
    const rows = [...(p.rows || [])];
    for (let i = 0; i < (p.gen?.count ?? 60); i++) {
      rows.push([`#${(48210 + i * 7).toString()}`, nick[Math.floor(rnd() * nick.length)], `${card()} ${card()}`,
        `${Math.floor(rnd() * 200 + 24)}.${Math.floor(rnd() * 250)}.**.${Math.floor(rnd() * 250)}`]);
    }
    const el = H.div(`width:${w}px;height:${h}px;border-radius:14px;overflow:hidden;background:#ffffff;box-shadow:0 30px 70px rgba(0,0,0,.6);
      font:600 ${size}px ${MONO(H)};color:#1d2433`);
    const head = H.div(`left:0;top:0;width:${w}px;height:${rh}px;background:#1f7a46;color:#fff;display:flex;font-weight:800;z-index:2`);
    head.innerHTML = `<div style="width:70px;flex:none;background:#176038"></div>` + cols.map((c, i) => `<div style="width:${cw[i]}px;flex:none;padding:0 12px;
      box-sizing:border-box;line-height:${rh}px;border-left:1px solid rgba(255,255,255,.25);white-space:nowrap;overflow:hidden">${H.markup(c.name)}</div>`).join("");
    const bodyEl = H.div(`left:0;top:${rh}px;width:${w}px;height:${h - rh}px;overflow:hidden`);
    const inner = H.div(`left:0;top:0;width:${w}px`);
    rows.forEach((r, i) => {
      const d = H.div(`left:0;top:${i * rh}px;width:${w}px;height:${rh}px;display:flex;border-bottom:1px solid #dde3ea;background:${i % 2 ? "#f4f7fa" : "#fff"}`);
      d.dataset.row = i;
      d.innerHTML = `<div style="width:70px;flex:none;background:#e9eef3;color:#7a8696;text-align:center;line-height:${rh}px;font-size:${size * 0.8}px">${i + 1}</div>` +
        r.map((c, j) => `<div class="c${j}" style="width:${cw[j] ?? 100}px;flex:none;padding:0 12px;box-sizing:border-box;line-height:${rh}px;white-space:nowrap;overflow:hidden;
          border-left:1px solid #dde3ea">${H.markup(String(c))}</div>`).join("");
      inner.appendChild(d);
    });
    bodyEl.appendChild(inner);
    el.append(head, bodyEl);
    const rowEls = [...inner.children];
    const marks = (p.marks || []).map((m) => ({ ...m, el: rowEls[m.row] }));
    const mc = p.mark_col;
    return {
      el, w, h,
      update(t, it) {
        inner.style.transform = `translateY(${-it.v("scroll", 0) * rh}px)`;
        for (const m of marks) {
          if (!m.el) continue;
          const k = H.P(t, m.at ?? 0, 0.25), c = H.col(m.color ?? "#ff3b4e");
          if (m.solid) {                          // the whole row turns into a solid alarm bar with white bold text
            m.el.style.background = k > 0 ? c : "";
            m.el.style.color = k > 0 ? "#ffffff" : "";
            m.el.style.fontWeight = k > 0 ? 900 : "";
            m.el.style.boxShadow = k > 0 ? `0 0 ${24 * k * (0.7 + 0.3 * Math.sin(t * 6))}px ${c}` : "none";
          } else {
            m.el.style.background = k > 0 ? H.rgba(c, 0.18 + 0.12 * k * (0.5 + 0.5 * Math.sin(t * 6))) : "";
            m.el.style.boxShadow = k > 0 ? `inset 0 0 0 ${3 * k}px ${c}` : "none";
          }
        }
        if (mc) {
          const k = H.P(t, mc.at ?? 0, 0.3), c = H.col(mc.color ?? "#4de1ff");
          inner.querySelectorAll(`.c${mc.col}`).forEach((d) => { d.style.background = k > 0 ? H.rgba(c, 0.28 * k) : ""; d.style.fontWeight = k > 0 ? 900 : 600; });
        }
      },
    };
  },
};

// ------------------------------------------------------------------ bell_curve: distribution of results with one outlier
// w, h, draw (track 0..1 curve reveal), dots (number of players under the curve), outlier (track: x of the red dot in
// "sigmas", e.g. 0 → 9), outlier_at (when it appears), label, color, axis (text under the x axis)
export const bell_curve = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 980, h = p.h ?? 700, base = h - 90, peak = 120, left = 40, sig = (w * 0.5) / 4.2;
    const mu = left + sig * 3.2, c = H.col(p.color ?? "#9aa6c4"), red = H.col(p.red ?? "#ff3b4e");
    const X = (s) => mu + s * sig;
    const Y = (s) => base - (base - peak) * Math.exp(-0.5 * s * s);
    let d = `M${X(-3.2)},${base}`;
    for (let s = -3.2; s <= 3.2; s += 0.1) d += ` L${X(s).toFixed(1)},${Y(s).toFixed(1)}`;
    d += ` L${X(3.2)},${base} Z`;
    const rnd = H.rng(p.seed ?? 5);
    const dots = Array.from({ length: p.dots ?? 140 }, () => {
      let s; do { s = (rnd() + rnd() + rnd() + rnd() - 2) * 1.7; } while (Math.abs(s) > 3);
      return [X(s), base - 14 - rnd() * (base - Y(s) - 24)];
    });
    const svg = H.svg(`<defs><clipPath id="bcclip"><rect class="cl" x="0" y="0" width="0" height="${h}"/></clipPath></defs>
      <line x1="0" y1="${base}" x2="${w}" y2="${base}" stroke="${H.rgba("#ffffff", 0.5)}" stroke-width="4"/>
      <g clip-path="url(#bcclip)"><path d="${d}" fill="${H.rgba(c, 0.18)}" stroke="${c}" stroke-width="5"/>
      ${dots.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${H.rgba("#ffffff", 0.55)}"/>`).join("")}</g>
      <text x="${mu}" y="${base + 60}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="30" fill="${H.rgba("#ffffff", 0.7)}">${p.axis ?? ""}</text>
      <g class="ol"><line class="oll" x1="0" y1="${base}" x2="0" y2="${peak}" stroke="${red}" stroke-width="4" stroke-dasharray="10 10"/>
        <circle class="olc" r="20" fill="${red}"/><text class="olt" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="34" fill="${red}">${p.label ?? ""}</text></g>`, w, h);
    svg.querySelector("clipPath").id = H.uid("bc");
    const clipId = svg.querySelector("clipPath").id;
    svg.querySelector("g[clip-path]").setAttribute("clip-path", `url(#${clipId})`);
    const cl = svg.querySelector(".cl"), ol = svg.querySelector(".ol"), oll = svg.querySelector(".oll"), olc = svg.querySelector(".olc"), olt = svg.querySelector(".olt");
    return {
      el: svg, w, h,
      update(t, it) {
        cl.setAttribute("width", w * H.clamp(it.v("draw", 1)));
        const at = p.outlier_at ?? 1e9, on = t >= at;
        ol.style.opacity = on ? 1 : 0;
        if (on) {
          const x = X(it.v("outlier", 4)), y = base - 120;
          olc.setAttribute("cx", x); olc.setAttribute("cy", y);
          oll.setAttribute("x1", x); oll.setAttribute("x2", x); oll.setAttribute("y1", base); oll.setAttribute("y2", y);
          olt.setAttribute("x", x); olt.setAttribute("y", y - 40);
          olc.setAttribute("r", 20 + 6 * Math.max(0, Math.sin(t * 8)));
        }
      },
    };
  },
};

// ------------------------------------------------------------------ waveform: a cassette recorder with a live audio wave
// w, play (track 0..1: reels spin and the wave moves), color, label
export const waveform = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 640, c = H.col(p.color ?? "#ffd34d");
    const svg = H.svg(`
      <rect x="${w * 0.12}" y="0" width="${w * 0.76}" height="${h * 0.5}" rx="26" fill="#1c1f2a" stroke="#3a4054" stroke-width="5"/>
      <rect x="${w * 0.2}" y="${h * 0.08}" width="${w * 0.6}" height="${h * 0.24}" rx="14" fill="#e9e3d6"/>
      <text x="${w / 2}" y="${h * 0.15}" text-anchor="middle" font-family="JBM" font-weight="700" font-size="26" fill="#3a3a3a">${p.label ?? ""}</text>
      <rect x="${w * 0.3}" y="${h * 0.17}" width="${w * 0.4}" height="${h * 0.12}" rx="40" fill="#14161c"/>
      <g class="r1" transform="translate(${w * 0.38},${h * 0.23})"><circle r="${h * 0.05}" fill="#e9e3d6"/>${[0, 60, 120].map((a) => `<rect x="-4" y="${-h * 0.05}" width="8" height="${h * 0.1}" fill="#14161c" transform="rotate(${a})"/>`).join("")}</g>
      <g class="r2" transform="translate(${w * 0.62},${h * 0.23})"><circle r="${h * 0.05}" fill="#e9e3d6"/>${[0, 60, 120].map((a) => `<rect x="-4" y="${-h * 0.05}" width="8" height="${h * 0.1}" fill="#14161c" transform="rotate(${a})"/>`).join("")}</g>
      <circle cx="${w * 0.8}" cy="${h * 0.42}" r="12" class="led" fill="#ff3040"/>
      <g class="wave"></g>`, w, h);
    const wave = svg.querySelector(".wave"), r1 = svg.querySelector(".r1"), r2 = svg.querySelector(".r2"), led = svg.querySelector(".led");
    const n = 48, bw = w / n, wy = h * 0.78;
    const bars = Array.from({ length: n }, (_, i) => H.el("rect", { x: i * bw + 3, width: bw - 6, rx: (bw - 6) / 2, fill: c }, wave));
    return {
      el: svg, w, h,
      update(t, it) {
        const pl = H.clamp(it.v("play", 1));
        r1.setAttribute("transform", `translate(${w * 0.38},${h * 0.23}) rotate(${t * 200 * pl})`);
        r2.setAttribute("transform", `translate(${w * 0.62},${h * 0.23}) rotate(${t * 200 * pl})`);
        led.setAttribute("opacity", pl > 0 && Math.sin(t * 6) > 0 ? 1 : 0.3);
        bars.forEach((b, i) => {
          const v = pl * (0.15 + 0.85 * Math.abs(H.noise(i * 0.35 + t * 7) * Math.sin(i * 0.5 + t * 3))) + 0.04;
          const bh = v * h * 0.36;
          b.setAttribute("y", wy - bh / 2); b.setAttribute("height", bh);
        });
      },
    };
  },
};
