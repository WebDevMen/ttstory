// Actors built on external libraries (all vendored in engine/hud/vendor, rendered offline and frame-exact):
//   lottie    — any Lottie / Bodymovin animation (After Effects, LottieFiles), seeked frame by frame (lottie-web)
//   sketch    — hand-drawn shapes with optional "boiling" lines (rough.js)
//   chart     — animated bar / hbar / line / pie / donut charts (D3)
//   map       — country maps and globes with pins (D3-geo + Natural Earth via world-atlas)
//   holo      — three.js 3D models from engine/hud/models (globe, still, tanker, your own)
//   particles — petals, snow, confetti, sparkles, stars, bubbles, steam, dust, hearts (SVG, deterministic)
// GSAP is available everywhere as H.gsap (eases in every `ease:` field, MorphSVG in shape.morph, timelines in custom actors).

const startOf = (p, it) => p.start ?? (it.at > -1e8 ? it.at : 0);

// ------------------------------------------------------------------ lottie: src (json path in the project) | data, w, h, speed, loop, segment [f0, f1]
export const lottie = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? 400, h = p.h ?? 400;
    const el = H.div(`width:${w}px;height:${h}px`);
    const data = p.data ?? (await H.json(H.asset(p.src)));
    const anim = H.lottie.loadAnimation({ container: el, renderer: "svg", loop: false, autoplay: false, animationData: JSON.parse(JSON.stringify(data)),
      rendererSettings: { preserveAspectRatio: "xMidYMid meet" } });
    await new Promise((res) => { if (anim.isLoaded) res(); else anim.addEventListener("DOMLoaded", res); });
    const fr = anim.frameRate || data.fr || 30, total = anim.totalFrames;
    return {
      el, w, h,
      update(t, it) {
        const [s0, s1] = p.segment ?? [0, total], len = Math.max(1, s1 - s0);
        let f = Math.max(0, (t - startOf(p, it)) * (p.speed ?? 1) * fr);
        f = p.loop === false ? Math.min(f, len - 0.01) : f % len;
        anim.goToAndStop(s0 + f, true);
      },
      destroy() { anim.destroy(); },
    };
  },
};

// ------------------------------------------------------------------ sketch: rough.js shapes
// kind: rect|circle|ellipse|line|polygon|path|arrow|curve, w, h, points, d, stroke, sw, fill, fill_style (hachure|solid|zigzag|cross-hatch|dots|dashed),
// roughness, bowing, hachure_gap, seed, boil (redraws per second for a hand-animated look), draw (track 0..1 stroke reveal)
export const sketch = {
  create(p, H) {
    const kind = p.kind ?? "rect", w = p.w ?? 300, h = p.h ?? w, pad = 6;
    const svg = H.svg("", w, h);
    const rc = H.rough.svg(svg);
    const opts = (seed) => ({ roughness: p.roughness ?? 1.5, bowing: p.bowing ?? 1.2, stroke: H.col(p.stroke ?? "#222"), strokeWidth: p.sw ?? 3,
      fill: p.fill ? H.col(p.fill) : undefined, fillStyle: p.fill_style ?? "hachure", hachureGap: p.hachure_gap ?? 10, hachureAngle: p.hachure_angle ?? -41,
      fillWeight: p.fill_weight ?? 2.2, seed });
    const draw = (seed) => {
      svg.innerHTML = "";
      const o = opts(seed);
      const pts = p.points ?? [[0, h / 2], [w, h / 2]];
      let n;
      switch (kind) {
        case "rect": n = rc.rectangle(pad, pad, w - 2 * pad, h - 2 * pad, o); break;
        case "circle": n = rc.circle(w / 2, h / 2, Math.min(w, h) - 2 * pad, o); break;
        case "ellipse": n = rc.ellipse(w / 2, h / 2, w - 2 * pad, h - 2 * pad, o); break;
        case "line": n = rc.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], o); break;
        case "polygon": n = rc.polygon(pts, o); break;
        case "curve": n = rc.curve(pts, o); break;
        case "path": n = rc.path(p.d, o); break;
        case "arrow": {
          n = document.createElementNS("http://www.w3.org/2000/svg", "g");
          n.appendChild(p.curve ? rc.curve(pts, o) : rc.linearPath(pts, o));
          const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hs = p.head ?? 28;
          n.appendChild(rc.linearPath([[b[0] + Math.cos(ang + 2.6) * hs, b[1] + Math.sin(ang + 2.6) * hs], b, [b[0] + Math.cos(ang - 2.6) * hs, b[1] + Math.sin(ang - 2.6) * hs]], o));
          break;
        }
        default: throw new Error(`sketch: unknown kind '${kind}'`);
      }
      svg.appendChild(n);
      lens = [...svg.querySelectorAll("path")].map((e) => [e, e.getTotalLength()]);
    };
    let lens = [], last = null;
    draw(p.seed ?? 1);
    return {
      el: svg, w, h, origin: ["rect", "circle", "ellipse"].includes(kind) ? "center" : "none",
      update(t, it) {
        if (p.boil) { const k = Math.floor(t * p.boil); if (k !== last) { draw((p.seed ?? 1) + k * 17); last = k; } }
        const d = it.v("draw", null);
        if (d != null) for (const [e, L] of lens) { e.style.strokeDasharray = `${L} ${L}`; e.style.strokeDashoffset = `${L * (1 - d)}`; }
      },
    };
  },
};

