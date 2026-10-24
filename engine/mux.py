"""Final encode: composited video + mix with two-pass EBU R128 loudness normalization -> out/<project>.mp4"""
import json
import os
import re
import subprocess

from .common import ROOT, build_dir, load_timeline


def run(pid, out=None, maxrate="8M", crf=19):
    tl = load_timeline(pid)
    bd = build_dir(pid)
    video, audio = os.path.join(bd, "video_hud.mp4"), os.path.join(bd, "mix.wav")
    out = out or os.path.join(ROOT, "out", f"{pid}.mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    target = f"I={tl['audio'].get('loudness', -14)}:TP=-1.5:LRA=11"
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", audio, "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", probe, re.S).group(0))
    af = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
    bufsize = f"{int(maxrate.rstrip('M')) * 2}M"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", audio, "-map", "0:v", "-map", "1:a",
                    "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-maxrate", maxrate, "-bufsize", bufsize, "-pix_fmt", "yuv420p",
                    "-profile:v", "high", "-level", "4.2", "-r", str(tl["fps"]), "-g", str(tl["fps"] * 2),
                    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                    "-af", af, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out], check=True)
    size = os.path.getsize(out) / 1e6
    print(f"  written {out} ({size:.1f} MB)")
    return out
