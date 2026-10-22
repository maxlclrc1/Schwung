# One Continuous Ascent: canvas specification

One tall landscape behind the app. The interface floats over different parts of it: the summit and sky at
the top, lower slopes and mist as you scroll, a calm mist valley behind the habits, and finally the plain app
background, with no seams anywhere. The same canvas stays behind the onboarding screens and Today, and
navigating moves a "camera" over it instead of loading a new background.

Measured facts are marked **[measured]**. Everything else is the proposal.

---

## 1. The canvas

| | Value |
|---|---|
| Size | **1536 × 5120 px** (width = full screen width; height scales with it) |
| Themes | One dark and one light canvas: same composition, relit (the app crossfades between them) |
| Layout | The approved painting sits **unchanged at rows 800–1824**, so the trail stays exactly aligned |
| Shipped as | Rows 0–2560 at full resolution (sharp). Rows 2560–5120 at half resolution (768 × 1280), since it's only soft mist, which keeps memory reasonable. JPEG quality ~80 |
| Size budget | About 300 KB + 80 KB per theme |

### Zones (rows of the 1536-wide canvas)

| Zone | Rows | Content | Rules |
|---|---|---|---|
| **Z0 Sky** | 0–800 | Open sky, deepening upward | Calm: the greeting and "Phase n of 3 / Day n" float over it. **Exists.** |
| **Z1 Summit + trail** | 800–1824 | The approved painting | **Locked.** The trail is drawn on it; nothing here changes. **Exists.** |
| **Z2 Lower slopes** | 1824–2600 | The same mountain's base: slopes and a few rocks, getting hazier and softer going down | Behind the "days climbed" row and the mission card. Lower contrast than Z1. |
| **Z3 Mist valley** | 2600–4000 | Soft rolling mist, at most faint distant ridges | **Very calm:** the habit cards and the gaps between them sit here. Dark: tones around #1C1A2A–#26243A; light: #E6E4EF–#EEEDF5. Keep brightness variation small; no sharp details, bright spots or violet. |
| **Z4 Blend** | 4000–4800 | The mist thins into the app background | Smooth, no banding (fine grain). |
| **Z5 App background** | 4800–5120 | Exactly #111116 (dark) / #F7F6FB (light) | Pages longer than the canvas continue in this flat color, so there's never an edge. |

Rows 0–~2100 exist today (`assets/world-*.jpg`). **What's missing is Z2–Z3, painted as one new tile (section 4).**

---

## 2. How Today moves over it

- **Parallax 0.4:** the canvas moves at 40% of the page's scroll speed, so scrolling slowly reveals the
  slopes and then the mist under the cards. (0 would be fully still, as now; 0.3–0.5 is the comfortable range.)
- **The trail, markers, landmarks and orb move with the canvas.** They're part of the landscape, so they stay
  aligned with the painting. The words (greeting, Phase/Day, phase names, cards) scroll at full speed, as they
  do now, so text never collides.
- **Taps on the trail** are corrected by the scroll distance × (1 − 0.4) to find the day under the finger.
- **The sky behind the status bar** moves with the canvas.
- **[measured]** Today's page is 1,411–1,690 pt tall (5 to 8 habits) and scrolls 480–1,000 pt on iPhone sizes
  375×667 to 440×956. At parallax 0.4 the deepest view reaches about row 4,850–5,080 with 8 habits, so the
  canvas covers every case and longer pages simply continue in the flat background.
- Where things land on a 393×852 iPhone, 6 habits (see `canvas-guide-*.png`):
  - At the top of the page you see rows ~300–3,650: sky, summit, trail, and slopes into mist behind the mission card.
  - Fully scrolled you see rows ~1,750–5,080: slopes at the top, the mist valley behind the habit cards, then the blend.
- **Reduce Motion:** the parallax is a scroll-linked position, not an animation, so it stays. It moves only when
  the finger does.

## 3. Between screens: one canvas, a moving camera

The canvas is mounted **once**, behind the whole app, instead of once per screen. Each screen sets a
**camera stop**: which canvas row sits at the top of the screen, plus an optional veil for text-heavy screens.
When you navigate, the content transitions as now while the camera glides between stops (about 600 ms,
ease-in-out). With Reduce Motion on it jumps instead. Theme crossfades work as now.

