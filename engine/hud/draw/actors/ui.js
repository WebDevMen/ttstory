// UI actors drawn inside the scene: phone, battery, timetag, callout, badge, card, checklist, meter, bubble, mail, clock.
// They live in the world (move with the camera) unless the item has `space: screen`.

const box = (H, css, html = "") => H.div(css, html);
const mono = (H) => `'${H.fonts.mono}', monospace`;   // single quotes: used inside style="…" attributes

// ------------------------------------------------------------------ phone
// screen: alert | lock | chat | notify | blank | app; w, h, color (body), glow (color), time, right (status text),
// title, sub, icon (alert), messages: [{text, at, side: in|out}], notes: [{icon, title, text, at}], on (track, brightness)
// For screen: app put your own items in `children` (screen-local coordinates, size = screen box). Anchor: screen
export const phone = {
  origin: "center",
  async create(p, H) {
    const w = p.w ?? 560, h = p.h ?? 960, inset = 18, sw = w - inset * 2, sh = h - inset * 2;
    const glow = H.col(p.glow ?? (p.screen === "alert" ? "#ff3048" : "#58a6ff"));
    const el = box(H, `width:${w}px;height:${h}px`);
    el.innerHTML = `<div style="position:absolute;inset:0;border-radius:${w * 0.13}px;background:${H.col(p.color ?? "#1b1e2a")};
        box-shadow:0 0 0 3px ${H.rgba(glow, 0.55)}, 0 0 40px ${H.rgba(glow, 0.45)}, 0 0 120px ${H.rgba(glow, 0.25)}, inset 0 0 0 2px rgba(255,255,255,.08)"></div>
      <div class="scr" style="position:absolute;left:${inset}px;top:${inset}px;width:${sw}px;height:${sh}px;border-radius:${w * 0.1}px;overflow:hidden;background:#05060a"></div>
      <div style="position:absolute;left:${w / 2 - 54}px;top:${inset + 14}px;width:108px;height:30px;border-radius:15px;background:#000"></div>`;
    const scr = el.querySelector(".scr");
    const status = (l, r, rc) => `<div style="position:absolute;left:34px;right:34px;top:22px;display:flex;justify-content:space-between;font:700 24px ${mono(H)};letter-spacing:1px;color:rgba(255,255,255,.85)"><span>${l ?? ""}</span><span style="color:${rc ?? "inherit"}">${r ?? ""}</span></div>`;
    const kind = p.screen ?? "lock";
    const dyn = [];
    if (kind === "alert") {
      scr.style.background = `radial-gradient(ellipse at 50% 30%, ${H.rgba(glow, 0.5)}, ${H.rgba(H.shade(glow, -0.75), 1)} 70%)`;
      scr.innerHTML = status(p.time ?? "03:17", p.right ?? "SOS", glow) + `
        <div style="position:absolute;inset:0;box-shadow:inset 0 0 60px ${H.rgba(glow, 0.6)}"></div>
        <svg class="ic" viewBox="0 0 120 106" style="position:absolute;left:${sw / 2 - 70}px;top:${sh * 0.2}px;width:140px;height:124px;overflow:visible;filter:drop-shadow(0 0 14px ${glow}) drop-shadow(0 0 34px ${glow})">
          <path d="M60,6 Q66,6 70,13 L114,90 Q118,100 108,100 L12,100 Q2,100 6,90 L50,13 Q54,6 60,6 Z" fill="${glow}"/>
          <rect x="54" y="34" width="12" height="38" rx="6" fill="#fff"/><circle cx="60" cy="85" r="7" fill="#fff"/></svg>
        <div style="position:absolute;left:0;right:0;top:${sh * 0.2 + 150}px;text-align:center;font:900 ${p.title_size ?? 52}px/1.02 Montserrat;color:#fff;letter-spacing:-0.5px;text-shadow:0 0 18px ${H.rgba(glow, 0.6)}">${H.markup(p.title ?? "ЭКСТРЕННОЕ\nОПОВЕЩЕНИЕ")}</div>
        <div style="position:absolute;left:0;right:0;top:${sh * 0.2 + 150 + (p.title_size ?? 52) * 2.2}px;text-align:center;font:700 22px ${mono(H)};letter-spacing:2px;color:${glow}">${H.markup(p.sub ?? "УРОВЕНЬ УГРОЗЫ: КРАСНЫЙ")}</div>
        <div style="position:absolute;left:44px;right:44px;top:${sh * 0.2 + 150 + (p.title_size ?? 52) * 2.2 + 46}px;height:2px;background:${H.rgba(glow, 0.6)}"></div>`;
      dyn.push((t) => { const ic = scr.querySelector(".ic"); ic.style.opacity = 0.75 + 0.25 * Math.sin(t * 7); });
    } else if (kind === "lock") {
      scr.style.background = p.bg ? H.col(p.bg) : "linear-gradient(160deg, #2a3a7a, #0e1430 70%)";
      scr.innerHTML = status("", p.right ?? "") + `<div style="position:absolute;left:0;right:0;top:${sh * 0.16}px;text-align:center;font:800 26px Montserrat;color:rgba(255,255,255,.8)">${p.date ?? ""}</div>
        <div style="position:absolute;left:0;right:0;top:${sh * 0.2}px;text-align:center;font:800 150px/1 Montserrat;color:#fff">${p.time ?? "07:30"}</div>`;
    } else if (kind === "chat" || kind === "notify") {
      scr.style.background = p.bg ? H.col(p.bg) : kind === "chat" ? "#0f1422" : "linear-gradient(160deg, #2a3a7a, #0e1430 70%)";
      scr.innerHTML = status(p.time ?? "07:30", p.right ?? "");
      const list = kind === "chat" ? p.messages || [] : p.notes || [];
      let y = kind === "chat" ? 110 : 120;
      for (const m of list) {
        const d = document.createElement("div");
        if (kind === "chat") {
          const out = m.side === "out";
          d.style.cssText = `position:absolute;${out ? "right" : "left"}:26px;top:${y}px;max-width:${sw * 0.72}px;padding:16px 22px;border-radius:26px;font:600 30px/1.25 Montserrat;color:#fff;background:${out ? "#2f7cf6" : "#2a3042"}`;
          d.innerHTML = H.markup(m.text);
          y += 30 * 1.25 * Math.ceil(String(m.text).length / 22) + 52;
        } else {
          d.style.cssText = `position:absolute;left:20px;right:20px;top:${y}px;padding:18px 20px;border-radius:24px;background:rgba(255,255,255,.88);color:#151820;display:flex;gap:16px;align-items:center`;
          d.innerHTML = `<div style="font-size:46px;line-height:1">${H.icon(m.icon ?? "🔔")}</div><div><div style="font:800 26px Montserrat">${H.markup(m.title ?? "")}</div><div style="font:500 24px/1.2 Montserrat;opacity:.8">${H.markup(m.text ?? "")}</div></div>`;
          y += 130;
        }
        scr.appendChild(d);
        dyn.push((t) => { const k = H.P(t, m.at ?? -1, 0.3); d.style.opacity = k; d.style.transform = `translateY(${(1 - H.E.outBack(k)) * 30}px) scale(${H.lerp(0.9, 1, H.E.outBack(k))})`; });
      }
    } else if (kind === "app") {
      scr.style.background = p.bg ? H.col(p.bg) : "#10131c";
      scr.innerHTML = status(p.time ?? "", p.right ?? "");
      for (const c of p.children || []) await H.child(c, scr);
    }
    const dim = box(H, `left:${inset}px;top:${inset}px;width:${sw}px;height:${sh}px;border-radius:${w * 0.1}px;background:#000;pointer-events:none`);
    el.appendChild(dim);
    return {
      el, w, h,
      update(t, it) { dim.style.opacity = 1 - it.v("on", 1); dyn.forEach((f) => f(t)); },
      anchor(name) { return name === "screen" ? [w / 2, h / 2] : null; },
    };
  },
};

