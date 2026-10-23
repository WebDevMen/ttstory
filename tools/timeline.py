"""Assemble the voiceover into one track and derive the master timeline.

Usage: python timeline.py <vo_dir> <out_dir>
Reads s1..s5.mp3 + words.json from <vo_dir>; writes <out_dir>/vo.wav and <out_dir>/timeline.json.
All times in the timeline are absolute seconds of the final video.
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

SR = 48000
FPS = 30
LEAD_IN = 0.25        # silence before the first word
SCENE_GAP = {"s1": 0.42, "s2": 0.50, "s3": 0.42, "s4": 1.05, "s5": 0.0}  # silence after each scene (transition hits live here)
TAIL = 1.60           # hold on the final call to action
LONG_GAP = 0.55       # pauses longer than this get shortened...
SHORT_GAP = 0.28      # ...down to this
KEEP_GAPS = {("s4", "Гости"): 0.45, ("s4", "снаружи"): 0.36}  # dramatic pauses we keep longer

vo_dir, out_dir = sys.argv[1:3]
sys.argv = sys.argv[:1] + [out_dir]  # voiceover.py only defines data at import time apart from main()
SOURCE_TEXT = {}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "voiceover.py"), encoding="utf-8") as f:
    _src = f.read()
exec(_src[_src.index("SCENES = {"):_src.index("async def synth")], SOURCE_TEXT)
SOURCE_TEXT = SOURCE_TEXT["SCENES"]
os.makedirs(out_dir, exist_ok=True)
words_all = json.load(open(os.path.join(vo_dir, "words.json")))


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


track = [np.zeros(int(LEAD_IN * SR), np.float32)]
cursor = LEAD_IN
scenes, words_out = [], []
for key in ["s1", "s2", "s3", "s4", "s5"]:
    audio = decode(os.path.join(vo_dir, key + ".mp3"))
    words = words_all[key]
    # Cut list: keep [a, b) segments of the scene audio, shrinking long gaps.
    head = max(0.0, words[0]["start"] - 0.03)
    segs, shift = [], []
    seg_start = head
    removed = head
    for i, w in enumerate(words):
        shift.append(removed)
        if i + 1 < len(words):
            gap = words[i + 1]["start"] - w["end"]
            target = KEEP_GAPS.get((key, w["text"]), SHORT_GAP)
            if gap > max(LONG_GAP, target + 0.05):
                cut_a = w["end"] + target / 2
                cut_b = words[i + 1]["start"] - target / 2
                segs.append((seg_start, cut_a))
                removed += cut_b - cut_a
                seg_start = cut_b
    tail_end = min(len(audio) / SR, words[-1]["end"] + 0.12)
    segs.append((seg_start, tail_end))
    pieces = []
    fade = int(0.006 * SR)
    for a, b in segs:
        p = audio[int(a * SR): int(b * SR)].copy()
        if len(p) > 2 * fade:
            p[:fade] *= np.linspace(0, 1, fade)
            p[-fade:] *= np.linspace(1, 0, fade)
        pieces.append(p)
    scene_audio = np.concatenate(pieces)
    scene_start = cursor
    # Recover punctuation around each token from the source text (for caption phrasing).
    src_text = SOURCE_TEXT[key]
    pos = 0
    puncts = []
    for w in words:
        i = src_text.find(w["text"], pos)
        pre = src_text[pos:i].strip() if i >= 0 else ""
        j = i + len(w["text"]) if i >= 0 else pos
        k = j
        while k < len(src_text) and src_text[k] in " »…,.!?:—":
            k += 1
        puncts.append((pre[-1:] if pre else "", src_text[j:k].strip()))
        pos = k
    for w, sh, (pre, post) in zip(words, shift, puncts):
        words_out.append({"scene": key, "text": w["text"], "pre": pre, "post": post,
                          "start": round(scene_start + w["start"] - sh, 3),
                          "end": round(scene_start + w["end"] - sh, 3)})
    track.append(scene_audio)
    cursor += len(scene_audio) / SR
    scenes.append({"id": key, "vo_start": round(scene_start, 3), "vo_end": round(cursor, 3)})
    gap = SCENE_GAP[key] if key != "s5" else TAIL
    track.append(np.zeros(int(gap * SR), np.float32))
    cursor += gap

vo = np.concatenate(track)
duration = len(vo) / SR
sf.write(os.path.join(out_dir, "vo.wav"), vo, SR, subtype="FLOAT")


def word_t(scene, text, nth=0, edge="start"):
    hits = [w for w in words_out if w["scene"] == scene and w["text"].strip("«»…,.!?:—").lower() == text.lower()]
    return hits[nth][edge]


# Visual scene boundaries: cut slightly before the next scene's first word.
for i, s in enumerate(scenes):
    s["start"] = 0.0 if i == 0 else round(s["vo_start"] - 0.22, 3)
for i, s in enumerate(scenes):
    s["end"] = scenes[i + 1]["start"] if i + 1 < len(scenes) else round(duration, 3)

S = {s["id"]: s for s in scenes}
shots = [
    {"id": "deck", "plate": "p1_deck", "start": S["s1"]["start"], "end": S["s1"]["end"]},
    {"id": "tarp", "plate": "p2_tarp", "start": S["s2"]["start"], "end": word_t("s2", "Второе") - 0.12},
    {"id": "corridor", "plate": "p3_corridor", "start": word_t("s2", "Второе") - 0.12, "end": word_t("s2", "Это") - 0.10},
    {"id": "door", "plate": "p4_door", "start": word_t("s2", "Это") - 0.10, "end": S["s2"]["end"]},
    {"id": "flare", "plate": "p5_flare", "start": S["s3"]["start"], "end": word_t("s3", "Второе") - 0.12},
    {"id": "hatch", "plate": "p6_hatch", "start": word_t("s3", "Второе") - 0.12, "end": S["s3"]["end"]},
    {"id": "leak", "plate": "p7_leak", "start": S["s4"]["start"], "end": word_t("s4", "Второй") - 0.12},
    {"id": "porthole", "plate": "p8_porthole", "start": word_t("s4", "Второй") - 0.12, "end": S["s4"]["end"]},
    {"id": "compass", "plate": "p9_compass", "start": S["s5"]["start"], "end": round(duration, 3)},
]
for sh in shots:
    sh["start"], sh["end"] = round(sh["start"], 3), round(sh["end"], 3)

# Named cue points shared by the scene renderer, the HUD and the sound design.
cues = {
    "s1_stats": word_t("s1", "Вода"),
    "s1_not_alone": word_t("s1", "не"),
    "s1_title": word_t("s1", "Вот"),
    "s2_marker": S["s2"]["vo_start"] - 0.05,
    "s2_never": word_t("s2", "Никогда"),
    "s2_schematic": word_t("s2", "Собери"),
    "s2_evaporator": word_t("s2", "сооруди"),
    "s2_map": word_t("s2", "забаррикадируй"),
    "s2_safezone": word_t("s2", "капитанский"),
    "s2_door_close": word_t("s2", "последняя"),
    "s2_door_slam": word_t("s2", "крепость", 0, "end") + 0.05,
    "s3_marker": S["s3"]["vo_start"] - 0.05,
    "s3_flare_block": word_t("s3", "включай"),
    "s3_not_only_people": word_t("s3", "выжили"),
    "s3_biohazard": word_t("s3", "спускайся"),
    "s3_breaths": word_t("s3", "убьют"),
    "s4_marker": S["s4"]["vo_start"] - 0.05,
    "s4_leak": word_t("s4", "коррозия"),
    "s4_rot": word_t("s4", "прогниёт"),
    "s4_guests": word_t("s4", "Ночные"),
    "s4_scrape": word_t("s4", "скрежет"),
    "s4_lock": word_t("s4", "запрись"),
    "s4_light_off": word_t("s4", "выключи"),
    "s4_lightning": word_t("s4", "дыши") - 0.05,
    "s5_fuel": word_t("s5", "Топливо"),
    "s5_city": word_t("s5", "мегаполис"),
    "s5_storm": word_t("s5", "шторм"),
    "s5_choice": word_t("s5", "решение"),
    "s5_choice_a": word_t("s5", "останешься"),
    "s5_choice_b": word_t("s5", "рискнёшь"),
    "s5_comment": word_t("s5", "Напиши"),
}
cues = {k: round(v, 3) for k, v in cues.items()}

timeline = {"fps": FPS, "duration": round(duration, 3), "frames": int(round(duration * FPS)),
            "scenes": scenes, "shots": shots, "cues": cues, "words": words_out}
json.dump(timeline, open(os.path.join(out_dir, "timeline.json"), "w"), ensure_ascii=False, indent=1)
print(f"duration {duration:.2f}s")
for s in scenes:
    print(s)
for sh in shots:
    print(sh["id"], sh["start"], sh["end"], round(sh["end"] - sh["start"], 2))
