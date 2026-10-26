"""Script model: the knowledge base (formats, hooks, devices, platforms), loading and schema validation of
projects/<id>/script.yaml, and the list of draw actors a script may use."""
import glob
import os
import re

import yaml

from ..common import ROOT, load_yaml, project_dir

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
_KB = {}


def kb(name):
    """formats | hooks | devices | platforms | story"""
    if name not in _KB:
        with open(os.path.join(DATA, f"{name}.yaml"), encoding="utf-8") as f:
            _KB[name] = load_yaml(f)
    return _KB[name]


def roles():
    return kb("formats")["roles"]


def formats():
    return kb("formats")["formats"]


def hook_types():
    return kb("hooks")["types"]


def devices():
    d = kb("devices")
    return {**d["retention"], **d["engagement"]}


def platforms():
    return {k: v for k, v in kb("platforms").items() if k != "common"}


MUSIC_STYLES = ["drone", "pulse", "tension", "dark", "sub", "epic", "calm", "lofi", "upbeat", "silence"]
TRANSITIONS = ["cut", "whip_x", "whip_y", "zoom", "slam", "glitch", "dip", "flash", "fade", "dissolve"]
KPIS = ["completion", "rewatch", "shares", "saves", "comments", "follows", "likes", "clicks", "monetization"]
ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")


STYLES = ("draw", "motion", "plates", "mixed")
# blocks of the motion engine (engine/motion/src/Shot.tsx, docs/MOTION.md §4) — shots name them as motion:<block>
MOTION_BLOCKS = ["kicker", "title", "text", "number", "proverb", "versus", "bars", "meter", "checklist", "badge", "stamp", "source",
                 "comment", "icon", "card", "sprite", "spacer", "swap", "row"]


def actor_names(pid=None):
    """Built-in draw actors (+ the project's own actors)."""
    files = glob.glob(os.path.join(ROOT, "engine", "hud", "draw", "actors", "*.js"))
    if pid:
        files += glob.glob(os.path.join(project_dir(pid), "actors", "*.js"))
    names = set()
    for f in files:
        names.update(re.findall(r"^export const (\w+)", open(f, encoding="utf-8").read(), re.M))
    return names


def sound_names():
    """(sfx sounds, ambiences) the audio engine can synthesize (engine/audio.py)."""
    src = open(os.path.join(ROOT, "engine", "audio.py"), encoding="utf-8").read()
    return set(re.findall(r'@sound\("(\w+)"\)', src)), set(re.findall(r'@ambience\("(\w+)"\)', src))


def todos(obj, path=""):
    """Paths of every unfilled "TODO" value."""
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if not str(k).startswith("_"):
                out += todos(v, f"{path}.{k}" if path else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out += todos(v, f"{path}[{i}]")
    elif isinstance(obj, str) and "TODO" in obj:
        out.append(path)
    return out


HUD_COMPONENTS = ["frame", "edge", "marker", "chip", "alert", "stamp", "cta", "text", "image", "lower_third", "holo3d", "prohibit",
                  "hazard", "pips", "radar", "target", "stats", "title", "meter", "list", "counter", "progress", "choices"]


def script_path(pid):
    return os.path.join(project_dir(pid), "script.yaml")


def load(pid):
    path = script_path(pid)
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} not found — create it: python3 vg.py script new {pid} --topic \"...\"")
    with open(path, encoding="utf-8") as f:
        try:
            s = load_yaml(f) or {}
        except yaml.YAMLError as e:
            raise ValueError(f"{os.path.relpath(path, ROOT)}: ошибка YAML — {e}") from None
    if not isinstance(s, dict):
        raise ValueError(f"{os.path.relpath(path, ROOT)}: на верхнем уровне должен быть словарь (meta, brief, beats, …)")
    s["_id"] = pid
    return s


