// Library of procedural 3D props for `world3d` (docs/DRAW3D.md §4). Each prop: (P, W) -> THREE.Object3D, where P are the
// object's params from YAML (static values at build time) and W is the world (kit.createWorld). An object may set
//   obj.userData.update(t, P)  — per-frame animation (P holds the current values of animated params),
//   obj.userData.anchors       — named local points {top: [x, y, z]} for callouts and HUD anchors,
//   W.heights.push(fn)         — a ground surface: fn(x, z) -> y (objects with `ground: true` stand on it).
// Units: 1 = 1 metre. y is up, the camera usually looks toward -z. Low-poly, flat-shaded, physically lit.
import { THREE, mat, mesh, blob, rng, fbm, noise2 } from "./kit.js";

const D2R = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const group = (...kids) => { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; };
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

// paint vertices by a function of position/normal (for terrain): fn(x, y, z, ny) -> THREE.Color
function paint(geo, fn) {
  const p = geo.attributes.position, n = geo.attributes.normal, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = fn(p.getX(i), p.getY(i), p.getZ(i), n ? n.getY(i) : 1);
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
}
const C = (h) => new THREE.Color(h);

// ------------------------------------------------------------------ ground: a wide field with gentle hills
// size, color, color2 (patches), hills (m), seed, res
export function ground(P, W) {
  const size = P.size ?? 400, res = P.res ?? 120, hills = P.hills ?? 0.6, seed = P.seed ?? 1;
  const g = new THREE.PlaneGeometry(size, size, res, res).rotateX(-Math.PI / 2);
  const hAt = (x, z) => fbm(x * 0.03, z * 0.03, seed) * hills * 2 + (P.y ?? 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const c1 = C(P.color ?? "#7aa356"), c2 = C(P.color2 ?? "#9cb866");
  paint(g, (x, y, z) => c1.clone().lerp(c2, 0.5 + 0.5 * fbm(x * 0.08, z * 0.08, seed + 5)));
  W.heights.push(hAt);
  return mesh(g, mat("#ffffff", { vc: true, rough: 0.95 }), { cast: false });
}

// ------------------------------------------------------------------ sea: animated low-poly water
// size, res, color, deep, wave (m), speed, choppy. Exposes W.waveAt(x, z, t) for floating objects.
export function sea(P, W) {
  const size = P.size ?? 600, res = P.res ?? 160, amp = P.wave ?? 0.35, sp = P.speed ?? 1, y0 = P.y ?? 0;
  const g = new THREE.PlaneGeometry(size, size, res, res).rotateX(-Math.PI / 2);
  const base = Float32Array.from(g.attributes.position.array);
  const waves = [[0.9, 0.06, 0.35, 1.0], [-0.4, 0.11, 0.6, 0.55], [0.2, -0.17, 0.9, 0.35], [-0.7, -0.05, 0.45, 0.6]];
  const waveAt = (x, z, t) => {
    let y = 0;
    for (const [dx, dz, w, a] of waves) y += a * Math.sin((x * dx + z * dz) * w * 2.2 + t * sp * (1.1 + w));
    return y0 + y * amp * 0.5;
  };
  W.waveAt = waveAt;
  W.heights.push((x, z) => y0 - 0.05);
  const deep = C(P.deep ?? "#0d4a6b"), shallow = C(P.color ?? "#1f7f9a");
  const cols = new Float32Array(base.length);
  for (let i = 0; i < base.length / 3; i++) {
    const x = base[i * 3], z = base[i * 3 + 2], d = Math.min(1, Math.hypot(x, z) / (size * 0.5));
    const k = shallow.clone().lerp(deep, 0.35 + 0.65 * d + 0.08 * noise2(x * 0.05, z * 0.05, 3));
    cols[i * 3] = k.r; cols[i * 3 + 1] = k.g; cols[i * 3 + 2] = k.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const m = mesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: P.rough ?? 0.18, metalness: 0.05, flatShading: true }), { cast: false });
  m.userData.update = (t) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, waveAt(base[i * 3], base[i * 3 + 2], t));
    p.needsUpdate = true;
    g.computeVertexNormals();
  };
  return m;
}

