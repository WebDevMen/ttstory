// «Люди выпадают из фотографий» — взрослые люди в спокойной плоской манере (не аниме-марионетки библиотеки).
// figure: человек спереди (или со спины), реальные пропорции (~7.5 голов), минимальное лицо, одежда по слоям.
//   h (px роста), skin, hair (short bun bob long cap bald ponytail), hair_color, top (jacket sweater dress suit coat tshirt shirt),
//   top_color, top2 (подкладка/рубашка), bottom_color, shoes, crown (бумажная корона), glasses, bag, view: front | back,
//   arms: [левая, правая] — down hip around (лежит горизонтально на плече соседа) camera (держит фотоаппарат у лица)
//         phone (у уха) hold (предплечье вперёд) wave point fold (руки на груди) — дорожка (строки),
//   face (дорожка): calm smile laugh worry sad talk; talk: [[от, до]] — рот двигается; look_dx (−1..1);
//   gone (дорожка 0..1): человек «выпадает» — полосы помехи, сдвиг строк, затем пусто. Тень на земле уходит вместе с ним.
//   lean (°), step (дорожка: фаза шага, 0 — стоит).
// Якоря: head, face, hand_l, hand_r, top, hip.

const SKIN = { light: "#f1d2bd", mid: "#dcb091", tan: "#c08b66", dark: "#8a5a3c" };
const R = Math.PI / 180;

// arm angles in degrees from "straight down", + = outward (away from the body); [upper, lower(relative)]
// optional [.., L1, L2]: segment lengths when the arm is foreshortened (elbow forward: phone at the ear, camera at the eye)
const ARMS = {
  down: [9, 4], hip: [32, -70], around: [100, -40], camera: [22, -173, 10.2, 20.6], phone: [20, -177, 12, 21.5], hold: [6, -78],
  wave: [150, 30], point: [80, 0], fold: [10, -100, 13.7, 15.5], bag: [6, 0], up: [168, 4], reach: [40, 10],
};

