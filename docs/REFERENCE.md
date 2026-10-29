# Справочник project.yaml

Всё, что можно написать в `projects/<id>/project.yaml`. Рабочие примеры: [`projects/tanker`](../projects/tanker/project.yaml) (sci-fi, 61 с), [`projects/tea`](../projects/tea/project.yaml) (рисованная акварель, 36 с) и [`projects/school`](../projects/school/project.yaml) (полностью нарисованный кодом, 59 с). Пошаговый процесс описан в [MANUAL.md](MANUAL.md), своя графика (`draw:`) и все актёры — в [DRAW.md](DRAW.md).

## 0. Соглашения

**Время.** Число означает абсолютные секунды видео. Строка с `@` — ссылка, которую движок превращает в секунды на этапе `compile`:

| Запись | Значение |
|---|---|
| `"@Вода"` | начало слова «Вода» в текущей сцене (регистр и `ё/е` не важны, пунктуация игнорируется) |
| `"@Вода.end"` | конец слова |
| `"@не#2"` | второе вхождение слова в сцене |
| `"@finale/Напиши"` | слово из другой сцены |
| `"@intro.start"`, `"@intro.end"`, `"@intro.vo_start"`, `"@intro.vo_end"` | границы сцены: картинка / голос |
| `"@start"`, `"@end"` | начало/конец текущего контекста: сцены (для `hud`, `sfx`) или шота (для `effects`) |
| `"@shot:door.start"`, `"@shot:door.end"` | границы шота |
| `"@cue:slam"` | именованная метка из `cues:` |
| `"@video.end"` | конец ролика |
| `"@Вода+0.3"`, `"@end-0.25"` | любая ссылка со смещением |

**Координаты.** Для эффектов, якорей и масок это пиксели «плиты» — кадра после подготовки (по умолчанию 1296×2304, то есть экран 1080×1920 с запасом ×1.2 на движение). Сетку координат строит `python3 vg.py grid <id>`. Для HUD (`x`, `y`) — пиксели экрана 1080×1920.

**Цвета.** Имя (`teal green red amber toxic violet pink orange white gold blue black`), `"#ff8800"`, `"255,136,0"` или `[1, 0.5, 0]` (0..1).

**Глубина (`depth`, `d`).** Disparity из Depth Anything: 1 — ближайшее к камере, 0 — горизонт/небо.

---

## 1. Верхний уровень

| Ключ | По умолчанию | Описание |
|---|---|---|
| `title` | `""` | название |
| `format` | `{width: 1080, height: 1920, fps: 30, plate_scale: 1.2}` | формат; `plate_scale` — запас кадра для движения камеры |
| `voice` | см. §2 | озвучка |
| `voices` | `{}` | голоса героев для реплик: `{marta: {voice: ru-RU-SvetlanaNeural, pitch: "+18Hz"}, hans: {voice: ru-RU-DmitryNeural, pitch: "-10Hz"}}` — см. `lines` у сцены (§4) |
| `theme` | см. §3 | оформление HUD и субтитров |
| `post` | `{vignette: 0.42, chromatic: 0.0016, grain: 0.022}` | общая постобработка: виньетка, хроматическая аберрация, зерно (0 — выключить) |
| `dim` | `[]` | приглушение HUD: `[{at, until, level: 0.38, dur: 0.12}]` (например, «выключили свет») |
| `cues` | `{}` | глобальные метки `имя: "@ссылка"` |
| `hud` | `[]` | HUD-элементы на всё видео (§7) |
| `draw` | `{}` | общие настройки для всех нарисованных шотов (`palette`, `bg`, …), см. [DRAW.md](DRAW.md) |
| `audio` | см. §8 | музыка, амбиенс, эффекты |
| `scenes` | — | список сцен (§4) |

## 2. voice

