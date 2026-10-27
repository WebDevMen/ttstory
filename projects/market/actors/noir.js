// «Чёрный рынок невозможного» — NOIR MACRO look: film overlay, noir figures (silhouettes with a rim light),
// profile close-ups, laser sight, bullet trail. Practical light only; red only for the box, the sight and danger.
// Palette: ink #07080a, wet concrete #1b1f24, steel #3a4048, cold grey #8a8f96, warm white #f2ede4,
// sodium #e8a23a, red #e0283a.

const RED = "#e0283a", WARM = "#f2ede4", SODIUM = "#e8a23a", INK = "#07080a";
const D2R = Math.PI / 180;

// time integral of a speed track (cycles/s) from the item's start: smooth phase even when the speed changes
function phaseOf(H, it, t, key, def, cache) {
  const t0 = it.at > -1e8 ? it.at : (H.shot?.start ?? 0);
  let s = 0, tt = t0;
  if (cache.t != null && t >= cache.t && cache.t >= t0) { s = cache.s; tt = cache.t; }
  while (tt < t) { const dt = Math.min(1 / 30, t - tt); s += it.v(key, def, tt + dt / 2) * dt; tt += dt; }
  cache.t = t; cache.s = s;
  return s;
}

// ------------------------------------------------------------------ noir_frame: film overlay (space: screen)
// sat, contrast, bright (backdrop filter), grain, vig, tint (colour wash), flash (track 0..1: muzzle flash),
// flare: [x, y] + flare_k (track) — anamorphic streak from a practical light, glitch: [{at, dur}], bars (letterbox px)
export const noir_frame = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920;
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const tint = H.div(`width:${w}px;height:${h}px;backdrop-filter:saturate(${p.sat ?? 0.6}) contrast(${p.contrast ?? 1.12}) brightness(${p.bright ?? 0.97})`);
    const wash = H.div(`width:${w}px;height:${h}px;background:${p.tint ?? "rgba(40,60,80,.10)"};mix-blend-mode:soft-light`);
    const cv = document.createElement("canvas");
    cv.width = 270; cv.height = 480;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:${p.grain ?? 0.13};mix-blend-mode:overlay;image-rendering:pixelated`;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(270, 480);
    const vig = H.div(`width:${w}px;height:${h}px;background:radial-gradient(ellipse 78% 60% at 50% 46%, transparent 48%, rgba(0,0,0,${p.vig ?? 0.66}))`);
    const fx = p.flare?.[0] ?? 540, fy = p.flare?.[1] ?? 400;
    const flare = H.div(`left:${fx - 700}px;top:${fy - 6}px;width:1400px;height:12px;border-radius:6px;opacity:0;
      background:linear-gradient(90deg, transparent, ${p.flare_color ?? "rgba(140,190,255,.55)"} 40%, rgba(255,255,255,.8) 50%, ${p.flare_color ?? "rgba(140,190,255,.55)"} 60%, transparent);filter:blur(3px)`);
    const flash = H.div(`width:${w}px;height:${h}px;background:radial-gradient(ellipse at ${p.flash_at?.[0] ?? 540}px ${p.flash_at?.[1] ?? 800}px, rgba(255,240,215,.95), rgba(255,220,170,.35) 45%, rgba(255,210,160,.12));opacity:0`);
    const bars = p.bars ?? 0;
    const top = H.div(`width:${w}px;height:${bars}px;background:${INK}`), bot = H.div(`top:${h - bars}px;width:${w}px;height:${bars}px;background:${INK}`);
    const gl = document.createElement("canvas");
    gl.width = 540; gl.height = 960;
    gl.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:0`;
    const gctx = gl.getContext("2d");
    el.append(tint, wash, cv, vig, flare, flash, gl, top, bot);
    const glitches = (p.glitch ?? []).map((g) => (typeof g === "object" ? g : { at: g, dur: 0.25 }));
    let lastFrame = -1;
    return {
      el, w, h,
      update(t, it) {
        const fr = Math.round(t * 30);
        if (fr !== lastFrame) {
          lastFrame = fr;
          const r = H.rng(fr * 7919 + 31), d = img.data;
          for (let i = 0; i < d.length; i += 4) { const v = 80 + r() * 110; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
          ctx.putImageData(img, 0, 0);
        }
        flash.style.opacity = it.v("flash", 0);
        const fk = it.v("flare_k", p.flare ? 0.6 : 0);
        flare.style.opacity = fk * (0.85 + 0.15 * Math.sin(t * 7.3));
        flare.style.transform = `scaleX(${0.7 + 0.3 * fk})`;
        let g = null;
        for (const x of glitches) if (t >= x.at && t < x.at + x.dur) g = x;
        if (g) {
          const rr = H.rng(fr * 131 + 7);
          gctx.clearRect(0, 0, 540, 960);
          for (let i = 0; i < 12; i++) {
            const y = rr() * 960, hh = 3 + rr() * 40, a = 0.2 + rr() * 0.5;
            gctx.fillStyle = rr() < 0.5 ? `rgba(242,237,228,${a * 0.45})` : `rgba(7,8,10,${a})`;
            gctx.fillRect(0, y, 540, hh);
            if (rr() < 0.35) { gctx.fillStyle = `rgba(224,40,58,${a * 0.4})`; gctx.fillRect(rr() * 100, y + 1, 540, 2); }
          }
          gl.style.opacity = 1;
          el.style.transform = `translateX(${(rr() - 0.5) * 12}px)`;
        } else { gl.style.opacity = 0; el.style.transform = ""; }
      },
    };
  },
};

