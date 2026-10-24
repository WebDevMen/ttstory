---
name: make-video
description: Create a vertical (9:16) social video — TikTok / Shorts / Reels — from a script with this repo's engine (AI keyframes + 2.5D depth-parallax animation, or code-drawn scenes from the draw actor library; HTML/three.js HUD + procedural sound). Use whenever the user asks for a new video/ролик, own/controllable graphics ("своя графика", "без нейросетей", motion design, explainer), a different style or story, changes to an existing project in projects/, or "сделай как танкер/школа".
---

# make-video — production workflow

The repo turns `projects/<id>/project.yaml` + keyframe images into a finished MP4. Read `docs/MANUAL.md` (process, style recipes, quality checklist) and `docs/REFERENCE.md` (every key) before writing a project. Use `projects/tanker/project.yaml` (dynamic sci-fi, 61 s) and `projects/tea/project.yaml` (calm painted look, 36 s) as templates: copy their patterns, not their content.

A shot's picture is either an AI keyframe (`plate:`) or a **code-drawn scene** (`draw:` — actors from `engine/hud/draw/actors`, see `docs/DRAW.md`; template: `projects/school/project.yaml`, 59 s, no AI images at all; visual catalog: `projects/gallery`). Use `draw:` when the user wants controllable/own graphics, motion design, explainers, infographics, characters that act on words, UI/phone/map/chart scenes, or when no image generator is available. Mixing both kinds in one video is fine.

The quality bar is the tanker video: every shot moves (camera + parallax + at least one living layer), every HUD item and sound is tied to a spoken word, captions are readable, and the audio is layered and normalized.

## 0. Environment (once per session)

```bash
./setup.sh                      # venv, packages, playwright/chromium, models; safe to re-run
source .venv/bin/activate && python3 vg.py doctor
```
Long steps (`prep`, `scene`, `hud`, `all`, `mux`) must run with `run_in_background: true` and a timeout of up to 7200000 ms. The default background limit (30 min) kills long jobs. `prep` and `voice` resume where they stopped. While a job runs, do something useful (docs, the next project file), then wait with an `until` loop on its log or output file.

## 1. Script → project skeleton

1. Agree on the script. If `projects/<id>/script.yaml` exists (made with the write-script skill), it is the source of truth: `python3 vg.py script check <id>` must be ready, then `python3 vg.py script project <id>` writes a draft `project.yaml` (voice, scenes, shots cut on words, transitions, music sections, sfx, caption marks; each shot is an animatic card with its visual plan as comments) — build the real graphics from those comments and keep the script's timing, on-screen texts and sounds. If the user gives only an idea, write the script first with the write-script skill (or at least: hook in the first 2 s, 3–4 content blocks, a final question/choice + CTA; ~2.5 words/s at rate +20%, 60 s ≈ 145 words; `ё` where stress matters).
2. Without a script.yaml: `python3 vg.py new <id> [--from tea|tanker]`, fill in `title`, `voice`, `theme`, and the scenes with `text` and one shot each (plate names you will generate).
3. `python3 vg.py voice <id> && python3 vg.py compile <id>` → check the duration. Trim or extend the text **before** generating images.

## 2. Style bible → keyframes

- Pick one style tail and use it on every prompt (see MANUAL §5.2 and §13). Describe recurring objects (hands, gloves, sleeves, the hero item) with identical words in every prompt.
- Prompt formula: `Vertical 9:16 frame. <camera/POV> <subject + action + environment> <light/atmosphere> <style tail>. No text, no letters, no UI, no watermark.` Ask for a clear foreground/background (parallax), room for the HUD, and visible "animatable" elements (water, neon, steam, windows, lamps).
- Generate with Figma AI when available: `create_new_file` (plan from `whoami`) once → `create_session` → `generate_image` with `model: gemini-3.1-flash-image`, `width: 1152`, `height: 2048`. Download `image.url` immediately with curl into `projects/<id>/plates/<name>.png`. These calls spend the user's Figma AI credits: generate only what the plan needs (typically 5–10 frames) and report the count. Without Figma, ask the user for images from any generator (9:16) or use their photos.
- Look at all frames together (contact sheet). Regenerate any frame with broken hands, gibberish text in a visible place, or a mismatched palette.
- Save every prompt in the shot's `prompt:` field or in `plates/PROMPTS.md`.

## 2b. Code-drawn shots (`draw:`) instead of keyframes