// ------------------------------------------------------------------ island: rocky hill with a beach and grass top
// radius, height, seed, grass, sand, rock. Registers its height for `ground: true` objects.
export function island(P, W) {
  const R = P.radius ?? 14, Hh = P.height ?? 5, seed = P.seed ?? 2, [cx, , cz] = P._pos ?? [0, 0, 0];
  const top = P.plateau ?? 0.45;
  const prof = (d) => {                       // d = distance / R
    if (d < top) return 1 - 0.08 * (d / top) ** 2;
    const f = (d - top) / (1 - top);
    return 0.92 * (1 - Math.pow(Math.min(1.25, f), 1.6));
  };
  const hAt = (x, z) => {
    const d = Math.hypot(x, z) / (R * (1 + 0.18 * noise2(Math.atan2(z, x) * 2, 0.5, seed)));
    return Hh * prof(d) + fbm(x * 0.25, z * 0.25, seed) * 0.6 * Math.min(1, d * 1.5);
  };
  const g = new THREE.CircleGeometry(R * 1.35, 96, 0, Math.PI * 2);
  // densify: rebuild as a polar grid for smoother slopes
  const rings = 34, segs = 120, pos = [], idx = [];
  pos.push(0, hAt(0, 0), 0);
  for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) {
    const rr = (r / rings) * R * 1.35, a = (s / segs) * Math.PI * 2, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    pos.push(x, hAt(x, z), z);
  }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + ((s + 1) % segs), 1 + s);
  for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) {
    const a = 1 + (r - 1) * segs + s, b = 1 + (r - 1) * segs + ((s + 1) % segs), c = a + segs, d = b + segs;
    idx.push(a, b, c, b, d, c);
  }
  g.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const ng = geo.toNonIndexed();
  ng.computeVertexNormals();
  const grass = C(P.grass ?? "#6f9d4a"), grass2 = C(P.grass2 ?? "#8db35a"), sand = C(P.sand ?? "#e3cf9a"), rock = C(P.rock ?? "#7d7468"), wet = C("#6b5d48");
  paint(ng, (x, y, z, ny) => {
    if (y < 0.15) return wet;
    if (y < 0.75) return sand;
    if (ny < 0.72) return rock.clone().lerp(C("#9a8f80"), 0.5 + 0.5 * noise2(x, z, 9));
    return grass.clone().lerp(grass2, 0.5 + 0.5 * fbm(x * 0.3, z * 0.3, seed + 3));
  });
  W.heights.push((x, z) => { const v = hAt(x - cx, z - cz); return v > -0.5 ? v + (P._pos?.[1] ?? 0) : null; });
  return mesh(ng, mat("#ffffff", { vc: true, rough: 0.92 }));
}

// ------------------------------------------------------------------ rock / cliff boulders
export function rock(P) {
  const r = rng(P.seed ?? 3), s = P.size ?? 1.2;
  const g = new THREE.DodecahedronGeometry(s, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.75 + r() * 0.45; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (P.flat ?? 0.7), p.getZ(i) * k); }
  g.computeVertexNormals();
  return mesh(g, mat(P.color ?? "#827a6e", { rough: 0.95 }));
}

