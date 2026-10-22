"""
Adds morning haze to a light-theme painting and calms its texture so the app's trail stays readable.
Per-pixel only (no geometry changes), so it stays aligned with the dark version.

    python3 design/artwork-guides/tools/soften_light.py <in.png> <out.png> [haze=0.35] [smooth=0.45]
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
haze = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35
smooth = float(sys.argv[4]) if len(sys.argv) > 4 else 0.45
HAZE = np.array([221, 219, 236], np.float32)  # #DDDBEC, the light rock target

img = Image.open(src).convert('RGB')
a = np.asarray(img).astype(np.float32)
soft = np.asarray(img.filter(ImageFilter.GaussianBlur(2.5 * img.size[0] / 1536))).astype(np.float32)
a = a * (1 - smooth) + soft * smooth  # fewer sharp rock details
# Haze grows slightly toward the top, as distance would.
h = a.shape[0]
ramp = (haze * (1.15 - 0.3 * np.arange(h) / h)).clip(0, 1)[:, None, None]
a = a * (1 - ramp) + HAZE * ramp
# Matching fine grain.
a += np.random.default_rng(3).normal(0, 2.2, a.shape[:2])[..., None]
Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(dst)
print(f'{dst}: haze {haze}, smooth {smooth}')
