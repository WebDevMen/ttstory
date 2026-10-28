// «Чёрный рынок невозможного» — places: the market hall inside the abandoned cold-storage plant (one-point perspective),
// the roller gate seen from inside, the plant facade, port cranes, shipping containers (side / corridor), the North pier
// with the lighthouse, a semi truck. Full-frame scenes: origin top-left, 1080 x 1920 (or w/h).
// Light: caged bulbs and sodium lamps (warm) against cold concrete; fog thickens with depth.

const RED = "#e0283a", WARM = "#f2ede4", SODIUM = "#e8a23a";
const MONO = `"IBM Plex Mono", monospace`, COND = `"Oswald", sans-serif`;

// ------------------------------------------------------------------ market_hall: long cold-storage hall turned into a market
// w, h, vp [x, y] (vanishing point), lights (track 0..1: share of lamps lit, near → far), gate (track 0..1: far gate open),
// crowd (count of far silhouettes), stalls (bool), lamp_sway (lamp swing), seed, fog (0..1)
export const market_hall = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, vp = p.vp ?? [w / 2, 860], R = H.rng(p.seed ?? 7), id = H.uid("mh");
    const [vx, vy] = vp, fog = p.fog ?? 0.7;
    // depth slices: z = 1 (near, screen plane) .. far; screen pos = vp + (P - vp) / z
    const proj = (x, y, z) => [vx + (x - vx) / z, vy + (y - vy) / z];
    const L = -260, Rr = w + 260, CEIL = -180, FLOOR = h + 40;            // the hall's cross-section at z = 1
    const back = 9;                                                     // far wall depth
    const pts = (a) => a.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
    let s = `<defs>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f35"/><stop offset="1" stop-color="#121417"/></linearGradient>
      <linearGradient id="${id}c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1e2226"/><stop offset="1" stop-color="#0b0c0e"/></linearGradient>
      <linearGradient id="${id}wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#16191c"/><stop offset="1" stop-color="#2e3439"/></linearGradient>
      <linearGradient id="${id}wr" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#121417"/><stop offset="1" stop-color="#2b3136"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".9"/><stop offset=".25" stop-color="#ffcf7a" stop-opacity=".35"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdca0" stop-opacity=".28"/><stop offset="1" stop-color="#ffdca0" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}fog" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8a96a2" stop-opacity="${0.55 * fog}"/><stop offset="1" stop-color="#8a96a2" stop-opacity="0"/></radialGradient>
      <filter id="${id}b"><feGaussianBlur stdDeviation="10"/></filter><filter id="${id}b2"><feGaussianBlur stdDeviation="3"/></filter></defs>`;
    const A = proj(L, CEIL, back), B = proj(Rr, CEIL, back), C = proj(Rr, FLOOR, back), D = proj(L, FLOOR, back);
    // surfaces
    s += `<rect width="${w}" height="${h}" fill="#0d0f11"/>
      <polygon points="${pts([[L, CEIL], [Rr, CEIL], B, A])}" fill="url(#${id}c)"/>
      <polygon points="${pts([[L, FLOOR], [Rr, FLOOR], C, D])}" fill="url(#${id}f)"/>
      <polygon points="${pts([[L, CEIL], A, D, [L, FLOOR]])}" fill="url(#${id}wl)"/>
      <polygon points="${pts([[Rr, CEIL], B, C, [Rr, FLOOR]])}" fill="url(#${id}wr)"/>`;
    // far wall + roller gate
    s += `<polygon points="${pts([A, B, C, D])}" fill="#22272c"/><g class="gate"></g>`;
    // floor tiles / wet streaks
    for (let i = 1; i < 14; i++) { const z = 1 + i * 0.6; const a = proj(L, FLOOR, z), b = proj(Rr, FLOOR, z); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#0a0b0d" stroke-width="${3 / z + 0.5}" opacity=".5"/>`; }
    for (let x = L; x <= Rr; x += 170) { const a = proj(x, FLOOR, 1), b = proj(x, FLOOR, back); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#0a0b0d" stroke-width="2" opacity=".5"/>`; }
    // ceiling rails with hooks (two rails)
    const rails = [vx - 330, vx + 330];
    for (const rx of rails) {
      const a = proj(rx, CEIL + 220, 1.05), b = proj(rx, CEIL + 220, back);
      s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#3a4048" stroke-width="10"/>`;
      for (let z = 1.15; z < back - 0.5; z += 0.42) {
        const q = proj(rx, CEIL + 220, z), k = 1 / z, sw = Math.sin(z * 3.1) * 6 * k;
        s += `<path d="M${q[0]},${q[1]} l${sw},${70 * k} q${-14 * k},${18 * k} ${-4 * k},${36 * k} q${12 * k},${10 * k} ${18 * k},${-6 * k}" stroke="#565d65" stroke-width="${Math.max(1, 5 * k)}" fill="none"/>`;
      }
    }
    // pipes along the left wall with frost
    for (const [py, pw] of [[CEIL + 420, 46], [CEIL + 520, 30]]) {
      const a = proj(L + 30, py, 1), b = proj(L + 30, py, back);
      s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#4a5158" stroke-width="${pw}"/><line x1="${a[0]}" y1="${a[1] - pw * 0.3}" x2="${b[0]}" y2="${b[1] - pw * 0.05}" stroke="#d7e2ea" stroke-width="${pw * 0.25}" opacity=".45"/>`;
    }
    // columns + stalls between them
    const cols = [];
    for (let z = 1.25; z < back - 0.3; z *= 1.32) cols.push(z);
    s += `<g class="stalls">`;
    for (let i = cols.length - 1; i >= 0; i--) {
      const z = cols[i], k = 1 / z, fogk = Math.min(0.85, (z - 1) / back * fog * 1.6);
      for (const side of [-1, 1]) {
        const cx = side < 0 ? L + 150 : Rr - 150;
        const t0 = proj(cx - 50, CEIL, z), b0 = proj(cx + 50, FLOOR, z);
        s += `<rect x="${t0[0]}" y="${t0[1]}" width="${b0[0] - t0[0]}" height="${b0[1] - t0[1]}" fill="${H.mixc("#2b3036", "#6c7782", fogk)}"/>
          <rect x="${t0[0]}" y="${t0[1]}" width="${(b0[0] - t0[0]) * 0.25}" height="${b0[1] - t0[1]}" fill="#000" opacity=".25"/>`;
        if (p.stalls !== false && i < cols.length - 1) {
          // stall: table + tarp + small lamp with goods glinting
          const zz = z * 1.15, sx = side < 0 ? L + 330 : Rr - 330;
          const tt = proj(sx - 120, FLOOR - 360, zz), tb = proj(sx + 120, FLOOR - 300, zz), leg = proj(sx, FLOOR, zz);
          const tarpA = proj(sx - 150, FLOOR - 640, zz), tarpB = proj(sx + 150, FLOOR - 560, zz);
          const tc = H.mixc(R() < 0.5 ? "#2e3a33" : "#3a3330", "#6c7782", fogk);
          s += `<polygon points="${tarpA[0]},${tarpA[1]} ${tarpB[0]},${tarpA[1]} ${tarpB[0] + 10 * k},${tarpB[1]} ${tarpA[0] - 10 * k},${tarpB[1]}" fill="${tc}"/>
            <rect x="${tt[0]}" y="${tt[1]}" width="${tb[0] - tt[0]}" height="${(tb[1] - tt[1])}" fill="${H.mixc("#3a2a1c", "#6c7782", fogk)}"/>
            <line x1="${tt[0] + 8 * k}" y1="${tb[1]}" x2="${tt[0] + 8 * k}" y2="${leg[1]}" stroke="#1a1c1f" stroke-width="${6 * k}"/><line x1="${tb[0] - 8 * k}" y1="${tb[1]}" x2="${tb[0] - 8 * k}" y2="${leg[1]}" stroke="#1a1c1f" stroke-width="${6 * k}"/>
            <circle cx="${(tt[0] + tb[0]) / 2}" cy="${tarpB[1] + 20 * k}" r="${60 * k}" fill="url(#${id}g)" opacity="${0.8 - fogk * 0.5}"/>`;
          for (let g = 0; g < 4; g++) { const gx = tt[0] + (tb[0] - tt[0]) * (0.15 + g * 0.22); s += `<rect x="${gx}" y="${tt[1] - 16 * k}" width="${14 * k}" height="${16 * k}" fill="${g % 2 ? "#b88a3a" : "#8a8f96"}" opacity="${0.8 - fogk}"/>`; }
        }
      }
    }
    s += `</g>`;
    // crowd silhouettes in the aisle
    let crowd = "";
    for (let i = 0; i < (p.crowd ?? 9); i++) {
      const z = 2.2 + R() * (back - 3.5), x = vx + (R() - 0.5) * 900, k = 1 / z, q = proj(x, FLOOR - 40, z), hh = 520 * k, fogk = Math.min(0.85, (z - 1) / back * fog * 1.6);
      const c = H.mixc("#0b0d10", "#6c7782", fogk);
      crowd += `<g class="pp" data-ph="${R() * 6}"><path d="M${q[0] - hh * 0.16},${q[1]} L${q[0] - hh * 0.2},${q[1] - hh * 0.72} Q${q[0]},${q[1] - hh * 0.84} ${q[0] + hh * 0.2},${q[1] - hh * 0.72} L${q[0] + hh * 0.16},${q[1]} Z" fill="${c}"/><circle cx="${q[0]}" cy="${q[1] - hh * 0.86}" r="${hh * 0.1}" fill="${c}"/></g>`;
    }
    s += `<g class="crowd">${crowd}</g>`;
    // lamps along the centre
    s += `<g class="lamps"></g><ellipse cx="${vx}" cy="${vy}" rx="${w * 0.55}" ry="${h * 0.22}" fill="url(#${id}fog)"/>`;
    const svg = H.svg(s, w, h);
    const lampsG = svg.querySelector(".lamps"), gateG = svg.querySelector(".gate");
    const lampZ = [];
    for (let z = 1.3; z < back - 0.6; z *= 1.38) lampZ.push(z);
    return {
      el: svg, w, h,
      update(t, it) {
        const lit = it.v("lights", p.lights ?? 1), sw = p.lamp_sway ?? 1;
        let l = "";
        lampZ.forEach((z, i) => {
          const on = lit * lampZ.length - i, k = 1 / z;
          const q = proj(vx + Math.sin(t * 0.9 + i) * 10 * sw, CEIL + 380, z), top = proj(vx, CEIL, z);
          const a = Math.max(0, Math.min(1, on)) * (0.92 + 0.08 * Math.sin(t * 13 + i * 3));
          const fl = proj(vx, FLOOR, z);
          l += `<line x1="${top[0]}" y1="${top[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#1a1c1f" stroke-width="${Math.max(1, 3 * k)}"/>
            <polygon points="${q[0] - 30 * k},${q[1]} ${q[0] + 30 * k},${q[1]} ${q[0] + 330 * k},${fl[1]} ${q[0] - 330 * k},${fl[1]}" fill="url(#${id}cone)" opacity="${a}"/>
            <ellipse cx="${q[0]}" cy="${fl[1] - 10 * k}" rx="${300 * k}" ry="${46 * k}" fill="#ffd89a" opacity="${0.12 * a}"/>
            <circle cx="${q[0]}" cy="${q[1] + 10 * k}" r="${150 * k}" fill="url(#${id}g)" opacity="${a}"/>
            <path d="M${q[0] - 22 * k},${q[1]} h${44 * k} l${-6 * k},${30 * k} h${-32 * k} Z M${q[0] - 18 * k},${q[1] + 30 * k} q${18 * k},${26 * k} ${36 * k},0" stroke="#30353b" stroke-width="${Math.max(1, 3 * k)}" fill="none"/>
            <circle cx="${q[0]}" cy="${q[1] + 18 * k}" r="${10 * k}" fill="${a > 0.1 ? "#fff3d6" : "#3a3a36"}"/>`;
        });
        lampsG.innerHTML = l;
        const g = it.v("gate", p.gate ?? 0);
        const gw = (C[0] - D[0]) * 0.5, gh = (C[1] - A[1]) * 0.6, gx = vx - gw / 2, gy = C[1] - gh;
        gateG.innerHTML = `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#1a2430"/><rect x="${gx}" y="${gy}" width="${gw}" height="${gh * g}" fill="#7f9bb4" opacity=".55"/>
          <rect x="${gx}" y="${gy}" width="${gw}" height="${gh * (1 - g)}" fill="#3a4048"/>${Array.from({ length: 8 }, (_, i) => `<line x1="${gx}" x2="${gx + gw}" y1="${gy + gh * (1 - g) * (i + 1) / 9}" y2="${gy + gh * (1 - g) * (i + 1) / 9}" stroke="#262b30" stroke-width="2"/>`).join("")}`;
        svg.querySelectorAll(".pp").forEach((e, i) => { e.setAttribute("transform", `translate(${Math.sin(t * 0.6 + i) * 4},0)`); });
      },
      anchor(name) { if (name === "vp") return vp; if (name === "floor") return [vx, h - 200]; return null; },
    };
  },
};

