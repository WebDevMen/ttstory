// City / ruins props for world3d (docs/DRAW3D.md §4.2): ready-made models (Poly Haven, Kenney, AI), a damaged road with
// sidewalks, ruined concrete/brick buildings with window openings, rebar and collapsing floors, rubble, grass breaking
// through cracks, drifting dust, sagging wires. Textures are real scanned PBR sets ("ph:<id>", world-scaled UVs in metres).
import * as THREE from "three";
import { mat, mesh, blob, rng, fbm, noise2 } from "./kit.js";
import { modelCopy, pbr, worldUV } from "./assets.js";

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);

// ------------------------------------------------------------------ model: any ready-made asset
// src ("ph:covered_car", "kenney/…/characterMedium.fbx", "ai/bus.glb"), height (m: scale to this height) or size (scale),
// tint (multiply color), decay (0..1: darker, browner, rougher — years of weather), skin (texture for Kenney characters),
// anim (clip name or index) + anim_speed, anim_from. Anchors: top, center.
export function model(P) {
  const { obj, animations } = modelCopy(P.src);
  const g = new THREE.Group();
  // normalise: base on y = 0, centred in x/z, optional target height
  const bb = new THREE.Box3().setFromObject(obj), sz = bb.getSize(new THREE.Vector3());
  let k = P.size ?? 1;
  if (P.height) k = P.height / Math.max(1e-6, sz.y);
  obj.scale.multiplyScalar(k);
  // a lying model scaled by its height becomes huge (a log 30 m across the street): say so in the render log
  if (P.height && Math.max(sz.x, sz.z) * k > 6 * P.height) console.error(`предупреждение: model ${P.src} с height ${P.height} м вышла ${(Math.max(sz.x, sz.z) * k).toFixed(1)} м в ширину — для лежачих/длинных моделей используйте size (docs/DRAW3D.md §8)`);
  const bb2 = new THREE.Box3().setFromObject(obj), c2 = bb2.getCenter(new THREE.Vector3());
  obj.position.x -= c2.x; obj.position.z -= c2.z; obj.position.y -= bb2.min.y;
  g.add(obj);
  const mats = [];
  obj.traverse((m) => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.push({ m: x, c: x.color ? x.color.clone() : null, r: x.roughness })); });
  if (P.skin) {
    const t = new THREE.TextureLoader().load(`/assets3d/${P.skin}`); t.colorSpace = THREE.SRGBColorSpace;
    mats.forEach((q) => { q.m.map = t; q.m.needsUpdate = true; });
  }
  if (P.tint) mats.forEach((q) => q.c && q.c.multiply(C(P.tint)));
  let mixer = null, action = null;
  if (animations.length && P.anim != null) {
    mixer = new THREE.AnimationMixer(obj);
    const clip = typeof P.anim === "number" ? animations[P.anim] : animations.find((a) => a.name === P.anim) ?? animations[0];
    action = mixer.clipAction(clip); action.play();
  }
  const rust = C("#5a3a22");
  const h = (bb2.max.y - bb2.min.y);
  g.userData.anchors = { top: [0, h, 0], center: [0, h / 2, 0] };
  if (P.shadow_blob !== false) g.add(blob(Math.max(sz.x, sz.z) * k * 0.6, 0.35));
  g.userData.update = (t, Q) => {
    const d = Math.max(0, Math.min(1, Q.decay ?? 0));
    mats.forEach((q) => { if (q.c) q.m.color.copy(q.c).lerp(rust, d * 0.55).multiplyScalar(1 - d * 0.35); if (q.r != null) q.m.roughness = Math.min(1, q.r + d * 0.4); });
    if (mixer) { mixer.setTime(Math.max(0, (t - (Q.anim_from ?? 0)) * (Q.anim_speed ?? 1))); }
  };
  return g;
}