// ------------------------------------------------------------------ chart (D3)
// type: bar|hbar|line|pie|donut, data: [{label, value, color}], w, h, max, color, ink, size (labels), suffix, decimals,
// grow: {at, dur, stagger} (values grow from 0), values (show numbers, true)
export const chart = {
  origin: "center",
  create(p, H) {
    const d3 = H.d3, type = p.type ?? "bar", w = p.w ?? 800, h = p.h ?? 560, data = p.data ?? [];
    const ink = H.col(p.ink ?? "#ffffff"), fs = p.size ?? 30, pal = ["#ff8a3c", "#3fe0d0", "#ffd36b", "#ff5a7a", "#7a8cff", "#46e68c"];
    const colOf = (d, i) => H.col(d.color ?? p.color ?? pal[i % pal.length]);
    const svg = H.svg("", w, h);
    const sel = d3.select(svg);
    const fmt = (v) => `${v.toFixed(p.decimals ?? 0)}${p.suffix ?? ""}`;
    const grow = p.grow ?? {};
    const prog = (t, it, i) => H.ease(grow.ease ?? "outCubic")(H.P(t, (grow.at ?? startOf(p, it)) + i * (grow.stagger ?? 0.12), grow.dur ?? 0.8));
    let update;
    if (type === "bar" || type === "hbar") {
      const max = p.max ?? d3.max(data, (d) => d.value) * 1.1, hb = type === "hbar";
      const lab = hb ? (p.label_w ?? 220) : fs * 1.8;
      const band = d3.scaleBand().domain(data.map((d, i) => i)).range(hb ? [0, h] : [0, w]).padding(0.28);
      const lin = d3.scaleLinear().domain([0, max]).range(hb ? [0, w - lab - 120] : [0, h - lab - fs * 1.6]);
      const g = sel.append("g");
      const bars = g.selectAll("rect").data(data).join("rect").attr("rx", 10).attr("fill", colOf);
      const vals = g.selectAll("text.v").data(data).join("text").attr("class", "v").attr("font-family", "Montserrat").attr("font-weight", 900).attr("font-size", fs).attr("fill", ink);
      g.selectAll("text.l").data(data).join("text").attr("class", "l").attr("font-family", "Montserrat").attr("font-weight", 700).attr("font-size", fs * 0.8).attr("fill", ink)
        .attr("text-anchor", hb ? "end" : "middle").attr("x", (d, i) => (hb ? lab - 16 : band(i) + band.bandwidth() / 2)).attr("y", (d, i) => (hb ? band(i) + band.bandwidth() / 2 + fs * 0.28 : h - fs * 0.4)).text((d) => d.label);
      update = (t, it) => {
        bars.each(function (d, i) {
          const v = d.value * prog(t, it, i), L = lin(v);
          if (hb) d3.select(this).attr("x", lab).attr("y", band(i)).attr("width", Math.max(0, L)).attr("height", band.bandwidth());
          else d3.select(this).attr("x", band(i)).attr("y", h - lab - L).attr("width", band.bandwidth()).attr("height", Math.max(0, L));
        });
        if (p.values !== false) vals.each(function (d, i) {
          const v = d.value * prog(t, it, i), L = lin(v);
          d3.select(this).text(fmt(v)).attr("text-anchor", hb ? "start" : "middle").attr("x", hb ? lab + L + 14 : band(i) + band.bandwidth() / 2).attr("y", hb ? band(i) + band.bandwidth() / 2 + fs * 0.34 : h - lab - L - 14);
        });
      };
    } else if (type === "pie" || type === "donut") {
      const r = Math.min(w, h) / 2 - 10, arcs = d3.pie().sort(null).value((d) => d.value)(data);
      const arc = d3.arc().innerRadius(type === "donut" ? r * (p.hole ?? 0.58) : 0).outerRadius(r).cornerRadius(6).padAngle(0.012);
      const g = sel.append("g").attr("transform", `translate(${w / 2},${h / 2})`);
      const paths = g.selectAll("path").data(arcs).join("path").attr("fill", (d, i) => colOf(d.data, i));
      const labels = g.selectAll("text").data(arcs).join("text").attr("text-anchor", "middle").attr("font-family", "Montserrat").attr("font-weight", 900).attr("font-size", fs).attr("fill", "#fff");
      update = (t, it) => {
        const k = prog(t, it, 0);
        paths.attr("d", (d) => arc({ ...d, startAngle: d.startAngle * k, endAngle: d.endAngle * k }));
        labels.attr("transform", (d) => `translate(${arc.centroid({ ...d, startAngle: d.startAngle * k, endAngle: d.endAngle * k })})`).attr("opacity", k > 0.9 ? 1 : 0).text((d) => d.data.label ?? fmt(d.data.value));
      };
    } else if (type === "line") {
      const x = d3.scaleLinear().domain([0, data.length - 1]).range([40, w - 40]), y = d3.scaleLinear().domain([p.min ?? 0, p.max ?? d3.max(data, (d) => d.value) * 1.1]).range([h - 60, 30]);
      const line = d3.line().x((d, i) => x(i)).y((d) => y(d.value)).curve(d3.curveMonotoneX);
      sel.append("path").attr("d", `M40,${h - 60} H${w - 40}`).attr("stroke", H.rgba(ink, 0.3)).attr("stroke-width", 3);
      const path = sel.append("path").attr("d", line(data)).attr("fill", "none").attr("stroke", H.col(p.color ?? pal[0])).attr("stroke-width", 9).attr("stroke-linecap", "round");
      const dots = sel.selectAll("circle").data(data).join("circle").attr("cx", (d, i) => x(i)).attr("cy", (d) => y(d.value)).attr("r", 12).attr("fill", H.col(p.color ?? pal[0])).attr("stroke", "#fff").attr("stroke-width", 4);
      sel.selectAll("text").data(data).join("text").attr("x", (d, i) => x(i)).attr("y", h - 18).attr("text-anchor", "middle").attr("font-family", "Montserrat").attr("font-weight", 700).attr("font-size", fs * 0.75).attr("fill", ink).text((d) => d.label ?? "");
      const L = path.node().getTotalLength();
      update = (t, it) => {
        const k = prog(t, it, 0);
        path.attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L * (1 - k));
        dots.attr("opacity", (d, i) => (i / Math.max(1, data.length - 1) <= k + 0.001 ? 1 : 0));
      };
    } else throw new Error(`chart: unknown type '${type}'`);
    return { el: svg, w, h, update };
  },
};

