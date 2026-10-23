"""Procedural sound design + music bed + voiceover mix, all synced to build/timeline.json.

Usage: python audio.py <build_dir>
Reads vo.wav + timeline.json, writes mix.wav (48 kHz stereo, float) — loudness is normalized at mux time.
"""
import json
import math
import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
build = sys.argv[1]
TL = json.load(open(os.path.join(build, "timeline.json")))
C = TL["cues"]
SC = {s["id"]: s for s in TL["scenes"]}
SH = {s["id"]: s for s in TL["shots"]}
DUR = TL["duration"]
N = int(DUR * SR) + SR
rng = np.random.RandomState(1234)


# ----------------------------------------------------------------------------- primitives
def tt(d):
    return np.arange(int(d * SR)) / SR


def sos_filter(x, kind, f, order=2, q=None):
    if kind == "bp":
        sos = signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], "bandpass", output="sos")
    else:
        sos = signal.butter(order, f / (SR / 2), kind, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def peak(x, f0, gain_db, q=1.0):
    b, a = signal.iirpeak(f0 / (SR / 2), q)
    y = signal.lfilter(b, a, x)
    g = 10 ** (gain_db / 20) - 1
    return x + g * y


def sweep_filter(x, kind, f_start, f_end, block=512, order=2, curve="exp", bw=0.6):
    """Time-varying filter applied block-wise (cheap, fine for noise sweeps)."""
    out = np.zeros_like(x)
    nb = int(math.ceil(len(x) / block))
    zi = None
    for i in range(nb):
        p = i / max(1, nb - 1)
        f = f_start * (f_end / f_start) ** p if curve == "exp" else f_start + (f_end - f_start) * p
        f = min(max(f, 25), SR / 2 * 0.9)
        if kind == "bp":
            lo, hi = f * (1 - bw / 2), min(f * (1 + bw / 2), SR / 2 * 0.95)
            sos = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "bandpass", output="sos")
        else:
            sos = signal.butter(order, f / (SR / 2), kind, output="sos")
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = np.zeros((sos.shape[0], 2))
        seg = x[i * block:(i + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[i * block:(i + 1) * block] = y
    return out


def white(d):
    return rng.uniform(-1, 1, int(d * SR))


def pink(d):
    n = int(d * SR)
    X = np.fft.rfft(rng.normal(size=n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    y = np.fft.irfft(X / np.sqrt(f), n)
    return y / (np.abs(y).max() + 1e-9)


def brown(d):
    y = np.cumsum(rng.normal(size=int(d * SR)))
    y = sos_filter(y, "highpass", 20)
    return y / (np.abs(y).max() + 1e-9)


def env_ad(n, a, d, curve=4.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-curve * (t - a) / max(d, 1e-4)))
    return e


def env_win(n, fi, fo):
    e = np.ones(n)
    a, b = int(fi * SR), int(fo * SR)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if b > 0:
        e[-b:] *= np.linspace(1, 0, b)
    return e


def sine(f, d, phase=0.0):
    t = tt(d)
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * t + phase)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def saw(f, d, phase=0.0):
    t = tt(d)
    ph = (f * t + phase) if np.isscalar(f) else (np.cumsum(f) / SR + phase)
    return 2 * (ph % 1.0) - 1


def square(f, d):
    return np.sign(sine(f, d))


def reverb_ir(rt60, d=None, bright=6000, seed=0):
    d = d or rt60 * 1.2
    r = np.random.RandomState(seed)
    t = tt(d)
    ir = np.zeros((len(t), 2))
    for ch in range(2):
        n = r.normal(size=len(t)) * np.exp(-6.9 * t / rt60)
        ir[:, ch] = sos_filter(n, "lowpass", bright)
    ir[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))


IR_HALL = reverb_ir(2.6, bright=5000, seed=1)
IR_ROOM = reverb_ir(0.7, bright=7000, seed=2)
IR_METAL = reverb_ir(1.6, bright=9000, seed=3)


def reverb(x, ir, wet=0.3):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet


class Bus:
    def __init__(self, norm=False):
        self.buf = np.zeros((N, 2))
        self.norm = norm

    def add(self, x, t0, gain=1.0, pan=0.0):
        if self.norm:
            x = x / (np.abs(x).max() + 1e-9)
        if x.ndim == 1:
            l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
            x = np.stack([x * l * 1.414, x * r * 1.414], 1)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            x = x[-i0:]
            i0 = 0
        i1 = min(N, i0 + len(x))
        if i1 > i0:
            self.buf[i0:i1] += x[: i1 - i0] * gain


def db(x):
    return 10 ** (x / 20)


def mx(*xs):
    """Sum signals of different lengths."""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[: len(x)] += x
    return out


# ----------------------------------------------------------------------------- sound objects
def kick(d=0.5):
    t = tt(d)
    f = 45 + 75 * np.exp(-t / 0.04)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    x += 0.3 * sos_filter(white(d), "highpass", 2000) * np.exp(-t / 0.006)
    return x


def boom(d=3.0, f0=58, f1=28, noise=0.6):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.25)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    nz = sos_filter(white(d), "lowpass", 1400) * np.exp(-t / 0.18) * noise
    return x + nz


