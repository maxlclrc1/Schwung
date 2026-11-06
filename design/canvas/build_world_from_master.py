"""
Builds the world panorama (4096 x 3584) from ONE painting, so the tabs never show a stitch.

The master (1536 x 1024) is scaled 3.2x and its left 256 px dropped, which puts the summit at x ~2413 (about 74%
across the Journey screen, x 1280-2816) and the lakeside camp in Insights (x 2560-4096). Above the painting the sky
eases out of the app background; at the bottom the mist fades into it. Cut into the three shipped tiles.

    python3 design/canvas/build_world_from_master.py <dark|light> <master.png>
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

theme, src = sys.argv[1], sys.argv[2]
W, H, SCALE, CROP_X, TOP = 4096, 3584, 3.2, 256, 200
BG = np.array([17, 17, 22] if theme == 'dark' else [247, 246, 251], np.float32)


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


m = Image.open(src).convert('RGB').resize((1536, 1024), Image.LANCZOS)  # ChatGPT sometimes returns 1535 px
m = m.crop((CROP_X, 0, m.width, m.height))
sw, sh = round(m.width * SCALE), round(m.height * SCALE)
big = m.resize((sw, sh), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=2))
art = np.asarray(big).astype(np.float32)[:, :W]

out = np.repeat(np.repeat(BG[None, None], H, 0), W, 1)
end = min(H, TOP + sh)
out[TOP:end] = art[: end - TOP]
# Sky above the painting: its top rows, blurred, eased in from the background.
sky = np.asarray(Image.fromarray(art[:8].mean(0, keepdims=True).repeat(TOP, 0).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(40))).astype(np.float32)
w = smooth(np.arange(TOP) / TOP)[:, None, None]
out[:TOP] = BG * (1 - w) + sky * w
# Bottom: the mist settles into the background over the last 420 rows.
fade = 420
rows = np.arange(H)[:, None, None]
w = smooth((rows - (end - fade)) / fade)
out = out * (1 - w) + BG * w
out[end:] = BG

img = Image.fromarray(np.clip(out + np.random.default_rng(3).normal(0, 0.6, out.shape), 0, 255).astype(np.uint8))
for name, x, width in (('habits', 0, 1296), ('journey', 1264, 1568), ('fieldnotes', 2800, 1296)):
    img.crop((x, 0, x + width, H)).save(f'assets/world/pano-{theme}-{name}.webp', quality=92, method=6)
print('summit x', round((1010 - CROP_X) * SCALE), 'painting rows', TOP, end)
# The Journey painting on its own (onboarding backdrop, keepsakes): the Journey screen, x 1280-2816.
img.crop((1280, 0, 2816, H)).save(f'assets/world-{theme}.jpg', quality=90)
