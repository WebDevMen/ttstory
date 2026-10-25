---
name: write-script
description: Write a complete, researched, conversion-oriented script for a 60-second vertical video (TikTok / Reels / Shorts) from a topic — research with sources, angles, hook lab, timed voice-over, shot-by-shot visual direction (actors, camera, animation, graphics, sound, transitions on words), retention map, engagement, platform packaging, self-review — as projects/<id>/script.yaml checked by `vg.py script check` and rendered to script.md. Use whenever the user gives a topic or idea and asks for a сценарий / script / «напиши сценарий», «придумай ролик про…», or wants a script before making a video.
---

# write-script — topic → production-ready 60-second script

The tool lives in `engine/script/` and is driven by `python3 vg.py script …`. Methodology, platform signals with sources, every rule and the `script.yaml` schema: **read `docs/SCRIPTING.md` first**. Reference script: `projects/blackout/script.yaml` (copy its depth and patterns, not its content).

The deliverable is `projects/<id>/script.yaml` that passes `script check` (0 errors, ≤ 3 warnings) plus `projects/<id>/script.md`. Do **not** build the video unless the user asks; the handoff is `vg.py script project <id>` + the make-video skill.

## 0. Intake (no unnecessary questions)

Take from the request: topic, wishes, platforms, duration, voice, style. Defaults when not given: 60 s, platforms `tiktok,reels,shorts` (TikTok primary), Russian, `ru-RU-DmitryNeural +18%` (Svetlana for soft/cultural topics), `style: draw` (own code-drawn graphics). Ask the user only if the topic itself is ambiguous enough that two readings lead to different videos — and about the graphics method: take it from the request («своя графика / без нейросетей / как школа» → `draw`, «иллюстрации / ИИ-картинки / моушн / как пословицы» → `motion`, «как танкер / чай / AI-кадры» → `plates`); if the request says nothing about graphics, ask once (AskUserQuestion: `draw` recommended, `motion`, `plates`), and if nobody can answer use `draw`. Pass it as `script new … --style <method>`. Pick a short latin `id` (e.g. `blackout`).

## 1. Research (web) — before writing anything

- Search the topic in the language of the audience and in English. Prefer primary/official sources (government agencies, standards, studies, the company itself), then large media. Fetch the page to confirm the exact wording and number — never cite a number from a search snippet alone.
- Collect **5–8 facts**, each `{id, text, source: URL, confidence}`. `medium` when only one secondary source or the number varies; `low` must be re-checked or dropped. Note what is surprising, what is disputed, what people ask in comments.
- Write `research.summary` and `insights`. Note what you deliberately leave out and why (`brief.constraints`).
- Look at how the topic is already covered (what titles/hooks exist) only to find a fresher angle — never copy.

## 2. Angle and format

- Write **3–4 angles** with a score 1–10 and an honest `why`; choose one (`chosen_angle`). Prefer the angle with natural escalation, personal relevance ("ты"), a surprising detail and a practical payoff.
- Choose the format (`python3 vg.py script formats`, details: `… formats <name>`). Then scaffold:

```bash
python3 vg.py script new <id> --topic "…" --format <format> --duration 60 [--platforms …] [--wishes "…"] [--voice …] [--rate …]
```
The skeleton has the format's beats with a speech-seconds/word budget per beat and every field as `TODO` (each TODO is an error). Blocks may be split/added/reordered; required roles must stay.

## 3. Hook lab

8+ variants of 4+ types (`imagine pov stakes question shock_fact contrarian curiosity_gap list_promise challenge callout result_first visual_shock`), each with `vo`, `on_screen`, `visual` (first frame without sound) and an honest `score`/`why` against: stops the thumb, clear, promises, concrete, relevant, strong first frame. `primary` = the first words of beat 1; `ab` = 2 alternatives. First sentence ≤ ~3 s (8–12 words) with the main keyword; no greetings.

## 4. Voice-over

