"""Plate preparation: Real-ESRGAN x4 upscale (ONNX) + Depth Anything V2 disparity map.

Input:  projects/<id>/plates/*.png|jpg|webp  (any size, ideally 9:16)
Output: build/<id>/prepped/<name>.png (plate_w x plate_h, cover-fit) and <name>_depth.png (16-bit, 1 = near)
Already prepared plates are skipped. Plates are processed in parallel worker processes.
"""
import glob
import os
import time
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

from .common import MODELS_DIR, build_dir, load_project, project_dir

EXTS = (".png", ".jpg", ".jpeg", ".webp")


def _work(args):
    path, out_dir, pw, ph, threads, fast = args
    import onnxruntime as ort
    so = ort.SessionOptions()
    so.intra_op_num_threads = threads
    so.inter_op_num_threads = 1
    name = os.path.splitext(os.path.basename(path))[0]
    t0 = time.time()
    src = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    if fast:
        up = cv2.resize(src, None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4)
    else:
        esr = ort.InferenceSession(os.path.join(MODELS_DIR, "esrgan_x4.onnx"), so)
        T, PAD = 64, 8
        core = T - 2 * PAD
        h, w = src.shape[:2]
        ny, nx = -(-h // core), -(-w // core)
        padded = cv2.copyMakeBorder(src, PAD, ny * core - h + PAD, PAD, nx * core - w + PAD, cv2.BORDER_REFLECT)
        up = np.zeros((ny * core * 4, nx * core * 4, 3), np.float32)
        for ty in range(ny):
            for tx in range(nx):
                tile = padded[ty * core: ty * core + T, tx * core: tx * core + T].transpose(2, 0, 1)[None]
                y = esr.run(None, {esr.get_inputs()[0].name: tile.astype(np.float32)})[0][0].transpose(1, 2, 0)
                up[ty * core * 4:(ty + 1) * core * 4, tx * core * 4:(tx + 1) * core * 4] = y[PAD * 4:PAD * 4 + core * 4, PAD * 4:PAD * 4 + core * 4]
        up = np.clip(up[: h * 4, : w * 4], 0, 1)

    h, w = up.shape[:2]
    s = max(pw / w, ph / h)
    nw, nh = int(round(w * s)), int(round(h * s))
    up = cv2.resize(up, (nw, nh), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    lz = cv2.resize(src, (nw, nh), interpolation=cv2.INTER_LANCZOS4)
    up = 0.75 * up + 0.25 * np.clip(lz, 0, 1)     # keep a bit of the original texture
    ox, oy = (nw - pw) // 2, (nh - ph) // 2
    plate = up[oy:oy + ph, ox:ox + pw]
    cv2.imwrite(os.path.join(out_dir, name + ".png"), cv2.cvtColor((np.clip(plate, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR))

    dep = ort.InferenceSession(os.path.join(MODELS_DIR, "depth.onnx"), so)
    sh, sw = src.shape[:2]
    iw = 588
    ih = int(round(sh / sw * iw / 14)) * 14
    x = cv2.resize(src, (iw, ih), interpolation=cv2.INTER_CUBIC)
    x = ((x - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])).transpose(2, 0, 1)[None].astype(np.float32)
    d = dep.run(None, {dep.get_inputs()[0].name: x})[0][0]
    lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.5)
    d = np.clip((d - lo) / (hi - lo + 1e-6), 0, 1).astype(np.float32)
    d = cv2.resize(d, (nw, nh), interpolation=cv2.INTER_CUBIC)[oy:oy + ph, ox:ox + pw]
    guide = cv2.cvtColor(plate.astype(np.float32), cv2.COLOR_RGB2GRAY)
    try:
        d = cv2.ximgproc.guidedFilter(guide, d, 8, 1e-3)
    except AttributeError:
        d = cv2.bilateralFilter(d, 9, 0.1, 6)
    cv2.imwrite(os.path.join(out_dir, name + "_depth.png"), (np.clip(d, 0, 1) * 65535).astype(np.uint16))
    return name, time.time() - t0


def run(pid, jobs=4, fast=False, force=False):
    p = load_project(pid)
    pw = int(round(p["format"]["width"] * p["format"]["plate_scale"]))
    ph = int(round(p["format"]["height"] * p["format"]["plate_scale"] + 0.49))
    out = build_dir(pid, "prepped")
    plates = sorted(f for f in glob.glob(os.path.join(project_dir(pid), "plates", "*")) if f.lower().endswith(EXTS))
    todo = [f for f in plates if force or not os.path.exists(os.path.join(out, os.path.splitext(os.path.basename(f))[0] + "_depth.png"))]
    print(f"  {len(plates)} plates, {len(todo)} to prepare -> {out}")
    if not todo:
        return
    for m in ("esrgan_x4.onnx", "depth.onnx"):
        if not os.path.exists(os.path.join(MODELS_DIR, m)):
            raise FileNotFoundError(f"model {m} missing in {MODELS_DIR} — run ./setup.sh")
    jobs = max(1, min(jobs, len(todo)))
    threads = max(1, (os.cpu_count() or 4) // jobs)
    with ProcessPoolExecutor(jobs) as ex:
        for name, dt in ex.map(_work, [(f, out, pw, ph, threads, fast) for f in todo]):
            print(f"  {name}: {dt:.0f}s", flush=True)