// ------------------------------------------------------------------ lighthouse
// height, stripes (count), colors [a, b], plain (0..1: stripes fade to the plain color — "white tower"), plain_color,
// lamp (0..1 brightness), beam (0..1 beam visibility), spin (deg/s), gallery color. Anchors: top, lamp, base.
export function lighthouse(P, W) {
  const Ht = P.height ?? 12, r0 = Ht * 0.13, r1 = Ht * 0.085, n = (P.stripes ?? 4) * 2;
  const g = new THREE.Group();
  const cA = C((P.colors ?? ["#d62b2b", "#f4f1ea"])[0]), cB = C((P.colors ?? ["#d62b2b", "#f4f1ea"])[1]), plain = C(P.plain_color ?? "#f4f1ea");
  const bands = [];
  for (let i = 0; i < n; i++) {
    const y0 = (i / n) * Ht, y1 = ((i + 1) / n) * Ht, ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
    const m = new THREE.MeshStandardMaterial({ color: (i % 2 ? cB : cA).clone(), roughness: 0.6, flatShading: false });
    const b = mesh(new THREE.CylinderGeometry(rb, ra, y1 - y0, 40, 1), m);
    b.position.y = (y0 + y1) / 2;
    b.userData.base = (i % 2 ? cB : cA).clone();
    bands.push(b); g.add(b);
  }
  const iron = mat(P.gallery ?? "#2b2f36", { rough: 0.5, metal: 0.6, flat: false });
  // gallery (balcony) with railing
  const gal = mesh(new THREE.CylinderGeometry(r1 * 1.55, r1 * 1.35, Ht * 0.03, 40), iron);
  gal.position.y = Ht + Ht * 0.015; g.add(gal);
  const rail = mesh(new THREE.TorusGeometry(r1 * 1.5, Ht * 0.006, 6, 48), iron);
  rail.rotation.x = Math.PI / 2; rail.position.y = Ht + Ht * 0.09; g.add(rail);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, post = mesh(new THREE.CylinderGeometry(Ht * 0.004, Ht * 0.004, Ht * 0.075, 4), iron);
    post.position.set(Math.cos(a) * r1 * 1.5, Ht + Ht * 0.055, Math.sin(a) * r1 * 1.5); g.add(post);
  }
  // lantern room: glass, frames, dome
  const lr = r1 * 0.95, lh = Ht * 0.14, ly = Ht + Ht * 0.03;
  const glass = mesh(new THREE.CylinderGeometry(lr, lr, lh, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), { cast: false });
  glass.position.y = ly + lh / 2; g.add(glass);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, f = mesh(new THREE.BoxGeometry(Ht * 0.008, lh, Ht * 0.008), iron);
    f.position.set(Math.cos(a) * lr, ly + lh / 2, Math.sin(a) * lr); g.add(f);
  }
  const dome = mesh(new THREE.SphereGeometry(lr * 1.08, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(P.roof ?? "#20262e", { rough: 0.4, metal: 0.7, flat: false }));
  dome.position.y = ly + lh; g.add(dome);
  const vane = mesh(new THREE.ConeGeometry(Ht * 0.012, Ht * 0.07, 8), iron);
  vane.position.y = ly + lh + lr * 1.08 + Ht * 0.03; g.add(vane);
  // the lamp and its beam
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd77a, emissiveIntensity: 1, roughness: 0.3 });
  const lamp = mesh(new THREE.SphereGeometry(lr * 0.45, 16, 12), lampM, { cast: false });
  lamp.position.y = ly + lh * 0.5; g.add(lamp);
  const light = new THREE.PointLight(0xffd88a, 0, Ht * 4, 1.6);
  light.position.copy(lamp.position); g.add(light);
  const beamGeo = new THREE.ConeGeometry(Ht * 0.55, Ht * 9, 32, 1, true);
  beamGeo.translate(0, -Ht * 4.5, 0); beamGeo.rotateZ(Math.PI / 2);
  const beamM = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(beamGeo, beamM);
  const beam2 = new THREE.Mesh(beamGeo, beamM);
  beam2.rotation.y = Math.PI;
  const spinner = group(beam, beam2);
  spinner.position.copy(lamp.position); g.add(spinner);
  // door and windows
  const door = mesh(new THREE.BoxGeometry(r0 * 0.5, Ht * 0.12, 0.1), mat("#3a2a20"));
  door.position.set(0, Ht * 0.06, r0 * 0.98); g.add(door);
  for (const y of [0.35, 0.6, 0.82]) {
    const w = mesh(new THREE.BoxGeometry(r0 * 0.28, Ht * 0.05, 0.08), mat("#1d2a36", { rough: 0.2, metal: 0.3 }));
    const rr = r0 + (r1 - r0) * y;
    w.position.set(0, Ht * y, rr * 0.99); g.add(w);
  }
  g.add(blob(r0 * 2.2, 0.35));
  g.userData.anchors = { top: [0, ly + lh + lr * 1.1 + Ht * 0.07, 0], lamp: [0, ly + lh * 0.5, 0], base: [0, 0, 0], mid: [0, Ht * 0.5, r0] };
  g.userData.update = (t, Q) => {
    const k = Math.max(0, Math.min(1, Q.plain ?? 0));
    bands.forEach((b) => b.material.color.copy(b.userData.base).lerp(plain, k));
    const L = Q.lamp ?? 0.6, B = Q.beam ?? 0;
    lampM.emissiveIntensity = 0.3 + 4 * L;
    light.intensity = 40 * L;
    beamM.opacity = 0.16 * B;
    spinner.visible = B > 0.01;
    spinner.rotation.y = (t * (Q.spin ?? 40)) * D2R;
  };
  return g;
}

