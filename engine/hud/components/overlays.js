// World-anchored overlays: prohibit, hazard, pips, radar, target. Use `anchor: <name>` (defined per shot in project.yaml)
// so they stick to an object in the picture while the camera moves; or plain x/y.

export const prohibit = {
  align: "center middle", enter: "zoom", enter_dur: 0.45, exit: "glitch",
  create(p, H) {
    const size = p.size ?? 380;
    const el = H.html(`<div class="c-prohibit" style="--size:${size}px">
      <svg viewBox="-190 -190 380 380">
        <circle class="ring" r="160" fill="rgba(var(--accent),.10)" stroke="rgb(var(--accent))" stroke-width="22" transform="rotate(-90)"/>
        <line class="slash" x1="-113" y1="-113" x2="113" y2="113" stroke="rgb(var(--accent))" stroke-width="22" stroke-linecap="round"/>
        <g class="ticks" stroke="rgb(var(--accent))" stroke-width="4" opacity=".8"><line x1="0" y1="-186" x2="0" y2="-172"/><line x1="0" y1="172" x2="0" y2="186"/><line x1="-186" y1="0" x2="-172" y2="0"/><line x1="172" y1="0" x2="186" y2="0"/></g>
      </svg>
      <div class="lbl">${p.label ? `<div class="a">${H.markup(p.label)}</div>` : ""}${p.sublabel ? `<div class="b">${H.markup(p.sublabel)}</div>` : ""}</div></div>`);
    const ring = el.querySelector(".ring"), slash = el.querySelector(".slash"), tk = el.querySelector(".ticks"), lbl = el.querySelector(".lbl");
    const circ = 2 * Math.PI * 160;
    ring.setAttribute("stroke-dasharray", circ);
    slash.setAttribute("stroke-dasharray", 320);
    return {
      el,
      update(t, s) {
        el.style.scale = 1 + 0.03 * Math.sin(t * 9);
        ring.setAttribute("stroke-dashoffset", circ * (1 - H.E.outCubic(H.P(s.local, 0.06, 0.32))));
        slash.setAttribute("stroke-dashoffset", 320 * (1 - H.E.outCubic(H.P(s.local, 0.31, 0.18))));
        tk.setAttribute("transform", `rotate(${t * 60})`);
        lbl.style.opacity = H.P(s.local, 0.41, 0.2);
        lbl.style.transform = `translateX(-50%) translateY(${(1 - H.E.outCubic(H.P(s.local, 0.41, 0.3))) * 20}px)`;
      },
    };
  },
};

export const hazard = {
  align: "center bottom", enter: "flip_up", enter_dur: 0.5, exit: "glitch", origin: "50% 100%", tilt: { x: 24, perspective: 700 },
  create(p, H) {
    const el = H.html(`<div class="c-hazard"><div class="sy sym">${p.symbol ?? "☣"}</div><div><div class="t1">${H.markup(p.title ?? "DANGER")}</div>${p.subtitle !== "" ? `<div class="t2">${H.markup(p.subtitle ?? "BIOHAZARD")}</div>` : ""}</div></div>`);
    return {
      el,
      update(t) {
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (p.freq ?? 1.6));
        el.style.setProperty("--pulse", pulse);
        el.style.scale = 1 + 0.05 * pulse;
        el.style.rotate = `${Math.sin(t * 1.3) * 2}deg`;
      },
    };
  },
};

export const pips = {
  align: "center top", enter: "pop", enter_dur: 0.3, exit: "glitch",
  create(p, H) {
    const offs = p.offs || [];
    const el = H.html(`<div class="c-pips">${p.label ? `<span class="k">${H.markup(p.label)}</span>` : ""}<span class="pp">${"<i></i>".repeat(offs.length || p.count || 3)}</span><span class="end sym">${p.symbol ?? "☠"}</span></div>`);
    const ps = [...el.querySelectorAll(".pp i")], end = el.querySelector(".end");
    return {
      el,
      update(t) {
        ps.forEach((pi, i) => {
          const off = offs[i] ?? 1e9;
          const gone = t >= off;
          pi.style.background = gone ? "transparent" : "rgba(var(--accent),.9)";
          pi.style.opacity = gone ? 0.35 : 1;
          pi.style.transform = `scale(${gone ? 0.8 : 1 + 0.15 * Math.max(0, 1 - (off - t) * 3) * (Math.floor(t * 12) % 2)})`;
        });
        const k = H.P(t, offs[offs.length - 1] ?? 1e9, 0.2);
        end.style.opacity = 0.25 + 0.75 * k;
        end.style.transform = `scale(${1 + 0.4 * Math.sin(k * Math.PI)})`;
      },
    };
  },
};

