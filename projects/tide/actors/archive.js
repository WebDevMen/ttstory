// EMERGENCY ARCHIVE — interface of a leaked survival-protocol recording (projects/tide).
// archive: the "found footage" look of a source (CCTV, phone, dashcam, helmet cam, drone, document scan, cinema)
//          + the protocol corner (PROTOCOL 07, timecode, source) + signal failures at given moments.
// rule_card: a new protocol rule in large type for 1–2 s. Red only for danger.
// Palette: near-black #0a0c0f, steel #3c4650, cold grey #8a96a2, white #f2f4f6, emergency red #e3262f.

const RED = "#e3262f", WHITE = "#f2f4f6", GREY = "#8a96a2", STEEL = "#3c4650", INK = "#0a0c0f";
const MONO = `"IBM Plex Mono", monospace`, COND = `"Oswald", sans-serif`;
const pad = (v, n = 2) => String(Math.max(0, Math.floor(v))).padStart(n, "0");

// look of each recording source: CSS backdrop filter + grain + scanlines + vignette + lens blur
const LOOK = {
  cctv:    { f: "grayscale(1) contrast(1.28) brightness(.92)", grain: 0.2, scan: 0.22, vig: 0.62, blur: 0.6, label: "CAM" },
  phone:   { f: "saturate(.62) contrast(1.08) brightness(.97)", grain: 0.1, scan: 0, vig: 0.4, blur: 0, label: "REC" },
  dash:    { f: "saturate(.45) contrast(1.18) brightness(.9) sepia(.12)", grain: 0.14, scan: 0.08, vig: 0.55, blur: 0.4, label: "DVR" },
  helmet:  { f: "saturate(.55) contrast(1.15) brightness(.95)", grain: 0.13, scan: 0, vig: 0.7, blur: 0.3, label: "CAM" },
  drone:   { f: "saturate(.7) contrast(1.1)", grain: 0.07, scan: 0, vig: 0.3, blur: 0, label: "UAV" },
  doc:     { f: "grayscale(.85) contrast(1.05)", grain: 0.08, scan: 0, vig: 0.35, blur: 0, label: "DOC" },
  cinema:  { f: "saturate(.85) contrast(1.06)", grain: 0.05, scan: 0, vig: 0.38, blur: 0, label: "" },
  alert:   { f: "contrast(1.1)", grain: 0.12, scan: 0.25, vig: 0.5, blur: 0, label: "EAS" },
};

