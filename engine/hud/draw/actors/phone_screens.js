// Library (since «Выпадение. Часть 2», projects/vanish2). Экраны телефона — содержимое для `phone` (screen: app, children).
// Координаты — пиксели экрана (0..w, 0..h), origin — верхний левый угол.
//
// phone_gallery: галерея — сетка 3 в ряд из миниатюр Заречья (набережная, карусель, школа, дом с синей дверью, улица,
//   парк); n (дорожка — сколько миниатюр видно, счёт растёт), total (подпись «+214»), scroll (дорожка, px), ira: [номера
//   миниатюр, на которых на заднем плане женщина с пучком и двумя стаканами], sel (дорожка — номер выделенной, −1 нет),
//   title, date
// chat_screen: мессенджер; name, avatar (буква), msgs: [{text, time, me, photo: true — размытое фото «НЕ ОТКРЫТО»}],
//   hl (дорожка — номер подсвеченного сообщения, −1 нет)
// comments: пост новостей со снимком Заречья и лентой комментариев; count: {from, to, at, dur} (счётчик комментариев),
//   items: [{name, text}], scroll (дорожка, px), hl (дорожка — номер подсвеченного комментария)

const ORANGE = "#ffb23e";
const INTER = `'Inter', sans-serif`, MONO = `'IBM Plex Mono', monospace`;   // single quotes: used inside style="…" attributes

