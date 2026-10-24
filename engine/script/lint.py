"""Quality rules for scripts: timing, hook, visual rhythm, retention, engagement, facts, TTS pitfalls, visuals,
platform packaging and self-review. Produces findings + metrics + a readiness score (0–100).

Thresholds are deliberately strict: a script that passes with 0 errors and few warnings is ready for production.
"""
import re

from . import model, timing
from ..common import norm_word

NUM_WORDS = re.compile(r"\b(ноль|один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|"
                       r"\w*надцать|двадцать\w*|тридцать\w*|сорок\w*|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|"
                       r"сто|сотн\w*|двести|триста|четыреста|\w*сот|тысяч\w*|миллион\w*|миллиард\w*|процент\w*|половин\w*|"
                       r"треть\w*|четверт\w*|\w+сот\w*|\w*двух|\w*трёх|\w*трех|\w*четырёх|\w*пяти|\w*шести|\w*семи|\w*восьми|\w*девяти|\w*десяти)\b", re.I)
ASKS = re.compile(r"подпиш|лайк|сохран|поделись|отправь|перешли|комментар|пиши|напиши|ставь|жми", re.I)


def _sentences(text):
    return [x.strip() for x in re.split(r"(?<=[.!?…])\s+", text.strip()) if x.strip()]


