# TTStory — движок вертикальных роликов для TikTok / Shorts / Reels

Сценарий + несколько AI-кадров превращаются в готовый 60-секундный ролик 9:16 с движением камеры по глубине, живыми эффектами (туман, вода, частицы, свет, молнии), стеклянным интерфейсом с 3D-голограммами, субтитрами с подсветкой слов, звуковым дизайном и музыкой. Всё описывается в одном файле `projects/<id>/project.yaml`.

| Ролик | Стиль | Файл | Проект |
|---|---|---|---|
| «Мануал по выживанию: танкер», 61 с | stylized 3D CGI, sci-fi HUD, мужской голос, тёмная электроника | [`out/tanker.mp4`](out/tanker.mp4) | [`projects/tanker`](projects/tanker/project.yaml) |
| «3 правила чайной церемонии», 36 с | рисованная акварель, светлый минимализм, женский голос, пентатоника | [`out/tea.mp4`](out/tea.mp4) | [`projects/tea`](projects/tea/project.yaml) |

![Кадры из «Танкера»](out/preview.jpg)

## Быстрый старт

```bash
./setup.sh && source .venv/bin/activate     # один раз: пакеты, Chromium, модели
python3 vg.py new my_video                  # projects/my_video/ из шаблона
#   → положить кадры 9:16 в projects/my_video/plates/, написать project.yaml
python3 vg.py voice my_video && python3 vg.py compile my_video   # длительность и тайминги
python3 vg.py prep my_video && python3 vg.py grid my_video       # апскейл, глубина, сетка координат
python3 vg.py preview my_video --shots      # быстрые превью-кадры
python3 vg.py all my_video                  # готовый out/my_video.mp4
```

Ещё проще — через Claude Code: откройте сессию с этим репозиторием и напишите «Сделай ролик по сценарию: …» (или `/make-video`). Claude пройдёт весь процесс по инструкции [`.claude/skills/make-video/SKILL.md`](.claude/skills/make-video/SKILL.md).

## Документация

- **[docs/MANUAL.md](docs/MANUAL.md)** — мануал от А до Я: как устроен конвейер, как писать сценарий и промпты для кадров, как оживлять кадры, делать графику и звук, рецепты разных стилей, чек-лист качества, разбор «Танкера», решение проблем.
- **[docs/REFERENCE.md](docs/REFERENCE.md)** — справочник по всем параметрам: камера, маски, 20+ эффектов, 24 HUD-компонента, 4 темы, 5 стилей субтитров, 30+ звуков, 15 амбиенсов, 10 музыкальных стилей.
- **[projects/_template/project.yaml](projects/_template/project.yaml)** — шаблон проекта с комментариями.

## Устройство

```
vg.py                     команды по этапам: voice, compile, prep, grid, preview, scene, audio, hud, mux, qa, all
engine/
  tts.py                  озвучка (Microsoft Edge neural TTS) с таймингами слов
  compile.py              таймлайн: сцены, шоты, ссылки на слова "@Слово" → секунды
  prep.py                 Real-ESRGAN ×4 + Depth Anything V2 (ONNX Runtime)
  scene.py                2.5D-камера с параллаксом, маски, библиотека эффектов, переходы, грейдинг
  audio.py                библиотека звуков и амбиенсов, музыкальные стили, автозвуки, сведение
  hud/                    HTML/CSS/three.js: runtime, компоненты, темы, 3D-модели, шрифты, эмодзи
  render_hud.cjs          покадровый рендер HUD в headless Chromium (Playwright)
  mux.py, qa.py           финальная сборка (−14 LUFS), контактные листы, сетки координат
projects/<id>/            project.yaml + plates/ (ключевые кадры)
out/                      готовые ролики
```

Инструменты: Figma AI (генерация кадров), ONNX Runtime, OpenCV, NumPy/SciPy, Microsoft Edge TTS, three.js, Playwright/Chromium, FFmpeg. Шрифты (Exo 2, JetBrains Mono, Montserrat, Playfair Display, Unbounded) — OFL. Эмодзи — Twemoji (CC-BY 4.0). three.js — MIT.
