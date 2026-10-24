// Panel components: stats, title, meter, list, counter, progress, choices.

const ticks = '<i class="tick a"></i><i class="tick b"></i><i class="tick c"></i><i class="tick d"></i>';
const SCRAMBLE = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%&@";

export const stats = {
  align: "left top", x: 52, y: 214, enter: "swing_left", enter_dur: 0.45, exit: "glitch", exit_dur: 0.25, tilt: { y: 16, x: 3, sway: 2, freq: 0.2 },
  create(p, H) {
    const rows = p.rows || [];
    const el = H.html(`<div class="panel c-stats">${ticks}
      ${p.title ? `<div class="ph"><span>${H.markup(p.title)}</span><i class="blink"></i></div>` : ""}
      ${rows.map((r) => `<div class="row" style="--rc:${H.rgb(r.color || "white")}"><div class="ico">${H.icon(r.icon)}</div><div class="lab">${H.markup(r.label)}</div><div class="val"></div><div class="bar"><i></i></div></div>`).join("")}
    </div>`);
    if (p.width) el.style.width = `${p.width}px`;
    const R = [...el.querySelectorAll(".row")];
    return {
      el,
      update(t, s) {
        el.style.setProperty("--sheen", `${H.lerp(-100, 420, H.P(s.local, 0.5, 0.7))}%`);
        R.forEach((row, i) => {
          const r = rows[i];
          const a = p.at + 0.12 + i * (p.stagger ?? 0.22);
          const k = H.E.outBack(H.P(t, a, 0.35));
          row.style.opacity = H.P(t, a, 0.15);
          row.style.transform = `translateX(${(1 - k) * -30}px)`;
          const cur = r.value * H.E.outCubic(H.P(t, a + 0.05, p.count_dur ?? 0.7));
          const dec = r.decimals ?? (Number.isInteger(r.value) ? 0 : 1);
          row.querySelector(".val").textContent = cur.toFixed(dec) + (r.unit ?? "");
          row.querySelector(".bar i").style.width = `${(cur / (r.max ?? 100)) * 100}%`;
          const ic = row.querySelector(".ico");
          const anim = r.anim || (r.icon === "heart" ? "beat" : r.icon === "radiation" ? "spin" : "bob");
          if (anim === "beat") ic.style.transform = `scale(${1 + 0.18 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.25)), 12)})`;
          else if (anim === "spin") ic.style.transform = `rotate(${t * 40}deg)`;
          else if (anim === "bob") ic.style.transform = `translateY(${Math.sin(t * 3) * 3}px)`;
        });
      },
    };
  },
};

export const title = {
  align: "center top", x: 540, y: 700, enter: "unfold", enter_dur: 0.3, exit: "glitch", exit_dur: 0.2, tilt: { sway: 3, freq: 0.18 },
  create(p, H) {
    const el = H.html(`<div class="panel c-title">${ticks}${p.kicker ? `<div class="kicker">${H.markup(p.kicker)}</div>` : ""}<div class="big"></div>${p.rule === false ? "" : '<div class="rule"></div>'}</div>`);
    if (p.size) el.style.setProperty("--size", `${p.size}px`);
    if (p.width) el.style.width = `${p.width}px`;
    const big = el.querySelector(".big"), kick = el.querySelector(".kicker"), rule = el.querySelector(".rule");
    const txt = String(p.text || "");
    return {
      el,
      update(t, s) {
        el.style.setProperty("--sheen", `${H.lerp(-100, 520, H.P(s.local, 0.6, 0.6))}%`);
        const a0 = p.at + 0.2;
        let out = "";
        [...txt].forEach((ch, i) => {
          if (ch === "\n") { out += "<br>"; return; }
          const ts = a0 + i * 0.028;
          if (p.decode === false) out += ch;
          else if (t < ts) out += `<span style='opacity:0'>${ch}</span>`;
          else if (t < ts + 0.14 && ch !== " ") out += SCRAMBLE[Math.floor(H.hash(i * 7 + Math.floor(t * 30)) * SCRAMBLE.length)];
          else out += ch;
        });
        big.innerHTML = out;
        if (kick) { kick.style.opacity = H.P(s.local, 0.05, 0.2); kick.style.letterSpacing = `${H.lerp(30, 9, H.E.outCubic(H.P(s.local, 0.05, 0.5)))}px`; }
        if (rule) rule.style.width = `${80 * H.E.outCubic(H.P(s.local, 0.4, 0.6))}%`;
      },
    };
  },
};

export const meter = {
  align: "right top", x: 1028, y: 336, enter: "swing_right", enter_dur: 0.45, exit: "glitch", tilt: { y: -14, sway: 2, freq: 0.19 },
  create(p, H) {
    const n = p.segments ?? 20;
    const el = H.html(`<div class="panel c-meter">${ticks}<div class="ph"><span>${H.markup(p.title)}</span><i class="blink"></i></div>
      <div class="line" style="display:flex;align-items:center;gap:14px">${p.icon ? `<span style="font-size:44px;display:grid;color:rgb(var(--accent))">${H.icon(p.icon)}</span>` : ""}<div class="big"></div></div>
      <div class="segs">${"<i></i>".repeat(n)}</div><div class="warn"><span class="sym" style="color:rgb(var(--accent))">⚠</span><span class="wt"></span></div></div>`);
    if (p.width) el.style.width = `${p.width}px`;
    const segs = [...el.querySelectorAll(".segs i")], big = el.querySelector(".big"), wt = el.querySelector(".wt"), warn = el.querySelector(".warn");
    return {
      el,
      update(t) {
        const v = H.ramp(p.value, t, 0);
        big.textContent = `${v.toFixed(p.decimals ?? 0)}${p.unit ?? "%"}`;
        const on = Math.max(p.min_segments ?? 0, Math.round((v / (p.max ?? 100)) * n));
        const blink = p.blink ? Math.floor(t * p.blink * 2) % 2 : 1;
        segs.forEach((sg, i) => sg.classList.toggle("on", i < on && blink === 1));
        if (p.blink) big.style.opacity = 0.65 + 0.35 * blink;
        let w = null;
        for (const x of p.warn || []) if (t >= (x.at ?? -1)) w = x;
        warn.style.display = w ? "" : "none";
        if (w) { wt.innerHTML = H.markup(w.text); warn.style.opacity = w.blink ? 0.55 + 0.45 * (Math.floor(t * 5) % 2) : 1; }
      },
    };
  },
};