# ----------------------------------------------------------------------------- schema
class Issues:
    """Collected findings: (severity, code, where, message). severity: error | warn | info."""

    def __init__(self):
        self.items = []

    def add(self, sev, code, where, msg):
        self.items.append((sev, code, where, msg))

    def error(self, code, where, msg):
        self.add("error", code, where, msg)

    def warn(self, code, where, msg):
        self.add("warn", code, where, msg)

    def info(self, code, where, msg):
        self.add("info", code, where, msg)

    def count(self, sev):
        return sum(1 for i in self.items if i[0] == sev)


def _req(iss, obj, key, where, typ=str, code="schema"):
    v = obj.get(key) if isinstance(obj, dict) else None
    if v is None or (isinstance(v, (str, list, dict)) and not v):
        iss.error(code, where, f"нет обязательного поля `{key}`")
        return None
    if typ is not None and not isinstance(v, typ):
        iss.error(code, where, f"`{key}` должно быть {typ.__name__ if not isinstance(typ, tuple) else '/'.join(t.__name__ for t in typ)}")
        return None
    return v


def _as(iss, obj, key, typ, where):
    """Coerce obj[key] to typ (dict | list | str), recording a schema error on a wrong type. A lone string where a
    list is expected becomes a one-item list (a common slip); anything else is replaced by an empty value."""
    v = obj.get(key)
    if v is None or isinstance(v, typ):
        if v is None:
            obj[key] = typ()
        return obj[key]
    if typ is list and isinstance(v, str):
        obj[key] = [v]
        return obj[key]
    if typ is str and isinstance(v, (int, float)) and not isinstance(v, bool):
        obj[key] = str(v)
        return obj[key]
    iss.error("schema", f"{where}.{key}" if where else key, f"`{key}` должно быть {'списком' if typ is list else 'словарём' if typ is dict else 'строкой'}")
    obj[key] = typ()
    return obj[key]


def _dicts(iss, obj, key, where):
    """A list of dicts: non-dict items are reported and dropped."""
    lst = _as(iss, obj, key, list, where)
    bad = [i for i, x in enumerate(lst) if not isinstance(x, dict)]
    for i in bad:
        iss.error("schema", f"{where}.{key}[{i}]" if where else f"{key}[{i}]", "элемент должен быть словарём {…}")
    obj[key] = [x for x in lst if isinstance(x, dict)]
    return obj[key]


def _num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _strs(iss, obj, key, where):
    """A list of strings (numbers become strings; other items are reported and dropped)."""
    lst = _as(iss, obj, key, list, where)
    out = []
    for i, x in enumerate(lst):
        if isinstance(x, str) or _num(x):
            out.append(str(x))
        else:
            iss.error("schema", f"{where}.{key}[{i}]", "элемент должен быть строкой")
    obj[key] = out
    return out


def _text(iss, obj, where, *keys, num_ok=False):
    """Scalar text fields: a number becomes a string (kept as a number with num_ok), lists/dicts are reported and removed."""
    for k in keys:
        v = obj.get(k)
        if v is None or isinstance(v, str):
            continue
        if _num(v):
            if not num_ok:
                obj[k] = str(v)
            continue
        iss.error("schema", f"{where}.{k}" if where else k, f"`{k}` должно быть строкой")
        obj.pop(k)


def _number(iss, obj, where, *keys):
    for k in keys:
        if obj.get(k) is not None and not _num(obj[k]):
            iss.error("schema", f"{where}.{k}", f"`{k}` должно быть числом")
            obj.pop(k)


