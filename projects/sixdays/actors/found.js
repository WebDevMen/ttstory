// «Оно появилось 6 дней назад» — найденные записи: существо, VHS-оверлей, фоны записей, офис отдела проверки.
// Все записи рисуются в серой гамме — единственный цвет в них красная точка существа и REC.

const MONO = (H) => `"${H.fonts.mono}", monospace`;
const RED = "#ff2a36";

// ------------------------------------------------------------------ creature: очень высокая тонкая фигура
// h (px, рост), color, dot (дорожка 0..1 — яркость красной точки), tilt (дорожка, ° — наклон головы), walk (дорожка, шагов/с),
// reach (дорожка 0..1 — руки тянутся вперёд), twitch (0..1 — подёргивание пальцев), soft (размытие края, px).
// Пропорции: голова маленькая, руки ниже колен. Origin — середина между ступнями. Якоря: dot, head.
export const creature = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 2.9 },
  create(p, H) {
    const h = p.h ?? 1000, w = h * 0.42, cx = w / 2, col = H.col(p.color ?? "#08080a"), id = H.uid("cr");
    const U = h / 100;                                  // 1 % роста
    const headR = 3.6 * U, neckY = 9.5 * U, shY = 13 * U, hipY = 50 * U, kneeY = 75 * U, shW = 6.2 * U;
    const legL = kneeY - hipY, shin = h - kneeY, arm1 = 30 * U, arm2 = 33 * U;   // кисть ниже колена
    const lw = 2.3 * U;
    const limb = (cls, len, wd) => `<g class="${cls}"><path d="M0,0 L0,${len}" stroke="${col}" stroke-width="${wd}" stroke-linecap="round"/>`;
    const svg = H.svg(`
      <defs><radialGradient id="${id}g"><stop offset="0" stop-color="#fff2f2"/><stop offset=".25" stop-color="${RED}"/>
        <stop offset=".6" stop-color="${RED}" stop-opacity=".35"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient></defs>
      <g style="filter:blur(${p.soft ?? 0.8}px)">
        <g class="body">
          ${limb("ll", legL, lw * 1.15)}${limb("ll2", shin, lw * 0.95)}</g></g>
          ${limb("lr", legL, lw * 1.15)}${limb("lr2", shin, lw * 0.95)}</g></g>
          <path d="M${cx - shW},${shY} Q${cx - shW * 0.55},${hipY * 0.6} ${cx - 2.2 * U},${hipY} L${cx + 2.2 * U},${hipY}
                   Q${cx + shW * 0.55},${hipY * 0.6} ${cx + shW},${shY} Q${cx},${shY - 2 * U} ${cx - shW},${shY} Z" fill="${col}"/>
          <path d="M${cx - 1.2 * U},${neckY} L${cx - 1.4 * U},${shY + 1 * U} L${cx + 1.4 * U},${shY + 1 * U} L${cx + 1.2 * U},${neckY} Z" fill="${col}"/>
          ${limb("al", arm1, lw)}${limb("al2", arm2, lw * 0.8)}<path class="fl" d="M0,${arm2} l-${U},${4 * U} M0,${arm2} l0,${4.6 * U} M0,${arm2} l${U},${4 * U}" stroke="${col}" stroke-width="${0.5 * U}" stroke-linecap="round" fill="none"/></g></g>
          ${limb("ar", arm1, lw)}${limb("ar2", arm2, lw * 0.8)}<path class="fr" d="M0,${arm2} l-${U},${4 * U} M0,${arm2} l0,${4.6 * U} M0,${arm2} l${U},${4 * U}" stroke="${col}" stroke-width="${0.5 * U}" stroke-linecap="round" fill="none"/></g></g>
          <g class="head"><ellipse cx="0" cy="${-headR * 1.1}" rx="${headR * 0.82}" ry="${headR * 1.2}" fill="${col}"/></g>
        </g>
      </g>
      <g class="dotg"><circle class="halo" r="${headR * 2.4}" fill="url(#${id}g)"/><circle class="dot" r="${headR * 0.32}" fill="#ffe9e9"/></g>`, w, h);
    const q = (s) => svg.querySelector(s);
    const parts = { ll: q(".ll"), ll2: q(".ll2"), lr: q(".lr"), lr2: q(".lr2"), al: q(".al"), al2: q(".al2"), ar: q(".ar"), ar2: q(".ar2") };
    const head = q(".head"), dotg = q(".dotg"), halo = q(".halo"), dot = q(".dot");
    let dotXY = [cx, neckY - headR];
    return {
      el: svg, w, h,
      update(t, it) {
        const wk = it.v("walk", 0), ph = wk ? t * wk * Math.PI : 0, sw = wk ? Math.sin(ph) : 0;
        const tilt = it.v("tilt", 18) + H.noise(t, 3, 0.4) * 2.5, reach = it.v("reach", 0), tw = it.v("twitch", 0.4);
        const legA = sw * 22, armA = -sw * 14;
        const set = (e, x, y, a) => e.setAttribute("transform", `translate(${x},${y}) rotate(${a})`);
        set(parts.ll, cx - 1.6 * U, hipY, legA); set(parts.ll2, 0, legL, Math.max(0, -legA) * 0.9 + 2);
        set(parts.lr, cx + 1.6 * U, hipY, -legA); set(parts.lr2, 0, legL, Math.max(0, legA) * 0.9 + 2);
        const fa = H.noise(t, 7, 1.7) * 6 * tw;
        set(parts.al, cx - shW * 0.92, shY + U, 4 + armA - reach * 70); set(parts.al2, 0, arm1, -3 + fa - reach * 10);
        set(parts.ar, cx + shW * 0.92, shY + U, -4 - armA + reach * 70); set(parts.ar2, 0, arm1, 3 - fa + reach * 10);
        const bob = wk ? Math.abs(Math.cos(ph)) * -1.2 * U : 0;
        q(".body").setAttribute("transform", `translate(0,${bob})`);
        head.setAttribute("transform", `translate(${cx},${neckY + bob}) rotate(${tilt})`);
        // точка «лица» — на голове, повёрнута вместе с наклоном
        const a = (tilt * Math.PI) / 180, fy = -headR * 1.15;
        dotXY = [cx - Math.sin(a) * fy, neckY + bob + Math.cos(a) * fy];
        const k = it.v("dot", 1), fl = 0.85 + 0.15 * Math.sin(t * 9.0 + H.noise(t, 2, 2) * 2);
        dotg.setAttribute("transform", `translate(${dotXY[0]},${dotXY[1]})`);
        halo.setAttribute("opacity", (k * fl).toFixed(3)); dot.setAttribute("opacity", (k * fl).toFixed(3));
        halo.setAttribute("r", (headR * (1.6 + k * 1.2)).toFixed(1));
      },
      anchor(name) { return name === "dot" || name === "head" ? dotXY : null; },
    };
  },
};

