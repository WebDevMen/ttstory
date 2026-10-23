// Holographic 3D wireframes for the HUD (three.js): a solar still (distiller) and the tanker map.
import * as THREE from "./vendor/three.module.min.js";

const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
const lineMat = (color, opacity = 0.9) => new THREE.LineBasicMaterial({ color, opacity, ...ADD });
const faceMat = (color, opacity = 0.1) => new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide, ...ADD });

function polyline(points, mat, closed = false) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  return closed ? new THREE.LineLoop(g, mat) : new THREE.Line(g, mat);
}
function circlePts(r, y, n = 64, cx = 0, cz = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
  }
  return pts;
}
function boxLines(w, h, d, x, y, z, mat) {
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  const l = new THREE.LineSegments(g, mat);
  l.position.set(x, y + h / 2, z);
  return l;
}
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(canvas.width, canvas.height, false);
  r.setClearColor(0x000000, 0);
  return r;
}

function projector(cam, canvas) {
  const v = new THREE.Vector3();
  return (p) => {
    v.set(...p).project(cam);
    return [(v.x * 0.5 + 0.5) * canvas.width, (-v.y * 0.5 + 0.5) * canvas.height];
  };
}

// ---------------------------------------------------------------- solar still
export function makeStill(canvas) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 100);
  const G = new THREE.Group();
  scene.add(G);
  const cGreen = new THREE.Color("rgb(70,255,150)");
  const cCyan = new THREE.Color("rgb(60,200,255)");
  const cWhite = new THREE.Color("rgb(200,255,240)");
  const cSun = new THREE.Color("rgb(255,190,60)");

  // basin dug into the deck / container with seawater
  const RT = 1.35, RB = 1.08, YB = -0.62;
  G.add(polyline(circlePts(RT, 0), lineMat(cCyan, 0.85), true));
  G.add(polyline(circlePts(RB, YB), lineMat(cCyan, 0.55), true));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    G.add(polyline([[Math.cos(a) * RT, 0, Math.sin(a) * RT], [Math.cos(a) * RB, YB, Math.sin(a) * RB]], lineMat(cCyan, 0.28)));
  }
  const basinFace = new THREE.Mesh(new THREE.CylinderGeometry(RT, RB, -YB, 48, 1, true), faceMat(cCyan, 0.05));
  basinFace.position.y = YB / 2;
  G.add(basinFace);

  // seawater surface with animated ripples (polar grid)
  const RINGS = 10, SEG = 48, YW = -0.36, RW = RB + (RT - RB) * (YW - YB) / -YB;
  const wPos = new Float32Array((RINGS + 1) * SEG * 3);
  const wIdx = [];
  for (let r = 0; r <= RINGS; r++) for (let s = 0; s < SEG; s++) {
    const i = r * SEG + s;
    if (r < RINGS) {
      const n = (s + 1) % SEG;
      wIdx.push(i, r * SEG + n, (r + 1) * SEG + s, r * SEG + n, (r + 1) * SEG + n, (r + 1) * SEG + s);
    }
  }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute("position", new THREE.BufferAttribute(wPos, 3));
  wGeo.setIndex(wIdx);
  const water = new THREE.Mesh(wGeo, faceMat(cCyan, 0.22));
  const waterWire = new THREE.LineSegments(new THREE.WireframeGeometry(wGeo), lineMat(cCyan, 0.16));
  G.add(water, waterWire);

  // collection cup
  const cupTop = -0.2;
  G.add(polyline(circlePts(0.25, cupTop, 32), lineMat(cGreen, 1), true));
  G.add(polyline(circlePts(0.22, YB, 32), lineMat(cGreen, 0.8), true));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    G.add(polyline([[Math.cos(a) * 0.25, cupTop, Math.sin(a) * 0.25], [Math.cos(a) * 0.22, YB, Math.sin(a) * 0.22]], lineMat(cGreen, 0.6)));
  }
  const cupWater = new THREE.Mesh(new THREE.CircleGeometry(0.23, 32), faceMat(cGreen, 0.55));
  cupWater.rotation.x = -Math.PI / 2;
  G.add(cupWater);

  // plastic sheet: inverted cone sagging to a point above the cup
  const RS = 1.45, YS = 0.04, YA = -0.1;
  const sheet = new THREE.Mesh(new THREE.ConeGeometry(RS, YS - YA, 48, 1, true), faceMat(cWhite, 0.09));
  sheet.rotation.x = Math.PI;
  sheet.position.y = (YS + YA) / 2;
  G.add(sheet);
  G.add(polyline(circlePts(RS, YS), lineMat(cWhite, 0.9), true));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    G.add(polyline([[Math.cos(a) * RS, YS, Math.sin(a) * RS], [0, YA, 0]], lineMat(cWhite, 0.35)));
  }
  // weight stone on top of the sheet
  const stone = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.1, 0)), lineMat(cWhite, 0.9));
  stone.position.set(0, YA + 0.1, 0);
  G.add(stone);

  // sun + rays
  const SUN = [-1.2, 1.45, 0.9];
  const sun = new THREE.Group();
  sun.position.set(...SUN);
  for (let k = 0; k < 3; k++) sun.add(polyline(circlePts(0.16 + k * 0.08, 0, 32).map(([x, , z]) => [x, z, 0]), lineMat(cSun, 0.9 - k * 0.25), true));
  scene.add(sun);
  const rayTargets = [[-0.9, YS, 0.2], [-0.3, YS, -0.6], [0.4, YS, 0.5], [0.9, YS, -0.2], [-0.2, YS, 0.9]];
  rayTargets.forEach((p) => scene.add(polyline([SUN, p], lineMat(cSun, 0.22))));
  const rayPulsePos = new Float32Array(rayTargets.length * 3 * 3);
  const rayPulses = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(rayPulsePos, 3)),
    new THREE.PointsMaterial({ color: cSun, size: 7, sizeAttenuation: false, ...ADD }));
  scene.add(rayPulses);

  // vapour rising from seawater, droplets sliding on the sheet into the cup
  const NV = 70;
  const vPos = new Float32Array(NV * 3);
  const vapour = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(vPos, 3)),
    new THREE.PointsMaterial({ color: cCyan, size: 4, sizeAttenuation: false, opacity: 0.8, ...ADD }));
  G.add(vapour);
  const ND = 18;
  const dPos = new Float32Array(ND * 3);
  const drops = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(dPos, 3)),
    new THREE.PointsMaterial({ color: cGreen, size: 8, sizeAttenuation: false, ...ADD }));
  G.add(drops);

  const project = projector(cam, canvas);

  function render(t, { fill = 0.3, glow = 1 } = {}) {
    // ripples
    for (let r = 0; r <= RINGS; r++) for (let s = 0; s < SEG; s++) {
      const rr = (r / RINGS) * RW * 0.98 + 0.27 * (1 - r / RINGS);
      const a = (s / SEG) * Math.PI * 2;
      const i = (r * SEG + s) * 3;
      wPos[i] = Math.cos(a) * rr;
      wPos[i + 2] = Math.sin(a) * rr;
      wPos[i + 1] = YW + 0.025 * Math.sin(rr * 9 - t * 3.2) + 0.012 * Math.sin(a * 3 + t * 2);
    }
    wGeo.attributes.position.needsUpdate = true;
    waterWire.geometry.dispose();
    waterWire.geometry = new THREE.WireframeGeometry(wGeo);

    for (let i = 0; i < NV; i++) {
      const ph = (t * 0.45 + hash(i)) % 1;
      const a = hash(i + 50) * Math.PI * 2, r = 0.35 + hash(i + 90) * 0.95;
      const top = YA + (YS - YA) * (r / RS) - 0.03;
      vPos[i * 3] = Math.cos(a + ph * 0.6) * r;
      vPos[i * 3 + 1] = YW + (top - YW) * ph;
      vPos[i * 3 + 2] = Math.sin(a + ph * 0.6) * r;
    }
    vapour.geometry.attributes.position.needsUpdate = true;
    vapour.material.opacity = 0.75 * glow;

    for (let i = 0; i < ND; i++) {
      const ph = (t * 0.32 + hash(i + 7)) % 1;
      const a = hash(i + 200) * Math.PI * 2;
      let x, y, z;
      if (ph < 0.8) {
        const r = RS * 0.92 * (1 - ph / 0.8);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = YA + (YS - YA) * (r / RS) - 0.035;
      } else {
        const f = (ph - 0.8) / 0.2;
        x = 0; z = 0; y = YA - 0.04 - f * f * (YA - cupTop + 0.12);
      }
      dPos.set([x, y, z], i * 3);
    }
    drops.geometry.attributes.position.needsUpdate = true;

    rayTargets.forEach((p, k) => {
      const f = (t * 0.9 + k * 0.21) % 1;
      rayPulsePos.set([SUN[0] + (p[0] - SUN[0]) * f, SUN[1] + (p[1] - SUN[1]) * f, SUN[2] + (p[2] - SUN[2]) * f], k * 3);
    });
    rayPulses.geometry.attributes.position.needsUpdate = true;

    cupWater.position.y = YB + 0.02 + fill * (cupTop - YB - 0.05);
    sun.lookAt(cam.position);

    const ang = 0.9 + t * 0.32;
    const dist = 5.0, elev = 0.46;
    cam.position.set(Math.cos(ang) * dist * Math.cos(elev), Math.sin(elev) * dist, Math.sin(ang) * dist * Math.cos(elev));
    cam.lookAt(-0.25, 0.25, 0);
    renderer.render(scene, cam);
    return {
      sun: project([SUN[0], SUN[1] - 0.45, SUN[2]]),
      sheet: project([0, YS + 0.32, 0]),
      sea: project([-RW * 0.8, YW - 0.1, RW * 0.4]),
      cup: project([0, YB - 0.05, 0]),
    };
  }
  return { render };
}