// ------------------------------------------------------------------ roll_gate: roller shutter seen from inside (origin top-left)
// open (track 0..1), floor_y, spill (warm light under the gate), outside: actors are drawn before this layer (sky, rain, lamp)
export const roll_gate = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, fy = p.floor_y ?? 1420, gx = 150, gw = w - 300, gt = 420, id = H.uid("rg");
    const svg = H.svg(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4048"/><stop offset="1" stop-color="#22272c"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb6c8" stop-opacity=".45"/><stop offset="1" stop-color="#9fb6c8" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23272b"/><stop offset="1" stop-color="#0d0e10"/></linearGradient></defs>
      <path d="M0,0 H${w} V${fy} H${gx + gw} V${gt} H${gx} V${fy} H0 Z" fill="#14171a"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="url(#${id}f)"/>
      <g class="spill"></g>
      <g class="sh"></g>
      <rect x="${gx - 40}" y="${gt - 40}" width="40" height="${fy - gt + 40}" fill="#2a2f35"/><rect x="${gx + gw}" y="${gt - 40}" width="40" height="${fy - gt + 40}" fill="#2a2f35"/>
      <rect x="${gx - 60}" y="${gt - 110}" width="${gw + 120}" height="80" rx="8" fill="#30363c"/>
      <text x="${w / 2}" y="${gt - 56}" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="30" fill="#8a8f96" letter-spacing="6">ВОРОТА № 3</text>`, w, h);
    const sh = svg.querySelector(".sh"), spill = svg.querySelector(".spill");
    return {
      el: svg, w, h,
      update(t, it) {
        const o = it.v("open", p.open ?? 0), gh = (fy - gt) * (1 - o);
        let s = `<rect x="${gx}" y="${gt}" width="${gw}" height="${gh}" fill="url(#${id})"/>`;
        for (let y = gt + 26; y < gt + gh; y += 26) s += `<line x1="${gx}" x2="${gx + gw}" y1="${y}" y2="${y}" stroke="#1a1d21" stroke-width="3"/><line x1="${gx}" x2="${gx + gw}" y1="${y + 3}" y2="${y + 3}" stroke="#4a5158" stroke-width="1.5"/>`;
        s += `<rect x="${gx}" y="${gt + gh - 14}" width="${gw}" height="14" fill="#15181b"/>`;
        sh.innerHTML = s;
        spill.innerHTML = `<polygon points="${gx},${fy} ${gx + gw},${fy} ${w + 200},${h} ${-200},${h}" fill="url(#${id}s)" opacity="${Math.min(1, o * 1.8)}"/>`;
      },
    };
  },
};

// ------------------------------------------------------------------ factory: abandoned cold-storage plant facade (origin bottom)
// w, sign (letters), door (track 0..1: the dock door opens to warm light), broken (share of dark broken windows), seed, rust
export const factory = {
  origin: "bottom",
  grounded: true,
  backdrop: true,
  size_m: { h: 18 },
  create(p, H) {
    const w = p.w ?? 1200, h = p.h ?? 900, R = H.rng(p.seed ?? 5), id = H.uid("fa"), col = p.color ?? "#3b4046";
    const body = h - 120, top = h - body;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.shade(col, 0.1)}"/><stop offset="1" stop-color="${H.shade(col, -0.35)}"/></linearGradient>
      <linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd590"/><stop offset="1" stop-color="#d98a3a"/></linearGradient></defs>
      <rect x="0" y="${top}" width="${w}" height="${body}" fill="url(#${id})"/>
      <rect x="0" y="${top}" width="${w}" height="16" fill="${H.shade(col, 0.2)}"/>`;
    for (let i = 0; i < 40; i++) s += `<rect x="${R() * w}" y="${top + 16}" width="${2 + R() * 6}" height="${40 + R() * 260}" fill="#5a3a24" opacity="${0.08 + R() * 0.16}"/>`;
    for (let x = 0; x < w; x += 200) s += `<line x1="${x}" x2="${x}" y1="${top}" y2="${h}" stroke="#23272b" stroke-width="3" opacity=".6"/>`;
    // ribbon windows
    for (let r = 0; r < 2; r++) for (let c = 0; c < Math.floor(w / 100); c++) {
      const x = 22 + c * 100, y = top + 70 + r * 140, br = R() < (p.broken ?? 0.25);
      s += `<rect x="${x}" y="${y}" width="76" height="70" fill="${br ? "#07080a" : "#1b2229"}" stroke="#2a2f35" stroke-width="4"/>`;
      if (!br && R() < 0.2) s += `<rect x="${x + 4}" y="${y + 4}" width="68" height="62" fill="#6c7f90" opacity=".25"/>`;
      if (br) s += `<path d="M${x + 10},${y + 70} l20,-34 l14,18 l18,-40" stroke="#3a4048" stroke-width="2" fill="none"/>`;
    }
    // loading docks
    const dockY = h - 260;
    s += `<rect x="-20" y="${h - 110}" width="${w + 40}" height="110" fill="#2a2e33"/><rect x="-20" y="${h - 110}" width="${w + 40}" height="10" fill="#4a5056"/>`;
    for (let i = 0; i < 3; i++) {
      const x = 120 + i * 360;
      s += `<rect x="${x}" y="${dockY}" width="240" height="150" fill="#16191c"/><g class="${i === 1 ? "door" : ""}">${i !== 1 ? `<rect x="${x}" y="${dockY}" width="240" height="150" fill="#30363c"/>${Array.from({ length: 6 }, (_, k) => `<line x1="${x}" x2="${x + 240}" y1="${dockY + 22 + k * 22}" y2="${dockY + 22 + k * 22}" stroke="#1d2125" stroke-width="3"/>`).join("")}` : ""}</g>
        <rect x="${x - 14}" y="${dockY - 24}" width="268" height="18" fill="#4a3a2a"/><rect x="${x + 100}" y="${dockY - 60}" width="40" height="22" fill="#2a2e33"/><circle cx="${x + 120}" cy="${dockY - 42}" r="7" fill="#ffcf8a" opacity="${i === 1 ? 0.95 : 0.15}"/>`;
    }
    // pipes + ladder
    s += `<path d="M${w - 80},${h - 110} V${top + 40} H${w - 30}" stroke="#4a5056" stroke-width="22" fill="none"/><path d="M${w - 80},${h - 110} V${top + 40}" stroke="#7b838a" stroke-width="5" fill="none"/>
      <g stroke="#2a2e33" stroke-width="6">${Array.from({ length: 14 }, (_, k) => `<line x1="40" x2="80" y1="${top + 40 + k * 40}" y2="${top + 40 + k * 40}"/>`).join("")}<line x1="40" x2="40" y1="${top + 20}" y2="${h - 110}"/><line x1="80" x2="80" y1="${top + 20}" y2="${h - 110}"/></g>`;
    // roof sign: rusty letters on a frame
    const sign = p.sign ?? "ХЛАДОКОМБИНАТ", lw = Math.min(70, (w - 200) / sign.length);
    s += `<g><line x1="100" x2="${w - 100}" y1="${top - 20}" y2="${top - 20}" stroke="#2a2e33" stroke-width="6"/>${Array.from({ length: 8 }, (_, k) => `<line x1="${120 + k * (w - 240) / 7}" x2="${120 + k * (w - 240) / 7}" y1="${top - 120}" y2="${top}" stroke="#2a2e33" stroke-width="5"/>`).join("")}
      <text x="${w / 2}" y="${top - 36}" text-anchor="middle" font-family="${COND}" font-weight="700" font-size="${lw * 1.12}" fill="#6a4a30" letter-spacing="4">${sign}</text></g>`;
    const svg = H.svg(s, w, h), door = svg.querySelector(".door");
    return {
      el: svg, w, h,
      update(t, it) {
        const o = it.v("door", p.door ?? 0.3), x = 480;
        door.innerHTML = `<rect x="${x}" y="${dockY}" width="240" height="150" fill="url(#${id}d)" opacity="${0.4 + 0.6 * o}"/><rect x="${x}" y="${dockY}" width="240" height="${150 * (1 - o)}" fill="#30363c"/>
          <polygon points="${x},${dockY + 150} ${x + 240},${dockY + 150} ${x + 340},${h} ${x - 100},${h}" fill="#ffcf8a" opacity="${0.16 * o}"/>`;
      },
      anchor(name) { if (name === "roof") return [w / 2, top]; if (name === "door") return [600, dockY + 75]; return null; },
    };
  },
};

