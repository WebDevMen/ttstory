// Shared three.js setup for holo3d models: a transparent WebGL canvas, a camera, glowing line materials in the item's
// accent color and a projector from model space to canvas pixels (for labels and flags).
import * as THREE from "../vendor/three.module.min.js";

export { THREE };

export function stage(canvas, { fov = 32, pos = [0, 2.2, 7], target = [0, 0, 0] } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, canvas.width / canvas.height, 0.1, 100);
  camera.position.set(...pos);
  camera.lookAt(new THREE.Vector3(...target));
  const accent = () => {
    const v = getComputedStyle(canvas).getPropertyValue("--accent").trim() || "64,255,230";
    const [r, g, b] = v.split(",").map((x) => Number(x) / 255);
    return new THREE.Color(r, g, b);
  };
  const line = (opacity = 0.9) => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false });
  const fill = (opacity = 0.15) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const project = (obj, v) => {
    const p = new THREE.Vector3(...v);
    if (obj) p.applyMatrix4(obj.matrixWorld);
    const q = p.clone().project(camera);
    if (q.z > 1) return [-999, -999];
    return [(q.x * 0.5 + 0.5) * canvas.width, (-q.y * 0.5 + 0.5) * canvas.height];
  };
  return { THREE, renderer, scene, camera, accent, line, fill, project };
}

// polyline helper: points [[x,y,z],...] -> THREE.Line
export function poly(pts, mat, closed = false) {
  const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
  return closed ? new THREE.LineLoop(g, mat) : new THREE.Line(g, mat);
}

export function ring(r, y = 0, n = 64) {
  return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, y, Math.sin((i / n) * Math.PI * 2) * r]);
}
