"""Layout audit of code-drawn shots: finds sloppy placement before the full render.

`vg.py layout <id>` renders sampled frames of every draw shot in Chromium (engine/render_hud.cjs layout), measures the
on-screen box of every visible item and every text line, and the captions, then checks them against the design rules
of docs/DRAW.md §10 («Аккуратность»):

  ✗ text cut by the frame edge · text that does not fit its own box (overflow)
  ! text closer than MARGIN to the frame edge · two texts overlapping · captions over a text or over a key object ·
    text in a platform UI zone (top bar, bottom caption/nick zone, right button column) · «almost centred» texts
    (a few px off the vertical axis) · text too small to read on a phone

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
        # plain text is measured by its glyph lines; boxed items (badge, card, bubble…) by their whole box incl. icons
        box = _union(lines) if it["lines"] and it["actor"] == "text" else it["box"]
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


def run(pid, step=12):
    """Analyse build/<pid>/layout/frames.json (written by render_hud.cjs layout). Returns (errors, warnings)."""
    d = build_dir(pid, "layout")
    data = json.load(open(os.path.join(d, "frames.json"), encoding="utf-8"))
    found = {}                     # (level, kind, shot, key) -> issue with a time range
    per_frame = {}
    prev = None
    for fr in data["frames"]:
        same = prev if prev and prev["shot"] == fr["shot"] else None
        prev = fr
        for lvl, kind, key, msg, boxes in _check_frame(fr, same):
            k = (lvl, kind, fr["shot"], key)
            g = found.get(k)
            if g:
                g["t1"] = fr["t"]
                g["n"] += 1
            else:
                found[k] = {"level": lvl, "kind": kind, "shot": fr["shot"], "t0": fr["t"], "t1": fr["t"], "msg": msg, "n": 1,
                            "frame": fr, "boxes": boxes}
            per_frame.setdefault(fr["image"], []).append((lvl, boxes))
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
    _sheet(pid, d, data, per_frame, issues)
    score = max(0, 100 - 10 * len(errs) - 2 * len(warns))
    ok = not errs and len(warns) <= 3
    print(f"\n  ВЁРСТКА: {score}/100 — {'аккуратно ✓' if ok else 'нужна доработка (0 ошибок и ≤ 3 предупреждений)'}")
    if issues:
        print(f"  кадры с разметкой: {os.path.join(d, 'issues')} · лист: {os.path.join(d, 'sheet.jpg')}")
    return len(errs), len(warns)


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