// ------------------------------------------------------------------ cranes: port gantry cranes, far silhouettes (origin bottom)
// w, h, n, color, lights (blinking red aviation lights), seed
export const cranes = {
  backdrop: true,
  origin: "bottom",
  grounded: true,
  create(p, H) {
    const w = p.w ?? 1600, h = p.h ?? 700, R = H.rng(p.seed ?? 3), col = p.color ?? "#3c4650", n = p.n ?? 3;
    let s = "";
    const tops = [];
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (w / n) + (R() - 0.5) * 120, ch = h * (0.7 + R() * 0.25), lw = 150 + R() * 60, flip = R() < 0.5 ? -1 : 1;
      const legY = h, topY = h - ch;
      s += `<g stroke="${col}" fill="none" stroke-width="10">
        <path d="M${x - lw / 2},${legY} L${x - lw / 2 + 20},${topY + ch * 0.35} M${x + lw / 2},${legY} L${x + lw / 2 - 20},${topY + ch * 0.35}"/>
        <path d="M${x - lw / 2 + 10},${legY - ch * 0.3} L${x + lw / 2 - 10},${legY - ch * 0.3} M${x - lw / 2 + 4},${legY - ch * 0.12} L${x + lw / 2 - 4},${legY - ch * 0.32}" stroke-width="6"/>
        <path d="M${x - lw / 2 - 40},${topY + ch * 0.35} L${x + flip * 440},${topY + ch * 0.35}" stroke-width="14"/>
        <path d="M${x},${topY + ch * 0.35} L${x},${topY} M${x},${topY} L${x + flip * 400},${topY + ch * 0.33} M${x},${topY} L${x - flip * 120},${topY + ch * 0.33}" stroke-width="5"/>
        <path d="M${x + flip * 260},${topY + ch * 0.35} V${topY + ch * 0.55}" stroke-width="3"/></g>
        <rect x="${x - 30}" y="${topY + ch * 0.35 - 50}" width="60" height="40" fill="${col}"/>`;
      tops.push([x, topY], [x + flip * 440, topY + ch * 0.35]);
    }
    s += `<g class="lt"></g>`;
    const svg = H.svg(s, w, h), lt = svg.querySelector(".lt");
    return {
      el: svg, w, h,
      update(t) {
        lt.innerHTML = p.lights === false ? "" : tops.map(([x, y], i) => { const on = Math.sin(t * 2.4 + i * 1.7) > 0.2; return `<circle cx="${x}" cy="${y}" r="7" fill="${RED}" opacity="${on ? 1 : 0.2}"/><circle cx="${x}" cy="${y}" r="22" fill="${RED}" opacity="${on ? 0.3 : 0}" style="filter:blur(6px)"/>`; }).join("");
      },
    };
  },
};