// ------------------------------------------------------------------ map (D3-geo, Natural Earth countries)
// focus: country name(s) / ISO numeric id(s) to frame, highlight: [...], projection: mercator|natural|orthographic, rotate (track [lon, lat] for globes),
// w, h, land, ocean, stroke, hi (highlight color), detail: 50|110, pad, pins: [{lon, lat, label, at, color}]. Anchors: pin:i, lonlat:lon,lat
export const map = {
  origin: "center",
  async create(p, H) {
    const d3 = H.d3, w = p.w ?? 900, h = p.h ?? 900;
    const topo = await H.json(`/engine/hud/vendor/geo/countries-${p.detail ?? (p.projection === "orthographic" ? 110 : 50)}m.json`);
    const all = H.topojson.feature(topo, topo.objects.countries).features;
    const match = (f, q) => [].concat(q).some((x) => String(x) === String(f.id) || (f.properties.name || "").toLowerCase() === String(x).toLowerCase());
    const proj = p.projection === "orthographic" ? d3.geoOrthographic() : p.projection === "natural" ? d3.geoNaturalEarth1() : d3.geoMercator();
    const pad = p.pad ?? 40;
    if (p.projection === "orthographic") { proj.rotate([-(p.rotate?.[0] ?? 138), -(p.rotate?.[1] ?? 36)]).fitExtent([[pad, pad], [w - pad, h - pad]], { type: "Sphere" }); }
    else proj.fitExtent([[pad, pad], [w - pad, h - pad]], { type: "FeatureCollection", features: p.focus ? all.filter((f) => match(f, p.focus)) : all });
    const path = d3.geoPath(proj);
    const svg = H.svg("", w, h);
    svg.style.overflow = "hidden";
    svg.setAttribute("overflow", "hidden");
    const sel = d3.select(svg);
    if (p.ocean) { if (p.projection === "orthographic") sel.append("path").datum({ type: "Sphere" }).attr("class", "sph").attr("fill", H.col(p.ocean)); else sel.append("rect").attr("width", w).attr("height", h).attr("rx", 24).attr("fill", H.col(p.ocean)); }
    if (p.graticule) sel.append("path").datum(d3.geoGraticule10()).attr("class", "grat").attr("fill", "none").attr("stroke", H.rgba(p.graticule === true ? "#ffffff" : p.graticule, 0.18)).attr("stroke-width", 1.5);
    const hi = p.highlight ?? p.focus;
    const paths = sel.append("g").selectAll("path").data(all).join("path")
      .attr("fill", (f) => (hi && match(f, hi) ? H.col(p.hi ?? "#ff4a5a") : H.col(p.land ?? "#3b4a6e"))).attr("stroke", H.col(p.stroke ?? "#1b2238")).attr("stroke-width", p.sw ?? 1.2);
    const pins = (p.pins || []).map((pn) => {
      const g = sel.append("g");
      const c = H.col(pn.color ?? p.pin_color ?? "#ffd36b");
      g.append("circle").attr("class", "pulse").attr("r", 16).attr("fill", "none").attr("stroke", c).attr("stroke-width", 4);
      g.append("circle").attr("r", 11).attr("fill", c).attr("stroke", "#fff").attr("stroke-width", 4);
      if (pn.label) g.append("text").attr("x", 22).attr("y", 10).attr("font-family", "Montserrat").attr("font-weight", 900).attr("font-size", pn.size ?? 34).attr("fill", "#fff")
        .attr("paint-order", "stroke").attr("stroke", "rgba(0,0,0,.6)").attr("stroke-width", 6).text(pn.label);
      return { pn, g };
    });
    // routes: great-circle arcs drawn over time, with a glowing head and optional repeating "packets"
    const routes = (p.routes || []).map((rt) => {
      const c = H.col(rt.color ?? p.pin_color ?? "#4de1ff"), sw = rt.width ?? 6;
      const g = sel.append("g");
      const line = g.append("path").attr("fill", "none").attr("stroke", c).attr("stroke-width", sw).attr("stroke-linecap", "round")
        .style("filter", `drop-shadow(0 0 ${sw * 1.5}px ${c})`);
      const dots = Array.from({ length: 1 + (rt.packets ?? 0) }, () => g.append("circle").attr("r", sw * 1.5).attr("fill", "#fff").style("filter", `drop-shadow(0 0 ${sw * 2}px ${c})`));
      return { rt, line, dots };
    });
    const redraw = () => { paths.attr("d", path); sel.selectAll(".sph, .grat").attr("d", path); };
    redraw();
    let lastRot = null;
    return {
      el: svg, w, h,
      update(t, it) {
        if (p.projection === "orthographic" && it.tracks.rotate) {
          const r = it.v("rotate", [138, 36]);
          if (!lastRot || r[0] !== lastRot[0] || r[1] !== lastRot[1]) { proj.rotate([-r[0], -r[1]]); redraw(); lastRot = r; }
        }
        for (const { rt, line, dots } of routes) {
          const k = H.ease(rt.ease ?? "inOut")(H.P(t, rt.at ?? startOf(p, it), rt.dur ?? 1.4));
          line.attr("d", path({ type: "LineString", coordinates: [rt.src, rt.dst] }) || "");
          const node = line.node(), len = node.getTotalLength ? node.getTotalLength() : 0;
          line.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len * (1 - k)).attr("opacity", k > 0 ? 1 : 0);
          dots.forEach((d, i) => {
            const per = rt.period ?? 0.9, u = i === 0 ? k : ((t - (rt.at ?? 0) - (rt.dur ?? 1.4) + i * per / dots.length) % per) / per;
            const on = len > 0 && (i === 0 ? k > 0 && k < 1 : t > (rt.at ?? 0) + (rt.dur ?? 1.4) && u >= 0);
            if (!on) { d.attr("opacity", 0); return; }
            const pt = node.getPointAtLength(len * H.clamp(u));
            d.attr("cx", pt.x).attr("cy", pt.y).attr("opacity", 1);
          });
        }
        for (const { pn, g } of pins) {
          const xy = proj([pn.lon, pn.lat]);
          const k = H.P(t, pn.at ?? startOf(p, it), 0.4);
          g.attr("transform", `translate(${xy[0]},${xy[1]}) scale(${H.E.outBack(k)})`).attr("opacity", k > 0 ? 1 : 0);
          const ph = ((((t - (pn.at ?? 0)) % 1.4) + 1.4) % 1.4) / 1.4;
          g.select(".pulse").attr("r", 14 + ph * 40).attr("opacity", 1 - ph);
        }
      },
      anchor(name, args) {
        if (name === "pin") { const pn = (p.pins || [])[args[0] ?? 0]; return pn ? proj([pn.lon, pn.lat]) : null; }
        if (name === "lonlat") return proj([args[0], args[1]]);
        return null;
      },
    };
  },
};

