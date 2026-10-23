"""Mux the composited video with the mix: two-pass EBU R128 loudness normalization (-14 LUFS, -1.5 dBTP).

Usage: python mux.py <video_hud.mp4> <mix.wav> <out.mp4>
"""
import json
import re
import subprocess
import sys

video, audio, out = sys.argv[1:4]
TARGET = "I=-14:TP=-1.5:LRA=11"

probe = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", audio, "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", probe, re.S).group(0))
af = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", audio, "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
                "-profile:v", "high", "-level", "4.2", "-r", "30", "-g", "60", "-colorspace", "bt709", "-color_primaries", "bt709",
                "-color_trc", "bt709", "-af", af, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart",
                "-shortest", out], check=True)
print("written", out)
