// world3d: a real 3D scene (three.js) as the backdrop of a draw shot — method `3d`, docs/DRAW3D.md.
// The whole screen is one WebGL canvas; 2D actors (texts, badges, callouts) go on top as usual layers, HUD and captions
// as usual. Objects come from the 3D prop library (engine/hud/three/props.js) and from the project's own modules
// (projects/<id>/three/*.js listed in `modules:`). Anchors: "<item id>.<object id>[.<point>]" -> screen px of the object.
import { createWorld, cameraAt, orbitKeys, rng } from "../../three/kit.js";
import * as LIB from "../../three/props.js";
import * as CITY from "../../three/props_city.js";
import { preload } from "../../three/assets.js";

const D2R = Math.PI / 180;
// object keys that are placement / timing, not prop params
const PLACE = new Set(["prop", "id", "pos", "rot", "scale", "ground", "at", "until", "enter", "enter_dur", "exit", "exit_dur", "scatter", "visible"]);

export const world3d = {
  origin: "top-left",
  screen: true,                       // full-screen canvas: screen space unless the YAML says otherwise
  backdrop: true,
  async create(p, H) {
    const w = H.W, h = H.H, shot = H.shot;
    const s0 = shot?.start ?? 0, s1 = shot?.end ?? s0 + 5;
    const el = H.div(`width:${w}px;height:${h}px`);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px`;
    el.appendChild(canvas);
    // ready-made assets ("ph:<id>", files under /assets3d) are loaded before the world is built
    await preload({ objects: p.objects, scenery: p.scenery, sky: p.sky });
    const W = createWorld(canvas, { shadow: p.shadow, exposure: p.exposure, env: p.env, fov: p.camera?.fov, post: p.post });
    const THREE = W.THREE;

    // prop registry: library + project modules (every exported function is a prop)
    const PROPS = { ...LIB, ...CITY };
    for (const m of p.modules || []) Object.assign(PROPS, await import(H.asset(m.includes("/") ? m : `three/${m}`)));

    // times: `at` is absolute (s or "@word", resolved by compile); `t` in camera keys is from the shot start ("end", "end-0.5")
    const rel = (v) => (typeof v === "string" && v.startsWith("end") ? s1 - s0 + Number(v.slice(3) || 0) : Number(v));
    const keyTime = (k) => (k.at != null ? Number(k.at) : s0 + rel(k.t ?? 0));

    // ---- objects
    const objs = [];
    const expand = (o, i) => {
      if (!o.scatter) return [o];
      const r = rng(o.seed ?? i + 1), out = [], n = o.n ?? 10, [a, b] = o.scale_range ?? [0.8, 1.25];
      let tries = 0;
      while (out.length < n && tries++ < n * 30) {
        let x, z;
        if (o.ring) { const [cx, cz, r0, r1] = o.ring, ang = r() * Math.PI * 2, rr = r0 + (r1 - r0) * Math.sqrt(r()); x = cx + Math.cos(ang) * rr; z = cz + Math.sin(ang) * rr; }
        else { const [x0, z0, x1, z1] = o.area ?? [-20, -20, 20, 20]; x = x0 + r() * (x1 - x0); z = z0 + r() * (z1 - z0); }
        if ((o.avoid || []).some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
        const y = W.heightAt(x, z);
        if (o.min_h != null && y < o.min_h) continue;
        if (o.max_h != null && y > o.max_h) continue;
        const { scatter, n: _n, area, ring, avoid, min_h, max_h, scale_range, ...rest } = o;
        out.push({ ...rest, prop: scatter, pos: [x, 0, z], ground: true, rot: r() * 360, scale: (o.scale ?? 1) * (a + r() * (b - a)), seed: (o.seed ?? 1) * 100 + out.length });
      }
      return out;
    };
    // scatter is expanded in list order: the ground props above it have already registered their heights
    const specs = [];
    // scenery: shared objects (a YAML anchor reused by several shots) come first; nested lists are flattened
    const all = [...(p.scenery || []), ...(p.objects || [])].flat(4);
    for (const [i, o0] of all.entries()) for (const o of expand(o0, i)) {
      specs.push(o);
      const make = PROPS[o.prop];
      if (!make) throw new Error(`world3d: unknown prop '${o.prop}' (${Object.keys(PROPS).sort().join(", ")})`);
      const P0 = {};
      for (const [k, v] of Object.entries(o)) if (!PLACE.has(k)) P0[k] = H.track(v, o.at ?? s0, undefined);
      const pos0 = H.track(o.pos ?? [0, 0, 0], s0, [0, 0, 0]);
      P0._pos = pos0;
      const obj = make(P0, W);
      W.scene.add(obj);
      objs.push({ o, obj, P0 });
      if (!o.ground) obj.position.set(...pos0);
      else obj.position.set(pos0[0], W.heightAt(pos0[0], pos0[2]) + (pos0[1] ?? 0), pos0[2]);
    }

    // ---- camera keys
    const cam = p.camera || {};
    let keys = (cam.keys || []).map((k) => ({ ...k, at: keyTime(k) }));
    if (cam.orbit) keys = orbitKeys(cam.orbit, cam.orbit.at != null ? Number(cam.orbit.at) : s0, cam.orbit.until != null ? Number(cam.orbit.until) : s1);
    const seed = (H.TL.shots.findIndex((s) => s.id === shot?.id) + 1) * 131;

    let anchors = {};
    const tmp = new THREE.Vector3();
    return {
      el, w, h, world: W,
      update(t) {
        // sky / light (any field may be a track)
        const sky = {};
        for (const [k, v] of Object.entries(p.sky || {})) sky[k] = H.track(v, t, undefined);
        W.setSky(sky);
        // objects
        for (const { o, obj, P0 } of objs) {
          const vis = t >= (o.at ?? -1e9) && t < (o.until ?? 1e9) && H.track(o.visible ?? true, t, true) !== false;
          obj.visible = vis;
          if (!vis) continue;
          const Q = { ...P0 };
          for (const [k, v] of Object.entries(o)) if (!PLACE.has(k)) Q[k] = H.track(v, t, P0[k]);
          const pos = H.track(o.pos ?? [0, 0, 0], t, [0, 0, 0]);
          Q._pos = pos;
          const y = o.ground ? W.heightAt(pos[0], pos[2]) + (pos[1] ?? 0) : pos[1];
          obj.position.set(pos[0], y, pos[2]);
          const rot = H.track(o.rot ?? 0, t, 0), r3 = Array.isArray(rot) ? rot : [0, rot, 0];
          obj.rotation.set(r3[0] * D2R, r3[1] * D2R, r3[2] * D2R);
          let sc = H.track(o.scale ?? 1, t, 1);
          // enter: grow | rise | drop (from the object's `at`)
          if (o.enter && o.at != null) {
            const f = H.ease(o.enter === "grow" ? "back.out(1.7)" : "outCubic")(Math.min(1, Math.max(0, (t - o.at) / (o.enter_dur ?? 0.6))));
            if (o.enter === "grow") sc = (Array.isArray(sc) ? sc : [sc, sc, sc]).map((v) => v * Math.max(0.001, f));
            if (o.enter === "rise") obj.position.y -= (1 - f) * (o.enter_dist ?? 6);
            if (o.enter === "drop") obj.position.y += (1 - f) * (o.enter_dist ?? 8);
          }
          if (Array.isArray(sc)) obj.scale.set(...sc); else obj.scale.setScalar(sc);
          obj.userData.update?.(t, Q);
        }
        // camera
        const c = cameraAt(keys, t, H.ease);
        let pos = [...c.pos], look = [...c.look];
        if (cam.sway) {
          const a = cam.sway.amp ?? 0.15, f = cam.sway.freq ?? 0.2;
          pos = pos.map((v, i) => v + a * H.noise(t, seed + i, f));
          look = look.map((v, i) => v + a * 0.6 * H.noise(t, seed + 7 + i, f * 0.9));
        }
        for (const [i, s] of (cam.shakes || []).entries()) {
          const u = t - Number(s.at), d = s.dur ?? 0.5;
          if (u >= 0 && u <= d) { const a = (s.amp ?? 0.25) * Math.exp((-5 * u) / d); pos[0] += a * Math.sin(2 * Math.PI * 17 * u + i); pos[1] += a * Math.cos(2 * Math.PI * 15 * u + 2 * i); }
        }
        W.setCamera({ pos, look, fov: c.fov ?? cam.fov ?? 40, roll: c.roll ?? 0 });
        if (p.post) {
          const post = {};
          for (const [k, v] of Object.entries(p.post)) post[k] = H.track(v, t, undefined);
          // dof.focus: a number (metres) or an object id — keep that object sharp wherever the camera flies
          if (post.dof && typeof post.dof.focus === "string") {
            const f = objs.find((q) => q.o.id === post.dof.focus);
            post.dof = { ...post.dof, focus: f ? W.camera.position.distanceTo(f.obj.getWorldPosition(tmp)) : 10 };
          }
          W.setPost(post);
        }
        W.scene.updateMatrixWorld(true);
        W.render();
        // anchors: every object with an id (its `top` or any named point)
        anchors = {};
        for (const { o, obj } of objs) {
          if (!o.id || !obj.visible) continue;
          const pts = obj.userData.anchors || {};
          for (const [k, v] of Object.entries({ center: [0, 0, 0], ...pts })) {
            tmp.set(...v).applyMatrix4(obj.matrixWorld);
            anchors[`${o.id}.${k}`] = W.project(tmp);
          }
          if (!pts.top) { const bb = new THREE.Box3().setFromObject(obj); anchors[`${o.id}.top`] = W.project(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2)); }
          anchors[o.id] = anchors[`${o.id}.top`];
        }
      },
      anchor(name) { return anchors[name] ?? null; },
    };
  },
};
