// Library (since «Люди выпадают из фотографий», projects/vanish — reused by the series).
// «Люди выпадают из фотографий» — места и предметы: улица у ателье, плитка, ветка, стаканы кофе, прилавок, альбом,
// экран ретуши, фотостудия, супермаркет и вокзал (вид камеры наблюдения), свадебный зал с зеркалом, студия новостей,
// сетка городских камер, телефон в воздухе.
//
// storefront: первый этаж дома с фотоателье (вывеска, витрина с рамками, дверь с колокольчиком, козырёк, окна второго
//   этажа); origin — середина низа. w, h, wall, sign, number, cups (стаканы за стеклом видны), bell (дорожка: качание)
// sidewalk: плитка тротуара в лёгкой перспективе (origin — верхний левый угол); shift: {x, w, dx} — «неправильный»
//   участок: швы сдвинуты на dx (след штампа); show_shift (дорожка 0..1); curb (бордюр сверху)
// branch: ветка с листьями сверху вниз (origin — верх); twin: dx — точно такая же ветка рядом (повтор штампа)
// paper_cup: бумажный стакан с крышкой и манжетой; letter («К»), steam (0..1), sugar (палочки сахара рядом)
// counter: прилавок/стол под небольшим углом (столешница + край), фон — стена; surface
// album: альбом сверху; open (дорожка 0..1); title на обложке
// retouch_screen: монитор редактора фото; children — изображение на холсте (0..cw, 0..ch); file, zoom, cursor (дорожка [x,y]),
//   cursor_on, tool
// studio_room: фотостудия (бумажный фон, софтбоксы, штатив, окно, дверь с колокольчиком); door (дорожка 0..1), bell (время
//   качания), lights (0..1), floor_y; backdrop
// shelves: проход супермаркета с высоты камеры; cart_x (дорожка, px), cart_on
// station_hall: зал ожидания вокзала с высоты камеры: табло, окна, кассы, скамьи, турникеты; turn (дорожка: турникет качается)
// wedding_hall: зал регистрации: стена, шторы, цветы, паркет; mirror: зеркало в золочёной раме, children — отражение
// news_studio: фон студии новостей + кресло ведущего (chair_rot — дорожка, °); news_desk: стол, плашка, бегущая строка
// cam_grid: сайт городских камер: плитки трансляций, sel (дорожка — номер выбранной), cursor
// phone_float: телефон (вид сзади/спереди), screen_on (0..1), view: back | front

const ORANGE = "#ffb23e";
const MONO = `"IBM Plex Mono", monospace`, COND = `"Oswald", sans-serif`, INTER = `"Inter", sans-serif`;

export const storefront = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 1100, h = p.h ?? 1150;
    const wall = H.col(p.wall ?? "#d8c3a0"), wall2 = H.shade(p.wall ?? "#d8c3a0", -0.12);
    const gH = 560;               // ground floor height
    const gy = h - gH;
    const rng = H.rng(p.seed ?? 4);
    let s = `<defs>
      <linearGradient id="sfglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c5a63"/><stop offset=".55" stop-color="#2a3238"/><stop offset="1" stop-color="#1c2226"/></linearGradient>
      <linearGradient id="sfrefl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="sfwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${wall2}"/></linearGradient></defs>`;
    s += `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#sfwall)"/>`;
    // upper floors: windows with frames, sills, some with curtains
    const cols = 4, ww = 150, wh = 230, gap = (w - cols * ww) / (cols + 1);
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
      const x = gap + c * (ww + gap), y = gy - 330 - r * 330;
      if (y + wh < -10) continue;
      s += `<rect x="${x - 14}" y="${y - 14}" width="${ww + 28}" height="${wh + 28}" fill="${H.shade(p.wall ?? "#d8c3a0", 0.18)}"/>`;
      s += `<rect x="${x}" y="${y}" width="${ww}" height="${wh}" fill="#3d4950"/>`;
      s += `<rect x="${x}" y="${y}" width="${ww}" height="${wh}" fill="url(#sfrefl)" opacity=".7"/>`;
      s += `<path d="M${x + ww / 2},${y} V${y + wh} M${x},${y + wh * 0.36} H${x + ww}" stroke="#f1ece2" stroke-width="7"/>`;
      if (rng() < 0.5) s += `<path d="M${x + 6},${y + 6} Q${x + 40},${y + wh * 0.5} ${x + 22},${y + wh - 6} L${x + 6},${y + wh - 6}Z" fill="${["#c9b49a", "#9fb0a8", "#d9cfc0"][c % 3]}" opacity=".9"/>`;
      s += `<rect x="${x - 20}" y="${y + wh + 10}" width="${ww + 40}" height="14" fill="#efe8db"/>`;
    }
    // cornice between floors
    s += `<rect x="0" y="${gy - 60}" width="${w}" height="26" fill="${H.shade(p.wall ?? "#d8c3a0", 0.22)}"/>`;
    // sign band
    s += `<rect x="0" y="${gy - 34}" width="${w}" height="110" fill="#23302c"/>`;
    s += `<text x="${w * 0.42}" y="${gy + 44}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="74" letter-spacing="10" fill="#f3e6c8">${p.sign ?? "ФОТОАТЕЛЬЕ"}</text>`;
    s += `<circle cx="${w * 0.42 - 270}" cy="${gy + 20}" r="20" fill="${ORANGE}"/>`;
    // shop window (left 60%) + door (right)
    const wx = 40, wy = gy + 110, wW = w * 0.6, wH = gH - 180;
    s += `<rect x="${wx - 16}" y="${wy - 16}" width="${wW + 32}" height="${wH + 32}" fill="#23302c"/>`;
    s += `<rect x="${wx}" y="${wy}" width="${wW}" height="${wH}" fill="url(#sfglass)"/>`;
    // inside: shelf with framed photos, counter with cups
    for (let i = 0; i < 5; i++) {
      const fx = wx + 40 + i * (wW - 80) / 5, fy = wy + 40 + (i % 2) * 26, fw = 92, fh = 118;
      s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#efe6d4" opacity=".85"/><rect x="${fx + 10}" y="${fy + 10}" width="${fw - 20}" height="${fh - 34}" fill="${["#8aa3b0", "#c79a6c", "#7c8f6e", "#b98c8c", "#9a8fb5"][i]}" opacity=".85"/>`;
    }
    const cy = wy + wH - 120;
    s += `<rect x="${wx}" y="${cy + 70}" width="${wW}" height="50" fill="#5a4a3a" opacity=".9"/>`;
    s += `<g class="cups" opacity=".95">
      <path d="M${wx + 450},${cy + 8} l6,62 h36 l6,-62z" fill="#f2efe8"/><rect x="${wx + 450}" y="${cy}" width="48" height="10" rx="3" fill="#3a3a3a"/><rect x="${wx + 453}" y="${cy + 28}" width="42" height="18" fill="#a8743e"/>
      <path d="M${wx + 520},${cy + 8} l6,62 h36 l6,-62z" fill="#f2efe8"/><rect x="${wx + 520}" y="${cy}" width="48" height="10" rx="3" fill="#3a3a3a"/><rect x="${wx + 523}" y="${cy + 28}" width="42" height="18" fill="#a8743e"/>
      <text x="${wx + 544}" y="${cy + 66}" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="26" fill="#1c1c1c">К</text></g>`;
    if (p.cups === false) s = s.replace(`<g class="cups" opacity=".95">`, `<g class="cups" opacity="0">`);
    // reflections on the glass
    s += `<path d="M${wx + wW * 0.12},${wy} L${wx + wW * 0.32},${wy} L${wx + wW * 0.12},${wy + wH} L${wx - 0},${wy + wH} Z" fill="#fff" opacity=".10"/>`;
    s += `<path d="M${wx + wW * 0.55},${wy} L${wx + wW * 0.62},${wy} L${wx + wW * 0.44},${wy + wH} L${wx + wW * 0.37},${wy + wH} Z" fill="#fff" opacity=".08"/>`;
    s += `<text x="${wx + wW / 2}" y="${wy + wH * 0.55}" text-anchor="middle" font-family="Oswald" font-size="40" letter-spacing="6" fill="#f3e6c8" opacity=".55">ФОТО НА ДОКУМЕНТЫ · ПЕЧАТЬ</text>`;
    // door
    const dx = wx + wW + 70, dW = w - dx - 50, dy = gy + 110;
    s += `<rect x="${dx - 16}" y="${dy - 16}" width="${dW + 32}" height="${h - dy + 16}" fill="#23302c"/>`;
    s += `<rect x="${dx}" y="${dy}" width="${dW}" height="${h - dy}" fill="url(#sfglass)"/>`;
    s += `<rect x="${dx + 18}" y="${dy + 18}" width="${dW - 36}" height="${(h - dy) * 0.55}" fill="#fff" opacity=".06"/>`;
    s += `<rect x="${dx + dW - 46}" y="${dy + (h - dy) * 0.5}" width="14" height="80" rx="6" fill="#c9b37a"/>`;
    s += `<rect x="${dx + 20}" y="${dy + 30}" width="${dW - 40}" height="44" rx="4" fill="#f3e6c8"/><text x="${dx + dW / 2}" y="${dy + 62}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="#23302c">ОТКРЫТО</text>`;
    // house number
    s += `<rect x="${w - 190}" y="${gy - 190}" width="150" height="70" rx="6" fill="#2c4f7c"/><text x="${w - 115}" y="${gy - 144}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="#fff">${p.number ?? "САДОВАЯ 14"}</text>`;
    // awning shadow on the wall
    s += `<rect x="0" y="${gy + 76}" width="${w}" height="26" fill="rgba(0,0,0,.18)"/>`;
    // plinth
    s += `<rect x="0" y="${h - 26}" width="${w}" height="26" fill="#7d7468"/>`;
    const svg = H.svg(s, w, h);
    // bell above the door
    const bell = H.el("g", {}, svg);
    H.el("path", { d: "M-14,0 Q-14,-24 0,-26 Q14,-24 14,0Z", fill: "#c9a640" }, bell);
    H.el("circle", { cx: 0, cy: 3, r: 4, fill: "#8a6f2a" }, bell);
    const bx = dx + dW / 2, by = dy + 4;
    return {
      el: svg, w, h,
      update(t, it) {
        const ring = p.bell_at ?? null;
        let a = 0;
        if (ring != null && t >= ring) a = Math.sin((t - ring) * 18) * 22 * Math.exp(-(t - ring) * 2.4);
        bell.setAttribute("transform", `translate(${bx},${by + 26}) rotate(${a},0,-26)`);
      },
    };
  },
};

