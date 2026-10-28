// 3D kit: a real three.js world for draw shots (actor `world3d`, docs/DRAW3D.md). One WebGL canvas the size of the screen:
// physically based materials, a sun with soft shadows, a gradient sky with the sun disc, image-based light from that sky,
// fog in the horizon color (aerial perspective), ACES tone mapping and a 3D camera driven by keys in time.
// Everything is a function of time t: the same frame always comes out the same.
import * as THREE from "../vendor/three.module.min.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { asset } from "./assets.js";

export { THREE };

const D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;

// ------------------------------------------------------------------ time of day
// hour -> sky colors, sun color/strength, ambient. Values between rows are interpolated (sRGB hex).
const DAY = [
  // hour  zenith     horizon    ground     sun        sun  amb  fog
  [0,     "#05070f", "#141a2e", "#07080c", "#8fa6ff", 0.25, 0.35, 0.0035],
  [4.5,   "#070b1a", "#1c2340", "#08090d", "#8fa6ff", 0.25, 0.35, 0.0035],
  [5.6,   "#1b2650", "#c46e6a", "#2a2026", "#ff9a6a", 0.9, 0.45, 0.003],
  [6.6,   "#3c64a8", "#ffbe8a", "#4a3c34", "#ffc08a", 2.2, 0.6, 0.0028],
  [8.5,   "#3d7fd6", "#bcdcf2", "#5e5848", "#fff0d8", 3.0, 0.75, 0.0022],
  [12,    "#2f78db", "#b6d8f4", "#5e5848", "#fffaf0", 3.4, 0.8, 0.002],
  [16,    "#3a7cd2", "#c4ddf0", "#5e5848", "#fff0d6", 3.1, 0.75, 0.0022],
  [18,    "#4a6db8", "#ffc890", "#4e4038", "#ffb874", 2.4, 0.6, 0.0026],
  [19.2,  "#2f3f80", "#ff8a5c", "#3a2a2a", "#ff8a50", 1.4, 0.5, 0.003],
  [20.2,  "#141c44", "#6c4a78", "#1a1520", "#c08cff", 0.45, 0.4, 0.0032],
  [21.5,  "#070b1a", "#1c2340", "#08090d", "#8fa6ff", 0.25, 0.35, 0.0035],
  [24,    "#05070f", "#141a2e", "#07080c", "#8fa6ff", 0.25, 0.35, 0.0035],
];
const col = (c) => new THREE.Color(c);
export function dayLight(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < DAY.length - 2 && DAY[i + 1][0] <= h) i++;
  const a = DAY[i], b = DAY[i + 1], f = clamp((h - a[0]) / Math.max(1e-6, b[0] - a[0]));
  const c = (k) => col(a[k]).lerp(col(b[k]), f);
  // the sun rises in the east (+x), culminates in the south (-z) and sets in the west (-x); the moon light at night
  const day = clamp((h - 5.5) / 13.5, 0, 1), night = h < 5.5 || h > 19.8;
  const elev = night ? 35 : Math.sin(Math.PI * day) * 58 + 2, az = night ? 200 : lerp(100, 260, day);
  return { zenith: c(1), horizon: c(2), ground: c(3), sun: c(4), sunI: lerp(a[5], b[5], f), amb: lerp(a[6], b[6], f), fog: lerp(a[7], b[7], f), elev, az, night };
}

// direction to the sun from elevation/azimuth in degrees (azimuth 180 = south = -z)
export function sunDir(elev, az) {
  const e = elev * D2R, a = az * D2R;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).normalize();
}

// ------------------------------------------------------------------ sky dome
function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
      sunCol: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunSize: { value: 1 }, glow: { value: 1 },
      stars: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 zenith, horizon, ground, sunCol, sunDir; uniform float sunSize, glow, stars; varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = y > 0.0 ? mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(horizon, ground, clamp(-y * 6.0, 0.0, 1.0));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 8.0) * 0.35 + pow(s, 64.0) * 0.6) * glow;              // halo around the sun
        float rd = 0.0095 * sunSize;                                                   // angular radius (rad), ~0.55° at size 1
        c += sunCol * smoothstep(cos(rd * 1.35), cos(rd * 0.8), s) * 3.0 * glow;     // the disc, soft edge
        if (stars > 0.0 && y > 0.0) { vec3 q = floor(d * 380.0); float h = hash(q); c += vec3(step(0.9975, h) * (h - 0.9975) * 400.0 * stars * y); }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

