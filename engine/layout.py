"""Layout audit of code-drawn shots: finds sloppy placement before the full render.

`vg.py layout <id>` renders sampled frames of every draw shot in Chromium (engine/render_hud.cjs layout), measures the
on-screen box of every visible item and every text line, and the captions, then checks them against the design rules
of docs/DRAW.md §10 («Аккуратность»):

  ✗ text cut by the frame edge · text that does not fit its own box (overflow)
  ! text closer than MARGIN to the frame edge · two texts overlapping · captions over a text or over a key object ·
    text in a platform UI zone (top bar, bottom caption/nick zone, right button column) · «almost centred» texts
    (a few px off the vertical axis) · text too small to read on a phone · objects out of proportion (real sizes) ·
    an object not standing on the floor · an object with nothing under its base (it floats over the backdrop) or standing
    on a surface of another parallax layer (a gap opens when the camera moves) · an empty backdrop (only sky behind the
    subject: no far planes) · a pose outside natural joint ranges · a cluttered frame · an element that
    pops in without an entrance · low text contrast · a frame too dark or blown out
  motion pass (every 2nd frame): jumps (teleports), jitter, flicker

Caption bands: shots with `captions_top: auto` get the free band with the least overlap (build/<id>/layout/captions.json,
applied by compile).

Report: one line per issue (shot, time range, what, where), counts and a 0–100 score; annotated frames with the boxes
in build/<id>/layout/issues/ and a contact sheet build/<id>/layout/sheet.jpg.
"""
import json
import os

from .common import build_dir

W, H = 1080, 1920
MARGIN = 28                       # min distance from a text to the frame edge
SAFE_TOP = 120                    # status bar / platform header
SAFE_BOTTOM = 1570                # platform caption, nickname, music line
RIGHT_COL = (940, 800, 1550)      # x > 940 between y 800 and 1550: like / comment / share buttons
CENTER_TOL = (6, 40)              # 6..40 px off the axis = «almost centred» (deliberate offsets are bigger)
MIN_LINE = 27                     # px: a text line lower than this is hard to read on a phone
PROPORTION = 1.3                  # px-per-metre of two real-sized objects in one plane may differ at most this much
FLOOR_TOL = 8                     # px: a grounded object farther than this from the floor line floats / sinks
SUPPORT_PROBE = 4                 # px below an object's base where its surface must be
PAR_TOL = 0.02                    # an object and its surface must share the parallax layer (par) within this
DRIFT_TOL = 5                     # px: on different layers, a base moving more than this against its surface = visible gap/slide
EDGE_ZONE = 60                    # px: … but only near the surface's top edge (horizon) — deeper in a plain ground it is invisible
BACKDROP_FAR = 1                  # an outdoor shot (sky) needs at least this many far elements (par < 1) besides sky/stars/clouds
SKYISH = {"sky", "stars", "cloud", "particles"}
MAX_TEXTS = 5                     # more simultaneous prominent texts (besides captions) = cluttered frame
PROMINENT = 50                    # px line height: smaller lines (a receipt, a list) are one composition, not clutter
MIN_CONTRAST = 0.28               # luminance spread (p95 − p5) inside a text line box
CAPTION_BANDS = [1250, 1150, 1350, 1060, 1450, 1520]
# actors that are backdrops or decoration: captions may run over them
BACKDROP = {"shape", "svg", "sky", "stars", "cloud", "skyline", "ground", "street", "particles", "coins", "digits", "group",
            "room", "building", "image", "lottie", "silhouette", "sketch", "buzz", "cctv", "house", "tree", "streetlight",
            "train", "school", "window_grid", "lockers", "classroom", "desk", "blackboard", "hand", "text", "badge",
            "timetag", "callout", "bubble", "card", "checklist", "meter", "mail"}


def _area(b):
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def _inter(a, b):
    return [max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])]


def _overlap(a, b):
    i = _inter(a, b)
    return _area(i) if i[2] > i[0] and i[3] > i[1] else 0


def _union(boxes):
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]


def _label(it):
    t = (it.get("text") or "").strip()
    name = it["id"] or it["actor"]
    return f"{name} «{t[:28]}»" if t else name


