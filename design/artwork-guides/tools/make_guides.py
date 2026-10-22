"""
Builds the Schwung Ascent artwork guide pack (design/artwork-guides/) from the app's real geometry.

The trail math is a direct port of src/core/ascent.ts (Catmull-Rom through WAYPOINTS, then even spacing
by on-screen distance with x scaled by the 3:2 aspect). It is checked against marker centers measured
from the running app (app-geometry.json, written by capture-guides.js) and refuses to run if they differ.

    python3 design/artwork-guides/tools/make_guides.py <capture-dir>

<capture-dir> holds the output of capture-guides.js: app-only overlays, Today screenshots, and
app-geometry.json. Dev-only; nothing here is bundled with the app.
"""

import csv
import json
import math
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'design', 'artwork-guides')
CAP = sys.argv[1]
W, H = 1500, 1000
ASPECT = 1.5

# --- src/core/ascent.ts -------------------------------------------------------------------------
WAYPOINTS = [(0.07, 0.9), (0.34, 0.92), (0.62, 0.87), (0.82, 0.78), (0.6, 0.7), (0.3, 0.66), (0.16, 0.57),
             (0.34, 0.48), (0.62, 0.45), (0.8, 0.37), (0.62, 0.29), (0.5, 0.22), (0.6, 0.15), (0.7, 0.105)]
LANDMARKS = {7: 'First week', 21: 'Base camp', 44: 'High camp', 66: 'Summit'}
PHASES = [(1, 'Foundation', 1, 21), (2, 'Momentum', 22, 44), (3, 'Mastery', 45, 66)]
PHASE_LABEL_AT = {'Foundation': (0.03, 0.755), 'Momentum': (0.79, 0.555), 'Mastery': (0.03, 0.36)}
# --- scripts/generate-ascent-art.py (the current art's ridgeline and peak) ------------------------
APEX = (0.70, 0.075)
MAIN_LEFT = [(-0.03, 0.74), (0.12, 0.60), (0.28, 0.45), (0.40, 0.30), (0.50, 0.19), (0.60, 0.125), APEX]
MAIN_RIGHT = [APEX, (0.77, 0.15), (0.86, 0.26), (0.93, 0.35), (1.03, 0.50)]
# --- Layout facts (src/components/Ascent.tsx, src/theme/index.ts) --------------------------------
FRAME_RADIUS_PT = 22
SMALLEST_FRAME_PT = 288  # 320pt-wide phone: min(320 - 32, 600)
REF_FRAME_PT = 360  # the captures: 1500 / 360 px per pt
SCRIM = {'dark': ((17, 17, 22), 0.6), 'light': ((247, 246, 251), 0.8)}  # start color/opacity -> 0
SCRIM_END = (0.45, 0.40)

REQUIRED_ROCK = 0.045 * H  # px: every trail point keeps at least this much mountain around it
PREFERRED_ROCK = 85  # px: room for today's orb rings (up to ~20pt from the center at 360pt)


def smooth(points, steps=24):
    out = []
    for i in range(len(points) - 1):
        p0, p1 = points[max(0, i - 1)], points[i]
        p2, p3 = points[i + 1], points[min(len(points) - 1, i + 2)]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t

            def f(a, b, c, d):
                return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)

            out.append((f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])))
    out.append(points[-1])
    return out


def resample(path, count):
    def length(a, b):
        return math.hypot((b[0] - a[0]) * ASPECT, b[1] - a[1])

    cum = [0.0]
    for i in range(1, len(path)):
        cum.append(cum[-1] + length(path[i - 1], path[i]))
    total, out, j = cum[-1], [], 1
    for k in range(count):
        target = total * k / (count - 1)
        while j < len(path) - 1 and cum[j] < target:
            j += 1
        a, b = path[j - 1], path[j]
        span = (cum[j] - cum[j - 1]) or 1
        t = min(1, max(0, (target - cum[j - 1]) / span))
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


DENSE = smooth(WAYPOINTS)
DAYS = resample(DENSE, 66)
FINE = resample(DENSE, 65 * 4 + 1)  # trailDots(3): every 4th point is a day marker
PX = lambda p: (p[0] * W, p[1] * H)  # noqa: E731


