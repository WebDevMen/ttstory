"""Procedural sound design, music bed and final mix — everything driven by timeline.json.

Layers: voiceover (cleaned, compressed) + music (synth styles or your own file, ducked under the voice)
      + ambience per shot + sound effects (explicit events from project.yaml + automatic sounds for HUD items
        and transitions). Output: build/<id>/mix.wav (48 kHz stereo); loudness is normalized at mux time.
See docs/REFERENCE.md for all sounds, ambiences and music styles.
"""
import math
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

from .common import build_dir, load_timeline

SR = 48000
rng = np.random.RandomState(1234)


# ----------------------------------------------------------------------------- primitives
def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    if kind in ("bp", "bandpass"):
        sos = signal.butter(order, [f[0] / (SR / 2), min(f[1], SR / 2 * 0.95) / (SR / 2)], "bandpass", output="sos")
    else:
        sos = signal.butter(order, min(f, SR / 2 * 0.95) / (SR / 2), kind, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def peak_eq(x, f0, gain_db, q=1.0):
    b, a = signal.iirpeak(f0 / (SR / 2), q)
    return x + (10 ** (gain_db / 20) - 1) * signal.lfilter(b, a, x)


def sweep(x, kind, f0, f1, block=512, order=2, curve="exp", bw=0.6):
    out = np.zeros_like(x)
    nb = max(1, int(math.ceil(len(x) / block)))
    zi = None
    for i in range(nb):
        p = i / max(1, nb - 1)
        f = f0 * (f1 / f0) ** p if curve == "exp" else f0 + (f1 - f0) * p
        f = min(max(f, 25), SR / 2 * 0.9)
        if kind == "bp":
            sos = signal.butter(order, [f * (1 - bw / 2) / (SR / 2), min(f * (1 + bw / 2), SR / 2 * 0.95) / (SR / 2)], "bandpass", output="sos")
        else:
            sos = signal.butter(order, f / (SR / 2), kind, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        y, zi = signal.sosfilt(sos, x[i * block:(i + 1) * block], zi=zi)
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
    y = filt(np.cumsum(rng.normal(size=int(d * SR))), "highpass", 20)
    return y / (np.abs(y).max() + 1e-9)


def env_ad(n, a, d, curve=4.0):
    t = np.arange(n) / SR
    return np.where(t < a, t / max(a, 1e-4), np.exp(-curve * (t - a) / max(d, 1e-4)))


def env_win(n, fi, fo):
    e = np.ones(n)
    a, b = min(n, int(fi * SR)), min(n, int(fo * SR))
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if b > 0:
        e[-b:] *= np.linspace(1, 0, b)
    return e


def sine(f, d, phase=0.0):
    t = tt(d)
    return np.sin(2 * np.pi * f * t + phase) if np.isscalar(f) else np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def saw(f, d, phase=0.0):
    t = tt(d)
    ph = (f * t + phase) if np.isscalar(f) else (np.cumsum(f) / SR + phase)
    return 2 * (ph % 1.0) - 1


def mx(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def reverb_ir(rt60, bright=6000, seed=0):
    r = np.random.RandomState(seed)
    t = tt(rt60 * 1.2)
    ir = np.zeros((len(t), 2))
    for ch in range(2):
        ir[:, ch] = filt(r.normal(size=len(t)) * np.exp(-6.9 * t / rt60), "lowpass", bright)
    n = int(0.01 * SR)
    ir[:n] *= np.linspace(0, 1, n)[:, None]
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))


IRS = {"hall": reverb_ir(2.6, 5000, 1), "room": reverb_ir(0.7, 7000, 2), "metal": reverb_ir(1.6, 9000, 3), "cave": reverb_ir(4.0, 3500, 4)}


def reverb(x, kind="room", wet=0.3):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    if not kind or kind == "none" or wet <= 0:
        return x
    ir = IRS[kind]
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet


def db(x):
    return 10 ** (x / 20)


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)


class Bus:
    def __init__(self, n, norm=False):
        self.buf = np.zeros((n, 2))
        self.norm = norm

    def add(self, x, t0, gain=1.0, pan=0.0):
        if self.norm:
            x = x / (np.abs(x).max() + 1e-9)
        x = stereo(x, pan)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            x, i0 = x[-i0:], 0
        i1 = min(len(self.buf), i0 + len(x))
        if i1 > i0:
            self.buf[i0:i1] += x[:i1 - i0] * gain


# ----------------------------------------------------------------------------- sound library
SOUNDS = {}


def sound(name):
    def deco(fn):
        SOUNDS[name] = fn
        return fn
    return deco


@sound("kick")
def s_kick(d=0.5):
    t = tt(d)
    f = 45 + 75 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) + 0.3 * filt(white(d), "highpass", 2000) * np.exp(-t / 0.006)


@sound("boom")
def s_boom(d=3.0, f0=58, f1=28, noise=0.6):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9) + filt(white(d), "lowpass", 1400) * np.exp(-t / 0.18) * noise


@sound("metal_ring")
def s_metal(d=2.5, base=180, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    x = np.zeros(len(t))
    for ratio, amp, dec in [(1, 1, 1.2), (2.37, .6, .9), (4.51, .45, .6), (7.16, .3, .4), (10.3, .2, .25)]:
        f = base * ratio * (1 + r.uniform(-0.01, 0.01))
        x += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / dec) * (1 + 0.1 * np.sin(2 * np.pi * r.uniform(2, 6) * t))
    return x / 2.5


@sound("slam")
def s_slam(d=3.0, base=140):
    return s_boom(d, 70, 32, 0.9) + s_metal(d, base, 5) * 0.9


@sound("whoosh")
def s_whoosh(d=0.5, f0=300, f1=3500, up=True):
    x = sweep(white(d), "bp", f0, f1, bw=0.9) if up else sweep(white(d), "bp", f1, f0, bw=0.9)
    return x * np.sin(np.pi * np.linspace(0, 1, len(x))) ** (1.5 if up else 0.8) * 2.0


@sound("riser")
def s_riser(d=1.5, f0=45, f1=180):
    t = tt(d)
    p = t / d
    f = f0 * (f1 / f0) ** p
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    return (tone * 0.8 + sweep(white(d), "bp", 300, 6000, bw=0.8) * 0.9) * p ** 2.2


