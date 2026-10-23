"""
Stacks continuation pieces (each painted directly below the previous one) into one tall continuation.
Every piece after the first is graded to the piece above it: its brightness distribution is matched to the
lower half of the piece above, and its colours are taken from that piece's own palette (80%, keeping 20% of
its original hue), then it is crossfaded in over OVERLAP rows.

    python3 design/canvas/join_pieces.py [--edge] <out.png> <piece1> <piece2> [...]

--edge grades lightly instead: only the colour at the join is matched, easing off over 320 rows, so the rest
of each piece stays as painted (for pieces that already match, like the light relights).
"""

import sys

import numpy as np
from PIL import Image

OVERLAP = 220
W = np.array([0.2126, 0.7152, 0.0722], np.float32)


def load(p):
    im = Image.open(p).convert('RGB')
    return np.asarray(im.resize((1536, round(im.size[1] * 1536 / im.size[0])), Image.LANCZOS)).astype(np.float32)


def grade(piece, above):
    ref = above[400:]
    lr, l2 = (ref @ W).ravel(), piece @ W
    q = np.linspace(0, 100, 257)
    dst = np.percentile(lr, q) + np.linspace(0, 1, 257) ** 3 * 12  # mist may stay a little brighter than trees
    lm = np.interp(l2, np.percentile(l2, q), dst)
    bins = np.clip((lr / 255 * 63).astype(int), 0, 63)
    cnt = np.bincount(bins, minlength=64)
    pal = np.stack([np.bincount(bins, weights=ref[..., c].ravel(), minlength=64) for c in range(3)], 1) / np.maximum(cnt, 1)[:, None]
    for i in range(1, 64):
        if cnt[i] == 0:
            pal[i] = pal[i - 1]
    idx = lm / 255 * 63
    i0 = np.clip(idx.astype(int), 0, 62)
    f = (idx - i0)[..., None]
    col = pal[i0] * (1 - f) + pal[i0 + 1] * f
    col *= (lm / np.maximum(col @ W, 1e-3))[..., None]
    return col * 0.8 + piece * (lm / np.maximum(l2, 1e-3))[..., None] * 0.2


def edge_match(piece, above):
    offset = above[-40:].reshape(-1, 3).mean(0) - piece[:40].reshape(-1, 3).mean(0)
    ease = np.clip(1 - np.arange(piece.shape[0]) / 320, 0, 1)[:, None, None]
    return piece + offset * ease


args = sys.argv[1:]
light = args[0] == '--edge'
if light:
    args = args[1:]
out = load(args[1])
for p in args[2:]:
    nxt = (edge_match if light else grade)(load(p), out[-1024:])
    w = (np.arange(OVERLAP) / OVERLAP)[:, None, None]
    w = w * w * (3 - 2 * w)
    out = np.concatenate([out[:-OVERLAP], out[-OVERLAP:] * (1 - w) + nxt[:OVERLAP] * w, nxt[OVERLAP:]])
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(args[0])
print(f'{args[0]}: 1536x{out.shape[0]}')
