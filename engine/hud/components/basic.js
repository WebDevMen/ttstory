// Basic HUD components: frame, edge, marker, chip, alert, stamp, cta, text, image, lower_third.
// Each component: { align, enter, exit, ..., create(props, H) -> { el, update(t, s) } }.
// s = { ei (enter progress 0..1), eo (exit progress 0..1), local (t - at), accent "r,g,b", scene, x, y }.

export const frame = {
  align: "left top", x: 0, y: 0, enter: "none", exit: "none",
  create(p, H) {
    const tb = p.topbar === false ? null : (p.topbar || {});
    const el = H.html(`<div class="c-frame">
      ${p.brackets === false ? "" : '<div class="bracket tl"></div><div class="bracket tr"></div><div class="bracket bl"></div><div class="bracket br"></div>'}
      ${tb ? `<div class="topbar"><span class="l">${tb.dot === false ? "" : '<i class="dot"></i>'}<span class="lt"></span></span><span class="r"></span></div>` : ""}
    </div>`);
    if (tb && tb.right_color) el.querySelector(".r").style.setProperty("--rc", H.rgb(tb.right_color));
    const br = [...el.querySelectorAll(".bracket")];
    const bar = el.querySelector(".topbar");
    return {
      el,
      update(t, s) {
        const boot = p.boot === false ? 1 : H.E.outExpo(H.P(t, 0.05, 0.6));
        const alert = (p.alerts || []).find((a) => t >= a.at && t < a.at + (a.dur ?? 0.5));
        br.forEach((b, i) => {
          const dx = [1, -1, 1, -1][i] * (1 - boot) * 380, dy = [1, 1, -1, -1][i] * (1 - boot) * 760;
          b.style.setProperty("--accent", alert && Math.floor(t * 20) % 2 ? H.rgb(alert.color || "red") : s.scene.accent);
          b.style.transform = `translate(${dx}px, ${dy}px)`;
          b.style.opacity = 0.85 * boot;
        });
        if (bar) {
          const sc = H.sceneAt(t);
          const ck = sc.clock || [1, 12, 0];
          const sec = Math.floor(t - sc.start);
          const vars = { day: ck[0], time: `${String(ck[1]).padStart(2, "0")}:${String(ck[2]).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`, scene: sc.id };
          bar.querySelector(".lt").innerHTML = H.markup(H.fmt(tb.left ?? "ДЕНЬ {day} · {time}", vars));
          bar.querySelector(".r").innerHTML = H.markup(H.fmt(tb.right ?? "", vars));
          bar.style.opacity = H.P(t, 0.35, 0.3) * (Math.floor(t * 30) % 47 === 0 ? 0.4 : 1);
        }
      },
    };
  },
};

export const edge = {
  align: "left top", x: 0, y: 0, enter: "fade", enter_dur: 0.3, exit: "fade", exit_dur: 0.15,
  create(p, H) {
    const el = H.html('<div class="c-edge"></div>');
    return {
      el,
      update(t, s) {
        let a;
        if (p.decay) a = (p.amp ?? 0.75) * (1 - H.clamp(s.local / Math.max(0.01, (p.until - p.at))));
        else { const mn = p.min ?? 0.55; a = mn + (1 - mn) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (p.freq ?? 1.15))); }
        el.style.opacity = a;
        el.style.display = a > 0.001 ? "" : "none";
      },
    };
  },
};

export const marker = {
  align: "center top", x: 540, y: 214, enter: "pop", enter_dur: 0.5, exit: "glitch", exit_dur: 0.2, float: { amp: 7, freq: 0.38 }, tilt: { sway: 5, freq: 0.27 },
  create(p, H) {
    const el = H.html(`<div class="c-marker"><div class="ic">${H.icon(p.icon || "check")}</div><div class="tx">${H.markup(p.text)}</div></div>`);
    const ic = el.querySelector(".ic");
    return {
      el,
      update(t, s) {
        ic.style.transform = `scale(${1 + 0.12 * Math.pow(Math.max(0, Math.sin(s.local * Math.PI * 1.6)), 6)})`;
        el.style.translate = `0 ${(1 - H.E.outBack(s.ei)) * -30}px`;
      },
    };
  },
};