def metal_ring(d=2.5, base=180, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    x = np.zeros(len(t))
    for ratio, amp, dec in [(1, 1, 1.2), (2.37, 0.6, 0.9), (4.51, 0.45, 0.6), (7.16, 0.3, 0.4), (10.3, 0.2, 0.25)]:
        f = base * ratio * (1 + r.uniform(-0.01, 0.01))
        x += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / dec) * (1 + 0.1 * np.sin(2 * np.pi * r.uniform(2, 6) * t))
    return x / 2.5


def whoosh(d=0.5, f0=300, f1=3500, up=True):
    n = white(d)
    x = sweep_filter(n, "bp", f0, f1, bw=0.9) if up else sweep_filter(n, "bp", f1, f0, bw=0.9)
    e = np.sin(np.pi * np.linspace(0, 1, len(x))) ** (1.5 if up else 0.8)
    return x * e * 2.0


def riser(d=1.5, f0=45, f1=180):
    t = tt(d)
    p = t / d
    f = f0 * (f1 / f0) ** p
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    nz = sweep_filter(white(d), "bp", 300, 6000, bw=0.8)
    e = p ** 2.2
    return (tone * 0.8 + nz * 0.9) * e


def blip(f=1600, d=0.09, kind="sine", f2=None):
    t = tt(d)
    ff = f if f2 is None else f * (f2 / f) ** (t / d)
    x = sine(ff, d) if kind == "sine" else np.sign(sine(ff, d)) * 0.5
    if kind == "tri":
        x = 2 / np.pi * np.arcsin(sine(ff, d))
    return x * env_ad(len(t), 0.002, d * 0.6)


def chime(freqs=(880, 1320), step=0.09):
    out = np.zeros(int((step * len(freqs) + 0.6) * SR))
    for i, f in enumerate(freqs):
        t = tt(0.6)
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.18)
        i0 = int(i * step * SR)
        out[i0:i0 + len(x)] += x
    return out * 0.6


def buzz(f=150, d=0.14, n=2, gap=0.06):
    out = np.zeros(int((d + gap) * n * SR) + 100)
    for i in range(n):
        t = tt(d)
        x = np.sign(np.sin(2 * np.pi * (f - 30 * t / d) * t)) * env_win(len(t), 0.005, 0.03)
        x = sos_filter(x, "lowpass", 2500)
        i0 = int(i * (d + gap) * SR)
        out[i0:i0 + len(x)] += x
    return out * 0.5


def alarm(f1=760, f2=560, d=0.16, n=4):
    out = np.zeros(int(d * n * SR) + 100)
    for i in range(n):
        t = tt(d)
        f = f1 if i % 2 == 0 else f2
        x = (np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t)) * env_win(len(t), 0.004, 0.02)
        out[int(i * d * SR):int(i * d * SR) + len(x)] += sos_filter(x, "lowpass", 3500)
    return out * 0.45


def ping(f=1150, d=1.4):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) * env_win(len(t), 0.003, 0.0)


def thunder(d=4.0, crack=1.0, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    rum = sos_filter(brown(d), "lowpass", 260) * 3
    am = sos_filter(np.abs(r.normal(size=len(t))), "lowpass", 6) * 6
    rum *= np.exp(-t / 1.4) * (0.4 + am) * env_win(len(t), 0.06, 0.5)
    cr = sos_filter(white(d), "highpass", 900) * np.exp(-t / 0.05) * crack
    return rum + cr * 0.6


def heartbeat():
    out = np.zeros(int(0.7 * SR))
    for t0, f in [(0, 62), (0.22, 52)]:
        t = tt(0.3)
        x = np.sin(2 * np.pi * (f + 30 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07)
        out[int(t0 * SR):int(t0 * SR) + len(x)] += x
    return sos_filter(out, "lowpass", 180) * 1.5


def creature(d=3.2, f0=92, f1=52):
    t = tt(d)
    p = t / d
    f = (f0 * (f1 / f0) ** p) * (1 + 0.025 * np.sin(2 * np.pi * 4.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * k) / k ** 0.8 for k in range(1, 14))
    x = sos_filter(x, "bp", (180, 520), order=2) * 1.0 + sos_filter(x, "bp", (600, 1100), order=2) * 0.5 + np.sin(ph * 0.5) * 0.6
    e = np.sin(np.pi * np.clip(p * 1.1, 0, 1)) ** 1.2
    return x * e


def scrape(d=1.6, seed=0):
    r = np.random.RandomState(seed)
    n = white(d)
    x = np.zeros_like(n)
    for fc in [900, 1700, 2900, 4300]:
        x += sweep_filter(n, "bp", fc * r.uniform(0.9, 1.1), fc * r.uniform(1.1, 1.4), bw=0.08) * 4
    t = tt(d)
    flutter = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (28 + 10 * np.sin(2 * np.pi * 1.3 * t)) * t))
    squeal = np.sin(2 * np.pi * np.cumsum(2300 + 500 * np.sin(2 * np.pi * 0.7 * t)) / SR) * 0.25
    groan = sos_filter(saw(70 + 15 * np.sin(2 * np.pi * 0.5 * t), d), "lowpass", 400) * 0.5
    e = env_win(len(t), 0.15, 0.4)
    return (x * (0.4 + 0.6 * flutter) + squeal * flutter + groan) * e