// ------------------------------------------------------------------ materials
const MATS = new Map();
// mat("#c33", {rough, metal, flat, emissive, ei, opacity}) — cached standard material (flat shading = low-poly look)
export function mat(color, o = {}) {
  const key = JSON.stringify([color, o]);
  if (MATS.has(key) && !o.unique) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, flatShading: o.flat ?? true,
    vertexColors: !!o.vc, transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1, side: o.double ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 1; }
  if (!o.unique) MATS.set(key, m);
  return m;
}
export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// soft round contact shadow on the ground (ambient occlusion under an object)
let blobTex = null;
export function blob(r = 1, a = 0.45) {
  if (!blobTex) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.5, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: a, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 1;
  return m;
}

// ------------------------------------------------------------------ deterministic helpers
export function rng(seed) {
  let s = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
// smooth 2D value noise in [-1, 1]
export function noise2(x, y, seed = 0) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return 2 * lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v) - 1;
}
export function fbm(x, y, seed = 0, oct = 4) {
  let a = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { a += amp * noise2(x * f, y * f, seed + i * 17); f *= 2.03; amp *= 0.5; }
  return a;
}

// ------------------------------------------------------------------ the world
// opts: {width, height, shadow: {size, map, center}, exposure, env: true}
export function createWorld(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 40, canvas.width / canvas.height, 0.1, 3000);
  scene.add(camera);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMaterial());
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.FogExp2(0xffffff, 0.008);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  const sh = opts.shadow || {};
  sun.castShadow = sh !== false;
  const ss = sh.size ?? 40;
  Object.assign(sun.shadow.camera, { left: -ss, right: ss, top: ss, bottom: -ss, near: 1, far: 600 });
  sun.shadow.mapSize.set(sh.map ?? 2048, sh.map ?? 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = sh.soft ?? 4;
  const shadowCenter = new THREE.Vector3(...(sh.center ?? [0, 0, 0]));
  scene.add(sun, sun.target);

  // image-based light: the sky (without the sun disc) baked into a PMREM, refreshed when the hour changes
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial());
  envScene.add(envSky);
  let envRT = null, envKey = null, hdriKey = null;

  const W = {
    THREE, renderer, scene, camera, sky, sun, hemi, canvas,
    heights: [],                       // ground height functions: (x, z) -> y | null (registered by ground props)
    heightAt(x, z) { let y = null; for (const f of W.heights) { const v = f(x, z); if (v != null && (y == null || v > y)) y = v; } return y ?? 0; },
    light: null,
    // time of day: hour (0..24) or explicit {elev, az}; fog density override; exposure
    setSky(o = {}) {
      const L = dayLight(o.hour ?? 14);
      if (o.zenith) L.zenith = col(o.zenith);
      if (o.horizon) L.horizon = col(o.horizon);
      const elev = o.elev ?? L.elev, az = o.az ?? L.az, dir = sunDir(elev, az);
      const u = sky.material.uniforms;
      u.zenith.value.copy(L.zenith); u.horizon.value.copy(L.horizon); u.ground.value.copy(L.ground);
      u.sunCol.value.copy(L.sun); u.sunDir.value.copy(dir); u.sunSize.value = o.sun_size ?? 1;
      u.glow.value = o.sun_disc === false || elev < -2 ? 0 : (L.night ? 0.35 : 1);
      u.stars.value = o.stars ?? (L.night ? 1 : 0);
      sun.color.copy(L.sun);
      sun.intensity = (o.sun ?? 1) * L.sunI;
      sun.position.copy(shadowCenter).addScaledVector(dir, 200);
      sun.target.position.copy(shadowCenter);
      hemi.color.copy(L.zenith).lerp(new THREE.Color(1, 1, 1), 0.35);
      hemi.groundColor.copy(L.ground);
      hemi.intensity = (o.ambient ?? 1) * L.amb;
      scene.fog.color.copy(o.fog_color ? col(o.fog_color) : L.horizon);
      scene.fog.density = o.fog ?? L.fog;
      renderer.toneMappingExposure = o.exposure ?? opts.exposure ?? 1;
      W.light = { ...L, dir, elev, az };
      if (o.sun_color) sun.color.copy(col(o.sun_color));
      // a real photographed sky (HDRI, "ph:<id>"): backdrop + image-based light; the sun light is aimed by elev/az
      if (o.hdri) {
        const a = asset(o.hdri);
        if (hdriKey !== o.hdri) {
          if (envRT) envRT.dispose();
          envRT = pmrem.fromEquirectangular(a.hdr); envKey = null; hdriKey = o.hdri;
          scene.environment = envRT.texture;
          scene.background = o.backdrop === false ? null : (a.bg || a.hdr);
        }
        if (o.backdrop === false) scene.background = null;
        const rot = new THREE.Euler(0, (o.hdri_rot ?? 0) * D2R, 0);
        scene.backgroundRotation = rot; scene.environmentRotation = rot;
        scene.backgroundIntensity = o.bg ?? 1;
        scene.backgroundBlurriness = o.bg_blur ?? 0;
        scene.environmentIntensity = o.env ?? 1;
        // backdrop: false — the HDRI only lights the scene; the gradient sky (zenith/horizon) is the visible backdrop
        sky.visible = o.backdrop === false;
        if (o.hemi == null) hemi.intensity = 0.15 * (o.ambient ?? 1);
        return W.light;
      }
      sky.visible = true;
      if (hdriKey) { scene.background = null; hdriKey = null; }
      scene.environmentIntensity = o.env ?? 0.6;
      // environment light from the same sky (no sun disc: the sun is the directional light)
      const key = [L.zenith.getHexString(), L.horizon.getHexString(), L.ground.getHexString()].join();
      if (opts.env !== false && key !== envKey) {
        const eu = envSky.material.uniforms;
        eu.zenith.value.copy(L.zenith); eu.horizon.value.copy(L.horizon); eu.ground.value.copy(L.ground);
        eu.sunCol.value.copy(L.sun); eu.sunDir.value.copy(dir); eu.glow.value = 0.25; eu.stars.value = 0;
        const rt = pmrem.fromScene(envScene, 0.02);
        if (envRT) envRT.dispose();
        envRT = rt; envKey = key;
        scene.environment = rt.texture;
        scene.environmentIntensity = o.env ?? 0.6;
      }
      return W.light;
    },
    // camera: {pos, look, fov, roll}
    setCamera({ pos, look, fov, roll = 0 }) {
      camera.position.set(...pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(new THREE.Vector3(...look));
      if (roll) camera.rotateZ(roll * D2R);
      if (fov && fov !== camera.fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      sky.position.copy(camera.position);
      camera.updateMatrixWorld();
    },
    // world point -> screen px of the canvas (null when behind the camera)
    project(v) {
      const p = (v.isVector3 ? v.clone() : new THREE.Vector3(...v)).project(camera);
      if (p.z > 1) return null;
      return [(p.x * 0.5 + 0.5) * canvas.width, (-p.y * 0.5 + 0.5) * canvas.height];
    },
    // post-processing (opts.post): ao — ground-truth ambient occlusion (contact darkening in corners and under objects),
    // dof — depth of field (focus in metres from the camera, aperture, maxblur). Set per frame with W.setPost.
    composer: null, passes: {},
    setPost(p = {}) {
      const P = W.passes;
      if (P.ao) { P.ao.enabled = p.ao !== false; if (p.ao && typeof p.ao === "object") P.ao.blendIntensity = p.ao.intensity ?? 1; }
      if (P.dof) {
        P.dof.enabled = !!p.dof;
        if (p.dof) { const u = P.dof.uniforms; u.focus.value = p.dof.focus ?? 10; u.aperture.value = (p.dof.aperture ?? 2) * 1e-4; u.maxblur.value = p.dof.maxblur ?? 0.008; }
      }
    },
    render() { if (W.composer) W.composer.render(); else renderer.render(scene, camera); },
  };
  if (opts.post) {
    const w = canvas.width, h = canvas.height;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: opts.post.msaa ?? 4 });
    const C = new EffectComposer(renderer, rt);
    C.setPixelRatio(1); C.setSize(w, h);
    C.addPass(new RenderPass(scene, camera));
    if (opts.post.ao !== false) {
      const ao = new GTAOPass(scene, camera, w, h);
      ao.output = GTAOPass.OUTPUT.Default;
      const a = typeof opts.post.ao === "object" ? opts.post.ao : {};
      ao.updateGtaoMaterial({ radius: a.radius ?? 0.6, distanceExponent: 1, thickness: a.thickness ?? 1, scale: 1, samples: a.samples ?? 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      ao.blendIntensity = a.intensity ?? 1;
      C.addPass(ao); W.passes.ao = ao;
    }
    if (opts.post.dof) { const d = new BokehPass(scene, camera, { focus: 10, aperture: 2e-4, maxblur: 0.008 }); C.addPass(d); W.passes.dof = d; }
    C.addPass(new OutputPass());
    W.composer = C;
  }
  W.setSky({});
  return W;
}

// ------------------------------------------------------------------ camera keys
// keys: [{at (absolute s), pos: [x,y,z], look: [x,y,z], fov, roll, ease}] — smooth path through all keys
// (Catmull-Rom on positions and look points, the key's `ease` shapes the time of its segment).
export function cameraAt(keys, t, ease) {
  if (!keys.length) return { pos: [0, 2, 10], look: [0, 1, 0], fov: 40, roll: 0 };
  const full = [];
  let cur = { pos: [0, 2, 10], look: [0, 1, 0], fov: 40, roll: 0 };
  for (const k of keys) { cur = { ...cur, ...Object.fromEntries(["pos", "look", "fov", "roll"].filter((n) => k[n] != null).map((n) => [n, k[n]])) }; full.push({ at: k.at, ease: k.ease, ...cur }); }
  if (t <= full[0].at || full.length === 1) return full[0];
  const n = full.length;
  if (t >= full[n - 1].at) return full[n - 1];
  let i = 0;
  while (i < n - 2 && t >= full[i + 1].at) i++;
  const a = full[i], b = full[i + 1], f = ease(b.ease || (keys.length > 2 ? "inOutSine" : "inOut"))(clamp((t - a.at) / Math.max(1e-6, b.at - a.at)));
  const p0 = full[Math.max(0, i - 1)], p3 = full[Math.min(n - 1, i + 2)];
  const cr = (k) => a[k].map((_, j) => {
    const P0 = p0[k][j], P1 = a[k][j], P2 = b[k][j], P3 = p3[k][j], t2 = f * f, t3 = t2 * f;
    return 0.5 * (2 * P1 + (-P0 + P2) * f + (2 * P0 - 5 * P1 + 4 * P2 - P3) * t2 + (-P0 + 3 * P1 - 3 * P2 + P3) * t3);
  });
  return { pos: cr("pos"), look: cr("look"), fov: lerp(a.fov, b.fov, f), roll: lerp(a.roll, b.roll, f) };
}

// orbit around a point: {center, radius, height, from, to (degrees), at, until, look_y}
export function orbitKeys(o, t0, t1, steps = 6) {
  const c = o.center ?? [0, 0, 0], r = o.radius ?? 12, h = o.height ?? 3, a0 = o.from ?? 0, a1 = o.to ?? 40;
  const h1 = o.height_to ?? h, r1 = o.radius_to ?? r;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const f = i / steps, a = lerp(a0, a1, f) * D2R, rr = lerp(r, r1, f);
    return { at: lerp(t0, t1, f), ease: "linear", fov: o.fov, pos: [c[0] + Math.sin(a) * rr, c[1] + lerp(h, h1, f), c[2] + Math.cos(a) * rr], look: [c[0], c[1] + (o.look_y ?? 1), c[2]] };
  });
}
