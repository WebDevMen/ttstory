"""Voiceover: synthesize every scene with Microsoft Edge neural TTS (or a local offline model) and keep word timings.

Voices: any Edge voice name (ru-RU-SvetlanaNeural, the multilingual fr-FR-RemyMultilingualNeural, en-US-AndrewMultilingualNeural …
speak Russian too), or a local Vosk-TTS voice "vosk:female_0" … "vosk:male_1" (offline, CPU; install with
VG_LOCAL_TTS=1 ./setup.sh). Local voices give no word boundaries, so the words are aligned afterwards with the offline
Vosk recognizer and the known text (matched words keep their recognized times, the rest are interpolated).

Results are cached per scene (text + voice settings hash) in build/<project>/vo/.

Dialogue: a scene may list `lines: [{who, say}]` — `say` is an exact piece of the scene text spoken by a character, `who` names
a voice in the project's `voices: {name: {voice, rate, pitch}}`. The scene is then synthesized piece by piece (narration in
the scene voice, each line in its character's voice) and glued into one track with shifted word timings, so shots and
captions run across the dialogue without cuts.
"""
import asyncio
import subprocess
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


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_LOCAL = {}


def _pct(rate):
    return 1 + float(str(rate).replace("%", "") or 0) / 100


def _align(text, wav16, sr=16000):
    """Word timings for known text on synthesized audio: Vosk ASR words matched to the text tokens (difflib)."""
    import difflib
    import re
    from vosk import KaldiRecognizer, Model, SetLogLevel
    SetLogLevel(-1)
    if "asr" not in _LOCAL:
        _LOCAL["asr"] = Model(os.path.join(ROOT, "models", "vosk-model-small-ru-0.22"))
    rec = KaldiRecognizer(_LOCAL["asr"], sr)
    rec.SetWords(True)
    rec.AcceptWaveform(wav16)
    hyp = json.loads(rec.FinalResult()).get("result", [])
    toks = re.findall(r"[\w’'-]+", text)
    norm = lambda w: w.lower().replace("ё", "е").strip("-'’")
    sm = difflib.SequenceMatcher(a=[norm(t) for t in toks], b=[norm(h["word"]) for h in hyp], autojunk=False)
    times = [None] * len(toks)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            h = hyp[blk.b + k]
            times[blk.a + k] = (h["start"], h["end"])
    total = len(wav16) / 2 / sr
    # interpolate unmatched runs between known neighbours by character length
    i = 0
    while i < len(toks):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(toks) and times[j] is None:
            j += 1
        a = times[i - 1][1] if i > 0 else 0.05
        b = times[j][0] if j < len(toks) else total - 0.05
        L = sum(len(t) for t in toks[i:j]) or 1
        t = a
        for k in range(i, j):
            d = max(0.05, (b - a) * len(toks[k]) / L)
            times[k] = (t, t + d * 0.9)
            t += d
        i = j
    return [{"text": tk, "start": round(s, 4), "end": round(e, 4)} for tk, (s, e) in zip(toks, times)]


def synth_local(text, voice, rate, mp3_path):
    """Offline voice: Vosk-TTS ("vosk:<speaker>"); word timings by alignment."""
    from vosk_tts import Model, Synth
    if "tts" not in _LOCAL:
        _LOCAL["tts"] = Synth(Model(model_path=os.path.join(ROOT, "models", "vosk-model-tts-ru-0.9-multi")))
    synth_ = _LOCAL["tts"]
    spk = voice.split(":", 1)[1] if ":" in voice else "female_0"
    ids = {"female_0": 0, "female_1": 1, "female_2": 2, "male_0": 3, "male_1": 4}
    wav = mp3_path + ".wav"
    synth_.synth(text, wav, speaker_id=ids.get(spk, int(spk) if spk.isdigit() else 0), speech_rate=_pct(rate))
    pcm16 = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    words = _align(text, pcm16)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "96k", mp3_path], check=True)
    os.remove(wav)
    return words


def synth(text, voice, rate, pitch, mp3_path, attempts=6):
    """_synth with retries: the free Edge TTS service now and then answers with no audio for a while."""
    if str(voice).startswith("vosk"):
        return synth_local(text, voice, rate, mp3_path)
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


SR = 24000


