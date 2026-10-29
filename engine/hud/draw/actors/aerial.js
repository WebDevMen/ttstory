// Library (since «Люди выпадают из фотографий», projects/vanish — reused by the series).
// «Люди выпадают из фотографий» — взгляд сверху: перекрёсток с дрона, оверлей дрона, спутниковый снимок города.
//
// crossing_top: перекрёсток сверху (origin — верхний левый угол мира). w, h; люди-точки идут по зебрам и тротуарам,
//   машины едут по полосам, автобус на остановке. gone: [{i, at}] — конкретный человек исчезает; wave: {at, dur, keep}
//   — исчезает доля людей (1 − keep) волной; bus_doors (дорожка 0..1); seed. Якоря: ped:i, bus, stop.
//   Счётчик людей в кадре — свойство people (читается из YAML как текст: используйте text count).
// drone_hud: оверлей дрона (space: screen): перекрестие, высота (alt — дорожка), координаты, компас, REC, батарея.
// satellite: спутниковый снимок города у реки (origin — верхний левый угол): кварталы, крыши, парки, мост, поля, трассы.
//   erase (дорожка 0..1): полоса прогрузки сверху вниз — под ней города нет, только степь; дороги снаружи остаются и
//   обрываются на границе. scan (дорожка 0..1): полоса прогрузки первого снимка. ghost (0..1): проступает другой город
//   (часть 2). label, seed. Якоря: center, road_end:i (конец i-й трассы на границе города).

const ORANGE = "#ffb23e";
const MONO = `"IBM Plex Mono", monospace`;