export const archive = {
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, L = LOOK[p.kind ?? "cctv"] ?? LOOK.cctv;
    const el = H.div(`width:${w}px;height:${h}px;pointer-events:none`);
    const tint = H.div(`width:${w}px;height:${h}px;backdrop-filter:${L.f}${L.blur ? ` blur(${L.blur}px)` : ""}`);
    const scan = H.div(`width:${w}px;height:${h}px;opacity:${L.scan};background:repeating-linear-gradient(0deg, rgba(0,0,0,.6) 0 2px, transparent 2px 5px);mix-blend-mode:multiply`);
    const cv = document.createElement("canvas");
    cv.width = 270; cv.height = 480;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:${p.grain ?? L.grain};mix-blend-mode:overlay;image-rendering:pixelated`;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(270, 480);
    const vig = H.div(`width:${w}px;height:${h}px;background:radial-gradient(ellipse 80% 62% at 50% 48%, transparent 50%, rgba(0,0,0,${p.vig ?? L.vig}))`);
    // signal failure layer (canvas bands + label)
    const gl = document.createElement("canvas");
    gl.width = 1080; gl.height = 1920;
    gl.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;opacity:0`;
    const gctx = gl.getContext("2d");
    const nosig = H.div(`left:0;top:880px;width:${w}px;text-align:center;font:600 46px ${MONO};letter-spacing:8px;color:${WHITE};opacity:0;
      text-shadow:0 0 2px #000`, p.nosig ?? "НЕТ СИГНАЛА");
    // protocol corner (top-left) and timecode (top-right): safe zone y 150–300
    const corner = H.div(`left:56px;top:150px;font:600 28px ${MONO};letter-spacing:2px;color:${WHITE};line-height:1.35;
      text-shadow:0 1px 3px rgba(0,0,0,.9)`);
    const proto = H.div("position:relative", "");
    const src = H.div(`position:relative;font-weight:400;font-size:24px;color:${GREY};letter-spacing:1.5px`);
    corner.append(proto, src);
    const tcBox = H.div(`left:${w - 56 - 330}px;top:150px;width:330px;text-align:right;font:600 30px ${MONO};letter-spacing:1px;color:${WHITE};line-height:1.3;
      text-shadow:0 1px 3px rgba(0,0,0,.9)`);
    const tc = H.div("position:relative"), sub = H.div(`position:relative;font-weight:400;font-size:24px;color:${GREY}`);
    tcBox.append(tc, sub);
    const dot = H.div(`left:${w - 56 - 330 - 6}px;top:162px;width:18px;height:18px;border-radius:9px;background:${RED}`);
    // frame lines (thin, steel) — the archive's own frame, not a game HUD
    const frame = H.svg(`<g fill="none" stroke="${WHITE}" stroke-opacity=".55" stroke-width="2">
      <path d="M40,138 h28 M40,138 v28"/><path d="M${w - 40},138 h-28 M${w - 40},138 v28"/></g>`, w, h);
    el.append(tint, scan, cv, vig, gl, frame, dot, corner, tcBox, nosig);
    if (p.ui === false) { corner.style.display = tcBox.style.display = dot.style.display = frame.style.display = "none"; }
    const glitches = (p.glitch ?? []).map((g) => (typeof g === "object" ? g : { at: g, dur: 0.28 }));
    let lastFrame = -1;
    return {
      el, w, h,
      update(t, it) {
        const fr = Math.round(t * 30);
        const stage = it.v("stage", p.stage ?? 0);
        if (fr !== lastFrame) {
          lastFrame = fr;
          const r = H.rng(fr * 7919 + 17), d = img.data;
          for (let i = 0; i < d.length; i += 4) { const v = 70 + r() * 120; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
          ctx.putImageData(img, 0, 0);
        }
        // timecode: start (seconds of the day) + elapsed since the item appeared; stage 2 = jumps
        const t0 = it.at > -1e8 ? it.at : (H.shot?.start ?? 0), el2 = Math.max(0, t - t0);
        let sec = (p.tc ?? 6 * 3600 + 41 * 60) + el2 * (p.tc_rate ?? 1);
        const jumps = p.jumps ?? [];
        for (const j of jumps) if (t >= j.at) sec += j.by;
        let tcs = `${pad(sec / 3600 % 24)}:${pad(sec / 60 % 60)}:${pad(sec % 60)}`;
        if (p.frames !== false) tcs += `:${pad((sec % 1) * 30)}`;
        if (stage >= 2) {
          const rr = H.rng(Math.floor(t * 6) * 31 + 7);
          if (rr() < 0.35) tcs = tcs.replace(/\d/g, (c) => (rr() < 0.3 ? String(Math.floor(rr() * 10)) : c));
          if (rr() < 0.08) tcs = "--:--:--:--";
        }
        tc.textContent = tcs;
        sub.textContent = it.v("date", p.date ?? "14.11.2026");
        proto.innerHTML = `PROTOCOL 07${stage >= 1 ? ` <span style="color:${stage >= 2 ? RED : WHITE};opacity:.9">· ${it.v("status", p.status ?? (stage >= 2 ? "СБОЙ" : "АКТИВЕН"))}</span>` : ""}`;
        src.textContent = it.v("src", p.src ?? "ИСТОЧНИК НЕИЗВЕСТЕН");
        src.style.color = it.v("src_red", 0) ? RED : GREY;
        dot.style.opacity = (p.rec ?? (p.kind === "phone" || p.kind === "dash" || p.kind === "helmet")) ? (Math.sin(t * 5.5) > -0.2 ? 1 : 0.15) : 0;
        // signal failures
        let g = 0, gi = null;
        for (const x of glitches) { if (t >= x.at && t < x.at + x.dur) { g = 1; gi = x; } }
        if (g) {
          const rr = H.rng(fr * 131 + 3);
          gctx.clearRect(0, 0, 1080, 1920);
          const full = gi.full ?? false;
          if (full) { gctx.fillStyle = "rgba(8,9,11,.92)"; gctx.fillRect(0, 0, 1080, 1920); }
          for (let i = 0; i < (full ? 26 : 14); i++) {
            const y = rr() * 1920, hh = 6 + rr() * (full ? 60 : 90), a = 0.25 + rr() * 0.6;
            gctx.fillStyle = rr() < 0.5 ? `rgba(242,244,246,${a * 0.5})` : `rgba(10,12,15,${a})`;
            gctx.fillRect(0, y, 1080, hh);
            if (rr() < 0.3) { gctx.fillStyle = `rgba(227,38,47,${a * 0.35})`; gctx.fillRect(rr() * 200, y + 2, 1080, 3); }
          }
          gl.style.opacity = 1;
          el.style.transform = `translateX(${(rr() - 0.5) * 14}px)`;
          nosig.style.opacity = full || gi.label ? 1 : 0;
          if (gi.label) nosig.textContent = gi.label;
        } else { gl.style.opacity = 0; nosig.style.opacity = 0; el.style.transform = ""; }
      },
    };
  },
};

