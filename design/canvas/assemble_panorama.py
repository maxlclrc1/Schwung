"""
Assembles the continuous world panorama (4608 x 3840): Habits | Journey | Field Notes.

  Journey      the current world image (assets/world-<theme>.jpg), untouched: its painting and trail stay exactly
               where they are, apart from a 96 px crossfade at its outer edges (the trail starts 107 px in).
  Habits       h1, h2, h3 stacked (beside the summit, the forest and the valley), to the left.
  Field Notes  f1, f2, f3 stacked, to the right.

Each side piece is graded to the Journey column at the same rows (brightness distribution and palette, as
join_pieces.py does for vertical joins), the pieces of a column are crossfaded over 220 rows, the sky above
row 800 continues Journey's sky row by row, each column's inner edge is colour-matched to Journey's edge and
crossfaded over 96 px, and everything fades into the exact app background where Journey does.

    python3 design/canvas/assemble_panorama.py <dark|light> <out.png> [--crop3 ROWS]

--crop3 drops the top ROWS of h3 and f3 (default 380): those pieces were painted with their own sky and
distant ridges, which can't sit under the forest. Only their lake and forest are used.
"""

import sys

import numpy as np
from PIL import Image

theme, out_p = sys.argv[1], sys.argv[2]
CROP3 = int(sys.argv[sys.argv.index('--crop3') + 1]) if '--crop3' in sys.argv else 380
CAND = 'design/artwork-candidates'
W, H_OUT = 1536, 3840
EDGE = 96  # horizontal crossfade into Journey's outer margin
SIDE = W + EDGE  # side columns are built this wide, so they overlap Journey by EDGE
PAINT_TOP = 800
VOVERLAP = 220
BG = np.array([17, 17, 22] if theme == 'dark' else [247, 246, 251], np.float32)
LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)
rng = np.random.default_rng(11)


def load(p, width):
    im = Image.open(p).convert('RGB')
    return np.asarray(im.resize((width, round(im.size[1] * width / im.size[0])), Image.LANCZOS)).astype(np.float32)


def smooth(t):
    return t * t * (3 - 2 * t)


def grade(piece, ref, strength=0.8):
    """Match the piece's brightness distribution to ref's and take its colours from ref's palette (join_pieces)."""
    lr, l2 = (ref @ LUM).ravel(), piece @ LUM
    q = np.linspace(0, 100, 257)
    lm = np.interp(l2, np.percentile(l2, q), np.percentile(lr, q))
    bins = np.clip((lr / 255 * 63).astype(int), 0, 63)
    cnt = np.bincount(bins, minlength=64)
    pal = np.stack([np.bincount(bins, weights=ref[..., c].ravel(), minlength=64) for c in range(3)], 1)
    pal /= np.maximum(cnt, 1)[:, None]
    for i in range(1, 64):
        if cnt[i] == 0:
            pal[i] = pal[i - 1]
    idx = lm / 255 * 63
    i0 = np.clip(idx.astype(int), 0, 62)
    f = (idx - i0)[..., None]
    col = pal[i0] * (1 - f) + pal[i0 + 1] * f
    col *= (lm / np.maximum(col @ LUM, 1e-3))[..., None]
    kept = piece * (lm / np.maximum(l2, 1e-3))[..., None]
    return col * strength + kept * (1 - strength)


def blur_rows(a, r=60):
    k = np.exp(-0.5 * (np.arange(-3 * r, 3 * r + 1) / r) ** 2)
    k /= k.sum()
    pad = np.pad(a, ((3 * r, 3 * r), (0, 0)), mode='edge')
    return np.stack([np.convolve(pad[:, c], k, mode='valid') for c in range(a.shape[1])], 1)


world = np.asarray(Image.open(f'assets/world-{theme}.jpg').convert('RGB')).astype(np.float32)
HW = world.shape[0]
journey = np.repeat(BG[None, None], H_OUT, 0).repeat(W, 1)
journey[:HW] = world
# Where Journey has faded into the background: the side columns end there too.
diff = np.abs(world.mean(1) - BG).max(1)
fade_end = int(np.nonzero(diff > 3)[0].max()) + 1