export const crossing_top = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 1600, h = p.h ?? 2400, cx = w / 2, cy = h * 0.48, rw = 300; // road width
    const r = H.rng(p.seed ?? 11);
    const svg = H.svg("", w, h);
    let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#9a968c"/>`;
    // sidewalks (lighter) around the roads
    s += `<rect x="${cx - rw / 2 - 90}" y="0" width="${rw + 180}" height="${h}" fill="#bdb7aa"/><rect x="0" y="${cy - rw / 2 - 90}" width="${w}" height="${rw + 180}" fill="#bdb7aa"/>`;
    // asphalt
    s += `<rect x="${cx - rw / 2}" y="0" width="${rw}" height="${h}" fill="#4a4d52"/><rect x="0" y="${cy - rw / 2}" width="${w}" height="${rw}" fill="#4a4d52"/>`;
    // lane marks
    for (let y = 0; y < h; y += 90) if (Math.abs(y - cy) > rw / 2 + 140) s += `<rect x="${cx - 3}" y="${y}" width="6" height="50" fill="#e9e6dc"/>`;
    for (let x = 0; x < w; x += 90) if (Math.abs(x - cx) > rw / 2 + 140) s += `<rect x="${x}" y="${cy - 3}" width="50" height="6" fill="#e9e6dc"/>`;
    // zebras on 4 sides
    const zeb = (x0, y0, horiz) => { let z = ""; for (let i = 0; i < 8; i++) z += horiz ? `<rect x="${x0 + i * (rw / 8) + 6}" y="${y0}" width="${rw / 8 - 14}" height="110" fill="#efece4"/>` : `<rect x="${x0}" y="${y0 + i * (rw / 8) + 6}" width="110" height="${rw / 8 - 14}" fill="#efece4"/>`; return z; };
    s += zeb(cx - rw / 2, cy - rw / 2 - 130, true) + zeb(cx - rw / 2, cy + rw / 2 + 20, true) + zeb(cx - rw / 2 - 130, cy - rw / 2, false) + zeb(cx + rw / 2 + 20, cy - rw / 2, false);
    // buildings (roofs) in 4 quadrants with shadows
    const roofs = ["#7d6f62", "#8b8f93", "#a27e63", "#6f7a7e", "#9d9488", "#b3a48e", "#5f6670"];
    const quad = (x0, y0, x1, y1) => {
      let q = "";
      const bw = (x1 - x0), bh = (y1 - y0);
      const n = 2 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const a = y0 + (bh / n) * i + 14, b = y0 + (bh / n) * (i + 1) - 14;
        const c = roofs[Math.floor(r() * roofs.length)];
        q += `<rect x="${x0 + 22}" y="${a + 18}" width="${bw - 44}" height="${b - a}" fill="rgba(0,0,0,.28)"/>`;
        q += `<rect x="${x0 + 10}" y="${a}" width="${bw - 44}" height="${b - a}" fill="${c}"/>`;
        q += `<rect x="${x0 + 10}" y="${a}" width="${bw - 44}" height="10" fill="${H.shade(c, 0.18)}"/>`;
        for (let k = 0; k < 3; k++) q += `<rect x="${x0 + 40 + r() * (bw - 140)}" y="${a + 30 + r() * (b - a - 80)}" width="${30 + r() * 30}" height="${24 + r() * 20}" fill="${H.shade(c, -0.18)}"/>`;
      }
      return q;
    };
    const m = 90;
    s += quad(0, 0, cx - rw / 2 - m - 10, cy - rw / 2 - m - 10) + quad(cx + rw / 2 + m + 10, 0, w, cy - rw / 2 - m - 10);
    s += quad(0, cy + rw / 2 + m + 10, cx - rw / 2 - m - 10, h) + quad(cx + rw / 2 + m + 10, cy + rw / 2 + m + 10, w, h);
    // trees along sidewalks
    for (let i = 0; i < 16; i++) {
      const vert = i % 2 === 0;
      const x = vert ? cx + (r() < 0.5 ? -1 : 1) * (rw / 2 + 60) : r() * w, y = vert ? r() * h : cy + (r() < 0.5 ? -1 : 1) * (rw / 2 + 60);
      if (Math.abs(x - cx) < rw / 2 + 200 && Math.abs(y - cy) < rw / 2 + 200) continue;
      s += `<circle cx="${x + 16}" cy="${y + 22}" r="54" fill="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y}" r="52" fill="#4f7a3c"/><circle cx="${x - 12}" cy="${y - 14}" r="30" fill="#628f4a"/>`;
    }
    // bus stop (shelter) on the right sidewalk, below the crossing
    const stX = cx + rw / 2 + 50, stY = cy + rw / 2 + 360;
    s += `<rect x="${stX}" y="${stY}" width="60" height="200" fill="#2b4b6e"/><rect x="${stX + 8}" y="${stY + 10}" width="44" height="180" fill="#8fb3cf" opacity=".6"/>`;
    svg.innerHTML = s;
    // bus (in the right lane, stopped at the stop)
    const bus = H.el("g", {}, svg);
    const bX = cx + rw / 2 - 84, bY = stY - 60;
    H.el("rect", { x: bX + 14, y: bY + 14, width: 80, height: 340, rx: 14, fill: "rgba(0,0,0,.3)" }, bus);
    H.el("rect", { x: bX, y: bY, width: 80, height: 340, rx: 14, fill: "#e0b23a" }, bus);
    H.el("rect", { x: bX + 8, y: bY + 10, width: 64, height: 40, rx: 6, fill: "#3b4752" }, bus);
    for (let i = 0; i < 4; i++) H.el("rect", { x: bX + 14, y: bY + 80 + i * 62, width: 52, height: 40, rx: 4, fill: "#f2d277" }, bus);
    const doors = [0, 1].map((i) => H.el("rect", { x: bX + 72, y: bY + 70 + i * 160, width: 8, height: 70, fill: "#3b4752" }, bus));
    // cars
    const cars = [];
    const carCol = ["#d9d9d6", "#2e3135", "#9b2c2c", "#3b5d86", "#c9c3b5", "#1f4d3a"];
    for (let i = 0; i < 9; i++) {
      const dir = i % 4; // 0 down, 1 up, 2 right, 3 left
      const g = H.el("g", {}, svg);
      const c = carCol[i % carCol.length];
      H.el("rect", { x: -38 + 10, y: -80 + 12, width: 76, height: 160, rx: 18, fill: "rgba(0,0,0,.3)" }, g);
      H.el("rect", { x: -38, y: -80, width: 76, height: 160, rx: 18, fill: c }, g);
      H.el("rect", { x: -30, y: -48, width: 60, height: 34, rx: 6, fill: "#2a3138" }, g);
      H.el("rect", { x: -30, y: 34, width: 60, height: 22, rx: 6, fill: "#2a3138" }, g);
      cars.push({ g, dir, speed: 170 + r() * 120, off: r() * 3000 });
    }
    // pedestrians: head + shoulders seen from above, with a long morning shadow
    const peds = [];
    const n = p.people ?? 64;
    const pedCol = ["#c94b4b", "#2f3d52", "#d9cfc0", "#5b7f4a", "#8b939c", "#e0a93a", "#6a4f7a", "#3f6f8f"];
    for (let i = 0; i < n; i++) {
      const g = H.el("g", {}, svg);
      const sh = H.el("ellipse", { cx: 14, cy: 20, rx: 14, ry: 26, fill: "rgba(0,0,0,.3)", transform: "rotate(-30)" }, g);
      const body = H.el("ellipse", { cx: 0, cy: 0, rx: 21, ry: 13, fill: pedCol[Math.floor(r() * pedCol.length)] }, g);
      const head = H.el("circle", { cx: 0, cy: 0, r: 10, fill: ["#3a2a22", "#1d1b19", "#7a5a3a", "#c9b08a"][Math.floor(r() * 4)] }, g);
      // route: along a crosswalk or along a sidewalk
      const kind = r();
      let path;
      if (kind < 0.45) { // crosswalk (one of four)
        const z = Math.floor(r() * 4), off = (r() - 0.5) * 80;
        path = z === 0 ? [[cx - rw / 2 - 160, cy - rw / 2 - 75 + off], [cx + rw / 2 + 160, cy - rw / 2 - 75 + off]]
          : z === 1 ? [[cx + rw / 2 + 160, cy + rw / 2 + 75 + off], [cx - rw / 2 - 160, cy + rw / 2 + 75 + off]]
          : z === 2 ? [[cx - rw / 2 - 75 + off, cy + rw / 2 + 160], [cx - rw / 2 - 75 + off, cy - rw / 2 - 160]]
          : [[cx + rw / 2 + 75 + off, cy - rw / 2 - 160], [cx + rw / 2 + 75 + off, cy + rw / 2 + 160]];
      } else if (kind < 0.75) { // vertical sidewalk
        const x = cx + (r() < 0.5 ? -1 : 1) * (rw / 2 + 30 + r() * 50);
        path = r() < 0.5 ? [[x, -100], [x, h + 100]] : [[x, h + 100], [x, -100]];
      } else { // horizontal sidewalk
        const y = cy + (r() < 0.5 ? -1 : 1) * (rw / 2 + 30 + r() * 50);
        path = r() < 0.5 ? [[-100, y], [w + 100, y]] : [[w + 100, y], [-100, y]];
      }
      const len = Math.hypot(path[1][0] - path[0][0], path[1][1] - path[0][1]);
      peds.push({ g, sh, body, head, path, len, speed: 55 + r() * 35, off: r() * len, rot: Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]) * 180 / Math.PI, rv: r() });
    }
    // which people vanish and when
    const goneAt = new Array(n).fill(Infinity);
    for (const g of p.gone ?? []) goneAt[g.i] = g.at;
    if (p.wave) {
      const keep = p.wave.keep ?? 0.15;
      peds.forEach((pd, i) => { if (goneAt[i] === Infinity && pd.rv > keep) goneAt[i] = p.wave.at + ((pd.rv - keep) / (1 - keep)) * (p.wave.dur ?? 3); });
    }
    let lastCount = n;
    return {
      el: svg, w, h,
      update(t, it) {
        const t0 = H.shot?.start ?? 0, u = t - t0 + 6;
        let count = 0;
        peds.forEach((pd, i) => {
          const d = (pd.off + u * pd.speed) % pd.len;
          const k = d / pd.len;
          const x = pd.path[0][0] + (pd.path[1][0] - pd.path[0][0]) * k, y = pd.path[0][1] + (pd.path[1][1] - pd.path[0][1]) * k;
          const sw = Math.sin(u * 7 + i) * 3;
          pd.g.setAttribute("transform", `translate(${x},${y}) rotate(${pd.rot + 90 + sw})`);
          const ga = goneAt[i];
          if (t < ga) { pd.g.style.display = ""; pd.body.style.opacity = pd.head.style.opacity = 1; pd.sh.style.opacity = 1; count++; }
          else if (t < ga + 0.3) {
            const fr = Math.floor(t * 30), rr = H.rng(fr * 31 + i);
            pd.g.style.display = "";
            pd.body.style.opacity = pd.head.style.opacity = rr() < 0.5 ? 0.15 : 0.9;
            pd.sh.style.opacity = 1;
            pd.g.setAttribute("transform", `translate(${x + (rr() - 0.5) * 24},${y}) rotate(${pd.rot + 90})`);
          } else if (t < ga + 0.55) { pd.g.style.display = ""; pd.body.style.opacity = pd.head.style.opacity = 0; pd.sh.style.opacity = 1 - (t - ga - 0.3) / 0.25; }
          else pd.g.style.display = "none";
        });
        lastCount = count;
        cars.forEach((c) => {
          const L = c.dir < 2 ? h + 400 : w + 400;
          const d = ((c.off + u * c.speed) % L) - 200;
          // cars wait at the crossing? keep them flowing: the city does not stop
          let x, y, rot;
          if (c.dir === 0) { x = cx - 75; y = d; rot = 180; }
          else if (c.dir === 1) { x = cx + 30; y = h - d; rot = 0; }
          else if (c.dir === 2) { x = d; y = cy + rw / 4; rot = 90; }
          else { x = w - d; y = cy - rw / 4; rot = -90; }
          c.g.setAttribute("transform", `translate(${x},${y}) rotate(${rot})`);
        });
        const o = H.clamp(it.v("bus_doors", 0), 0, 1);
        doors.forEach((dd) => { dd.setAttribute("width", 8 + o * 26); dd.setAttribute("x", bX + 72); dd.setAttribute("fill", o > 0.05 ? "#141619" : "#3b4752"); });
        bus.style.display = p.bus === false ? "none" : "";
      },
      anchor(name, args) {
        if (name === "ped") { const pd = peds[args?.[0] ?? 0]; const tr = pd.g.getAttribute("transform") || ""; const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr); return m ? [Number(m[1]), Number(m[2])] : null; }
        if (name === "bus") return [bX + 40, bY + 170];
        if (name === "stop") return [stX + 30, stY + 100];
        return null;
      },
    };
  },
};

