---
name: make-video
description: Create a vertical (9:16) social video — TikTok / Shorts / Reels — from a script with this repo's engine (code-drawn scenes from the draw actor library by default, or on request AI illustrations + Remotion motion graphics, or AI keyframes + 2.5D depth-parallax; HTML/three.js HUD + procedural sound). Use whenever the user asks for a new video/ролик, own/controllable graphics ("своя графика", "без нейросетей", motion design, explainer), a different style or story, changes to an existing project in projects/, or "сделай как танкер/школа".
---

# make-video — production workflow

The repo turns `projects/<id>/project.yaml` + keyframe images into a finished MP4. Read `docs/MANUAL.md` (process, style recipes, quality checklist; §0 — how to choose the graphics method) and `docs/REFERENCE.md` (every key) before writing a project, plus the docs of the chosen method: `docs/DRAW.md` or `docs/MOTION.md`.

**Choose the graphics method first (the user decides; never switch it on your own):**

| Method | What it is | Docs / reference | Pick it when the request says… |
|---|---|---|---|
| `draw` — **default** | own graphics drawn by code: actor library, camera, parallax, word-timed animation; no AI images, no credits | `docs/DRAW.md`, §2b below; `projects/school`, `slots`, `superuser`, `blame` | «своя графика», «без нейросетей», «кодом», «как школа / как казино / как раньше», or nothing about graphics and the user confirmed the default |
| `motion` | AI illustrations (Figma AI credits) for characters and places + Remotion motion graphics (blocks, flex layout, spring motion) | `docs/MOTION.md`, §2 + §2a below; `projects/proverbs` | «иллюстрации», «ИИ-картинки», «нейросеть», «моушн», «Remotion», «как пословицы» |
| `plates` | AI keyframes with 2.5D depth parallax | §2 below; `projects/tanker`, `projects/tea` | «как танкер», «как чай», «кинематографично», «AI-кадры» |
| `mixed` | combination of the above in one video | — | the user asks for a mix |

- Source of the choice, in order: the user's words in this request → `meta.style` in `projects/<id>/script.yaml` → the method an existing project already uses.
- If none of them settles it, ask the user once before writing anything (AskUserQuestion: `draw` first and marked recommended, `motion`, `plates`). If nobody can answer (an automated run), use `draw` and say so in the final note.
- Write the chosen method into `script.yaml` `meta.style` so later steps follow it.

A shot's picture is an AI keyframe (`plate:`), a **code-drawn scene** (`draw:` — actors from `engine/hud/draw/actors`, see `docs/DRAW.md`; template: `projects/school/project.yaml`, 59 s, no AI images at all; visual catalog: `projects/gallery`) or a **motion-graphics scene** (`motion:`, optionally over a plate). Mixing kinds in one video is fine when the chosen method is `mixed`.

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

## 2. Style bible → keyframes (methods `motion`, `plates`; skip for `draw`)

- Pick one style tail and use it on every prompt (see MANUAL §5.2 and §13). Describe recurring objects (hands, gloves, sleeves, the hero item) with identical words in every prompt.
- Prompt formula: `Vertical 9:16 frame. <camera/POV> <subject + action + environment> <light/atmosphere> <style tail>. No text, no letters, no UI, no watermark.` Ask for a clear foreground/background (parallax), room for the HUD, and visible "animatable" elements (water, neon, steam, windows, lamps).
- Composition rule for the motion method: the subject in the lower two thirds, the top third calm and empty for titles; the recurring hero described with identical words in every prompt.
- Generate with Figma AI when available: `create_new_file` (plan from `whoami`) once → `create_session` → `generate_image` with `model: gemini-3.1-flash-image`, `width: 1152`, `height: 2048`. Download `image.url` immediately with curl into `projects/<id>/plates/<name>.png`. These calls spend the user's Figma AI credits: generate only what the plan needs (typically 5–10 frames) and report the count. Without Figma, ask the user for images from any generator (9:16) or use their photos.
- Ask for depth in every prompt: a layered background (distant city / hills / forest), atmospheric haze, objects firmly standing on the ground with contact shadows.
- Look at all frames together (contact sheet). Regenerate any frame with broken hands, gibberish text in a visible place, a mismatched palette, objects floating above the ground, or an empty flat background.
- Save every prompt in the shot's `prompt:` field or in `plates/PROMPTS.md`.