// ------------------------------------------------------------------ creature_face: существо вплотную (фронтальная камера)
// dot (дорожка 0..1), tilt (дорожка, °), open (дорожка 0..1 — точка расширяется; не grow: это служебный ключ движка), w/h — во весь кадр. Точка — ровно на x = w/2.
export const creature_face = {
  origin: "top-left",
  create(p, H) {
    // рисуется в кадре 1080×1920 и масштабируется до ширины w; h — высота окна (обрезка), точка — по центру окна по x
    const W = p.w ?? 1080, k = W / 1080, Hh = p.h ?? 1920 * k, cx = 540, cy = p.cy ?? 820, id = H.uid("cf");
    const oy = p.h != null ? Hh / 2 - cy * k : 0;
    const svg = H.svg(`
      <defs><radialGradient id="${id}g"><stop offset="0" stop-color="#fff4f4"/><stop offset=".18" stop-color="${RED}"/>
        <stop offset=".55" stop-color="${RED}" stop-opacity=".28"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}r" cx=".35" cy=".3"><stop offset="0" stop-color="#3a3a42"/><stop offset="1" stop-color="#060607"/></radialGradient></defs>
      <g transform="translate(0,${oy}) scale(${k})">
      <g class="sil" style="filter:blur(2px)">
        <path d="M${cx - 640},${1960} Q${cx - 560},${cy + 560} ${cx - 210},${cy + 470} L${cx + 210},${cy + 470} Q${cx + 560},${cy + 560} ${cx + 640},${1960} Z" fill="#060607"/>
        <path d="M${cx - 90},${cy + 300} L${cx - 110},${cy + 520} L${cx + 110},${cy + 520} L${cx + 90},${cy + 300} Z" fill="#060607"/>
        <g class="hd"><ellipse cx="0" cy="0" rx="300" ry="420" fill="url(#${id}r)"/></g>
      </g>
      <circle class="halo" cx="${cx}" cy="${cy}" r="260" fill="url(#${id}g)"/>
      <circle class="dot" cx="${cx}" cy="${cy}" r="30" fill="#fff0f0"/></g>`, W, Hh);
    if (p.h != null) { svg.setAttribute("overflow", "hidden"); svg.style.overflow = "hidden"; }
    const hd = svg.querySelector(".hd"), halo = svg.querySelector(".halo"), dot = svg.querySelector(".dot");
    return {
      el: svg, w: W, h: Hh,
      update(t, it) {
        const tilt = it.v("tilt", 0) + H.noise(t, 5, 0.3) * 1.5, kd = it.v("dot", 1), g = it.v("open", 0);
        hd.setAttribute("transform", `translate(${cx},${cy}) rotate(${tilt})`);
        const fl = 0.88 + 0.12 * Math.sin(t * 7);
        halo.setAttribute("r", (200 + 160 * g).toFixed(1)); halo.setAttribute("opacity", (kd * fl).toFixed(3));
        dot.setAttribute("r", (24 + 26 * g).toFixed(1)); dot.setAttribute("opacity", (kd * fl).toFixed(3));
      },
      anchor(name) { return name === "dot" ? [cx * k, cy * k + oy] : null; },
    };
  },
};