1. After `voice` + `compile`, dump the word timings (`build/<id>/timeline.json` → `words`) and plan one composition per shot: background (`sky` with `hour`, `room`, `bg` gradient), 2–3 depth planes (`par: 0` sky, `0.3–0.6` far, `1` main, `1.1–1.2` foreground), the main subject (characters `person`/`classroom`, objects, `phone`, `map`, `chart`…), and 1–3 word-timed accents (`badge`, `callout`, `text` with `reveal`, `prop`, pose/face changes). Every element that appears gets `at: "@word"`, an `enter`, and usually `sfx`.
2. Camera always moves (`camera.keys` push-in, panorama in a wider `world`, `follow`). Keep scene effects for life: falling petals, steam, glow, sparkles.
3. Layout: marker y≈214, main art y 300–1150, captions over a floor/road band (`captions_top`), decor only below y 1550; hide captions when a big kinetic title says the same (`theme.captions.hide`). Labels over a panning world: `space: screen`.
4. Missing object → write an actor in `projects/<id>/actors/<name>.js` (or the library); `vg.py actors` lists what exists. Check new actors on a gallery page first (`vg.py draw gallery --frames N`, read `build/gallery/drawn/<shot>/<frame>.jpg`).
5. Iterate with `vg.py preview <id> --shots` and `--at <times>`; read the sheet, fix coordinates, repeat. `vg.py draw` re-renders only changed shots, but any change in actor code re-renders all draw shots.

## 3. Prepare & measure

```bash
python3 vg.py prep <id>          # background; ~1–4 min/plate
python3 vg.py grid <id>          # read build/<id>/grid/grid_sheet.jpg to get plate coordinates
```
Write down coordinates: horizon line, water areas, light sources, steam origins, windows, objects for anchors. Plate coordinates are 1296×2304 (screen 1080×1920 at z=1, centred).

## 4. Fill in the project

For each shot set `camera` (pick a recipe from MANUAL §9.1), 2–4 `effects` that match what is in the frame (MANUAL §9.2), `look`, `transition`, `ambience`, plus `anchors` for world-locked HUD. For each scene set `accent`, `cues` (named word references), `hud` (1 marker + 1–3 info elements tied to words), and `sfx` for story beats. Use `"@word"` references everywhere instead of raw seconds. Cut to a new shot 0.1–0.2 s before its key word.

Respect the safe zones: markers at y≈214, panels y 300–900, captions y≈1200–1320, CTA ≤1450, nothing important at x>940 between y 800 and 1550.

## 5. Preview loop (fast, repeat until clean)

```bash
python3 vg.py compile <id> && python3 vg.py preview <id> --shots          # ~1 min
python3 vg.py preview <id> --at <times of HUD entrances, impacts, transitions>
```
Read `build/<id>/preview/preview.jpg` and check: composition, plate edges never visible, anchors on their objects, no overlapping HUD, captions readable, colors consistent. Fix the YAML and re-run. Don't start the full render before the preview is clean.

## 6. Full render & QA

```bash
python3 vg.py all <id>           # background, up to 7200000 ms; or: scene → audio → hud → mux → qa
```
Then read `build/<id>/qa/sheet*.jpg` (1 frame per second) for the whole flow, and the loudness line (expect I ≈ −14 LUFS, peak ≤ −1.5). Check that `out/<id>.mp4` is 1080×1920 / 30 fps and under 100 MB (`vg.py mux <id> --maxrate 6M` if larger). If something is off, fix it and re-render only what changed: the scene frames for the affected range (`vg.py scene <id> --frames a:b`), then `hud` → `mux`.

You cannot listen to audio. Verify it objectively: `vg.py audio <id> --stems`, compare the RMS of the stems (voice should be ~8 dB above music/ambience), and look for a single event far louder than the rest.

## 7. Deliver

- Commit the project folder (`projects/<id>/` with plates and YAML) and `out/<id>.mp4` on the working branch, then push (`build/` and `models/` are git-ignored).
- Send the MP4 to the user (SendUserFile) together with a short note: what was made, any deviations from the script, how many image generations were used, and what is easy to tweak next.

## Pitfalls learned the hard way

- `edge-tts` behind the session proxy needs the proxy CA (handled in `engine/tts.py` and `setup.sh`).
- Particle `mode: path` uses `path: [[x0,y0],[x1,y1]]`. Keys `from`/`until` are reserved for time windows.
- Camera key `t` is seconds from shot start. Use `"end"`/`"end-0.4"` or an `"@..."` reference for absolute moments.
- A big `parallax.k` or `px` smears object edges. Keep `px ≤ 20` and `k ≤ 0.25` (0.05–0.1 for calm shots). For held objects, set `d0` to the object's depth.
- Strong `fog.density` (>0.3) or bright bloom on light scenes washes the frame out. Low-contrast pastel plates need a lower `bloom` threshold strength.
- Calm styles: set `sfx: false` on title/markers and add soft `bell`/`chime`/`gong` events instead of the default cinematic hits.
- Generated plates may contain pseudo-text (signs, lanterns). Keep it small and out of focus, or regenerate.
- Draw shots: YAML strings containing `: ` (e.g. a scene `text` with a colon) must be quoted. `enter` presets differ from text `reveal` modes (`slam` is a reveal mode; for items use `stamp`).
- Draw shots: the Japanese fonts (`jp` = Klee, `round` = M PLUS Rounded) render Cyrillic too wide — use them for kanji/kana, and `hand` (Caveat) or Montserrat for Russian.
- Draw shots: person `pose` angles are in screen terms; a raised arm bends its forearm up with a negative elbow (`wave: a2 [128, -78]`). Props in hands extend along the forearm; rotate them with `hold_rot`.
