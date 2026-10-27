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
    model._text(iss, st, "story", "premise", "paradox", "genre", "tone", "logline", "retell", "pov")
    for key, fields in (("world_rules", ("id", "rule", "shown_in", "basis", "test")),
                        ("characters", ("id", "name", "role", "want", "fear", "flaw", "look", "arc", "intro")),
                        ("twists", ("id", "what", "payoff")),
                        ("dilemmas", ("id", "beat", "who", "question")),
                        ("stakes", ("beat", "level", "what"))):
        for i, x in enumerate(model._dicts(iss, st, key, "story")):
            model._text(iss, x, f"story.{key}[{i}]", *fields)
    for i, t in enumerate(st.get("twists") or []):
        if isinstance(t, dict) and t.get("setup") is not None and not isinstance(t["setup"], (str, list)):
            iss.error("schema", f"story.twists[{i}].setup", "setup: id блока или список id (подсказка посеяна несколько раз)")
    for i, d in enumerate(st.get("dilemmas") or []):
        if isinstance(d, dict) and d.get("options") is not None and not isinstance(d["options"], list):
            iss.error("schema", f"story.dilemmas[{i}].options", "options: список вариантов выбора")
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
        sus, po = t.get("setup"), t.get("payoff")
        sus = sus if isinstance(sus, list) else [sus] if sus else []
        if not sus:
            iss.error("story", w, "нет setup: поворот без подготовки — обман")
        if not po:
            iss.error("story", w, "нет payoff: поворот без выстрела — пустое ружьё")
        elif po not in idx:
            iss.error("ref", w, f"payoff: нет блока '{po}'")
        for su in sus:
            if su not in idx:
                iss.error("ref", w, f"setup: нет блока '{su}'")
            elif po in idx and idx[su] >= idx[po]:
                iss.error("story", w, f"подготовка ({su}) должна быть раньше выстрела ({po})")
        if po in idx and pos(po) < 0.4:
            iss.warn("story", w, "поворот срабатывает в первых 40% ролика — держите его ближе к концу")
        if t is tw[0] and len(sus) < 2 and not draft:
            iss.warn("story", w, "главная подсказка посеяна один раз — зритель её забудет: покажите улику 2–3 раза разными способами "
                                 "(слово → предмет → голос), тогда разгадка «щёлкает»")

    drama(s, iss, M, beats, idx, total, draft, chars)

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


_NUM = re.compile(r"\d|\b(один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|двенадцать|двадцать|тридцать|сорок|"
                  r"пятьдесят|сто|двести|триста|тысяч|минут|час|сутки|суток|дн|недел|метр|литр|шаг|раз)", re.I)


def _sents(text):
    return [x.strip() for x in re.split(r"(?<=[.!?…])\s+", text or "") if x.strip()]


