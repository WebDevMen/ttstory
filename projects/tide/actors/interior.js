// «Обратный прилив» — interiors: stairwell of a Soviet panel block (hall / stairs / ceiling), lift intercom speaker,
// kitchen with bathroom scale and gas stove, water crawling UP a wall, wet footprints on a ceiling, lift shaft in the
// basement (helmet-cam view), lift cabin (CCTV / hatch), and the archive document: section of the 9-storey block.
// Full-frame scenes have origin top-left and are 1080 x 1920 (or w/h). Cold steel light; red only for danger.

const RED = "#e3262f", WHITE = "#f2f4f6", GREY = "#8a96a2", STEEL = "#3c4650";
const MONO = `"IBM Plex Mono", monospace`;

// ------------------------------------------------------------------ stairwell
// view: hall | stairs | ceiling; door (track 0..1: flat door opens, warm light), lamp (track 0..1), swing (track: lamp swing amp),
// wall (lower paint colour), floor_y
export const stairwell = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, view = p.view ?? "hall", R = H.rng(p.seed ?? 11), id = H.uid("sw");
    const wall = p.wall ?? "#3d5566", wall2 = "#c3c7c1", fy = p.floor_y ?? 1500, dado = fy - 640;
    let s = `<defs><linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(wall, 0.12)}"/><stop offset="1" stop-color="${H.shade(wall, -0.25)}"/></linearGradient>
      <radialGradient id="${id}g" cx=".5" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e767d"/><stop offset=".5" stop-color="#a2a9ae"/><stop offset="1" stop-color="#5d656c"/></linearGradient>
      <radialGradient id="${id}d" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffb25a" stop-opacity="0"/></radialGradient></defs>`;
    const grime = (x0, y0, x1, y1, n, c = "#000") => { let g = ""; for (let i = 0; i < n; i++) g += `<ellipse cx="${x0 + R() * (x1 - x0)}" cy="${y0 + R() * (y1 - y0)}" rx="${10 + R() * 70}" ry="${6 + R() * 40}" fill="${c}" opacity="${0.03 + R() * 0.06}"/>`; return g; };
    if (view === "ceiling") {
      // looking up: whitewashed ceiling slab, seams, cable, lamp; walls at the edges in perspective
      s += `<rect width="${w}" height="${h}" fill="#b9bdb8"/>${grime(0, 0, w, h, 60)}
        <path d="M0,0 L180,260 L180,${h - 260} L0,${h} Z" fill="${H.shade(wall2, -0.25)}"/><path d="M${w},0 L${w - 180},260 L${w - 180},${h - 260} L${w},${h} Z" fill="${H.shade(wall2, -0.35)}"/>
        <path d="M0,${h} L180,${h - 260} L${w - 180},${h - 260} L${w},${h} Z" fill="url(#${id}l)"/>
        <line x1="180" y1="${h * 0.42}" x2="${w - 180}" y2="${h * 0.42}" stroke="#8c918c" stroke-width="4"/>
        <line x1="180" y1="${h * 0.72}" x2="${w - 180}" y2="${h * 0.72}" stroke="#8c918c" stroke-width="3"/>
        <path d="M${w / 2},260 C${w / 2 + 40},500 ${w / 2 - 30},700 ${w / 2},${h * 0.5}" stroke="#2a2f35" stroke-width="5" fill="none"/>
        <g class="lamp"><circle cx="${w / 2}" cy="${h * 0.5}" r="160" fill="#fff6e0" opacity=".25" style="filter:blur(30px)"/><circle cx="${w / 2}" cy="${h * 0.5}" r="34" fill="#fffaf0"/><rect x="${w / 2 - 18}" y="${h * 0.5 - 60}" width="36" height="30" fill="#2a2f35"/></g>`;
    } else if (view === "stairs") {
      // flight going up to the right; landing window with rain; railing; walls two-tone
      s += `<rect width="${w}" height="${h}" fill="${wall2}"/>${grime(0, 0, w, h * 0.5, 30)}
        <rect y="${dado - 300}" width="${w}" height="${h}" fill="url(#${id}l)"/>
        <rect y="${dado - 304}" width="${w}" height="6" fill="${H.shade(wall, -0.4)}"/>
        <rect x="${w * 0.58}" y="260" width="300" height="420" fill="#1c252e" stroke="#8c918c" stroke-width="14"/><path d="M${w * 0.58 + 150},260 v420 M${w * 0.58},470 h300" stroke="#8c918c" stroke-width="8"/>
        <rect class="winrain" x="${w * 0.58 + 7}" y="267" width="286" height="406" fill="#5a6874" opacity=".35"/>`;
      // steps
      const n = 13, x0 = -40, y0 = h - 120, sx = 92, sy = 82;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * sx, y = y0 - i * sy;
        s += `<path d="M${x},${y} L${x + sx},${y} L${x + sx},${y + 30} L${x},${y + 30} Z" fill="#6f6a63"/><path d="M${x},${y + 30} L${x + sx},${y + 30} L${x + sx},${y + sy + 30} L${x},${y + sy + 30} Z" fill="#4b4741"/>`;
      }
      s += `<path d="M${x0},${y0 + 30} L${x0 + n * sx},${y0 - (n - 1) * sy + 30} L${x0 + n * sx},${h} L${x0},${h} Z" fill="#3a3632"/>`;
      // railing
      for (let i = 0; i < n; i += 1) { const x = x0 + i * sx + sx / 2, y = y0 - i * sy; s += `<rect x="${x - 4}" y="${y - 330}" width="8" height="330" fill="#2a2f35"/>`; }
      s += `<path d="M${x0},${y0 - 330} L${x0 + n * sx},${y0 - (n - 1) * sy - 330}" stroke="#5a3a26" stroke-width="22" stroke-linecap="round"/><path d="M${x0},${y0 - 336} L${x0 + n * sx},${y0 - (n - 1) * sy - 336}" stroke="#8a5a3a" stroke-width="6"/>`;
    } else {
      // hall: lift doors in the centre, mailboxes + radiator left, padded door of flat 1 right
      s += `<rect width="${w}" height="${h}" fill="${wall2}"/>${grime(0, 200, w, dado, 40)}
        <rect y="0" width="${w}" height="230" fill="#a9ada8"/><rect y="226" width="${w}" height="8" fill="#8c918c"/>
        <rect y="${dado}" width="${w}" height="${fy - dado}" fill="url(#${id}l)"/>${grime(0, dado, w, fy, 30)}
        <rect y="${dado - 4}" width="${w}" height="8" fill="${H.shade(wall, -0.45)}"/>
        <rect y="${fy}" width="${w}" height="${h - fy}" fill="#4f4339"/>`;
      for (let x = -40; x < w; x += 90) s += `<path d="M${x},${fy} L${x - 80 + (x - w / 2) * 0.5},${h}" stroke="#3a312a" stroke-width="3"/>`;
      for (let y = fy + 50; y < h; y += 70 + (y - fy) * 0.25) s += `<line x1="0" x2="${w}" y1="${y}" y2="${y}" stroke="#3a312a" stroke-width="3"/>`;
      s += `<rect y="${fy - 30}" width="${w}" height="30" fill="${H.shade(wall, -0.5)}"/>`;
      // lift
      const lx = w / 2 - 170, ly = fy - 900;
      s += `<rect x="${lx - 30}" y="${ly - 40}" width="400" height="${900 + 40}" fill="#2c3238"/>
        <rect x="${lx}" y="${ly}" width="340" height="900" fill="url(#${id}s)"/>
        <rect class="ldoor" x="${lx}" y="${ly}" width="170" height="900" fill="url(#${id}s)"/><rect class="rdoor" x="${lx + 170}" y="${ly}" width="170" height="900" fill="url(#${id}s)"/>
        <line x1="${lx + 170}" x2="${lx + 170}" y1="${ly}" y2="${ly + 900}" stroke="#30363b" stroke-width="4"/>
        ${grime(lx, ly, lx + 340, ly + 900, 14, "#20262b")}
        <rect x="${lx + 360}" y="${ly + 380}" width="44" height="110" rx="6" fill="#2a2f35"/><circle cx="${lx + 382}" cy="${ly + 420}" r="12" fill="#a2a9ae"/><circle cx="${lx + 382}" cy="${ly + 460}" r="12" fill="#a2a9ae"/>
        <rect x="${lx + 110}" y="${ly - 110}" width="120" height="44" fill="#121518"/><text x="${lx + 170}" y="${ly - 78}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="28" fill="#c9d4dc">ЛИФТ</text>`;
      // mailboxes + radiator
      s += `<rect x="50" y="${ly + 120}" width="290" height="300" fill="#4c5a50"/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const x = 58 + c * 94, y = ly + 128 + r * 72; s += `<rect x="${x}" y="${y}" width="88" height="66" fill="#5d6d62" stroke="#3a463e" stroke-width="3"/><rect x="${x + 14}" y="${y + 14}" width="60" height="8" fill="#20262b"/><text x="${x + 44}" y="${y + 52}" text-anchor="middle" font-family="IBM Plex Mono" font-size="18" fill="#c9d4dc">${r * 3 + c + 1}</text>`; }
      s += `<g>${Array.from({ length: 11 }, (_, i) => `<rect x="${60 + i * 25}" y="${fy - 280}" width="18" height="200" rx="6" fill="#7b838a"/>`).join("")}<rect x="54" y="${fy - 270}" width="280" height="10" fill="#5a6168"/><rect x="54" y="${fy - 110}" width="280" height="10" fill="#5a6168"/></g>
        <path d="M330,${fy - 200} H420 V${fy - 30}" stroke="#5a6168" stroke-width="12" fill="none"/>`;
      // flat 1 door (padded) — opens to warm light
      const dx = w - 290, dy = fy - 860;
      s += `<rect x="${dx - 24}" y="${dy - 24}" width="288" height="${860 + 24}" fill="#2a2f35"/>
        <rect x="${dx}" y="${dy}" width="240" height="860" fill="#ffcf8a"/><rect x="${dx}" y="${dy}" width="240" height="860" fill="url(#${id}d)"/>
        <g class="fdoor"><rect x="${dx}" y="${dy}" width="240" height="860" fill="#5a3a2a"/>
          ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<circle cx="${dx + 40 + c * 80}" cy="${dy + 80 + r * 140}" r="6" fill="#c9a26a"/>`).join("")).join("")}
          <path d="${Array.from({ length: 6 }, (_, r) => `M${dx},${dy + 10 + r * 140} L${dx + 240},${dy + 150 + r * 140} M${dx + 240},${dy + 10 + r * 140} L${dx},${dy + 150 + r * 140}`).join(" ")}" stroke="#3a2418" stroke-width="3" opacity=".7"/>
          <circle cx="${dx + 120}" cy="${dy + 300}" r="9" fill="#c9a26a"/><rect x="${dx + 196}" y="${dy + 430}" width="26" height="70" rx="6" fill="#c9a26a"/>
          <text x="${dx + 120}" y="${dy + 220}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="40" fill="#c9a26a">1</text></g>`;
      // ceiling lamp + wires, cables along the wall
      s += `<path d="M0,300 H${w}" stroke="#2a2f35" stroke-width="5" opacity=".7"/><path d="M${w - 40},300 V${dado}" stroke="#2a2f35" stroke-width="5" opacity=".7"/>`;
      s += `<g class="lamp"><line x1="${w / 2}" y1="0" x2="${w / 2}" y2="120" stroke="#2a2f35" stroke-width="4"/><circle cx="${w / 2}" cy="140" r="200" fill="#fff6e0" opacity=".18" style="filter:blur(30px)"/><circle cx="${w / 2}" cy="140" r="26" fill="#fffaf0"/></g>`;
    }
    s += `<rect width="${w}" height="${h}" fill="url(#${id}g)"/>`;
    const svg = H.svg(s, w, h);
    const fdoor = svg.querySelector(".fdoor"), lamp = svg.querySelector(".lamp");
    return {
      el: svg, w, h,
      update(t, it) {
        if (fdoor) { const o = it.v("door", 0); fdoor.style.transformOrigin = `${w - 290}px 0px`; fdoor.style.transform = `perspective(1200px) rotateY(${-o * 75}deg)`; }
        if (lamp) {
          const sw = it.v("swing", 0), on = it.v("lamp", 1);
          lamp.style.transformOrigin = `${w / 2}px 0px`;
          lamp.style.transform = `rotate(${sw * Math.sin(t * 5.5)}deg)`;
          lamp.style.opacity = on * (it.v("flicker", 0) ? (H.noise(t * 9, 3, 1) > -0.3 ? 1 : 0.25) : 1);
        }
      },
      anchor(name) { if (name === "lift") return [w / 2, fy - 450]; if (name === "door") return [w - 170, fy - 430]; if (name === "speaker") return [w / 2, fy - 1010]; return null; },
    };
  },
};