def drip(f=900):
    t = tt(0.25)
    ff = f * (1 + 1.2 * np.minimum(1, t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / 0.05)


def footstep(seed=0):
    r = np.random.RandomState(seed)
    t = tt(0.35)
    thud = sos_filter(white(0.35), "lowpass", 180) * np.exp(-t / 0.05) * 3
    clank = metal_ring(0.35, base=r.uniform(380, 520), seed=seed) * 0.6
    grit = sos_filter(white(0.35), "bp", (2000, 6000)) * np.exp(-t / 0.02) * 0.5
    return thud + clank + grit


def click():
    t = tt(0.04)
    return (sos_filter(white(0.04), "highpass", 2500) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.006)) * 0.8


def glitch(d=0.25, seed=0):
    r = np.random.RandomState(seed)
    out = np.zeros(int(d * SR))
    i = 0
    while i < len(out):
        L = int(r.uniform(0.008, 0.04) * SR)
        kind = r.randint(3)
        t = tt(L / SR)
        if kind == 0:
            seg = np.sign(np.sin(2 * np.pi * r.uniform(200, 2000) * t))
        elif kind == 1:
            seg = r.uniform(-1, 1, L)
            seg = np.round(seg * 4) / 4
        else:
            seg = np.zeros(L)
        seg = seg[: len(out) - i]
        out[i:i + len(seg)] = seg
        i += L
    return sos_filter(out, "lowpass", 7000) * 0.5


def breath(d=0.45):
    t = tt(d)
    return sweep_filter(white(d), "bp", 700, 1600, bw=1.0) * np.sin(np.pi * t / d) ** 2 * 0.9


# ----------------------------------------------------------------------------- ambiences
def ocean(d, calm=1.0, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    base = sos_filter(brown(d), "lowpass", 500) * 1.6
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + r.uniform(0, 6)) * np.sin(2 * np.pi * 0.047 * t + 1)
    wash = sos_filter(pink(d), "bp", (400, 2500)) * np.clip(np.sin(2 * np.pi * 0.11 * t + r.uniform(0, 6)), 0, 1) ** 3 * 0.5 * calm
    return np.stack([base * swell + wash, np.roll(base, 2400) * swell + np.roll(wash, 1800)], 1)


def wind(d, f0=350, f1=900, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    n = pink(d)
    x = sweep_filter(n, "bp", f0, f1, block=2048, curve="lin", bw=1.1)
    x = x * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + r.uniform(0, 6)))
    return np.stack([x, np.roll(x, 3000)], 1)


def rain(d, density=1.0):
    t = tt(d)
    hiss = sos_filter(white(d), "bp", (1500, 9000)) * 0.35
    imp = np.zeros(len(t))
    idx = rng.randint(0, len(t), int(900 * d * density))
    imp[idx] = rng.uniform(0.3, 1.0, len(idx))
    drops = sos_filter(imp, "bp", (1200, 6000)) * 1.4
    tarp = sos_filter(imp[::-1] * (rng.uniform(size=len(t)) > 0.6), "bp", (180, 700)) * 2.5
    x = hiss + drops + tarp
    return np.stack([x, np.roll(x, 1500)], 1)


def hum(d, f=50):
    t = tt(d)
    x = 0.5 * np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    x += sos_filter(brown(d), "lowpass", 120) * 0.5
    return x


def stream(d):
    t = tt(d)
    x = sos_filter(white(d), "bp", (700, 3500)) * (0.7 + 0.3 * sos_filter(rng.normal(size=len(t)), "lowpass", 8) * 4)
    return np.stack([x, np.roll(x, 900)], 1)


