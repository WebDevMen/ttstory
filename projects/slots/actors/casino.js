// Casino actors for «Как обыграть казино телефоном»: slot_machine, cctv, hand, neon_sign, buzz, coins, digits.
// Times in params (spins[].at, press, wins, …) are absolute seconds after compile ("@слово" works in YAML).

const MONO = (H) => `"${H.fonts.mono}", monospace`;

// ------------------------------------------------------------------ reel symbols (100 x 100 SVG)
const SYM = {
  seven: (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#c2001f"/></linearGradient></defs>
    <text x="50" y="86" text-anchor="middle" font-family="Montserrat" font-weight="900" font-style="italic" font-size="98" fill="url(#${id})"
      stroke="#ffd34d" stroke-width="5" paint-order="stroke">7</text>`,
  cherry: () => `<path d="M38,58 Q46,30 66,16 M62,60 Q62,36 66,16" stroke="#2fa84f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M66,16 Q82,8 90,22 Q76,26 66,16Z" fill="#46d27a"/>
    <circle cx="34" cy="70" r="19" fill="#e0142f"/><circle cx="66" cy="72" r="19" fill="#ff2742"/>
    <circle cx="28" cy="63" r="5" fill="#fff" opacity=".7"/><circle cx="60" cy="65" r="5" fill="#fff" opacity=".7"/>`,
  bell: () => `<path d="M50,10 Q54,10 54,16 Q78,22 78,52 L80,70 Q90,76 86,82 L14,82 Q10,76 20,70 L22,52 Q22,22 46,16 Q46,10 50,10Z" fill="#ffc21a" stroke="#b37800" stroke-width="3"/>
    <circle cx="50" cy="88" r="8" fill="#b37800"/><path d="M34,30 Q30,44 32,60" stroke="#fff3b0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`,
  bar: () => `<rect x="6" y="30" width="88" height="40" rx="8" fill="#14101f" stroke="#ffd34d" stroke-width="4"/>
    <text x="50" y="61" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="30" fill="#ffd34d" letter-spacing="2">BAR</text>`,
  star: () => `<polygon points="50,6 62,36 94,38 69,58 78,90 50,72 22,90 31,58 6,38 38,36" fill="#ffd34d" stroke="#c98a00" stroke-width="3"/>
    <polygon points="50,20 57,38 46,40" fill="#fff6c8" opacity=".8"/>`,
  diamond: () => `<polygon points="50,8 88,40 50,92 12,40" fill="#4de1ff" stroke="#1a8fb3" stroke-width="3"/>
    <polygon points="50,8 66,40 50,92 34,40" fill="#a8f3ff" opacity=".6"/><line x1="12" y1="40" x2="88" y2="40" stroke="#1a8fb3" stroke-width="3"/>`,
};
const STRIP = ["seven", "cherry", "bar", "bell", "star", "diamond", "cherry", "bell", "bar", "star"];

function symSvg(H, name, size) {
  const id = H.uid("g");
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="overflow:visible">${SYM[name](id)}</svg>`;
}

// ------------------------------------------------------------------ slot_machine
// title, color (body), trim, neon, w (cabinet width; height = 1.9 w), start: [sym, sym, sym],
// spins: [{at, dur (to the 1st reel stop, default 1.2), result: [sym, sym, sym], stagger (0.28)}], wins: [times],
// press: [times] (SPIN button), button_glow (track 0..1), credits (track number), credits_label, digits (track 0..1:
// reels turn into running digits), lights (track 0..1), win_text. Anchors: screen, button, credits, top, reel:i
export const slot_machine = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 520, h = Math.round(w * 1.92), k = w / 520;
    const body = H.col(p.color ?? "#2a0f4a"), trim = H.col(p.trim ?? "#ffd34d"), neon = H.col(p.neon ?? "#ff2bd6");
    const el = H.div(`width:${w}px;height:${h}px`);
    const S = (v) => v * k;
    // cabinet
    el.innerHTML = `
      <div style="position:absolute;left:${S(18)}px;top:${S(150)}px;width:${w - S(36)}px;height:${h - S(150)}px;border-radius:${S(26)}px ${S(26)}px ${S(10)}px ${S(10)}px;
        background:linear-gradient(90deg, ${H.shade(body, -0.45)}, ${body} 18%, ${H.shade(body, 0.12)} 50%, ${body} 82%, ${H.shade(body, -0.45)});
        box-shadow:0 0 0 ${S(4)}px ${H.rgba(trim, 0.85)}, 0 0 ${S(40)}px ${H.rgba(neon, 0.35)}, inset 0 0 ${S(40)}px rgba(0,0,0,.5)"></div>
      <div class="top" style="position:absolute;left:${S(30)}px;top:0;width:${w - S(60)}px;height:${S(170)}px;border-radius:${S(120)}px ${S(120)}px ${S(16)}px ${S(16)}px;
        background:radial-gradient(ellipse at 50% 30%, ${H.shade(neon, 0.2)}, ${H.shade(body, -0.2)} 75%);box-shadow:0 0 0 ${S(5)}px ${trim}, 0 0 ${S(50)}px ${H.rgba(neon, 0.6)}">
        <div class="ttl" style="position:absolute;left:0;right:0;top:${S(62)}px;text-align:center;font:italic 900 ${S(p.title_size ?? 56)}px/1 Montserrat;color:#fff;
          letter-spacing:${S(2)}px;text-shadow:0 0 ${S(10)}px ${neon}, 0 0 ${S(26)}px ${neon}, 0 ${S(4)}px 0 ${H.shade(neon, -0.5)}">${H.markup(p.title ?? "LUCKY 7")}</div>
      </div>
      <div class="bulbs"></div>
      <div style="position:absolute;left:${S(46)}px;top:${S(196)}px;width:${w - S(92)}px;height:${S(392)}px;border-radius:${S(20)}px;background:#0b0714;
        box-shadow:0 0 0 ${S(6)}px ${H.shade(trim, -0.35)}, 0 0 0 ${S(10)}px ${trim}, inset 0 0 ${S(30)}px rgba(0,0,0,.8)"></div>
      <div class="reels" style="position:absolute;left:${S(64)}px;top:${S(214)}px;width:${w - S(128)}px;height:${S(300)}px"></div>
      <div class="pay" style="position:absolute;left:${S(56)}px;top:${S(362)}px;width:${w - S(112)}px;height:${S(4)}px;background:${H.rgba(trim, 0.55)};border-radius:2px"></div>
      <div class="led" style="position:absolute;left:${S(64)}px;top:${S(526)}px;width:${w - S(128)}px;height:${S(48)}px;border-radius:${S(8)}px;background:#140303;
        display:flex;align-items:center;justify-content:space-between;padding:0 ${S(16)}px;box-sizing:border-box;font:700 ${S(26)}px ${MONO(H)};color:#ff4d3d;
        text-shadow:0 0 ${S(8)}px #ff2a1a"><span>${p.credits_label ?? "CREDIT"}</span><span class="cr">0</span></div>
      <div class="win" style="position:absolute;left:0;right:0;top:${S(232)}px;text-align:center;font:italic 900 ${S(86)}px/1 Montserrat;color:#fff;opacity:0;
        text-shadow:0 0 ${S(14)}px ${trim}, 0 0 ${S(40)}px ${trim}, 0 ${S(6)}px 0 #b3001b;z-index:5">${H.markup(p.win_text ?? "WIN!")}</div>
      <div style="position:absolute;left:${S(46)}px;top:${S(612)}px;width:${w - S(92)}px;height:${S(150)}px;border-radius:${S(14)}px;
        background:linear-gradient(160deg, ${H.shade(neon, -0.25)}, ${H.shade(body, -0.35)});box-shadow:inset 0 0 0 ${S(3)}px ${H.rgba(trim, 0.7)};overflow:hidden">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 ${S(18)}px, transparent ${S(18)}px ${S(44)}px)"></div>
        <div style="position:absolute;left:0;right:0;top:${S(38)}px;text-align:center;font:italic 900 ${S(64)}px/1 Montserrat;color:${trim};letter-spacing:${S(10)}px;
          text-shadow:0 0 ${S(16)}px ${H.rgba(trim, 0.8)}">777</div></div>
      <div style="position:absolute;left:${S(18)}px;top:${S(790)}px;width:${w - S(36)}px;height:${S(70)}px;border-radius:${S(10)}px;
        background:linear-gradient(${H.shade(body, 0.25)}, ${H.shade(body, -0.4)});box-shadow:0 ${S(10)}px ${S(20)}px rgba(0,0,0,.45)"></div>
      <div style="position:absolute;left:${S(60)}px;top:${S(806)}px;width:${S(70)}px;height:${S(30)}px;border-radius:${S(8)}px;background:#ffd34d;box-shadow:0 0 ${S(10)}px #ffd34d"></div>
      <div style="position:absolute;left:${S(146)}px;top:${S(806)}px;width:${S(70)}px;height:${S(30)}px;border-radius:${S(8)}px;background:#46d27a;box-shadow:0 0 ${S(10)}px #46d27a"></div>
      <div class="btn" style="position:absolute;left:${S(318)}px;top:${S(790)}px;width:${S(124)}px;height:${S(70)}px;border-radius:50%;
        background:radial-gradient(ellipse at 50% 35%, #ff6a7a, #d1002a 60%, #7a0018);display:grid;place-items:center;
        font:900 ${S(26)}px Montserrat;color:#fff;letter-spacing:${S(1)}px">SPIN</div>
      <div style="position:absolute;left:${S(40)}px;top:${S(880)}px;width:${w - S(80)}px;height:${h - S(900)}px;border-radius:${S(8)}px;
        background:repeating-linear-gradient(90deg, ${H.shade(body, -0.25)} 0 ${S(30)}px, ${H.shade(body, -0.4)} ${S(30)}px ${S(34)}px)"></div>`;
    // bulbs around the topper and down the sides
    const bulbs = el.querySelector(".bulbs"), B = [];
    const nTop = 15;
    for (let i = 0; i < nTop; i++) {
      const a = Math.PI * (1 - i / (nTop - 1));
      B.push([w / 2 + Math.cos(a) * (w / 2 - S(36)), S(120) - Math.sin(a) * S(104)]);
    }
    for (let i = 0; i < 8; i++) { B.push([S(26), S(210) + i * S(70)]); B.push([w - S(26), S(210) + i * S(70)]); }
    const bulbEls = B.map(([x, y]) => { const b = H.div(`left:${x - S(9)}px;top:${y - S(9)}px;width:${S(18)}px;height:${S(18)}px;border-radius:50%`); bulbs.appendChild(b); return b; });
    // reels
    const reelsBox = el.querySelector(".reels"), rw = (w - S(128) - S(24)) / 3, ch = S(150), rh = S(300);
    const reels = [0, 1, 2].map((i) => {
      const win = H.div(`left:${i * (rw + S(12))}px;top:0;width:${rw}px;height:${rh}px;overflow:hidden;border-radius:${S(10)}px;
        background:linear-gradient(#cfc6d8, #fff 30%, #fff 70%, #cfc6d8)`);
      const strip = H.div(`left:0;top:0;width:${rw}px;height:${rh}px`);
      const cells = [0, 1, 2, 3, 4].map(() => { const c = H.div(`left:0;width:${rw}px;height:${ch}px;display:grid;place-items:center`); strip.appendChild(c); return { c, idx: null }; });
      const dig = H.div(`left:0;top:0;width:${rw}px;height:${rh}px;opacity:0;background:#03141c;overflow:hidden`);
      const digTxt = H.div(`left:0;top:0;width:${rw}px;font:700 ${S(34)}px/1.05 ${MONO(H)};color:#4de1ff;text-align:center;text-shadow:0 0 ${S(8)}px #4de1ff;white-space:pre`);
      dig.appendChild(digTxt);
      const shadeEl = H.div(`left:0;top:0;width:${rw}px;height:${rh}px;background:linear-gradient(rgba(0,0,0,.55), transparent 28%, transparent 72%, rgba(0,0,0,.55))`);
      win.append(strip, dig, shadeEl);
      reelsBox.appendChild(win);
      return { strip, cells, dig, digTxt };
    });
    const idxOf = (name) => Math.max(0, STRIP.indexOf(name));
    // spin plan per reel: segments [t0, t1, p0, p1]
    const start = (p.start || ["seven", "bar", "cherry"]).map(idxOf);
    const plan = [0, 1, 2].map((i) => {
      let cur = start[i];
      const segs = [];
      for (const sp of p.spins || []) {
        const t0 = sp.at, t1 = sp.at + (sp.dur ?? 1.2) + i * (sp.stagger ?? 0.28);
        const want = idxOf((sp.result || [])[i] ?? "seven");
        let tgt = cur + 10 + ((want - (cur % 10) + 20) % 10) + 10 * (sp.loops ?? 1);
        segs.push([t0, t1, cur, tgt]);
        cur = tgt;
      }
      return { start: start[i], segs };
    });
    const posAt = (r, t) => {
      let pos = r.start, vel = 0;
      for (const [t0, t1, p0, p1] of r.segs) {
        if (t < t0) break;
        if (t < t1) {
          const x = (t - t0) / (t1 - t0), g = 1 - Math.pow(1 - x, 2.4);
          pos = p0 + (p1 - p0) * g;
          vel = (p1 - p0) * 2.4 * Math.pow(1 - x, 1.4) / (t1 - t0);
          return [pos, vel];
        }
        pos = p1;
        const u = t - t1;
        if (u < 0.45) pos = p1 - 0.12 * Math.sin(u * 14) * Math.exp(-u * 7);
      }
      return [pos, vel];
    };
    const wins = [].concat(p.wins || []), press = [].concat(p.press || []);
    const btn = el.querySelector(".btn"), pay = el.querySelector(".pay"), cr = el.querySelector(".cr"), winEl = el.querySelector(".win");
    const fmt = (v) => `$${Math.round(v).toLocaleString("ru-RU").replace(/ /g, " ")}`;
    const rnd = H.rng(p.seed ?? 7);
    const digCols = [0, 1, 2].map(() => Array.from({ length: 40 }, () => Math.floor(rnd() * 10)).join("\n"));
    return {
      el, w, h,
      update(t, it) {
        const lastWin = wins.filter((x) => x <= t).pop();
        const wk = lastWin != null && t - lastWin < 1.6 ? 1 : 0;
        const lights = it.v("lights", 1);
        // bulbs chase (faster and all-blink on a win)
        bulbEls.forEach((b, i) => {
          const on = wk ? (Math.sin(t * 22) > 0 ? 1 : 0.25) : (Math.sin(t * 6 - i * 0.9) > 0 ? 1 : 0.28);
          const c = i % 2 ? trim : neon, a = on * lights;
          b.style.background = H.rgba(c, 0.25 + 0.75 * a);
          b.style.boxShadow = `0 0 ${S(6 + 14 * a)}px ${H.rgba(c, a)}`;
        });
        // reels
        const dg = it.v("digits", 0);
        reels.forEach((r, i) => {
          const [pos, vel] = posAt(plan[i], t);
          const base = Math.floor(pos), fr = pos - base;
          r.cells.forEach((cell, j) => {
            const k2 = j - 2, idx = base + k2;
            const name = STRIP[((idx % 10) + 10) % 10];
            if (cell.idx !== name) { cell.c.innerHTML = symSvg(H, name, ch * 0.78); cell.idx = name; }
            cell.c.style.top = `${rh / 2 - ch / 2 + (fr - k2) * ch}px`;
          });
          const blur = Math.min(S(7), Math.abs(vel) * S(0.35));
          r.strip.style.filter = blur > 0.4 ? `blur(${blur}px)` : "none";
          r.strip.style.opacity = 1 - dg * 0.9;
          r.dig.style.opacity = dg;
          if (dg > 0) {
            if (!r.digTxt.textContent) r.digTxt.textContent = digCols[i];
            r.digTxt.style.transform = `translateY(${-((t * (5 + i * 1.7) * S(36)) % (S(36) * 20))}px)`;
          }
        });
        // win flash, payline, button
        pay.style.background = wk ? trim : H.rgba(trim, 0.55);
        pay.style.boxShadow = wk ? `0 0 ${S(20)}px ${trim}, 0 0 ${S(40)}px ${trim}` : "none";
        const wf = lastWin != null ? H.P(t, lastWin, 0.25) * (1 - H.P(t, lastWin + 1.2, 0.4)) : 0;
        winEl.style.opacity = wf;
        winEl.style.transform = `scale(${0.6 + 0.4 * H.E.outBack(H.P(t, lastWin ?? 0, 0.3))})`;
        const lp = press.filter((x) => x <= t).pop();
        const pk = lp != null ? 1 - H.P(t, lp, 0.25) : 0;
        const bg = it.v("button_glow", 0) * (0.65 + 0.35 * Math.sin(t * 6)) + pk;
        btn.style.transform = `scale(${1 - 0.1 * pk})`;
        btn.style.boxShadow = `0 ${S(6 - 4 * pk)}px 0 #4a000e, 0 0 ${S(10 + 40 * bg)}px rgba(255,60,90,${0.4 + 0.6 * Math.min(1, bg)})`;
        const c = it.v("credits", null);
        if (c != null) { const s = fmt(c); if (cr.textContent !== s) cr.textContent = s; }
      },
      anchor(name, args) {
        if (name === "screen") return [w / 2, S(364)];
        if (name === "button") return [S(380), S(825)];
        if (name === "credits") return [w / 2, S(550)];
        if (name === "top") return [w / 2, 0];
        if (name === "reel") return [S(64) + (args[0] ?? 1) * (rw + S(12)) + rw / 2, S(364)];
        return null;
      },
    };
  },
};

// ------------------------------------------------------------------ cctv: surveillance-camera overlay (use with space: screen)
// cam, date, clock (seconds of day at t = 0), tint (0..1), grain, box (track [x, y, w, h] — target frame), box_at, label,
// rec (true). Tints everything under it via backdrop-filter.
export const cctv = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, c = H.col(p.color ?? "#e8ffe8"), red = "#ff3040";
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const tint = H.div(`width:${w}px;height:${h}px;backdrop-filter:grayscale(${p.gray ?? 0.85}) sepia(.45) hue-rotate(58deg) contrast(1.25) brightness(.92)`);
    const scan = H.div(`width:${w}px;height:${h}px;background:repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 2px, transparent 2px 5px);mix-blend-mode:multiply`);
    const cv = document.createElement("canvas");
    cv.width = 270; cv.height = 480;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:${p.grain ?? 0.16};mix-blend-mode:screen;image-rendering:pixelated`;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(270, 480);
    const roll = H.div(`left:0;width:${w}px;height:180px;background:linear-gradient(transparent, rgba(220,255,220,.08), transparent)`);
    const vig = H.div(`width:${w}px;height:${h}px;background:radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.55))`);
    const txt = (css, s) => H.div(`font:700 34px ${MONO(H)};letter-spacing:3px;color:${c};text-shadow:0 0 6px rgba(0,0,0,.8);${css}`, s);
    const cam = txt("left:70px;top:250px", p.cam ?? "CAM 07");
    const rec = txt(`left:${w - 250}px;top:250px;color:${red}`, "● REC");
    const ts = txt(`left:70px;top:${h - 470}px;font-size:30px`, "");
    const corners = H.svg(`<g stroke="${c}" stroke-width="5" fill="none" opacity=".8">
      <path d="M50,330 V230 H150"/><path d="M${w - 150},230 H${w - 50} V330"/><path d="M50,${h - 520} V${h - 420} H150"/><path d="M${w - 150},${h - 420} H${w - 50} V${h - 520}"/></g>`, w, h);
    const box = H.svg(`<g class="bx" fill="none" stroke="${red}" stroke-width="6"><path class="c"/></g>
      <g class="lb"><rect class="lbr" height="46" rx="4" fill="${red}"/><text class="lbt" font-family="JBM" font-weight="700" font-size="30" fill="#fff" letter-spacing="2"></text></g>`, w, h);
    el.append(tint, scan, cv, roll, vig, corners, cam, rec, ts, box);
    const path = box.querySelector(".c"), lb = box.querySelector(".lb"), lbr = box.querySelector(".lbr"), lbt = box.querySelector(".lbt");
    lbt.textContent = p.label ?? "";
    let lastFrame = -1;
    return {
      el, w, h,
      update(t, it) {
        const fr = Math.round(t * 30);
        if (fr !== lastFrame) {          // grain: new noise every frame, deterministic
          lastFrame = fr;
          const r = H.rng(fr * 7919 + 13), d = img.data;
          for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
          ctx.putImageData(img, 0, 0);
        }
        roll.style.top = `${((t * 260) % (h + 360)) - 180}px`;
        rec.style.opacity = Math.sin(t * 6) > 0 ? 1 : 0.15;
        const sec = (p.clock ?? 85267) + t, hh = Math.floor(sec / 3600) % 24, mm = Math.floor(sec / 60) % 60, ss = Math.floor(sec) % 60, cs = Math.floor((sec % 1) * 100);
        const pad = (v) => String(v).padStart(2, "0");
        ts.textContent = `${p.date ?? "2014-06-02"}  ${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(cs)}`;
        const b = it.v("box", null);
        const at = p.box_at ?? -1e9;
        if (b && t >= at) {
          const k = H.E.outCubic(H.P(t, at, 0.35)), s = 1 + (1 - k) * 0.7;
          const [x, y, bw, bh] = b, cx = x + bw / 2, cy = y + bh / 2, W2 = bw * s / 2, H2 = bh * s / 2, L = Math.min(bw, bh) * 0.28;
          const x0 = cx - W2, x1 = cx + W2, y0 = cy - H2, y1 = cy + H2;
          path.setAttribute("d", `M${x0},${y0 + L} V${y0} H${x0 + L} M${x1 - L},${y0} H${x1} V${y0 + L} M${x1},${y1 - L} V${y1} H${x1 - L} M${x0 + L},${y1} H${x0} V${y1 - L}`);
          box.querySelector(".bx").style.opacity = k < 1 ? (Math.sin(t * 40) > 0 ? 1 : 0.3) : 1;
          if (p.label) {
            const tw = lbt.getComputedTextLength() + 24;
            lbr.setAttribute("x", x0); lbr.setAttribute("y", y0 - 56); lbr.setAttribute("width", tw);
            lbt.setAttribute("x", x0 + 12); lbt.setAttribute("y", y0 - 22);
            lb.style.opacity = k >= 1 ? (Math.sin(t * 5) > -0.3 ? 1 : 0.4) : 0;
          }
          box.style.opacity = 1;
        } else box.style.opacity = 0;
      },
    };
  },
};

// ------------------------------------------------------------------ hand: a stylized hand with a sleeve
// pose: point (index finger up; x/y = fingertip) | hold_back / hold_front (holding a phone of pw x ph centred at x/y:
// back = palm and fingers behind the phone, front = thumb and fingertips over its edges). skin, sleeve, cuff.
export const hand = {
  origin: "center",
  create(p, H) {
    const skin = H.col(p.skin ?? "#e8b08a"), dark = H.shade(skin, -0.22), sleeve = H.col(p.sleeve ?? "#1c2030"), cuff = H.col(p.cuff ?? "#39405a");
    const pose = p.pose ?? "point";
    if (pose === "point") {
      const w = 300, h = 720;
      const svg = H.svg(`
        <rect x="80" y="430" width="160" height="300" rx="26" fill="${sleeve}"/>
        <rect x="74" y="420" width="172" height="44" rx="14" fill="${cuff}"/>
        <path d="M92,250 Q86,240 98,232 L230,226 Q262,228 260,268 L254,370 Q248,430 196,436 L120,436 Q88,432 86,396 Z" fill="${skin}"/>
        <path d="M96,268 Q74,264 70,292 Q68,318 94,322 Z" fill="${dark}" opacity=".35"/>
        <rect x="150" y="196" width="48" height="74" rx="24" fill="${skin}"/><rect x="196" y="204" width="46" height="70" rx="23" fill="${skin}"/>
        <rect x="104" y="210" width="50" height="70" rx="25" fill="${skin}"/>
        <path d="M150,226 Q150,210 160,204 M196,232 Q196,216 206,212" stroke="${dark}" stroke-width="4" fill="none" opacity=".6"/>
        <rect x="98" y="20" width="56" height="250" rx="28" fill="${skin}"/>
        <path d="M108,40 Q126,24 144,40 L142,62 Q126,56 110,62 Z" fill="#f6d2bd" opacity=".9"/>
        <path d="M106,150 Q126,144 146,150 M106,200 Q126,194 146,200" stroke="${dark}" stroke-width="4" fill="none" opacity=".5"/>
        <path d="M244,300 Q290,286 300,250 Q306,226 288,224 Q270,230 262,262 L240,296 Z" fill="${skin}"/>
        <path d="M96,330 Q120,350 150,340" stroke="${dark}" stroke-width="4" fill="none" opacity=".4"/>`, w, h);
      return { el: svg, w, h, origin: [126, 22] };
    }
    const pw = p.pw ?? 560, ph = p.ph ?? 960, w = pw + 400, h = ph + 700, cx = w / 2, cy = h / 2;
    const L = cx - pw / 2, R = cx + pw / 2, B = cy + ph / 2;
    const svg = pose === "hold_back" ? H.svg(`
        <path d="M${R - 60},${B + 640} L${R + 60},${B + 640} L${R + 150},${B + 120} L${R - 120},${B + 40} Z" fill="${sleeve}"/>
        <rect x="${R - 140}" y="${B + 20}" width="290" height="60" rx="16" fill="${cuff}" transform="rotate(-12 ${R} ${B + 50})"/>
        <path d="M${L + 40},${B - 260} Q${L - 40},${B - 120} ${L + 20},${B + 40} Q${cx},${B + 150} ${R + 70},${B + 10} Q${R + 110},${B - 120} ${R + 40},${B - 300} Z" fill="${skin}"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="${L - 40}" y="${cy - 40 + i * 92}" width="90" height="74" rx="37" fill="${dark}"/>`).join("")}`, w, h)
      : H.svg(`
        ${[0, 1, 2, 3].map((i) => `<rect x="${L - 58}" y="${cy - 10 + i * 88}" width="96" height="62" rx="31" fill="${skin}" stroke="${dark}" stroke-width="3"/>
          <path d="M${L + 4},${cy + 2 + i * 88} Q${L + 22},${cy + 21 + i * 88} ${L + 4},${cy + 40 + i * 88}" stroke="#f3cdb5" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("")}
        <path d="M${R + 70},${B + 30} Q${R + 30},${B - 120} ${R - 40},${B - 250} Q${R - 70},${B - 300} ${R - 34},${B - 318} Q${R},${B - 320} ${R + 30},${B - 270} Q${R + 110},${B - 160} ${R + 120},${B - 20} Z" fill="${skin}"/>
        <path d="M${R - 42},${B - 290} Q${R - 30},${B - 312} ${R - 10},${B - 300}" stroke="#f6d2bd" stroke-width="7" fill="none"/>`, w, h);
    return { el: svg, w, h };
  },
};

// ------------------------------------------------------------------ neon_sign: neon letters with a tube frame; letters go dark one by one
// text, color, size, frame (true), off_at, stagger, flicker (amount 0..1)
export const neon_sign = {
  origin: "center",
  create(p, H) {
    const c = H.col(p.color ?? "#ff2bd6"), size = p.size ?? 150, chars = [...String(p.text ?? "КАЗИНО")];
    const el = H.div(`white-space:nowrap;padding:${size * 0.28}px ${size * 0.4}px;border-radius:${size * 0.3}px;display:flex;gap:${size * 0.06}px;
      font:italic 900 ${size}px/1 Montserrat;letter-spacing:${size * 0.02}px`);
    const frame = p.frame !== false;
    const spans = chars.map((ch) => { const s = document.createElement("span"); s.textContent = ch; el.appendChild(s); return s; });
    const off = p.off_at ?? 1e9, st = p.stagger ?? 0.12;
    return {
      el,
      update(t) {
        const fl = p.flicker ?? 0.25;
        let lit = 0;
        spans.forEach((s, i) => {
          const tOff = off + i * st;
          let a = t < tOff - 0.4 ? 1 - fl * (H.noise(t * 9 + i * 3.1) > 0.82 ? 0.7 : 0) : t < tOff ? (Math.sin(t * 60 + i) > 0 ? 1 : 0.15) : 0.08;
          lit += a;
          s.style.color = a > 0.5 ? "#fff" : H.rgba(c, 0.25 + 0.3 * a);
          s.style.textShadow = a > 0.1 ? `0 0 ${size * 0.06}px ${H.rgba(c, a)}, 0 0 ${size * 0.18}px ${H.rgba(c, a)}, 0 0 ${size * 0.4}px ${H.rgba(c, 0.7 * a)}` : "none";
        });
        const fa = lit / spans.length;
        el.style.boxShadow = frame ? `0 0 0 ${size * 0.04}px ${H.rgba(c, 0.25 + 0.75 * fa)}, 0 0 ${size * 0.25 * fa}px ${H.rgba(c, fa)}, inset 0 0 ${size * 0.2 * fa}px ${H.rgba(c, 0.6 * fa)}` : "none";
      },
    };
  },
};

// ------------------------------------------------------------------ buzz: phone vibration arcs on both sides of an object
// times: [t, …] (each buzz lasts dur), w (distance between the sides), h (arc height), color, dur
export const buzz = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 600, h = p.h ?? 260, c = H.col(p.color ?? "#ffd34d"), dur = p.dur ?? 0.5;
    const svg = H.svg("", w + 240, h);
    const arcs = [];
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const pth = H.el("path", { fill: "none", stroke: c, "stroke-width": 9, "stroke-linecap": "round" }, svg);
      arcs.push({ pth, side, i });
    }
    const times = [].concat(p.times || []);
    return {
      el: svg, w: w + 240, h,
      update(t) {
        const last = times.filter((x) => x <= t).pop();
        const u = last == null ? 1 : (t - last) / dur;
        for (const a of arcs) {
          const k = H.clamp(u * 1.4 - a.i * 0.18), on = u < 1 && k > 0;
          const x = (w + 240) / 2 + a.side * (w / 2 + 20 + a.i * 36 + k * 18), r = h * (0.22 + a.i * 0.12);
          a.pth.setAttribute("d", `M${x},${h / 2 - r} Q${x + a.side * r * 0.55},${h / 2} ${x},${h / 2 + r}`);
          a.pth.setAttribute("opacity", on ? (1 - k) * 0.95 : 0);
        }
      },
    };
  },
};

// ------------------------------------------------------------------ coins: bursts of coins or banknotes with gravity (canvas)
// bursts: [{at, x, y, count, power, spread (deg), up (deg, launch direction)}], kind: coin | bill, w, h (canvas = world px),
// rain: {from, until, count} — a steady fall from the top instead of bursts. Origin top-left.
export const coins = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, kind = p.kind ?? "coin";
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px`;
    const ctx = cv.getContext("2d"), g = p.gravity ?? 2400;
    const parts = [];
    for (const [bi, b] of (p.bursts || []).entries()) {
      const r = H.rng(97 + bi * 31);
      for (let i = 0; i < (b.count ?? 26); i++) {
        const ang = ((b.up ?? -90) + (r() - 0.5) * (b.spread ?? 70)) * Math.PI / 180, v = (b.power ?? 1500) * (0.55 + 0.6 * r());
        parts.push({ t0: b.at + r() * 0.12, x: b.x ?? w / 2, y: b.y ?? h / 2, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, s: 26 + r() * 18, sp: 6 + r() * 10, ph: r() * 6 });
      }
    }
    if (p.rain) {
      const r = H.rng(311), R = p.rain, span = (R.until ?? R.from + 3) - R.from;
      for (let i = 0; i < (R.count ?? 40); i++) parts.push({ t0: R.from + r() * span, x: r() * w, y: -80, vx: (r() - 0.5) * 120, vy: 300 + r() * 250, s: 34 + r() * 22, sp: 2 + r() * 4, ph: r() * 6, slow: true });
    }
    const coin = (x, y, s, ph) => {
      const sx = Math.abs(Math.cos(ph));
      ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.12, sx), 1);
      const gr = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 2, 0, 0, s);
      gr.addColorStop(0, "#fff3b0"); gr.addColorStop(0.5, "#ffc21a"); gr.addColorStop(1, "#b37800");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8a5a00"; ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#8a5a00"; ctx.font = `900 ${s}px Montserrat`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, s * 0.06);
      ctx.restore();
    };
    const bill = (x, y, s, ph) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(ph) * 0.8); ctx.scale(1, Math.max(0.2, Math.abs(Math.cos(ph * 0.7))));
      ctx.fillStyle = "#3f9d5a"; ctx.fillRect(-s * 1.6, -s * 0.75, s * 3.2, s * 1.5);
      ctx.strokeStyle = "#cfeedb"; ctx.lineWidth = 3; ctx.strokeRect(-s * 1.45, -s * 0.6, s * 2.9, s * 1.2);
      ctx.fillStyle = "#cfeedb"; ctx.font = `900 ${s}px Montserrat`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, s * 0.05);
      ctx.restore();
    };
    return {
      el: cv, w, h,
      update(t) {
        ctx.clearRect(0, 0, w, h);
        for (const q of parts) {
          const u = t - q.t0;
          if (u < 0) continue;
          const x = q.x + q.vx * u, y = q.y + q.vy * u + (q.slow ? 0 : 0.5 * g * u * u);
          if (y > h + 100) continue;
          (kind === "bill" ? bill : coin)(x, y, q.s, q.ph + u * q.sp);
        }
      },
    };
  },
};