// ------------------------------------------------------------------ intercom: round speaker grille on a steel plate; talk (track 0..1) pulses a ring + level bars
export const intercom = {
  backdrop: true,
  origin: "center",
  create(p, H) {
    const r = p.r ?? 120, w = r * 2 + 60, h = r * 2 + 60, c = w / 2;
    let holes = "";
    for (let y = -r + 18; y < r; y += 22) for (let x = -r + 18; x < r; x += 22) if (x * x + y * y < (r - 22) ** 2) holes += `<circle cx="${c + x}" cy="${c + y}" r="6" fill="#0d1013"/>`;
    const svg = H.svg(`<rect x="0" y="0" width="${w}" height="${h}" rx="18" fill="#5d656c"/><rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="16" fill="none" stroke="#a2a9ae" stroke-opacity=".5" stroke-width="3"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="#2a2f35"/>${holes}
      <circle class="ring" cx="${c}" cy="${c}" r="${r + 6}" fill="none" stroke="${WHITE}" stroke-width="4" opacity="0"/>
      ${[[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#30363b"/>`).join("")}`, w, h);
    const ring = svg.querySelector(".ring");
    return {
      el: svg, w, h,
      update(t, it) { const k = it.v("talk", 0); const a = k * (0.4 + 0.6 * Math.abs(H.noise(t * 6, 2, 1))); ring.setAttribute("opacity", a); ring.setAttribute("r", r + 6 + a * 18); },
    };
  },
};

// ------------------------------------------------------------------ kitchen: tiled Soviet kitchen, window with rain on the right, towels on a line, barometer
export const kitchen = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, fy = p.floor_y ?? 1480, R = H.rng(4), id = H.uid("kt");
    let s = `<defs><radialGradient id="${id}" cx=".75" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="#8f9a94"/><rect y="${fy - 700}" width="${w}" height="700" fill="#d7dad6"/>`;
    for (let y = fy - 700; y < fy; y += 60) for (let x = (y / 60) % 2 ? 0 : -30; x < w; x += 60) s += `<rect x="${x + 2}" y="${y + 2}" width="56" height="56" fill="#e2e5e1" opacity="${0.6 + R() * 0.4}"/>`;
    s += `<rect y="${fy}" width="${w}" height="${h - fy}" fill="#5c4f42"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M${i * 140 - 100},${fy} L${i * 160 - 300},${h}" stroke="#4a3f35" stroke-width="3"/>`;
    // window
    s += `<rect x="${w - 330}" y="${fy - 1150}" width="300" height="440" fill="#26313b" stroke="#e8eae6" stroke-width="16"/><path d="M${w - 180},${fy - 1150} v440 M${w - 330},${fy - 960} h300" stroke="#e8eae6" stroke-width="10"/>
      <rect x="${w - 360}" y="${fy - 712}" width="360" height="22" fill="#e8eae6"/>`;
    // barometer + clock on the wall
    s += `<g transform="translate(330,${fy - 1060})"><circle r="70" fill="#5a3a26"/><circle r="56" fill="#efe9da"/><path d="M0,0 L30,-36" stroke="#20262b" stroke-width="5"/><circle r="6" fill="#20262b"/>
      <text y="34" text-anchor="middle" font-family="IBM Plex Mono" font-size="14" fill="#3a3a3a">ДОЖДЬ</text></g>`;
    // towel line
    s += `<path d="M120,${fy - 900} Q500,${fy - 860} 880,${fy - 900}" stroke="#30363b" stroke-width="3" fill="none"/>
      <rect x="230" y="${fy - 888}" width="120" height="170" fill="#c9d3da"/><rect x="420" y="${fy - 878}" width="100" height="150" fill="#d8c9b0"/><rect x="600" y="${fy - 880}" width="110" height="160" fill="#b9c3cc"/>`;
    // table edge right
    s += `<rect x="${w - 330}" y="${fy - 380}" width="330" height="26" fill="#d9d4c7"/><rect x="${w - 300}" y="${fy - 354}" width="18" height="354" fill="#8a8478"/><rect x="${w - 60}" y="${fy - 354}" width="18" height="354" fill="#8a8478"/>`;
    s += `<rect width="${w}" height="${h}" fill="url(#${id})"/>`;
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ bath_scale: floor scale (3/4 view) with a large LCD; kg (track), mark (old value, faded)
export const bath_scale = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 520, h = w * 0.42;
    const el = H.div(`width:${w}px;height:${h}px`);
    const svg = H.svg(`<ellipse cx="${w / 2}" cy="${h - 8}" rx="${w * 0.5}" ry="14" fill="#000" opacity=".4"/>
      <path d="M${w * 0.06},${h * 0.2} L${w * 0.94},${h * 0.2} L${w},${h - 26} L0,${h - 26} Z" fill="#c9cfd3"/>
      <path d="M0,${h - 26} L${w},${h - 26} L${w},${h - 10} L0,${h - 10} Z" fill="#8a96a2"/>
      <rect x="${w * 0.3}" y="${h * 0.26}" width="${w * 0.4}" height="${h * 0.3}" rx="8" fill="#1a1f24"/>`, w, h);
    const lcd = H.div(`left:${w * 0.3}px;top:${h * 0.26}px;width:${w * 0.4}px;height:${h * 0.3}px;font:600 ${h * 0.24}px/${h * 0.3}px "IBM Plex Mono", monospace;
      color:#d8f0ff;text-align:center;text-shadow:0 0 10px rgba(180,220,255,.6)`);
    el.append(svg, lcd);
    return {
      el, w, h,
      update(t, it) { const k = it.v("kg", 22); lcd.textContent = k.toFixed(1); lcd.style.color = it.v("alarm", 0) ? RED : "#d8f0ff"; },
    };
  },
};