@sound("blip")
def s_blip(f=1600, d=0.09, kind="sine", f2=None):
    t = tt(d)
    ff = f if f2 is None else f * (f2 / f) ** (t / d)
    x = sine(ff, d)
    if kind == "square":
        x = np.sign(x) * 0.5
    elif kind == "tri":
        x = 2 / np.pi * np.arcsin(x)
    return x * env_ad(len(t), 0.002, d * 0.6)


@sound("chime")
def s_chime(freqs=(880, 1320), step=0.09):
    out = np.zeros(int((step * len(freqs) + 0.6) * SR))
    for i, f in enumerate(freqs):
        t = tt(0.6)
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.18)
        i0 = int(i * step * SR)
        out[i0:i0 + len(x)] += x
    return out * 0.6


@sound("bell")
def s_bell(f=660, d=3.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dd)) for r, a, dd in [(1, 1, 1.6), (2.0, .5, 1.0), (2.76, .35, .7), (5.4, .2, .35), (8.9, .1, .2)])
    return x * env_win(len(t), 0.003, 0.2) / 2


@sound("gong")
def s_gong(f=110, d=5.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * r * t + 3 * np.sin(2 * np.pi * 0.5 * t)) * np.exp(-t / dd) for r, a, dd in [(1, 1, 3.0), (1.48, .6, 2.2), (2.31, .4, 1.4), (3.7, .25, .8)])
    return x * env_win(len(t), 0.01, 0.5) / 2


@sound("buzz")
def s_buzz(f=150, d=0.14, n=2, gap=0.06):
    out = np.zeros(int((d + gap) * n * SR) + 100)
    for i in range(n):
        t = tt(d)
        x = filt(np.sign(np.sin(2 * np.pi * (f - 30 * t / d) * t)) * env_win(len(t), 0.005, 0.03), "lowpass", 2500)
        i0 = int(i * (d + gap) * SR)
        out[i0:i0 + len(x)] += x
    return out * 0.5


@sound("alarm")
def s_alarm(f1=760, f2=560, d=0.16, n=4):
    out = np.zeros(int(d * n * SR) + 100)
    for i in range(n):
        t = tt(d)
        f = f1 if i % 2 == 0 else f2
        x = (np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t)) * env_win(len(t), 0.004, 0.02)
        out[int(i * d * SR):int(i * d * SR) + len(x)] += filt(x, "lowpass", 3500)
    return out * 0.45


@sound("ping")
def s_ping(f=1150, d=1.4):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) * env_win(len(t), 0.003, 0.0)


@sound("thunder")
def s_thunder(d=4.0, crack=1.0, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    rum = filt(brown(d), "lowpass", 260) * 3
    am = filt(np.abs(r.normal(size=len(t))), "lowpass", 6) * 6
    rum *= np.exp(-t / 1.4) * (0.4 + am) * env_win(len(t), 0.06, 0.5)
    return rum + filt(white(d), "highpass", 900) * np.exp(-t / 0.05) * crack * 0.6


@sound("heartbeat")
def s_heart():
    out = np.zeros(int(0.7 * SR))
    for t0, f in [(0, 62), (0.22, 52)]:
        t = tt(0.3)
        x = np.sin(2 * np.pi * (f + 30 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07)
        out[int(t0 * SR):int(t0 * SR) + len(x)] += x
    return filt(out, "lowpass", 180) * 1.5


@sound("creature")
def s_creature(d=3.2, f0=92, f1=52):
    t = tt(d)
    p = t / d
    f = (f0 * (f1 / f0) ** p) * (1 + 0.025 * np.sin(2 * np.pi * 4.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * k) / k ** 0.8 for k in range(1, 14))
    x = filt(x, "bp", (180, 520)) + filt(x, "bp", (600, 1100)) * 0.5 + np.sin(ph * 0.5) * 0.6
    return x * np.sin(np.pi * np.clip(p * 1.1, 0, 1)) ** 1.2


@sound("scrape")
def s_scrape(d=1.6, seed=0):
    r = np.random.RandomState(seed)
    n = white(d)
    x = np.zeros_like(n)
    for fc in [900, 1700, 2900, 4300]:
        x += sweep(n, "bp", fc * r.uniform(0.9, 1.1), fc * r.uniform(1.1, 1.4), bw=0.08) * 4
    t = tt(d)
    flutter = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (28 + 10 * np.sin(2 * np.pi * 1.3 * t)) * t))
    squeal = np.sin(2 * np.pi * np.cumsum(2300 + 500 * np.sin(2 * np.pi * 0.7 * t)) / SR) * 0.25
    groan = filt(saw(70 + 15 * np.sin(2 * np.pi * 0.5 * t), d), "lowpass", 400) * 0.5
    return (x * (0.4 + 0.6 * flutter) + squeal * flutter + groan) * env_win(len(t), 0.15, 0.4)


@sound("groan")
def s_groan(d=1.6, f=48):
    t = tt(d)
    return filt(saw(f + 8 * np.sin(2 * np.pi * 0.8 * t), d), "lowpass", 500) * env_win(len(t), 0.2, 0.8) + s_metal(d, 95, 8) * 0.6


@sound("creak")
def s_creak(d=2.0, f0=380, f1=820):
    t = tt(d)
    x = sweep(white(d), "bp", f0, f1, bw=0.12, curve="lin") * 3 * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t) ** 2)
    return x * env_win(len(x), 0.3, 0.1)


@sound("drip")
def s_drip(f=900):
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.minimum(1, t / 0.02))) / SR) * np.exp(-t / 0.05)


@sound("footstep")
def s_footstep(seed=0, surface="metal"):
    r = np.random.RandomState(seed)
    t = tt(0.35)
    thud = filt(white(0.35), "lowpass", 180) * np.exp(-t / 0.05) * 3
    grit = filt(white(0.35), "bp", (2000, 6000)) * np.exp(-t / 0.02) * 0.5
    if surface == "metal":
        return thud + s_metal(0.35, r.uniform(380, 520), seed) * 0.6 + grit
    if surface == "wood":
        return thud + filt(white(0.35), "bp", (300, 1200)) * np.exp(-t / 0.03) * 1.2
    return thud + grit * 1.6


@sound("click")
def s_click():
    t = tt(0.04)
    return (filt(white(0.04), "highpass", 2500) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.006)) * 0.8


@sound("pop")
def s_pop(f=520):
    t = tt(0.12)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * np.exp(-t / 0.012))) / SR) * np.exp(-t / 0.03)