def _ink(b):
    """A text line box without the leading above and below the glyphs (Range rects include the full line height)."""
    k = (b[3] - b[1]) * 0.16
    return [b[0], b[1] + k, b[2], b[3] - k]


def _related(a, b):
    pa, pb = a["path"], b["path"]
    return pa.startswith(pb + "/") or pb.startswith(pa + "/")


def _check_frame(fr, prev=None):
    """Issues of one measured frame: [(level, kind, key, message, boxes)]. prev = previous sample of the same shot."""
    out = []
    # the camera is travelling (pan / push): world-space items carried past the edge are motion, not layout
    cam, pc = fr.get("cam"), (prev or {}).get("cam")
    panning = bool(cam and pc) and (abs(cam["x"] - pc["x"]) > 12 or abs(cam["y"] - pc["y"]) > 12 or abs(cam["z"] - pc["z"]) > 0.015)
    items = [it for it in fr["items"] if it["op"] >= 0.35]
    texts = [it for it in items if (it["texty"] or it["actor"] == "text") and not it["moving"] and (it["lines"] or it["actor"] != "text")]
    for it in texts:
        lines = it["lines"] or [it["box"]]
        # plain text is measured by its glyph lines; boxed items (badge, card, bubble…) by their whole box incl. icons;
        # a callout's item box also spans its leader line, so its label is the text lines plus the card padding
        if it["lines"] and it["actor"] == "text":
            box = _union(lines)
        elif it["lines"] and it["actor"] == "callout":
            u = _union(lines)
            box = [u[0] - 30, u[1] - 18, u[2] + 30, u[3] + 18]
        else:
            box = it["box"]
        it["_box"], it["_lines"] = box, lines
        lab = _label(it)
        if it.get("overflow"):
            out.append(("err", "overflow", it["path"], f"текст не помещается в свой блок: {lab}", [box]))
        cut = max(-box[0], -box[1], box[2] - W, box[3] - H)
        bw, bh = max(1, box[2] - box[0]), max(1, box[3] - box[1])
        seen = _area(_inter(box, [0, 0, W, H])) / (bw * bh) if _overlap(box, [0, 0, W, H]) else 0
        if it["space"] != "screen" and cut > -MARGIN and (panning or seen < 0.5):
            continue                       # carried by the camera, or mostly outside: entering / leaving the frame
        if cut > 2:
            out.append(("err", "cut", it["path"], f"обрезан краем кадра на {cut} px: {lab}", [box]))
        else:
            near = min(box[0], box[1], W - box[2], H - box[3])
            if near < MARGIN:
                out.append(("warn", "edge", it["path"], f"впритык к краю кадра ({max(0, near)} px, нужно ≥ {MARGIN}): {lab}", [box]))
        if box[1] < SAFE_TOP:
            out.append(("warn", "zone", it["path"] + ":top", f"в зоне шапки площадки (верх {box[1]} px < {SAFE_TOP}): {lab}", [box]))
        if box[3] > SAFE_BOTTOM:
            out.append(("warn", "zone", it["path"] + ":bottom", f"в нижней зоне подписи и ника (низ {box[3]} px > {SAFE_BOTTOM}): {lab}", [box]))
        x0, y0, y1 = RIGHT_COL
        if box[2] > x0 + 6 and box[3] > y0 and box[1] < y1:
            out.append(("warn", "zone", it["path"] + ":right", f"под кнопками площадки справа (x до {box[2]} px > {x0}): {lab}", [box]))
        if it["space"] == "screen" and box[2] - box[0] < W - 2 * MARGIN:
            off = round((box[0] + box[2]) / 2 - W / 2)
            if CENTER_TOL[0] <= abs(off) <= CENTER_TOL[1]:
                out.append(("warn", "center", it["path"], f"почти по центру, но сдвинут на {off:+d} px: {lab}", [box]))
        if it["lines"]:
            low = min(l[3] - l[1] for l in it["lines"])
            if low < MIN_LINE:
                out.append(("warn", "small", it["path"], f"мелкий текст (строка {low} px < {MIN_LINE}): {lab}", [box]))
    for i, a in enumerate(texts):
        for b in texts[i + 1:]:
            if _related(a, b):
                continue
            hit = None
            for la in map(_ink, a["_lines"]):
                for lb in map(_ink, b["_lines"]):
                    ov = _overlap(la, lb)
                    if ov > 0.1 * min(_area(la), _area(lb)):
                        hit = (la, lb)
                        break
                if hit:
                    break
            if hit:
                key = " + ".join(sorted([a["path"], b["path"]]))
                out.append(("warn", "overlap", key, f"надписи наезжают друг на друга: {_label(a)} и {_label(b)}", [a["_box"], b["_box"]]))
    # proportions: real-sized objects in the same plane share one px-per-metre (depth declares deliberate distance)
    # (only in realistic scenes — draw.px_per_m — where sizes are meant to be real; illustrations scale freely)
    reals = [it for it in items if it.get("real") and not it["moving"] and it["real"]["px"] > 8] if fr.get("real_scene") else []
    for i, a in enumerate(reals):
        for b in reals[i + 1:]:
            ra, rb = a["real"], b["real"]
            if ra["par"] != rb["par"] or _related(a, b):
                continue
            ka, kb = ra["px"] / (ra["m"] * ra["depth"]), rb["px"] / (rb["m"] * rb["depth"])
            if max(ka, kb) / min(ka, kb) > PROPORTION:
                big, small = (a, b) if ka > kb else (b, a)
                key = " + ".join(sorted([a["path"], b["path"]]))
                out.append(("warn", "proportion", key, f"непропорционально: {_label(big)} крупнее {_label(small)} в {max(ka, kb) / min(ka, kb):.1f} раза "
                            f"относительно реальных размеров ({ra['m']} м и {rb['m']} м) — выровняйте масштаб или задайте depth", [a["box"], b["box"]]))
    for it in items:
        g = it.get("ground")
        if g and not g["air"] and not it["moving"] and abs(g["y"] - g["floor"]) > FLOOR_TOL:
            how = "висит над полом" if g["y"] < g["floor"] else "провалился под пол"
            out.append(("warn", "floor", it["path"], f"{_label(it)} {how} на {abs(g['y'] - g['floor'])} px (пол y = {g['floor']}; y: floor или air: true)", [it["box"]]))
        if it.get("pose_clamped"):
            out.append(("warn", "pose", it["path"], f"поза вне естественного диапазона ({it['pose_clamped']}) — исправлена движком, проверьте задумку: {_label(it)}", [it["box"]]))
        if it.get("pop") and not it["moving"]:
            out.append(("warn", "pop", it["path"], f"появляется рывком, без анимации входа (enter): {_label(it)}", [it["box"]]))
    out += _support(fr, items)
    tops = [it for it in texts if "/" not in it["path"] and max((l[3] - l[1] for l in it["_lines"]), default=0) >= PROMINENT]
    if len(tops) > MAX_TEXTS:
        out.append(("warn", "clutter", "frame", f"перегруженный кадр: {len(tops)} надписей одновременно (> {MAX_TEXTS})", [it["_box"] for it in tops]))
    cap = fr.get("caption")
    if cap:
        cb = cap["box"]
        for it in texts:
            if any(_overlap(_ink(cb), _ink(l)) > 0.05 * min(_area(cb), _area(l)) for l in it["_lines"]):
                out.append(("warn", "caption", it["path"], f"субтитры «{cap['text'][:24]}» наезжают на надпись {_label(it)}", [cb, it["_box"]]))
        for it in items:
            if it["actor"] in BACKDROP or it["moving"] or it["op"] < 0.7 or it.get("blur", 0) >= 1:
                continue
            b = it["box"]
            if _area(b) > 0.6 * W * H:
                continue
            if _overlap(cb, b) > 0.35 * _area(cb):
                out.append(("warn", "caption_obj", it["path"], f"субтитры «{cap['text'][:24]}» поверх графики: {it['id'] or it['actor']}", [cb, b]))
    return out


