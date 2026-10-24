"""`python3 vg.py script …` — the scriptwriting tool.

  script formats [name]                          formats, hook types, devices, roles, sounds (the knowledge base)
  script new <id> --topic "…" [--format f] [--duration 60] [--platforms tiktok,reels,shorts] [--wishes "…"]
                                                 skeleton projects/<id>/script.yaml for the chosen format
  script check <id> [--tts]                      timeline + every finding + readiness score (exit code 1 if not ready)
  script render <id> [--tts]                     full script document → projects/<id>/script.md
  script project <id> [--force]                  draft projects/<id>/project.yaml for production (make-video)
"""
import os
import sys

from . import lint, model, project, render, scaffold, timing
from ..common import ROOT

SEV_TITLE = {"error": "✗ ОШИБКИ", "warn": "! ПРЕДУПРЕЖДЕНИЯ", "info": "· ЗАМЕТКИ"}


def _check(pid, tts):
    try:
        s = model.load(pid)
    except (FileNotFoundError, ValueError) as e:
        sys.exit(f"  ✗ {e}")
    try:
        return s, *lint.run(s, pid, tts=tts)
    except RuntimeError as e:          # TTS failure (network): fall back to the estimate
        if not tts:
            raise
        print(f"  ! TTS недоступен ({e}) — использую оценку по тексту")
        return s, *lint.run(s, pid, tts=False)


def print_timeline(tl):
    print(f"  {'блок':<14}{'роль':<12}{'время':<17}{'речь':>6}{'слов':>6}{'темп':>6}")
    for b in tl["beats"]:
        pace = len(b["words"]) / max(0.1, b["speech"])
        print(f"  {str(b['id'])[:13]:<14}{str(b['role'])[:11]:<12}{timing.fmt(b['start']) + '–' + timing.fmt(b['end']):<17}"
              f"{b['speech']:>5.1f}с{len(b['words']):>6}{pace:>6.1f}")


def print_report(iss, M, tl):
    src = "по реальной озвучке" if tl["source"] == "tts" else "оценка по тексту"
    print(f"\n  итого ≈ {M['total']:.1f} с при цели {M['target']:.0f} с ({src})")
    for sev in ("error", "warn", "info"):
        items = [i for i in iss.items if i[0] == sev]
        if items:
            print(f"\n  {SEV_TITLE[sev]} ({len(items)})")
            for _, code, where, msg in items:
                print(f"    [{code}] {where}: {msg}")
    parts = []
    if M.get("hook_end") is not None:
        parts.append(f"крючок {M['hook_end']:.1f} с")
    if M.get("events_per_10s") is not None:
        parts.append(f"событий {M['visual_events']} ({M.get('events_per_10s', 0):.1f}/10 с, пауза ≤ {M.get('max_static', 0):.1f} с)")
    if M.get("max_no_reward") is not None:
        parts.append(f"награды ≤ {M['max_no_reward']:.0f} с")
    parts += [f"петель {M.get('loops', 0)}", f"приёмов {M.get('devices', 0)}", f"фактов {M.get('facts', 0)}"]
    if M.get("review_avg") is not None:
        parts.append(f"самооценка {M['review_avg']:.1f}")
    print("\n  метрики: " + " · ".join(parts))
    verdict = "готов к производству ✓" if M["ready"] else "нужна доработка (0 ошибок и ≤ 3 предупреждений)"
    print(f"  ГОТОВНОСТЬ: {M['score']}/100 — {verdict}")