| Ключ | По умолчанию | Описание |
|---|---|---|
| `voice` | `ru-RU-DmitryNeural` | голос. **Microsoft Edge TTS** (бесплатно, онлайн): русские `ru-RU-DmitryNeural` (муж.), `ru-RU-SvetlanaNeural` (жен.); **мультиязычные голоса говорят по-русски живее** (шире интонация, ровнее ударения): `fr-FR-RemyMultilingualNeural` (муж., рассказчик «Люди выпадают из фотографий»), `en-US-AndrewMultilingualNeural` (тёплый муж.), `en-US-BrianMultilingualNeural`, `en-US-AvaMultilingualNeural` (жен.), `en-US-EmmaMultilingualNeural`, `de-DE-FlorianMultilingualNeural`, `de-DE-SeraphinaMultilingualNeural`. Мультиязычные читают медленнее русских — ставьте `rate` на 5–8 % выше. **Локальный голос (офлайн, процессор):** `vosk:female_0`, `vosk:female_1`, `vosk:female_2`, `vosk:male_0`, `vosk:male_1` — модель Vosk‑TTS ru 0.9 (≈750 МБ, ставится `VG_LOCAL_TTS=1 ./setup.sh`); слова по времени размечаются офлайн-распознавателем Vosk по известному тексту; медленнее Edge (минуты на ролик) и менее выразительно, зато без интернета и сервиса. Весь список Edge — `edge-tts --list-voices` |
| `rate` | `+20%` | темп речи |
| `pitch` | `+0Hz` | высота голоса (`-4Hz` — чуть ниже и «увереннее») |
| `lead_in` | `0.25` | тишина перед первым словом |
| `gap` | `0.42` | пауза между сценами (для отдельной сцены — `gap_after`) |
| `tail` | `1.6` | пауза после последнего слова (держим финальный экран) |
| `pause_long` / `pause_short` | `0.55` / `0.28` | паузы длиннее `pause_long` сокращаются до `pause_short` (динамичный темп) |
| `keep_pauses` | `{}` | `{слово: секунды}` — после этих слов пауза остаётся длиннее (драматическая) |
| `scene_lead` | `0.22` | картинка сцены начинается за столько секунд до её первого слова |

Сцена может переопределить голос: `voice: {voice: ..., rate: ...}`.

**Диалог в одной сцене.** `lines: [{who: hans, say: "Сиди дома."}]` у сцены: `say` — дословный кусок `text`, `who` — имя голоса из
`voices`. Сцена синтезируется по кускам (рассказ — голосом сцены, реплики — голосами героев) и склеивается в одну дорожку, поэтому
кадры и субтитры идут через диалог без склеек. У `ru-RU-DmitryNeural` бывают случайные отказы сервиса — движок сам повторяет запрос
с незаметным сдвигом высоты на 1–5 Гц. Подпишите говорящего на экране (выноска с именем у героя при первой реплике).

## 3. theme

| Ключ | Описание |
|---|---|
| `preset` | `scifi` (тёмное неоновое стекло, Exo 2), `minimal` (светлые карточки, Montserrat), `pop` (жирные обводки и жёсткие тени, Unbounded), `documentary` (засечки Playfair, тонкие линии), `archive` (утёкший архив: почти чёрный, сталь, белый; Oswald / IBM Plex Mono / Inter, субтитры без обводки с тенью) |
| `accent` | цвет по умолчанию (у сцены — свой `accent`) |
| `captions` | субтитры: `enabled` (true), `style` (`neon_word` · `box_word` · `minimal` · `karaoke` · `outline_pop` · `clean` — жирный белый с обводкой, сказанные слова цветом сцены), `top` (1250), `size` (64), `uppercase` (true), `max_words` (4), `max_chars` (19), `animation` (`pop` · `rise` · `none`), `pop` (0.07, «подпрыгивание» активного слова), `hide: [{from, until}]` (скрыть, например, когда на экране кнопки выбора) |

Собственные стили проекта можно положить в `projects/<id>/hud.css` — они подключатся после темы.

## 4. scenes[]

| Ключ | Описание |
|---|---|
| `id` | уникальное имя (латиница) |
| `text` | текст диктора. Пишите как говорят: короткие фразы, тире для паузы, `ё` для правильного ударения |
| `accent` | цвет HUD сцены |
| `caption_color` | цвет активного слова в субтитрах (по умолчанию `accent`) |
| `caption_marks` | `{"фраза": цвет}` — эти слова в субтитрах всегда своим цветом (например, `{"нет уборщиков": red}`) |
| `captions_top` | позиция субтитров для всей сцены |
| `clock` | `[день, часы, минуты]` для `{day}`/`{time}` в topbar |
| `gap_after` | пауза после сцены, с |
| `voice` | переопределение голоса |
| `lines` | реплики героев своими голосами: `[{who, say}]` (см. §2) |
| `cues` | метки `имя: "@ссылка"` (видны во всём проекте как `@cue:имя`) |
| `shots` | список шотов (§5) |
| `hud` | HUD-элементы сцены (§7); по умолчанию живут от начала до конца сцены |
| `sfx` | звуковые события (§8.3) |