def _pixels(d, fr, out):
    """Pixel checks on the drawn frame: exposure, and the contrast inside every plain text line."""
    import numpy as np
    from PIL import Image
    im = np.asarray(Image.open(os.path.join(d, fr["image"])).convert("L"), dtype=np.float32) / 255
    mean = float(im.mean())
    if mean < 0.03:
        out.append(("warn", "exposure", "frame", f"кадр почти чёрный (средняя яркость {mean:.2f})", []))
    elif mean > 0.92:
        out.append(("warn", "exposure", "frame", f"кадр пересвечен (средняя яркость {mean:.2f})", []))
    for it in fr["items"]:
        if it["actor"] != "text" or it["moving"] or it["op"] < 0.6 or not it["lines"]:
            continue
        for l in it["lines"]:
            x0, y0, x1, y1 = [int(v) for v in _ink(l)]
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
            if x1 - x0 < 12 or y1 - y0 < 8:
                continue
            crop = im[y0:y1, x0:x1]
            spread = float(np.percentile(crop, 95) - np.percentile(crop, 5))
            if spread < MIN_CONTRAST:
                out.append(("warn", "contrast", it["path"], f"низкий контраст текста с фоном ({spread:.2f} < {MIN_CONTRAST}): {_label(it)}", [l]))
                break


