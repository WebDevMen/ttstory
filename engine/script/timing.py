"""Timing of a script before production.

estimate: speech = 0.132 s × syllables / (1 + rate) + 0.795 s × sentence stops + 0.259 s × commas/dashes/colons.
Fitted on 21 real scenes of the repo's projects (Edge TTS, Dmitry/Svetlana, rates +8…+22%): mean error 0.24 s per scene,
≈1% over a whole video. `tts=True` synthesizes every beat with the real voice (cached) and uses exact word timings.
The video timeline then follows engine/compile.py: lead_in + speech + gaps between scenes + tail.
"""
import hashlib
import json
import os
import re

from ..common import DEFAULTS, build_dir, norm_word

SEC_PER_SYL, STOP, COMMA = 0.132, 0.795, 0.259
VOWELS = re.compile(r"[аеёиоуыэюяaeiouy]", re.I)
STOPS = re.compile(r"[.!?…]+")
COMMAS = re.compile(r"[,:;—–]")
TOKEN = re.compile(r"[^\s]+")


def voice_cfg(s):
    v = {**DEFAULTS["voice"], **((s.get("meta") or {}).get("voice") or {})}
    try:
        v["rate_f"] = float(str(v.get("rate", "+20%")).strip().rstrip("%")) / 100
    except ValueError:
        v["rate_f"] = 0.2
    return v


def syllables(word):
    n = len(VOWELS.findall(word))
    digits = sum(len(g) for g in re.findall(r"\d+", word))
    return n + 2 * digits                     # a digit is read as ~2 syllables ("двадцать пять")


def _words(text):
    """Tokens with the pause that follows each one (seconds) and their syllables."""
    out = []
    for tok in TOKEN.findall(text):
        core = norm_word(tok)
        pause = STOP * len(STOPS.findall(tok)) + COMMA * len(COMMAS.findall(tok))
        if not core and out:                  # a standalone dash/punctuation token
            out[-1]["pause"] += pause
            continue
        if not core:
            continue
        out.append({"text": tok, "norm": core, "syl": syllables(tok), "pause": pause})
    return out


def estimate_speech(text, rate_f):
    ws = _words(text)
    k = SEC_PER_SYL / (1 + rate_f)
    t, out = 0.0, []
    for w in ws:
        d = max(0.04, w["syl"] * k)
        out.append({"text": w["text"], "norm": w["norm"], "start": t, "end": t + d})
        t += d + w["pause"]
    return out, t


def tts_speech(pid, beat_id, text, v):
    """Real Edge-TTS word timings (cached), with long pauses shortened like engine/compile.py."""
    from ..tts import _patch_certifi
    d = build_dir(pid, "script_tts")
    key = hashlib.sha1(json.dumps([text, v["voice"], v["rate"], v["pitch"]], ensure_ascii=False).encode()).hexdigest()[:12]
    f = os.path.join(d, f"{beat_id}.json")
    words = None
    if os.path.exists(f):
        m = json.load(open(f, encoding="utf-8"))
        if m.get("key") == key:
            words = m["words"]
    if words is None:
        _patch_certifi(pid)
        from ..tts import _synth_robust     # same pitch-nudge retry as the real voice-over (DmitryNeural refuses some requests)
        words = _synth_robust(text, v["voice"], v["rate"], v["pitch"], os.path.join(d, f"{beat_id}.mp3"))
        json.dump({"key": key, "words": words}, open(f, "w", encoding="utf-8"), ensure_ascii=False)
    out, shift, t0 = [], 0.0, words[0]["start"]
    for i, w in enumerate(words):
        out.append({"text": w["text"], "norm": norm_word(w["text"]), "start": w["start"] - t0 - shift, "end": w["end"] - t0 - shift})
        if i + 1 < len(words):
            gap = words[i + 1]["start"] - w["end"]
            if gap > v["pause_long"]:
                shift += gap - v["pause_short"]
    return out, out[-1]["end"] + 0.12


def timeline(s, pid=None, tts=False):
    """Beat timeline: picture start/end, voice start/end and word times (absolute seconds)."""
    v = voice_cfg(s)
    beats = [b for b in (s.get("beats") or []) if isinstance(b, dict) and isinstance(b.get("vo"), str) and b["vo"].strip()]
    cur = v["lead_in"]
    out = []
    for i, b in enumerate(beats):
        if tts:
            words, speech = tts_speech(pid, b.get("id", f"b{i}"), b["vo"].strip(), v)
        else:
            words, speech = estimate_speech(b["vo"], v["rate_f"])
        st = cur
        out.append({"id": b.get("id"), "role": b.get("role"), "vo_start": st, "vo_end": st + speech, "speech": speech,
                    "words": [{**w, "start": st + w["start"], "end": st + w["end"]} for w in words]})
        cur = st + speech + (v["tail"] if i == len(beats) - 1 else float(b.get("gap_after", v["gap"])))
    for i, b in enumerate(out):
        b["start"] = 0.0 if i == 0 else b["vo_start"] - v["scene_lead"]
    for i, b in enumerate(out):
        b["end"] = out[i + 1]["start"] if i + 1 < len(out) else cur
    return {"beats": out, "total": cur, "source": "tts" if tts else "estimate", "voice": v}


REF = re.compile(r"^@(?:(?P<beat>[a-z][a-z0-9_]*)/)?(?P<word>[^#+\-.]+?)(?:#(?P<n>\d+))?(?P<edge>\.end)?(?P<off>[+-]\d+(?:\.\d+)?)?$")


def resolve(at, beat, tl_by_id):
    """'@слово', '@слово#2', '@слово.end', '@слово+0.3', '@start', '@end', '@beat/слово' or seconds from the beat start.
    Returns (absolute seconds, error message or None)."""
    b = tl_by_id.get(beat)
    if b is None:
        return None, f"нет блока '{beat}'"
    if at is None or at == "start":
        return b["start"], None
    if isinstance(at, (int, float)):
        return b["start"] + float(at), None
    m = REF.match(str(at).strip())
    if not m:
        return None, f"не понимаю время '{at}' (нужно \"@слово\", \"@слово+0.3\", \"@start\" или секунды от начала блока)"
    off = float(m.group("off") or 0)
    word = m.group("word")
    if word in ("start", "end") and not m.group("beat"):
        return (b["start"] if word == "start" else b["end"]) + off, None
    tb = tl_by_id.get(m.group("beat") or beat)
    if tb is None:
        return None, f"нет блока '{m.group('beat')}'"
    key, n = norm_word(word), int(m.group("n") or 1)
    hits = [w for w in tb["words"] if w["norm"] == key]
    if len(hits) < n:
        return None, f"слова «{word}»{'#' + str(n) if n > 1 else ''} нет в тексте блока {tb['id']}"
    w = hits[n - 1]
    return (w["end"] if m.group("edge") else w["start"]) + off, None


def fmt(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"
