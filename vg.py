#!/usr/bin/env python3
"""vg — vertical video generator. One command per production stage, everything configured in projects/<id>/project.yaml.

  python3 vg.py doctor                    check the environment (ffmpeg, node, playwright, models, python packages)
  python3 vg.py new <id> [--from tanker]  create projects/<id>/ from the template (or copy another project)
  python3 vg.py voice <id> [--force]      synthesize the voiceover (cached per scene)
  python3 vg.py compile <id>              build the timeline: scene/shot timings, cues, captions, HUD, audio events
  python3 vg.py prep <id> [--jobs 4]      upscale plates + depth maps (skips already prepared plates)
  python3 vg.py grid <id>                 coordinate grids over the plates (to place anchors, glows, masks, HUD)
  python3 vg.py preview <id> [--at 5,12.5 | --shots]   render a few finished frames (scene + HUD) -> build/<id>/preview/
  python3 vg.py draw <id> [--frames a:b] [--force]      render code-drawn shots (draw:) -> build/<id>/drawn/ (scene runs it too)
  python3 vg.py motion <id> [--frames a:b] [--force]    render motion-graphics shots (motion:, Remotion) (scene runs it too)
  python3 vg.py actors [id]               list the draw actors (built-in + the project's own)
  python3 vg.py scene <id> [--frames a:b] render the scene layer (all frames by default)
  python3 vg.py audio <id> [--stems]      sound design + music + mix
  python3 vg.py hud <id> [--workers 3]    composite HUD + captions over the scene frames
  python3 vg.py mux <id>                  final mp4 -> out/<id>.mp4 (loudness -14 LUFS)
  python3 vg.py layout <id> [--step 12]   graphics audit of draw shots: layout, proportions, floor, poses, contrast,
                                          motion (jumps, jitter, flicker); picks caption bands for captions_top: auto
  python3 vg.py storyboard <id>           review page: start/middle/end frame of every shot + audit notes (HTML)
  python3 vg.py bench [--update]          actor test bench: gallery shots vs reference images (tests/bench/)
  python3 vg.py qa <id>                   contact sheets (1 frame per second) + loudness report
  python3 vg.py all <id>                  voice → compile → prep → draw → scene → audio → hud → mux → qa

Scripts (before production, docs/SCRIPTING.md):
  python3 vg.py script formats [name]     formats, hook types, retention devices, roles, sounds
  python3 vg.py script new <id> --topic "…" [--format what_if] [--duration 60]   script.yaml skeleton
  python3 vg.py script check <id> [--tts] timeline, findings, readiness score
  python3 vg.py script render <id>        full script document → projects/<id>/script.md
  python3 vg.py script project <id>       draft project.yaml from the script (handoff to production)
"""
import argparse
import functools
import http.server
import os
import shutil
import socket
import subprocess
import sys
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)


def step(name):
    print(f"\n▶ {name}", flush=True)


def serve():
    """Serve the repository root over http on a free port (the HUD page loads build/ and projects/ files)."""
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port


def node_env(port):
    env = dict(os.environ, PORT=str(port))
    try:
        root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
        env["NODE_PATH"] = os.pathsep.join(filter(None, [os.path.join(ROOT, "node_modules"), root, env.get("NODE_PATH", "")]))
    except FileNotFoundError:
        pass
    return env


def run_node(args):
    httpd, port = serve()
    try:
        subprocess.run(["node", os.path.join(ROOT, "engine", "render_hud.cjs")] + args, check=True, env=node_env(port))
    finally:
        httpd.shutdown()


def cmd_doctor(a):
    ok = True
    for tool in ("ffmpeg", "ffprobe", "node"):
        found = shutil.which(tool)
        print(f"  {'✓' if found else '✗'} {tool} {found or 'NOT FOUND'}")
        ok &= bool(found)
    for mod in ("numpy", "scipy", "cv2", "PIL", "yaml", "soundfile", "onnxruntime", "edge_tts"):
        try:
            __import__(mod)
            print(f"  ✓ python: {mod}")
        except ImportError:
            print(f"  ✗ python: {mod} — pip install -r requirements.txt")
            ok = False
    from engine.common import MODELS_DIR
    for m in ("esrgan_x4.onnx", "depth.onnx"):
        f = os.path.join(MODELS_DIR, m)
        print(f"  {'✓' if os.path.exists(f) else '✗'} model {f}")
        ok &= os.path.exists(f)
    r = subprocess.run(["node", "-e", "require('playwright'); console.log('ok')"], capture_output=True, text=True, env=node_env(0))
    print(f"  {'✓' if r.returncode == 0 else '✗'} node playwright {'' if r.returncode == 0 else '— npm i -g playwright && npx playwright install chromium'}")
    ok &= r.returncode == 0
    print("\n  environment OK" if ok else "\n  fix the ✗ items (./setup.sh does all of it)")