// ------------------------------------------------------------------ house: walls, gable roof, door, windows (lit at night)
// w, d, h (walls), roof color, wall color, lit (0..1), chimney
export function house(P) {
  const w = P.w ?? 6, d = P.d ?? 5, h = P.h ?? 3.2, rh = P.roof_h ?? w * 0.38;
  const g = new THREE.Group();
  const walls = mesh(new THREE.BoxGeometry(w, h, d), mat(P.wall ?? "#f1e6d2"));
  walls.position.y = h / 2; g.add(walls);
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.35, 0), new THREE.Vector2(w / 2 + 0.35, 0), new THREE.Vector2(0, rh)]);
  const roof = mesh(new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false }), mat(P.roof ?? "#a8473a"));
  roof.position.set(0, h, -d / 2 - 0.3); g.add(roof);
  const win = new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0xffc35a, emissiveIntensity: 0, roughness: 0.2 });
  const wins = [];
  for (const x of [-w * 0.28, w * 0.28]) { const m = mesh(new THREE.BoxGeometry(w * 0.16, h * 0.28, 0.08), win); m.position.set(x, h * 0.55, d / 2 + 0.02); g.add(m); wins.push(m); }
  const door = mesh(new THREE.BoxGeometry(w * 0.15, h * 0.55, 0.08), mat(P.door ?? "#5a3826"));
  door.position.set(0, h * 0.275, d / 2 + 0.02); g.add(door);
  if (P.chimney !== false) { const ch = mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mat("#8a5a48")); ch.position.set(w * 0.22, h + rh * 0.55, -d * 0.15); g.add(ch); }
  g.add(blob(Math.max(w, d) * 0.85, 0.4));
  g.userData.anchors = { top: [0, h + rh, 0], door: [0, h * 0.3, d / 2] };
  g.userData.update = (t, Q) => { win.emissiveIntensity = 2.5 * (Q.lit ?? 0); };
  return g;
}

// ------------------------------------------------------------------ tree: pine | round | palm
export function tree(P) {
  const r = rng(P.seed ?? 4), h = P.h ?? 5, kind = P.kind ?? "pine";
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(h * 0.035, h * 0.05, h * 0.4, 6), mat(P.trunk ?? "#6b4a32"));
  trunk.position.y = h * 0.2; g.add(trunk);
  const leaf = mat(P.color ?? (kind === "pine" ? "#2f6a3f" : "#4f8f3c"));
  if (kind === "pine") {
    for (let i = 0; i < 4; i++) {
      const s = 1 - i * 0.2, c = mesh(new THREE.ConeGeometry(h * 0.28 * s, h * 0.42, 7), leaf);
      c.position.y = h * (0.32 + i * 0.17); c.rotation.y = r() * 3; g.add(c);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const s = h * (0.2 + r() * 0.1), c = mesh(new THREE.IcosahedronGeometry(s, 0), leaf);
      c.position.set((r() - 0.5) * h * 0.35, h * (0.55 + r() * 0.3), (r() - 0.5) * h * 0.35); g.add(c);
    }
  }
  g.rotation.y = r() * Math.PI * 2;
  g.add(blob(h * 0.3, 0.35));
  g.userData.anchors = { top: [0, h, 0] };
  return g;
}