// ------------------------------------------------------------------ battery: level (track 0..100), color (auto by level), bolt, label
export const battery = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 520, h = p.h ?? 230, line = H.col(p.line ?? "#cfd6e6");
    const el = box(H, `width:${w}px;height:${h}px`);
    el.innerHTML = `<div style="position:absolute;left:0;top:0;width:${w - 30}px;height:${h}px;border:8px solid ${line};border-radius:${h * 0.16}px"></div>
      <div style="position:absolute;left:${w - 26}px;top:${h * 0.32}px;width:22px;height:${h * 0.36}px;border-radius:0 8px 8px 0;background:${line}"></div>
      <div class="lv" style="position:absolute;left:20px;top:20px;height:${h - 40}px;border-radius:${h * 0.09}px"></div>
      <div class="tx" style="position:absolute;left:0;width:${w - 30}px;top:0;height:${h}px;display:flex;align-items:center;justify-content:center;font:900 ${h * 0.44}px Montserrat;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.4)"></div>
      ${p.bolt === false ? "" : `<svg viewBox="0 0 24 24" style="position:absolute;left:${(w - 30) / 2 - 36}px;top:${-h * 0.62}px;width:72px;height:72px;filter:drop-shadow(0 0 12px rgba(255,214,70,.8))"><path fill="#ffd646" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>`}`;
    const lv = el.querySelector(".lv"), tx = el.querySelector(".tx");
    return {
      el, w, h,
      update(t, it) {
        const v = H.clamp(it.v("level", 100), 0, 100);
        const c = p.color ? H.col(it.v("color", p.color)) : v > 50 ? "#4be37a" : v > 20 ? "#f5e663" : "#ff4054";
        lv.style.width = `${Math.max(0, (w - 70) * v / 100)}px`;
        lv.style.background = c;
        lv.style.boxShadow = `0 0 24px ${c}`;
        lv.style.opacity = v <= (p.blink_below ?? 10) ? (Math.sin(t * 10) > 0 ? 1 : 0.3) : 1;
        tx.textContent = `${Math.round(v)}%`;
        tx.style.paddingLeft = `${Math.max(0, (w - 70) * v / 100) * 0.5}px`;
      },
    };
  },
};

