// still: a solar water still — sea-water pool, a transparent cone sheet, a cup in the middle, steam and drops.
// params: fill (cup water level 0..1), glow (0..1 brightness). Points: sun, sheet, sea, cup.
import { stage, poly, ring } from "./common.js";

export default function still(canvas, H) {
  const S = stage(canvas, { fov: 34, pos: [0, 3.3, 6.2], target: [0, 0.2, 0] });
  const { THREE, scene } = S;
  const root = new THREE.Group();
  scene.add(root);
  const mats = { pool: S.line(0.8), sheet: S.line(0.75), cup: S.line(0.95), water: S.fill(0.35), sea: S.fill(0.12) };
  for (let i = 0; i < 4; i++) root.add(poly(ring(2.0 - i * 0.04, -0.05 * i, 96), mats.pool, true));
  const seaDisc = new THREE.Mesh(new THREE.CircleGeometry(1.95, 64), mats.sea);
  seaDisc.rotation.x = -Math.PI / 2;
  seaDisc.position.y = -0.1;
  root.add(seaDisc);
  const apex = [0, 0.75, 0];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    root.add(poly([[Math.cos(a) * 2.0, 1.25, Math.sin(a) * 2.0], apex], mats.sheet));
  }
  root.add(poly(ring(2.0, 1.25, 96), mats.sheet, true));
  const cupPts = [ring(0.42, -0.1, 32), ring(0.5, 0.55, 32)];
  cupPts.forEach((r) => root.add(poly(r, mats.cup, true)));
  for (let i = 0; i < 8; i++) root.add(poly([cupPts[0][i * 4], cupPts[1][i * 4]], mats.cup));
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 1, 32, 1, true), mats.water);
  root.add(water);
  const drops = new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 30 }, () => new THREE.Vector3())),
    new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.95 }));
  root.add(drops);
  const steam = new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 40 }, () => new THREE.Vector3())),
    new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.6 }));
  root.add(steam);
  return {
    render(t, p) {
      const c = S.accent(), glow = p.glow ?? 0.7, fill = p.fill ?? 0.5;
      Object.values(mats).forEach((m) => m.color.copy(c));
      mats.sheet.opacity = 0.45 + 0.45 * glow;
      root.rotation.y = t * 0.25;
      water.scale.y = 0.05 + 0.6 * fill;
      water.position.y = -0.1 + water.scale.y / 2;
      const dp = drops.geometry.attributes.position;
      for (let i = 0; i < dp.count; i++) {
        const a = H.hash(i) * Math.PI * 2, ph = (t * 0.35 + H.hash(i + 50)) % 1;
        const r = 2.0 * (1 - ph);
        dp.setXYZ(i, Math.cos(a) * r, 1.25 - 0.5 * ph, Math.sin(a) * r);
      }
      dp.needsUpdate = true;
      const sp = steam.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        const a = H.hash(i + 9) * Math.PI * 2, r = 0.4 + 1.5 * H.hash(i + 31), ph = (t * 0.25 + H.hash(i + 77)) % 1;
        sp.setXYZ(i, Math.cos(a) * r, -0.05 + 1.2 * ph, Math.sin(a) * r);
      }
      sp.needsUpdate = true;
      S.renderer.render(S.scene, S.camera);
      return { sun: S.project(null, [-2.3, 2.5, -1]), sheet: S.project(root, [1.0, 1.0, 0.2]), sea: S.project(root, [-1.5, -0.05, 0.8]), cup: S.project(root, [0, 0.2, 0]) };
    },
  };
}