// mini illustrations of Заречье for thumbnails (s x s px); kind 0..5; withIra — a tiny woman with a bun and two cups
function thumb(kind, s, withIra, seed) {
  const k = s / 100;
  const sky = `<rect width="${s}" height="${s}" fill="#9cc8e8"/>`;
  let g = sky;
  const roofs = ["#c8553d", "#3d7fb8", "#e0a040"];
  if (kind === 0) {           // embankment
    g += `<rect y="${40 * k}" width="${s}" height="${8 * k}" fill="#8fae6a"/>`;
    for (let i = 0; i < 5; i++) g += `<rect x="${i * 22 * k}" y="${26 * k}" width="${16 * k}" height="${14 * k}" fill="#f2e6d0"/><path d="M${i * 22 * k - 2 * k},${26 * k} l${10 * k},${-7 * k} l${10 * k},${7 * k}Z" fill="${roofs[i % 3]}"/>`;
    g += `<rect y="${48 * k}" width="${s}" height="${26 * k}" fill="#4f82a2"/><path d="M${20 * k},${60 * k} q4,-4 8,0 q4,4 8,0" stroke="#eaf4fa" stroke-width="${2 * k}" fill="none"/>`;
    g += `<rect y="${74 * k}" width="${s}" height="${26 * k}" fill="#d6c8b2"/><rect y="${70 * k}" width="${s}" height="${4 * k}" fill="#e9dfcf"/>`;
  } else if (kind === 1) {    // carousel in a park
    g += `<rect y="${62 * k}" width="${s}" height="${38 * k}" fill="#7ea35a"/>`;
    g += `<circle cx="${14 * k}" cy="${56 * k}" r="${14 * k}" fill="#5f8a46"/><circle cx="${88 * k}" cy="${54 * k}" r="${16 * k}" fill="#6f9a52"/>`;
    g += `<path d="M${30 * k},${42 * k} L${50 * k},${20 * k} L${70 * k},${42 * k}Z" fill="#d8463a"/><path d="M${45 * k},${42 * k} L${50 * k},${20 * k} L${55 * k},${42 * k}Z" fill="#f6f2ea"/>`;
    g += `<rect x="${48 * k}" y="${42 * k}" width="${4 * k}" height="${24 * k}" fill="#f2e6c8"/><ellipse cx="${50 * k}" cy="${68 * k}" rx="${22 * k}" ry="${5 * k}" fill="#8a3a32"/>`;
  } else if (kind === 2) {    // school yard
    g += `<rect y="${66 * k}" width="${s}" height="${34 * k}" fill="#b8a890"/><rect x="${10 * k}" y="${28 * k}" width="${80 * k}" height="${40 * k}" fill="#e2c8a8"/>`;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g += `<rect x="${16 * k + i * 19 * k}" y="${34 * k + j * 16 * k}" width="${10 * k}" height="${10 * k}" fill="#6a7a88"/>`;
    g += `<rect x="${10 * k}" y="${24 * k}" width="${80 * k}" height="${5 * k}" fill="#c8553d"/>`;
  } else if (kind === 3) {    // house with the blue door
    g += `<rect y="${72 * k}" width="${s}" height="${28 * k}" fill="#7ea35a"/><rect x="${24 * k}" y="${36 * k}" width="${52 * k}" height="${38 * k}" fill="#f6d9a8"/>`;
    g += `<path d="M${18 * k},${38 * k} L${50 * k},${16 * k} L${82 * k},${38 * k}Z" fill="#c8553d"/><rect x="${55 * k}" y="${50 * k}" width="${13 * k}" height="${24 * k}" fill="#2f6fc0"/><rect x="${32 * k}" y="${46 * k}" width="${14 * k}" height="${12 * k}" fill="#9cd0f0"/>`;
  } else if (kind === 4) {    // street
    g += `<rect y="${70 * k}" width="${s}" height="${30 * k}" fill="#8e8a84"/>`;
    for (let i = 0; i < 4; i++) g += `<rect x="${i * 26 * k}" y="${(22 + (i % 2) * 8) * k}" width="${24 * k}" height="${48 * k}" fill="${["#f2e6d0", "#e9d2b0", "#f6efe2", "#e2c8a8"][i]}"/><path d="M${i * 26 * k},${(22 + (i % 2) * 8) * k} h${24 * k} l${-12 * k},${-8 * k}Z" fill="${roofs[i % 3]}"/>`;
  } else {                    // park alley
    g += `<rect y="${56 * k}" width="${s}" height="${44 * k}" fill="#7ea35a"/><path d="M${40 * k},${100 * k} L${48 * k},${56 * k} L${52 * k},${56 * k} L${60 * k},${100 * k}Z" fill="#d6c8b2"/>`;
    for (let i = 0; i < 4; i++) g += `<circle cx="${(10 + i * 27) * k}" cy="${46 * k}" r="${13 * k}" fill="${i % 2 ? "#5f8a46" : "#6f9a52"}"/>`;
  }
  if (withIra) {
    const x = (kind % 2 ? 78 : 20) * k, y = (kind === 0 ? 92 : 86) * k;
    g += `<rect x="${x - 3 * k}" y="${y - 16 * k}" width="${6 * k}" height="${12 * k}" rx="${2 * k}" fill="#d9c9a8"/><rect x="${x - 2.5 * k}" y="${y - 4 * k}" width="${5 * k}" height="${4 * k}" fill="#2f3540"/>`;
    g += `<circle cx="${x}" cy="${y - 19 * k}" r="${3 * k}" fill="#f1d2bd"/><circle cx="${x}" cy="${y - 23 * k}" r="${2 * k}" fill="#3a2a22"/>`;
    g += `<rect x="${x + 3 * k}" y="${y - 12 * k}" width="${2.4 * k}" height="${3.2 * k}" fill="#f4f1ea"/><rect x="${x - 5.4 * k}" y="${y - 12 * k}" width="${2.4 * k}" height="${3.2 * k}" fill="#f4f1ea"/>`;
  }
  return g;
}

