// globe: a rotating wireframe planet with glowing markers.
// params: spin (turns per second, default 0.05), reveal (0..1). model_opts: {markers: [{lat, lon, key}], tilt}
import { stage, poly, ring } from "./common.js";

export default function globe(canvas, H, opts = {}) {
  const S = stage(canvas, { fov: 30, pos: [0, 0.6, 6.4] });
  const { THREE, scene } = S;
  const root = new THREE.Group();
  root.rotation.z = THREE.MathUtils.degToRad(opts.tilt ?? 18);
  scene.add(root);
  const sphere = new THREE.Group();
  root.add(sphere);
  const lineMat = S.line(0.55), eqMat = S.line(0.95);
  for (let lat = -75; lat <= 75; lat += 15) {
    const r = Math.cos(THREE.MathUtils.degToRad(lat)) * 1.6, y = Math.sin(THREE.MathUtils.degToRad(lat)) * 1.6;
    sphere.add(poly(ring(r, y, 96), lat === 0 ? eqMat : lineMat, true));
  }
  for (let lon = 0; lon < 180; lon += 15) {
    const pts = Array.from({ length: 97 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2;
      return [Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0];
    });
    const l = poly(pts, lineMat);
    l.rotation.y = THREE.MathUtils.degToRad(lon);
    sphere.add(l);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.58, 48, 32), S.fill(0.12));
  sphere.add(core);
  const markers = (opts.markers || []).map((m) => {
    const la = THREE.MathUtils.degToRad(m.lat), lo = THREE.MathUtils.degToRad(m.lon);
    const v = [Math.cos(la) * Math.cos(lo) * 1.62, Math.sin(la) * 1.62, -Math.cos(la) * Math.sin(lo) * 1.62];
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.position.set(...v);
    sphere.add(dot);
    return { ...m, v, dot };
  });
  return {
    render(t, p) {
      const c = S.accent();
      [lineMat, eqMat, core.material].forEach((m) => m.color.copy(c));
      const reveal = p.reveal ?? 1;
      root.scale.setScalar(0.001 + reveal);
      sphere.rotation.y = t * Math.PI * 2 * (p.spin ?? 0.05);
      markers.forEach((m) => m.dot.scale.setScalar(1 + 0.35 * Math.sin(t * 6)));
      S.renderer.render(S.scene, S.camera);
      const pts = {};
      for (const m of markers) {
        const w = new THREE.Vector3(...m.v).applyMatrix4(sphere.matrixWorld);
        pts[m.key] = w.z > -0.2 ? S.project(sphere, m.v) : [-999, -999];
      }
      return pts;
    },
  };
}
