// holo3d: a glass panel with a live three.js wireframe model (engine/hud/models/*), labels pinned to model points,
// an optional flag (big label with a stem) and an optional row of steps.
import MODELS from "../models/index.js";

export const holo3d = {
  align: "left top", x: 50, y: 336, enter: "swing_left", enter_dur: 0.5, exit: "glitch", tilt: { x: 4, sway: 3, freq: 0.19 },
  create(p, H) {
    const w = p.width ?? 560, h = p.height ?? 560, head = 56;
    const steps = p.steps || [];
    const el = H.html(`<div class="panel c-holo" style="width:${w}px;height:${h}px;padding:20px 22px">
      <i class="tick a"></i><i class="tick b"></i><i class="tick c"></i><i class="tick d"></i>
      <div class="ph"><span class="ttl"></span><span class="rt">${p.right ? "" : '<i class="blink"></i>'}</span></div>
      <canvas width="${w}" height="${h - head - (steps.length ? 60 : 0)}" style="top:${head}px;width:${w}px;height:${h - head - (steps.length ? 60 : 0)}px"></canvas>
      <div class="labels"></div>
      ${steps.length ? `<div class="steps">${steps.map((s) => `<span>${H.markup(s.text)}</span>`).join("")}</div>` : ""}
    </div>`);
    const canvas = el.querySelector("canvas");
    const make = MODELS[p.model];
    if (!make) throw new Error(`unknown holo3d model '${p.model}'`);
    const model = make(canvas, H, p.model_opts || {});
    const labels = (p.labels || []).map((l) => {
      const d = document.createElement("div");
      d.className = "hlabel";
      d.innerHTML = H.markup(l.text);
      if (l.color) d.style.setProperty("--lc", H.rgb(l.color));
      el.querySelector(".labels").appendChild(d);
      return [l, d];
    });
    let flag = null;
    if (p.flag) {
      flag = H.html(`<div class="flag"><div class="f1"></div><div class="f2"></div><div class="stem"></div></div>`);
      if (p.flag.color) flag.style.setProperty("--fc", H.rgb(p.flag.color));
      el.appendChild(flag);
    }
    const ttl = el.querySelector(".ttl"), rt = el.querySelector(".rt");
    const stepEls = [...el.querySelectorAll(".steps span")];
    return {
      el,
      update(t, s) {
        canvas.style.filter = `drop-shadow(0 0 3px rgba(${s.accent},.9)) drop-shadow(0 0 12px rgba(${s.accent},.42))`;
        const params = {};
        for (const [k, v] of Object.entries(p.params || {})) params[k] = H.ramp(v, t, 0);
        const pts = model.render(s.local, params) || {};
        let title = p.title ?? "";
        for (const a of p.title_alt || []) if (t >= a.at) title = a.text;
        ttl.innerHTML = H.markup(title);
        if (p.right) rt.innerHTML = H.markup(H.fmt(p.right, Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(Math.round(v * 100)).padStart(3, "0")]))));
        labels.forEach(([l, d], i) => {
          const pt = pts[l.key] || [-999, -999];
          const li = H.P(t, l.at ?? p.at + 0.35 + i * 0.18, 0.25);
          d.style.left = `${pt[0]}px`;
          d.style.top = `${pt[1] + head}px`;
          d.style.opacity = li;
          d.style.transform = `translate(-50%, -50%) scale(${H.lerp(0.7, 1, H.E.outBack(li))})`;
        });
        if (flag) {
          const f = p.flag, pt = pts[f.key] || [w / 2, h / 2];
          const k = H.E.outCubic(H.P(t, f.at ?? p.at, 0.4));
          let t1 = f.title, t2 = f.subtitle ?? "";
          for (const a of f.alt || []) if (t >= a.at) { t1 = a.title ?? t1; t2 = a.subtitle ?? t2; }
          flag.querySelector(".f1").innerHTML = H.markup(t1);
          flag.querySelector(".f2").innerHTML = H.markup(t2);
          flag.style.left = `${pt[0]}px`;
          flag.style.top = `${pt[1] + head}px`;
          flag.style.opacity = k;
          flag.style.transform = `translate(-50%, -100%) translateY(${(1 - H.E.outBack(k)) * -26}px) scale(${1 + 0.04 * Math.sin(t * 7)})`;
        }
        stepEls.forEach((e, i) => { e.style.opacity = H.lerp(0.3, 1, H.P(t, steps[i].at ?? 1e9, 0.2)); });
      },
    };
  },
};
