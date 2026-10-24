"""Voiceover: synthesize every scene with Microsoft Edge neural TTS and keep word timings.

Results are cached per scene (text + voice settings hash) in build/<project>/vo/.
"""
import asyncio
import time
import hashlib
import json
import os

from .common import build_dir, load_project

PROXY_CA = "/root/.ccr/ca-bundle.crt"


def _patch_certifi(pid):
    """Behind a TLS-intercepting proxy edge-tts must trust the proxy CA (it uses certifi's bundle)."""
    extra = os.environ.get("VG_EXTRA_CA") or (PROXY_CA if os.path.exists(PROXY_CA) else None)
    if not extra:
        return
    import certifi
    combined = os.path.join(build_dir(pid), "ca-bundle.pem")
    if not os.path.exists(combined):
        with open(combined, "w") as out:
            out.write(open(certifi.where()).read())
            out.write("\n")
            out.write(open(extra).read())
    certifi.where = lambda: combined


async def _synth(text, voice, rate, pitch, mp3_path):
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 1e7
                words.append({"text": chunk["text"], "start": round(s, 4), "end": round(s + chunk["duration"] / 1e7, 4)})
    return words


def synth(text, voice, rate, pitch, mp3_path, attempts=6):
    """_synth with retries: the free Edge TTS service now and then answers with no audio for a while."""
    err = None
    for i in range(attempts):
        try:
            words = asyncio.run(_synth(text, voice, rate, pitch, mp3_path))
            if words:
                return words
        except Exception as e:                 # edge_tts raises its own exception types (NoAudioReceived, …)
            err = e
        time.sleep(min(20, 2 * 2 ** i))
    raise RuntimeError(f"Edge TTS failed {attempts} times ({err or 'no words'}) — try again later or another voice")


def run(pid, force=False):
    p = load_project(pid)
    _patch_certifi(pid)
    out = build_dir(pid, "vo")
    report = []
    for sc in p["scenes"]:
        v = {**p["voice"], **(sc.get("voice") or {})}
        text = sc["text"].strip()
        key = hashlib.sha1(json.dumps([text, v["voice"], v["rate"], v["pitch"]], ensure_ascii=False).encode()).hexdigest()[:12]
        mp3 = os.path.join(out, f"{sc['id']}.mp3")
        meta = os.path.join(out, f"{sc['id']}.json")
        if not force and os.path.exists(meta):
            m = json.load(open(meta, encoding="utf-8"))
            if m.get("key") == key and os.path.exists(mp3):
                report.append((sc["id"], m["words"][-1]["end"], "cached"))
                continue
        words = synth(text, v["voice"], v["rate"], v["pitch"], mp3)
        json.dump({"key": key, "text": text, "voice": v["voice"], "words": words}, open(meta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        report.append((sc["id"], words[-1]["end"], "new"))
    total = 0
    for sid, dur, st in report:
        total += dur
        print(f"  {sid:12s} {dur:6.2f}s  ({st})")
    print(f"  speech total ≈ {total:.1f}s (before pause compression)")
