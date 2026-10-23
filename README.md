# TTStory — «Мануал по выживанию: танкер»

Пробный вертикальный ролик (9:16, 1080×1920, 30 fps, ~61 с) для TikTok / Shorts / Reels
по сценарию «Post-Apocalyptic Survival Guide / Interactive Sci-Fi UI».

**Готовое видео:** [`out/tanker_survival_9x16.mp4`](out/tanker_survival_9x16.mp4) — H.264 1080×1920, 30 fps, 8 Мбит/с, AAC 48 кГц, −14 LUFS

![Кадры из ролика](out/preview.jpg)

## Как сделано

Ролик целиком собран кодом из этого репозитория. Видеогенераторы (Veo/Kling через Figma Weave)
в сессии были недоступны, поэтому используется гибридный пайплайн «AI-кадр + 2.5D-анимация + моушн-дизайн»:

| Этап | Инструмент | Файл |
|---|---|---|
| 9 ключевых кадров в стиле stylized 3D CGI | Figma AI (`gemini-3.1-flash-image`) | `assets/plates/*.png`, промпты — `assets/plates/PROMPTS.md` |
| Апскейл ×4 и карты глубины | Real-ESRGAN x4 + Depth Anything V2 (ONNX Runtime) | `tools/prep_plates.py` |
| Озвучка (RU, мужской голос) с пословными таймингами | Microsoft Edge Neural TTS (`ru-RU-DmitryNeural`) | `tools/voiceover.py` |
| Мастер-таймлайн: сцены, шоты, события привязаны к словам диктора | Python | `tools/timeline.py` |
| Сцена: камера с параллаксом по глубине, туман, вода, дождь, споры, молнии, фонарь, переходы, bloom, грейдинг, зерно | NumPy / OpenCV | `tools/render_scene.py` |
| HUD: стеклянные голо-панели, маркеры разделов, 3D-схема дистиллятора и голокарта танкера (three.js), радар, кнопки выбора, субтитры с подсветкой слов | HTML/CSS/JS в headless Chromium (Playwright) | `tools/hud/*`, `tools/render_hud.cjs` |
| Саунд-дизайн: океан, ветер, дождь, гул, шаги, скрежет, гром, существо, UI-клики, бас-райзеры, музыкальная подложка, дакинг, мастеринг −14 LUFS | Процедурный синтез (NumPy/SciPy) | `tools/audio.py` |

## Раскадровка

| Время | Сцена | Визуал | HUD |
|---|---|---|---|
| 0:00–0:10 | 1. Вводная | POV на носу танкера: камера спускается от затопленных небоскрёбов к рукам на поручне, туман, рябь воды | Показатели ❤ 75% · ☢ 20% · 💧 1.5 л, плашка «ИНСТРУКЦИЯ: ВЫЖИВАНИЕ НА СУДНЕ» |
| 0:10–0:22 | 2. Что делать | Тент под дождём и капли в колбу → проход по коридору с фонарём → запирание гермодвери (удар, тряска) | «✅ ДЕЙСТВИЯ: ЧТО ДЕЛАТЬ», 3D-схема дистиллятора, голокарта судна с «Безопасной зоной», «МОСТИК ЗАПЕРТ» |
| 0:22–0:35 | 3. Что не делать | Ночь, ракетница (вспышка молнии) → взгляд в люк, поднимаются светящиеся споры | «❌ ОШИБКИ: КАТЕГОРИЧЕСКИ НЕЛЬЗЯ», анимированный запрет, «DANGER: BIOHAZARD», счётчик «3 вдоха» |
| 0:35–0:49 | 4. Угрозы | Течь по шву (струи, рябь в луже) → фонарь гаснет, молния освещает гигантское существо за иллюминатором | Красная пульсирующая рамка, целостность корпуса, 3D-радар с контактом, «⚠ УГРОЗА ОБНАРУЖЕНА» |
| 0:49–1:01 | 5. Финал | Неоновый компас, закат над затопленным мегаполисом, шторм справа | Топливо 7%, метки города и шторма, кнопки [A] / [B], «👇 НАПИШИ СВОЙ ВЫБОР В КОММЕНТАРИЯХ!» |

## Пересборка

```bash
pip install numpy scipy opencv-python-headless pillow edge-tts onnxruntime soundfile
npm i -g playwright   # нужен Chromium
mkdir -p build/models
curl -L -o build/models/esrgan_x4.onnx https://huggingface.co/imgdesignart/realesrgan-x4-onnx/resolve/main/onnx/model.onnx
curl -L -o build/models/depth.onnx https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
./build.sh
```

Тексты озвучки — в `tools/voiceover.py`, тайминги событий — в `tools/timeline.py` (`cues`),
внешний вид HUD — `tools/hud/hud.css`, анимация HUD — `tools/hud/hud.js`, камера и эффекты каждого шота —
`camera_for()` / `render_shot()` в `tools/render_scene.py`.
