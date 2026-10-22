"""
LEGACY (superseded by the painted art, DECISIONS.md item 25). Running this overwrites
assets/ascent-dark.jpg and assets/ascent-light.jpg with the old generated mountains.

Generates the Schwung Ascent landscapes: assets/ascent-dark.jpg and assets/ascent-light.jpg.

Dev-only (not bundled). Procedural, so the art is original, small, and reproducible.
Both themes share one composition; only light and color differ.

The trail and day markers are NOT in the image; the app draws them on top. The main mountain's
ridgeline is fixed (MAIN_LEFT / MAIN_RIGHT) so every trail point in src/core/ascent.ts sits on rock,
with the day-66 marker (SUMMIT) just below the peak (APEX).

    python3 scripts/generate-ascent-art.py
"""

import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1500, 1000  # 3:2, matches ASCENT_ASPECT
SUMMIT = (0.70, 0.105)  # the day-66 marker; keep in sync with SUMMIT in src/core/ascent.ts
APEX = (0.70, 0.075)  # the rock peak, just above the marker so it stands on the top
MAIN_LEFT = [(-0.03, 0.74), (0.12, 0.60), (0.28, 0.45), (0.40, 0.30), (0.50, 0.19), (0.60, 0.125), APEX]
MAIN_RIGHT = [APEX, (0.77, 0.15), (0.86, 0.26), (0.93, 0.35), (1.03, 0.50)]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')

# Restrained palettes: desaturated blue-violet greys, one quiet warm note at the horizon.
# Ranges go far -> near; each is (color at its ridge, color at its base). Farther = closer to the sky.
PALETTES = {
    'dark': {
        'sky': [(0.0, (12, 13, 23)), (0.30, (20, 20, 35)), (0.52, (37, 33, 52)), (0.70, (27, 25, 38)), (1.0, (17, 17, 22))],
        'horizon': ((118, 92, 112), 34),  # dusky rose haze behind the peak
        'summit': ((242, 184, 75), 26),  # gold, barely there; the day-66 marker carries the gold
        'stars': 70,
        'ranges': [
            ((70, 66, 94), (54, 51, 74)),
            ((52, 49, 74), (40, 38, 58)),
            ((40, 38, 59), (29, 28, 43)),
        ],
        'main_lit': ((54, 50, 79), (29, 28, 43)),
        'main_shade': ((35, 33, 53), (22, 21, 33)),
        'rim': ((176, 166, 214), 120),
        'frost': ((196, 188, 228), 120),
        'near': ((24, 23, 34), (17, 17, 22)),
        'mist': ((128, 120, 166), 26),
        'grain': 2.0,
    },
    'light': {
        'sky': [(0.0, (213, 220, 236)), (0.30, (228, 231, 242)), (0.55, (245, 238, 236)), (0.75, (244, 241, 247)), (1.0, (247, 246, 251))],
        'horizon': ((255, 224, 198), 90),  # first light
        'summit': ((255, 210, 150), 44),
        'stars': 0,
        'ranges': [
            ((222, 224, 238), (230, 231, 241)),
            ((205, 207, 227), (219, 220, 235)),
            ((188, 190, 216), (207, 208, 227)),
        ],
        'main_lit': ((196, 196, 223), (217, 216, 234)),
        'main_shade': ((171, 171, 205), (199, 199, 223)),
        'rim': ((255, 255, 255), 190),
        'frost': ((255, 255, 255), 210),
        'near': ((229, 229, 240), (243, 242, 249)),
        'mist': ((255, 255, 255), 80),
        'grain': 1.6,
    },
}

Y = np.linspace(0, 1, H)[:, None]  # normalized row coordinate, for gradients


def stops_gradient(stops):
    arr = np.zeros((H, W, 3), dtype=np.float32)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        rows = ((Y >= t0) & (Y <= t1))[:, 0]
        t = (Y[rows] - t0) / (t1 - t0)
        arr[rows] = np.array(c0) + (np.array(c1) - np.array(c0)) * t[:, :, None]
    return arr


def vertical(top, bottom, y0, y1):
    """Color ramp from `top` at y0 to `bottom` at y1 (normalized), clamped outside."""
    t = np.clip((Y - y0) / max(y1 - y0, 1e-6), 0, 1)
    arr = np.array(top, np.float32) + (np.array(bottom, np.float32) - np.array(top, np.float32)) * t[:, :, None]
    return np.broadcast_to(arr, (H, W, 3))


