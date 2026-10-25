# Panorama pieces: ChatGPT prompts (dark, v2)

The first six pieces stitched well, but:

- `h3` and `f3` had their own sky;
- Habits wasn't pale;
- Field Notes had no camp;
- the joins relied on our grading.

This round gives ChatGPT a **guide** per piece: 1536 × 1024 with a 256 px strip of our real, graded art at exactly the
rows the piece will occupy. The strip is on the right edge for Habits and the left edge for Field Notes; the rest is
flat grey to paint over. `assemble_panorama.py` lays each piece's strip back over the Journey edge.

**Order:** make them in this order (h1 → h2 → h3, f1 → f2 → f3). Each piece below row 1 also continues the piece above
it, so attach that one too.

**Upload as:** `design/artwork-candidates/h1-dark-v2.png` … `f3-dark-v2.png`. Use the original download, not a
screenshot.

## 1. Setup message

Send this once, first. Attach `assets/world-dark.jpg` and `design/artwork-candidates/a1-dark-v2.png`.

```
We're building one continuous, wide night landscape for an app, made of 1536×1024 pieces that sit side by side
and stacked. Attached: our approved centre column (world-dark.jpg — summit at the top, then forest, then a misty
valley lake fading to near-black) and the summit painting itself (a1-dark-v2.png).

Every piece you make must look like part of the SAME painting:
- same painterly style and fine grain
- same dusk palette: deep indigo #1C1A2A–#2A2840, violet-grey mist, and a thin warm glow only along the far
  horizon
- same light, coming from the far horizon behind the mountain
- same scale: trees, ridges and fog bands the same size as in the strip

Never: text, people, animals, logos, trails or paths, frames, borders, a moon, stars, saturated colour, lens
flare, or sharp foreground details.

Output exactly 1536×1024, landscape. For each piece I'll attach a GUIDE: a strip of our real art on one edge and
flat grey where you paint. Paint over the grey so it flows seamlessly into the strip — same horizon height,
ridges and fog bands continuing at the same heights, same tones — and keep the strip area looking as it does.
Reply with the image and the prompt you used.
```

## 2. Habits: the peaceful valley (left of the mountain)

Habit cards sit on top of these, so they must be calm: pale mist, low contrast, little detail.

**h1** — attach `design/canvas/guides/h1-guide-dark.png`

```
Piece h1, guide attached (our art is the strip on the RIGHT edge). This is the land to the LEFT of the mountain:
a peaceful valley.
- Top 30%: the same dark indigo sky as the strip, with the thin warm glow on the horizon at exactly the
  strip's horizon height.
- The mountain is NOT repeated. Only its lower left flank continues out of the strip and quickly sinks into
  fog.
- To the left, a wide, quiet valley at a lower level: soft distant ridgelines at the same horizon height, rolling
  hills and fog lakes, a few scattered pines softened by mist.
- Keep the left two-thirds especially calm and low-contrast: no strong silhouettes, nothing darker than the
  strip's darkest forest.
```

**h2** — attach `h2-guide-dark.png` and your approved h1

```
Piece h2, guide attached (strip on the RIGHT). It sits directly BELOW h1 (also attached) and to the LEFT of the
strip.
- No sky and no horizon: we're looking down onto gentle slopes.
- The top edge continues h1's bottom edge; the right edge continues the strip's fog bands and pine rows at the
  same heights.
- Soft, layered fog with sparse, small pine groves, very low contrast, and calm open mist in the middle.
```

**h3** — attach `h3-guide-dark.png` and your approved h2

```
Piece h3, guide attached (strip on the RIGHT). It sits directly BELOW h2 (attached).
- No sky and no horizon.
- A quiet valley floor: a still, misty meadow with a faint winding stream and a few dim tree clusters, all
  softened by fog.
- The top edge continues h2; the right edge continues the strip.
- The bottom 35% thickens into fog and darkens smoothly to a flat #111116, exactly as the strip does.
```

## 3. Field Notes: the discovery (right of the mountain)

Atmospheric and reflective: moderate detail, calmer than the mountain.

**f1** — attach `f1-guide-dark.png`

```
Piece f1, guide attached (our art is the strip on the LEFT edge). This is the land to the RIGHT of the mountain:
the place of discovery.
- Top 30%: the same sky and warm horizon glow at the strip's horizon height.
- The mountain's right flank continues out of the strip and steps down to a calm high overlook.
- Beyond it, a long, still lake stretches to the right toward soft distant ridges, with faint reflections of
  the glow on the water.
- Moderate detail, quieter than the mountain.
```

**f2** — attach `f2-guide-dark.png` and your approved f1

```
Piece f2, guide attached (strip on the LEFT). It sits directly BELOW f1 (attached).
- No sky.
- The lakeshore: still water with soft mist reflections; pines along the shore that continue the strip's
  forest.
- Near the middle of the image (well away from the edges): a small lakeside camp — one small tent with a faint
  warm light inside and a tiny campfire. The warm light is small and subtle; it's the only warm colour.
- The top edge continues f1's bottom edge; the left edge continues the strip.
```

**f3** — attach `f3-guide-dark.png` and your approved f2

```
Piece f3, guide attached (strip on the LEFT). It sits directly BELOW f2 (attached).
- No sky and no horizon.
- Shallow lake water and reeds in low fog near the camp: calm, few details, gentle reflections.
- The top edge continues f2; the left edge continues the strip.
- The bottom 35% fades smoothly to a flat #111116, exactly as the strip does.
```

## 4. After uploading

Tell Claude "dark v2 uploaded". Claude stitches the panorama, renders the phone previews, and commits the dark
version once you approve it. The light pieces come after, as relights of the approved dark ones.