// ------------------------------------------------------------------ timetag: "ДЕНЬ 1 — 03:18" mono label
// text (track of strings), color, bg, size
export const timetag = {
  origin: "center",
  create(p, H) {
    const c = H.col(p.color ?? "#f0b44a");
    const el = box(H, `white-space:nowrap;padding:10px 20px;border:2px solid ${H.rgba(c, 0.7)};border-radius:6px;background:${H.col(p.bg ?? "rgba(24,16,4,.78)")};
      font:700 ${p.size ?? 34}px ${mono(H)};letter-spacing:2px;color:${c};text-shadow:0 0 12px ${H.rgba(c, 0.6)}`);
    el.textContent = p.text ?? "";
    return { el, update(t, it) { const s = String(it.v("text", p.text ?? "")); if (el.textContent !== s) el.textContent = s; } };
  },
};

// ------------------------------------------------------------------ badge: icon + title (+ sub) in a glowing box (errors, labels, chips)
// style: dark | solid | light | outline (pill without sub), color, icon (emoji / icon name / "!"), title, sub, size
export const badge = {
  origin: "center",
  create(p, H) {
    const c = H.col(p.color ?? "#ff3b4e"), st = p.style ?? "dark", size = p.size ?? 34;
    const bg = st === "solid" ? c : st === "light" ? "rgba(255,255,255,.94)" : st === "outline" ? "rgba(6,12,20,.72)" : H.rgba(H.shade(c, -0.8), 0.86);
    const ink = st === "light" ? "#14161c" : st === "solid" ? "#0d0d10" : "#fff";
    const el = box(H, `white-space:nowrap;display:flex;align-items:center;gap:${size * 0.45}px;padding:${size * 0.32}px ${size * 0.6}px;border-radius:${st === "outline" ? 14 : 12}px;
      background:${bg};border:${st === "solid" ? 0 : 2.5}px solid ${H.rgba(c, 0.9)};box-shadow:0 0 22px ${H.rgba(c, st === "light" ? 0.25 : 0.5)}, inset 0 0 18px ${H.rgba(c, 0.18)}`);
    const ic = p.icon ? (p.icon === "!" ? `<div style="flex:none;width:${size * 1.05}px;height:${size * 1.05}px;border-radius:${size * 0.22}px;display:grid;place-items:center;background:${st === "solid" ? "#0d0d10" : c};color:${st === "solid" ? c : "#fff"};font:900 ${size * 0.8}px Montserrat">!</div>`
      : `<div style="flex:none;font-size:${size * 1.1}px;line-height:1;color:${c}">${H.icon(p.icon)}</div>`) : "";
    el.innerHTML = `${ic}<div><div style="font:900 ${size}px/1.05 Montserrat;color:${ink};letter-spacing:.3px">${H.markup(p.title ?? "")}</div>
      ${p.sub ? `<div style="font:700 ${size * 0.52}px ${mono(H)};letter-spacing:1.5px;color:${st === "light" ? c : H.rgba(c, 0.95)};margin-top:4px">${H.markup(p.sub)}</div>` : ""}</div>`;
    return { el };
  },
};

