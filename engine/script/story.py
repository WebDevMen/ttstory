"""Fiction rules (meta.genre: fiction — mysticism, sci-fi, fantasy, series): the story bible (`story:` — premise, world
rules, characters, twists with set-up and pay-off, stakes, series) and the texture of the voice-over (clichés,
show-don't-tell, sensory detail). Knowledge base: data/story.yaml; methodology: docs/SCRIPTING.md §14.

Clichés of the «AI voice» are checked in every script; everything else only in fiction.
"""
import os
import re

from . import model, timing
from ..common import norm_word


def kb():
    return model.kb("story")


def is_fiction(s):
    meta = s.get("meta") or {}
    fmt = model.formats().get(meta.get("format")) or {}
    return str(meta.get("genre", "")).lower() == "fiction" or bool(fmt.get("fiction"))


def normalize(s, iss):
    """Shapes of the `story:` block (wrong types → schema errors + safe values)."""
    if s.get("story") is None:
        return
    st = model._as(iss, s, "story", dict, "")
    model._text(iss, st, "story", "premise", "paradox", "genre", "tone")
    for key, fields in (("world_rules", ("id", "rule", "shown_in", "basis")),
                        ("characters", ("id", "name", "role", "want", "fear", "flaw", "look", "arc")),
                        ("twists", ("id", "what", "setup", "payoff")),
                        ("stakes", ("beat", "level", "what"))):
        for i, x in enumerate(model._dicts(iss, st, key, "story")):
            model._text(iss, x, f"story.{key}[{i}]", *fields)
    if st.get("series") is not None:
        se = model._as(iss, st, "series", dict, "story")
        model._text(iss, se, "story.series", "name", "prev", "next", "answers", "cliff")
        model._number(iss, se, "story.series", "part", "of")


def _vo_words(text):
    return [norm_word(w) for w in re.findall(r"[\wёЁ-]+", text or "")]


def _hits(text, stems):
    low = (text or "").lower().replace("ё", "е")
    return sorted({st for st in stems if st.replace("ё", "е") in low})


def texture(s, iss, beats, fiction):
    """Clichés (all scripts), «tell» words and sensory detail (fiction)."""
    K = kb()
    sensory_beats = 0
    for b in beats:
        vo, w = b.get("vo") or "", f"beats.{b.get('id')}"
        if "TODO" in vo:
            continue
        bad = _hits(vo, K["cliches"]["common"] + (K["cliches"]["fiction"] if fiction else []))
        if bad:
            iss.warn("cliche", w, "клише/«ИИ-слова»: " + ", ".join(f"«{x}…»" for x in bad) + " — замените конкретным образом")
        if not fiction:
            continue
        tell = _hits(vo, K["tell_words"])
        if tell:
            iss.warn("show", w, "оценка вместо картинки: " + ", ".join(f"«{x}…»" for x in tell)
                     + " — покажи деталью (звук, свет, предмет, цифра), а не называй чувство")
        words = " ".join(_vo_words(vo))
        if any(st.replace("ё", "е") in words.replace("ё", "е") for st in K["sensory_words"]):
            sensory_beats += 1
    if fiction and beats and sensory_beats < 3:
        iss.warn("sensory", "beats", f"сенсорные детали (звук, запах, холод, свет) только в {sensory_beats} блоках — нужно ≥ 3: вымысел без ощущений звучит как пересказ")


