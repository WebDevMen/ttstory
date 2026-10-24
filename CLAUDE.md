# TTStory — vertical video engine

- Purpose: produce 9:16 TikTok/Shorts/Reels videos from a script. Each video = `projects/<id>/project.yaml` + keyframe images in `projects/<id>/plates/`.
- To make or change a video, follow `.claude/skills/make-video/SKILL.md`. The process and quality bar are in `docs/MANUAL.md`; every YAML key is in `docs/REFERENCE.md`.
- Reference projects: `projects/tanker` (sci-fi, dynamic) and `projects/tea` (painted, calm). `projects/_template` is the starting skeleton.
- Commands: `python3 vg.py <doctor|new|voice|compile|prep|grid|preview|scene|audio|hud|mux|qa|all> <id>`. Set up with `./setup.sh`, then `source .venv/bin/activate`.
- Engine code: `engine/` (Python: tts, compile, prep, scene, audio, mux, qa; HUD in `engine/hud/` — HTML/CSS/JS + three.js rendered in headless Chromium by `engine/render_hud.cjs`).
- `build/` (intermediate frames, caches) and `models/` (ONNX weights) are git-ignored. Finished videos go to `out/<id>.mp4`; keep them under 100 MB.
- Run long steps (`prep`, `scene`, `hud`, `all`, `mux`) in the background with a long timeout. `prep` and `voice` resume and skip finished work.
- User-facing docs are in Russian. Keep it that way.