## 5. shots[]

| Ключ | Описание |
|---|---|
| `id` | имя шота |
| `plate` | имя файла в `plates/` без расширения (по умолчанию `id`) |
| `draw` | вместо `plate`: сцена, нарисованная кодом — `{bg, world, camera, layers: [актёры], palette, depth}`. Всё описано в [DRAW.md](DRAW.md) |
| `start` | начало шота (для первого шота сцены — начало сцены). Конец — начало следующего шота или конец сцены |
| `prompt` | (необязательно) промпт, которым сгенерирован кадр — для истории |
| `camera` | движение камеры (§5.1) |
| `masks` | именованные маски (§5.2) |
| `effects` | список эффектов (§6) |
| `look` | `{bloom: [порог, сила, оттенок], grade: {exposure, contrast, sat, lift: [r,g,b], gain: [r,g,b]}}` |
| `transition` | переход В этот шот: `{type, dur, ...}` (§5.3) |
| `anchors` | точки для HUD: `{имя: [x, y]}` или `[x, y, depth]` — HUD с `anchor: имя` будет «прилеплен» к объекту |
| `captions_top` | позиция субтитров на время шота |
| `ambience` | фоновые звуки шота (§8.2) |

### 5.1 camera

```yaml
camera:
  keys:                      # ключевые кадры: t — секунды от начала шота, "end", "end-0.5" или "@ссылка"
    - {t: 0, z: 1.24, x: 705, y: 915, roll: 0}     # z — зум (1 = экран показывает центральные 1080x1920 плиты)
    - {t: 4.6, z: 1.02, x: 648, y: 1175, ease: inout}   # ease: inout | linear | in | out
    - {t: end, z: 1.07}      # пропущенные значения наследуются
  sway: {x: 10, y: 8, roll: 0.8, freq: 0.12}       # плавное «дыхание»/качка (px, px, градусы, Гц)
  bob: {freq: 1.9, x: 5, y: 7, roll: 0.6}          # шаги при ходьбе
  parallax: {px: 16, py: 8, freq: 0.12, k: [0, 0.05], k_ease: linear, d0: 0}
  intro: {dur: 0.35, z: 0.18}                      # в начале шота камера «оседает» с доп. зумом
  push_end: {dur: 0.35, z: 0.25, k: 0.3}           # разгон вперёд в конце шота (перед zoom-переходом)
  shakes: [{at: "@cue:slam", amp: 30, dur: 0.55, freq: 17}]   # тряска (удар, взрыв)
```

**Параллакс** даёт 3D-ощущение, сдвигая пиксели пропорционально глубине:
- `px`, `py` — амплитуда бокового качания (в пикселях на единицу глубины);
- `k` — «наезд»: близкие объекты увеличиваются быстрее дальних (`[от, до]` за шот). 0.05–0.1 — мягко, 0.25 — быстрый проход по коридору;
- `d0` — глубина, которая остаётся неподвижной. 0 — неподвижен горизонт (камера летит вперёд). 0.8–0.9 — неподвижен предмет в руках, а фон «плывёт».

Безопасные пределы: `z ≥ 1.0` при центре кадра, `|x − 648| ≤ 108`, `|y − 1152| ≤ 192` (иначе край плиты попадёт в кадр). При `z ≥ 1.2` смещать центр можно сильнее.

### 5.2 masks

Маска — карта 0..1 в координатах плиты. Нужна, чтобы эффект работал только на части кадра. Ключи в одной маске перемножаются.

| Ключ | Описание |
|---|---|
| `lum: [lo, hi]` | яркость (плавный порог) |
| `sat: [lo, hi]`, `val: [lo, hi]` | насыщенность, максимум канала |
| `hue: cyan/teal/green/red/blue/magenta/yellow/orange/warm/cool`, `hue_range: [lo, hi]` | цветовой тон (по разности каналов); по умолчанию `hue_range` = `[0.08, 0.3]` |
| `y_min`, `y_max`, `x_min`, `x_max` | число — жёсткая граница, `[a, b]` — плавная |
| `depth_min`, `depth_max` | по глубине |
| `circle: [cx, cy, r]` (+`soft`), `ellipse: [cx, cy, rx, ry]`, `rect: [x0, y0, x1, y1]` (+`soft`) | фигуры |
| `cone: {from: [x, y], to: [x, y], spread: 0.38, width: 40}` | луч фонаря/прожектора |
| `mul: [другая_маска]` | умножить на другие маски |
| `invert: true`, `blur: 6` | инверсия, размытие |

