// Basic actors: group, shape, text, image, svg.
// Actor = { origin, w, h, create(props, H, item) -> { el, w?, h?, origin?, update(t, item), anchor?(name, args) } }.
// In update() read animated values with item.v("prop", default); static props are in `props`.

// group: a container; children are full items positioned in the group's local coordinates
export const group = {
  async create(p, H) {
    const el = H.div(`width:${p.w ?? 0}px;height:${p.h ?? 0}px`);
    for (const c of p.children || []) await H.child(c, el);
    return { el, w: p.w, h: p.h };
  },
};

// stack: children laid out in a column (dir: v) or a row (dir: h) with equal gaps on one axis.
//   children / items: [...] (any actors; their x/y are set by the stack), gap (px, default 24),
//   align: center | start | end (cross axis), the stack's x/y is the centre of the whole block.
//   Sizes are measured every frame (after fonts load, while counters grow), so the block stays even.
export const stack = {
  origin: "center",
  async create(p, H, item) {
    const el = H.div("width:0;height:0");
    const kids = [];
    for (const c of p.children || p.items || []) kids.push(await H.child({ ...c, x: 0, y: 0 }, el));
    const dir = p.dir ?? "v", gap = p.gap ?? 24, align = p.align ?? "center";
    const size = (k) => {
      const s = Math.abs(k.v("scale", 1)) * (k.fitK ?? 1);
      return [(k.w || 0) * s, (k.h || 0) * s];
    };
    return {
      el, w: 0, h: 0,
      update(t) {
        const sz = kids.map(size), main = dir === "v" ? 1 : 0, cross = 1 - main;
        const total = sz.reduce((a, b) => a + b[main], 0) + gap * Math.max(0, kids.length - 1);
        const maxC = Math.max(0, ...sz.map((s) => s[cross]));
        let pos = -total / 2;
        kids.forEach((k, i) => {
          const along = pos + sz[i][main] / 2;
          pos += sz[i][main] + gap;
          const off = align === "start" ? -(maxC - sz[i][cross]) / 2 : align === "end" ? (maxC - sz[i][cross]) / 2 : 0;
          if (Math.abs((k.over[main ? "y" : "x"] ?? 0) - along) > 0.05 || Math.abs((k.over[main ? "x" : "y"] ?? 0) - off) > 0.05) H.layoutDirty = true;
          k.over[main ? "y" : "x"] = along;
          k.over[main ? "x" : "y"] = off;
          k.prepare(t);                    // re-place this frame (children render right after this update)
        });
      },
    };
  },
};