// ------------------------------------------------------------------ cloud: a cluster of soft lumps (no shadows)
export function cloud(P) {
  const r = rng(P.seed ?? 6), s = P.size ?? 8;
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: P.color ?? 0xffffff, roughness: 1, flatShading: true, emissive: 0xffffff, emissiveIntensity: P.glow ?? 0.25, transparent: true, opacity: P.opacity ?? 0.95 });
  const n = P.lumps ?? 7;
  for (let i = 0; i < n; i++) {
    const k = s * (0.35 + r() * 0.3), b = mesh(new THREE.IcosahedronGeometry(k, 1), m, { cast: false, receive: false });
    b.position.set((i / (n - 1) - 0.5) * s * 1.8 + (r() - 0.5) * s * 0.3, (r() - 0.2) * s * 0.25, (r() - 0.5) * s * 0.5);
    b.scale.y = 0.65; g.add(b);
  }
  g.userData.update = (t, Q) => { g.position.x = (Q._pos?.[0] ?? 0) + t * (Q.drift ?? 0.4); };
  return g;
}

// ------------------------------------------------------------------ boat: a small fishing boat that rides the waves
export function boat(P, W) {
  const L = P.length ?? 6, g = new THREE.Group(), hull = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-L / 2, 0.9); shape.lineTo(L / 2, 1.1); shape.quadraticCurveTo(L * 0.42, 0, L * 0.2, -0.1); shape.lineTo(-L / 2 + 0.2, -0.1); shape.lineTo(-L / 2, 0.9);
  const hg = new THREE.ExtrudeGeometry(shape, { depth: L * 0.36, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 });
  hg.translate(0, 0, -L * 0.18);
  hull.add(mesh(hg, mat(P.color ?? "#2a5d8f", { rough: 0.6 })));
  const stripe = mesh(new THREE.BoxGeometry(L * 0.98, 0.14, L * 0.4), mat(P.stripe ?? "#f2f0ea"));
  stripe.position.y = 0.85; hull.add(stripe);
  const cab = mesh(new THREE.BoxGeometry(L * 0.28, 1.2, L * 0.26), mat("#f2f0ea"));
  cab.position.set(-L * 0.12, 1.55, 0); hull.add(cab);
  const cr = mesh(new THREE.BoxGeometry(L * 0.32, 0.12, L * 0.3), mat("#c9472f")); cr.position.set(-L * 0.12, 2.2, 0); hull.add(cr);
  const mast = mesh(new THREE.CylinderGeometry(0.05, 0.06, 3, 6), mat("#d9d4c7")); mast.position.set(L * 0.12, 2.3, 0); hull.add(mast);
  g.add(hull);
  g.userData.anchors = { top: [0, 3.8, 0] };
  g.userData.update = (t, Q) => {
    const p = g.position, wa = W.waveAt || (() => 0);
    const y = wa(p.x, p.z, t), yx = wa(p.x + L / 2, p.z, t) - wa(p.x - L / 2, p.z, t), yz = wa(p.x, p.z + 1, t) - wa(p.x, p.z - 1, t);
    hull.position.y = y - 0.35;
    hull.rotation.z = Math.atan2(yx, L) * 0.8;
    hull.rotation.x = -Math.atan2(yz, 2) * 0.6;
  };
  return g;
}

