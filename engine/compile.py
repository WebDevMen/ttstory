"""Compile project.yaml + voiceover into build/<project>/timeline.json (the single source of truth for all renderers).

- assembles the voiceover track (vo.wav) with shortened long pauses and scene gaps
- recovers punctuation for captions
- resolves every time reference ("@word", "@scene.end", "@cue:name", ...) to absolute seconds
"""
import glob
import json
import os
import subprocess

import numpy as np
import soundfile as sf

from .common import Refs, build_dir, css_rgb, deep_merge, load_project, norm_word, project_dir, save_json

SR = 48000


def _decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def _punct(text, words):
    """Attach punctuation found in the source text to each TTS word token."""
    pos, out = 0, []
    for w in words:
        i = text.find(w["text"], pos)
        if i < 0:
            out.append(("", ""))
            continue
        pre = text[pos:i].strip()
        j = k = i + len(w["text"])
        while k < len(text) and text[k] in " »…,.!?:;—–)":
            k += 1
        out.append((pre[-1:] if pre and pre[-1] in "«(\"" else "", text[j:k].strip()))
        pos = k
    return out


def run(pid):
    p = load_project(pid)
    v = p["voice"]
    vo_dir = os.path.join(build_dir(pid), "vo")
    keep = {norm_word(k): float(x) for k, x in (v.get("keep_pauses") or {}).items()}

    track = [np.zeros(int(v["lead_in"] * SR), np.float32)]
    cursor = v["lead_in"]
    scenes, words_out = [], []
    for si, sc in enumerate(p["scenes"]):
        meta = json.load(open(os.path.join(vo_dir, f"{sc['id']}.json"), encoding="utf-8"))
        words = meta["words"]
        audio = _decode(os.path.join(vo_dir, f"{sc['id']}.mp3"))
        head = max(0.0, words[0]["start"] - 0.03)
        segs, shift, seg_start, removed = [], [], head, head
        for i, w in enumerate(words):
            shift.append(removed)
            if i + 1 < len(words):
                gap = words[i + 1]["start"] - w["end"]
                target = keep.get(norm_word(w["text"]), v["pause_short"])
                if gap > max(v["pause_long"], target + 0.05):
                    a, b = w["end"] + target / 2, words[i + 1]["start"] - target / 2
                    segs.append((seg_start, a))
                    removed += b - a
                    seg_start = b
        segs.append((seg_start, min(len(audio) / SR, words[-1]["end"] + 0.12)))
        fade = int(0.006 * SR)
        pieces = []
        for a, b in segs:
            x = audio[int(a * SR):int(b * SR)].copy()
            if len(x) > 2 * fade:
                x[:fade] *= np.linspace(0, 1, fade)
                x[-fade:] *= np.linspace(1, 0, fade)
            pieces.append(x)
        sa = np.concatenate(pieces)
        st = cursor
        for w, sh, (pre, post) in zip(words, shift, _punct(sc["text"], words)):
            words_out.append({"scene": sc["id"], "text": w["text"], "pre": pre, "post": post,
                              "start": round(st + w["start"] - sh, 3), "end": round(st + w["end"] - sh, 3)})
        track.append(sa)
        cursor += len(sa) / SR
        scenes.append({"id": sc["id"], "vo_start": round(st, 3), "vo_end": round(cursor, 3)})
        last = si == len(p["scenes"]) - 1
        gap = v["tail"] if last else float(sc.get("gap_after", v["gap"]))
        track.append(np.zeros(int(gap * SR), np.float32))
        cursor += gap
    vo = np.concatenate(track)
    duration = round(len(vo) / SR, 3)
    sf.write(os.path.join(build_dir(pid), "vo.wav"), vo, SR, subtype="FLOAT")

    for i, s in enumerate(scenes):
        s["start"] = 0.0 if i == 0 else round(s["vo_start"] - v["scene_lead"], 3)
    for i, s in enumerate(scenes):
        s["end"] = scenes[i + 1]["start"] if i + 1 < len(scenes) else duration

    for sc in p["scenes"]:
        for phrase, color in (sc.get("caption_marks") or {}).items():
            seq = [norm_word(w) for w in str(phrase).split()]
            ws = [w for w in words_out if w["scene"] == sc["id"]]
            hit = False
            for i in range(len(ws) - len(seq) + 1):
                if [norm_word(w["text"]) for w in ws[i:i + len(seq)]] == seq:
                    for w in ws[i:i + len(seq)]:
                        w["mark"] = css_rgb(color)
                    hit = True
            if not hit:
                print(f"  ! caption_marks: '{phrase}' not found in scene {sc['id']}")

    refs = Refs(words_out, scenes, duration=duration)
    # cues: scene-level first (scene context), then project-level
    for sc, s in zip(p["scenes"], scenes):
        for name, spec in (sc.get("cues") or {}).items():
            refs.cues[name] = round(refs.resolve(spec, sc["id"], (s["start"], s["end"])), 3)
    for name, spec in (p.get("cues") or {}).items():
        refs.cues[name] = round(refs.resolve(spec, None, (0, duration)), 3)

    # shots
    shots = []
    for sc, s in zip(p["scenes"], scenes):
        lst = sc.get("shots") or []
        if not lst:
            raise ValueError(f"scene {sc['id']} has no shots")
        starts = []
        for i, sh in enumerate(lst):
            starts.append(s["start"] if i == 0 else refs.resolve(sh.get("start"), sc["id"], (s["start"], s["end"])))
        for i, sh in enumerate(lst):
            shots.append({"raw": sh, "scene": sc["id"], "id": sh["id"], "plate": None if sh.get("draw") is not None else sh.get("plate", sh["id"]),
                          "start": round(starts[i], 3), "end": round(starts[i + 1] if i + 1 < len(lst) else s["end"], 3)})
    refs.shots = {x["id"]: x for x in shots}

    def camera(raw, x, ctx):
        """Camera spec with keys whose `t` is shot-relative ("end", "end-0.5" and "@refs" allowed)."""
        raw_cam = dict(raw or {})
        raw_keys = raw_cam.pop("keys", None) or [{"t": 0}]
        cam = refs.deep(raw_cam, x["scene"], ctx)
        keys = []
        for k in raw_keys:
            k = dict(k)
            t = k.get("t", 0)
            if isinstance(t, str) and t.startswith("end"):          # "end", "end-0.5" (relative to shot end)
                t = ctx[1] - ctx[0] + float(t[3:] or 0)
            elif isinstance(t, str) and t.startswith("@"):          # absolute reference -> shot-relative
                t = refs.resolve(t, x["scene"], ctx) - x["start"]
            k["t"] = float(t)
            keys.append(k)
        cam["keys"] = sorted(keys, key=lambda k: k["t"])
        return cam

    draw_defaults = p.get("draw") or {}
    for x in shots:
        sh, ctx = x.pop("raw"), (x["start"], x["end"])
        if sh.get("draw") is not None:                             # code-drawn shot (engine/hud/draw)
            d = deep_merge(draw_defaults, sh["draw"])
            raw_cam = d.pop("camera", None)
            d = refs.deep(d, x["scene"], ctx)
            d["camera"] = camera(raw_cam, x, ctx)
            x["draw"] = d
            x["plate"] = None
        x.update({
            "camera": camera(sh.get("camera"), x, ctx),
            "masks": sh.get("masks") or {},
            "effects": refs.deep(sh.get("effects") or [], x["scene"], ctx),
            "look": sh.get("look") or {},
            "transition": sh.get("transition") or {"type": "cut"},
            "anchors": sh.get("anchors") or {},
            "captions_top": sh.get("captions_top"),
        })

    # HUD instances
    hud = []
    scene_ctx = {s["id"]: (s["start"], s["end"]) for s in scenes}

    def add_hud(item, scene_id, ctx):
        it = refs.deep(dict(item), scene_id, ctx)
        if "component" not in it:
            raise ValueError(f"HUD item without component: {item}")
        it["at"] = float(it.get("at", ctx[0]) if it.get("at") is not None else ctx[0])
        it["until"] = float(it.get("until", ctx[1]) if it.get("until") is not None else ctx[1])
        it["scene"] = scene_id
        it["index"] = len(hud)
        hud.append(it)

    for item in p.get("hud") or []:
        add_hud(item, None, (0.0, duration))
    for sc in p["scenes"]:
        for item in sc.get("hud") or []:
            add_hud(item, sc["id"], scene_ctx[sc["id"]])

    # audio
    au = p["audio"]
    sfx = []
    for e in au.get("sfx") or []:
        sfx.append(refs.deep(dict(e), None, (0.0, duration)))
    for sc in p["scenes"]:
        for e in sc.get("sfx") or []:
            sfx.append(refs.deep(dict(e), sc["id"], scene_ctx[sc["id"]]))
    music = refs.deep(dict(au.get("music") or {}), None, (0.0, duration))
    if music.get("file"):
        music["file"] = os.path.join(project_dir(pid), music["file"])
    ambience = {}
    for x, sh in zip(shots, [s for sc in p["scenes"] for s in sc["shots"]]):
        amb = sh.get("ambience", au.get("ambience", {}).get(x["id"]))
        if amb:
            ambience[x["id"]] = amb

    theme = refs.deep(p["theme"], None, (0.0, duration))
    for sc, s in zip(p["scenes"], scenes):
        s["accent"] = css_rgb(sc.get("accent", theme["accent"]))
        s["clock"] = sc.get("clock")
        s["caption_color"] = css_rgb(sc.get("caption_color", (theme["captions"].get("colors") or {}).get(sc["id"], sc.get("accent", theme["accent"]))))
        s["captions_top"] = sc.get("captions_top")

    fmt = p["format"]
    tl = {
        "project": pid, "title": p.get("title", ""), "fps": fmt["fps"], "width": fmt["width"], "height": fmt["height"],
        "plate_w": int(round(fmt["width"] * fmt["plate_scale"])), "plate_h": int(round(fmt["height"] * fmt["plate_scale"] + 0.49)),
        "duration": duration, "frames": int(round(duration * fmt["fps"])),
        "scenes": scenes, "shots": shots, "cues": refs.cues, "words": words_out,
        "theme": theme, "post": p["post"], "hud": hud,
        "draw_actors": sorted(f"/projects/{pid}/actors/{os.path.basename(f)}" for f in glob.glob(os.path.join(project_dir(pid), "actors", "*.js"))),
        "dim": refs.deep(p.get("dim") or [], None, (0.0, duration)),
        "audio": {"music": music, "sfx": sfx, "ambience": ambience, "auto": au.get("auto", {}), "duck": au.get("duck", 0.6),
                  "vo_gain": au.get("vo_gain", 0.0), "loudness": au.get("loudness", -14), "master": au.get("master", {})},
    }
    save_json(os.path.join(build_dir(pid), "timeline.json"), tl)

    print(f"  duration {duration:.2f}s, {tl['frames']} frames")
    for s in scenes:
        print(f"  scene {s['id']:12s} {s['start']:6.2f} → {s['end']:6.2f}  (voice {s['vo_start']:.2f}–{s['vo_end']:.2f})")
    for x in shots:
        src = f"plate {x['plate']}" if x["plate"] else f"draw: {len(x['draw'].get('layers') or [])} layers"
        print(f"    shot {x['id']:14s} {x['start']:6.2f} → {x['end']:6.2f}  ({x['end'] - x['start']:.2f}s, {src})")
    if refs.cues:
        print("  cues: " + ", ".join(f"{k}={v:.2f}" for k, v in refs.cues.items()))
    return tl