// ------------------------------------------------------------------ road: asphalt along z with sidewalks and curbs
// from, to (z), width (carriageway), walk (sidewalk width), tex, walk_tex, ground_tex (beyond), ground (extra width each side)
export function road(P, W) {
  const z0 = P.from ?? 30, z1 = P.to ?? -250, L = z0 - z1, w = P.width ?? 10, sw = P.walk ?? 3.2, gw = P.ground ?? 60;
  const g = new THREE.Group();
  const plane = (x0, x1, y, tex, size, o = {}) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, L, Math.max(1, Math.round((x1 - x0) / 4)), Math.round(L / 4)).rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    worldUV(geo);
    const m = mesh(geo, tex ? pbr(tex, { size, ...o }) : mat(o.color ?? "#555", { flat: false }), { cast: false });
    g.add(m);
    return m;
  };
  plane(-w / 2, w / 2, 0, P.tex, P.tex_size ?? 6, { tint: P.tint });
  for (const s of [-1, 1]) {
    const xa = s * w / 2, xb = s * (w / 2 + sw);
    plane(Math.min(xa, xb) + 0.25, Math.max(xa, xb), 0.18, P.walk_tex ?? P.tex, P.walk_size ?? 3, { tint: P.walk_tint ?? "#c9c2b8" });
    // curb
    const cg = new THREE.BoxGeometry(0.25, 0.2, L); cg.translate(xa + s * 0.125, 0.09, (z0 + z1) / 2); worldUV(cg);
    g.add(mesh(cg, P.walk_tex ? pbr(P.walk_tex, { size: 1.5, tint: "#d8d2c8" }) : mat("#9a958d")));
    plane(s > 0 ? xb : xb - gw, s > 0 ? xb + gw : xb, 0.15, P.ground_tex ?? P.tex, P.ground_size ?? 5, { tint: P.ground_tint });
  }
  // lane markings, worn and broken
  if (P.lines !== false) {
    const r = rng(P.seed ?? 3), lm = new THREE.MeshStandardMaterial({ color: P.line_color ?? "#d9cfa8", roughness: 0.9, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let z = z0; z > z1; z -= 9) {
      if (r() < 0.25) continue;
      const len = 3 * (0.4 + r() * 0.6), d = mesh(new THREE.PlaneGeometry(0.16, len).rotateX(-Math.PI / 2), lm, { cast: false });
      d.position.set(0, 0.012, z - len / 2); g.add(d);
    }
  }
  W.heights.push((x, z) => (z < z1 || z > z0 ? null : Math.abs(x) <= w / 2 ? 0 : Math.abs(x) <= w / 2 + sw ? 0.18 : 0.15));
  return g;
}

