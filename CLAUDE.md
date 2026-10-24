# TTStory — vertical video engine

- Purpose: produce 9:16 TikTok/Shorts/Reels videos from a script. Each video = `projects/<id>/project.yaml` + keyframe images in `projects/<id>/plates/`.
- To write a script for a topic (research, hooks, timed voice-over, shot plan, packaging), follow `.claude/skills/write-script/SKILL.md`; methodology and every rule: `docs/SCRIPTING.md`. Scripts live in `projects/<id>/script.yaml` (+ rendered `script.md`); code in `engine/script/` (knowledge base in `engine/script/data/*.yaml`). Reference scripts: `projects/blackout` (script only) and `projects/slots` (script → finished video, own actors in `projects/slots/actors/casino.js`).
- To make or change a video, follow `.claude/skills/make-video/SKILL.md`. The process and quality bar are in `docs/MANUAL.md`; every YAML key is in `docs/REFERENCE.md`.
- Reference projects: `projects/tanker` (sci-fi, dynamic), `projects/tea` (painted, calm) and `projects/school` (100% code-drawn, no AI images). `projects/gallery` is the visual catalog of draw actors. `projects/_template` is the starting skeleton.
- Shots are either AI keyframes (`plate:`) or code-drawn scenes (`draw:`): actors in `engine/hud/draw/actors/*.js` (+ `projects/<id>/actors/*.js`), runtime in `engine/hud/draw/`, rendered by `vg.py draw`. Docs: `docs/DRAW.md`.
- Commands: `python3 vg.py <doctor|new|voice|compile|prep|grid|preview|draw|actors|scene|audio|hud|mux|qa|all> <id>`; scripts: `python3 vg.py script <formats|new|check|render|project>`. Set up with `./setup.sh`, then `source .venv/bin/activate`.
- Engine code: `engine/` (Python: tts, compile, prep, scene, audio, mux, qa; HUD and draw runtime in `engine/hud/` — HTML/CSS/JS + GSAP, Lottie, rough.js, D3, three.js (vendored in `engine/hud/vendor/`) rendered in headless Chromium by `engine/render_hud.cjs`).
- `build/` (intermediate frames, caches) and `models/` (ONNX weights) are git-ignored. Finished videos go to `out/<id>.mp4`; keep them under 100 MB.
- Run long steps (`prep`, `scene`, `hud`, `all`, `mux`) in the background with a long timeout. `prep` and `voice` resume and skip finished work.
- User-facing docs are in Russian. Keep it that way.
