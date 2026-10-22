"""
Generates the Schwung Ascent landscapes: assets/ascent-dark.jpg and assets/ascent-light.jpg.

Dev-only (not bundled). Layered, misty mountains drawn procedurally so the art is original,
small, and lines up with the trail in src/core/ascent.ts: the main peak sits on SUMMIT.
The trail and day markers are NOT in the image; the app draws them on top.

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
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')

PALETTES = {
    'dark': {
        'sky': [(0.0, (44, 35, 82)), (0.5, (28, 24, 46)), (1.0, (17, 17, 22))],
        'glow': (167, 139, 250, 70),  # lavender haze behind the summit
        'summit': (242, 184, 75, 55),  # gold, faint
        'stars': True,
        'far': (60, 51, 94),
        'mid': (46, 40, 74),
        'main_lit': (54, 46, 84),
        'main_shadow': (36, 31, 58),
        'cap': (170, 152, 230, 110),
        'near': (25, 22, 36),
        'floor': (17, 17, 22),
        'mist': (167, 139, 250),
        'mist_alpha': 42,
    },
    'light': {
        'sky': [(0.0, (232, 225, 251)), (0.5, (243, 240, 252)), (1.0, (247, 246, 251))],
        'glow': (255, 214, 170, 90),  # dawn warmth behind the summit
        'summit': (240, 180, 90, 60),
        'stars': False,
        'far': (221, 214, 241),
        'mid': (205, 195, 234),
        'main_lit': (214, 205, 240),
        'main_shadow': (189, 176, 225),
        'cap': (255, 255, 255, 150),
        'near': (226, 220, 243),
        'floor': (240, 237, 249),
        'mist': (255, 255, 255),
        'mist_alpha': 120,
    },
}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def gradient(stops):
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / (H - 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                arr[y, :, :] = lerp(c0, c1, (t - t0) / (t1 - t0))
                break
    return Image.fromarray(arr, 'RGB').convert('RGBA')


def ridge(rng, x0, x1, base, peaks, roughness, step=6):
    """Mountain silhouette polygon: list of (x, y) across [x0, x1], closed at the bottom."""
    pts = []
    for i in range(int((x1 - x0) / step) + 1):
        x = x0 + i * step
        y = base
        for px, py, spread in peaks:
            y = min(y, py + (abs(x - px) / spread) ** 1.15 * (base - py))
        y += math.sin(x * 0.013 + rng.random()) * roughness + rng.uniform(-roughness, roughness) * 0.4
        pts.append((x, y))
    return pts + [(x1, H), (x0, H)]


def soft(layer, radius):
    return layer.filter(ImageFilter.GaussianBlur(radius))


def layer(color):
    """A transparent layer tinted with `color`, so blurred edges fade to that color, not to black."""
    return Image.new('RGBA', (W, H), tuple(color[:3]) + (0,))


def mist_band(img, y, height, color, alpha, rng):
    band = layer(color)
    d = ImageDraw.Draw(band)
    for _ in range(14):
        cx = rng.uniform(-100, W + 100)
        w = rng.uniform(250, 600)
        h = rng.uniform(height * 0.5, height)
        d.ellipse([cx - w, y - h / 2, cx + w, y + h / 2], fill=color + (alpha,))
    return Image.alpha_composite(img, soft(band, height * 0.6))


def render(name):
    p = PALETTES[name]
    rng = random.Random(66)  # deterministic art
    sx, sy = APEX[0] * W, APEX[1] * H
    img = gradient(p['sky'])

    # Haze behind the summit, plus a faint gold warmth right at the top.
    glow = layer(p['glow'])
    gd = ImageDraw.Draw(glow)
    gd.ellipse([sx - 520, sy - 380, sx + 520, sy + 420], fill=p['glow'])
    img = Image.alpha_composite(img, soft(glow, 140))
    gold = layer(p['summit'])
    ImageDraw.Draw(gold).ellipse([sx - 120, sy - 110, sx + 120, sy + 90], fill=p['summit'])
    img = Image.alpha_composite(img, soft(gold, 50))

    if p['stars']:
        stars = layer((245, 243, 255))
        sd = ImageDraw.Draw(stars)
        for _ in range(140):
            x, y = rng.uniform(0, W), rng.uniform(0, H * 0.45)
            r = rng.choice([0.8, 1.0, 1.2, 1.6])
            a = int(rng.uniform(40, 150) * (1 - y / (H * 0.5)))
            sd.ellipse([x - r, y - r, x + r, y + r], fill=(245, 243, 255, max(a, 0)))
        img = Image.alpha_composite(img, stars)

    # Far range.
    far = layer(p['far'])
    ImageDraw.Draw(far).polygon(
        ridge(rng, -20, W + 20, H * 0.55, [(W * 0.18, H * 0.30, W * 0.22), (W * 0.95, H * 0.24, W * 0.20)], 6),
        fill=p['far'] + (255,),
    )
    img = Image.alpha_composite(img, soft(far, 1.5))
    img = mist_band(img, H * 0.50, 140, p['mist'], p['mist_alpha'], rng)

    # Mid range.
    mid = layer(p['mid'])
    ImageDraw.Draw(mid).polygon(
        ridge(rng, -20, W + 20, H * 0.72, [(W * 0.08, H * 0.48, W * 0.20), (W * 0.98, H * 0.40, W * 0.18)], 5),
        fill=p['mid'] + (255,),
    )
    img = Image.alpha_composite(img, soft(mid, 1))

    # Main mountain: one peak exactly at the summit, with an irregular ridgeline (layered noise that
    # fades out at the peak so the apex stays exactly on SUMMIT), a lit left face and a shaded right face.
    def ridgeline(keys, seed, amp):
        """Polyline through normalized key points plus layered noise that fades out near the summit."""
        r = random.Random(seed)
        waves = [(r.uniform(0.004, 0.009), r.uniform(0, 6.28), amp), (r.uniform(0.015, 0.03), r.uniform(0, 6.28), amp * 0.35)]
        pts = []
        for (ax, ay), (bx, by) in zip(keys, keys[1:]):
            for i in range(40):
                t = i / 40
                x, y = (ax + (bx - ax) * t) * W, (ay + (by - ay) * t) * H
                near_top = min(1.0, math.hypot(x - sx, (y - sy) * 1.5) / (W * 0.18))
                y += sum(math.sin(x * f + ph) * a for f, ph, a in waves) * near_top
                pts.append((x, y))
        pts.append((keys[-1][0] * W, keys[-1][1] * H))
        return pts

    # Left: a broad shoulder so the top switchbacks (x 0.5-0.62, y 0.15-0.29) stay on rock.
    left = ridgeline(
        [(-0.03, 0.74), (0.12, 0.60), (0.28, 0.45), (0.40, 0.30), (0.50, 0.19), (0.60, 0.125), APEX], 7, 22
    )
    right = ridgeline([APEX, (0.77, 0.15), (0.86, 0.26), (0.93, 0.35), (1.03, 0.50)], 11, 18)
    outline = left + right[1:]
    main_pts = outline + [(W + 20, H), (-20, H)]
    main = layer(p['main_lit'])
    ImageDraw.Draw(main).polygon(main_pts, fill=p['main_lit'] + (255,))

    # Shaded face: right of a ridge spine running from the summit down toward the lower right.
    spine = [(sx, sy), (sx + W * 0.03, H * 0.30), (sx + W * 0.01, H * 0.48), (sx + W * 0.07, H * 0.70), (sx + W * 0.04, H)]
    shade = layer(p['main_shadow'])
    ImageDraw.Draw(shade).polygon(spine + [(W + 20, H), (W + 20, 0), (sx, 0)], fill=p['main_shadow'] + (255,))
    shade = soft(shade, 16)
    mask = main.split()[3]
    face = layer(p['main_shadow'])
    face.paste(shade, (0, 0), mask)
    main = Image.alpha_composite(main, face)

    # Atmospheric depth: the base fades toward the valley color.
    depth = layer(p['near'])
    dd = ImageDraw.Draw(depth)
    for k in range(60):
        y = H * 0.45 + k * (H * 0.55 / 60)
        dd.rectangle([0, y, W, y + H * 0.55 / 60 + 1], fill=p['near'] + (int(150 * k / 60),))
    fade = layer(p['near'])
    fade.paste(depth, (0, 0), mask)
    main = Image.alpha_composite(main, fade)

    # Lit rim along the left ridgeline (moonlight in dark, first light in light).
    rim = layer(p['cap'])
    rd = ImageDraw.Draw(rim)
    for a, b in zip(left[60:], left[61:]):
        t = (a[0] - left[60][0]) / (sx - left[60][0])
        rd.line([a, b], fill=p['cap'][:3] + (int(p['cap'][3] * t),), width=3)
    main = Image.alpha_composite(main, soft(rim, 1.2))

    # Frost on the very top, following both slopes.
    cap_pts = [pt for pt in left if pt[1] < sy + 55] + [pt for pt in right if pt[1] < sy + 45]
    if len(cap_pts) > 2:
        cap_poly = cap_pts + [(cap_pts[-1][0] - 20, cap_pts[-1][1] + 10), (sx + 10, sy + 40), (cap_pts[0][0] + 20, cap_pts[0][1] + 8)]
        cap = layer(p['cap'])
        ImageDraw.Draw(cap).polygon(cap_poly, fill=p['cap'])
        main = Image.alpha_composite(main, soft(cap, 3))
    img = Image.alpha_composite(img, main)
    img = mist_band(img, H * 0.80, 160, p['mist'], p['mist_alpha'], rng)

    # Foreground hills and the valley floor.
    near = layer(p['near'])
    ImageDraw.Draw(near).polygon(
        ridge(rng, -20, W + 20, H * 1.02, [(W * 0.92, H * 0.80, W * 0.30), (W * 0.02, H * 0.86, W * 0.25)], 4),
        fill=p['near'] + (255,),
    )
    img = Image.alpha_composite(img, soft(near, 1))
    floor = layer(p['floor'])
    ImageDraw.Draw(floor).rectangle([0, H * 0.96, W, H], fill=p['floor'] + (255,))
    img = Image.alpha_composite(img, soft(floor, 20))

    # Very light grain so flat areas don't band.
    noise = np.random.default_rng(66).normal(0, 2.2, (H, W, 1))
    arr = np.clip(np.asarray(img.convert('RGB')).astype(np.float32) + noise, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr, 'RGB')
    path = os.path.join(OUT, f'ascent-{name}.jpg')
    out.save(path, quality=84, optimize=True, progressive=True)
    print(path, os.path.getsize(path) // 1024, 'KB')


if __name__ == '__main__':
    for n in ('dark', 'light'):
        render(n)
