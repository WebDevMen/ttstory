// person: a rigged flat-style character (SVG puppet) — front or side view, poses with smooth blending, procedural
// walk/run, facial expressions with automatic blinking, hair styles, outfits (Japanese school uniforms and more),
// accessories and props in hands. Origin = between the feet.
//
//   view: front | side (side faces right; flip: true faces left)
//   look: {age: student|kid|adult, skin, hair: short|spiky|buzz|side|bob|long|ponytail|twintails|bun, hair_color,
//          outfit: sailor|gakuran|blazer|blazer_skirt|pe|kyushoku|kendo|baseball|teacher_m|teacher_f|casual|suit,
//          color (main outfit color), accent (scarf/tie/stripe), legs: skin|socks|tights, shoes,
//          bag: randoseru|school_bag, bag_color, hat: kid|cap|kyushoku, mask, glasses, blush, silhouette}
//   pose (track): stand|wave|raise|cheer|point|think|hold|together|bow|sit|shrug|arms_up | side: stand|bow|sit|wipe|sweep|swing|carry
//          or an object of joint angles {a1: [shoulder, elbow], a2, l1: [hip, knee], l2, lean, bow, sit, tilt, nod, jump}
//   walk (track, steps/s; 0 = still), run (bool), face (track): neutral|smile|happy|surprised|talk|sad|sleep|determined|wink
//   talk: [[from, until], ...] mouth moves, look_dx (track, eyes left/right), hold / hold_l: tray|broom|mop|rag|bat|book|phone|shinai|flag|bowl
//   anchors: head, face, hand_l, hand_r (front: screen sides), hand (side: near hand), hip, top
const SK = { light: "#ffe0c4", mid: "#f6cfa8", tan: "#e3b38a", dark: "#b07a55" };
const HAIR = ["#2b1d1a", "#1f1a24", "#3a2a22", "#4a3326", "#22181a"];
const DIMS = {
  student: { leg: 150, thigh: 78, shin: 72, torso: 102, neck: 8, R: 50, sw: 84, hip: 66, upper: 60, fore: 56, armW: 19, legW: 22, depth: 52, hand: 9.5 },
  kid: { leg: 112, thigh: 58, shin: 54, torso: 80, neck: 6, R: 49, sw: 66, hip: 56, upper: 46, fore: 42, armW: 17, legW: 19, depth: 46, hand: 8.5 },
  adult: { leg: 166, thigh: 86, shin: 80, torso: 114, neck: 10, R: 48, sw: 94, hip: 72, upper: 68, fore: 62, armW: 21, legW: 24, depth: 56, hand: 10 },
};
const OUTFITS = {
  sailor: { top: "#f4f6fb", collar: "#24345e", accent: "#e0414f", bottom: "skirt", bottomColor: "#24345e", sleeve: "short", legs: "socks", shoes: "#3a2a26" },
  gakuran: { top: "#1d2230", collar: "#1d2230", accent: "#d9b45a", bottom: "pants", bottomColor: "#1d2230", sleeve: "long", shoes: "#2a2224" },
  blazer: { top: "#25335a", collar: "#f4f6fb", accent: "#c8323f", bottom: "pants", bottomColor: "#5a5f6e", sleeve: "long", shoes: "#2a2224" },
  blazer_skirt: { top: "#25335a", collar: "#f4f6fb", accent: "#c8323f", bottom: "skirt", bottomColor: "#4d5a78", sleeve: "long", legs: "socks", shoes: "#3a2a26" },
  pe: { top: "#f7f8fb", collar: "#f7f8fb", accent: "#2b5fbf", bottom: "shorts", bottomColor: "#22408a", sleeve: "short", legs: "skin", shoes: "#f2f2f2" },
  kyushoku: { top: "#ffffff", collar: "#ffffff", accent: "#ffffff", bottom: "coat", bottomColor: "#ffffff", sleeve: "long", legs: "socks", shoes: "#f2f2f2", hat: "kyushoku", mask: true },
  kendo: { top: "#22305a", collar: "#f1efe8", accent: "#22305a", bottom: "hakama", bottomColor: "#1b2442", sleeve: "long", shoes: null },
  baseball: { top: "#f6f6f2", collar: "#f6f6f2", accent: "#2a3f8f", bottom: "pants", bottomColor: "#f0efea", sleeve: "short", shoes: "#1d1d22", hat: "cap" },
  teacher_m: { top: "#cfe0f2", collar: "#cfe0f2", accent: "#2f3f63", bottom: "pants", bottomColor: "#4a4f5c", sleeve: "long", shoes: "#2a2224", tie: true },
  teacher_f: { top: "#d9b98f", collar: "#f6f2ea", accent: "#d9b98f", bottom: "skirt", bottomColor: "#4a4f5c", sleeve: "long", legs: "tights", shoes: "#2a2224" },
  suit: { top: "#2b2f3a", collar: "#f4f6fb", accent: "#7a2b35", bottom: "pants", bottomColor: "#2b2f3a", sleeve: "long", shoes: "#1d1a1a", tie: true },
  casual: { top: "#5b8def", collar: "#5b8def", accent: "#ffffff", bottom: "pants", bottomColor: "#34405e", sleeve: "short", shoes: "#f2f2f2" },
};
const FRONT_POSES = {
  stand: { a1: [7, 4], a2: [7, 4], l1: [2, 0], l2: [2, 0] },
  wave: { a1: [7, 4], a2: [128, -78], l1: [2, 0], l2: [2, 0] },
  raise: { a1: [7, 4], a2: [150, -22], l1: [2, 0], l2: [2, 0] },
  cheer: { a1: [140, -20], a2: [140, -20], l1: [6, 0], l2: [6, 0] },
  arms_up: { a1: [160, -8], a2: [160, -8], l1: [4, 0], l2: [4, 0] },
  point: { a1: [7, 4], a2: [88, 2], l1: [2, 0], l2: [2, 0] },
  think: { a1: [16, 95], a2: [18, 150], l1: [2, 0], l2: [2, 0], tilt: 6 },
  hold: { a1: [14, 100], a2: [14, 100], l1: [2, 0], l2: [2, 0] },
  together: { a1: [24, 132], a2: [24, 132], l1: [2, 0], l2: [2, 0] },
  bow: { a1: [2, 8], a2: [2, 8], l1: [2, 0], l2: [2, 0], bow: 1 },
  sit: { a1: [12, 70], a2: [12, 70], l1: [4, 0], l2: [4, 0], sit: 1 },
  shrug: { a1: [40, 110], a2: [40, 110], l1: [2, 0], l2: [2, 0], tilt: -6 },
  surprised: { a1: [40, 140], a2: [40, 140], l1: [3, 0], l2: [3, 0] },
};
const SIDE_POSES = {
  stand: { a1: [4, 6], a2: [-4, 8], l1: [2, 0], l2: [-2, 0] },
  bow: { a1: [8, 4], a2: [8, 4], l1: [0, 0], l2: [0, 0], lean: 42 },
  sit: { a1: [30, 50], a2: [36, 46], l1: [90, 90], l2: [86, 88], sit: 1 },
  wipe: { a1: [96, 0], a2: [104, 0], l1: [-30, 10], l2: [10, 40], lean: 70 },
  sweep: { a1: [38, 34], a2: [52, 24], l1: [8, 4], l2: [-8, 6], lean: 16 },
  swing: { a1: [100, 30], a2: [110, 24], l1: [16, 6], l2: [-16, 10], lean: 8 },
  swing_ready: { a1: [-20, 118], a2: [-10, 122], l1: [14, 6], l2: [-14, 10], lean: 4 },
  carry: { a1: [40, 80], a2: [40, 80], l1: [2, 0], l2: [-2, 0] },
  reach: { a1: [70, 10], a2: [80, 6], l1: [4, 0], l2: [-4, 0], lean: 10 },
};
const NEUTRAL = { a1: [0, 0], a2: [0, 0], l1: [0, 0], l2: [0, 0], lean: 0, bow: 0, sit: 0, tilt: 0, nod: 0, jump: 0 };

