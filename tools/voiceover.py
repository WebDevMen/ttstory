"""Synthesize the Russian voiceover per scene with edge-tts and keep word timings.

Usage: python voiceover.py <out_dir>
Writes s1.mp3..s5.mp3 and words.json ({scene: [{text, start, end}]}, seconds).
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICE = "ru-RU-DmitryNeural"
RATE = "+22%"
PITCH = "-4Hz"

SCENES = {
    "s1": "Представь: миру конец, а ты оказался один на заброшенном танкере посреди океана. "
          "Вода вокруг отравлена, связь мертва, а на борту ты не один. Вот твой мануал по выживанию.",
    "s2": "Первое — вода. Никогда не пей за бортом. Собери дождевую воду с помощью тента или сооруди испаритель. "
          "Второе — забаррикадируй капитанский мостик. Это твоя лучшая точка обзора и последняя крепость.",
    "s3": "Чего делать НЕЛЬЗЯ ни в коем случае. Первое: не включай сигнальные ракеты ночью без крайней необходимости — "
          "в море выжили не только люди. Второе: не спускайся в заплесневелые трюмы без респиратора — "
          "био-споры убьют тебя за три вдоха.",
    "s4": "Твои главные враги. Первый — коррозия и протечки. Если дно прогниёт — ты корм для мутантов. "
          "Второй — «Ночные Гости». Если слышишь скрежет по металлу снаружи… запрись, выключи свет и не дыши.",
    "s5": "Топливо на исходе. На горизонте виден затопленный мегаполис, но шторм усиливается. "
          "Твоё решение: останешься на судне или рискнёшь плыть к руинам? "
          "Напиши в комментариях — проверим, выжил бы ты!",
}


async def synth(key, text, out_dir):
    comm = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
    words = []
    with open(os.path.join(out_dir, key + ".mp3"), "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append({"text": chunk["text"], "start": start, "end": start + chunk["duration"] / 1e7})
    return words


async def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    result = {}
    for key, text in SCENES.items():
        result[key] = await synth(key, text, out_dir)
    with open(os.path.join(out_dir, "words.json"), "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)


asyncio.run(main(sys.argv[1]))