def check(s, iss, M, beats, by_id, total, draft, pid, tts=False):
    """Story bible rules for fiction scripts."""
    K = kb()
    roles = model.roles()
    st = s.get("story")
    if not isinstance(st, dict) or not st:
        iss.error("story", "story", "художественный сценарий без библии истории: story: {premise, paradox, world_rules, characters, twists, stakes}")
        return
    bids = [b.get("id") for b in beats]
    idx = {b: i for i, b in enumerate(bids)}
    pos = (lambda bid: by_id[bid]["start"] / max(1, total)) if not draft else (lambda bid: idx.get(bid, 0) / max(1, len(bids)))

    # premise & paradox
    pr = str(st.get("premise") or "")
    if not pr or "TODO" in pr:
        iss.error("story", "story.premise", "нет премисы: одно предложение «Что если …?»")
    elif not re.search(r"что\s+(если|будет)", pr.lower()) and "?" not in pr:
        iss.warn("story", "story.premise", "премиса — вопрос «Что если …?»: одно изменённое правило мира, доведённое до предела")
    if not st.get("paradox"):
        iss.warn("story", "story.paradox", "не назван парадокс истории — в чём противоречие, которое держит интерес")

    # world rules: shown on screen, never changed
    rules = st.get("world_rules") or []
    M["world_rules"] = len(rules)
    if not rules:
        iss.error("story", "story.world_rules", "нет правил мира: 2–4 правила, по которым работает аномалия")
    elif len(rules) < 2:
        iss.warn("story", "story.world_rules", "одно правило мира — добавьте второе: развязка должна следовать из правил")
    facts = {f.get("id") for f in (s.get("research") or {}).get("facts") or [] if isinstance(f, dict)}
    for r in rules:
        w = f"story.world_rules.{r.get('id')}"
        if not r.get("rule"):
            iss.error("story", w, "правило без текста (rule)")
        sh = r.get("shown_in")
        if not sh:
            iss.warn("story", w, "не указано, в каком блоке правило показано на экране (shown_in) — правило, которое не показали, зритель не поймёт")
        elif sh not in idx:
            iss.error("ref", w, f"shown_in: нет блока '{sh}'")
        elif not roles.get(next(b.get("role") for b in beats if b.get("id") == sh), {}).get("reward"):
            iss.warn("story", w, f"правило показано в блоке '{sh}', который не является наградой — объяснение мира само по себе награда (роль rule/proof/reveal)")
        basis = r.get("basis")
        if basis and re.fullmatch(r"f\d+", str(basis)) and basis not in facts:
            iss.error("ref", w, f"basis: нет факта '{basis}' в research.facts")

    # characters: want, fear, named in the voice-over
    chars = st.get("characters") or []
    M["characters"] = len(chars)
    if len(chars) < 2:
        iss.warn("story", "story.characters", f"персонажей {len(chars)} — нужно ≥ 2 (герой и тот, кто меняет его путь)")
    all_vo = " ".join(_vo_words(" ".join(b.get("vo") or "" for b in beats)))
    for c in chars:
        w = f"story.characters.{c.get('id') or c.get('name')}"
        for k, why in (("want", "чего хочет"), ("fear", "чего боится")):
            if not c.get(k):
                iss.warn("story", w, f"у персонажа не указано, {why} ({k}) — без этого он не живой")
        nm = norm_word(str(c.get("name") or ""))[:4]
        if nm and not draft and nm not in all_vo and c is chars[0]:
            iss.warn("story", w, f"главный герой «{c.get('name')}» ни разу не назван в тексте диктора")

    # twists: set-up strictly before pay-off, pay-off in the second part
    tw = st.get("twists") or []
    M["twists"] = len(tw)
    if not tw:
        iss.error("story", "story.twists", "нет поворотов: хотя бы один, с подготовкой (setup) и выстрелом (payoff)")
    for t in tw:
        w = f"story.twists.{t.get('id')}"
        su, po = t.get("setup"), t.get("payoff")
        for k, v in (("setup", su), ("payoff", po)):
            if not v:
                iss.error("story", w, f"нет {k}: поворот без {'подготовки — обман' if k == 'setup' else 'выстрела — пустое ружьё'}")
            elif v not in idx:
                iss.error("ref", w, f"{k}: нет блока '{v}'")
        if su in idx and po in idx:
            if idx[su] >= idx[po]:
                iss.error("story", w, "подготовка (setup) должна быть раньше выстрела (payoff)")
            elif pos(po) < 0.4:
                iss.warn("story", w, "поворот срабатывает в первых 40% ролика — держите его ближе к концу")

    # stakes climb
    levels = K["stakes_levels"]
    stk = [x for x in st.get("stakes") or [] if x.get("beat") in idx]
    for x in st.get("stakes") or []:
        if x.get("level") not in levels:
            iss.error("story", "story.stakes", f"уровень ставок '{x.get('level')}' (есть: {', '.join(levels)})")
        if x.get("beat") not in idx:
            iss.error("ref", "story.stakes", f"нет блока '{x.get('beat')}'")
    stk.sort(key=lambda x: idx[x["beat"]])
    lv = [levels.index(x["level"]) for x in stk if x.get("level") in levels]
    if not lv:
        iss.warn("story", "story.stakes", "не размечены ставки (story.stakes: [{beat, level: personal|family|community|world}])")
    elif max(lv) == lv[0]:
        iss.warn("story", "story.stakes", "ставки не растут: от личного к семье, общине, миру")
    elif any(b < a for a, b in zip(lv, lv[1:])):
        iss.info("story", "story.stakes", "ставки в одном месте опускаются — так можно, если это осознанная передышка перед ударом")

    # ending: a twist / cliffhanger / reveal right before the call to action
    tail = [b for b in beats if b.get("role") not in ("cta", "loop")]
    if tail and tail[-1].get("role") not in K["ending_roles"]:
        iss.warn("ending", f"beats.{tail[-1].get('id')}", "последний сюжетный блок — не поворот/обрыв/раскрытие: финал должен менять смысл или открывать продолжение")

    # angles & hook
    res = s.get("research") or {}
    angles = [a for a in res.get("angles") or [] if isinstance(a, dict)]
    arch = {a.get("archetype") for a in angles if a.get("archetype")}
    for a in angles:
        if a.get("archetype") and a["archetype"] not in K["archetypes"]:
            iss.error("story", f"research.angles.{a.get('id')}", f"неизвестный архетип '{a['archetype']}' (есть: {', '.join(K['archetypes'])})")
    if len(arch) < 3:
        iss.warn("story", "research.angles", f"архетипов углов {len(arch)} — попробуйте ≥ 3 разных (что если, слом закона, нечеловеческий взгляд, мост-метафора…)")
    ch = next((a for a in angles if a.get("id") == res.get("chosen_angle")), None)
    if ch:
        if not ch.get("paradox"):
            iss.warn("story", "research.chosen_angle", "у выбранного угла не назван парадокс (paradox) — без него угол безопасный и скучный")
        if any(x in str(ch.get("text") or "").lower() for x in K["lecture_angles"]):
            iss.warn("story", "research.chosen_angle", "угол звучит как лекция (обзор/факты/история создания) — для вымысла нужен парадокс, риск героя или слом реальности")
    hk = s.get("hooks") or {}
    prim = next((h for h in hk.get("variants") or [] if isinstance(h, dict) and h.get("id") == hk.get("primary")), None)
    if prim and prim.get("type") in K["weak_fiction_hooks"]:
        iss.warn("hook", "hooks.primary", f"крючок типа {prim['type']} звучит как лекция — для вымысла сильнее speculative, visual_shock, result_first, stakes")

    # series of equal parts
    se = st.get("series") or {}
    if se:
        part, of = se.get("part"), se.get("of")
        if not (isinstance(part, (int, float)) and isinstance(of, (int, float)) and 1 <= part <= of):
            iss.error("series", "story.series", "series: {name, part, of, prev, next} — part от 1 до of")
            return
        if part < of:
            if not any(b.get("role") in ("cliffhanger", "twist") for b in beats[-3:]):
                iss.warn("series", "beats", "часть серии без обрыва в конце — зритель не придёт за следующей")
            cta_vo = " ".join(b.get("vo") or "" for b in beats if b.get("role") in ("cta", "loop"))
            if "част" not in cta_vo.lower() and "серии" not in cta_vo.lower():
                iss.warn("series", "beats", "призыв не называет следующую часть («ответ — во второй части»)")
        if part > 1 and not se.get("answers"):
            iss.warn("series", "story.series.answers", "не указано, на какой вопрос/обрыв прошлой части отвечает эта")
        M["series"] = f"{int(part)}/{int(of)}"
        for k in ("prev", "next"):
            sib = se.get(k)
            if not sib:
                continue
            if not os.path.exists(model.script_path(sib)):
                iss.info("series", f"story.series.{k}", f"сценарий соседней части '{sib}' ещё не создан")
                continue
            if draft:
                continue
            try:
                other = timing.timeline(model.load(sib), sib, tts=tts)["total"]
            except Exception:              # noqa: BLE001 — a broken sibling must not break this check
                continue
            M[f"series_{k}"] = other
            if abs(other - total) > 0.06 * max(total, other):
                iss.warn("series", f"story.series.{k}", f"части неравные: эта {total:.1f} с, '{sib}' {other:.1f} с — выровняйте (±6%)")