// rule_card: kicker "ПРАВИЛО 01" (mono) + rule in Oswald, white on a near-black band; danger: true -> red kicker and bar
export const rule_card = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 960, danger = !!p.danger, size = p.size ?? 92;
    const el = H.div(`width:${w}px;pointer-events:none`);
    const band = H.div(`position:relative;width:${w}px;padding:30px 44px 38px;box-sizing:border-box;background:rgba(10,12,15,.86);
      border-left:8px solid ${danger ? RED : WHITE}`);
    const kick = H.div(`position:relative;font:600 30px ${MONO};letter-spacing:4px;color:${danger ? RED : GREY};margin-bottom:10px`, p.kicker ?? "ПРАВИЛО");
    const txt = H.div(`position:relative;font:700 ${size}px/1.06 ${COND};letter-spacing:.5px;color:${WHITE};text-transform:uppercase`, p.text ?? "");
    band.append(kick, txt);
    el.append(band);
    el.style.position = "absolute";
    return {
      el, w, h: null,
      update(t, it) { txt.textContent = it.v("text", p.text ?? ""); kick.textContent = it.v("kicker", p.kicker ?? "ПРАВИЛО"); },
    };
  },
};

// phone_call: smartphone screen (no body — filmed close on a second phone) — incoming / declined / active / dialing.
// state (track): incoming | declined | active | dialing ; name, number, bars (track 0..4), secs (call timer start time)
export const phone_call = {
  origin: "center",
  size_m: { h: 0.15 },
  create(p, H) {
    const w = p.w ?? 600, h = p.h ?? 1220, r = 70;
    const el = H.div(`width:${w}px;height:${h}px`);
    const body = H.div(`width:${w}px;height:${h}px;border-radius:${r}px;background:#050607;box-shadow:0 0 0 10px #1a1d21, 0 0 0 12px #3c4650, 0 40px 90px rgba(0,0,0,.7)`);
    const scr = H.div(`left:22px;top:22px;width:${w - 44}px;height:${h - 44}px;border-radius:${r - 18}px;overflow:hidden;
      background:radial-gradient(ellipse at 50% 30%, #2a3138, #0d1013 70%)`);
    const font = `"Inter", sans-serif`;
    const status = H.div(`left:44px;top:26px;width:${w - 132}px;font:600 26px ${font};color:${WHITE};display:flex;justify-content:space-between`);
    const time = H.div("position:relative", p.clock ?? "06:41");
    const bars = H.svg("", 120, 30); bars.style.cssText = "position:relative";
    status.append(time, bars);
    const notch = H.div(`left:${(w - 44) / 2 - 70}px;top:18px;width:140px;height:38px;border-radius:20px;background:#000`);
    const lab = H.div(`left:0;top:190px;width:${w - 44}px;text-align:center;font:600 28px ${font};color:${GREY};letter-spacing:1px`);
    const name = H.div(`left:0;top:236px;width:${w - 44}px;text-align:center;font:800 76px ${font};color:${WHITE}`, p.name ?? "Глеб");
    const num = H.div(`left:0;top:340px;width:${w - 44}px;text-align:center;font:600 30px "IBM Plex Mono", monospace;color:${GREY}`, p.number ?? "+7 912 406-17-33");
    const own = H.div(`left:${(w - 44) / 2 - 150}px;top:396px;width:300px;text-align:center;font:600 24px ${font};color:${WHITE};
      border:2px solid rgba(242,244,246,.5);border-radius:22px;padding:6px 0`, p.own ?? "Мой номер");
    const ava = H.div(`left:${(w - 44) / 2 - 90}px;top:480px;width:180px;height:180px;border-radius:90px;background:#3c4650;
      font:700 84px ${font};color:${WHITE};text-align:center;line-height:180px`, (p.name ?? "Г")[0]);
    const wave = H.svg("", w - 44, 140); wave.style.top = "720px";
    const timer = H.div(`left:0;top:690px;width:${w - 44}px;text-align:center;font:600 34px "IBM Plex Mono", monospace;color:${WHITE}`);
    const btn = (x, col, ic) => H.div(`left:${x}px;top:${h - 44 - 230}px;width:132px;height:132px;border-radius:66px;background:${col};
      display:flex;align-items:center;justify-content:center`, ic);
    const icPhone = (rot) => `<svg width="62" height="62" viewBox="0 0 24 24" style="transform:rotate(${rot}deg)"><path fill="#fff" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>`;
    const dec = btn(70, RED, icPhone(135)), acc = btn(w - 44 - 70 - 132, "#2fa35a", icPhone(0));
    const end = btn((w - 44) / 2 - 66, RED, icPhone(135));
    const lab2 = H.div(`left:0;top:${h - 44 - 80}px;width:${w - 44}px;font:600 26px ${font};color:${GREY};display:flex;justify-content:space-around`, "<span>Отклонить</span><span>Принять</span>");
    const finger = H.div(`width:120px;height:120px;border-radius:60px;background:radial-gradient(circle, rgba(242,244,246,.55), rgba(242,244,246,0) 70%);opacity:0`);
    scr.append(status, lab, name, num, own, ava, timer, wave, dec, acc, end, lab2, finger);
    el.append(body, scr, notch);
    return {
      el, w, h,
      update(t, it) {
        const st = it.v("state", "incoming"), b = it.v("bars", 3), tap = it.v("tap", 0);
        bars.innerHTML = [0, 1, 2, 3].map((i) => `<rect x="${i * 16}" y="${22 - i * 6}" width="11" height="${8 + i * 6}" rx="2" fill="${i < b ? WHITE : "rgba(242,244,246,.22)"}"/>`).join("")
          + (b < 1.5 ? `<text x="72" y="26" font-size="22" font-family="Inter" font-weight="700" fill="${RED}">!</text>` : "");
        time.textContent = it.v("clock", p.clock ?? "06:41");
        const incoming = st === "incoming", active = st === "active", dialing = st === "dialing", declined = st === "declined";
        lab.textContent = incoming ? "Входящий вызов" : active ? "Вызов идёт" : dialing ? "Вызов…" : "Вызов отклонён";
        lab.style.color = declined ? RED : GREY;
        const ring = incoming ? 1 + 0.04 * Math.sin(t * 14) : 1;
        ava.style.transform = `scale(${ring})`;
        ava.style.boxShadow = incoming || dialing ? `0 0 0 ${10 + 10 * ((t * 1.4) % 1)}px rgba(242,244,246,${0.25 * (1 - ((t * 1.4) % 1))})` : "none";
        dec.style.opacity = acc.style.opacity = lab2.style.opacity = incoming ? 1 : 0;
        end.style.opacity = active || dialing ? 1 : 0;
        timer.style.opacity = active ? 1 : 0;
        const s0 = p.secs ?? 0;
        timer.textContent = `00:${pad(Math.max(0, t - s0))}`;
        wave.style.opacity = active ? 1 : 0;
        if (active) {
          const lv = it.v("level", 0.6);
          let d = "";
          for (let i = 0; i < 48; i++) {
            const a = (0.2 + 0.8 * Math.abs(H.noise(t * 3 + i * 0.37, 5, 1))) * lv * 60, x = 20 + i * ((w - 84) / 47);
            d += `<rect x="${x - 3}" y="${70 - a}" width="6" height="${a * 2}" rx="3" fill="${WHITE}" opacity=".8"/>`;
          }
          wave.innerHTML = d;
        }
        el.style.filter = declined ? "brightness(.8)" : "";
        // finger tap (decline = left, accept = right)
        if (tap) {
          const left = tap < 0;
          finger.style.left = `${left ? 70 : w - 44 - 202}px`; finger.style.top = `${h - 44 - 230}px`;
          finger.style.opacity = 1;
        } else finger.style.opacity = 0;
      },
    };
  },
};

