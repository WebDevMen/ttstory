// Library (since «Выпадение. Часть 2: Город, которого не было», projects/vanish2 — reused by the series).
// Дом и двор героини и «слишком красивый» город Заречье — в той же спокойной плоской манере, что figures/places.
//
// kitchen: кухня многоэтажки (стена, окно во двор с деревом и домом напротив, шкафы, столешница с мойкой и чайником, пол);
//   backdrop + surface; w, h, floor_y, window: [x, y, w, h], steam (0..1, дорожка), wall
// kitchen_table: кухонный стол со скатертью (origin — середина низа); w, h, cloth
// fridge: холодильник с магнитами (origin — низ); h
// hallway: прихожая (обои, входная дверь с глазком и ковриком, вешалка с куртками, полка для обуви); backdrop + surface;
//   w, h, floor_y, door_x
// drawing: детский рисунок фломастерами (дом с синей дверью, карусель, солнце, «МАМА» и «Я»); w, h, door (дорожка 0..1 —
//   дверь закрашивается), marker (дорожка [x, y] — фломастер над листом; null — без фломастера)
// yard: двор многоэтажки из окна (асфальт с разметкой парковки, площадка — качели, горка, песочница, скамья, арка);
//   backdrop + surface; w, h, ground_y, arch_x
// car: легковая машина сбоку (origin — низ); w, color, trunk (дорожка 0..1 — багажник открыт), boxes, roll (дорожка: колёса)
// grill: мангал на ножках с углями и шампурами (origin — низ); w, smoke (0..1)
// facade: фасад дома с окнами (origin — верхний левый угол); w, h, cols, rows, wall, seed, man: [[кол, ряд], …] — в этих
//   окнах один и тот же мужчина с лейкой (повтор штампа), water (дорожка 0..1 — наклон лейки), wave: [кол, ряд] — на балконе
//   женщина машет рукой, wave_k (дорожка 0..1)
// river: набережная Заречья (небо, дальний берег с яркими домами, река с волнами, парапет, фонари); origin — верхний левый
//   угол; w, h, horizon, rail_y, waves: [[x, y], …] — одинаковые волны-копии (штамп), clouds: [[x, y], …] — одинаковые
//   облака, boat
// carousel: карусель с лошадками (origin — низ); h, speed (оборотов в секунду), lights
// town_house: двухэтажный дом провинциального города (пастельная стена, вальмовая крыша, белые наличники, крыльцо с
//   синей дверью, фонарь); origin — низ; w, floors (1|2), wall, roof, door, seed
// note: тетрадный листок с надписью маркером; w, h, lines: [строки], shown (дорожка 0..N — сколько строк уже написано)

const ORANGE = "#ffb23e";
const HAND = `"Caveat", cursive`, MONO = `"IBM Plex Mono", monospace`;

// a small deterministic wobble for hand-drawn strokes
const wob = (r, a) => (r() - 0.5) * a;

export const kitchen = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 1920, fy = p.floor_y ?? 1500;
    const wall = p.wall ?? "#e8dcc6";
    const [wx, wy, ww, wh] = p.window ?? [w * 0.36, fy - 1150, 520, 620];
    const r = H.rng(p.seed ?? 31);
    let s = `<defs>
      <linearGradient id="kwall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${H.shade(wall, -0.12)}"/><stop offset=".55" stop-color="${H.col(wall)}"/><stop offset="1" stop-color="${H.shade(wall, -0.18)}"/></linearGradient>
      <linearGradient id="ksky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc4e4"/><stop offset="1" stop-color="#dcebf4"/></linearGradient>
      <linearGradient id="kfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b89a74"/><stop offset="1" stop-color="#8e7254"/></linearGradient>
      <clipPath id="kwin"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}"/></clipPath></defs>
      <rect x="0" y="0" width="${w}" height="${fy}" fill="url(#kwall)"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="url(#kfloor)"/>`;
    // floor tiles in light perspective
    for (let i = 1; i < 10; i++) { const y = fy + (h - fy) * (i / 10) ** 1.3; s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`; }
    for (let i = -6; i <= 6; i++) s += `<line x1="${w / 2 + i * 120}" y1="${fy}" x2="${w / 2 + i * 260}" y2="${h}" stroke="rgba(0,0,0,.08)" stroke-width="2"/>`;
    // window: sky, the building opposite, a tree, frame, sill
    s += `<g clip-path="url(#kwin)"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="url(#ksky)"/>`;
    s += `<rect x="${wx - 40}" y="${wy + wh * 0.28}" width="${ww + 80}" height="${wh}" fill="#c9b39a"/>`;
    for (let cy = 0; cy < 6; cy++) for (let cx = 0; cx < 7; cx++) {
      const x = wx - 20 + cx * 86, y = wy + wh * 0.32 + cy * 92;
      s += `<rect x="${x}" y="${y}" width="46" height="56" fill="${r() < 0.25 ? "#e9d9a8" : "#7d8a96"}"/><rect x="${x}" y="${y + 56}" width="46" height="5" fill="#e6dccd"/>`;
    }
    for (let i = 0; i < 7; i++) s += `<circle cx="${wx + ww * 0.7 + wob(r, 160)}" cy="${wy + wh * 0.55 + wob(r, 170)}" r="${60 + r() * 50}" fill="${["#6f9a52", "#5f8a46", "#7fa85e"][i % 3]}"/>`;
    s += `<rect x="${wx + ww * 0.7 - 10}" y="${wy + wh * 0.72}" width="20" height="${wh * 0.3}" fill="#5a4636"/>`;
    s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#fff" opacity=".12"/></g>`;
    s += `<rect x="${wx - 16}" y="${wy - 16}" width="${ww + 32}" height="${wh + 32}" fill="none" stroke="#f6f3ec" stroke-width="22"/>`;
    s += `<path d="M${wx + ww / 2},${wy} V${wy + wh} M${wx},${wy + wh * 0.3} H${wx + ww}" stroke="#f6f3ec" stroke-width="14"/>`;
    s += `<rect x="${wx - 40}" y="${wy + wh + 12}" width="${ww + 80}" height="24" fill="#f1ede4"/><rect x="${wx - 40}" y="${wy + wh + 36}" width="${ww + 80}" height="8" fill="rgba(0,0,0,.12)"/>`;
    // a pot with a plant on the sill
    s += `<path d="M${wx + 40},${wy + wh + 12} l10,-60 h60 l10,60Z" fill="#b5562c"/><circle cx="${wx + 80}" cy="${wy + wh - 70}" r="34" fill="#5f8a46"/><circle cx="${wx + 58}" cy="${wy + wh - 92}" r="22" fill="#6f9a52"/>`;
    // daylight on the floor
    s += `<path d="M${wx},${wy + wh} L${wx + ww},${wy + wh} L${wx + ww + 300},${h} L${wx - 200},${h}Z" fill="#fff6dc" opacity=".09"/>`;
    // upper cabinets + counter with a sink on the left
    const cx0 = 0, cx1 = wx - 110;
    if (cx1 > 160) {
      s += `<rect x="${cx0}" y="${fy - 1320}" width="${cx1}" height="380" fill="#f3efe6"/><rect x="${cx0}" y="${fy - 940}" width="${cx1}" height="10" fill="rgba(0,0,0,.12)"/>`;
      for (let x = cx0 + 8; x < cx1 - 40; x += 200) s += `<rect x="${x}" y="${fy - 1310}" width="190" height="360" fill="none" stroke="#d8d1c3" stroke-width="4"/><rect x="${x + 150}" y="${fy - 1010}" width="24" height="6" fill="#9a9184"/>`;
      // backsplash tiles
      for (let y = fy - 920; y < fy - 520; y += 50) for (let x = cx0; x < cx1; x += 50) s += `<rect x="${x + 2}" y="${y + 2}" width="46" height="46" fill="#dfe6e3"/>`;
      s += `<rect x="${cx0}" y="${fy - 520}" width="${cx1 + 20}" height="34" fill="#9b7b5c"/>`;
      s += `<rect x="${cx0}" y="${fy - 486}" width="${cx1}" height="486" fill="#efe9dd"/>`;
      for (let x = cx0 + 8; x < cx1 - 40; x += 200) s += `<rect x="${x}" y="${fy - 470}" width="190" height="450" fill="none" stroke="#d8d1c3" stroke-width="4"/><rect x="${x + 80}" y="${fy - 440}" width="30" height="6" fill="#9a9184"/>`;
      s += `<rect x="${cx1 * 0.35}" y="${fy - 528}" width="200" height="14" rx="5" fill="#b8bcc0"/><path d="M${cx1 * 0.35 + 100},${fy - 528} v-90 q0,-26 30,-26 h20" stroke="#a7abb0" stroke-width="12" fill="none"/>`;
      // kettle
      const kx = cx1 * 0.78, ky = fy - 520;
      s += `<path d="M${kx - 70},${ky} q-6,-120 70,-130 q76,10 70,130Z" fill="#e85a44"/><rect x="${kx - 30}" y="${ky - 150}" width="60" height="16" rx="6" fill="#2a2a2a"/>`;
      s += `<path d="M${kx + 60},${ky - 80} q50,-10 54,-46" stroke="#e85a44" stroke-width="14" fill="none"/><path d="M${kx - 70},${ky - 100} q-40,0 -40,50" stroke="#2a2a2a" stroke-width="10" fill="none"/>`;
      s += `<rect x="${kx - 74}" y="${ky - 6}" width="148" height="10" rx="4" fill="#2a2a2a"/>`;
    }
    // a clock on the wall to the right
    const clx = Math.min(w - 120, wx + ww + 220), cly = fy - 1100;
    s += `<circle cx="${clx}" cy="${cly}" r="70" fill="#faf8f3" stroke="#3a3632" stroke-width="10"/><path d="M${clx},${cly} L${clx + 4},${cly - 46} M${clx},${cly} L${clx + 34},${cly + 8}" stroke="#2a2a2a" stroke-width="7" stroke-linecap="round"/>`;
    s += `<rect x="0" y="${fy - 10}" width="${w}" height="14" fill="rgba(0,0,0,.12)"/>`;
    const svg = H.svg(s, w, h);
    // steam above the kettle
    const st = H.el("g", { fill: "none", stroke: "#ffffff", "stroke-width": 9, "stroke-linecap": "round" }, svg);
    const puffs = [0, 1, 2].map(() => H.el("path", {}, st));
    const kx = (wx - 110) * 0.78, ky = fy - 520 - 180;
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("steam", 0), 0, 1);
        st.style.display = k > 0 && cx1 > 160 ? "" : "none";
        puffs.forEach((pf, i) => {
          const ph = (t * 0.45 + i / 3) % 1, y0 = ky - ph * 220, x0 = kx + Math.sin(t * 2 + i) * 14;
          pf.setAttribute("d", `M${x0},${y0} q-24,-34 0,-66 q24,-32 0,-64`);
          pf.setAttribute("opacity", (0.55 * k * Math.sin(ph * Math.PI)).toFixed(3));
        });
      },
    };
  },
};