def mask_from(points, blur=0.0):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(m, np.float32)[:, :, None] / 255.0


def over(base, color, alpha):
    """Composite a color field (HxWx3 or RGB tuple) onto base with an alpha field (HxWx1 or scalar)."""
    return base * (1 - alpha) + np.asarray(color, np.float32) * alpha


def smooth_ridge(seed, x0, x1, base, peaks, amp):
    """A natural ridgeline: broad peaks plus two octaves of smooth noise (no jagged spikes)."""
    r = random.Random(seed)
    waves = [(r.uniform(0.0035, 0.006), r.uniform(0, 6.28), amp), (r.uniform(0.011, 0.018), r.uniform(0, 6.28), amp * 0.3)]
    pts = []
    for i in range(int((x1 - x0) / 5) + 1):
        x = x0 + i * 5
        y = base
        for px, py, spread in peaks:
            d = min(abs(x - px) / spread, 1.0)
            y = min(y, py + (base - py) * (1 - (1 - d) ** 1.7))
        y += sum(math.sin(x * f + ph) * a for f, ph, a in waves)
        pts.append((x, y))
    return pts + [(x1, H + 5), (x0, H + 5)]


def keyed_ridge(keys, seed, amp):
    """Polyline through normalized keys with smooth noise that fades to zero near the apex."""
    r = random.Random(seed)
    waves = [(r.uniform(0.004, 0.008), r.uniform(0, 6.28), amp), (r.uniform(0.014, 0.024), r.uniform(0, 6.28), amp * 0.3)]
    ax_, ay_ = APEX[0] * W, APEX[1] * H
    pts = []
    for (ax, ay), (bx, by) in zip(keys, keys[1:]):
        for i in range(48):
            t = i / 48
            x, y = (ax + (bx - ax) * t) * W, (ay + (by - ay) * t) * H
            near_top = min(1.0, math.hypot(x - ax_, (y - ay_) * 1.5) / (W * 0.16))
            y += sum(math.sin(x * f + ph) * a for f, ph, a in waves) * near_top
            pts.append((x, y))
    pts.append((keys[-1][0] * W, keys[-1][1] * H))
    return pts


def soft_blob(cx, cy, rx, ry, blur):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(blur)), np.float32)[:, :, None] / 255.0


def mist(img, y, height, color, alpha, seed):
    r = random.Random(seed)
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    for _ in range(16):
        cx = r.uniform(-150, W + 150)
        w = r.uniform(260, 620)
        h = r.uniform(height * 0.45, height)
        d.ellipse([cx - w, y - h / 2, cx + w, y + h / 2], fill=255)
    a = np.asarray(m.filter(ImageFilter.GaussianBlur(height * 0.7)), np.float32)[:, :, None] / 255.0
    return over(img, color, a * (alpha / 255))