| Screen | Camera (canvas row at screen top, at 393 pt wide) | Veil | Idea |
|---|---|---|---|
| Welcome | ~330 (the full mountain) | none | The goal, in full view |
| Quiz Q1 → Q6 | 2,400 → 1,900, rising a little with each question | 0.35 | You start in the mist; each answer climbs |
| Starting point | 1,500 (the trail rising into view) | 0.45 | Where you are on the mountain |
| Plan | 1,500 | 0.55 | Long text, so a stronger veil |
| Reminder | 1,200 | 0.40 | Almost there |
| Day 1 ceremony | its own dark screen (unchanged) | | |
| Today | ~330 at the top, then the parallax | none | The full view, from Day 1 on |

**Not on the canvas:** Journey, Settings, habit detail, swap and add keep their own backgrounds (they're sheets
over Today). Ceremonies stay their own dark moments.

The values are starting points to tune on a real iPhone. The mist valley (Z3) is what makes the lower stops
work: it's calm enough to put text over with only a light veil.

---

## 4. What ChatGPT paints: tile L1 (lower slopes + mist valley)

- **Size:** 1024 × 1536 portrait. It's placed at canvas rows 1900–4204 (scaled to 1536 wide). Its top blends under
  the fog that already ends the painting, and its bottom fades into the app background in code. So it doesn't
  need a pixel-perfect join, only matching tones.
- **Template:** `tile-L1-guide-dark.png` / `tile-L1-guide-light.png` show the existing art it continues from, and the three bands.
- **Bands:**
  - top 25%: lower slopes of the same mountain, partly veiled by fog
  - middle: mist valley, very calm
  - bottom 30%: fog thinning toward the background color
- **Never:** a trail, path, text, people, logos, violet glow, gold, sharp foreground detail, saturated color, or lens effects.
- **Light version:** a relight of the approved dark tile (same composition), in soft morning haze.

### Paste-ready message for ChatGPT
```
We're extending the Schwung mountain into one continuous tall canvas: the app scrolls slowly down through it.
I've attached tile-L1-guide-dark.png. The strip at the very top is our existing art (the base of the mountain
going into fog). Please paint the NEXT piece below it:

- 1024×1536 portrait, dark theme, same world, light and palette as our approved mountain.
- Top 25%: the lower slopes of the SAME mountain continuing down, softer and hazier, partly veiled by fog,
  matching the tones of the strip.
- Middle: a mist valley. Soft rolling fog, at most faint distant ridgelines. VERY calm and low contrast:
  app cards and text will sit on top of this. Tones around #1C1A2A to #26243A.
- Bottom 30%: the fog thinning toward a flat near-black #111116.
- No trail, path, text, people, logos, violet glow, gold, sharp foreground details or lens effects. Fine grain.
Give me the prompt you used too. After I approve it, we'll make the light version as a relight.
```

---

## 5. Implementation plan (Claude, after the tile is approved)

1. **Assemble** the canvas with `extend_tall.py` (extended): existing rows 0–1824, the tile under a fog
   crossfade, and the blend to the exact background. Check: no seams, the painting rows untouched, the bottom
   exactly the background color.
2. **One root canvas** in `src/app/_layout.tsx` behind the navigation stack. Canvas screens get a transparent
   background; the sheets keep theirs. A small shared "camera" (a Reanimated value) that each screen sets when
   it comes into focus.
3. **Today:** a UI-thread scroll handler drives the parallax. The trail scene and the canvas share one
   transform; the words scroll as now; tap correction uses × (1 − parallax).
4. **Onboarding:** each screen sets its camera stop and veil, replacing today's per-screen dimmed backgrounds.
5. **Tests:** placement and tap math with parallax (unit), plus browser runs at several iPhone sizes in both
   themes: alignment while scrolling, taps, no seams, and screen-to-screen camera moves.
6. **Then on iPhone:** feel of the parallax and the camera glide, and memory/smoothness on an older device.

Files likely to change:
- `src/components/World.tsx`
- `src/core/world.ts` (+ tests)
- `src/app/_layout.tsx`
- `src/app/today.tsx`
- `src/app/{welcome,quiz,start,reveal,reminder}.tsx`
- `assets/world-*`
- `design/artwork-guides/tools/extend_tall.py`