Пример: `neon: {sat: [0.35, 0.7], val: [0.4, 0.8], y_max: 1000}` — неоновые полосы в верхней части кадра.

### 5.3 transition

| type | Описание | Параметры |
|---|---|---|
| `cut` | обычная склейка | — |
| `whip_x`, `whip_y` | резкий смаз-панорама | `dur` (0.36), `amp`, `dir: forward/back`, `flash` |
| `zoom` | «влёт» с радиальным размытием | `dur`, `flash` |
| `slam` | удар → 3 чёрных кадра → проявление с RGB-сдвигом | `dur` |
| `glitch` | цифровой сбой: полосы и RGB-сдвиг | `dur` |
| `dip` | провал в цвет | `dur`, `color` (black), `depth` |
| `flash` | вспышка в белое (молния → закат) | `dur`, `pre`, `post` |
| `fade` | проявление из чёрного (подходит для первого шота) | `dur` |
| `dissolve` | плавный наплыв двух шотов | `dur` |

Звук перехода подбирается автоматически (§8.4). Выключить его можно через `sfx: false`.

---

## 6. effects[]

Каждый эффект — `{type: ..., параметры}`. Применяются по порядку. У большинства эффектов есть временное окно `from` / `until` (+ `fade_in` / `fade_out`).

| type | Что делает | Основные параметры |
|---|---|---|
| `water` | рябь воды (смещение пикселей) | `horizon` + `dmax` — далёкое море ниже горизонта; или `region: [x0, y0, x1, y1]` — пруд, лужа, чашка; `amp` (2–3) |
| `ripples` | круги на воде от точек | `points: [[x, y], ...]`, `y_min`, `circle: [cx, cy, r]`, `amp`, `freq`, `speed`, `reach`, `squash` |
| `sky_drift` | медленный дрейф облаков | `y_max: [a, b]`, `speed` (px/с), `wobble` |
| `fog` | живой туман/дымка (сильнее вдали) | `color`, `density` (0.1–0.3), `curve` (чем больше, тем только дальний план), `scale`, `vel: [vx, vy]`, `lift`, `band: {space: plate/screen, rise: [a, b], fall: [c, d], floor}`, `mask` |
| `haze` | светящаяся дымка в круге (газ, пар над люком) | `at`, `depth`, `offset_y`, `sigma`, `color`, `intensity`, `vel`, `scale` |
| `glow` | мягкий источник света | `at: [x, y]` (`space: screen` — экранные координаты), `depth`, `sigma`, `color`, `intensity`, `pulse: {freq, amp}`, `from/until` |
| `god_rays` | лучи от солнца в небе | `at`, `horizon`, `intensity` (≈0.045), `sigma`, `color`, `f1`, `f2` |
| `light_pool` | пятно света (фонарь), выключение с миганием | `at`, `sigma`, `gain`, `color`, `off_at`, `off_level`, `flicker` |
| `flash` | вспышка яркости всего кадра | `events: [{at, amp, decay}]` |
| `exposure` | плавная смена экспозиции | `keys: [{at, value, dur}]` |
| `tint_pulse` | цветовой «удар» (красный при опасности) | `at`, `decay`, `gain: [r, g, b]`, `lift: [r, g, b]` |
| `lightning` | молния: подсветка неба/маски | `events: [{at, amp}]`, `decay`, `mask` или (`depth_max` + `horizon`), `gain`, `color` |
| `mask_pulse` | пульсация яркости в маске (неон, светящийся предмет) | `mask`, `amount`, `freq`, `base`, `phase` |
| `mask_flicker` | мерцание (неисправный неон, фонарь) | `mask`, `amount`, `freq`, `base`, `drop_prob`, `drop`, `spike_prob`, `spike`, `seed` |
| `mask_gain` | постоянное усиление в маске | `mask`, `gain`, `from/until` |
| `flow` | текущая вода/свет по маске (струи, водопад, блики) | `mask`, `exclude`, `texture: flow/fine`, `scale`, `stretch: [sx, sy]`, `angle` (0 — вниз), `speed`, `threshold`, `gain`, `color`, `boosts: [{at, mul, dur}]` |
| `caustics` | каустика на воде | `mask`, `gain`, `color`, `scale` |
| `rain` | дождь (2+ слоя) | `layers: [{count, length, angle, speed, thickness, alpha}]`, `blur`, `color`, `mask` |
| `window` | окно/иллюминатор: тёмная улица, молнии высвечивают, объект «проплывает» | `circle`, `glow_mask`, `base`, `glow_keep`, `flashes`, `sustain: {at, level, ramp}`, `slide: {at, dx, dur, drift}`, `bob`, `interior: {pool: [x, y, sigma], gain, off_at, off_level, flash_gain}`, `rain` |
| `particles` | частицы (§6.1) | `mode`, … |

