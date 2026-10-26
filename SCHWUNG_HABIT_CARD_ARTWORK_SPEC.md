# Habit card scenes — artwork specification

**Status (Step 3A, revised):** each habit on the Habits tab is a large image card, built in
`src/components/HabitCard.tsx` (testing builds only; the public release keeps `HabitRow`).

- The whole card is the habit's scene, with the title, target and a swipe track written over it.
- Scenes are looked up by stable habit id in `src/components/habitArt.ts`.
- No final scene ships yet. Until one does, each card shows a crop of the world panorama, the same crop for a habit
  every time. These crops are temporary: they're landscape, not pictures of the habit.

## The card the scene fills

| iPhone width            | Card (pt)         | At 3× (px)  | Aspect    |
| ----------------------- | ----------------- | ----------- | --------- |
| 375 (SE, mini)          | 343 × 213         | 1029 × 639  | 1.61      |
| 390–393                 | 358–361 × 222–224 | ~1083 × 672 | 1.61      |
| 402 (16 Pro)            | 370 × 229         | 1110 × 687  | 1.61      |
| 430–440 (Plus, Pro Max) | 398–408 × 240     | ~1224 × 720 | 1.66–1.70 |

- Corner radius is 26pt, with 16pt between cards.
- The card grows taller with larger text. The scene then crops more from the sides.

## The image

- **Size:** **1290 × 800 px** (about 1.61 : 1). That covers the largest card at 3× with a margin.
- **Crop:** the image fills the card from the centre (`cover`).
  - On the widest phones about 40 px comes off the top and bottom in total.
  - On cards made taller by larger text, the left and right edges are cropped.
- **Opaque scene,** painted in the Schwung world's language (the panorama's mist, light and palette).
  - **Light:** pale mist and soft lavender-grey.
  - **Dark:** deep indigo twilight.
- **Two versions per habit, light and dark,** with the same composition (dark is a relight of light, like the
  world).
- **No text, logos or UI** in the image, and no close-up faces. Avoid loud gradients, cartoon or emoji-like
  objects, and stock-photo looks.

### Safe areas (rows of the 1290 × 800 image)

```
 0 ┌──────────────────────────────────────────────┐
   │  THE WINDOW (rows 0–330): the subject and     │  ← the only part seen clearly
   │  focal point of the scene                     │
330├──────────────────────────────────────────────┤
   │  rows 330–480: the veil begins; secondary     │
480├──────────────────────────────────────────────┤
   │  rows 480–800: under the title, target and    │  ← calm, low detail, even tone:
   │  swipe track (a veil darkens it in dark mode, │    no bright spots, no busy texture
   │  lightens it in light mode)                   │
800└──────────────────────────────────────────────┘
   keep the subject inside the central 80% of the width (x 130–1160)
```

## Files

|                          | Path                                               |
| ------------------------ | -------------------------------------------------- |
| Upload each master (PNG) | `design/artwork-candidates/scene-<habit id>-<light | dark>-v1.png`                          |
| Claude ships it as       | `assets/habits/<habit id>-<light                   | dark>.webp` (WebP q≈80, ≤ 150 KB each) |
| …and switches it on in   | `src/components/habitArt.ts` (one line per habit)  |

Memory: about 4 MB decoded per visible card, and only the current theme's scenes are loaded.

## Habit ids ready for a scene

Any habit id can take a scene; it's matched by id, never by display name, and custom habits always show a world
crop. The pilots come first:

| Pilot | Id               | Title                        |
| ----- | ---------------- | ---------------------------- |
| 1     | `mind_read`      | Read                         |
| 2     | `focus_deepwork` | Focused work (V1: Deep work) |
| 3     | `move_walk`      | Walk (V1: Daily walk)        |

The other habits the testing builds can offer (V2 release gate), in rough order of how often plans include them:

- Sleep: `discipline_bed`, `sleep_bedtime`, `sleep_no_phone_bed`, `sleep_wake`, `sleep_morning_light`
- Screens: `screen_morning`, `screen_social`, `screen_app_limit`
- Food: `food_produce`, `food_unsweetened`, `food_water_meals`
- Mind: `mind_journal`, `mind_breathe`
- Focus: `focus_top3`
- Social: `social_reach_out`, `confidence_compliment`, `confidence_talk`

V1 plans also use `screen_limit`, `move_workout`, `move_steps`, `water`, `mind_meditate` and `discipline_cold`.
