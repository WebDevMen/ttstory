// Ready-made 3D assets for world3d (docs/DRAW3D.md §6): glTF/FBX models, PBR texture sets and HDRI skies from the shared
// cache /assets3d (filled by `vg.py assets3d <id>`). Refs: "ph:<id>" (Poly Haven, type from /assets3d/index.json) or a
// path under /assets3d ("kenney/animated-characters-survivors/Model/characterMedium.fbx", "ai/bus.glb").
// Everything is loaded once before the first frame (preload), then used synchronously by props.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const ROOT = "/assets3d/";
let INDEX = null;
const CACHE = new Map();
const tl = new THREE.TextureLoader();

async function index() {
  if (!INDEX) INDEX = await fetch(ROOT + "index.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return INDEX;
}
const isRef = (v) => typeof v === "string" && (/^ph:/.test(v) || /^(kenney|ai|other|quaternius)\//.test(v));

// what a ref is: {kind: model | texture | hdri, url | maps}
async function resolve(ref) {
  const idx = await index();
  if (ref.startsWith("ph:")) {
    const id = ref.slice(3), e = idx[id];
    if (!e) throw new Error(`3D asset '${ref}' is not downloaded: add it to assets3d: in project.yaml and run vg.py assets3d <id>`);
    if (e.type === "model") return { kind: "model", url: ROOT + e.src };
    if (e.type === "texture") return { kind: "texture", maps: Object.fromEntries(Object.entries(e.maps).map(([k, v]) => [k, ROOT + v])) };
    if (e.type === "hdri") return { kind: "hdri", hdr: ROOT + e.hdr, jpg: e.jpg ? ROOT + e.jpg : null };
  }
  if (/\.(glb|gltf|fbx)$/i.test(ref)) return { kind: "model", url: ROOT + ref };
  throw new Error(`3D asset '${ref}': unknown kind`);
}

function tex(url, srgb) {
  return new Promise((res, rej) => tl.load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    res(t);
  }, undefined, () => rej(new Error(`cannot load ${url}`))));
}

async function load(ref) {
  const r = await resolve(ref);
  if (r.kind === "model") {
    if (/\.fbx$/i.test(r.url)) {
      const obj = await new FBXLoader().loadAsync(r.url);
      return { kind: "model", scene: obj, animations: obj.animations || [] };
    }
    const g = await new GLTFLoader().loadAsync(r.url);
    return { kind: "model", scene: g.scene, animations: g.animations || [] };
  }
  if (r.kind === "texture") {
    const [diff, nor, arm] = await Promise.all([tex(r.maps.diff, true), r.maps.nor ? tex(r.maps.nor) : null, r.maps.arm ? tex(r.maps.arm) : null]);
    return { kind: "texture", diff, nor, arm };
  }
  if (r.kind === "hdri") {
    const hdr = await new RGBELoader().loadAsync(r.hdr);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const bg = r.jpg ? await tex(r.jpg, true) : null;
    if (bg) { bg.mapping = THREE.EquirectangularReflectionMapping; bg.wrapS = THREE.RepeatWrapping; }
    return { kind: "hdri", hdr, bg };
  }
  throw new Error(`3D asset '${ref}'`);
}

// collect every asset ref in a spec (objects, sky…) and load them all
export async function preload(spec) {
  const refs = new Set();
  const walk = (v) => {
    if (isRef(v)) refs.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(spec);
  await Promise.all([...refs].map(async (ref) => { if (!CACHE.has(ref)) CACHE.set(ref, await load(ref)); }));
}

export function asset(ref) {
  const a = CACHE.get(ref);
  if (!a) throw new Error(`3D asset '${ref}' was not preloaded`);
  return a;
}

// a fresh copy of a model (skinned meshes keep their own skeleton), shadows on
export function modelCopy(ref) {
  const a = asset(ref);
  const o = a.animations.length ? cloneSkinned(a.scene) : a.scene.clone(true);
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true; m.receiveShadow = true;
      // materials are cloned per copy: tints and decay animate one object, not every copy
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    }
  });
  return { obj: o, animations: a.animations };
}

// PBR material from a texture set. size = metres covered by one tile (UVs of the geometry are in metres).
// o: {size, tint, rough, metal, normal (strength), ao}
export function pbr(ref, o = {}) {
  const t = asset(ref), size = o.size ?? 2;
  const rep = (x) => { if (!x) return null; const c = x.clone(); c.repeat.set(1 / size, 1 / size); c.needsUpdate = true; return c; };
  const m = new THREE.MeshStandardMaterial({
    map: rep(t.diff), normalMap: rep(t.nor), roughnessMap: rep(t.arm), metalnessMap: rep(t.arm), aoMap: rep(t.arm),
    color: new THREE.Color(o.tint ?? "#ffffff"), roughness: o.rough ?? 1, metalness: o.metal ?? (t.arm ? 1 : 0),
    aoMapIntensity: o.ao ?? 1, side: o.double ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (m.normalMap) m.normalScale.set(o.normal ?? 1, o.normal ?? 1);
  return m;
}

// world-space box UVs for any geometry (triplanar projection baked into uv): 1 unit of uv = 1 metre
export function worldUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal ?? (geo.computeVertexNormals(), geo.attributes.normal);
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}
