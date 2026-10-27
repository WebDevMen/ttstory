// Card-game actors: playing_card (playing card that flips and can turn see-through), chips (a stack of poker chips),
// poker_table (an online poker table seen from above with seats, nicknames, stacks, pot and anchors for cards).

const SUITS = { s: ["♠", "#14161c"], c: ["♣", "#14161c"], h: ["♥", "#d3122f"], d: ["♦", "#d3122f"] };
const suitOf = (s) => SUITS[String(s ?? "s")[0].toLowerCase()] || (["♥", "♦"].includes(s) ? [s, "#d3122f"] : [s, "#14161c"]);

// ------------------------------------------------------------------ playing_card
// rank ("A" "K" "10" …), suit (s h d c or ♠♥♦♣), w (height = 1.4 w), face (track 0 = back, 1 = face up; flips smoothly
// between), xray (track 0..1: the back turns see-through and shows the face in `glow` colour — "god mode"),
// highlight (track 0..1 glowing frame), glow (colour), back (colour of the back pattern)
export const playing_card = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 150, h = Math.round(w * 1.4), r = w * 0.09;
    const [sym, ink] = suitOf(p.suit);
    const glow = H.col(p.glow ?? "#4de1ff"), back = H.col(p.back ?? "#b3122f");
    const el = H.div(`width:${w}px;height:${h}px`);
    const face = H.div(`width:${w}px;height:${h}px;border-radius:${r}px;background:linear-gradient(160deg,#ffffff,#ece7dc);
      box-shadow:0 ${w * 0.03}px ${w * 0.08}px rgba(0,0,0,.45), inset 0 0 0 ${Math.max(1, w * 0.012)}px rgba(0,0,0,.12);font-family:Montserrat;color:${ink}`,
      `<div style="position:absolute;left:${w * 0.08}px;top:${w * 0.05}px;text-align:center;line-height:.95">
         <div style="font-weight:900;font-size:${w * 0.3}px;letter-spacing:-1px">${p.rank ?? "A"}</div><div style="font-size:${w * 0.24}px">${sym}</div></div>
       <div style="position:absolute;right:${w * 0.08}px;bottom:${w * 0.05}px;text-align:center;line-height:.95;transform:rotate(180deg)">
         <div style="font-weight:900;font-size:${w * 0.3}px;letter-spacing:-1px">${p.rank ?? "A"}</div><div style="font-size:${w * 0.24}px">${sym}</div></div>
       <div style="position:absolute;left:0;right:0;top:${h * 0.3}px;text-align:center;font-size:${w * 0.56}px;line-height:1">${sym}</div>`);
    const bk = H.div(`width:${w}px;height:${h}px;border-radius:${r}px;background:${back};
      box-shadow:0 ${w * 0.03}px ${w * 0.08}px rgba(0,0,0,.45);overflow:hidden`,
      `<div style="position:absolute;inset:${w * 0.07}px;border-radius:${r * 0.6}px;border:${w * 0.02}px solid rgba(255,255,255,.75);
         background:repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 ${w * 0.04}px, transparent ${w * 0.04}px ${w * 0.1}px),
         repeating-linear-gradient(-45deg, rgba(255,255,255,.18) 0 ${w * 0.04}px, transparent ${w * 0.04}px ${w * 0.1}px)"></div>`);
    const xr = H.div(`width:${w}px;height:${h}px;border-radius:${r}px;pointer-events:none;opacity:0`);
    const frame = H.div(`left:${-w * 0.04}px;top:${-w * 0.04}px;width:${w * 1.08}px;height:${h + w * 0.08}px;border-radius:${r * 1.3}px;
      border:${w * 0.03}px solid ${glow};opacity:0`);
    el.append(face, bk, xr, frame);
    return {
      el, w, h,
      update(t, it) {
        const f = H.clamp(it.v("face", 0)), ang = f * 180, sx = Math.abs(Math.cos((ang * Math.PI) / 180));
        const up = ang > 90, x = H.clamp(it.v("xray", 0));
        face.style.display = up || x > 0 ? "block" : "none";
        face.style.transform = `scaleX(${Math.max(0.02, sx)})`;
        bk.style.display = up ? "none" : "block";
        bk.style.transform = `scaleX(${Math.max(0.02, sx)})`;
        bk.style.opacity = up ? 0 : 1 - 0.78 * x;
        xr.style.transform = bk.style.transform;
        xr.style.opacity = up ? 0 : x;
        xr.style.boxShadow = `0 0 ${w * 0.18}px ${glow}, inset 0 0 ${w * 0.2}px ${H.rgba(glow, 0.6)}`;
        const hl = H.clamp(it.v("highlight", 0));
        frame.style.opacity = hl;
        frame.style.boxShadow = `0 0 ${w * 0.15 * hl}px ${glow}`;
      },
    };
  },
};