// ------------------------------------------------------------------ vhs: оверлей найденной записи (space: screen)
// label (вверху справа), rec (true), date ("06.10"), clock (секунды суток при t = 0), cam (строка внизу справа), grain, scan,
// tear (дорожка 0..1 — помеха: строки рвутся), snow (дорожка 0..1 — белый шум на весь кадр), tracking (полоса трекинга снизу).
export const vhs = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, ink = "#f1f1ec";
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const scan = H.div(`width:${w}px;height:${h}px;background:repeating-linear-gradient(0deg, rgba(0,0,0,${p.scan ?? 0.26}) 0 2px, transparent 2px 6px)`);
    const cv = document.createElement("canvas");
    cv.width = Math.max(8, Math.round(w / 5)); cv.height = Math.max(8, Math.round(h / 5));
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:${p.grain ?? 0.14};mix-blend-mode:screen;image-rendering:pixelated`;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(cv.width, cv.height);
    const snow = document.createElement("canvas");
    snow.width = cv.width; snow.height = cv.height;
    snow.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:0;image-rendering:pixelated`;
    const sctx = snow.getContext("2d"), simg = sctx.createImageData(cv.width, cv.height);
    const roll = H.div(`left:0;width:${w}px;height:220px;background:linear-gradient(transparent, rgba(255,255,255,.07), transparent)`);
    const track = H.div(`left:0;width:${w}px;height:34px;background:repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 3px, rgba(0,0,0,.4) 3px 9px, rgba(255,255,255,.25) 9px 13px);filter:blur(1.2px);mix-blend-mode:screen`);
    const tears = [0, 1, 2, 3].map(() => H.div(`left:0;width:${w}px;height:10px;background:linear-gradient(90deg, rgba(255,60,80,.0), rgba(255,255,255,.65) 30%, rgba(80,200,255,.5) 60%, rgba(255,255,255,0));mix-blend-mode:screen;opacity:0`));
    const vig = H.div(`width:${w}px;height:${h}px;background:radial-gradient(ellipse at 50% 48%, transparent 52%, rgba(0,0,0,.62))`);
    const txt = (css, s = "") => H.div(`font:700 34px ${MONO(H)};letter-spacing:3px;color:${ink};text-shadow:2px 0 0 rgba(255,40,60,.55), -2px 0 0 rgba(60,200,255,.45), 0 0 8px rgba(0,0,0,.9);white-space:nowrap;${css}`, s);
    const rec = txt(`left:64px;top:236px;color:${RED}`, "● REC");
    const lab = txt(`right:64px;left:auto;top:236px;text-align:right`, p.label ?? "");
    lab.style.left = "auto"; lab.style.right = "64px";
    const ts = txt(`left:64px;top:${p.bottom ?? h - 600}px;font-size:30px`);
    const cam = txt(`top:${p.bottom ?? h - 600}px;font-size:30px`, p.cam ?? "SP ▶");
    cam.style.left = "auto"; cam.style.right = "64px";
    el.append(scan, cv, snow, roll, track, ...tears, vig, rec, lab, ts, cam);
    if (p.rec === false) rec.style.display = "none";
    if (p.text === false) [rec, lab, ts, cam, track].forEach((e) => (e.style.display = "none"));
    let last = -1;
    return {
      el, w, h,
      update(t, it) {
        const fr = Math.round(t * 30), sn = it.v("snow", 0), tr = it.v("tear", 0);
        if (fr !== last) {
          last = fr;
          const r = H.rng(fr * 7919 + 17), d = img.data;
          for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
          ctx.putImageData(img, 0, 0);
          if (sn > 0.001) {
            const r2 = H.rng(fr * 104729 + 3), s = simg.data;
            for (let i = 0; i < s.length; i += 4) { const v = (r2() ** 1.6) * 255; s[i] = s[i + 1] = s[i + 2] = v; s[i + 3] = 255; }
            sctx.putImageData(simg, 0, 0);
          }
          const r3 = H.rng(fr * 31 + 5);
          tears.forEach((e, i) => {
            const on = tr > 0.02 && r3() < 0.25 + tr * 0.7;
            e.style.opacity = on ? (0.3 + tr * 0.7).toFixed(2) : 0;
            e.style.top = `${Math.round(300 + r3() * (h - 800))}px`;
            e.style.height = `${Math.round(4 + r3() * 26 * (0.3 + tr))}px`;
            e.style.transform = `translateX(${Math.round((r3() - 0.5) * 120 * tr)}px)`;
          });
          track.style.top = `${Math.round(h - 300 - 18 * Math.sin(t * 1.3) - (r3() * 10))}px`;
        }
        snow.style.opacity = sn.toFixed(3);
        track.style.opacity = (p.tracking ?? 0.55) * (0.6 + 0.4 * Math.sin(t * 2.1));
        roll.style.top = `${((t * 210) % (h + 440)) - 220}px`;
        rec.style.opacity = Math.sin(t * 5.5) > -0.2 ? 1 : 0.12;
        const sec = (p.clock ?? 11520) + t, hh = Math.floor(sec / 3600) % 24, mm = Math.floor(sec / 60) % 60, ss = Math.floor(sec) % 60;
        const pad = (v) => String(v).padStart(2, "0");
        ts.textContent = `${p.date ?? ""}${p.date ? "  " : ""}${pad(hh)}:${pad(mm)}:${pad(ss)}`;
      },
    };
  },
};