// ------------------------------------------------------------------ holo: a three.js model from engine/hud/models (globe | still | tanker | yours)
// model, w, h, color, params: {name: value | track}, opts (model options). Anchors: any point the model reports.
export const holo = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? 600, h = p.h ?? 600;
    const MODELS = (await import("../../models/index.js")).default;
    const make = MODELS[p.model ?? "globe"];
    if (!make) throw new Error(`holo: unknown model '${p.model}' (${Object.keys(MODELS).join(", ")})`);
    const el = H.div(`width:${w}px;height:${h}px`);
    el.style.setProperty("--accent", H.rgbOf(p.color ?? "#3fe0d0"));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px`;
    el.appendChild(canvas);
    const model = make(canvas, H, p.opts || {});
    let pts = {};
    return {
      el, w, h,
      update(t, it) {
        const params = {};
        for (const [k, v] of Object.entries(p.params || {})) params[k] = H.track(v, t, 0);
        pts = model.render(t - startOf(p, it), params) || {};
      },
      anchor(name) { return pts[name] ?? null; },
    };
  },
};

// ------------------------------------------------------------------ particles (SVG, deterministic)
// kind: petals|snow|confetti|leaves (falling) · bubbles|dust|embers (rising) · steam (puffs from `from`) · sparkles|stars (twinkling in place) ·
// burst (confetti burst from `from` at `at`) · hearts (rising). region [x0, y0, x1, y1], count, size [a, b], speed, sway, wind, colors, alpha, seed
export const particles = {
  create(p, H) {
    const kind = p.kind ?? "petals", [x0, y0, x1, y1] = p.region ?? [0, 0, H.W, H.H], n = p.count ?? 40, rnd = H.rng(p.seed ?? 5);
    const [s0, s1] = p.size ?? ({ petals: [10, 18], snow: [3, 8], confetti: [10, 18], leaves: [14, 24], bubbles: [6, 18], dust: [2, 5], embers: [2, 5], steam: [30, 70], sparkles: [16, 34], stars: [8, 16], burst: [10, 18], hearts: [16, 30] }[kind] ?? [8, 16]);
    const pal = (p.colors ?? { petals: ["#ffc6d3", "#ffb2c5", "#ffe0e8"], snow: ["#ffffff"], confetti: ["#ff5a7a", "#ffd36b", "#3fe0d0", "#7a8cff", "#46e68c"], leaves: ["#e8a33a", "#d9783f", "#c4583a"],
      bubbles: ["#bfe6ff"], dust: ["#fff4d0"], embers: ["#ffb02e", "#ff7a3c"], steam: ["#ffffff"], sparkles: ["#fff4b0", "#ffffff"], stars: ["#ffd36b"], burst: ["#ff5a7a", "#ffd36b", "#3fe0d0", "#7a8cff", "#46e68c"], hearts: ["#ff5a7a", "#ff8aa8"] }[kind]).map((c) => H.col(c));
    const shape = (k, s, c) => ({
      petals: `<path d="M0,${-s / 2} Q${s / 2},${-s / 4} ${s / 6},${s / 2} L0,${s / 3} L${-s / 6},${s / 2} Q${-s / 2},${-s / 4} 0,${-s / 2} Z" fill="${c}"/>`,
      leaves: `<path d="M0,${-s / 2} Q${s / 2},0 0,${s / 2} Q${-s / 2},0 0,${-s / 2} Z" fill="${c}"/>`,
      confetti: `<rect x="${-s / 2}" y="${-s / 4}" width="${s}" height="${s / 2}" rx="2" fill="${c}"/>`, burst: `<rect x="${-s / 2}" y="${-s / 4}" width="${s}" height="${s / 2}" rx="2" fill="${c}"/>`,
      sparkles: `<path d="M0,${-s} Q${s * 0.12},${-s * 0.12} ${s},0 Q${s * 0.12},${s * 0.12} 0,${s} Q${-s * 0.12},${s * 0.12} ${-s},0 Q${-s * 0.12},${-s * 0.12} 0,${-s} Z" fill="${c}"/>`,
      stars: `<path d="${Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? s * 0.45 : s; return `${i ? "L" : "M"}${Math.cos(a) * r},${Math.sin(a) * r}`; }).join("")}Z" fill="${c}"/>`,
      bubbles: `<circle r="${s}" fill="${H.rgba(c, 0.15)}" stroke="${c}" stroke-width="2.5"/><circle cx="${-s * 0.35}" cy="${-s * 0.35}" r="${s * 0.22}" fill="#fff" opacity=".8"/>`,
      steam: `<circle r="${s}" fill="url(#STEAM)"/>`,
      hearts: `<path d="M0,${s * 0.9} L${-s * 0.8},${s * 0.1} Q${-s * 1.1},${-s * 0.5} ${-s * 0.45},${-s * 0.75} Q${-s * 0.1},${-s * 0.85} 0,${-s * 0.35} Q${s * 0.1},${-s * 0.85} ${s * 0.45},${-s * 0.75} Q${s * 1.1},${-s * 0.5} ${s * 0.8},${s * 0.1} Z" fill="${c}"/>`,
    }[k] ?? `<circle r="${s / 2}" fill="${c}"/>`);
    const gid = H.uid("st");
    const parts = Array.from({ length: n }, (_, i) => ({ x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0), s: s0 + rnd() * (s1 - s0), ph: rnd(), v: 0.6 + rnd() * 0.8, r: rnd() * 360, rs: (rnd() - 0.5) * 300, c: pal[i % pal.length], a: rnd() * 6.28, vx: (rnd() - 0.5), vy: rnd() }));
    const svg = H.svg(`<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
      + parts.map((q) => `<g>${shape(kind, q.s, q.c).replace("#STEAM", `#${gid}`)}</g>`).join(""), x1, y1);
    const els = [...svg.querySelectorAll(":scope > g")];
    const H2 = y1 - y0, W2 = x1 - x0, sp = p.speed ?? 1, sway = p.sway ?? 40, wind = p.wind ?? 20, alpha = p.alpha ?? 1;
    return {
      el: svg,
      update(t, it) {
        const u = t - startOf(p, it);
        parts.forEach((q, i) => {
          let x = q.x, y = q.y, rot = q.r, sc = 1, op = alpha;
          if (["petals", "snow", "confetti", "leaves"].includes(kind)) {
            const span = H2 + 120, f = (q.ph + (u * 120 * sp * q.v) / span) % 1;
            y = y0 - 60 + f * span;
            x = x0 + ((((q.x - x0) + wind * u + sway * Math.sin(u * 1.3 * q.v + q.a)) % W2) + W2) % W2;
            rot = q.r + u * q.rs;
            if (kind === "confetti" || kind === "leaves") sc = Math.cos(u * 4 * q.v + q.a);
          } else if (["bubbles", "dust", "embers", "hearts"].includes(kind)) {
            const span = H2 + 80, f = (q.ph + (u * 60 * sp * q.v) / span) % 1;
            y = y1 + 40 - f * span; x = q.x + sway * 0.5 * Math.sin(u * q.v + q.a);
            op = alpha * Math.sin(Math.PI * f);
          } else if (kind === "steam") {
            const [fx, fy] = p.from ?? [(x0 + x1) / 2, y1], life = 2.8 / sp, f = ((u + q.ph * life) % life) / life;
            x = fx + (q.vx * 60 + 40 * Math.sin(u * 0.9 + q.a)) * f + (p.drift ?? 0) * f; y = fy - (p.rise ?? 320) * f;
            sc = 0.4 + 1.2 * f; op = alpha * 0.6 * Math.sin(Math.PI * f);
          } else if (kind === "sparkles" || kind === "stars") {
            const tw = Math.max(0, Math.sin(u * (2 + q.v * 3) * sp + q.a)); sc = Math.pow(tw, 3); rot = kind === "stars" ? u * 40 + q.r : 0; op = alpha * sc;
          } else if (kind === "burst") {
            const [fx, fy] = p.from ?? [(x0 + x1) / 2, (y0 + y1) / 2], age = Math.max(0, u);
            const vx = q.vx * 1400 * sp, vy = -(500 + q.vy * 900) * sp;
            x = fx + vx * age * Math.exp(-age * 0.8); y = fy + vy * age + 900 * age * age; rot = q.r + age * q.rs * 2; sc = Math.cos(age * 6 * q.v + q.a);
            op = u < 0 ? 0 : alpha * H.clamp(2.5 - age);
          }
          const e = els[i];
          e.setAttribute("transform", `translate(${x},${y}) rotate(${rot}) scale(${sc},${Math.abs(sc) < 1 ? 1 : sc})`);
          e.setAttribute("opacity", op);
        });
      },
    };
  },
};