// ------------------------------------------------------------------ chips: a stack of poker chips (side view)
// count (track: number of chips, up to max = 24), color, color2 (stripes), w, label
export const chips = {
  origin: "bottom",
  create(p, H) {
    const w = p.w ?? 120, th = w * 0.13, max = p.max ?? 24;
    const c = H.col(p.color ?? "#d3122f"), c2 = H.col(p.color2 ?? "#ffffff");
    const h = th * max + w * 0.3 + (p.label ? w * 0.45 : 0);
    const el = H.div(`width:${w}px;height:${h}px`);
    const discs = Array.from({ length: max }, (_, i) => {
      const d = H.div(`left:0;width:${w}px;height:${w * 0.3}px;top:${h - w * 0.3 - i * th}px;border-radius:50%;
        background:radial-gradient(ellipse at 50% 40%, ${H.shade(c, 0.15)}, ${c} 60%, ${H.shade(c, -0.35)});
        box-shadow:0 ${th * 0.5}px 0 ${H.shade(c, -0.45)}, inset 0 0 0 ${w * 0.06}px ${H.rgba(c2, 0.0)};
        border:${w * 0.035}px dashed ${H.rgba(c2, 0.85)};box-sizing:border-box`);
      el.appendChild(d);
      return d;
    });
    const lab = p.label ? H.div(`left:${-w}px;width:${w * 3}px;top:0;text-align:center;font:800 ${w * 0.3}px Montserrat;color:#fff;
      text-shadow:0 2px 8px rgba(0,0,0,.7)`) : null;
    if (lab) el.appendChild(lab);
    return {
      el, w, h,
      update(t, it) {
        const n = Math.round(H.clamp(it.v("count", 10), 0, max));
        discs.forEach((d, i) => { d.style.display = i < n ? "block" : "none"; });
        if (lab) { lab.textContent = String(it.v("label", p.label)); lab.style.top = `${h - w * 0.3 - n * th - w * 0.42}px`; }
      },
    };
  },
};