export const kitchen_table = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 900, h = p.h ?? 520;
    const cloth = H.col(p.cloth ?? "#f2efe8");
    let s = `<rect x="${w * 0.08}" y="60" width="26" height="${h - 60}" fill="#7a5a3e"/><rect x="${w * 0.92 - 26}" y="60" width="26" height="${h - 60}" fill="#7a5a3e"/>`;
    s += `<rect x="${w * 0.2}" y="60" width="22" height="${h - 90}" fill="#5e4430"/><rect x="${w * 0.8 - 22}" y="60" width="22" height="${h - 90}" fill="#5e4430"/>`;
    s += `<path d="M0,0 H${w} L${w + 10},150 Q${w / 2},170 -10,150Z" fill="${cloth}"/>`;
    for (let x = 30; x < w; x += 70) s += `<rect x="${x}" y="0" width="34" height="150" fill="${H.shade(p.cloth ?? "#f2efe8", -0.06)}" opacity=".7"/>`;
    s += `<path d="M-10,150 Q${w / 2},170 ${w + 10},150" stroke="rgba(0,0,0,.15)" stroke-width="6" fill="none"/>`;
    s += `<ellipse cx="${w / 2}" cy="${h - 4}" rx="${w * 0.48}" ry="12" fill="rgba(0,0,0,.16)"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

export const fridge = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const h = p.h ?? 1100, w = h * 0.36;
    const r = H.rng(p.seed ?? 5);
    let s = `<rect x="0" y="0" width="${w}" height="${h - 14}" rx="22" fill="#f4f3ef"/><rect x="${w - 30}" y="0" width="30" height="${h - 14}" rx="12" fill="rgba(0,0,0,.06)"/>`;
    s += `<rect x="0" y="${h * 0.34}" width="${w}" height="6" fill="#cfcbc2"/>`;
    s += `<rect x="${w * 0.08}" y="${h * 0.12}" width="12" height="${h * 0.16}" rx="6" fill="#b8b4ab"/><rect x="${w * 0.08}" y="${h * 0.4}" width="12" height="${h * 0.22}" rx="6" fill="#b8b4ab"/>`;
    for (let i = 0; i < 6; i++) s += `<circle cx="${w * 0.25 + r() * w * 0.6}" cy="${h * 0.05 + r() * h * 0.25}" r="${9 + r() * 6}" fill="${["#e85a44", "#3d7fb8", "#ffb23e", "#5f8a46"][i % 4]}"/>`;
    s += `<rect x="${w * 0.22}" y="${h * 0.66}" width="${w * 0.5}" height="${h * 0.12}" fill="#fffdf6" transform="rotate(4,${w * 0.47},${h * 0.72})"/>`;
    for (let i = 0; i < 4; i++) s += `<line x1="${w * 0.27}" y1="${h * 0.69 + i * 22}" x2="${w * 0.62}" y2="${h * 0.69 + i * 22 + 2}" stroke="#7a8aa0" stroke-width="3"/>`;
    s += `<rect x="0" y="${h - 14}" width="${w}" height="14" fill="#2a2724"/><ellipse cx="${w / 2}" cy="${h - 2}" rx="${w * 0.55}" ry="8" fill="rgba(0,0,0,.2)"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

export const hallway = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 1920, fy = p.floor_y ?? 1500, dx = p.door_x ?? w * 0.58;
    let s = `<defs><linearGradient id="hwl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9d3a8"/><stop offset=".35" stop-color="#d9c4a0"/><stop offset="1" stop-color="#b8a382"/></linearGradient></defs>`;
    s += `<rect x="0" y="0" width="${w}" height="${fy}" fill="url(#hwl)"/>`;
    for (let x = 0; x < w; x += 60) s += `<rect x="${x}" y="0" width="22" height="${fy}" fill="rgba(255,255,255,.12)"/>`;
    s += `<rect x="0" y="${fy - 120}" width="${w}" height="120" fill="#8a6a4c"/><rect x="0" y="${fy - 124}" width="${w}" height="8" fill="#6e523a"/>`;
    s += `<rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="#6e5440"/>`;
    for (let i = 1; i < 9; i++) { const y = fy + (h - fy) * (i / 9) ** 1.3; s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`; }
    // warm light from the kitchen doorway on the left
    s += `<rect x="0" y="${fy - 1260}" width="${w * 0.12}" height="1260" fill="#fff2c8" opacity=".55"/><path d="M${w * 0.12},${fy} L${w * 0.4},${h} L0,${h} L0,${fy}Z" fill="#fff2c8" opacity=".16"/>`;
    // front door
    const dw = 380, dh = 1000;
    s += `<rect x="${dx - 24}" y="${fy - dh - 24}" width="${dw + 48}" height="${dh + 24}" fill="#5a4636"/>`;
    s += `<rect x="${dx}" y="${fy - dh}" width="${dw}" height="${dh}" fill="#7a4e34"/>`;
    s += `<rect x="${dx + 40}" y="${fy - dh + 60}" width="${dw - 80}" height="380" fill="none" stroke="#5e3a26" stroke-width="8"/><rect x="${dx + 40}" y="${fy - dh + 500}" width="${dw - 80}" height="420" fill="none" stroke="#5e3a26" stroke-width="8"/>`;
    s += `<circle cx="${dx + dw / 2}" cy="${fy - dh + 250}" r="10" fill="#c9a640"/><rect x="${dx + dw - 70}" y="${fy - 520}" width="44" height="14" rx="6" fill="#c9a640"/><rect x="${dx + dw - 58}" y="${fy - 470}" width="18" height="40" rx="6" fill="#8a7a5a"/>`;
    s += `<rect x="${dx - 10}" y="${fy}" width="${dw + 20}" height="40" rx="6" fill="#4a5a4a"/>`;
    // coat hooks with two jackets
    const hx = dx - 380;
    if (hx > 60) {
      s += `<rect x="${hx}" y="${fy - 1060}" width="300" height="30" fill="#5a4636"/>`;
      s += `<path d="M${hx + 50},${fy - 1030} q-40,40 -50,360 h130 q-10,-320 -50,-360Z" fill="#3f5a7a"/><path d="M${hx + 190},${fy - 1030} q-40,40 -46,300 h120 q-8,-270 -44,-300Z" fill="#8a3a32"/>`;
      s += `<rect x="${hx - 20}" y="${fy - 240}" width="340" height="24" fill="#5a4636"/><rect x="${hx - 10}" y="${fy - 216}" width="20" height="216" fill="#5a4636"/><rect x="${hx + 290}" y="${fy - 216}" width="20" height="216" fill="#5a4636"/>`;
      s += `<path d="M${hx + 20},${fy - 240} q10,-60 60,-60 h40 v60Z M${hx + 160},${fy - 240} q10,-50 50,-50 h40 v50Z" fill="#2a2a2a"/>`;
      s += `<path d="M${hx + 30},${fy} q6,-50 50,-50 h40 v50Z M${hx + 170},${fy} q6,-44 44,-44 h34 v44Z" fill="#c9b8a4"/>`;
    }
    s += `<rect x="0" y="${fy - 6}" width="${w}" height="10" fill="rgba(0,0,0,.14)"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

export const drawing = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 640, h = p.h ?? 460;
    const r = H.rng(p.seed ?? 3);
    const line = (pts, c, sw = 7) => `<path d="M${pts.map(([x, y]) => `${x + wob(r, 4)},${y + wob(r, 4)}`).join(" L")}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    const U = w / 640;
    const S = (v) => v * U;
    let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#fbfaf5"/><rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="3"/>`;
    // sun
    s += `<circle cx="${S(90)}" cy="${S(80)}" r="${S(42)}" fill="#ffd23e"/>`;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; s += line([[S(90) + Math.cos(a) * S(54), S(80) + Math.sin(a) * S(54)], [S(90) + Math.cos(a) * S(78), S(80) + Math.sin(a) * S(78)]], "#ffb23e", S(6)); }
    // grass
    s += line([[S(10), S(400)], [S(630), S(396)]], "#5fa040", S(10));
    for (let x = 20; x < 630; x += 26) s += line([[S(x), S(400)], [S(x + 6), S(380)]], "#5fa040", S(5));
    // house: walls, roof, windows, door frame
    s += `<rect x="${S(170)}" y="${S(200)}" width="${S(230)}" height="${S(196)}" fill="#f6d9a8"/>`;
    s += line([[S(170), S(396)], [S(170), S(200)], [S(400), S(200)], [S(400), S(396)]], "#c07a3a", S(6));
    s += `<path d="M${S(150)},${S(205)} L${S(285)},${S(110)} L${S(420)},${S(205)}Z" fill="#e05a44"/>`;
    s += line([[S(150), S(205)], [S(285), S(110)], [S(420), S(205)], [S(150), S(205)]], "#a8382a", S(6));
    s += `<rect x="${S(195)}" y="${S(235)}" width="${S(58)}" height="${S(52)}" fill="#9cd0f0"/>` + line([[S(224), S(235)], [S(224), S(287)]], "#3a6a9a", S(4)) + line([[S(195), S(261)], [S(253), S(261)]], "#3a6a9a", S(4));
    const doorX = S(300), doorY = S(268), doorW = S(64), doorH = S(128);
    s += `<defs><clipPath id="drd${p.seed ?? 3}"><rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}"/></clipPath></defs>`;
    // carousel on the right
    s += line([[S(530), S(396)], [S(530), S(200)]], "#7a5a3e", S(6));
    s += `<path d="M${S(460)},${S(220)} L${S(530)},${S(150)} L${S(600)},${S(220)}Z" fill="#ffffff"/>`;
    for (let i = 0; i < 4; i++) s += `<path d="M${S(530)},${S(150)} L${S(460 + i * 35)},${S(220)} L${S(477 + i * 35)},${S(220)}Z" fill="#e05a44"/>`;
    s += line([[S(460), S(220)], [S(530), S(150)], [S(600), S(220)], [S(460), S(220)]], "#a8382a", S(5));
    s += line([[S(490), S(220)], [S(490), S(320)]], "#7a5a3e", S(4)) + line([[S(570), S(220)], [S(570), S(300)]], "#7a5a3e", S(4));
    s += `<ellipse cx="${S(490)}" cy="${S(330)}" rx="${S(24)}" ry="${S(14)}" fill="#f0a05a"/><ellipse cx="${S(570)}" cy="${S(310)}" rx="${S(24)}" ry="${S(14)}" fill="#9a6ad0"/>`;
    s += line([[S(450), S(396)], [S(610), S(396)]], "#7a5a3e", S(8));
    // stick people: mama and me
    const stick = (x, y, sc, c) => line([[x, y - S(70) * sc], [x, y - S(24) * sc]], c, S(5)) + line([[x - S(20) * sc, y], [x, y - S(24) * sc], [x + S(20) * sc, y]], c, S(5)) + line([[x - S(22) * sc, y - S(54) * sc], [x + S(22) * sc, y - S(54) * sc]], c, S(5)) + `<circle cx="${x}" cy="${y - S(84) * sc}" r="${S(14) * sc}" fill="none" stroke="${c}" stroke-width="${S(5)}"/>`;
    s += stick(S(60), S(392), 1.25, "#2a7a3a") + stick(S(115), S(394), 0.85, "#2a5ab0");
    s += `<text x="${S(60)}" y="${S(250)}" text-anchor="middle" font-family='${HAND}' font-weight="700" font-size="${S(34)}" fill="#2a7a3a">МАМА</text>`;
    s += `<text x="${S(118)}" y="${S(282)}" text-anchor="middle" font-family='${HAND}' font-weight="700" font-size="${S(34)}" fill="#2a5ab0">Я</text>`;
    const svg = H.svg(s, w, h);
    // the blue door, coloured in strokes from the bottom up
    const fillG = H.el("g", { "clip-path": `url(#drd${p.seed ?? 3})` }, svg);
    const fillR = H.el("rect", { x: doorX, width: doorW, fill: "#2f6fc0" }, fillG);
    for (let i = 0; i < 9; i++) H.el("path", { d: `M${doorX - 6},${doorY + doorH - i * S(15)} L${doorX + doorW + 6},${doorY + doorH - i * S(15) - S(18)}`, stroke: "#1f5aa8", "stroke-width": S(6), opacity: 0.6 }, fillG);
    H.el("path", { d: `M${doorX},${doorY + doorH} V${doorY} H${doorX + doorW} V${doorY + doorH}`, stroke: "#1f4a90", "stroke-width": S(6), fill: "none", "stroke-linecap": "round" }, svg);
    H.el("circle", { cx: doorX + doorW - S(14), cy: doorY + doorH * 0.55, r: S(5), fill: "#ffd23e" }, svg);
    // marker
    const mk = H.el("g", {}, svg);
    H.el("rect", { x: -S(9), y: -S(130), width: S(18), height: S(110), rx: S(5), fill: "#2f6fc0" }, mk);
    H.el("rect", { x: -S(10), y: -S(150), width: S(20), height: S(30), rx: S(5), fill: "#f2f2f2" }, mk);
    H.el("path", { d: `M${-S(7)},${-S(20)} L0,0 L${S(7)},${-S(20)}Z`, fill: "#1f4a90" }, mk);
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("door", 1), 0, 1);
        const fh = doorH * k;
        fillR.setAttribute("y", doorY + doorH - fh); fillR.setAttribute("height", fh);
        fillG.style.opacity = k > 0 ? 1 : 0;
        [...fillG.querySelectorAll("path")].forEach((pa, i) => (pa.style.display = (i + 1) / 9 <= k + 0.05 ? "" : "none"));
        const m = it.v("marker", null);
        if (Array.isArray(m)) { mk.style.display = ""; mk.setAttribute("transform", `translate(${m[0] * w},${m[1] * h}) rotate(28)`); } else mk.style.display = "none";
      },
    };
  },
};

