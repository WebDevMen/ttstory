"""Scene layer renderer: turns still plates into moving 2.5D shots, driven entirely by timeline.json.

Per frame: depth-parallax camera -> displacement effects (water, ripples, sky drift, window slide) -> remap of the
plate and its masks -> effect stack (fog, particles, lights, rain, lightning, ...) -> bloom -> grade -> transition ->
vignette / chromatic aberration / grain. Also writes build/<id>/camera.json with per-frame anchor positions for the HUD.

See docs/REFERENCE.md for every camera / mask / effect parameter.
"""
import json
import math
import os
from multiprocessing import Pool

import cv2
import numpy as np

from .common import build_dir, load_timeline, rgb01, save_json

cv2.setNumThreads(1)
G = {}


def _init(pid):
    if G.get("pid") == pid:
        return
    tl = load_timeline(pid)
    G.clear()
    G.update(pid=pid, tl=tl, W=tl["width"], H=tl["height"], PW=tl["plate_w"], PH=tl["plate_h"], fps=tl["fps"],
             shots=tl["shots"], sh={s["id"]: s for s in tl["shots"]}, idx={s["id"]: i for i, s in enumerate(tl["shots"])},
             prepped=build_dir(pid, "prepped"), cache={}, sprites={})


# ----------------------------------------------------------------------------- math helpers
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def P(t, a, d):
    return clamp((t - a) / d) if d > 0 else float(t >= a)