def drama(s, iss, M, beats, idx, total, draft, chars):
    """Clarity and drama of an invented story (docs/SCRIPTING.md §14.6): logline and a short retell, scenes instead of
    summaries, characters introduced with a «passport», dialogue that clashes, a dilemma the viewer can vote on, a budget of
    new concepts per minute, rules tested on a character with a concrete consequence."""
    K = kb()
    D = K["drama"]
    st = s.get("story") or {}
    story_beats = [b for b in beats if b.get("role") not in ("hook", "cta", "loop")]
    all_vo = " ".join(b.get("vo") or "" for b in beats)

    # 1. clarity: logline + retell
    ll = str(st.get("logline") or "")
    if not ll or "TODO" in ll:
        iss.error("clarity", "story.logline", "нет логлайна: «<Герой, кто он> хочет/должен <цель>, но <препятствие>; если не успеет — <цена>». "
                                               "Не получается одной фразой — сюжета нет, зритель его тоже не поймёт")
    else:
        if not re.search(r"\b(но|однако|а)\b", ll.lower()):
            iss.warn("clarity", "story.logline", "в логлайне нет препятствия («…, но …») — без конфликта нет истории")
        if chars and norm_word(str(chars[0].get("name") or ""))[:4] not in " ".join(_vo_words(ll)):
            iss.warn("clarity", "story.logline", "логлайн не начинается с главного героя — история про человека, а не про явление")
    rt = str(st.get("retell") or "")
    if not rt or "TODO" in rt:
        iss.error("clarity", "story.retell", "нет пересказа: эта часть в 3 предложениях так, как зритель перескажет другу. "
                                              "Тест понятности — если пересказ требует больше, сюжет перегружен")
    else:
        n_s, n_w = len(_sents(rt)), len(_vo_words(rt))
        if n_s > D["retell_sentences"] or n_w > D["retell_words"]:
            iss.warn("clarity", "story.retell", f"пересказ — {n_s} предл., {n_w} слов (норма ≤ {D['retell_sentences']} и ≤ {D['retell_words']}): "
                                                 "сюжет не помещается в пересказ — уберите линии и понятия, оставьте одну")

    # 2. concept budget: new rules, named people, twists per minute
    named = [c for c in chars if norm_word(str(c.get("name") or ""))[:4] in " ".join(_vo_words(all_vo))]
    load = len(st.get("world_rules") or []) + len(named) + len(st.get("twists") or [])
    mins = max(0.5, total / 60) if not draft else max(0.5, float((s.get("meta") or {}).get("duration") or 60) / 60)
    M["concepts_per_min"] = round(load / mins, 1)
    if load / mins > D["concepts_per_min"]:
        iss.warn("clarity", "story", f"перегруз: {load} новых сущностей (правил мира, названных героев, поворотов) на {mins:.1f} мин "
                                     f"= {load / mins:.1f}/мин, норма ≤ {D['concepts_per_min']}. Зритель не успевает понять — "
                                     "уберите лишнее или дайте части больше времени (сюжетной части нужно 90–150 с)")
    if len(st.get("world_rules") or []) > D["rules_per_part"] and (st.get("series") or {}):
        iss.warn("clarity", "story.world_rules", f"в одной части {len(st['world_rules'])} новых правил мира — в серии вводите ≤ {D['rules_per_part']} "
                                                  "на часть, остальные — в следующих частях")

    # 3. rules are tested on a character with a concrete consequence
    for r in st.get("world_rules") or []:
        w = f"story.world_rules.{r.get('id')}"
        tst = str(r.get("test") or "")
        if not tst:
            iss.warn("rule", w, "у правила нет проверки (test): кто из героев его нарушает или соблюдает и что происходит — "
                                "правило, которое не проверили на человеке, остаётся абстракцией")
        elif not _NUM.search(tst + " " + str(r.get("rule") or "")):
            iss.warn("rule", w, "правило без конкретики — нет числа, срока или меры («семь минут», «два литра в день», «один шаг»): "
                                "зритель должен уметь «посчитать» по правилу сам")

    # 4. characters arrive with a passport: name + who they are (age/role) + one concrete trait
    for c in named:
        w = f"story.characters.{c.get('id') or c.get('name')}"
        if not c.get("intro"):
            iss.warn("cast", w, f"не задан паспорт героя (intro): «{c.get('name')}, <возраст>, <кто он>. <одна деталь/поступок>» — "
                                "иначе зритель не отличит героев")
            continue
        first = next((b for b in beats if norm_word(str(c.get("name")))[:4] in " ".join(_vo_words(b.get("vo") or ""))), None)
        if first and not draft:
            iv = set(_vo_words(c["intro"]))
            fv = set(_vo_words(first.get("vo") or ""))
            if len(iv & fv) < max(2, len(iv) // 3):
                iss.warn("cast", w, f"паспорт героя не звучит при первом появлении (блок {first.get('id')}): назовите имя, кто он и одну деталь")

    # 5. scenes, not summaries
    with_scene = [b for b in story_beats if isinstance(b.get("scene"), dict) and (b["scene"].get("where") or b["scene"].get("when"))]
    if story_beats and len(with_scene) / len(story_beats) < D["scene_share"] and not draft:
        iss.warn("scene", "beats", f"сцена (scene: {{when, where}}) задана у {len(with_scene)} из {len(story_beats)} сюжетных блоков — "
                                   "каждый блок — это сцена: где и когда, кто действует сейчас, что меняется («День третий. Убежище. Кирилл стучит по баку»)")
    for b in story_beats:
        vo = b.get("vo") or ""
        hits = _hits(vo, D["summary_cues"])
        if hits:
            iss.warn("scene", f"beats.{b.get('id')}", "пересказ вместо сцены: " + ", ".join(f"«{x}…»" for x in hits)
                     + " — покажите момент, когда это происходит, глазами героя (действие, реплика, звук), а не итог")

    # 6. dialogue: characters speak, lines clash
    ids = {c.get("id") for c in chars}
    lines, exch = 0, 0
    for b in beats:
        ls = [x for x in b.get("lines") or [] if isinstance(x, dict)]
        who = {x.get("who") for x in ls}
        if len(who) >= 2:
            exch += 1
        vo_n = " ".join(_vo_words(b.get("vo") or ""))
        for x in ls:
            lines += 1
            w = f"beats.{b.get('id')}.lines"
            if x.get("who") not in ids:
                iss.error("ref", w, f"реплика героя '{x.get('who')}' — нет такого id в story.characters")
            say = " ".join(_vo_words(str(x.get("say") or "")))
            if say and say not in vo_n:
                iss.error("dialogue", w, f"реплика «{x.get('say')}» не входит в текст диктора (vo) этого блока — впишите её дословно")
            if len(say.split()) > D["line_words"]:
                iss.warn("dialogue", w, f"реплика длиннее {D['line_words']} слов — в живой речи говорят коротко: «Семь минут. Закрываю.»")
    M["dialogue_lines"] = lines
    if lines < D["min_lines"]:
        iss.warn("dialogue", "beats", f"реплик героев {lines} (нужно ≥ {D['min_lines']}, beats[].lines: [{{who, say}}]) — без живой речи "
                                     "персонажи остаются фигурками, а сюжет — пересказом")
    elif exch < D["min_exchanges"]:
        iss.warn("dialogue", "beats", f"обменов репликами {exch} (нужно ≥ {D['min_exchanges']}): в споре двух героев зритель видит выбор и характеры")

    # 7. a dilemma the viewer can take a side on, and the call asks exactly that
    dl = [d for d in st.get("dilemmas") or [] if isinstance(d, dict)]
    M["dilemmas"] = len(dl)
    if not dl:
        iss.warn("dilemma", "story.dilemmas", "нет дилеммы: момент, где герой выбирает между двумя плохими вариантами "
                                             "(открыть дверь — впустить заражённый воздух; не открыть — человек умрёт). Выбор с ценой = драйв")
    for d in dl:
        w = f"story.dilemmas.{d.get('id')}"
        if d.get("beat") and d["beat"] not in idx:
            iss.error("ref", w, f"нет блока '{d['beat']}'")
        if len(d.get("options") or []) < 2:
            iss.warn("dilemma", w, "дилемма без двух вариантов (options) и их цены")
    cta = " ".join(b.get("vo") or "" for b in beats if b.get("role") in ("cta", "loop")).lower()
    if cta and not any(c in cta for c in D["choice_cues"]):
        iss.warn("dilemma", "beats", "финальный вопрос не просит зрителя выбрать или предположить («А вы бы открыли?», «Кто должен был идти?», "
                                     "«Куда ушёл …? Пишите версии») — «ответ в следующей части» не даёт повода написать комментарий")
