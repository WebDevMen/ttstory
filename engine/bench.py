"""Actor test bench: visual regression of the draw actor library.

`vg.py bench` draws the middle frame of every shot of projects/gallery (the catalog of all library actors) and compares it
with the reference images in tests/bench/<shot>.jpg. A shot whose picture changed is reported with the share of changed
pixels and a side-by-side image (reference | now | difference) in build/bench/. After an intended change (a new actor,
a deliberate redesign) accept the new pictures with `vg.py bench --update`.

Any change of the engine or an actor that unexpectedly moves, resizes or breaks something shows up here at once.
"""
import io
import os
import shutil

from .common import ROOT, build_dir, load_timeline

REF_DIR = os.path.join(ROOT, "tests", "bench")
SIZE = (540, 960)                 # references are stored at half size (small repo, still shows a 2 px drift)
PIX_THR = 40                      # a pixel counts as changed above this difference (0..255, max over RGB)
SHARE_THR = 0.004                 # a shot fails when more than 0.4% of its pixels changed


def frames(pid="gallery"):
    tl = load_timeline(pid)
    return {s["id"]: int(round((s["start"] + s["end"]) / 2 * tl["fps"])) for s in tl["shots"] if s.get("draw") is not None}


def compare(pid="gallery", update=False):
    """Returns the number of changed shots (0 = all match the references)."""
    import numpy as np
    from PIL import Image
    out = build_dir("bench")
    os.makedirs(REF_DIR, exist_ok=True)
    changed, new = [], []
    for sid, f in frames(pid).items():
        cur_path = os.path.join(build_dir(pid), "drawn", sid, f"{f:05d}.jpg")
        cur = Image.open(cur_path).convert("RGB").resize(SIZE, Image.LANCZOS)
        ref_path = os.path.join(REF_DIR, f"{sid}.jpg")
        if update or not os.path.exists(ref_path):
            if not os.path.exists(ref_path):
                new.append(sid)
            cur.save(ref_path, quality=88)
            continue
        ref = Image.open(ref_path).convert("RGB")
        buf = io.BytesIO()                        # same JPEG round trip as the reference, so compression is not a "change"
        cur.save(buf, "JPEG", quality=88)
        cur = Image.open(io.BytesIO(buf.getvalue())).convert("RGB")
        a, b = np.asarray(ref, dtype=np.int16), np.asarray(cur, dtype=np.int16)
        diff = np.abs(a - b).max(axis=2)
        share = float((diff > PIX_THR).mean())
        if share > SHARE_THR:
            changed.append((sid, share))
            heat = np.zeros_like(a, dtype=np.uint8)
            heat[..., 0] = np.clip(diff * 3, 0, 255)
            trip = Image.new("RGB", (SIZE[0] * 3, SIZE[1]))
            trip.paste(ref, (0, 0)); trip.paste(cur, (SIZE[0], 0)); trip.paste(Image.fromarray(heat), (SIZE[0] * 2, 0))
            trip.save(os.path.join(out, f"{sid}.jpg"), quality=85)
    n = len(frames(pid))
    if update:
        print(f"  эталоны обновлены: {n} шотов → {os.path.relpath(REF_DIR, ROOT)}")
        return 0
    for sid in new:
        print(f"  + новый эталон: {sid}")
    for sid, share in changed:
        print(f"  ✗ {sid}: изменилось {share * 100:.1f}% пикселей → build/bench/{sid}.jpg (эталон | сейчас | разница)")
    if not changed:
        print(f"  ✓ все {n} шотов совпадают с эталонами")
    else:
        print(f"\n  изменений: {len(changed)} из {n}. Если это задумано — vg.py bench --update")
    return len(changed)


def clean():
    shutil.rmtree(build_dir("bench"), ignore_errors=True)
