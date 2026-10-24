"""Quality-control helpers: coordinate grids for plates, preview stills, contact sheets and loudness of the final video."""
import glob
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

from .common import ROOT, build_dir, load_project, load_timeline, project_dir

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def _font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def grid(pid):
    """Draw a 100-px coordinate grid (in plate coordinates) over every plate -> build/<id>/grid/*.jpg + grid_sheet.jpg."""
    p = load_project(pid)
    pw = int(round(p["format"]["width"] * p["format"]["plate_scale"]))
    ph = int(round(p["format"]["height"] * p["format"]["plate_scale"] + 0.49))
    out = build_dir(pid, "grid")
    files = sorted(f for f in glob.glob(os.path.join(project_dir(pid), "plates", "*")) if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")))
    thumbs = []
    f = _font(28)
    for path in files:
        prepped = os.path.join(build_dir(pid, "prepped"), os.path.splitext(os.path.basename(path))[0] + ".png")
        src = prepped if os.path.exists(prepped) else path
        im = Image.open(src).convert("RGB")
        s = max(pw / im.width, ph / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)))
        im = im.crop(((im.width - pw) // 2, (im.height - ph) // 2, (im.width - pw) // 2 + pw, (im.height - ph) // 2 + ph))
        d = ImageDraw.Draw(im)
        for x in range(0, pw, 100):
            d.line([(x, 0), (x, ph)], fill=(255, 0, 255) if x % 500 == 0 else (255, 255, 0), width=2)
            d.text((x + 4, 4), str(x), fill=(255, 255, 0), font=f)
        for y in range(0, ph, 100):
            d.line([(0, y), (pw, y)], fill=(255, 0, 255) if y % 500 == 0 else (255, 255, 0), width=2)
            d.text((4, y + 4), str(y), fill=(255, 255, 0), font=f)
        name = os.path.splitext(os.path.basename(path))[0]
        small = im.resize((pw // 2, ph // 2))
        small.save(os.path.join(out, f"{name}.jpg"), quality=85)
        thumbs.append((name, small))
    if thumbs:
        cols = min(3, len(thumbs))
        rows = (len(thumbs) + cols - 1) // cols
        W = Image.new("RGB", (cols * (pw // 2), rows * (ph // 2)))
        for i, (_, t) in enumerate(thumbs):
            W.paste(t, ((i % cols) * (pw // 2), (i // cols) * (ph // 2)))
        W.save(os.path.join(out, "grid_sheet.jpg"), quality=80)
    print(f"  grids -> {out} (coordinates are plate pixels {pw}x{ph}; at zoom 1 the screen shows the central {p['format']['width']}x{p['format']['height']})")


def sheet(images, out, cols=5, w=432, labels=None):
    h = int(w * 16 / 9)
    rows = (len(images) + cols - 1) // cols
    W = Image.new("RGB", (cols * w, rows * h))
    d = ImageDraw.Draw(W)
    f = _font(22)
    for i, path in enumerate(images):
        W.paste(Image.open(path).convert("RGB").resize((w, h)), ((i % cols) * w, (i // cols) * h))
        if labels:
            d.text(((i % cols) * w + 8, (i // cols) * h + 6), labels[i], fill=(255, 255, 0), font=f)
    W.save(out, quality=86)
    return out


def preview_sheet(pid, frames):
    bd = build_dir(pid)
    imgs = [os.path.join(bd, "stills", f"hud_{f:05d}.png") for f in frames]
    tl = load_timeline(pid)
    labels = [f"{f / tl['fps']:.2f}s" for f in frames]
    out = os.path.join(build_dir(pid, "preview"), "preview.jpg")
    sheet([i for i in imgs if os.path.exists(i)], out, cols=min(5, len(imgs)), labels=labels)
    print(f"  preview sheet -> {out}")


def final(pid, video=None):
    """1 fps contact sheets + loudness of the final video."""
    video = video or os.path.join(ROOT, "out", f"{pid}.mp4")
    out = build_dir(pid, "qa")
    for f in glob.glob(os.path.join(out, "*")):
        os.remove(f)
    subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", "fps=1,scale=270:480", os.path.join(out, "f%03d.png")], check=True)
    frames = sorted(glob.glob(os.path.join(out, "f*.png")))
    sheets = []
    for i in range(0, len(frames), 21):
        chunk = frames[i:i + 21]
        sheets.append(sheet(chunk, os.path.join(out, f"sheet{i // 21}.jpg"), cols=7, w=270, labels=[f"{i + k}s" for k in range(len(chunk))]))
    for f in frames:
        os.remove(f)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = [line.strip() for line in r.splitlines()[-12:] if line.strip().startswith(("I:", "Peak:", "LRA:"))]
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size,bit_rate", "-of", "default=nw=1", video], capture_output=True, text=True).stdout
    print("  " + " | ".join(summary))
    print("  " + probe.replace("\n", "  "))
    print(f"  contact sheets: {', '.join(sheets)}")