// ------------------------------------------------------------------ noir_figure: adult silhouette with a rim light
// view: side (faces right; flip: true — left) | front; kind: courier (hood, bag) | coat (long coat) | hat (coat + fedora) | plain;
// pose (track: stand walk run aim reach point recoil — or {sh1, el1, sh2, el2, th1, kn1, th2, kn2, lean}),
// walk (track, steps/s; >2.4 = run gait), hold: box | rifle | radio | none, watch (glowing wrist colour), color, rim, rim_side (-1/1),
// rim_w, hair (colour shown on the head edge), sit (0..1 — sitting in a chair, side view)
const POSES = {
  stand: { sh1: 4, el1: 8, sh2: -4, el2: 8, th1: 2, kn1: 2, th2: -2, kn2: 2, lean: 0 },
  reach: { sh1: 78, el1: 8, sh2: -6, el2: 12, th1: 6, kn1: 4, th2: -8, kn2: 4, lean: 4 },
  point: { sh1: 88, el1: 0, sh2: -4, el2: 8, th1: 4, kn1: 2, th2: -4, kn2: 2, lean: 0 },
  aim: { sh1: 84, el1: 6, sh2: 62, el2: 58, th1: 12, kn1: 6, th2: -12, kn2: 4, lean: 6 },
  recoil: { sh1: 96, el1: 14, sh2: 70, el2: 70, th1: 12, kn1: 6, th2: -12, kn2: 4, lean: -2 },
  back: { sh1: 30, el1: 40, sh2: 20, el2: 30, th1: -8, kn1: 10, th2: 14, kn2: 6, lean: -10 },
  sit: { sh1: 30, el1: 50, sh2: 24, el2: 56, th1: 88, kn1: 88, th2: 84, kn2: 86, lean: -6 },
  box: { sh1: 20, el1: 80, sh2: -4, el2: 10, th1: 2, kn1: 2, th2: -2, kn2: 2, lean: 0 },
};
export const noir_figure = {
  origin: "bottom",
  grounded: true,
  size_m: { h: 1.8 },
  create(p, H) {
    const w = 240, h = 560, id = H.uid("nf"), view = p.view ?? "side", kind = p.kind ?? "courier";
    const col = H.col(p.color ?? "#0b0d10"), rim = H.col(p.rim ?? "#9fb6c8"), side = p.rim_side ?? -1, rw = p.rim_w ?? 3.2;
    const svg = H.svg(`<defs><g id="${id}"></g></defs>
      <ellipse class="sh" cx="${w / 2}" cy="${h - 3}" rx="70" ry="9" fill="#000" opacity=".45"/>
      <use href="#${id}" class="rim" style="color:${rim}" opacity=".95"/>
      <use href="#${id}" class="body" style="color:${col}"/>
      <g class="extra"></g>`, w, h);
    const g = svg.querySelector(`#${id}`), rimU = svg.querySelector(".rim"), extra = svg.querySelector(".extra");
    const cache = {};
    const SH = [w / 2, 140], HIP = [w / 2, 305], UA = 108, FA = 104, TH = 130, SN = 128;
    const lim = (a, b, c, wd) => `<path d="M${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)} L${c[0].toFixed(1)},${c[1].toFixed(1)}" stroke="currentColor" stroke-width="${wd}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    const at = (o, len, ang) => [o[0] + Math.sin(ang * D2R) * len, o[1] + Math.cos(ang * D2R) * len];
    return {
      el: svg, w, h,
      update(t, it) {
        let pose = it.v("pose", p.pose ?? "stand");
        if (typeof pose === "string") pose = POSES[pose] ?? POSES.stand;
        pose = { ...POSES.stand, ...pose };
        const speed = it.v("walk", p.walk ?? 0), run = speed > 2.4;
        const ph = phaseOf(H, it, t, "walk", p.walk ?? 0, cache) * Math.PI;
        let q = { ...pose }, bob = 0;
        if (speed > 0.05) {
          const k = Math.min(1, speed / 1.2), A = run ? 36 : 22, B = run ? 78 : 30, C = run ? 52 : 20;
          q.th1 = pose.th1 * (1 - k) + k * A * Math.sin(ph);
          q.th2 = pose.th2 * (1 - k) + k * A * Math.sin(ph + Math.PI);
          q.kn1 = pose.kn1 * (1 - k) + k * (6 + B * Math.max(0, -Math.cos(ph)));
          q.kn2 = pose.kn2 * (1 - k) + k * (6 + B * Math.max(0, Math.cos(ph)));
          if (!p.hold || p.hold === "none" || p.hold === "radio") { q.sh1 = pose.sh1 * (1 - k) - k * C * Math.sin(ph); q.el1 = pose.el1 * (1 - k) + k * (run ? 85 : 18); }
          q.sh2 = pose.sh2 * (1 - k) + k * C * Math.sin(ph); q.el2 = pose.el2 * (1 - k) + k * (run ? 85 : 18);
          q.lean = pose.lean + (run ? 13 : 3) * k;
          bob = -Math.abs(Math.sin(ph)) * (run ? 14 : 6) * k;
        }
        const sit = it.v("sit", p.sit ?? 0);
        let s = "";
        if (view === "front") {
          // front: legs straight, arms at the sides (sh = sideways raise), slight sway
          const sw = speed > 0.05 ? Math.sin(ph) * 6 : 0, y0 = bob;
          const lh = [w / 2 - 24, 300 + y0], rh = [w / 2 + 24, 300 + y0];
          s += lim(lh, [lh[0] - 4, 430 + y0 - Math.max(0, sw)], [lh[0] - 6, 552], 30) + lim(rh, [rh[0] + 4, 430 + y0 - Math.max(0, -sw)], [rh[0] + 6, 552], 30);
          s += `<path d="M${w / 2 - 34},544 h-30 q-6,12 4,14 h30 Z M${w / 2 + 34},544 h30 q6,12 -4,14 h-30 Z" fill="currentColor"/>`;
          const ls = [w / 2 - 50, 150 + y0], rs = [w / 2 + 50, 150 + y0];
          const la = at(ls, UA, -8 - q.sh2), lf = at(la, FA, -8 - q.sh2 + q.el2 * 0.3), ra = at(rs, UA, 8 + q.sh1), rf = at(ra, FA, 8 + q.sh1 - q.el1 * 0.3);
          s += lim(ls, la, lf, 26) + lim(rs, ra, rf, 26);
          s += `<path d="M${w / 2 - 54},${146 + y0} Q${w / 2},${128 + y0} ${w / 2 + 54},${146 + y0} L${w / 2 + 46},${kind === "plain" ? 312 : 420} Q${w / 2},${kind === "plain" ? 322 : 436} ${w / 2 - 46},${kind === "plain" ? 312 : 420} Z" fill="currentColor"/>`;
          s += `<rect x="${w / 2 - 11}" y="${100 + y0}" width="22" height="40" fill="currentColor"/><ellipse cx="${w / 2}" cy="${74 + y0}" rx="31" ry="38" fill="currentColor"/>`;
          if (kind === "courier") s += `<path d="M${w / 2 - 38},${96 + y0} Q${w / 2 - 46},${26 + y0} ${w / 2},${22 + y0} Q${w / 2 + 46},${26 + y0} ${w / 2 + 38},${96 + y0} L${w / 2 + 56},${146 + y0} L${w / 2 - 56},${146 + y0} Z" fill="currentColor"/>`;
          if (kind === "hat") s += `<ellipse cx="${w / 2}" cy="${50 + y0}" rx="58" ry="11" fill="currentColor"/><path d="M${w / 2 - 32},${50 + y0} Q${w / 2 - 30},${16 + y0} ${w / 2},${18 + y0} Q${w / 2 + 30},${16 + y0} ${w / 2 + 32},${50 + y0} Z" fill="currentColor"/>`;
          g.innerHTML = s;
          let ex = "";
          if (p.watch) { const wc = H.col(p.watch); ex += `<circle cx="${lf[0]}" cy="${lf[1] - 14}" r="7" fill="${wc}"/><circle cx="${lf[0]}" cy="${lf[1] - 14}" r="18" fill="${wc}" opacity=".3" style="filter:blur(5px)"/>`; }
          if (kind === "courier") ex += `<path d="M${w / 2 - 22},${62 + y0} Q${w / 2},${44 + y0} ${w / 2 + 22},${62 + y0} L${w / 2 + 18},${104 + y0} Q${w / 2},${116 + y0} ${w / 2 - 18},${104 + y0} Z" fill="#20242a"/><path d="M${w / 2 - 30},${58 + y0} Q${w / 2},${34 + y0} ${w / 2 + 30},${58 + y0}" stroke="${H.col(p.rim ?? "#9fb6c8")}" stroke-width="2.5" fill="none" opacity=".6"/>`;
          if (p.hold === "box") ex += boxSvg(w / 2 - 54, 214 + y0, 108, 84);
          if (p.hold === "radio") ex += `<rect x="${rf[0] - 9}" y="${rf[1] - 34}" width="18" height="40" rx="3" fill="#15181c"/><circle cx="${rf[0] + 4}" cy="${rf[1] - 30}" r="2.5" fill="${RED}"/>`;
          extra.innerHTML = ex;
        } else {
          // side view, facing right
          const lean = q.lean, y0 = bob;
          const hip = [HIP[0] - lean * 0.6, HIP[1] + y0 + sit * 120];
          const sh = [hip[0] + Math.sin(lean * D2R) * 165, hip[1] - Math.cos(lean * D2R) * 165];
          const leg = (th, kn) => { const k1 = at(hip, TH, th), f = at(k1, SN, th - kn); return [k1, f]; };
          const [k1, f1] = leg(q.th1, q.kn1), [k2, f2] = leg(q.th2, q.kn2);
          const foot = (f, th) => `<path d="M${(f[0] - 12).toFixed(1)},${(f[1] - 8).toFixed(1)} L${(f[0] + 34).toFixed(1)},${(f[1] - 2).toFixed(1)} Q${(f[0] + 38).toFixed(1)},${(f[1] + 8).toFixed(1)} ${(f[0] + 26).toFixed(1)},${(f[1] + 8).toFixed(1)} L${(f[0] - 14).toFixed(1)},${(f[1] + 8).toFixed(1)} Z" fill="currentColor"/>`;
          const arm = (a, e) => { const el = at(sh, UA, 180 - (180 - a) - 0), u = [sh[0] + Math.sin(a * D2R) * UA, sh[1] + Math.cos(a * D2R) * UA]; const fa = [u[0] + Math.sin((a + e) * D2R) * FA, u[1] + Math.cos((a + e) * D2R) * FA]; return [u, fa]; };
          // far arm/leg first (index 2), body, near (index 1)
          const [u2, h2] = arm(q.sh2, q.el2), [u1, h1] = arm(q.sh1, q.el1);
          s += lim(hip, k2, f2, 31) + foot(f2) + lim(sh, u2, h2, 24);
          const nk = [sh[0] + Math.sin(lean * D2R) * 30, sh[1] - Math.cos(lean * D2R) * 30];
          const hd = [sh[0] + Math.sin(lean * D2R) * 78 + 4, sh[1] - Math.cos(lean * D2R) * 78];
          // torso
          const bx = Math.cos(lean * D2R), by = Math.sin(lean * D2R);
          const tw = kind === "plain" ? 34 : 40;
          s += `<path d="M${(sh[0] - tw * bx).toFixed(1)},${(sh[1] - tw * by).toFixed(1)} Q${(sh[0] + 4).toFixed(1)},${(sh[1] - 16).toFixed(1)} ${(sh[0] + tw * bx).toFixed(1)},${(sh[1] + tw * by).toFixed(1)} L${(hip[0] + 30).toFixed(1)},${(hip[1] + 6).toFixed(1)} L${(hip[0] - 32).toFixed(1)},${(hip[1] + 6).toFixed(1)} Z" fill="currentColor"/>`;
          if (kind !== "plain") {
            // coat skirt follows the thighs
            const len = kind === "courier" ? 70 : 150;
            const a = at(hip, len, Math.max(q.th1, q.th2) + 6), b = at(hip, len, Math.min(q.th1, q.th2) - 10);
            s += `<path d="M${(hip[0] - 34).toFixed(1)},${(hip[1] - 10).toFixed(1)} L${(hip[0] + 32).toFixed(1)},${(hip[1] - 10).toFixed(1)} L${(a[0] + 22).toFixed(1)},${a[1].toFixed(1)} L${(b[0] - 26).toFixed(1)},${b[1].toFixed(1)} Z" fill="currentColor"/>`;
          }
          s += `<path d="M${(sh[0] - 9).toFixed(1)},${sh[1].toFixed(1)} L${(nk[0] - 9).toFixed(1)},${nk[1].toFixed(1)} L${(nk[0] + 11).toFixed(1)},${nk[1].toFixed(1)} L${(sh[0] + 11).toFixed(1)},${sh[1].toFixed(1)} Z" fill="currentColor"/>`;
          // head in profile (nose to the right)
          s += `<path d="M${hd[0] - 30},${hd[1] + 6} Q${hd[0] - 32},${hd[1] - 40} ${hd[0] + 2},${hd[1] - 40} Q${hd[0] + 30},${hd[1] - 38} ${hd[0] + 30},${hd[1] - 8} L${hd[0] + 38},${hd[1] + 6} L${hd[0] + 30},${hd[1] + 10} Q${hd[0] + 30},${hd[1] + 30} ${hd[0] + 14},${hd[1] + 34} L${hd[0] - 12},${hd[1] + 34} Q${hd[0] - 30},${hd[1] + 28} ${hd[0] - 30},${hd[1] + 6} Z" fill="currentColor"/>`;
          if (kind === "courier") s += `<path d="M${hd[0] - 40},${hd[1] + 30} Q${hd[0] - 50},${hd[1] - 54} ${hd[0] + 4},${hd[1] - 50} Q${hd[0] + 34},${hd[1] - 46} ${hd[0] + 26},${hd[1] - 10} L${hd[0] + 6},${hd[1] - 22} Q${hd[0] - 16},${hd[1] - 20} ${hd[0] - 10},${hd[1] + 38} Z" fill="currentColor"/>`;
          if (kind === "hat") s += `<ellipse cx="${hd[0] + 2}" cy="${hd[1] - 30}" rx="56" ry="9" fill="currentColor"/><path d="M${hd[0] - 28},${hd[1] - 30} Q${hd[0] - 26},${hd[1] - 64} ${hd[0] + 2},${hd[1] - 62} Q${hd[0] + 28},${hd[1] - 64} ${hd[0] + 30},${hd[1] - 30} Z" fill="currentColor"/>`;
          s += lim(hip, k1, f1, 32) + foot(f1) + lim(sh, u1, h1, 25);
          if (kind === "courier") { const bg = at(hip, 18, 160); s += `<rect x="${(bg[0] - 64).toFixed(1)}" y="${(bg[1] - 28).toFixed(1)}" width="58" height="66" rx="8" fill="currentColor"/>`; }
          g.innerHTML = s;
          let ex = "";
          if (p.hair) ex += `<path d="M${hd[0] - 30},${hd[1] - 4} Q${hd[0] - 34},${hd[1] - 44} ${hd[0] + 4},${hd[1] - 42} Q${hd[0] + 26},${hd[1] - 40} ${hd[0] + 28},${hd[1] - 22}" stroke="${H.col(it.v("hair", p.hair))}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
          if (p.watch) { const wc = H.col(p.watch); ex += `<circle cx="${h1[0].toFixed(1)}" cy="${h1[1].toFixed(1)}" r="6" fill="${wc}"/><circle cx="${h1[0].toFixed(1)}" cy="${h1[1].toFixed(1)}" r="16" fill="${wc}" opacity=".35" style="filter:blur(4px)"/>`; }
          if (p.hold === "box") { const c = [(h1[0] + u1[0]) / 2, (h1[1] + u1[1]) / 2]; ex += boxSvg(c[0] - 40, c[1] - 30, 92, 72); }
          if (p.hold === "rifle") {
            const a = Math.atan2(h1[1] - u1[1], h1[0] - u1[0]);
            const rx = (L) => [sh[0] + Math.cos(a) * L, sh[1] + 6 + Math.sin(a) * L];
            const b0 = rx(-30), b1 = rx(260), sc0 = rx(40), sc1 = rx(110);
            ex += `<path d="M${b0[0]},${b0[1]} L${b1[0]},${b1[1]}" stroke="${H.col(p.color ?? "#0b0d10")}" stroke-width="12" stroke-linecap="round"/>
              <path d="M${sc0[0]},${sc0[1] - 14} L${sc1[0]},${sc1[1] - 14}" stroke="${H.col(p.color ?? "#0b0d10")}" stroke-width="14" stroke-linecap="round"/>
              <circle cx="${sc1[0] + 4}" cy="${sc1[1] - 14}" r="5" fill="${RED}" opacity=".9"/>`;
          }
          if (p.hold === "radio") ex += `<rect x="${hip[0] - 4}" y="${hip[1] - 24}" width="16" height="34" rx="3" fill="#15181c"/><circle cx="${hip[0] + 8}" cy="${hip[1] - 20}" r="2.5" fill="${RED}"/>`;
          extra.innerHTML = ex;
        }
        rimU.setAttribute("transform", `translate(${side * rw},${-rw * 0.4})`);
      },
      anchor(name) {
        if (name === "head") return [w / 2, 70];
        if (name === "hand") return [w / 2 + 90, 250];
        return null;
      },
    };
  },
};

// small box with the red string (held by figures)
function boxSvg(x, y, bw, bh) {
  return `<g transform="translate(${x},${y})"><rect width="${bw}" height="${bh}" rx="3" fill="#5c564c"/><rect width="${bw}" height="${bh * 0.18}" fill="#6e675b"/>
    <path d="M${bw / 2},0 v${bh} M0,${bh * 0.5} h${bw}" stroke="${RED}" stroke-width="4"/><circle cx="${bw / 2}" cy="${bh * 0.5}" r="6" fill="#8a8f96"/></g>`;
}

// ------------------------------------------------------------------ noir_face: profile close-up lit from one side
// facing right (flip: true — left); hood | hat | loupe (jeweller's loupe on the forehead) | glasses; hair (track colour),
// age (track 0..1: wrinkles), rim (light colour), rim_k (track), eye (track 0..1 open), talk: [[t0, t1]], smile (track 0..1)
export const noir_face = {
  origin: "center",
  create(p, H) {
    const w = 640, h = 820, id = H.uid("fc"), rim = H.col(p.rim ?? SODIUM), skin = H.col(p.skin ?? "#121418");
    const svg = H.svg(`<defs>
        <linearGradient id="${id}g" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${rim}" stop-opacity=".55"/><stop offset=".22" stop-color="${skin}" stop-opacity="1"/><stop offset="1" stop-color="#050607"/></linearGradient>
        <filter id="${id}b"><feGaussianBlur stdDeviation="5"/></filter></defs>
      <g class="back"></g>
      <path class="face" fill="url(#${id}g)"/>
      <path class="edge" fill="none" stroke="${rim}" stroke-width="5" stroke-linecap="round"/>
      <path class="edgeb" fill="none" stroke="${rim}" stroke-width="16" opacity=".35" filter="url(#${id}b)"/>
      <g class="det"></g><g class="top"></g>`, w, h);
    const face = svg.querySelector(".face"), edge = svg.querySelector(".edge"), edgeb = svg.querySelector(".edgeb");
    const det = svg.querySelector(".det"), top = svg.querySelector(".top"), back = svg.querySelector(".back");
    // profile outline (facing right): forehead → brow → nose → lips → chin → jaw → neck → back of head
    const front = "M330,150 Q420,150 448,250 Q456,292 452,318 Q470,350 496,404 Q500,418 480,424 L462,428 Q466,446 458,452 Q472,470 460,482 Q452,490 456,500 Q462,532 446,560 Q420,600 380,604 L360,606";
    const rest = " Q330,640 330,690 L336,820 L120,820 L150,660 Q110,600 110,500 Q100,330 160,220 Q220,150 330,150 Z";
    face.setAttribute("d", front + rest);
    edge.setAttribute("d", front); edgeb.setAttribute("d", front);
    const talks = p.talk ?? [];
    return {
      el: svg, w, h,
      update(t, it) {
        const hair = H.col(it.v("hair", p.hair ?? "#0d0f12")), age = it.v("age", p.age ?? 0), rk = it.v("rim_k", 1);
        edge.setAttribute("opacity", 0.9 * rk); edgeb.setAttribute("opacity", 0.35 * rk);
        const eye = it.v("eye", 1), smile = it.v("smile", 0);
        let talking = 0;
        for (const [a, b] of talks) if (t >= a && t <= b) talking = 0.5 + 0.5 * Math.abs(Math.sin(t * 17));
        let d = "";
        // eye: lid line + glint
        d += `<path d="M404,${300 + (1 - eye) * 4} Q420,${296 + (1 - eye) * 6} 434,${302}" stroke="${rim}" stroke-width="3" fill="none" opacity="${0.5 * rk}"/>`;
        if (eye > 0.3) d += `<circle cx="428" cy="306" r="3.5" fill="${WARM}" opacity="${0.8 * rk * eye}"/>`;
        // mouth
        d += `<path d="M452,${484 + talking * 6} Q440,${488 + talking * 8 - smile * 6} 426,${484 - smile * 4}" stroke="#000" stroke-width="3" fill="none"/>`;
        // wrinkles with age
        if (age > 0.02) d += `<g stroke="${rim}" stroke-width="2.4" fill="none" opacity="${0.55 * age * rk}"><path d="M436,326 q14,8 20,24"/><path d="M380,240 q30,-8 56,0"/><path d="M386,262 q24,-6 44,0"/><path d="M440,512 q6,16 -4,30"/><path d="M404,336 q10,22 6,46"/></g>`;
        det.innerHTML = d;
        // hair mass on top/back (rim-lit edge in the hair colour)
        let b = `<path d="M150,500 Q96,330 170,210 Q240,128 340,138 Q430,146 452,246 Q420,190 340,186 Q260,186 230,260 Q200,340 214,520 Z" fill="${hair}"/>`;
        b += `<path d="M340,138 Q430,146 452,246" stroke="${H.mixc(hair, "#ffffff", 0.25)}" stroke-width="6" fill="none" opacity=".8"/>`;
        if (p.hood) b = `<path d="M90,820 L110,560 Q60,330 150,190 Q240,80 360,96 Q470,110 500,260 Q470,200 360,180 Q250,172 222,290 Q200,420 250,640 L300,820 Z" fill="#0a0c0f"/><path d="M360,96 Q470,110 500,260" stroke="${rim}" stroke-width="5" fill="none" opacity="${0.7 * rk}"/>`;
        back.innerHTML = b;
        let tp = "";
        if (p.hat) tp += `<path d="M120,190 L560,170 Q580,182 556,192 L120,214 Z" fill="#090a0c"/><path d="M200,186 Q206,70 330,64 Q440,62 458,178 Z" fill="#0c0d10"/><path d="M200,186 L458,178" stroke="${rim}" stroke-width="3" opacity="${0.6 * rk}"/><path d="M120,190 L560,170" stroke="${rim}" stroke-width="3" opacity="${0.5 * rk}"/>`;
        if (p.loupe) tp += `<g transform="translate(410,206) rotate(-14)"><rect x="-10" y="-20" width="90" height="46" rx="10" fill="#111317"/><ellipse cx="80" cy="3" rx="12" ry="24" fill="#2b3036"/><ellipse cx="82" cy="3" rx="7" ry="17" fill="${rim}" opacity=".7"/></g><path d="M200,240 Q300,200 410,206" stroke="#111317" stroke-width="10" fill="none"/>`;
        if (p.glasses) tp += `<path d="M396,296 h50 v22 h-50 Z" fill="none" stroke="${rim}" stroke-width="3" opacity=".7"/><path d="M396,302 L300,290" stroke="#111317" stroke-width="5"/>`;
        if (p.collar) tp += `<path d="M150,700 L330,640 L380,820 L120,820 Z" fill="#0a0b0d"/><path d="M330,640 L380,820" stroke="${rim}" stroke-width="3" opacity="${0.5 * rk}"/>`;
        top.innerHTML = tp;
      },
    };
  },
};