def _motion(d):
    """Motion pass (motion.json): teleports, jitter and flicker of items that should move smoothly."""
    f = os.path.join(d, "motion.json")
    if not os.path.exists(f):
        return []
    m = json.load(open(f, encoding="utf-8"))
    fps, step = m["fps"], m["step"]
    tracks = {}
    for fr in m["frames"]:
        for it in fr["items"]:
            tracks.setdefault((fr["shot"], it["path"]), []).append((fr["frame"], it, fr["cam"]))
    out = []
    for (shot, path), seq in tracks.items():
        if len(seq) < 6:
            continue
        it0 = seq[0][1]
        lab = _label(it0)
        cs = [((it["box"][0] + it["box"][2]) / 2, (it["box"][1] + it["box"][3]) / 2) for _, it, _ in seq]
        steps = [((cs[i][0] - cs[i - 1][0]) ** 2 + (cs[i][1] - cs[i - 1][1]) ** 2) ** 0.5 if seq[i][0] - seq[i - 1][0] <= step else 0
                 for i in range(1, len(cs))]
        # teleport: one step far bigger than its neighbours (not entering/exiting, visible both times)
        for i in range(1, len(steps) - 1):
            a, b = seq[i][1], seq[i + 1][1]
            if a["moving"] or b["moving"] or a["op"] < 0.3 or b["op"] < 0.3:
                continue
            ca, cb = seq[i][2], seq[i + 1][2]
            if ca and cb and (abs(ca["x"] - cb["x"]) > 60 or abs(ca["y"] - cb["y"]) > 60 or abs(ca["z"] - cb["z"]) > 0.08):
                continue                   # the camera itself jumped (a cut inside the shot)
            nb = max(steps[i - 1], steps[i + 1])
            if steps[i] > 90 and steps[i] > 4 * nb + 30:
                t = round(seq[i + 1][0] / fps, 2)
                out.append(("warn", "jump", shot, path, t, t, f"рывок: {lab} перескочил на {steps[i]:.0f} px за {step} кадра"))
        # jitter: tiny back-and-forth wobble without a declared loop (float/wiggle/shakes…)
        if not it0.get("loops"):
            for i in range(0, len(cs) - 8, 4):
                win = cs[i:i + 9]
                if any(seq[i + k][1]["moving"] for k in range(len(win))):
                    continue
                dx = [win[k + 1][0] - win[k][0] for k in range(8)] + [win[k + 1][1] - win[k][1] for k in range(8)]
                flips = sum(1 for k in range(1, 8) if dx[k] * dx[k - 1] < 0 and 0.6 < abs(dx[k]) < 7) + \
                        sum(1 for k in range(9, 16) if dx[k] * dx[k - 1] < 0 and 0.6 < abs(dx[k]) < 7)
                if flips >= 6:
                    t0, t1 = round(seq[i][0] / fps, 2), round(seq[i + 8][0] / fps, 2)
                    out.append(("warn", "jitter", shot, path, t0, t1, f"дрожит: {lab} мелко дёргается туда-обратно"))
                    break
            # flicker: opacity jumping up and down
            ops = [it["op"] for _, it, _ in seq]
            for i in range(0, len(ops) - 6, 3):
                w = ops[i:i + 7]
                if any(seq[i + k][1]["moving"] for k in range(7)):
                    continue
                jumps = sum(1 for k in range(1, 7) if abs(w[k] - w[k - 1]) > 0.45)
                if jumps >= 3:
                    t = round(seq[i][0] / fps, 2)
                    out.append(("warn", "flicker", shot, path, t, round(seq[i + 6][0] / fps, 2), f"мерцает: {lab} то пропадает, то появляется"))
                    break
    return out