def render(name):
    p = PALETTES[name]
    ax, ay = APEX[0] * W, APEX[1] * H
    img = stops_gradient(p['sky'])

    # Light: a broad, low horizon haze and a faint warm point right behind the peak.
    hc, ha = p['horizon']
    img = over(img, hc, soft_blob(ax - 80, H * 0.42, 760, 260, 160) * (ha / 255))
    sc, sa = p['summit']
    img = over(img, sc, soft_blob(ax, ay + 10, 150, 110, 60) * (sa / 255))

    if p['stars']:
        r = random.Random(3)
        s = Image.new('L', (W, H), 0)
        d = ImageDraw.Draw(s)
        for _ in range(p['stars']):
            x, y = r.uniform(0, W), r.uniform(0, H * 0.4)
            rad = r.choice([0.7, 0.9, 1.1, 1.4])
            d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=int(r.uniform(60, 170) * (1 - y / (H * 0.45))))
        img = over(img, (236, 234, 250), np.asarray(s, np.float32)[:, :, None] / 255.0)

    # Distant ranges, far to near, each fading into haze at its base.
    far_specs = [
        (11, H * 0.56, [(W * 0.12, H * 0.33, W * 0.30), (W * 0.42, H * 0.40, W * 0.22), (W * 0.97, H * 0.27, W * 0.24)], 9),
        (12, H * 0.66, [(W * 0.03, H * 0.42, W * 0.26), (W * 0.30, H * 0.50, W * 0.20), (W * 0.99, H * 0.37, W * 0.20)], 8),
        (13, H * 0.80, [(W * 0.06, H * 0.55, W * 0.24), (W * 0.96, H * 0.47, W * 0.18)], 7),
    ]
    for i, (seed, base, peaks, amp) in enumerate(far_specs):
        top, bottom = p['ranges'][i]
        pts = smooth_ridge(seed, -30, W + 30, base, peaks, amp)
        ridge_y = min(pt[1] for pt in pts[:-2]) / H
        img = over(img, vertical(top, bottom, ridge_y, base / H + 0.1), mask_from(pts, 1.2))
        img = mist(img, base - 20, 120 - i * 15, p['mist'][0], p['mist'][1] * (1.2 - i * 0.25), 20 + i)

    # The main mountain. Fixed ridgeline; vertical light falloff toward the valley.
    left = keyed_ridge(MAIN_LEFT, 7, 16)
    right = keyed_ridge(MAIN_RIGHT, 11, 12)
    outline = left + right[1:] + [(W + 30, H + 5), (-30, H + 5)]
    main_mask = mask_from(outline, 1.0)
    img = over(img, vertical(*p['main_lit'], APEX[1], 0.95), main_mask)

    # Shaded east face: right of a soft spine from the peak, feathered so there's no seam.
    spine = [(ax, ay), (ax + W * 0.025, H * 0.28), (ax + W * 0.015, H * 0.46), (ax + W * 0.06, H * 0.68), (ax + W * 0.03, H + 5)]
    shade_mask = mask_from(spine + [(W + 30, H + 5), (W + 30, -5), (ax, -5)], 22) * main_mask
    img = over(img, vertical(*p['main_shade'], APEX[1], 0.95), shade_mask * 0.85)

    # A soft pool of light on the upper west face, so the mountain has form without texture.
    lc, la = p['rim']
    img = over(img, lc, soft_blob(ax - W * 0.16, H * 0.30, W * 0.16, H * 0.16, 90) * main_mask * (1 - shade_mask) * (la / 255) * 0.22)

    # Rim light along the west ridge, strongest near the top; frost on the very summit.
    rc, ra = p['rim']
    rim = Image.new('L', (W, H), 0)
    rd = ImageDraw.Draw(rim)
    start = left[100]
    for a_, b_ in zip(left[100:], left[101:]):
        t = (a_[0] - start[0]) / max(ax - start[0], 1)
        rd.line([a_, b_], fill=int(255 * min(1, t * 1.2)), width=3)
    rim_a = np.asarray(rim.filter(ImageFilter.GaussianBlur(1.6)), np.float32)[:, :, None] / 255.0
    img = over(img, rc, rim_a * (ra / 255))
    fc, fa = p['frost']
    frost = Image.new('L', (W, H), 0)
    fd = ImageDraw.Draw(frost)
    top_pts = [pt for pt in left if pt[1] < ay + 34] + [pt for pt in right if pt[1] < ay + 26]
    for a_, b_ in zip(top_pts, top_pts[1:]):
        depth = 1 - min(1, (a_[1] - ay) / 34)
        fd.line([(a_[0], a_[1] + 2), (b_[0], b_[1] + 2)], fill=int(255 * depth), width=7)
    frost_a = np.asarray(frost.filter(ImageFilter.GaussianBlur(3)), np.float32)[:, :, None] / 255.0
    img = over(img, fc, frost_a * main_mask * (fa / 255) * 0.8)

    # Valley mist at the mountain's foot, then the foreground and floor.
    img = mist(img, H * 0.83, 150, p['mist'][0], p['mist'][1] * 1.3, 40)
    near = smooth_ridge(14, -30, W + 30, H * 1.04, [(W * 0.94, H * 0.84, W * 0.32), (W * 0.0, H * 0.88, W * 0.26)], 5)
    img = over(img, vertical(*p['near'], 0.84, 1.0), mask_from(near, 1.0))

    # Fine grain so gradients never band.
    noise = np.random.default_rng(66).normal(0, p['grain'], (H, W, 1))
    out = Image.fromarray(np.clip(img + noise, 0, 255).astype(np.uint8), 'RGB')
    path = os.path.join(OUT, f'ascent-{name}.jpg')
    out.save(path, quality=86, optimize=True, progressive=True)
    print(path, os.path.getsize(path) // 1024, 'KB')


if __name__ == '__main__':
    for n in ('dark', 'light'):
        render(n)