export const sidewalk = {
  origin: "top-left",
  surface: true,
  backdrop: true,
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 600, c = H.col(p.color ?? "#b9b2a6"), seam = H.shade(p.color ?? "#b9b2a6", -0.28);
    const vx = p.vx ?? w / 2, rows = p.rows ?? 7;
    const svg = H.svg("", w, h);
    const curb = p.curb === false ? 0 : 26;
    H.el("rect", { x: 0, y: 0, width: w, height: h, fill: c }, svg);
    if (curb) H.el("rect", { x: 0, y: 0, width: w, height: curb, fill: H.shade(p.color ?? "#b9b2a6", 0.15) }, svg);
    // rows get taller toward the viewer
    const ys = [];
    let y = curb, step = (h - curb) / (rows * 1.6);
    for (let i = 0; i <= rows; i++) { ys.push(y); y += step; step *= 1.22; }
    const g = H.el("g", { stroke: seam, "stroke-width": 3, fill: "none" }, svg);
    const tile = p.tile ?? 120;
    const lines = [];
    for (let i = 0; i < ys.length; i++) H.el("line", { x1: 0, y1: ys[i], x2: w, y2: ys[i] }, g);
    // vertical seams: converge to vx at a far horizon (above the band)
    for (let i = 0; i + 1 < ys.length; i++) {
      const k = 0.55 + i * 0.12, off = (i % 2) * tile * k * 0.5;
      for (let x = -tile * 4 + off; x < w + tile * 4; x += tile * k) {
        const l = H.el("line", { x1: x, y1: ys[i], x2: x + (x - vx) * 0.12, y2: ys[i + 1] ?? h }, g);
        lines.push({ l, x, r: i });
      }
    }
    // the "wrong" patch: seams inside it are shifted by dx (clone stamp trace)
    const sh = p.shift;
    let patch = null;
    if (sh) {
      patch = H.el("g", {}, svg);
      const cp = H.el("clipPath", { id: H.uid("sw") }, svg);
      H.el("rect", { x: sh.x, y: sh.y ?? curb, width: sh.w, height: sh.h ?? h }, cp);
      patch.setAttribute("clip-path", `url(#${cp.id})`);
      H.el("rect", { x: sh.x, y: sh.y ?? curb, width: sh.w, height: sh.h ?? h, fill: H.shade(p.color ?? "#b9b2a6", 0.04) }, patch);
      const g2 = H.el("g", { stroke: seam, "stroke-width": 3 }, patch);
      for (let i = 0; i < ys.length; i++) H.el("line", { x1: 0, y1: ys[i] + (sh.dy ?? 9), x2: w, y2: ys[i] + (sh.dy ?? 9) }, g2);
      for (const { x, r } of lines) H.el("line", { x1: x + sh.dx, y1: ys[r] + (sh.dy ?? 9), x2: x + sh.dx + (x - vx) * 0.12, y2: (ys[r + 1] ?? h) + (sh.dy ?? 9) }, g2);
    }
    // a few stains for texture
    const r = H.rng(p.seed ?? 2);
    for (let i = 0; i < 14; i++) H.el("ellipse", { cx: r() * w, cy: curb + r() * (h - curb), rx: 20 + r() * 50, ry: 6 + r() * 14, fill: "rgba(0,0,0,.05)" }, svg);
    return {
      el: svg, w, h,
      update(t, it) { if (patch) patch.style.opacity = H.clamp(it.v("show_shift", 1), 0, 1); },
    };
  },
};

