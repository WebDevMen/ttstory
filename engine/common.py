"""Shared helpers: paths, project loading with defaults, colors and time references."""
import copy
import json
import math
import os
import re

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.environ.get("VG_MODELS", os.path.join(ROOT, "models"))

DEFAULTS = {
    "title": "",
    "format": {"width": 1080, "height": 1920, "fps": 30, "plate_scale": 1.2},
    "voice": {
        "engine": "edge",
        "voice": "ru-RU-DmitryNeural",
        "rate": "+20%",
        "pitch": "+0Hz",
        "lead_in": 0.25,          # silence before the first word
        "gap": 0.42,              # silence between scenes (override per scene: gap_after)
        "tail": 1.6,              # hold after the last word
        "pause_long": 0.55,       # pauses longer than this are shortened ...
        "pause_short": 0.28,      # ... to this
        "keep_pauses": {},        # {"word": seconds} pauses after these words are kept longer
        "scene_lead": 0.22,       # a scene's picture starts this much before its first word
    },
    "theme": {
        "preset": "scifi",        # scifi | minimal | pop | documentary (engine/hud/themes/*.css)
        "accent": "64,255,230",
        "frame": {"brackets": True, "topbar": None},
        "captions": {"enabled": True, "style": "neon_word", "top": 1250, "size": 64, "uppercase": True,
                     "max_words": 4, "max_chars": 19, "colors": {}},
    },
    "post": {"vignette": 0.42, "chromatic": 0.0016, "grain": 0.022},
    "audio": {"music": {"preset": "synth", "key": "D", "bpm": 100, "gain": -13, "sections": []},
              "ambience": {}, "sfx": [], "auto": {"hud": True, "transitions": True, "boot": True},
              "duck": 0.6, "vo_gain": 0.0, "loudness": -14},
    "hud": [],
    "cues": {},
    "scenes": [],
}


def deep_merge(base, over):
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def project_dir(pid):
    return os.path.join(ROOT, "projects", pid)


def build_dir(pid, *sub):
    d = os.path.join(ROOT, "build", pid, *sub)
    os.makedirs(d, exist_ok=True)
    return d


def load_project(pid):
    path = os.path.join(project_dir(pid), "project.yaml")
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    p = deep_merge(DEFAULTS, raw)
    p["id"] = pid
    ids = [s["id"] for s in p["scenes"]]
    if len(ids) != len(set(ids)):
        raise ValueError("scene ids must be unique")
    return p


def load_timeline(pid):
    with open(os.path.join(build_dir(pid), "timeline.json"), encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


# ----------------------------------------------------------------------------- colors
NAMED = {
    "teal": "64,255,230", "green": "70,255,150", "red": "255,60,80", "amber": "255,176,40", "toxic": "200,255,60",
    "violet": "200,120,255", "pink": "255,120,200", "orange": "255,170,90", "white": "255,255,255", "gold": "255,200,110",
    "blue": "80,170,255", "black": "0,0,0",
}


def rgb255(c):
    """Any color spec -> (r, g, b) ints 0..255. Accepts '#rrggbb', 'r,g,b', named, [r,g,b] (0..1 or 0..255)."""
    if c is None:
        return (255, 255, 255)
    if isinstance(c, (list, tuple)):
        v = [float(x) for x in c]
        if max(v) <= 1.0:
            v = [x * 255 for x in v]
        return tuple(int(round(x)) for x in v[:3])
    s = str(c).strip()
    s = NAMED.get(s, s)
    if s.startswith("#"):
        s = s[1:]
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    return tuple(int(float(x)) for x in s.split(","))


def rgb01(c):
    return tuple(x / 255.0 for x in rgb255(c))


def css_rgb(c):
    return ",".join(str(x) for x in rgb255(c))


# ----------------------------------------------------------------------------- words & time references
PUNCT = "«»…,.!?:;—–\"'()"


def norm_word(w):
    return w.strip(PUNCT).lower().replace("ё", "е")


REF_RE = re.compile(r"^@(.+?)([+-]\d+(?:\.\d+)?)?$")


class Refs:
    """Resolves time references used everywhere in project.yaml.

    Forms (all absolute seconds unless noted):
      12.5                  plain number = absolute time in the video
      "@Вода"               start of the word in the current scene ("@Вода#2" = 2nd occurrence, "@Вода.end" = its end)
      "@s3/вдоха.end"       word in another scene
      "@intro.start" / "@intro.end" / "@intro.vo_start" / "@intro.vo_end"   scene boundaries
      "@start" / "@end"     start/end of the current context (scene for HUD items, shot for camera/effects)
      "@shot:door.start"    shot boundaries
      "@cue:slam"           named cue (project or scene `cues:`)
      "@video.end"          end of the video
      any of them + offset: "@Вода+0.3", "@end-0.25"
    """

    def __init__(self, words, scenes, shots=None, cues=None, duration=None):
        self.words, self.scenes = words, {s["id"]: s for s in scenes}
        self.shots = {s["id"]: s for s in (shots or [])}
        self.cues = cues or {}
        self.duration = duration

    def word(self, scene, text, nth=1, edge="start"):
        key = norm_word(text)
        hits = [w for w in self.words if (scene is None or w["scene"] == scene) and norm_word(w["text"]) == key]
        if len(hits) < nth:
            raise KeyError(f"word '{text}' #{nth} not found in scene '{scene}'")
        return hits[nth - 1][edge]

    def resolve(self, v, scene=None, ctx=None):
        """ctx = (start, end) of the current context for @start/@end."""
        if v is None or isinstance(v, (int, float)):
            return v
        if not isinstance(v, str) or not v.startswith("@"):
            return v
        m = REF_RE.match(v.strip())
        if not m:
            raise ValueError(f"bad time reference: {v}")
        target, off = m.group(1), float(m.group(2) or 0)
        return self._target(target, scene, ctx) + off

    def _target(self, tg, scene, ctx):
        if tg in ("start", "end"):
            if ctx is None:
                raise ValueError(f"@{tg} used outside of a scene/shot")
            return ctx[0] if tg == "start" else ctx[1]
        if tg == "video.end":
            return self.duration
        if tg == "video.start":
            return 0.0
        if tg.startswith("cue:"):
            name = tg[4:]
            if name not in self.cues:
                raise KeyError(f"unknown cue '{name}' (cues resolved so far: {list(self.cues)})")
            return self.cues[name]
        if tg.startswith("shot:"):
            sid, _, edge = tg[5:].partition(".")
            return self.shots[sid][edge or "start"]
        sc = scene
        if "/" in tg:
            sc, tg = tg.split("/", 1)
        head, dot, tail = tg.rpartition(".")
        if dot and head in self.scenes and tail in ("start", "end", "vo_start", "vo_end"):
            return self.scenes[head][tail]
        edge = "start"
        if dot and tail in ("start", "end"):
            tg, edge = head, tail
        nth = 1
        if "#" in tg:
            tg, n = tg.split("#", 1)
            nth = int(n)
        return self.word(sc, tg, nth, edge)

    def deep(self, obj, scene=None, ctx=None):
        """Resolve every '@...' string inside nested dicts/lists."""
        if isinstance(obj, dict):
            return {k: self.deep(v, scene, ctx) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self.deep(v, scene, ctx) for v in obj]
        return self.resolve(obj, scene, ctx)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def fmt_t(t):
    return f"{int(t // 60)}:{t % 60:05.2f}" if t is not None else "-"


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_inout(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def lerp(a, b, x):
    return a + (b - a) * x


def finite(x):
    return x is not None and not (isinstance(x, float) and math.isnan(x))
