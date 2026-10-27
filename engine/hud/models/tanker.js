// tanker: a blueprint wireframe of an oil tanker with a scanning plane and a highlightable bridge.
// params: reveal (0..1, builds the hull), scan (0..1, plane sweeps bow -> stern), safe (0..1, bridge turns solid),
// locked (0..1, bridge pulses as locked). Point: bridge.
import { stage, poly } from "./common.js";

export default function tanker(canvas, H) {
  const S = stage(canvas, { fov: 28, pos: [5.5, 3.9, 7.5], target: [0, 1.15, 0] });
  const { THREE, scene } = S;
  const root = new THREE.Group();
  scene.add(root);
  const hullMat = S.line(0.7), deckMat = S.line(0.95), scanMat = S.fill(0.25), bridgeMat = S.line(1), bridgeFill = S.fill(0.0);
  const L = 6.4, B = 0.75, D = 0.7;
  const section = (x) => {             // hull cross-section at x (-L/2 .. L/2), narrowing at the bow (+x)
    const u = (x + L / 2) / L;
    const w = B * (u > 0.82 ? Math.sqrt(Math.max(0, 1 - ((u - 0.82) / 0.18) ** 2)) : u < 0.06 ? 0.75 + u * 4 : 1);
    return [[x, D, -w], [x, 0.15, -w], [x, 0, -w * 0.7], [x, 0, w * 0.7], [x, 0.15, w], [x, D, w]];
  };
  const hull = new THREE.Group();
  root.add(hull);
  const N = 33;
  const secs = Array.from({ length: N }, (_, i) => section(-L / 2 + (i / (N - 1)) * L));
  secs.forEach((s) => hull.add(poly(s, hullMat)));
  for (let k = 0; k < 6; k++) hull.add(poly(secs.map((s) => s[k]), k === 0 || k === 5 ? deckMat : hullMat));
  const box = (x0, x1, y0, y1, w) => {
    const g = new THREE.Group();
    const c = [[x0, y0, -w], [x1, y0, -w], [x1, y0, w], [x0, y0, w]];
    const d = c.map(([x, , z]) => [x, y1, z]);
    g.add(poly(c, bridgeMat, true), poly(d, bridgeMat, true));
    c.forEach((p, i) => g.add(poly([p, d[i]], bridgeMat)));
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 2 * w), bridgeFill);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    g.add(m);
    return g;
  };
  const bridge = box(-2.95, -2.2, D, D + 0.85, 0.6);
  root.add(bridge);
  root.add(box(-2.75, -2.55, D + 0.85, D + 1.25, 0.1));
  for (let i = 0; i < 8; i++) root.add(poly([[-1.6 + i * 0.6, D, -0.4], [-1.6 + i * 0.6, D, 0.4]], hullMat));
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.6), scanMat);
  scan.rotation.y = Math.PI / 2;
  root.add(scan);
  return {
    render(t, p) {
      const c = S.accent(), reveal = p.reveal ?? 1, sc = p.scan ?? 0, safe = p.safe ?? 0, locked = p.locked ?? 0;
      [hullMat, deckMat, scanMat, bridgeMat].forEach((m) => m.color.copy(c));
      const green = new THREE.Color(70 / 255, 1, 150 / 255);
      bridgeMat.color.copy(c).lerp(green, safe);
      bridgeFill.color.copy(green);
      bridgeFill.opacity = 0.35 * safe * (1 + 0.5 * locked * Math.sin(t * 9));
      root.scale.set(0.001 + reveal, 1, 1);
      root.rotation.y = -0.35 + Math.sin(t * 0.3) * 0.12;
      scan.visible = sc > 0 && sc < 1;
      scan.position.set(L / 2 - sc * L, 0.55, 0);
      S.renderer.render(S.scene, S.camera);
      return { bridge: S.project(root, [-2.57, D + 1.3, 0]) };
    },
  };
}
