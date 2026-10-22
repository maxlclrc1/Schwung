"""
Assembles the One Continuous Ascent canvas (1536 x 5120):
  rows 0-1824     the current world image: sky + the approved painting (untouched above row OVERLAP_START)
  from ~1744      the continuation painted below it (blended in over the painting's last 80 rows, its top
                  colour-matched to the painting's edge), with its soft mist band stretched taller
  then            a fade into the exact app background, which fills the rest

    python3 design/canvas/assemble_canvas.py <world.jpg> <continuation> <out.png> [dark|light]
"""

import sys

import numpy as np
from PIL import Image

world_p, cont_p, out_p = sys.argv[1:4]
theme = sys.argv[4] if len(sys.argv) > 4 else 'dark'
W, H = 1536, 5120
PAINT_END = 1824  # last row of the painting inside the world image
OVERLAP = 80  # rows of crossfade, below the lowest trail markers (painting rows 944-1024)
STRETCH = (300, 800, 1.8)  # continuation rows a..b (soft mist) stretched by this factor
BG = np.array([17, 17, 22] if theme == 'dark' else [247, 246, 251], np.float32)
MIST_MAX = 0.20 if theme == 'dark' else 0.86  # brightest the mist may be (dark) / darkest (light)
rng = np.random.default_rng(5)


def lum(a):
    return (a @ np.array([0.2126, 0.7152, 0.0722], np.float32)) / 255


world = np.asarray(Image.open(world_p).convert('RGB')).astype(np.float32)
src = Image.open(cont_p).convert('RGB')
src = src.resize((W, round(src.size[1] * W / src.size[0])), Image.LANCZOS)
cont = np.asarray(src).astype(np.float32)

# 1. Match the continuation's top to the painting's bottom edge, easing off over 320 rows.
edge = world[PAINT_END - 40:PAINT_END].reshape(-1, 3).mean(0)
offset = edge - cont[:40].reshape(-1, 3).mean(0)
ease = np.clip(1 - np.arange(cont.shape[0]) / 320, 0, 1)[:, None, None]
cont = cont + offset * ease

# 2. Stretch the soft mist band (no detail there, so the stretch can't show).
a, b, f = STRETCH
mid = Image.fromarray(cont[a:b].clip(0, 255).astype(np.uint8)).resize((W, round((b - a) * f)), Image.BICUBIC)
cont = np.concatenate([cont[:a], np.asarray(mid).astype(np.float32), cont[b:]])

# 3. Keep text over the mist readable: cap how bright (dark theme) or dark (light theme) the mist gets.
L = lum(cont)
rows = np.arange(cont.shape[0])
below_slopes = np.clip((rows - 180) / 160, 0, 1)[:, None]
if theme == 'dark':
    scale = np.where(L > MIST_MAX, MIST_MAX / np.maximum(L, 1e-3), 1.0)
else:
    scale = np.where(L < MIST_MAX, MIST_MAX / np.maximum(L, 1e-3), 1.0)
scale = 1 + (np.clip(scale, 0.6, 1.4) - 1) * below_slopes
cont = cont * scale[..., None]

# 4. Fade the continuation's end into the exact background.
n = cont.shape[0]
tail = np.clip((rows - (n - 420)) / 420, 0, 1)[:, None, None] ** 1.2
cont = cont * (1 - tail) + BG * tail

# 5. Compose.
out = np.repeat(np.repeat(BG[None, None], H, 0), W, 1)
out[:PAINT_END] = world[:PAINT_END]
start = PAINT_END - OVERLAP
end = min(H, start + n)
blend = out[start:PAINT_END].copy()
w = (np.arange(OVERLAP) / OVERLAP)[:, None, None]
w = w * w * (3 - 2 * w)
out[start:PAINT_END] = blend * (1 - w) + cont[:OVERLAP] * w
out[PAINT_END:end] = cont[OVERLAP:OVERLAP + end - PAINT_END]

# 6. Matching grain below the painting, fading out before the flat background.
g = rng.normal(0, 2.4, (H, W, 1)).astype(np.float32)
keep = np.zeros((H, 1, 1), np.float32)
keep[PAINT_END:end] = 1
keep[end - 300:end, 0, 0] = np.linspace(1, 0, 300)
Image.fromarray((out + g * keep).clip(0, 255).astype(np.uint8)).save(out_p)
print(f'{out_p}: {W}x{H}; continuation rows {start}-{end} (painting rows above {start} untouched)')