export const branch = {
  origin: "top",
  backdrop: true,
  create(p, H) {
    const w = p.w ?? 420, h = p.h ?? 380, leaf = H.col(p.color ?? "#5f8a3e"), leaf2 = H.shade(p.color ?? "#5f8a3e", 0.2);
    const mk = (seed) => {
      const r = H.rng(seed);
      let s = `<path d="M${w * 0.5},0 C${w * 0.46},${h * 0.3} ${w * 0.62},${h * 0.5} ${w * 0.4},${h * 0.92}" stroke="#4a3a2a" stroke-width="9" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M${w * 0.52},${h * 0.32} C${w * 0.7},${h * 0.36} ${w * 0.8},${h * 0.5} ${w * 0.86},${h * 0.62}" stroke="#4a3a2a" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M${w * 0.5},${h * 0.56} C${w * 0.3},${h * 0.6} ${w * 0.2},${h * 0.66} ${w * 0.12},${h * 0.78}" stroke="#4a3a2a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      for (let i = 0; i < 46; i++) {
        const x = w * (0.08 + r() * 0.84), y = h * (0.1 + r() * 0.86), a = r() * 360, L = 26 + r() * 22;
        s += `<ellipse cx="${x}" cy="${y}" rx="${L / 2}" ry="${L / 5}" transform="rotate(${a},${x},${y})" fill="${r() < 0.5 ? leaf : leaf2}"/>`;
      }
      return s;
    };
    const one = mk(p.seed ?? 5);
    let s = `<g>${one}</g>`;
    if (p.twin != null) s += `<g transform="translate(${p.twin},${p.twin_dy ?? 0})">${one}</g>`;
    const svg = H.svg(s, w + Math.abs(p.twin ?? 0), h);
    return { el: svg, w: w + Math.abs(p.twin ?? 0), h, update(t) { svg.style.transform = `rotate(${Math.sin(t * 0.9 + (p.seed ?? 0)) * (p.sway ?? 0.8)}deg)`; svg.style.transformOrigin = `${w / 2}px 0`; } };
  },
};

export const paper_cup = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 0.15 },
  create(p, H) {
    const w = 200, h = 300;
    const sl = H.col(p.sleeve ?? "#a8743e");
    let s = `<ellipse cx="${w / 2}" cy="${h - 4}" rx="${w * 0.42}" ry="10" fill="rgba(0,0,0,.25)"/>
      <path d="M${w * 0.14},${h * 0.12} L${w * 0.24},${h - 6} L${w * 0.76},${h - 6} L${w * 0.86},${h * 0.12} Z" fill="#f4f1ea"/>
      <path d="M${w * 0.7},${h * 0.12} L${w * 0.86},${h * 0.12} L${w * 0.76},${h - 6} L${w * 0.66},${h - 6} Z" fill="rgba(0,0,0,.07)"/>
      <path d="M${w * 0.165},${h * 0.38} L${w * 0.195},${h * 0.7} L${w * 0.805},${h * 0.7} L${w * 0.835},${h * 0.38} Z" fill="${sl}"/>
      <rect x="${w * 0.08}" y="${h * 0.04}" width="${w * 0.84}" height="${h * 0.1}" rx="12" fill="#2c2b2a"/>
      <rect x="${w * 0.2}" y="${h * 0.0}" width="${w * 0.6}" height="${h * 0.06}" rx="10" fill="#3a3937"/>`;
    if (p.letter) s += `<text x="${w / 2}" y="${h * 0.32}" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="74" fill="#1b1b1b">${p.letter}</text>`;
    const svg = H.svg(s, w, h);
    svg.style.overflow = "visible";
    const steam = H.el("g", { fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": 7, "stroke-linecap": "round" }, svg);
    const st = [0, 1, 2].map((i) => H.el("path", {}, steam));
    if (p.sugar) {
      const sg = H.el("g", {}, svg);
      for (let i = 0; i < 2; i++) {
        const g = H.el("g", { transform: `translate(${w + 20 + i * 44},${h - 20}) rotate(${-8 + i * 14})` }, sg);
        H.el("rect", { x: -70, y: -14, width: 150, height: 26, rx: 4, fill: "#f6f2e6", stroke: "#d8cfbc", "stroke-width": 2 }, g);
        H.el("path", { d: "M-70,-1 L80,-1", stroke: "#d8cfbc", "stroke-width": 2, "stroke-dasharray": "6 6" }, g);
      }
    }
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("steam", p.steam ?? 0), 0, 1);
        st.forEach((pa, i) => {
          const x = w * (0.36 + i * 0.14), ph = t * 1.4 + i * 1.7;
          pa.setAttribute("d", `M${x},${-8} C${x + Math.sin(ph) * 22},${-60} ${x - Math.sin(ph + 1) * 22},${-110} ${x + Math.sin(ph + 2) * 16},${-170}`);
          pa.style.opacity = k * (0.55 + 0.45 * Math.sin(ph * 0.7));
        });
      },
    };
  },
};

export const counter = {
  origin: "top-left",
  surface: true,
  backdrop: true,
  create(p, H) {
    const w = p.w ?? 1500, h = p.h ?? 1000, top = p.top ?? 380;
    const wood = H.col(p.color ?? "#b8875a");
    let s = `<defs><linearGradient id="ctop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(p.color ?? "#b8875a", -0.2)}"/><stop offset="1" stop-color="${wood}"/></linearGradient>
      <linearGradient id="cwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.col(p.wall ?? "#3b3530")}"/><stop offset="1" stop-color="${H.shade(p.wall ?? "#3b3530", -0.3)}"/></linearGradient></defs>
      <rect x="0" y="0" width="${w}" height="${top}" fill="url(#cwall)"/>
      <rect x="0" y="${top}" width="${w}" height="${h - top}" fill="url(#ctop)"/>`;
    const r = H.rng(p.seed ?? 3);
    for (let i = 0; i < 24; i++) { const y = top + 10 + r() * (h - top - 20); s += `<path d="M0,${y} Q${w / 2},${y + (r() - 0.5) * 24} ${w},${y + (r() - 0.5) * 30}" stroke="rgba(60,30,10,.12)" stroke-width="${2 + r() * 3}" fill="none"/>`; }
    // blurred bokeh lights on the wall
    for (let i = 0; i < 9; i++) s += `<circle cx="${r() * w}" cy="${top * (0.2 + r() * 0.6)}" r="${20 + r() * 40}" fill="${r() < 0.5 ? "#ffcf8a" : "#ffe9c4"}" opacity="${0.12 + r() * 0.16}"/>`;
    const svg = H.svg(s, w, h);
    return { el: svg, w, h };
  },
};

export const album = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 640;
    const el = H.div(`width:${w}px;height:${h}px;perspective:2400px`);
    const pages = H.div(`width:${w}px;height:${h}px;background:#191a1c;border-radius:8px;box-shadow:0 26px 60px rgba(0,0,0,.5)`);
    const spine = H.div(`left:${w / 2 - 6}px;top:0;width:12px;height:${h}px;background:linear-gradient(90deg,#0c0c0d,#2a2b2e,#0c0c0d)`);
    const cover = H.div(`left:${w / 2}px;top:0;width:${w / 2}px;height:${h}px;transform-origin:0 50%;border-radius:0 10px 10px 0;
      background:linear-gradient(135deg,#7b2734,#4b1520);box-shadow:inset 0 0 0 10px rgba(255,255,255,.04)`);
    const ct = H.div(`left:0;top:${h * 0.36}px;width:${w / 2}px;text-align:center;font:700 44px/1.15 ${`"Playfair Display", serif`};color:#e9cf8f;letter-spacing:2px`, p.title ?? "НАША<br>СВАДЬБА");
    const orn = H.div(`left:${w / 4 - 60}px;top:${h * 0.28}px;width:120px;height:2px;background:#e9cf8f`);
    cover.append(orn, ct);
    el.append(pages, spine, cover);
    return {
      el, w, h,
      update(t, it) {
        const o = H.clamp(it.v("open", 0), 0, 1);
        cover.style.transform = `rotateY(${-180 * o}deg)`;
        ct.style.opacity = orn.style.opacity = o > 0.5 ? 0 : 1;
        cover.style.background = o > 0.5 ? "#191a1c" : "linear-gradient(135deg,#7b2734,#4b1520)";
      },
    };
  },
};

