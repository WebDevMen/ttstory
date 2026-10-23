#!/usr/bin/env bash
# Full rebuild of the video from the AI keyframes in assets/plates.
#   requirements: python3 (numpy scipy opencv-python-headless pillow edge-tts onnxruntime soundfile),
#                 node + playwright (chromium), ffmpeg
#   MODELS dir must contain esrgan_x4.onnx (imgdesignart/realesrgan-x4-onnx) and depth.onnx
#   (onnx-community/depth-anything-v2-small) — see README.
set -euo pipefail
cd "$(dirname "$0")"
MODELS=${MODELS:-build/models}
WORK=build
mkdir -p "$WORK"

python3 tools/prep_plates.py "$MODELS" assets/plates "$WORK/prepped"      # upscale + depth
python3 tools/voiceover.py "$WORK/vo_raw"                                  # TTS + word timings
python3 tools/timeline.py "$WORK/vo_raw" "$WORK"                           # vo.wav + timeline.json
python3 tools/render_scene.py "$WORK/prepped" "$WORK/frames" --workers 4   # scene layer + camera.json
python3 tools/audio.py "$WORK"                                             # sound design + mix.wav

# HUD + compositing in headless Chromium (serves the repo root over http)
python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
node tools/render_hud.cjs video "$WORK/frames" "$WORK/video_hud.mp4" 3

mkdir -p out
python3 tools/mux.py "$WORK/video_hud.mp4" "$WORK/mix.wav" out/tanker_survival_9x16.mp4
echo "done: out/tanker_survival_9x16.mp4"