def shimmer(d, seed=0):
    r = np.random.RandomState(seed)
    out = np.zeros((int(d * SR), 2))
    for _ in range(int(d * 14)):
        f = r.uniform(2000, 5200)
        g = sine(f, 0.35) * np.sin(np.pi * np.linspace(0, 1, int(0.35 * SR))) ** 2
        i0 = r.randint(0, len(out) - len(g))
        p = r.uniform(-1, 1)
        out[i0:i0 + len(g), 0] += g * (1 - p) * 0.5
        out[i0:i0 + len(g), 1] += g * (1 + p) * 0.5
    return out


# ----------------------------------------------------------------------------- music
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def hz(name, octave):
    return 440 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


def pad_note(f, d, cutoff=1200, detune=0.006):
    x = sum(saw(f * (1 + dt), d, phase=rng.uniform()) for dt in (-detune, 0, detune)) / 3
    x += 0.5 * sine(f / 2, d)
    x = sos_filter(x, "lowpass", cutoff)
    return x * env_win(len(x), min(0.6, d / 3), min(0.8, d / 3))


def chord_track(chords, t0, bar, cutoff=1200, oct_=3, gain=1.0):
    out = np.zeros(int((len(chords) * bar + 1.0) * SR))
    for i, ch in enumerate(chords):
        notes = [(n, oct_) for n in ch] + [(ch[0], oct_ - 1)]
        seg = sum(pad_note(hz(n, o), bar + 0.6, cutoff) for n, o in notes) / len(notes)
        i0 = int(i * bar * SR)
        out[i0:i0 + len(seg)] += seg
    return out * gain


def bass_pulse(chords, bar, step, accent=1.0):
    n_steps = int(round(bar / step))
    out = np.zeros(int((len(chords) * bar + 0.5) * SR))
    for i, ch in enumerate(chords):
        f = hz(ch[0], 2)
        for s in range(n_steps):
            d = step * 0.9
            t = tt(d)
            x = sos_filter(saw(f, d), "lowpass", 300 + 900 * (s % 2 == 0) * accent) * np.exp(-t / 0.12) + 0.6 * sine(f, d) * np.exp(-t / 0.2)
            i0 = int((i * bar + s * step) * SR)
            out[i0:i0 + len(x)] += x
    return out


def arp(chords, bar, step, oct_=5):
    out = np.zeros(int((len(chords) * bar + 1.0) * SR))
    n_steps = int(round(bar / step))
    for i, ch in enumerate(chords):
        seq = [hz(n, oct_) for n in ch] + [hz(ch[1], oct_ + 1)]
        for s in range(n_steps):
            f = seq[s % len(seq)]
            t = tt(0.35)
            x = (2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))) * np.exp(-t / 0.09)
            i0 = int((i * bar + s * step) * SR)
            out[i0:i0 + len(x)] += x
    dl = int(step * 1.5 * SR)
    out[dl:] += out[:-dl] * 0.35
    return out


def hats(t0, t1, step, gain=1.0):
    out = np.zeros(int((t1 - t0 + 0.2) * SR))
    t = 0.0
    i = 0
    while t < t1 - t0:
        d = 0.05
        x = sos_filter(white(d), "highpass", 7000) * np.exp(-tt(d) / (0.012 if i % 2 else 0.02)) * (1.0 if i % 4 == 2 else 0.6)
        i0 = int(t * SR)
        out[i0:i0 + len(x)] += x
        t += step
        i += 1
    return out * gain


