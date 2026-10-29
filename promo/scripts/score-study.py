import array
import math
import random
import wave
from pathlib import Path

rate = 48000
seconds = 18
rng = random.Random(20261029)
samples = array.array('f', [0.0]) * (rate * seconds)

def add(start, duration, frequency, gain, kind='pluck'):
    offset = round(start * rate)
    for i in range(round(duration * rate)):
        at = offset + i
        if at >= len(samples):
            break
        t = i / rate
        if kind == 'kick':
            env = math.exp(-t * 18)
            signal = math.sin(2 * math.pi * (48 * t + 2.4 * (1 - math.exp(-t * 40))))
        elif kind == 'hat':
            env = math.exp(-t * 95)
            signal = rng.uniform(-1, 1)
        elif kind == 'pad':
            env = min(1, t / 0.3) * min(1, (duration - t) / 0.6)
            signal = math.sin(2 * math.pi * frequency * t) + 0.14 * math.sin(2 * math.pi * frequency * 2 * t)
        else:
            env = min(1, t / 0.008) * math.exp(-t * 5)
            signal = math.sin(2 * math.pi * frequency * t) + 0.22 * math.sin(2 * math.pi * frequency * 2 * t)
        samples[at] += signal * env * gain

def hz(note):
    return 440 * 2 ** ((note - 69) / 12)

chords = [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 64, 67], [43, 50, 59, 62]]
for section, chord in enumerate(chords):
    start = section * 4
    for note in chord:
        add(start, 4.8, hz(note), 0.018, 'pad')
    for step in range(8):
        note = chord[1 + step % 3] + 12
        add(start + step * 0.5, 0.8, hz(note), 0.05)
        add(start + step * 0.5 + 0.18, 0.8, hz(note), 0.013)
for beat in range(32):
    start = beat * 0.5
    add(start, 0.35, 50, 0.13 if beat % 4 == 0 else 0.08, 'kick')
    if beat >= 7:
        add(start + 0.25, 0.07, 0, 0.018, 'hat')
for note in [57, 60, 64]:
    add(15.5, 2.5, hz(note), 0.027, 'pad')

output = array.array('h')
for i, sample in enumerate(samples):
    t = i / rate
    fade = min(1, t / 0.08, max(0, (seconds - t) / 0.7))
    value = int(math.tanh(sample) * fade * 26000)
    output.append(value)
    output.append(value)
path = Path(__file__).resolve().parent.parent / 'public' / 'sfx' / 'direction-study.wav'
path.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(path), 'wb') as audio:
    audio.setnchannels(2)
    audio.setsampwidth(2)
    audio.setframerate(rate)
    audio.writeframes(output.tobytes())
print('Original 18s synth score: A minor / 120 BPM, no third-party samples.')
