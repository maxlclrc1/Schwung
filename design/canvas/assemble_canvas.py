"""
Assembles the One Continuous Ascent canvas: the current world (sky + painting + fog) on top, the L1 tile
(lower slopes + mist valley) below it under a fog crossfade, then the exact app background.

    python3 design/canvas/assemble_canvas.py <world.jpg> <tile.png> <out.png> [dark|light]

The painting rows (800-1824) are never touched. The tile's mist band is graded toward the spec's tones so
text over it stays readable.
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

world_p, tile_p, out_p = sys.argv[1:4]
theme = sys.argv[4] if len(sys.argv) > 4 else 'dark'
W, H = 1536, 5120
PAINT_END = 1824
TILE_TOP = 1900
FADE = (1900, 2260)  # world fog -> tile slopes crossfade
BG = np.array([17, 17, 22] if theme == 'dark' else [247, 246, 251], np.float32)
MIST_TARGET = 0.15 if theme == 'dark' else 0.88  # luminance the valley is pulled toward
rng = np.random.default_rng(11)

world = np.asarray(Image.open(world_p).convert('RGB')).astype(np.float32)
tile_img = Image.open(tile_p).convert('RGB')
th = round(tile_img.size[1] * W / tile_img.size[0])
tile = np.asarray(tile_img.resize((W, th), Image.LANCZOS)).astype(np.float32)

out = np.repeat(np.repeat(BG[None, None], H, 0), W, 1)
out[: world.shape[0]] = world

# Grade the tile: keep the slopes, pull the mist valley toward the target tone (texture kept, contrast eased).
lum = (tile @ np.array([0.2126, 0.7152, 0.0722], np.float32)) / 255
rows = np.arange(th) / th
band = np.clip((rows - 0.22) / 0.12, 0, 1) * np.clip((0.95 - rows) / 0.15, 0, 1)  # 0 on the slopes, 1 in the valley
mean_valley = lum[(rows > 0.3) & (rows < 0.7)].mean()
k = 1 + band[:, None] * (MIST_TARGET / mean_valley - 1)
graded = tile * k[..., None]
soft = np.asarray(Image.fromarray(graded.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32)
graded = graded * (1 - 0.35 * band[:, None, None]) + soft * (0.35 * band[:, None, None])

# Bottom of the tile into the exact background.
end = TILE_TOP + th
tail = np.clip((np.arange(th) - (th - 380)) / 380, 0, 1)[:, None, None]
graded = graded * (1 - tail) + BG * tail

# Place it under a fog crossfade.
region = out[TILE_TOP:end].copy()
a = np.clip((np.arange(TILE_TOP, end) - FADE[0]) / (FADE[1] - FADE[0]), 0, 1)
a = (a * a * (3 - 2 * a))[:, None, None]
out[TILE_TOP:end] = region * (1 - a) + graded * a
out[end:] = BG

# Matching grain outside the untouched painting, fading out before the flat background.
g = rng.normal(0, 2.4, (H, W, 1)).astype(np.float32)
keep = np.ones((H, 1, 1), np.float32)
keep[: PAINT_END] = 0
keep[end - 300:end, 0, 0] = np.linspace(1, 0, 300)
keep[end:] = 0
Image.fromarray((out + g * keep).clip(0, 255).astype(np.uint8)).save(out_p)
print(f'{out_p}: {W}x{H}, tile rows {TILE_TOP}-{end}, valley graded from {mean_valley:.3f} to {MIST_TARGET}')