export const figure = {
  origin: "bottom",
  grounded: true,
  size_m: (p) => ({ h: (p.h_m ?? 1.74) }),
  create(p, H) {
    const U = (p.h ?? 520) / 100;                       // px per unit; figure is 100 units tall, 44 wide
    const W = 60 * U, Hh = 104 * U;
    const skin = H.col(SKIN[p.skin] ?? p.skin ?? SKIN.light);
    const hairC = H.col(p.hair_color ?? "#3a2a22");
    const topC = H.col(p.top_color ?? "#8b939c"), top2 = H.col(p.top2 ?? H.shade(p.top_color ?? "#8b939c", -0.25));
    const botC = H.col(p.bottom_color ?? "#2f3540"), shoeC = H.col(p.shoes ?? "#1d1f24");
    const top = p.top ?? "jacket", hair = p.hair ?? "short", back = p.view === "back";
    const sleeve = top === "tshirt" || top === "dress" && p.sleeveless ? skin : topC;
    const ns = "http://www.w3.org/2000/svg";
    const svg = H.svg("", W, Hh);
    svg.setAttribute("viewBox", `-30 -4 60 104`);
    svg.style.overflow = "visible";
    const g = (parent, attrs = {}) => H.el("g", attrs, parent);
    const root = g(svg);
    const P = (parent, d, fill, extra = {}) => H.el("path", { d, fill, ...extra }, parent);
    // ground contact shadow
    const shadow = H.el("ellipse", { cx: 0, cy: 99.4, rx: 13, ry: 1.8, fill: "rgba(0,0,0,.22)" }, root);
    const body = g(root);
    // legs
    const legs = g(body);
    const dress = top === "dress";
    const legTop = dress ? 66 : 47;
    const legL = P(legs, "", dress ? skin : botC), legR = P(legs, "", dress ? skin : botC);
    const shoeL = H.el("ellipse", { rx: 3.9, ry: 1.7, fill: shoeC }, legs), shoeR = H.el("ellipse", { rx: 3.9, ry: 1.7, fill: shoeC }, legs);
    // arms are drawn behind or in front of the torso depending on pose
    const armsBack = g(body), torso = g(body), armsFront = g(body);
    // torso shapes
    const shoulder = 15.5, waist = 47;
    if (dress) {
      P(torso, `M-10.5,${shoulder} Q-11.5,30 -8,${waist - 6} L-14,70 Q0,73 14,70 L8,${waist - 6} Q11.5,30 10.5,${shoulder} Q0,${shoulder - 2.6} -10.5,${shoulder}Z`, topC);
      P(torso, `M-8,${waist - 6} Q0,${waist - 4} 8,${waist - 6} L8.5,${waist - 4} Q0,${waist - 2} -8.5,${waist - 4}Z`, top2, { opacity: 0.8 });
    } else {
      const hem = top === "coat" ? 64 : waist + 2;
      const wHem = top === "coat" ? 11.5 : 9;
      P(torso, `M-10.8,${shoulder} Q-12,30 -${wHem},${hem} L${wHem},${hem} Q12,30 10.8,${shoulder} Q0,${shoulder - 2.6} -10.8,${shoulder}Z`, topC);
      if (top === "jacket" || top === "coat") {
        // open jacket: inner shirt strip + zip edges + collar
        P(torso, `M-2.6,${shoulder - 0.6} L2.6,${shoulder - 0.6} L2.2,${hem} L-2.2,${hem}Z`, top2);
        H.el("path", { d: `M-2.6,${shoulder} L-2.2,${hem} M2.6,${shoulder} L2.2,${hem}`, stroke: H.shade(topC, -0.35), "stroke-width": 0.5, fill: "none" }, torso);
        P(torso, `M-6,${shoulder - 1.6} L-2.6,${shoulder + 5} L-1.8,${shoulder - 0.4}Z M6,${shoulder - 1.6} L2.6,${shoulder + 5} L1.8,${shoulder - 0.4}Z`, H.shade(topC, -0.15));
        H.el("rect", { x: -8.5, y: 32, width: 4.4, height: 0.6, fill: H.shade(topC, -0.3) }, torso);
        H.el("rect", { x: 4.1, y: 32, width: 4.4, height: 0.6, fill: H.shade(topC, -0.3) }, torso);
      } else if (top === "suit") {
        P(torso, `M-3.6,${shoulder - 0.6} L3.6,${shoulder - 0.6} L0,${shoulder + 16}Z`, "#f4f4f2");
        P(torso, `M-0.8,${shoulder + 1} L0.8,${shoulder + 1} L1.2,${shoulder + 13} L0,${shoulder + 15} L-1.2,${shoulder + 13}Z`, H.col(p.tie ?? "#3b4b6b"));
        P(torso, `M-6,${shoulder - 1.4} L-3.6,${shoulder - 0.6} L0,${shoulder + 16} L-3,${shoulder + 9}Z M6,${shoulder - 1.4} L3.6,${shoulder - 0.6} L0,${shoulder + 16} L3,${shoulder + 9}Z`, H.shade(topC, -0.18));
      } else if (top === "sweater") {
        P(torso, `M-4.2,${shoulder - 1} Q0,${shoulder + 3.4} 4.2,${shoulder - 1}`, "none", { stroke: H.shade(topC, -0.22), "stroke-width": 1.2 });
        H.el("rect", { x: -9.4, y: waist - 1.4, width: 18.8, height: 3.2, rx: 1, fill: H.shade(topC, -0.12) }, torso);
      } else if (top === "shirt") {
        P(torso, `M-3.6,${shoulder - 1} L0,${shoulder + 3} L3.6,${shoulder - 1}`, "none", { stroke: H.shade(topC, -0.25), "stroke-width": 0.8 });
        for (let i = 0; i < 4; i++) H.el("circle", { cx: 0, cy: shoulder + 6 + i * 7, r: 0.5, fill: H.shade(topC, -0.3) }, torso);
      }
      // soft side shading
      P(torso, `M10.8,${shoulder} Q12,30 ${wHem},${hem} L${wHem - 3},${hem} Q9,30 8,${shoulder}Z`, "rgba(0,0,0,.10)");
    }
    if (p.bag) H.el("path", { d: `M-9,${shoulder} L9,${shoulder + 28}`, stroke: H.col(p.bag === true ? "#5b4636" : p.bag), "stroke-width": 1.2, fill: "none" }, torso);
    // neck + head
    const headG = g(body);
    H.el("rect", { x: -2.2, y: 9.5, width: 4.4, height: 6.5, rx: 1.5, fill: H.shade(skin, -0.08) }, headG);
    const hairBack = g(headG);
    const head = H.el("ellipse", { cx: 0, cy: 6.4, rx: 4.6, ry: 5.7, fill: skin }, headG);
    const face = g(headG);
    const hairFront = g(headG);
    // hair
    const hb = (d) => P(back ? hairFront : hairBack, d, hairC), hf = (d) => P(hairFront, d, hairC);
    if (back) {
      hb(`M-4.9,6 Q-5.4,-0.6 0,-0.6 Q5.4,-0.6 4.9,6 Q4.6,${hair === "long" ? 16 : 10} 0,${hair === "long" ? 17 : 10.6} Q-4.6,${hair === "long" ? 16 : 10} -4.9,6Z`);
    } else if (hair === "short" || hair === "cap") {
      hf(`M-4.8,5.4 Q-5.4,-0.8 0,-0.9 Q5.3,-0.8 4.8,5.0 Q3.6,2.2 0.6,2.3 Q-2.8,2.0 -4.8,5.4Z`);
    } else if (hair === "bun") {
      hb(`M-2.6,-1.6 a3.2,2.8 0 1,1 5.2,0.6 a3,2.6 0 0,1 -5.2,-0.6Z`);
      hf(`M-4.9,6.4 Q-5.6,-0.6 0,-0.7 Q5.6,-0.6 4.9,6.4 Q4.2,2.0 0,1.7 Q-4.2,2.0 -4.9,6.4Z`);
    } else if (hair === "bob") {
      hb(`M-5.6,5 Q-6,-1.2 0,-1 Q6,-1.2 5.6,5 L5.8,11.6 Q4.4,12.4 3.6,10.6 L-3.6,10.6 Q-4.4,12.4 -5.8,11.6Z`);
      hf(`M-5,6 Q-5.4,-0.5 0,-0.6 Q5.4,-0.5 5,6 Q3.4,1.6 -1.2,3.4 Q-3.6,3.0 -5,6Z`);
    } else if (hair === "long" || hair === "ponytail") {
      hb(`M-5.4,5 Q-6,-1 0,-1 Q6,-1 5.4,5 L6.2,${hair === "long" ? 19 : 9} Q0,${hair === "long" ? 21 : 10} -6.2,${hair === "long" ? 19 : 9}Z`);
      hf(`M-4.9,6.2 Q-5.4,-0.6 0,-0.7 Q5.4,-0.6 4.9,6.2 Q4.4,1.8 -0.4,2.4 Q-3.6,2.2 -4.9,6.2Z`);
    } else if (hair === "bald") {
      hf(`M-4.7,6.2 Q-4.9,4.6 -4.4,4.4 L-4.2,6.6Z M4.7,6.2 Q4.9,4.6 4.4,4.4 L4.2,6.6Z`);
    }
    if (hair === "cap") {
      P(hairFront, `M-5.2,3.4 Q-5.4,-1.8 0,-1.8 Q5.4,-1.8 5.2,3.4Z`, H.col(p.cap_color ?? "#2a2f36"));
      P(hairFront, `M-5.6,3.4 L5.6,3.4 Q6.8,4.4 8.6,4.6 L-5.6,4.4Z`, H.shade(p.cap_color ?? "#2a2f36", -0.2));
    }
    if (p.crown) {
      P(hairFront, "M-4.4,0.4 L-4.6,-3.6 L-2.4,-1.6 L0,-4.4 L2.4,-1.6 L4.6,-3.6 L4.4,0.4Z", H.col(p.crown === true ? "#ffc93c" : p.crown), { stroke: "#d49a1c", "stroke-width": 0.3 });
    }
    // face (front only)
    const eyeL = H.el("ellipse", { cx: -1.8, cy: 6.4, rx: 0.48, ry: 0.62, fill: "#2a2421" }, face);
    const eyeR = H.el("ellipse", { cx: 1.8, cy: 6.4, rx: 0.48, ry: 0.62, fill: "#2a2421" }, face);
    const browL = H.el("path", { d: "M-2.8,4.9 Q-1.8,4.4 -0.9,4.8", stroke: H.shade(hairC, 0.05), "stroke-width": 0.42, fill: "none", "stroke-linecap": "round" }, face);
    const browR = H.el("path", { d: "M0.9,4.8 Q1.8,4.4 2.8,4.9", stroke: H.shade(hairC, 0.05), "stroke-width": 0.42, fill: "none", "stroke-linecap": "round" }, face);
    H.el("path", { d: "M0.1,6.9 L-0.4,8.6 L0.5,8.7", stroke: H.shade(skin, -0.22), "stroke-width": 0.32, fill: "none", "stroke-linecap": "round" }, face);
    const mouth = H.el("path", { stroke: "#8c4b45", "stroke-width": 0.45, fill: "none", "stroke-linecap": "round" }, face);
    if (p.glasses) {
      H.el("path", { d: "M-3.4,6.4 a1.5,1.3 0 1,0 3,0 a1.5,1.3 0 1,0 -3,0 M0.4,6.4 a1.5,1.3 0 1,0 3,0 a1.5,1.3 0 1,0 -3,0 M-0.4,6.3 L0.4,6.3", stroke: "#2b2b2b", "stroke-width": 0.32, fill: "none" }, face);
    }
    if (back) face.style.display = "none";
    // arms: upper + forearm as thick round lines, hand circle
    const mkArm = (parent) => {
      const a = g(parent);
      const up = H.el("path", { stroke: sleeve, "stroke-width": 4.4, "stroke-linecap": "round", fill: "none" }, a);
      const lo = H.el("path", { stroke: sleeve, "stroke-width": 3.8, "stroke-linecap": "round", fill: "none" }, a);
      const cuff = H.el("path", { stroke: H.shade(sleeve, -0.2), "stroke-width": 3.9, "stroke-linecap": "butt", fill: "none" }, a);
      const hand = H.el("ellipse", { rx: 1.7, ry: 2.0, fill: skin }, a);
      return { a, up, lo, cuff, hand };
    };
    const arms = [mkArm(armsBack), mkArm(armsBack)];
    const hands = [[0, 0], [0, 0]];
    // optional prop in hands: camera (pose camera), phone
    const propsG = g(body);
    const cam = g(propsG);
    if (p.prop === "camera" || p.camera) {
      H.el("rect", { x: -5.2, y: -2.6, width: 10.4, height: 6.2, rx: 1, fill: "#1e2024" }, cam);
      H.el("circle", { cx: 0, cy: 0.6, r: 2.4, fill: "#3a3f47", stroke: "#0d0e10", "stroke-width": 0.6 }, cam);
      H.el("rect", { x: 2.4, y: -3.6, width: 2.4, height: 1.2, fill: "#2b2e33" }, cam);
    }
    const phoneEl = g(propsG);
    H.el("rect", { x: -1.2, y: -2.4, width: 2.4, height: 4.8, rx: 0.5, fill: "#15171a" }, phoneEl);
    // glitch copies for "gone": the body is cloned into 4 horizontal strips that slide apart
    const strips = [];
    const nS = 6;
    for (let i = 0; i < nS; i++) {
      const s = H.el("use", {}, svg);
      s.setAttribute("href", "#__none");
      strips.push(s);
    }
    const uid = H.uid("fg");
    body.setAttribute("id", uid);
    strips.forEach((s, i) => {
      s.setAttribute("href", `#${uid}`);
      const cp = H.el("clipPath", { id: `${uid}c${i}` }, svg);
      H.el("rect", { x: -40, y: -6 + (i * 108) / nS, width: 80, height: 108 / nS + 0.4 }, cp);
      s.setAttribute("clip-path", `url(#${uid}c${i})`);
      s.style.display = "none";
    });
    const armGeo = (side, pose) => {
      const [ua, la, L1 = 15.5, L2 = 14] = ARMS[pose] ?? ARMS.down;
      const sx = side < 0 ? -10.2 : 10.2, sy = shoulder + 2;
      const s = side; // -1 left (screen left), +1 right
      const a1 = ua * R, a2 = (ua + la) * R;
      const ex = sx + s * Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
      const hx = ex + s * Math.sin(a2) * L2, hy = ey + Math.cos(a2) * L2;
      return [sx, sy, ex, ey, hx, hy];
    };
    let curPoses = null;
    const mouthD = { calm: "M-1.2,10.1 Q0,10.4 1.2,10.1", smile: "M-1.6,9.8 Q0,11.0 1.6,9.8", laugh: "M-1.7,9.7 Q0,11.6 1.7,9.7Z", worry: "M-1.3,10.4 Q0,9.9 1.3,10.4", sad: "M-1.4,10.6 Q0,9.8 1.4,10.6", talk: "M-1.1,9.9 Q0,11.0 1.1,9.9Z" };
    return {
      el: svg, w: W, h: Hh,
      update(t, it) {
        // arms
        const poses = it.v("arms", p.arms ?? ["down", "down"]);
        const pp = Array.isArray(poses) ? poses : [poses, poses];
        const key = pp.join(",");
        if (key !== curPoses) {
          curPoses = key;
          [-1, 1].forEach((side, i) => {
            const pose = pp[i] ?? "down";
            const [sx, sy, ex, ey, hx, hy] = armGeo(side, pose);
            const A = arms[i];
            A.up.setAttribute("d", `M${sx},${sy} L${ex},${ey}`);
            A.lo.setAttribute("d", `M${ex},${ey} L${hx},${hy}`);
            const dx = hx - ex, dy = hy - ey, l = Math.hypot(dx, dy) || 1;
            const cx = hx - (dx / l) * 2.6, cy = hy - (dy / l) * 2.6;
            A.cuff.setAttribute("d", `M${cx - (dx / l) * 0.5},${cy - (dy / l) * 0.5} L${cx},${cy}`);
            A.cuff.style.display = sleeve === skin ? "none" : "";
            A.hand.setAttribute("cx", hx); A.hand.setAttribute("cy", hy);
            hands[i] = [hx, hy];
            // arms raised in front of the body are drawn over the torso
            const front = ["camera", "phone", "fold", "hold"].includes(pose) && !back;
            (front ? armsFront : armsBack).appendChild(A.a);
          });
          const camOn = pp[0] === "camera" || pp[1] === "camera";
          cam.style.display = camOn ? "" : "none";
          if (camOn) cam.setAttribute("transform", `translate(0,7.6) scale(1.1)`);
          // hands in front of the camera: move the arms layer above the props when the camera is up
          if (camOn) body.appendChild(armsFront);
          else body.insertBefore(armsFront, headG);
          const ph = pp.indexOf("phone");
          phoneEl.style.display = ph >= 0 ? "" : "none";
          if (ph >= 0) phoneEl.setAttribute("transform", `translate(${hands[ph][0]},${hands[ph][1] - 1}) rotate(${ph ? 18 : -18})`);
          face.style.display = camOn || back ? "none" : "";
        }
        // legs (step phase)
        const step = it.v("step", 0), ph = Math.sin(step * Math.PI * 2);
        const lx = (side) => side * 3.4 + (step ? side * ph * 1.2 : 0);
        const ly = (side) => (step ? Math.max(0, side * ph) * 2.4 : 0);
        const leg = (el, shoe, side) => {
          const x0 = side * 4.2, x1 = lx(side), y1 = 98 - ly(side);
          el.setAttribute("d", `M${x0 - 3.4},${legTop} L${x0 + 3.4},${legTop} L${x1 + 2.6},${y1 - 1} L${x1 - 2.6},${y1 - 1}Z`);
          shoe.setAttribute("cx", x1 + side * 0.9); shoe.setAttribute("cy", y1 - 0.4);
        };
        leg(legL, shoeL, -1); leg(legR, shoeR, 1);
        // face
        let f = it.v("face", p.face ?? "calm");
        const talk = p.talk || [];
        if (talk.some(([a, b]) => t >= a && t < b)) f = Math.floor(t * 9) % 2 ? "talk" : "calm";
        mouth.setAttribute("d", mouthD[f] ?? mouthD.calm);
        mouth.setAttribute("fill", f === "laugh" || f === "talk" ? "#7a3a36" : "none");
        const ldx = it.v("look_dx", 0);
        eyeL.setAttribute("cx", -1.8 + ldx * 0.6); eyeR.setAttribute("cx", 1.8 + ldx * 0.6);
        const blink = (t * 0.37 + (p.seed ?? 0.3)) % 1 < 0.03;
        eyeL.setAttribute("ry", blink ? 0.08 : 0.62); eyeR.setAttribute("ry", blink ? 0.08 : 0.62);
        const worry = f === "worry" || f === "sad";
        browL.setAttribute("d", worry ? "M-2.8,4.7 Q-1.8,4.6 -0.9,4.2" : "M-2.8,4.9 Q-1.8,4.4 -0.9,4.8");
        browR.setAttribute("d", worry ? "M0.9,4.2 Q1.8,4.6 2.8,4.7" : "M0.9,4.8 Q1.8,4.4 2.8,4.9");
        root.setAttribute("transform", `rotate(${it.v("lean", 0)},0,99)`);
        // gone: strips slide apart and flicker, then nothing
        const gone = H.clamp(it.v("gone", 0), 0, 1);
        if (gone <= 0) { root.style.display = ""; strips.forEach((s) => (s.style.display = "none")); root.style.opacity = 1; }
        else if (gone >= 1) { root.style.display = "none"; strips.forEach((s) => (s.style.display = "none")); }
        else {
          const fr = Math.floor(t * 30), r = H.rng(fr * 977 + (p.seed ?? 3) * 31);
          root.style.display = "";
          root.style.opacity = r() < gone ? 0 : 0.35;
          strips.forEach((s, i) => {
            s.style.display = r() < 1 - gone * 0.7 ? "" : "none";
            s.setAttribute("x", (r() - 0.5) * 18 * gone);
            s.style.opacity = 0.9 - gone * 0.5;
          });
          shadow.style.opacity = 1 - gone;
        }
      },
      anchor(name) {
        const k = U;
        const toPx = ([x, y]) => [(x + 30) * k, (y + 4) * k];
        if (name === "head" || name === "face") return toPx([0, 6]);
        if (name === "top") return toPx([0, -1]);
        if (name === "hip") return toPx([0, 47]);
        if (name === "hand_l") return toPx(hands[0]);
        if (name === "hand_r") return toPx(hands[1]);
        return null;
      },
    };
  },
};

