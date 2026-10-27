"""Storyboard review page: three finished frames per shot (start, middle, end) with the voice text, timing and the
graphics audit notes — one self-contained HTML page to approve the look before the full render.

`vg.py storyboard <id>` → build/<id>/storyboard/storyboard.html (images embedded). Claude publishes it as an Artifact
so the user can comment on any shot; the full render starts after the storyboard is approved.
"""
import base64
import html
import io
import json
import os

from .common import build_dir, load_project, load_timeline


def frames(pid):
    """{shot id: [start, middle, end] frame numbers} (0.25 s inside the shot edges)."""
    tl = load_timeline(pid)
    out = {}
    for s in tl["shots"]:
        a, b = s["start"], s["end"]
        pad = min(0.25, (b - a) / 4)
        out[s["id"]] = [min(tl["frames"] - 1, int(round(t * tl["fps"]))) for t in (a + pad, (a + b) / 2, b - pad)]
    return out


def _img(path, w=300):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im = im.resize((w, int(w * im.height / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _audit(pid):
    """Notes of the last `vg.py layout` run per shot (if any)."""
    f = os.path.join(build_dir(pid), "layout", "report.json")
    if not os.path.exists(f):
        return {}
    notes = {}
    for g in json.load(open(f, encoding="utf-8")):
        notes.setdefault(g["shot"], []).append(g)
    return notes


def build(pid):
    p, tl = load_project(pid), load_timeline(pid)
    fr = frames(pid)
    stills = os.path.join(build_dir(pid), "stills")
    notes = _audit(pid)
    scenes = {s["id"]: s for s in p["scenes"]}
    rows = []
    for sc in tl["scenes"]:
        text = html.escape(scenes[sc["id"]].get("text", ""))
        rows.append(f'<section><h2><span class="t">{sc["start"]:.1f}–{sc["end"]:.1f} с</span> {html.escape(sc["id"])}</h2><p class="vo">{text}</p>')
        for s in [x for x in tl["shots"] if x["scene"] == sc["id"]]:
            imgs = "".join(f'<figure><img src="{_img(os.path.join(stills, f"hud_{f:05d}.png"))}" alt=""><figcaption>{f / tl["fps"]:.2f} с</figcaption></figure>'
                           for f in fr[s["id"]] if os.path.exists(os.path.join(stills, f"hud_{f:05d}.png")))
            nl = notes.get(s["id"], [])
            audit = "".join(f'<li class="{g["level"]}">{html.escape(g["msg"])}</li>' for g in nl)
            badge = f'<span class="ok">вёрстка чистая</span>' if not nl else f'<span class="bad">замечаний: {len(nl)}</span>'
            rows.append(f'<div class="shot"><div class="head"><b>{html.escape(s["id"])}</b> · {s["start"]:.2f}–{s["end"]:.2f} с · '
                        f'{html.escape((s.get("transition") or {}).get("type", "cut"))} {badge}</div><div class="frames">{imgs}</div>'
                        f'{"<ul>" + audit + "</ul>" if audit else ""}</div>')
        rows.append("</section>")
    page = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(p.get("title", pid))} — раскадровка</title>
<style>
:root{{--bg:#0e1117;--card:#171b24;--ink:#e8ebf2;--mute:#9aa3b5;--ok:#3cff8a;--bad:#ffb84d;--err:#ff5a6e}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#f4f5f8;--card:#fff;--ink:#141821;--mute:#5a6273}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}}
main{{max-width:1080px;margin:0 auto;padding:24px 16px 64px}}
h1{{font-size:24px;margin:0 0 4px}} .sub{{color:var(--mute);margin:0 0 24px}}
section{{margin:0 0 28px}} h2{{font-size:18px;margin:0 0 4px}} .t{{color:var(--mute);font-weight:500;margin-right:6px}}
.vo{{margin:0 0 12px;color:var(--mute);font-style:italic}}
.shot{{background:var(--card);border-radius:12px;padding:12px;margin:0 0 12px}}
.head{{margin:0 0 10px}} .ok{{color:var(--ok);margin-left:8px}} .bad{{color:var(--bad);margin-left:8px}}
.frames{{display:flex;gap:10px;overflow-x:auto}} figure{{margin:0;flex:0 0 auto}}
img{{width:200px;border-radius:8px;display:block}} figcaption{{color:var(--mute);font-size:12px;text-align:center;margin-top:4px}}
ul{{margin:10px 0 0;padding-left:18px}} li.warn{{color:var(--bad)}} li.err{{color:var(--err)}}
</style></head><body><main>
<h1>{html.escape(p.get("title", pid))}</h1>
<p class="sub">Раскадровка: начало, середина и конец каждого шота · {tl["duration"]:.1f} с · замечания — из проверки vg.py layout</p>
{"".join(rows)}
</main></body></html>"""
    out = os.path.join(build_dir(pid, "storyboard"), "storyboard.html")
    open(out, "w", encoding="utf-8").write(page)
    return out