export const phone_gallery = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 464, h = p.h ?? 824, gap = 4, cols = 3, s = (w - gap * (cols - 1)) / cols;
    const ira = new Set(p.ira ?? []);
    const N = p.count ?? 30;
    const el = H.div(`width:${w}px;height:${h}px;overflow:hidden;background:#0d0e10`);
    const head = H.div(`left:0;top:0;width:${w}px;height:150px;background:#0d0e10;z-index:2`);
    head.innerHTML = `<div style="position:absolute;left:26px;top:58px;font:800 40px ${INTER};color:#fff">${p.title ?? "Галерея"}</div>
      <div style="position:absolute;left:26px;top:108px;font:600 22px ${INTER};color:#9aa0a8">${p.date ?? "Сегодня"}</div>`;
    const badge = H.div(`left:${w - 150}px;top:62px;width:124px;height:44px;border-radius:22px;background:${ORANGE};font:800 26px/44px ${INTER};color:#16181c;text-align:center`, p.total ?? "+214");
    head.appendChild(badge);
    const grid = H.div(`left:0;top:150px;width:${w}px;height:${Math.ceil(N / cols) * (s + gap)}px`);
    const cells = [];
    for (let i = 0; i < N; i++) {
      const x = (i % cols) * (s + gap), y = Math.floor(i / cols) * (s + gap);
      const c = H.svg(thumb(i % 6 === 5 && i % 4 === 0 ? 3 : [0, 1, 2, 3, 4, 5][(i * 7 + 3) % 6], s, ira.has(i), i), s, s);
      c.style.left = `${x}px`; c.style.top = `${y}px`;
      grid.appendChild(c);
      cells.push(c);
    }
    const ring = H.div(`width:${s}px;height:${s}px;box-shadow:inset 0 0 0 5px ${ORANGE};display:none`);
    grid.appendChild(ring);
    el.append(grid, head);
    return {
      el, w, h,
      update(t, it) {
        const n = it.v("n", N);
        cells.forEach((c, i) => (c.style.opacity = i < n ? 1 : 0));
        grid.style.top = `${150 - it.v("scroll", 0)}px`;
        const sel = Math.round(it.v("sel", -1));
        if (sel >= 0 && sel < N) { ring.style.display = ""; ring.style.left = `${(sel % cols) * (s + gap)}px`; ring.style.top = `${Math.floor(sel / cols) * (s + gap)}px`; } else ring.style.display = "none";
      },
    };
  },
};

export const chat_screen = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 464, h = p.h ?? 824;
    const el = H.div(`width:${w}px;height:${h}px;overflow:hidden;background:#e9e4dc`);
    el.innerHTML = `<div style="position:absolute;left:0;top:0;width:${w}px;height:140px;background:#f7f5f1;border-bottom:2px solid #d8d2c8"></div>
      <div style="position:absolute;left:24px;top:62px;width:58px;height:58px;border-radius:29px;background:#d9c9a8;font:800 30px/58px ${INTER};color:#5a4636;text-align:center">${p.avatar ?? "И"}</div>
      <div style="position:absolute;left:98px;top:62px;font:800 30px ${INTER};color:#1b1d20">${p.name ?? "Ира"}</div>
      <div style="position:absolute;left:98px;top:100px;font:600 20px ${INTER};color:#8a857c">${p.status ?? "была в 09:53"}</div>`;
    const msgs = p.msgs ?? [];
    const bubbles = [];
    let y = 180;
    msgs.forEach((m) => {
      const bw = m.photo ? 300 : Math.min(w - 90, 40 + (m.text ?? "").length * 13);
      const x = m.me ? w - 24 - bw : 24;
      const b = H.div(`left:${x}px;top:${y}px;width:${bw}px;border-radius:22px;background:${m.me ? "#d8ecc8" : "#ffffff"};padding:0;box-shadow:0 1px 2px rgba(0,0,0,.12)`);
      if (m.photo) {
        b.innerHTML = `<div style="margin:8px;height:300px;border-radius:16px;background:linear-gradient(160deg,#dcd6cc,#a9a196);filter:blur(1px)"></div>
          <div style="position:absolute;left:8px;right:8px;top:8px;height:300px;border-radius:16px;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font:800 24px ${MONO};letter-spacing:2px;color:#fff;text-shadow:0 1px 3px #000">${m.label ?? "НЕ ОТКРЫТО"}</div>
          <div style="padding:0 18px 12px;text-align:right;font:600 18px ${INTER};color:#8a857c">${m.time ?? ""}</div>`;
        y += 360;
      } else {
        b.innerHTML = `<div style="padding:16px 20px 6px;font:600 26px/1.3 ${INTER};color:#1b1d20">${m.text ?? ""}</div><div style="padding:0 18px 12px;text-align:right;font:600 18px ${INTER};color:#8a857c">${m.time ?? ""}</div>`;
        y += 40 + Math.ceil(((m.text ?? "").length * 13) / (w - 130)) * 34 + 50;
      }
      el.appendChild(b);
      bubbles.push(b);
    });
    return {
      el, w, h,
      update(t, it) {
        const hl = Math.round(it.v("hl", -1));
        bubbles.forEach((b, i) => (b.style.boxShadow = i === hl ? `0 0 0 4px ${ORANGE}, 0 1px 2px rgba(0,0,0,.12)` : "0 1px 2px rgba(0,0,0,.12)"));
      },
    };
  },
};

