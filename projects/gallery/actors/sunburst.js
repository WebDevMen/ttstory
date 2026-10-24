// Example of a project actor: projects/<id>/actors/*.js — every named export becomes `actor: <name>` in this project.
// sunburst: rotating rays behind a title, animated with a paused GSAP timeline that is seeked to the frame time.
//   rays (count), r (radius), color, color2, speed (deg/s)
export const sunburst = {
  origin: "center",
  create(p, H, item) {
    const n = p.rays ?? 16, r = p.r ?? 520, w = r * 2;
    const rays = Array.from({ length: n }, (_, i) => {
      const a0 = (i / n) * 360, a1 = a0 + 180 / n;
      const pt = (a) => `${r + Math.cos((a * Math.PI) / 180) * r * 1.5},${r + Math.sin((a * Math.PI) / 180) * r * 1.5}`;
      return `<path d="M${r},${r} L${pt(a0)} L${pt(a1)} Z" fill="${H.col(i % 2 ? p.color2 ?? "#ffe29a" : p.color ?? "#ffd36b")}"/>`;
    }).join("");
    const svg = H.svg(`<g class="rays">${rays}</g><circle cx="${r}" cy="${r}" r="${r * 0.28}" fill="${H.col(p.core ?? "#fff4d0")}"/>`, w, w);
    const g = svg.querySelector(".rays");
    // a GSAP timeline is just a function of time: build it paused, then seek it in update()
    const tl = H.gsap.timeline({ paused: true })
      .fromTo(g, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.7, ease: "back.out(1.6)" })
      .to(g, { rotation: (p.speed ?? 20) * 30, duration: 30, ease: "none" }, 0);
    return { el: svg, w, h: w, update(t) { tl.seek(Math.max(0, t - (item.at > -1e8 ? item.at : 0))); } };
  },
};