export const retouch_screen = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? 1000, h = p.h ?? 760;
    const el = H.div(`width:${w}px;height:${h}px`);
    const bezel = H.div(`width:${w}px;height:${h}px;border-radius:18px;background:#0d0e10;box-shadow:0 30px 70px rgba(0,0,0,.55)`);
    const sx = 18, sy = 18, sw = w - 36, sh = h - 36;
    const ui = H.div(`left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;background:#26282c;overflow:hidden;border-radius:6px`);
    const bar = H.div(`width:${sw}px;height:44px;background:#1b1c1f;font:500 22px ${INTER};color:#c9ccd2;line-height:44px;padding-left:16px;box-sizing:border-box;white-space:nowrap`);
    const tools = H.div(`left:0;top:44px;width:62px;height:${sh - 44}px;background:#1f2023`);
    const icons = ["▭", "✥", "⌖", "✎", "◉", "▲", "T"];
    icons.forEach((ic, i) => tools.appendChild(H.div(`left:0;top:${16 + i * 58}px;width:62px;text-align:center;font:400 28px ${INTER};color:${i === 4 ? ORANGE : "#9aa0a8"}`, ic)));
    const panel = H.div(`left:${sw - 200}px;top:44px;width:200px;height:${sh - 44}px;background:#1f2023;font:500 18px ${INTER};color:#9aa0a8;padding:14px;box-sizing:border-box;line-height:2.1`,
      `СЛОИ<br>▣ Фон<br>▣ Штамп 1<br>▣ Штамп 2`);
    const cx = 62 + 16, cy = 44 + 16, cw = sw - 62 - 200 - 32, ch = sh - 44 - 32 - 30;
    const canvas = H.div(`left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;overflow:hidden;background:#555`);
    const inner = H.div(`width:${cw}px;height:${ch}px`);
    canvas.appendChild(inner);
    for (const c of (p.children || []).flat(Infinity)) await H.child(c, inner);
    const status = H.div(`left:${cx}px;top:${cy + ch + 4}px;font:500 18px ${MONO};color:#8a9098;white-space:nowrap`);
    const cur = H.div(`width:70px;height:70px;border-radius:35px;border:3px solid #fff;box-shadow:0 0 0 2px #000;box-sizing:border-box`);
    canvas.appendChild(cur);
    ui.append(bar, tools, panel, canvas, status);
    el.append(bezel, ui);
    return {
      el, w, h,
      update(t, it) {
        bar.textContent = `${it.v("file", p.file ?? "IMG_0841.CR3")}  @ ${it.v("zoom", p.zoom ?? "100%")}`;
        status.textContent = it.v("status", p.status ?? "Штамп · Жёсткость 80% · Alt+клик — образец");
        const c = it.v("cursor", p.cursor ?? [cw / 2, ch / 2]);
        cur.style.transform = `translate(${c[0] - 35}px,${c[1] - 35}px)`;
        cur.style.opacity = it.v("cursor_on", p.cursor ? 1 : 0);
      },
      anchor(name, args) {
        if (name === "canvas") return [sx + cx + (args?.[0] ?? cw / 2), sy + cy + (args?.[1] ?? ch / 2)];
        return null;
      },
    };
  },
};