// ------------------------------------------------------------------ ruin: a ruined multi-storey building
// w (along the street, x), d (depth), floors, fh (floor height), tex (facade), inner (interior tone), seed,
// broken (0..1 jaggedness of the top), missing ([sides]: "front","back","left","right" — collapsed walls),
// win ([cols] windows per facade),
// slabs (show floor slabs at openings), rebar (bars sticking out of the broken top). Anchors: top, roof.
// The windows' glow: lit (0..1), flicker. A falling facade: the separate `collapse` prop.
export function ruin(P, W) {
  const r = rng(P.seed ?? 11), w = P.w ?? 14, d = P.d ?? 12, n = P.floors ?? 5, fh = P.fh ?? 3.2, H = n * fh, th = P.thick ?? 0.35;
  const g = new THREE.Group();
  const wall = P.tex ? pbr(P.tex, { size: P.tex_size ?? 3, tint: P.tint }) : mat(P.color ?? "#9a948a", { flat: false });
  const slabM = P.slab_tex ? pbr(P.slab_tex, { size: 2.5, tint: "#b8b2a8" }) : wall;
  const broken = P.broken ?? 0.5, cols = (P.win ?? [])[0] ?? Math.max(2, Math.round(w / 3.4)), lit = [];
  const winM = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 1 });
  // jagged top line along a facade of length len: heights per x
  const topLine = (len, seed) => {
    const pts = [], m = Math.max(4, Math.round(len / 1.2));
    for (let i = 0; i <= m; i++) {
      const x = (i / m) * len, bite = Math.max(0, fbm(x * 0.18, seed, seed) + 0.15) * broken * fh * 2.6;
      pts.push([x, H - bite - (r() < broken * 0.35 ? r() * fh * 0.7 : 0)]);
    }
    return pts;
  };
  const facade = (len, side, seed) => {
    const top = topLine(len, seed);
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(len, 0);
    for (let i = top.length - 1; i >= 0; i--) s.lineTo(top[i][0], top[i][1]);
    s.lineTo(0, 0);
    const ww = 1.25, wh = 1.55, ncol = side === "front" || side === "back" ? cols : Math.max(2, Math.round(len / 3.4));
    const tAt = (x) => { let best = H; for (const [px, py] of top) if (Math.abs(px - x) < 1.4) best = Math.min(best, py); return best; };
    for (let f = 0; f < n; f++) for (let c = 0; c < ncol; c++) {
      const cx = ((c + 0.5) / ncol) * len, y0 = f * fh + (f === 0 ? 0.9 : 0.85);
      if (y0 + wh > tAt(cx) - 0.35) continue;
      const hole = new THREE.Path(), jag = () => (r() - 0.5) * 0.12 * (1 + broken);
      const x0 = cx - ww / 2, x1 = cx + ww / 2, y1 = y0 + wh;
      hole.moveTo(x0 + jag(), y0 + jag()); hole.lineTo(x1 + jag(), y0 + jag()); hole.lineTo(x1 + jag(), y1 + jag()); hole.lineTo(x0 + jag(), y1 + jag()); hole.lineTo(x0, y0);
      s.holes.push(hole);
      lit.push({ side, cx, y: (y0 + y1) / 2, k: r() });
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 1 });
    // UVs from shape coordinates are already in metres on the big faces
    const m = mesh(geo, wall);
    return m;
  };
  const sides = { front: [w, 0], back: [w, 180], left: [d, 90], right: [d, -90] };
  const missing = new Set(P.missing ?? []);
  for (const [side, [len, rot]] of Object.entries(sides)) {
    if (missing.has(side)) continue;
    const f = facade(len, side, (P.seed ?? 11) + len + rot);
    const gg = new THREE.Group(); gg.add(f);
    f.position.set(-len / 2, 0, -th / 2);
    gg.rotation.y = rot * D2R;
    const off = side === "front" ? [0, d / 2 - th / 2] : side === "back" ? [0, -d / 2 + th / 2] : side === "left" ? [-w / 2 + th / 2, 0] : [w / 2 - th / 2, 0];
    gg.position.set(off[0], 0, off[1]);
    g.add(gg);
  }
  // dark interior: inner walls (the openings look into a gloomy, burnt-out inside, not through to the sky)
  const inner = mesh(new THREE.BoxGeometry(w - th * 2.2, H * 0.98, d - th * 2.2), new THREE.MeshStandardMaterial({ color: C(P.inner ?? "#1a1714"), roughness: 1, side: THREE.BackSide }), { cast: false });
  inner.position.y = H * 0.49; g.add(inner);
  // floor slabs sticking out a little at the broken edges
  const slabs = [];
  if (P.slabs !== false) for (let f = 1; f < n; f++) {
    const sg = new THREE.BoxGeometry(w - th, 0.25, d - th); worldUV(sg);
    const sl = mesh(sg, slabM); sl.position.y = f * fh; g.add(sl); slabs.push(sl);
  }
  // rebar: rusty bars out of the top
  if (P.rebar !== false) {
    const rm = mat("#5b3a24", { rough: 0.8, metal: 0.4, flat: false });
    for (let i = 0; i < Math.round(w * 1.2 * broken); i++) {
      const L = 0.6 + r() * 1.6, b = mesh(new THREE.CylinderGeometry(0.018, 0.018, L, 5), rm);
      const onFront = r() < 0.5, x = (r() - 0.5) * (onFront ? w : th), z = onFront ? (r() < 0.5 ? 1 : -1) * (d / 2 - th / 2) : (r() - 0.5) * d;
      b.position.set(onFront ? x : (r() < 0.5 ? -1 : 1) * (w / 2 - th / 2), H - broken * fh * (0.4 + r()) + L / 2, z);
      b.rotation.set((r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.7); g.add(b);
    }
  }
  // windows that can glow (a box just behind each opening)
  for (const q of lit) {
    const b = mesh(new THREE.PlaneGeometry(1.2, 1.5), winM.clone(), { cast: false, receive: false });
    const [len] = sides[q.side];
    const loc = q.side === "front" ? [q.cx - len / 2, q.y, d / 2 - th - 0.05, 0] : q.side === "back" ? [len / 2 - q.cx, q.y, -d / 2 + th + 0.05, 180]
      : q.side === "left" ? [-w / 2 + th + 0.05, q.y, q.cx - len / 2, -90] : [w / 2 - th - 0.05, q.y, len / 2 - q.cx, 90];
    b.position.set(loc[0], loc[1], loc[2]); b.rotation.y = loc[3] * D2R; b.userData.k = q.k;
    g.add(b); q.m = b;
  }
  g.userData.anchors = { top: [0, H, d / 2], roof: [0, H, 0] };
  g.userData.update = (t, Q) => {
    const L = Q.lit ?? 0;
    for (const q of lit) if (q.m) q.m.material.emissiveIntensity = q.k < 0.55 ? 0 : L * (1.6 + 1.4 * q.k) * (Q.flicker ? (0.8 + 0.2 * Math.sin(t * 37 * q.k)) : 1);
  };
  return g;
}