// ------------------------------------------------------------------ laser: sniper sight beam + dot (place at 0,0)
// from [x, y], to (track [x, y]), on (track 0..1), beam (alpha 0..1 — visible in rain/fog), r (dot radius), shake (px)
export const laser = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const id = H.uid("lz");
    const svg = H.svg(`<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${RED}" stop-opacity=".0"/><stop offset=".5" stop-color="${RED}" stop-opacity=".35"/><stop offset="1" stop-color="${RED}" stop-opacity=".75"/></linearGradient>
      <filter id="${id}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>
      <line class="bw" stroke="url(#${id})" stroke-width="10" filter="url(#${id}f)"/><line class="b" stroke="url(#${id})" stroke-width="2.4"/>
      <circle class="halo" fill="${RED}" opacity=".45" filter="url(#${id}f)"/><circle class="dot" fill="#ff5a68"/><circle class="core" fill="#fff" opacity=".85"/>`, 10, 10);
    const gr = svg.querySelector(`#${id}`), bw = svg.querySelector(".bw"), b = svg.querySelector(".b");
    const halo = svg.querySelector(".halo"), dot = svg.querySelector(".dot"), core = svg.querySelector(".core");
    return {
      el: svg, w: 10, h: 10,
      update(t, it) {
        const on = it.v("on", 1), from = it.v("from", p.from ?? [0, 0]), to = it.v("to", p.to ?? [540, 960]);
        const sh = p.shake ?? 3, x = to[0] + H.noise(t, 3, 1.3) * sh, y = to[1] + H.noise(t, 7, 1.1) * sh;
        const ba = it.v("beam", p.beam ?? 0.7) * on, r = p.r ?? 9;
        for (const l of [bw, b]) { l.setAttribute("x1", from[0]); l.setAttribute("y1", from[1]); l.setAttribute("x2", x); l.setAttribute("y2", y); l.setAttribute("opacity", ba); }
        gr.setAttribute("x1", from[0]); gr.setAttribute("y1", from[1]); gr.setAttribute("x2", x); gr.setAttribute("y2", y);
        const pul = 0.85 + 0.15 * Math.sin(t * 9);
        halo.setAttribute("cx", x); halo.setAttribute("cy", y); halo.setAttribute("r", r * 3.2 * pul); halo.setAttribute("opacity", 0.45 * on);
        dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", r); dot.setAttribute("opacity", on);
        core.setAttribute("cx", x); core.setAttribute("cy", y); core.setAttribute("r", r * 0.38); core.setAttribute("opacity", 0.85 * on);
      },
    };
  },
};