def ease_inout(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_in(x):
    return clamp(x) ** 3


EASE = {"linear": clamp, "inout": ease_inout, "in": ease_in, "out": ease_out}


def lerp(a, b, x):
    return a + (b - a) * x


def sn(t, seed, freq):
    """Smooth pseudo-noise in [-1, 1]."""
    r = np.random.RandomState(seed % (2 ** 31))
    ph = r.uniform(0, 2 * math.pi, 3)
    return (math.sin(2 * math.pi * freq * t + ph[0]) + 0.5 * math.sin(2 * math.pi * freq * 2.31 * t + ph[1])
            + 0.25 * math.sin(2 * math.pi * freq * 4.73 * t + ph[2])) / 1.75


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def hash01(n):
    s = math.sin(n * 127.1 + 311.7) * 43758.5453
    return s - math.floor(s)


def pair(v, default=None):
    if v is None:
        return default
    if isinstance(v, (list, tuple)):
        return float(v[0]), float(v[1])
    return float(v), float(v)


def window(t, p, fade=0.15):
    """Time window from p['from'] to p['until'] with fades; 1 when no window given."""
    a, b = p.get("from"), p.get("until")
    w = 1.0
    if a is not None:
        w *= P(t, a, p.get("fade_in", fade))
    if b is not None:
        w *= 1 - P(t, b - p.get("fade_out", fade), p.get("fade_out", fade))
    return w


def events_sum(t, events, decay_default=12.0):
    s = 0.0
    for e in events or []:
        at = e["at"]
        if t >= at:
            s += e.get("amp", 1.0) * math.exp(-(t - at) * e.get("decay", decay_default))
    return s


# ----------------------------------------------------------------------------- camera
class Cam:
    def __init__(self, z=1.0, cx=0.0, cy=0.0, roll=0.0, px=0.0, py=0.0, k=0.0, d0=0.0, sx=0.0, sy=0.0):
        self.z, self.cx, self.cy, self.roll = z, cx, cy, roll
        self.px, self.py, self.k, self.d0, self.sx, self.sy = px, py, k, d0, sx, sy

    def project(self, x, y, d=0.0):
        r = math.radians(self.roll)
        ux, uy = (x - self.cx) * self.z, (y - self.cy) * self.z
        qx, qy = math.cos(r) * ux - math.sin(r) * uy, math.sin(r) * ux + math.cos(r) * uy
        dd = d - self.d0
        s = 1 + self.k * dd
        return G["W"] / 2 + qx * s + self.px * dd + self.sx, G["H"] / 2 + qy * s + self.py * dd + self.sy


def draw_meta(shot):
    key = ("drawmeta", shot["id"])
    c = G["cache"]
    if key not in c:
        f = os.path.join(build_dir(G["pid"], "drawn", shot["id"]), "meta.json")
        c[key] = json.load(open(f)) if os.path.exists(f) else {"frames": {}}
    return c[key]


def draw_cam(shot, t):
    """Camera of a code-drawn shot as exported by the draw renderer (world px == plate px for effects)."""
    fr = draw_meta(shot)["frames"]
    f = int(round(t * G["fps"]))
    m = fr.get(str(f)) or fr.get(str(f - 1)) or fr.get(str(f + 1))
    if not m:
        world = (shot["draw"].get("world") or [G["W"], G["H"]])
        return Cam(1.0, world[0] / 2, world[1] / 2)
    c = m["cam"]
    return Cam(c["z"], c["x"], c["y"], c.get("roll", 0.0), sx=c.get("sx", 0.0), sy=c.get("sy", 0.0))


def camera_for(shot, t):
    if shot.get("draw") is not None:
        return draw_cam(shot, t)
    spec = shot["camera"]
    u = t - shot["start"]
    dur = max(1e-3, shot["end"] - shot["start"])
    seed = (G["idx"][shot["id"]] + 1) * 101
    base = {"z": 1.0, "x": G["PW"] / 2, "y": G["PH"] / 2, "roll": 0.0}
    full, cur = [], dict(base)
    for k in spec.get("keys") or [{"t": 0}]:
        cur = {**cur, **{n: float(k[n]) for n in ("z", "x", "y", "roll") if n in k}}
        full.append((k["t"], cur, k.get("ease", "inout")))
    vals = dict(full[0][1])
    if u >= full[-1][0]:
        vals = dict(full[-1][1])
    else:
        for (t0, v0, _), (t1, v1, ez) in zip(full, full[1:]):
            if t0 <= u < t1:
                f = EASE.get(ez, ease_inout)((u - t0) / max(1e-6, t1 - t0))
                vals = {n: lerp(v0[n], v1[n], f) for n in v0}
                break
    z, cx, cy, roll = vals["z"], vals["x"], vals["y"], vals["roll"]
    sw = spec.get("sway")
    if sw:
        f = sw.get("freq", 0.15)
        cx += sw.get("x", 0) * sn(t, seed + 1, f)
        cy += sw.get("y", 0) * sn(t, seed + 2, f * 1.1)
        roll += sw.get("roll", 0) * sn(t, seed + 3, f * 0.9)
    bob = spec.get("bob")
    if bob:
        step = 2 * math.pi * bob.get("freq", 1.9) * u
        cx += bob.get("x", 0) * math.sin(step / 2)
        cy += bob.get("y", 0) * math.sin(step)
        roll += bob.get("roll", 0) * math.sin(step / 2)
    par = spec.get("parallax") or {}
    pf = par.get("freq", 0.14)
    px = par.get("px", 0) * sn(t, seed + 4, pf)
    py = par.get("py", 0) * sn(t, seed + 5, pf * 1.15)
    k0, k1 = pair(par.get("k", 0.0))
    k = lerp(k0, k1, EASE.get(par.get("k_ease", "linear"), clamp)(u / dur))
    d0 = par.get("d0", 0.0)
    intro = spec.get("intro")
    if intro:
        z += intro.get("z", 0.0) * (1 - ease_out(P(u, 0, intro.get("dur", 0.4))))
    pe = spec.get("push_end")
    if pe:
        pp = ease_in(P(u, dur - pe.get("dur", 0.35), pe.get("dur", 0.35)))
        z += pe.get("z", 0.25) * pp
        k += pe.get("k", 0.3) * pp
    sx = sy = 0.0
    for i, s in enumerate(spec.get("shakes") or []):
        at, amp, d_, fr = s["at"], s.get("amp", 20), s.get("dur", 0.5), s.get("freq", 17)
        if at <= t <= at + d_:
            a = amp * math.exp(-5.0 * (t - at) / d_)
            sx += a * math.sin(2 * math.pi * fr * (t - at) + i)
            sy += a * math.cos(2 * math.pi * fr * 0.87 * (t - at) + 2 * i)
    return Cam(z, cx, cy, roll, px, py, k, d0, sx, sy)


def shot_at(t):
    for s in G["shots"]:
        if s["start"] <= t < s["end"]:
            return s
    return G["shots"][-1]


# ----------------------------------------------------------------------------- textures, plates, masks
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
    return img / img.max()


def textures():
    c = G["cache"]
    if "tex" not in c:
        W, H = G["W"], G["H"]
        c["tex"] = {"fog1": fbm_texture(512, 1.6, 1), "fog2": fbm_texture(512, 1.3, 2), "fine": fbm_texture(256, 0.9, 3),
                    "flow": cv2.resize(fbm_texture(256, 1.1, 4), (64, 512), interpolation=cv2.INTER_CUBIC)}
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        c["grid"] = (xx - W / 2, yy - H / 2)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
        c["r"] = np.clip(r, 0, 1).astype(np.float32)
        rs = np.random.RandomState(7)
        c["grain"] = [rs.normal(0, 1, (H, W)).astype(np.float32) for _ in range(10)]
    return c["tex"]


def tex_sample(name, scale, ox, oy, stretch=(1.0, 1.0)):
    tex = textures()[name]
    M = np.array([[1 / (scale * stretch[0]), 0, ox], [0, 1 / (scale * stretch[1]), oy]], np.float32)
    return cv2.warpAffine(tex, M, (G["W"], G["H"]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_WRAP)


def screen_xy():
    gx, gy = G["cache"]["grid"]
    return gx + G["W"] / 2, gy + G["H"] / 2


HUE = {
    "cyan": lambda R, G_, B: (G_ + B) / 2 - R, "teal": lambda R, G_, B: (G_ + B) / 2 - R,
    "green": lambda R, G_, B: G_ - np.maximum(R, B), "red": lambda R, G_, B: R - (G_ + B) / 2,
    "blue": lambda R, G_, B: B - np.maximum(R, G_), "magenta": lambda R, G_, B: (R + B) / 2 - G_,
    "yellow": lambda R, G_, B: (R + G_) / 2 - B, "orange": lambda R, G_, B: R - B * 0.6 - G_ * 0.4,
    "warm": lambda R, G_, B: R - B, "cool": lambda R, G_, B: B - R,
}


def _range_mask(v, spec, rising=True):
    if isinstance(spec, (list, tuple)):
        m = smoothstep(float(spec[0]), float(spec[1]), v)
    else:
        m = (v >= float(spec)).astype(np.float32)
    return m if rising else 1 - m


def compute_mask(spec, rgb, depth, xx, yy, done):
    R, G_, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    m = np.ones(depth.shape, np.float32)
    lum = 0.2126 * R + 0.7152 * G_ + 0.0722 * B
    mx, mn = rgb.max(-1), rgb.min(-1)
    for key, val in spec.items():
        if key == "lum":
            m *= _range_mask(lum, val)
        elif key == "sat":
            m *= _range_mask((mx - mn) / (mx + 1e-4), val)
        elif key == "val":
            m *= _range_mask(mx, val)
        elif key == "hue":
            rng = spec.get("hue_range", [0.08, 0.3])
            m *= _range_mask(HUE[val](R, G_, B), rng)
        elif key in ("y_min", "y_max", "x_min", "x_max", "depth_min", "depth_max"):
            src = yy if key[0] == "y" else xx if key[0] == "x" else depth
            m *= _range_mask(src, val, rising=key.endswith("min"))
        elif key == "circle":
            cx, cy, r = val
            soft = spec.get("soft", 6)
            m *= 1 - smoothstep(r - soft, r + soft, np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2))
        elif key == "ellipse":
            cx, cy, rx, ry = val
            soft = spec.get("soft", 0.05)
            m *= 1 - smoothstep(1 - soft, 1 + soft, np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))
        elif key == "rect":
            x0, y0, x1, y1 = val
            soft = spec.get("soft", 4)
            m *= smoothstep(x0 - soft, x0 + soft, xx) * (1 - smoothstep(x1 - soft, x1 + soft, xx)) * \
                smoothstep(y0 - soft, y0 + soft, yy) * (1 - smoothstep(y1 - soft, y1 + soft, yy))
        elif key == "cone":
            a, b = np.array(val["from"], float), np.array(val["to"], float)
            v = b - a
            L = np.linalg.norm(v)
            v /= L
            rx, ry = xx - a[0], yy - a[1]
            along = rx * v[0] + ry * v[1]
            perp = np.abs(-rx * v[1] + ry * v[0])
            m *= smoothstep(0, 80, along) * (1 - smoothstep(0, 1, perp / (val.get("width", 40) + along * val.get("spread", 0.38)))) * \
                (1 - smoothstep(L * 0.8, L * 1.15, along))
        elif key == "mul":
            for other in (val if isinstance(val, list) else [val]):
                m *= done[other]
    if spec.get("invert"):
        m = 1 - m
    if spec.get("blur"):
        m = cv2.GaussianBlur(m, (0, 0), float(spec["blur"]))
    return m.astype(np.float32)