def normalize(s, iss):
    """Wrong types → schema errors + safe values, so that every later rule can trust the shapes."""
    meta = _as(iss, s, "meta", dict, "")
    _text(iss, meta, "meta", "title", "topic", "wishes", "language", "format", "style", "primary_platform", "status", "genre")
    _strs(iss, meta, "platforms", "meta")
    voice = _as(iss, meta, "voice", dict, "meta")
    _text(iss, voice, "meta.voice", "voice", "rate", "pitch")
    brief = _as(iss, s, "brief", dict, "")
    _text(iss, brief, "brief", "goal", "promise", "tone")
    for k in ("kpi", "keywords"):
        _strs(iss, brief, k, "brief")
    _as(iss, brief, "constraints", list, "brief")
    aud = brief.get("audience")
    if aud is not None and not isinstance(aud, dict):
        brief["audience"] = {"who": aud} if isinstance(aud, str) else {}
    res = _as(iss, s, "research", dict, "")
    _text(iss, res, "research", "summary", "chosen_angle")
    for i, f in enumerate(_dicts(iss, res, "facts", "research")):
        _text(iss, f, f"research.facts[{i}]", "id", "text", "source", "confidence")
    for i, a in enumerate(_dicts(iss, res, "angles", "research")):
        _text(iss, a, f"research.angles[{i}]", "id", "text", "why", "archetype", "paradox")
        _number(iss, a, f"research.angles[{i}]", "score")
    _as(iss, res, "insights", list, "research")
    hk = _as(iss, s, "hooks", dict, "")
    _text(iss, hk, "hooks", "primary")
    for i, h in enumerate(_dicts(iss, hk, "variants", "hooks")):
        _text(iss, h, f"hooks.variants[{i}]", "id", "type", "vo", "on_screen", "visual", "why")
        _number(iss, h, f"hooks.variants[{i}]", "score")
    _strs(iss, hk, "ab", "hooks")
    for i, b in enumerate(_dicts(iss, s, "beats", "")):
        w = f"beats[{i}]"
        _text(iss, b, w, "id", "role", "title", "goal", "on_screen", "music", "accent")
        if not isinstance(b.get("vo"), str):
            _as(iss, b, "vo", str, w)
        _number(iss, b, w, "gap_after")
        for k in ("devices", "facts"):
            _strs(iss, b, k, w)
        for j, sh in enumerate(_dicts(iss, b, "shots", w)):
            sw = f"{w}.shots[{j}]"
            _text(iss, sh, sw, "id", "visual", "camera", "transition")
            _text(iss, sh, sw, "at", num_ok=True)
            _strs(iss, sh, "actors", sw)
            for k in ("animation", "graphics", "sfx"):
                for ev in _dicts(iss, sh, k, sw):
                    _text(iss, ev, f"{sw}.{k}", "what", "type", "text", "sound", "note")
                    _text(iss, ev, f"{sw}.{k}", "at", num_ok=True)
            amb = sh.get("ambience")
            if amb is not None and not isinstance(amb, (str, list)):
                iss.error("schema", f"{sw}.ambience", "ambience: имя фона или список")
                sh.pop("ambience")
            elif isinstance(amb, list):
                sh["ambience"] = [a for a in amb if isinstance(a, str) or (isinstance(a, dict) and isinstance(a.get("sound"), str))]
        if b.get("marks") is not None and not isinstance(b["marks"], dict):
            iss.error("schema", f"{w}.marks", "marks: {фраза: цвет}")
            b["marks"] = {}
    for i, lp in enumerate(_dicts(iss, s, "loops", "")):
        _text(iss, lp, f"loops[{i}]", "id", "question", "open", "close")
    eng = _as(iss, s, "engagement", dict, "")
    _text(iss, eng, "engagement", "comment", "share", "save", "follow", "rewatch")
    cta = _as(iss, eng, "cta", dict, "engagement")
    _text(iss, cta, "engagement.cta", "beat", "text", "type")
    pk = _as(iss, s, "package", dict, "")
    _text(iss, pk, "package", "first_frame")
    for p in list(pk):
        if p in platforms():
            pp = _as(iss, pk, p, dict, "package")
            _text(iss, pp, f"package.{p}", "caption", "description", "title", "cover", "sound")
            if isinstance(pp.get("hashtags"), str):
                pp["hashtags"] = pp["hashtags"].split()
            _strs(iss, pp, "hashtags", f"package.{p}")
    pr = _as(iss, s, "production", dict, "")
    for k in ("theme", "music"):
        if pr.get(k) is not None and not isinstance(pr[k], dict):
            iss.error("schema", f"production.{k}", f"`{k}` должно быть словарём")
            pr.pop(k)
    rv = _as(iss, s, "review", dict, "")
    sc = _as(iss, rv, "scores", dict, "review")
    for k in list(sc):
        if not _num(sc[k]):
            iss.error("schema", f"review.scores.{k}", "оценка — число 1–10")
            sc.pop(k)
    for k in ("weak_points", "improvements"):
        _as(iss, rv, k, list, "review")
    return s