// mark: understated identification frame around a person/object (thin corner brackets) + a two-line label
// w, h (frame size, origin = frame centre), label (Oswald), sub (mono), side: top|bottom, danger (red)
export const mark = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 260, h = p.h ?? 300, c = p.danger ? RED : WHITE, L = Math.min(w, h) * 0.18;
    const el = H.div(`width:${w}px;height:${h}px`);
    const svg = H.svg(`<g fill="none" stroke="${c}" stroke-width="3" stroke-opacity=".9">
      <path d="M0,${L} V0 H${L} M${w - L},0 H${w} V${L} M${w},${h - L} V${h} H${w - L} M${L},${h} H0 V${h - L}"/></g>`, w, h);
    const top = (p.side ?? "top") === "top";
    const lab = H.div(`left:${p.align === "right" ? "auto" : 0}px;${top ? "bottom" : "top"}:${h + 12}px;top:auto;white-space:nowrap;
      background:rgba(10,12,15,.78);padding:8px 14px 10px;border-left:5px solid ${c}`);
    if (top) { lab.style.top = "auto"; lab.style.bottom = `${h + 12}px`; } else { lab.style.top = `${h + 12}px`; }
    lab.innerHTML = `<div style="font:700 46px/1.05 ${COND};color:${WHITE};letter-spacing:.5px;text-transform:uppercase">${p.label ?? ""}</div>`
      + (p.sub ? `<div style="font:400 24px ${MONO};color:${GREY};letter-spacing:1.5px;margin-top:4px">${p.sub}</div>` : "");
    el.append(svg, lab);
    return { el, w, h };
  },
};