export const yard = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1400, h = p.h ?? 1920, gy = p.ground_y ?? 980, ax = p.arch_x ?? w * 0.82;
    let s = `<defs><linearGradient id="ydas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e8186"/><stop offset="1" stop-color="#5e6166"/></linearGradient></defs>`;
    s += `<rect x="0" y="${gy}" width="${w}" height="${h - gy}" fill="url(#ydas)"/>`;
    // sidewalk strip and curb along the far building
    s += `<rect x="0" y="${gy}" width="${w}" height="60" fill="#b3aca2"/><rect x="0" y="${gy + 60}" width="${w}" height="12" fill="#d6d0c6"/>`;
    // parking stripes in perspective
    for (let i = 0; i < 9; i++) { const x = 60 + i * 150; s += `<path d="M${x},${gy + 90} L${x - 60 + i * 6},${gy + 330}" stroke="#e8e6df" stroke-width="7"/>`; }
    // lawn with the playground at the front
    const ly = gy + 520;
    s += `<path d="M0,${ly} Q${w * 0.5},${ly - 40} ${w},${ly} V${h} H0Z" fill="#7ea35a"/><path d="M0,${ly} Q${w * 0.5},${ly - 40} ${w},${ly}" stroke="#a8a294" stroke-width="22" fill="none"/>`;
    for (let i = 0; i < 60; i++) { const r = H.rng(i * 7 + 3); s += `<ellipse cx="${r() * w}" cy="${ly + 40 + r() * (h - ly)}" rx="${30 + r() * 50}" ry="${8 + r() * 10}" fill="${r() < 0.5 ? "#8bb064" : "#6f9450"}" opacity=".6"/>`; }
    // swing
    const sx = w * 0.2, sy = ly + 330;
    s += `<path d="M${sx - 130},${sy} L${sx - 90},${sy - 300} L${sx + 90},${sy - 300} L${sx + 130},${sy}" stroke="#c0503a" stroke-width="14" fill="none"/><path d="M${sx - 30},${sy - 300} V${sy - 90} M${sx + 30},${sy - 300} V${sy - 90}" stroke="#555" stroke-width="5"/><rect x="${sx - 46}" y="${sy - 96}" width="92" height="16" rx="5" fill="#3d7fb8"/>`;
    // slide
    const hx = w * 0.52, hy = ly + 380;
    s += `<path d="M${hx - 60},${hy} V${hy - 260} M${hx + 10},${hy} V${hy - 260}" stroke="#3d7fb8" stroke-width="14"/><rect x="${hx - 70}" y="${hy - 270}" width="90" height="22" fill="#ffb23e"/>`;
    s += `<path d="M${hx + 10},${hy - 260} Q${hx + 160},${hy - 220} ${hx + 230},${hy}" stroke="#e85a44" stroke-width="30" fill="none"/>`;
    for (let i = 0; i < 5; i++) s += `<path d="M${hx - 60},${hy - 40 - i * 50} H${hx + 10}" stroke="#3d7fb8" stroke-width="7"/>`;
    // sandbox + bench
    s += `<rect x="${w * 0.7}" y="${ly + 300}" width="260" height="110" fill="#e9d29a" stroke="#8a6a46" stroke-width="16"/>`;
    s += `<rect x="${w * 0.04}" y="${ly + 120}" width="200" height="20" fill="#8a6a46"/><rect x="${w * 0.04 + 10}" y="${ly + 140}" width="14" height="50" fill="#444"/><rect x="${w * 0.04 + 176}" y="${ly + 140}" width="14" height="50" fill="#444"/>`;
    // arch to the street (dark opening in the far building's base)
    s += `<path d="M${ax - 110},${gy} V${gy - 240} Q${ax},${gy - 330} ${ax + 110},${gy - 240} V${gy}Z" fill="#2a2724"/>`;
    s += `<rect x="0" y="${gy - 6}" width="${w}" height="10" fill="rgba(0,0,0,.12)"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

export const car = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 620, h = w * 0.42;
    const c = H.col(p.color ?? "#5a7d9a"), dark = H.shade(p.color ?? "#5a7d9a", -0.3);
    const svg = H.svg("", w, h);
    const body = H.el("g", {}, svg);
    H.el("ellipse", { cx: w / 2, cy: h - 4, rx: w * 0.5, ry: 10, fill: "rgba(0,0,0,.25)" }, body);
    H.el("path", { d: `M${w * 0.03},${h * 0.78} L${w * 0.03},${h * 0.5} Q${w * 0.05},${h * 0.42} ${w * 0.2},${h * 0.4} L${w * 0.32},${h * 0.12} Q${w * 0.35},${h * 0.06} ${w * 0.42},${h * 0.06} L${w * 0.8},${h * 0.06} Q${w * 0.86},${h * 0.07} ${w * 0.9},${h * 0.18} L${w * 0.97},${h * 0.44} Q${w},${h * 0.5} ${w},${h * 0.6} L${w},${h * 0.78}Z`, fill: c }, body);
    H.el("path", { d: `M${w * 0.35},${h * 0.38} L${w * 0.42},${h * 0.14} L${w * 0.6},${h * 0.14} L${w * 0.6},${h * 0.38}Z M${w * 0.63},${h * 0.38} L${w * 0.63},${h * 0.14} L${w * 0.8},${h * 0.14} Q${w * 0.84},${h * 0.15} ${w * 0.86},${h * 0.22} L${w * 0.9},${h * 0.38}Z`, fill: "#bcd2e0" }, body);
    H.el("rect", { x: w * 0.03, y: h * 0.6, width: w * 0.97, height: h * 0.05, fill: dark }, body);
    H.el("rect", { x: w * 0.5, y: h * 0.45, width: w * 0.06, height: h * 0.03, rx: 3, fill: dark }, body);
    H.el("rect", { x: w * 0.965, y: h * 0.46, width: w * 0.03, height: h * 0.08, rx: 3, fill: "#ffd98a" }, body);
    H.el("rect", { x: w * 0.0, y: h * 0.46, width: w * 0.03, height: h * 0.08, rx: 3, fill: "#d8463a" }, body);
    // open boot lid (hinged at the rear roof edge) + boxes inside
    const boot = H.el("g", {}, svg);
    if (p.boxes) {
      H.el("rect", { x: w * 0.04, y: h * 0.24, width: w * 0.14, height: h * 0.22, fill: "#c4975e", stroke: "#8a6a3e", "stroke-width": 3 }, boot);
      H.el("rect", { x: w * 0.12, y: h * 0.16, width: w * 0.12, height: h * 0.18, fill: "#b8895a", stroke: "#8a6a3e", "stroke-width": 3 }, boot);
    }
    const lid = H.el("path", { d: `M0,0 L${-w * 0.16},${h * 0.05} L${-w * 0.17},${h * 0.32} L${-w * 0.02},${h * 0.32}Z`, fill: c, stroke: dark, "stroke-width": 3 }, svg);
    const wheels = [0.2, 0.78].map((fx) => {
      const g = H.el("g", { transform: `translate(${w * fx},${h * 0.8})` }, svg);
      H.el("circle", { r: h * 0.17, fill: "#1d1f22" }, g);
      H.el("circle", { r: h * 0.09, fill: "#9aa0a6" }, g);
      const sp = H.el("path", { d: `M${-h * 0.09},0 H${h * 0.09} M0,${-h * 0.09} V${h * 0.09}`, stroke: "#5e6368", "stroke-width": 4 }, g);
      return sp;
    });
    return {
      el: svg, w, h,
      update(t, it) {
        const o = H.clamp(it.v("trunk", 0), 0, 1);
        lid.setAttribute("transform", `translate(${w * 0.2},${h * 0.4}) rotate(${-o * 70})`);
        lid.style.display = "";
        boot.style.display = o > 0.3 ? "" : "none";
        const roll = it.v("roll", 0);
        wheels.forEach((sp) => sp.setAttribute("transform", `rotate(${roll * 57.3})`));
      },
    };
  },
};

export const grill = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 300, h = w * 0.9;
    let s = `<ellipse cx="${w / 2}" cy="${h - 4}" rx="${w * 0.5}" ry="8" fill="rgba(0,0,0,.2)"/>`;
    s += `<path d="M${w * 0.1},${h * 0.5} L${w * 0.05},${h} M${w * 0.9},${h * 0.5} L${w * 0.95},${h} M${w * 0.3},${h * 0.5} L${w * 0.28},${h * 0.94} M${w * 0.7},${h * 0.5} L${w * 0.72},${h * 0.94}" stroke="#2a2a2a" stroke-width="8"/>`;
    s += `<path d="M0,${h * 0.28} H${w} L${w * 0.94},${h * 0.52} H${w * 0.06}Z" fill="#3a3a3c"/>`;
    for (let i = 0; i < 9; i++) s += `<circle cx="${w * 0.12 + i * w * 0.095}" cy="${h * 0.3}" r="${w * 0.035}" fill="${i % 2 ? "#e8662a" : "#b8401e"}"/>`;
    for (let i = 0; i < 4; i++) {
      const x = w * 0.16 + i * w * 0.22;
      s += `<line x1="${x - w * 0.18}" y1="${h * 0.24}" x2="${x + w * 0.18}" y2="${h * 0.24}" stroke="#b8bcc0" stroke-width="4"/>`;
      for (let k = 0; k < 3; k++) s += `<rect x="${x - w * 0.1 + k * w * 0.07}" y="${h * 0.2}" width="${w * 0.055}" height="${h * 0.075}" rx="5" fill="#8a4a2a"/>`;
    }
    const svg = H.svg(s, w, h);
    const sm = H.el("g", { fill: "none", stroke: "#dddddd", "stroke-width": 12, "stroke-linecap": "round" }, svg);
    const puffs = [0, 1, 2].map(() => H.el("path", {}, sm));
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("smoke", 0.6), 0, 1);
        puffs.forEach((pf, i) => {
          const ph = (t * 0.35 + i / 3) % 1, x0 = w * (0.3 + i * 0.2) + Math.sin(t + i) * 10, y0 = h * 0.18 - ph * h * 0.9;
          pf.setAttribute("d", `M${x0},${y0} q-26,-40 0,-80 q26,-40 0,-80`);
          pf.setAttribute("opacity", (0.45 * k * Math.sin(ph * Math.PI)).toFixed(3));
        });
      },
    };
  },
};