@sound("sparkle")
def s_sparkle(d=0.8, seed=0):
    r = np.random.RandomState(seed)
    out = np.zeros(int(d * SR))
    for i in range(10):
        g = s_blip(r.uniform(2500, 6000), 0.12, "sine")
        i0 = int(r.uniform(0, d - 0.12) * SR)
        out[i0:i0 + len(g)] += g * r.uniform(0.3, 1.0)
    return out


@sound("glitch")
def s_glitch(d=0.25, seed=0):
    r = np.random.RandomState(seed)
    out = np.zeros(int(d * SR))
    i = 0
    while i < len(out):
        L = int(r.uniform(0.008, 0.04) * SR)
        k = r.randint(3)
        seg = np.sign(np.sin(2 * np.pi * r.uniform(200, 2000) * tt(L / SR))) if k == 0 else np.round(r.uniform(-1, 1, L) * 4) / 4 if k == 1 else np.zeros(L)
        seg = seg[:len(out) - i]
        out[i:i + len(seg)] = seg
        i += L
    return filt(out, "lowpass", 7000) * 0.5


@sound("breath")
def s_breath(d=0.45):
    t = tt(d)
    return sweep(white(d), "bp", 700, 1600, bw=1.0) * np.sin(np.pi * t / d) ** 2 * 0.9


@sound("hiss")
def s_hiss(d=1.2, f0=3000, f1=900):
    return sweep(white(d), "bp", f0, f1, bw=0.6) * env_win(int(d * SR), 0.3, 0.6)


@sound("noise_sweep")
def s_nsweep(d=0.9, f0=600, f1=6000, bw=0.25):
    return sweep(white(d), "bp", f0, f1, bw=bw) * 0.6


@sound("typing")
def s_typing(n=14, step=0.039, f=3000):
    out = np.zeros(int((n * step + 0.05) * SR))
    for i in range(n):
        g = s_blip(f + 400 * (i % 3), 0.02, "tri")
        i0 = int(i * step * SR)
        out[i0:i0 + len(g)] += g
    return out


@sound("boot")
def s_boot():
    return np.concatenate([s_blip(f, 0.07) for f in (900, 1200, 1600, 2400)])


@sound("impact")
def s_impact(d=3.5):
    t = tt(1.2)
    return mx(s_boom(d, 60, 28, 1.0), sweep(white(1.2), "bp", 6000, 400, bw=0.8) * np.exp(-t / 0.4) * 0.5)


# ----------------------------------------------------------------------------- ambiences (stereo)
AMBIENCES = {}


def ambience(name):
    def deco(fn):
        AMBIENCES[name] = fn
        return fn
    return deco


def _st(x, shift=2400):
    return np.stack([x, np.roll(x, shift)], 1)


@ambience("ocean")
def a_ocean(d, calm=1.0, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    base = filt(brown(d), "lowpass", 500) * 1.6
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + r.uniform(0, 6)) * np.sin(2 * np.pi * 0.047 * t + 1)
    wash = filt(pink(d), "bp", (400, 2500)) * np.clip(np.sin(2 * np.pi * 0.11 * t + r.uniform(0, 6)), 0, 1) ** 3 * 0.5 * calm
    return np.stack([base * swell + wash, np.roll(base, 2400) * swell + np.roll(wash, 1800)], 1)


@ambience("wind")
def a_wind(d, f0=350, f1=900, seed=0):
    r = np.random.RandomState(seed)
    t = tt(d)
    x = sweep(pink(d), "bp", f0, f1, block=2048, curve="lin", bw=1.1) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + r.uniform(0, 6)))
    return _st(x, 3000)


@ambience("rain")
def a_rain(d, density=1.0):
    t = tt(d)
    imp = np.zeros(len(t))
    idx = rng.randint(0, len(t), int(900 * d * density))
    imp[idx] = rng.uniform(0.3, 1.0, len(idx))
    x = filt(white(d), "bp", (1500, 9000)) * 0.35 + filt(imp, "bp", (1200, 6000)) * 1.4 + filt(imp[::-1] * (rng.uniform(size=len(t)) > 0.6), "bp", (180, 700)) * 2.5
    return _st(x, 1500)


@ambience("storm")
def a_storm(d, cutoff=1400):
    x = a_rain(d, 0.7) * 0.4 + a_wind(d, 150, 400, 4) * 0.8
    return np.stack([filt(x[:, c], "lowpass", cutoff) for c in range(2)], 1)


@ambience("hum")
def a_hum(d, f=50):
    t = tt(d)
    x = 0.5 * np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t) + filt(brown(d), "lowpass", 120) * 0.5
    return _st(x, 0)


@ambience("rumble")
def a_rumble(d, cutoff=90):
    return _st(filt(brown(d), "lowpass", cutoff) * 2, 0)


@ambience("stream")
def a_stream(d):
    t = tt(d)
    x = filt(white(d), "bp", (700, 3500)) * (0.7 + 0.3 * filt(rng.normal(size=len(t)), "lowpass", 8) * 4)
    return _st(x, 900)


@ambience("shimmer")
def a_shimmer(d, seed=0, density=14, f0=2000, f1=5200):
    r = np.random.RandomState(seed)
    out = np.zeros((int(d * SR), 2))
    for _ in range(int(d * density)):
        g = sine(r.uniform(f0, f1), 0.35) * np.sin(np.pi * np.linspace(0, 1, int(0.35 * SR))) ** 2
        i0 = r.randint(0, max(1, len(out) - len(g)))
        p = r.uniform(-1, 1)
        out[i0:i0 + len(g), 0] += g * (1 - p) * 0.5
        out[i0:i0 + len(g), 1] += g * (1 + p) * 0.5
    return out


@ambience("room")
def a_room(d):
    return _st(filt(pink(d), "lowpass", 900) * 0.4 + filt(brown(d), "lowpass", 150) * 0.6, 500)


@ambience("birds")
def a_birds(d, density=1.2, seed=0):
    r = np.random.RandomState(seed)
    out = np.zeros((int(d * SR), 2))
    for _ in range(int(d * density)):
        n = r.randint(2, 6)
        f = r.uniform(2500, 5500)
        p = r.uniform(-0.8, 0.8)
        t0 = r.uniform(0, max(0.1, d - 1.0))
        for k in range(n):
            dur = r.uniform(0.05, 0.12)
            tk = tt(dur)
            ff = f * (1 + r.uniform(-0.25, 0.35) * (tk / dur)) + 300 * np.sin(2 * np.pi * r.uniform(20, 40) * tk)
            g = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.sin(np.pi * tk / dur) ** 2 * r.uniform(0.3, 1)
            i0 = int((t0 + k * r.uniform(0.08, 0.16)) * SR)
            if i0 + len(g) < len(out):
                out[i0:i0 + len(g), 0] += g * (1 - p) * 0.5
                out[i0:i0 + len(g), 1] += g * (1 + p) * 0.5
    return out + a_wind(d, 300, 700, seed + 1) * 0.15