def cmd_formats(a):
    fm, hooks, devs, roles = model.formats(), model.hook_types(), model.devices(), model.roles()
    if a.name:
        if a.name not in fm:
            sys.exit(f"нет формата '{a.name}' (есть: {', '.join(fm)})")
        f = fm[a.name]
        print(f"\n{a.name} — {f['name']}\n  когда: {f['when']}\n  структура:")
        for st in f["structure"]:
            print(f"    {st['role']:<11} {int(st['share'] * 100):>3}%  {st['purpose']}")
        print(f"  обязательные роли: {', '.join(f.get('required') or [])}")
        print(f"  крючки: {', '.join(f.get('hooks') or [])}\n  финалы: {', '.join(f.get('endings') or [])}\n  визуал: {f.get('visuals', '')}")
        return
    print("\nФОРМАТЫ (python3 vg.py script formats <имя> — подробно)")
    for k, f in fm.items():
        print(f"  {k:<15} {f['name']} — {f['when']}")
    print("\nТИПЫ КРЮЧКОВ")
    for k, h in hooks.items():
        print(f"  {k:<14} {h['name']}: {h['formula']}")
    print("\nРОЛИ БЛОКОВ (★ — награда для зрителя)")
    for k, r in roles.items():
        print(f"  {k:<11} {'★' if r.get('reward') else ' '} {r['name']}: {r['about']}")
    print("\nПРИЁМЫ (devices)")
    for k, d in devs.items():
        print(f"  {k:<18} {d['name']}: {d['what']}")
    sounds, amb = model.sound_names()
    print(f"\nЗВУКИ (sfx.sound): {', '.join(sorted(sounds))}")
    print(f"ФОНЫ (ambience): {', '.join(sorted(amb))}")
    print(f"МУЗЫКА (music): {', '.join(model.MUSIC_STYLES)}")
    print(f"ПЕРЕХОДЫ (transition): {', '.join(model.TRANSITIONS)}")
    print(f"HUD-КОМПОНЕНТЫ (actors: hud:<имя>): {', '.join(model.HUD_COMPONENTS)}")
    print(f"KPI: {', '.join(model.KPIS)}")
    print("АКТЁРЫ: python3 vg.py actors")


def cmd_new(a):
    if not model.ID_RE.match(a.id):
        sys.exit("id проекта — латиница/цифры/_ (например blackout)")
    plats = [p.strip() for p in a.platforms.split(",") if p.strip()]
    path = scaffold.run(a.id, a.topic, a.format, a.duration, plats, a.wishes or "", a.style, a.voice, a.rate, force=a.force)
    print(f"  создан {os.path.relpath(path, ROOT)} — формат «{model.formats()[a.format]['name']}», цель {a.duration} с")
    print(f"  дальше: исследование → заполнить TODO → python3 vg.py script check {a.id}")


def cmd_check(a):
    s, iss, M, tl = _check(a.id, a.tts)
    print(f"\n▶ script check {a.id} — {(s.get('meta') or {}).get('title', '')}\n")
    print_timeline(tl)
    print_report(iss, M, tl)
    if not M["ready"]:
        sys.exit(1)


def cmd_render(a):
    s, iss, M, tl = _check(a.id, a.tts)
    path = os.path.join(os.path.dirname(model.script_path(a.id)), "script.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(render.run(s, iss, M, tl, a.id))
    print(f"  {os.path.relpath(path, ROOT)} — готовность {M['score']}/100"
          + ("" if M["ready"] else f" (ошибок {iss.count('error')}, предупреждений {iss.count('warn')}: python3 vg.py script check {a.id})"))


def cmd_project(a):
    s, iss, M, tl = _check(a.id, False)
    if iss.count("error") and not a.force:
        sys.exit(f"  в сценарии {iss.count('error')} ошибок — сначала python3 vg.py script check {a.id} (или --force)")
    path = project.run(s, a.id, force=a.force)
    print(f"  {os.path.relpath(path, ROOT)} — черновик проекта: {len(tl['beats'])} сцен, ≈ {tl['total']:.0f} с")
    print(f"  дальше: python3 vg.py voice {a.id} && python3 vg.py compile {a.id}, затем графика кадров (skill make-video)")


def add_parser(sub):
    p = sub.add_parser("script", help="сценарии: formats | new | check | render | project")
    ss = p.add_subparsers(dest="script_cmd", required=True)
    x = ss.add_parser("formats"); x.add_argument("name", nargs="?"); x.set_defaults(fn=cmd_formats)
    x = ss.add_parser("new"); x.add_argument("id"); x.add_argument("--topic", required=True)
    x.add_argument("--format", default="explainer", choices=list(model.formats()))
    x.add_argument("--duration", type=int, default=60); x.add_argument("--platforms", default="tiktok,reels,shorts")
    x.add_argument("--wishes"); x.add_argument("--style", default="draw", choices=["draw", "plates", "mixed"])
    x.add_argument("--voice"); x.add_argument("--rate"); x.add_argument("--force", action="store_true"); x.set_defaults(fn=cmd_new)
    x = ss.add_parser("check"); x.add_argument("id"); x.add_argument("--tts", action="store_true"); x.set_defaults(fn=cmd_check)
    x = ss.add_parser("render"); x.add_argument("id"); x.add_argument("--tts", action="store_true"); x.set_defaults(fn=cmd_render)
    x = ss.add_parser("project"); x.add_argument("id"); x.add_argument("--force", action="store_true"); x.set_defaults(fn=cmd_project)