def load_plate(shot):
    key = ("plate", shot["id"])
    c = G["cache"]
    if key in c:
        return c[key]
    name = shot["plate"]
    rgb = cv2.cvtColor(cv2.imread(os.path.join(G["prepped"], name + ".png")), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    depth = cv2.imread(os.path.join(G["prepped"], name + "_depth.png"), cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    yy, xx = np.mgrid[0:depth.shape[0], 0:depth.shape[1]].astype(np.float32)
    names, done = [], {}
    for mname, mspec in (shot.get("masks") or {}).items():
        done[mname] = compute_mask(mspec, rgb, depth, xx, yy, done)
        names.append(mname)
    n = max(4, int(math.ceil(len(names) / 4)) * 4)
    aux = np.zeros(depth.shape + (n,), np.float32)
    for i, mname in enumerate(names):
        aux[..., i] = done[mname]
    c[key] = (np.ascontiguousarray(rgb), np.ascontiguousarray(depth), aux, names)
    return c[key]


# ----------------------------------------------------------------------------- sprites / drawing
def sprite(r):
    r = max(0.6, round(r * 2) / 2)
    sp = G["sprites"]
    if r not in sp:
        n = int(math.ceil(r * 3))
        y, x = np.mgrid[-n:n + 1, -n:n + 1].astype(np.float32)
        sp[r] = np.exp(-(x * x + y * y) / (2 * (r * 0.6) ** 2)).astype(np.float32)
    return sp[r]


def splat(buf, x, y, r, rgb, a):
    W, H = G["W"], G["H"]
    s = sprite(r)
    n = s.shape[0] // 2
    xi, yi = int(round(x)), int(round(y))
    x0, x1, y0, y1 = xi - n, xi + n + 1, yi - n, yi + n + 1
    if x1 <= 0 or y1 <= 0 or x0 >= W or y0 >= H:
        return
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = s.shape[1] - max(0, x1 - W), s.shape[0] - max(0, y1 - H)
    buf[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] += s[sy0:sy1, sx0:sx1, None] * (np.array(rgb, np.float32) * a)


def rain_layer(t, n, length, angle, speed, thickness, seed, alpha):
    W, H = G["W"], G["H"]
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
        cv2.line(lay, (int(x), int(y)), (int(x + dx * ln[i]), int(y + dy * ln[i])), 255, int(thickness), cv2.LINE_AA)
    return lay.astype(np.float32)[..., None] / 255.0 * alpha


def radial(cx, cy, sigma):
    gx, gy = G["cache"]["grid"]
    return np.exp(-(((gx + G["W"] / 2 - cx) ** 2 + (gy + G["H"] / 2 - cy) ** 2) / (2 * sigma * sigma))).astype(np.float32)


# ----------------------------------------------------------------------------- effect context
class Ctx:
    def __init__(self, shot, t, cam, img, d, aux, names, mx, my):
        self.shot, self.t, self.cam, self.img, self.d, self.mx, self.my = shot, t, cam, img, d, mx, my
        self.u = t - shot["start"]
        self.dur = shot["end"] - shot["start"]
        self._aux, self._names = aux, names
        self.seed = (G["idx"][shot["id"]] + 1) * 1000

    def mask(self, name):
        if name is None:
            return None
        if name not in self._names:
            raise KeyError(f"mask '{name}' not defined in shot {self.shot['id']} (masks: {self._names})")
        return self._aux[..., self._names.index(name)]

    def proj(self, x, y, d=0.0):
        return self.cam.project(x, y, d)


DISPLACE, EFFECTS = {}, {}


def displace(name):
    def deco(fn):
        DISPLACE[name] = fn
        return fn
    return deco


def effect(name):
    def deco(fn):
        EFFECTS[name] = fn
        return fn
    return deco


# ----------------------------------------------------------------------------- displacement effects (before remap)
@displace("water")
def d_water(p, shot, mx, my, d, t):
    amp = p.get("amp", 2.4)
    if p.get("region"):                       # explicit water area (plate rect): ponds, puddles, cups
        x0, y0, x1, y1 = p["region"]
        hz = y0
        wm = smoothstep(x0 - 20, x0 + 20, mx) * (1 - smoothstep(x1 - 20, x1 + 20, mx)) * smoothstep(y0, y0 + 25, my) * (1 - smoothstep(y1 - 20, y1, my))
    else:                                     # distant sea: below the horizon and far away (low disparity)
        hz, dmax = p.get("horizon", 0), p.get("dmax", 0.15)
        wm = smoothstep(hz, hz + 25, my) * (1 - smoothstep(dmax * 0.5, dmax, d))
    if p.get("x_min") is not None:
        wm = wm * smoothstep(p["x_min"] - 20, p["x_min"] + 20, mx)
    persp = np.clip((my - hz) / 350.0, 0.05, 1.0)
    nz = tex_sample("fine", 3.0, t * 6, t * 3)
    ex = wm * persp * amp * np.sin(my * 0.11 / (0.3 + persp) + t * 2.2 + nz * 6.0)
    ey = wm * persp * amp * 0.6 * np.sin(mx * 0.025 + my * 0.05 + t * 1.6 + nz * 4.0)
    return ex.astype(np.float32), ey.astype(np.float32)


@displace("ripples")
def d_ripples(p, shot, mx, my, d, t):
    y0 = p.get("y_min", 0)
    pm = smoothstep(y0, y0 + 70, my)
    if p.get("circle"):
        ccx, ccy, cr = p["circle"]
        pm = pm * (1 - smoothstep(cr * 0.85, cr, np.sqrt((mx - ccx) ** 2 + (my - ccy) ** 2)))
    ex = np.zeros_like(mx)
    ey = np.zeros_like(my)
    for i, (x0, yc) in enumerate(p.get("points", [])):
        rr = np.sqrt((mx - x0) ** 2 + ((my - yc) * p.get("squash", 2.2)) ** 2) + 1
        wave = np.sin(rr * p.get("freq", 0.09) - t * p.get("speed", 7) - i) * np.exp(-rr / p.get("reach", 450))
        ex += wave * (mx - x0) / rr * p.get("amp", 3.5)
        ey += wave * (my - yc) / rr * p.get("amp", 3.5) * 0.57
    return (ex * pm).astype(np.float32), (ey * pm).astype(np.float32)


@displace("sky_drift")
def d_sky(p, shot, mx, my, d, t):
    a, b = pair(p.get("y_max", [600, 980]))
    sky = 1 - smoothstep(a, b, my)
    u = t - shot["start"]
    return (sky * (u * p.get("speed", 1.4) + p.get("wobble", 3) * np.sin(my * 0.004 + t * 0.3))).astype(np.float32), np.zeros_like(my)


@displace("window")
def d_window(p, shot, mx, my, d, t):
    cx, cy, r = p["circle"]
    rr = np.sqrt((mx - cx) ** 2 + (my - cy) ** 2)
    inside = 1 - smoothstep(r * 0.73, r * 0.99, rr)
    sl = p.get("slide") or {}
    dx = sl.get("dx", 0) * ease_inout(P(t, sl.get("at", 1e9), sl.get("dur", 2.0))) + sl.get("drift", 0) * P(t, shot["start"], shot["end"] - shot["start"])
    bob = p.get("bob", 0) * math.sin(t * 1.4)
    return (inside * dx).astype(np.float32), (inside * bob).astype(np.float32)


# ----------------------------------------------------------------------------- effects (after remap)
def _band(ctx, p):
    if not p:
        return None
    y = ctx.my if p.get("space", "plate") == "plate" else screen_xy()[1]
    b = np.ones_like(ctx.d)
    if p.get("rise"):
        b *= smoothstep(p["rise"][0], p["rise"][1], y)
    if p.get("fall"):
        b *= 1 - smoothstep(p["fall"][0], p["fall"][1], y)
    fl = p.get("floor", 0.0)
    return fl + (1 - fl) * b


@effect("fog")
def e_fog(ctx, p):
    t = ctx.t
    scale = p.get("scale", 2.4)
    vx, vy = p.get("vel", [14, 2])
    n1 = tex_sample("fog1", scale, t * vx / scale, t * vy / scale)
    n2 = tex_sample("fog2", scale * 0.55, -t * vx * 0.6 / scale, t * vy * 1.3 / scale)
    n = 0.6 * n1 + 0.4 * n2
    far = np.power(np.clip(1 - ctx.d, 0, 1), p.get("curve", 1.5))
    a = p.get("density", 0.25) * far * (p.get("lift", 0.5) + n) * window(t, p)
    band = _band(ctx, p.get("band"))
    if band is not None:
        a = a * band
    if p.get("mask"):
        a = a * ctx.mask(p["mask"])
    a = np.clip(a, 0, 0.92)[..., None]
    ctx.img = ctx.img * (1 - a) + np.array(rgb01(p.get("color", [0.6, 0.8, 0.8])), np.float32) * a


@effect("glow")
def e_glow(ctx, p):
    w = window(ctx.t, p)
    if w <= 0:
        return
    x, y = p["at"]
    if p.get("space") != "screen":
        x, y = ctx.proj(x, y, p.get("depth", 0.0))
    pulse = p.get("pulse") or {}
    amp = 1 + pulse.get("amp", 0) * math.sin(ctx.t * 2 * math.pi * pulse.get("freq", 0.3))
    ctx.img = ctx.img + radial(x, y, p.get("sigma", 200))[..., None] * np.array(rgb01(p.get("color", "white")), np.float32) * (p.get("intensity", 0.1) * amp * w)


@effect("god_rays")
def e_rays(ctx, p):
    sx, sy = ctx.proj(*p["at"], 0.0)
    gx, gy = G["cache"]["grid"]
    ang = np.arctan2(gy + G["H"] / 2 - sy, gx + G["W"] / 2 - sx)
    t = ctx.t
    rays = np.clip(np.sin(ang * p.get("f1", 6) + t * 0.15) * 0.5 + np.sin(ang * p.get("f2", 11) - t * 0.22) * 0.5, 0, 1) ** 1.5
    m = (1 - smoothstep(0.03, 0.12, ctx.d))
    if p.get("horizon") is not None:
        hz = ctx.proj(p["at"][0], p["horizon"], 0.0)[1]
        m = m * (1 - smoothstep(hz - 60, hz + 10, gy + G["H"] / 2))
    ctx.img = ctx.img + (rays * radial(sx, sy, p.get("sigma", 600)) * m * p.get("intensity", 0.045))[..., None] * np.array(rgb01(p.get("color", "white")), np.float32)


@effect("mask_pulse")
def e_mpulse(ctx, p):
    m = ctx.mask(p["mask"])[..., None]
    v = p.get("base", 0.0) + p.get("amount", 0.3) * (0.5 + 0.5 * math.sin(ctx.t * 2 * math.pi * p.get("freq", 0.4) + p.get("phase", 0)))
    ctx.img = ctx.img + ctx.img * m * v * window(ctx.t, p)


@effect("mask_flicker")
def e_mflicker(ctx, p):
    m = ctx.mask(p["mask"])[..., None]
    fr = int(ctx.t * G["fps"])
    v = p.get("amount", 0.15) * sn(ctx.t, ctx.seed + 7, p.get("freq", 2.0))
    if hash01(fr * 1.7 + p.get("seed", 3)) > 1 - p.get("drop_prob", 0.05):
        v -= p.get("drop", 0.6)
    if hash01(fr * 0.37 + p.get("seed", 3)) > 1 - p.get("spike_prob", 0.0):
        v += p.get("spike", 0.25)
    ctx.img = ctx.img + ctx.img * m * (v + p.get("base", 0.0))


@effect("mask_gain")
def e_mgain(ctx, p):
    ctx.img = ctx.img * (1 + ctx.mask(p["mask"])[..., None] * p.get("gain", 0.3) * window(ctx.t, p))


@effect("flow")
def e_flow(ctx, p):
    boost = 1.0
    for b in p.get("boosts") or []:
        boost += (b.get("mul", 1.6) - 1) * P(ctx.t, b["at"], b.get("dur", 0.4))
    st = p.get("stretch", [4, 1])
    st = (st, 1) if not isinstance(st, list) else tuple(st)
    ang = math.radians(p.get("angle", 0))     # 0 = flowing down
    sp = ctx.t * p.get("speed", 280)
    fl = tex_sample(p.get("texture", "flow"), p.get("scale", 1.0), -sp * math.sin(ang), -sp * math.cos(ang), st)
    m = ctx.mask(p["mask"])
    if p.get("exclude"):
        m = m * (1 - ctx.mask(p["exclude"]))
    ctx.img = ctx.img + (m * np.clip(fl - p.get("threshold", 0.45), 0, 1) * p.get("gain", 1.6) * boost)[..., None] * np.array(rgb01(p.get("color", [0.4, 1.0, 0.95])), np.float32)


@effect("haze")
def e_haze(ctx, p):
    """Soft animated volumetric haze inside a radial region (e.g. glowing gas rising from a hatch)."""
    x, y = ctx.proj(p["at"][0], p["at"][1], p.get("depth", 0.2))
    vx, vy = p.get("vel", [0, 25])
    sc = p.get("scale", 2.0)
    n = tex_sample("fog1", sc, -ctx.t * vx / sc, ctx.t * vy / sc)
    ctx.img = ctx.img + (n * radial(x, y + p.get("offset_y", 0), p.get("sigma", 400)) * p.get("intensity", 0.1) * window(ctx.t, p))[..., None] \
        * np.array(rgb01(p.get("color", "white")), np.float32)


@effect("caustics")
def e_caustics(ctx, p):
    c = tex_sample("fine", p.get("scale", 1.3), ctx.t * 12, ctx.t * 20)
    ctx.img = ctx.img + (ctx.mask(p["mask"]) * np.clip(c - 0.5, 0, 1) * p.get("gain", 0.9))[..., None] * np.array(rgb01(p.get("color", [0.4, 1, 0.95])), np.float32)


@effect("rain")
def e_rain(ctx, p):
    acc = None
    for i, L in enumerate(p.get("layers") or [{"count": 170, "length": 46, "speed": 1700, "alpha": 0.2}]):
        r = rain_layer(ctx.t, L.get("count", 150), L.get("length", 50), L.get("angle", 0.1), L.get("speed", 1800),
                       L.get("thickness", 1), L.get("seed", 21 + i), L.get("alpha", 0.2))
        acc = r if acc is None else acc + r
    acc = cv2.GaussianBlur(acc, (0, 0), p.get("blur", 0.8))[..., None]
    if p.get("mask"):
        acc = acc * ctx.mask(p["mask"])[..., None]
    ctx.img = ctx.img + acc * np.array(rgb01(p.get("color", [0.85, 0.95, 1.0])), np.float32) * window(ctx.t, p)


@effect("lightning")
def e_lightning(ctx, p):
    f = events_sum(ctx.t, p.get("events"), p.get("decay", 14))
    if f <= 1e-4:
        return
    if p.get("mask"):
        m = ctx.mask(p["mask"])
    else:
        hz = p.get("horizon", 1e9)
        m = (1 - smoothstep(p.get("depth_max", 0.1), p.get("depth_max", 0.1) + 0.15, ctx.d)) * (1 - smoothstep(hz - 150, hz + 50, ctx.my))
    ctx.img = ctx.img + (ctx.img * p.get("gain", 1.6) + 0.06) * (m * f)[..., None] * np.array(rgb01(p.get("color", [0.8, 0.9, 1.0])), np.float32)


@effect("flash")
def e_flash(ctx, p):
    f = events_sum(ctx.t, p.get("events"), p.get("decay", 9))
    if f > 0:
        ctx.img = ctx.img * (1 + f)


@effect("exposure")
def e_exposure(ctx, p):
    v = 1.0
    for k in p.get("keys") or []:
        v = lerp(v, k["value"], P(ctx.t, k["at"], k.get("dur", 0.3)))
    ctx.img = ctx.img * v


@effect("tint_pulse")
def e_tint(ctx, p):
    if ctx.t < p["at"]:
        return
    k = math.exp(-(ctx.t - p["at"]) * p.get("decay", 3))
    gain = np.array(p.get("gain", [1.25, 1, 1]), np.float32)
    lift = np.array(p.get("lift", [0.03, 0.01, 0.01]), np.float32)
    ctx.img = ctx.img * (1 + (gain - 1) * k) + lift * k * (1 - ctx.img)


@effect("light_pool")
def e_pool(ctx, p):
    on = ctx.t < p.get("off_at", 1e9) or (p.get("flicker", True) and ctx.t < p.get("off_at", 1e9) + 0.2 and int(ctx.t * 30) % 3 == 0)
    if on:
        x, y = ctx.proj(*p["at"], p.get("depth", 0.3))
        pool = radial(x, y, p.get("sigma", 500))[..., None]
        ctx.img = ctx.img * (1 + p.get("gain", 0.5) * pool * np.array(rgb01(p.get("color", [1, 0.95, 0.85])), np.float32))
    else:
        ctx.img = ctx.img * p.get("off_level", 0.42)


@effect("window")
def e_window(ctx, p):
    cx, cy, r = p["circle"]
    if "_wmask" not in ctx.__dict__:
        rr = np.sqrt((ctx.mx - cx) ** 2 + (ctx.my - cy) ** 2)
        ctx._wmask = (1 - smoothstep(r - 7, r + 7, rr)).astype(np.float32)[..., None]
    ext = ctx._wmask
    glow = ctx.mask(p["glow_mask"])[..., None] * ext if p.get("glow_mask") else 0
    flash = events_sum(ctx.t, p.get("flashes"), 10)
    sus = p.get("sustain") or {}
    sustain = sus.get("level", 0.55) * ease_inout(P(ctx.t, sus.get("at", 1e9), sus.get("ramp", 0.6)))
    lvl = p.get("base", 0.1) + sustain + flash
    ext_img = ctx.img * lvl + ctx.img * glow * (p.get("glow_keep", 0.2) * (1 - min(1, sustain + flash)))
    inter = p.get("interior") or {}
    off_at = inter.get("off_at", 1e9)
    on = ctx.t < off_at or (ctx.t < off_at + 0.2 and int(ctx.t * 30) % 3 == 0)
    if on and inter.get("pool"):
        x, y = ctx.proj(inter["pool"][0], inter["pool"][1], 0.3)
        gain = 1.0 + inter.get("gain", 0.5) * radial(x, y, inter["pool"][2])[..., None] * np.array([1.0, 0.95, 0.85], np.float32)
    else:
        gain = 1.0 if on else inter.get("off_level", 0.42)
    int_img = ctx.img * gain + ctx.img * flash * inter.get("flash_gain", 0.45) * np.array([0.7, 0.8, 1.0], np.float32)
    img = ext_img * ext + int_img * (1 - ext)
    rn = p.get("rain")
    if rn:
        rl = rain_layer(ctx.t, rn.get("count", 90), rn.get("length", 60), rn.get("angle", 0.25), rn.get("speed", 900), 1, 31, rn.get("alpha", 0.25))
        img = img + rl * ext * (0.3 + min(1.0, sustain + flash)) * np.array([0.8, 0.9, 1.0], np.float32)
    ctx.img = img


@effect("particles")
def e_particles(ctx, p):
    mode = p.get("mode", "drift")
    rs = np.random.RandomState(p.get("seed", ctx.seed + 17))
    t, u = ctx.t, ctx.u
    W, H = G["W"], G["H"]
    col = rgb01(p.get("color", "white"))
    over = p.get("blend") == "over"
    buf = np.zeros_like(ctx.img)
    alpha_buf = np.zeros(ctx.img.shape[:2] + (1,), np.float32) if over else None
    lay = np.zeros((H, W), np.uint8) if p.get("shape") in ("petal", "flake") else None
    n = int(p.get("count", 40))
    size = pair(p.get("size"), (1.5, 4.5))
    a_base = p.get("alpha", 0.5)
    w = window(t, p)
    if w <= 0:
        return

    def draw(x, y, rad, a, rot=0.0):
        if lay is not None:
            cv2.ellipse(lay, (int(x), int(y)), (max(1, int(rad)), max(1, int(rad * 0.45))), rot, 0, 360, int(255 * clamp(a)), -1, cv2.LINE_AA)
        elif over:
            splat(buf, x, y, rad, col, a)
            splat(alpha_buf, x, y, rad, (1.0,), a)
        else:
            g = p.get("glow")
            if g:
                splat(buf, x, y, rad * g.get("size", 2.6), rgb01(g.get("color", col)), a * g.get("alpha", 0.25))
            splat(buf, x, y, rad, col, a)

    if mode == "rise":            # screen-space motes rising slowly
        x0, x1 = pair(p.get("x_range"), (-0.1, 1.1))
        sp = pair(p.get("speed"), (0.03, 0.07))
        for i in range(n):
            ph = (rs.uniform() + t * rs.uniform(*sp)) % 1
            x = (rs.uniform(x0, x1) * W + p.get("wobble", 40) * math.sin(t * 0.5 + i)) % W
            y = H * (1 - ph)
            draw(x, y, rs.uniform(*size), a_base * math.sin(math.pi * ph) * w)
    elif mode == "fall_loop":     # snow, petals, ash: continuous falling in screen space
        sp = pair(p.get("speed"), (120, 260))
        sway = p.get("sway", 40)
        for i in range(n):
            v = rs.uniform(*sp)
            ph = (rs.uniform() + t * v / (H + 200)) % 1
            x = rs.uniform(-0.1, 1.1) * W + sway * math.sin(t * rs.uniform(0.6, 1.4) + i) + p.get("drift", 30) * t
            y = ph * (H + 200) - 100
            rad = rs.uniform(*size)
            draw(x % (W + 100) - 50, y, rad, a_base * w * (0.6 + 0.4 * rs.uniform()), rot=(t * rs.uniform(40, 160) + i * 37) % 360)
    elif mode == "drift":         # plate-space dust with depth (moves with the camera)
        x0, y0, x1, y1 = p.get("region", [0, 0, G["PW"], G["PH"]])
        d0, d1 = pair(p.get("depth"), (0.2, 0.9))
        boost = ctx.mask(p["boost_mask"]) if p.get("boost_mask") else None
        for i in range(n):
            px, py, dd = rs.uniform(x0, x1), rs.uniform(y0, y1), rs.uniform(d0, d1)
            x, y = ctx.proj(px + 30 * math.sin(t * 0.4 + i), py + 20 * math.sin(t * 0.3 + i * 2), dd)
            if 0 <= x < W and 0 <= y < H:
                a = a_base + (p.get("boost", 0.5) * float(boost[int(y), int(x)]) if boost is not None else 0)
                draw(x, y, size[0] + (size[1] - size[0]) * dd, a * w)
    elif mode == "emanate":       # spores / embers rising out of a region towards the camera
        cx, cy = p["center"]
        rx, ry = pair(p.get("radius"), (250, 230))
        life = pair(p.get("life"), (2.2, 3.6))
        boost = 1.0
        for b in p.get("boosts") or []:
            boost += (b.get("mul", 1.6) - 1) * P(t, b["at"], b.get("dur", 0.5))
        spread, rise = p.get("spread", 2.5), p.get("rise", 650)
        for i in range(n):
            lf = rs.uniform(*life)
            ph = ((u + 1.5) * boost / lf + rs.uniform()) % 1
            ang = rs.uniform(0, 2 * math.pi)
            r0 = rs.uniform(0, 1) ** 0.5
            px0, py0 = cx + math.cos(ang) * rx * r0, cy + math.sin(ang) * ry * r0
            grow = ph ** 1.6
            x = px0 + (px0 - cx) * spread * grow + 25 * math.sin(t * 1.3 + i)
            y = py0 + (py0 - cy) * spread * grow - rise * grow
            sx, sy = ctx.proj(x, y, 0.2 + 0.7 * grow)
            rad = size[0] + size[1] * grow ** 2
            a = math.sin(math.pi * min(1, ph * 1.15)) * (0.9 if rad < 5 else 0.5) * a_base / 0.9
            draw(sx, sy, rad, a * w)
    elif mode == "smoke":         # steam / smoke puffs from a point, expanding and fading
        cx, cy = p["center"]
        life = pair(p.get("life"), (2.5, 4.0))
        for i in range(n):
            lf = rs.uniform(*life)
            ph = (u / lf + rs.uniform()) % 1
            x0 = cx + rs.uniform(-1, 1) * p.get("spread", 40)
            x = x0 + p.get("drift", 60) * ph + p.get("wobble", 25) * math.sin(t * 0.9 + i)
            y = cy - p.get("rise", 420) * ph
            sx, sy = ctx.proj(x, y, p.get("depth", 0.6))
            rad = size[0] + (size[1] - size[0]) * ph
            draw(sx, sy, rad, a_base * math.sin(math.pi * ph) ** 1.5 * w)
    elif mode == "burst":         # debris / dust burst falling from the top at a cue
        at = p["at"]
        if t >= at:
            age = t - at
            x0r, x1r = pair(p.get("x_range"), (0, 1))
            for i in range(n):
                x = rs.uniform(x0r, x1r) * W + 20 * math.sin(age * 3 + i)
                y = rs.uniform(-100, 600) + age * rs.uniform(300, 700) + 0.5 * p.get("gravity", 900) * age * age
                draw(x, y, rs.uniform(*size), a_base * math.exp(-age * p.get("decay", 2)) * w)
    elif mode == "path":          # drops falling along a path (plate space)
        (fx, fy), (tx, ty) = p["path"]
        jx = p.get("jitter_x", 0)
        for i in range(n):
            ph = (t * p.get("rate", 1.6) * rs.uniform(0.8, 1.2) + i / n) % 1
            g = ph * ph
            x, y = ctx.proj(lerp(fx, tx, g) + rs.uniform(-jx, jx), lerp(fy, ty, g), p.get("depth", 0.5))
            draw(x, y, rs.uniform(*size) * ctx.cam.z, a_base * w)
    elif mode == "glints":        # twinkling sparkles on water / metal
        cx = p.get("center_x", G["PW"] / 2)
        y0, y1 = pair(p.get("y_range"), (1000, 1250))
        for i in range(n):
            px = cx + rs.normal(0, p.get("spread", 120)) * (0.6 + rs.uniform())
            py = rs.uniform(y0, y1)
            if abs(px - cx) > p.get("max_dx", 260):
                continue
            tw = max(0.0, math.sin(t * rs.uniform(3, 7) + rs.uniform(0, 6.28))) ** 12
            x, y = ctx.proj(px, py, p.get("depth", 0.1))
            draw(x, y, rs.uniform(*size), a_base * tw * w)
    if lay is not None:
        a = cv2.GaussianBlur(lay.astype(np.float32) / 255.0, (0, 0), p.get("soft", 1.2))[..., None]
        ctx.img = ctx.img * (1 - a) + np.array(col, np.float32) * a
    elif over:
        a = np.clip(alpha_buf, 0, 1)
        ctx.img = ctx.img * (1 - a) + np.clip(buf / (alpha_buf + 1e-4), 0, 1.5) * a
    else:
        ctx.img = ctx.img + buf


# ----------------------------------------------------------------------------- render
def remap_plate(cam, shot, t):
    rgb, depth, aux, names = load_plate(shot)
    gx, gy = G["cache"]["grid"]
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
    ex = ey = None
    for e in shot["effects"]:
        fn = DISPLACE.get(e["type"])
        if fn:
            a, b = fn(e, shot, mx, my, d, t)
            ex = a if ex is None else ex + a
            ey = b if ey is None else ey + b
    if ex is not None:
        mx, my = mx + ex, my + ey
    img = np.clip(cv2.remap(rgb, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT), 0, 1)
    ax = np.concatenate([cv2.remap(aux[..., i:i + 4], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                         for i in range(0, aux.shape[-1], 4)], axis=-1)
    return img, d, ax, names, mx, my


def bloom(img, thr=0.75, strength=0.3, tint=(1, 1, 1)):
    W, H = G["W"], G["H"]
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    br = np.clip(small - thr, 0, None)
    b = cv2.GaussianBlur(br, (0, 0), 5) * 0.6 + cv2.GaussianBlur(br, (0, 0), 16) * 0.8
    return img + cv2.resize(b, (W, H), interpolation=cv2.INTER_LINEAR) * strength * np.array(rgb01(tint), np.float32)


def grade(img, exposure=1.0, contrast=0.12, sat=1.05, lift=(0, 0, 0), gain=(1, 1, 1)):
    img = img * exposure
    img = img * np.array(gain, np.float32) + np.array(lift, np.float32) * (1 - img)
    img = np.clip(img, 0, 1.6)
    sc = np.clip(img, 0, 1)
    img = img + (sc * sc * (3 - 2 * sc) - sc) * contrast * 2
    lum = (0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2])[..., None]
    return lum + (img - lum) * sat


def draw_layer(cam, shot, t):
    """A code-drawn frame (build/<id>/drawn/<shot>/<frame>.jpg) + synthetic depth and world coordinates for effects."""
    f = int(round(t * G["fps"]))
    d_dir = build_dir(G["pid"], "drawn", shot["id"])
    path = next((os.path.join(d_dir, f"{x:05d}.jpg") for x in (f, f - 1, f + 1) if os.path.exists(os.path.join(d_dir, f"{x:05d}.jpg"))), None)
    if path is None:
        raise FileNotFoundError(f"draw frame {f} of shot {shot['id']} is missing — run: python3 vg.py draw {G['pid']}")
    img = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    key = ("drawdepth", shot["id"])
    c = G["cache"]
    if key not in c:
        dp = shot["draw"].get("depth", [0.1, 0.8])
        if isinstance(dp, (int, float)):
            c[key] = np.full((G["H"], G["W"]), float(dp), np.float32)
        else:
            c[key] = np.repeat(np.linspace(float(dp[0]), float(dp[1]), G["H"], dtype=np.float32)[:, None], G["W"], 1)
    gx, gy = c["grid"]
    r = math.radians(-cam.roll)
    qx, qy = gx - cam.sx, gy - cam.sy
    mx = (cam.cx + (math.cos(r) * qx - math.sin(r) * qy) / cam.z).astype(np.float32)
    my = (cam.cy + (math.sin(r) * qx + math.cos(r) * qy) / cam.z).astype(np.float32)
    return img, c[key], np.zeros((G["H"], G["W"], 4), np.float32), [], mx, my


def render_shot(shot, t):
    textures()
    cam = camera_for(shot, t)
    if shot.get("draw") is not None:
        img, d, ax, names, mx, my = draw_layer(cam, shot, t)
    else:
        img, d, ax, names, mx, my = remap_plate(cam, shot, t)
    ctx = Ctx(shot, t, cam, img, d, ax, names, mx, my)
    for e in shot["effects"]:
        if e["type"] in DISPLACE and e["type"] not in EFFECTS:
            continue
        fn = EFFECTS.get(e["type"])
        if fn is None:
            raise KeyError(f"unknown effect '{e['type']}' in shot {shot['id']}")
        fn(ctx, e)
    look = shot.get("look") or {}
    b = look.get("bloom", [0.75, 0.3, [1, 1, 1]])
    img = bloom(ctx.img, b[0], b[1], b[2] if len(b) > 2 else (1, 1, 1))
    g = {"exposure": 1.0, "contrast": 0.12, "sat": 1.05, "lift": [0, 0, 0], "gain": [1, 1, 1], **(look.get("grade") or {})}
    img = grade(img, g["exposure"], g["contrast"], g["sat"], g["lift"], g["gain"])
    if shot.get("motion") is not None and shot.get("plate"):
        img = motion_overlay(img, shot, t)
    return img, cam


def motion_overlay(img, shot, t):
    """Composite the transparent motion-graphics layer (engine/motion) over a plate shot, after grading: crisp graphics."""
    f = int(round(t * G["fps"]))
    d = build_dir(G["pid"], "motion", shot["id"])
    path = next((os.path.join(d, f"{x:05d}.png") for x in (f, f - 1, f + 1) if os.path.exists(os.path.join(d, f"{x:05d}.png"))), None)
    if path is None:
        raise FileNotFoundError(f"motion frame {f} of shot {shot['id']} is missing — run: python3 vg.py motion {G['pid']}")
    rgba = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if rgba.shape[2] < 4:
        return img
    over = cv2.cvtColor(rgba[..., :3], cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    return img * (1 - a) + over * a


# ----------------------------------------------------------------------------- transitions & post
def box_blur_dir(img, L, axis):
    L = int(L)
    return img if L < 3 else cv2.blur(img, (L, 1) if axis == 0 else (1, L))


def zoom_blur(img, s0, s1, n=7):
    W, H = G["W"], G["H"]
    acc = np.zeros_like(img)
    for i in range(n):
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, lerp(s0, s1, i / (n - 1)))
        acc += cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / n


def transition_at(t):
    """Active transition (shot, kind, p, dur, prev shot) at time t."""
    shots = G["shots"]
    for i, s in enumerate(shots):
        tr = s.get("transition") or {}
        kind = tr.get("type", "cut")
        if kind == "cut" or i == 0 and kind not in ("fade",):
            continue
        dur = tr.get("dur", 0.36)
        tb = s["start"]
        if kind in ("fade",):
            if tb <= t < tb + dur:
                return s, kind, (t - tb) / dur, dur, shots[i - 1] if i else None, tr
            continue
        if tb - dur / 2 <= t < tb + dur / 2:
            return s, kind, (t - (tb - dur / 2)) / dur, dur, shots[i - 1] if i else None, tr
    return None


def apply_transition(img, t, tr_info):
    if not tr_info:
        return img
    W, H = G["W"], G["H"]
    shot, kind, p, dur, prev, tr = tr_info
    if kind in ("whip_x", "whip_y"):
        amp = tr.get("amp", 1000 if kind == "whip_x" else 1500)
        sign = -1 if tr.get("dir", "forward") == "forward" else 1

        def off(pp):
            return sign * amp * ease_in(pp / 0.5) ** 1.5 if pp < 0.5 else -sign * amp * (1 - ease_out((pp - 0.5) / 0.5)) ** 1.5
        o = off(p)
        v = abs(o - off(max(0, p - 1 / (G["fps"] * dur))))
        M = np.float32([[1, 0, o if kind == "whip_x" else 0], [0, 1, o if kind == "whip_y" else 0]])
        img = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
        img = box_blur_dir(img, min(420, v * 0.9), 0 if kind == "whip_x" else 1)
        img = img + tr.get("flash", 0.35) * math.exp(-((p - 0.5) / 0.08) ** 2)
    elif kind == "zoom":
        if p < 0.5:
            s = 1 + 0.45 * ease_in(p / 0.5)
            img = zoom_blur(img, s, s * (1 + 0.12 * ease_in(p / 0.5)))
        else:
            k = 1 - ease_out((p - 0.5) / 0.5)
            img = zoom_blur(img, 1 + 0.25 * k, (1 + 0.25 * k) * (1 + 0.12 * k))
        img = img + tr.get("flash", 0.25) * math.exp(-((p - 0.5) / 0.1) ** 2)
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
        c = np.array(rgb01(tr.get("color", "black")), np.float32)
        a = tr.get("depth", 0.92) * math.sin(math.pi * p)
        img = img * (1 - a) + c * a
    elif kind == "flash":
        tb = shot["start"]
        if t < tb:
            img = img + tr.get("pre", 1.6) * ease_in(p / 0.5 * 2 - 1 if p > 0.25 else 0)
        else:
            k = (t - tb) / (dur / 2)
            img = img * (1 + 1.2 * (1 - k)) + tr.get("post", 0.9) * math.exp(-k * 4)
    elif kind == "fade":
        img = img * ease_out(p)
    elif kind == "dissolve" and prev is not None:
        other, _ = render_shot(prev if t >= shot["start"] else shot, t)
        a = ease_inout(p)
        img = (other * (1 - a) + img * a) if t >= shot["start"] else (img * (1 - a) + other * a)
    return img


def post(img, frame):
    pp = G["tl"]["post"]
    c = G["cache"]
    W, H = G["W"], G["H"]
    img = img * (1 - pp.get("vignette", 0.42) * c["r"] ** 2.4)[..., None]
    ca = pp.get("chromatic", 0.0016)
    if ca:
        r = cv2.warpAffine(img[..., 0], cv2.getRotationMatrix2D((W / 2, H / 2), 0, 1 + ca), (W, H), borderMode=cv2.BORDER_REFLECT)
        b = cv2.warpAffine(img[..., 2], cv2.getRotationMatrix2D((W / 2, H / 2), 0, 1 - ca), (W, H), borderMode=cv2.BORDER_REFLECT)
        img = np.dstack([r, img[..., 1], b])
    img = np.clip(img, 0, 1)
    gr = pp.get("grain", 0.022)
    if gr:
        lum = img.mean(-1, keepdims=True)
        img = img + c["grain"][frame % 10][..., None] * gr * (0.4 + 0.6 * np.sqrt(np.clip(lum, 0, 1)) * (1 - lum * 0.5))
    return np.clip(img, 0, 1)


def render_frame(args):
    pid, frame, out_dir = args
    _init(pid)
    t = frame / G["fps"]
    shot = shot_at(t)
    img, cam = render_shot(shot, t)
    img = apply_transition(img, t, transition_at(t))
    img = post(img, frame)
    cv2.imwrite(os.path.join(out_dir, f"{frame:05d}.jpg"), cv2.cvtColor((img * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR),
                [cv2.IMWRITE_JPEG_QUALITY, 95])
    return frame


def export_camera(pid):
    _init(pid)
    frames, depth_cache = [], {}
    for f in range(G["tl"]["frames"]):
        t = f / G["fps"]
        shot = shot_at(t)
        cam = camera_for(shot, t)
        anchors = {}
        if shot.get("draw") is not None:              # anchors of drawn shots come from the draw renderer
            m = draw_meta(shot)["frames"].get(str(f))
            frames.append({"shot": shot["id"], "shake": [round(cam.sx, 2), round(cam.sy, 2)], "anchors": m["anchors"] if m else {}})
            continue
        for name, a in (shot.get("anchors") or {}).items():
            if len(a) > 2:
                d = float(a[2])
            else:
                if shot["plate"] not in depth_cache:
                    dm = cv2.imread(os.path.join(G["prepped"], shot["plate"] + "_depth.png"), cv2.IMREAD_UNCHANGED)
                    depth_cache[shot["plate"]] = dm.astype(np.float32) / 65535.0 if dm is not None else None
                dm = depth_cache[shot["plate"]]
                d = float(dm[int(a[1]), int(a[0])]) if dm is not None else cam.d0
            sx, sy = cam.project(a[0], a[1], d)
            anchors[name] = [round(sx, 1), round(sy, 1)]
        frames.append({"shot": shot["id"], "shake": [round(cam.sx, 2), round(cam.sy, 2)], "anchors": anchors})
    save_json(os.path.join(build_dir(pid), "camera.json"), {"frames": frames})


def run(pid, frames=None, workers=4):
    _init(pid)
    out = build_dir(pid, "frames")
    export_camera(pid)
    frames = list(range(G["tl"]["frames"])) if frames is None else frames
    print(f"  rendering {len(frames)} frames with {workers} workers -> {out}", flush=True)
    with Pool(workers) as pool:
        for i, _ in enumerate(pool.imap_unordered(render_frame, [(pid, f, out) for f in frames], chunksize=4)):
            if i % 150 == 0:
                print(f"  {i}/{len(frames)}", flush=True)
    print(f"  {len(frames)}/{len(frames)} done", flush=True)
