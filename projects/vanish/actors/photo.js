// «Люди выпадают из фотографий» — ДЕЛО 0841 · ФОТОАРХИВ СВИДЕТЕЛЬСТВ.
// photo: бумажный отпечаток (белое поле, глянец, зерно, оранжевая дата плёночной камеры) со сценой внутри (children —
//        координаты внутри изображения 0..w, 0..h). tone: warm | faded | bw | cold | none; glitch: [{at, dur}] — помеха;
//        fade (дорожка 0..1) — снимок засвечивается до белого; date (строка); border; paper; gloss; Якорь img:x,y.
//        marks: [{of: <id>, at, until, pad, label, dash}] — рамка вокруг вложенного элемента (в т.ч. невидимого: пропавший
//        человек ставится в children с gone: 1 и id), считается по его реальному месту внутри снимка и поворачивается,
//        масштабируется и едет вместе со снимком; {in: <id>, x, y, w, h} — рамка в координатах вложенного элемента;
//        {x, y, w, h} — в координатах изображения. Рамки поверх снимка числами кадра не задавайте — они «слетают».
// evidence: оверлей свидетельства (space: screen): «ДЕЛО 0841 · СВИДЕТЕЛЬСТВО 004», источник, время; уголки рамки.
// rule_card: правило мира крупно: ключ (моно, оранжевый) + текст (Oswald) на тёмной плашке.
// timeline: лист дела — метки времени на линии, стрелка-интервал с подписью; span (дорожка 0..1) сжимает интервал.
// viewfinder: видоискатель (space: screen): рамка кадра, точка фокуса, экспозиция, вспышки flash: [t]; focus (0..1).
// camera_back: фотоаппарат сзади в руках, на экране — children (снимок); lcd (дорожка 0..1 — яркость).

const ORANGE = "#ffb23e", PAPER = "#f6f2ea", INK = "#16181c";
const MONO = `"IBM Plex Mono", monospace`, COND = `"Oswald", sans-serif`, INTER = `"Inter", sans-serif`;
const TONE = {
  warm: "saturate(1.08) sepia(.16) contrast(1.04) brightness(1.03)",
  faded: "saturate(.62) sepia(.38) contrast(.9) brightness(1.07)",
  bw: "grayscale(1) contrast(1.12)",
  cold: "saturate(.75) hue-rotate(8deg) contrast(1.05)",
  none: "none",
};