// ------------------------------------------------------------------ poker_table: online table seen from above (portrait)
// seats: [{name, stack, avatar (emoji), color}] clockwise from the bottom (hero) — up to 8; active (track: seat index that
// glows), pot (track number, shown "$…" in the middle; null or 0 hides it), logo (text on the felt), felt, rail, w (default 980).
// Anchors: seat:i (avatar), cards:i (where that seat's hole cards lie), board:k (k = 0..4 community cards), pot, center
export const poker_table = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 980, h = Math.round(w * 1.43), k = w / 980, cx = w / 2, cy = h / 2;
    const felt = H.col(p.felt ?? "#0e5a3a"), rail = H.col(p.rail ?? "#2a1a12");
    const seats = p.seats || [{ name: "ТЫ" }, { name: "SEAT 2" }, { name: "SEAT 3" }, { name: "SEAT 4" }, { name: "SEAT 5" }, { name: "SEAT 6" }];
    const n = seats.length;
    const pos = seats.map((_, i) => {
      const a = Math.PI / 2 + (i / n) * Math.PI * 2;                       // 0 = bottom, clockwise
      return [cx + Math.cos(a) * 470 * k, cy + Math.sin(a) * 700 * k];
    });
    const cardPos = pos.map(([x, y]) => [cx + (x - cx) * 0.66, cy + (y - cy) * 0.7]);
    const el = H.div(`width:${w}px;height:${h}px`);
    el.innerHTML = `
      <div style="position:absolute;left:${30 * k}px;top:${40 * k}px;width:${w - 60 * k}px;height:${h - 80 * k}px;border-radius:${460 * k}px;
        background:linear-gradient(${H.shade(rail, 0.25)}, ${rail});box-shadow:0 ${30 * k}px ${80 * k}px rgba(0,0,0,.6)"></div>
      <div style="position:absolute;left:${62 * k}px;top:${72 * k}px;width:${w - 124 * k}px;height:${h - 144 * k}px;border-radius:${430 * k}px;
        background:radial-gradient(ellipse at 50% 45%, ${H.shade(felt, 0.18)}, ${felt} 55%, ${H.shade(felt, -0.45)});
        box-shadow:inset 0 0 ${60 * k}px rgba(0,0,0,.55), inset 0 0 0 ${4 * k}px ${H.rgba("#ffd34d", 0.35)}"></div>
      <div style="position:absolute;left:0;right:0;top:${cy + 150 * k}px;text-align:center;font:italic 900 ${54 * k}px Montserrat;letter-spacing:${4 * k}px;
        color:${H.rgba("#ffffff", 0.13)}">${H.markup(p.logo ?? "POKER")}</div>`;
    const potEl = H.div(`left:0;width:${w}px;top:${cy - 190 * k}px;text-align:center;font:900 ${44 * k}px Montserrat;color:#fff;
      text-shadow:0 3px 12px rgba(0,0,0,.7)`);
    el.appendChild(potEl);
    const seatEls = seats.map((s, i) => {
      const [x, y] = pos[i];
      const d = H.div(`left:${x - 120 * k}px;top:${y - 70 * k}px;width:${240 * k}px;height:${140 * k}px`,
        `<div class="av" style="position:absolute;left:${70 * k}px;top:${-30 * k}px;width:${100 * k}px;height:${100 * k}px;border-radius:50%;
           background:${H.col(s.color ?? "#2a3550")};display:grid;place-items:center;font-size:${54 * k}px;border:${5 * k}px solid #10141f">${H.icon(s.avatar ?? "👤")}</div>
         <div class="pl" style="position:absolute;left:0;top:${60 * k}px;width:${240 * k}px;height:${76 * k}px;border-radius:${16 * k}px;background:rgba(8,10,16,.88);
           border:${3 * k}px solid rgba(255,255,255,.15);text-align:center;font-family:Montserrat">
           <div style="font-weight:800;font-size:${28 * k}px;color:#fff;margin-top:${6 * k}px;white-space:nowrap">${H.markup(s.name ?? "")}</div>
           <div style="font-weight:700;font-size:${24 * k}px;color:#ffd34d">${s.stack ?? ""}</div></div>`);
      el.appendChild(d);
      return d;
    });
    return {
      el, w, h,
      update(t, it) {
        const act = it.v("active", -1);
        seatEls.forEach((d, i) => {
          const on = Math.round(act) === i;
          d.querySelector(".pl").style.borderColor = on ? "#ffd34d" : "rgba(255,255,255,.15)";
          d.querySelector(".pl").style.boxShadow = on ? `0 0 ${24 * k}px rgba(255,211,77,.8)` : "none";
        });
        const pot = it.v("pot", null);
        potEl.textContent = pot == null || pot <= 0 ? "" : `БАНК $${Math.round(pot).toLocaleString("ru-RU").replace(/ /g, " ")}`;
      },
      anchor(name, args) {
        const i = Number(args?.[0] ?? 0);
        if (name === "seat") return pos[i % n];
        if (name === "cards") return cardPos[i % n];
        if (name === "board") return [cx + (i - 2) * 112 * k, cy - 40 * k];
        if (name === "pot") return [cx, cy - 170 * k];
        if (name === "center") return [cx, cy];
        return null;
      },
    };
  },
};