// ------------------------------------------------------------------ containers: stacked shipping containers
// view: side (origin bottom; stacks: [[colours bottom → top], …] or n + seed) | corridor (origin top-left full frame, vp)
const CCOL = ["#6b3a2a", "#2f4a5a", "#4a5a3a", "#7a5a2a", "#3a3f46", "#5a2f2f", "#2a3a4a"];
function containerSide(H, x, y, cw, ch, col, R, code) {
  let s = `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${col}"/>`;
  for (let i = 8; i < cw; i += 12) s += `<rect x="${x + i}" y="${y + 6}" width="5" height="${ch - 12}" fill="${H.shade(col, -0.3)}"/>`;
  s += `<rect x="${x}" y="${y}" width="${cw}" height="6" fill="${H.shade(col, 0.2)}"/><rect x="${x}" y="${y + ch - 6}" width="${cw}" height="6" fill="${H.shade(col, -0.5)}"/>
    <rect x="${x}" y="${y}" width="8" height="${ch}" fill="${H.shade(col, -0.45)}"/><rect x="${x + cw - 8}" y="${y}" width="8" height="${ch}" fill="${H.shade(col, -0.45)}"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${x + R() * cw}" y="${y + 6}" width="${2 + R() * 4}" height="${20 + R() * (ch - 30)}" fill="#3a1e12" opacity="${0.25 + R() * 0.3}"/>`;
  if (code) s += `<text x="${x + 22}" y="${y + 34}" font-family="${MONO}" font-weight="600" font-size="20" fill="#d8d4cc" opacity=".55">${code}</text>`;
  return s;
}
export const containers = {
  origin: "bottom",
  grounded: true,
  surface: true,
  size_m: { h: 5.2 },
  create(p, H) {
    const R = H.rng(p.seed ?? 9);
    if (p.view === "corridor") {
      const w = p.w ?? 1080, h = p.h ?? 1920, vp = p.vp ?? [540, 900], [vx, vy] = vp, id = H.uid("cc");
      const proj = (x, y, z) => [vx + (x - vx) / z, vy + (y - vy) / z];
      const L = 120, Rr = w - 120, TOP = -400, FL = h + 40, back = 8;
      let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6873"/><stop offset="1" stop-color="#1c2025"/></linearGradient>
        <radialGradient id="${id}f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8a96a2" stop-opacity=".5"/><stop offset="1" stop-color="#8a96a2" stop-opacity="0"/></radialGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
      const fa = proj(L, FL, back), fb = proj(Rr, FL, back);
      s += `<polygon points="${-200},${FL} ${w + 200},${FL} ${fb[0]},${fb[1]} ${fa[0]},${fa[1]}" fill="#1a1d20"/>`;
      // walls as slices of containers (each 2.4 deep)
      for (let side of [-1, 1]) {
        const xw = side < 0 ? L : Rr;
        for (let z = back; z > 1; z -= 0.8) {
          const z2 = Math.max(1, z - 0.8);
          for (let lv = 0; lv < 4; lv++) {
            const y0 = FL - lv * 330, y1 = y0 - 320, col = H.mixc(CCOL[Math.floor(R() * CCOL.length)], "#7a8692", Math.min(0.75, (z - 1) / back * 0.9));
            const a = proj(xw, y1, z), b = proj(xw, y1, z2), c = proj(xw, y0, z2), d = proj(xw, y0, z);
            s += `<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}" fill="${col}" stroke="${H.shade(col, -0.4)}" stroke-width="${3 / z + 1}"/>`;
            for (let k = 1; k < 8; k++) { const zz = z - 0.1 * k, e = proj(xw, y1 + 10, zz), f = proj(xw, y0 - 10, zz); s += `<line x1="${e[0]}" y1="${e[1]}" x2="${f[0]}" y2="${f[1]}" stroke="${H.shade(col, -0.3)}" stroke-width="${2 / zz + 0.5}"/>`; }
          }
        }
      }
      s += `<ellipse cx="${vx}" cy="${vy}" rx="${w * 0.4}" ry="${h * 0.2}" fill="url(#${id}f)"/>`;
      return { el: H.svg(s, w, h), w, h };
    }
    const cw = p.cw ?? 400, ch = p.ch ?? 150;
    let stacks = p.stacks;
    if (!stacks) { stacks = []; for (let i = 0; i < (p.n ?? 3); i++) { const k = 1 + Math.floor(R() * 3); stacks.push(Array.from({ length: k }, () => CCOL[Math.floor(R() * CCOL.length)])); } }
    const w = stacks.length * (cw + 8), h = Math.max(...stacks.map((a) => a.length)) * ch;
    let s = "";
    stacks.forEach((st, i) => st.forEach((col, j) => { s += containerSide(H, i * (cw + 8), h - (j + 1) * ch, cw, ch, p.fog ? H.mixc(col, p.fog, p.fog_k ?? 0.4) : col, R, R() < 0.5 ? `${["MSKU", "TGHU", "CMAU", "HLXU"][Math.floor(R() * 4)]} ${100000 + Math.floor(R() * 899999)}` : ""); }));
    return { el: H.svg(s, w, h), w, h };
  },
};