function grainCanvas(w, h, alpha) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(8, Math.round(w / 4)); cv.height = Math.max(8, Math.round(h / 4));
  cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:${alpha};mix-blend-mode:overlay;pointer-events:none`;
  return cv;
}
function fillGrain(H, cv, seed) {
  const ctx = cv.getContext("2d"), img = ctx.createImageData(cv.width, cv.height), r = H.rng(seed), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = 60 + r() * 140; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}

// box of a nested item in the coordinates of `root`'s content (x, y, scale, origin of every parent applied)
function boxIn(it, root, inner) {
  const tf = (node, [x, y, w, h]) => {
    const s = Number(node.spec.scale ?? 1), o = node.origin || [0, 0];
    return [(node.spec.x ?? 0) + (x - o[0]) * s, (node.spec.y ?? 0) + (y - o[1]) * s, w * s, h * s];
  };
  let b = inner ?? [0, 0, it.w || 0, it.h || 0];
  if (!inner && it.spec.actor === "figure") b = [(it.w || 0) * 0.27, (it.h || 0) * 0.02, (it.w || 0) * 0.46, (it.h || 0) * 0.94];
  let node = it;
  while (node && node !== root) { b = tf(node, b); node = node.parent; }
  return b;
}

export const photo = {
  origin: "center",
  async create(p, H, item) {
    const iw = p.w ?? 760, ih = p.h ?? 960, b = p.border ?? 30, bb = p.border_bottom ?? b;
    const W = iw + 2 * b, Hh = ih + b + bb;
    const el = H.div(`width:${W}px;height:${Hh}px`);
    const paper = H.div(`width:${W}px;height:${Hh}px;background:${H.col(p.paper ?? PAPER)};border-radius:3px;
      box-shadow:0 ${p.lift ?? 18}px ${(p.lift ?? 18) * 2.4}px rgba(0,0,0,${p.shadow ?? 0.38}), 0 1px 2px rgba(0,0,0,.25)`);
    if (p.border === 0) paper.style.boxShadow = "none";
    const img = H.div(`left:${b}px;top:${b}px;width:${iw}px;height:${ih}px;overflow:hidden;background:${H.col(p.bg ?? "#c9c2b6")}`);
    const scene = H.div(`width:${iw}px;height:${ih}px;filter:${TONE[p.tone ?? "warm"] ?? p.tone}`);
    img.appendChild(scene);
    for (const c of (p.children || []).flat(Infinity)) await H.child(c, scene);
    // print surface: vignette, light leak, grain, gloss
    const vig = H.div(`width:${iw}px;height:${ih}px;background:radial-gradient(ellipse 85% 75% at 50% 45%, transparent 55%, rgba(30,18,6,${p.vig ?? 0.32}));pointer-events:none`);
    const grain = grainCanvas(iw, ih, p.grain ?? 0.16);
    fillGrain(H, grain, (p.seed ?? 7) * 131);
    const gl = document.createElement("canvas");
    gl.width = Math.round(iw / 2); gl.height = Math.round(ih / 2);
    gl.style.cssText = `position:absolute;left:0;top:0;width:${iw}px;height:${ih}px;opacity:0;pointer-events:none`;
    const gctx = gl.getContext("2d");
    const white = H.div(`width:${iw}px;height:${ih}px;background:#fbfaf6;opacity:0;pointer-events:none`);
    const date = H.div(`right:${Math.round(iw * 0.06)}px;bottom:${Math.round(ih * 0.035)}px;left:auto;top:auto;font:500 ${p.date_size ?? Math.round(iw * 0.045)}px ${`"Oswald", monospace`};
      letter-spacing:3px;color:${ORANGE};opacity:.92;text-shadow:0 0 6px rgba(255,120,20,.7);white-space:nowrap`, p.date ?? "");
    date.style.position = "absolute";
    if (!p.date) date.style.display = "none";
    img.append(vig, grain, gl, white, date);
    // marks: dashed frames around nested items (the vanished person), in image coordinates
    const mk = H.svg("", iw, ih);
    img.appendChild(mk);
    const marks = (p.marks ?? []).map((m) => {
      const g = H.el("g", {}, mk);
      const r = H.el("rect", { fill: "none", stroke: H.col(m.color ?? ORANGE), "stroke-width": m.sw ?? 5, "stroke-dasharray": m.dash ?? "14 10", rx: 4 }, g);
      let tx = null;
      if (m.label) { tx = H.el("text", { "font-family": "IBM Plex Mono", "font-weight": 600, "font-size": m.label_size ?? 26, fill: H.col(m.color ?? ORANGE), "text-anchor": "middle" }, g); tx.textContent = m.label; }
      return { m, g, r, tx, box: null };
    });
    const place = (k) => {
      const m = k.m, pad = m.pad ?? 10;
      let b = null;
      if (m.of) { const it = item.find(m.of); if (it) b = boxIn(it, item); }
      else if (m.in) { const it = item.find(m.in); if (it) b = boxIn(it, item, [m.x - m.w / 2, m.y - m.h / 2, m.w, m.h]); }
      else b = [m.x - m.w / 2, m.y - m.h / 2, m.w, m.h];
      if (!b) return;
      k.box = [b[0] - pad, b[1] - pad, b[2] + 2 * pad, b[3] + 2 * pad];
      const [x, y, w, h] = k.box;
      k.r.setAttribute("x", x); k.r.setAttribute("y", y); k.r.setAttribute("width", w); k.r.setAttribute("height", h);
      if (k.tx) { k.tx.setAttribute("x", x + w / 2); k.tx.setAttribute("y", y + h + 34); }
    };
    const gloss = H.div(`left:${b}px;top:${b}px;width:${iw}px;height:${ih}px;pointer-events:none;mix-blend-mode:screen;
      background:linear-gradient(115deg, transparent 30%, rgba(255,255,255,${p.gloss ?? 0.13}) 45%, transparent 60%);background-size:300% 100%`);
    el.append(paper, img, gloss);
    const glitches = (p.glitch ?? []).map((g) => (typeof g === "object" ? g : { at: g, dur: 0.3 }));
    return {
      el, w: W, h: Hh,
      update(t, it) {
        const gp = ((t * 0.06 + (p.seed ?? 0) * 0.13) % 1);
        gloss.style.backgroundPosition = `${100 - gp * 100}% 0`;
        const fade = H.clamp(it.v("fade", 0), 0, 1);
        white.style.opacity = fade;
        date.textContent = it.v("date", p.date ?? "");
        for (const k of marks) {
          if (!k.box) place(k);
          const a = H.P(t, k.m.at ?? -1e9, 0.25) * (t < (k.m.until ?? 1e9) ? 1 : 0);
          const blink = t - (k.m.at ?? -1e9) < 0.6 ? (Math.floor(t * 10) % 2 ? 0.35 : 1) : 1;
          k.g.style.opacity = a * blink;
        }
        let on = null;
        for (const x of glitches) if (t >= x.at && t < x.at + x.dur) on = x;
        if (on) {
          const fr = Math.floor(t * 30), r = H.rng(fr * 613 + 5);
          gctx.clearRect(0, 0, gl.width, gl.height);
          for (let i = 0; i < 12; i++) {
            const y = r() * gl.height, hh = 2 + r() * 26;
            gctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.15 + r() * 0.4})` : `rgba(10,10,14,${0.2 + r() * 0.5})`;
            gctx.fillRect(0, y, gl.width, hh);
            if (r() < 0.4) { gctx.fillStyle = `rgba(255,${60 + r() * 80},40,.35)`; gctx.fillRect(r() * 60, y + 2, gl.width, 2); }
          }
          gl.style.opacity = 1;
          scene.style.transform = `translateX(${(r() - 0.5) * iw * 0.03}px)`;
          scene.style.filter = `${TONE[p.tone ?? "warm"] ?? p.tone} hue-rotate(${(r() - 0.5) * 40}deg)`;
        } else {
          gl.style.opacity = 0;
          scene.style.transform = "";
          scene.style.filter = TONE[p.tone ?? "warm"] ?? p.tone;
        }
      },
      anchor(name, args) {
        if (name === "img") return [b + (args?.[0] ?? iw / 2), b + (args?.[1] ?? ih / 2)];
        return null;
      },
    };
  },
};

export const evidence = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, c = H.col(p.color ?? ORANGE);
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const sh = "text-shadow:0 1px 3px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.9)";
    const left = H.div(`left:60px;top:150px;font:600 27px ${MONO};letter-spacing:2px;color:#f4f1ea;line-height:1.4;${sh}`);
    const l1 = H.div("position:relative"), l2 = H.div(`position:relative;font-weight:400;font-size:23px;color:#d5cfc4`);
    left.append(l1, l2);
    const right = H.div(`left:${w - 60 - 360}px;top:150px;width:360px;text-align:right;font:600 30px ${MONO};letter-spacing:1px;color:${c};line-height:1.35;${sh}`);
    const r1 = H.div("position:relative"), r2 = H.div(`position:relative;font-weight:400;font-size:23px;color:#d5cfc4`);
    right.append(r1, r2);
    const dot = H.div(`left:${w - 60 - 360 - 4}px;top:161px;width:16px;height:16px;border-radius:8px;background:#e3262f`);
    const frame = H.svg(`<g fill="none" stroke="#f4f1ea" stroke-opacity=".6" stroke-width="2.4">
      <path d="M40,132 h30 M40,132 v30"/><path d="M${w - 40},132 h-30 M${w - 40},132 v30"/></g>`, w, h);
    el.append(frame, left, right, dot);
    const pad = (v) => String(Math.floor(v)).padStart(2, "0");
    return {
      el, w, h,
      update(t, it) {
        l1.textContent = it.v("case", p.case ?? "ДЕЛО 0841");
        l2.textContent = it.v("src", p.src ?? "");
        // time: "HH:MM:SS" running from tc (seconds of the day) or a fixed string
        if (p.tc != null) {
          const t0 = it.at > -1e8 ? it.at : (H.shot?.start ?? 0);
          const s = p.tc + Math.max(0, t - t0) * (p.tc_rate ?? 1);
          r1.textContent = `${pad(s / 3600 % 24)}:${pad(s / 60 % 60)}:${pad(s % 60)}`;
        } else r1.textContent = it.v("time", p.time ?? "");
        r2.textContent = it.v("sub", p.sub ?? "");
        dot.style.display = p.rec ? "" : "none";
        dot.style.opacity = Math.sin(t * 5.5) > -0.2 ? 1 : 0.2;
        el.style.opacity = it.v("dim", 1);
      },
    };
  },
};

