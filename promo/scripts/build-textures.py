import random
import struct
import zlib
from pathlib import Path

output = Path(__file__).resolve().parent.parent / 'public' / 'textures'
output.mkdir(parents=True, exist_ok=True)

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

def texture(name, width, height, seed):
    rng = random.Random(seed)
    pixels = b''.join(b'\0' + bytes(rng.randrange(256) for _ in range(width)) for _ in range(height))
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(pixels, 9))
    png += chunk(b'IEND', b'')
    (output / name).write_bytes(png)

texture('paper.png', 512, 512, 71)
for frame in range(24):
    texture(f'grain-{frame:02}.png', 480, 270, frame + 100)
print('Generated paper texture and 24 deterministic grain frames.')