// ------------------------------------------------------------------ digits: columns of running digits ("the formula behind the reels")
// w, h, color, size, speed, density (0..1), seed
export const digits = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, size = p.size ?? 34, c = H.col(p.color ?? "#4de1ff");
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px`;
    const ctx = cv.getContext("2d"), r = H.rng(p.seed ?? 3);
    const cols = Math.floor(w / (size * 0.9)), rows = Math.ceil(h / size) + 2;
    const colData = Array.from({ length: cols }, () => ({ on: r() < (p.density ?? 0.7), sp: (0.6 + r()) * (p.speed ?? 3), off: r() * rows, seq: Array.from({ length: rows * 2 }, () => Math.floor(r() * 10)) }));
    return {
      el: cv, w, h,
      update(t) {
        ctx.clearRect(0, 0, w, h);
        ctx.font = `700 ${size}px JBM, monospace`; ctx.textAlign = "center";
        colData.forEach((cd, i) => {
          if (!cd.on) return;
          const head = (cd.off + t * cd.sp * 4) % (rows + 8);
          for (let j = 0; j < rows; j++) {
            const d = head - j;
            if (d < 0 || d > 14) continue;
            const a = d < 1 ? 1 : 1 - d / 14;
            ctx.fillStyle = d < 1 ? "#ffffff" : H.rgba(c, a * 0.85);
            ctx.fillText(String(cd.seq[(j + Math.floor(t * 3 + i)) % cd.seq.length]), i * size * 0.9 + size * 0.45, j * size);
          }
        });
      },
    };
  },
};