## 2a. Motion-graphics shots (`motion:`) — method `motion`

Characters, places, situations → AI illustrations (`plate:`) in ONE style bible, 2.5D parallax + effects; facts, numbers, comparisons, sayings, rules, calls to action → `motion:` scenes (blocks `kicker`, `title`, `number`, `proverb`, `versus`, `bars`, `meter`, `checklist`, `stamp`, `comment`…, no hand-placed coordinates); text over an illustration → `motion:` on the plate shot with `align: top` + `scrim`. Reference: `projects/proverbs/project.yaml`; catalogue: `docs/MOTION.md` §3–4.

1. After `voice` + `compile`, plan each beat as *illustration → graphic → illustration*: a new picture or graphic event every 2–5 s.
2. Write blocks, not coordinates (`docs/MOTION.md` §4): one kicker, one main element (title / number / proverb / bars / versus / meter), at most one supporting element (stamp / badge / source). Tie every `at` to the spoken word (`"@word"`), use `sync: true` on titles that repeat the voice, `swap` when one element replaces another in place.
3. Pick a palette per video (`motion: {palette: night}` at the top level); change it only on a mood turn (twist → `dusk`).
4. `python3 vg.py motion <id> --frames a,b,c` renders single graphic frames in seconds; check every block at its entrance and at the end of the shot.
5. Shots over illustrations: `plate:` + `motion:` with `align: top` and `scrim`; keep text off faces.
6. Missing block type → add a component in `engine/motion/src/blocks/` and register it (docs/MOTION.md §8), then document it.

## 2b. Code-drawn shots (`draw:`) — method `draw` (default)

0. Build depth before details (`docs/DRAW.md` §10.6): sky wider than the frame; 2–3 background planes (distant city / hills / forest at `par 0.15–0.25`, middle plane at `par 0.3–0.6`), **each on its own ground strip with the same `par`** and the bases sunk into it; lighter and hazier with distance, a haze band on the horizon; life in the backdrop (smoke, lights, birds, particles). Mark project actors `grounded: true` / `surface: true`.
1. After `voice` + `compile`, dump the word timings (`build/<id>/timeline.json` → `words`) and plan one composition per shot: background (`sky` with `hour`, `room`, `bg` gradient), 2–3 depth planes (`par: 0` sky, `0.3–0.6` far, `1` main, `1.1–1.2` foreground), the main subject (characters `person`/`classroom`, objects, `phone`, `map`, `chart`…), and 1–3 word-timed accents (`badge`, `callout`, `text` with `reveal`, `prop`, pose/face changes). Every element that appears gets `at: "@word"`, an `enter`, and usually `sfx`.
2. Camera always moves (`camera.keys` push-in, panorama in a wider `world`, `follow`). Keep scene effects for life: falling petals, steam, glow, sparkles.
3. Layout: marker y≈214, main art y 300–1150, captions over a floor/road band (`captions_top`), decor only below y 1550; hide captions when a big kinetic title says the same (`theme.captions.hide`). Labels over a panning world: `space: screen`.
4. Missing object → write an actor in `projects/<id>/actors/<name>.js` (or the library); `vg.py actors` lists what exists. Check new actors on a gallery page first (`vg.py draw gallery --frames N`, read `build/gallery/drawn/<shot>/<frame>.jpg`).
5. Iterate with `vg.py preview <id> --shots` and `--at <times>`; read the sheet, fix coordinates, repeat. Then run the layout audit (§5b). `vg.py draw` re-renders only changed shots, but any change in actor code re-renders all draw shots.

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