def validate(s, iss):
    """Structure and cross-references. Content quality rules live in lint.py."""
    normalize(s, iss)
    meta = s.get("meta") or {}
    _req(iss, s, "meta", "meta", dict)
    for k in ("title", "topic", "format"):
        _req(iss, meta, k, f"meta.{k}")
    fmt = meta.get("format")
    if fmt and fmt not in formats():
        iss.error("format", "meta.format", f"неизвестный формат '{fmt}' (есть: {', '.join(formats())})")
    for p in meta.get("platforms") or []:
        if p not in platforms():
            iss.error("platform", "meta.platforms", f"неизвестная площадка '{p}' (есть: {', '.join(platforms())})")
    dur = meta.get("duration", 60)
    if not isinstance(dur, (int, float)) or not 10 <= dur <= 180:
        iss.error("schema", "meta.duration", "длительность — число секунд от 10 до 180")
    if meta.get("genre") and meta["genre"] not in ("fiction", "nonfiction"):
        iss.error("schema", "meta.genre", "genre: nonfiction (по умолчанию: факты, объяснения) | fiction (вымысел: мистика, фантастика, серии)")
    if meta.get("style", "draw") not in STYLES:
        iss.error("schema", "meta.style", "style: " + " | ".join(STYLES))

    brief = s.get("brief") or {}
    _req(iss, s, "brief", "brief", dict)
    for k in ("goal", "promise"):
        _req(iss, brief, k, f"brief.{k}")
    aud = brief.get("audience")
    if not isinstance(aud, dict) or not aud.get("who"):
        iss.error("schema", "brief.audience", "нужно описание аудитории: audience: {who, age, pains, desires, knowledge}")
    for k in brief.get("kpi") or []:
        if k not in KPIS:
            iss.warn("schema", "brief.kpi", f"неизвестная метрика '{k}' (есть: {', '.join(KPIS)})")

    # research
    res = s.get("research") or {}
    facts = {}
    for i, f in enumerate(res.get("facts") or []):
        w = f"research.facts[{i}]"
        if not isinstance(f, dict) or not f.get("id") or not f.get("text"):
            iss.error("schema", w, "факт: {id, text, source, confidence}")
            continue
        if f["id"] in facts:
            iss.error("dup", w, f"повтор id факта '{f['id']}'")
        facts[f["id"]] = f
        if f.get("confidence", "medium") not in ("high", "medium", "low"):
            iss.error("schema", w, "confidence: high | medium | low")
    angles = {a.get("id") for a in res.get("angles") or [] if isinstance(a, dict)}
    if res.get("chosen_angle") and res["chosen_angle"] not in angles:
        iss.error("ref", "research.chosen_angle", f"нет угла '{res['chosen_angle']}' в research.angles")

    # hooks
    hk = s.get("hooks") or {}
    hooks = {}
    for i, h in enumerate(hk.get("variants") or []):
        w = f"hooks.variants[{i}]"
        if not isinstance(h, dict) or not h.get("id") or not h.get("vo"):
            iss.error("schema", w, "вариант крючка: {id, type, vo, on_screen, visual, score, why}")
            continue
        if h["id"] in hooks:
            iss.error("dup", w, f"повтор id крючка '{h['id']}'")
        hooks[h["id"]] = h
        if h.get("type") not in hook_types():
            iss.error("hook_type", w, f"неизвестный тип крючка '{h.get('type')}' (есть: {', '.join(hook_types())})")
    if hk.get("primary") and hk["primary"] not in hooks:
        iss.error("ref", "hooks.primary", f"нет крючка '{hk['primary']}'")
    for h in hk.get("ab") or []:
        if h not in hooks:
            iss.error("ref", "hooks.ab", f"нет крючка '{h}'")

    # beats & shots
    beats = s.get("beats")
    if not isinstance(beats, list) or not beats:
        iss.error("schema", "beats", "нет блоков сценария (beats)")
        beats = []
    bids, sids = set(), set()
    for i, b in enumerate(beats):
        w = f"beats[{i}]"
        if not isinstance(b, dict):
            iss.error("schema", w, "блок должен быть словарём")
            continue
        bid = b.get("id")
        if not bid or not ID_RE.match(str(bid)):
            iss.error("schema", w, "id блока — латиница/цифры/_ (станет id сцены): например hook, step1")
        elif bid in bids:
            iss.error("dup", w, f"повтор id блока '{bid}'")
        bids.add(bid)
        w = f"beats.{bid or i}"
        if b.get("role") not in roles():
            iss.error("role", w, f"неизвестная роль '{b.get('role')}' (есть: {', '.join(roles())})")
        if not isinstance(b.get("vo"), str) or not b["vo"].strip():
            iss.error("schema", w, "нет текста диктора (vo)")
        for d in b.get("devices") or []:
            if d not in devices():
                iss.error("device", w, f"неизвестный приём '{d}' (есть: {', '.join(devices())})")
        for f in b.get("facts") or []:
            if f not in facts:
                iss.error("ref", w, f"нет факта '{f}' в research.facts")
        if b.get("music") and b["music"] not in MUSIC_STYLES:
            iss.error("schema", w, f"music: {' | '.join(MUSIC_STYLES)}")
        shots = b.get("shots")
        if not isinstance(shots, list) or not shots:
            iss.error("schema", w, "нет кадров (shots)")
            continue
        for j, sh in enumerate(shots):
            sw = f"{w}.shots[{j}]"
            if not isinstance(sh, dict):
                iss.error("schema", sw, "кадр должен быть словарём")
                continue
            sid = sh.get("id")
            if not sid or not ID_RE.match(str(sid)):
                iss.error("schema", sw, "id кадра — латиница/цифры/_")
            elif sid in sids:
                iss.error("dup", sw, f"повтор id кадра '{sid}' (id кадров уникальны во всём сценарии)")
            sids.add(sid)
            if not sh.get("visual"):
                iss.error("schema", f"{w}.{sid}", "нет описания кадра (visual)")
            if sh.get("transition") and str(sh["transition"]).split()[0] not in TRANSITIONS:
                iss.error("schema", f"{w}.{sid}", f"transition: {' | '.join(TRANSITIONS)}")
            for key in ("animation", "graphics", "sfx"):
                for k, ev in enumerate(sh.get(key) or []):
                    if not isinstance(ev, dict):
                        iss.error("schema", f"{w}.{sid}.{key}[{k}]", "событие — словарь {at, ...}")

    # loops
    for i, lp in enumerate(s.get("loops") or []):
        w = f"loops[{i}]"
        if not isinstance(lp, dict) or not lp.get("id") or not lp.get("question"):
            iss.error("schema", w, "петля: {id, question, open, close}")
            continue
        for k in ("open", "close"):
            if lp.get(k) not in bids:
                iss.error("ref", w, f"{k}: нет блока '{lp.get(k)}'")

    eng = s.get("engagement") or {}
    cta = eng.get("cta") or {}
    if cta and cta.get("beat") not in bids:
        iss.error("ref", "engagement.cta.beat", f"нет блока '{cta.get('beat')}'")
    return {"facts": facts, "hooks": hooks, "beat_ids": bids, "shot_ids": sids}
