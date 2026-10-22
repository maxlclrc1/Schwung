"""
Extends an approved 3:2 Ascent painting into a tall full-screen background (9:19.5).

    python3 design/artwork-guides/tools/extend_tall.py <art.png> <out.png> [dark|light]

The painting is placed unchanged at y = TOP (its trail geometry stays exact). Above it, the sky continues
from the painting's own top edge and deepens toward the theme's darkest tone. Below it, the slopes dissolve
into mist and then into the app's background color, which is where Today's cards scroll.
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
theme = sys.argv[3] if len(sys.argv) > 3 else 'dark'
TOP, TOTAL = 600, 3328  # for 1536-wide art: painting occupies rows 600..1624
BG = np.array([17, 17, 22] if theme == 'dark' else [247, 246, 251], np.float32)
TOP_TONE = np.array([14, 13, 24] if theme == 'dark' else [214, 216, 234], np.float32)
MIST = np.array([88, 84, 118] if theme == 'dark' else [226, 224, 238], np.float32)
rng = np.random.default_rng(7)

art = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H0, W = art.shape[:2]
scale = W / 1536
TOP, TOTAL = round(TOP * scale), round(TOTAL * scale)


def blur(a, r):
    return np.asarray(Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def low_noise(h, w, cell, amp, r):
    n = rng.normal(0, 1, (max(2, h // cell), max(2, w // cell))).astype(np.float32)
    img = Image.fromarray(((n * amp) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(img.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) - 128


out = np.zeros((TOTAL, W, 3), np.float32)

# Sky: the painting's top rows, heavily blurred sideways, fading into TOP_TONE toward the top of the screen.
edge = blur(art[:40], 60).mean(0)
t = (np.arange(TOP) / TOP)[:, None, None]
sky = TOP_TONE * (1 - t ** 0.9) + edge[None] * t ** 0.9
sky += low_noise(TOP, W, 12, 26, 26)[..., None] * 0.12 * t
out[:TOP] = sky
out[TOP:TOP + H0] = art
F = round(200 * scale)  # long feather: the painting's clouds dissolve into the extended sky
w = (np.arange(F) / F)[:, None, None] ** 1.3
out[TOP:TOP + F] = art[:F] * w + edge[None] * (1 - w)

# Below: the slopes reflected and progressively blurred, veiled by mist, then the app background.
B = TOTAL - TOP - H0
R = round(560 * scale)
refl = art[::-1][:R]
levels = [blur(refl, r) for r in (3, 8, 18, 36)]
below = np.repeat(BG[None, None], B, 0).repeat(W, 1).astype(np.float32)
for y in range(R):
    k = y / R * 3
    i = int(k)
    f = k - i
    row = levels[i][y] * (1 - f) + levels[min(3, i + 1)][y] * f
    fade = (y / R) ** 1.1
    below[y] = row * (1 - fade) * 0.8 + BG * fade
yy = np.arange(B)[:, None]
mist = (low_noise(B, W, 14, 40, 34) + 128) / 255
alpha = np.exp(-((yy - 90 * scale) / (190 * scale)) ** 2) * 0.6 * (0.55 + 0.9 * mist)
below = below * (1 - alpha[..., None]) + MIST * alpha[..., None]
out[TOP + H0:] = below
# Soften the painting's bottom edge into the mist.
F2 = round(110 * scale)
w2 = (np.arange(F2) / F2)[:, None, None] ** 1.5
out[TOP + H0 - F2:TOP + H0] = art[H0 - F2:] * (1 - w2) + below[:1] * w2

# Grain outside the untouched middle, so the extensions match the painting's texture.
g = rng.normal(0, 2.6, (TOTAL, W, 1)).astype(np.float32)
keep = np.ones((TOTAL, 1, 1), np.float32)
keep[TOP + F:TOP + H0 - F2] = 0
Image.fromarray((out + g * keep).clip(0, 255).astype(np.uint8)).save(dst)
print(f'{dst}: {W}x{TOTAL}, painting at y={TOP}..{TOP + H0} (untouched rows {TOP + F}..{TOP + H0 - F2})')