// ------------------------------------------------------------------ callout: label box + leader line to a target (anchor ref or [x, y]) + target brackets
// target: "home.win:7,3" | [x, y] (same space as this item), title, sub, icon, color, dashed (true), brackets (size or false), line_from: bottom|top|left|right
export const callout = {
  create(p, H) {
    const c = H.col(p.color ?? "#3fe0d0"), size = p.size ?? 34;
    const el = box(H, "");
    const card = box(H, `white-space:nowrap;display:flex;align-items:center;gap:16px;padding:14px 24px 14px 16px;border-radius:12px;background:rgba(6,14,22,.82);
      border:2.5px solid ${c};box-shadow:0 0 26px ${H.rgba(c, 0.45)}, inset 0 0 14px ${H.rgba(c, 0.2)}`);
    card.innerHTML = `${p.icon ? `<div style="flex:none;width:${size * 1.3}px;height:${size * 1.3}px;border:2px solid ${H.rgba(c, 0.8)};border-radius:8px;display:grid;place-items:center;font-size:${size * 0.8}px;color:${c}">${H.icon(p.icon)}</div>` : ""}
      <div><div style="font:900 ${size}px/1.05 Montserrat;color:#fff">${H.markup(p.title ?? "")}</div>${p.sub ? `<div style="font:700 ${size * 0.5}px ${mono(H)};letter-spacing:1.5px;color:${c};margin-top:4px">${H.markup(p.sub)}</div>` : ""}</div>`;
    const svg = H.svg(`<path class="ln" fill="none" stroke="${c}" stroke-width="3" ${p.dashed === false ? "" : 'stroke-dasharray="8 7"'}/><circle class="dot" r="6" fill="${c}"/><path class="br" fill="none" stroke="${c}" stroke-width="3.5"/>`);
    el.appendChild(svg);
    el.appendChild(card);
    let cw = 0, ch = 0;
    return {
      el, origin: [0, 0],
      update(t, it) {
        if (!cw) { const r = card.getBoundingClientRect(); const m = it.screenMatrix(); const sc = Math.hypot(m.a, m.b) || 1; cw = r.width / sc; ch = r.height / sc; }
        card.style.transform = `translate(${-cw / 2}px, ${-ch / 2}px)`;
        let tp = null;
        if (typeof p.target === "string") {
          const s = H.anchorOf(p.target);
          if (s) { const q = it.screenMatrix().inverse().transformPoint(new DOMPoint(s[0], s[1])); tp = [q.x, q.y]; }
        } else if (Array.isArray(p.target)) {            // a point in the same space as this item's x, y
          const m = it.matrix.inverse().transformPoint(new DOMPoint(p.target[0], p.target[1]));
          tp = [m.x, m.y];
        }
        const ln = svg.querySelector(".ln"), dot = svg.querySelector(".dot"), br = svg.querySelector(".br");
        if (!tp) { ln.setAttribute("d", ""); return; }
        const from = { bottom: [0, ch / 2], top: [0, -ch / 2], left: [-cw / 2, 0], right: [cw / 2, 0] }[p.line_from ?? (tp[1] > ch / 2 ? "bottom" : tp[1] < -ch / 2 ? "top" : tp[0] < 0 ? "left" : "right")];
        const fx = from[0] + (p.line_from === "bottom" || (!p.line_from && Math.abs(tp[1]) > ch / 2) ? H.clamp(tp[0], -cw / 2 + 30, cw / 2 - 30) : 0);
        const k = H.E.outCubic(H.P(t, (p.line_at ?? it.at) + 0.15, 0.45));
        const ex = fx + (tp[0] - fx) * k, ey = from[1] + (tp[1] - from[1]) * k;
        ln.setAttribute("d", `M${fx},${from[1]} L${ex},${ey}`);
        dot.setAttribute("cx", fx); dot.setAttribute("cy", from[1]);
        const b = p.brackets ?? 0;
        if (b && k >= 1) {
          const s = b / 2, l = Math.max(10, b * 0.28), x = tp[0], y = tp[1];
          br.setAttribute("d", `M${x - s},${y - s + l} V${y - s} H${x - s + l} M${x + s - l},${y - s} H${x + s} V${y - s + l} M${x + s},${y + s - l} V${y + s} H${x + s - l} M${x - s + l},${y + s} H${x - s} V${y + s - l}`);
        } else br.setAttribute("d", "");
      },
    };
  },
};

