"""`vg.py script project`: a draft projects/<id>/project.yaml from script.yaml — the handoff to production.

What the draft already has: voice, theme, scenes with the voice text, shots with their cut words and transitions,
music sections per beat, sound effects and ambience on words, caption highlights. Instead of the final picture every
draw shot is an animatic card (on-screen text + the shot description + timed graphics), so the pacing can be checked
right away (vg.py voice/compile/preview). The visual plan of each shot is kept as comments next to it; the make-video
skill replaces the cards with real actors (docs/DRAW.md).
"""
import json
import os
import re
import textwrap

from . import model
from ..common import project_dir

BG = {"type": "radial", "at": "50% 38%", "stops": [[0, "#232a40"], [1, "#0c0f19"]]}


def q(v):
    return json.dumps(v, ensure_ascii=False)


def flow(d):
    return json.dumps(d, ensure_ascii=False)


def ref(at, bid):
    """A script time reference (relative to the beat) → a project.yaml reference (scene context)."""
    if at is None:
        return f"@{bid}.start"
    if isinstance(at, (int, float)):
        return f"@{bid}.start+{float(at):g}"
    a = str(at).strip()
    m = re.match(r"^@(start|end)([+-]\d+(?:\.\d+)?)?$", a)
    if m:
        return f"@{bid}.{m.group(1)}{m.group(2) or ''}"
    return a


def lead(at, bid, sec=0.12):
    """Cut a little before the word."""
    r = ref(at, bid)
    m = re.match(r"^(.*?)([+-]\d+(?:\.\d+)?)?$", r)
    off = float(m.group(2) or 0) - sec
    return f"{m.group(1)}{off:+g}" if off else m.group(1)


def comment_block(text, indent, prefix=""):
    out = []
    for line in textwrap.wrap(str(text), 104 - indent) or [""]:
        out.append(" " * indent + "# " + prefix + line)
        prefix = " " * len(prefix)
    return out