// ------------------------------------------------------------------ bullet_trail: glowing tracer along a path (place at 0,0)
// d (svg path in world px), k (track 0..1: head position), tail (px), fade (track 0..1: trail fades), color, w
export const bullet_trail = {
  backdrop: true,
  origin: "top-left",
  create(p, H) {
    const id = H.uid("bt"), col = H.col(p.color ?? "#ffd9a0");
    const svg = H.svg(`<defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>
      <path class="gw" d="${p.d}" fill="none" stroke="${col}" stroke-width="${(p.w ?? 5) * 4}" stroke-linecap="round" filter="url(#${id})" opacity=".6"/>
      <path class="c" d="${p.d}" fill="none" stroke="#fff6e6" stroke-width="${p.w ?? 5}" stroke-linecap="round"/>
      <circle class="hd" r="${(p.w ?? 5) * 2.2}" fill="#fff"/><circle class="hg" r="${(p.w ?? 5) * 6}" fill="${col}" filter="url(#${id})"/>`, 10, 10);
    const gw = svg.querySelector(".gw"), c = svg.querySelector(".c"), hd = svg.querySelector(".hd"), hg = svg.querySelector(".hg");
    const L = c.getTotalLength(), tail = p.tail ?? 420;
    return {
      el: svg, w: 10, h: 10,
      update(t, it) {
        const k = Math.max(0, Math.min(1, it.v("k", 0))), fade = it.v("fade", 0), head = k * L;
        const a = Math.max(0, head - tail * (1 + fade * 2));
        for (const e of [gw, c]) { e.setAttribute("stroke-dasharray", `0 ${a} ${head - a} ${L + 10}`); e.style.opacity = (e === gw ? 0.6 : 1) * (1 - fade) * (k > 0 ? 1 : 0); }
        const pt = c.getPointAtLength(head);
        const vis = k > 0 && k < 1 ? 1 : 0;
        for (const e of [hd, hg]) { e.setAttribute("cx", pt.x); e.setAttribute("cy", pt.y); e.style.opacity = vis; }
      },
    };
  },
};