// ------------------------------------------------------------------ ridge: горный хребет / холмы со снегом
// w, h, color, snow (цвет шапок или false), peaks (число вершин), rough, seed. Origin — низ-центр; низ заливается цветом.
export const ridge = {
  origin: "bottom",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1600, h = p.h ?? 300, n = p.peaks ?? 7, rnd = H.rng(p.seed ?? 3), col = H.col(p.color ?? "#6b7076");
    const pts = [];
    for (let i = 0; i <= n * 4; i++) {
      const x = (i / (n * 4)) * w, ph = (i % 4) / 4, peak = Math.sin(ph * Math.PI);
      pts.push([x, h - h * (0.25 + 0.75 * peak * (0.55 + 0.45 * rnd())) * (p.rough ? 1 - rnd() * p.rough : 1)]);
    }
    const line = H.smoothPath(pts);
    let snow = "";
    if (p.snow !== false) {
      const sc = H.col(p.snow ?? "#d9dde0");
      for (let i = 2; i < pts.length; i += 4) {
        const [x, y] = pts[i]; if (y > h * 0.45) continue;
        const d = h * 0.16 + rnd() * h * 0.08;
        snow += `<path d="M${x - d * 1.3},${y + d} L${x - d * 0.6},${y + d * 0.75} L${x - d * 0.2},${y + d * 1.05} L${x + d * 0.3},${y + d * 0.7} L${x + d * 1.2},${y + d} L${x},${y} Z" fill="${sc}" opacity=".8"/>`;
      }
    }
    const svg = H.svg(`<path d="${line} L${w},${h} L0,${h} Z" fill="${col}"/>${snow}`, w, h);
    return { el: svg, w, h };
  },
};

// ------------------------------------------------------------------ mast: решётчатая мачта метеостанции с анемометром
export const mast = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const h = p.h ?? 520, w = 120, c = H.col(p.color ?? "#3a3d42"), cx = w / 2;
    let s = `<path d="M${cx - 16},${h} L${cx - 4},40 M${cx + 16},${h} L${cx + 4},40" stroke="${c}" stroke-width="5"/>`;
    for (let y = 60; y < h; y += 44) { const k = y / h, a = 4 + 12 * k; s += `<path d="M${cx - a},${y} L${cx + a + 3},${y + 40} M${cx + a},${y} L${cx - a - 3},${y + 40}" stroke="${c}" stroke-width="2.5"/>`; }
    s += `<rect x="${cx - 26}" y="${h * 0.45}" width="30" height="40" fill="${c}"/><path d="M${cx},40 L${cx},10" stroke="${c}" stroke-width="4"/>
      <g class="cups" transform="translate(${cx},10)"><path d="M-34,0 L34,0 M0,-6 L0,6" stroke="${c}" stroke-width="4"/>
      <circle cx="-34" cy="0" r="7" fill="${c}"/><circle cx="34" cy="0" r="7" fill="${c}"/></g>
      <rect x="${cx - 28}" y="${h - 8}" width="56" height="10" fill="${H.shade(c, -0.3)}"/>`;
    const svg = H.svg(s, w, h), cups = svg.querySelector(".cups");
    return { el: svg, w, h, update(t) { cups.setAttribute("transform", `translate(${cx},10) scale(${Math.cos(t * 5).toFixed(3)},1)`); } };
  },
};

// ------------------------------------------------------------------ highway: ночная трасса из видеорегистратора (во весь кадр)
// speed (дорожка, разметка/столбики пробегают), hz (y горизонта), road (цвет), glow (свет фар 0..1)
export const highway = {
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, hz = p.hz ?? 900, cx = w / 2, id = H.uid("hw");
    const road = H.col(p.road ?? "#26282b");
    const svg = H.svg(`
      <defs><radialGradient id="${id}l" cx=".5" cy="1" r=".9"><stop offset="0" stop-color="#cfd2d4" stop-opacity=".5"/><stop offset="1" stop-color="#cfd2d4" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151617"/><stop offset="1" stop-color="${road}"/></linearGradient></defs>
      <rect x="0" y="${hz}" width="${w}" height="${h - hz}" fill="#121314"/>
      <path d="M${cx - 30},${hz} L${cx + 30},${hz} L${w + 700},${h} L${-700},${h} Z" fill="url(#${id}r)"/>
      <path d="M${cx - 26},${hz} L${-640},${h} M${cx + 26},${hz} L${w + 640},${h}" stroke="#bfc3c6" stroke-width="7" opacity=".6"/>
      <g class="dash"></g><g class="posts"></g>
      <path d="M${cx - 30},${hz} L${-700},${h} L${w + 700},${h} L${cx + 30},${hz} Z" fill="url(#${id}l)" class="beam"/>`, w, h);
    const dash = svg.querySelector(".dash"), posts = svg.querySelector(".posts");
    const N = 9;
    for (let i = 0; i < N; i++) { H.el("path", { fill: "#d6d8da", opacity: 0.8 }, dash); }
    for (let i = 0; i < N; i++) { const g = H.el("g", {}, posts); H.el("rect", { fill: "#3c3f42" }, g); H.el("rect", { fill: "#c7cacc" }, g); }
    let dist = 0, lastT = null;
    const proj = (z) => hz + (h - hz) * (1 / z);       // z: 1 = низ кадра, растёт к горизонту
    return {
      el: svg, w, h,
      update(t, it) {
        const sp = it.v("speed", 1);
        dist = t * sp;                                    // детерминировано: позиция — функция времени
        [...dash.children].forEach((e, i) => {
          const z0 = 1 + (((i - dist * 2.2) % N) + N) % N * 1.6, z1 = z0 + 0.7;
          const y0 = proj(z0), y1 = proj(z1), w0 = 26 / z0, w1 = 26 / z1;
          e.setAttribute("d", `M${cx - w0},${y0} L${cx + w0},${y0} L${cx + w1},${y1} L${cx - w1},${y1} Z`);
        });
        [...posts.children].forEach((g, i) => {
          const z = 1 + (((i - dist * 1.6) % N) + N) % N * 1.9, y = proj(z), s = 1 / z, x = cx + (i % 2 ? 1 : -1) * (cx + 760) * s;
          const ph = 300 * s, pw = 22 * s;
          g.children[0].setAttribute("x", x - pw / 2); g.children[0].setAttribute("y", y - ph); g.children[0].setAttribute("width", pw); g.children[0].setAttribute("height", ph);
          g.children[1].setAttribute("x", x - pw / 2); g.children[1].setAttribute("y", y - ph); g.children[1].setAttribute("width", pw); g.children[1].setAttribute("height", ph * 0.18);
        });
        svg.querySelector(".beam").setAttribute("opacity", it.v("glow", 0.8));
      },
    };
  },
};