def font(size, weight='SemiBold'):
    for path in (f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def phase_of(day):
    return next(n for n, _, a, b in PHASES if a <= day <= b)


# --- 1. Verify against the running app ------------------------------------------------------------
geo = json.load(open(os.path.join(CAP, 'app-geometry.json')))
measured = geo['boxes']['markers']
errors = []
for m in measured:
    nearest = min(DAYS, key=lambda d: (d[0] - m['x']) ** 2 + (d[1] - m['y']) ** 2)
    errors.append(math.hypot((nearest[0] - m['x']) * W, (nearest[1] - m['y']) * H))
max_err = max(errors)
print(f'verified {len(measured)} app-rendered markers: max error {max_err:.2f}px at 1500x1000')
if max_err > 2.5:
    sys.exit('geometry mismatch: the port no longer matches src/core/ascent.ts')
pills = {k: v for k, v in geo['boxes']['pills'].items()}
where = geo['boxes']['where']


def box_px(b, padpx=0):
    return (b['x'] * W - padpx, b['y'] * H - padpx, (b['x'] + b['w']) * W + padpx, (b['y'] + b['h']) * H + padpx)


# "Day n / 66" can grow up to 40% of the frame width (maxWidth in Ascent.tsx).
where_box = (where['x'] * W - 12, where['y'] * H - 12, (16 / REF_FRAME_PT + 0.40) * W + 12, (where['y'] + where['h']) * H + 12)
pill_boxes = {k: box_px(v, 12) for k, v in pills.items()}


# --- Shared layers --------------------------------------------------------------------------------
def corridor_mask(radius):
    """Every pixel within `radius` of the trail: discs stamped every 2px along the trail."""
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    pts = [PX(p) for p in DENSE]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(bx - ax, by - ay) // 2))
        for k in range(n + 1):
            x, y = ax + (bx - ax) * k / n, ay + (by - ay) * k / n
            d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)
    return m


ROCK = corridor_mask(REQUIRED_ROCK)
ROCK_PREF = corridor_mask(PREFERRED_ROCK)


def rounded_clip(radius_px):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=radius_px, fill=255)
    return m


CLIP_WORST = rounded_clip(FRAME_RADIUS_PT / SMALLEST_FRAME_PT * W)
CLIP_REF = rounded_clip(FRAME_RADIUS_PT / REF_FRAME_PT * W)


def scrim(theme):
    """The top-left gradient as iOS draws it: start (0,0) -> end (0.45,0.40), clamped beyond the end."""
    (r, g, b), a0 = SCRIM[theme]
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    vx, vy = SCRIM_END[0] * W, SCRIM_END[1] * H
    t = np.clip((xs * vx + ys * vy) / (vx * vx + vy * vy), 0, 1)
    alpha = (a0 * (1 - t) * 255).astype(np.uint8)
    layer = np.zeros((H, W, 4), np.uint8)
    layer[..., 0], layer[..., 1], layer[..., 2], layer[..., 3] = r, g, b, alpha
    return Image.fromarray(layer, 'RGBA')


