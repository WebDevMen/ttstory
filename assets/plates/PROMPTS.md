# Ключевые кадры (AI keyframes)

Сгенерированы через Figma AI (`generate_image`, модель `gemini-3.1-flash-image`), 768×1376 (9:16).
Затем апскейл Real-ESRGAN x4 → 1296×2322 (запас 1.2× под движение камеры) и карта глубины Depth Anything V2
(`tools/prep_plates.py`). Общий стиль: «stylized 3D animated feature film still, high-end CGI render, soft volumetric
lighting, cinematic depth of field», перчатки героя одинаковые во всех POV-кадрах: «sleek black-and-graphite tactical
gloves with small glowing teal accents».

| Файл | Сцена / шот | Промпт (кратко) |
|---|---|---|
| `p1_deck.png` | 1 · палуба | POV, руки в перчатках на ржавом поручне на носу танкера, гладкий затопленный океан в изумрудно-бирюзовом тумане, полузатопленные футуристичные небоскрёбы на горизонте, god rays |
| `p2_tarp.png` | 2 · тент | POV, руки натягивают прозрачный тент под дождём, вода стекает в воронку и стеклянную колбу |
| `p3_corridor.png` | 2 · коридор | POV, тёмный металлический коридор, луч фонаря в дымке, бирюзовые и пурпурные неоновые полосы, массивная гермодверь в конце |
| `p4_door.png` | 2 · дверь | POV, обе руки крутят штурвал-замок массивной гермодвери, бирюзовый индикатор |
| `p5_flare.png` | 3 · ракетница | POV ночью, рука держит оранжевый сигнальный пистолет, тёмное море, туман, силуэты руин |
| `p6_hatch.png` | 3 · люк | POV вниз в открытый люк трюма, плесень, поднимающиеся неоново-зелёные био-споры |
| `p7_leak.png` | 4 · протечка | Тёмная каюта, вода светящимися бирюзовыми струями пробивается через шов и растекается по полу |
| `p8_porthole.png` | 4 · иллюминатор | Тёмная каюта, круглый иллюминатор, молния подсвечивает гигантское биолюминесцентное морское существо |
| `p9_compass.png` | 5 · финал | POV, рука держит светящийся неоновый компас, оранжево-пурпурный закат над затопленным мегаполисом, шторм справа |


## Полные промпты

Запрос: `width=1152, height=2048` (модель выдаёт 768×1376).

### p1_deck

```
Vertical 9:16 frame. First-person POV shot: two hands in sleek black-and-graphite tactical gloves with small glowing teal accents grip a weathered steel railing in the lower part of the frame, on the bow deck of an abandoned rusty oil tanker. Beyond the railing: a calm, glassy flooded ocean stretching to the horizon, wrapped in soft emerald and turquoise fog. On the horizon, half-submerged stylized futuristic skyscrapers rise out of the water as soft silhouettes, some tilted, with faint dead neon strips. Soft volumetric god rays through haze, overcast pale sky. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, cinematic depth of field, atmospheric perspective, dystopian yet beautiful mood, teal-emerald color grading. No text, no letters, no UI, no watermark, no people other than the viewer's hands.
```

### p2_tarp

```
Vertical 9:16 frame. First-person POV shot on the deck of an abandoned rusty oil tanker in gentle rain: two hands in sleek black-and-graphite tactical gloves with small glowing teal accents pull and tie a clear transparent plastic tarp stretched over a metal frame. Rainwater beads and runs along the sagging center of the tarp into a funnel and drips into a large glass laboratory flask, half filled with clean sparkling water, standing on the deck in the foreground. Background: misty emerald-teal ocean, overcast sky, soft visible rain streaks, faint silhouettes of half-submerged futuristic skyscrapers far away. Soft volumetric light, water droplets catching highlights. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, cinematic depth of field, teal-emerald color grading. No text, no letters, no UI, no watermark.
```

### p3_corridor

```
Vertical 9:16 frame. First-person POV walking through a long, dark, narrow metallic corridor inside an abandoned oil tanker. A bright cool-white flashlight beam from the viewer cuts through hazy air with visible dust particles, revealing riveted steel walls, pipes and cable trays. Thin teal and magenta neon accent strips run along the ceiling edges. At the far end of the corridor stands a massive heavy futuristic steel bulkhead door with a large round locking wheel, slightly ajar, faint warm amber light leaking through the gap. Wet reflective floor grating. Soft volumetric lighting, moody but clean. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, cinematic depth of field. No text, no letters, no UI, no signs, no watermark, no people.
```