export const studio_room = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 1920, fy = p.floor_y ?? 1420;
    const wall = H.col(p.wall ?? "#4a4743");
    const bx0 = w * 0.2, bx1 = w * 0.8;
    let s = `<defs>
      <linearGradient id="srwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(p.wall ?? "#4a4743", -0.25)}"/><stop offset="1" stop-color="${wall}"/></linearGradient>
      <linearGradient id="srpaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e6e0"/><stop offset=".7" stop-color="#f4f2ee"/><stop offset="1" stop-color="#fbfaf8"/></linearGradient>
      <linearGradient id="srfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5a3e"/><stop offset="1" stop-color="#5a4130"/></linearGradient>
      <radialGradient id="srsoft" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e8e8e8"/></radialGradient></defs>
      <rect x="0" y="0" width="${w}" height="${fy}" fill="url(#srwall)"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="url(#srfloor)"/>`;
    // floor boards
    for (let i = 0; i < 14; i++) { const y = fy + (h - fy) * (i / 14) ** 1.4; s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`; }
    // window on the left wall with daylight
    s += `<rect x="${w * 0.03}" y="${fy - 900}" width="${w * 0.12}" height="560" fill="#cfe0ea"/><path d="M${w * 0.09},${fy - 900} V${fy - 340} M${w * 0.03},${fy - 620} H${w * 0.15}" stroke="#3a3632" stroke-width="10"/>`;
    s += `<path d="M${w * 0.15},${fy - 900} L${w * 0.42},${fy - 300} L${w * 0.42},${h} L${w * 0.15},${h}Z" fill="#fff" opacity=".05"/>`;
    // backdrop: bar + paper sweep
    s += `<rect x="${bx0 - 30}" y="${fy - 1120}" width="${bx1 - bx0 + 60}" height="18" rx="9" fill="#222"/>`;
    s += `<path d="M${bx0},${fy - 1110} H${bx1} V${fy - 40} Q${bx1},${fy + 160} ${bx1 + 40},${fy + 260} H${bx0 - 40} Q${bx0},${fy + 160} ${bx0},${fy - 40} Z" fill="url(#srpaper)"/>`;
    s += `<path d="M${bx0},${fy - 40} Q${bx0},${fy + 160} ${bx0 - 40},${fy + 260} L${bx0 - 20},${fy + 260} Q${bx0 + 20},${fy + 150} ${bx0 + 30},${fy - 40}Z" fill="rgba(0,0,0,.05)"/>`;
    // stands with softboxes
    const stand = (x, flip) => {
      let t = `<path d="M${x},${fy + 120} L${x - 70},${fy + 200} M${x},${fy + 120} L${x + 70},${fy + 200} M${x},${fy + 120} L${x},${fy + 210}" stroke="#1c1c1e" stroke-width="7"/>`;
      t += `<rect x="${x - 5}" y="${fy - 700}" width="10" height="${820}" fill="#1c1c1e"/>`;
      const sx = x + (flip ? -1 : 1) * 10;
      t += `<g transform="translate(${sx},${fy - 760}) rotate(${flip ? -14 : 14})"><path d="M-120,-150 L120,-150 L70,40 L-70,40Z" fill="#141416"/><rect x="-112" y="-146" width="224" height="20" fill="url(#srsoft)" class="lamp"/></g>`;
      return t;
    };
    s += stand(w * 0.11, false) + stand(w * 0.89, true);
    // tripod in front of the backdrop
    const tx = w * 0.5, ty = fy + 330;
    if (p.tripod !== false) s += `<path d="M${tx},${ty - 250} L${tx - 90},${ty} M${tx},${ty - 250} L${tx + 90},${ty} M${tx},${ty - 250} L${tx + 8},${ty + 10}" stroke="#202022" stroke-width="9"/><rect x="${tx - 50}" y="${ty - 300}" width="100" height="56" rx="8" fill="#202022"/><circle cx="${tx}" cy="${ty - 272}" r="20" fill="#3a3e46"/>`;
    // door with bell on the right wall
    const dx = w * 0.86, dW = 150;
    if (p.door !== false) {
      s += `<rect x="${dx}" y="${fy - 640}" width="${dW}" height="640" fill="#2c2a28"/>`;
    }
    const svg = H.svg(s, w, h);
    const door = H.el("rect", { x: dx + 8, y: fy - 632, width: dW - 16, height: 632, fill: "#6b4d36", stroke: "#3a2a1e", "stroke-width": 6 }, svg);
    const knob = H.el("circle", { cx: dx + dW - 30, cy: fy - 300, r: 9, fill: "#c9a640" }, svg);
    const bell = H.el("g", {}, svg);
    H.el("path", { d: "M-16,0 Q-16,-26 0,-28 Q16,-26 16,0Z", fill: "#c9a640" }, bell);
    H.el("circle", { cx: 0, cy: 3, r: 5, fill: "#8a6f2a" }, bell);
    if (p.door === false) door.style.display = knob.style.display = bell.style.display = "none";
    const lamps = [...svg.querySelectorAll(".lamp")];
    const glow = H.div(`left:${bx0}px;top:${fy - 1110}px;width:${bx1 - bx0}px;height:1300px;background:radial-gradient(ellipse 60% 50% at 50% 55%, rgba(255,255,255,.2), transparent 70%)`);
    const wrap = H.div(`width:${w}px;height:${h}px`);
    wrap.append(svg, glow);
    return {
      el: wrap, w, h,
      update(t, it) {
        const o = H.clamp(it.v("door_open", 0), 0, 1);
        door.setAttribute("width", (dW - 16) * (1 - o * 0.82));
        knob.style.opacity = 1 - o;
        let a = 0;
        if (p.bell_at != null && t >= p.bell_at) a = Math.sin((t - p.bell_at) * 16) * 24 * Math.exp(-(t - p.bell_at) * 2);
        bell.setAttribute("transform", `translate(${dx + dW / 2},${fy - 640 + 34}) rotate(${a},0,-28)`);
        const L = H.clamp(it.v("lights", 1), 0, 1);
        glow.style.opacity = L;
        lamps.forEach((l) => (l.style.opacity = 0.3 + 0.7 * L));
      },
    };
  },
};

// supermarket aisle from a ceiling camera (perspective): shelves left & right, products, floor, cart
export const shelves = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, vx = w * 0.5, vy = h * 0.2;
    const r = H.rng(p.seed ?? 9);
    let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#dcdcd6"/>`;
    // floor (trapezoid towards vanishing point) with tiles
    const fl = [[w * 0.3, h], [w * 0.7, h], [vx + 60, vy + 180], [vx - 60, vy + 180]];
    s += `<path d="M${w * 0.18},${h} L${w * 0.82},${h} L${vx + 70},${vy + 200} L${vx - 70},${vy + 200}Z" fill="#c9c7c0"/>`;
    for (let i = 1; i < 16; i++) { const k = (i / 16) ** 2; const y = vy + 200 + (h - vy - 200) * k; const hw = 70 + (w * 0.32 - 70) * k; s += `<line x1="${vx - hw}" y1="${y}" x2="${vx + hw}" y2="${y}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`; }
    // shelf blocks on both sides: several levels
    const side = (sgn) => {
      let t = "";
      const xOut = sgn < 0 ? 0 : w, xIn = sgn < 0 ? w * 0.18 : w * 0.82, xFar = vx + sgn * 70;
      t += `<path d="M${xOut},${0} L${xFar},${vy} L${xFar},${vy + 200} L${xIn},${h} L${xOut},${h}Z" fill="#9aa1a8"/>`;
      for (let lv = 0; lv < 6; lv++) {
        const f = lv / 6, f2 = (lv + 1) / 6;
        const yo = h * f2 - 10, yf = vy + 200 * f2;
        // products: rows of colored blocks along the shelf
        for (let k = 0; k < 10; k++) {
          const a = k / 10 + 0.01, b = (k + 0.7) / 10;
          const xa = xIn + (xFar - xIn) * a, xb = xIn + (xFar - xIn) * b;
          const ya1 = (h * f) + (vy + 200 * f - h * f) * a + (h / 6) * 0.35 * (1 - a), ya2 = yo + (yf - yo) * a;
          const yb1 = (h * f) + (vy + 200 * f - h * f) * b + (h / 6) * 0.35 * (1 - b), yb2 = yo + (yf - yo) * b;
          const c = ["#e05a47", "#f2b33d", "#4b8bd6", "#5fb36b", "#e8e2d0", "#c45ab0", "#ef8a3c"][Math.floor(r() * 7)];
          t += `<path d="M${xa},${ya1} L${xb},${yb1} L${xb},${yb2} L${xa},${ya2}Z" fill="${c}" opacity=".9"/>`;
        }
        t += `<path d="M${xIn},${yo} L${xFar},${yf} L${xFar},${yf + 4} L${xIn},${yo + 12}Z" fill="#5d646b"/>`;
      }
      return t;
    };
    s += side(-1) + side(1);
    // ceiling lights
    for (let i = 0; i < 6; i++) { const k = (i / 6) ** 1.6; const y = vy * (1 - k) + 0; s += `<rect x="${vx - 20 - 160 * (1 - k)}" y="${y * 0.4}" width="${40 + 320 * (1 - k)}" height="${6 + 16 * (1 - k)}" fill="#fff" opacity=".7"/>`; }
    const svg = H.svg(s, w, h);
    // cart (on the floor, moves along the aisle: cart_x is the progress 0..1 from near to far)
    const cart = H.el("g", {}, svg);
    H.el("path", { d: "M-80,-120 L80,-120 L64,0 L-64,0Z", fill: "none", stroke: "#2e3338", "stroke-width": 7 }, cart);
    for (let i = 1; i < 4; i++) H.el("line", { x1: -80 + i * 40, y1: -120, x2: -64 + i * 32, y2: 0, stroke: "#2e3338", "stroke-width": 3 }, cart);
    H.el("line", { x1: -80, y1: -150, x2: 80, y2: -150, stroke: "#c43a3a", "stroke-width": 10 }, cart);
    H.el("line", { x1: -76, y1: -150, x2: -80, y2: -120, stroke: "#2e3338", "stroke-width": 6 }, cart);
    H.el("line", { x1: 76, y1: -150, x2: 80, y2: -120, stroke: "#2e3338", "stroke-width": 6 }, cart);
    for (const x of [-56, 56]) H.el("circle", { cx: x, cy: 14, r: 12, fill: "#222" }, cart);
    H.el("rect", { x: -40, y: -100, width: 50, height: 40, fill: "#f2b33d" }, cart);
    H.el("rect", { x: 14, y: -96, width: 34, height: 36, fill: "#4b8bd6" }, cart);
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("cart_k", p.cart_k ?? 0.2), 0, 1);
        const y = h * 0.86 + (vy + 260 - h * 0.86) * k;
        const sc = 1 - k * 0.8;
        cart.setAttribute("transform", `translate(${vx + (p.cart_dx ?? 60) * sc},${y}) scale(${sc})`);
        cart.style.display = p.cart === false ? "none" : "";
      },
    };
  },
};