// ------------------------------------------------------------------ corridor: перспектива метро / подземной парковки (во весь кадр)
// kind: metro | parking, vx/vy (точка схода), lamp (дорожка 0..1 — мигает дальняя лампа), w/h. Пол — поверхность.
export const corridor = {
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, vx = p.vx ?? 540, vy = p.vy ?? 900, kind = p.kind ?? "metro", id = H.uid("co");
    const wallC = kind === "metro" ? "#3d4043" : "#2c2e30", floorC = kind === "metro" ? "#55585b" : "#3a3c3e", ceilC = "#1f2123";
    // прямоугольник туннеля на глубине z (z = 1 — край кадра)
    const L = -60, R = w + 60, T = 120, B = h + 60;
    const at = (z) => ({ l: vx + (L - vx) / z, r: vx + (R - vx) / z, t: vy + (T - vy) / z, b: vy + (B - vy) / z });
    const far = at(9);
    let s = `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#202224"/><stop offset="1" stop-color="${floorC}"/></linearGradient>
        <radialGradient id="${id}h"><stop offset="0" stop-color="#e9ecee" stop-opacity=".55"/><stop offset="1" stop-color="#e9ecee" stop-opacity="0"/></radialGradient></defs>
      <rect x="0" y="0" width="${w}" height="${h}" fill="${wallC}"/>
      <path d="M${L},${T} L${R},${T} L${far.r},${far.t} L${far.l},${far.t} Z" fill="${ceilC}"/>
      <path d="M${L},${B} L${R},${B} L${far.r},${far.b} L${far.l},${far.b} Z" fill="url(#${id}f)"/>
      <path d="M${L},${T} L${far.l},${far.t} L${far.l},${far.b} L${L},${B} Z" fill="${H.shade(wallC, -0.25)}"/>
      <path d="M${R},${T} L${far.r},${far.t} L${far.r},${far.b} L${R},${B} Z" fill="${H.shade(wallC, -0.15)}"/>
      <rect x="${far.l}" y="${far.t}" width="${far.r - far.l}" height="${far.b - far.t}" fill="#060606"/>`;
    if (kind === "metro") {
      // путь справа: край платформы и жёлтая (серая) линия безопасности
      const e1 = at(1), e2 = at(9), ex = (q) => q.l + (q.r - q.l) * 0.7;
      s += `<path d="M${ex(e1)},${e1.b} L${ex(e2)},${e2.b} L${e2.r},${e2.b} L${e1.r + 400},${e1.b} Z" fill="#0d0e0f"/>
        <path d="M${ex(e1) - 60},${e1.b} L${ex(e2) - 6},${e2.b}" stroke="#a9acaf" stroke-width="22" opacity=".7"/>`;
      // табло
      const q = at(2.2);
      s += `<rect x="${q.l + 120}" y="${q.t + 60}" width="300" height="70" fill="#0c0d0e" stroke="#6b6e71" stroke-width="3"/>
        <text x="${q.l + 270}" y="${q.t + 108}" text-anchor="middle" font-family="JBM" font-weight="700" font-size="34" fill="#c8cbcd">03:11</text>`;
    } else {
      // разметка мест и припаркованные машины по бокам
      for (let i = 1; i < 6; i++) {
        const z = 1.4 + i * 1.3, q = at(z), q2 = at(z + 0.65);
        s += `<path d="M${q.l},${q.b} L${q.l + (q.r - q.l) * 0.2},${q.b}" stroke="#9a9da0" stroke-width="${6 / z}"/>`;
        [[q.l + (q.r - q.l) * 0.02, q2.l + (q2.r - q2.l) * 0.17], [q.r - (q.r - q.l) * 0.17, q2.r - (q2.r - q2.l) * 0.02]].forEach(([a, b], j) => {
          const top = q.b - (q.b - q.t) * 0.16;
          s += `<path d="M${a},${q.b - 4} L${a},${top} Q${(a + b) / 2},${top - 40 / z} ${b},${top} L${b},${q2.b} Z" fill="${["#1b1c1e", "#242628"][(i + j) % 2]}"/>`;
        });
      }
    }
    // колонны и лампы по глубине
    const cols = [];
    for (let i = 0; i < 7; i++) {
      const z = 1.3 + i * 1.15, q = at(z), cw = 120 / z;
      for (const side of [0, 1]) {
        const x = side ? q.l + (q.r - q.l) * (kind === "metro" ? 0.6 : 0.78) : q.l + (q.r - q.l) * (kind === "metro" ? 0.12 : 0.22);
        cols.push({ z, x, t: q.t, b: q.b, cw });
      }
      s += `<rect class="lamp" data-i="${i}" x="${vx - 260 / z}" y="${q.t + 8 / z}" width="${520 / z}" height="${16 / z}" fill="#e8ebed"/>
        <ellipse class="lh" data-i="${i}" cx="${vx}" cy="${q.t + 40 / z}" rx="${520 / z}" ry="${160 / z}" fill="url(#${id}h)"/>`;
    }
    cols.sort((a, b) => b.z - a.z).forEach((c) => {
      s += `<rect x="${c.x - c.cw / 2}" y="${c.t}" width="${c.cw}" height="${c.b - c.t}" fill="${H.shade(wallC, 0.12 - c.z * 0.02)}"/>
        <rect x="${c.x - c.cw / 2}" y="${c.t}" width="${c.cw * 0.25}" height="${c.b - c.t}" fill="#000" opacity=".25"/>`;
    });
    const svg = H.svg(s, w, h);
    const lamps = [...svg.querySelectorAll(".lamp")], lhs = [...svg.querySelectorAll(".lh")];
    return {
      el: svg, w, h,
      update(t, it) {
        const k = it.v("lamp", 0);
        const on = (i) => (i === 5 && k > 0 ? (H.noise(t, 9, 6) > -0.1 ? 1 : 0.15) : 1);
        lamps.forEach((e, i) => e.setAttribute("opacity", on(i)));
        lhs.forEach((e, i) => e.setAttribute("opacity", on(i)));
      },
      anchor(name, args) { if (name === "floor") { const q = at(args[0] ?? 3); return [q.l + (q.r - q.l) * (args[1] ?? 0.5), q.b]; } return null; },
    };
  },
};