def dashed_rect(d, box, color, width=3, dash=14):
    x0, y0, x1, y1 = box
    for (ax, ay, bx, by) in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
        n = max(1, int(math.hypot(bx - ax, by - ay) // dash))
        for i in range(0, n, 2):
            t0, t1 = i / n, min(1, (i + 1) / n)
            d.line((ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1), fill=color, width=width)


def outline(mask, color, width=3):
    edge = mask.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 40 else 0)
    if width > 1:
        edge = edge.filter(ImageFilter.MaxFilter(width if width % 2 else width + 1))
    layer = Image.new('RGBA', (W, H), color)
    layer.putalpha(edge)
    return layer


def label(d, xy, text, size=20, fill=(255, 255, 255, 255), bg=(0, 0, 0, 170), anchor='la'):
    f = font(size)
    l, t, r, b = d.textbbox(xy, text, font=f, anchor=anchor)
    d.rounded_rectangle((l - 6, t - 4, r + 6, b + 4), radius=6, fill=bg)
    d.text(xy, text, font=f, fill=fill, anchor=anchor)


os.makedirs(os.path.join(OUT, 'extras'), exist_ok=True)

# --- G2: mask ----------------------------------------------------------------------------------
mask = Image.new('L', (W, H), 128)
md = ImageDraw.Draw(mask)
md.rectangle(where_box, fill=0)
for b in pill_boxes.values():
    md.rectangle(b, fill=0)
sx, sy = PX(DAYS[65])
md.rectangle((sx - 160, 0, sx + 160, 34), fill=0)  # open sky right above the peak
mask.paste(255, (0, 0), ROCK)  # required rock wins over everything
mask.save(os.path.join(OUT, 'ascent-mask-1500x1000.png'))

# --- G1: guide -----------------------------------------------------------------------------------
art = Image.open(os.path.join(ROOT, 'assets', 'ascent-dark.jpg')).convert('RGB').resize((W, H))
base = Image.blend(Image.new('RGB', (W, H), (8, 8, 12)), art, 0.55).convert('RGBA')
guide = base.copy()
tint = Image.new('RGBA', (W, H), (120, 220, 160, 0))
tint.putalpha(ROCK.point(lambda v: 70 if v else 0))
guide.alpha_composite(tint)
guide.alpha_composite(outline(ROCK, (120, 230, 170, 255), 3))
pref_only = Image.fromarray(((np.array(ROCK_PREF) > 0) & ~(np.array(ROCK) > 0)).astype(np.uint8) * 255)
soft = Image.new('RGBA', (W, H), (120, 220, 160, 0))
soft.putalpha(pref_only.point(lambda v: 26 if v else 0))
guide.alpha_composite(soft)
guide.alpha_composite(outline(ROCK_PREF, (120, 230, 170, 140), 1))

d = ImageDraw.Draw(guide)
# Current ridgeline and peak.
ridge = [PX(p) for p in MAIN_LEFT + MAIN_RIGHT[1:]]
for i in range(len(ridge) - 1):
    a, b = ridge[i], ridge[i + 1]
    n = int(math.hypot(b[0] - a[0], b[1] - a[1]) // 12)
    for k in range(0, n, 2):
        t0, t1 = k / n, (k + 1) / n
        d.line((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1), fill=(110, 200, 255, 220), width=3)
# Text and label exclusion zones.
dashed_rect(d, where_box, (255, 110, 110, 255), 4)
label(d, (where_box[0] + 10, where_box[3] + 10), 'TEXT ZONE: "PHASE n OF 3 / Day n / 66" keep calm, low detail', 17, bg=(150, 30, 30, 200))
for name, b in pill_boxes.items():
    dashed_rect(d, b, (255, 205, 90, 255), 3)
    label(d, (b[0] + 4, b[3] + 8), f'{name} label zone', 16, fill=(20, 16, 4, 255), bg=(255, 205, 90, 220))
# Trail centerline and dots.
d.line([PX(p) for p in DENSE], fill=(255, 255, 255, 120), width=2)
# Markers, numbered.
small = font(15)
for i, p in enumerate(DAYS):
    day = i + 1
    x, y = PX(p)
    if day in LANDMARKS:
        r = 26 if day == 66 else 20
        col = (242, 184, 75, 255) if day == 66 else (190, 170, 255, 255)
        d.ellipse((x - r, y - r, x + r, y + r), outline=col, width=4)
        d.text((x, y), str(day), font=font(17, 'Bold'), fill=col, anchor='mm')
    else:
        r = 7
        d.ellipse((x - r, y - r, x + r, y + r), fill=(167, 139, 250, 255) if phase_of(day) == 1 else (210, 200, 255, 255) if phase_of(day) == 2 else (255, 255, 255, 255))
        dx, dy = 0, -17
        if 23 <= day <= 36 or 46 <= day <= 58:
            dy = 18
        d.text((x + dx, y + dy), str(day), font=small, fill=(255, 255, 255, 235), anchor='mm', stroke_width=3, stroke_fill=(0, 0, 0, 220))
# Landmark names.
for day, name in LANDMARKS.items():
    x, y = PX(DAYS[day - 1])
    off = {7: (0, 44), 21: (40, -36), 44: (0, -44), 66: (70, 0)}[day]
    label(d, (x + off[0], y + off[1]), f'Day {day} · {name}', 16, anchor='mm' if day != 66 else 'lm')
# Summit crosshair and peak target.
d.line((sx - 40, sy, sx + 40, sy), fill=(242, 184, 75, 255), width=2)
d.line((sx, sy - 40, sx, sy + 40), fill=(242, 184, 75, 255), width=2)
ax, ay = APEX[0] * W, APEX[1] * H
dashed_rect(d, (ax - 30, ay - 20, ax + 30, ay + 20), (242, 184, 75, 255), 2, 8)
label(d, (ax + 70, ay + 52), 'Peak here: (0.70, 0.075) ±0.02', 16, fill=(30, 20, 0, 255), bg=(242, 184, 75, 230), anchor='lm')
# Tight spots in the current art.
for day in (37, 38, 61, 62, 63):
    x, y = PX(DAYS[day - 1])
    d.ellipse((x - 16, y - 16, x + 16, y + 16), outline=(255, 90, 90, 255), width=3)
# Corner clipping (worst case = smallest phone).
clip_layer = Image.new('RGBA', (W, H), (255, 60, 60, 0))
clip_layer.putalpha(Image.eval(CLIP_WORST, lambda v: 0 if v else 120))
guide.alpha_composite(clip_layer)
guide.alpha_composite(outline(CLIP_REF, (255, 255, 255, 120), 1))
d = ImageDraw.Draw(guide)
# Legend, in the free strip right of the trail (x > 1300, above the Momentum label zone).
lx, ly = 1302, 150
d.rounded_rectangle((lx, ly, 1490, ly + 268), radius=12, fill=(0, 0, 0, 215))
d.text((lx + 12, ly + 18), 'Ascent guide', font=font(16, 'Bold'), fill=(255, 255, 255, 255), anchor='lm')
d.text((lx + 12, ly + 38), '1500×1000 · 3:2', font=font(13, 'Medium'), fill=(200, 200, 210, 255), anchor='lm')
items = [
    ((120, 230, 170), 'Must be rock (45px)'),
    ((70, 140, 105), 'Prefer rock (85px)'),
    ((110, 200, 255), 'Current ridgeline'),
    ((255, 110, 110), 'Text zone, corners'),
    ((255, 90, 90), 'Too tight in current art'),
    ((255, 205, 90), 'Phase label zones'),
    ((242, 184, 75), 'Summit + peak target'),
]
for i, (c, text) in enumerate(items):
    yy = ly + 70 + i * 28
    d.rectangle((lx + 12, yy - 7, lx + 26, yy + 7), fill=c + (255,))
    d.text((lx + 34, yy), text, font=font(14, 'Medium'), fill=(255, 255, 255, 240), anchor='lm')
guide.convert('RGB').save(os.path.join(OUT, 'ascent-guide-1500x1000.png'), optimize=True)

# --- G3: overlay -----------------------------------------------------------------------------------
for theme in ('dark', 'light'):
    for tag in ('day30', 'day1'):
        app = Image.open(os.path.join(CAP, f'ascent-overlay-{theme}-{tag}-1500x1000.png')).convert('RGBA')
        clean = scrim(theme)
        clean.alpha_composite(app)
        clean.putalpha(Image.fromarray(np.minimum(np.array(clean.split()[3]), np.array(CLIP_REF))))
        clean.save(os.path.join(OUT, 'extras', f'ascent-overlay-clean-{theme}-{tag}-1500x1000.png'), optimize=True)
        # Exact composite of the current art with what the app draws (iOS gradient semantics).
        art_t = Image.open(os.path.join(ROOT, 'assets', f'ascent-{theme}.jpg')).convert('RGBA').resize((W, H))
        art_t.alpha_composite(clean)
        bg = Image.new('RGBA', (W, H), (17, 17, 22, 255) if theme == 'dark' else (247, 246, 251, 255))
        bg.paste(art_t, (0, 0), CLIP_REF)
        bg.convert('RGB').save(os.path.join(OUT, 'extras', f'ascent-current-{theme}-{tag}-1500x1000.png'), optimize=True)

over = Image.open(os.path.join(OUT, 'extras', 'ascent-overlay-clean-dark-day30-1500x1000.png')).convert('RGBA')
od = ImageDraw.Draw(over)
dashed_rect(od, where_box, (255, 110, 110, 255), 4)
for b in pill_boxes.values():
    dashed_rect(od, b, (255, 205, 90, 255), 3)
clip_layer = Image.new('RGBA', (W, H), (255, 60, 60, 0))
clip_layer.putalpha(Image.eval(CLIP_WORST, lambda v: 0 if v else 110))
over.alpha_composite(clip_layer)
over.save(os.path.join(OUT, 'ascent-overlay-1500x1000.png'), optimize=True)

# --- G4: screenshots ----------------------------------------------------------------------------
for theme in ('dark', 'light'):
    shutil.copy(os.path.join(CAP, f'today-{theme}-393x852@3x.png'), os.path.join(OUT, f'today-{theme}-393x852@3x.png'))
    shutil.move(os.path.join(OUT, 'extras', f'ascent-current-{theme}-day30-1500x1000.png'), os.path.join(OUT, f'ascent-current-{theme}-1500x1000.png'))

# --- Coordinates ----------------------------------------------------------------------------------
with open(os.path.join(OUT, 'extras', 'trail-coordinates.csv'), 'w', newline='') as f:
    wr = csv.writer(f)
    wr.writerow(['day', 'phase', 'x', 'y', 'x_px_1500', 'y_px_1000', 'landmark'])
    for i, p in enumerate(DAYS):
        wr.writerow([i + 1, phase_of(i + 1), f'{p[0]:.4f}', f'{p[1]:.4f}', f'{p[0] * W:.1f}', f'{p[1] * H:.1f}', LANDMARKS.get(i + 1, '')])
json.dump({'image': [W, H], 'days': [{'day': i + 1, 'x': round(p[0], 5), 'y': round(p[1], 5)} for i, p in enumerate(DAYS)],
           'trailDots': [{'x': round(p[0], 5), 'y': round(p[1], 5)} for i, p in enumerate(FINE) if i % 4],
           'summit': DAYS[65], 'peakTarget': APEX, 'requiredRockPx': REQUIRED_ROCK, 'preferredRockPx': PREFERRED_ROCK,
           'textZonePx': where_box, 'phaseLabelZonesPx': pill_boxes, 'scrim': {'end': SCRIM_END, **{k: {'rgb': v[0], 'opacity': v[1]} for k, v in SCRIM.items()}},
           'cornerRadiusPx': {'smallestPhone': FRAME_RADIUS_PT / SMALLEST_FRAME_PT * W, 'reference360pt': FRAME_RADIUS_PT / REF_FRAME_PT * W},
           'verifiedAgainstApp': {'markers': len(measured), 'maxErrorPx': round(max_err, 2)}},
          open(os.path.join(OUT, 'extras', 'ascent-geometry.json'), 'w'), indent=1)

# --- Palette sheet ----------------------------------------------------------------------------------
SECTIONS = [
    ('App UI · dark theme (src/theme)', [('bg', '#111116'), ('surface', '#1C1B25'), ('surfaceHigh', '#272533'), ('text', '#F5F3FF'),
                                          ('textDim', '#A5A3B5'), ('textFaint', '#75728A'), ('accent', '#A78BFA'), ('accentLight', '#DDD3FE')]),
    ('App UI · light theme (src/theme)', [('bg', '#F7F6FB'), ('surface', '#FFFFFF'), ('surfaceHigh', '#EEECF5'), ('text', '#191621'),
                                           ('textDim', '#696575'), ('textFaint', '#76728A'), ('accent', '#7451C8'), ('accentLight', '#C9B8F5')]),
    ('Gold · summit and milestones only', [('gold (dark)', '#F2B84B'), ('gold (light)', '#A76A00')]),
    ('Artwork palette · night (dark theme, ceremonies)', [('ink', '#0E0D14'), ('indigo', '#1A1830'), ('slate violet', '#2A2742'),
                                                          ('ridge haze', '#3B3858'), ('mist', '#5A5678')]),
    ('Artwork palette · day (light theme)', [('lilac haze', '#D9D6EA'), ('periwinkle', '#C3C1DD'), ('cloud', '#F4F3F9'), ('warm horizon', '#EFE3D6')]),
    ('Rock tone along the trail (keeps the app\'s dots readable)', [('dark: from', '#26243A'), ('dark: to', '#3B3858'), ('light: from', '#C3C1DD'), ('light: to', '#DDDBEC')]),
]
sheet = Image.new('RGB', (1800, 1360), (24, 23, 30))
sd = ImageDraw.Draw(sheet)
sd.text((48, 40), 'Schwung · The Quiet Ascent · palette', font=font(40, 'Bold'), fill=(245, 243, 255))
sd.text((48, 92), 'Violet glow is drawn by the app (the user). Artwork contains no violet hot spots. Gold appears in artwork only at the summit sunrise.',
        font=font(20, 'Medium'), fill=(165, 163, 181))
y = 150
for title, swatches in SECTIONS:
    sd.text((48, y), title, font=font(22, 'SemiBold'), fill=(221, 211, 254))
    y += 36
    for i, (name, hexc) in enumerate(swatches):
        x = 48 + i * 212
        rgb = tuple(int(hexc[k:k + 2], 16) for k in (1, 3, 5))
        sd.rounded_rectangle((x, y, x + 196, y + 84), radius=14, fill=rgb, outline=(60, 58, 72), width=2)
        sd.text((x + 12, y + 92), name, font=font(17, 'Medium'), fill=(230, 228, 240))
        sd.text((x + 12, y + 114), hexc, font=font(17, 'SemiBold'), fill=(165, 163, 181))
    y += 160
sheet.save(os.path.join(OUT, 'palette-sheet.png'), optimize=True)
print('wrote', sorted(os.listdir(OUT)), sorted(os.listdir(os.path.join(OUT, 'extras'))))