// ------------------------------------------------------------------ stove: Soviet gas stove (front, slightly from above); fire (track 0..1) — blue flames
export const stove = {
  backdrop: true,
  origin: "bottom",
  create(p, H) {
    const w = 460, h = 720;
    const svg = H.svg(`<rect x="0" y="120" width="${w}" height="${h - 120}" fill="#e8eae6"/><rect x="0" y="${h - 40}" width="${w}" height="40" fill="#30363b"/>
      <path d="M0,120 L30,40 L${w - 30},40 L${w},120 Z" fill="#cfd3d0"/>
      ${[[120, 66], [w - 120, 66], [150, 102], [w - 150, 102]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="56" ry="16" fill="#30363b"/><ellipse cx="${x}" cy="${y - 4}" rx="34" ry="10" fill="#5a6168"/>`).join("")}
      <g class="fl"></g>
      ${Array.from({ length: 4 }, (_, i) => `<circle cx="${80 + i * 100}" cy="170" r="22" fill="#30363b"/><rect x="${76 + i * 100}" y="152" width="8" height="20" fill="#e8eae6"/>`).join("")}
      <rect x="40" y="230" width="${w - 80}" height="380" rx="10" fill="#d4d7d3" stroke="#a2a9ae" stroke-width="4"/><rect x="90" y="300" width="${w - 180}" height="200" rx="8" fill="#20262b"/>
      <rect x="80" y="250" width="${w - 160}" height="18" rx="9" fill="#a2a9ae"/>`, w, h);
    const fl = svg.querySelector(".fl");
    const burners = [[120, 62], [w - 120, 62], [150, 98], [w - 150, 98]];
    return {
      el: svg, w, h,
      update(t, it) {
        const f = it.v("fire", 0);
        fl.innerHTML = f > 0 ? burners.map(([x, y], b) => Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2, rx = Math.cos(a) * 36, ry = Math.sin(a) * 10, hh = (16 + 10 * Math.abs(H.noise(t * 8 + i + b * 3, 4, 1))) * f;
          return `<path d="M${x + rx - 5},${y + ry} Q${x + rx},${y + ry - hh * 1.2} ${x + rx + 5},${y + ry}" fill="#5aa8ff" opacity=".85"/>`;
        }).join("") + `<ellipse cx="${x}" cy="${y - 6}" rx="44" ry="18" fill="#4a90ff" opacity="${0.25 * f}" style="filter:blur(6px)"/>`).join("") : "";
      },
    };
  },
};

// ------------------------------------------------------------------ water_wall: tongues of water crawling UP a wall from the floor
// w, h (region; origin top-left, water starts at the bottom), n tongues, grow (track 0..1), color
export const water_wall = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1200, n = p.n ?? 9, R = H.rng(p.seed ?? 6), id = H.uid("ww");
    const tongues = Array.from({ length: n }, (_, i) => ({ x: (w * (i + 0.2 + R() * 0.6)) / n, wd: 40 + R() * 90, k: 0.45 + R() * 0.55, ph: R() * 6 }));
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3f0" stop-opacity=".75"/><stop offset=".15" stop-color="#7f9fb4" stop-opacity=".55"/><stop offset="1" stop-color="#2c4252" stop-opacity=".65"/></linearGradient></defs>
      <g class="t"></g>`, w, h);
    const g = svg.querySelector(".t");
    return {
      el: svg, w, h,
      update(t, it) {
        const gr = it.v("grow", 0);
        let s = "";
        for (const T of tongues) {
          const top = h - h * gr * T.k, x = T.x;
          if (gr <= 0.001) continue;
          let d = `M${x - T.wd / 2},${h}`;
          for (let y = h; y > top; y -= 40) d += ` L${x - T.wd / 2 + 10 * Math.sin(y * 0.03 + t * 2 + T.ph)},${y}`;
          d += ` Q${x},${top - 30} ${x + T.wd / 2},${top}`;
          for (let y = top; y < h; y += 40) d += ` L${x + T.wd / 2 + 10 * Math.sin(y * 0.03 + t * 2 + T.ph + 1)},${y}`;
          d += ` L${x + T.wd / 2},${h} Z`;
          s += `<path d="${d}" fill="url(#${id})"/><path d="M${x - T.wd * 0.2},${h} L${x - T.wd * 0.2},${top + 30}" stroke="#eaf4fa" stroke-opacity=".45" stroke-width="5"/>`;
          for (let j = 0; j < 3; j++) { const k = (t * 0.8 + T.ph + j / 3) % 1; s += `<ellipse cx="${x + (j - 1) * 12}" cy="${top - 20 - k * 160}" rx="5" ry="9" fill="#cfe3f0" opacity="${(1 - k) * 0.8}"/>`; }
        }
        g.innerHTML = s;
      },
    };
  },
};