def _captions_auto(pid, d, data):
    """For shots with captions_top: auto choose the band with the least overlap; returns True when the map changed."""
    tl = json.load(open(os.path.join(build_dir(pid), "timeline.json"), encoding="utf-8"))
    auto = [s["id"] for s in tl["shots"] if s.get("captions_auto")]
    f = os.path.join(d, "captions.json")
    old = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
    if not auto:
        return False
    caps = [fr["caption"]["box"] for fr in data["frames"] if fr.get("caption")]
    ch = sorted(b[3] - b[1] for b in caps)[len(caps) // 2] if caps else 80
    cw = sorted(b[2] - b[0] for b in caps)[len(caps) // 2] if caps else 700
    res = {}
    for sid in auto:
        frames = [fr for fr in data["frames"] if fr["shot"] == sid]
        best, best_cost = None, None
        for top in CAPTION_BANDS:
            band = [W / 2 - cw / 2, top - 10, W / 2 + cw / 2, top + ch + 10]
            cost = abs(top - 1250) * cw * 0.02
            for fr in frames:
                for it in fr["items"]:
                    if it["op"] < 0.35 or it["moving"]:
                        continue
                    texty = it["texty"] or it["actor"] == "text"
                    if not texty and (it["actor"] in BACKDROP or _area(it["box"]) > 0.6 * W * H or it.get("blur", 0) >= 1):
                        continue
                    boxes = it["lines"] if texty and it["lines"] else [it["box"]]
                    cost += sum(_overlap(band, b) for b in boxes) * (3 if texty else 1)
            if best_cost is None or cost < best_cost:
                best, best_cost = top, cost
        res[sid] = best
    merged = {**old, **res}
    json.dump(merged, open(f, "w", encoding="utf-8"), indent=1)
    changed = any(old.get(k) != v for k, v in res.items())
    print("  субтитры (auto): " + ", ".join(f"{k} → {v}" for k, v in res.items()))
    return changed


def _support(fr, items):
    """Grounded objects need a surface right under their base on the same parallax layer, or they hang in the air over the
    backdrop (or a gap opens between them and the ground when the camera moves); outdoor shots need far planes."""
    out = []
    surfaces = [it for it in items if it.get("surface")]
    # a wide band in the lower part of the frame (a floor drawn as a rect) is a floor too
    floorish = lambda sf: sf["surface"] == "floor" or (sf["box"][2] - sf["box"][0] >= 0.8 * W and sf["box"][1] > 0.4 * H)
    if not any(floorish(sf) for sf in surfaces) and not any(it.get("ground") for it in items):
        return out                     # abstract / illustrative scene (no ground, floor or draw.floor): nothing is meant to stand
    order = {id(it): i for i, it in enumerate(items)}
    for it in items:
        st = it.get("stands")
        if not st or st["air"] or it["moving"] or it.get("blur", 0) >= 2:
            continue
        b = it["box"]
        y = b[3] + SUPPORT_PROBE
        if y >= H or b[2] <= 0 or b[0] >= W or b[2] - b[0] < 12:
            continue                   # base below the frame edge (foreground) or off screen
        xs = [x for x in (b[0] + (b[2] - b[0]) * k for k in (0.2, 0.5, 0.8)) if 0 <= x < W]
        if not xs:
            continue
        under = lambda x: [sf for sf in surfaces if sf is not it and sf["box"][0] <= x <= sf["box"][2] and sf["box"][1] <= y <= sf["box"][3]]
        # a base hidden behind something drawn in front of it (the front row of machines, a counter) cannot be seen floating
        hidden = lambda x: any(order[id(o)] > order[id(it)] and (o.get("stands") or o.get("surface")) and o["op"] >= 0.9
                               and o["box"][0] <= x <= o["box"][2] and o["box"][1] <= y <= o["box"][3] for o in items)
        found = [under(x) for x in xs]
        if not all(f or hidden(x) for f, x in zip(found, xs)):
            out.append(("warn", "support", it["path"], f"{_label(it)} висит в воздухе: под основанием нет земли/пола (виден фон) — "
                        f"поставьте под него поверхность на том же par или утопите основание в землю", [b]))
            continue
        P = lambda q: 1 if q.get("par") is None else q["par"]
        par = P(it)
        under_all = [sf for f in found for sf in f]
        if not under_all:
            continue
        if not any(abs(P(sf) - par) <= PAR_TOL for sf in under_all):
            # another parallax layer: harmless while the camera keeps them together, a gap once it moves them apart —
            # remember the base height over the surface's top edge; run() warns when it drifts during the shot
            sf = min(under_all, key=lambda q: abs(P(q) - par))
            out.append(("drift", "support", it["path"] + ":par", (b[3] - sf["box"][1], par, P(sf), _label(it)), [b]))
    if any(it["actor"] == "sky" for it in items) and any(it.get("stands") for it in items):
        far = [it for it in items if it.get("par", 1) < 1 and it["actor"] not in SKYISH and not it.get("surface")]
        if len(far) < BACKDROP_FAR:
            out.append(("warn", "backdrop", "frame", "пустой фон: за объектами только небо — добавьте дальние планы "
                        "(город, руины, холмы, лес) со своей землёй и дымкой (docs/DRAW.md §10.6)", []))
    return out


def run(pid, step=12):
    """Analyse build/<pid>/layout/frames.json (written by render_hud.cjs layout). Returns (errors, warnings, captions_changed)."""
    d = build_dir(pid, "layout")
    data = json.load(open(os.path.join(d, "frames.json"), encoding="utf-8"))
    caps_changed = _captions_auto(pid, d, data)
    found = {}                     # (level, kind, shot, key) -> issue with a time range
    per_frame = {}
    drift = {}                     # (shot, key) -> [(t, (base over surface top, par, surface par, label), boxes)]
    prev = None
    for fr in data["frames"]:
        same = prev if prev and prev["shot"] == fr["shot"] else None
        prev = fr
        found_frame = _check_frame(fr, same)
        _pixels(d, fr, found_frame)
        for lvl, kind, key, msg, boxes in found_frame:
            if lvl == "drift":                 # collected over the shot, judged below
                drift.setdefault((fr["shot"], key), []).append((fr["t"], msg, boxes))
                continue
            k = (lvl, kind, fr["shot"], key)
            g = found.get(k)
            if g:
                g["t1"] = fr["t"]
                g["n"] += 1
            else:
                found[k] = {"level": lvl, "kind": kind, "shot": fr["shot"], "t0": fr["t"], "t1": fr["t"], "msg": msg, "n": 1,
                            "frame": fr, "boxes": boxes}
            per_frame.setdefault(fr["image"], []).append((lvl, boxes))
    for (shot, key), seq in drift.items():
        dys = [m[0] for _, m, _ in seq]
        if max(dys) - min(dys) > DRIFT_TOL and min(dys) < EDGE_ZONE:
            _, (dy, par, spar, lab), boxes = seq[0]
            found[("warn", "support", shot, key)] = {
                "level": "warn", "kind": "support", "shot": shot, "t0": seq[0][0], "t1": seq[-1][0], "n": len(seq), "boxes": boxes,
                "frame": next(f for f in data["frames"] if f["shot"] == shot and f["t"] == seq[0][0]),
                "msg": f"{lab} (par {par}) стоит на земле другого плана (par {spar}) и за шот уплывает относительно неё на "
                       f"{round(max(dys) - min(dys))} px — дайте плану свою полосу земли с тем же par (docs/DRAW.md §10.6)"}
    for lvl, kind, shot, key, t0, t1, msg in _motion(d):
        found[(lvl, kind, shot, key)] = {"level": lvl, "kind": kind, "shot": shot, "t0": t0, "t1": t1, "msg": msg, "n": 1, "boxes": []}
    issues = sorted(found.values(), key=lambda g: (g["t0"], g["level"] != "err"))
    errs = [g for g in issues if g["level"] == "err"]
    warns = [g for g in issues if g["level"] == "warn"]
    shots = sorted({f["shot"] for f in data["frames"]}, key=[f["shot"] for f in data["frames"]].index)
    print(f"  кадров проверено: {len(data['frames'])} (шаг {step} кадров) · шотов: {len(shots)}")
    for title, group, mark in (("ОШИБКИ", errs, "✗"), ("ПРЕДУПРЕЖДЕНИЯ", warns, "!")):
        if not group:
            continue
        print(f"\n  {mark} {title} ({len(group)})")
        for g in group:
            when = f"{g['t0']:.2f}" if g["t0"] == g["t1"] else f"{g['t0']:.2f}–{g['t1']:.2f}"
            print(f"    [{g['kind']}] {g['shot']} @ {when} с: {g['msg']}")
    json.dump([{k: g[k] for k in ("level", "kind", "shot", "t0", "t1", "msg")} for g in issues],
              open(os.path.join(d, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    _sheet(pid, d, data, per_frame, issues)
    score = max(0, 100 - 10 * len(errs) - 2 * len(warns))
    ok = not errs and len(warns) <= 3
    print(f"\n  ВЁРСТКА: {score}/100 — {'аккуратно ✓' if ok else 'нужна доработка (0 ошибок и ≤ 3 предупреждений)'}")
    if issues:
        print(f"  кадры с разметкой: {os.path.join(d, 'issues')} · лист: {os.path.join(d, 'sheet.jpg')}")
    return len(errs), len(warns), caps_changed


def _sheet(pid, d, data, per_frame, issues):
    from PIL import Image, ImageDraw, ImageFont
    out = os.path.join(d, "issues")
    os.makedirs(out, exist_ok=True)
    try:
        font = ImageFont.load_default(size=40)
    except TypeError:                          # Pillow < 10.1
        font = ImageFont.load_default()
    thumbs = []
    by_img = {f["image"]: f for f in data["frames"]}
    for img_name, marks in per_frame.items():
        fr = by_img[img_name]
        im = Image.open(os.path.join(d, img_name)).convert("RGB")
        dr = ImageDraw.Draw(im)
        x0, y0, y1 = RIGHT_COL
        dr.rectangle([0, 0, W, SAFE_TOP], outline=(80, 160, 255), width=2)
        dr.rectangle([0, SAFE_BOTTOM, W, H], outline=(80, 160, 255), width=2)
        dr.rectangle([x0, y0, W, y1], outline=(80, 160, 255), width=2)
        if fr.get("caption"):
            dr.rectangle(fr["caption"]["box"], outline=(255, 220, 60), width=4)
        for lvl, boxes in marks:
            for b in boxes:
                dr.rectangle(b, outline=(255, 40, 60) if lvl == "err" else (255, 150, 30), width=6)
        dr.rectangle([0, 0, W, 64], fill=(0, 0, 0))
        dr.text((16, 10), f"{fr['shot']} · {fr['t']:.2f} s", fill=(255, 255, 255), font=font)
        im.save(os.path.join(out, img_name), quality=85)
        thumbs.append(im.resize((270, 480)))
    if not thumbs:
        return
    cols = 7
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 270, rows * 480), (0, 0, 0))
    for i, t in enumerate(thumbs):
        sheet.paste(t, ((i % cols) * 270, (i // cols) * 480))
    sheet.save(os.path.join(d, "sheet.jpg"), quality=85)
