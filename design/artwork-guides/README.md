# Ascent artwork guide pack (A1)

Reference files for painting new Schwung Ascent artwork (the mountain on Today, also reused on Welcome)
without breaking the trail. Everything here comes from the app's actual geometry: the trail is a direct port
of `src/core/ascent.ts`, checked against all 61 plain day markers measured from the running app
(max error 0.09 px at 1500×1000). The overlays are captures of what the app really draws.

## Upload these to ChatGPT

| File | What it is |
|---|---|
| `ascent-guide-1500x1000.png` | **G1, the main guide.** Current art (dimmed), all 66 numbered day markers, the rock corridor (green), summit crosshair and peak target (gold), phase-label zones (yellow), the "Day n" text zone and clipped corners (red), the current ridgeline (blue), and spots where the current art is too tight (red circles). |
| `ascent-mask-1500x1000.png` | **G2, the mask.** White = must be mountain/rock. Black = keep calm (open sky above the peak, the text zone, the phase-label zones). Gray = free. |
| `ascent-overlay-1500x1000.png` | **G3.** Transparent PNG of exactly what the app draws on top (Day 30, dark theme), including the top-left darkening gradient as iOS draws it, with the exclusion zones outlined. |
| `ascent-current-dark-1500x1000.png`, `ascent-current-light-1500x1000.png` | **G4.** The current Ascent exactly as it renders, art plus overlay, in both themes. |
| `today-dark-393x852@3x.png`, `today-light-393x852@3x.png` | **G4.** The whole Today screen on a 393×852 phone at 3x (from the web build; see the notes). |
| `palette-sheet.png` | App colors (both themes), gold, and the artwork palette. |

`extras/` holds clean overlays (no annotations) for Day 1 and Day 30 in both themes, Day 1 composites, every
day's coordinates (`trail-coordinates.csv`), and all measured zones (`ascent-geometry.json`).

## The rules the new artwork must follow

1. **Exactly 3:2.** Deliver 1500×1000 or larger at the same ratio (1536×1024, 1800×1200, 3000×2000).
   The app shows it at exactly 3:2 with no cropping, so anything else shifts the trail.
2. **The white area of the mask must be mountain/rock.** Every day marker sits on the mountain body with at
   least 45 px of rock around the trail at 1500×1000. The faint green band (85 px) should be rock too, if possible.
   The ridgeline itself is free; it only has to stay outside the white area.
3. **The peak** sits near (0.70, 0.075), meaning x = 1050 px, y = 75 px (± 0.02). The Day 66 summit marker is
   just below it at (1050, 105). Leave open sky right above the peak.
4. **Don't paint** a trail, path, markers, text, numbers, people, or a glowing violet spot. The app draws the
   trail and the user's violet orb on top.
5. **Keep calm (low detail, no bright spots):** the top-left text zone, the three phase-label zones, and the trail
   corridor itself. The rock along the trail should stay in these ranges so the app's faint "future day" dots stay
   visible: dark theme #26243A–#3B3858, light theme #C3C1DD–#DDDBEC.
6. **Dark and light are the same painting.** Make the light version as a relight of the approved dark one, with
   the same composition and edges, because the app crossfades between them.
7. **Gold** only as a faint warm glow at the summit. No violet hot spots anywhere.
8. **Widen the mountain** where the current art is too tight: the left shoulder around days 37–38
   (x ≈ 260–315, y ≈ 530–550) and the upper left flank around days 61–63 (x ≈ 760–875, y ≈ 155–205).

## Notes
- **Sizes of the app's markers are fixed in points.** The captures use the 360 pt-wide frame (a 392 pt phone).
  On the smallest phone (288 pt frame) markers look about 25% larger relative to the art. On the largest
  (408 pt) they look about 12% smaller.
- **Corners:** the frame has a 22 pt corner radius. On the smallest phone that clips about 115 px of each corner
  at 1500×1000 (shaded red in the guide). Keep nothing important in the corners.
- **The top-left gradient** in the guide files follows iOS: it fades from the corner and ends at (0.45, 0.40).
  The `today-*` screenshots come from the web build, which stretches that gradient a little further.
- The current art's ridgeline comes from `scripts/generate-ascent-art.py`.

## Suggested first message to ChatGPT
> Attached are the Schwung Ascent guide files. Please create one original landscape for the **dark theme**:
> exactly 3:2 (1536×1024 or larger), following the guide and mask exactly. White in the mask must be mountain
> rock, black must stay calm, and the peak must sit at about 70% across and 7.5% down. Don't paint any trail,
> markers, text, people or violet glow; the app draws those. Use "The Quiet Ascent" direction from the
> handoff: layered ridgelines, mist, pre-dawn blue hour, a faint warm glow behind the summit, fine grain, the
> artwork palette on the palette sheet. When I approve it, we'll make the light version as a relight of the
> same image.

## Sending results back
Upload ChatGPT's images to `design/artwork-candidates/`. See the README there.

## Regenerating these files
1. Export and serve the web build: `npx expo export -p web --output-dir <dir>`, then serve `<dir>` on port 8099.
2. `node design/artwork-guides/tools/capture-guides.js <capture-dir>`. This needs Playwright and Chromium,
   which are not project dependencies.
3. `python3 design/artwork-guides/tools/make_guides.py <capture-dir>`. This needs Pillow and NumPy.