export const rule_card = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 940, size = p.size ?? 84;
    const el = H.div(`width:${w}px;pointer-events:none`);
    const band = H.div(`position:relative;width:${w}px;padding:28px 42px 34px;box-sizing:border-box;background:rgba(18,16,14,.88);
      border-left:8px solid ${ORANGE};box-shadow:0 20px 50px rgba(0,0,0,.35)`);
    const kick = H.div(`position:relative;font:600 28px ${MONO};letter-spacing:4px;color:${ORANGE};margin-bottom:8px`, p.kicker ?? "ПРАВИЛО");
    const txt = H.div(`position:relative;font:700 ${size}px/1.08 ${COND};letter-spacing:.5px;color:#f6f2ea;text-transform:uppercase`, p.text ?? "");
    band.append(kick, txt);
    el.append(band);
    return {
      el, w, h: null,
      update(t, it) { txt.textContent = it.v("text", p.text ?? ""); kick.textContent = it.v("kicker", p.kicker ?? "ПРАВИЛО"); },
    };
  },
};

// timeline: marks [{x (0..1 of the line), time, label, at, color, off: true (погашена)}], span: {a, b, label} (fractions) —
//   the bracket between two marks; span_k (track 0..1: how far it has grown); squeeze (track 0..1: span shrinks to a point)
export const timeline = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 940, h = p.h ?? 360;
    const el = H.div(`width:${w}px;height:${h}px`);
    const card = H.div(`width:${w}px;height:${h}px;background:${H.col(p.paper ?? "#efe9dd")};border-radius:6px;box-shadow:0 18px 44px rgba(0,0,0,.35)`);
    const x0 = 70, x1 = w - 70, ly = h * 0.56;
    const svg = H.svg("", w, h);
    H.el("line", { x1: x0, y1: ly, x2: x1, y2: ly, stroke: INK, "stroke-width": 4 }, svg);
    const brk = H.el("path", { fill: "none", stroke: ORANGE, "stroke-width": 6, "stroke-linecap": "round" }, svg);
    const spanTx = H.div(`font:700 46px ${COND};color:${H.shade(ORANGE, -0.25)};white-space:nowrap;letter-spacing:1px`);
    const title = H.div(`left:40px;top:26px;font:600 24px ${MONO};letter-spacing:3px;color:#6b665d`, p.title ?? "ДЕЛО 0841 · ХРОНОЛОГИЯ");
    el.append(card, svg, spanTx, title);
    const marks = (p.marks ?? []).map((m) => {
      const X = x0 + (x1 - x0) * m.x;
      const dot = H.el("circle", { cx: X, cy: ly, r: 13, fill: H.col(m.color ?? INK) }, svg);
      const tm = H.div(`top:${ly + 30}px;width:240px;left:${X - 120}px;text-align:center;font:700 40px ${MONO};color:${INK}`, m.time ?? "");
      const lb = H.div(`top:${ly + 82}px;width:260px;left:${X - 130}px;text-align:center;font:600 28px ${INTER};letter-spacing:2px;color:#4a463f`, m.label ?? "");
      el.append(tm, lb);
      return { m, X, dot, tm, lb };
    });
    return {
      el, w, h,
      update(t, it) {
        for (const k of marks) {
          const a = k.m.at != null ? H.P(t, k.m.at, 0.3) : 1;
          const off = k.m.off_at != null && t >= k.m.off_at;
          k.dot.setAttribute("opacity", a); k.tm.style.opacity = a; k.lb.style.opacity = a;
          k.dot.setAttribute("fill", off ? "none" : H.col(k.m.color ?? INK));
          k.dot.setAttribute("stroke", INK); k.dot.setAttribute("stroke-width", off ? 4 : 0);
          k.lb.style.textDecoration = off ? "line-through" : "none";
        }
        const sp = p.span;
        if (sp) {
          const g = H.clamp(it.v("span_k", 1), 0, 1), sq = H.clamp(it.v("squeeze", 0), 0, 1);
          const A = x0 + (x1 - x0) * sp.a, B0 = x0 + (x1 - x0) * sp.b;
          const B = A + (B0 - A) * g;
          const mid = (A + B) / 2, half = ((B - A) / 2) * (1 - sq * 0.97);
          const a = mid - half, bb = mid + half, y = ly - 52;
          brk.setAttribute("d", `M${a},${y + 22} L${a},${y} L${bb},${y} L${bb},${y + 22}`);
          brk.setAttribute("opacity", g > 0.01 ? 1 : 0);
          const label = it.v("span_label", sp.label ?? "");
          spanTx.textContent = label;
          spanTx.style.left = `${mid - spanTx.offsetWidth / 2}px`;
          spanTx.style.top = `${y - 66}px`;
          spanTx.style.opacity = g > 0.6 ? 1 : 0;
        }
      },
    };
  },
};