// class_photo: school class photo — rows of pupils on steps (back rows higher and smaller), teacher at the side.
//   rows, cols, h (px of a front-row pupil), gap: [row, col] — empty place (neighbours keep their arms out), seed, w (px)
export const class_photo = {
  origin: "bottom",
  async create(p, H) {
    const rows = p.rows ?? 3, cols = p.cols ?? 6, h0 = p.h ?? 300, w = p.w ?? 700;
    const el = H.div(`width:${w}px;height:${h0 * 1.9}px`);
    const r = H.rng(p.seed ?? 8);
    const tops = ["#2f3d5a", "#f1efe8", "#6d8fb3", "#9a3b3b", "#3f6a4f", "#d9c9a8", "#5b4a6a"];
    const hairs = ["short", "bob", "ponytail", "short", "long", "short"];
    const H0 = h0 * 1.9;
    for (let ri = rows - 1; ri >= 0; ri--) {
      const sc = 1 - ri * 0.1, y = H0 - ri * h0 * 0.36, step = (w * (0.92 - ri * 0.06)) / cols;
      for (let c = 0; c < cols; c++) {
        if (p.gap && p.gap[0] === ri && p.gap[1] === c) continue;
        const x = w / 2 + (c - (cols - 1) / 2) * step + (ri % 2) * step * 0.12;
        const nextToGap = p.gap && p.gap[0] === ri && Math.abs(p.gap[1] - c) === 1;
        const arms = nextToGap ? (p.gap[1] > c ? ["down", "around"] : ["around", "down"]) : ["down", "down"];
        await H.child({ actor: "figure", x, y, h: h0 * sc * (0.94 + r() * 0.1), top: r() < 0.5 ? "sweater" : "shirt", top_color: tops[Math.floor(r() * tops.length)],
          hair: hairs[Math.floor(r() * hairs.length)], hair_color: ["#3a2a22", "#6b4a2e", "#1d1b19", "#a6773f"][Math.floor(r() * 4)], arms, face: r() < 0.6 ? "smile" : "calm", seed: r() * 9 }, el);
      }
    }
    return { el, w, h: H0 };
  },
};