// ------------------------------------------------------------------ card: rounded card with a big icon/emoji, title, sub (style light|dark|glass)
export const card = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 300, c = H.col(p.color ?? "#ff8a3c"), st = p.style ?? "light";
    const bg = st === "dark" ? "rgba(14,18,30,.9)" : st === "glass" ? "rgba(255,255,255,.18)" : "#ffffff";
    const ink = st === "light" ? "#151820" : "#fff";
    const el = box(H, `width:${w}px;padding:${w * 0.09}px ${w * 0.07}px ${w * 0.08}px;border-radius:${w * 0.1}px;background:${bg};text-align:center;
      box-shadow:0 18px 40px rgba(0,0,0,.25), 0 0 0 4px ${H.rgba(c, 0.9)};${st === "glass" ? "backdrop-filter:blur(10px)" : ""}`);
    el.innerHTML = `${p.number != null ? `<div style="position:absolute;left:-18px;top:-18px;width:62px;height:62px;border-radius:50%;background:${c};color:#fff;display:grid;place-items:center;font:900 32px Montserrat;box-shadow:0 6px 14px rgba(0,0,0,.25)">${p.number}</div>` : ""}
      <div style="font-size:${w * 0.36}px;line-height:1.1;color:${c}">${p.emoji ? H.emoji(p.emoji) : p.icon ? H.icon(p.icon) : ""}</div>
      <div style="font:900 ${p.size ?? w * 0.13}px/1.1 Montserrat;color:${ink};margin-top:${w * 0.03}px">${H.markup(p.title ?? "")}</div>
      ${p.sub ? `<div style="font:600 ${w * 0.075}px/1.2 Montserrat;color:${st === "light" ? "#5a6070" : "rgba(255,255,255,.8)"};margin-top:6px">${H.markup(p.sub)}</div>` : ""}`;
    return { el, w };
  },
};