Follow docs/SCRIPTING.md §7: 2.2–2.8 words/s (60 s ≈ 140–150 words), one thought per sentence, ≤ 14 words, numbers as words in the right case, no Latin/abbreviations in `vo` (on-screen text may use digits), «ты», concrete images. A reward (new fact/step/twist/answer) every 10–15 s; an open loop in the first 8 s closed after the middle; payoff/reveal/twist/recap in the second half. Every number in a reward beat references `facts`.

## 5. Visual direction (this is what makes it watchable)

- Style `draw` (default, docs/DRAW.md): name actors from `python3 vg.py actors` (§7 of DRAW.md) in `actors`; mark missing ones `new:<name>`.
- Style `motion` (only when chosen, docs/MOTION.md): characters and situations are AI illustrations — name them `art:<name>` in `actors` (one style bible for the whole video, subject in the lower two thirds, top third free for titles); facts, numbers, comparisons, sayings and calls to action are motion-graphics blocks — `motion:<block>` (`title number proverb versus bars meter checklist stamp badge comment card kicker source`, catalogue in docs/MOTION.md §4). Alternate illustration → graphic → illustration every 2–5 s. Sounds/ambiences/transitions/music: `python3 vg.py script formats`.
- 1–4 shots per beat; cut 0.1–0.2 s before the key word (`at: "@слово-0.1"`). For every shot: `visual` (subject, action, foreground/mid/background — name what stands in the background and on what ground, never «only sky»; color/light), `actors`, `camera` (it always moves), `animation` (what moves on which word), `graphics` (≤ 7 words), `sfx` (a sound on every visual hit), `transition`.
- Rhythm: two events in the first 1.5 s, a new visual event every 2–3 s, no shot shorter than 0.6 s, events inside their own shot. Color and music follow the emotion curve (`music` per beat). The final frame echoes the first.

## 6. Engagement and packaging

`engagement.comment` = a question answerable in one word/number; `share` = for whom; `save` = checklist/recap; `follow` = series; `rewatch` = fast details/loop; `cta` = one main ask (two max) in the last 25–30%. `package`: TikTok caption with the keyword in the first 100 chars + 3–5 hashtags, Reels ≤ 5 hashtags, Shorts title ≤ 100 chars, cover ≤ 6 words, `first_frame`. Keyword in speech, on screen and caption.

## 7. Check → fix → repeat

```bash
python3 vg.py script check <id>          # estimate (instant)
python3 vg.py script check <id> --tts    # exact timing with the real voice (needs network; cached)
```
Fix every error and warning that is a real problem; iterate until **0 errors and ≤ 3 warnings** in both modes, duration within ±12% of the target (aim ±5%). Never game the checker (fake sources, empty devices lists, padding words) — the rules mirror what makes viewers stay.

Then fill `review` honestly: scores 1–10 per aspect (any < 7 → improve the script, not the score), `weak_points` (what could fail, low-confidence facts) and `improvements` (what you changed and why). Set `meta.status: checked`.

## 8. Deliver

```bash
python3 vg.py script render <id> --tts   # projects/<id>/script.md
```
Read the rendered `script.md` once end to end as a viewer would (does every 10–15 s give something new? is every claim sourced?). Commit `projects/<id>/script.yaml` and `script.md`, push, and send `script.md` to the user (SendUserFile) with a short note: chosen angle and why, the hook and its A/B alternatives, duration, readiness score, facts with medium confidence, new actors/sounds production will need, and the next step (`python3 vg.py script project <id>` → make-video).

## Pitfalls

- YAML: quote strings containing `: ` and list items containing commas (`["понять, что будет", …]`) — otherwise they silently split.
- `at` words are matched after lowercasing and stripping punctuation (`ё` = `е`); a word that appears twice needs `#2`. Hyphenated words cannot be referenced — reference a neighbor word.
- The estimate can differ from real TTS by a few tenths of a second per beat; verify short shots and the hook end with `--tts`.
- Facts from one country/one source: phrase carefully ("до десяти часов", "выше девятого этажа — насосы") and mark `confidence: medium`.