// ------------------------------------------------------------------ pier: the North pier with the lighthouse (origin top-left)
// view: long (perspective along the pier) | end (close: lighthouse right, booth with a window); vp, beam (track 0..1),
// beam_speed (rev/s), waves (0..1), spray: [t] (wave hits), fog, booth_lit
export const pier = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 1080, h = p.h ?? 1920, id = H.uid("pr"), view = p.view ?? "long", vp = p.vp ?? [540, 820], [vx, vy] = vp;
    const R = H.rng(p.seed ?? 12);
    let s = `<defs><linearGradient id="${id}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5560"/><stop offset=".25" stop-color="#232a31"/><stop offset="1" stop-color="#0b0e11"/></linearGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c535a"/><stop offset="1" stop-color="#1e2226"/></linearGradient>
      <linearGradient id="${id}bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#fff6dc" stop-opacity=".95"/><stop offset=".3" stop-color="#ffe2a0" stop-opacity=".4"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c7782" stop-opacity="0"/><stop offset=".5" stop-color="#6c7782" stop-opacity="${0.5 * (p.fog ?? 0.8)}"/><stop offset="1" stop-color="#6c7782" stop-opacity="0"/></linearGradient>
      <filter id="${id}b"><feGaussianBlur stdDeviation="8"/></filter></defs>
      <rect y="${vy - 40}" width="${w}" height="${h - vy + 40}" fill="url(#${id}sea)"/>`;
    let lh, booth;
    if (view === "long") {
      const proj = (x, y, z) => [vx + (x - vx) / z, vy + (y - vy) / z];
      const PL = 200, PR = w - 200, PY = h - 60, back = 14;
      const a = proj(PL, PY, back), b = proj(PR, PY, back);
      s += `<polygon points="${PL - 220},${h + 40} ${PR + 220},${h + 40} ${b[0]},${b[1]} ${a[0]},${a[1]}" fill="url(#${id}c)"/>
        <polygon points="${PL - 220},${h + 40} ${a[0]},${a[1]} ${a[0]},${a[1] + 14} ${PL - 260},${h + 200}" fill="#15181b"/><polygon points="${PR + 220},${h + 40} ${b[0]},${b[1]} ${b[0]},${b[1] + 14} ${PR + 260},${h + 200}" fill="#15181b"/>`;
      for (let z = 1.2; z < back; z *= 1.25) {
        const q1 = proj(PL - 160, PY, z), q2 = proj(PR + 160, PY, z), k = 1 / z;
        s += `<line x1="${q1[0]}" y1="${q1[1]}" x2="${q2[0]}" y2="${q2[1]}" stroke="#121417" stroke-width="${2 * k + 0.5}" opacity=".6"/>`;
        for (const q of [proj(PL - 120, PY, z), proj(PR + 120, PY, z)]) s += `<path d="M${q[0] - 22 * k},${q[1]} v${-50 * k} q${22 * k},${-18 * k} ${44 * k},0 v${50 * k} Z" fill="#2a2f35"/><rect x="${q[0] - 26 * k}" y="${q[1] - 56 * k}" width="${52 * k}" height="${10 * k}" fill="#3e454c"/>`;
      }
      lh = { x: vx, y: vy - 6, k: 0.42 };
      booth = { x: vx + 70, y: vy - 2, k: 0.32 };
      // tetrapods along the sides
      for (let i = 0; i < 26; i++) { const z = 1.1 + R() * 10, side = R() < 0.5 ? -1 : 1, q = proj(side < 0 ? PL - 300 - R() * 160 : PR + 300 + R() * 160, PY + 60, z), k = 1 / z; s += `<path d="M${q[0]},${q[1] - 60 * k} l${40 * k},${70 * k} l${-80 * k},0 Z" fill="${H.mixc("#22272c", "#6c7782", Math.min(0.7, z / 14))}"/>`; }
    } else {
      // end view: concrete platform, lighthouse right, booth left
      s += `<polygon points="-100,${h - 520} ${w + 100},${h - 560} ${w + 100},${h + 40} -100,${h + 40}" fill="url(#${id}c)"/>
        <rect x="-100" y="${h - 560}" width="${w + 200}" height="16" fill="#5a6168" transform="skewY(-2)"/>`;
      for (const [bx, by, k] of [[140, h - 470, 1], [560, h - 495, 0.9], [960, h - 510, 0.85]]) s += `<path d="M${bx - 30 * k},${by} v${-60 * k} q${30 * k},${-22 * k} ${60 * k},0 v${60 * k} Z" fill="#2a2f35"/><rect x="${bx - 36 * k}" y="${by - 68 * k}" width="${72 * k}" height="${12 * k}" fill="#3e454c"/>`;
      lh = { x: w - 170, y: h - 540, k: 1.25 };
      booth = { x: 260, y: h - 520, k: 1.1 };
    }
    // lighthouse tower
    const L = lh, tw = 120 * L.k, th = 760 * L.k;
    s += `<g><path d="M${L.x - tw / 2},${L.y} L${L.x - tw * 0.36},${L.y - th} L${L.x + tw * 0.36},${L.y - th} L${L.x + tw / 2},${L.y} Z" fill="#c9c4b8"/>
      ${[0.18, 0.46, 0.74].map((f) => `<path d="M${L.x - tw / 2 + tw * 0.14 * f},${L.y - th * f} L${L.x + tw / 2 - tw * 0.14 * f},${L.y - th * f} L${L.x + tw / 2 - tw * 0.14 * (f + 0.12)},${L.y - th * (f + 0.12)} L${L.x - tw / 2 + tw * 0.14 * (f + 0.12)},${L.y - th * (f + 0.12)} Z" fill="#8a2a26"/>`).join("")}
      <path d="M${L.x - tw / 2},${L.y} L${L.x - tw * 0.36},${L.y - th} L${L.x - tw * 0.2},${L.y - th} L${L.x - tw * 0.3},${L.y} Z" fill="#000" opacity=".35"/>
      <rect x="${L.x - tw * 0.56}" y="${L.y - th - 14 * L.k}" width="${tw * 1.12}" height="${14 * L.k}" fill="#2a2f35"/>
      <rect x="${L.x - tw * 0.3}" y="${L.y - th - 84 * L.k}" width="${tw * 0.6}" height="${70 * L.k}" fill="#fff1c8"/>
      <path d="M${L.x - tw * 0.4},${L.y - th - 84 * L.k} L${L.x},${L.y - th - 130 * L.k} L${L.x + tw * 0.4},${L.y - th - 84 * L.k} Z" fill="#1d2125"/></g>`;
    const lamp = [L.x, L.y - th - 50 * L.k];
    // booth with a window (the mirror hangs inside)
    const B = booth, bw = 200 * B.k, bh = 220 * B.k;
    s += `<g><rect x="${B.x - bw / 2}" y="${B.y - bh}" width="${bw}" height="${bh}" fill="#3a4048"/><path d="M${B.x - bw / 2 - 14 * B.k},${B.y - bh} L${B.x},${B.y - bh - 60 * B.k} L${B.x + bw / 2 + 14 * B.k},${B.y - bh} Z" fill="#23272b"/>
      <rect class="bwin" x="${B.x - bw * 0.32}" y="${B.y - bh * 0.78}" width="${bw * 0.4}" height="${bh * 0.36}" fill="#ffcf8a"/><rect x="${B.x + bw * 0.16}" y="${B.y - bh * 0.7}" width="${bw * 0.24}" height="${bh * 0.7}" fill="#1d2125"/></g>`;
    s += `<g class="beam"></g><circle cx="${lamp[0]}" cy="${lamp[1]}" r="${90 * L.k}" fill="url(#${id}g)"/><g class="waves"></g><g class="spray"></g>
      <rect y="${vy - 260}" width="${w}" height="520" fill="url(#${id}fg)"/>`;
    const svg = H.svg(s, w, h), beamG = svg.querySelector(".beam"), waves = svg.querySelector(".waves"), spray = svg.querySelector(".spray");
    const wv = Array.from({ length: 40 }, () => [R() * w, vy + 20 + Math.pow(R(), 1.6) * (h - vy), R() * 6, 40 + R() * 140]);
    return {
      el: svg, w, h,
      update(t, it) {
        const bm = it.v("beam", 1), a = (t * (p.beam_speed ?? 0.12) * 360) % 360;
        const ang = a * Math.PI / 180, len = 1400, half = 0.07 + 0.05 * Math.abs(Math.cos(ang));
        const dir = Math.cos(ang), ex = lamp[0] + dir * len, sp = 120 * Math.abs(Math.sin(ang)) + 40;
        beamG.innerHTML = bm > 0 ? `<polygon points="${lamp[0]},${lamp[1]} ${ex},${lamp[1] - sp} ${ex},${lamp[1] + sp}" fill="url(#${id}bm)" opacity="${bm * (0.4 + 0.6 * Math.abs(Math.sin(ang)))}" transform="${dir < 0 ? `` : ``}"/>` : "";
        if (dir < 0) beamG.firstChild?.setAttribute("points", `${lamp[0]},${lamp[1]} ${lamp[0] + dir * len},${lamp[1] - sp} ${lamp[0] + dir * len},${lamp[1] + sp}`);
        const wk = p.waves ?? 1;
        waves.innerHTML = wv.map(([x, y, ph, ln]) => { const k = (y - vy) / (h - vy), xx = x + Math.sin(t * 0.7 + ph) * 30; return `<path d="M${xx - ln * (0.3 + k)},${y} q${ln * (0.3 + k) / 2},${-6 - 10 * k} ${ln * (0.3 + k)},0" stroke="#9fb2c0" stroke-width="${1 + 3 * k}" fill="none" opacity="${(0.15 + 0.35 * k) * wk * (0.6 + 0.4 * Math.sin(t * 1.3 + ph))}"/>`; }).join("");
        let sp2 = "";
        for (const t0 of p.spray ?? []) { const k = (t - t0) / 1.6; if (k > 0 && k < 1) { const R2 = H.rng(t0 * 100); for (let i = 0; i < 26; i++) { const x = (view === "long" ? 130 : 60) + R2() * 300, y = h - (view === "long" ? 300 : 560) - Math.sin(k * Math.PI) * (200 + R2() * 300); sp2 += `<circle cx="${x + k * 40}" cy="${y}" r="${4 + R2() * 10}" fill="#dfe8ee" opacity="${(1 - k) * 0.6}"/>`; } } }
        spray.innerHTML = sp2;
      },
      anchor(name) { if (name === "lamp") return lamp; if (name === "booth") return [B.x, B.y - bh / 2]; if (name === "end") return [vx, vy]; return null; },
    };
  },
};