export const viewfinder = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920;
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const blur = H.div(`width:${w}px;height:${h}px`);
    const dark = H.div(`width:${w}px;height:${h}px;background:radial-gradient(ellipse 70% 52% at 50% 46%, transparent 62%, rgba(0,0,0,.75))`);
    const x0 = 90, y0 = 330, x1 = w - 90, y1 = 1450, cl = 70;
    const svg = H.svg(`<g fill="none" stroke="#f4f1ea" stroke-width="4" stroke-opacity=".9">
      <path d="M${x0},${y0 + cl} V${y0} H${x0 + cl} M${x1 - cl},${y0} H${x1} V${y0 + cl} M${x1},${y1 - cl} V${y1} H${x1 - cl} M${x0 + cl},${y1} H${x0} V${y1 - cl}"/>
      </g><g class="af" fill="none" stroke-width="4"><rect x="${w / 2 - 46}" y="${(y0 + y1) / 2 - 46}" width="92" height="92"/></g>
      <g stroke="#f4f1ea" stroke-opacity=".35" stroke-width="2"><line x1="${x0 + (x1 - x0) / 3}" y1="${y0}" x2="${x0 + (x1 - x0) / 3}" y2="${y1}"/>
      <line x1="${x0 + 2 * (x1 - x0) / 3}" y1="${y0}" x2="${x0 + 2 * (x1 - x0) / 3}" y2="${y1}"/>
      <line x1="${x0}" y1="${y0 + (y1 - y0) / 3}" x2="${x1}" y2="${y0 + (y1 - y0) / 3}"/><line x1="${x0}" y1="${y0 + 2 * (y1 - y0) / 3}" x2="${x1}" y2="${y0 + 2 * (y1 - y0) / 3}"/></g>`, w, h);
    const af = svg.querySelector(".af");
    const info = H.div(`left:0;top:${y1 + 34}px;width:${w}px;text-align:center;font:600 34px ${MONO};letter-spacing:3px;color:#f4f1ea;text-shadow:0 1px 3px #000`, p.info ?? "1/250  F5.6  ISO 100  ▮▮▮▮▯");
    const flash = H.div(`width:${w}px;height:${h}px;background:#fff;opacity:0`);
    el.append(blur, dark, svg, info, flash);
    const flashes = p.flash ?? [];
    return {
      el, w, h,
      update(t, it) {
        const f = H.clamp(it.v("focus", 1), 0, 1);
        blur.style.backdropFilter = f < 0.99 ? `blur(${(1 - f) * 12}px)` : "none";
        af.setAttribute("stroke", f > 0.95 ? "#5fe08a" : "#f4f1ea");
        let fl = 0;
        for (const a of flashes) if (t >= a) fl = Math.max(fl, 1 - (t - a) / 0.35);
        flash.style.opacity = H.clamp(fl, 0, 1) * 0.85;
      },
    };
  },
};