export const facade = {
  origin: "top-left",
  surface: true,
  create(p, H) {
    const w = p.w ?? 1000, h = p.h ?? 1200, cols = p.cols ?? 5, rows = p.rows ?? 5;
    const wall = p.wall ?? "#d9c2a4";
    const r = H.rng(p.seed ?? 9);
    const cw = w / cols, rh = h / rows, ww = cw * 0.56, wh = rh * 0.62;
    const men = (p.man ?? []).map(([c, rr]) => `${c},${rr}`);
    const wv = p.wave ? `${p.wave[0]},${p.wave[1]}` : null;
    let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="${H.col(wall)}"/>`;
    for (let y = 0; y < h; y += rh) s += `<rect x="0" y="${y + rh - 8}" width="${w}" height="8" fill="${H.shade(wall, -0.08)}"/>`;
    const svg = H.svg("", w, h);
    svg.innerHTML = s;
    const cans = [], waves = [];
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const x = c * cw + (cw - ww) / 2, y = rr * rh + rh * 0.14;
      const key = `${c},${rr}`;
      const g = H.el("g", { transform: `translate(${x},${y})` }, svg);
      const lit = r() < 0.3;
      H.el("rect", { x: -8, y: -8, width: ww + 16, height: wh + 16, fill: "#f3ede2" }, g);
      H.el("rect", { x: 0, y: 0, width: ww, height: wh, fill: lit ? "#e9d9a8" : "#6f7f8e" }, g);
      if (men.includes(key)) {
        // the stamped neighbour: identical in every copy (same pose, same flower, same can)
        H.el("rect", { x: 0, y: 0, width: ww, height: wh, fill: "#a9b9c4" }, g);
        H.el("ellipse", { cx: ww * 0.4, cy: wh * 0.3, rx: ww * 0.11, ry: wh * 0.12, fill: "#e8c4a6" }, g);
        H.el("path", { d: `M${ww * 0.4},${wh * 0.18} q${-ww * 0.12},0 ${-ww * 0.11},${wh * 0.08} q${ww * 0.11},${-wh * 0.04} ${ww * 0.22},0 q0,${-wh * 0.08} ${-ww * 0.11},${-wh * 0.08}Z`, fill: "#4a3a2e" }, g);
        H.el("path", { d: `M${ww * 0.2},${wh} Q${ww * 0.2},${wh * 0.46} ${ww * 0.4},${wh * 0.44} Q${ww * 0.6},${wh * 0.46} ${ww * 0.6},${wh}Z`, fill: "#f4f4f0" }, g);
        H.el("path", { d: `M${ww * 0.56},${wh * 0.58} L${ww * 0.72},${wh * 0.66}`, stroke: "#e8c4a6", "stroke-width": ww * 0.06, "stroke-linecap": "round" }, g);
        const can = H.el("g", {}, g);
        H.el("path", { d: `M0,0 h${ww * 0.16} v${wh * 0.16} h${-ww * 0.16}Z M${ww * 0.16},${wh * 0.03} L${ww * 0.3},${-wh * 0.04}`, fill: "#3d9a6a", stroke: "#3d9a6a", "stroke-width": ww * 0.03 }, can);
        const drops = H.el("path", { d: `M${ww * 0.31},${-wh * 0.02} q${ww * 0.04},${wh * 0.1} ${ww * 0.02},${wh * 0.2}`, stroke: "#9cd0f0", "stroke-width": ww * 0.02, fill: "none" }, can);
        cans.push({ can, drops, x: ww * 0.68, y: wh * 0.58 });
        H.el("rect", { x: ww * 0.62, y: wh * 0.86, width: ww * 0.2, height: wh * 0.14, fill: "#b5562c" }, g);
        H.el("circle", { cx: ww * 0.72, cy: wh * 0.8, r: ww * 0.09, fill: "#e05a44" }, g);
        H.el("circle", { cx: ww * 0.66, cy: wh * 0.84, r: ww * 0.06, fill: "#5f8a46" }, g);
      } else if (!lit) {
        // curtains differ window to window
        if (r() < 0.6) H.el("rect", { x: 0, y: 0, width: ww * (0.2 + r() * 0.3), height: wh, fill: ["#e9e2d0", "#c8d6c0", "#e6c8c0", "#d0d8e6"][Math.floor(r() * 4)] }, g);
        if (r() < 0.3) H.el("rect", { x: ww * 0.15, y: wh * 0.82, width: ww * 0.2, height: wh * 0.18, fill: "#b5562c" }, g);
      }
      H.el("path", { d: `M${ww / 2},0 V${wh} M0,${wh * 0.34} H${ww}`, stroke: "#f3ede2", "stroke-width": 6 }, g);
      if (wv === key) {
        // a balcony with a waving woman
        H.el("rect", { x: -20, y: wh * 0.55, width: ww + 40, height: wh * 0.5, fill: "#c9b8a4" }, g);
        H.el("rect", { x: -20, y: wh * 0.55, width: ww + 40, height: 8, fill: "#8a7a66" }, g);
        H.el("path", { d: `M${ww * 0.3},${wh * 0.56} Q${ww * 0.3},${wh * 0.2} ${ww * 0.45},${wh * 0.2} Q${ww * 0.6},${wh * 0.2} ${ww * 0.6},${wh * 0.56}Z`, fill: "#c0503a" }, g);
        H.el("circle", { cx: ww * 0.45, cy: wh * 0.12, r: ww * 0.08, fill: "#e8c4a6" }, g);
        H.el("path", { d: `M${ww * 0.37},${wh * 0.1} q${ww * 0.08},${-wh * 0.12} ${ww * 0.16},0 q0,${wh * 0.14} ${-ww * 0.02},${wh * 0.18} q${-ww * 0.06},${-wh * 0.1} ${-ww * 0.14},${-wh * 0.18}Z`, fill: "#6a3a2a" }, g);
        const arm = H.el("path", { stroke: "#e8c4a6", "stroke-width": ww * 0.05, "stroke-linecap": "round", fill: "none" }, g);
        waves.push({ arm, x: ww * 0.58, y: wh * 0.26, L: wh * 0.26 });
      }
    }
    return {
      el: svg, w, h,
      update(t, it) {
        const k = H.clamp(it.v("water", 0), 0, 1);
        cans.forEach(({ can, drops, x, y }) => { can.setAttribute("transform", `translate(${x},${y}) rotate(${k * 28})`); drops.style.display = k > 0.5 ? "" : "none"; });
        const wk = H.clamp(it.v("wave_k", 0), 0, 1);
        waves.forEach(({ arm, x, y, L }) => {
          const a = (-150 + Math.sin(t * 9) * 25 * wk) * Math.PI / 180 * (wk > 0 ? 1 : 0.15);
          arm.setAttribute("d", `M${x},${y} L${x + Math.cos(a) * L * 0.2 + L * 0.3},${y + Math.sin(a) * L}`);
        });
      },
    };
  },
};

export const river = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 740, h = p.h ?? 880, hz = p.horizon ?? h * 0.36, ry = p.rail_y ?? h * 0.7;
    const r = H.rng(p.seed ?? 17);
    let s = `<defs><linearGradient id="rvsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8cc0e8"/><stop offset="1" stop-color="#f2e4c8"/></linearGradient>
      <linearGradient id="rvw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a9ab8"/><stop offset="1" stop-color="#3f6f8f"/></linearGradient></defs>`;
    s += `<rect x="0" y="0" width="${w}" height="${hz}" fill="url(#rvsky)"/>`;
    // the same cloud stamped several times (clouds) or a few different ones
    const cloud = (x, y, k = 1) => `<g transform="translate(${x},${y}) scale(${k})"><ellipse cx="0" cy="0" rx="70" ry="22" fill="#fff"/><ellipse cx="-30" cy="-14" rx="34" ry="24" fill="#fff"/><ellipse cx="22" cy="-20" rx="40" ry="30" fill="#fff"/><ellipse cx="0" cy="8" rx="64" ry="10" fill="#e6eef4"/></g>`;
    (p.clouds ?? [[w * 0.25, hz * 0.3], [w * 0.75, hz * 0.18]]).forEach(([x, y]) => (s += cloud(x, y, w / 740)));
    // far bank: bright little houses, a church dome, trees
    s += `<rect x="0" y="${hz - 18}" width="${w}" height="40" fill="#8fae6a"/>`;
    let x = -20;
    while (x < w + 20) {
      const bw = 50 + r() * 50, bh = 50 + r() * 70;
      const roof = ["#c8553d", "#3d7fb8", "#e0a040", "#c8553d", "#5f8a46"][Math.floor(r() * 5)];
      s += `<rect x="${x}" y="${hz - bh}" width="${bw}" height="${bh}" fill="${["#f2e6d0", "#e9d2b0", "#f6efe2", "#e2c8a8"][Math.floor(r() * 4)]}"/>`;
      s += `<path d="M${x - 6},${hz - bh} L${x + bw / 2},${hz - bh - 26} L${x + bw + 6},${hz - bh}Z" fill="${roof}"/>`;
      s += `<rect x="${x + bw * 0.25}" y="${hz - bh + 16}" width="${bw * 0.18}" height="16" fill="#6a7a88"/><rect x="${x + bw * 0.57}" y="${hz - bh + 16}" width="${bw * 0.18}" height="16" fill="#6a7a88"/>`;
      if (r() < 0.3) s += `<circle cx="${x + bw + 12}" cy="${hz - 30}" r="${24 + r() * 14}" fill="#5f8a46"/>`;
      x += bw + 8 + r() * 14;
    }
    s += `<rect x="0" y="${hz}" width="${w}" height="${ry - hz + 10}" fill="url(#rvw)"/>`;
    // reflections
    for (let i = 0; i < 14; i++) s += `<rect x="${r() * w}" y="${hz + 8 + r() * 40}" width="${30 + r() * 60}" height="6" fill="#f2e6d0" opacity=".25"/>`;
    // waves: identical copies (stamp) at the given points, plus small random ripples
    const wave = (x, y) => `<g transform="translate(${x},${y})"><path d="M-46,0 q12,-14 24,0 q12,14 24,0 q12,-14 24,0 q12,14 24,0" stroke="#eaf4fa" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-30,10 q10,-8 20,0" stroke="#cfe2ee" stroke-width="3" fill="none"/></g>`;
    for (let i = 0; i < 16; i++) s += `<path d="M${r() * w},${hz + 30 + r() * (ry - hz - 40)} q8,-5 16,0" stroke="#9cc0d8" stroke-width="3" fill="none"/>`;
    (p.waves ?? []).forEach(([wx, wy]) => (s += wave(wx, wy)));
    if (p.boat) s += `<g transform="translate(${w * 0.68},${hz + (ry - hz) * 0.35})"><path d="M-50,0 H50 L36,18 H-36Z" fill="#f6f2ea"/><path d="M0,0 V-60 L34,-6Z" fill="#e85a44"/><path d="M0,-60 V0" stroke="#5a4636" stroke-width="3"/></g>`;
    // parapet with balusters, promenade, lamps
    s += `<rect x="0" y="${ry}" width="${w}" height="${h - ry}" fill="#d6c8b2"/>`;
    for (let i = 0; i < 10; i++) { const yy = ry + (h - ry) * (i / 10) ** 1.2; s += `<line x1="0" y1="${yy}" x2="${w}" y2="${yy}" stroke="rgba(0,0,0,.07)" stroke-width="2"/>`; }
    s += `<rect x="0" y="${ry - 70}" width="${w}" height="16" fill="#e9dfcf"/><rect x="0" y="${ry - 8}" width="${w}" height="14" fill="#c9b9a2"/>`;
    for (let bx = 10; bx < w; bx += 26) s += `<path d="M${bx},${ry - 54} q-8,14 0,26 q8,12 0,26" fill="#e9dfcf" stroke="#cbbca6" stroke-width="2"/>`;
    [w * 0.12, w * 0.88].forEach((lx) => (s += `<rect x="${lx - 5}" y="${ry - 260}" width="10" height="200" fill="#2e3a44"/><path d="M${lx - 22},${ry - 262} h44 l-8,-30 h-28Z" fill="#2e3a44"/><circle cx="${lx}" cy="${ry - 276}" r="9" fill="#fff2c0"/>`));
    return { el: H.svg(s, w, h), w, h };
  },
};