export const chip = {
  align: "left top", enter: "pop", enter_dur: 0.3, exit: "glitch",
  create(p, H) {
    const el = H.html(`<div class="c-chip">${p.icon ? `<span>${H.icon(p.icon)}</span>` : ""}<span>${H.markup(p.text)}</span></div>`);
    return {
      el,
      update(t) {
        const b = p.blink ?? 0;
        el.style.opacity = b ? (Math.floor(t * b * 2) % 2 ? 1 : 0.55) : 1;
      },
    };
  },
};

export const alert = {
  align: "center top", x: 540, y: 214, enter: "zoom", enter_dur: 0.3, exit: "glitch",
  create(p, H) {
    const el = H.html(`<div class="c-alert"><span style="font-size:50px;display:grid">${H.icon(p.icon || "warning_solid")}</span><span>${H.markup(p.text)}</span></div>`);
    return {
      el,
      update(t, s) {
        const st = p.strobe ?? 0.7;
        el.style.opacity = s.local < st ? (Math.floor(t * 10) % 2 ? 1 : 0.25) : 0.75 + 0.25 * Math.sin(t * 10);
      },
    };
  },
};

export const stamp = {
  align: "center middle", x: 540, y: 1060, enter: "stamp", enter_dur: 0.18, exit: "fade", exit_dur: 0.15, tilt: { z: -3 },
  create(p, H) {
    const el = H.html(`<div class="c-stamp">${p.icon ? `<span style="display:grid;font-size:44px">${H.icon(p.icon)}</span>` : ""}<span>${H.markup(p.text)}</span></div>`);
    return { el, update() {} };
  },
};

export const cta = {
  align: "center top", x: 540, y: 1262, enter: "slide_up", enter_dur: 0.45, exit: "fade",
  create(p, H) {
    const lead = p.emoji ? H.emoji(p.emoji) : p.icon ? H.icon(p.icon) : "";
    const el = H.html(`<div class="c-cta ${p.style === "accent" ? "accent" : ""}">${lead ? `<span class="em">${lead}</span>` : ""}<span>${H.markup(p.text)}</span></div>`);
    const em = el.querySelector(".em");
    return {
      el,
      update(t) {
        el.style.scale = 1 + 0.03 * Math.sin(t * 7);
        if (em) em.style.transform = `translateY(${Math.abs(Math.sin(t * 6)) * 9}px)`;
      },
    };
  },
};

export const text = {
  align: "center top", enter: "slide_up", enter_dur: 0.4, exit: "fade",
  create(p, H) {
    const cls = ["c-text", p.style || "", p.font || ""].join(" ");
    const el = H.html(`<div class="${cls}"></div>`);
    el.innerHTML = H.markup(p.text);
    if (p.size) el.style.setProperty("--size", `${p.size}px`);
    if (p.weight) el.style.setProperty("--weight", p.weight);
    if (p.width) el.style.width = `${p.width}px`;
    el.style.textAlign = p.text_align || "center";
    if (p.ink) el.style.color = `rgb(${H.rgb(p.ink)})`;
    return {
      el,
      update(t, s) {
        if (p.typewriter) {
          const n = Math.floor(H.clamp(s.local / p.typewriter) * String(p.text).length);
          el.innerHTML = H.markup(String(p.text).slice(0, n));
        }
      },
    };
  },
};

export const image = {
  align: "center middle", enter: "pop", exit: "fade",
  create(p, H) {
    const src = p.emoji ? null : (p.src.startsWith("/") ? p.src : `/projects/${H.TL.project}/${p.src}`);
    const el = H.html(`<div class="c-image" style="width:${p.width ?? 200}px;height:${p.height ?? p.width ?? 200}px">${src ? `<img src="${src}" alt="">` : `<div style="font-size:${p.width ?? 200}px;line-height:1">${H.emoji(p.emoji)}</div>`}</div>`);
    return {
      el,
      update(t) {
        el.style.transform = `translateY(${p.bob ? Math.sin(t * 3) * p.bob : 0}px) rotate(${p.spin ? t * p.spin : (p.wiggle ? Math.sin(t * 4) * p.wiggle : 0)}deg)`;
      },
    };
  },
};

export const lower_third = {
  align: "left top", x: 60, y: 1500, enter: "slide_left", exit: "fade",
  create(p, H) {
    const el = H.html(`<div class="c-lower"><div class="bar"></div><div class="bx"><div class="t1">${H.markup(p.title)}</div>${p.subtitle ? `<div class="t2">${H.markup(p.subtitle)}</div>` : ""}</div></div>`);
    return { el, update() {} };
  },
};
