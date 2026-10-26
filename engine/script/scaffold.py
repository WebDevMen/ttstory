"""`vg.py script new`: a script.yaml skeleton for a topic, with the chosen format's beats laid out and timed.

Every field that needs thought is "TODO" — the checker reports each one as an error until it is filled in.
"""
import json
import os

from . import model
from .timing import voice_cfg
from ..common import DEFAULTS, project_dir

WPS = 2.4            # words per second of speech at rate +20% (measured on the repo's projects: 2.2–2.6)
TODO = "TODO"

ROLE_DEVICES = {
    "hook": ["open_loop", "direct_address", "pattern_interrupt", "text_reinforcement"],
    "context": ["relatability"], "setup": ["relatability", "progress"], "stakes": ["stakes_raise", "emotion"],
    "problem": ["emotion", "relatability"], "point": ["mini_payoff", "visual_proof", "progress"],
    "step": ["visual_proof", "progress"], "mistake": ["contrast", "sound_hit"], "escalation": ["stakes_raise", "progress"],
    "twist": ["twist", "sound_hit"], "proof": ["visual_proof", "number_reveal"], "reveal": ["mini_payoff", "visual_proof"],
    "payoff": ["mini_payoff", "callback"], "recap": ["save_trigger", "text_reinforcement"], "cta": ["comment_bait"],
    "loop": ["loop_ending", "rewatch_trigger"], "rule": ["visual_proof", "mini_payoff", "save_trigger"],
    "cliffhanger": ["cliffhanger", "twist", "open_loop"],
}
ROLE_MUSIC = {"hook": "drone", "context": "drone", "setup": "drone", "stakes": "tension", "problem": "tension",
              "point": "pulse", "step": "pulse", "mistake": "tension", "escalation": "tension", "twist": "sub",
              "proof": "pulse", "reveal": "epic", "payoff": "epic", "recap": "pulse", "cta": "calm", "loop": "drone",
              "rule": "pulse", "cliffhanger": "silence"}


def q(v):
    """A YAML scalar (JSON strings are valid YAML)."""
    return json.dumps(v, ensure_ascii=False)


def beat_ids(structure):
    counts, seen, out = {}, {}, []
    for st in structure:
        counts[st["role"]] = counts.get(st["role"], 0) + 1
    for st in structure:
        r = st["role"]
        seen[r] = seen.get(r, 0) + 1
        out.append(r if counts[r] == 1 else f"{r}{seen[r]}")
    return out


def budget(structure, duration, v):
    """Speech seconds and words per beat for the target duration."""
    n = len(structure)
    speech = max(5.0, duration - v["lead_in"] - v["tail"] - v["gap"] * (n - 1))
    total_share = sum(st["share"] for st in structure) or 1
    wps = WPS * (1 + v["rate_f"]) / 1.2
    return [(speech * st["share"] / total_share, round(speech * st["share"] / total_share * wps)) for st in structure]


def hook_type_plan(fmt, n=8):
    """n hook types: the format's recommended ones first, then others, so that ≥ 4 types are covered."""
    rec = list(fmt.get("hooks") or [])
    rest = [t for t in model.hook_types() if t not in rec]
    order = rec + rest
    return [order[i % len(order)] for i in range(n)] if len(order) >= 4 else (order * n)[:n]