def run(s, pid=None, tts=False):
    iss = model.Issues()
    refs = model.validate(s, iss)
    meta, brief = s.get("meta") or {}, s.get("brief") or {}
    dur = meta.get("duration", 60)
    target = float(dur) if isinstance(dur, (int, float)) and not isinstance(dur, bool) else 60.0
    plats = meta.get("platforms") or ["tiktok", "reels", "shorts"]
    beats = [b for b in (s.get("beats") or []) if isinstance(b, dict)] if isinstance(s.get("beats"), list) else []
    for i, b in enumerate(beats):         # wrong types are schema errors (model.validate); keep the rules running
        if not b.get("id"):
            b["id"] = f"beat{i + 1}"
        if not isinstance(b.get("vo"), str):
            b["vo"] = ""
        if not isinstance(b.get("shots"), list):
            b["shots"] = []
    tl = timing.timeline(s, pid, tts=tts)
    by_id = {b["id"]: b for b in tl["beats"]}
    total = tl["total"]
    roles = model.roles()
    M = {"total": total, "target": target, "timing": tl["source"]}

    # ------------------------------------------------------------------ unfilled fields
    todo = model.todos(s)
    M["todo"] = len(todo)
    sections = {}
    for p in todo:
        sections.setdefault(p.split(".")[0].split("[")[0], []).append(p)
    for sec, paths in sections.items():
        iss.error("todo", sec, f"не заполнено полей: {len(paths)} — " + ", ".join(paths[:6]) + (" …" if len(paths) > 6 else ""))
    # timing-based rules make no sense until every beat has its voice text
    draft = any("TODO" in str(b.get("vo") or "TODO") for b in beats) or not beats
    if draft:
        iss.info("todo", "beats", "текст диктора заполнен не во всех блоках — проверки времени, темпа и ритма пропущены")

    # ------------------------------------------------------------------ duration
    lo, hi = target * 0.88, target * 1.12
    if not draft and not lo <= total <= hi:
        sev = "error" if not target * 0.7 <= total <= target * 1.3 else "warn"
        iss.add(sev, "duration", "meta.duration", f"длительность ≈ {total:.1f} с при цели {target:.0f} с (норма {lo:.0f}–{hi:.0f} с): "
                + ("сократите текст" if total > hi else "добавьте содержания"))
    if "tiktok" in plats and "monetization" in (brief.get("kpi") or []) and total < 61:
        iss.warn("monetize", "meta.duration", "для монетизации TikTok (Creator Rewards) ролик должен быть длиннее 60 с")

    # ------------------------------------------------------------------ hook
    if beats:
        b0 = beats[0]
        if b0.get("role") != "hook":
            iss.error("hook", f"beats.{b0.get('id')}", "первый блок должен иметь роль hook")
        first = _sentences(b0.get("vo") or "")
        if first and tl["beats"] and not draft:
            n = len(first[0].split())
            ws = tl["beats"][0]["words"]
            t_end = ws[min(n, len(ws)) - 1]["end"] if ws else 0
            M["hook_end"] = t_end
            if t_end > 4.5:
                iss.error("hook", f"beats.{b0.get('id')}", f"первая фраза заканчивается на {t_end:.1f} с — крючок должен звучать за ≤ 3 с")
            elif t_end > 3.2:
                iss.warn("hook", f"beats.{b0.get('id')}", f"первая фраза заканчивается на {t_end:.1f} с — сократите до ≤ 3 с")
            low = (b0.get("vo") or "").lower()
            for bad in model.kb("hooks")["banned_openers"]:
                if re.match(rf"\W*{re.escape(bad)}\b", low):
                    iss.error("hook", f"beats.{b0.get('id')}", f"начало «{bad}…» — приветствия и вступления убивают удержание")
        hk = s.get("hooks") or {}
        variants = list(refs["hooks"].values())
        if len(variants) < 8:
            iss.warn("hooks", "hooks.variants", f"вариантов крючка {len(variants)} — нужно ≥ 8 разных")
        if len({h.get("type") for h in variants}) < 4:
            iss.warn("hooks", "hooks.variants", "нужно ≥ 4 разных типов крючков")
        if not hk.get("primary"):
            iss.error("hooks", "hooks.primary", "не выбран основной крючок")
        elif hk["primary"] in refs["hooks"]:
            pv = norm_word(" ".join(refs["hooks"][hk["primary"]]["vo"].split()[:4]))
            if not norm_word(" ".join((b0.get("vo") or "").split()[:4])).startswith(pv[:12]):
                iss.warn("hooks", "hooks.primary", "текст первого блока не начинается с выбранного крючка")
        if len(hk.get("ab") or []) < 2:
            iss.warn("hooks", "hooks.ab", "оставьте 2 альтернативных крючка для A/B-теста")
        if not b0.get("on_screen"):
            iss.warn("hook", f"beats.{b0.get('id')}", "нет текста на экране в первом блоке (без звука смотрят многие)")
        kw = (brief.get("keywords") or [None])[0]
        if kw:
            k = norm_word(kw)
            if k and k not in norm_word(b0.get("vo") or "") and not any(k[:5] in w["norm"] for w in (tl["beats"][0]["words"] if tl["beats"] else [])[:14]):
                iss.warn("seo", f"beats.{b0.get('id')}", f"главное ключевое слово «{kw}» не звучит в первой фразе")
    else:
        M["hook_end"] = None

    # ------------------------------------------------------------------ beats: pace, facts, TTS pitfalls, visuals
    actors = model.actor_names(pid)
    sounds, ambiences = model.sound_names()
    new_actors, new_sounds = set(), set()
    events = []          # (time, kind, where)
    for b in beats:
        bid = b.get("id")
        tb = by_id.get(bid)
        w = f"beats.{bid}"
        vo = b.get("vo") or ""
        filled = "TODO" not in vo
        if tb and filled and not draft:
            nw = len(tb["words"])
            pace = nw / max(0.1, tb["speech"])
            if pace > 3.4:
                iss.warn("pace", w, f"темп {pace:.1f} слов/с — слишком плотно, зритель не успевает")
            if tb["end"] - tb["start"] > 14 and len(b.get("shots") or []) < 4:
                iss.warn("pace", w, f"блок {tb['end'] - tb['start']:.0f} с с {len(b.get('shots') or [])} кадрами — разбейте на кадры/блоки")
        for sent in _sentences(vo) if filled else []:
            if len(sent.split()) > 14:
                iss.warn("sentence", w, f"длинное предложение ({len(sent.split())} слов): «{sent[:60]}…» — делите на 2")
        if not filled:
            pass
        elif re.search(r"\d", vo):
            iss.warn("tts", w, "цифры в тексте диктора — пишите числа словами в нужном падеже (TTS ошибается в склонениях)")
        if filled and re.search(r"[A-Za-z]{2,}", vo):
            iss.warn("tts", w, "латиница в тексте диктора — напишите кириллицей, как произносится")
        if filled and re.search(r"\b[А-ЯЁ]{2,}\b", vo):
            iss.warn("tts", w, "аббревиатура в тексте диктора — проверьте произношение или раскройте")
        if filled and (re.search(r"\d", vo) or NUM_WORDS.search(vo)) and not b.get("facts") and roles.get(b.get("role"), {}).get("reward"):
            iss.warn("facts", w, "в тексте есть числа, но блок не ссылается на факты (facts: [...]) — проверьте источник")
        for f in b.get("facts") or []:
            ff = refs["facts"].get(f)
            if ff and ff.get("confidence") == "low":
                iss.warn("facts", w, f"факт {f} с низкой уверенностью — перепроверьте или смягчите формулировку")
        if b.get("on_screen") and len(str(b["on_screen"]).split()) > 7:
            iss.warn("text", w, "текст на экране длиннее 7 слов — сократите до 2–5")
        shots = [sh for sh in b.get("shots") or [] if isinstance(sh, dict)]
        starts = [timing.resolve(sh.get("at") if j else None, bid, by_id) for j, sh in enumerate(shots)]
        for j, sh in enumerate(shots):
            sw = f"{w}.{sh.get('id')}"
            t0, err = starts[j]
            if err:
                iss.error("anchor", sw, f"at: {err}")
                t0 = None
            elif t0 is not None:
                events.append((t0, "shot", sw))
            t1 = next((x[0] for x in starts[j + 1:] if x[0] is not None), tb["end"] if tb else None)
            if t0 is not None and t1 is not None and not draft:
                if j and starts[j - 1][0] is not None and t0 <= starts[j - 1][0]:
                    iss.error("shots", sw, "кадр начинается не позже предыдущего — проверьте at")
                elif t1 - t0 < 0.6:
                    iss.warn("shots", sw, f"кадр длится {t1 - t0:.2f} с — зритель не успеет его разглядеть (нужно ≥ 0.6 с, с надписью ≥ 1 с)")
            for a in sh.get("actors") or []:
                a = str(a)
                if a.startswith("new:"):
                    new_actors.add(a[4:])
                elif a.startswith("hud:"):
                    if a[4:] not in model.HUD_COMPONENTS:
                        iss.error("actor", sw, f"нет HUD-компонента '{a[4:]}'")
                elif a not in actors:
                    iss.error("actor", sw, f"нет актёра '{a}' — выберите из `vg.py actors` или пометьте new:{a}")
            if meta.get("style", "draw") == "draw" and not sh.get("actors"):
                iss.warn("visual", sw, "draw-кадр без актёров — из чего он будет нарисован?")
            for key in ("animation", "graphics", "sfx"):
                for ev in sh.get(key) or []:
                    if not isinstance(ev, dict):
                        continue
                    t, err = timing.resolve(ev.get("at"), bid, by_id)
                    if err:
                        iss.error("anchor", f"{sw}.{key}", f"at: {err}")
                    elif not draft and t0 is not None and t1 is not None and not t0 - 0.05 <= t <= t1 + 0.05:
                        iss.warn("shots", f"{sw}.{key}", f"событие at: {ev.get('at')} ({timing.fmt(t)}) вне своего кадра "
                                                         f"({timing.fmt(t0)}–{timing.fmt(t1)}) — перенесите в нужный кадр")
                    elif key != "sfx" and t is not None:
                        events.append((t, key, sw))
                    if key == "graphics" and ev.get("text") and len(str(ev["text"]).split()) > 7:
                        iss.warn("text", f"{sw}.graphics", f"надпись «{ev['text']}» длиннее 7 слов")
                    if key == "sfx":
                        snd = str(ev.get("sound") or "")
                        if not snd:
                            iss.error("sound", f"{sw}.sfx", "нет имени звука (sound)")
                        elif snd.startswith("new:"):
                            new_sounds.add(snd[4:])
                        elif snd not in sounds:
                            iss.error("sound", f"{sw}.sfx", f"нет звука '{snd}' в движке (есть: {', '.join(sorted(sounds))}) или пометьте new:{snd}")
            amb = sh.get("ambience")
            for a in ([amb] if isinstance(amb, str) else amb or []):
                name = a.get("sound") if isinstance(a, dict) else a
                if name and name not in ambiences:
                    iss.error("sound", f"{sw}.ambience", f"нет фона '{name}' (есть: {', '.join(sorted(ambiences))})")
    for a in sorted(new_actors):
        iss.info("assets", "shots", f"нужен новый актёр: {a} (дописать в projects/<id>/actors или библиотеку)")
    for a in sorted(new_sounds):
        iss.info("assets", "shots", f"нужен новый звук: {a} (дописать в engine/audio.py)")
    M["new_actors"] = sorted(new_actors)
    if not any(b.get("music") for b in beats):
        iss.warn("music", "beats", "музыка не продумана: укажите music у блоков (смена стиля = смена настроения)")
    elif len({b.get("music") for b in beats if b.get("music")}) < 2:
        iss.info("music", "beats", "один стиль музыки на весь ролик — смена на повороте/развязке усиливает ритм")
    kw = (brief.get("keywords") or [None])[0]
    if not kw:
        iss.warn("seo", "brief.keywords", "нет ключевых слов: первое — главное поисковое слово темы")
    else:
        k5 = norm_word(kw)[:5]
        screen = " ".join([str(b.get("on_screen") or "") for b in beats] +
                          [str(ev.get("text") or "") for b in beats for sh in (b.get("shots") or []) if isinstance(sh, dict)
                           for ev in (sh.get("graphics") or []) if isinstance(ev, dict)])
        if k5 and k5 not in norm_word(screen):
            iss.warn("seo", "beats", f"ключевое слово «{kw}» ни разу не появляется текстом на экране")

    # ------------------------------------------------------------------ visual rhythm
    events.sort()
    M["events"] = events
    times = sorted({round(e[0], 2) for e in events})
    M["visual_events"] = len(times)
    if draft:
        pass
    elif times:
        M["first_visual"] = times[0]
        early = [t for t in times if t <= 1.5]
        if len(early) < 2:
            iss.warn("rhythm", "beats", "в первые 1.5 с меньше двух визуальных событий — первый кадр должен ожить сразу (анимация/текст на слове крючка)")
        pts = [0.0] + times + [total]
        gaps = [(pts[i + 1] - pts[i], pts[i]) for i in range(len(pts) - 1)]
        mg, at = max(gaps)
        M["max_static"] = mg
        M["events_per_10s"] = 10 * len(times) / max(1, total)
        long = [(g, t) for g, t in gaps if g > 3.5]
        for g, t in long[:6]:
            where = next((e[2] for e in reversed(events) if e[0] <= t + 0.01), "beats")
            iss.warn("rhythm", where, f"{g:.1f} с без визуальных событий с {timing.fmt(t)} — добавьте смену кадра/графику/движение (норма ≤ 3 с)")
        if M["events_per_10s"] < 3:
            iss.warn("rhythm", "beats", f"мало визуальных событий: {M['events_per_10s']:.1f} на 10 с (норма ≥ 3–4)")
    else:
        iss.error("rhythm", "beats", "нет ни одного визуального события (кадры/анимация/графика)")

    # ------------------------------------------------------------------ structure & retention
    fmt = model.formats().get(meta.get("format"))
    have = [b.get("role") for b in beats]
    if fmt:
        for r in fmt.get("required") or []:
            if r not in have:
                iss.error("structure", "beats", f"в формате «{fmt['name']}» нужен блок с ролью {r}")
    rew = [by_id[b["id"]]["start"] for b in beats if b.get("id") in by_id and roles.get(b.get("role"), {}).get("reward")]
    if rew and not draft:
        pts = [0.0] + rew + [total]
        mg = max(pts[i + 1] - pts[i] for i in range(len(pts) - 1))
        M["max_no_reward"] = mg
        if mg > 18:
            iss.warn("retention", "beats", f"{mg:.0f} с без новой «награды» (факт/шаг/поворот) — держите ритм 10–15 с")
    elif not rew:
        iss.error("retention", "beats", "нет ни одного блока-награды (point/step/proof/twist/reveal/payoff…)")
    if draft:
        idx = {b.get("id"): i / max(1, len(beats)) for i, b in enumerate(beats)}
        pos = lambda bid: idx.get(bid, 0)
    else:
        pos = lambda bid: by_id[bid]["start"] / max(1, total) if bid in by_id else 0
    late = [b for b in beats if b.get("role") in ("payoff", "reveal", "twist", "recap") and pos(b.get("id")) >= 0.45]
    if not late:
        iss.error("retention", "beats", "нет развязки/раскрытия/поворота/сводки во второй половине — нечем наградить за досмотр")
    loops = s.get("loops") or []
    M["loops"] = len(loops)
    opened_early, late_close = False, False
    for lp in loops:
        if not isinstance(lp, dict) or lp.get("open") not in by_id or lp.get("close") not in by_id:
            continue
        o, c = by_id[lp["open"]]["start"], by_id[lp["close"]]["start"]
        if c <= o:
            iss.error("loops", f"loops.{lp.get('id')}", "петля закрывается раньше, чем открывается")
        if o <= 8 or (draft and lp["open"] == (beats[0].get("id") if beats else None)):
            opened_early = True
        if c >= total * 0.5:
            late_close = True
    if loops and not late_close and not draft:
        iss.warn("loops", "loops", "все петли закрываются в первой половине — оставьте хотя бы один вопрос открытым до второй половины")
    if not opened_early:
        iss.warn("loops", "loops", "нет открытой петли в первые 8 с (вопрос/обещание, ответ на которое будет позже)")
    used = {d for b in beats for d in (b.get("devices") or [])}
    M["devices"] = len(used)
    if len(used) < 5:
        iss.warn("devices", "beats", f"использовано приёмов удержания: {len(used)} — нужно ≥ 5 разных")
    if "pattern_interrupt" not in used:
        iss.info("devices", "beats", "pattern_interrupt не отмечен ни в одном блоке")

    # ------------------------------------------------------------------ engagement
    eng = s.get("engagement") or {}
    if not eng.get("comment"):
        iss.error("engage", "engagement.comment", "нет повода для комментария")
    elif "TODO" not in eng["comment"] and "?" not in eng["comment"] and " или " not in eng["comment"].lower():
        iss.warn("engage", "engagement.comment", "повод для комментария — конкретный вопрос или выбор («да или нет?»)")
    for k in ("share", "save", "rewatch", "follow"):
        if not eng.get(k):
            iss.warn("engage", f"engagement.{k}", f"не продуман повод: {k}")
    cta = eng.get("cta") or {}
    if not cta:
        iss.error("engage", "engagement.cta", "нет призыва к действию (cta: {beat, text, type})")
    elif cta.get("beat") in by_id:
        cb = by_id[cta["beat"]]
        M["cta_at"] = cb["start"]
        if cb["start"] < total * 0.7 and not draft:
            iss.warn("engage", "engagement.cta", f"призыв на {cb['start']:.0f} с — ставьте в последние 25–30%")
        txt = next((b.get("vo") or "" for b in beats if b.get("id") == cta["beat"]), "")
        asks = len(set(m.group(0).lower()[:5] for m in ASKS.finditer(txt)))
        if asks > 2:
            iss.warn("engage", f"beats.{cta['beat']}", "слишком много просьб в призыве — оставьте одну главную")
    if beats and beats[-1].get("role") not in ("cta", "loop", "payoff", "recap"):
        iss.warn("ending", f"beats.{beats[-1].get('id')}", "ролик заканчивается не призывом/петлёй/развязкой")

    # ------------------------------------------------------------------ research
    res = s.get("research") or {}
    facts = [f for f in res.get("facts") or [] if isinstance(f, dict)]
    real = [f for f in facts if f.get("source") and "TODO" not in f"{f.get('text')} {f.get('source')}"]
    M["facts"] = len(real)
    if len(real) < 4:
        iss.warn("research", "research.facts", f"фактов с источниками: {len(real)} — нужно ≥ 4 (тема должна быть изучена)")
    for f in facts:
        if not f.get("source"):
            iss.error("research", f"research.facts.{f.get('id')}", "факт без источника")
        elif "TODO" not in str(f["source"]) and not re.search(r"https?://", str(f["source"])):
            iss.warn("research", f"research.facts.{f.get('id')}", "источник без ссылки — добавьте URL, чтобы факт можно было перепроверить")
    used_facts = {x for b in beats for x in (b.get("facts") or [])}
    unused = [f.get("id") for f in real if f.get("id") not in used_facts]
    if real and len(unused) == len(real):
        iss.warn("research", "research.facts", "ни один факт не использован в блоках (beats[].facts)")
    if len(res.get("angles") or []) < 3:
        iss.warn("research", "research.angles", "рассмотрите ≥ 3 угла подачи темы и выберите лучший")
    if not res.get("chosen_angle"):
        iss.warn("research", "research.chosen_angle", "не выбран угол подачи")

    # ------------------------------------------------------------------ packaging
    pk = s.get("package") or {}
    lim = {k: v.get("limits", {}) for k, v in model.platforms().items()}
    for p in plats:
        pp = pk.get(p)
        if not isinstance(pp, dict):
            iss.warn("package", f"package.{p}", f"нет упаковки для {p} (подпись, хэштеги, обложка)")
            continue
        L = lim.get(p, {})
        cap = pp.get("caption") or pp.get("description") or ""
        if L.get("caption_max") and len(cap) > L["caption_max"]:
            iss.error("package", f"package.{p}.caption", f"подпись {len(cap)} символов > {L['caption_max']}")
        if p == "tiktok" and cap:
            kw = (brief.get("keywords") or [None])[0]
            if kw and norm_word(kw)[:5] not in norm_word(cap[:L.get("caption_visible", 100)]):
                iss.warn("seo", "package.tiktok.caption", f"ключевое слово «{kw}» не в первых {L.get('caption_visible', 100)} символах подписи")
        tags = pp.get("hashtags") or []
        if L.get("hashtags_max") and len(tags) > L["hashtags_max"]:
            iss.error("package", f"package.{p}.hashtags", f"хэштегов {len(tags)} > {L['hashtags_max']} (лимит площадки)")
        elif L.get("hashtags") and not L["hashtags"][0] <= len(tags) <= L["hashtags"][1]:
            iss.warn("package", f"package.{p}.hashtags", f"хэштегов {len(tags)}, рекомендуется {L['hashtags'][0]}–{L['hashtags'][1]}")
        if p == "shorts":
            title = pp.get("title") or ""
            if not title:
                iss.warn("package", "package.shorts.title", "нет заголовка Shorts")
            elif len(title) > L.get("title_max", 100):
                iss.error("package", "package.shorts.title", f"заголовок {len(title)} символов > {L.get('title_max', 100)}")
        if pp.get("cover") and len(str(pp["cover"]).split()) > 6:
            iss.warn("package", f"package.{p}.cover", "текст обложки длиннее 6 слов")
    if not pk.get("first_frame"):
        iss.warn("package", "package.first_frame", "не описан первый кадр (он же превью в ленте и профиле)")

    # ------------------------------------------------------------------ self-review
    rv = (s.get("review") or {}).get("scores") or {}
    need = ["hook", "clarity", "pacing", "novelty", "emotion", "payoff", "visuals", "cta", "platform", "accuracy"]
    missing = [k for k in need if k not in rv]
    if missing:
        iss.warn("review", "review.scores", f"нет самооценки по: {', '.join(missing)}")
    nums = [v for v in rv.values() if isinstance(v, (int, float))]
    if not any(nums):
        iss.error("review", "review.scores", "самооценка не проведена: оцените каждый аспект 1–10 честно, после проверки")
    else:
        for k, v in rv.items():
            if isinstance(v, (int, float)) and v < 7:
                iss.warn("review", f"review.scores.{k}", f"оценка {k} = {v} < 7 — улучшите этот аспект")
    if any(nums):
        M["review_avg"] = sum(nums) / len(nums)

    # ------------------------------------------------------------------ score
    e, wn = iss.count("error"), iss.count("warn")
    M["score"] = max(0, round(100 - 12 * e - 3 * wn))
    M["ready"] = e == 0 and wn <= 3
    return iss, M, tl