## 5a. Compose with the layout layer and real sizes (docs/DRAW.md §10.2–10.3)

Prefer rules to hand-tuned numbers: `slot:` for titles/tags/labels, `stack:` for any column or row of badges/cards,
text `lines: N` (+ `width`) for long titles, auto-`fit` (on by default for text-bearing actors), `captions_top: auto`
where captions compete with graphics. For scenes with people and objects set `draw.px_per_m` and `draw.floor` and
place actors with `y: floor` — sizes and floor contact become automatic; declare `size_m` on new project actors.

## 5b. Graphics audit — the design-quality gate (mandatory for draw shots)

The user explicitly requires neat, consistent graphics: no text touching or cut by the frame, no «almost centred» items, no overlaps with other texts or captions, one type scale, equal spacing, nothing drifting or coming apart during animation. The standard is `docs/DRAW.md` §10.1 — follow it while composing, not only when fixing.

```bash
python3 vg.py layout <id>        # after compile; build/<id>/layout/sheet.jpg shows every issue boxed
python3 vg.py layout <id> --shots a,b [--mstep 0]   # while iterating: re-check only the shots you changed (fast)
```
Shots are measured in parallel browser tabs (`--workers`, default 3). Iterate with `--shots`; run the full audit (no flags) once before the storyboard and the render.
Fix until **0 errors and ≤ 3 warnings**, and keep a warning only when it is deliberate (say which and why in the final note). Besides layout it reports proportions, floor contact, clamped poses, clutter, pop-ins, contrast, exposure and motion (jumps, jitter, flicker). It also reports `[support]` (a grounded object with nothing under its base, or standing on ground of another parallax layer — a gap opens when the camera moves) and `[backdrop]` (only sky behind the subject). Then look at the start, middle and end of every shot (`preview --at`) for what automation cannot judge — go through the «fresh eyes» checklist of `docs/DRAW.md` §10.6: floating or sliding objects, empty or flat backdrop, background showing at frame edges, repeated stamps, inconsistent light, a world that does not match itself, uneven gaps, ragged stacks, mismatched styles, parts of a composite drawing out of place. Never start the full render with known sloppy placement.

## 5c. Storyboard approval

`python3 vg.py storyboard <id>` → `build/<id>/storyboard/storyboard.html` (start/middle/end frame of every shot, voice text, audit notes). Publish it as an Artifact (load the artifact-design skill first) and ask the user to approve or comment before the full render; skip only when the user asked to go straight to the final video.

If you changed the engine or library actors while making the video, run `python3 vg.py bench` and fix or knowingly accept (`--update`) every reported change. The AI art director is planned but deferred: do not build or run one unless the user asks.

## 6. Full render & QA

```bash
python3 vg.py all <id>           # background, up to 7200000 ms; or: scene → audio → hud → mux → qa
```
Then read `build/<id>/qa/sheet*.jpg` (1 frame per second) for the whole flow, and the loudness line (expect I ≈ −14 LUFS, peak ≤ −1.5). Check that `out/<id>.mp4` is 1080×1920 / 30 fps and under 100 MB (`vg.py mux <id> --maxrate 6M` if larger). If something is off, fix it and re-render only what changed: the scene frames for the affected range (`vg.py scene <id> --frames a:b`), then `hud` → `mux`.

You cannot listen to audio. Verify it objectively: `vg.py audio <id> --stems`, compare the RMS of the stems (voice should be ~8 dB above music/ambience), and look for a single event far louder than the rest.

## 7. Deliver

- Commit the project folder (`projects/<id>/` with plates and YAML) on `main` and push. **Never commit or push `out/<id>.mp4`** — the user asked for finished videos to be sent only in the chat (SendUserFile); `out/*.mp4`, `build/` and `models/` are git-ignored.
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
