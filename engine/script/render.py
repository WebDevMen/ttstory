"""`vg.py script render`: the full script document (projects/<id>/script.md) — brief, research with sources, hook lab,
second-by-second script (voice, on-screen text, shots, animation, graphics, sound, transitions), retention map,
engagement, platform packages, production notes, self-review with the checker's findings, and the clean voice text."""
from . import model, timing

BAR = " ▁▂▃▄▅▆▇█"
SEV = {"error": "✗", "warn": "!", "info": "·"}
CONF = {"high": "высокая", "medium": "средняя", "low": "низкая"}


def esc(v):
    """Text for a Markdown table cell."""
    if v is None:
        return ""
    if isinstance(v, (list, tuple)):
        v = ", ".join(str(x) for x in v)
    return str(v).replace("|", "\\|").replace("\n", " ").strip()


def link(src):
    src = str(src or "").strip()
    if src.startswith("http"):
        host = src.split("/")[2].replace("www.", "")
        return f"[{host}]({src})"
    return esc(src)


def lst(v):
    if not v:
        return "—"
    if isinstance(v, (list, tuple)):
        return "; ".join(str(x) for x in v)
    return str(v)


def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "|".join("---" for _ in head) + "|"]
    out += ["| " + " | ".join(esc(c) if not isinstance(c, Raw) else c for c in r) + " |" for r in rows]
    return out


class Raw(str):
    """Pre-formatted cell (links)."""


def shot_plan(s, tl):
    """Per beat: shots with absolute start/end and their timed events."""
    by_id = {b["id"]: b for b in tl["beats"]}
    plan = {}
    for b in s.get("beats") or []:
        bid = b.get("id")
        if bid not in by_id or not isinstance(b.get("shots"), list):
            continue
        shots = []
        for j, sh in enumerate(b["shots"]):
            if not isinstance(sh, dict):
                continue
            t0, _ = timing.resolve(sh.get("at") if j else None, bid, by_id)
            evs = []
            for key, label in (("animation", "анимация"), ("graphics", "графика"), ("sfx", "звук")):
                for ev in sh.get(key) or []:
                    if not isinstance(ev, dict):
                        continue
                    t, _ = timing.resolve(ev.get("at"), bid, by_id)
                    if key == "animation":
                        what = ev.get("what") or ""
                    elif key == "graphics":
                        what = f"{ev.get('type') or 'текст'} «{ev.get('text') or ''}»" + (f" — {ev['note']}" if ev.get("note") else "")
                    else:
                        what = f"{ev.get('sound')}" + (f" — {ev['note']}" if ev.get("note") else "")
                    evs.append((t, label, what, ev.get("at")))
            shots.append({"sh": sh, "start": t0, "events": sorted(evs, key=lambda e: (e[0] is None, e[0] or 0))})
        for j, x in enumerate(shots):
            nxt = shots[j + 1]["start"] if j + 1 < len(shots) else None
            x["end"] = nxt if nxt is not None else by_id[bid]["end"]
        plan[bid] = shots
    return plan


def tm(t):
    return timing.fmt(t) if isinstance(t, (int, float)) else "?"