### p4_door

```
Vertical 9:16 frame. First-person POV close-up inside a dark ship interior: both hands in sleek black-and-graphite tactical gloves with small glowing teal accents grip and turn the large round steel locking wheel of a massive closed futuristic bulkhead door, sealing it shut. Heavy riveted armored door with thick hinges and glowing teal status light strip, cool flashlight light from the side, hazy air, dust particles, teal and magenta neon reflections on the metal. Feeling of barricading a last fortress. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, soft volumetric lighting, cinematic depth of field. No text, no letters, no UI, no signs, no watermark.
```

### p5_flare

```
Vertical 9:16 frame. First-person POV at night on the deck of an abandoned rusty oil tanker: one hand in a sleek black-and-graphite tactical glove with small glowing teal accents holds a bright orange flare pistol, raised and pointed toward the dark sky, not fired. Deep navy and teal night, heavy clouds with a faint moon glow, dark calm ocean with low drifting fog, distant dim silhouettes of half-submerged futuristic skyscrapers. Cold moonlight rim light on the glove and pistol, tense quiet mood, something unseen in the water. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, soft volumetric lighting, cinematic depth of field. No text, no letters, no UI, no watermark.
```

### p6_hatch

```
Vertical 9:16 frame. First-person POV looking straight down into an open square steel hatch in the floor of a dark ship deck. A rusty ladder leads down into a deep dark moldy cargo hold. Dozens of glowing bioluminescent neon-green spores float softly upward out of the hatch like tiny lanterns, with an eerie green volumetric glow rising from below. Patches of fungal mold and slime around the hatch rim, the hatch lid open to the side. One hand in a sleek black-and-graphite tactical glove with teal accents rests on the hatch edge at the bottom of the frame. Beautiful volumetric sci-fi lighting, dark aesthetic. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, cinematic depth of field. No text, no letters, no UI, no signs, no watermark.
```

### p7_leak

```
Vertical 9:16 frame. Interior of a dark metallic ship cabin, viewer standing close to a riveted steel wall. Seawater leaks through a corroded vertical seam and cracked rivets in the wall: thin glowing cyan-turquoise streams of water spill out, run down the wall and spread across the dark steel floor into a shimmering reflective puddle. Heavy rust and corrosion around the seam, droplets catching light, dim red emergency light from above mixed with teal rim light. Ominous but beautiful. Stylized 3D animated feature film still, high-end CGI render, realistic stylized water simulation look, soft volumetric lighting, cinematic depth of field. No text, no letters, no UI, no signs, no watermark, no people.
```

### p8_porthole

```
Vertical 9:16 frame. First-person POV inside a pitch-dark ship cabin facing a large round brass-rimmed porthole window in the center of the frame. Outside, a stormy night sea; a jagged lightning bolt in the sky illuminates a gigantic graceful bioluminescent sea creature, a colossal leviathan with long flowing fins and glowing cyan and violet patterns along its body, swimming past just outside the glass. Rain droplets on the porthole glass, eerie blue-violet light spilling into the dark riveted cabin, silhouettes of interior pipes. Dramatic, mysterious, awe-inspiring. Stylized 3D animated feature film still, high-end CGI render, clean smooth surfaces, soft volumetric lighting, cinematic depth of field. No text, no letters, no UI, no watermark, no people.
```

### p9_compass

```
Vertical 9:16 frame. First-person POV from the bow of a rusty abandoned oil tanker: one hand in a sleek black-and-graphite tactical glove with small glowing teal accents holds a glowing futuristic compass in the lower part of the frame, its face lit with holographic cyan and magenta neon rings and a bright needle. Ahead: a stunning cinematic orange and purple sunset over a vast flooded ruined megacity, dozens of half-submerged and tilted skyscrapers silhouetted against the sun, golden and violet reflections shimmering on the calm water, dark storm clouds with distant lightning gathering on one side of the sky. Epic atmosphere, vibrant colors, soft volumetric sun rays. Stylized 3D animated feature film still, premium CGI render, clean smooth surfaces, cinematic depth of field. No text, no letters, no UI, no watermark.
```