// ------------------------------------------------------------------ footprints: wet bare footprints appearing one by one (on a ceiling, seen from below)
// path: [[x, y, angle], …] (local px), show (track: number of prints visible, fractional = fading in)
export const footprints = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const pts = p.path ?? [[300, 1400, -10], [420, 1250, -10], [330, 1080, -8], [460, 920, -8], [380, 760, -5], [520, 600, -5]];
    const foot = (left) => `<path d="M0,0 C-26,-6 -30,-60 -22,-96 C-16,-126 14,-128 20,-98 C26,-62 22,-6 0,0 Z" transform="scale(${left ? -1 : 1},1)"/>
      ${[[-16, -120, 9], [-4, -130, 8], [8, -128, 7], [18, -122, 6], [24, -112, 5]].map(([x, y, r]) => `<circle cx="${left ? -x : x}" cy="${y}" r="${r}"/>`).join("")}`;
    const svg = H.svg(pts.map(([x, y, a], i) => `<g class="fp" opacity="0" transform="translate(${x},${y}) rotate(${a}) scale(1.4)" fill="#5d6b74">${foot(i % 2)}</g>`).join(""), 1080, 1920);
    const els = [...svg.querySelectorAll(".fp")];
    return {
      el: svg, w: 1080, h: 1920,
      update(t, it) { const n = it.v("show", 0); els.forEach((e, i) => e.setAttribute("opacity", Math.max(0, Math.min(1, n - i)) * 0.75)); },
    };
  },
};