export const camera_back = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? 980, h = p.h ?? 700;
    const el = H.div(`width:${w}px;height:${h}px`);
    const body = H.div(`width:${w}px;height:${h}px;border-radius:46px;background:linear-gradient(180deg,#2a2c31,#16171a);
      box-shadow:0 30px 70px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.08)`);
    const sx = 60, sy = 70, sw = w - 290, shh = h - 140;
    const scr = H.div(`left:${sx}px;top:${sy}px;width:${sw}px;height:${shh}px;border-radius:10px;overflow:hidden;background:#000;
      box-shadow:0 0 0 6px #0b0c0e`);
    const inner = H.div(`width:${sw}px;height:${shh}px`);
    scr.appendChild(inner);
    for (const c of (p.children || []).flat(Infinity)) await H.child(c, inner);
    const hud = H.div(`left:${sx + 18}px;top:${sy + 12}px;font:600 26px ${MONO};color:#fff;text-shadow:0 1px 2px #000;opacity:.9`, p.hud ?? "");
    const dim = H.div(`left:${sx}px;top:${sy}px;width:${sw}px;height:${shh}px;border-radius:10px;background:#000;opacity:0`);
    // buttons on the right
    const btns = H.svg(`<g fill="#0d0e10" stroke="#3a3d44" stroke-width="3">
      <circle cx="${w - 120}" cy="${h * 0.5}" r="62"/><circle cx="${w - 120}" cy="${h * 0.5}" r="22" fill="#25272c"/>
      <rect x="${w - 168}" y="${h * 0.16}" width="96" height="40" rx="20"/><rect x="${w - 168}" y="${h * 0.76}" width="96" height="40" rx="20"/></g>
      <text x="${w - 120}" y="${h * 0.16 + 28}" text-anchor="middle" font-family="IBM Plex Mono" font-size="20" fill="#8a8f98">MENU</text>
      <text x="${w - 120}" y="${h * 0.76 + 28}" text-anchor="middle" font-family="IBM Plex Mono" font-size="20" fill="#8a8f98">▶</text>`, w, h);
    el.append(body, scr, hud, dim, btns);
    return {
      el, w, h,
      update(t, it) { dim.style.opacity = 1 - H.clamp(it.v("lcd", 1), 0, 1); hud.textContent = it.v("hud", p.hud ?? ""); },
      anchor(name, args) {
        if (name === "screen") return [sx + (args?.[0] ?? sw / 2), sy + (args?.[1] ?? shh / 2)];
        return null;
      },
    };
  },
};