### 6.1 particles

Общие параметры: `count`, `size: [min, max]`, `color`, `alpha`, `seed`, `glow: {size, alpha, color}` (ореол), `blend: over` (непрозрачные частицы вместо светящихся), `shape: petal` (лепестки, хлопья — эллипсы с вращением), `soft`, `from/until`.

| mode | Для чего | Параметры |
|---|---|---|
| `rise` | пылинки, пепел, медленно всплывающие по экрану | `speed: [min, max]` (доли экрана в секунду), `x_range`, `wobble` |
| `fall_loop` | снег, лепестки сакуры, пепел сверху вниз | `speed: [px/с]`, `sway`, `drift` |
| `drift` | пыль в объёме сцены, движется вместе с камерой | `region: [x0, y0, x1, y1]`, `depth: [d0, d1]`, `boost_mask` + `boost` (ярче в луче) |
| `emanate` | споры, искры, светлячки, вылетающие из области к зрителю | `center`, `radius: [rx, ry]`, `life`, `spread`, `rise`, `boosts` |
| `smoke` | пар из чашки/чайника, дым | `center`, `rise`, `drift`, `spread`, `wobble`, `life`, `depth` |
| `burst` | разовый выброс (пыль сверху от удара) | `at`, `x_range`, `gravity`, `decay` |
| `path` | капли по траектории (из воронки в колбу) | `path: [[x0, y0], [x1, y1]]`, `rate`, `jitter_x`, `depth` |
| `glints` | искорки-блики на воде | `center_x`, `spread`, `max_dx`, `y_range`, `depth` |

---

## 7. HUD

### 7.1 Общие свойства любого элемента

| Ключ | Описание |
|---|---|
| `component` | тип (§7.2) |
| `at`, `until` | время появления/исчезновения. По умолчанию — начало и конец сцены (у глобальных — всё видео) |
| `x`, `y`, `align` | позиция на экране и точка привязки: `"left top"`, `"center top"`, `"center middle"`, `"right top"`, … |
| `anchor`, `offset: [dx, dy]` | прилепить к точке из `anchors` шота (следует за камерой) |
| `color` | акцент элемента (по умолчанию — цвет сцены) |
| `enter`, `enter_dur` | `fade pop zoom stamp slide_left slide_right slide_up slide_down swing_left swing_right flip_x flip_up unfold glitch none` |
| `exit`, `exit_dur` | `glitch fade zoom_out shrink none` |
| `tilt: {x, y, z, sway, freq, perspective}` | 3D-наклон панели и лёгкое покачивание |
| `float: {amp, freq}` | парение вверх-вниз |
| `scale` | масштаб |
| `moves: [{at, dur, x, y, scale, tilt_y}]` | анимированное перемещение (например, свернуть панель в угол) |
| `sfx: false`, `sfx_gain: -3` | выключить или сделать тише автоматический звук элемента |

Текст поддерживает `**выделение акцентным цветом**`, перенос `\n` и эмодзи.

### 7.2 Компоненты