// ------------------------------------------------------------------ name_tag: who is speaking / who enters (origin center)
// label ("САВВА, 26"), sub ("КУРЬЕР"), color (bar), align: left | center, w
export const name_tag = {
  origin: "center",
  create(p, H) {
    const el = H.div(`pointer-events:none;white-space:nowrap`);
    const bar = H.div(`position:relative;display:inline-block;padding:14px 26px 16px 30px;background:rgba(7,8,10,.82);border-left:8px solid ${H.col(p.color ?? RED)}`);
    bar.innerHTML = `<div style="font:700 ${p.size ?? 50}px Oswald,sans-serif;letter-spacing:2px;color:${WARM};line-height:1.05">${p.label ?? ""}</div>` +
      (p.sub ? `<div style="font:600 ${Math.round((p.size ?? 50) * 0.52)}px 'IBM Plex Mono',monospace;letter-spacing:3px;color:#a9aeb5;margin-top:6px">${p.sub}</div>` : "");
    bar.style.position = "relative";
    el.append(bar);
    return { el };
  },
};

// ------------------------------------------------------------------ noir_title: big title card (origin center)
// kicker, text, sub, size, w
export const noir_title = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 960;
    const el = H.div(`width:${w}px;text-align:center;pointer-events:none`);
    el.innerHTML = `${p.kicker ? `<div style="position:relative;font:600 30px 'IBM Plex Mono',monospace;letter-spacing:10px;color:${RED};margin-bottom:18px">${p.kicker}</div>` : ""}
      <div style="position:relative;font:700 ${p.size ?? 128}px/0.98 Oswald,sans-serif;letter-spacing:3px;color:${WARM};text-shadow:0 6px 30px rgba(0,0,0,.8)">${p.text ?? ""}</div>
      ${p.sub ? `<div style="position:relative;margin:26px auto 0;width:${w * 0.7}px;border-top:3px solid ${RED};padding-top:16px;font:600 28px 'IBM Plex Mono',monospace;letter-spacing:4px;color:#a9aeb5">${p.sub}</div>` : ""}`;
    return { el, w };
  },
};

// ------------------------------------------------------------------ noir_rule: a rule of the world in large type for 1–2 s (origin center)
// kicker (mono, red bar), text (Oswald), w, size, danger
export const noir_rule = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 940;
    const el = H.div(`width:${w}px;pointer-events:none`);
    el.innerHTML = `<div style="position:relative;width:${w}px;box-sizing:border-box;padding:26px 40px 34px;background:rgba(7,8,10,.84);border-top:6px solid ${p.danger === false ? WARM : RED}">
      ${p.kicker ? `<div style="font:600 28px 'IBM Plex Mono',monospace;letter-spacing:5px;color:${p.danger === false ? "#a9aeb5" : RED};margin-bottom:10px">${p.kicker}</div>` : ""}
      <div style="font:700 ${p.size ?? 84}px/1.02 Oswald,sans-serif;letter-spacing:1px;color:${WARM}">${p.text ?? ""}</div></div>`;
    return { el, w };
  },
};