@ambience("fire")
def a_fire(d):
    t = tt(d)
    imp = np.zeros(len(t))
    idx = rng.randint(0, len(t), int(60 * d))
    imp[idx] = rng.uniform(0.2, 1.0, len(idx)) ** 2
    crack = filt(imp, "bp", (1500, 7000)) * 3
    roar = filt(brown(d), "lowpass", 400) * (0.7 + 0.3 * filt(rng.normal(size=len(t)), "lowpass", 3) * 5)
    return _st(crack + roar, 700)


@ambience("chimes")
def a_chimes(d, seed=0, density=0.5, base=880):
    r = np.random.RandomState(seed)
    scale = [0, 2, 4, 7, 9, 12, 14]
    out = np.zeros((int(d * SR), 2))
    for _ in range(max(1, int(d * density))):
        f = base * 2 ** (scale[r.randint(len(scale))] / 12)
        g = s_bell(f, 2.5) * 0.4
        i0 = int(r.uniform(0, max(0.1, d - 0.5)) * SR)
        g = g[:len(out) - i0]
        p = r.uniform(-0.7, 0.7)
        out[i0:i0 + len(g), 0] += g * (1 - p) * 0.5
        out[i0:i0 + len(g), 1] += g * (1 + p) * 0.5
    return out


@ambience("water_calm")
def a_water_calm(d):
    t = tt(d)
    lap = filt(pink(d), "bp", (200, 1200)) * (0.5 + 0.5 * np.clip(np.sin(2 * np.pi * 0.3 * t) + 0.3 * np.sin(2 * np.pi * 0.71 * t), 0, 1))
    return _st(lap, 1200)


@ambience("space")
def a_space(d, f=55):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * k * t + k) * (0.6 / k) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * k * t)) for k in range(1, 5))
    return _st(x * 0.5, 0) + a_shimmer(d, 9, 4, 1500, 4000) * 0.5


@ambience("city")
def a_city(d):
    t = tt(d)
    traffic = filt(brown(d), "lowpass", 300) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * t))
    return _st(traffic + filt(pink(d), "bp", (500, 2000)) * 0.15, 1100)


# ----------------------------------------------------------------------------- music
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "dim": [0, 3, 6], "aug": [0, 4, 8], "sus2": [0, 2, 7], "sus4": [0, 5, 7], "7": [0, 4, 7, 10],
        "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11], "m9": [0, 3, 7, 10, 14], "add9": [0, 4, 7, 14], "5": [0, 7]}


def midi_hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def parse_chord(name, octave=3):
    root = name[:2] if len(name) > 1 and name[1] in "#b" else name[:1]
    q = name[len(root):]
    base = NOTE[root] + 12 * (octave + 1)
    return [base + i for i in QUAL.get(q, QUAL[""])]


NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]


def default_chords(key, mode):
    """Classic progressions when a section gives no chords: minor i-VI-III-VII, major I-V-vi-IV."""
    r = NOTE[key.rstrip("m")]

    def nm(semi, q=""):
        return NAMES_FLAT[(r + semi) % 12] + q
    if mode == "major":
        return [nm(0), nm(7), nm(9, "m"), nm(5)]
    return [nm(0, "m"), nm(8), nm(3), nm(10)]


def pad_note(f, d, cutoff=1200, detune=0.006, attack=None):
    x = sum(saw(f * (1 + dt), d, phase=rng.uniform()) for dt in (-detune, 0, detune)) / 3 + 0.5 * sine(f / 2, d)
    x = filt(x, "lowpass", cutoff)
    return x * env_win(len(x), attack if attack is not None else min(0.6, d / 3), min(0.8, d / 3))


def ep_note(f, d):
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.3)) * np.exp(-t / 1.6) * (1 + 0.15 * np.sin(2 * np.pi * 4.5 * t))
    return x * env_win(len(t), 0.005, 0.2)