// ------------------------------------------------------------------ collapse: a piece of facade breaks off and falls
// Placed at the top edge of a wall (pos), the wall runs along local x. fall_at (s, absolute: "@word") — when it breaks; w (m along the
// wall), n (chunks), size [a, b], dir [x, y, z] (outward push), tex, tex_size, tint, ground (world y of the street), seed.
export function collapse(P, W) {
  const r = rng(P.seed ?? 51), g = new THREE.Group(), w = P.w ?? 10, n = P.n ?? 16, [s0, s1] = P.size ?? [0.6, 2.2];
  const m = P.tex ? pbr(P.tex, { size: P.tex_size ?? 3, tint: P.tint }) : mat("#9a948a");
  const out = new THREE.Vector3(...(P.dir ?? [0, 0, 1])).normalize();
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = [s0 + r() * (s1 - s0), (s0 + r() * (s1 - s0)) * 0.6, 0.3 + r() * 0.3];
    const geo = new THREE.BoxGeometry(...s); worldUV(geo);
    const c = mesh(geo, m);
    const p0 = new THREE.Vector3((r() - 0.5) * w, -r() * 2.5, (r() - 0.5) * 0.4);
    list.push({ c, p0, s, delay: r() * 0.5 + (Math.abs(p0.x) / w) * 0.3, push: 1.2 + r() * 2.6, spin: new THREE.Vector3((r() - 0.5) * 5, (r() - 0.5) * 3, (r() - 0.5) * 5), side: (r() - 0.5) * 1.5 });
    g.add(c);
  }
  g.userData.update = (t, Q) => {
    const groundY = (P.ground ?? 0) - g.position.y;
    for (const q of list) {
      const u = Math.max(0, t - (Q.fall_at ?? 1e9) - q.delay);
      const yFree = q.p0.y - 9.8 * 0.5 * u * u, y = Math.max(groundY + q.s[1] / 2, yFree);
      // time of landing: slide stops there
      const tl = Math.sqrt(Math.max(0, 2 * (q.p0.y - groundY - q.s[1] / 2) / 9.8)), uu = Math.min(u, tl);
      q.c.position.set(q.p0.x + out.x * q.push * uu + q.side * uu * 0.3, y, q.p0.z + out.z * q.push * uu);
      q.c.rotation.set(q.spin.x * uu, q.spin.y * uu, q.spin.z * uu);
    }
  };
  return g;
}

// ------------------------------------------------------------------ rubble: a heap of broken concrete chunks
// r (radius), n, tex, h (height), seed
export function rubble(P) {
  const rr = rng(P.seed ?? 21), R = P.r ?? 2.5, n = P.n ?? 26, Hh = P.h ?? 1.2, g = new THREE.Group();
  const m = P.tex ? pbr(P.tex, { size: 1.5, tint: P.tint }) : mat("#8c857a");
  for (let i = 0; i < n; i++) {
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * R, s = 0.25 + rr() * 0.75 * (1 - d / R * 0.6);
    const geo = rr() < 0.5 ? new THREE.BoxGeometry(s * (1 + rr()), s * 0.6, s) : new THREE.DodecahedronGeometry(s * 0.6, 0);
    worldUV(geo);
    const c = mesh(geo, m);
    c.position.set(Math.cos(a) * d, Math.max(s * 0.25, Hh * (1 - d / R) * (0.6 + rr() * 0.5)), Math.sin(a) * d);
    c.rotation.set(rr() * 3, rr() * 3, rr() * 3); g.add(c);
  }
  g.add(blob(R * 1.2, 0.4));
  return g;
}

