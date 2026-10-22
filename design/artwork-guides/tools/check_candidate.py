"""
Reviews an Ascent artwork candidate against the guide pack.

    python3 design/artwork-guides/tools/check_candidate.py <candidate image> [dark|light]

Writes to design/artwork-candidates/review/:
  <name>-app-day30.jpg  the candidate exactly as Today shows it (Day 30), with the app's overlay
  <name>-app-day1.jpg   the same on Day 1 (all days ahead, orb at the trailhead)
  <name>-guide.jpg      the candidate with the required-rock corridor and every day marker
and prints brightness/detail numbers for the zones the guide cares about.
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G = os.path.join(ROOT, 'design', 'artwork-guides')
OUT = os.path.join(ROOT, 'design', 'artwork-candidates', 'review')
W, H = 1500, 1000

src = sys.argv[1]
theme = sys.argv[2] if len(sys.argv) > 2 else 'dark'
name = os.path.splitext(os.path.basename(src))[0]
os.makedirs(OUT, exist_ok=True)

img = Image.open(src).convert('RGB')
ratio = img.size[0] / img.size[1]
print(f'{name}: {img.size[0]}x{img.size[1]}, ratio {ratio:.4f}' + ('' if abs(ratio - 1.5) < 0.002 else '  <-- NOT 3:2'))
art = img.resize((W, H), Image.LANCZOS)
geo = json.load(open(os.path.join(G, 'extras', 'ascent-geometry.json')))
mask = np.array(Image.open(os.path.join(G, 'ascent-mask-1500x1000.png')))
clip = Image.new('L', (W, H), 0)
ImageDraw.Draw(clip).rounded_rectangle((0, 0, W - 1, H - 1), radius=geo['cornerRadiusPx']['reference360pt'], fill=255)

for tag in ('day30', 'day1'):
    over = Image.open(os.path.join(G, 'extras', f'ascent-overlay-clean-{theme}-{tag}-1500x1000.png'))
    c = art.convert('RGBA')
    c.alpha_composite(over)
    bg = Image.new('RGB', (W, H), (17, 17, 22) if theme == 'dark' else (247, 246, 251))
    bg.paste(c.convert('RGB'), (0, 0), clip)
    bg.save(os.path.join(OUT, f'{name}-app-{tag}.jpg'), quality=88)

g = art.convert('RGBA')
d = ImageDraw.Draw(g)
rock = Image.fromarray(((mask == 255) * 255).astype(np.uint8))
edge = rock.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
layer = Image.new('RGBA', (W, H), (120, 230, 170, 255))
layer.putalpha(edge)
g.alpha_composite(layer)
for i, p in enumerate(geo['days']):
    x, y = p['x'] * W, p['y'] * H
    d.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(255, 255, 255, 255))
    if (i + 1) % 5 == 0 or i == 0:
        d.text((x + 8, y - 18), str(i + 1), fill=(255, 255, 255, 255))
sx, sy = geo['summit'][0] * W, geo['summit'][1] * H
d.line((sx - 30, sy, sx + 30, sy), fill=(242, 184, 75, 255), width=2)
d.line((sx, sy - 30, sx, sy + 30), fill=(242, 184, 75, 255), width=2)
g.convert('RGB').save(os.path.join(OUT, f'{name}-guide.jpg'), quality=88)

A = np.asarray(art).astype(float) / 255
lum = 0.2126 * A[..., 0] + 0.7152 * A[..., 1] + 0.0722 * A[..., 2]
grey = np.asarray(art.convert('L')).astype(float)
detail = np.abs(grey - np.asarray(art.convert('L').filter(ImageFilter.GaussianBlur(4))).astype(float))


def stats(m, label):
    v, dt = lum[m], detail[m]
    print(f'  {label:24s} brightness {v.mean():.3f} (p10 {np.percentile(v, 10):.3f}, p90 {np.percentile(v, 90):.3f})   detail {dt.mean():.1f}')


stats(mask == 255, 'trail corridor')
stats(mask == 0, 'calm zones')
x0, y0, x1, y1 = map(int, geo['textZonePx'])
tz = np.zeros_like(mask, bool)
tz[y0:y1, x0:x1] = True
stats(tz, 'Day n text zone')
rows = []
for i, p in enumerate(geo['days']):
    x, y = int(p['x'] * W), int(p['y'] * H)
    rows.append((i + 1, lum[y - 10:y + 10, x - 10:x + 10].mean(), detail[y - 10:y + 10, x - 10:x + 10].mean()))
print('  brightest under markers:', [(d, round(b, 3)) for d, b, _ in sorted(rows, key=lambda r: -r[1])[:5]])
print('  busiest under markers:  ', [(d, round(t, 1)) for d, _, t in sorted(rows, key=lambda r: -r[2])[:5]])
s = A[int(sy) - 60:int(sy) + 60, int(sx) - 60:int(sx) + 60].reshape(-1, 3).mean(0) * 255
print(f'  around the summit: rgb {tuple(int(v) for v in s)}')
cur = np.asarray(Image.open(os.path.join(ROOT, 'assets', f'ascent-{theme}.jpg')).convert('RGB').resize((W, H))).astype(float) / 255
cl = 0.2126 * cur[..., 0] + 0.7152 * cur[..., 1] + 0.0722 * cur[..., 2]
print(f'  (current art: trail corridor brightness {cl[mask == 255].mean():.3f})')
