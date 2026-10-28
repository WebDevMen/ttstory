"""3D assets for `world3d` (docs/DRAW3D.md §6): free CC0 models, PBR textures and HDRI skies, downloaded once into a
shared cache `assets3d/` (git-ignored) and served to the draw runtime as /assets3d/...

project.yaml:
    assets3d:
      res: 1k                                   # texture resolution of models/textures (1k | 2k | 4k)
      models: [covered_car, old_tyre]           # Poly Haven models  -> assets3d/polyhaven/models/<id>/<id>_<res>.gltf
      textures: [road_damaged]                  # Poly Haven PBR sets -> assets3d/polyhaven/textures/<id>/<id>_{diff,nor_gl,arm}_<res>.jpg
      hdri: [industrial_sunset_02_puresky]      # Poly Haven HDRIs   -> .../hdri/<id>/<id>_2k.hdr (light) + <id>.jpg (backdrop)
      kenney: [survival-kit]                    # Kenney packs (kenney.nl/assets/<name>) -> assets3d/kenney/<name>/
      files: {other/barrel.glb: https://...}   # any other CC0 file (Kenney, Quaternius, AI-made models): path -> url

In world3d an asset is referenced as "ph:<id>" (Poly Haven, the type is looked up in assets3d/index.json) or by its path
under assets3d/ ("kenney/barrel.glb"). Index: assets3d/index.json {id: {type, res, files}}.
"""
import json
import os
import ssl
import urllib.request
import zipfile

from .common import ROOT, load_project

DIR = os.path.join(ROOT, "assets3d")
API = "https://api.polyhaven.com"


def _ctx():
    ca = "/root/.ccr/ca-bundle.crt"
    return ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ttstory-assets3d/1.0"})
    with urllib.request.urlopen(req, context=_ctx(), timeout=120) as r:
        return r.read()


def _save(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = _get(url)
    with open(path + ".part", "wb") as f:
        f.write(data)
    os.replace(path + ".part", path)
    return True


def _index():
    p = os.path.join(DIR, "index.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}


def _pick(levels, res):
    order = [res, "1k", "2k", "4k"]
    return next(levels[r] for r in order if r in levels)


def model(aid, res, idx):
    files = json.loads(_get(f"{API}/files/{aid}"))
    g = _pick(files["gltf"], res)["gltf"]
    d = os.path.join(DIR, "polyhaven", "models", aid)
    main = os.path.join(d, os.path.basename(g["url"]))
    n = int(_save(g["url"], main))
    for rel, inc in g.get("include", {}).items():
        n += _save(inc["url"], os.path.join(d, rel))
    idx[aid] = {"type": "model", "src": os.path.relpath(main, DIR), "res": res}
    return n


def texture(aid, res, idx):
    files = json.loads(_get(f"{API}/files/{aid}"))
    d = os.path.join(DIR, "polyhaven", "textures", aid)
    out, n = {}, 0
    for key, name in (("Diffuse", "diff"), ("nor_gl", "nor"), ("arm", "arm")):
        if key not in files:
            continue
        f = _pick(files[key], res)["jpg"]
        p = os.path.join(d, f"{aid}_{name}.jpg")
        n += _save(f["url"], p)
        out[name] = os.path.relpath(p, DIR)
    idx[aid] = {"type": "texture", "maps": out, "res": res}
    return n


def hdri(aid, res, idx):
    files = json.loads(_get(f"{API}/files/{aid}"))
    d = os.path.join(DIR, "polyhaven", "hdri", aid)
    h = _pick(files["hdri"], "2k")["hdr"]
    n = _save(h["url"], os.path.join(d, f"{aid}_2k.hdr"))
    out = {"hdr": os.path.relpath(os.path.join(d, f"{aid}_2k.hdr"), DIR)}
    if files.get("tonemapped"):
        n += _save(files["tonemapped"]["url"], os.path.join(d, f"{aid}.jpg"))
        out["jpg"] = os.path.relpath(os.path.join(d, f"{aid}.jpg"), DIR)
    idx[aid] = {"type": "hdri", **out}
    return n


def kenney(name, idx):
    """A Kenney pack: the site hands out the zip link to a visitor of the asset page (cookie + referer)."""
    import http.cookiejar
    import re
    d = os.path.join(DIR, "kenney", name)
    if not os.path.isdir(d):
        jar = http.cookiejar.CookieJar()
        op = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ctx()), urllib.request.HTTPCookieProcessor(jar))
        op.addheaders = [("User-Agent", "Mozilla/5.0 ttstory-assets3d")]
        page = f"https://kenney.nl/assets/{name}"
        html = op.open(page, timeout=60).read().decode("utf-8", "replace")
        m = re.search(r"download-id='([0-9a-f]+)'", html)
        if not m:
            raise RuntimeError(f"no download on {page}")
        req = urllib.request.Request(f"https://kenney.nl/download-link/{m.group(1)}", headers={"Referer": page})
        url = json.loads(op.open(req, timeout=60).read())["url"]
        z = d + ".zip"
        os.makedirs(os.path.dirname(z), exist_ok=True)
        with open(z, "wb") as f:
            f.write(op.open(url, timeout=300).read())
        zipfile.ZipFile(z).extractall(d)
        os.remove(z)
        n = 1
    else:
        n = 0
    idx[f"kenney:{name}"] = {"type": "pack", "dir": os.path.relpath(d, DIR)}
    return n


def run(pid):
    spec = load_project(pid).get("assets3d") or {}
    res = spec.get("res", "1k")
    idx = _index()
    total = 0
    for kind, fn in (("models", model), ("textures", texture), ("hdri", hdri)):
        for aid in spec.get(kind) or []:
            try:
                n = fn(aid, res, idx)
                total += n
                print(f"  {kind[:-1] if kind != 'hdri' else 'hdri'} {aid}: {'+' + str(n) + ' files' if n else 'cached'}")
            except Exception as e:                                   # noqa: BLE001 — report and continue
                print(f"  ! {aid}: {e}")
    for name in spec.get("kenney") or []:
        try:
            n = kenney(name, idx)
            total += n
            print(f"  kenney {name}: {'downloaded' if n else 'cached'}")
        except Exception as e:                                       # noqa: BLE001
            print(f"  ! kenney {name}: {e}")
    for rel, url in (spec.get("files") or {}).items():
        p = os.path.join(DIR, rel)
        n = _save(url, p)
        if p.endswith(".zip") and n:
            zipfile.ZipFile(p).extractall(os.path.splitext(p)[0])
        print(f"  file {rel}: {'downloaded' if n else 'cached'}")
        total += n
    os.makedirs(DIR, exist_ok=True)
    json.dump(idx, open(os.path.join(DIR, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  {total} new files -> {DIR}")