// ------------------------------------------------------------------ cracks_grass: grass blades breaking through cracks
// area [x0, z0, x1, z1], n (tufts), grow (0..1, animatable), h (m), color, color2, seed, lines (follow crack lines)
export function weeds(P) {
  const r = rng(P.seed ?? 31), [x0, z0, x1, z1] = P.area ?? [-5, -10, 5, 10], n = P.n ?? 120, per = P.blades ?? 9, hh = P.h ?? 0.45;
  const blade = new THREE.ConeGeometry(0.018, 1, 3, 1, true); blade.translate(0, 0.5, 0);
  const total = n * per;
  const im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }), total);
  im.castShadow = true; im.receiveShadow = true;
  const c1 = C(P.color ?? "#6f7f3a"), c2 = C(P.color2 ?? "#a69a52"), base = [];
  // tufts along a few crack polylines (or random)
  const lines = Array.from({ length: P.lines ?? 4 }, () => {
    let x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), a = r() * Math.PI * 2; const pts = [];
    for (let i = 0; i < 30; i++) { pts.push([x, z]); a += (r() - 0.5) * 0.9; x += Math.cos(a) * 0.6; z += Math.sin(a) * 0.6; }
    return pts;
  });
  for (let i = 0; i < n; i++) {
    const L = lines[i % lines.length], q = L[Math.floor(r() * L.length)], cx = q[0] + (r() - 0.5) * 0.2, cz = q[1] + (r() - 0.5) * 0.2, sz = 0.4 + r() * 0.9;
    for (let j = 0; j < per; j++) {
      const a = r() * Math.PI * 2;
      base.push({ x: cx + Math.cos(a) * 0.06 * sz, z: cz + Math.sin(a) * 0.06 * sz, h: hh * sz * (0.5 + r() * 0.7), tx: (r() - 0.5) * 0.9, tz: (r() - 0.5) * 0.9, ph: r() * 6, k: r() });
    }
  }
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  base.forEach((b, i) => im.setColorAt(i, c1.clone().lerp(c2, b.k)));
  const g = new THREE.Group(); g.add(im);
  g.userData.update = (t, Q) => {
    const grow = Math.max(0, Math.min(1, Q.grow ?? 1)), wind = Q.wind ?? 0.12;
    base.forEach((b, i) => {
      const gi = Math.max(0, Math.min(1, grow * 1.6 - b.k * 0.6));
      e.set(b.tx + Math.sin(t * 1.7 + b.ph) * wind, 0, b.tz + Math.cos(t * 1.3 + b.ph) * wind * 0.6);
      q4.setFromEuler(e); v.set(b.x, 0, b.z); s.set(1, Math.max(0.001, b.h * gi), 1);
      m4.compose(v, q4, s); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  return g;
}

// ------------------------------------------------------------------ dust: drifting particles in a volume (light catches them)
// box [x0, y0, z0, x1, y1, z1], n, size (px at 10 m), color, opacity, wind [x, y, z] (m/s), seed
export function dust(P) {
  const r = rng(P.seed ?? 41), [x0, y0, z0, x1, y1, z1] = P.box ?? [-15, 0, -60, 15, 12, 10], n = P.n ?? 1500;
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { base[i * 3] = r(); base[i * 3 + 1] = r(); base[i * 3 + 2] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const cx = cv.getContext("2d"), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({ size: P.size ?? 0.06, map: new THREE.CanvasTexture(cv), color: C(P.color ?? "#ffd9a8"), transparent: true, opacity: P.opacity ?? 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false;
  const g = new THREE.Group(); g.add(pts);
  const [wx, wy, wz] = P.wind ?? [0.6, 0.05, 0.3];
  g.userData.update = (t) => {
    const W = x1 - x0, Hh = y1 - y0, D = z1 - z0;
    for (let i = 0; i < n; i++) {
      const ph = base[i * 3] * 50;
      const x = (((base[i * 3] * W + wx * t + Math.sin(t * 0.7 + ph) * 0.4) % W) + W) % W;
      const y = (((base[i * 3 + 1] * Hh + wy * t + Math.sin(t * 0.5 + ph) * 0.3) % Hh) + Hh) % Hh;
      const z = (((base[i * 3 + 2] * D + wz * t) % D) + D) % D;
      pos[i * 3] = x0 + x; pos[i * 3 + 1] = y0 + y; pos[i * 3 + 2] = z0 + z;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return g;
}

// ------------------------------------------------------------------ wires: sagging cables between points
// points [[x, y, z], ...], sag (m), color, n (parallel cables), spread
export function wires(P) {
  const g = new THREE.Group(), pts = P.points ?? [[-8, 8, 0], [-8, 8, -30]], m = mat(P.color ?? "#1a1a1a", { flat: false, rough: 0.7 });
  for (let k = 0; k < (P.n ?? 3); k++) for (let i = 0; i + 1 < pts.length; i++) {
    const a = new THREE.Vector3(...pts[i]).add(new THREE.Vector3(0, -k * (P.spread ?? 0.35), 0)), b = new THREE.Vector3(...pts[i + 1]).add(new THREE.Vector3(0, -k * (P.spread ?? 0.35), 0));
    const mid = a.clone().lerp(b, 0.5); mid.y -= (P.sag ?? 1.2) * (1 + k * 0.15);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    g.add(mesh(new THREE.TubeGeometry(curve, 24, P.r ?? 0.025, 4), m, { receive: false }));
  }
  return g;
}

// ------------------------------------------------------------------ pole: a concrete/wood utility pole with a cross-arm
export function pole(P) {
  const h = P.h ?? 9, g = new THREE.Group(), m = P.tex ? pbr(P.tex, { size: 1.5, tint: P.tint ?? "#b5aea3" }) : mat("#6b5a48", { flat: false });
  const geo = new THREE.CylinderGeometry(0.12, 0.17, h, 10); geo.translate(0, h / 2, 0); worldUV(geo);
  g.add(mesh(geo, m));
  const arm = mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), mat("#3d3329")); arm.position.y = h - 0.4; g.add(arm);
  for (const x of [-0.75, 0, 0.75]) { const ins = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 8), mat("#cfd6d2", { flat: false, rough: 0.3 })); ins.position.set(x, h - 0.25, 0); g.add(ins); }
  g.rotation.z = (P.lean ?? 0) * D2R;
  g.userData.anchors = { top: [0, h, 0], arm_l: [-0.75, h - 0.2, 0], arm_c: [0, h - 0.2, 0], arm_r: [0.75, h - 0.2, 0] };
  return g;
}

// ------------------------------------------------------------------ lamp_glow: a light source with a visible halo (street lamps)
// color, power (0..1 animatable), r (halo size), flicker (0..1), range
export function lamp_glow(P) {
  const g = new THREE.Group();
  const light = new THREE.PointLight(C(P.color ?? "#ffcf8a"), 0, P.range ?? 18, 1.6); g.add(light);
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const cx = cv.getContext("2d"), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,240,210,1)"); gr.addColorStop(0.15, "rgba(255,200,130,0.6)"); gr.addColorStop(1, "rgba(255,170,90,0)");
  cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color: C(P.color ?? "#ffcf8a"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sp.scale.setScalar(P.r ?? 2.2); g.add(sp);
  g.userData.update = (t, Q) => {
    let k = Math.max(0, Q.power ?? 1);
    if (Q.flicker) k *= 1 - Q.flicker * (0.5 + 0.5 * Math.sin(t * 43 + Math.sin(t * 17) * 3)) * (noise2(t * 6, 1, 3) > 0 ? 1 : 0.2);
    light.intensity = 30 * k; sp.material.opacity = k; sp.visible = k > 0.01;
  };
  return g;
}
