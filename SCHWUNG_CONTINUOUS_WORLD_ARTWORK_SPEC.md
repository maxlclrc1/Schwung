# Schwung — continuous world: artwork specification

**Status:** specification only; nothing here is built yet. The artwork is made in ChatGPT, uploaded, approved, and
then stitched, graded and integrated by our scripts.

**Revised to fit how the art is actually made.** ChatGPT paints at most 1536 × 1024 (or 1024 × 1536) per image.
The current world is already three such pieces stacked vertically and stitched by `design/canvas/join_pieces.py` /
`assemble_canvas.py`. So the panorama is built the same way:

- the existing stitched column stays **untouched** as the Journey region;
- ChatGPT paints matching pieces to its left (Habits) and right (Field Notes);
- we stitch, grade, extend and slice.

Nobody has to paint one giant image.

## 1. Layout diagram

Every cell is one ChatGPT piece (1536 × 1024, landscape). The middle column already exists.

```
            HABITS — peaceful valley      JOURNEY — the ascent           FIELD NOTES — the discovery
x (px)      0                    1536     1536                   3072    3072                   4608
            ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐ y (px)
 sky        │ sky (script-extended)  │    │ sky (script-extended)  │    │ sky (script-extended)  │    0
            │ header band: greeting  │    │ header band: title,    │    │ header band: kicker,   │
            │                        │    │ stats pill             │    │ question               │  800
 row 1      │ h1  NEW                │◄──►│ a1  EXISTS (locked)    │◄──►│ f1  NEW                │
            │ distant peak, faint,   │    │ summit + switchback    │    │ overlook / lake camp;  │
            │ pale meadow and mist   │    │ trail (the day markers │    │ the Journey mountain   │
            │                        │    │ are drawn on it)       │    │ seen across the water  │ 1824
 row 2      │ h2  NEW                │◄──►│ l1  EXISTS             │◄──►│ f2  NEW                │
            │ soft slopes, mist,     │    │ slopes, treeline,      │    │ shore path, reeds,     │
            │ few details            │    │ pine forest            │    │ tent / fire            │ ~2850
 row 3      │ h3  NEW                │◄──►│ l2  EXISTS             │◄──►│ f3  NEW                │
            │ quiet valley floor     │    │ misty valley and lake  │    │ lakeshore, reflections │ ~3584
            │ fade to app background │    │ fade to app background │    │ fade to app background │ 3840
            └────────────────────────┘    └────────────────────────┘    └────────────────────────┘
            ◄────────────────────── one seamless panorama, 4608 × 3840 after stitching ──────────────────────►
```

## 2. What to give ChatGPT (the originals)

Per theme, the three original pieces of the Journey column, plus the stitched world so it sees how they join:

| Theme | Summit (row 1)                              | Forest (row 2)    | Valley (row 3)    | Stitched result          |
| ----- | ------------------------------------------- | ----------------- | ----------------- | ------------------------ |
| Dark  | `design/artwork-candidates/a1-dark-v2.png`  | `l1-dark-v3.png`  | `l2-dark-v1.png`  | `assets/world-dark.jpg`  |
| Light | `design/artwork-candidates/a1-light-v1.png` | `l1-light-v1.png` | `l2-light-v1.png` | `assets/world-light.jpg` |

- The light `a1` in the app has a haze pass on top (`soften_light.py`). Give ChatGPT the original; we re-apply the
  haze.
- **Dark first, light as a relight.** Paint the six dark side pieces first. Then make each light piece as a relight
  of its dark piece (same composition, soft morning haze), exactly as the current light art was made. That way the
  theme crossfade can't ghost.

## 3. The pieces ChatGPT paints

Twelve images in all: 6 dark, then 6 light relights. Each one is **1536 × 1024 (landscape)**, ChatGPT's native size.

