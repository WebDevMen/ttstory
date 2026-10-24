# Своя графика: нарисованные сцены (`draw:`)

Кроме AI-кадров («плит»), шот может быть **нарисован кодом**: персонажи, здания, интерьеры, телефоны, карты, графики, надписи — всё это векторные «актёры» (SVG + HTML/CSS + библиотеки), которыми можно управлять до пикселя и до кадра. Никаких генераций, никаких случайностей: один и тот же `project.yaml` всегда даёт тот же ролик.

Пример целиком нарисованного ролика — [`projects/school`](../projects/school/project.yaml) («Один день в японской школе», 59 с). Каталог всех актёров с картинками — проект [`projects/gallery`](../projects/gallery/project.yaml) и картинка [`docs/img/actors.jpg`](img/actors.jpg).

---

## Оглавление

1. [Как это работает](#1-как-это-работает)
2. [Быстрый старт](#2-быстрый-старт)
3. [Шот `draw`: фон, мир, камера, слои](#3-шот-draw)
4. [Свойства любого элемента](#4-свойства-любого-элемента)
5. [Анимация: дорожки значений и шаги `anim`](#5-анимация)
6. [Якоря и выноски](#6-якоря-и-выноски)
7. [Каталог актёров](#7-каталог-актёров)
8. [Библиотеки: GSAP, Lottie, rough.js, D3, three.js](#8-библиотеки)
9. [Свои актёры проекта](#9-свои-актёры-проекта)
10. [Композиция и безопасные зоны](#10-композиция)
11. [Как Claude собирает графику под сценарий](#11-как-claude-собирает-графику-под-сценарий)
12. [Проблемы и решения](#12-проблемы-и-решения)

---

## 1. Как это работает

```
project.yaml ──compile──► timeline.json (все "@слова" превращены в секунды)
                               │
                               ├─► vg.py draw  — Chromium рисует каждый кадр draw-шотов:
                               │                engine/hud/draw.html + draw/runtime.js + актёры
                               │                → build/<id>/drawn/<шот>/<кадр>.jpg + камера и якоря
                               ├─► vg.py scene — те же эффекты, что для AI-кадров: частицы, туман, свечение,
                               │                bloom, грейдинг, переходы (whip, zoom, dissolve…), зерно
                               ├─► vg.py hud   — интерфейс и субтитры поверх
                               └─► звук, сведение, MP4
```

- Рисование детерминировано: время кадра `t` — единственный вход. Анимации не «проигрываются», а **вычисляются** для каждого кадра (так же устроен Remotion, только у нас всё привязано к словам диктора и описывается в YAML).
- В одном ролике можно смешивать AI-шоты (`plate:`) и нарисованные (`draw:`) — переходы, HUD, субтитры и звук работают одинаково.
- Повторный `vg.py draw` перерисовывает **только изменённые шоты** (сравнивается хэш шота и кода актёров). `--force` — перерисовать всё.

## 2. Быстрый старт

```yaml
scenes:
  - id: hook
    text: В японской школе нет уборщиков. Вообще.
    shots:
      - id: school
        draw:
          camera: {keys: [{t: 0, z: 1.0}, {t: end, z: 1.08}]}       # медленный наезд
          layers:
            - {actor: sky, hour: 8, par: 0}                          # небо утром, неподвижно
            - {actor: school, x: 540, y: 1190, time: 8.2, plaque: "第一中学校"}
            - {actor: ground, x: -300, y: 1186, w: 1700, h: 800, color: ["#e2cfa6", "#cdb386"]}
            - {actor: tree, kind: sakura, x: 70, y: 1330, h: 560, par: 1.15}
            - {actor: badge, x: 540, y: 600, at: "@нет", enter: stamp, title: "УБОРЩИКОВ: 0", style: solid, sfx: true}
        effects:                                                     # эффекты слоя сцены тоже работают
          - {type: particles, mode: fall_loop, shape: petal, count: 30, color: [1, 0.8, 0.88]}
```

```bash
python3 vg.py voice my && python3 vg.py compile my
python3 vg.py preview my --shots            # средние кадры шотов (draw → scene → HUD)
python3 vg.py preview my --at 1.2,3.4       # конкретные моменты
python3 vg.py all my                        # готовый ролик
python3 vg.py actors my                     # список актёров (встроенные + свои)
```

## 3. Шот `draw`

| Ключ | Описание |
|---|---|
| `bg` | фон: цвет, список цветов (вертикальный градиент) или `{type: linear/radial, stops: [[0, "#fff"], [1, "#eee"]], angle, at}` |
| `world` | размер мира `[w, h]` (по умолчанию экран 1080×1920). Больше экрана — для панорам: камера ездит по миру |
| `camera` | `keys: [{t, x, y, z, roll, ease}]` — как у обычной камеры: `t` в секундах от начала шота, `"end"`, `"end-0.5"`, `"@слово"`; `x, y` — точка мира в центре экрана, `z` — зум (векторный, без потери чёткости). Плюс `sway: {x, y, roll, freq}`, `shakes: [{at, amp, dur}]`, `follow: {id, dx, dy, axis: x/y/xy, k}` (следить за актёром) |
| `layers` | список элементов (актёров) в порядке рисования: первый — самый дальний |
| `palette` | свои имена цветов: `{brand: "#ff4a7a"}` → `color: brand` |
| `depth` | глубина для эффектов слоя сцены (туман и т.п.): число или `[верх, низ]` (по умолчанию `[0.1, 0.8]`) |

Остальные ключи шота работают как обычно: `start`, `transition`, `effects`, `look`, `ambience`, `captions_top`, `anchors`. Координаты эффектов (`glow.at`, `particles.center`…) для draw-шотов задаются в пикселях мира и двигаются вместе с камерой.

Общие настройки для всех draw-шотов проекта — ключ верхнего уровня `draw:` (например, `draw: {palette: {...}}`).

**Параллакс.** У каждого элемента есть `par` (по умолчанию 1): `0` — неподвижен относительно экрана (небо), `0.3` — далёкий план (едет медленнее), `1` — основной план, `1.2` — передний план (едет быстрее). Это настоящая многоплановая камера: при движении камеры планы смещаются с разной скоростью.

`space: screen` — элемент в координатах экрана, камера на него не влияет (подписи, выноски, бейджи поверх панорамы).

## 4. Свойства любого элемента

| Ключ | Описание |
|---|---|
| `actor` | имя актёра (§7) |
| `id` | имя для якорей, выносок и `camera.follow` |
| `x`, `y` | позиция точки привязки актёра (у людей, зданий, деревьев — середина низа; у карточек, текста — центр) |
| `scale`, `sx`, `sy`, `rot`, `opacity`, `flip` | масштаб, растяжение, поворот (°), прозрачность, зеркально по горизонтали |
| `origin` | точка привязки: `center`, `bottom`, `top`, `left`, `right`, `top-left`… или `[x, y]` в пикселях актёра |
| `at`, `until` | когда элемент на экране (секунды или `"@слово"`). По умолчанию — весь шот |
| `enter` | появление: `fade pop zoom stamp grow grow_x grow_y slide_up slide_down slide_left slide_right rise drop fly_left fly_right fly_up fly_down spin flip_x flip_y blur wipe_left wipe_right wipe_up wipe_down iris draw`. Длительность — `enter_dur`; объект `{type, dur, ease, dist, delay}` |
| `exit` | исчезновение в конце `until`: `fade shrink zoom slide_* fall fly_* blur wipe_left wipe_right iris draw`, `exit_dur` |
| `anim` | шаги анимации (§5) |
| `float`, `bob`, `wiggle`, `sway`, `pulse`, `spin`, `blink`, `flicker`, `shakes` | «живые» циклы: парение `{amp, freq}`, подпрыгивание, покачивание `{rot, freq}`, плавное покачивание, пульсация `{amp, freq, phase}`, вращение (°/с), мигание `{freq, duty, min, phase}` (две мигалки в противофазе — `phase: 3.14`), мерцание неона, тряска `[{at, amp, dur}]` |
| `glow` | свечение: цвет или `{color, r, a}`; сила во времени — `glow_k` |
| `shadow` | мягкая тень: `true` или `{x, y, blur, color, a}` |
| `blur`, `brightness`, `saturate`, `contrast`, `hue`, `grayscale` | CSS-фильтры (можно анимировать) |
| `tilt_x`, `tilt_y`, `persp` | 3D-наклон |
| `blend`, `clip` | режим наложения, `clip-path` |
| `sfx` | звук при появлении: `true` (по типу `enter`), имя звука или `{sound, gain, offset, ...}` |

`enter: draw` «прорисовывает» контуры (линии, стрелки, эскизы) — как будто их рисуют от руки.

## 5. Анимация

**Любое** свойство — и общее (`x`, `scale`, `opacity`…), и свойство актёра (`level` у батареи, `hour` у неба, `pose` у персонажа) — может меняться во времени.

**Дорожка значений** (track):
```yaml
level: [{at: 0, v: 80}, {at: "@ток", v: 25, dur: 1.2, ease: inOut}]   # первое значение действует с начала
hour: {at: "@start", from: 17, to: 20, dur: 2.5}                       # одна анимация
pose: [{at: 0, v: sit}, {at: "@Кирицу", v: stand, dur: 0.35}]          # позы плавно перетекают
text: [{at: 0, v: "07:30"}, {at: "@Восемь", v: "08:30"}]               # строки переключаются
```
Плавно интерполируются числа, списки чисел, цвета `#rrggbb` и объекты (позы); остальное переключается в момент `at`.

**Шаги `anim`** — несколько свойств сразу:
```yaml
anim:
  - {at: "@start", dur: 3.6, x: 2600, ease: linear}        # проезд поезда
  - {at: "@стоп", dur: 0.4, dy: -40, scale: 1.2}            # dx/dy — относительно предыдущего положения
  - {at: "@бросок", dur: 1.2, path: [[0, 0], [300, -200], [600, 0]], orient: true}   # по кривой
```

**Easing:** `linear in out inout back expo inQuad outQuad inOutSine outBounce outElastic step` — и **любая строка GSAP**: `"back.out(2)"`, `"elastic.out(1,0.4)"`, `"power3.inOut"`, `"steps(5)"`, `"bounce.out"`.

## 6. Якоря и выноски

Ссылка на точку актёра: `"id"` (точка привязки), `"id.имя"` или `"id.имя:аргументы"`:

| Актёр | Якоря |
|---|---|
| `person` | `head`, `face`, `top`, `hand_l`, `hand_r` (вид спереди), `hand` (вид сбоку), `hip` |
| `building` | `win:этаж,столбец`, `roof` |
| `school` | `clock`, `door`, `roof`, `win:этаж,столбец` |
| `lockers`, `window_grid` | `cell:ряд,столбец` |
| `classroom` | `seat:ряд,столбец` (голова ученика) |
| `tray` | `rice`, `soup`, `main`, `salad`, `milk`… |
| `phone` | `screen` |
| `map` | `pin:номер`, `lonlat:долгота,широта` |
| `holo` | точки 3D-модели |

Где используются:
- `callout` с `target: "home.win:7,3"` — плашка с пунктиром к окну, линия следует за объектом при движении камеры;
- HUD-компоненты с `anchor: "kid.top"` — интерфейс «прилипает» к нарисованному объекту (координаты передаются из рисования в HUD автоматически); короткие имена можно задать в шоте: `anchors: {clock: "school.clock"}`.

## 7. Каталог актёров

Все размеры — в пикселях экрана при `scale: 1`. Цвета — любые: `"#ff8800"`, `"255,136,0"`, имя (`red teal amber…`) или имя из `palette`.

### 7.1 Базовые

| Актёр | Что это | Параметры |
|---|---|---|
| `shape` | фигура | `kind: rect circle ellipse line polyline polygon path star ring arc arrow triangle`, `w h r radius points d`, `fill` (цвет или `{linear/radial: [цвета], angle}`), `stroke sw dash cap`, анимируемые `fill stroke sw w h r start end` (дуга), `draw` (0..1), `morph: [{at, d, dur}]` (GSAP MorphSVG) |
| `text` | кинетическая типографика | `text` (`**акцент**`, `[цветной](red)`, эмодзи), `font: display body mono tech serif round hand jp wide` или имя шрифта, `size weight color accent italic upper align width line letter`, `stroke: {w, color}`, `shadow`, `bg: {color, pad, radius}`, `reveal: {by: char/word, mode: rise pop slam drop fade blur type scramble, stagger, dur, sync: true}` (`sync` — слова появляются ровно под голос), `highlight: [{at, until, word, color}]`, `count: {from, to, at, dur, decimals, sep}` (`text: "{n}%"`) |
| `image` | картинка/эмодзи/иконка | `src` (файл в папке проекта), `emoji: "🍙"`, `icon: check/x/warning/heart/bolt/clock/star…`, `w h size color fit` |
| `svg` | свой SVG (из Figma, Illustrator) | `src` или `markup`, `w h`, `parts: {"#door": {fill, stroke, opacity, x, y, rot, scale, draw}}` — анимация частей по CSS-селектору |
| `group` | контейнер | `children: [...]` — вложенные элементы в координатах группы |

### 7.2 Люди

**`person`** — персонаж-марионетка с суставами (плечо, локоть, бедро, колено, корпус, голова):

| Параметр | Значения |
|---|---|
| `view` | `front` (по умолчанию) или `side` (смотрит вправо; `flip: true` — влево) |
| `look.age` | `student`, `kid` (ниже ростом, голова больше), `adult` |
| `look.outfit` | `sailor` (матроска), `gakuran`, `blazer`, `blazer_skirt`, `pe` (физкультура), `kyushoku` (халат, шапочка, маска дежурного), `kendo`, `baseball`, `teacher_m`, `teacher_f`, `suit`, `casual` |
| `look.hair` | `short spiky buzz side bob long ponytail twintails bun`; `hair_color` |
| `look` прочее | `skin` (`light mid tan dark` или цвет), `color`, `accent`, `bottom_color`, `legs: skin/socks/tights/pants`, `socks`, `shoes`, `bag: randoseru/school_bag`, `bag_color`, `hat: kid/cap/kyushoku`, `cap_color`, `mask`, `glasses`, `number`, `silhouette: true/цвет` (силуэт одним цветом) |
| `pose` (дорожка) | спереди: `stand wave raise cheer arms_up point think hold together bow sit shrug surprised`; сбоку: `stand bow sit wipe sweep swing swing_ready carry reach`; или углы суставов `{a1: [плечо, локоть], a2, l1: [бедро, колено], l2, lean, bow, sit, tilt, nod, jump}` |
| `walk` (дорожка) | шагов в секунду (`0` — стоит), `run: true` — бег |
| `face` (дорожка) | `smile neutral happy surprised talk sad sleep determined`; моргает сам |
| `talk` | `[[от, до], ...]` — рот двигается в эти моменты |
| `look_dx` | взгляд влево/вправо (−1..1) |
| `hold`, `hold_l` | предмет в руке: `tray bowl pot broom mop rag bat shinai book phone flag ladle`; `hold_rot` — поворот предмета |
| `wave_hand` | помахать поднятой рукой |

`silhouette` — простой силуэт (голова и плечи) для толпы и окон.

### 7.3 Мир

| Актёр | Что это | Параметры |
|---|---|---|
| `sky` | небо по времени суток | `hour` (дорожка 0–24: рассвет, день, закат, сумерки, ночь — цвета, солнце, луна, звёзды, облака меняются сами), `colors: [верх, середина, низ]`, `stars`, `clouds`, `cloud_speed`, `sun`/`moon` (`false` или `[x, y]`), `horizon`, `w h` |
| `stars` | мерцающие звёзды | `region [x0,y0,x1,y1]`, `count size color alpha` |
| `cloud` | облако | `w color speed` |
| `skyline` | силуэт города с окнами | `w h color color2 win lit` (доля горящих окон, дорожка), `cell far flicker seed` |
| `building` | панельный дом | `floors cols cell [w,h] color seams win_off win_on lit seed entrances`, `lights: [{at, floor, col, on}]`, `target: {floor, col, at, color, brackets}` |
| `school` | японская школа с часами | `floors cols color trim glass roof`, `time` (часы на башне, дорожка), `lit` (окна вечером), `plaque` (надпись), `flag` |
| `house` | японский дом | `w floors wall roof seed lit` |
| `street` | тротуар, дорога, столбы с проводами | `w road color walk poles pole_h` |
| `train` | электричка сбоку | `cars color stripe speed rail viaduct viaduct_h span` |
| `tree` | дерево | `kind: sakura round pine bush`, `h color trunk sway seed` |
| `streetlight` | фонарь | `on` (дорожка 0..1), `h light color` |
| `ground` | земля | `w h color` (или `[верх, низ]`), `grass` |

### 7.4 Интерьеры и предметы

| Актёр | Что это | Параметры |
|---|---|---|
| `room` | стена + пол в перспективе | `floor_y wall floor windows: [{x,y,w,h}] curtain board: {x,y,w,h} cubbies: {x,y,cols,rows} clock: {x,y,r,time} hour` |
| `blackboard` | доска с мелом | `w h color lines: [{text, x, y, size, font, color, at, speed, align}] date erase_at` — текст пишется по буквам |
| `desk` | парта/стул спереди | `part: desk/chair/both bag wood metal` |
| `classroom` | класс: ряды парт с учениками | `rows cols uniform: mixed/sailor/gakuran/…`, `pose face` (дорожки для всех — каждый с небольшим разбросом `stagger`), `back_y front_y back_scale spread empty look talk seed` |
| `lockers` | шкафчики для обуви (гэтабако) | `rows cols cell fill wood toe highlight: {row, col, at, color, label} swap: {row, col, at, color}` |
| `shoe` | обувь | `kind: uwabaki sneaker loafer`, `color toe w` |
| `tray` | школьный обед сверху | `items: [rice soup main salad milk chopsticks bread fruit]`, `show: [{item, at}]` или `stagger` |
| `prop` | предмет | `kind: bucket broom mop rag book bento onigiri milk bell ball bat trumpet shinai pot cart plant sparkle heart question`, `color` |
| `window_grid` | окна дома с силуэтами | `rows cols cell gap lit (список или доля) people glow lit_color you: {row, col, label, color}` |

### 7.5 Интерфейс в кадре

| Актёр | Что это | Параметры |
|---|---|---|
| `phone` | смартфон | `screen: alert lock chat notify app blank`, `w h color glow time right title sub date`, `messages: [{text, at, side: in/out}]`, `notes: [{icon, title, text, at}]`, `children` (для `app`), `on` (яркость, дорожка) |
| `battery` | батарея | `level` (дорожка 0–100), `color` (по умолчанию по уровню), `bolt`, `blink_below`, `w h` |
| `timetag` | метка «ДЕНЬ 1 — 03:18» | `text` (дорожка строк), `color bg size` |
| `badge` | плашка с иконкой | `title sub icon ("!", эмодзи, иконка) color size`, `style: dark/solid/light/outline` |
| `callout` | выноска с линией к объекту | `target` (якорь или `[x, y]`), `title sub icon color size dashed brackets line_from line_at` |
| `card` | карточка | `emoji/icon title sub number color w style: light/dark/glass` |
| `checklist` | список с галочками | `items: [{text, at}] size color ink width show_at stagger` |
| `meter` | полоса прогресса | `value` (дорожка) `max label unit color w size ink` |
| `bubble` | реплика | `text side size color ink font width` |
| `clock` | настенные часы | `time` (дорожка, часы: `8.5` = 8:30) `r numbers seconds face frame` |

### 7.6 Библиотеки и частицы

| Актёр | Что это | Параметры |
|---|---|---|
| `lottie` | анимация Lottie/Bodymovin | `src` (json в проекте) или `data`, `w h speed loop segment start` |
| `sketch` | «нарисовано от руки» (rough.js) | `kind: rect circle ellipse line polygon curve path arrow`, `w h points d stroke sw fill fill_style roughness bowing hachure_gap seed`, `boil` (перерисовок в секунду — «живая» линия), `draw` |
| `chart` | графики (D3) | `type: bar hbar line pie donut`, `data: [{label, value, color}]`, `w h max suffix decimals size ink values grow: {at, dur, stagger}` |
| `map` | карта/глобус (D3-geo, Natural Earth) | `focus` (страны), `highlight`, `projection: mercator natural orthographic`, `rotate` (дорожка для глобуса), `land ocean stroke hi graticule detail pins: [{lon, lat, label, at, color}]`, `routes: [{src: [lon, lat], dst: [lon, lat], at, dur, color, width, packets, period}]` — дуга большого круга рисуется во времени, по ней бегут «пакеты» |
| `holo` | 3D-модель (three.js) | `model: globe still tanker` (или своя из `engine/hud/models`), `params` (дорожки), `opts`, `color w h` |
| `particles` | частицы внутри сцены | `kind: petals snow confetti leaves bubbles dust embers steam sparkles stars burst hearts`, `region count size speed sway wind colors alpha seed from rise drift` |

## 8. Библиотеки

Все библиотеки лежат в `engine/hud/vendor/` (работают офлайн, версии зафиксированы):

| Библиотека | Где используется | Доступ из своих актёров |
|---|---|---|
| **GSAP 3.15** + MorphSVG, MotionPath, DrawSVG, SplitText, CustomEase, CustomWiggle, CustomBounce, ScrambleText | все `ease:`, `shape.morph`, таймлайны в своих актёрах | `H.gsap` — создайте `gsap.timeline({paused: true})` и вызывайте `tl.seek(t)` в `update` |
| **lottie-web 5.13** | `lottie` | `H.lottie` |
| **rough.js 4.6** | `sketch` | `H.rough` |
| **D3 7.9** + topojson + world-atlas (Natural Earth 50m/110m) | `chart`, `map` | `H.d3`, `H.topojson` |
| **three.js r170** | `holo`, HUD `holo3d` | `await H.three()` |
| SVG, HTML/CSS, Web-шрифты | всё остальное | `H.svg()`, `H.div()`, `H.el()` |

Шрифты: Montserrat, Exo 2, JetBrains Mono, Playfair Display, Unbounded, **Caveat** (рукописный, кириллица), **Klee One** (японский рукописный — мел, тетради), **M PLUS Rounded 1c** (японский/кириллица, округлый). В `text` и подписях: `font: display/mono/tech/serif/wide/hand/jp/round`.

Почему не Remotion: у нас уже есть то же самое, что делает Remotion (Chromium рисует кадр по времени `t`), но без React-проекта и лицензионных ограничений Remotion для компаний, и с привязкой каждого движения к словам диктора. Любой React/JS-код можно встроить как свой актёр (§9).

## 9. Свои актёры проекта

Файл `projects/<id>/actors/<любое>.js` — каждый `export const имя = {...}` становится актёром `actor: имя` в этом проекте (и может заменить встроенный). Пример — [`projects/gallery/actors/sunburst.js`](../projects/gallery/actors/sunburst.js):

```js
export const sunburst = {
  origin: "center",                     // точка привязки x/y
  create(p, H, item) {                  // p — статические параметры из YAML
    const svg = H.svg(`<g class="rays">…</g>`, 1040, 1040);   // рисуем в своих пикселях от (0, 0)
    const tl = H.gsap.timeline({ paused: true })               // GSAP-таймлайн как функция времени
      .fromTo(svg.querySelector(".rays"), { scale: 0 }, { scale: 1, duration: 0.7, ease: "back.out(1.6)" });
    return {
      el: svg, w: 1040, h: 1040,
      update(t, it) {                   // каждый кадр; it.v("param", def) — текущее значение дорожки
        tl.seek(Math.max(0, t - it.at));
      },
      anchor(name) { return name === "center" ? [520, 520] : null; },   // необязательно
    };
  },
};
```

Пример побольше — [`projects/slots/actors/casino.js`](../projects/slots/actors/casino.js): игровой автомат с крутящимися барабанами (`spins`, `wins`, `press`, `credits`, режим «цифры»), оверлей камеры наблюдения `cctv` (зерно, таймкод, рамка захвата), рука `hand`, неоновая вывеска `neon_sign`, вибрация `buzz`, монеты и купюры `coins` (canvas), «цифровой дождь» `digits`.

Внутри доступно всё из `H`: цвета (`H.col`, `H.rgba`, `H.shade`), `H.svg/H.div/H.el`, `H.child(spec, container)` — вложить любой другой актёр со всеми общими свойствами, `H.track`, `H.ease`, `H.noise`, `H.rng(seed)`, `H.asset("file.png")`, `H.json(url)`, `H.anchorOf("id.name")`, `H.TL` (таймлайн, слова диктора). Свои стили — `projects/<id>/draw.css`.

Встроенные актёры — в `engine/hud/draw/actors/*.js`; новый файл подключается строкой в `actors/index.js`.

## 10. Композиция

Вертикальный кадр 1080×1920, безопасные зоны TikTok/Reels/Shorts:
- **y ≈ 214** — метка сцены (HUD `marker`), ничего важного над ней;
- **y 300–1150** — главная иллюстрация и надписи;
- **субтитры** — по умолчанию y ≈ 1250; ставьте их над «полом»/дорогой/землёй, а не поверх лиц (`captions_top` у сцены или шота);
- **y > 1550** — низ закрывает подпись и ник: только декор (пол, земля, ноги);
- **x > 940 на высоте 800–1550** — кнопки справа.

Приёмы, которые делают нарисованный ролик «дорогим»:
- каждый шот двигается: наезд камеры, панорама с параллаксом, `sway`;
- 2–3 плана: небо `par: 0`, дальний план `par 0.3–0.6`, основной, передний план `par 1.1–1.2`;
- живой слой: частицы (лепестки, пар, искры), ходьба, моргание, облака;
- каждое появление — на слово (`at: "@слово"`), со звуком (`sfx`);
- повторяющийся визуальный язык: одна палитра, одни шрифты, одна метка времени на все сцены;
- для смыслового акцента — крупная надпись (`text` с `reveal`) или `badge`, а субтитры в этот момент можно скрыть (`theme.captions.hide`).

## 11. Как Claude собирает графику под сценарий

Попросите: «Сделай ролик своей графикой (без нейросетей) по сценарию …». Claude:
1. пишет сценарий/таймлайн и озвучивает (`voice`, `compile`), смотрит точные тайминги слов;
2. разбивает текст на шоты и для каждого придумывает сцену из актёров (§7), привязывая появления к словам;
3. если нужного объекта нет — дописывает актёра в проект (`projects/<id>/actors/`) или в библиотеку;
4. крутит цикл превью (`vg.py preview --shots`, `--at`), смотрит кадры и правит композицию;
5. рендерит, проверяет звук и контактные листы, присылает MP4.

## 12. Проблемы и решения

| Симптом | Решение |
|---|---|
| `unknown actor 'x'` | опечатка в имени или свой актёр не экспортирован (`export const x`) — `vg.py actors` |
| элемент не виден | проверьте `at`/`until`, `par` (при `par: 0` он «прибит» к экрану), координаты мира при широком `world` |
| выноска/бейдж уезжает за край на панораме | `space: screen` |
| текст японского шрифта «моноширинный» по-русски | для кириллицы используйте `font: hand` (Caveat) или Montserrat, `jp` — для иероглифов |
| `draw frame N of shot S is missing` | запустите `vg.py draw <id>` (или `scene` — он вызывает рисование сам) |
| в кадре чёрные прямоугольники 512×512 | так выглядела нехватка видеопамяти программного GPU при растеризации; рендер теперь растеризует тайлы на CPU (`--disable-gpu-rasterization` в `engine/render_hud.cjs`) |
| параметр-объект вроде `count: {from, to, at}` ведёт себя как анимация | такие ключи (`count`, `reveal`, `grow`, `routes`, `spins`, `bursts`, `rain`…) не считаются дорожками (`CONFIG_KEYS` в `engine/hud/draw/core.js`); для своего актёра не называйте ключи настроек `to`/`v` |
| долго перерисовывается | `vg.py draw` пропускает неизменённые шоты; правьте по одному шоту и смотрите `preview --at` |