export const station_hall = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, fy = p.floor_y ?? 760;
    let s = `<defs><linearGradient id="shwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfc6b6"/><stop offset="1" stop-color="#b8ae9c"/></linearGradient></defs>
      <rect x="0" y="0" width="${w}" height="${fy}" fill="url(#shwall)"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="#a49c8f"/>`;
    // floor tiles (checker in perspective)
    for (let i = 0; i < 14; i++) { const y = fy + (h - fy) * (i / 14) ** 1.6; s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(0,0,0,.14)" stroke-width="3"/>`; }
    for (let i = -10; i <= 10; i++) s += `<line x1="${w / 2 + i * 60}" y1="${fy}" x2="${w / 2 + i * 260}" y2="${h}" stroke="rgba(0,0,0,.12)" stroke-width="3"/>`;
    // arched windows
    for (let i = 0; i < 3; i++) { const x = 70 + i * 330, ww = 240; s += `<path d="M${x},${fy - 180} V${120} Q${x + ww / 2},${20} ${x + ww},${120} V${fy - 180}Z" fill="#dfe9ee"/><path d="M${x + ww / 2},${40} V${fy - 180} M${x},${300} H${x + ww}" stroke="#8a8274" stroke-width="8"/>`; }
    // ticket counters
    s += `<rect x="0" y="${fy - 210}" width="${w}" height="210" fill="#7a6a58"/>`;
    for (let i = 0; i < 4; i++) { const x = 60 + i * 255; s += `<rect x="${x}" y="${fy - 190}" width="190" height="110" fill="#d9e4e8" opacity=".85"/><text x="${x + 95}" y="${fy - 205}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" fill="#f6efe0">КАССА ${i + 1}</text>`; }
    s += `<rect x="0" y="${fy - 250}" width="${w}" height="42" fill="#2a3a4a"/><text x="${w / 2}" y="${fy - 220}" text-anchor="middle" font-family="Oswald" font-size="30" letter-spacing="10" fill="#f6efe0">КАССЫ · ПРИГОРОДНЫЕ ПОЕЗДА</text>`;
    // departure board
    s += `<rect x="${w * 0.24}" y="${fy - 450}" width="${w * 0.52}" height="170" fill="#111"/>`;
    const rows = p.board ?? ["09:15  ОЛЬХОВСК      4", "09:22  РЕЧНОЙ        2", "09:40  СЕВЕРНАЯ      1"];
    rows.forEach((tx, i) => (s += `<text x="${w * 0.24 + 22}" y="${fy - 408 + i * 50}" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="#ffbf3a" xml:space="preserve">${tx}</text>`));
    // benches
    for (let i = 0; i < 3; i++) { const y = fy + 300 + i * 260, sc = 1 + i * 0.25; s += `<rect x="${w * 0.5 - 360 * sc}" y="${y}" width="${720 * sc}" height="${26 * sc}" rx="6" fill="#6b4c32"/><rect x="${w * 0.5 - 360 * sc}" y="${y - 60 * sc}" width="${720 * sc}" height="${20 * sc}" rx="6" fill="#6b4c32"/>`; }
    const svg = H.svg(s, w, h);
    // turnstile
    const tg = H.el("g", {}, svg);
    const tX = p.turn_x ?? w * 0.78, tY = p.turn_y ?? fy + 140;
    H.el("rect", { x: tX - 30, y: tY - 110, width: 60, height: 110, rx: 8, fill: "#9aa3aa" }, tg);
    const arm = H.el("rect", { x: tX - 4, y: tY - 82, width: 130, height: 12, rx: 6, fill: "#c7cdd2" }, tg);
    return {
      el: svg, w, h,
      update(t, it) {
        let a = 0;
        if (p.turn_at != null && t >= p.turn_at) a = Math.sin((t - p.turn_at) * 9) * 28 * Math.exp(-(t - p.turn_at) * 1.6);
        arm.setAttribute("transform", `rotate(${a},${tX},${tY - 76})`);
        tg.style.display = p.turnstile === false ? "none" : "";
      },
    };
  },
};