| Piece | Sits beside   | Content and intensity                                                                     |
| ----- | ------------- | ----------------------------------------------------------------------------------------- |
| `h1`  | left of `a1`  | Habits sky to distant peaks: pale, misty, low contrast; the mountain small and faint      |
| `h2`  | left of `l1`  | Soft slopes and mist; very little detail (habit cards cover most of it)                   |
| `h3`  | left of `l2`  | Quiet valley floor, mist; ends low and soft                                               |
| `f1`  | right of `a1` | Overlook or lakeside camp; the Journey mountain visible across the water; moderate detail |
| `f2`  | right of `l1` | Shore path, reeds, a tent or campfire glow; calm                                          |
| `f3`  | right of `l2` | Lakeshore and reflections, continuing Journey's lake                                      |

**Rules for every piece:**

- **Edges meet their neighbour.** `h*` pieces continue the left edge of the Journey piece on the same row; `f*`
  pieces continue its right edge. Pieces on the same side continue the piece above them.
  - Attach the neighbour and say, for example: _"Paint the landscape that continues to the LEFT of this image. Your
    right edge must flow into its left edge: same horizon height, same light, same palette."_
  - Don't expect a perfect join. We blend about 220 px of overlap, as we did for the forest and valley.
- **Horizon and light:** keep the horizon, the light direction and the haze level matching the Journey piece on
  the same row.
- **Nothing focal within 200 px of a join**, because we blend there.
- **Habits pieces:** pale and low-contrast, about 60% of Journey's saturation, nothing dramatic.
- **Field Notes pieces:** about 75% of Journey's contrast.
- **No text, frames, people's faces or UI.**

**File names:** upload to `design/artwork-candidates/` with the existing scheme, `<piece>-<theme>-v<n>.png`. For
example `h1-dark-v1.png` or `f2-light-v1.png`. Upload the original download, not a screenshot. A `.txt` file with
the same name holding the prompt is welcome.

## 4. What we do with them (no repainting)

1. **Stitch** each side column vertically, the same way the current world was: brightness and colour graded to the
   piece above, crossfaded over 220 rows.
2. **Join** the columns horizontally to the Journey column: colour matched at the join, crossfaded over about
   220 px.
3. **Extend** the sky above and fade to the exact app background below (as `extend_tall.py` /
   `assemble_canvas.py` do now), to a full height of **3840 px**.
4. **Slice and encode** into three tiles per theme, with a 16 px bleed on inner edges so no hairline seam appears:

```
assets/world/
  pano-dark-habits.webp       1552 × 3840   (region + 16 px bleed on the right)
  pano-dark-journey.webp      1568 × 3840   (16 px bleed on both sides)
  pano-dark-fieldnotes.webp   1552 × 3840   (16 px bleed on the left)
  pano-light-habits.webp      …same three in light
  pano-light-journey.webp
  pano-light-fieldnotes.webp
```

## 5. Dimensions and safe bands

- **Region:** 1536 × 3840, one per tab, the width of the existing art. The whole panorama is **4608 × 3840**.
- **Width-fit:** the world scales so one region equals the screen width, as it does today. Every iPhone sees a whole
  region, a tab change pans exactly one screen, and the Journey trail stays on the painting.
- The Journey painting stays at rows **800–1824**, where it is today, so the day markers line up with no new
  coordinates.

With the Journey painting's top at the safe-area top + 100pt, the rows each iPhone shows at rest:

| iPhone (pt)         | px per pt | Rows visible | Status bar ends | Tab bar starts |
| ------------------- | --------- | ------------ | --------------- | -------------- |
| SE (375 × 667)      | 4.10      | 308–3041     | 390             | 2811           |
| 13 mini (375 × 812) | 4.10      | 169–3495     | 390             | 3127           |
| 15 / 16 (393 × 852) | 3.91      | 179–3509     | 409             | 3157           |
| 16 Pro (402 × 874)  | 3.82      | 181–3520     | 418             | 3177           |
| Pro Max (440 × 956) | 3.49      | 234–3572     | 451             | 3258           |

| Rows              | In front of the art                                                               | Rule                                                |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| 0–450             | Status bar (and above the screen on most phones)                                  | Plain sky (script-extended)                         |
| 450–800           | Titles, header buttons, the stats pill                                            | Calm, low-contrast sky; light L* ≥ 85, dark L* ≤ 25 |
| 800–1824 (row 1)  | Journey: mountain and trail. Field Notes: camp band. Habits: greeting, then cards | Journey is the focal point; Habits stays faint      |
| 1824–2811 (row 2) | Journey: day caption and details. Others: cards and notes                         | Visible on every iPhone                             |
| 2811–3584 (row 3) | Visible on notched iPhones; partly under the tab bar                              | Continuation; the lake can live here                |
| 3584–3840         | Fade to the background, used by vertical parallax                                 | Script-made                                         |