export const drone_hud = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920;
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const sh = "text-shadow:0 1px 3px rgba(0,0,0,.9)";
    const svg = H.svg(`<g fill="none" stroke="#f4f1ea" stroke-width="3" stroke-opacity=".85">
      <path d="M${w / 2 - 60},${h / 2} h40 M${w / 2 + 20},${h / 2} h40 M${w / 2},${h / 2 - 60} v40 M${w / 2},${h / 2 + 20} v40"/>
      <rect x="${w / 2 - 6}" y="${h / 2 - 6}" width="12" height="12"/>
      <path d="M80,360 v-40 h40 M${w - 80},360 v-40 h-40 M80,${h - 420} v40 h40 M${w - 80},${h - 420} v40 h-40"/></g>`, w, h);
    const tl = H.div(`left:60px;top:150px;font:600 27px ${MONO};color:#f4f1ea;line-height:1.4;${sh}`);
    const tr = H.div(`left:${w - 60 - 380}px;top:150px;width:380px;text-align:right;font:600 27px ${MONO};color:#f4f1ea;line-height:1.4;${sh}`);
    const bl = H.div(`left:60px;top:${h - 470}px;font:500 24px ${MONO};color:#f4f1ea;line-height:1.5;${sh}`);
    const comp = H.div(`left:${w / 2 - 260}px;top:250px;width:520px;height:40px;overflow:hidden;font:600 22px ${MONO};color:#f4f1ea;${sh}`);
    const compIn = H.div("left:0;top:6px;white-space:nowrap", Array.from({ length: 24 }, (_, i) => ["С", "15", "30", "СВ", "60", "75", "В", "105", "120", "ЮВ", "150", "165", "Ю", "195", "210", "ЮЗ", "240", "255", "З", "285", "300", "СЗ", "330", "345"][i]).join("&nbsp;&nbsp;&nbsp;&nbsp;"));
    comp.appendChild(compIn);
    const caret = H.div(`left:${w / 2 - 8}px;top:290px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid ${ORANGE}`);
    const dot = H.div(`left:${w - 60 - 380 - 6}px;top:161px;width:16px;height:16px;border-radius:8px;background:#e3262f`);
    el.append(svg, tl, tr, bl, comp, caret, dot);
    return {
      el, w, h,
      update(t, it) {
        const alt = it.v("alt", 120);
        tl.innerHTML = `${it.v("src", p.src ?? "ДРОН · НОВОСТИ 24")}<br><span style="font-weight:400;color:#d5cfc4">ВЫС ${Math.round(alt)} М · СКОР 2 М/С</span>`;
        tr.innerHTML = `<span style="color:${ORANGE}">${it.v("time", p.time ?? "09:20:14")}</span><br><span style="font-weight:400;color:#d5cfc4">REC · 4K</span>`;
        bl.innerHTML = `55.7512 N · 37.6184 E<br>БАТ ▮▮▮▯ 71%`;
        compIn.style.transform = `translateX(${-120 - Math.sin(t * 0.2) * 30}px)`;
        dot.style.opacity = Math.sin(t * 5.5) > -0.2 ? 1 : 0.2;
      },
    };
  },
};