// ------------------------------------------------------------------ truck: semi truck side view facing right (origin bottom)
// color, lights (track 0..1), wheels (wheel turns per second)
export const truck = {
  origin: "bottom",
  grounded: true,
  size_m: { w: 16 },
  create(p, H) {
    const w = 1500, h = 420, col = p.color ?? "#5a2f2f", id = H.uid("tr");
    const svg = H.svg(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${w / 2}" cy="${h - 4}" rx="${w * 0.48}" ry="12" fill="#000" opacity=".5"/>
      <rect x="0" y="40" width="1080" height="290" fill="#8a8f96"/><rect x="0" y="40" width="1080" height="290" fill="#2a2e33" opacity=".55"/>
      ${Array.from({ length: 36 }, (_, i) => `<rect x="${10 + i * 30}" y="48" width="12" height="274" fill="#000" opacity=".18"/>`).join("")}
      <text x="540" y="210" text-anchor="middle" font-family="${COND}" font-weight="700" font-size="90" fill="#d8d4cc" opacity=".25" letter-spacing="10">ПОРТ-ЛОГИСТИК</text>
      <rect x="0" y="330" width="1110" height="24" fill="#1a1c1f"/>
      <path d="M1110,354 L1110,120 Q1110,90 1140,90 L1300,90 Q1340,90 1360,130 L1420,230 L1470,250 Q1490,256 1490,290 L1490,354 Z" fill="${col}"/>
      <path d="M1150,110 L1290,110 Q1320,110 1336,140 L1380,226 L1150,226 Z" fill="#14181c"/><path d="M1160,120 L1220,120 L1180,216 L1160,216 Z" fill="#cfd8df" opacity=".12"/>
      <rect x="1440" y="270" width="44" height="26" rx="6" fill="#fff4d6"/><rect x="1112" y="300" width="378" height="14" fill="${H.shade(col, -0.4)}"/>
      <g class="beam"><polygon points="1480,282 2400,190 2400,400" fill="url(#${id})" opacity=".45"/><circle cx="1470" cy="283" r="50" fill="url(#${id})"/></g>
      <g class="whl"></g>`, w, h);
    const beam = svg.querySelector(".beam"), whl = svg.querySelector(".whl");
    const wx = [140, 260, 880, 1000, 1220, 1400];
    return {
      el: svg, w, h,
      update(t, it) {
        beam.setAttribute("opacity", it.v("lights", p.lights ?? 1));
        const a = t * (p.wheels ?? 2) * 360;
        whl.innerHTML = wx.map((x) => `<g transform="translate(${x},${h - 50}) rotate(${a})"><circle r="50" fill="#0e1012"/><circle r="26" fill="#5a6168"/>${[0, 72, 144, 216, 288].map((d) => `<rect x="-3" y="-24" width="6" height="14" fill="#2a2e33" transform="rotate(${d})"/>`).join("")}</g>`).join("");
      },
    };
  },
};
