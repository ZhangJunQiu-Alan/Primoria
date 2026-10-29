import array
import math
import random
import subprocess
import wave
from pathlib import Path

rate = 48000
seconds = 90
rng = random.Random(20261029)
samples = array.array('f', [0.0]) * (rate * seconds)

def hz(note):
    return 440 * 2 ** ((note - 69) / 12)

def add(start, duration, note, gain, kind='pluck'):
    offset = round(start * rate)
    frequency = hz(note)
    for i in range(min(round(duration * rate), len(samples) - offset)):
        t = i / rate
        if kind == 'kick':
            env = math.exp(-t * 17)
            signal = math.sin(2 * math.pi * (47 * t + 1.8 * (1 - math.exp(-t * 35))))
        elif kind == 'hat':
            env = math.exp(-t * 80)
            signal = rng.uniform(-1, 1)
        elif kind == 'sweep':
            env = math.sin(math.pi * t / duration) ** 2
            signal = rng.uniform(-1, 1) * 0.5 + math.sin(2 * math.pi * (150 * t + 110 * t * t)) * 0.15
        elif kind == 'pad':
            env = min(1, t / 0.5) * min(1, (duration - t) / 0.9)
            signal = math.sin(2 * math.pi * frequency * t) + 0.12 * math.sin(2 * math.pi * frequency * 2 * t)
        elif kind == 'bass':
            env = min(1, t / 0.04) * math.exp(-t * 2.7)
            signal = math.sin(2 * math.pi * frequency * t)
        else:
            env = min(1, t / 0.007) * math.exp(-t * 4.5)
            signal = math.sin(2 * math.pi * frequency * t) + 0.23 * math.sin(2 * math.pi * frequency * 2 * t) + 0.06 * math.sin(2 * math.pi * frequency * 3 * t)
        samples[offset + i] += signal * env * gain

chords = [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 64, 67], [43, 50, 59, 62]]
for section in range(21):
    start = section * 4
    chord = chords[section % 4]
    intensity = 0.65 if start < 8 else 1.0 if start < 28 else 1.25 if start < 46 else 0.65 if start < 68 else 1.2
    for note in chord:
        add(start, 5, note, 0.018, 'pad')
    for step in range(8):
        note = chord[1 + [0, 1, 2, 1, 0, 2, 1, 2][step]] + (12 if section % 4 < 2 else 0)
        gain = 0.041 * intensity
        add(start + step * 0.5, 1.1, note, gain)
        add(start + step * 0.5 + 0.2, 0.9, note, gain * 0.25)
        if start >= 8:
            add(start + step * 0.5, 0.65, chord[0] - 12, 0.042, 'bass')
        if 28 <= start < 46 or start >= 68:
            add(start + step * 0.5 + 0.25, 0.55, chord[2] + 12, gain * 0.3)
for beat in range(16, 170):
    at = beat * 0.5
    if at >= 84.5:
        break
    intensity = 0.6 if 46 <= at < 68 else 1.0
    add(at, 0.4, 30, (0.13 if beat % 4 == 0 else 0.07) * intensity, 'kick')
    add(at + 0.25, 0.08, 0, 0.015 * intensity, 'hat')
for boundary in [8, 19, 28, 37, 46, 57, 68, 77, 85]:
    add(boundary - 0.5, 0.8, 0, 0.012, 'sweep')
for note in [45, 52, 57, 60, 64, 69]:
    add(84.7, 5.3, note, 0.019, 'pad')
    add(85, 2.8, note + 12, 0.018)

output = array.array('h')
delay = round(rate * 0.23)
for i, sample in enumerate(samples):
    t = i / rate
    fade = min(1, t / 0.35, max(0, (seconds - t) / 1.8))
    echo = samples[i - delay] * 0.12 if i >= delay else 0
    output.append(int(math.tanh(sample + echo) * fade * 27000))
    output.append(int(math.tanh(sample + echo * 0.6) * fade * 27000))
path = Path(__file__).resolve().parent.parent / 'public/sfx/launch-score.wav'
path.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(path), 'wb') as audio:
    audio.setnchannels(2)
    audio.setsampwidth(2)
    audio.setframerate(rate)
    audio.writeframes(output.tobytes())
normalized = path.with_name('launch-score-normalized.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=9', '-ar', str(rate), str(normalized)], check=True)
normalized.replace(path)
print('Original 90s score: 120 BPM, A minor, stereo 48 kHz; no third-party samples.')