export const radar = {
  align: "right top", x: 1040, y: 290, enter: "pop", enter_dur: 0.5, exit: "glitch",
  create(p, H) {
    const size = p.size ?? 360;
    const el = H.html(`<div class="c-radar" style="--size:${size}px"><div class="disc"><svg viewBox="-180 -180 360 360">
      <defs><radialGradient id="rg${p.index}" r="1"><stop offset="0" stop-color="rgba(var(--accent),.28)"/><stop offset="1" stop-color="rgba(var(--accent),.04)"/></radialGradient>
      <linearGradient id="sg${p.index}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(var(--accent),0)"/><stop offset="1" stop-color="rgba(var(--accent),.65)"/></linearGradient></defs>
      <circle r="170" fill="url(#rg${p.index})" stroke="rgb(var(--accent))" stroke-width="3"/><circle r="120" fill="none" stroke="rgba(var(--accent),.55)" stroke-width="2"/>
      <circle r="70" fill="none" stroke="rgba(var(--accent),.55)" stroke-width="2"/><line x1="-170" y1="0" x2="170" y2="0" stroke="rgba(var(--accent),.4)" stroke-width="2"/>
      <line x1="0" y1="-170" x2="0" y2="170" stroke="rgba(var(--accent),.4)" stroke-width="2"/>
      <path class="sweep" d="M0 0 L170 0 A170 170 0 0 0 120.2 -120.2 Z" fill="url(#sg${p.index})"/><circle r="7" fill="#fff"/>
      <g class="blip"><circle class="br" r="14" fill="none" stroke="#fff" stroke-width="3"/><circle r="11" fill="rgb(var(--accent))"/><circle r="5" fill="#fff"/></g>
      </svg></div><div class="rl"></div></div>`);
    const disc = el.querySelector(".disc"), sweep = el.querySelector(".sweep"), blip = el.querySelector(".blip"), br = el.querySelector(".br"), rl = el.querySelector(".rl");
    const b = p.blip || null;
    return {
      el,
      update(t, s) {
        disc.style.transform = `rotateX(${H.lerp(80, p.tilt_x ?? 54, H.E.outBack(s.ei))}deg) rotateZ(${Math.sin(t * 0.7) * 6}deg)`;
        const sw = (t * (p.sweep ?? 200)) % 360;
        sweep.setAttribute("transform", `rotate(${sw})`);
        if (b && t >= b.at) {
          const app = H.E.inOut(H.P(t, b.at, (b.until ?? b.at + 3) - b.at));
          const from = b.from ?? [150, -38], to = b.to ?? [58, -13];
          const r = H.lerp(from[0], to[0], app), th = (H.lerp(from[1], to[1], app) * Math.PI) / 180;
          const since = (((sw - ((th * 180) / Math.PI + 360) % 360) + 360) % 360);
          blip.setAttribute("transform", `translate(${Math.cos(th) * r},${Math.sin(th) * r})`);
          blip.style.opacity = Math.max(0.35, Math.exp(-since / 120)) * H.P(t, b.at, 0.15);
          const rp = (t * 1.6) % 1;
          br.setAttribute("r", 12 + rp * 26);
          br.style.opacity = 1 - rp;
          const d = p.dist || [120, 35];
          rl.innerHTML = H.markup(H.fmt(p.label ?? "КОНТАКТ · {dist} М", { dist: Math.round(H.lerp(d[0], d[1], app)) }));
        } else {
          blip.style.opacity = 0;
          rl.innerHTML = H.markup(p.idle ?? "СОНАР · ПОИСК");
        }
      },
    };
  },
};

export const target = {
  align: "center middle", enter: "fade", enter_dur: 0.3, exit: "fade",
  create(p, H) {
    const el = H.html(`<div class="c-target"><i class="cn a"></i><i class="cn b"></i><i class="cn c"></i><i class="cn d"></i><div class="tl">${H.markup(p.label ?? "")}</div></div>`);
    const tl = el.querySelector(".tl");
    if (p.label_align === "right") { tl.style.right = "0"; } else { tl.style.left = "0"; }
    if (!p.label) tl.style.display = "none";
    return {
      el,
      update(t, s) {
        const k = H.E.outCubic(H.P(s.local, 0, 0.5));
        el.style.width = `${(p.w ?? 380) * H.lerp(1.7, 1, k)}px`;
        el.style.height = `${(p.h ?? 230) * H.lerp(1.7, 1, k)}px`;
        tl.style.opacity = H.P(s.local, 0.3, 0.25);
        el.style.opacity = p.pulse ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
      },
    };
  },
};