// ------------------------------------------------------------------ lift_pit: helmet-cam view in the basement: shaft door with a key, opens onto the dry cabin
// turn (track 0..1: key turns), open (track 0..1: doors slide), light (cabin light)
export const lift_pit = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, id = H.uid("lpit");
    const dx = 230, dy = 420, dw = 620, dh = 1180;
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d656c"/><stop offset=".5" stop-color="#8f979d"/><stop offset="1" stop-color="#4f575e"/></linearGradient>
        <radialGradient id="${id}c" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#f5f1e6"/><stop offset="1" stop-color="#9a958a"/></radialGradient>
        <radialGradient id="${id}v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="#3a3f43"/>
      ${Array.from({ length: 30 }, (_, i) => `<rect x="${(i % 6) * 190 - 20}" y="${Math.floor(i / 6) * 420}" width="186" height="416" fill="#43494e" opacity=".6"/>`).join("")}
      <path d="M0,240 H${w}" stroke="#5a3a26" stroke-width="26"/><path d="M0,300 H${w}" stroke="#30363b" stroke-width="16"/><path d="M0,330 H${w}" stroke="#7b838a" stroke-width="10"/>
      <rect x="${dx - 40}" y="${dy - 50}" width="${dw + 80}" height="${dh + 50}" fill="#22272b"/>
      <g class="cab"><rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" fill="url(#${id}c)"/>
        <rect x="${dx}" y="${dy + dh - 160}" width="${dw}" height="160" fill="#6a5a4a"/>
        <rect x="${dx + 40}" y="${dy + 60}" width="${dw - 80}" height="${dh - 260}" fill="none" stroke="#b8b2a4" stroke-width="6"/>
        <rect x="${dx + dw - 110}" y="${dy + 420}" width="50" height="200" rx="6" fill="#5d656c"/>
        <rect x="${dx + 200}" y="${dy + 10}" width="220" height="30" rx="6" fill="#fffef6"/></g>
      <rect class="ld" x="${dx}" y="${dy}" width="${dw / 2}" height="${dh}" fill="url(#${id})"/><rect class="rd" x="${dx + dw / 2}" y="${dy}" width="${dw / 2}" height="${dh}" fill="url(#${id})"/>
      <g class="key"><circle cx="${dx + dw / 2 + 120}" cy="${dy + 300}" r="26" fill="#20262b"/><path d="M${dx + dw / 2 + 108},${dy + 312} l12,-24 l12,24 z" fill="#5d656c"/>
        <g class="kh"><rect x="${dx + dw / 2 + 114}" y="${dy + 290}" width="12" height="80" fill="#c9cfd3"/><circle cx="${dx + dw / 2 + 120}" cy="${dy + 390}" r="34" fill="none" stroke="#c9cfd3" stroke-width="12"/>
          <rect x="${dx + dw / 2 + 96}" y="${dy + 420}" width="48" height="26" rx="4" fill="#ffd23a"/></g></g>
      <rect y="${dy + dh}" width="${w}" height="${h - dy - dh}" fill="#2a2e31"/>
      <path class="glove" d="M${dx + dw / 2 + 70},${dy + 700} C${dx + dw / 2 + 60},${dy + 520} ${dx + dw / 2 + 90},${dy + 430} ${dx + dw / 2 + 150},${dy + 420} C${dx + dw / 2 + 210},${dy + 430} ${dx + dw / 2 + 240},${dy + 520} ${dx + dw / 2 + 230},${dy + 700} L${dx + dw / 2 + 320},${h} L${dx + dw / 2 - 20},${h} Z" fill="#2b2f33"/>
      <rect width="${w}" height="${h}" fill="url(#${id}v)"/>`, w, h);
    const ld = svg.querySelector(".ld"), rd = svg.querySelector(".rd"), kh = svg.querySelector(".kh"), glove = svg.querySelector(".glove"), cab = svg.querySelector(".cab");
    return {
      el: svg, w, h,
      update(t, it) {
        const o = it.v("open", 0), tr = it.v("turn", 0), hand = it.v("hand", 1);
        ld.setAttribute("x", dx - o * dw * 0.48); rd.setAttribute("x", dx + dw / 2 + o * dw * 0.48);
        kh.style.transformOrigin = `${dx + dw / 2 + 120}px ${dy + 300}px`; kh.style.transform = `rotate(${tr * 90}deg)`;
        glove.style.transformOrigin = `${dx + dw / 2 + 150}px ${dy + 400}px`; glove.style.transform = `rotate(${tr * 50}deg) translateY(${(1 - hand) * 900}px)`;
        cab.style.filter = `brightness(${0.4 + 0.6 * it.v("light", 1)})`;
      },
    };
  },
};

// ------------------------------------------------------------------ lift_cabin: cabin interior from the corner CCTV (wide, converging walls) or view: hatch (looking up at the roof hatch)
// tape (track 0..4: strips of tape across the door seam), floor (track: number shown on the floor display), flicker (track 0..1), hatch (track 0..1: open)
export const lift_cabin = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, id = H.uid("lc"), view = p.view ?? "cctv";
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8070"/><stop offset="1" stop-color="#b8ae9a"/></linearGradient>
      <radialGradient id="${id}w" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#eef3f6"/><stop offset="1" stop-color="#9fb0bd"/></radialGradient></defs>`;
    if (view === "hatch") {
      s += `<rect width="${w}" height="${h}" fill="#4a4f53"/><path d="M0,0 L220,520 L860,520 L${w},0 Z" fill="#5d656c"/><path d="M0,${h} L220,1400 L860,1400 L${w},${h} Z" fill="#3a3f43"/>
        <path d="M0,0 L220,520 L220,1400 L0,${h} Z" fill="url(#${id})"/><path d="M${w},0 L860,520 L860,1400 L${w},${h} Z" fill="#9a907c"/>
        <rect x="220" y="520" width="640" height="880" fill="#6a6f73"/>
        <rect class="sky" x="300" y="600" width="480" height="720" fill="url(#${id}w)"/>
        <rect class="lid" x="300" y="600" width="480" height="720" fill="#30363b" stroke="#7b838a" stroke-width="10"/>`;
    } else {
      // corner CCTV: far wall with doors, side walls converging, floor
      s += `<rect width="${w}" height="${h}" fill="#5c5446"/>
        <path d="M0,0 L250,560 L830,560 L${w},0 Z" fill="#cfcabc"/><rect x="380" y="0" width="320" height="300" fill="#fffef4" opacity=".55" style="filter:blur(26px)"/>
        <path d="M0,0 L250,560 L250,1500 L0,${h} Z" fill="url(#${id})"/><path d="M${w},0 L830,560 L830,1500 L${w},${h} Z" fill="#a69c88"/>
        <rect x="250" y="560" width="580" height="940" fill="#9a907c"/>
        <rect x="300" y="600" width="480" height="900" fill="#8a96a2"/><line x1="540" y1="600" x2="540" y2="1500" stroke="#3c4650" stroke-width="5"/>
        <rect x="300" y="600" width="480" height="900" fill="none" stroke="#5d656c" stroke-width="8"/>
        <path d="M0,${h} L250,1500 L830,1500 L${w},${h} Z" fill="#4a4036"/>
        <rect x="860" y="760" width="120" height="380" rx="8" fill="#5d656c"/><rect class="disp" x="872" y="780" width="96" height="70" fill="#101316"/>
        <g class="btns">${Array.from({ length: 10 }, (_, i) => `<circle cx="${890 + (i % 2) * 60}" cy="${890 + Math.floor(i / 2) * 48}" r="16" fill="#a2a9ae"/>`).join("")}</g>
        <g class="tape"></g>`;
    }
    const svg = H.svg(s, w, h);
    const disp = svg.querySelector(".disp"), tape = svg.querySelector(".tape"), lid = svg.querySelector(".lid");
    const num = H.div(`left:872px;top:780px;width:96px;height:70px;font:600 52px/70px ${MONO};color:${RED};text-align:center;text-shadow:0 0 8px rgba(227,38,47,.7)`);
    const el = H.div(`width:${w}px;height:${h}px`);
    el.append(svg);
    if (disp) el.append(num);
    return {
      el, w, h,
      update(t, it) {
        if (disp) { const f = it.v("floor", 1); num.textContent = f >= 1 ? String(Math.floor(f)) : "--"; num.style.opacity = it.v("disp_on", 1); }
        if (tape) {
          const n = it.v("tape", 0); let d = "";
          for (let i = 0; i < 4; i++) { const k = Math.max(0, Math.min(1, n - i)); if (k <= 0) continue; const y = 700 + i * 200; d += `<rect x="${540 - 110 * k}" y="${y}" width="${220 * k}" height="46" fill="#c9b98a" opacity=".92" transform="rotate(${(i % 2 ? 4 : -3)} 540 ${y})"/>`; }
          tape.innerHTML = d;
        }
        if (lid) { const o = it.v("hatch", 0); lid.setAttribute("y", 600 - o * 700); }
        el.style.filter = `brightness(${it.v("flicker", 0) ? (H.noise(t * 11, 7, 1) > 0 ? 1 : 0.35) : 1})`;
      },
    };
  },
};

