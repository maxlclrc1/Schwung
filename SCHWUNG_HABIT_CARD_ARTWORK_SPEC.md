# Habit card scenes — artwork specification

**Status (Step 3A, revised):** each habit on the Habits tab is a large image card, built in
`src/components/HabitCard.tsx` (testing builds only; the public release keeps `HabitRow`).

- The whole card is the habit's scene, with the title, target and a status row written over it.
  The whole card is swiped to the right to complete the habit.
- Scenes are looked up by stable habit id in `src/components/habitArt.ts`.
- **Shipped:** the three pilots, `mind_read` (Read), `focus_deepwork` (Focused work) and `move_walk` (Walk), each
  in light and dark.
- **Every other habit** shows a crop of the world panorama until its scene exists, the same crop for a
  habit every time.

## The card the scene fills

| iPhone width   | Card (pt)     | At 3× (px)  | Aspect    |
| -------------- | ------------- | ----------- | --------- |
| 375 (SE, mini) | 343 × 240     | 1029 × 720  | 1.43      |
| 390–393        | 358–361 × 250 | ~1083 × 750 | 1.44      |
| 402–440        | 370–408 × 250 | ~1224 × 750 | 1.48–1.63 |

- Corner radius is 26pt, with 16pt between cards.
- The level label sits in the top-left corner. The title, target and status row (the swipe hint
  and check button, or Done and Undo) sit in the lower ~55%. A check badge appears top-right when done.
- The card grows taller with larger text.

## The image

- **Size:** **1290 × 800 px** (1.61 : 1). ChatGPT's 1536 × 1024 is trimmed from the bottom to 1536 × 953 and scaled.
- **Crop:** the image fills the card from the centre (`cover`). Cards are narrower than the image (1.43–1.63 : 1), so
  up to about 6% of the width comes off each side; more on cards made taller by larger text.
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
   │  rows 0–60: sky behind the level label        │
   │  THE WINDOW (rows 60–360): the subject and    │  ← seen clearly (the pilots: the book, the hut, the path)
   │  focal point                                  │
360├──────────────────────────────────────────────┤
   │  rows 360–800: under the title, target and    │  ← calm, low detail, even tone:
   │  status row (a veil darkens it in dark mode,  │    no bright spots, no busy texture
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
