"""
Draws the One Continuous Ascent canvas guides from the current world art and the measured Today layout.

    python3 design/canvas/make_canvas_guides.py
"""

import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 1536, 5120
ZONES = [  # name, top, bottom, color, note
    ('Z0  SKY', 0, 800, (110, 200, 255), 'open sky, calm. Greeting, Phase/Day text float here'),
    ('Z1  SUMMIT + TRAIL (LOCKED)', 800, 1824, (242, 184, 75), 'the approved painting. Trail geometry; do not change'),
    ('Z2  LOWER SLOPES', 1824, 2600, (120, 230, 170), 'mountain base continues: slopes, few rocks, hazier going down'),
    ('Z3  MIST VALLEY', 2600, 4000, (190, 170, 255), 'soft rolling mist, very low contrast. Behind the habit cards'),
    ('Z4  BLEND', 4000, 4800, (255, 140, 140), 'mist thins into the exact app background color'),
    ('Z5  APP BACKGROUND', 4800, 5120, (200, 200, 200), 'exactly #111116 dark / #F7F6FB light'),
]
PARALLAX = 0.4
# Reference phone: 393 x 852 pt, notch inset 59 pt, 6 habits (max scroll ~750 pt on device).
PT = W / 393
INSET, ZONE_TOP, SCREEN_H, MAX_SCROLL = 59, 125, 852, 750
image_top_pt = ZONE_TOP - 800 / PT


def font(size, weight='SemiBold'):
    p = f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf'
    return ImageFont.truetype(p, size) if os.path.exists(p) else ImageFont.load_default()


def window(scroll):
    """Canvas rows visible on screen at a given page scroll (the canvas moves at PARALLAX speed)."""
    top = (0 - image_top_pt + PARALLAX * scroll) * PT
    return top, top + SCREEN_H * PT


for theme, bg, ink in (('dark', (17, 17, 22), (255, 255, 255)), ('light', (247, 246, 251), (25, 22, 33))):
    world = Image.open(os.path.join(ROOT, 'assets', f'world-{theme}.jpg')).convert('RGB')
    canvas = Image.new('RGB', (W, H), bg)
    canvas.paste(world, (0, 0))
    g = canvas.convert('RGBA')
    d = ImageDraw.Draw(g)
    # Rows below the current art: placeholder hatch, to be painted (Z2 lower part, Z3).
    for y in range(2300, 4000, 48):
        d.line((0, y, W, y + 300), fill=ink + (22,), width=2)
    for name, top, bottom, col, note in ZONES:
        d.rectangle((6, top + 3, W - 6, bottom - 3), outline=col + (255,), width=5)
        d.rounded_rectangle((24, top + 18, 24 + 980, top + 92), radius=12, fill=(0, 0, 0, 190))
        d.text((44, top + 24), f'{name}   rows {top}–{bottom}', font=font(34, 'Bold'), fill=col + (255,))
        d.text((44, top + 62), note, font=font(22, 'Medium'), fill=(235, 235, 245, 255))
    # Phone windows at the top of the page and fully scrolled (6 habits), with parallax.
    for scroll, label, col in ((0, 'iPhone 393×852 at the top', (255, 255, 255)), (MAX_SCROLL, f'same, fully scrolled ({MAX_SCROLL} pt, parallax {PARALLAX})', (255, 220, 120))):
        a, b = window(scroll)
        x0 = 1000 if scroll == 0 else 1060
        d.rectangle((x0, a, x0 + 420, b), outline=col + (255,), width=6)
        d.rounded_rectangle((x0 - 10, a - 60, x0 + 520, a - 8), radius=10, fill=(0, 0, 0, 200))
        d.text((x0, a - 52), label, font=font(24, 'SemiBold'), fill=col + (255,))
    # Where the habit list sits on the canvas while it's on screen (first card top, at scroll 0 and max).
    g.convert('RGB').resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(OUT, f'canvas-guide-{theme}-768x2560.png'), optimize=True)

# The tile ChatGPT paints: 1024 x 1536 portrait, placed at rows 1900–4204 (scaled 1.5x to 1536 wide).
TILE_W, TILE_H, TILE_TOP = 1024, 1536, 1900
for theme, bg in (('dark', (17, 17, 22)), ('light', (247, 246, 251))):
    world = Image.open(os.path.join(ROOT, 'assets', f'world-{theme}.jpg')).convert('RGB')
    tile = Image.new('RGB', (TILE_W, TILE_H), bg)
    # Reference strip: what the tile continues from (canvas rows 1500–1900, the painting's base and fog).
    ref = world.crop((0, 1500, W, 1900)).resize((TILE_W, round(400 / 1.5)), Image.LANCZOS)
    sheet = Image.new('RGB', (TILE_W, TILE_H + ref.size[1] + 40), (30, 30, 36))
    sheet.paste(ref, (0, 0))
    t = sheet.convert('RGBA')
    d = ImageDraw.Draw(t)
    y0 = ref.size[1] + 40
    d.text((16, ref.size[1] + 8), 'ABOVE: the existing art this tile continues from (not part of the tile)', font=font(20, 'SemiBold'), fill=(255, 255, 255, 255))
    bands = [
        (0, 0.25, (120, 230, 170), 'TOP 25%: lower slopes of the SAME mountain, soft rocks, matching tones; partly veiled by fog'),
        (0.25, 0.70, (190, 170, 255), 'MIDDLE: mist valley. Soft rolling fog, faint distant ridges at most. VERY calm: cards sit here'),
        (0.70, 1.0, (255, 140, 140), f'BOTTOM 30%: fog thinning toward the app background {"#111116" if theme == "dark" else "#F7F6FB"}'),
    ]
    for a, b, col, note in bands:
        top, bottom = y0 + a * TILE_H, y0 + b * TILE_H
        d.rectangle((4, top + 2, TILE_W - 4, bottom - 2), outline=col + (255,), width=4)
        d.rounded_rectangle((16, top + 14, TILE_W - 16, top + 70), radius=10, fill=(0, 0, 0, 190))
        d.text((28, top + 22), note, font=font(19, 'Medium'), fill=col + (255,))
    d.text((16, y0 + TILE_H - 40), f'TILE: 1024×1536 portrait · {theme} theme · no trail, text, people or glow', font=font(20, 'Bold'), fill=(255, 255, 255, 255))
    t.convert('RGB').save(os.path.join(OUT, f'tile-L1-guide-{theme}.png'), optimize=True)
print('ok')
