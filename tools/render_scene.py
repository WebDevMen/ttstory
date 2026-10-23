"""Scene layer renderer: turns the AI keyframe plates into moving 2.5D shots.

Per frame: depth-parallax camera (plate + Depth Anything disparity), animated fog, water shimmer,
particles (rain, spores, dust, glints), practical light effects (flashlight, lightning, neon flicker),
bloom, grading, transitions, chromatic aberration and grain. Also exports build/camera.json with the
per-frame screen positions of anchors used by the HUD.

Usage: python render_scene.py <prepped_dir> <out_frames_dir> [--workers N] [--frames a:b] [--only-camera]
"""
import argparse
import json
import math
import os
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "build", "timeline.json")))
FPS = TL["fps"]
W, H = 1080, 1920
PW, PH = 1296, 2322
C = TL["cues"]
SHOTS = TL["shots"]
SH = {s["id"]: s for s in SHOTS}

cv2.setNumThreads(1)


# ----------------------------------------------------------------------------- math helpers
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def P(t, a, d):
    return clamp((t - a) / d)


def ease(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_in(x):
    return clamp(x) ** 3


def lerp(a, b, x):
    return a + (b - a) * x


def sn(t, seed, freq):
    """Smooth pseudo-noise in [-1, 1]."""
    r = np.random.RandomState(seed)
    ph = r.uniform(0, 2 * math.pi, 3)
    return (math.sin(2 * math.pi * freq * t + ph[0]) + 0.5 * math.sin(2 * math.pi * freq * 2.31 * t + ph[1])
            + 0.25 * math.sin(2 * math.pi * freq * 4.73 * t + ph[2])) / 1.75


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def hash01(n):
    s = math.sin(n * 127.1 + 311.7) * 43758.5453
    return s - math.floor(s)


# ----------------------------------------------------------------------------- camera
class Cam:
    def __init__(self, z=1.0, cx=PW / 2, cy=PH / 2, roll=0.0, px=0.0, py=0.0, k=0.0, d0=0.0, sx=0.0, sy=0.0):
        self.z, self.cx, self.cy, self.roll = z, cx, cy, roll
        self.px, self.py, self.k, self.d0 = px, py, k, d0
        self.sx, self.sy = sx, sy

    def project(self, x, y, d):
        r = math.radians(self.roll)
        ux, uy = (x - self.cx) * self.z, (y - self.cy) * self.z
        qx, qy = math.cos(r) * ux - math.sin(r) * uy, math.sin(r) * ux + math.cos(r) * uy
        dd = d - self.d0
        s = 1 + self.k * dd
        return (W / 2 + qx * s + self.px * dd + self.sx, H / 2 + qy * s + self.py * dd + self.sy)


def shake_at(t, t0, amp, dur, freq=17.0, seed=0):
    if t < t0 or t > t0 + dur:
        return 0.0, 0.0
    a = amp * math.exp(-5.0 * (t - t0) / dur)
    return a * math.sin(2 * math.pi * freq * (t - t0) + seed), a * math.cos(2 * math.pi * freq * 0.87 * (t - t0) + seed * 2)


def camera_for(shot, t):
    s = SH[shot]
    u = t - s["start"]
    dur = s["end"] - s["start"]
    if shot == "deck":
        a = ease(P(u, 0, 4.6))
        b = ease(P(u, 4.6, dur - 4.6))
        z = lerp(1.24, 1.02, a) + 0.05 * b
        cy = lerp(915, 1175, a) - 25 * b
        cx = lerp(705, 648, a)
        return Cam(z, cx + 10 * sn(t, 2, 0.11), cy + 8 * sn(t, 3, 0.13), 0.8 * sn(t, 1, 0.12),
                   px=16 * sn(t, 4, 0.12), py=8 * sn(t, 5, 0.1), k=0.05 * P(u, 0, dur), d0=0.0)
    if shot == "tarp":
        a = ease(P(u, 0, dur))
        return Cam(lerp(1.0, 1.1, a), 648 + 7 * sn(t, 6, 0.2), lerp(1161, 1235, a) + 6 * sn(t, 7, 0.22),
                   0.6 * sn(t, 8, 0.15), px=10 * sn(t, 9, 0.15), py=6 * sn(t, 10, 0.17), k=0.06 * a, d0=0.0)
    if shot == "corridor":
        a = P(u, 0, dur)
        step = 2 * math.pi * 1.9 * u
        push = ease_in(P(u, dur - 0.35, 0.35))
        return Cam(lerp(1.0, 1.15, a) + 0.25 * push, 670 + 5 * math.sin(step / 2), 1150 + 7 * math.sin(step),
                   0.6 * math.sin(step / 2), px=0, py=0, k=lerp(0.0, 0.24, a) + 0.3 * push, d0=0.0)
    if shot == "door":
        a = ease(P(u, 0, dur))
        twist = ease(P(t, s["start"], C["s2_door_close"] - s["start"] + 0.4))
        sx, sy = shake_at(t, C["s2_door_slam"], 30, 0.55, seed=1)
        intro = 1 - ease_out(P(u, 0, 0.35))
        return Cam(lerp(1.03, 1.1, a) + 0.18 * intro, 680 + 6 * sn(t, 11, 0.3), 1210 + 6 * sn(t, 12, 0.3),
                   -2.6 * twist + 0.4 * sn(t, 13, 0.4), px=8 * sn(t, 14, 0.3), py=0, k=0.04, d0=0.6, sx=sx, sy=sy)
    if shot == "flare":
        a = ease(P(u, 0, dur))
        intro = 1 - ease_out(P(u, 0, 0.6))
        return Cam(lerp(1.0, 1.08, a) + 0.06 * intro, lerp(690, 730, a) + 8 * sn(t, 15, 0.25), lerp(1150, 1110, a) + 7 * sn(t, 16, 0.22),
                   0.9 * sn(t, 17, 0.2), px=22 * sn(t, 18, 0.18), py=10 * sn(t, 19, 0.2), k=0.0, d0=0.82)
    if shot == "hatch":
        a = ease(P(u, 0, dur))
        sx, sy = shake_at(t, C["s3_breaths"], 6, 0.5, seed=3)
        return Cam(lerp(1.0, 1.17, a), lerp(650, 665, a) + 5 * sn(t, 20, 0.25), lerp(1161, 1235, a) + 5 * sn(t, 21, 0.25),
                   lerp(0, 3.0, a) + 0.4 * sn(t, 22, 0.2), px=6 * sn(t, 23, 0.2), py=0, k=0.09 * a, d0=0.0, sx=sx, sy=sy)
    if shot == "leak":
        a = ease(P(u, 0, dur))
        sx, sy = shake_at(t, C["s4_rot"], 10, 0.5, seed=4)
        return Cam(lerp(1.04, 1.12, a), lerp(700, 610, a) + 5 * sn(t, 24, 0.15), lerp(1150, 1205, a) + 5 * sn(t, 25, 0.15),
                   0.5 * sn(t, 26, 0.12), px=10 * sn(t, 27, 0.13), py=0, k=0.05 * a, d0=0.5, sx=sx, sy=sy)
    if shot == "porthole":
        a = ease(P(u, 0, dur))
        sx, sy = shake_at(t, C["s4_scrape"], 5, 0.8, freq=24, seed=5)
        sx2, sy2 = shake_at(t, C["s4_lightning"], 9, 0.5, seed=6)
        return Cam(lerp(1.0, 1.1, a), 645 + 4 * sn(t, 28, 0.12), lerp(1165, 1150, a) + 4 * sn(t, 29, 0.12),
                   0.4 * sn(t, 30, 0.1), px=6 * sn(t, 31, 0.12), py=0, k=0.03, d0=0.3, sx=sx + sx2, sy=sy + sy2)
    if shot == "compass":
        a = ease(P(u, 0, dur))
        return Cam(lerp(1.0, 1.1, a), lerp(648, 640, a) + 7 * sn(t, 32, 0.15), lerp(1170, 1115, a) + 6 * sn(t, 33, 0.17),
                   0.6 * sn(t, 34, 0.13), px=14 * sn(t, 35, 0.14), py=7 * sn(t, 36, 0.16), k=0.0, d0=0.9)
    raise KeyError(shot)


ANCHORS = {"flare": ("flare", 850, 1060), "hatch": ("hatch", 690, 900), "city": ("compass", 370, 925), "storm": ("compass", 1010, 640)}


def shot_at(t):
    for s in SHOTS:
        if s["start"] <= t < s["end"]:
            return s["id"]
    return SHOTS[-1]["id"]


# ----------------------------------------------------------------------------- assets (per process)
_cache = {}


def fbm_texture(n, beta, seed):
    r = np.random.RandomState(seed)
    fx = np.fft.fftfreq(n)[:, None]
    fy = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1
    spec = (r.normal(size=(n, n)) + 1j * r.normal(size=(n, n))) / f ** beta
    spec[0, 0] = 0
    img = np.real(np.fft.ifft2(spec)).astype(np.float32)
    img -= img.min()
    img /= img.max()
    return img


def textures():
    if "tex" not in _cache:
        _cache["tex"] = {"fog1": fbm_texture(512, 1.6, 1), "fog2": fbm_texture(512, 1.3, 2), "fine": fbm_texture(256, 0.9, 3),
                         "flow": cv2.resize(fbm_texture(256, 1.1, 4), (64, 512), interpolation=cv2.INTER_CUBIC)}
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        _cache["grid"] = (xx - W / 2, yy - H / 2)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
        _cache["vig"] = (1 - 0.42 * np.clip(r, 0, 1) ** 2.4).astype(np.float32)[..., None]
        rs = np.random.RandomState(7)
        _cache["grain"] = [rs.normal(0, 1, (H, W)).astype(np.float32) for _ in range(10)]
    return _cache["tex"]


def tex_sample(name, scale, ox, oy, stretch=(1.0, 1.0)):
    """Sample a tileable texture across the screen; scale = screen px per texel."""
    tex = textures()[name]
    M = np.array([[1 / (scale * stretch[0]), 0, ox], [0, 1 / (scale * stretch[1]), oy]], np.float32)
    return cv2.warpAffine(tex, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_WRAP)


def plate(name, prepped):
    if name in _cache:
        return _cache[name]
    rgb = cv2.cvtColor(cv2.imread(os.path.join(prepped, name + ".png")), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    depth = cv2.imread(os.path.join(prepped, name + "_depth.png"), cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.2126 * R + 0.7152 * G + 0.0722 * B
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / (mx + 1e-4)
    yy, xx = np.mgrid[0:PH, 0:PW].astype(np.float32)
    aux = np.zeros((PH, PW, 4), np.float32)
    if name == "p2_tarp":
        aux[..., 0] = smoothstep(0.55, 0.85, lum) * ((yy > 700) & (yy < 1380)).astype(np.float32)
    elif name == "p3_corridor":
        aux[..., 0] = smoothstep(0.35, 0.7, sat) * smoothstep(0.4, 0.8, mx) * (yy < 1000)
        # flashlight cone from the lens towards the door
        lens = np.array([1085, 1790.0]); tip = np.array([690, 1180.0])
        v = tip - lens; L = np.linalg.norm(v); v /= L
        rel_x, rel_y = xx - lens[0], yy - lens[1]
        along = rel_x * v[0] + rel_y * v[1]
        perp = np.abs(-rel_x * v[1] + rel_y * v[0])
        cone = smoothstep(0, 80, along) * (1 - smoothstep(0, 1, perp / (40 + along * 0.38))) * (1 - smoothstep(L * 0.8, L * 1.15, along))
        aux[..., 1] = cone.astype(np.float32)
    elif name == "p4_door":
        aux[..., 0] = smoothstep(0.35, 0.7, sat) * smoothstep(0.45, 0.8, mx) * (G > R)
    elif name == "p6_hatch":
        aux[..., 0] = smoothstep(0.05, 0.25, G - np.maximum(R, B)) * smoothstep(0.15, 0.5, lum)
    elif name == "p7_leak":
        aux[..., 0] = smoothstep(0.08, 0.3, (G + B) / 2 - R) * smoothstep(0.3, 0.65, lum)
        aux[..., 1] = smoothstep(0.08, 0.25, R - (G + B) / 2) * (yy < 1100)
        aux[..., 2] = (yy > 1700).astype(np.float32) * smoothstep(0.08, 0.3, (G + B) / 2 - R)
    elif name == "p8_porthole":
        r = np.sqrt((xx - 645) ** 2 + (yy - 1160) ** 2)
        aux[..., 0] = 1 - smoothstep(438, 452, r)
        aux[..., 1] = smoothstep(0.35, 0.7, sat) * smoothstep(0.3, 0.7, mx) * aux[..., 0]
    elif name == "p9_compass":
        r = np.sqrt((xx - 680) ** 2 + (yy - 1660) ** 2)
        aux[..., 0] = smoothstep(0.4, 0.7, sat) * smoothstep(0.45, 0.8, mx) * (r < 240) * (B > R * 0.8)
        aux[..., 1] = (1 - smoothstep(880, 990, yy)) * smoothstep(0.62, 0.85, xx / PW) * (1 - smoothstep(0.15, 0.4, depth))
    _cache[name] = (np.ascontiguousarray(rgb), np.ascontiguousarray(depth), np.ascontiguousarray(aux))
    return _cache[name]


# ----------------------------------------------------------------------------- sprites / particles
_sprites = {}


def sprite(r):
    r = max(0.6, round(r * 2) / 2)
    if r not in _sprites:
        n = int(math.ceil(r * 3))
        y, x = np.mgrid[-n:n + 1, -n:n + 1].astype(np.float32)
        _sprites[r] = np.exp(-(x * x + y * y) / (2 * (r * 0.6) ** 2)).astype(np.float32)
    return _sprites[r]


def splat(buf, x, y, r, rgb, a):
    s = sprite(r)
    n = s.shape[0] // 2
    xi, yi = int(round(x)), int(round(y))
    x0, x1, y0, y1 = xi - n, xi + n + 1, yi - n, yi + n + 1
    if x1 <= 0 or y1 <= 0 or x0 >= W or y0 >= H:
        return
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = s.shape[1] - max(0, x1 - W), s.shape[0] - max(0, y1 - H)
    buf[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] += s[sy0:sy1, sx0:sx1, None] * (np.array(rgb, np.float32) * a)


def rain_layer(t, n, length, angle, speed, thickness, seed, alpha, mask_fn=None):
    lay = np.zeros((H, W), np.uint8)
    rs = np.random.RandomState(seed)
    xs = rs.uniform(-200, W + 200, n)
    ph = rs.uniform(0, 1, n)
    sp = speed * rs.uniform(0.8, 1.2, n)
    ln = length * rs.uniform(0.6, 1.3, n)
    dx, dy = math.sin(angle), math.cos(angle)
    for i in range(n):
        y = ((ph[i] + t * sp[i] / (H + 400)) % 1) * (H + 400) - 200
        x = xs[i] + (y + 200) * dx / dy
        cv2.line(lay, (int(x), int(y)), (int(x + dx * ln[i]), int(y + dy * ln[i])), 255, thickness, cv2.LINE_AA)
    return lay.astype(np.float32)[..., None] / 255.0 * alpha


# ----------------------------------------------------------------------------- core render
def remap_plate(cam, rgb, depth, aux, extra_disp=None, t=0.0):
    gx, gy = _cache["grid"]
    qx, qy = gx - cam.sx, gy - cam.sy
    r = math.radians(-cam.roll)
    cr, sr = math.cos(r), math.sin(r)

    def to_plate(ux, uy):
        return cam.cx + (cr * ux - sr * uy) / cam.z, cam.cy + (sr * ux + cr * uy) / cam.z

    mx, my = to_plate(qx, qy)
    for _ in range(2):
        d = cv2.remap(depth, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        dd = d - cam.d0
        s = 1 + cam.k * dd
        mx, my = to_plate((qx - cam.px * dd) / s, (qy - cam.py * dd) / s)
    d = cv2.remap(depth, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if extra_disp is not None:
        ex, ey = extra_disp(mx, my, d, t)
        mx, my = mx + ex, my + ey
    img = cv2.remap(rgb, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    ax = cv2.remap(aux, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return np.clip(img, 0, 1), d, ax, mx, my


def water_disp(horizon, dmax, amp):
    def f(mx, my, d, t):
        wm = smoothstep(horizon, horizon + 25, my) * (1 - smoothstep(dmax * 0.5, dmax, d))
        persp = np.clip((my - horizon) / 350.0, 0.05, 1.0)
        nz = tex_sample("fine", 3.0, t * 6, t * 3)
        ex = wm * persp * amp * (np.sin(my * 0.11 / (0.3 + persp) + t * 2.2 + nz * 6.0))
        ey = wm * persp * amp * 0.6 * np.sin(mx * 0.025 + my * 0.05 + t * 1.6 + nz * 4.0)
        return ex.astype(np.float32), ey.astype(np.float32)
    return f


def fog(img, d, t, color, density, curve=1.5, scale=2.4, vel=(14, 2), band=None, lift=0.5):
    n1 = tex_sample("fog1", scale, t * vel[0] / scale, t * vel[1] / scale)
    n2 = tex_sample("fog2", scale * 0.55, -t * vel[0] * 0.6 / scale, t * vel[1] * 1.3 / scale)
    n = 0.6 * n1 + 0.4 * n2
    far = np.power(np.clip(1 - d, 0, 1), curve)
    a = density * far * (lift + n)
    if band is not None:
        a = a * band
    a = np.clip(a, 0, 0.92)[..., None]
    return img * (1 - a) + np.array(color, np.float32) * a


def bloom(img, thr=0.72, strength=0.35, tint=(1, 1, 1)):
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    br = np.clip(small - thr, 0, None)
    b = cv2.GaussianBlur(br, (0, 0), 5) * 0.6 + cv2.GaussianBlur(br, (0, 0), 16) * 0.8
    b = cv2.resize(b, (W, H), interpolation=cv2.INTER_LINEAR)
    return img + b * strength * np.array(tint, np.float32)


def grade(img, exposure=1.0, contrast=0.12, sat=1.0, lift=(0, 0, 0), gain=(1, 1, 1)):
    img = img * exposure
    img = img * np.array(gain, np.float32) + np.array(lift, np.float32) * (1 - img)
    img = np.clip(img, 0, 1.6)
    sc = np.clip(img, 0, 1)
    s_curve = sc * sc * (3 - 2 * sc)
    img = img + (s_curve - sc) * contrast * 2
    lum = (0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2])[..., None]
    return lum + (img - lum) * sat


def radial(cx, cy, sigma):
    gx, gy = _cache["grid"]
    return np.exp(-(((gx + W / 2 - cx) ** 2 + (gy + H / 2 - cy) ** 2) / (2 * sigma * sigma))).astype(np.float32)


# ----------------------------------------------------------------------------- shots
def render_shot(shot, t, prepped):
    cam = camera_for(shot, t)
    s = SH[shot]
    u = t - s["start"]
    name = s["plate"]
    rgb, depth, aux = plate(name, prepped)
    disp = None
    if shot == "deck":
        disp = water_disp(992, 0.12, 2.6)
    elif shot == "tarp":
        disp = water_disp(565, 0.16, 2.2)
    elif shot == "flare":
        disp = water_disp(1455, 0.2, 2.4)
    elif shot == "compass":
        w = water_disp(995, 0.3, 2.4)

        def disp(mx, my, d, tt):
            ex, ey = w(mx, my, d, tt)
            sky = 1 - smoothstep(600, 980, my)
            return ex + sky * ((tt - SH["compass"]["start"]) * 1.4 + 3 * np.sin(my * 0.004 + tt * 0.3)).astype(np.float32), ey
    elif shot == "leak":
        def disp(mx, my, d, tt):
            pm = smoothstep(1730, 1800, my)
            ex = np.zeros_like(mx)
            ey = np.zeros_like(my)
            for i, (x0, y0) in enumerate([(360, 1830), (480, 1850), (560, 1815)]):
                rr = np.sqrt((mx - x0) ** 2 + ((my - y0) * 2.2) ** 2) + 1
                wave = np.sin(rr * 0.09 - tt * 7 - i) * np.exp(-rr / 450)
                ex += wave * (mx - x0) / rr * 3.5
                ey += wave * (my - y0) / rr * 2.0
            return (ex * pm).astype(np.float32), (ey * pm).astype(np.float32)
    elif shot == "porthole":
        def disp(mx, my, d, tt):
            r = np.sqrt((mx - 645) ** 2 + (my - 1160) ** 2)
            inside = 1 - smoothstep(330, 445, r)
            slide = 70 * ease(P(tt, C["s4_lightning"] - 0.4, 2.2)) + 10 * P(tt, s["start"], s["end"] - s["start"])
            bob = 6 * math.sin(tt * 1.4)
            return (inside * slide).astype(np.float32), (inside * bob).astype(np.float32)
    img, d, ax, mx, my = remap_plate(cam, rgb, depth, aux, disp, t)
    add = np.zeros_like(img)

    if shot == "deck":
        img = fog(img, d, t, (0.58, 0.83, 0.80), 0.30, curve=2.0, scale=2.6, vel=(16, -1),
                  band=1 - smoothstep(1300, 1700, _cache["grid"][1] + H / 2) * 0.7, lift=0.35)
        sx, sy = cam.project(705, 880, 0.0)
        gx, gy = _cache["grid"]
        ang = np.arctan2(gy + H / 2 - sy, gx + W / 2 - sx)
        rays = np.clip(np.sin(ang * 6 + t * 0.15) * 0.5 + np.sin(ang * 11 - t * 0.22) * 0.5, 0, 1) ** 1.5
        hz = cam.project(705, 985, 0.0)[1]
        sky = (1 - smoothstep(0.03, 0.12, d)) * (1 - smoothstep(hz - 60, hz + 10, gy + H / 2))
        add += (rays * radial(sx, sy, 600) * sky * 0.045)[..., None] * np.array([0.75, 1.0, 0.95], np.float32)
        rs = np.random.RandomState(11)
        for i in range(36):
            ph = (rs.uniform() + t * rs.uniform(0.03, 0.07)) % 1
            x = (rs.uniform(-0.1, 1.1) * W + 40 * math.sin(t * 0.5 + i)) % W
            y = H * (1 - ph)
            rad = rs.uniform(1.5, 4.5)
            splat(add, x, y, rad, (0.8, 1.0, 0.95), 0.10 * math.sin(math.pi * ph))
        img = img + add
        img = bloom(img, 0.86, 0.22, (0.85, 1.0, 0.95))
        img = grade(img, 0.98, 0.13, 1.05, lift=(0.0, 0.01, 0.012))

    elif shot == "tarp":
        img = fog(img, d, t, (0.55, 0.75, 0.74), 0.18, curve=2.5, scale=2.2, vel=(20, 0), lift=0.4)
        glint = tex_sample("fine", 1.6, 0, -t * 40, (1, 3))
        add += (ax[..., 0] * np.clip(glint - 0.55, 0, 1) * 1.2)[..., None] * np.array([0.85, 1.0, 1.0], np.float32)
        # drops falling from the funnel tip into the flask
        d_stream = 0.85
        for i in range(6):
            ph = (t * 1.6 + i / 6) % 1
            x, y = cam.project(648 + 2 * math.sin(i * 3), lerp(1310, 1490, ph * ph), d_stream)
            splat(add, x, y, 3.0 * cam.z, (0.85, 1.0, 1.0), 0.9)
        img = img + add
        r1 = rain_layer(t, 170, 46, 0.1, 1700, 1, 21, 0.20)
        r2 = rain_layer(t, 60, 110, 0.12, 2500, 2, 22, 0.16)
        img = img + (cv2.GaussianBlur(r1 + r2, (0, 0), 0.8))[..., None] * np.array([0.85, 0.95, 1.0], np.float32)
        img = bloom(img, 0.7, 0.35, (0.85, 1.0, 1.0))
        img = grade(img, 1.0, 0.10, 1.0, lift=(0.0, 0.01, 0.015))

    elif shot == "corridor":
        flick = 1 + 0.08 * sn(t, 40, 3.0) + (0.25 if hash01(int(t * 30) * 0.37) > 0.93 else 0)
        img = img * (1 + ax[..., 1:2] * 0.35 * (flick - 1 + 0.3))
        neon = 1 + 0.15 * sn(t, 41, 2.0) - (0.6 if hash01(int(t * 30) * 1.7 + 3) > 0.95 else 0)
        img = img + img * ax[..., 0:1] * (neon - 1)
        img = fog(img, d, t, (0.25, 0.32, 0.36), 0.22, curve=1.2, scale=2.0, vel=(6, -4), lift=0.4)
        rs = np.random.RandomState(12)
        for i in range(70):
            px = rs.uniform(300, 1200)
            py = rs.uniform(900, 1900)
            dd = rs.uniform(0.2, 0.9)
            x, y = cam.project(px + 30 * math.sin(t * 0.4 + i), py + 20 * math.sin(t * 0.3 + i * 2), dd)
            if 0 <= x < W and 0 <= y < H:
                beam = float(ax[int(y), int(x), 1])
                splat(add, x, y, 1.2 + 2.5 * dd, (0.9, 0.97, 1.0), 0.04 + 0.5 * beam)
        img = img + add
        img = bloom(img, 0.65, 0.45, (0.9, 1.0, 1.0))
        img = grade(img, 1.05, 0.12, 1.05, lift=(0.0, 0.008, 0.016))

    elif shot == "door":
        slam = C["s2_door_slam"]
        fl = math.exp(-max(0, t - slam) * 9) if t >= slam else 0
        img = img * (1 + 0.5 * fl)
        status = 0.5 + 0.5 * math.sin(t * 6) if t < slam else 1.0
        lx, ly = cam.project(760, 735, 0.6)
        add += radial(lx, ly, 70)[..., None] * np.array([0.2, 1.0, 0.75], np.float32) * (0.25 + 0.35 * status)
        img = img + img * ax[..., 0:1] * (0.3 * status)
        img = fog(img, d, t, (0.22, 0.3, 0.33), 0.16, curve=1.0, scale=2.0, vel=(-8, -6), lift=0.4)
        if t >= slam:
            rs = np.random.RandomState(13)
            for i in range(60):
                age = t - slam
                x0 = rs.uniform(0, W)
                y = rs.uniform(-100, 600) + age * rs.uniform(300, 700) + 0.5 * 900 * age * age
                splat(add, x0 + 20 * math.sin(age * 3 + i), y, rs.uniform(1, 3), (0.8, 0.9, 0.9), 0.35 * math.exp(-age * 2))
        img = img + add
        img = bloom(img, 0.68, 0.4, (0.9, 1.0, 1.0))
        img = grade(img, 1.05 - 0.08 * P(t, slam, 0.3), 0.12, 1.05, lift=(0.0, 0.006, 0.012))

    elif shot == "flare":
        lt = C["s3_not_only_people"]
        flash = 0.0
        for t0, a in [(lt - 0.05, 0.9), (lt + 0.16, 0.6), (lt + 0.55, 0.35)]:
            if t >= t0:
                flash += a * math.exp(-(t - t0) * 14)
        sky = (1 - smoothstep(0.1, 0.25, d)) * (1 - smoothstep(1300, 1500, my))
        img = img + (img * 1.6 + 0.06) * (sky * flash)[..., None] * np.array([0.8, 0.9, 1.0], np.float32)
        img = fog(img, d, t, (0.16, 0.24, 0.3), 0.22, curve=2.2, scale=2.6, vel=(22, 0),
                  band=smoothstep(1250, 1500, my) * (1 - smoothstep(1700, 1900, my)) + 0.25, lift=0.35)
        red = P(t, C["s3_flare_block"], 0.2) * (1 - P(t, SH["flare"]["end"] - 0.3, 0.3))
        img = img + (radial(*cam.project(850, 1060, 0.82), 330) * 0.10 * red * (0.7 + 0.3 * math.sin(t * 9)))[..., None] * np.array([1, 0.15, 0.2], np.float32)
        img = bloom(img, 0.7, 0.35, (0.8, 0.9, 1.0))
        img = grade(img, 1.05, 0.12, 1.05, lift=(0.0, 0.006, 0.02))

    elif shot == "hatch":
        hx, hy = cam.project(660, 1250, 0.15)
        pulse = 0.5 + 0.5 * math.sin(t * 2.6)
        img = img + img * ax[..., 0:1] * (0.25 * pulse)
        add += radial(hx, hy, 300)[..., None] * np.array([0.15, 1.0, 0.45], np.float32) * (0.10 + 0.06 * pulse)
        gfog = tex_sample("fog1", 2.0, 0, t * 25 / 2.0)
        add += (gfog * radial(hx, hy - 120, 420) * 0.10)[..., None] * np.array([0.2, 1.0, 0.5], np.float32)
        rs = np.random.RandomState(14)
        boost = 1 + 0.6 * P(t, C["s3_breaths"], 0.5)
        for i in range(170):
            life = rs.uniform(2.2, 3.6)
            ph = ((t - SH["hatch"]["start"] + 1.5) * boost / life + rs.uniform()) % 1
            ang = rs.uniform(0, 2 * math.pi)
            r0 = rs.uniform(0, 1) ** 0.5
            px0 = 660 + math.cos(ang) * 250 * r0
            py0 = 1260 + math.sin(ang) * 230 * r0
            grow = ph ** 1.6
            x = px0 + (px0 - 660) * 2.5 * grow + 25 * math.sin(t * 1.3 + i)
            y = py0 + (py0 - 1260) * 2.5 * grow - 650 * grow
            sx, sy = cam.project(x, y, 0.2 + 0.7 * grow)
            rad = 1.2 + 9 * grow ** 2
            a = math.sin(math.pi * min(1, ph * 1.15)) * (0.9 if rad < 5 else 0.5)
            splat(add, sx, sy, rad * 2.6, (0.2, 1.0, 0.45), a * 0.25)
            splat(add, sx, sy, rad, (0.75, 1.0, 0.8), a * 0.9)
        img = img + add
        img = bloom(img, 0.6, 0.5, (0.5, 1.0, 0.6))
        redp = math.exp(-max(0, t - C["s3_breaths"]) * 3) if t >= C["s3_breaths"] else 0
        img = grade(img, 1.05, 0.12, 1.05, lift=(0.03 * redp, 0.01, 0.01), gain=(1 + 0.25 * redp, 1, 1))

    elif shot == "leak":
        flow_k = 1 + 0.6 * P(t, C["s4_rot"], 0.4)
        fl = tex_sample("flow", 1.0, 0, -t * 280, (4, 1))
        add += (ax[..., 0] * (1 - ax[..., 2]) * np.clip(fl - 0.45, 0, 1) * 1.6 * flow_k)[..., None] * np.array([0.4, 1.0, 0.95], np.float32)
        caus = tex_sample("fine", 1.3, t * 12, t * 20)
        add += (ax[..., 2] * np.clip(caus - 0.5, 0, 1) * 0.9)[..., None] * np.array([0.4, 1.0, 0.95], np.float32)
        red = 0.6 + 0.4 * math.sin(t * 2 * math.pi * 0.8)
        img = img + img * ax[..., 1:2] * (red - 0.6) * 0.8
        rs = np.random.RandomState(15)
        for i in range(14):
            ph = (t * rs.uniform(0.7, 1.2) + rs.uniform()) % 1
            px = rs.uniform(640, 770)
            py = lerp(rs.uniform(1100, 1300), 1760, ph * ph)
            x, y = cam.project(px, py, 0.55)
            splat(add, x, y, 2.6, (0.5, 1.0, 1.0), 0.8)
        img = img + add
        img = fog(img, d, t, (0.2, 0.08, 0.08), 0.12, curve=1.0, scale=2.0, vel=(5, -3), lift=0.4)
        img = bloom(img, 0.62, 0.5, (0.6, 1.0, 1.0))
        img = grade(img, 1.03, 0.12, 1.05)

    elif shot == "porthole":
        ext = ax[..., 0:1]
        glow = ax[..., 1:2]
        g1 = C["s4_guests"] + 0.15
        big = C["s4_lightning"]
        flash = 0.0
        if t >= g1:
            flash += 0.26 * math.exp(-(t - g1) * 10) + 0.16 * math.exp(-max(0, t - g1 - 0.12) * 12) * (t > g1 + 0.12)
        if t >= big:
            f = t - big
            flash += 1.3 * math.exp(-f * 10) + (0.9 * math.exp(-(f - 0.14) * 9) if f > 0.14 else 0)
        sustain = 0.55 * ease(P(t, big + 0.05, 0.6))
        ext_lvl = 0.10 + sustain + flash
        ext_img = img * ext_lvl + img * glow * (0.2 * (1 - min(1, sustain + flash)))
        light_on = t < C["s4_light_off"] or (t < C["s4_light_off"] + 0.2 and int(t * 30) % 3 == 0)
        fx, fy = cam.project(470, 1560, 0.3)
        pool = radial(fx, fy, 520)[..., None]
        int_gain = (1.0 + 0.5 * pool * np.array([1.0, 0.95, 0.85], np.float32)) if light_on else 0.42
        int_img = img * int_gain + img * flash * 0.45 * np.array([0.7, 0.8, 1.0], np.float32)
        img = ext_img * ext + int_img * (1 - ext)
        rain = rain_layer(t, 90, 60, 0.25, 900, 1, 31, 0.25)
        img = img + rain * ext * (0.3 + min(1.0, sustain + flash)) * np.array([0.8, 0.9, 1.0], np.float32)
        img = bloom(img, 0.74, 0.35, (0.75, 0.85, 1.0))
        img = grade(img, 1.0, 0.12, 1.05, lift=(0.0, 0.004, 0.014))

    elif shot == "compass":
        sx, sy = cam.project(630, 870, 0.0)
        pulse = 0.5 + 0.5 * math.sin(t * 1.3)
        add += radial(sx, sy, 190)[..., None] * np.array([1.0, 0.7, 0.35], np.float32) * (0.12 + 0.06 * pulse)
        cp = 0.5 + 0.5 * math.sin(t * 4.2)
        img = img + img * ax[..., 0:1] * (0.35 * cp)
        rs = np.random.RandomState(16)
        for i in range(80):
            px = 630 + rs.normal(0, 120) * (0.6 + rs.uniform())
            py = rs.uniform(1000, 1250)
            if abs(px - 630) > 260:
                continue
            tw = max(0.0, math.sin(t * rs.uniform(3, 7) + rs.uniform(0, 6.28))) ** 12
            x, y = cam.project(px, py, 0.1)
            splat(add, x, y, rs.uniform(1.5, 3.2), (1.0, 0.85, 0.6), 1.2 * tw)
        storm = 0.0
        for t0, a in [(C["s5_storm"] + 0.1, 0.8), (C["s5_storm"] + 0.28, 0.5), (56.4, 0.6), (59.5, 0.7), (59.68, 0.4)]:
            if t >= t0:
                storm += a * math.exp(-(t - t0) * 12)
        img = img + (img * 1.2 + 0.05) * (ax[..., 1] * storm)[..., None] * np.array([0.8, 0.85, 1.0], np.float32)
        img = img + add
        img = fog(img, d, t, (0.95, 0.62, 0.45), 0.16, curve=3.0, scale=2.8, vel=(10, 0),
                  band=smoothstep(800, 990, my) * (1 - smoothstep(1050, 1250, my)) + 0.15, lift=0.35)
        img = bloom(img, 0.7, 0.4, (1.0, 0.85, 0.7))
        img = grade(img, 1.0, 0.10, 1.08)

    return img, cam


# ----------------------------------------------------------------------------- transitions & post
BOUNDS = {s["id"]: s["start"] for s in SHOTS}
TRANS = [  # (time, kind, duration)
    (BOUNDS["tarp"], "whip_x", 0.36), (BOUNDS["corridor"], "zoom", 0.32), (BOUNDS["door"], "zoom", 0.26),
    (BOUNDS["flare"], "slam", 0.3), (BOUNDS["hatch"], "whip_y", 0.36), (BOUNDS["leak"], "glitch", 0.24),
    (BOUNDS["porthole"], "dip", 0.34), (BOUNDS["compass"], "flash", 0.6),
]


def box_blur_dir(img, L, axis):
    L = int(L)
    if L < 3:
        return img
    return cv2.blur(img, (L, 1) if axis == 0 else (1, L))


def zoom_blur(img, s0, s1, n=7):
    acc = np.zeros_like(img)
    for i in range(n):
        s = lerp(s0, s1, i / (n - 1))
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s)
        acc += cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / n


def apply_transition(img, t):
    for tb, kind, dur in TRANS:
        if not (tb - dur / 2 <= t < tb + dur / 2):
            continue
        p = (t - (tb - dur / 2)) / dur
        if kind in ("whip_x", "whip_y"):
            amp = 1000 if kind == "whip_x" else 1500
            sign = -1 if kind == "whip_x" else -1

            def off(pp):
                return sign * amp * ease_in(pp / 0.5) ** 1.5 if pp < 0.5 else -sign * amp * (1 - ease_out((pp - 0.5) / 0.5)) ** 1.5
            o = off(p)
            v = abs(off(p) - off(max(0, p - 1 / (FPS * dur))))
            M = np.float32([[1, 0, o if kind == "whip_x" else 0], [0, 1, o if kind == "whip_y" else 0]])
            img = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
            img = box_blur_dir(img, min(420, v * 0.9), 0 if kind == "whip_x" else 1)
            img = img + 0.35 * math.exp(-((p - 0.5) / 0.08) ** 2)
        elif kind == "zoom":
            if p < 0.5:
                s = 1 + 0.45 * ease_in(p / 0.5)
                img = zoom_blur(img, s, s * (1 + 0.12 * ease_in(p / 0.5)))
            else:
                k = 1 - ease_out((p - 0.5) / 0.5)
                img = zoom_blur(img, 1 + 0.25 * k, (1 + 0.25 * k) * (1 + 0.12 * k))
            img = img + 0.25 * math.exp(-((p - 0.5) / 0.1) ** 2)
        elif kind == "slam":
            if 0.45 <= p < 0.62:
                img = img * 0.0
            elif p >= 0.62:
                k = (p - 0.62) / 0.38
                img = img * ease_out(k)
                sh = int(30 * (1 - k))
                if sh > 0:
                    img = np.dstack([np.roll(img[..., 0], sh, 1), img[..., 1], np.roll(img[..., 2], -sh, 1)])
        elif kind == "glitch":
            k = 1 - abs(p - 0.5) * 2
            rs = np.random.RandomState(int(t * 1000) % 9973)
            out = img.copy()
            for _ in range(9):
                y0 = rs.randint(0, H - 40)
                hh = rs.randint(12, 120)
                out[y0:y0 + hh] = np.roll(img[y0:y0 + hh], int(rs.uniform(-80, 80) * k), axis=1)
            sh = int(24 * k)
            img = np.dstack([np.roll(out[..., 0], sh, 1), out[..., 1], np.roll(out[..., 2], -sh, 1)])
            img = img * (1 + 0.3 * k * (rs.uniform() > 0.5))
        elif kind == "dip":
            img = img * (1 - 0.92 * math.sin(math.pi * p))
        elif kind == "flash":
            if t < tb:
                img = img + 1.6 * ease_in(p / 0.5 * 2 - 1 if p > 0.25 else 0)
            else:
                k = (t - tb) / (dur / 2)
                img = img * (1 + 1.2 * (1 - k)) + 0.9 * math.exp(-k * 4)
    return img


def post(img, t, frame):
    textures()
    img = img * _cache["vig"]
    # chromatic aberration (subtle, radial)
    r = cv2.warpAffine(img[..., 0], cv2.getRotationMatrix2D((W / 2, H / 2), 0, 1.0016), (W, H), borderMode=cv2.BORDER_REFLECT)
    b = cv2.warpAffine(img[..., 2], cv2.getRotationMatrix2D((W / 2, H / 2), 0, 0.9984), (W, H), borderMode=cv2.BORDER_REFLECT)
    img = np.dstack([r, img[..., 1], b])
    img = np.clip(img, 0, 1)
    g = _cache["grain"][frame % 10]
    lum = img.mean(-1, keepdims=True)
    img = img + g[..., None] * 0.022 * (0.4 + 0.6 * np.sqrt(np.clip(lum, 0, 1)) * (1 - lum * 0.5))
    return np.clip(img, 0, 1)


def render_frame(args):
    frame, prepped, out_dir = args
    textures()
    t = frame / FPS
    shot = shot_at(t)
    img, cam = render_shot(shot, t, prepped)
    img = apply_transition(img, t)
    img = post(img, t, frame)
    out = (img * 255 + 0.5).astype(np.uint8)
    cv2.imwrite(os.path.join(out_dir, f"{frame:05d}.jpg"), cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])
    return frame


def export_camera(prepped):
    frames = []
    depth_cache = {}
    for f in range(TL["frames"]):
        t = f / FPS
        shot = shot_at(t)
        cam = camera_for(shot, t)
        anchors = {}
        for key, (ash, x, y) in ANCHORS.items():
            if ash != shot:
                continue
            name = SH[ash]["plate"]
            if name not in depth_cache:
                dm = cv2.imread(os.path.join(prepped, name + "_depth.png"), cv2.IMREAD_UNCHANGED)
                depth_cache[name] = dm.astype(np.float32) / 65535.0 if dm is not None else None
            d = float(depth_cache[name][int(y), int(x)]) if depth_cache[name] is not None else cam.d0
            sx, sy = cam.project(x, y, d)
            anchors[key] = [round(sx, 1), round(sy, 1)]
        frames.append({"shot": shot, "shake": [round(cam.sx, 2), round(cam.sy, 2)], "anchors": anchors})
    json.dump({"frames": frames}, open(os.path.join(ROOT, "build", "camera.json"), "w"))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("prepped")
    ap.add_argument("out")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--frames", default=None)
    ap.add_argument("--only-camera", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    export_camera(a.prepped)
    if not a.only_camera:
        if a.frames:
            if ":" in a.frames:
                s, e = map(int, a.frames.split(":"))
                frames = list(range(s, e))
            else:
                frames = [int(x) for x in a.frames.split(",")]
        else:
            frames = list(range(TL["frames"]))
        with Pool(a.workers) as pool:
            for i, f in enumerate(pool.imap_unordered(render_frame, [(f, a.prepped, a.out) for f in frames], chunksize=4)):
                if i % 100 == 0:
                    print(f"{i}/{len(frames)}", flush=True)