def density(events, total, step=2.0):
    n = max(1, int(total // step) + 1)
    c = [0] * n
    for t, *_ in events:
        if 0 <= t <= total:
            c[min(n - 1, int(t // step))] += 1
    top = max(c) or 1
    return "".join(BAR[min(8, round(8 * x / top))] if x else "·" for x in c)


def run(s, iss, M, tl, pid):
    meta, brief, res = s.get("meta") or {}, s.get("brief") or {}, s.get("research") or {}
    fmts, roles, devs, htypes = model.formats(), model.roles(), model.devices(), model.hook_types()
    fmt = fmts.get(meta.get("format"), {})
    plats = meta.get("platforms") or []
    pnames = {k: v["name"] for k, v in model.platforms().items()}
    by_id = {b["id"]: b for b in tl["beats"]}
    beats = [b for b in s.get("beats") or [] if isinstance(b, dict)]
    plan = shot_plan(s, tl)
    total = tl["total"]
    o = []
    w = o.append

    # ------------------------------------------------------------------ title & passport
    w(f"# {meta.get('title') or pid}")
    w("")
    w(f"> {meta.get('topic', '')}  ")
    w(f"> Формат «{fmt.get('name', meta.get('format'))}» · {', '.join(pnames.get(p, p) for p in plats)} · "
      f"цель {meta.get('duration', 60)} с · графика: {meta.get('style', 'draw')} · голос {tl['voice']['voice']} {tl['voice']['rate']} · "
      f"статус: {meta.get('status', 'draft')}")
    if meta.get("wishes"):
        w(f">  \n> Пожелания: {meta['wishes']}")
    w("")
    ready = "✅ готов к производству" if M.get("ready") else "⛔ нужна доработка"
    src = "по реальной озвучке" if tl["source"] == "tts" else "оценка по тексту"
    rows = [
        ["Готовность", f"**{M.get('score', 0)}/100** — {ready} (ошибок {iss.count('error')}, предупреждений {iss.count('warn')})"],
        ["Длительность", f"{total:.1f} с при цели {M.get('target', 60):.0f} с ({src})"],
        ["Крючок", f"первая фраза звучит до {M['hook_end']:.1f} с" if M.get("hook_end") is not None else "—"],
        ["Визуальный ритм", f"{M.get('visual_events', 0)} событий, {M.get('events_per_10s', 0):.1f} на 10 с, самая долгая пауза {M.get('max_static', 0):.1f} с"],
        ["Награды", f"максимум {M.get('max_no_reward', 0):.0f} с без новой награды"],
        ["Удержание", f"петель: {M.get('loops', 0)}, приёмов: {M.get('devices', 0)}"],
        ["Факты", f"{M.get('facts', 0)} с источниками"],
    ]
    if M.get("review_avg") is not None:
        rows.append(["Самооценка", f"{M['review_avg']:.1f}/10"])
    o += table(["", ""], rows)
    w("")

    # ------------------------------------------------------------------ 1. brief
    aud = brief.get("audience") or {}
    w("## 1. Бриф")
    w("")
    w(f"- **Цель:** {brief.get('goal', '—')}")
    w(f"- **KPI:** {lst(brief.get('kpi'))}")
    w(f"- **Аудитория:** {aud.get('who', '—')}" + (f", {aud['age']}" if aud.get("age") else ""))
    for k, label in (("interests", "интересы"), ("pains", "боли и страхи"), ("desires", "желания"), ("knowledge", "что уже знают")):
        if aud.get(k):
            w(f"  - {label}: {lst(aud[k])}")
    w(f"- **Обещание зрителю:** {brief.get('promise', '—')}")
    w(f"- **Тон:** {brief.get('tone', '—')}")
    w(f"- **Ключевые слова:** {lst(brief.get('keywords'))}")
    if brief.get("constraints"):
        w(f"- **Ограничения и допущения:** {lst(brief['constraints'])}")
    w("")

    # ------------------------------------------------------------------ 2. research
    w("## 2. Исследование")
    w("")
    if res.get("summary"):
        w(str(res["summary"]).strip())
        w("")
    facts = [f for f in res.get("facts") or [] if isinstance(f, dict)]
    if facts:
        w("### Факты")
        w("")
        o += table(["#", "Факт", "Уверенность", "Источник"],
                   [[f.get("id"), f.get("text"), CONF.get(f.get("confidence", "medium"), f.get("confidence")), Raw(link(f.get("source")))] for f in facts])
        w("")
    angles = [a for a in res.get("angles") or [] if isinstance(a, dict)]
    if angles:
        w("### Углы подачи")
        w("")
        arch = model.kb("story")["archetypes"]
        if any(a.get("archetype") for a in angles):
            o += table(["", "Угол", "Архетип", "Парадокс", "Оценка", "Почему"],
                       [["★" if a.get("id") == res.get("chosen_angle") else a.get("id"), a.get("text"), arch.get(a.get("archetype"), {}).get("name", a.get("archetype") or ""),
                         a.get("paradox") or "", a.get("score"), a.get("why")] for a in angles])
        else:
            o += table(["", "Угол", "Оценка", "Почему"],
                       [["★" if a.get("id") == res.get("chosen_angle") else a.get("id"), a.get("text"), a.get("score"), a.get("why")] for a in angles])
        w("")
    if res.get("insights"):
        w("### Инсайты")
        w("")
        o += [f"- {x}" for x in res["insights"]]
        w("")

    # ------------------------------------------------------------------ 2a. story bible (fiction)
    st = s.get("story") if isinstance(s.get("story"), dict) else None
    if st:
        w("## Библия истории")
        w("")
        se = st.get("series") or {}
        if se:
            w(f"**Серия «{se.get('name', '')}», часть {se.get('part')}/{se.get('of')}**"
              + (f" · отвечает на: {se['answers']}" if se.get("answers") else "") + (f" · обрыв: {se['cliff']}" if se.get("cliff") else ""))
            w("")
        w(f"- **Премиса:** {st.get('premise', '—')}")
        w(f"- **Парадокс:** {st.get('paradox', '—')}")
        if st.get("genre"):
            w(f"- **Жанр:** {st['genre']}")
        w("")
        if st.get("world_rules"):
            w("### Правила мира")
            w("")
            o += table(["#", "Правило", "Показано в блоке", "Опора"],
                       [[r.get("id"), r.get("rule"), r.get("shown_in") or "—", r.get("basis") or "вымысел"] for r in st["world_rules"]])
            w("")
        if st.get("characters"):
            w("### Персонажи")
            w("")
            o += table(["Кто", "Роль", "Хочет", "Боится", "Вид", "Арка"],
                       [[c.get("name"), c.get("role"), c.get("want"), c.get("fear"), c.get("look"), c.get("arc")] for c in st["characters"]])
            w("")
        if st.get("twists"):
            w("### Повороты: подготовка → выстрел")
            w("")
            o += table(["#", "Поворот", "Подготовка", "Выстрел"],
                       [[t.get("id"), t.get("what"), t.get("setup"), t.get("payoff")] for t in st["twists"]])
            w("")
        if st.get("stakes"):
            names = {"personal": "личное", "family": "семья", "community": "община", "world": "мир"}
            w("**Ставки:** " + " → ".join(f"{x.get('beat')}: {names.get(x.get('level'), x.get('level'))}" for x in st["stakes"]))
            w("")

    # ------------------------------------------------------------------ 3. hooks
    hk = s.get("hooks") or {}
    variants = [h for h in hk.get("variants") or [] if isinstance(h, dict)]
    if variants:
        w("## 3. Крючки")
        w("")
        w("★ — основной, A/B — запасные для теста.")
        w("")

        def mark(h):
            return "★" if h.get("id") == hk.get("primary") else ("A/B" if h.get("id") in (hk.get("ab") or []) else h.get("id"))
        ordered = sorted(variants, key=lambda h: (mark(h) != "★", mark(h) != "A/B", -(h.get("score") or 0)))
        o += table(["", "Тип", "Текст диктора", "На экране", "Первый кадр", "Оценка", "Почему"],
                   [[mark(h), htypes.get(h.get("type"), {}).get("name", h.get("type")), h.get("vo"), h.get("on_screen"), h.get("visual"),
                     h.get("score"), h.get("why")] for h in ordered])
        w("")

    # ------------------------------------------------------------------ 4. script
    w("## 4. Сценарий по секундам")
    w("")
    w("Время — от начала ролика. «@слово» — момент, к которому привязано событие (слово диктора).")
    w("")
    for b in beats:
        bid = b.get("id")
        tb = by_id.get(bid)
        if not tb:
            continue
        role = roles.get(b.get("role"), {}).get("name", b.get("role"))
        w(f"### {tm(tb['start'])}–{tm(tb['end'])} · {role}" + (f" — {b['title']}" if b.get("title") else "") + f"  `{bid}`")
        w("")
        meta_line = []
        if b.get("goal"):
            meta_line.append(f"**Задача:** {b['goal']}")
        if b.get("devices"):
            meta_line.append("**Приёмы:** " + ", ".join(devs.get(d, {}).get("name", d) for d in b["devices"]))
        if b.get("music"):
            meta_line.append(f"**Музыка:** {b['music']}")
        if b.get("facts"):
            meta_line.append("**Факты:** " + ", ".join(b["facts"]))
        if meta_line:
            w(" · ".join(meta_line))
            w("")
        pace = len(tb["words"]) / max(0.1, tb["speech"])
        w(f"> 🎙 {str(b.get('vo') or '').strip()}")
        w(">")
        w(f"> <sub>речь {tm(tb['vo_start'])}–{tm(tb['vo_end'])} · {len(tb['words'])} слов · {pace:.1f} слов/с</sub>")
        w("")
        if b.get("on_screen"):
            w(f"**Текст на экране:** «{b['on_screen']}»")
            w("")
        shots = plan.get(bid) or []
        if shots:
            o += table(["Время", "Кадр", "Что в кадре", "Актёры", "Камера", "Переход"],
                       [[f"{tm(x['start'])}–{tm(x['end'])}", x["sh"].get("id"), x["sh"].get("visual"), x["sh"].get("actors") or "—",
                         x["sh"].get("camera") or "—", x["sh"].get("transition") or "cut"] for x in shots])
            w("")
            evs = [(e, x["sh"].get("id")) for x in shots for e in x["events"]]
            amb = [(x["sh"].get("id"), x["sh"].get("ambience")) for x in shots if x["sh"].get("ambience")]
            fx = [(x["sh"].get("id"), x["sh"].get("effects")) for x in shots if x["sh"].get("effects")]
            if evs or amb or fx:
                w("**Анимация · графика · звук:**")
                w("")
                for (t, label, what, at), sid in sorted(evs, key=lambda z: (z[0][0] is None, z[0][0] or 0)):
                    w(f"- `{tm(t)}` {label}: {what}" + (f" <sub>({at}, {sid})</sub>" if at else f" <sub>({sid})</sub>"))
                for sid, a in amb:
                    w(f"- фон `{sid}`: {lst(a if not isinstance(a, list) else [x.get('sound', x) if isinstance(x, dict) else x for x in a])}")
                for sid, e in fx:
                    w(f"- эффекты `{sid}`: {lst(e)}")
                w("")
        if b.get("notes"):
            w(f"*Заметки:* {lst(b['notes'])}")
            w("")

    # ------------------------------------------------------------------ 5. retention map
    w("## 5. Карта удержания")
    w("")
    ev = M.get("events") or []
    w(f"Плотность визуальных событий (шаг 2 с, `·` — пусто): `0с {density(ev, total)} {total:.0f}с`")
    w("")
    loops = [lp for lp in s.get("loops") or [] if isinstance(lp, dict)]
    rows = []
    for b in beats:
        tb = by_id.get(b.get("id"))
        if not tb:
            continue
        r = roles.get(b.get("role"), {})
        notes = []
        for lp in loops:
            if lp.get("open") == b.get("id"):
                notes.append(f"❓ открыть: {lp.get('question')}")
            if lp.get("close") == b.get("id"):
                notes.append(f"✔ закрыть: {lp.get('question')}")
        if (s.get("engagement") or {}).get("cta", {}).get("beat") == b.get("id"):
            notes.append("📣 призыв")
        rows.append([tm(tb["start"]), ("★ " if r.get("reward") else "") + str(r.get("name") or b.get("role") or "?"), b.get("title") or b.get("goal"),
                     ", ".join(devs.get(d, {}).get("name", d) for d in b.get("devices") or []) or "—", "; ".join(notes) or ""])
    o += table(["Время", "Роль", "Блок", "Приёмы", "Петли и призыв"], rows)
    w("")
    w("★ — блок-награда (новый факт, шаг, поворот, ответ): зритель получает её не реже чем раз в 10–15 с.")
    w("")

    # ------------------------------------------------------------------ 6. engagement
    eng = s.get("engagement") or {}
    w("## 6. Вовлечение")
    w("")
    for k, label in (("comment", "Комментарий"), ("share", "Пересылка"), ("save", "Сохранение"), ("follow", "Подписка"), ("rewatch", "Пересмотр")):
        if eng.get(k):
            w(f"- **{label}:** {eng[k]}")
    cta = eng.get("cta") or {}
    if cta:
        at = by_id.get(cta.get("beat"), {}).get("start")
        w(f"- **Призыв** ({cta.get('type', '')}, {tm(at)}): {cta.get('text', '')}")
    w("")

    # ------------------------------------------------------------------ 7. packaging
    pk = s.get("package") or {}
    w("## 7. Упаковка для площадок")
    w("")
    for p in plats:
        pp = pk.get(p)
        if not isinstance(pp, dict):
            continue
        w(f"### {pnames.get(p, p)}")
        w("")
        if pp.get("title"):
            w(f"- **Заголовок** ({len(pp['title'])} симв.): {pp['title']}")
        cap = pp.get("caption") or pp.get("description")
        if cap:
            w(f"- **{'Подпись' if pp.get('caption') else 'Описание'}** ({len(cap)} симв.):")
            w("")
            o += [f"  > {line}" if line else "  >" for line in str(cap).strip().split("\n")]
            w("")
        if pp.get("hashtags"):
            w("- **Хэштеги:** " + " ".join(h if str(h).startswith("#") else f"#{h}" for h in pp["hashtags"]))
        if pp.get("cover"):
            w(f"- **Обложка:** {pp['cover']}")
        if pp.get("sound"):
            w(f"- **Звук:** {pp['sound']}")
        for k, v in pp.items():
            if k not in ("title", "caption", "description", "hashtags", "cover", "sound"):
                w(f"- **{k}:** {lst(v)}")
        w("")
    if pk.get("first_frame"):
        w(f"**Первый кадр (превью):** {pk['first_frame']}")
        w("")
    if pk.get("posting"):
        w(f"**Публикация:** {lst(pk['posting'])}")
        w("")

    # ------------------------------------------------------------------ 8. production
    pr = s.get("production") or {}
    w("## 8. Продакшн")
    w("")
    for k, label in (("theme", "Оформление"), ("palette", "Палитра"), ("music", "Музыка"), ("assets", "Нужно сделать"), ("notes", "Заметки")):
        v = pr.get(k)
        if v:
            if isinstance(v, dict):
                v = ", ".join(f"{a}: {b}" for a, b in v.items())
            w(f"- **{label}:** {lst(v)}")
    if M.get("new_actors"):
        w(f"- **Новые актёры:** {', '.join(M['new_actors'])}")
    w(f"- **Дальше:** `python3 vg.py script project {pid}` → черновик `projects/{pid}/project.yaml` → skill make-video.")
    w("")

    # ------------------------------------------------------------------ 9. review
    rv = s.get("review") or {}
    w("## 9. Самопроверка")
    w("")
    sc = rv.get("scores") or {}
    if sc:
        o += table(list(sc.keys()), [[sc[k] for k in sc]])
        w("")
    if rv.get("weak_points"):
        w("**Слабые места:**")
        o += [f"- {x}" for x in rv["weak_points"]]
        w("")
    if rv.get("improvements"):
        w("**Что улучшено / что можно усилить:**")
        o += [f"- {x}" for x in rv["improvements"]]
        w("")
    w("### Замечания автоматической проверки")
    w("")
    if not iss.items:
        w("Замечаний нет.")
    for sev in ("error", "warn", "info"):
        for _, code, where, msg in [i for i in iss.items if i[0] == sev]:
            w(f"- {SEV[sev]} `{where}` {msg}")
    w("")

    # ------------------------------------------------------------------ 10. clean VO
    w("## 10. Текст диктора целиком")
    w("")
    nw = 0
    for b in beats:
        if b.get("vo"):
            w(str(b["vo"]).strip())
            w("")
            nw += len(by_id.get(b.get("id"), {}).get("words", []))
    w(f"<sub>{nw} слов · ≈ {total:.1f} с с паузами и финальным кадром</sub>")
    w("")
    return "\n".join(o)
