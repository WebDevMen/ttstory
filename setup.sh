#!/usr/bin/env bash
# One-time environment setup: Python venv + packages, Playwright/Chromium, ONNX models.
# Safe to re-run. Afterwards: source .venv/bin/activate && python3 vg.py doctor
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ python venv (.venv)"
if command -v uv >/dev/null 2>&1; then
  [ -d .venv ] || uv venv -q .venv
  uv pip install -q --python .venv/bin/python -r requirements.txt
else
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

# behind a TLS-intercepting proxy (Claude Code cloud sessions) edge-tts must trust the proxy CA
if [ -f /root/.ccr/ca-bundle.crt ]; then
  CF=$(.venv/bin/python -c "import certifi; print(certifi.where())")
  grep -q "ccr" "$CF" 2>/dev/null || { echo "# ccr proxy CA" >> "$CF"; cat /root/.ccr/ca-bundle.crt >> "$CF"; }
fi

echo "▶ playwright + chromium"
if ! (node -e "require('playwright')" || NODE_PATH="$(npm root -g)" node -e "require('playwright')") >/dev/null 2>&1; then
  npm i --silent playwright
  npx --yes playwright install chromium || echo "  (install Chromium manually: npx playwright install chromium)"
fi

echo "▶ motion engine (Remotion, engine/motion)"
(cd engine/motion && npm ci --silent --no-audit --no-fund) || echo "  (run manually: cd engine/motion && npm ci)"

echo "▶ models (Real-ESRGAN x4, Depth Anything V2 small)"
mkdir -p models
[ -f models/esrgan_x4.onnx ] || curl -fL --retry 4 -o models/esrgan_x4.onnx https://huggingface.co/imgdesignart/realesrgan-x4-onnx/resolve/main/onnx/model.onnx
[ -f models/depth.onnx ] || curl -fL --retry 4 -o models/depth.onnx https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx

# optional local (offline) Russian voices: VG_LOCAL_TTS=1 ./setup.sh — Vosk-TTS (5 voices, ~750 MB) + Vosk ASR for word timings
if [ "${VG_LOCAL_TTS:-0}" = "1" ]; then
  echo "▶ local TTS (Vosk-TTS ru 0.9 multi + Vosk small ru for word timings)"
  if command -v uv >/dev/null; then uv pip install -q --python .venv/bin/python vosk-tts vosk; else .venv/bin/pip install -q vosk-tts vosk; fi
  if [ ! -d models/vosk-model-tts-ru-0.9-multi ]; then
    curl -fL --retry 4 -o models/vosk-tts.zip https://alphacephei.com/vosk/models/vosk-model-tts-ru-0.9-multi.zip && (cd models && unzip -q vosk-tts.zip && rm vosk-tts.zip)
  fi
  if [ ! -d models/vosk-model-small-ru-0.22 ]; then
    curl -fL --retry 4 -o models/vosk-asr.zip https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip && (cd models && unzip -q vosk-asr.zip && rm vosk-asr.zip)
  fi
fi

echo "▶ check"
.venv/bin/python vg.py doctor