## 6. Intensity, light and dark, formats, memory

- **Intensity:** painted into the pieces (above), plus a code veil of background colour that follows the camera
  continuously: Habits 45% light / 50% dark, Journey 0%, Field Notes 15–20%. With Reduce Transparency or Increase
  Contrast on, it rises to 70% / 40%. Brightness never jumps during a pan. Habit cards are opaque, so they stay
  legible on any art.
- **Light and dark:** separate versions, required, with identical geometry (the light pieces are relights of the
  dark ones).
- **Formats:**
  - From ChatGPT: PNG originals.
  - Shipped: lossy WebP at quality about 80 (opaque, supported by React Native on iOS 14 and later). Progressive
    JPEG at quality 85 only if a sky bands.
  - We add 1–2% grain before encoding to prevent banding.
- **Compressed budget:** Habits ≤ 400 KB, Journey ≤ 900 KB, Field Notes ≤ 600 KB per tile. That's ≤ 1.9 MB per theme
  and ≤ 3.8 MB for both (today's world is 0.97 MB).
- **Decoded memory:** about 24 MB per tile at full size, so about 72 MB for one theme. That's too much to hold
  permanently. Two remedies:
  - Decode Habits and Field Notes at 2/3 scale (their art is soft and the downscale isn't visible): about 42 MB per
    theme in total.
  - Never hold both themes at once: on a theme change, fade through the background colour.
  - Then measure on an iPhone SE with Instruments.
- **Layers:** one flattened image per region for the first version. An optional transparent mist strip could add
  depth during pans later.

## 7. Recommended implementation (not built yet)

1. **One persistent world layer** in `src/app/(tabs)/_layout.tsx`, behind the `Tabs` navigator.
   - The three scenes become transparent, and the tab screens stop drawing their own `WorldBackdrop`.
   - The tiles stay mounted, so switching tabs never reloads or resets the background.
   - Testing builds only; the public release keeps Today as it is.
2. **Camera:** a Reanimated shared value (0 Habits, 1 Journey, 2 Field Notes) animated with `withTiming` over
   420 ms, `Easing.inOut(Easing.cubic)`.
   - The layer's `translateX = −camera × screenWidth` runs on the UI thread with no re-render.
   - The foreground uses the tabs' built-in `animation: 'shift'`.
3. **Vertical position, shared but not forced.** Each tab keeps its own scroll.
   - The world's `translateY` is the camera-weighted blend of each tab's parallax: Habits 0.2 × scroll, Field Notes
     0.2 × scroll, Journey 0, clamped to the fade margin.
   - Nothing scrolls another screen, and pans ease between heights.
4. **Journey:** the mountain doesn't scroll. The trail overlay moves into the world layer and pans with it. Taps hit
   a transparent area over the painting.
5. **Field Notes:** its camps use the Ascent's coordinates today. A lakeside region needs its own camp route later;
   that's a product decision, and nothing changes now.
6. **Safe areas:** the world is edge to edge under the status bar and tab bar; foreground content keeps its insets.
7. **Accessibility:**
   - The world is decorative and hidden from VoiceOver.
   - **Reduce Motion:** a 150 ms crossfade instead of the pan, no parallax, tabs `animation: 'none'`.

## 8. Approval checklist

- [ ] 6 dark pieces (`h1–h3`, `f1–f3`), 1536 × 1024 PNG originals, uploaded with the naming scheme.
- [ ] Each continues its neighbour's edge: horizon, light, palette. Nothing important within 200 px of a join.
- [ ] Habits pale and low-contrast with the mountain faint; Field Notes calm with a lakeside camp or overlook.
- [ ] 6 light relights with identical composition.
- [ ] Our stitched preview (we'll render it with the app's screens on top) reviewed and approved before anything
      ships.