// ---------------------------------------------------------------- tanker map
export function makeShip(canvas) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, canvas.width / canvas.height, 0.1, 200);
  const cTeal = new THREE.Color("rgb(64,255,230)");
  const cDim = new THREE.Color("rgb(40,160,170)");
  const cGreen = new THREE.Color("rgb(70,255,150)");
  const ship = new THREE.Group();
  scene.add(ship);

  // hull half-width at deck level as a function of x (stern -4 .. bow +4)
  const halfW = (x, level) => {
    const w = level === "deck" ? 0.62 : level === "wl" ? 0.58 : 0.4;
    if (x > 2.4) return w * Math.sqrt(Math.max(0, 1 - Math.pow((x - 2.4) / (4.05 - 2.4), 2)));
    if (x < -3.6) return w * Math.sqrt(Math.max(0, 1 - Math.pow((x + 3.6) / 0.45, 2))) * 0.95 + 0.0;
    return w;
  };
  const YD = 0, YWL = -0.48, YK = -0.78;
  const outline = (level, y, n = 120) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const x = -4.05 + (8.1 * i) / n; pts.push([x, y, halfW(x, level)]); }
    for (let i = n; i >= 0; i--) { const x = -4.05 + (8.1 * i) / n; pts.push([x, y, -halfW(x, level)]); }
    return pts;
  };
  ship.add(polyline(outline("deck", YD), lineMat(cTeal, 0.95), true));
  ship.add(polyline(outline("wl", YWL), lineMat(cTeal, 0.45), true));
  ship.add(polyline(outline("keel", YK), lineMat(cDim, 0.5), true));
  // ribs
  for (let x = -3.6; x <= 3.9; x += 0.3) {
    const wd = halfW(x, "deck"), ww = halfW(x, "wl"), wk = halfW(x, "keel");
    ship.add(polyline([[x, YD, wd], [x, YWL, ww], [x, YK, wk], [x, YK, -wk], [x, YWL, -ww], [x, YD, -wd]], lineMat(cDim, 0.35)));
  }
  // stem line
  ship.add(polyline([[4.05, YD, 0], [3.95, YWL, 0], [3.75, YK, 0]], lineMat(cTeal, 0.8)));
  // deck: centre pipe, tank hatches, mast
  ship.add(polyline([[-2.6, 0.04, 0], [3.2, 0.04, 0]], lineMat(cTeal, 0.6)));
  for (let i = 0; i < 7; i++) ship.add(boxLines(0.42, 0.07, 0.62, -2.0 + i * 0.75, 0, 0, lineMat(cTeal, 0.55)));
  ship.add(polyline([[3.55, 0, 0], [3.55, 0.75, 0]], lineMat(cTeal, 0.7)));
  ship.add(polyline([[0.3, 0, 0], [0.3, 0.45, 0], [0.9, 0.3, 0]], lineMat(cTeal, 0.6)));

  // superstructure aft
  ship.add(boxLines(1.05, 0.42, 1.05, -3.15, 0, 0, lineMat(cTeal, 0.85)));
  ship.add(boxLines(0.95, 0.34, 0.98, -3.15, 0.42, 0, lineMat(cTeal, 0.85)));
  ship.add(boxLines(0.32, 0.75, 0.38, -3.78, 0.42, 0, lineMat(cTeal, 0.75))); // funnel
  // bridge (safe zone)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(-3.1, 0.76, 0);
  const bGeo = new THREE.BoxGeometry(0.7, 0.3, 1.45);
  const bridgeFace = new THREE.Mesh(bGeo, faceMat(cGreen, 0.0));
  const bridgeEdge = new THREE.LineSegments(new THREE.EdgesGeometry(bGeo), lineMat(cTeal, 0.9));
  bridgeFace.position.y = bridgeEdge.position.y = 0.15;
  bridgeGroup.add(bridgeFace, bridgeEdge);
  const shield = polyline(circlePts(0.95, 0.02, 64), lineMat(cGreen, 0));
  bridgeGroup.add(shield);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 12, 1, true), faceMat(cGreen, 0));
  beam.position.y = 0.95;
  bridgeGroup.add(beam);
  ship.add(bridgeGroup);

  // scan plane + grid
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.5), faceMat(cTeal, 0.0));
  scan.rotation.y = Math.PI / 2;
  scene.add(scan);
  const scanEdge = polyline([[0, -0.9, -0.9], [0, 0.6, -0.9], [0, 0.6, 0.9], [0, -0.9, 0.9]], lineMat(cTeal, 0), true);
  scene.add(scanEdge);
  const grid = new THREE.GridHelper(14, 28, cDim, cDim);
  grid.material.transparent = true;
  grid.material.opacity = 0.14;
  grid.position.y = -1.0;
  scene.add(grid);
  // waterline ripples rings
  const ripples = [0, 1, 2].map(() => {
    const l = polyline(circlePts(1, 0, 96).map(([x, y, z]) => [x * 4.6, YWL, z * 1.3]), lineMat(cTeal, 0));
    scene.add(l);
    return l;
  });

  const project = projector(cam, canvas);

  function render(t, { reveal = 1, scanX = null, safe = 0, locked = 0 } = {}) {
    ship.traverse((o) => { if (o.material && o.userData.base === undefined) o.userData.base = o.material.opacity; });
    ship.traverse((o) => { if (o.material && o !== bridgeFace && o !== shield && o !== beam) o.material.opacity = o.userData.base * reveal; });
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    bridgeFace.material.opacity = safe * (0.22 + 0.25 * pulse);
    bridgeEdge.material.color.copy(cTeal).lerp(cGreen, safe);
    bridgeEdge.material.opacity = 0.9 * reveal;
    shield.material.opacity = safe * (0.35 + 0.4 * pulse);
    shield.scale.setScalar(1 + 0.08 * Math.sin(t * 3.5));
    beam.material.opacity = safe * 0.45;
    if (locked > 0) { bridgeFace.material.opacity = 0.5 * locked + bridgeFace.material.opacity * (1 - locked); }

    if (scanX !== null) {
      scan.position.x = scanX; scanEdge.position.x = scanX;
      scan.material.opacity = 0.16; scanEdge.material.opacity = 0.9;
    } else { scan.material.opacity = 0; scanEdge.material.opacity = 0; }
    ripples.forEach((l, k) => {
      const f = (t * 0.35 + k / 3) % 1;
      l.scale.set(1 + f * 0.45, 1, 1 + f * 0.9);
      l.material.opacity = 0.35 * (1 - f) * reveal;
    });

    const ang = 1.08 + t * 0.07;
    const dist = 12.2, elev = 0.4;
    cam.position.set(Math.cos(ang) * dist * Math.cos(elev), Math.sin(elev) * dist, Math.sin(ang) * dist * Math.cos(elev));
    cam.lookAt(0, 0.05, 0);
    renderer.render(scene, cam);
    return { bridge: project([-3.1, 1.12, 0]) };
  }
  return { render };
}