class Music:
    def __init__(self, tl, n):
        self.tl, self.n = tl, n
        self.bus = Bus(n)
        m = tl["audio"]["music"]
        self.m = m
        self.bpm = m.get("bpm", 100)
        self.bar = 240.0 / self.bpm
        self.key = m.get("key", "D")
        self.mode = m.get("mode", "minor")

    def chords(self, sec):
        return sec.get("chords") or default_chords(self.key, self.mode)

    def add(self, x, t0, gain=1.0, t1=None, fi=0.05, fo=0.3):
        if t1 is not None:
            x = x[:int((t1 - t0 + fo) * SR)]
        x = stereo(x)
        x = x * env_win(len(x), fi, fo)[:, None]
        self.bus.add(x, t0, gain)

    def chord_pad(self, chords, t0, t1, cutoff, gain, octave=3, reverb_wet=0.4):
        bars = max(1, int(math.ceil((t1 - t0) / self.bar)))
        out = np.zeros(int((bars * self.bar + 1.0) * SR))
        for i in range(bars):
            notes = parse_chord(chords[i % len(chords)], octave)
            notes = notes + [notes[0] - 12]
            seg = sum(pad_note(midi_hz(m), self.bar + 0.6, cutoff) for m in notes) / len(notes)
            i0 = int(i * self.bar * SR)
            out[i0:i0 + len(seg)] += seg
        self.add(reverb(out, "hall", reverb_wet), t0, gain, t1)

    def bass(self, chords, t0, t1, div, gain, accent=1.0):
        step = self.bar / div
        out = np.zeros(int((t1 - t0 + 0.5) * SR))
        k, t = 0, 0.0
        while t < t1 - t0:
            f = midi_hz(parse_chord(chords[int(t / self.bar) % len(chords)], 2)[0])
            d = step * 0.9
            tk = tt(d)
            x = filt(saw(f, d), "lowpass", 300 + 900 * (k % 2 == 0) * accent) * np.exp(-tk / 0.12) + 0.6 * sine(f, d) * np.exp(-tk / 0.2)
            i0 = int(t * SR)
            out[i0:i0 + len(x)] += x[:len(out) - i0]
            t += step
            k += 1
        self.add(out, t0, gain, t1, fi=0.2)

    def kicks(self, t0, t1, every, gain, start_offset=0.0):
        k = s_kick()
        t = t0 + start_offset
        while t < t1 - 0.3:
            self.bus.add(stereo(k), t, gain)
            t += every

    def hats(self, t0, t1, step, gain, swing=0.0, ramp=False):
        out = np.zeros(int((t1 - t0 + 0.2) * SR))
        t, i = 0.0, 0
        while t < t1 - t0:
            d = 0.05
            x = filt(white(d), "highpass", 7000) * np.exp(-tt(d) / (0.012 if i % 2 else 0.02)) * (1.0 if i % 4 == 2 else 0.6)
            i0 = int((t + (swing * step if i % 2 else 0)) * SR)
            if i0 + len(x) < len(out):
                out[i0:i0 + len(x)] += x
            t += step
            i += 1
        if ramp:
            out *= np.linspace(0.4, 1.0, len(out))
        self.add(out, t0, gain, t1, fi=0.01, fo=0.05)

    def arp(self, chords, t0, t1, div, gain, octave=5, pentatonic=False, tone="tri"):
        step = self.bar / div
        out = np.zeros(int((t1 - t0 + 1.0) * SR))
        t, i = 0.0, 0
        while t < t1 - t0:
            ch = parse_chord(chords[int(t / self.bar) % len(chords)], octave)
            if pentatonic:
                r = ch[0]
                seq = [r, r + 2, r + 4 if ch[1] - r == 4 else r + 3, r + 7, r + 9 if ch[1] - r == 4 else r + 10]
            else:
                seq = ch + [ch[1] + 12]
            f = midi_hz(seq[i % len(seq)])
            tk = tt(0.35)
            x = (2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * tk))) if tone == "tri" else np.sin(2 * np.pi * f * tk) * (1 + 0.2 * np.sin(2 * np.pi * 2 * f * tk))
            x = x * np.exp(-tk / (0.09 if tone == "tri" else 0.25))
            i0 = int(t * SR)
            out[i0:i0 + len(x)] += x[:len(out) - i0]
            t += step
            i += 1
        dl = int(step * 1.5 * SR)
        out[dl:] += out[:-dl] * 0.35
        self.add(reverb(out, "hall", 0.35), t0, gain, t1, fi=1.0 if div >= 8 else 0.3, fo=1.0)

    def render(self):
        m = self.m
        if m.get("preset") == "none":
            return self.bus.buf
        if m.get("file"):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", m["file"], "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
            x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
            st = float(m.get("start", 0))
            x = x[int(st * SR):]
            if len(x) < self.n:
                x = np.concatenate([x] * (self.n // len(x) + 1))
            x = x[:self.n] * env_win(self.n, m.get("fade_in", 0.5), m.get("fade_out", 1.5))[:, None]
            self.bus.buf += x / (np.abs(x).max() + 1e-9) * 0.9
            return self.bus.buf
        dur = self.tl["duration"]
        secs = sorted(m.get("sections") or [{"at": 0, "style": "drone"}], key=lambda s: s["at"])
        for i, sec in enumerate(secs):
            t0 = sec["at"]
            t1 = sec.get("until") or (secs[i + 1]["at"] if i + 1 < len(secs) else dur)
            if sec.get("until") is None and i + 1 == len(secs):
                t1 = dur
            g = db(sec.get("gain", 0))
            ch = self.chords(sec)
            st = sec.get("style", "drone")
            root = midi_hz(parse_chord(ch[0], 2)[0])
            if st == "drone":
                d = t1 - t0 + 0.4
                x = (pad_note(root, d, 700) + pad_note(root * 1.5, d, 700) * 0.7 + pad_note(root * 2, d, 900) * 0.5) / 2.2
                x *= np.linspace(0.3, 1.0, len(x))
                self.add(reverb(x, "hall", 0.4), t0, 0.9 * g, t1)
                if sec.get("shimmer", True):
                    self.add(reverb(a_shimmer(d, 3) * 0.25, "hall", 0.6), t0, 0.5 * g, t1)
            elif st == "pulse":
                self.chord_pad(ch, t0, t1, sec.get("cutoff", 1400), 0.7 * g)
                self.bass(ch, t0, t1, 8, 0.55 * g)
                if sec.get("drums", True):
                    self.kicks(t0, t1, self.bar / 4, 0.55 * g, self.bar / 2)
            elif st == "tension":
                self.chord_pad(ch, t0, t1, sec.get("cutoff", 900), 0.75 * g, reverb_wet=0.45)
                self.bass(ch, t0, t1, 4, 0.45 * g, accent=0.3)
                self.hats(t0, t1, self.bar / 8, 0.25 * g)
            elif st == "dark":
                d = t1 - t0 + 0.5
                x = (pad_note(root, d, 600) + pad_note(root * 2 ** (6 / 12), d, 600) * 0.6) / 1.6
                self.add(reverb(x, "hall", 0.4), t0, 0.9 * g, t1, fo=0.5)
                self.hats(t0, t1, self.bar / 16, 0.3 * g, ramp=True)
                self.bass([ch[0]], t0, t1, 8, 0.5 * g, accent=0.5)
            elif st == "sub":
                x = sine(root / 2, t1 - t0 + 0.5) * 0.5
                self.add(x, t0, 0.6 * g, t1, fi=0.3, fo=0.3)
            elif st == "epic":
                self.chord_pad(ch, t0, t1, sec.get("cutoff", 2200), 0.85 * g)
                self.arp(ch, t0, t1, 16, 0.22 * g)
                self.bass(ch, t0, t1, 8, 0.55 * g)
                if sec.get("drums", True):
                    self.kicks(t0, min(t1, dur - 1.4), self.bar / 4, 0.6 * g)
            elif st == "calm":
                self.chord_pad(ch, t0, t1, sec.get("cutoff", 1000), 0.55 * g, reverb_wet=0.55)
                self.arp(ch, t0, t1, sec.get("div", 8), 0.28 * g, octave=5, pentatonic=sec.get("pentatonic", True), tone="sine")
            elif st == "lofi":
                bars = max(1, int(math.ceil((t1 - t0) / self.bar)))
                out = np.zeros(int((bars * self.bar + 2.0) * SR))
                for b in range(bars):
                    for k, m_ in enumerate(parse_chord(ch[b % len(ch)], 4)):
                        x = ep_note(midi_hz(m_), self.bar * 0.95)
                        i0 = int((b * self.bar + k * 0.012) * SR)
                        out[i0:i0 + len(x)] += x * 0.35
                self.add(filt(reverb(out, "room", 0.3), "lowpass", 3500), t0, 0.8 * g, t1)
                self.bass(ch, t0, t1, 4, 0.4 * g, accent=0.2)
                self.hats(t0, t1, self.bar / 8, 0.18 * g, swing=0.25)
                self.kicks(t0, t1, self.bar / 2, 0.45 * g)
                crackle = np.zeros(int((t1 - t0) * SR))
                idx = rng.randint(0, len(crackle), int((t1 - t0) * 40))
                crackle[idx] = rng.uniform(0.1, 0.6, len(idx))
                self.add(filt(crackle, "bp", (1000, 6000)), t0, 0.12 * g, t1)
            elif st == "upbeat":
                self.kicks(t0, t1, self.bar / 4, 0.6 * g)
                stab = np.zeros(int((t1 - t0 + 0.5) * SR))
                t = self.bar / 8
                while t < t1 - t0:
                    notes = parse_chord(ch[int(t / self.bar) % len(ch)], 4)
                    x = sum(filt(saw(midi_hz(n_), 0.18), "lowpass", 2500) for n_ in notes) / len(notes) * env_ad(int(0.18 * SR), 0.003, 0.1)
                    i0 = int(t * SR)
                    stab[i0:i0 + len(x)] += x[:len(stab) - i0]
                    t += self.bar / 4
                self.add(reverb(stab, "room", 0.2), t0, 0.5 * g, t1)
                self.bass(ch, t0, t1, 8, 0.5 * g)
                self.hats(t0, t1, self.bar / 8, 0.25 * g)
                clap = filt(white(0.15), "bp", (900, 3500)) * np.exp(-tt(0.15) / 0.04)
                t = t0 + self.bar / 4
                while t < t1 - 0.2:
                    self.bus.add(stereo(clap), t, 0.35 * g)
                    t += self.bar / 2
            elif st == "silence":
                pass
            else:
                raise KeyError(f"unknown music style '{st}'")
        return self.bus.buf


# ----------------------------------------------------------------------------- auto sounds
def _ev(lst, name, at, gain, pan=0.0, rev=None, wet=0.3, lp=None, **kw):
    lst.append({"sound": name, "at": at, "gain": gain, "pan": pan, "reverb": rev, "wet": wet, "lowpass": lp, **kw})


def auto_hud_sounds(tl):
    ev = []
    for it in tl["hud"]:
        if it.get("sfx") is False:
            continue
        c, at, until = it["component"], it["at"], it["until"]
        off = it.get("sfx_gain", 0)
        g = lambda x: x + off  # noqa: E731
        if c == "frame" and at < 0.2 and tl["audio"]["auto"].get("boot", True):
            _ev(ev, "boot", 0.05, g(-14), rev="room", wet=0.2)
            _ev(ev, "noise_sweep", 0.0, g(-22), d=0.6, f0=400, f1=5000, bw=0.4)
        elif c == "stats":
            for i, _ in enumerate(it.get("rows", [])):
                a = at + 0.12 + i * it.get("stagger", 0.22)
                _ev(ev, "blip", a, g(-16), pan=-0.4, f=1800 + 300 * i, d=0.06)
                for j in range(6):
                    _ev(ev, "blip", a + 0.05 + j * 0.09, g(-30), pan=-0.4, f=4200, d=0.015)
        elif c == "title":
            _ev(ev, "riser", at + 0.08 - 1.1, g(-16), d=1.1, f0=40, f1=140)
            _ev(ev, "boom", at + 0.08, g(-9), rev="hall", wet=0.35)
            _ev(ev, "whoosh", at - 0.17, g(-16), rev="hall", d=0.5, f0=400, f1=4000)
            _ev(ev, "typing", at + 0.2, g(-27), n=min(30, len(str(it.get("text", ""))) // 1), step=0.028)
        elif c == "marker":
            tone = it.get("tone") or {"check": "positive", "x": "negative", "warning": "warning"}.get(it.get("icon", "check"), "neutral")
            if tone == "positive":
                _ev(ev, "chime", at + 0.05, g(-14), freqs=[880, 1320, 1760])
            elif tone == "negative":
                _ev(ev, "buzz", at + 0.05, g(-12), f=140, d=0.12, n=2)
            elif tone == "warning":
                _ev(ev, "alarm", at + 0.05, g(-16), f1=760, f2=560, d=0.15, n=4)
            else:
                _ev(ev, "blip", at + 0.05, g(-16), f=1400, d=0.1)
        elif c == "chip":
            red = str(it.get("color", "")) in ("red",) or it.get("icon") in ("x", "cross")
            if it.get("icon") == "sonar":
                _ev(ev, "ping", at + 0.05, g(-20), pan=-0.5, rev="hall", wet=0.5)
            elif red:
                _ev(ev, "buzz", at + 0.05, g(-20), f=170, d=0.08, n=1)
            else:
                _ev(ev, "blip", at + 0.05, g(-20), f=2000, d=0.06)
        elif c == "alert":
            _ev(ev, "alarm", at + 0.05, g(-18), f1=980, f2=760, d=0.1, n=6)
        elif c == "stamp":
            _ev(ev, "click", at + 0.25, g(-12))
        elif c == "cta":
            _ev(ev, "chime", at + 0.06, g(-12), freqs=[988, 1319, 1976])
        elif c == "choices":
            opts = it.get("options", [])
            for i, o in enumerate(opts):
                _ev(ev, "whoosh", at - 0.04 + i * it.get("stagger", 0.16), g(-18), pan=(-0.3 if i % 2 == 0 else 0.3), d=0.35, f0=500, f1=4000)
                _ev(ev, "click", at + 0.31 + i * it.get("stagger", 0.16), g(-16))
                if o.get("highlight_at") is not None:
                    _ev(ev, "blip", o["highlight_at"], g(-16), pan=(-0.2 if i % 2 == 0 else 0.2), f=[1320, 1760, 1980, 2200][i % 4], d=0.12, kind="tri")
            if it.get("alternate_from") is not None:
                t, k = it["alternate_from"] + it.get("period", 0.75), 0
                while t < until - 0.2:
                    _ev(ev, "blip", t, g(-28), f=1320 if k % 2 == 0 else 1760, d=0.06, kind="tri")
                    t += it.get("period", 0.75)
                    k += 1
        elif c == "holo3d":
            _ev(ev, "whoosh", at - 0.05, g(-20), d=0.4, f0=600, f1=3000)
            _ev(ev, "blip", at + 0.1, g(-16), f=1100, d=0.1, f2=1700)
            for i, l in enumerate(it.get("labels", [])):
                _ev(ev, "blip", l.get("at", at + 0.35 + i * 0.18), g(-22), f=2200 + 200 * i, d=0.05)
            if "scan" in (it.get("params") or {}):
                _ev(ev, "noise_sweep", at + 0.05, g(-20))
            if it.get("flag"):
                _ev(ev, "chime", it["flag"].get("at", at), g(-14), freqs=[1046, 1568])
            for a in it.get("title_alt", []):
                _ev(ev, "chime", a["at"], g(-20), freqs=[1320, 1760])
        elif c == "meter":
            _ev(ev, "blip", at + 0.1, g(-18), f=800, d=0.12, kind="tri")
            for w in it.get("warn", []):
                if w.get("blink"):
                    _ev(ev, "alarm", w["at"] + 0.2, g(-20), f1=900, f2=900, d=0.1, n=2)
        elif c == "prohibit":
            _ev(ev, "buzz", at + 0.06, g(-12), f=110, d=0.22, n=1)
            _ev(ev, "click", at + 0.06, g(-14))
        elif c == "hazard":
            _ev(ev, "alarm", at + 0.06, g(-18), f1=520, f2=420, d=0.22, n=2)
            _ev(ev, "hiss", at + 0.06, g(-24))
        elif c == "pips":
            offs = it.get("offs", [])
            for i, o in enumerate(offs):
                _ev(ev, "blip", o, g(-16), f=900 - 150 * i, d=0.08, kind="tri")
                _ev(ev, "breath", o - 0.05, g(-30), d=0.4)
            if offs:
                _ev(ev, "blip", offs[-1] + 0.12, g(-18), f=440, d=0.6, kind="tri")
        elif c == "radar":
            per = 360.0 / it.get("sweep", 200)
            b = it.get("blip") or {}
            t = at + 0.15
            while t < until - 0.2:
                _ev(ev, "ping", t, g(-20 if b and t >= b.get("at", 1e9) else -28), pan=0.5, rev="hall", wet=0.4, f=1300, d=0.6)
                t += per
        elif c == "target":
            for i in range(3):
                _ev(ev, "blip", at + 0.1 + i * 0.08, g(-18), f=1200 + 400 * i, d=0.05)
        elif c == "list":
            for i, x in enumerate(it.get("items", [])):
                _ev(ev, "pop", x.get("at", at + 0.25 * i), g(-16), f=520 + 60 * i)
        elif c == "counter":
            ca, d = it.get("count_at", at), it.get("dur", 1.2)
            t = ca
            while t < ca + d:
                _ev(ev, "blip", t, g(-28), f=2600, d=0.02)
                t += 0.06
            _ev(ev, "chime", ca + d, g(-16), freqs=[1320, 1760])
        elif c in ("text", "image"):
            _ev(ev, "pop", at + 0.02, g(-20))
        elif c == "lower_third":
            _ev(ev, "whoosh", at - 0.05, g(-20), d=0.35, f0=500, f1=3500)
    return ev


DRAW_ENTER_SOUND = {           # enter preset -> (sound, gain dB, params)
    "pop": ("pop", -17, {"f": 620}), "grow": ("pop", -17, {"f": 520}), "zoom": ("pop", -18, {"f": 700}), "spin": ("pop", -18, {"f": 820}),
    "rise": ("pop", -19, {"f": 560}), "grow_x": ("blip", -22, {"f": 900, "d": 0.12, "f2": 1600}), "grow_y": ("blip", -22, {"f": 600, "d": 0.14, "f2": 1300}),
    "stamp": ("kick", -12, {"d": 0.35}), "drop": ("kick", -13, {"d": 0.3}),
    "slide_up": ("whoosh", -20, {"d": 0.35, "f0": 400, "f1": 3500}), "slide_down": ("whoosh", -20, {"d": 0.35, "f0": 400, "f1": 3500}),
    "slide_left": ("whoosh", -20, {"d": 0.35, "f0": 400, "f1": 3500}), "slide_right": ("whoosh", -20, {"d": 0.35, "f0": 400, "f1": 3500}),
    "fly_left": ("whoosh", -17, {"d": 0.45}), "fly_right": ("whoosh", -17, {"d": 0.45}), "fly_up": ("whoosh", -17, {"d": 0.45}), "fly_down": ("whoosh", -17, {"d": 0.45}),
    "draw": ("hiss", -26, {"d": 0.5, "f0": 5000, "f1": 2500}), "wipe_right": ("noise_sweep", -24, {"d": 0.4}), "wipe_left": ("noise_sweep", -24, {"d": 0.4}),
    "wipe_up": ("noise_sweep", -24, {"d": 0.4}), "wipe_down": ("noise_sweep", -24, {"d": 0.4}),
}


def auto_draw_sounds(tl):
    """Sounds for code-drawn items with `sfx`: true (by enter preset) | "sound" | {sound, gain, offset, ...params}."""
    ev = []

    def walk(items, shot):
        for it in items or []:
            sfx = it.get("sfx")
            if sfx:
                at = it.get("at")
                at = shot["start"] if at is None else at
                enter = it.get("enter")
                enter = enter.get("type") if isinstance(enter, dict) else enter
                name, gain, params = DRAW_ENTER_SOUND.get(enter, ("blip", -22, {"f": 1300, "d": 0.08}))
                if isinstance(sfx, str):
                    name, params = sfx, {}
                elif isinstance(sfx, dict):
                    sfx = dict(sfx)
                    at += sfx.pop("offset", 0)
                    name, gain = sfx.pop("sound", name), sfx.pop("gain", gain)
                    params = {**(params if name == DRAW_ENTER_SOUND.get(enter, ("",))[0] else {}), **sfx}
                _ev(ev, name, at, gain + it.get("sfx_gain", 0), **params)
            walk(it.get("children"), shot)

    for s in tl["shots"]:
        if s.get("draw"):
            walk(s["draw"].get("layers"), s)
    return ev


def auto_transition_sounds(tl):
    ev = []
    for i, s in enumerate(tl["shots"]):
        tr = s.get("transition") or {}
        k, tb = tr.get("type", "cut"), s["start"]
        if tr.get("sfx") is False or k == "cut" or i == 0:
            continue
        if k in ("whip_x", "whip_y", "zoom"):
            _ev(ev, "whoosh", tb - 0.3, -12, rev="room", wet=0.2, d=0.45, f0=250, f1=5000)
        if k == "zoom":
            _ev(ev, "riser", tb - 0.5, -18 - 4, d=0.5, f0=60, f1=200)
        elif k == "glitch":
            _ev(ev, "glitch", tb - 0.12, -14, d=0.28, seed=5)
        elif k == "slam":
            _ev(ev, "glitch", tb - 0.02, -16, d=0.22, seed=9)
        elif k == "dip":
            _ev(ev, "whoosh", tb - 0.3, -12, lp=900, d=0.6, f0=100, f1=900, up=False)
        elif k == "flash":
            _ev(ev, "riser", tb - 1.25, -13, d=1.25, f0=40, f1=220)
            _ev(ev, "impact", tb, -6, rev="hall", wet=0.4)
        elif k in ("dissolve", "fade"):
            _ev(ev, "whoosh", tb - 0.25, -24, d=0.6, f0=200, f1=1500)
    return ev


def render_event(e):
    params = {k: v for k, v in e.items() if k not in ("sound", "at", "gain", "pan", "reverb", "wet", "lowpass", "highpass", "repeat", "vary")}
    fn = SOUNDS.get(e["sound"])
    if fn is None:
        raise KeyError(f"unknown sound '{e['sound']}' (available: {', '.join(sorted(SOUNDS))})")
    x = fn(**params)
    if e.get("lowpass"):
        x = filt(x, "lowpass", e["lowpass"])
    if e.get("highpass"):
        x = filt(x, "highpass", e["highpass"])
    if e.get("reverb"):
        x = reverb(x, e["reverb"], e.get("wet", 0.3))
    return x


# ----------------------------------------------------------------------------- assemble
def run(pid, stems=False):
    tl = load_timeline(pid)
    bd = build_dir(pid)
    dur = tl["duration"]
    n = int(dur * SR) + SR
    au = tl["audio"]

    vo, _ = sf.read(os.path.join(bd, "vo.wav"))
    vo = vo[:n] if len(vo) >= n else np.pad(vo, (0, n - len(vo)))
    v = filt(vo, "highpass", 85)
    v = peak_eq(peak_eq(v, 3800, 3.0, 1.2), 220, -2.0, 1.0)
    env = np.sqrt(np.maximum(filt(v ** 2, "lowpass", 12), 0) + 1e-9)
    v = v * np.where(env > 0.12, (0.12 + (env - 0.12) / 3.0) / env, 1.0)
    v = v / (np.abs(v).max() + 1e-9) * 0.89 * db(au.get("vo_gain", 0))
    v_st = reverb(v, "room", 0.07)

    music = Music(tl, n).render()
    duck_env = filt(np.abs(vo), "lowpass", 4)
    duck_env = duck_env / (duck_env.max() + 1e-9)
    music = music * (1 - au.get("duck", 0.6) * np.clip(duck_env * 3, 0, 1))[:, None]

    amb = Bus(n)
    for s in tl["shots"]:
        layers = au["ambience"].get(s["id"]) or []
        if isinstance(layers, dict):
            layers = [layers]
        pre, post = 0.15, 0.25
        d = s["end"] - s["start"] + pre + post
        for L in layers:
            params = {k: v_ for k, v_ in L.items() if k not in ("sound", "gain", "lowpass")}
            fn = AMBIENCES.get(L["sound"])
            if fn is None:
                raise KeyError(f"unknown ambience '{L['sound']}' (available: {', '.join(sorted(AMBIENCES))})")
            sig = fn(d + 0.5, **params)[:int(d * SR)]
            if L.get("lowpass"):
                sig = np.stack([filt(sig[:, c], "lowpass", L["lowpass"]) for c in range(2)], 1)
            sig = sig / (np.sqrt((sig ** 2).mean()) + 1e-9) * 0.1 * db(L.get("gain", -10))
            amb.add(sig * env_win(len(sig), pre, post)[:, None], s["start"] - pre)

    sfx = Bus(n, norm=True)
    events = []
    if au["auto"].get("hud", True):
        events += auto_hud_sounds(tl)
    if au["auto"].get("transitions", True):
        events += auto_transition_sounds(tl)
    events += auto_draw_sounds(tl)
    for e in au["sfx"]:
        rep = e.get("repeat")
        if rep:
            r = np.random.RandomState(int(e["at"] * 100) % 9973)
            for k in range(rep.get("count", 3)):
                ek = dict(e, at=e["at"] + k * rep.get("every", 0.5) + r.uniform(0, rep.get("jitter", 0.0)))
                ek.pop("repeat")
                if e.get("vary"):
                    for pk, (lo, hi) in e["vary"].items():
                        ek[pk] = r.uniform(lo, hi)
                    ek.pop("vary")
                if e["sound"] == "footstep":
                    ek["seed"] = k
                    ek["pan"] = -0.2 if k % 2 else 0.2
                events.append(ek)
        else:
            events.append(e)
    for e in events:
        sfx.add(render_event(e), e["at"], db(e.get("gain", -12)), e.get("pan", 0.0))

    stems_d = {"vo": v_st, "music": music * db(au["music"].get("gain", -13)), "amb": amb.buf, "sfx": sfx.buf}
    if stems:
        sd = build_dir(pid, "stems")
        for k, x in stems_d.items():
            sf.write(os.path.join(sd, k + ".wav"), x[:int(dur * SR)].astype(np.float32), SR, subtype="FLOAT")
    mix = sum(stems_d.values())
    lvl = np.sqrt(np.maximum(filt((mix ** 2).mean(1), "lowpass", 5), 0) + 1e-9)
    mix = mix * np.where(lvl > 0.25, (0.25 + (lvl - 0.25) / 2.0) / lvl, 1.0)[:, None]
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.95
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix = mix[:int(dur * SR)]
    f = int(0.08 * SR)
    mix[-f:] *= np.linspace(1, 0, f)[:, None]
    sf.write(os.path.join(bd, "mix.wav"), mix.astype(np.float32), SR, subtype="FLOAT")
    print(f"  mix.wav written ({dur:.2f}s, {len(events)} sound events)")