def _pieces(text, lines):
    """Split the scene text into [(piece, who|None)] in order; every line's `say` must occur in the text."""
    out, pos = [], 0
    for ln in lines:
        say = str(ln["say"]).strip()
        i = text.lower().replace("ё", "е").find(say.lower().replace("ё", "е"), pos)
        if i < 0:
            raise ValueError(f"line «{say}» not found in the scene text (after position {pos})")
        if text[pos:i].strip(" —-:"):
            out.append((text[pos:i].strip(), None))
        out.append((text[i:i + len(say)], ln["who"]))
        pos = i + len(say)
    if text[pos:].strip(" —-"):
        out.append((text[pos:].strip(), None))
    return out


def _pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return raw


def _synth_robust(text, voice, rate, pitch, mp3_path):
    """Some voices (ru-RU-DmitryNeural) refuse random requests; a pitch nudge of 1–3 Hz is inaudible but usually passes."""
    if str(voice).startswith("vosk"):
        return synth_local(text, voice, rate, mp3_path)
    base = int(str(pitch).replace("Hz", "") or 0)
    err = None
    for d in (0, 2, -2, 4, -4, 1, -1, 3, -3, 5, -5):
        try:
            return synth(text, voice, rate, f"{base + d:+d}Hz", mp3_path, attempts=2)
        except RuntimeError as e:
            err = e
    raise RuntimeError(f"{voice} {pitch}: «{text[:40]}» — {err}")


def synth_dialogue(text, lines, v, voices, mp3_path, gap=0.14):
    """Narration + character lines glued into one mp3; returns word timings on the glued track."""
    words, pcm, t = [], b"", 0.0
    tmp = mp3_path + ".part.mp3"
    for piece, who in _pieces(text, lines):
        vv = {**v, **(voices.get(who) or {})} if who else v
        if who and who not in voices:
            print(f"  ! voice for '{who}' is not defined in voices: — using the scene voice")
        ws = _synth_robust(piece, vv["voice"], vv.get("rate", v["rate"]), vv.get("pitch", v["pitch"]), tmp)
        raw = _pcm(tmp)
        # trim the leading silence of each piece so the dialogue does not drag; keep a short natural gap
        head = max(0.0, ws[0]["start"] - 0.05)
        cut = int(head * SR) * 2
        raw = raw[cut:]
        for w in ws:
            words.append({"text": w["text"], "start": round(t + w["start"] - head, 4), "end": round(t + w["end"] - head, 4), "who": who})
        end = min(len(raw) / 2 / SR, ws[-1]["end"] - head + 0.1)
        raw = raw[: int(end * SR) * 2]
        pcm += raw + b"\x00\x00" * int(gap * SR)
        t += end + gap
    os.remove(tmp)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "96k", mp3_path],
                   input=pcm, check=True)
    return words


def run(pid, force=False):
    p = load_project(pid)
    _patch_certifi(pid)
    out = build_dir(pid, "vo")
    report = []
    for sc in p["scenes"]:
        v = {**p["voice"], **(sc.get("voice") or {})}
        text = sc["text"].strip()
        lines = sc.get("lines") or []
        voices = p.get("voices") or {}
        key = hashlib.sha1(json.dumps([text, v["voice"], v["rate"], v["pitch"], lines, voices if lines else None],
                                      ensure_ascii=False).encode()).hexdigest()[:12]
        mp3 = os.path.join(out, f"{sc['id']}.mp3")
        meta = os.path.join(out, f"{sc['id']}.json")
        if not force and os.path.exists(meta):
            m = json.load(open(meta, encoding="utf-8"))
            if m.get("key") == key and os.path.exists(mp3):
                report.append((sc["id"], m["words"][-1]["end"], "cached"))
                continue
        words = synth_dialogue(text, lines, v, voices, mp3) if lines else synth(text, v["voice"], v["rate"], v["pitch"], mp3)
        json.dump({"key": key, "text": text, "voice": v["voice"], "words": words}, open(meta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        report.append((sc["id"], words[-1]["end"], "new"))
    total = 0
    for sid, dur, st in report:
        total += dur
        print(f"  {sid:12s} {dur:6.2f}s  ({st})")
    print(f"  speech total ≈ {total:.1f}s (before pause compression)")