| component | Описание | Свойства |
|---|---|---|
| `frame` | рамка-визор: уголки + верхняя строка | `brackets` (true), `topbar: {left, right, right_color, dot}` с шаблонами `{day}` `{time}` `{scene}`, `boot` (true), `alerts: [{at, dur, color}]` (мигание уголков) |
| `edge` | пульсирующая рамка по краю экрана | `freq`, `min`; `decay: true` — разовая вспышка, затухающая к `until` |
| `title` | большой заголовок с «расшифровкой» букв | `kicker`, `text`, `size`, `width`, `decode` (true), `rule` (true) |
| `marker` | плашка раздела с иконкой | `icon`, `text`, `tone: positive/negative/warning/neutral` (звук) |
| `chip` | маленькая метка | `icon`, `text`, `blink` (Гц) |
| `alert` | мигающий баннер тревоги | `icon`, `text`, `strobe` (с) |
| `stamp` | «штамп» поверх кадра | `icon`, `text` |
| `cta` | призыв к действию | `emoji` или `icon`, `text`, `style: accent` |
| `text` | любой текст | `text`, `style: (пусто)/box/pill`, `font: (display)/body/mono`, `size`, `weight`, `width`, `text_align`, `ink`, `typewriter` (с) |
| `list` | нумерованный список, пункты появляются по очереди | `title`, `items: [{text, at, icon}]`, `numbered`, `width`, `highlight` |
| `counter` | счётчик-число | `from`, `to`, `count_at`, `dur`, `decimals`, `prefix`, `suffix`, `separator`, `label`, `size` |
| `progress` | полоса прогресса | `label`, `value` (число или ключи), `max`, `right: "{v}%"`, `width` |
| `stats` | панель показателей с иконками и полосками | `title`, `rows: [{icon, label, value, unit, max, decimals, color, anim: beat/spin/bob}]`, `width`, `stagger`, `count_dur` |
| `meter` | крупный показатель + сегменты + предупреждения | `title`, `icon`, `value` (число или ключи `[{at, v, dur/until, ease}]`), `unit`, `max`, `segments`, `min_segments`, `blink`, `warn: [{at, text, blink}]`, `width` |
| `choices` | кнопки выбора A/B/… | `options: [{key, text, color, highlight_at}]`, `alternate_from`, `period`, `stagger`, `width` |
| `prohibit` | знак «запрещено» поверх объекта | `anchor`, `size`, `label`, `sublabel` |
| `hazard` | 3D-табличка опасности с полосами | `anchor`, `symbol` (☣), `title`, `subtitle`, `freq` |
| `pips` | индикаторы, гаснущие по одному («3 вдоха») | `label`, `offs: [время, ...]`, `symbol` |
| `radar` | 3D-радар со сканером и целью | `size`, `sweep` (°/с), `blip: {at, until, from: [r, deg], to: [r, deg]}`, `dist: [от, до]`, `label: "КОНТАКТ · {dist} М"`, `idle`, `tilt_x` |
| `target` | рамка-прицел вокруг объекта с подписью | `anchor`, `w`, `h`, `label`, `label_align: left/right`, `pulse` |
| `holo3d` | стеклянная панель с живой 3D-голограммой | `model`, `width`, `height`, `title`, `title_alt: [{at, text}]`, `right` (шаблон из параметров, например `"СКАН {scan}%"`), `params` (§7.4), `labels: [{key, text, color, at}]`, `flag: {key, title, subtitle, at, color, alt: [{at, title, subtitle}]}`, `steps: [{text, at}]`, `model_opts` |
| `image` | картинка или эмодзи-стикер | `src` (путь от папки проекта) или `emoji`, `width`, `height`, `spin`, `wiggle`, `bob` |
| `lower_third` | плашка «имя / место» | `title`, `subtitle` |

### 7.3 Иконки

SVG: `check x warning warning_solid heart drop lock fuel info star bolt clock arrow_down play target leaf question`. Символы: `radiation ☢`, `biohazard ☣`, `skull ☠`, `sonar ◉`, `cross ✕`, `bolt_glyph ϟ`, `target_glyph ◎`. Можно указать любой эмодзи: `icon: "🍵"`.

Эмодзи в комплекте (Twemoji, одинаково выглядят везде): 👇👉👆👈🔥💧❤️☢️☣️✅❌⚠️⭐💀🎯🧭⛽🌊⚡🌙☀️🍵🌸🏯🙏💡❓❗📌🚀🪐🌍🧠💰📈🕒👀😱🤯👍💬🔔🎉🍃🏮🫖🎌🌅🛟🔒🗺️⏳💥🌀🧪🛡️🏆🎬🎵. Остальные эмодзи берутся из системного шрифта Noto Color Emoji. Добавить свой — положить SVG в `engine/hud/vendor/emoji/` и вписать код в `index.json`.

### 7.4 3D-модели для holo3d