function poseObj(v, side) {
  const base = side ? SIDE_POSES : FRONT_POSES;
  const o = typeof v === "string" ? base[v] ?? base.stand : v ?? base.stand;
  if (typeof v === "string" && !base[v]) console.error(`person: unknown ${side ? "side" : "front"} pose '${v}'`);
  return { ...NEUTRAL, ...o };
}

export const person = {
  create(p, H, item) {
    const look = { ...(typeof p.look === "object" ? p.look : {}) };
    const age = look.age ?? "student";
    const D = DIMS[age] ?? DIMS.student;
    const O = { ...(OUTFITS[look.outfit ?? (age === "adult" ? "teacher_m" : "sailor")] ?? OUTFITS.sailor) };
    const side = p.view === "side";
    const seed = p.seed ?? Math.floor(item.seed);
    const sil = look.silhouette ? H.col(look.silhouette === true ? "#1a1424" : look.silhouette) : null;
    const C = (c) => sil ?? H.col(c);
    const skin = C(SK[look.skin] ?? look.skin ?? SK.light);
    const skinS = sil ?? H.shade(skin, -0.12);
    const hairC = C(look.hair_color ?? HAIR[seed % HAIR.length]);
    const top = C(look.color ?? O.top), topS = sil ?? H.shade(top, -0.14);
    const collar = C(look.collar ?? O.collar), accent = C(look.accent ?? O.accent);
    const bottomC = C(look.bottom_color ?? O.bottomColor), bottomS = sil ?? H.shade(bottomC, -0.15);
    const legsKind = look.legs ?? O.legs ?? (O.bottom === "pants" || O.bottom === "hakama" ? "pants" : "skin");
    const sockC = C(look.socks ?? (O.bottom === "skirt" ? "#24345e" : "#f2f2f4"));
    const shoeC = C(look.shoes ?? O.shoes ?? "#2a2224");
    const hairStyle = look.hair ?? (O.bottom === "skirt" || O.bottom === "coat" ? ["bob", "long", "ponytail", "twintails"][seed % 4] : ["short", "spiky", "side"][seed % 3]);
    const hat = look.hat === false ? null : look.hat ?? O.hat ?? null;
    const R = D.R, W = 260, Hh = D.leg + D.torso + D.neck + R * 2 + 40;
    const hipY = Hh - D.leg;               // in local px, feet at Hh
    const svg = H.svg("", W, Hh);
    const g = (parent, attrs = {}) => H.el("g", attrs, parent);
    const P = (parent, d, fill, extra = {}) => H.el("path", { d, fill, ...extra }, parent);
    const rr = (parent, x, y, w, h, r, fill, extra = {}) => H.el("rect", { x, y, width: w, height: h, rx: r, fill, ...extra }, parent);
    const circ = (parent, cx, cy, r, fill, extra = {}) => H.el("circle", { cx, cy, r, fill, ...extra }, parent);
    const ell = (parent, cx, cy, rx, ry, fill, extra = {}) => H.el("ellipse", { cx, cy, rx, ry, fill, ...extra }, parent);

    const root = g(svg);                    // translate(W/2, hipY) + jump/sit
    const shadow = ell(svg, W / 2, Hh - 2, D.sw * 0.55, 8, "rgba(0,0,0,0.18)");
    if (p.shadow === false || sil) shadow.remove();
    else svg.insertBefore(shadow, root);
    const body = g(root);
    const S = {};                            // joints to animate

    // ---------------------------------------------------------------- legs
    const legColor = legsKind === "pants" ? bottomC : skin;
    function leg(parent, x, far) {
      const j = g(parent, { transform: `translate(${x},-6)` });
      const thighC = far ? (legsKind === "pants" ? bottomS : skinS) : legColor;
      const lw = D.legW * (legsKind === "pants" ? 1.18 : 1);
      rr(j, -lw / 2, -6, lw, D.thigh + 12, lw / 2, thighC);
      const knee = g(j, { transform: `translate(0,${D.thigh})` });
      rr(knee, -lw * 0.46, -6, lw * 0.92, D.shin + 8, lw * 0.45, thighC);
      if (legsKind === "socks") rr(knee, -lw * 0.48, D.shin * 0.42, lw * 0.96, D.shin * 0.6, lw * 0.4, far ? H.shade(sockC, -0.15) : sockC);
      if (legsKind === "tights") rr(knee, -lw * 0.48, -6, lw * 0.96, D.shin + 6, lw * 0.4, C("rgba(40,36,48,0.55)"));
      if (O.bottom !== "hakama" || side) {
        const fx = side ? 9 : x < 0 ? -5 : 5;
        rr(knee, fx - 17, D.shin - 2, 34, 15, 7.5, far ? H.shade(shoeC, -0.2) : shoeC);
      }
      return { j, knee };
    }
    // ---------------------------------------------------------------- torso + head
    const torsoG = g(body);
    function arm(parent, x, far) {
      const j = g(parent, { transform: `translate(${x},${-D.torso + D.armW * 0.55})` });
      const sleeveC = far ? topS : top;
      const longS = (look.sleeve ?? O.sleeve) === "long";
      rr(j, -D.armW / 2, -D.armW * 0.5, D.armW, D.upper + D.armW * 0.5 + 4, D.armW / 2, sleeveC);
      const el = g(j, { transform: `translate(0,${D.upper})` });
      rr(el, -D.armW * 0.44, -6, D.armW * 0.88, D.fore + 6, D.armW * 0.44, longS ? sleeveC : far ? skinS : skin);
      if (look.outfit === "sailor" || (!look.outfit && age !== "adult")) if (longS) rr(el, -D.armW * 0.47, D.fore - 12, D.armW * 0.94, 9, 3, collar);
      const hand = g(el, { transform: `translate(0,${D.fore + 4})` });
      circ(hand, 0, 0, D.hand, far ? skinS : skin);
      return { j, el, hand };
    }

    // drawing order: far arm (side) -> legs -> bottom wear -> torso -> near arm -> head
    let A1, A2, L1, L2;
    if (side) A1 = arm(torsoG, 2, true);
    const legsG = g(body);
    body.insertBefore(legsG, torsoG);
    if (side) { L1 = leg(legsG, 0, true); L2 = leg(legsG, 0, false); }
    else { L1 = leg(legsG, -(D.hip / 2 - D.legW * 0.62), false); L2 = leg(legsG, D.hip / 2 - D.legW * 0.62, false); }
    // bottom wear (attached to hips, does not lean with the torso)
    const bottomG = g(body);
    body.insertBefore(bottomG, torsoG);
    const hw = side ? D.depth : D.hip;
    if (O.bottom === "skirt") {
      const len = D.thigh * 0.78;
      P(bottomG, `M${-hw / 2 - 3},-12 L${hw / 2 + 3},-12 L${hw / 2 + 20},${len} L${-hw / 2 - 20},${len} Z`, bottomC);
      if (!sil) for (let i = 1; i < 6; i++) { const u = i / 6; H.el("line", { x1: -hw / 2 - 3 + (hw + 6) * u, y1: -6, x2: -hw / 2 - 20 + (hw + 40) * u, y2: len, stroke: bottomS, "stroke-width": 2.5 }, bottomG); }
    } else if (O.bottom === "shorts") {
      P(bottomG, `M${-hw / 2 - 2},-12 L${hw / 2 + 2},-12 L${hw / 2 + 8},${D.thigh * 0.5} L${-hw / 2 - 8},${D.thigh * 0.5} Z`, bottomC);
    } else if (O.bottom === "coat") {
      P(bottomG, `M${-hw / 2 - 4},-14 L${hw / 2 + 4},-14 L${hw / 2 + 14},${D.thigh + 12} L${-hw / 2 - 14},${D.thigh + 12} Z`, C("#ffffff"), sil ? {} : { stroke: "#e2e6ee", "stroke-width": 2 });
    } else if (O.bottom === "hakama") {
      P(bottomG, `M${-hw / 2 - 4},-14 L${hw / 2 + 4},-14 L${hw / 2 + 34},${D.leg - 6} L${-hw / 2 - 34},${D.leg - 6} Z`, bottomC);
      if (!sil) H.el("line", { x1: 0, y1: 10, x2: 0, y2: D.leg - 6, stroke: bottomS, "stroke-width": 3 }, bottomG);
    } else if (O.bottom === "pants") {
      rr(bottomG, -hw / 2 - 2, -14, hw + 4, 26, 8, bottomC);
    }
    // neck + torso
    rr(torsoG, -8, -D.torso - D.neck - 6, 16, D.neck + 14, 6, skinS);
    const tw = side ? D.depth : D.sw, bw = side ? D.depth - 4 : D.hip;
    P(torsoG, `M${-tw / 2 + 12},${-D.torso} Q${-tw / 2},${-D.torso} ${-tw / 2},${-D.torso + 16} L${-bw / 2},-4 Q${-bw / 2},4 ${-bw / 2 + 8},4 L${bw / 2 - 8},4 Q${bw / 2},4 ${bw / 2},-4 L${tw / 2},${-D.torso + 16} Q${tw / 2},${-D.torso} ${tw / 2 - 12},${-D.torso} Z`, top);
    const outfit = look.outfit ?? (age === "adult" ? "teacher_m" : "sailor");
    if (!sil) {
      if (outfit === "sailor" && !side) {
        P(torsoG, `M${-tw / 2 + 10},${-D.torso} L${-10},${-D.torso + 44} L0,${-D.torso + 30} L10,${-D.torso + 44} L${tw / 2 - 10},${-D.torso} Z`, collar);
        P(torsoG, `M${-tw / 2 + 16},${-D.torso + 4} L-10,${-D.torso + 38}`, "none", { stroke: "#f4f6fb", "stroke-width": 2.5 });
        P(torsoG, `M${tw / 2 - 16},${-D.torso + 4} L10,${-D.torso + 38}`, "none", { stroke: "#f4f6fb", "stroke-width": 2.5 });
        P(torsoG, `M-12,${-D.torso + 40} L12,${-D.torso + 40} L4,${-D.torso + 52} L-4,${-D.torso + 52} Z`, accent);
        P(torsoG, `M-4,${-D.torso + 50} L-14,${-D.torso + 76} L-4,${-D.torso + 72} Z M4,${-D.torso + 50} L14,${-D.torso + 76} L4,${-D.torso + 72} Z`, accent);
      } else if (outfit === "sailor" && side) {
        P(torsoG, `M${-tw / 2},${-D.torso + 2} L${-tw / 2 - 6},${-D.torso + 40} L${-tw / 2 + 16},${-D.torso + 36} L${tw / 2 - 6},${-D.torso + 4} Z`, collar);
        P(torsoG, `M${tw / 2 - 8},${-D.torso + 20} L${tw / 2 + 6},${-D.torso + 52} L${tw / 2 - 6},${-D.torso + 48} Z`, accent);
      } else if (outfit === "gakuran") {
        rr(torsoG, -14, -D.torso - 6, 28, 14, 4, top);
        if (!side) for (let i = 0; i < 5; i++) circ(torsoG, 0, -D.torso + 18 + i * 18, 3.5, accent);
        else for (let i = 0; i < 5; i++) circ(torsoG, tw / 2 - 5, -D.torso + 18 + i * 18, 3, accent);
      } else if (outfit === "blazer" || outfit === "blazer_skirt" || outfit === "suit" || outfit === "teacher_m") {
        const shirt = outfit === "teacher_m" ? top : collar;
        if (!side) {
          P(torsoG, `M-18,${-D.torso} L0,${-D.torso + 52} L18,${-D.torso} Z`, shirt);
          P(torsoG, `M-5,${-D.torso + 6} L5,${-D.torso + 6} L7,${-D.torso + 48} L0,${-D.torso + 58} L-7,${-D.torso + 48} Z`, accent);
          if (outfit !== "teacher_m") { circ(torsoG, -6, -D.torso + 70, 3.5, "#d9b45a"); circ(torsoG, -6, -D.torso + 88, 3.5, "#d9b45a"); }
        } else P(torsoG, `M${tw / 2 - 12},${-D.torso} L${tw / 2},${-D.torso + 30} L${tw / 2},${-D.torso} Z`, shirt);
      } else if (outfit === "teacher_f") {
        if (!side) { P(torsoG, `M-16,${-D.torso} L0,${-D.torso + 40} L16,${-D.torso} Z`, collar); for (let i = 0; i < 4; i++) circ(torsoG, 0, -D.torso + 50 + i * 15, 3, H.shade(top, -0.3)); }
      } else if (outfit === "pe") {
        if (!side) { rr(torsoG, -24, -D.torso + 26, 30, 18, 3, "#ffffff", { stroke: accent, "stroke-width": 2 }); P(torsoG, `M-12,${-D.torso} Q0,${-D.torso + 12} 12,${-D.torso}`, "none", { stroke: accent, "stroke-width": 4 }); }
      } else if (outfit === "kyushoku") {
        if (!side) { H.el("line", { x1: 0, y1: -D.torso + 10, x2: 0, y2: 0, stroke: "#dfe3ea", "stroke-width": 2 }, torsoG); for (let i = 0; i < 3; i++) circ(torsoG, 5, -D.torso + 24 + i * 24, 2.6, "#cfd5df"); }
      } else if (outfit === "kendo") {
        if (!side) P(torsoG, `M-22,${-D.torso} L0,${-D.torso + 46} L22,${-D.torso} L14,${-D.torso} L0,${-D.torso + 30} L-14,${-D.torso} Z`, collar);
      } else if (outfit === "baseball") {
        if (!side) { H.el("line", { x1: 0, y1: -D.torso + 4, x2: 0, y2: 0, stroke: accent, "stroke-width": 2.5 }, torsoG); H.el("text", { x: 22, y: -D.torso + 54, "font-size": 22, "font-weight": 900, "font-family": "Montserrat", fill: accent, "text-anchor": "middle" }, torsoG).textContent = look.number ?? "7"; }
      }
      if ((look.tie || O.tie) && !side && outfit !== "teacher_m" && outfit !== "suit") P(torsoG, `M-5,${-D.torso + 6} L5,${-D.torso + 6} L7,${-D.torso + 48} L0,${-D.torso + 58} L-7,${-D.torso + 48} Z`, accent);
      if ((look.tie || O.tie) && !side && (outfit === "teacher_m" || outfit === "suit")) { /* tie drawn above */ }
    }
    // bags
    const bag = look.bag;
    const bagC = C(look.bag_color ?? (bag === "randoseru" ? "#c4283a" : "#2b2f3a"));
    let bagBack = null;
    if (bag === "randoseru") {
      if (side) { bagBack = rr(torsoG, -tw / 2 - 34, -D.torso + 4, 40, D.torso * 0.8, 10, bagC); rr(torsoG, -tw / 2 - 34, -D.torso + 4, 40, 18, 8, H.shade(bagC, -0.2)); }
      else {
        const bb = rr(torsoG, -tw / 2 - 6, -D.torso - 8, tw + 12, 22, 9, bagC); torsoG.insertBefore(bb, torsoG.firstChild);
        rr(torsoG, -tw / 2 + 8, -D.torso + 2, 9, D.torso * 0.72, 4, H.shade(bagC, -0.15)); rr(torsoG, tw / 2 - 17, -D.torso + 2, 9, D.torso * 0.72, 4, H.shade(bagC, -0.15));
      }
    } else if (bag === "school_bag") {
      if (!side) { H.el("line", { x1: -tw / 2 + 8, y1: -D.torso + 2, x2: tw / 2 + 4, y2: -8, stroke: H.shade(bagC, -0.1), "stroke-width": 6 }, torsoG); rr(torsoG, tw / 2 - 2, -24, 38, 30, 6, bagC); }
      else rr(torsoG, -tw / 2 - 18, -40, 34, 30, 6, bagC);
    }
    if (side) A2 = arm(torsoG, 0, false);
    else { A1 = arm(torsoG, -(D.sw / 2 - D.armW * 0.42), false); A2 = arm(torsoG, D.sw / 2 - D.armW * 0.42, false); }

    // ---------------------------------------------------------------- head
    const neckTop = -D.torso - D.neck;
    const headG = g(torsoG, { transform: `translate(0,${neckTop})` });
    const hc = -R * 0.92;                   // head center relative to neck top
    const headBack = g(torsoG);
    torsoG.insertBefore(headBack, torsoG.firstChild);       // long hair, tails and buns hang behind the body
    const hairBack = g(headBack), face = g(headG), hairFront = g(headG), acc = g(headG);
    const fx = side ? R * 0.12 : 0;         // face center shift in side view
    const hb = (d) => P(hairBack, d, hairC);
    const hf = (d) => P(hairFront, d, hairC);
    if (!side) {
      if (hairStyle === "long") hb(`M${-R * 1.06},${hc - R * 0.2} Q${-R * 1.1},${hc + R * 2.0} ${-R * 0.7},${hc + R * 2.25} L${R * 0.7},${hc + R * 2.25} Q${R * 1.1},${hc + R * 2.0} ${R * 1.06},${hc - R * 0.2} Z`);
      if (hairStyle === "bob") hb(`M${-R * 1.12},${hc - R * 0.3} Q${-R * 1.2},${hc + R * 0.8} ${-R * 0.95},${hc + R * 0.95} L${R * 0.95},${hc + R * 0.95} Q${R * 1.2},${hc + R * 0.8} ${R * 1.12},${hc - R * 0.3} Z`);
      if (hairStyle === "twintails") { ell(hairBack, -R * 1.18, hc + R * 0.85, R * 0.32, R * 0.85, hairC); ell(hairBack, R * 1.18, hc + R * 0.85, R * 0.32, R * 0.85, hairC); circ(hairBack, -R * 1.0, hc - R * 0.05, 7, accent); circ(hairBack, R * 1.0, hc - R * 0.05, 7, accent); }
      if (hairStyle === "ponytail") ell(hairBack, R * 1.08, hc + R * 0.5, R * 0.26, R * 0.75, hairC, { transform: `rotate(-12 ${R * 1.08} ${hc + R * 0.5})` });
      if (hairStyle === "bun") circ(hairBack, 0, hc - R * 1.02, R * 0.38, hairC);
      circ(hairBack, 0, hc - R * 0.08, R * 1.04, hairC);
      ell(face, -R * 0.95, hc + R * 0.12, R * 0.17, R * 0.21, skinS);
      ell(face, R * 0.95, hc + R * 0.12, R * 0.17, R * 0.21, skinS);
      ell(face, 0, hc, R * 0.93, R, skin);
    } else {
      if (hairStyle === "long") hb(`M${-R * 1.0},${hc - R * 0.3} Q${-R * 1.15},${hc + R * 1.7} ${-R * 0.9},${hc + R * 2.2} L${-R * 0.1},${hc + R * 2.1} Q${-R * 0.2},${hc + R} ${R * 0.2},${hc + R * 0.4} Z`);
      if (hairStyle === "bob") hb(`M${-R * 1.08},${hc - R * 0.2} Q${-R * 1.15},${hc + R * 0.85} ${-R * 0.7},${hc + R * 0.95} L${R * 0.1},${hc + R * 0.8} L${R * 0.3},${hc} Z`);
      if (hairStyle === "ponytail" || hairStyle === "twintails") ell(hairBack, -R * 1.2, hc + R * 0.35, R * 0.28, R * 0.8, hairC, { transform: `rotate(20 ${-R * 1.2} ${hc + R * 0.35})` });
      if (hairStyle === "bun") circ(hairBack, -R * 0.7, hc - R * 0.8, R * 0.36, hairC);
      ell(face, fx, hc, R * 0.92, R, skin);
      P(face, `M${fx + R * 0.86},${hc + R * 0.02} q${R * 0.16},${R * 0.1} ${-R * 0.02},${R * 0.22}`, skin);
      P(hairFront, `M${-R * 1.02},${hc + R * 0.25} Q${-R * 1.12},${hc - R * 1.05} ${fx + R * 0.15},${hc - R * 1.05} Q${fx + R * 0.95},${hc - R * 0.95} ${fx + R * 0.92},${hc - R * 0.25} Q${R * 0.2},${hc - R * 0.5} ${-R * 0.1},${hc - R * 0.05} Q${-R * 0.35},${hc + R * 0.4} ${-R * 0.75},${hc + R * 0.55} Z`, hairC);
      ell(hairFront, -R * 0.12, hc + R * 0.12, R * 0.16, R * 0.2, skinS);
    }
    // bangs
    if (!side) {
      const top_ = hc - R * 1.08;
      const fringe = {
        short: `M${-R * 1.0},${hc + R * 0.05} Q${-R * 1.05},${top_} 0,${top_} Q${R * 1.05},${top_} ${R * 1.0},${hc + R * 0.05} L${R * 0.82},${hc - R * 0.32} L${R * 0.45},${hc - R * 0.42} L${R * 0.15},${hc - R * 0.3} L${-R * 0.2},${hc - R * 0.46} L${-R * 0.55},${hc - R * 0.33} L${-R * 0.85},${hc - R * 0.38} Z`,
        spiky: `M${-R * 1.02},${hc + R * 0.05} L${-R * 1.15},${top_ + R * 0.3} L${-R * 0.75},${top_ + R * 0.1} L${-R * 0.6},${top_ - R * 0.25} L${-R * 0.25},${top_ + R * 0.02} L0,${top_ - R * 0.32} L${R * 0.25},${top_ + R * 0.02} L${R * 0.6},${top_ - R * 0.25} L${R * 0.75},${top_ + R * 0.1} L${R * 1.15},${top_ + R * 0.3} L${R * 1.02},${hc + R * 0.05} L${R * 0.75},${hc - R * 0.38} L${R * 0.35},${hc - R * 0.3} L0,${hc - R * 0.5} L${-R * 0.35},${hc - R * 0.3} L${-R * 0.75},${hc - R * 0.38} Z`,
        buzz: `M${-R * 0.96},${hc - R * 0.1} Q${-R * 0.98},${top_ + R * 0.05} 0,${top_ + R * 0.05} Q${R * 0.98},${top_ + R * 0.05} ${R * 0.96},${hc - R * 0.1} Q${R * 0.5},${hc - R * 0.62} 0,${hc - R * 0.62} Q${-R * 0.5},${hc - R * 0.62} ${-R * 0.96},${hc - R * 0.1} Z`,
        side: `M${-R * 1.02},${hc + R * 0.1} Q${-R * 1.08},${top_} ${-R * 0.1},${top_} Q${R * 1.08},${top_} ${R * 1.02},${hc + R * 0.1} L${R * 0.9},${hc - R * 0.3} Q${R * 0.2},${hc - R * 0.28} ${-R * 0.45},${hc - R * 0.62} Q${-R * 0.7},${hc - R * 0.2} ${-R * 0.9},${hc - R * 0.05} Z`,
        bob: `M${-R * 1.08},${hc + R * 0.45} Q${-R * 1.12},${top_} 0,${top_} Q${R * 1.12},${top_} ${R * 1.08},${hc + R * 0.45} L${R * 0.86},${hc + R * 0.4} L${R * 0.82},${hc - R * 0.28} Q${R * 0.4},${hc - R * 0.36} 0,${hc - R * 0.3} Q${-R * 0.4},${hc - R * 0.36} ${-R * 0.82},${hc - R * 0.28} L${-R * 0.86},${hc + R * 0.4} Z`,
        long: `M${-R * 1.06},${hc + R * 0.6} Q${-R * 1.12},${top_} 0,${top_} Q${R * 1.12},${top_} ${R * 1.06},${hc + R * 0.6} L${R * 0.84},${hc + R * 0.5} L${R * 0.8},${hc - R * 0.25} Q${R * 0.3},${hc - R * 0.42} ${-R * 0.1},${hc - R * 0.3} Q${-R * 0.5},${hc - R * 0.42} ${-R * 0.8},${hc - R * 0.25} L${-R * 0.84},${hc + R * 0.5} Z`,
      };
      fringe.ponytail = fringe.side; fringe.twintails = fringe.bob; fringe.bun = `M${-R * 0.98},${hc + R * 0.05} Q${-R * 1.02},${top_} 0,${top_} Q${R * 1.02},${top_} ${R * 0.98},${hc + R * 0.05} Q${R * 0.7},${hc - R * 0.55} 0,${hc - R * 0.6} Q${-R * 0.7},${hc - R * 0.55} ${-R * 0.98},${hc + R * 0.05} Z`;
      hf(fringe[hairStyle] ?? fringe.short);
      if (!sil) P(hairFront, `M${-R * 0.5},${top_ + R * 0.22} Q0,${top_ + R * 0.08} ${R * 0.5},${top_ + R * 0.22}`, "none", { stroke: "rgba(255,255,255,0.18)", "stroke-width": 5, "stroke-linecap": "round" });
    } else {
      hf(`M${fx + R * 0.15},${hc - R * 1.06} Q${fx + R * 1.0},${hc - R * 1.0} ${fx + R * 0.98},${hc - R * 0.25} L${fx + R * 0.7},${hc - R * 0.42} L${fx + R * 0.45},${hc - R * 0.3} L${fx + R * 0.3},${hc - R * 0.55} Z`);
    }
    // face features
    const eyes = g(face), mouthG = g(face), brows = g(face);
    const ex = side ? [fx + R * 0.5] : [-R * 0.36, R * 0.36], ey = hc + R * 0.14;
    const eyeEls = ex.map((x) => {
      const eg = g(eyes, { transform: `translate(${x},${ey})` });
      const open = g(eg);
      ell(open, 0, 0, R * 0.105, R * 0.155, sil ?? "#2a1f2e");
      if (!sil) circ(open, -R * 0.035, -R * 0.06, R * 0.04, "#ffffff");
      const closed = P(eg, `M${-R * 0.12},0 Q0,${R * 0.08} ${R * 0.12},0`, "none", { stroke: sil ?? "#2a1f2e", "stroke-width": 4, "stroke-linecap": "round" });
      const happy = P(eg, `M${-R * 0.12},${R * 0.04} Q0,${-R * 0.12} ${R * 0.12},${R * 0.04}`, "none", { stroke: sil ?? "#2a1f2e", "stroke-width": 4.5, "stroke-linecap": "round" });
      return { eg, open, closed, happy };
    });
    const browEls = ex.map((x, i) => P(brows, `M${x - R * 0.13},${ey - R * 0.3} Q${x},${ey - R * 0.37} ${x + R * 0.13},${ey - R * 0.3}`, "none",
      { stroke: H.shade(hairC, -0.1), "stroke-width": 3.5, "stroke-linecap": "round", "data-i": i }));
    if (!sil && look.blush !== false) for (const x of ex) ell(face, x + (side ? R * 0.05 : x < 0 ? -R * 0.12 : R * 0.12), ey + R * 0.3, R * 0.13, R * 0.07, "rgba(255,120,130,0.35)");
    const mx = side ? fx + R * 0.55 : 0, my = hc + R * 0.55;
    const mouth = P(mouthG, "", "none", { stroke: sil ?? "#7a2f35", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" });
    if (look.glasses && !sil) for (const x of ex) circ(acc, x, ey, R * 0.24, "none", { stroke: "#2d2d38", "stroke-width": 3.5 });
    if ((look.mask ?? O.mask) && !sil) {
      rr(acc, side ? fx + R * 0.05 : -R * 0.62, hc + R * 0.3, side ? R * 0.9 : R * 1.24, R * 0.5, R * 0.22, "#ffffff", { stroke: "#dde2ea", "stroke-width": 2 });
      mouthG.style.display = "none";
    }
    // hats
    if (hat === "kid") {
      P(acc, `M${-R * 1.05},${hc - R * 0.3} Q${-R * 1.05},${hc - R * 1.3} 0,${hc - R * 1.3} Q${R * 1.05},${hc - R * 1.3} ${R * 1.05},${hc - R * 0.3} Z`, C("#ffd23f"));
      ell(acc, side ? R * 0.25 : 0, hc - R * 0.3, R * 1.25, R * 0.16, C("#f5c21f"));
    } else if (hat === "cap") {
      P(acc, `M${-R * 1.0},${hc - R * 0.35} Q${-R * 1.0},${hc - R * 1.25} 0,${hc - R * 1.25} Q${R * 1.0},${hc - R * 1.25} ${R * 1.0},${hc - R * 0.35} Z`, C(look.cap_color ?? "#2a3f8f"));
      if (side) ell(acc, R * 1.0, hc - R * 0.38, R * 0.55, R * 0.12, C(look.cap_color ?? "#2a3f8f"));
      else ell(acc, 0, hc - R * 0.36, R * 0.7, R * 0.16, H.shade(C(look.cap_color ?? "#2a3f8f"), -0.2));
    } else if (hat === "kyushoku") {
      P(acc, `M${-R * 1.0},${hc - R * 0.35} Q${-R * 1.0},${hc - R * 1.2} 0,${hc - R * 1.22} Q${R * 1.0},${hc - R * 1.2} ${R * 1.0},${hc - R * 0.35} Z`, C("#ffffff"), sil ? {} : { stroke: "#dde2ea", "stroke-width": 2 });
    }
    // held props (in the near / screen-right hand, or held in front)
    function prop(kind, hand, rot) {
      const pg = g(hand, { transform: `rotate(${rot ?? 0})` });
      switch (kind) {
        case "broom": rr(pg, -3, -20, 6, 190, 3, C("#b88a57")); P(pg, "M-22,170 L22,170 L30,210 L-30,210 Z", C("#d8b46a")); break;
        case "mop": rr(pg, -3, -20, 6, 190, 3, C("#9aa3b5")); rr(pg, -30, 168, 60, 14, 5, C("#3d7bd9")); for (let i = 0; i < 7; i++) rr(pg, -28 + i * 9, 180, 5, 26, 2, C("#e9eef8")); break;
        case "rag": rr(pg, -20, -4, 40, 16, 4, C("#ffffff"), sil ? {} : { stroke: "#cfd6e2", "stroke-width": 2 }); break;
        case "bat": P(pg, "M-4,-12 L4,-12 L8,150 Q0,160 -8,150 Z", C("#c9a06a")); break;
        case "shinai": rr(pg, -3, -16, 6, 186, 3, C("#d8c08a")); rr(pg, -6, -14, 12, 26, 4, C("#f1efe8")); break;
        case "book": rr(pg, -16, -22, 32, 40, 3, C("#e85d5d")); break;
        case "phone": rr(pg, -9, -18, 18, 32, 4, C("#1d2230")); break;
        case "flag": rr(pg, -2, -120, 4, 130, 2, C("#c9a06a")); rr(pg, 2, -120, 60, 40, 3, C(look.flag_color ?? "#ffffff")); circ(pg, 32, -100, 11, C("#e0414f")); break;
        case "ladle": rr(pg, -3, -10, 6, 70, 3, C("#c7ccd6")); ell(pg, 0, 64, 14, 9, C("#c7ccd6")); break;
        default: break;
      }
      return pg;
    }
    let frontProp = null;
    for (const [k, hand] of [["hold", side ? A2.hand : A2.hand], ["hold_l", A1 ? A1.hand : null]]) {
      const kind = p[k];
      if (!kind || !hand) continue;
      if (["tray", "bowl", "pot"].includes(kind)) {
        frontProp = g(torsoG);
        if (kind === "tray") { rr(frontProp, -58, -D.torso * 0.32, 116, 16, 5, C("#e9c891")); ell(frontProp, -24, -D.torso * 0.32 - 6, 18, 10, C("#ffffff")); ell(frontProp, 22, -D.torso * 0.32 - 6, 16, 9, C("#d9783f")); rr(frontProp, 36, -D.torso * 0.32 - 26, 14, 22, 2, C("#ffffff")); }
        if (kind === "bowl") P(frontProp, `M-30,${-D.torso * 0.4} Q0,${-D.torso * 0.4 + 40} 30,${-D.torso * 0.4} Z`, C("#ffffff"));
        if (kind === "pot") { rr(frontProp, -46, -D.torso * 0.55, 92, 62, 10, C("#c7ccd6")); rr(frontProp, -52, -D.torso * 0.55, 104, 10, 5, C("#aeb5c2")); }
      } else prop(kind, hand, p[k === "hold" ? "hold_rot" : "hold_l_rot"]);
    }
    if (frontProp) torsoG.appendChild(A1.j), torsoG.appendChild(A2.j);   // hands in front of a held tray

    // ---------------------------------------------------------------- per-frame pose
    const poseKeys = (spec) => (H.isTrack(spec) ? (Array.isArray(spec) ? spec : [spec]).map((k) => ({ ...k, v: poseObj(k.v ?? k.to, side) })) : poseObj(spec, side));
    const poseTrack = poseKeys(item.spec.pose ?? "stand");
    const faceAt = (t) => item.v("face", "smile", t);
    const talk = p.talk || [];
    const blinkPhase = H.hash(seed + 5) * 4;
    let walkPhase = 0, lastT = null;
    return {
      el: svg, w: W, h: Hh, origin: [W / 2, Hh],
      update(t, it) {
        const pz = H.isTrack(poseTrack) ? H.track(poseTrack, t, poseObj("stand", side)) : poseTrack;
        const q = { ...pz, a1: [...pz.a1], a2: [...pz.a2], l1: [...pz.l1], l2: [...pz.l2] };
        // walk / run cycle
        const wv = it.v("walk", 0);
        const ws = typeof wv === "number" ? wv : wv ? 1.8 : 0;
        const run = it.v("run", false);
        if (lastT == null) walkPhase = t * ws * Math.PI;
        else walkPhase += (t - lastT) * ws * Math.PI;
        lastT = t;
        let bob = 0;
        if (ws > 0) {
          const bent = (q.lean ?? 0) > 40, ph = walkPhase, A = bent ? 26 : run ? 42 : 24, K = bent ? 36 : run ? 70 : 34;
          if (side) {
            q.l1 = [A * Math.sin(ph), Math.max(0, K * Math.sin(ph + 1.6))];
            q.l2 = [-A * Math.sin(ph), Math.max(0, K * Math.sin(ph + 1.6 + Math.PI))];
            if (!bent && (!p.hold || ["rag"].includes(p.hold))) { q.a1 = [-(run ? 50 : 22) * Math.sin(ph), run ? 80 : 18]; q.a2 = [(run ? 50 : 22) * Math.sin(ph), run ? 80 : 18]; }
            q.lean += bent ? 0 : run ? 12 : 3;
          } else {
            q.l1 = [3, Math.max(0, 22 * Math.sin(ph))]; q.l2 = [3, Math.max(0, 22 * Math.sin(ph + Math.PI))];
            q.a1 = [q.a1[0] + 6 * Math.sin(ph), q.a1[1] + 8]; q.a2 = [q.a2[0] - 6 * Math.sin(ph), q.a2[1] + 8];
          }
          bob = Math.abs(Math.sin(ph)) * (run ? 10 : 5);
        }
        if (it.v("wave_hand", false) || (typeof item.spec.pose === "string" && item.spec.pose === "wave")) q.a2[1] += 25 * Math.sin(t * 9);
        const sit = q.sit ?? 0, bowK = q.bow ?? 0;
        // body placement
        const jump = q.jump ?? 0;
        root.setAttribute("transform", `translate(${W / 2},${hipY - jump + bob * -1 + (side ? sit * D.thigh * 0.9 : sit * D.thigh * 0.55)})`);
        // legs
        const sgn = side ? -1 : 1;
        if (side) {
          L1.j.setAttribute("transform", `translate(-4,-6) rotate(${-q.l1[0]})`); L1.knee.setAttribute("transform", `translate(0,${D.thigh}) rotate(${q.l1[1]})`);
          L2.j.setAttribute("transform", `translate(4,-6) rotate(${-q.l2[0]})`); L2.knee.setAttribute("transform", `translate(0,${D.thigh}) rotate(${q.l2[1]})`);
        } else {
          const lx = D.hip / 2 - D.legW * 0.62;
          const fs = 1 - sit * 0.75;
          L1.j.setAttribute("transform", `translate(${-lx},-6) rotate(${q.l1[0]}) scale(1,${fs})`); L1.knee.setAttribute("transform", `translate(0,${D.thigh}) rotate(${-q.l1[1] * 0.3})`);
          L2.j.setAttribute("transform", `translate(${lx},-6) rotate(${-q.l2[0]}) scale(1,${fs})`); L2.knee.setAttribute("transform", `translate(0,${D.thigh}) rotate(${q.l2[1] * 0.3})`);
        }
        // torso lean / bow
        if (side) torsoG.setAttribute("transform", `rotate(${q.lean ?? 0})`);
        else torsoG.setAttribute("transform", `rotate(${q.lean ?? 0}) scale(1,${1 - 0.3 * bowK})`);
        // arms
        if (side) {
          A1.j.setAttribute("transform", `translate(2,${-D.torso + D.armW * 0.55}) rotate(${-q.a1[0]})`); A1.el.setAttribute("transform", `translate(0,${D.upper}) rotate(${-q.a1[1]})`);
          A2.j.setAttribute("transform", `translate(-2,${-D.torso + D.armW * 0.55}) rotate(${-q.a2[0]})`); A2.el.setAttribute("transform", `translate(0,${D.upper}) rotate(${-q.a2[1]})`);
        } else {
          const ax = D.sw / 2 - D.armW * 0.42;
          A1.j.setAttribute("transform", `translate(${-ax},${-D.torso + D.armW * 0.55}) rotate(${q.a1[0]})`); A1.el.setAttribute("transform", `translate(0,${D.upper}) rotate(${-q.a1[1]})`);
          A2.j.setAttribute("transform", `translate(${ax},${-D.torso + D.armW * 0.55}) rotate(${-q.a2[0]})`); A2.el.setAttribute("transform", `translate(0,${D.upper}) rotate(${q.a2[1]})`);
        }
        // head (bow: head drops and shows the top; it is counter-scaled so it keeps its shape)
        const tilt = q.tilt ?? 0, nod = q.nod ?? 0;
        const headT = side ? `translate(0,${neckTop + nod}) rotate(${tilt + (q.lean ?? 0) * -0.62})`
          : `translate(0,${neckTop + nod + bowK * 26}) scale(1,${1 / (1 - 0.3 * bowK)}) rotate(${tilt}) translate(0,${bowK * 10})`;
        headG.setAttribute("transform", headT);
        headBack.setAttribute("transform", headT);
        face.setAttribute("transform", side ? "" : `translate(0,${bowK * R * 0.35})`);
        hairFront.setAttribute("transform", side ? "" : `translate(0,${bowK * R * 0.25}) scale(1,${1 + bowK * 0.25})`);
        // face
        const fc = faceAt(t);
        const blink = ((t + blinkPhase) % 3.7) < 0.12;
        const lookDx = it.v("look_dx", 0) * R * 0.08;
        for (const e of eyeEls) {
          const happy = fc === "happy" || fc === "laugh", closed = fc === "sleep" || (blink && !happy) || bowK > 0.5;
          e.open.style.display = !happy && !closed ? "" : "none";
          e.closed.style.display = closed && !happy ? "" : "none";
          e.happy.style.display = happy ? "" : "none";
          e.open.setAttribute("transform", `translate(${lookDx},0) scale(${fc === "surprised" ? 1.25 : 1})`);
        }
        browEls.forEach((b, i) => {
          const s0 = fc === "sad" ? (i === 0 ? -14 : 14) : fc === "determined" || fc === "angry" ? (i === 0 ? 16 : -16) : 0;
          const lift = fc === "surprised" ? -R * 0.08 : 0;
          b.setAttribute("transform", `translate(0,${lift}) rotate(${side ? -s0 : s0} ${ex[i]} ${ey - R * 0.32})`);
        });
        let talking = fc === "talk";
        for (const [a, b] of talk) if (t >= a && t <= b) talking = true;
        const open = talking ? Math.max(0, Math.sin(t * 17) * 0.5 + Math.sin(t * 9.3) * 0.5) : 0;
        const w2 = R * 0.2;
        let d;
        if (fc === "happy" || fc === "laugh") d = `M${mx - w2},${my - 4} Q${mx},${my + R * 0.32} ${mx + w2},${my - 4} Z`;
        else if (fc === "surprised") d = `M${mx},${my - R * 0.1} a${R * 0.09},${R * 0.12} 0 1 0 0.1,0 Z`;
        else if (fc === "sad") d = `M${mx - w2 * 0.8},${my + 6} Q${mx},${my - 6} ${mx + w2 * 0.8},${my + 6}`;
        else if (fc === "neutral" || fc === "determined" || fc === "sleep") d = `M${mx - w2 * 0.6},${my} L${mx + w2 * 0.6},${my}`;
        else if (talking) d = `M${mx - w2 * 0.7},${my - 2} Q${mx},${my + 4 + open * R * 0.3} ${mx + w2 * 0.7},${my - 2} Q${mx},${my + 2} ${mx - w2 * 0.7},${my - 2} Z`;
        else d = `M${mx - w2 * 0.8},${my - 3} Q${mx},${my + R * 0.16} ${mx + w2 * 0.8},${my - 3}`;
        mouth.setAttribute("d", side && fc !== "surprised" ? d.replace(/M[\d.-]+,/, `M${mx - w2 * 0.2},`) : d);
        mouth.setAttribute("fill", fc === "happy" || fc === "laugh" || fc === "surprised" || talking ? (sil ?? "#7a2f35") : "none");
        if (bagBack) bagBack.style.display = "";
        this._q = q;
      },
      anchor(name) {
        const dm = (q) => new DOMMatrix([q.a, q.b, q.c, q.d, q.e, q.f]);
        const m = (el, x = 0, y = 0) => {
          const pt = el.getCTM(), sv = svg.getCTM();
          if (!pt || !sv) return null;
          const r = dm(sv).inverse().multiply(dm(pt)).transformPoint(new DOMPoint(x, y));
          return [r.x, r.y];
        };
        if (name === "head" || name === "face") return m(headG, side ? R * 0.2 : 0, hc);
        if (name === "top") return m(headG, 0, hc - R * 1.2);
        if (name === "hand_l") return m(A1.hand);
        if (name === "hand_r" || name === "hand") return m(A2.hand);
        if (name === "hip") return [W / 2, hipY];
        return null;
      },
    };
  },
};

// silhouette: a simple filled person shape (head + shoulders), for crowds, windows and backgrounds
export const silhouette = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 120, h = p.h ?? 150, c = H.col(p.color ?? "#3a1f1c");
    const svg = H.svg(`<circle cx="${w / 2}" cy="${h * 0.3}" r="${w * 0.24}" fill="${c}"/>
      <path d="M${w * 0.06},${h} Q${w * 0.06},${h * 0.56} ${w / 2},${h * 0.56} Q${w * 0.94},${h * 0.56} ${w * 0.94},${h} Z" fill="${c}"/>`, w, h);
    return { el: svg, w, h };
  },
};