export const wedding_hall = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1000, h = p.h ?? 1200, fy = p.floor_y ?? 960;
    let s = `<defs><linearGradient id="whw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe3cf"/><stop offset="1" stop-color="#e2d2b8"/></linearGradient></defs>
      <rect x="0" y="0" width="${w}" height="${fy}" fill="url(#whw)"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="#8a5e3c"/>`;
    for (let i = 0; i < 18; i++) s += `<line x1="${i * w / 18}" y1="${fy}" x2="${(i - 9) * w / 9 + w / 2}" y2="${h}" stroke="rgba(0,0,0,.14)" stroke-width="2"/>`;
    // wall panels
    for (let i = 0; i < 4; i++) s += `<rect x="${30 + i * (w - 60) / 4 + 16}" y="${fy - 300}" width="${(w - 60) / 4 - 32}" height="250" fill="none" stroke="#d6c3a2" stroke-width="5"/>`;
    // drapes
    s += `<path d="M0,0 H${w * 0.16} Q${w * 0.1},${fy * 0.5} ${w * 0.17},${fy} H0Z" fill="#b7485a"/><path d="M${w},0 H${w * 0.84} Q${w * 0.9},${fy * 0.5} ${w * 0.83},${fy} H${w}Z" fill="#b7485a"/>`;
    // flowers on stands
    const fl = (x) => `<rect x="${x - 8}" y="${fy - 260}" width="16" height="260" fill="#c9b07a"/><circle cx="${x}" cy="${fy - 290}" r="60" fill="#f2f0ea"/><circle cx="${x - 34}" cy="${fy - 300}" r="30" fill="#f6d7dc"/><circle cx="${x + 30}" cy="${fy - 276}" r="28" fill="#fff"/><circle cx="${x + 6}" cy="${fy - 330}" r="26" fill="#f6d7dc"/><circle cx="${x - 20}" cy="${fy - 262}" r="20" fill="#7aa06a"/>`;
    s += fl(w * 0.1) + fl(w * 0.9);
    const svg = H.svg(s, w, h);
    return { el: svg, w, h };
  },
};

export const mirror = {
  origin: "bottom",
  grounded: true,
  async create(p, H) {
    const w = p.w ?? 420, h = p.h ?? 640, f = 26;
    const el = H.div(`width:${w}px;height:${h}px`);
    const frame = H.div(`width:${w}px;height:${h}px;border-radius:${w / 2}px ${w / 2}px 10px 10px;background:linear-gradient(135deg,#e2c46e,#9c7a2c 50%,#e8cf86);box-shadow:0 16px 30px rgba(0,0,0,.3)`);
    const glass = H.div(`left:${f}px;top:${f}px;width:${w - 2 * f}px;height:${h - 2 * f}px;border-radius:${w / 2 - f}px ${w / 2 - f}px 6px 6px;overflow:hidden;
      background:linear-gradient(180deg,#d9d8d0,#bdbcb2)`);
    const inner = H.div(`width:${w - 2 * f}px;height:${h - 2 * f}px;filter:saturate(.8) brightness(.96)`);
    glass.appendChild(inner);
    for (const c of (p.children || []).flat(Infinity)) await H.child(c, inner);
    const sheen = H.div(`left:${f}px;top:${f}px;width:${w - 2 * f}px;height:${h - 2 * f}px;border-radius:${w / 2 - f}px ${w / 2 - f}px 6px 6px;
      background:linear-gradient(120deg, rgba(255,255,255,.28) 10%, transparent 30%, transparent 60%, rgba(255,255,255,.12) 75%, transparent 85%)`);
    el.append(frame, glass, sheen);
    return { el, w, h, anchor(name) { return name === "glass" ? [w / 2, h * 0.42] : null; } };
  },
};

export const news_studio = {
  origin: "top-left",
  backdrop: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920;
    let s = `<defs><linearGradient id="nsb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1b33"/><stop offset="1" stop-color="#173563"/></linearGradient>
      <linearGradient id="nsscr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5c8f"/><stop offset="1" stop-color="#7ea7c9"/></linearGradient></defs>
      <rect x="0" y="0" width="${w}" height="${h}" fill="url(#nsb)"/>
      <rect x="${w * 0.08}" y="${h * 0.18}" width="${w * 0.84}" height="${h * 0.3}" fill="url(#nsscr)"/>`;
    // skyline on the video wall
    const r = H.rng(4);
    let x = w * 0.08;
    while (x < w * 0.92) { const bw = 40 + r() * 70, bh = 80 + r() * 260; s += `<rect x="${x}" y="${h * 0.48 - bh}" width="${bw}" height="${bh}" fill="#1c3558" opacity=".85"/>`; x += bw + 6; }
    for (let i = 0; i < 7; i++) s += `<line x1="${w * 0.08 + i * w * 0.14}" y1="${h * 0.18}" x2="${w * 0.08 + i * w * 0.14}" y2="${h * 0.48}" stroke="#0d1b33" stroke-width="4"/>`;
    s += `<text x="${w * 0.12}" y="${h * 0.22}" font-family="Oswald" font-size="44" fill="#fff" opacity=".85">НОВОСТИ 24</text>`;
    // lights rig
    for (let i = 0; i < 5; i++) s += `<circle cx="${w * 0.15 + i * w * 0.175}" cy="${h * 0.07}" r="22" fill="#fff" opacity=".35"/>`;
    const svg = H.svg(s, w, h);
    // anchor chair (behind the person): back + headrest, swivels
    const chair = H.el("g", {}, svg);
    const cX = p.chair_x ?? w / 2, cY = p.chair_y ?? h * 0.62;
    H.el("rect", { x: -150, y: -330, width: 300, height: 380, rx: 60, fill: "#1a1c22" }, chair);
    H.el("rect", { x: -120, y: -300, width: 240, height: 320, rx: 46, fill: "#262a33" }, chair);
    return {
      el: svg, w, h,
      update(t, it) {
        const a = it.v("chair_rot", 0);
        chair.setAttribute("transform", `translate(${cX},${cY}) scale(${Math.cos(a * Math.PI / 180)},1)`);
      },
    };
  },
};