// shape: rect | circle | ellipse | line | polyline | polygon | path | star | ring | arc | arrow | triangle
//   w, h, r, radius, points, d, fill (color | {linear|radial: [c...], angle}), stroke, sw, dash, cap, join,
//   animated: fill, stroke, sw, w, h, r, start/end (arc, degrees), draw (0..1 stroke reveal), morph: [{at, d, dur, ease}]
function paint(H, spec, defs) {
  if (spec == null) return "none";
  if (typeof spec === "object" && !Array.isArray(spec) && (spec.linear || spec.radial)) {
    const id = H.uid("g");
    const stops = (spec.linear || spec.radial).map((c, i, a) => (Array.isArray(c) && typeof c[0] === "number" && c.length === 2
      ? `<stop offset="${c[0]}" stop-color="${H.col(c[1])}"/>` : `<stop offset="${i / Math.max(1, a.length - 1)}" stop-color="${H.col(c)}"/>`)).join("");
    if (spec.linear) {
      const an = ((spec.angle ?? 90) - 90) * (Math.PI / 180);
      const x = Math.cos(an) / 2, y = Math.sin(an) / 2;
      defs.innerHTML += `<linearGradient id="${id}" x1="${0.5 - x}" y1="${0.5 - y}" x2="${0.5 + x}" y2="${0.5 + y}">${stops}</linearGradient>`;
    } else defs.innerHTML += `<radialGradient id="${id}" cx="${spec.cx ?? 0.5}" cy="${spec.cy ?? 0.5}" r="${spec.r ?? 0.5}">${stops}</radialGradient>`;
    return `url(#${id})`;
  }
  return H.col(spec);
}
function starPts(n, r1, r2, cx, cy) {
  return Array.from({ length: n * 2 }, (_, i) => { const a = (i * Math.PI) / n - Math.PI / 2, r = i % 2 ? r2 : r1; return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`; }).join(" ");
}
function arcPath(cx, cy, r, a0, a1) {
  const A = (a) => ((a - 90) * Math.PI) / 180, large = Math.abs(a1 - a0) % 360 > 180 ? 1 : 0;
  if (Math.abs(a1 - a0) >= 359.99) return `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r}`;
  return `M${cx + r * Math.cos(A(a0))},${cy + r * Math.sin(A(a0))} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(A(a1))},${cy + r * Math.sin(A(a1))}`;
}
export const shape = {
  create(p, H) {
    const kind = p.kind || "rect";
    const boxed = ["rect", "circle", "ellipse", "star", "ring", "arc", "triangle"].includes(kind);
    let w = p.w ?? (p.r != null ? p.r * 2 : 100), h = p.h ?? (p.r != null ? p.r * 2 : w);
    const svg = H.svg("<defs></defs>", w, h);
    const defs = svg.querySelector("defs");
    const tag = { rect: "rect", circle: "circle", ellipse: "ellipse", line: "line", polyline: "polyline", polygon: "polygon", star: "polygon", triangle: "polygon", path: "path", ring: "circle", arc: "path", arrow: "path" }[kind];
    if (!tag) throw new Error(`shape: unknown kind '${kind}'`);
    const e = H.el(tag, {}, svg);
    const linear = ["line", "polyline", "arc", "ring", "arrow"].includes(kind);
    const fill0 = p.fill ?? (linear ? null : "white");
    e.setAttribute("fill", paint(H, fill0, defs));
    e.setAttribute("stroke", paint(H, p.stroke ?? (linear ? "white" : null), defs));
    e.setAttribute("stroke-linecap", p.cap ?? "round");
    e.setAttribute("stroke-linejoin", p.join ?? "round");
    if (p.dash) e.setAttribute("stroke-dasharray", Array.isArray(p.dash) ? p.dash.join(" ") : p.dash);
    if (p.fill_opacity != null) e.setAttribute("fill-opacity", p.fill_opacity);
    const animFill = typeof fill0 === "string" || Array.isArray(fill0), animStroke = typeof p.stroke === "string";
    const morphs = (p.morph || []).map((m) => ({ ...m }));
    let L = 0;
    const geom = (it) => {
      w = it.v("w", w); h = it.v("h", h);
      const r = it.v("r", Math.min(w, h) / 2);
      switch (kind) {
        case "rect": e.setAttribute("width", w); e.setAttribute("height", h); e.setAttribute("rx", it.v("radius", 0)); break;
        case "circle": case "ring": e.setAttribute("cx", w / 2); e.setAttribute("cy", h / 2); e.setAttribute("r", r); break;
        case "ellipse": e.setAttribute("cx", w / 2); e.setAttribute("cy", h / 2); e.setAttribute("rx", w / 2); e.setAttribute("ry", h / 2); break;
        case "line": { const pts = it.v("points", [[0, 0], [w, 0]]); e.setAttribute("x1", pts[0][0]); e.setAttribute("y1", pts[0][1]); e.setAttribute("x2", pts[1][0]); e.setAttribute("y2", pts[1][1]); break; }
        case "polyline": case "polygon": e.setAttribute("points", it.v("points", []).map((q) => q.join(",")).join(" ")); break;
        case "star": e.setAttribute("points", starPts(p.n ?? 5, r, r * (p.inner ?? 0.45), w / 2, h / 2)); break;
        case "triangle": e.setAttribute("points", `${w / 2},0 ${w},${h} 0,${h}`); break;
        case "path": if (!morphs.length) e.setAttribute("d", it.v("d", "")); break;
        case "arc": e.setAttribute("d", arcPath(w / 2, h / 2, r, it.v("start", 0), it.v("end", 360))); break;
        case "arrow": {
          const pts = it.v("points", [[0, h / 2], [w, h / 2]]), [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hs = p.head ?? 22;
          const l = (k) => `${b[0] + Math.cos(ang + k) * hs},${b[1] + Math.sin(ang + k) * hs}`;
          e.setAttribute("d", `${p.curve ? H.smoothPath(pts) : "M" + pts.map((q) => q.join(",")).join(" L")} M${l(Math.PI * 0.8)} L${b[0]},${b[1]} L${l(-Math.PI * 0.8)}`);
          break;
        }
        default: break;
      }
    };
    if (kind === "path" && morphs.length) {
      e.setAttribute("d", p.d);
      let from = p.d;
      for (const m of morphs) {
        m.tw = H.gsap.fromTo(e, { morphSVG: from }, { morphSVG: m.d, duration: 1, ease: "none", paused: true });
        from = m.d;
      }
      e.setAttribute("d", p.d);
    }
    return {
      el: svg, w, h, origin: boxed ? "center" : "none",
      update(t, it) {
        geom(it);
        e.setAttribute("stroke-width", it.v("sw", p.sw ?? (["line", "polyline", "arc", "ring", "arrow"].includes(kind) ? 6 : 0)));
        if (animFill) e.setAttribute("fill", H.col(it.v("fill", fill0)));
        if (animStroke) e.setAttribute("stroke", H.col(it.v("stroke", p.stroke)));
        const dr = it.v("draw", null);
        if (dr != null) {
          L = e.getTotalLength ? e.getTotalLength() : 0;
          e.style.strokeDasharray = `${L} ${L}`;
          e.style.strokeDashoffset = `${L * (1 - dr)}`;
        }
        if (morphs.length) {
          let act = null;
          for (const m of morphs) if (t >= m.at) act = m;
          if (act) act.tw.progress(H.ease(act.ease || "inOut")(H.P(t, act.at, act.dur ?? 0.6)));
          else morphs[0].tw.progress(0);
        }
      },
    };
  },
};

// text: kinetic typography. text (markup: **accent**, [colored](red), emoji), font (display|mono|tech|serif|round|hand|wide
// or a family), size, weight, color, accent, italic, upper, align, width, line, letter, stroke {w, color}, shadow, glow_text,
// bg {color, pad, radius}, reveal {by: char|word|line, mode: fade|pop|rise|drop|slam|blur|type|scramble, at, stagger, dur,
// sync: true (words appear with the voice)}, highlight [{at, until, word: i|"text", color}], count {from, to, at, dur, decimals, sep}
const norm = (w) => w.toLowerCase().replace(/ё/g, "е").replace(/[«»…,.!?:;—–"'()\-]/g, "");
export const text = {
  origin: "center",
  create(p, H, item) {
    const font = H.fonts[p.font] || p.font || "Montserrat";
    const size = p.size ?? 64;
    const el = H.div([
      `width:${p.width ? `${p.width}px` : "max-content"}`, `max-width:${p.width ?? 1000}px`,
      `font-family:"${font}","Rounded","Noto Color Emoji",sans-serif`, `font-weight:${p.weight ?? 900}`, `font-size:${size}px`,
      `line-height:${p.line ?? 1.08}`, `letter-spacing:${p.letter ?? 0}px`, `text-align:${p.align ?? "center"}`,
      `color:${H.col(p.color ?? "white")}`, `text-transform:${p.upper ? "uppercase" : "none"}`, `font-style:${p.italic ? "italic" : "normal"}`,
      p.stroke ? `-webkit-text-stroke:${p.stroke.w ?? 8}px ${H.col(p.stroke.color ?? "black")};paint-order:stroke fill` : "",
      p.shadow ? `text-shadow:${p.shadow === true ? "0 6px 18px rgba(0,0,0,.55)" : p.shadow}` : "",
      p.bg ? `background:${H.col(p.bg.color ?? "black")};padding:${p.bg.pad ?? "0.18em 0.45em"};border-radius:${p.bg.radius ?? 18}px` : "",
      p.accent ? `--accent-c:${H.col(p.accent)}` : "",
    ].filter(Boolean).join(";"));
    el.className = "d-text";
    let units = [], shown = null;
    const rv = p.reveal ? (typeof p.reveal === "string" ? { mode: p.reveal } : p.reveal) : null;
    const by = rv ? rv.by ?? (rv.mode === "type" || rv.mode === "scramble" ? "char" : "word") : null;
    const fill = (txt) => {
      el.innerHTML = H.markup(txt);
      units = [];
      if (!rv && !p.highlight) return;
      const walk = (node) => {
        for (const ch of [...node.childNodes]) {
          if (ch.nodeType === 3) {
            const frag = document.createDocumentFragment();
            for (const tok of ch.textContent.split(/(\s+)/)) {
              if (!tok) continue;
              if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); continue; }
              const wsp = document.createElement("span");
              wsp.className = "u";
              if (by === "char") {
                for (const c of [...tok]) { const cs = document.createElement("span"); cs.textContent = c; cs.style.display = "inline-block"; wsp.appendChild(cs); units.push({ el: cs, word: tok }); }
              } else { wsp.textContent = tok; units.push({ el: wsp, word: tok }); }
              frag.appendChild(wsp);
            }
            ch.replaceWith(frag);
          } else if (ch.nodeType === 1 && ch.tagName === "IMG") { units.push({ el: ch, word: "" }); ch.style.display = "inline-block"; }
          else if (ch.nodeType === 1 && ch.tagName !== "BR") walk(ch);
        }
      };
      walk(el);
      // voice-synced word times: match words of this text with the narrator's words after the item start
      if (rv && rv.sync) {
        const scene = H.shot.scene, t0 = (rv.at ?? item.at) - 0.3;
        const words = H.TL.words.filter((w) => w.scene === scene && w.start >= t0);
        let j = 0;
        for (const u of units) {
          const k = words.findIndex((w, i) => i >= j && norm(w.text) === norm(u.word));
          if (k >= 0) { u.at = words[k].start - 0.04; j = k + 1; }
        }
      }
    };
    // a counter is measured with its longest value, so that the anchor (center) stays put while the number grows
    const countText = (c, v) => {
      let n = Number(v).toFixed(c.decimals ?? 0);
      if (c.sep) n = n.replace(/\B(?=(\d{3})+(?!\d))/g, c.sep === true ? " " : c.sep);
      return (p.text ?? "{n}").replace("{n}", n);
    };
    const txt0 = p.count ? [countText(p.count, p.count.from ?? 0), countText(p.count, p.count.to ?? 100)].sort((a, b) => b.length - a.length)[0] : String(p.text ?? "");
    fill(txt0);
    shown = txt0;
    // lines: N — the font shrinks (down to min_size) until the text takes at most N lines in its width
    let fitted = null;
    const fitLines = () => {
      if (!p.lines || !el.isConnected || fitted === shown) return;
      let fs = size;
      const lh = p.line ?? 1.08, min = p.min_size ?? 26;
      el.style.fontSize = `${fs}px`;
      while (fs > min && el.scrollHeight > p.lines * fs * lh * 1.15) { fs = Math.max(min, fs * 0.94); el.style.fontSize = `${fs}px`; }
      fitted = shown;
    };
    return {
      el,
      update(t, it) {
        let txt = String(it.v("text", p.text ?? ""));
        if (p.count) {
          const c = p.count, k = H.ease(c.ease || "outCubic")(H.P(t, c.at ?? it.at, c.dur ?? 1));
          txt = countText(c, (c.from ?? 0) + ((c.to ?? 100) - (c.from ?? 0)) * k);
        }
        if (txt !== shown) { fill(txt); shown = txt; }
        fitLines();
        if (rv) {
          const at0 = rv.at ?? it.at, st = rv.stagger ?? (by === "char" ? 0.035 : 0.12), dur = rv.dur ?? (rv.mode === "type" ? 0.001 : 0.35);
          const mode = rv.mode ?? "rise";
          units.forEach((u, i) => {
            const k = H.P(t, u.at ?? at0 + i * st, dur), s = u.el.style;
            switch (mode) {
              case "fade": s.opacity = k; break;
              case "pop": s.opacity = H.clamp(k * 3); s.transform = `scale(${H.lerp(0.3, 1, H.E.outBack(k))})`; break;
              case "slam": s.opacity = H.clamp(k * 4); s.transform = `scale(${H.lerp(2.4, 1, H.E.outBack(k))})`; break;
              case "rise": s.opacity = H.clamp(k * 2.5); s.transform = `translateY(${(1 - H.E.outBack(k)) * 0.55}em)`; break;
              case "drop": s.opacity = H.clamp(k * 4); s.transform = `translateY(${-(1 - H.E.outBounce(k)) * 0.9}em)`; break;
              case "blur": s.opacity = k; s.filter = k < 1 ? `blur(${(1 - k) * 14}px)` : ""; break;
              case "type": s.opacity = k > 0 ? 1 : 0; break;
              case "scramble": {
                if (!u.orig) u.orig = u.el.textContent;
                s.opacity = H.P(t, (u.at ?? at0 + i * st) - 0.25, 0.05);
                u.el.textContent = k >= 1 || !u.orig.trim() ? u.orig : "АБВГДЕЖЗИКЛМНОПРСТУФХ0123456789#%"[Math.floor(H.hash(i + Math.floor(t * 20)) * 33)];
                break;
              }
              default: s.opacity = k;
            }
          });
        }
        if (p.highlight) {
          for (const u of units) u.el.style.color = "";
          for (const h of p.highlight) {
            if (t < h.at || t > (h.until ?? 1e9)) continue;
            units.forEach((u, i) => {
              if (h.word === i || (typeof h.word === "string" && norm(u.word) === norm(h.word))) {
                u.el.style.color = H.col(h.color ?? "amber");
                if (h.glow) u.el.style.textShadow = `0 0 24px ${H.col(h.color ?? "amber", 0.8)}`;
              }
            });
          }
        }
      },
    };
  },
};

// image: a picture file (src: path inside the project, svg/png/jpg/webp), a Twemoji (emoji: "🍙") or a built-in icon
// (icon: check|x|warning|heart|drop|lock|bolt|clock|star|...). w, h (or size), color (icons), fit
export const image = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? p.size ?? 200, h = p.h ?? p.size ?? w;
    const el = H.div(`width:${w}px;height:${h}px;display:grid;place-items:center`);
    if (p.emoji) {
      el.innerHTML = H.emoji(p.emoji, "emoji");
      el.firstElementChild.style.cssText = `width:${w}px;height:${h}px;font-size:${h * 0.9}px;line-height:1`;
    } else if (p.icon) {
      el.style.fontSize = `${h}px`;
      el.style.color = H.col(p.color ?? "white");
      el.innerHTML = H.icon(p.icon);
    } else if (p.src) {
      const img = new Image();
      img.src = H.asset(p.src);
      img.style.cssText = `width:${w}px;height:${h}px;object-fit:${p.fit ?? "contain"}`;
      el.appendChild(img);
      await img.decode().catch(() => { throw new Error(`image: cannot load ${p.src}`); });
    }
    const imgs = [...el.querySelectorAll("img")];
    if (imgs.length) await Promise.all(imgs.map((i) => i.decode().catch(() => null)));
    return { el, w, h, update(t, it) { if (p.icon && it.tracks.color) el.style.color = H.col(it.v("color")); } };
  },
};

// svg: your own vector art — inline `markup` or a file `src` (e.g. exported from Figma/Illustrator), scaled to w x h.
// parts: {"<css selector>": {fill, stroke, opacity, x, y, rot, scale, draw}} — every value may be a track.
export const svg = {
  async create(p, H) {
    const markup = p.markup ?? (await H.text(H.asset(p.src)));
    const host = H.div();
    host.innerHTML = markup.trim();
    const s = host.querySelector("svg");
    if (!s) throw new Error("svg actor: no <svg> in markup/src");
    const vb = (s.getAttribute("viewBox") || `0 0 ${s.getAttribute("width") || 100} ${s.getAttribute("height") || 100}`).split(/[\s,]+/).map(Number);
    const w = p.w ?? (p.h ? (p.h * vb[2]) / vb[3] : vb[2]), h = p.h ?? (w * vb[3]) / vb[2];
    s.setAttribute("width", w); s.setAttribute("height", h);
    if (!s.getAttribute("viewBox")) s.setAttribute("viewBox", vb.join(" "));
    s.style.overflow = "visible";
    const parts = Object.entries(p.parts || {}).map(([sel, spec]) => {
      const els = [...s.querySelectorAll(sel)];
      if (!els.length) console.error(`svg actor: selector '${sel}' matched nothing`);
      els.forEach((e) => { e.style.transformBox = "fill-box"; e.style.transformOrigin = spec.origin ?? "50% 50%"; });
      return { els, spec, lens: null };
    });
    return {
      el: host, w, h, origin: "center",
      update(t) {
        for (const pt of parts) {
          const v = (k, d) => H.track(pt.spec[k], t, d);
          for (const e of pt.els) {
            if (pt.spec.fill != null) e.style.fill = H.col(v("fill"));
            if (pt.spec.stroke != null) e.style.stroke = H.col(v("stroke"));
            if (pt.spec.opacity != null) e.style.opacity = v("opacity", 1);
            if (["x", "y", "rot", "scale"].some((k) => pt.spec[k] != null)) e.style.transform = `translate(${v("x", 0)}px, ${v("y", 0)}px) rotate(${v("rot", 0)}deg) scale(${v("scale", 1)})`;
            if (pt.spec.draw != null && e.getTotalLength) {
              const L = e.getTotalLength(), k = v("draw", 1);
              e.style.strokeDasharray = `${L} ${L}`; e.style.strokeDashoffset = `${L * (1 - k)}`;
            }
          }
        }
      },
    };
  },
};