// ------------------------------------------------------------------ mountains: a ring of far low-poly peaks (fogged)
// radius, count, height [a, b], color, seed, arc [from, to] (degrees around the origin, 0 = -z)
export function mountains(P) {
  const r = rng(P.seed ?? 8), R = P.radius ?? 400, n = P.count ?? 14, [h0, h1] = P.height ?? [40, 110], [a0, a1] = P.arc ?? [-80, 80];
  const g = new THREE.Group(), m = mat(P.color ?? "#55657a", { rough: 1 });
  for (let i = 0; i < n; i++) {
    const a = (a0 + (a1 - a0) * (i + r() * 0.6) / n) * D2R, h = h0 + r() * (h1 - h0), rr = R * (0.9 + r() * 0.25);
    const c = mesh(new THREE.ConeGeometry(h * (1.1 + r() * 0.6), h, 5 + Math.floor(r() * 3), 2), m, { cast: false });
    const pp = c.geometry.attributes.position;
    for (let k = 0; k < pp.count; k++) if (pp.getY(k) < h / 2 - 0.01 && pp.getY(k) > -h / 2 + 0.01) pp.setX(k, pp.getX(k) * (0.85 + r() * 0.3));
    c.geometry.computeVertexNormals();
    c.position.set(Math.sin(a) * rr, h / 2 - 4, -Math.cos(a) * rr); c.rotation.y = r() * 3;
    g.add(c);
  }
  return g;
}

// ------------------------------------------------------------------ birds: a flapping flock flying along a direction
export function birds(P) {
  const r = rng(P.seed ?? 9), n = P.count ?? 7, g = new THREE.Group(), m = mat(P.color ?? "#2a2a30", { double: true });
  const list = [];
  for (let i = 0; i < n; i++) {
    const wing = new THREE.BufferGeometry();
    wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.15, 0, 0, 0.15, 0.9, 0, 0], 3));
    wing.computeVertexNormals();
    const L = new THREE.Mesh(wing, m), R2 = new THREE.Mesh(wing, m);
    R2.scale.x = -1;
    const b = group(L, R2);
    b.position.set((r() - 0.5) * 8, (r() - 0.5) * 3, (r() - 0.5) * 8);
    b.scale.setScalar(P.size ?? 1);
    list.push({ b, L, R: R2, ph: r() * 6.28, base: b.position.clone() });
    g.add(b);
  }
  const dir = new THREE.Vector3(...(P.dir ?? [1, 0, 0])).normalize();
  g.userData.update = (t, Q) => {
    list.forEach((q) => {
      const f = Math.sin(t * 9 + q.ph) * 0.7;
      q.L.rotation.z = f; q.R.rotation.z = -f;
      q.b.position.copy(q.base).addScaledVector(dir, t * (Q.speed ?? 4)).add(V(0, Math.sin(t * 1.3 + q.ph) * 0.4, 0));
      q.b.rotation.y = Math.atan2(-dir.z, dir.x) + Math.PI / 2;
    });
  };
  return g;
}

// ------------------------------------------------------------------ box / sphere / cylinder: primitives for quick props
export function box(P) { const [w, h, d] = P.size ?? [1, 1, 1], m = mesh(new THREE.BoxGeometry(w, h, d), mat(P.color ?? "#cccccc", { rough: P.rough, metal: P.metal })); m.position.y = h / 2; return group(m); }
export function sphere(P) { const r = P.r ?? 1, m = mesh(new THREE.SphereGeometry(r, 32, 20), mat(P.color ?? "#cccccc", { rough: P.rough, metal: P.metal, flat: false })); m.position.y = r; return group(m); }
export function cylinder(P) { const r = P.r ?? 0.5, h = P.h ?? 1, m = mesh(new THREE.CylinderGeometry(r, r, h, 32), mat(P.color ?? "#cccccc", { rough: P.rough, metal: P.metal, flat: false })); m.position.y = h / 2; return group(m); }

// ------------------------------------------------------------------ pier: wooden jetty on posts
export function pier(P) {
  const L = P.length ?? 10, w = P.w ?? 1.8, g = new THREE.Group(), wood = mat(P.color ?? "#8a6a4a"), dark = mat("#5a4430");
  const n = Math.round(L / 0.35);
  for (let i = 0; i < n; i++) { const b = mesh(new THREE.BoxGeometry(w, 0.1, 0.3), i % 3 ? wood : mat("#7d5f42")); b.position.set(0, 1.2, -i * 0.35); g.add(b); }
  for (let i = 0; i <= L / 2.5; i++) for (const x of [-w / 2, w / 2]) { const p = mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 6), dark); p.position.set(x, -0.3, -i * 2.5); g.add(p); }
  return g;
}