def build_music():
    mus = Bus()
    bar = 2.4  # 100 bpm, 4/4
    s1, s2, s3, s4, s5 = (SC[k] for k in ["s1", "s2", "s3", "s4", "s5"])
    # S1: eerie drone swelling into the title hit
    d1 = s1["end"] + 0.4
    drone = (pad_note(hz("D", 2), d1, 700) + pad_note(hz("A", 2), d1, 700) * 0.7 + pad_note(hz("D", 3), d1, 900) * 0.5) / 2.2
    drone *= np.linspace(0.3, 1.0, len(drone))
    mus.add(reverb(drone, IR_HALL, 0.4), 0.0, 0.9)
    mus.add(reverb(shimmer(d1, 3) * 0.25, IR_HALL, 0.6), 0.0, 0.5)
    # S2: progression with pulse + kick
    ch2 = [["D", "F", "A"], ["Bb", "D", "F"], ["F", "A", "C"], ["C", "E", "G"], ["D", "F", "A"], ["Bb", "D", "F"]]
    st = s2["start"]
    mus.add(reverb(chord_track(ch2, st, bar, 1400), IR_HALL, 0.35)[: int((s2["end"] - st + 0.5) * SR)], st, 0.7)
    bp = bass_pulse(ch2, bar, bar / 8)[: int((s2["end"] - st) * SR)]
    mus.add(bp * env_win(len(bp), 0.3, 0.05), st, 0.55)
    k = kick()
    tk = st + bar / 2
    while tk < s2["end"] - 0.3:
        mus.add(k, tk, 0.55)
        tk += bar / 4
    # S3: tension, no kick, ticking
    ch3 = [["D", "F", "A"], ["Eb", "G", "Bb"], ["D", "F", "A"], ["A", "C#", "E"], ["D", "F", "A"], ["Eb", "G", "Bb"]]
    st = s3["start"]
    mus.add(reverb(chord_track(ch3, st, bar, 900), IR_HALL, 0.45)[: int((s3["end"] - st + 0.4) * SR)], st, 0.75)
    bp = bass_pulse(ch3, bar, bar / 4, accent=0.3)[: int((s3["end"] - st) * SR)]
    mus.add(bp * env_win(len(bp), 0.4, 0.05), st, 0.45)
    mus.add(hats(st, s3["end"], bar / 8, 0.25), st, 1.0)
    # S4: dark drone + 16th hats, cut at light-off
    st = s4["start"]
    d4 = C["s4_light_off"] - st + 0.05
    dr = (pad_note(hz("D", 2), d4 + 0.5, 600) + pad_note(hz("Ab", 2), d4 + 0.5, 600) * 0.6) / 1.6
    dr[int(d4 * SR):] *= np.linspace(1, 0, len(dr) - int(d4 * SR))
    mus.add(reverb(dr, IR_HALL, 0.4), st, 0.9)
    hh = hats(st, C["s4_light_off"], bar / 16, 0.3)
    mus.add(hh * np.linspace(0.4, 1.0, len(hh)), st, 1.0)
    bp = bass_pulse([["D"]] * 6, bar, bar / 8, accent=0.5)[: int(d4 * SR)]
    mus.add(bp * env_win(len(bp), 0.2, 0.05), st, 0.5)
    sub = sine(36.7, s4["end"] - C["s4_light_off"] + 0.5) * 0.5
    mus.add(sub * env_win(len(sub), 0.3, 0.3), C["s4_light_off"], 0.6)
    # S5: epic resolve
    ch5 = [["Bb", "D", "F"], ["F", "A", "C"], ["C", "E", "G"], ["D", "F", "A"], ["Bb", "D", "F"], ["F", "A", "C"]]
    st = s5["start"]
    pad5 = reverb(chord_track(ch5, st, bar, 2200, gain=1.0), IR_HALL, 0.4)
    pad5 = pad5[: int((DUR - st + 0.5) * SR)]
    mus.add(pad5 * env_win(len(pad5), 0.05, 1.2)[:, None], st, 0.85)
    ar = arp(ch5, bar, bar / 16)[: int((DUR - st) * SR)]
    mus.add(reverb(ar * env_win(len(ar), 1.5, 1.0), IR_HALL, 0.35), st, 0.22)
    bp = bass_pulse(ch5, bar, bar / 8)[: int((DUR - st) * SR)]
    mus.add(bp * env_win(len(bp), 0.05, 1.0), st, 0.55)
    tk = st
    while tk < DUR - 1.4:
        mus.add(k, tk, 0.6)
        tk += bar / 4
    return mus.buf