export const comments = {
  origin: "top-left",
  create(p, H) {
    const w = p.w ?? 464, h = p.h ?? 824;
    const el = H.div(`width:${w}px;height:${h}px;overflow:hidden;background:#ffffff`);
    const items = p.items ?? [
      { name: "olga_k", text: "я там вырос!!" }, { name: "dimon77", text: "моя школа, второй этаж" }, { name: "marina.s", text: "бабушкин дом на углу ❤️" },
      { name: "artem", text: "карусель скрипела всегда" }, { name: "lyuba", text: "мы на набережной гуляли каждое лето" }, { name: "sergey_v", text: "я вспомнил, где мой дом" },
      { name: "katya", text: "синяя дверь! я помню её" }, { name: "pasha", text: "как я мог забыть Заречье" },
    ];
    const head = H.div(`left:0;top:0;width:${w}px;height:420px;background:#fff;z-index:2;border-bottom:2px solid #eee`);
    head.innerHTML = `<div style="position:absolute;left:24px;top:56px;width:52px;height:52px;border-radius:26px;background:#2b2f3a;font:800 20px/52px ${INTER};color:#fff;text-align:center">24</div>
      <div style="position:absolute;left:90px;top:58px;font:800 26px ${INTER};color:#111">Новости 24</div>
      <div style="position:absolute;left:90px;top:90px;font:600 20px ${INTER};color:#888">10:04 · спутник</div>
      <div style="position:absolute;left:24px;top:128px;width:${w - 48}px;height:200px;border-radius:14px;overflow:hidden;background:#8f9a5e">
        <svg width="${w - 48}" height="200" style="position:absolute;left:0;top:0">${Array.from({ length: 40 }, (_, i) => { const r = H.rng(i * 13 + 2); return `<rect x="${r() * (w - 60)}" y="${r() * 190}" width="${14 + r() * 20}" height="${12 + r() * 16}" fill="${["#c8553d", "#3d7fb8", "#e0a040", "#e9e4d8"][i % 4]}"/>`; }).join("")}<path d="M0,150 C120,110 220,170 ${w - 48},120" stroke="#4d6f80" stroke-width="26" fill="none"/></svg>
        <div style="position:absolute;left:14px;bottom:10px;font:800 26px ${MONO};letter-spacing:3px;color:#fff;text-shadow:0 1px 3px #000">ЗАРЕЧЬЕ</div></div>`;
    const cnt = H.div(`left:24px;top:350px;font:800 26px ${INTER};color:#111`);
    head.appendChild(cnt);
    const list = H.div(`left:0;top:420px;width:${w}px`);
    const rows = [];
    for (let i = 0; i < 24; i++) {
      const c = items[i % items.length];
      const row = H.div(`position:relative;left:0;top:0;width:${w - 48}px;margin:0 24px;padding:18px 0;border-bottom:1px solid #f0f0f0`);
      row.innerHTML = `<div style="position:absolute;left:0;top:18px;width:44px;height:44px;border-radius:22px;background:hsl(${(i * 67) % 360},45%,72%)"></div>
        <div style="margin-left:60px;font:800 20px ${INTER};color:#555">${c.name}</div><div style="margin-left:60px;font:600 25px/1.3 ${INTER};color:#111">${c.text}</div>`;
      list.appendChild(row);
      rows.push(row);
    }
    el.append(list, head);
    const C = p.count ?? { from: 12, to: 48000 };
    return {
      el, w, h,
      update(t, it) {
        const a = C.at ?? 0, d = C.dur ?? 2;
        const k = H.clamp((t - a) / d, 0, 1), e = k * k * (3 - 2 * k);
        const n = Math.round(C.from + (C.to - C.from) * e);
        cnt.textContent = `${n.toLocaleString("ru-RU")} комментариев`;
        list.style.top = `${420 - it.v("scroll", 0)}px`;
        const hl = Math.round(it.v("hl", -1));
        rows.forEach((r, i) => (r.style.background = i === hl ? "rgba(255,178,62,.28)" : "transparent"));
      },
    };
  },
};