def cmd_new(a):
    src = os.path.join(ROOT, "projects", a.src)
    dst = os.path.join(ROOT, "projects", a.id)
    if os.path.exists(dst):
        sys.exit(f"projects/{a.id} already exists")
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("plates") if a.src != "_template" else None)
    os.makedirs(os.path.join(dst, "plates"), exist_ok=True)
    print(f"  created projects/{a.id}/ — edit project.yaml, put plates into projects/{a.id}/plates/")


def cmd_voice(a):
    from engine import tts
    step("voice")
    tts.run(a.id, force=a.force)


def cmd_compile(a):
    from engine import compile as comp
    step("compile")
    comp.run(a.id)


def cmd_prep(a):
    from engine import prep
    step("prep plates (upscale + depth)")
    prep.run(a.id, jobs=a.jobs, fast=a.fast)


def cmd_grid(a):
    from engine import qa
    step("grid")
    qa.grid(a.id)


def parse_frames(spec, total):
    if not spec:
        return None
    if ":" in spec:
        s, e = spec.split(":")
        return list(range(int(s or 0), min(total, int(e or total))))
    return [int(x) for x in spec.split(",")]


def has_draw(tl):
    return any(s.get("draw") is not None and s["draw"].get("engine") != "motion" for s in tl["shots"])


def has_motion(tl):
    return any(s.get("motion") is not None for s in tl["shots"])


def run_motion(pid, frames=None, workers=4, force=False):
    """Render motion-graphics shots (engine/motion, Remotion): all of them, or only the given frames."""
    mdir = os.path.join(ROOT, "engine", "motion")
    if not os.path.isdir(os.path.join(mdir, "node_modules")):
        sys.exit("engine/motion/node_modules is missing — run ./setup.sh (npm install in engine/motion)")
    args = ["node", os.path.join(mdir, "render.mjs"), pid, str(workers)] + ([str(f) for f in frames] if frames is not None else []) + (["--force"] if force else [])
    subprocess.run(args, check=True, cwd=mdir)


def run_graphics(pid, tl, frames=None, workers=3):
    if has_draw(tl):
        step("draw shots")
        run_draw(pid, frames, workers=workers)
    if has_motion(tl):
        step("motion shots")
        run_motion(pid, frames, workers=max(2, workers))


def run_draw(pid, frames=None, workers=3, force=False):
    """Render code-drawn shots (all of them, or only what the given frames need)."""
    args = ["draw", pid, str(workers)] + ([str(f) for f in frames] if frames is not None else []) + (["--force"] if force else [])
    run_node(args)


def cmd_draw(a):
    from engine.common import load_timeline
    step("draw shots")
    tl = load_timeline(a.id)
    run_draw(a.id, parse_frames(a.frames, tl["frames"]), workers=a.workers, force=a.force)


def cmd_motion(a):
    from engine.common import load_timeline
    step("motion shots")
    tl = load_timeline(a.id)
    run_motion(a.id, parse_frames(a.frames, tl["frames"]), workers=a.workers, force=a.force)


def cmd_actors(a):
    import glob
    import re
    from engine.common import project_actor_files
    files = sorted(glob.glob(os.path.join(ROOT, "engine", "hud", "draw", "actors", "*.js"))) + (project_actor_files(a.id) if a.id else [])
    for f in files:
        if os.path.basename(f) == "index.js":
            continue
        names = re.findall(r"^export const (\w+)", open(f, encoding="utf-8").read(), re.M)
        print(f"  {os.path.relpath(f, ROOT)}: {', '.join(names)}")


def cmd_scene(a):
    from engine import scene
    from engine.common import load_timeline
    tl = load_timeline(a.id)
    frames = parse_frames(a.frames, tl["frames"])
    run_graphics(a.id, tl, frames, workers=min(3, a.workers))
    step("scene layer")
    scene.run(a.id, frames, workers=a.workers)


def cmd_audio(a):
    from engine import audio
    step("audio")
    audio.run(a.id, stems=a.stems)


def cmd_hud(a):
    step("HUD + captions composite")
    run_node(["video", a.id, str(a.workers)])


def cmd_mux(a):
    from engine import mux
    step("final encode")
    mux.run(a.id, maxrate=a.maxrate)


def cmd_qa(a):
    from engine import qa
    step("quality check")
    qa.final(a.id)


def cmd_preview(a):
    from engine import qa, scene
    from engine.common import load_timeline
    tl = load_timeline(a.id)
    if a.shots or not a.at:
        times = [(s["start"] + s["end"]) / 2 for s in tl["shots"]]
    else:
        times = [float(x) for x in a.at.split(",")]
    frames = [min(tl["frames"] - 1, int(round(t * tl["fps"]))) for t in times]
    step(f"preview {len(frames)} frames: " + ", ".join(f"{t:.2f}s" for t in times))
    run_graphics(a.id, tl, frames, workers=min(3, len(frames)))
    scene.run(a.id, frames, workers=min(4, len(frames)))
    run_node(["stills", a.id] + [str(f) for f in frames])
    qa.preview_sheet(a.id, frames)