// ------------------------------------------------------------------ checklist: [{text, at}] — boxes get checked at their times
export const checklist = {
  create(p, H) {
    const size = p.size ?? 44, c = H.col(p.color ?? "#46e68c"), ink = H.col(p.ink ?? "#ffffff");
    const el = box(H, `width:${p.width ?? 700}px`);
    const rows = (p.items || []).map((x) => {
      const r = document.createElement("div");
      r.style.cssText = `display:flex;align-items:center;gap:${size * 0.45}px;margin:${size * 0.32}px 0;font:800 ${size}px/1.1 Montserrat;color:${ink};${p.shadow === false ? "" : "text-shadow:0 4px 14px rgba(0,0,0,.35)"}`;
      r.innerHTML = `<svg viewBox="0 0 40 40" style="flex:none;width:${size * 1.15}px;height:${size * 1.15}px;overflow:visible"><rect x="2" y="2" width="36" height="36" rx="9" fill="rgba(0,0,0,.25)" stroke="${ink}" stroke-width="3.5"/>
        <path class="ck" d="M9,21 L17,29 L32,11" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="40" stroke-dashoffset="40"/></svg><span>${H.markup(x.text)}</span>`;
      el.appendChild(r);
      return [x, r, r.querySelector(".ck"), r.querySelector("rect")];
    });
    return {
      el,
      update(t, it) {
        rows.forEach(([x, r, ck, rc], i) => {
          const show = H.P(t, x.show ?? (p.show_at ?? it.at) + i * (p.stagger ?? 0.12), 0.3);
          r.style.opacity = show; r.style.transform = `translateX(${(1 - H.E.outCubic(show)) * -40}px)`;
          const k = H.P(t, x.at ?? 1e9, 0.3);
          ck.setAttribute("stroke-dashoffset", 40 * (1 - k));
          rc.setAttribute("fill", k > 0.5 ? H.rgba(c, 0.25) : "rgba(0,0,0,.25)");
        });
      },
    };
  },
};

// ------------------------------------------------------------------ meter: labeled progress bar. value (track), max, label, color, w, unit, ink (dark on light bg)
export const meter = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 640, c = H.col(p.color ?? "#46e68c"), size = p.size ?? 30, dark = p.ink === "dark";
    const ink = dark ? "#1d2347" : H.col(p.ink ?? "#ffffff");
    const el = box(H, `width:${w}px`);
    el.innerHTML = `<div style="display:flex;justify-content:space-between;font:800 ${size}px Montserrat;color:${ink};margin-bottom:10px;${dark ? "" : "text-shadow:0 3px 10px rgba(0,0,0,.4)"}"><span>${H.markup(p.label ?? "")}</span><span class="v" style="color:${c}"></span></div>
      <div style="height:${size * 0.8}px;border-radius:${size}px;background:${dark ? "rgba(29,35,71,.12)" : "rgba(0,0,0,.35)"};border:2px solid ${dark ? "rgba(29,35,71,.35)" : "rgba(255,255,255,.5)"};overflow:hidden"><div class="b" style="height:100%;border-radius:${size}px;background:${c};box-shadow:0 0 18px ${c}"></div></div>`;
    const b = el.querySelector(".b"), v = el.querySelector(".v");
    return { el, w, update(t, it) { const x = it.v("value", 0), mx = p.max ?? 100; b.style.width = `${H.clamp(x / mx) * 100}%`; v.textContent = `${Math.round(x)}${p.unit ?? "%"}`; } };
  },
};

// ------------------------------------------------------------------ bubble: speech bubble; origin = tail tip. text, side (right|left), color, ink, size, width
export const bubble = {
  create(p, H) {
    const size = p.size ?? 40, bg = H.col(p.color ?? "#ffffff"), ink = H.col(p.ink ?? "#14161c"), left = p.side === "left";
    const el = box(H, "");
    const b = box(H, `white-space:${p.width ? "normal" : "nowrap"};${p.width ? `width:${p.width}px;` : ""}padding:${size * 0.45}px ${size * 0.7}px;border-radius:${size * 0.9}px;background:${bg};color:${ink};font:800 ${size}px/1.15 "${H.fonts[p.font] ?? p.font ?? "Montserrat"}","Rounded";box-shadow:0 12px 30px rgba(0,0,0,.25);text-align:center`);
    b.innerHTML = H.markup(p.text ?? "");
    const tail = H.svg(`<path d="M0,0 L${left ? -46 : 46},-34 L${left ? -14 : 14},-48 Z" fill="${bg}"/>`);
    el.appendChild(tail); el.appendChild(b);
    let bw = 0, bh = 0;
    return {
      el,
      update(t, it) {
        if (!bw) { const r = b.getBoundingClientRect(), m = it.screenMatrix(), sc = Math.hypot(m.a, m.b) || 1; bw = r.width / sc; bh = r.height / sc; }
        b.style.transform = `translate(${left ? -bw + 30 : -30}px, ${-bh - 40}px)`;
      },
    };
  },
};