def column(prefix, inner):
    """One side column, SIDE wide; `inner` is 'right' (Habits, Journey on its right) or 'left' (Field Notes)."""
    scale = SIDE / W
    pieces = [load(f'{CAND}/{prefix}{i}-{theme}-v1.png', SIDE) for i in (1, 2, 3)]
    pieces[2] = pieces[2][round(CROP3 * scale):]
    # The Journey band the column will sit beside, mirrored out to SIDE wide, as the grading reference.
    ref = journey[:, :EDGE * 4] if inner == 'right' else journey[:, -EDGE * 4:]
    top = PAINT_TOP
    col = None
    for n, p in enumerate(pieces):
        band = ref[top:top + p.shape[0]]
        band = band[: max(1, min(len(band), p.shape[0]))]
        p = grade(p, band if len(band) > 200 else journey[top - 400:top + 400], 0.8 if n else 0.65)
        if col is None:
            col, top = p, top + p.shape[0]
            continue
        w = smooth(np.arange(VOVERLAP) / VOVERLAP)[:, None, None]
        col = np.concatenate([col[:-VOVERLAP], col[-VOVERLAP:] * (1 - w) + p[:VOVERLAP] * w, p[VOVERLAP:]])
        top += p.shape[0] - VOVERLAP
    full = np.repeat(BG[None, None], H_OUT, 0).repeat(SIDE, 1)
    end = min(H_OUT, PAINT_TOP + col.shape[0])
    full[PAINT_TOP:end] = col[: end - PAINT_TOP]
    # Sky above the painting rows: Journey's sky, row by row, eased into the piece's own sky over 200 rows.
    sky = journey[:PAINT_TOP + 200].mean(1)[:, None, :].repeat(SIDE, 1)
    full[:PAINT_TOP] = sky[:PAINT_TOP]
    w = smooth(np.arange(200) / 200)[:, None, None]
    full[PAINT_TOP:PAINT_TOP + 200] = sky[PAINT_TOP:] * (1 - w) + full[PAINT_TOP:PAINT_TOP + 200] * w
    # Fade into the background where Journey does (or sooner, where the column's own pieces end), and match
    # Journey's grain. The edge colour match below carries Journey's later fade across the border.
    rows = np.arange(H_OUT)[:, None, None]
    side_end = min(fade_end, end)
    tail = np.clip((rows - (side_end - 480)) / 480, 0, 1) ** 1.2
    full = full * (1 - tail) + BG * tail
    grain = rng.normal(0, 2.4, (H_OUT, SIDE, 1)).astype(np.float32) * (1 - tail) * (rows >= PAINT_TOP - 200)
    # The inner edge takes Journey's edge colours (per row, softened), easing off over 480 px.
    j_edge = journey[:, :EDGE].mean(1) if inner == 'right' else journey[:, -EDGE:].mean(1)
    c_edge = full[:, -2 * EDGE:-EDGE].mean(1) if inner == 'right' else full[:, EDGE:2 * EDGE].mean(1)
    offset = blur_rows(j_edge - c_edge)
    dist = (SIDE - 1 - EDGE - np.arange(SIDE)) if inner == 'right' else (np.arange(SIDE) - EDGE)
    ease = smooth(np.clip(1 - dist / 480, 0, 1))[None, :, None]
    full = full + offset[:, None, :] * ease
    full += grain
    return full


habits = column('h', 'right')
notes = column('f', 'left')

pano = np.zeros((H_OUT, W * 3, 3), np.float32)
pano[:, :W] = habits[:, :W]
pano[:, W:2 * W] = journey
pano[:, 2 * W:] = notes[:, EDGE:]
# 96 px crossfades inside Journey's outer margins.
w = smooth(np.arange(EDGE) / EDGE)[None, :, None]
pano[:, W:W + EDGE] = habits[:, W:] * (1 - w) + journey[:, :EDGE] * w
pano[:, 2 * W - EDGE:2 * W] = journey[:, -EDGE:] * (1 - w) + notes[:, :EDGE] * w
Image.fromarray(pano.clip(0, 255).astype(np.uint8)).save(out_p)
print(f'{out_p}: {pano.shape[1]}x{pano.shape[0]}; Journey fades out at row {fade_end}; h3/f3 top {CROP3} rows dropped')