// title_card: big episode title — red kicker (PROTOCOL / emergency) + white Oswald title + optional mono line
export const title_card = {
  origin: "center",
  create(p, H) {
    const w = p.w ?? 960;
    const el = H.div(`width:${w}px;text-align:${p.align ?? "left"}`);
    el.innerHTML = `<div style="font:700 ${p.ksize ?? 64}px/1 ${COND};color:${p.kcolor ?? RED};letter-spacing:2px">${p.kicker ?? "ПРОТОКОЛ 07"}</div>
      <div style="font:700 ${p.size ?? 128}px/1 ${COND};color:${WHITE};letter-spacing:1px;text-transform:uppercase;margin-top:8px">${p.text ?? ""}</div>`
      + (p.sub ? `<div style="font:400 30px/1.4 ${MONO};color:${GREY};margin-top:18px;letter-spacing:1px">${p.sub}</div>` : "");
    return { el, w, h: null };
  },
};

// crt_tv: old CRT television on the floor of a dark room, red emergency screen with pixel-mono text.
// screens: [{at, lines: [..], color}] — the text on screen switches at each `at`; glow follows the screen colour.
export const crt_tv = {
  origin: "top-left",
  create(p, H) {
    const w = 1080, h = 1920, id = H.uid("crt");
    const sx = 170, sy = 620, sw = 640, sh = 500;
    const svg = H.svg(`<defs><radialGradient id="${id}r" cx=".5" cy=".55" r=".7"><stop offset="0" class="g0" stop-color="#e3262f" stop-opacity=".55"/><stop offset="1" stop-color="#e3262f" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}s" cx=".5" cy=".5" r=".7"><stop offset="0" class="s0" stop-color="#ff3a3a"/><stop offset="1" class="s1" stop-color="#a0141a"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="#0b0c0e"/><rect y="1240" width="${w}" height="${h - 1240}" fill="#141012"/>
      <ellipse class="room" cx="540" cy="900" rx="900" ry="900" fill="url(#${id}r)"/>
      <path d="M120,1330 C260,1460 420,1380 560,1500 S900,1460 1080,1560" stroke="#050506" stroke-width="10" fill="none"/>
      <path d="M0,1450 C200,1420 300,1600 520,1560 S760,1700 900,1640" stroke="#050506" stroke-width="8" fill="none"/>
      <path d="M380,560 L240,240 M700,560 L860,200" stroke="#2a2c30" stroke-width="6"/>
      <rect x="120" y="560" width="840" height="680" rx="40" fill="#1d1c1e"/><rect x="128" y="568" width="824" height="664" rx="36" fill="none" stroke="#3a383c" stroke-width="4"/>
      <rect x="${sx - 14}" y="${sy - 14}" width="${sw + 28}" height="${sh + 28}" rx="36" fill="#09090a"/>
      <rect class="scr" x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="30" fill="url(#${id}s)"/>
      <g opacity=".5" stroke="#ffd0d0" stroke-width="2" fill="none"><path d="M${sx + 60},${sy} V${sy + sh} M${sx + 74},${sy} V${sy + sh} M${sx},${sy + 120} H${sx + sw} M${sx},${sy + 380} H${sx + sw}"/></g>
      <g opacity=".18">${Array.from({ length: 60 }, (_, i) => `<rect x="${sx}" y="${sy + i * 8.4}" width="${sw}" height="3" fill="#000"/>`).join("")}</g>
      <rect x="${sx + sw + 34}" y="${sy + 30}" width="80" height="420" rx="10" fill="#141315"/>
      <circle cx="${sx + sw + 74}" cy="${sy + 110}" r="26" fill="#2a282c"/><circle cx="${sx + sw + 74}" cy="${sy + 190}" r="26" fill="#2a282c"/><circle class="led" cx="${sx + sw + 74}" cy="${sy + 50}" r="7" fill="#3aff6a"/>
      <rect x="220" y="1240" width="640" height="40" fill="#121113"/>
      <rect x="760" y="1300" width="300" height="90" rx="8" fill="#1a191b"/><rect x="790" y="1330" width="150" height="14" fill="#0b0b0c"/>`, w, h);
    const txt = H.div(`left:${sx + 40}px;top:${sy + 40}px;width:${sw - 80}px;height:${sh - 80}px;display:flex;flex-direction:column;justify-content:center;
      font:600 58px/1.12 "IBM Plex Mono", monospace;color:#fff3f0;text-transform:uppercase;letter-spacing:1px;text-shadow:0 0 12px rgba(255,220,220,.7)`);
    const el = H.div(`width:${w}px;height:${h}px`);
    el.append(svg, txt);
    const screens = p.screens ?? [{ at: 0, lines: ["ВНИМАНИЕ ВСЕМ"] }];
    const scr = svg.querySelector(".scr");
    return {
      el, w, h,
      update(t, it) {
        let cur = screens[0];
        for (const s of screens) if (t >= (typeof s.at === "number" ? s.at : -1e9)) cur = s;
        txt.innerHTML = cur.lines.map((l) => `<div>${l}</div>`).join("");
        txt.style.fontSize = `${cur.size ?? 58}px`;
        const fl = 0.92 + 0.08 * Math.sin(t * 50) + (H.noise(t * 4, 9, 1) > 0.85 ? -0.3 : 0);
        scr.style.filter = `brightness(${fl})`;
        txt.style.transform = `translateX(${H.noise(t * 30, 2, 1) > 0.9 ? 6 : 0}px)`;
      },
    };
  },
};