export const carousel = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const h = p.h ?? 600, w = h * 1.05;
    const cx = w / 2;
    const svg = H.svg("", w, h);
    const back = H.el("g", {}, svg), front = H.el("g", {}, svg);
    H.el("ellipse", { cx, cy: h - 8, rx: w * 0.5, ry: h * 0.04, fill: "rgba(0,0,0,.2)" }, back);
    // platform
    H.el("path", { d: `M${w * 0.04},${h * 0.9} Q${cx},${h * 1.0} ${w * 0.96},${h * 0.9} V${h * 0.95} Q${cx},${h * 1.04} ${w * 0.04},${h * 0.95}Z`, fill: "#8a3a32" }, back);
    H.el("ellipse", { cx, cy: h * 0.9, rx: w * 0.46, ry: h * 0.06, fill: "#d8c7a8" }, back);
    // centre column
    H.el("rect", { x: cx - w * 0.05, y: h * 0.26, width: w * 0.1, height: h * 0.64, fill: "#f2e6c8", stroke: "#c9a640", "stroke-width": 4 }, back);
    // canopy: striped cone + scalloped rim + flag
    const cone = H.el("g", {}, svg);
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a0 = i / N, a1 = (i + 1) / N;
      H.el("path", { d: `M${cx},${h * 0.04} L${w * 0.03 + a0 * w * 0.94},${h * 0.24} L${w * 0.03 + a1 * w * 0.94},${h * 0.24}Z`, fill: i % 2 ? "#f6f2ea" : "#d8463a" }, cone);
    }
    for (let i = 0; i < N; i++) H.el("path", { d: `M${w * 0.03 + i * w * 0.094},${h * 0.24} q${w * 0.047},${h * 0.07} ${w * 0.094},0Z`, fill: i % 2 ? "#d8463a" : "#f6f2ea" }, cone);
    H.el("path", { d: `M${cx},${h * 0.04} V${-h * 0.06} L${cx + w * 0.08},${-h * 0.03} L${cx},${0}`, fill: "#ffb23e", stroke: "#7a5a3e", "stroke-width": 3 }, cone);
    const bulbs = [];
    for (let i = 0; i <= 12; i++) bulbs.push(H.el("circle", { cx: w * 0.04 + i * w * 0.0767, cy: h * 0.255, r: h * 0.012, fill: "#fff2b0" }, cone));
    // horses on poles: positions around the ring rotate with time
    const horses = [];
    const horseD = (k) => `M${-30 * k},0 q${-6 * k},${-24 * k} ${16 * k},${-26 * k} h${30 * k} q${14 * k},${-20 * k} ${24 * k},${-30 * k} l${8 * k},${8 * k} q${-4 * k},${18 * k} ${-12 * k},${28 * k} q${4 * k},${22 * k} ${-14 * k},${24 * k} l${2 * k},${26 * k} h${-8 * k} l${-4 * k},${-24 * k} h${-30 * k} l${-4 * k},${24 * k} h${-8 * k}Z`;
    const cols = ["#f6f2ea", "#f0a05a", "#9a6ad0", "#6ab0d8", "#f6f2ea", "#e8c070"];
    for (let i = 0; i < 6; i++) {
      const g = H.el("g", {}, back);
      H.el("rect", { x: -3, y: -h * 0.6, width: 6, height: h * 0.66, fill: "#c9a640" }, g);
      H.el("path", { d: horseD(h / 380), fill: cols[i], stroke: "#5a4636", "stroke-width": 2.5 }, g);
      horses.push(g);
    }
    return {
      el: svg, w, h,
      update(t, it) {
        const sp = it.v("speed", p.speed ?? 0.06);
        horses.forEach((g, i) => {
          const a = (i / 6 + t * sp) * Math.PI * 2;
          const x = cx + Math.sin(a) * w * 0.38, dep = Math.cos(a);
          const y = h * 0.84 + dep * h * 0.04 + Math.sin(t * 3 + i * 2) * h * 0.02;
          const k = 0.75 + 0.25 * (dep + 1) / 2;
          g.setAttribute("transform", `translate(${x},${y}) scale(${(Math.sin(a + Math.PI / 2) < 0 ? -1 : 1) * k},${k})`);
          (dep > 0 ? front : back).appendChild(g);
          g.style.opacity = dep > 0 ? 1 : 0.85;
        });
        svg.appendChild(front);
        svg.appendChild(cone);
        const L = it.v("lights", 1);
        bulbs.forEach((b, i) => (b.style.opacity = L * (0.55 + 0.45 * ((Math.floor(t * 4) + i) % 2))));
      },
    };
  },
};

