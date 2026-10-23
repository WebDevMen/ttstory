"""Upscale AI keyframe plates (Real-ESRGAN x4, ONNX) and estimate depth (Depth Anything V2).

Usage: python prep_plates.py <models_dir> <plates_dir> <out_dir>
Produces <out_dir>/<name>.png (plate at PLATE_W x PLATE_H) and <name>_depth.png (16-bit disparity, 1 = near).
"""
import sys
import os
import glob
import time

import cv2
import numpy as np
import onnxruntime as ort

PLATE_W, PLATE_H = 1296, 2322  # 1.2x overscan over 1080x1920

models_dir, plates_dir, out_dir = sys.argv[1:4]
os.makedirs(out_dir, exist_ok=True)

so = ort.SessionOptions()
so.intra_op_num_threads = 4
esr = ort.InferenceSession(os.path.join(models_dir, "esrgan_x4.onnx"), so)
dep = ort.InferenceSession(os.path.join(models_dir, "depth.onnx"), so)


def esrgan_x4(img):
    """img: HxWx3 float32 RGB 0..1 -> 4H x 4W x 3."""
    T, PAD = 64, 8
    core = T - 2 * PAD
    h, w = img.shape[:2]
    ny, nx = -(-h // core), -(-w // core)
    padded = cv2.copyMakeBorder(img, PAD, ny * core - h + PAD, PAD, nx * core - w + PAD, cv2.BORDER_REFLECT)
    out = np.zeros((ny * core * 4, nx * core * 4, 3), np.float32)
    for ty in range(ny):
        for tx in range(nx):
            tile = padded[ty * core: ty * core + T, tx * core: tx * core + T]
            x = tile.transpose(2, 0, 1)[None].astype(np.float32)
            y = esr.run(None, {"input.1": x})[0][0].transpose(1, 2, 0)
            out[ty * core * 4:(ty + 1) * core * 4, tx * core * 4:(tx + 1) * core * 4] = \
                y[PAD * 4: PAD * 4 + core * 4, PAD * 4: PAD * 4 + core * 4]
    return np.clip(out[: h * 4, : w * 4], 0, 1)


def depth(img):
    """img: HxWx3 float RGB 0..1 -> disparity normalized 0..1 at input res."""
    h, w = img.shape[:2]
    iw = 588
    ih = int(round(h / w * iw / 14)) * 14
    x = cv2.resize(img, (iw, ih), interpolation=cv2.INTER_CUBIC)
    x = (x - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    d = dep.run(None, {"pixel_values": x})[0][0]
    lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.5)
    d = np.clip((d - lo) / (hi - lo), 0, 1).astype(np.float32)
    return d


for path in sorted(glob.glob(os.path.join(plates_dir, "p*.png"))):
    name = os.path.splitext(os.path.basename(path))[0]
    if os.path.exists(os.path.join(out_dir, name + "_depth.png")):
        continue
    t0 = time.time()
    src = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    up = esrgan_x4(src)
    # Fit to plate aspect (cover) then area-downscale for crisp detail
    h, w = up.shape[:2]
    s = max(PLATE_W / w, PLATE_H / h)
    nw, nh = int(round(w * s)), int(round(h * s))
    up = cv2.resize(up, (nw, nh), interpolation=cv2.INTER_AREA)
    # Keep some of the original texture: blend with a lanczos upscale of the source
    lz = cv2.resize(src, (nw, nh), interpolation=cv2.INTER_LANCZOS4)
    up = 0.75 * up + 0.25 * np.clip(lz, 0, 1)
    ox, oy = (nw - PLATE_W) // 2, (nh - PLATE_H) // 2
    plate = up[oy: oy + PLATE_H, ox: ox + PLATE_W]
    cv2.imwrite(os.path.join(out_dir, name + ".png"),
                cv2.cvtColor((plate * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR))

    d = depth(src)
    d = cv2.resize(d, (nw, nh), interpolation=cv2.INTER_CUBIC)[oy: oy + PLATE_H, ox: ox + PLATE_W]
    guide = cv2.cvtColor(plate.astype(np.float32), cv2.COLOR_RGB2GRAY)
    try:
        d = cv2.ximgproc.guidedFilter(guide, d, 8, 1e-3)
    except AttributeError:
        d = cv2.bilateralFilter(d, 9, 0.1, 6)
    d = np.clip(d, 0, 1)
    cv2.imwrite(os.path.join(out_dir, name + "_depth.png"), (d * 65535).astype(np.uint16))
    print(f"{name}: {time.time() - t0:.1f}s", flush=True)