def cmd_layout(a):
    from engine import layout
    from engine.common import load_timeline
    if not has_draw(load_timeline(a.id)):
        print("  no draw shots")
        return
    step("layout audit")
    run_node(["layout", a.id, str(a.step), str(a.mstep)])
    errs, warns, caps = layout.run(a.id, a.step)
    if caps:                                   # captions_top: auto picked new bands: recompile and check again
        step("layout audit (captions moved)")
        cmd_compile(a)
        run_node(["layout", a.id, str(a.step), str(a.mstep)])
        errs, warns, _ = layout.run(a.id, a.step)
    if errs or warns > 3:
        sys.exit(1)


def cmd_bench(a):
    from engine import bench
    step("actor test bench (projects/gallery)")
    bench.clean()
    run_draw("gallery", list(bench.frames("gallery").values()), workers=3)
    if bench.compare("gallery", update=a.update):
        sys.exit(1)


def cmd_storyboard(a):
    from engine import scene, storyboard
    from engine.common import load_timeline
    tl = load_timeline(a.id)
    frames = sorted({f for fs in storyboard.frames(a.id).values() for f in fs})
    step(f"storyboard: {len(frames)} frames (start, middle, end of every shot)")
    run_graphics(a.id, tl, frames, workers=3)
    scene.run(a.id, frames, workers=4)
    run_node(["stills", a.id] + [str(f) for f in frames])
    print(f"  page -> {storyboard.build(a.id)}")


def cmd_all(a):
    t0 = time.time()
    cmd_voice(a)
    cmd_compile(a)
    cmd_prep(a)
    cmd_scene(a)
    cmd_audio(a)
    cmd_hud(a)
    cmd_mux(a)
    cmd_qa(a)
    print(f"\n✔ done in {(time.time() - t0) / 60:.1f} min → out/{a.id}.mp4")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor").set_defaults(fn=cmd_doctor)
    p = sub.add_parser("new"); p.add_argument("id"); p.add_argument("--from", dest="src", default="_template"); p.set_defaults(fn=cmd_new)
    p = sub.add_parser("voice"); p.add_argument("id"); p.add_argument("--force", action="store_true"); p.set_defaults(fn=cmd_voice)
    p = sub.add_parser("compile"); p.add_argument("id"); p.set_defaults(fn=cmd_compile)
    p = sub.add_parser("prep"); p.add_argument("id"); p.add_argument("--jobs", type=int, default=4); p.add_argument("--fast", action="store_true"); p.set_defaults(fn=cmd_prep)
    p = sub.add_parser("grid"); p.add_argument("id"); p.set_defaults(fn=cmd_grid)
    p = sub.add_parser("preview"); p.add_argument("id"); p.add_argument("--at"); p.add_argument("--shots", action="store_true"); p.set_defaults(fn=cmd_preview)
    p = sub.add_parser("draw"); p.add_argument("id"); p.add_argument("--frames"); p.add_argument("--workers", type=int, default=3); p.add_argument("--force", action="store_true"); p.set_defaults(fn=cmd_draw)
    p = sub.add_parser("motion"); p.add_argument("id"); p.add_argument("--frames"); p.add_argument("--workers", type=int, default=4); p.add_argument("--force", action="store_true"); p.set_defaults(fn=cmd_motion)
    p = sub.add_parser("actors"); p.add_argument("id", nargs="?"); p.set_defaults(fn=cmd_actors)
    p = sub.add_parser("scene"); p.add_argument("id"); p.add_argument("--frames"); p.add_argument("--workers", type=int, default=4); p.set_defaults(fn=cmd_scene)
    p = sub.add_parser("audio"); p.add_argument("id"); p.add_argument("--stems", action="store_true"); p.set_defaults(fn=cmd_audio)
    p = sub.add_parser("hud"); p.add_argument("id"); p.add_argument("--workers", type=int, default=3); p.set_defaults(fn=cmd_hud)
    p = sub.add_parser("mux"); p.add_argument("id"); p.add_argument("--maxrate", default="8M"); p.set_defaults(fn=cmd_mux)
    p = sub.add_parser("qa"); p.add_argument("id"); p.set_defaults(fn=cmd_qa)
    p = sub.add_parser("storyboard"); p.add_argument("id"); p.set_defaults(fn=cmd_storyboard)
    p = sub.add_parser("bench"); p.add_argument("--update", action="store_true"); p.set_defaults(fn=cmd_bench)
    p = sub.add_parser("layout"); p.add_argument("id"); p.add_argument("--step", type=int, default=12); p.add_argument("--mstep", type=int, default=2, help="motion pass: every N-th frame (0 = off)"); p.set_defaults(fn=cmd_layout)
    from engine.script import cli as script_cli
    script_cli.add_parser(sub)
    p = sub.add_parser("all"); p.add_argument("id"); p.add_argument("--force", action="store_true"); p.add_argument("--jobs", type=int, default=4)
    p.add_argument("--fast", action="store_true"); p.add_argument("--frames"); p.add_argument("--workers", type=int, default=4)
    p.add_argument("--stems", action="store_true"); p.add_argument("--maxrate", default="8M"); p.set_defaults(fn=cmd_all)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