# ----------------------------------------------------------------------------- assemble
def main():
    vo, _ = sf.read(os.path.join(build, "vo.wav"))
    vo = vo[:N] if len(vo) >= N else np.pad(vo, (0, N - len(vo)))
    # voice chain: HPF, presence, gentle compression, a touch of room
    v = sos_filter(vo, "highpass", 85)
    v = peak(v, 3800, 3.0, 1.2)
    v = peak(v, 220, -2.0, 1.0)
    env = np.sqrt(np.maximum(sos_filter(v ** 2, "lowpass", 12), 0) + 1e-9)
    thr = 0.12
    gain = np.where(env > thr, (thr + (env - thr) / 3.0) / env, 1.0)
    v = v * gain
    v = v / (np.abs(v).max() + 1e-9) * 0.89
    v_st = reverb(v, IR_ROOM, 0.07)

    music = build_music()
    duck_env = sos_filter(np.abs(vo), "lowpass", 4)
    duck_env = duck_env / (duck_env.max() + 1e-9)
    duck = 1 - 0.6 * np.clip(duck_env * 3, 0, 1)
    music *= duck[:, None]

    amb = Bus()
    sfx = Bus(norm=True)

    def shot_span(sid, pre=0.15, post=0.15):
        s = SH[sid]
        return s["start"] - pre, s["end"] - s["start"] + pre + post

    def place_amb(sig, sid, gain, pre=0.15, post=0.25):
        t0, d = shot_span(sid, pre, post)
        sig = sig[: int(d * SR)]
        sig = sig / (np.sqrt((sig ** 2).mean()) + 1e-9) * 0.1
        sig = sig * env_win(len(sig), pre, post)[:, None]
        amb.add(sig, t0, gain)

    # ambience per shot
    t0, d = shot_span("deck")
    place_amb(ocean(d + 0.5, 1.0, 1) * 0.9 + wind(d + 0.5, 300, 700, 1) * 0.5, "deck", db(-8))
    place_amb(rain(shot_span("tarp")[1] + 0.5) * 0.7 + ocean(shot_span("tarp")[1] + 0.5, 0.6, 2) * 0.5, "tarp", db(-11))
    cd = shot_span("corridor")[1] + 0.5
    place_amb(np.stack([hum(cd, 50)] * 2, 1) * 0.6 + shimmer(cd, 5) * 0.05, "corridor", db(-12))
    dd = shot_span("door")[1] + 0.5
    place_amb(np.stack([hum(dd, 50)] * 2, 1) * 0.6, "door", db(-12))
    fd = shot_span("flare")[1] + 0.5
    place_amb(ocean(fd, 0.7, 3) * 0.8 + wind(fd, 250, 600, 3) * 0.7, "flare", db(-9))
    hd = shot_span("hatch")[1] + 0.5
    place_amb(np.stack([sos_filter(brown(hd), "lowpass", 90) * 2] * 2, 1) + reverb(shimmer(hd, 7), IR_METAL, 0.5) * 0.35, "hatch", db(-10))
    ld = shot_span("leak")[1] + 0.5
    place_amb(stream(ld) * 0.9 + np.stack([hum(ld, 50)] * 2, 1) * 0.3, "leak", db(-12))
    pd = shot_span("porthole")[1] + 0.5
    storm = rain(pd, 0.7) * 0.4 + wind(pd, 150, 400, 4) * 0.8
    storm = np.stack([sos_filter(storm[:, c], "lowpass", 1400) for c in range(2)], 1)
    place_amb(storm, "porthole", db(-10))
    cpd = shot_span("compass")[1] + 0.5
    place_amb(ocean(cpd, 0.8, 5) * 0.7 + wind(cpd, 300, 800, 5) * 0.6, "compass", db(-10))

    # ---------------- scene 1
    sfx.add(reverb(np.concatenate([blip(f, 0.07) for f in (900, 1200, 1600, 2400)]), IR_ROOM, 0.2), 0.05, db(-14))
    sfx.add(sweep_filter(white(0.6), "bp", 400, 5000, bw=0.4) * np.linspace(0, 1, int(0.6 * SR)) ** 2 * 0.6, 0.0, db(-22))
    for i in range(3):
        sfx.add(blip(1800 + 300 * i, 0.06), C["s1_stats"] + 0.12 + i * 0.22, db(-16), pan=-0.4)
        for j in range(6):
            sfx.add(blip(4200, 0.015), C["s1_stats"] + 0.17 + i * 0.22 + j * 0.09, db(-30), pan=-0.4)
    sfx.add(heartbeat(), C["s1_not_alone"] - 0.05, db(-6))
    sfx.add(sos_filter(boom(1.5, 70, 40, 0.2), "lowpass", 200), C["s1_not_alone"] - 0.05, db(-14))
    sfx.add(riser(1.1, 40, 140), C["s1_title"] - 1.1, db(-16))
    sfx.add(reverb(boom(3.0, 62, 30), IR_HALL, 0.35), C["s1_title"], db(-9))
    sfx.add(reverb(whoosh(0.5, 400, 4000), IR_HALL, 0.3), C["s1_title"] - 0.25, db(-16))
    for i in range(14):
        sfx.add(blip(3000 + 400 * (i % 3), 0.02, "tri"), C["s1_title"] + 0.12 + i * 0.028 * 1.4, db(-27))

    # ---------------- transitions
    def trans(tb, kind):
        if kind in ("whip", "zoom"):
            sfx.add(reverb(whoosh(0.45, 250, 5000), IR_ROOM, 0.2), tb - 0.3, db(-12))
        if kind == "zoom":
            sfx.add(riser(0.5, 60, 200) * 0.6, tb - 0.5, db(-18))
        if kind == "glitch":
            sfx.add(glitch(0.28, 5), tb - 0.12, db(-14))
        if kind == "dip":
            sfx.add(sos_filter(whoosh(0.6, 100, 900, up=False), "lowpass", 900), tb - 0.3, db(-12))

    trans(SH["tarp"]["start"], "whip")
    trans(SH["corridor"]["start"], "zoom")
    trans(SH["door"]["start"], "zoom")
    trans(SH["hatch"]["start"], "whip")
    trans(SH["leak"]["start"], "glitch")
    trans(SH["porthole"]["start"], "dip")

    # ---------------- scene 2
    sfx.add(chime((880, 1320, 1760)), C["s2_marker"], db(-14))
    sfx.add(buzz(170, 0.08, 1), C["s2_never"], db(-20))
    for i in range(8):
        sfx.add(drip(rng.uniform(900, 1700)), SH["tarp"]["start"] + 0.4 + i * 0.75 + rng.uniform(0, 0.2), db(-24))
    sfx.add(whoosh(0.4, 600, 3000), C["s2_schematic"] - 0.15, db(-20))
    sfx.add(blip(1400, 0.08), C["s2_schematic"], db(-16))
    for i in range(4):
        sfx.add(blip(2200 + 200 * i, 0.05), C["s2_schematic"] + 0.35 + i * 0.18, db(-22))
    sfx.add(chime((1320, 1760)), C["s2_evaporator"], db(-20))
    for i in range(5):
        sfx.add(footstep(i), SH["corridor"]["start"] + 0.1 + i / 1.9, db(-12), pan=(-0.2 if i % 2 else 0.2))
    sfx.add(sweep_filter(white(0.9), "bp", 600, 6000, bw=0.25) * 0.6, C["s2_map"] - 0.1, db(-20))
    sfx.add(blip(1100, 0.1, f2=1700), C["s2_map"], db(-16))
    sfx.add(chime((1046, 1568)), C["s2_safezone"], db(-14))
    # door wheel creak + slam
    cr_d = C["s2_door_slam"] - SH["door"]["start"]
    creak = sweep_filter(white(cr_d), "bp", 380, 820, bw=0.12, curve="lin") * 3 * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * tt(cr_d)) ** 2)
    sfx.add(reverb(creak * env_win(len(creak), 0.3, 0.1), IR_METAL, 0.3), SH["door"]["start"], db(-22))
    sfx.add(reverb(mx(metal_ring(1.0, 520, 4) * 0.5, click()), IR_METAL, 0.3), C["s2_door_close"], db(-18))
    slam = boom(3.0, 70, 32, 0.9) + metal_ring(3.0, 140, 5) * 0.9
    sfx.add(reverb(slam, IR_METAL, 0.45), C["s2_door_slam"], db(-5))
    sfx.add(click(), C["s2_door_slam"] + 0.25, db(-12))

    # ---------------- scene 3
    sfx.add(glitch(0.22, 9), SH["flare"]["start"] - 0.02, db(-16))
    sfx.add(buzz(140, 0.12, 2), C["s3_marker"], db(-12))
    sfx.add(mx(buzz(110, 0.22, 1), click()), C["s3_flare_block"], db(-12))
    sfx.add(sos_filter(thunder(4.0, 0.6, 1), "lowpass", 1200), C["s3_not_only_people"] - 0.05, db(-9))
    sfx.add(reverb(sos_filter(creature(2.6, 75, 45), "lowpass", 700), IR_HALL, 0.5), C["s3_not_only_people"] + 0.35, db(-14))
    sfx.add(reverb(ping(1150), IR_HALL, 0.5), C["s3_not_only_people"], db(-20), pan=-0.5)
    sfx.add(alarm(520, 420, 0.22, 2), C["s3_biohazard"], db(-18))
    sfx.add(sweep_filter(white(1.2), "bp", 3000, 900, bw=0.6) * env_win(int(1.2 * SR), 0.3, 0.6), C["s3_biohazard"], db(-24))
    for i, wtxt in enumerate(["три", "вдоха", "вдоха"]):
        tw = [w for w in TL["words"] if w["scene"] == "s3" and w["text"] == wtxt]
        tpip = tw[0]["end"] if i == 2 else tw[0]["start"]
        sfx.add(blip(900 - 150 * i, 0.08, "tri"), tpip, db(-16))
        sfx.add(breath(0.4), tpip - 0.05, db(-30))
    sfx.add(blip(440, 0.6, "tri"), [w for w in TL["words"] if w["text"] == "вдоха"][0]["end"] + 0.12, db(-18))

    # ---------------- scene 4
    sfx.add(alarm(760, 560, 0.15, 4), C["s4_marker"], db(-16))
    sfx.add(blip(800, 0.12, "tri"), C["s4_leak"], db(-18))
    for i in range(12):
        sfx.add(reverb(drip(rng.uniform(700, 1500)), IR_METAL, 0.4), SH["leak"]["start"] + 0.2 + i * 0.5 + rng.uniform(0, 0.2), db(-22), pan=rng.uniform(-0.6, 0.3))
    groan = sos_filter(saw(48 + 8 * np.sin(2 * np.pi * 0.8 * tt(1.6)), 1.6), "lowpass", 500) * env_win(int(1.6 * SR), 0.2, 0.8)
    sfx.add(reverb(groan + metal_ring(1.6, 95, 8) * 0.6, IR_METAL, 0.5), C["s4_rot"] - 0.05, db(-10))
    sfx.add(alarm(900, 900, 0.1, 2), C["s4_rot"] + 0.2, db(-20))
    sweep_period = 360 / 200
    tp = SH["porthole"]["start"] + 0.4
    while tp < SC["s4"]["end"] - 0.2:
        g = db(-28) if tp < C["s4_guests"] + 0.35 else db(-20)
        sfx.add(reverb(ping(1300, 0.6), IR_HALL, 0.4), tp, g, pan=0.5)
        tp += sweep_period
    sfx.add(sos_filter(thunder(3.0, 0.4, 2), "lowpass", 800), C["s4_guests"] + 0.12, db(-11))
    sfx.add(sos_filter(scrape(1.8, 3), "lowpass", 5000), C["s4_scrape"] - 0.1, db(-11), pan=0.3)
    sfx.add(alarm(980, 760, 0.1, 6), C["s4_scrape"], db(-18))
    sfx.add(click() * 1.5, C["s4_light_off"], db(-8))
    for i in range(3):
        sfx.add(heartbeat(), C["s4_light_off"] + 0.25 + i * 0.78, db(-5))
    sfx.add(thunder(4.5, 1.2, 4), C["s4_lightning"], db(-4))
    sfx.add(reverb(creature(3.0, 95, 48), IR_HALL, 0.55), C["s4_lightning"] + 0.25, db(-9))
    sfx.add(riser(1.25, 40, 220), SH["compass"]["start"] - 1.25, db(-13))

    # ---------------- scene 5
    sfx.add(reverb(boom(3.5, 60, 28, 1.0), IR_HALL, 0.4), SH["compass"]["start"], db(-6))
    sfx.add(sweep_filter(white(1.2), "bp", 6000, 400, bw=0.8) * np.exp(-tt(1.2) / 0.4), SH["compass"]["start"], db(-14))
    sfx.add(alarm(600, 600, 0.12, 2), C["s5_fuel"], db(-18))
    for i in range(3):
        sfx.add(blip(1200 + 400 * i, 0.05), C["s5_city"] + i * 0.08, db(-18))
    sfx.add(sos_filter(thunder(3.5, 0.5, 6), "lowpass", 900), C["s5_storm"] + 0.1, db(-12))
    sfx.add(sos_filter(thunder(3.0, 0.4, 7), "lowpass", 700), 56.4, db(-16))
    sfx.add(sos_filter(thunder(2.5, 0.4, 8), "lowpass", 700), 59.5, db(-16))
    for i in range(2):
        sfx.add(whoosh(0.35, 500, 4000), C["s5_choice"] - 0.1 + i * 0.16, db(-18), pan=(-0.3 if i == 0 else 0.3))
        sfx.add(click(), C["s5_choice"] + 0.25 + i * 0.16, db(-16))
    sfx.add(blip(1320, 0.12, "tri"), C["s5_choice_a"], db(-16), pan=-0.2)
    sfx.add(blip(1760, 0.12, "tri"), C["s5_choice_b"], db(-16), pan=0.2)
    sfx.add(chime((988, 1319, 1976)), C["s5_comment"], db(-12))
    t = C["s5_comment"] + 0.75
    i = 0
    while t < DUR - 0.2:
        sfx.add(blip(1320 if i % 2 == 0 else 1760, 0.06, "tri"), t, db(-28))
        t += 0.75
        i += 1

    stems = {"vo": v_st, "music": music * db(-13), "amb": amb.buf, "sfx": sfx.buf}
    if os.environ.get("STEMS"):
        os.makedirs(os.path.join(build, "stems"), exist_ok=True)
        for k, x in stems.items():
            sf.write(os.path.join(build, "stems", k + ".wav"), x[: int(DUR * SR)].astype(np.float32), SR, subtype="FLOAT")
    mix = sum(stems.values())
    # master: gentle bus compression + soft clip
    lvl = np.sqrt(np.maximum(sos_filter((mix ** 2).mean(1), "lowpass", 5), 0) + 1e-9)
    g = np.where(lvl > 0.25, (0.25 + (lvl - 0.25) / 2.0) / lvl, 1.0)
    mix = mix * g[:, None]
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.95
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix = mix[: int(DUR * SR)]
    fade = int(0.08 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    sf.write(os.path.join(build, "mix.wav"), mix.astype(np.float32), SR, subtype="FLOAT")
    print("mix written", mix.shape, float(np.abs(mix).max()))


main()