// cam_ui: smartphone camera interface to put inside phone screen children (screen-local coords): shutter button,
//   modes, top bar; flash: [t] — white flash; front (bool) — label «ФРОНТАЛЬНАЯ»; w, h = screen size
export const cam_ui = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 560, h = p.h ?? 1140;
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const bottom = H.div(`left:0;top:${h - 230}px;width:${w}px;height:230px;background:rgba(0,0,0,.72)`);
    const modes = H.div(`left:0;top:${h - 222}px;width:${w}px;text-align:center;font:600 22px ${INTER};letter-spacing:2px;color:#d9d9d9`,
      `ВИДЕО&nbsp;&nbsp;&nbsp;<span style="color:${ORANGE}">ФОТО</span>&nbsp;&nbsp;&nbsp;ПОРТРЕТ`);
    const btn = H.div(`left:${w / 2 - 58}px;top:${h - 170}px;width:116px;height:116px;border-radius:58px;border:7px solid #fff;box-sizing:border-box`);
    const btnIn = H.div(`left:${w / 2 - 46}px;top:${h - 158}px;width:92px;height:92px;border-radius:46px;background:#fff`);
    const top = H.div(`left:0;top:0;width:${w}px;height:110px;background:rgba(0,0,0,.55)`);
    const flashIc = H.div(`left:30px;top:52px;font:600 24px ${INTER};color:#fff`, "⚡ АВТО");
    const front = H.div(`left:${w - 220}px;top:52px;width:190px;text-align:right;font:600 22px ${MONO};color:${ORANGE}`, p.front ? "ФРОНТАЛЬНАЯ" : "");
    const flash = H.div(`width:${w}px;height:${h}px;background:#fff;opacity:0`);
    el.append(top, flashIc, front, bottom, modes, btn, btnIn, flash);
    return {
      el, w, h,
      update(t, it) {
        let fl = 0;
        for (const a of p.flash ?? []) if (t >= a) fl = Math.max(fl, 1 - (t - a) / 0.4);
        flash.style.opacity = H.clamp(fl, 0, 1);
        const pr = (p.press ?? []).some((a) => t >= a && t < a + 0.18);
        btnIn.style.transform = pr ? "scale(.82)" : `scale(${1 + 0.04 * Math.sin(t * (p.pulse ? 6 : 0))})`;
        el.style.opacity = it.v("ui", 1);
      },
    };
  },
};