def build(pid, topic, fmt_id, duration=60, platforms=None, wishes="", style="draw", voice=None, rate=None, genre=None, series=None):
    fmts = model.formats()
    if fmt_id not in fmts:
        raise SystemExit(f"unknown format '{fmt_id}' — python3 vg.py script formats")
    fmt = fmts[fmt_id]
    platforms = platforms or ["tiktok", "reels", "shorts"]
    for p in platforms:
        if p not in model.platforms():
            raise SystemExit(f"unknown platform '{p}' (tiktok | reels | shorts)")
    vo = {"voice": voice or DEFAULTS["voice"]["voice"], "rate": rate or "+18%", "pitch": "+0Hz"}
    v = voice_cfg({"meta": {"voice": vo}})
    st = fmt["structure"]
    ids = beat_ids(st)
    bud = budget(st, duration, v)
    roles = model.roles()
    first_reward = next((i for i, s in enumerate(st) if s["role"] in ("reveal", "payoff", "twist")), len(st) - 1)
    cta_id = next((ids[i] for i, s in enumerate(st) if s["role"] == "cta"), ids[-1])
    words_total = sum(b[1] for b in bud)
    fiction = genre == "fiction" or bool(fmt.get("fiction"))

    L = []
    w = L.append
    w(f"# СЦЕНАРИЙ: {topic}")
    w(f"# Создан: python3 vg.py script new {pid} --format {fmt_id} --duration {duration}")
    w("# Процесс и правила: docs/SCRIPTING.md · проверка: python3 vg.py script check " + pid + " [--tts]")
    w(f"# Документ сценария: python3 vg.py script render {pid} → projects/{pid}/script.md")
    w(f"# Черновик проекта видео: python3 vg.py script project {pid} → projects/{pid}/project.yaml")
    w("# Каждое \"TODO\" — незаполненное поле: проверка считает его ошибкой. Пустые списки [] — заполните или удалите.")
    w("#")
    w("# Время (at:) — ссылки на слова текста ЭТОГО блока: \"@слово\", \"@слово#2\" (2-е вхождение), \"@слово.end\",")
    w("# \"@слово+0.3\", \"@start\"/\"@end\" блока, \"@другой_блок/слово\" или число = секунды от начала блока.")
    w("")
    w("version: 1")
    w("")
    w("meta:")
    w(f"  title: {q(TODO)}                 # рабочее название ролика")
    w(f"  topic: {q(topic)}")
    if wishes:
        w(f"  wishes: {q(wishes)}")
    w("  language: ru")
    w(f"  platforms: [{', '.join(platforms)}]")
    w(f"  primary_platform: {platforms[0]}")
    w(f"  duration: {duration}                    # цель, секунды (проверка: ±12%)")
    w(f"  format: {fmt_id}                 # {fmt['name']} · все форматы: python3 vg.py script formats")
    w(f"  style: {style}                      # draw (своя графика кодом, по умолчанию) | motion (ИИ-иллюстрации + моушн-графика) | plates (AI-кадры) | mixed")
    w(f"  voice: {{voice: {vo['voice']}, rate: {q(vo['rate'])}, pitch: {q(vo['pitch'])}}}")
    if fiction:
        w("  genre: fiction                   # вымысел: библия истории (story:), правила вымысла — docs/SCRIPTING.md §14")
    w("  status: draft                    # draft → checked → approved")
    w("")
    w("brief:")
    w(f"  goal: {q(TODO)}                  # чего добиваемся: охват, сохранения, подписки, монетизация…")
    w("  kpi: [completion, shares, comments]   # completion rewatch shares saves comments follows likes clicks monetization")
    w("  audience:")
    w(f"    who: {q(TODO)}                 # кто смотрит: конкретный человек, а не «все»")
    w(f"    age: {q(TODO)}")
    w("    interests: []")
    w("    pains: []                      # чего боятся / что раздражает")
    w("    desires: []                    # чего хотят")
    w(f"    knowledge: {q(TODO)}           # что уже знают о теме")
    w(f"  promise: {q(TODO)}               # что зритель получит, если досмотрит (одна фраза)")
    w(f"  tone: {q(TODO)}                  # тон и главная эмоция ролика")
    w("  keywords: []                     # 1-е — главное поисковое слово: в первой фразе, на экране и в подписи")
    w("  constraints: []                  # ограничения и допущения")
    w("")
    w("research:")
    w(f"  summary: {q(TODO)}               # 2–4 предложения: что важно знать о теме")
    if fiction:
        w("  facts:                           # опора вымысла: реальная физика, обычай, предмет эпохи — делает правила мира убедительными; source — URL")
        for i in range(1, 3):
            w(f"    - {{id: f{i}, text: {q(TODO)}, source: {q(TODO)}, confidence: high}}")
        arch = list(model.kb("story")["archetypes"])
        w(f"  angles:                          # ≥ 3 разных архетипа: {' | '.join(arch)}; paradox — противоречие, которое держит интерес")
        for i, a in enumerate(["what_if", "rule_break", "inhuman_pov", "role_swap"], 1):
            w(f"    - {{id: a{i}, archetype: {a}, text: {q(TODO)}, paradox: {q(TODO)}, score: 0, why: {q(TODO)}}}")
    else:
        w("  facts:                           # ≥ 5 фактов; source — URL; confidence: high | medium | low")
        for i in range(1, 6):
            w(f"    - {{id: f{i}, text: {q(TODO)}, source: {q(TODO)}, confidence: high}}")
        w("  angles:                          # ≥ 3 угла подачи; score 1–10; why — почему сработает или нет")
        for i in range(1, 4):
            w(f"    - {{id: a{i}, text: {q(TODO)}, score: 0, why: {q(TODO)}}}")
    w("  chosen_angle: a1")
    w("  insights: []                     # что спорно, что удивляет, какие вопросы задают зрители")
    w("")
    if fiction:
        rule_beat = next((ids[i] for i, x in enumerate(st) if x["role"] in ("rule", "proof", "reveal")), ids[min(3, len(ids) - 1)])
        tw_beat = next((ids[i] for i, x in enumerate(st) if x["role"] in ("twist", "cliffhanger")), ids[-2])
        w("story:                             # библия истории — docs/SCRIPTING.md §14")
        w(f"  premise: {q('Что если TODO?')}     # одно предложение: одно изменённое правило мира, доведённое до предела")
        w(f"  paradox: {q(TODO)}               # противоречие внутри премисы")
        w(f"  genre: {q(TODO)}                 # мистика | фантастика | фэнтези | лёгкий хоррор …")
        w("  world_rules:                     # 2–4 правила, неизменные; shown_in — блок, где правило показано на экране; basis — факт fN или «вымысел»")
        w(f"    - {{id: r1, rule: {q(TODO)}, shown_in: {rule_beat}, basis: f1}}")
        w(f"    - {{id: r2, rule: {q(TODO)}, shown_in: {rule_beat}}}")
        w("  characters:                      # ≥ 2: у каждого желание и страх; первый — главный герой (назван в тексте)")
        for i in (1, 2):
            w(f"    - {{id: c{i}, name: {q(TODO)}, role: {q(TODO)}, want: {q(TODO)}, fear: {q(TODO)}, look: {q(TODO)}, arc: {q(TODO)}}}")
        w("  twists:                          # подготовка (setup) раньше выстрела (payoff)")
        w(f"    - {{id: t1, what: {q(TODO)}, setup: {ids[min(1, len(ids) - 1)]}, payoff: {tw_beat}}}")
        w("  stakes:                          # личное → семья → община → мир")
        w(f"    - {{beat: {ids[min(2, len(ids) - 1)]}, level: personal}}")
        w(f"    - {{beat: {tw_beat}, level: community}}")
        if series:
            w(f"  series: {{name: {q(series.get('name') or TODO)}, part: {series.get('part', 1)}, of: {series.get('of', 3)}"
              + (f", prev: {series['prev']}" if series.get("prev") else "") + (f", next: {series['next']}" if series.get("next") else "")
              + (f", answers: {q(TODO)}" if series.get("part", 1) > 1 else "") + f", cliff: {q(TODO)}}}")
        w("")
    w("hooks:                             # ≥ 8 вариантов ≥ 4 типов; типы: python3 vg.py script formats")
    w("  variants:")
    for i, t in enumerate(hook_type_plan(fmt), 1):
        w(f"    - {{id: h{i}, type: {t}, vo: {q(TODO)}, on_screen: {q(TODO)}, visual: {q(TODO)}, score: 0, why: {q(TODO)}}}")
    w("  primary: h1                      # текст первого блока начинается с этого крючка")
    w("  ab: [h2, h3]                     # запасные крючки для A/B-теста")
    w("")
    w(f"# Блоки по формату «{fmt['name']}». Речь ≈ {sum(b[0] for b in bud):.0f} с ≈ {words_total} слов на весь ролик.")
    w("# Каждый блок: одна мысль, предложения ≤ 14 слов, числа словами. Каждые 2–3 с — новое визуальное событие.")
    w("beats:")
    for i, (s, bid, (sec, nw)) in enumerate(zip(st, ids, bud)):
        r = roles[s["role"]]
        w("")
        w(f"  # ≈ {sec:.1f} с речи · ~{nw} слов — {r['name']}: {s['purpose']}")
        w(f"  - id: {bid}")
        w(f"    role: {s['role']}")
        w(f"    title: {q(TODO)}")
        w(f"    goal: {q(s['purpose'])}")
        w(f"    vo: {q(TODO)}")
        w(f"    on_screen: {q(TODO)}           # 2–5 слов крупным текстом (без звука тоже понятно)")
        w(f"    devices: [{', '.join(ROLE_DEVICES.get(s['role'], []))}]")
        w("    facts: []                      # id фактов, на которых стоит блок")
        w(f"    music: {ROLE_MUSIC.get(s['role'], 'pulse')}                   # {' | '.join(model.MUSIC_STYLES)}")
        w("    shots:")
        w(f"      - id: {bid}_a")
        w(f"        visual: {q(TODO)}          # что в кадре: объект, действие, планы (передний / средний / фон), цвет")
        w("        actors: []                 # актёры draw: python3 vg.py actors · art:<иллюстрация> и motion:<блок> — для style: motion · hud:<компонент> · new:<имя> если такого нет")
        w(f"        camera: {q(TODO)}          # движение камеры: наезд, панорама, облёт, тряска на ударе…")
        w("        animation:                 # что двигается и на каком слове")
        w(f"          - {{at: \"@start\", what: {q(TODO)}}}")
        w("        graphics: []               # надписи, плашки, цифры: {at, type, text}")
        w("        sfx: []                    # звуки: {at, sound, note}; sound из python3 vg.py script formats")
        w(f"        transition: {'cut' if i == 0 else 'whip_x'}            # {' | '.join(model.TRANSITIONS)}")
        w("      # ещё кадр: - {id: " + bid + "_b, at: \"@слово-0.1\", visual: ..., actors: [...], animation: [...], transition: zoom}")
    w("")
    w("loops:                             # открытые петли: вопрос в начале → ответ позже")
    w(f"  - {{id: l1, question: {q(TODO)}, open: {ids[0]}, close: {ids[first_reward]}}}")
    w("")
    w("engagement:")
    w(f"  comment: {q(TODO)}               # конкретный вопрос/выбор, на который отвечают одним словом")
    w(f"  share: {q(TODO)}                 # кому и зачем перешлют")
    w(f"  save: {q(TODO)}                  # почему сохранят")
    w(f"  follow: {q(TODO)}                # почему подпишутся (серия, рубрика, часть 2)")
    w(f"  rewatch: {q(TODO)}               # почему пересмотрят (детали, петля)")
    w(f"  cta: {{beat: {cta_id}, text: {q(TODO)}, type: comment}}   # type: comment | save | share | follow | part2")
    w("")
    w("package:")
    for p in platforms:
        if p == "shorts":
            w(f"  shorts: {{title: {q(TODO)}, description: {q(TODO)}, hashtags: []}}")
        elif p == "tiktok":
            w(f"  tiktok: {{caption: {q(TODO)}, hashtags: [], cover: {q(TODO)}, sound: {q(TODO)}}}")
        else:
            w(f"  {p}: {{caption: {q(TODO)}, hashtags: [], cover: {q(TODO)}}}")
    w(f"  first_frame: {q(TODO)}           # первый кадр = превью в ленте: что видно без звука")
    w("")
    w("production:")
    w(f"  theme: {{preset: minimal, accent: {q('#e8333f')}, captions: clean}}   # minimal | scifi | pop | documentary")
    w("  palette: []                      # 3–5 цветов ролика")
    w("  music: {key: D, mode: minor, bpm: 100}")
    w("  assets: []                       # недостающие актёры/картинки/звуки")
    w("  notes: []")
    w("")
    w("review:                            # честная самооценка 1–10 после проверки; < 7 — переделать")
    keys = ["hook", "clarity", "pacing", "novelty", "emotion", "payoff", "visuals", "cta", "platform", "accuracy"]
    w("  scores: {" + ", ".join(f"{k}: 0" for k in keys) + "}")
    w("  weak_points: []")
    w("  improvements: []")
    return "\n".join(L) + "\n"


def run(pid, topic, fmt_id, duration=60, platforms=None, wishes="", style="draw", voice=None, rate=None, force=False, genre=None, series=None):
    path = model.script_path(pid)
    if os.path.exists(path) and not force:
        raise SystemExit(f"{os.path.relpath(path)} already exists (--force to overwrite)")
    text = build(pid, topic, fmt_id, duration, platforms, wishes, style, voice, rate, genre, series)
    os.makedirs(project_dir(pid), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path