export const news_desk = {
  origin: "top-left",
  backdrop: true,
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, dy = p.desk_y ?? 1180;
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const desk = H.svg(`<defs><linearGradient id="ndk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d63a8"/><stop offset="1" stop-color="#0e2547"/></linearGradient></defs>
      <path d="M${w * 0.04},${dy} H${w * 0.96} L${w},${dy + 380} H0Z" fill="url(#ndk)"/>
      <rect x="${w * 0.04}" y="${dy}" width="${w * 0.92}" height="18" fill="#9cc3ff" opacity=".7"/>
      <text x="${w / 2}" y="${dy + 190}" text-anchor="middle" font-family="Oswald" font-size="80" letter-spacing="12" fill="#fff" opacity=".9">НОВОСТИ 24</text>`, w, h);
    const papers = H.div(`left:${w * 0.36}px;top:${dy - 18}px;width:${w * 0.28}px;height:24px;background:#f4f4f0;transform:skewX(-20deg)`);
    // lower third + ticker
    const lt = H.div(`left:60px;top:${dy - 330}px;width:${w - 120}px;font:700 50px/1.1 ${COND};color:#fff;background:#c9202a;padding:14px 24px;box-sizing:border-box;text-transform:uppercase`, p.title ?? "");
    const lt2 = H.div(`left:60px;top:${dy - 250}px;width:${w - 120}px;font:600 28px ${INTER};color:#0e2547;background:#f2f4f7;padding:10px 24px;box-sizing:border-box`, p.sub ?? "");
    const tick = H.div(`left:0;top:${dy + 400}px;width:${w}px;height:70px;background:#0b1730;overflow:hidden`);
    const tickTx = H.div(`left:0;top:12px;font:600 34px ${INTER};color:#fff;white-space:nowrap`, (p.ticker ?? "") + "   ·   " + (p.ticker ?? ""));
    tick.appendChild(tickTx);
    el.append(desk, papers, lt, lt2, tick);
    return {
      el, w, h,
      update(t, it) {
        tickTx.style.transform = `translateX(${-((t * 140) % 1600)}px)`;
        const k = it.v("lower", 1);
        lt.style.opacity = lt2.style.opacity = k;
        lt.style.display = p.title ? "" : "none";
        lt2.style.display = p.sub ? "" : "none";
      },
    };
  },
};

export const cam_grid = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 940, h = p.h ?? 700, cols = 2, rows = 3;
    const el = H.div(`width:${w}px;height:${h}px;background:#14161a;border-radius:10px;overflow:hidden`);
    const head = H.div(`width:${w}px;height:60px;background:#1f2228;font:600 26px ${INTER};color:#e5e7ea;line-height:60px;padding-left:22px;box-sizing:border-box`, "Камеры города · прямой эфир");
    el.appendChild(head);
    const names = p.names ?? ["ПЛ. ЛЕНИНА", "НАБЕРЕЖНАЯ", "МОСТ", "ВОКЗАЛ · КАССЫ", "РЫНОК", "ПАРК"];
    const tw = (w - 30) / cols, th = (h - 60 - 40) / rows;
    const tiles = names.map((n, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const d = H.div(`left:${10 + c * (tw + 10)}px;top:${70 + r * (th + 10)}px;width:${tw}px;height:${th}px;border-radius:6px;overflow:hidden;
        background:linear-gradient(180deg,${["#5b6670", "#6d7a84", "#4f5a63", "#776e62", "#606a5c", "#58656c"][i]},#2a2e33)`);
      const lab = H.div(`left:12px;top:${th - 40}px;font:600 22px ${MONO};color:#fff;text-shadow:0 1px 2px #000`, n);
      const live = H.div(`left:${tw - 86}px;top:10px;font:700 18px ${INTER};color:#fff;background:#e3262f;padding:2px 8px;border-radius:3px`, "LIVE");
      // tiny silhouettes of buildings
      const sk = H.svg(`<path d="M0,${th * 0.75} ${Array.from({ length: 9 }, (_, k) => `L${k * tw / 8},${th * (0.4 + ((k * 37 + i * 13) % 7) * 0.04)} L${(k + 0.8) * tw / 8},${th * (0.4 + ((k * 37 + i * 13) % 7) * 0.04)}`).join(" ")} L${tw},${th * 0.75}Z" fill="rgba(0,0,0,.35)"/>`, tw, th);
      const ring = H.div(`width:${tw}px;height:${th}px;box-sizing:border-box;border:5px solid ${ORANGE};border-radius:6px;opacity:0`);
      d.append(sk, lab, live, ring);
      el.appendChild(d);
      return { d, ring };
    });
    return {
      el, w, h,
      update(t, it) {
        const sel = it.v("sel", -1);
        tiles.forEach((x, i) => (x.ring.style.opacity = i === sel ? 1 : 0));
      },
    };
  },
};

export const phone_float = {
  origin: "center",
  size_m: { h: 0.15 },
  create(p, H) {
    const w = p.w ?? 150, h = p.h ?? 310;
    const back = (p.view ?? "back") === "back";
    const el = H.div(`width:${w}px;height:${h}px`);
    const body = H.div(`width:${w}px;height:${h}px;border-radius:${w * 0.16}px;background:${back ? "linear-gradient(160deg,#3a3d44,#1d1f23)" : "#0a0b0d"};
      box-shadow:0 0 0 3px #5a5e66, 0 24px 40px rgba(0,0,0,.4)`);
    el.appendChild(body);
    let scr = null;
    if (back) {
      const mod = H.div(`left:${w * 0.1}px;top:${w * 0.1}px;width:${w * 0.46}px;height:${w * 0.46}px;border-radius:${w * 0.1}px;background:#2a2c31`);
      for (const [x, y] of [[0.22, 0.22], [0.22, 0.48], [0.46, 0.35]]) mod.appendChild(H.div(`left:${w * x - w * 0.09}px;top:${w * y - w * 0.09}px;width:${w * 0.18}px;height:${w * 0.18}px;border-radius:50%;background:#0b0c0e;box-shadow:0 0 0 3px #4a4d54`));
      el.appendChild(mod);
    } else {
      scr = H.div(`left:${w * 0.05}px;top:${w * 0.05}px;width:${w * 0.9}px;height:${h - w * 0.1}px;border-radius:${w * 0.12}px;background:linear-gradient(180deg,#e9e7e2,#cfcac0)`);
      el.appendChild(scr);
    }
    const glow = H.div(`left:${-w * 0.5}px;top:${-h * 0.3}px;width:${w * 2}px;height:${h * 1.6}px;border-radius:50%;background:radial-gradient(closest-side, rgba(255,255,255,.35), transparent);opacity:0`);
    el.prepend(glow);
    return {
      el, w, h,
      update(t, it) {
        const on = H.clamp(it.v("screen_on", p.screen_on ?? 0), 0, 1);
        glow.style.opacity = on;
        let fl = 0;
        for (const a of p.flash ?? []) if (t >= a) fl = Math.max(fl, 1 - (t - a) / 0.3);
        if (fl > 0) glow.style.opacity = Math.max(on, fl * 2);
      },
    };
  },
};