// call_screen: incoming / active call on a phone screen (put inside phone screen: app → children, screen-local coords).
//   name, number, state (дорожка: incoming | active | ended), secs_at (момент начала разговора), w, h
export const call_screen = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 524, h = p.h ?? 924;
    const el = H.div(`width:${w}px;height:${h}px;background:linear-gradient(180deg,#30353d,#14171b)`);
    const name = H.div(`left:0;top:${h * 0.16}px;width:${w}px;text-align:center;font:600 46px ${INTER};color:#fff`, p.name ?? "");
    const num = H.div(`left:0;top:${h * 0.16 + 66}px;width:${w}px;text-align:center;font:500 28px ${MONO};color:#c9ccd2`, p.number ?? "");
    const st = H.div(`left:0;top:${h * 0.16 + 112}px;width:${w}px;text-align:center;font:500 26px ${INTER};color:#9aa0a8`);
    const av = H.div(`left:${w / 2 - 80}px;top:${h * 0.42}px;width:160px;height:160px;border-radius:80px;background:#4a5058;font:600 70px ${INTER};color:#d9dce0;text-align:center;line-height:160px`, "?");
    const dec = H.div(`left:${w * 0.22 - 56}px;top:${h * 0.78}px;width:112px;height:112px;border-radius:56px;background:#e3262f;font:600 54px ${INTER};color:#fff;text-align:center;line-height:112px`, "✕");
    const acc = H.div(`left:${w * 0.78 - 56}px;top:${h * 0.78}px;width:112px;height:112px;border-radius:56px;background:#2fbf5a;font:600 54px ${INTER};color:#fff;text-align:center;line-height:112px`, "✆");
    el.append(name, num, st, av, dec, acc);
    const pad = (v) => String(Math.floor(v)).padStart(2, "0");
    return {
      el, w, h,
      update(t, it) {
        const s = it.v("state", p.state ?? "incoming");
        if (s === "incoming") { st.textContent = "входящий вызов"; acc.style.display = ""; dec.style.left = `${w * 0.22 - 56}px`; acc.style.transform = `translateY(${Math.abs(Math.sin(t * 5)) * -10}px)`; }
        else if (s === "active") { const e = Math.max(0, t - (p.secs_at ?? t)); st.textContent = `${pad(e / 60)}:${pad(e % 60)}`; acc.style.display = "none"; dec.style.left = `${w / 2 - 56}px`; }
        else { st.textContent = "вызов завершён"; acc.style.display = "none"; dec.style.left = `${w / 2 - 56}px`; dec.style.opacity = 0.5; }
      },
    };
  },
};