| model | Что это | params (значение или рампа `{at, dur/until, from, to, ease}`) | точки для labels/flag |
|---|---|---|---|
| `still` | солнечный дистиллятор: бассейн, плёнка, чашка, пар, капли | `fill`, `glow` | `sun`, `sheet`, `sea`, `cup` |
| `tanker` | чертёж танкера с подсвечиваемым мостиком | `reveal`, `scan`, `safe`, `locked` | `bridge` |
| `globe` | вращающаяся планета с маркерами | `spin`, `reveal`; `model_opts: {color, markers: [{lat, lon, key}]}` | ключи маркеров |

Новая модель — файл `engine/hud/models/<name>.js` (по образцу `globe.js`) плюс строка в `models/index.js`.

---

## 8. audio

```yaml
audio:
  music: {...}          # §8.1
  ambience: {}          # можно задать и прямо в шоте (shot.ambience)
  sfx: []               # события на всё видео (у сцены — scene.sfx)
  auto: {hud: true, transitions: true, boot: true}
  duck: 0.6             # насколько приглушать музыку под голосом (0..1)
  vo_gain: 0            # громкость голоса, дБ
  loudness: -14         # итоговая громкость LUFS (стандарт TikTok/Reels)
```

### 8.1 music

| Ключ | Описание |
|---|---|
| `preset` | `synth` (по умолчанию) или `none` |
| `file` | путь к своему треку (от папки проекта): mp3/wav. Используйте только треки с правом использования. Доп. ключи: `start`, `fade_in`, `fade_out` |
| `key`, `mode`, `bpm`, `gain` | тональность (`D`), лад (`minor`/`major`), темп, громкость в дБ (-13) |
| `sections` | `[{at, until, style, chords, gain, cutoff, drums, div, pentatonic, shimmer}]` — секция звучит от `at` до следующей секции или своего `until` |

Аккорды: `Dm`, `Bb`, `F#m7`, `Cmaj7`, `Gsus4`, `Aadd9`, `E5`, … Если аккорды не указаны: минор — i–VI–III–VII, мажор — I–V–vi–IV.

| style | Характер | Где использовать |
|---|---|---|
| `drone` | тёмный тянущийся пэд, нарастает | интро, загадка |
| `pulse` | аккорды + басовая пульсация восьмыми + бочка | основное действие |
| `tension` | приглушённые аккорды, бас четвертями, хай-хэт | предупреждение, «нельзя» |
| `dark` | тритон, нарастающие 16-е хэты | угроза |
| `sub` | только суб-бас (почти тишина) | «замри», саспенс |
| `epic` | яркие аккорды + арпеджио + бас + бочка | финал, призыв к действию |
| `calm` | мягкий пэд + пентатоническое арпеджио (`div: 4/8`) | лайфстайл, природа, Азия |
| `lofi` | электропиано, свинг-хэты, мягкие барабаны, винил | уютные, «учебные» ролики |
| `upbeat` | бочка на каждую долю, хлопки, стабы | факты, топы, юмор |
| `silence` | тишина | — |

### 8.2 ambience (по шотам)

`ambience: [{sound, gain (дБ, ≈ −10…−24), lowpass, ...параметры}]`. Каждый слой нормализуется по громкости, `gain` задаёт итоговый уровень.

| sound | Параметры |
|---|---|
| `ocean` | `calm`, `seed` |
| `wind` | `f0`, `f1` |
| `rain` | `density` |
| `storm` | `cutoff` (приглушение «за стеклом») |
| `hum` | `f` (50) — гул электрики/машин |
| `rumble` | `cutoff` — низкий гул, трюм |
| `stream` | струя воды |
| `shimmer` | `density`, `f0`, `f1` — стеклянные переливы |
| `room` | тихий «воздух» помещения |
| `birds` | `density` |
| `fire` | треск огня/углей |
| `chimes` | `base`, `density` — колокольчики (пентатоника) |
| `water_calm` | плеск у берега |
| `space` | `f` — космический гул |
| `city` | гул города |

### 8.3 sfx (события)

`{sound, at, gain (дБ пика), pan (-1..1), reverb: room/hall/metal/cave, wet, lowpass, highpass, repeat: {count, every, jitter}, vary: {параметр: [min, max]}, ...параметры звука}`