// ------------------------------------------------------------------ house_section: archive document — section of the 9-storey block
// water (track: flooded floors from the top, e.g. 1 = 9th floor, 1.6 = 9th + 60% of 8th), roof (track 0..1 highlight + arrows up),
// pit (track 0..1 highlight of the lift pit), heli (track 0..1), timer (string), danger (track 0..1 red marks)
export const house_section = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, x0 = 250, x1 = 830, top = 470, fh = 100, fl = 9, base = top + fl * fh, bsm = 120;
    let s = `<rect width="${w}" height="${h}" fill="#15191d"/>`;
    for (let x = 0; x < w; x += 40) s += `<line x1="${x}" x2="${x}" y1="0" y2="${h}" stroke="#1f252b" stroke-width="2"/>`;
    for (let y = 0; y < h; y += 40) s += `<line y1="${y}" y2="${y}" x1="0" x2="${w}" stroke="#1f252b" stroke-width="2"/>`;
    s += `<text x="70" y="400" font-family="IBM Plex Mono" font-size="26" fill="${GREY}" letter-spacing="2">ДОК. 07-14 · РАЗРЕЗ 1-1 · Ж/Д УЛ. РЕЧНАЯ, 12</text>`;
    s += `<g class="water"></g>`;
    s += `<g fill="none" stroke="${WHITE}" stroke-width="4"><rect x="${x0}" y="${top}" width="${x1 - x0}" height="${fl * fh}"/><rect x="${x0}" y="${base}" width="${x1 - x0}" height="${bsm}" stroke-dasharray="14 10"/></g>`;
    for (let f = 1; f < fl; f++) s += `<line x1="${x0}" x2="${x1}" y1="${top + f * fh}" y2="${top + f * fh}" stroke="${WHITE}" stroke-width="3"/>`;
    for (let f = 0; f < fl; f++) s += `<text x="${x0 - 24}" y="${top + f * fh + 62}" text-anchor="end" font-family="IBM Plex Mono" font-weight="600" font-size="32" fill="${WHITE}">${fl - f}</text>`;
    // stairs zigzag + lift shaft
    s += `<path d="${Array.from({ length: fl }, (_, f) => `M${x0 + 40},${top + (f + 1) * fh} L${x0 + 180},${top + f * fh + 10}`).join(" ")}" stroke="${GREY}" stroke-width="3"/>
      <rect x="${x1 - 150}" y="${top}" width="90" height="${fl * fh + bsm}" fill="none" stroke="${GREY}" stroke-width="3" stroke-dasharray="8 6"/>
      <rect class="cab" x="${x1 - 140}" y="${base + bsm - 80}" width="70" height="76" fill="${WHITE}" opacity=".85"/>
      <text x="${x1 + 20}" y="${base + bsm - 30}" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">ЯМА ЛИФТА</text>
      <text x="${x0 + 10}" y="${base + bsm - 30}" font-family="IBM Plex Mono" font-size="24" fill="${GREY}">ПОДВАЛ</text>`;
    // roof: highlight, arrows, helicopter
    s += `<g class="roof" opacity="0"><rect x="${x0 - 10}" y="${top - 22}" width="${x1 - x0 + 20}" height="22" fill="${WHITE}"/>
      ${[0.25, 0.5, 0.75].map((k) => `<path d="M${x0 + (x1 - x0) * k},${top - 40} v-90 m-22,26 l22,-26 l22,26" stroke="${WHITE}" stroke-width="5" fill="none"/>`).join("")}
      <text x="${x1 + 20}" y="${top - 2}" font-family="IBM Plex Mono" font-size="24" fill="${WHITE}">КРЫША</text></g>
      <g class="heli" opacity="0" transform="translate(${(x0 + x1) / 2 + 160},${top - 230})"><path d="M-70,0 h140 M0,0 v14" stroke="${WHITE}" stroke-width="5"/><ellipse cx="0" cy="34" rx="44" ry="22" fill="none" stroke="${WHITE}" stroke-width="5"/><path d="M40,34 h70 l10,-14" stroke="${WHITE}" stroke-width="5" fill="none"/></g>
      <g class="pit" opacity="0"><rect x="${x1 - 160}" y="${base + bsm - 92}" width="110" height="100" fill="none" stroke="${WHITE}" stroke-width="6"/></g>
      <text class="timer" x="${x1 + 20}" y="${top + 160}" font-family="IBM Plex Mono" font-weight="600" font-size="34" fill="${WHITE}"></text>`;
    const svg = H.svg(s, w, h);
    const water = svg.querySelector(".water"), roof = svg.querySelector(".roof"), heli = svg.querySelector(".heli"), pit = svg.querySelector(".pit"), timer = svg.querySelector(".timer");
    return {
      el: svg, w, h,
      update(t, it) {
        const wl = it.v("water", 0), dz = it.v("danger", 0);
        let d = "";
        if (wl > 0) {
          const hh = Math.min(fl, wl) * fh;
          d += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${hh}" fill="#7fa8c4" opacity=".55"/>`;
          let wave = `M${x0},${top + hh}`;
          for (let x = x0; x <= x1; x += 20) wave += ` L${x},${top + hh + 5 * Math.sin(x * 0.05 + t * 3)}`;
          d += `<path d="${wave}" stroke="#cfe3f0" stroke-width="4" fill="none"/>`;
          for (let i = 0; i < 8; i++) { const k = (t * 0.7 + i / 8) % 1; d += `<path d="M${x0 + 30 + i * 70},${top + hh + 40 - k * 60} v-16" stroke="#cfe3f0" stroke-width="3" opacity="${1 - k}"/>`; }
          if (dz) d += `<text x="${x0 + (x1 - x0) / 2}" y="${top + hh - 20}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="30" fill="${RED}" opacity="${dz}">ВОДА ▼</text>`;
        }
        water.innerHTML = d;
        roof.setAttribute("opacity", it.v("roof", 0)); heli.setAttribute("opacity", it.v("heli", 0)); pit.setAttribute("opacity", it.v("pit", 0));
        timer.textContent = it.v("timer", "");
      },
    };
  },
};