// ------------------------------------------------------------------ mail: an e-mail / support thread in a desktop window
// title (window bar), folder (small caps line), subject, color (accent), w, h, size (body text), messages: [{from, addr, avatar
// (emoji or letters), color (avatar), time, text, out (true = written by the hero: accent frame), attach: {name, sub, ext, icon,
// color, at (glows from then on)}, at}] — each message slides in at its time, cards stack from the top
export const mail = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 940, h = p.h ?? 900, size = p.size ?? 30, acc = H.col(p.color ?? "#4de1ff"), bar = 60, M = mono(H);
    const el = box(H, `width:${w}px;height:${h}px;border-radius:22px;overflow:hidden;background:#0c111b;font-family:Montserrat;
      box-shadow:0 0 0 3px ${H.rgba(acc, 0.45)}, 0 0 50px ${H.rgba(acc, 0.22)}, 0 30px 60px rgba(0,0,0,.6)`);
    const dot = (c) => `<span style="width:16px;height:16px;border-radius:50%;background:${c}"></span>`;
    el.innerHTML = `<div style="position:absolute;left:0;top:0;width:${w}px;height:${bar}px;background:#161c2a;display:flex;align-items:center;gap:12px;padding:0 22px;box-sizing:border-box">
        ${dot("#ff5f57")}${dot("#febc2e")}${dot("#28c840")}<span style="margin-left:16px;font:700 24px ${M};color:#aab4c8;white-space:nowrap">${H.markup(p.title ?? "")}</span></div>`;
    const col = document.createElement("div");
    col.style.cssText = `position:absolute;left:0;top:${bar}px;width:${w}px;padding:26px 30px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px`;
    col.innerHTML = `<div style="padding:0 4px 20px;border-bottom:2px solid rgba(255,255,255,.08)">
        ${p.folder ? `<div style="font:800 ${size * 0.6}px ${M};letter-spacing:2px;color:${acc}">${H.markup(p.folder)}</div>` : ""}
        <div style="font:900 ${size * 1.3}px/1.15 Montserrat;color:#fff;margin-top:10px">${H.markup(p.subject ?? "")}</div></div>`;
    el.appendChild(col);
    const cards = (p.messages || []).map((m) => {
      const out = !!m.out, a = m.attach, ac = a ? H.col(a.color ?? acc) : acc;
      const d = document.createElement("div");
      d.style.cssText = `position:relative;border-radius:20px;padding:22px 26px;background:${out ? H.rgba(acc, 0.1) : "#151c2b"};
        border:2px solid ${out ? H.rgba(acc, 0.6) : "rgba(255,255,255,.09)"};opacity:0`;
      d.innerHTML = `<div style="display:flex;align-items:center;gap:18px">
          <div style="flex:none;width:${size * 1.85}px;height:${size * 1.85}px;border-radius:50%;background:${H.col(m.color ?? "#2a3550")};display:grid;place-items:center;font:900 ${size * 0.9}px Montserrat;color:#fff">${H.icon(m.avatar ?? "👤")}</div>
          <div style="flex:1;min-width:0"><div style="font:800 ${size * 0.95}px Montserrat;color:#fff;white-space:nowrap">${H.markup(m.from ?? "")}</div>
            ${m.addr ? `<div style="font:600 ${size * 0.68}px ${M};color:#8a94ab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${H.markup(m.addr)}</div>` : ""}</div>
          ${m.time ? `<div style="flex:none;font:700 ${size * 0.68}px ${M};color:#8a94ab">${m.time}</div>` : ""}</div>
        ${m.text ? `<div style="margin-top:16px;font:600 ${size}px/1.3 Montserrat;color:#d8deeb">${H.markup(m.text)}</div>` : ""}
        ${a ? `<div class="att" style="margin-top:18px;display:flex;align-items:center;gap:20px;padding:16px 20px;border-radius:16px;background:rgba(255,255,255,.05);border:2px solid ${H.rgba(ac, 0.7)}">
            <div style="flex:none;width:${size * 2}px;height:${size * 2.4}px;border-radius:10px;background:${ac};display:grid;place-items:center;font:900 ${size * 0.66}px ${M};color:#fff">${a.icon ? H.icon(a.icon) : a.ext ?? "FILE"}</div>
            <div style="min-width:0"><div style="font:800 ${size * 0.95}px Montserrat;color:#fff;white-space:nowrap">${H.markup(a.name ?? "")}</div>
              ${a.sub ? `<div style="font:700 ${size * 0.66}px ${M};letter-spacing:1px;color:${H.shade(ac, 0.35)};margin-top:4px">${H.markup(a.sub)}</div>` : ""}</div></div>` : ""}`;
      col.appendChild(d);
      return [m, d, d.querySelector(".att"), ac];
    });
    return {
      el, w, h,
      update(t) {
        for (const [m, d, att, ac] of cards) {
          const k = H.P(t, m.at ?? -1, 0.35);
          d.style.opacity = H.clamp(k * 2);
          d.style.transform = `translateY(${(1 - H.E.outBack(k)) * 40}px) scale(${H.lerp(0.96, 1, H.E.outBack(k))})`;
          if (att) {
            const g = H.P(t, m.attach.at ?? 1e9, 0.3), pulse = 0.75 + 0.25 * Math.sin(t * 7);
            att.style.boxShadow = g > 0 ? `0 0 ${30 * g * pulse}px ${H.rgba(ac, 0.8 * g)}, inset 0 0 ${18 * g}px ${H.rgba(ac, 0.3 * g)}` : "none";
          }
        }
      },
    };
  },
};

// ------------------------------------------------------------------ clock: analog wall clock. time (track, hours: 8.5 = 8:30), r, face, frame, numbers
export const clock = {
  origin: "center",
  create(p, H) {
    const r = p.r ?? 120, w = r * 2.2, c = w / 2;
    let s = `<circle cx="${c}" cy="${c}" r="${r}" fill="${H.col(p.face ?? "#ffffff")}" stroke="${H.col(p.frame ?? "#2f3546")}" stroke-width="${r * 0.12}"/>`;
    for (let i = 0; i < 60; i++) s += `<rect x="${c - (i % 5 ? 1 : 2.5)}" y="${c - r * 0.86}" width="${i % 5 ? 2 : 5}" height="${i % 5 ? r * 0.06 : r * 0.13}" fill="#2f3546" transform="rotate(${i * 6} ${c} ${c})"/>`;
    if (p.numbers) for (let i = 1; i <= 12; i++) { const a = (i / 12) * 6.283; s += `<text x="${c + Math.sin(a) * r * 0.62}" y="${c - Math.cos(a) * r * 0.62 + r * 0.09}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="${r * 0.22}" fill="#2f3546">${i}</text>`; }
    s += `<rect class="hh" x="${c - r * 0.045}" y="${c - r * 0.5}" width="${r * 0.09}" height="${r * 0.58}" rx="${r * 0.04}" fill="#2a2f3e"/>
      <rect class="mh" x="${c - r * 0.03}" y="${c - r * 0.76}" width="${r * 0.06}" height="${r * 0.84}" rx="${r * 0.03}" fill="#2a2f3e"/>
      <rect class="sh" x="${c - 1.5}" y="${c - r * 0.8}" width="3" height="${r * 0.95}" fill="#d9283a"/><circle cx="${c}" cy="${c}" r="${r * 0.06}" fill="#d9283a"/>`;
    const svg = H.svg(s, w, w);
    const hh = svg.querySelector(".hh"), mh = svg.querySelector(".mh"), sh = svg.querySelector(".sh");
    return {
      el: svg, w, h: w,
      update(t, it) {
        const tm = it.v("time", 8.5);
        hh.setAttribute("transform", `rotate(${(tm % 12) * 30} ${c} ${c})`);
        mh.setAttribute("transform", `rotate(${(tm % 1) * 360} ${c} ${c})`);
        sh.style.display = p.seconds === false ? "none" : "";
        sh.setAttribute("transform", `rotate(${((tm * 3600) % 60) * 6 + (p.seconds === "tick" ? 0 : (t % 60) * 6)} ${c} ${c})`);
      },
    };
  },
};