export const note = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 520, h = p.h ?? 380;
    const lines = p.lines ?? ["ЭТО ЗАПЛАТКА.", "НЕ ЕЗЖАЙ"];
    const r = H.rng(p.seed ?? 4);
    let top = `M0,26`;
    for (let x = 0; x <= w; x += 18) top += ` L${x},${18 + r() * 14}`;
    let s = `<path d="${top} L${w},${h} L0,${h}Z" fill="#fbfaf3"/>`;
    for (let y = 70; y < h; y += 38) s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#9cc0e0" stroke-width="2"/>`;
    s += `<line x1="60" y1="30" x2="60" y2="${h}" stroke="#e08a8a" stroke-width="2.5"/>`;
    s += `<path d="${top} L${w},${h} L0,${h}Z" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`;
    const svg = H.svg(s, w, h);
    const fs = Math.min(92, (w - 100) / Math.max(...lines.map((l) => l.length)) * 1.7);
    const texts = lines.map((l, i) => H.el("text", { x: w / 2 + 20, y: 120 + i * fs * 1.15, "text-anchor": "middle", "font-family": HAND, "font-weight": 700, "font-size": fs, fill: "#1f2a44" }, svg));
    texts.forEach((tx, i) => (tx.textContent = lines[i]));
    const clips = texts.map((tx, i) => {
      const id = H.uid("nt");
      const cp = H.el("clipPath", { id }, svg);
      const rc = H.el("rect", { x: 0, y: 120 + i * fs * 1.15 - fs, width: 0, height: fs * 1.3 }, cp);
      tx.setAttribute("clip-path", `url(#${id})`);
      return rc;
    });
    return {
      el: svg, w, h,
      update(t, it) {
        const k = it.v("shown", lines.length);
        clips.forEach((rc, i) => rc.setAttribute("width", H.clamp(k - i, 0, 1) * w));
      },
    };
  },
};