export const satellite = {
  origin: "top-left",
  backdrop: true,
  surface: true,
  create(p, H) {
    const w = p.w ?? 2000, h = p.h ?? 2800, cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * (p.radius ?? 0.3);
    const seed = p.seed ?? 21;
    const el = H.div(`width:${w}px;height:${h}px;overflow:hidden`);
    // boundary polygon of the city
    const rb = H.rng(seed + 1);
    const bnd = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; const rr = R * (0.82 + rb() * 0.3); bnd.push([cx + Math.cos(a) * rr * 1.08, cy + Math.sin(a) * rr * 0.92]); }
    const bndD = H.smoothPath(bnd, true);
    // highways from the center to the edges
    const hw = [[w * 0.0, h * 0.18], [w * 1.0, h * 0.3], [w * 0.88, h * 1.0], [w * 0.1, h * 0.92], [w * 0.5, 0]];
    const roadEnd = hw.map(([x, y]) => {
      // point on boundary toward (x, y)
      const a = Math.atan2(y - cy, x - cx);
      let best = bnd[0], bd = 1e9;
      for (const b of bnd) { const aa = Math.atan2(b[1] - cy, b[0] - cx); const d = Math.abs(Math.atan2(Math.sin(aa - a), Math.cos(aa - a))); if (d < bd) { bd = d; best = b; } }
      return best;
    });
    // fields (shared by both layers)
    const fields = (sd) => {
      const r = H.rng(sd);
      let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#8f9a5e"/>`;
      const cell = 260;
      for (let y = -cell; y < h + cell; y += cell) for (let x = -cell; x < w + cell; x += cell) {
        const c = ["#9aa564", "#a7a86d", "#88965a", "#b8b07a", "#7f8f54", "#a39a62", "#c2b984"][Math.floor(r() * 7)];
        const jx = (r() - 0.5) * 60, jy = (r() - 0.5) * 60;
        s += `<path d="M${x + jx},${y + jy} l${cell + 10},${(r() - 0.5) * 30} l${(r() - 0.5) * 30},${cell + 10} l${-cell - 10},${(r() - 0.5) * 30}Z" fill="${c}"/>`;
        if (r() < 0.35) for (let k = 0; k < 6; k++) s += `<line x1="${x + jx + 10}" y1="${y + jy + 20 + k * 40}" x2="${x + jx + cell - 10}" y2="${y + jy + 26 + k * 40}" stroke="rgba(60,60,30,.15)" stroke-width="5"/>`;
      }
      // tree lines
      for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h; s += `<path d="M${x},${y} q${120 + r() * 200},${(r() - 0.5) * 80} ${260 + r() * 300},${(r() - 0.5) * 120}" stroke="#4d6a33" stroke-width="${16 + r() * 10}" fill="none" stroke-linecap="round" opacity=".8"/>`; }
      return s;
    };
    // river: crosses the map
    const river = `M${-50},${h * 0.62} C${w * 0.25},${h * 0.5} ${w * 0.45},${h * 0.72} ${w * 0.62},${h * 0.56} S${w * 0.9},${h * 0.38} ${w + 50},${h * 0.44}`;
    const roads = (inside) => hw.map(([x, y], i) => {
      const e = roadEnd[i];
      const d = inside ? `M${cx},${cy} L${e[0]},${e[1]} L${x},${y}` : `M${e[0]},${e[1]} L${x},${y}`;
      return `<path d="${d}" stroke="#d8d4c8" stroke-width="26" fill="none"/><path d="${d}" stroke="#6e6a62" stroke-width="18" fill="none"/><path d="${d}" stroke="#e8e4d8" stroke-width="2" stroke-dasharray="20 18" fill="none"/>`;
    }).join("");
    // power line toward the city
    const pl = (inside) => {
      const a = [w * 0.98, h * 0.75], b = inside ? [cx, cy] : roadEnd[2];
      let s = `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(40,40,40,.5)" stroke-width="3"/>`;
      for (let k = 0; k <= 8; k++) { const x = a[0] + (b[0] - a[0]) * k / 8, y = a[1] + (b[1] - a[1]) * k / 8; s += `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="#3b3b3b"/><line x1="${x + 6}" y1="${y + 10}" x2="${x + 30}" y2="${y + 40}" stroke="rgba(0,0,0,.25)" stroke-width="6"/>`; }
      return s;
    };
    // city: blocks inside the boundary
    const city = (sd) => {
      const r = H.rng(sd);
      let s = `<defs><clipPath id="satc${sd}"><path d="${bndD}"/></clipPath></defs><g clip-path="url(#satc${sd})"><rect x="0" y="0" width="${w}" height="${h}" fill="#8d8a84"/>`;
      const ang = (r() - 0.5) * 0.3, blk = 120;
      s += `<g transform="rotate(${ang * 57.3},${cx},${cy})">`;
      for (let y = cy - R * 1.4; y < cy + R * 1.4; y += blk) for (let x = cx - R * 1.4; x < cx + R * 1.4; x += blk) {
        const k = r();
        if (k < 0.08) { s += `<rect x="${x + 8}" y="${y + 8}" width="${blk - 16}" height="${blk - 16}" fill="#5f7d45"/>`; for (let q = 0; q < 6; q++) s += `<circle cx="${x + 20 + r() * (blk - 40)}" cy="${y + 20 + r() * (blk - 40)}" r="${10 + r() * 8}" fill="#46652f"/>`; continue; }
        const nb = 2 + Math.floor(r() * 3);
        for (let i = 0; i < nb; i++) {
          const bx = x + 10 + r() * (blk - 60), by = y + 10 + r() * (blk - 60), bw = 26 + r() * 40, bh = 20 + r() * 44;
          const c = ["#b8b2a6", "#9c8f80", "#a8584a", "#c9c4ba", "#7a7f86", "#8e7a66", "#d4cfc4"][Math.floor(r() * 7)];
          s += `<rect x="${bx + 7}" y="${by + 9}" width="${bw}" height="${bh}" fill="rgba(0,0,0,.35)"/><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${c}"/>`;
        }
      }
      for (let y = cy - R * 1.4; y < cy + R * 1.4; y += blk) s += `<rect x="${cx - R * 1.4}" y="${y - 5}" width="${R * 2.8}" height="10" fill="#cfcbc1"/>`;
      for (let x = cx - R * 1.4; x < cx + R * 1.4; x += blk) s += `<rect x="${x - 5}" y="${cy - R * 1.4}" width="10" height="${R * 2.8}" fill="#cfcbc1"/>`;
      s += `</g></g>`;
      s += `<path d="${bndD}" fill="none" stroke="rgba(90,85,70,.35)" stroke-width="18"/>`;
      return s;
    };
    const riverSvg = `<path d="${river}" stroke="#3d5a6a" stroke-width="120" fill="none"/><path d="${river}" stroke="#4d6f80" stroke-width="80" fill="none"/>`;
    const bridge = `<g transform="translate(${w * 0.5},${h * 0.635}) rotate(-62)"><rect x="-150" y="-22" width="300" height="44" fill="#d8d4c8"/><rect x="-150" y="-14" width="300" height="28" fill="#6e6a62"/></g>`;
    // layer A: the city exists. layer B: steppe — the city area is grass, the roads end at the boundary.
    const A = H.svg(fields(seed) + riverSvg + city(seed) + roads(true) + bridge + pl(true), w, h);
    const steppe = `<path d="${bndD}" fill="#a6a46c"/><g clip-path="url(#satc${seed})">${Array.from({ length: 60 }, (_, i) => { const rr = H.rng(seed * 7 + i); return `<ellipse cx="${cx + (rr() - 0.5) * R * 2.4}" cy="${cy + (rr() - 0.5) * R * 2}" rx="${60 + rr() * 140}" ry="${20 + rr() * 60}" fill="${rr() < 0.5 ? "#aeaa72" : "#a2a068"}" opacity=".35"/>`; }).join("")}</g>`;
    const B = H.svg(fields(seed) + riverSvg + `<defs><clipPath id="satc${seed}"><path d="${bndD}"/></clipPath></defs>` + steppe + roads(false) + pl(false), w, h);
    const ghost = p.ghost != null ? H.svg(city(seed + 50) + roads(true), w, h) : null;
    const clipB = H.div(`width:${w}px;height:0px;overflow:hidden`);
    clipB.appendChild(B);
    const scanLine = H.div(`width:${w}px;height:16px;background:linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0));opacity:0`);
    // first load: tiles appear row by row (scan)
    const cover = H.div(`width:${w}px;height:${h}px;background:#1b1d20`);
    const label = H.div(`left:${cx - 300}px;top:${cy - R * 1.12}px;width:600px;text-align:center;font:600 54px ${MONO};letter-spacing:8px;color:#fff;text-shadow:0 2px 6px #000`, p.label ?? "");
    el.append(A, clipB);
    if (ghost) { ghost.style.opacity = 0; el.appendChild(ghost); }
    el.append(label, scanLine, cover);
    return {
      el, w, h,
      update(t, it) {
        const e = H.clamp(it.v("erase", 0), 0, 1), sc = H.clamp(it.v("scan", 1), 0, 1);
        clipB.style.height = `${e * h}px`;
        cover.style.top = `${sc * h}px`;
        cover.style.height = `${(1 - sc) * h}px`;
        const line = e > 0 && e < 1 ? e : sc > 0 && sc < 1 ? sc : -1;
        scanLine.style.opacity = line >= 0 ? 1 : 0;
        scanLine.style.top = `${line * h - 8}px`;
        label.style.opacity = it.v("label_on", 1) * (1 - (e > 0.6 ? 1 : 0));
        if (ghost) ghost.style.opacity = H.clamp(it.v("ghost", 0), 0, 1) * 0.85;
      },
      anchor(name, args) {
        if (name === "center") return [cx, cy];
        if (name === "road_end") return roadEnd[args?.[0] ?? 0];
        return null;
      },
    };
  },
};
