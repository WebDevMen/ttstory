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

echo "▶ models (Real-ESRGAN x4, Depth Anything V2 small)"
mkdir -p models
[ -f models/esrgan_x4.onnx ] || curl -fL --retry 4 -o models/esrgan_x4.onnx https://huggingface.co/imgdesignart/realesrgan-x4-onnx/resolve/main/onnx/model.onnx
[ -f models/depth.onnx ] || curl -fL --retry 4 -o models/depth.onnx https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx

echo "▶ check"
.venv/bin/python vg.py doctor
