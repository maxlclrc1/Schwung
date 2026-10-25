"""
Assembles the continuous world panorama (4096 x 3840): Habits | Journey | Field Notes.

  Habits       x 0-1280      h1, h2, h3 (dark v2: painted from guides, design/canvas/guides/)
  Journey      x 1280-2816   the current world image (assets/world-<theme>.jpg), its painting untouched
  Field Notes  x 2816-4096   f1, f2, f3

Each piece was painted over a guide whose inner 256 px are the real Journey art at the piece's rows (800, 1604,
2408), so each piece overlaps Journey by those 256 px: its 1280 px of new land sit beside Journey, and its
copy of the strip is crossfaded into Journey's outer 256 px, or 128 px on rows where the copy doesn't match
(the trail starts 107 px in on the left, 276 px on the right; h1 matches the strip at r = 0.99). Pieces in a column overlap by
220 rows and are crossfaded; the inner edges are colour-matched to Journey row by row; the sky above row 800
continues Journey's; everything fades into the exact app background where Journey does.

At rest each side tab shows 1536 px of panorama, so Habits sees x 0-1536 (its land plus the mountain's outer
256 px) and Field Notes x 2560-4096.

    python3 design/canvas/assemble_panorama.py <dark|light> <out.png> [--version v2]
"""

import sys

import numpy as np
from PIL import Image

theme, out_p = sys.argv[1], sys.argv[2]
VER = sys.argv[sys.argv.index('--version') + 1] if '--version' in sys.argv else 'v2'
CAND = 'design/artwork-candidates'
J, SIDE, STRIP = 1536, 1280, 256
H_OUT = 3840
ROWS = (800, 1604, 2408)
PIECE_H = 1024
BG = np.array([17, 17, 22] if theme == 'dark' else [247, 246, 251], np.float32)
rng = np.random.default_rng(11)


def smooth(t):
    return t * t * (3 - 2 * t)


def blur_rows(a, r=60):
    k = np.exp(-0.5 * (np.arange(-3 * r, 3 * r + 1) / r) ** 2)
    k /= k.sum()
    pad = np.pad(a, ((3 * r, 3 * r), (0, 0)), mode='edge')
    return np.stack([np.convolve(pad[:, c], k, mode='valid') for c in range(a.shape[1])], 1)


world = np.asarray(Image.open(f'assets/world-{theme}.jpg').convert('RGB')).astype(np.float32)
journey = np.repeat(BG[None, None], H_OUT, 0).repeat(J, 1)
journey[: world.shape[0]] = world
fade_end = int(np.nonzero(np.abs(world.mean(1) - BG).max(1) > 3)[0].max()) + 1


def column(prefix, inner):
    """A side column SIDE + STRIP wide, its strip on the `inner` side ('right' for Habits, 'left' for Field Notes)."""
    width = SIDE + STRIP
    full = np.full((H_OUT, width, 3), np.nan, np.float32)
    for n, top in enumerate(ROWS):
        p = np.asarray(Image.open(f'{CAND}/{prefix}{n + 1}-{theme}-{VER}.png').convert('RGB')).astype(np.float32)
        assert p.shape[:2] == (PIECE_H, width), p.shape
        region = full[top:top + PIECE_H]
        if n == 0:
            full[top:top + PIECE_H] = p
            continue
        ov = ROWS[n - 1] + PIECE_H - top  # rows shared with the piece above
        w = smooth(np.arange(ov) / ov)[:, None, None]
        region[:ov] = region[:ov] * (1 - w) + p[:ov] * w
        region[ov:] = p[ov:]
    end = ROWS[-1] + PIECE_H
    # Sky above row 800: Journey's, row by row, eased into the pieces' own sky over 200 rows.
    sky = journey[: ROWS[0] + 200].mean(1)[:, None, :].repeat(width, 1)
    full[: ROWS[0]] = sky[: ROWS[0]]
    w = smooth(np.arange(200) / 200)[:, None, None]
    full[ROWS[0]:ROWS[0] + 200] = sky[ROWS[0]:] * (1 - w) + full[ROWS[0]:ROWS[0] + 200] * w
    full[end:] = BG
    # Fade into the background where Journey does (or where the pieces end), with Journey's grain.
    rows = np.arange(H_OUT)[:, None, None]
    side_end = min(fade_end, end)
    tail = np.clip((rows - (side_end - 480)) / 480, 0, 1) ** 1.2
    full = full * (1 - tail) + BG * tail
    grain = rng.normal(0, 2.4, (H_OUT, width, 1)).astype(np.float32) * (1 - tail) * (rows >= ROWS[0] - 200)
    # The strip takes Journey's colours at the join (per row, softened), easing off over 640 px of new land.
    j_edge = journey[:, :STRIP].mean(1) if inner == 'right' else journey[:, -STRIP:].mean(1)
    c_edge = full[:, -STRIP:].mean(1) if inner == 'right' else full[:, :STRIP].mean(1)
    offset = blur_rows(j_edge - c_edge)
    dist = (width - STRIP - np.arange(width)) if inner == 'right' else (np.arange(width) - STRIP)
    ease = smooth(np.clip(1 - dist / 640, 0, 1))[None, :, None]
    return full + offset[:, None, :] * ease + grain


habits = column('h', 'right')
notes = column('f', 'left')

pano = np.zeros((H_OUT, SIDE * 2 + J, 3), np.float32)
pano[:, :SIDE] = habits[:, :SIDE]
pano[:, SIDE:SIDE + J] = journey
pano[:, SIDE + J:] = notes[:, STRIP:]


def blend_width(strip, edge):
    """Per row: 256 px where the piece's copy of the strip matches Journey (no ghosting), 128 px where it
    doesn't, so less of Journey's edge is touched where the two differ. Measured in 128-row bands, eased."""
    lum = np.array([0.2126, 0.7152, 0.0722], np.float32)
    a, b = strip @ lum, edge @ lum
    width = np.full(H_OUT, float(STRIP))
    for y in range(0, H_OUT, 128):
        x, z = a[y:y + 128, ::4].ravel(), b[y:y + 128, ::4].ravel()
        if x.std() > 1 and z.std() > 1 and np.corrcoef(x, z)[0, 1] < 0.8:
            width[y:y + 128] = STRIP / 2
    return blur_rows(width[:, None], 80)[:, 0]


def crossfade(outer, inner, width, outer_on_left):
    """Blend outer (piece) into inner (Journey) over `width` px per row, measured from Journey's edge."""
    x = np.arange(STRIP)[None, :] if outer_on_left else (STRIP - 1 - np.arange(STRIP))[None, :]
    w = smooth(np.clip(x / width[:, None], 0, 1))[..., None]
    return outer * (1 - w) + inner * w


pano[:, SIDE:SIDE + STRIP] = crossfade(
    habits[:, SIDE:], journey[:, :STRIP], blend_width(habits[:, SIDE:], journey[:, :STRIP]), True
)
pano[:, SIDE + J - STRIP:SIDE + J] = crossfade(
    notes[:, :STRIP], journey[:, -STRIP:], blend_width(notes[:, :STRIP], journey[:, -STRIP:]), False
)
Image.fromarray(pano.clip(0, 255).astype(np.uint8)).save(out_p)
print(f'{out_p}: {pano.shape[1]}x{pano.shape[0]}; Journey fades out at row {fade_end}')