export const town_house = {
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 520, fl = p.floors ?? 2, fh = w * 0.36, wallH = fh * fl, roofH = w * 0.26, h = wallH + roofH + w * 0.04;
    const wall = H.col(p.wall ?? "#f2d9b0"), roof = H.col(p.roof ?? "#b8483a"), door = H.col(p.door ?? "#2f6fc0");
    const y0 = roofH;
    let s = `<path d="M${-w * 0.04},${y0} L${w * 0.16},${y0 - roofH} L${w * 0.84},${y0 - roofH} L${w * 1.04},${y0}Z" fill="${roof}"/>`;
    s += `<path d="M${w * 0.16},${y0 - roofH} L${w * 0.84},${y0 - roofH}" stroke="${H.shade(p.roof ?? "#b8483a", -0.25)}" stroke-width="8"/>`;
    for (let i = 1; i < 5; i++) s += `<line x1="${-w * 0.04 + i * w * 0.04}" y1="${y0 - i * roofH / 5}" x2="${w * 1.04 - i * w * 0.04}" y2="${y0 - i * roofH / 5}" stroke="rgba(0,0,0,.12)" stroke-width="3"/>`;
    s += `<rect x="${w * 0.6}" y="${y0 - roofH - w * 0.1}" width="${w * 0.08}" height="${w * 0.14}" fill="#8a5a4a"/>`;
    s += `<rect x="0" y="${y0}" width="${w}" height="${wallH}" fill="${wall}"/><rect x="0" y="${y0}" width="${w}" height="10" fill="rgba(0,0,0,.15)"/>`;
    s += `<rect x="${w * 0.9}" y="${y0}" width="${w * 0.1}" height="${wallH}" fill="rgba(0,0,0,.07)"/>`;
    const win = (x, y) => `<rect x="${x - 8}" y="${y - 8}" width="${w * 0.14 + 16}" height="${fh * 0.5 + 16}" fill="#fbf8f2"/><rect x="${x}" y="${y}" width="${w * 0.14}" height="${fh * 0.5}" fill="#7d93a6"/><path d="M${x + w * 0.07},${y} V${y + fh * 0.5} M${x},${y + fh * 0.18} H${x + w * 0.14}" stroke="#fbf8f2" stroke-width="5"/><path d="M${x - 14},${y - 10} q${w * 0.07 + 14},-26 ${w * 0.14 + 28},0" fill="#fbf8f2"/>`;
    for (let f = 0; f < fl; f++) {
      const y = y0 + f * fh + fh * 0.22;
      const xs = f === fl - 1 ? [w * 0.1, w * 0.32] : [w * 0.1, w * 0.32, w * 0.76];
      xs.forEach((x) => (s += win(x, y)));
      if (f < fl - 1) s += `<rect x="0" y="${y0 + (f + 1) * fh - 6}" width="${w}" height="10" fill="${H.shade(p.wall ?? "#f2d9b0", -0.1)}"/>`;
    }
    // porch with the blue door on the ground floor
    const dx = w * 0.62, dW = w * 0.2, dH = fh * 0.78, dy = y0 + wallH - dH;
    s += `<rect x="${dx - 14}" y="${dy - 14}" width="${dW + 28}" height="${dH + 14}" fill="#fbf8f2"/><rect x="${dx}" y="${dy}" width="${dW}" height="${dH}" fill="${door}"/>`;
    s += `<rect x="${dx + dW * 0.15}" y="${dy + dH * 0.1}" width="${dW * 0.7}" height="${dH * 0.32}" fill="none" stroke="${H.shade(p.door ?? "#2f6fc0", -0.25)}" stroke-width="5"/><rect x="${dx + dW * 0.15}" y="${dy + dH * 0.5}" width="${dW * 0.7}" height="${dH * 0.38}" fill="none" stroke="${H.shade(p.door ?? "#2f6fc0", -0.25)}" stroke-width="5"/>`;
    s += `<circle cx="${dx + dW * 0.82}" cy="${dy + dH * 0.5}" r="6" fill="#e0c060"/>`;
    s += `<path d="M${dx - 30},${dy - 16} L${dx + dW / 2},${dy - 50} L${dx + dW + 30},${dy - 16}Z" fill="${roof}"/>`;
    s += `<rect x="${dx - 26}" y="${y0 + wallH}" width="${dW + 52}" height="${w * 0.04}" fill="#b9ab96"/>`;
    s += `<rect x="${dx + dW + 30}" y="${dy + 10}" width="10" height="40" fill="#2e3a44"/><circle cx="${dx + dW + 35}" cy="${dy + 4}" r="11" fill="#fff2c0"/>`;
    s += `<ellipse cx="${w / 2}" cy="${h - 4}" rx="${w * 0.55}" ry="10" fill="rgba(0,0,0,.18)"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};