// ------------------------------------------------------------------ glass_wall: стеклянная стена офиса (рамы), за ней город
export const glass_wall = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 900, cols = p.cols ?? 5, c = H.col(p.color ?? "#0e1218");
    let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#7fa6c8" opacity=".05"/>`;
    for (let i = 0; i <= cols; i++) s += `<rect x="${(i * w) / cols - 9}" y="0" width="18" height="${h}" fill="${c}"/>`;
    s += `<rect x="0" y="${h * 0.62}" width="${w}" height="14" fill="${c}"/><rect x="0" y="0" width="${w}" height="26" fill="${c}"/><rect x="0" y="${h - 30}" width="${w}" height="30" fill="${c}"/>`;
    for (let i = 0; i < cols; i++) s += `<path d="M${(i * w) / cols + 40},30 L${(i * w) / cols + 120},30 L${(i * w) / cols + 20},${h * 0.6} L${(i * w) / cols - 60 + 70},${h * 0.6} Z" fill="#9fc3e6" opacity=".04"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ office_desk: офисный стол сбоку/спереди (поверхность)
export const office_desk = {
  origin: "bottom",
  grounded: true,
  surface: true,
  size_m: { h: 0.75 },
  create(p, H) {
    const w = p.w ?? 640, h = p.h ?? 330, c = H.col(p.color ?? "#2a2f38"), top = H.col(p.top ?? "#3a414d");
    const svg = H.svg(`<rect x="0" y="0" width="${w}" height="24" rx="4" fill="${top}"/><rect x="0" y="22" width="${w}" height="10" fill="${H.shade(top, -0.35)}"/>
      <rect x="30" y="30" width="16" height="${h - 30}" fill="${c}"/><rect x="${w - 46}" y="30" width="16" height="${h - 30}" fill="${c}"/>
      <rect x="${w - 220}" y="30" width="170" height="${h * 0.55}" fill="${H.shade(c, 0.06)}"/><rect x="${w - 150}" y="${30 + h * 0.2}" width="30" height="6" fill="#565d68"/>`, w, h);
    return { el: svg, w, h };
  },
};

// ------------------------------------------------------------------ monitor: монитор на подставке, внутри — вложенные актёры
// w, h (экран), glow (цвет свечения), on (дорожка яркости 0..1), children (координаты экрана), stand (true)
export const monitor = {
  origin: "bottom",
  grounded: true,
  async create(p, H) {
    const sw = p.w ?? 520, sh = p.h ?? 320, bz = 14, stand = p.stand === false ? 0 : 90, w = sw + bz * 2, h = sh + bz * 2 + stand;
    const glow = H.col(p.glow ?? "#5aa0ff");
    const el = H.div(`width:${w}px;height:${h}px`);
    const st = H.svg(stand ? `<rect x="${w / 2 - 14}" y="${sh + bz * 2 - 4}" width="28" height="${stand - 10}" fill="#1a1d22"/><rect x="${w / 2 - 90}" y="${h - 14}" width="180" height="14" rx="6" fill="#20242a"/>` : "", w, h);
    const frame = H.div(`width:${sw + bz * 2}px;height:${sh + bz * 2}px;border-radius:10px;background:#111317;box-shadow:0 0 60px ${H.rgba(glow, 0.35)}, 0 0 0 2px #24282f`);
    const screen = H.div(`left:${bz}px;top:${bz}px;width:${sw}px;height:${sh}px;overflow:hidden;background:${H.col(p.bg ?? "#0a0d12")}`);
    const shade = H.div(`left:${bz}px;top:${bz}px;width:${sw}px;height:${sh}px;background:linear-gradient(160deg, rgba(255,255,255,.07), transparent 40%);pointer-events:none`);
    frame.append(screen, shade);
    el.append(st, frame);
    for (const c of p.children || []) await H.child(c, screen);
    return {
      el, w, h,
      update(t, it) { screen.style.filter = `brightness(${it.v("on", 1)})`; },
      anchor(name) { return name === "screen" ? [w / 2, bz + sh / 2] : null; },
    };
  },
};