export const list = {
  align: "left top", x: 70, y: 420, enter: "fade", enter_dur: 0.2, exit: "fade",
  create(p, H) {
    const items = p.items || [];
    const el = H.html(`<div class="panel c-list">${p.title ? `<div class="ph"><span>${H.markup(p.title)}</span></div>` : ""}
      ${items.map((it, i) => `<div class="it"><div class="n">${it.icon ? H.icon(it.icon) : p.numbered === false ? "•" : i + 1}</div><div class="t">${H.markup(it.text)}</div></div>`).join("")}</div>`);
    if (p.width) el.style.setProperty("--w", `${p.width}px`);
    const rows = [...el.querySelectorAll(".it")];
    return {
      el,
      update(t) {
        let last = -1;
        rows.forEach((r, i) => {
          const a = items[i].at ?? p.at + 0.25 * i;
          const k = H.E.outBack(H.P(t, a, 0.4));
          r.style.opacity = H.P(t, a, 0.2);
          r.style.transform = `translateX(${(1 - k) * -40}px)`;
          if (t >= a) last = i;
        });
        if (p.highlight !== false) rows.forEach((r, i) => r.classList.toggle("done", i < last));
      },
    };
  },
};

export const counter = {
  align: "center top", x: 540, y: 700, enter: "pop", exit: "fade",
  create(p, H) {
    const el = H.html(`<div class="c-counter"><div class="num"></div>${p.label ? `<div class="lab">${H.markup(p.label)}</div>` : ""}</div>`);
    if (p.size) el.style.setProperty("--size", `${p.size}px`);
    const num = el.querySelector(".num");
    return {
      el,
      update(t) {
        const v = H.lerp(p.from ?? 0, p.to ?? 100, H.E.outCubic(H.P(t, p.count_at ?? p.at, p.dur ?? 1.2)));
        let s = v.toFixed(p.decimals ?? 0);
        if (p.separator !== false) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, p.separator ?? " ");
        num.innerHTML = H.markup(`${p.prefix ?? ""}${s}${p.suffix ?? ""}`);
      },
    };
  },
};

export const progress = {
  align: "center top", x: 540, y: 1500, enter: "slide_up", exit: "fade",
  create(p, H) {
    const el = H.html(`<div class="c-progress"><div class="lb"><span>${H.markup(p.label ?? "")}</span><span class="rv"></span></div><div class="tr"><i></i></div></div>`);
    if (p.width) el.style.setProperty("--w", `${p.width}px`);
    const bar = el.querySelector(".tr i"), rv = el.querySelector(".rv");
    return {
      el,
      update(t) {
        const v = H.ramp(p.value, t, 0);
        bar.style.width = `${H.clamp(v / (p.max ?? 100)) * 100}%`;
        rv.innerHTML = H.markup(H.fmt(p.right ?? "{v}%", { v: v.toFixed(p.decimals ?? 0) }));
      },
    };
  },
};

export const choices = {
  align: "left top", x: 70, y: 930, enter: "none", exit: "fade",
  create(p, H) {
    const opts = p.options || [];
    const el = H.html(`<div class="c-choices">${opts.map((o) => `<div class="choice" style="--accent:${H.rgb(o.color || "teal")}"><div class="key">${H.markup(o.key)}</div><div class="txt">${H.markup(o.text)}</div></div>`).join("")}</div>`);
    if (p.width) el.style.setProperty("--w", `${p.width}px`);
    const cs = [...el.querySelectorAll(".choice")];
    return {
      el,
      update(t) {
        cs.forEach((c, i) => {
          const a = p.at + i * (p.stagger ?? 0.16);
          const k = H.E.outBack(H.P(t, a, 0.5));
          const o = opts[i];
          const next = opts[i + 1];
          let hl = 0;
          if (o.highlight_at != null && t >= o.highlight_at) {
            const end = next && next.highlight_at != null ? next.highlight_at : (p.alternate_from ?? 1e9);
            if (t < end) hl = 1;
          }
          if (p.alternate_from != null && t >= p.alternate_from) hl = Math.floor((t - p.alternate_from) / (p.period ?? 0.75)) % opts.length === i ? 1 : 0.15;
          if (o.highlight_at != null) hl *= H.P(t, o.highlight_at, 0.15);
          c.style.opacity = H.P(t, a, 0.2);
          c.style.transform = `rotateX(${H.lerp(-95, 0, k)}deg) translateZ(${hl * 30}px) scale(${1 + hl * 0.035})`;
          c.style.setProperty("--hl", hl);
          c.style.setProperty("--sheen", `${H.lerp(-120, 480, ((t - a) * 0.55) % 1.6)}%`);
        });
      },
    };
  },
};