def build(s, pid):
    meta, prod = s.get("meta") or {}, s.get("production") or {}
    roles = model.roles()
    sounds, ambiences = model.sound_names()
    voice = {"voice": "ru-RU-DmitryNeural", "rate": "+18%", "pitch": "+0Hz", **(meta.get("voice") or {})}
    theme = prod.get("theme") if isinstance(prod.get("theme"), dict) else {}
    accent = theme.get("accent", "#e8333f")
    cap_style = theme.get("captions", "clean")
    music = prod.get("music") if isinstance(prod.get("music"), dict) else {}
    beats = [b for b in s.get("beats") or [] if isinstance(b, dict) and b.get("id")]
    style = meta.get("style", "draw")

    L = []
    w = L.append
    w(f"# ЧЕРНОВИК ПРОЕКТА из projects/{pid}/script.yaml (python3 vg.py script project {pid}).")
    w("# Уже готово: голос, сцены с текстом, кадры со сменой на словах и переходами, музыка по блокам, звуки на словах.")
    w("# Вместо картинки каждый кадр — аниматик-карточка (текст на экране + описание кадра): темп можно проверить сразу")
    w(f"# (python3 vg.py voice {pid} && python3 vg.py compile {pid} && python3 vg.py preview {pid} --shots).")
    if style == "motion":
        w("# Кадры с art:<имя> уже ссылаются на иллюстрацию plates/<имя>.png — сгенерируйте её в одном стиле (docs/MOTION.md §6);")
        w("# остальные — моушн-графика: доведите блоки по плану из комментариев (skill make-video, docs/MOTION.md).")
        w("")
        w("motion: {palette: night}")
    else:
        w("# Дальше замените layers каждого кадра настоящей графикой по плану из комментариев (skill make-video, docs/DRAW.md).")
    w("")
    w(f"title: {q(meta.get('title') or pid)}")
    w("")
    w(f"voice: {flow(voice)}")
    w("")
    w("theme:")
    w(f"  preset: {theme.get('preset', 'minimal')}")
    w(f"  accent: {q(accent)}")
    w(f"  captions: {flow({'style': cap_style, 'top': 1250, 'size': 64})}")
    w("")
    w("post: {vignette: 0.2, chromatic: 0, grain: 0.012}")
    w("")
    w("audio:")
    w("  music:")
    w(f"    key: {music.get('key', 'D')}")
    w(f"    mode: {music.get('mode', 'minor')}")
    w(f"    bpm: {music.get('bpm', 100)}")
    w("    gain: -14")
    w("    sections:")
    last = None
    for i, b in enumerate(beats):
        st = b.get("music")
        if st and st != last and st in model.MUSIC_STYLES:
            w(f"      - {{at: {0 if i == 0 else q('@' + b['id'] + '.start')}, style: {st}}}")
            last = st
    if last is None:
        w("      - {at: 0, style: pulse}")
    w("  duck: 0.6")
    w("")
    w("scenes:")
    for b in beats:
        bid = b["id"]
        r = roles.get(b.get("role"), {})
        w("")
        w(f"  # {'-' * 66} {bid}: {r.get('name', b.get('role'))}" + (f" — {b['title']}" if b.get("title") else ""))
        if b.get("goal"):
            L.extend(comment_block(b["goal"], 2, "задача: "))
        if b.get("on_screen"):
            w(f"  # на экране: «{b['on_screen']}»")
        w(f"  - id: {bid}")
        if b.get("accent"):
            w(f"    accent: {q(b['accent'])}")
        w(f"    text: {q(' '.join(str(b.get('vo') or '').split()))}")
        if isinstance(b.get("marks"), dict) and b["marks"]:
            w(f"    caption_marks: {flow(b['marks'])}")
        if b.get("gap_after") is not None:
            w(f"    gap_after: {b['gap_after']}")
        w("    shots:")
        sfx = []
        for j, sh in enumerate(b.get("shots") or []):
            if not isinstance(sh, dict) or not sh.get("id"):
                continue
            w(f"      - id: {sh['id']}")
            L.extend(comment_block(sh.get("visual", ""), 8, "ВИЗУАЛ: "))
            if sh.get("actors"):
                L.extend(comment_block(", ".join(map(str, sh["actors"])), 8, "актёры: "))
            if sh.get("camera"):
                L.extend(comment_block(sh["camera"], 8, "камера: "))
            for ev in sh.get("animation") or []:
                if isinstance(ev, dict):
                    L.extend(comment_block(f"{ev.get('at', '@start')} — {ev.get('what', '')}", 8, "анимация: "))
            if sh.get("effects"):
                L.extend(comment_block(sh["effects"] if isinstance(sh["effects"], str) else "; ".join(map(str, sh["effects"])), 8, "эффекты: "))
            if j:
                w(f"        start: {q(lead(sh.get('at'), bid))}")
            tr = str(sh.get("transition") or "cut").split()[0]
            if tr != "cut":
                w(f"        transition: {flow({'type': tr})}")
            amb = sh.get("ambience")
            amb = [amb] if isinstance(amb, str) else (amb or [])
            amb = [a.get("sound") if isinstance(a, dict) else a for a in amb]
            amb = [a for a in amb if a in ambiences]
            if amb:
                w("        ambience: [" + ", ".join(flow({"sound": a, "gain": -18}) for a in amb) + "]")
            gtext = next((str(ev["text"]) for ev in sh.get("graphics") or [] if isinstance(ev, dict) and ev.get("text")), None)
            title = str((b.get("on_screen") if j == 0 else None) or gtext or b.get("title") or sh["id"])
            if style == "motion":
                art = next((str(a)[4:] for a in sh.get("actors") or [] if str(a).startswith("art:")), None)
                if art:          # illustration + graphics on top (the plate must be generated: docs/MOTION.md §6)
                    w(f"        plate: {art}")
                    w("        camera: {keys: [{t: 0, z: 1.0, x: 648, y: 1250}, {t: end, z: 1.1, x: 648, y: 1250}], parallax: {px: 10, py: 4, freq: 0.12, k: [0, 0.05]}}")
                w("        motion:")
                if art:
                    w("          scrim: {side: top, k: 0.72, h: 36}")
                    w("          align: top")
                w("          blocks:")
                if j == 0 and not art and b.get("title"):
                    w("            - " + flow({"type": "kicker", "text": str(b["title"]), "at": 0}))
                w("            - " + flow({"type": "title", "text": title, "at": 0.1, "size": "l", "lines": 2}))
                for ev in sh.get("graphics") or []:
                    if isinstance(ev, dict) and ev.get("text") and str(ev["text"]) != title:
                        kind = "stamp" if "stamp" in str(ev.get("type", "")) else "badge"
                        w("            - " + flow({"type": kind, "text": str(ev["text"]), "at": ref(ev.get("at"), bid)}))
                for ev in sh.get("sfx") or []:
                    if isinstance(ev, dict) and ev.get("sound") in sounds:
                        sfx.append({"sound": ev["sound"], "at": ref(ev.get("at"), bid), "gain": -14})
                continue
            w("        draw:")
            w(f"          bg: {flow(BG)}")
            w("          camera: {keys: [{t: 0, z: 1.0}, {t: end, z: 1.06}]}")
            w("          layers:")
            w("            - " + flow({"actor": "text", "text": title.upper(), "x": 540, "y": 560, "size": 76, "width": 940,
                                        "color": "#ffffff", "at": "@start", "enter": "pop"}))
            w("            - " + flow({"actor": "text", "text": str(sh.get("visual") or ""), "x": 540, "y": 900, "size": 34, "width": 900,
                                        "weight": 500, "color": "#9aa6c4", "at": "@start", "enter": "fade"}))
            gy = 1080
            for ev in sh.get("graphics") or []:
                if isinstance(ev, dict) and ev.get("text"):
                    w("            - " + flow({"actor": "badge", "x": 540, "y": gy, "title": str(ev["text"]), "size": 44, "style": "solid",
                                                "color": accent, "at": ref(ev.get("at"), bid), "enter": "pop"}))
                    gy = 1080 if gy >= 1400 else gy + 110
            for ev in sh.get("sfx") or []:
                if isinstance(ev, dict) and ev.get("sound") in sounds:
                    sfx.append({"sound": ev["sound"], "at": ref(ev.get("at"), bid), "gain": -14})
        if sfx:
            w("    sfx:")
            for e in sfx:
                w(f"      - {flow(e)}")
    return "\n".join(L) + "\n"


def run(s, pid, force=False):
    path = os.path.join(project_dir(pid), "project.yaml")
    if os.path.exists(path) and not force:
        raise SystemExit(f"{os.path.relpath(path)} already exists — it may contain finished work (--force to overwrite)")
    text = build(s, pid)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path