// ------------------------------------------------------------------ wall_cam: камера наблюдения на кронштейне с красным огоньком
// led (дорожка 0..1 — сила огонька), blink (true), size (ширина корпуса), flip
export const wall_cam = {
  origin: "center",
  create(p, H) {
    const s = (p.size ?? 150) / 150, w = 190 * s, h = 120 * s, id = H.uid("wc");
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="${RED}"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient></defs>
      <g transform="scale(${s})"><rect x="150" y="10" width="34" height="90" rx="6" fill="#23262b"/><path d="M150,52 L118,52 L118,62 L150,62 Z" fill="#2c3036"/>
      <g transform="rotate(14 100 50)"><rect x="18" y="30" width="110" height="44" rx="10" fill="#d4d7da"/><rect x="18" y="30" width="110" height="12" rx="6" fill="#eceef0"/>
      <rect x="6" y="34" width="20" height="36" rx="5" fill="#16181b"/><circle cx="16" cy="52" r="10" fill="#050608"/><circle cx="13" cy="49" r="3" fill="#6b7a8a"/>
      <circle class="halo" cx="44" cy="40" r="22" fill="url(#${id})"/><circle class="led" cx="44" cy="40" r="5" fill="${RED}"/></g></g>`, w, h);
    const led = svg.querySelector(".led"), halo = svg.querySelector(".halo");
    return {
      el: svg, w, h,
      update(t, it) {
        const k = it.v("led", 1) * (p.blink === false ? 1 : (Math.sin(t * 3.2) > -0.3 ? 1 : 0.25));
        led.setAttribute("opacity", k); halo.setAttribute("opacity", k * 0.8);
      },
      anchor(name) { return name === "led" ? [44 * s, 40 * s] : null; },
    };
  },
};

// ------------------------------------------------------------------ lens: объектив крупно: кольца, диафрагма, отражение фигуры
// r, close (дорожка 0..1 — диафрагма сжимается), reflect (дорожка 0..1 — силуэт в стекле растёт)
export const lens = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 420, w = r * 2.2, h = r * 2.2, c = w / 2, id = H.uid("ln");
    const blades = 7;
    let s = `<defs><radialGradient id="${id}g" cx=".4" cy=".35"><stop offset="0" stop-color="#2b3440"/><stop offset=".7" stop-color="#07090c"/><stop offset="1" stop-color="#000"/></radialGradient>
        <clipPath id="${id}c"><circle cx="${c}" cy="${c}" r="${r * 0.62}"/></clipPath></defs>
      <circle cx="${c}" cy="${c}" r="${r * 1.08}" fill="#141518"/><circle cx="${c}" cy="${c}" r="${r}" fill="#1d1f23" stroke="#3a3d42" stroke-width="6"/>
      <circle cx="${c}" cy="${c}" r="${r * 0.86}" fill="none" stroke="#2c2f34" stroke-width="${r * 0.05}"/>
      <text x="${c}" y="${c - r * 0.9}" text-anchor="middle" font-family="JBM" font-size="${r * 0.07}" fill="#8d9196" letter-spacing="4">2.8 / 4mm ∞</text>
      <circle cx="${c}" cy="${c}" r="${r * 0.62}" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)"><g class="refl"></g><g class="bl"></g></g>
      <ellipse cx="${c - r * 0.22}" cy="${c - r * 0.25}" rx="${r * 0.2}" ry="${r * 0.09}" fill="#fff" opacity=".18" transform="rotate(-35 ${c - r * 0.22} ${c - r * 0.25})"/>`;
    const svg = H.svg(s, w, h), bl = svg.querySelector(".bl"), refl = svg.querySelector(".refl");
    // отражение: вытянутый силуэт с красной точкой, слегка изогнут стеклом
    refl.innerHTML = `<g class="fig"><ellipse cx="0" cy="-100" rx="16" ry="22" fill="#000"/><path d="M-22,-76 Q-30,0 -10,90 L10,90 Q30,0 22,-76 Z" fill="#000"/>
      <path d="M-22,-70 Q-44,10 -40,80 M22,-70 Q44,10 40,80" stroke="#000" stroke-width="8" fill="none"/><circle cx="0" cy="-102" r="6" fill="${RED}"/>
      <circle cx="0" cy="-102" r="18" fill="${RED}" opacity=".35"/></g>`;
    for (let i = 0; i < blades; i++) H.el("path", { fill: "#0b0c0e", stroke: "#2a2d31", "stroke-width": 3 }, bl);
    const fig = refl.querySelector(".fig");
    return {
      el: svg, w, h,
      update(t, it) {
        const k = it.v("close", 0), R0 = r * 0.62, ap = R0 * (1 - 0.72 * k);
        [...bl.children].forEach((e, i) => {
          const a = (i / blades) * Math.PI * 2 + k * 0.6, a2 = a + (Math.PI * 2) / blades;
          const p1 = [c + Math.cos(a) * ap, c + Math.sin(a) * ap], p2 = [c + Math.cos(a2) * ap, c + Math.sin(a2) * ap];
          e.setAttribute("d", `M${p1[0]},${p1[1]} L${p2[0]},${p2[1]} L${c + Math.cos(a2) * R0 * 1.6},${c + Math.sin(a2) * R0 * 1.6} L${c + Math.cos(a) * R0 * 1.6},${c + Math.sin(a) * R0 * 1.6} Z`);
        });
        const g = it.v("reflect", 0.4);
        fig.setAttribute("transform", `translate(${c},${c + 40}) scale(${(0.5 + g * 1.4).toFixed(3)},${(0.6 + g * 1.5).toFixed(3)})`);
      },
    };
  },
};

// ------------------------------------------------------------------ cam_ui: интерфейс записи телефона (space: screen)
// mode: phone (идёт запись с таймером) | selfie (фронтальная камера: глазок над экраном светится), timer (секунды при t = 0)
export const cam_ui = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, mode = p.mode ?? "phone", ink = "#f4f4f0";
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const corners = H.svg(`<g stroke="${ink}" stroke-width="4" fill="none" opacity=".7"><path d="M60,360 V300 H120"/><path d="M${w - 120},300 H${w - 60} V360"/>
      <path d="M60,${h - 560} V${h - 500} H120"/><path d="M${w - 120},${h - 500} H${w - 60} V${h - 560}"/></g>`, w, h);
    const timer = H.div(`left:${w / 2 - 150}px;top:236px;width:300px;height:56px;border-radius:12px;background:${mode === "phone" ? RED : "rgba(0,0,0,.45)"};
      font:700 34px ${MONO(H)};color:#fff;text-align:center;line-height:56px;letter-spacing:2px`);
    el.append(corners, timer);
    if (mode === "selfie") timer.style.display = "none";
    let eye = null;
    if (mode === "selfie") {
      const id = H.uid("cu");
      eye = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="${RED}" stop-opacity=".9"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient></defs>
        <rect x="${w / 2 - 120}" y="120" width="240" height="70" rx="35" fill="#000"/><circle cx="${w / 2 + 60}" cy="155" r="40" fill="url(#${id})" class="eh"/>
        <circle cx="${w / 2 + 60}" cy="155" r="18" fill="#0b0d12" stroke="#3a4252" stroke-width="4"/><circle cx="${w / 2 + 55}" cy="150" r="5" fill="#7b8aa6"/>`, w, h);
      el.appendChild(eye);
    }
    return {
      el, w, h,
      update(t) {
        const sec = Math.floor((p.timer ?? 4) + t), pad = (v) => String(v).padStart(2, "0");
        timer.textContent = mode === "phone" ? `● ${pad(Math.floor(sec / 60))}:${pad(sec % 60)}` : "ФРОНТ · 1×";
        if (eye) eye.querySelector(".eh").setAttribute("opacity", (0.6 + 0.4 * Math.sin(t * 4)).toFixed(3));
      },
    };
  },
};

// ------------------------------------------------------------------ back_view: человек за столом со спины (голова и плечи)
// w (ширина плеч), hair (bob | short), hair_color, top (цвет худи), rim (цвет контурного света от монитора), hood (true)
export const back_view = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 420, h = w * 1.25, cx = w / 2, rim = H.col(p.rim ?? "#5aa0ff"), hc = H.col(p.hair_color ?? "#17141a"), top = H.col(p.top ?? "#3b3f47");
    const hr = w * 0.2, hy = h * 0.36, bob = (p.hair ?? "bob") === "bob";
    const svg = H.svg(`
      <path d="M0,${h} Q0,${h * 0.62} ${cx - w * 0.16},${h * 0.58} L${cx + w * 0.16},${h * 0.58} Q${w},${h * 0.62} ${w},${h} Z" fill="${top}"/>
      ${p.hood === false ? "" : `<path d="M${cx - w * 0.26},${h * 0.6} Q${cx},${h * 0.74} ${cx + w * 0.26},${h * 0.6} Q${cx},${h * 0.66} ${cx - w * 0.26},${h * 0.6} Z" fill="${H.shade(top, -0.3)}"/>`}
      <rect x="${cx - w * 0.08}" y="${hy + hr * 0.6}" width="${w * 0.16}" height="${h * 0.2}" fill="${H.shade(top, -0.45)}"/>
      <ellipse cx="${cx}" cy="${hy}" rx="${hr}" ry="${hr * 1.12}" fill="${hc}"/>
      ${bob ? `<path d="M${cx - hr * 1.08},${hy} Q${cx - hr * 1.15},${hy + hr * 1.25} ${cx - hr * 0.7},${hy + hr * 1.3} L${cx + hr * 0.7},${hy + hr * 1.3} Q${cx + hr * 1.15},${hy + hr * 1.25} ${cx + hr * 1.08},${hy} Z" fill="${hc}"/>` : ""}
      <path d="M${cx + hr * 0.2},${hy - hr * 1.08} Q${cx + hr * 1.18},${hy - hr * 0.6} ${cx + hr * 1.05},${hy + hr * 1.1}" stroke="${rim}" stroke-width="${w * 0.012}" fill="none" opacity=".75"/>
      <path d="M${cx + w * 0.2},${h * 0.6} Q${w * 0.96},${h * 0.64} ${w * 0.985},${h}" stroke="${rim}" stroke-width="${w * 0.012}" fill="none" opacity=".6"/>`, w, h);
    return { el: svg, w, h, anchor(name) { return name === "head" ? [cx, hy - hr] : null; } };
  },
};
