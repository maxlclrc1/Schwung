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
TOP, TOTAL = 800, 2560  # for 1536-wide art: painting occupies rows 800..1824; the fog has fully become the app background by ~2504
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

# Below: a fog bank rolls over the lowest slope (uneven top edge, just under the trail's last days),
# thickens, then fades into the app background, where Today's cards scroll.
S = TOP + H0
B = TOTAL - S
# Under the fog: the slope mirrored downward, so its texture carries on across the seam, starting sharp
# and blurring progressively (no sudden change in sharpness), then darkening into the background.
Rm = min(B, round(520 * scale))
refl = art[::-1][:Rm]
radii = [0, 4, 10, 22, 40]
levels = [refl] + [blur(refl, r * scale) for r in radii[1:]]
under = np.empty((B, W, 3), np.float32)
for y in range(B):
    if y < Rm:
        k = y / Rm * (len(radii) - 1)
        i = int(k)
        f = k - i
        row = levels[i][y] * (1 - f) + levels[min(len(radii) - 1, i + 1)][y] * f
    else:
        row = BG
    fade = min(1.0, y / Rm) ** 1.2
    under[y] = row * (1 - fade) + BG * fade
out[S:] = under
y0 = S - round(110 * scale)
rows = TOTAL - y0
edge_n = low_noise(1, W, 40, 60, 0)[0] / 60  # roughly -1..1 along x: the fog's rolling top edge
tex = (low_noise(rows, W, 16, 40, 30) + 128) / 255
yy = (np.arange(y0, TOTAL) - S)[:, None].astype(np.float32)
top_edge = -60 * scale + edge_n[None] * 30 * scale
a = np.clip((yy - top_edge) / (240 * scale), 0, 1)
a = a * a * (3 - 2 * a) * (0.82 + 0.18 * tex)  # smoothstep, with some density variation
mist_col = MIST * (1 - np.clip((yy - 160 * scale) / (520 * scale), 0, 1)[..., None]) + BG * np.clip((yy - 160 * scale) / (520 * scale), 0, 1)[..., None]
out[y0:] = out[y0:] * (1 - a[..., None]) + mist_col * a[..., None]
R = round(560 * scale)
F2 = S - y0

# Grain outside the untouched middle, so the extensions match the painting's texture.
g = rng.normal(0, 2.6, (TOTAL, W, 1)).astype(np.float32)
keep = np.ones((TOTAL, 1, 1), np.float32)
keep[TOP + F:TOP + H0 - F2] = 0
# No grain in the flat bottom, so the image's lower edge meets the app background invisibly.
end = TOP + H0 + round(680 * scale)
keep[end - round(200 * scale):end, 0, 0] = np.linspace(1, 0, round(200 * scale))
keep[end:] = 0
Image.fromarray((out + g * keep).clip(0, 255).astype(np.uint8)).save(dst)
print(f'{dst}: {W}x{TOTAL}, painting at y={TOP}..{TOP + H0} (untouched rows {TOP + F}..{TOP + H0 - F2})')