| sound | Параметры |
|---|---|
| `blip` | `f`, `d`, `kind: sine/tri/square`, `f2` (глиссандо) |
| `chime` | `freqs: [...]`, `step` |
| `bell` | `f`, `d` |
| `gong` | `f`, `d` |
| `buzz` | `f`, `d`, `n`, `gap` (ошибка) |
| `alarm` | `f1`, `f2`, `d`, `n` |
| `ping` | `f`, `d` (сонар) |
| `click`, `pop` (`f`), `typing` (`n`, `step`, `f`), `boot`, `sparkle` | интерфейс |
| `whoosh` | `d`, `f0`, `f1`, `up` |
| `riser` | `d`, `f0`, `f1` (басовое нарастание) |
| `boom`, `impact`, `kick` | `d`, `f0`, `f1`, `noise` |
| `slam` | `d`, `base` (тяжёлая металлическая дверь) |
| `metal_ring` | `d`, `base`, `seed` |
| `creak` | `d`, `f0`, `f1` |
| `groan` | `d`, `f` (стон металла) |
| `scrape` | `d`, `seed` (скрежет) |
| `thunder` | `d`, `crack`, `seed` |
| `heartbeat` | — |
| `breath` | `d` |
| `creature` | `d`, `f0`, `f1` (рёв гиганта) |
| `drip` | `f` |
| `footstep` | `seed`, `surface: metal/wood/stone` (с `repeat` шаги чередуются автоматически) |
| `glitch` | `d`, `seed` |
| `hiss`, `noise_sweep` | `d`, `f0`, `f1` |

### 8.4 Автоматические звуки

`auto.hud`: у каждого HUD-элемента свой звук — маркер (позитивный — перезвон, негативный — «ошибка», предупреждение — сирена), панели (блипы, тики счётчика), заголовок (райзер + бум + «печать»), радар (пинги), кнопки выбора (свист + клик + тоны подсветки), список (поп на каждый пункт) и т.д.

`auto.transitions`: whip/zoom — свист, glitch — цифровой сбой, dip — низкий свист, flash — райзер и удар, dissolve/fade — мягкий шорох.

`auto.boot`: звук включения визора в начале (если есть `frame`).

---

## 9. Команды

| Команда | Что делает |
|---|---|
| `python3 vg.py doctor` | проверка окружения |
| `python3 vg.py new <id> [--from tanker]` | новый проект из шаблона/копии |
| `python3 vg.py voice <id> [--force]` | озвучка (кэшируется по тексту) |
| `python3 vg.py compile <id>` | таймлайн; печатает длительность, сцены, шоты, метки |
| `python3 vg.py prep <id> [--jobs 4] [--fast]` | апскейл + глубина (`--fast` — без нейросетевого апскейла) |
| `python3 vg.py grid <id>` | сетки координат → `build/<id>/grid/` |
| `python3 vg.py preview <id> [--at 3.5,10] [--shots]` | несколько готовых кадров со всем HUD → `build/<id>/preview/preview.jpg` |
| `python3 vg.py draw <id> [--frames 0:300] [--force]` | нарисованные шоты → `build/<id>/drawn/` (неизменённые пропускаются; `scene` и `preview` вызывают его сами) |
| `python3 vg.py actors [id]` | список актёров для `draw:` (встроенные + свои актёры проекта) |
| `python3 vg.py scene <id> [--frames 0:300] [--workers 4]` | слой сцены |
| `python3 vg.py audio <id> [--stems]` | звук (`--stems` — дорожки отдельно в `build/<id>/stems/`) |
| `python3 vg.py hud <id> [--workers 3]` | HUD и субтитры поверх кадров |
| `python3 vg.py mux <id> [--maxrate 8M]` | итоговый файл `out/<id>.mp4` |
| `python3 vg.py qa <id>` | контактные листы (кадр в секунду) и громкость |
| `python3 vg.py all <id>` | всё по порядку (voice → compile → prep → draw → scene → audio → hud → mux → qa) |
| `python3 vg.py script formats [имя]` | форматы, типы крючков, роли, приёмы, звуки ([SCRIPTING.md](SCRIPTING.md)) |
| `python3 vg.py script new <id> --topic "…" [--format f] [--duration 60]` | заготовка сценария `projects/<id>/script.yaml` |
| `python3 vg.py script check <id> [--tts]` | тайминг сценария, замечания, оценка готовности 0–100 |
| `python3 vg.py script render <id> [--tts]` | документ сценария `projects/<id>/script.md` |
| `python3 vg.py script project <id> [--force]` | черновик `project.yaml` из сценария |
