# Habit card artwork — specification

**Status (Step 3A):** the card is built: `src/components/HabitCard.tsx` (testing builds; the public release keeps
`HabitRow`), with the image wired through `src/components/habitArt.ts`. No illustration ships yet: until one exists,
a card shows its habit's own icon on the right instead.

## The three pilot illustrations

| Habit        | Stable id (V1 and V2) | Upload the master to                                    | Ships as                            |
| ------------ | --------------------- | ------------------------------------------------------- | ----------------------------------- |
| Read         | `mind_read`           | `design/artwork-candidates/habit-mind_read-v1.png`      | `assets/habits/mind_read.webp`      |
| Focused work | `focus_deepwork`      | `design/artwork-candidates/habit-focus_deepwork-v1.png` | `assets/habits/focus_deepwork.webp` |
| Walk         | `move_walk`           | `design/artwork-candidates/habit-move_walk-v1.png`      | `assets/habits/move_walk.webp`      |

Masters: 384 × 384 px PNG with transparency. Claude converts each to WebP and adds its line to `habitArt.ts`; the
id (never the display name) picks the image, so a renamed or swapped habit can't show the wrong one, and custom
habits never get one.

**As built:** the illustration fills a 104 × 104pt square flush with the card's right, top and bottom edges,
clipped by the card's 22pt corners, centred with `cover`: when larger text makes the card taller, the square grows
in height and its sides are cropped. No fade is drawn at its left edge (transparent art needs none). On a done
card it shows at 50 % opacity over the card's opaque violet tint, so test it on `#FFFFFF`, `#1C1B25`, and those two
tinted 12 % toward the accent (`#EEEAF8` light, `#2D283F` dark).

---

Re-checked after Step 2A: the card itself is unchanged, so every dimension below still holds. The only change is what
surrounds the cards: the Habits tab no longer has the mountain, so cards sit on the plain app background.

Measured from the current habit card (`src/components/HabitRow.tsx`) and the Habits tab (`src/app/(tabs)/today.tsx`).
No artwork is implemented yet.

## Current card

- Width: screen minus 16pt each side → **343pt** at 375pt, **358pt** at 390pt. Corner radius 22pt, 8pt between cards.
- Today: min height 76pt, 16pt padding, a 30pt round check control at the leading edge, the title and target in the
  middle, and an 18pt level badge at the trailing edge.
- Card surface is `#FFFFFF` in light mode and `#1C1B25` in dark. When checked, it fades to a violet tint and the text
  fades to 55%. Since Step 2A the Habits tab has no painting behind the list: between cards is the plain background,
  `#F7F6FB` in light mode and `#111116` in dark.

## Recommended layout

```
┌────────────────────────────────────────────────┬──────────────┐
│ (✓)  Walk                                       │              │
│ 30pt 5 min walk at a comfortable pace           │  artwork     │
│      ▪▪▫ level                                  │  104 × 104pt │
└────────────────────────────────────────────────┴──────────────┘
```

- The artwork sits at the **trailing edge**, full card height, bleeding to the top, right and bottom edges and
  clipped by the 22pt corner radius. A short fade (about 16pt) blends its left edge into the card surface.
- The check control stays at the leading edge: same position and size, and still the tap target. The title and target
  stay in the middle column. The level badge moves under the target text so it doesn't sit on the artwork.
- Text column width: about **165pt** at 375pt and **180pt** at 390pt. That's enough for two-line titles.

| Screen width            | Card  | Artwork area | Card height |
| ----------------------- | ----- | ------------ | ----------- |
| 375pt (iPhone SE, mini) | 343pt | 104 × 104pt  | **104pt**   |
| 390pt (iPhone 12–16)    | 358pt | 104 × 104pt  | **104pt**   |

With larger Dynamic Type the card grows taller; the artwork area grows with it and crops the sides.

## Image files

- **Pixel size:** **384 × 384 px** (1:1). The display needs 312 px at 3×; the extra covers taller cards at larger
  text sizes.
- **Crop:** fills the area and is centred. On taller cards the left and right edges are cropped. Keep the subject
  inside the **central 70 %** (about 270 × 270 px), with nothing important in the outer 15 % on any side.
- **Background:** **transparent** (alpha), with soft edges. No baked-in white or coloured backgrounds, frames,
  rounded corners or drop shadows; the card supplies those.
- **Light and dark:** **one asset can serve both** if it is transparent and painted in mid tones. Avoid pure white
  highlights and near-black outlines, and check the artwork on `#FFFFFF` and on `#1C1B25`. Opaque full scenes would
  need a separate light and dark version of each image.
- **Checked state:** on a done card the artwork shows at 50 % opacity, so it should still read at that strength.
- **Formats:** supply **PNG-24 with alpha** masters. They'll ship as **WebP with alpha**: smaller, and supported by
  React Native on iOS.
- **File size:** at most **60 KB** per image as shipped (WebP), with a hard cap of 100 KB. Masters can be any size.
  About 40 habit images comes to roughly 2–3 MB.
- **Naming:** one file per habit, named by habit id (for example `move_walk.png`). Habits that share artwork can
  point to one file.
