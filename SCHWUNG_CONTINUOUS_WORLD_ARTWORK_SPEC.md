# Schwung — continuous world: artwork specification

**Status:** specification only. Nothing in this document is built yet. The artwork is produced outside the codebase,
approved, and only then integrated.

**Grounded in:**

- the current world: `assets/world-{light,dark}.jpg`, 1536 × 3584 progressive JPEG, about 0.5 MB each;
- how the Ascent is placed (`src/core/world.ts`, `src/core/ascent.ts`);
- the three-tab layout (`src/app/(tabs)/`, JS bottom tabs from `expo-router/js-tabs`, Expo SDK 58);
- the app's settings: iPhone only, portrait (`supportsTablet: false`).

## 1. Layout diagram

The panorama is three regions side by side, read left to right in tab order. Each region is exactly one screen
wide on every iPhone, and the whole panorama scales to the screen's width.

```
x (px) 0                        1344                        2688                        4032
       ┌──────────────────────────┬──────────────────────────┬──────────────────────────┐ y (px)
       │ status bar · quiet sky   │ status bar · quiet sky   │ status bar · quiet sky   │    0
       │                          │                          │                          │  200
       │ HEADER BAND: greeting,   │ HEADER BAND: title,      │ HEADER BAND: kicker,     │
       │ day line (quiet, pale)   │ stats pill (quiet sky)   │ question (quiet)         │
       │   distant peak, faint    │          ★ summit        │   distant peak (Journey  │  600
       │ ·······················  │  ┌────────────────────┐  │   mountain, seen across  │
       │ HABITS — PEACEFUL VALLEY │  │ JOURNEY — ASCENT   │  │   the lake)              │
       │ soft meadow, mist        │  │ painting 1344×896  │  │ FIELD NOTES — DISCOVERY  │
       │ (behind the habit cards: │  │ (3:2): mountain,   │  │ lakeside camp / overlook │
       │  low contrast, low       │  │ switchback trail   │  │ "camp band" 1344×896     │
       │  detail)                 │  │ (waypoints §6)     │  │ (3:2) at y 600–1496      │
       │                          │  └────────────────────┘  │                          │ 1496
       │ mist, meadow, stream ────┼── valley · LAKE ─────────┼── lakeshore, reflections │
       │                          │ (always visible: caption │                          │
       │                          │  and day details)        │                          │ 2190  ← lowest row visible
       │ lower valley             │ lower valley, shore      │ shore, reeds, path       │        on iPhone SE above the tab bar
       │ (seen on taller phones)  │                          │                          │ 2920  ← lowest row visible on
       │ travel margin            │ travel margin            │ travel margin            │        notched iPhones at rest
       └──────────────────────────┴──────────────────────────┴──────────────────────────┘ 3200
       │◄── edge band ──►│ 96 px either side of each inner border: no focal subjects │
```

## 2. Panorama and region dimensions

|                               | Pixels                   | Aspect             | Notes                                                                                                       |
| ----------------------------- | ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Whole panorama (master)**   | **4032 × 3200**          | 1.26 : 1           | One continuous painting; both inner borders are seamless.                                                   |
| Each region                   | **1344 × 3200**          | 0.42 : 1 (21 : 50) | 1344 = 448pt at 3× (covers the widest iPhone, 440pt). Multiple of 16, so it aligns with compression blocks. |
| Journey painting (trail area) | 1344 × 896 at y 600–1496 | 3 : 2              | Same 3:2 shape as today's Ascent, so the trail coordinates carry over.                                      |
| Field Notes camp band         | 1344 × 896 at y 600–1496 | 3 : 2              | Reserved for a future five-camp route; Field Notes doesn't change now.                                      |

**Why width-fit:** the world scales so that one region equals the screen width, the way the current world already
works.

- Every iPhone shows each region's full width.
- A tab change pans exactly one screen.
- The Journey trail stays registered to the painting on every phone.
- Only the visible height differs by phone (table below).

| iPhone (pt)                        | Scale (px per pt) | Rows visible at rest | Status bar | Tab bar covers |
| ---------------------------------- | ----------------- | -------------------- | ---------- | -------------- |
| SE (375 × 667)                     | 3.58              | 0–2391               | 0–72       | 2190–2391      |
| 13 mini (375 × 812)                | 3.58              | 0–2910               | 0–194      | 2587–2910      |
| 15 / 16 / 16e (390–393 × 844–852)  | 3.42–3.45         | 0–2914               | 0–186      | 2604–2914      |
| 16 Pro (402 × 874)                 | 3.34              | 0–2922               | 0–181      | 2621–2922      |
| Plus / Pro Max (430–440 × 932–956) | 3.06–3.13         | 0–2920               | 0–169      | 2639–2920      |

## 3. Safe areas inside every region

| Band (y px) | What's in front                                                                           | Artwork rule                                                               |
| ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0–200       | Status bar (clock, battery)                                                               | Plain sky. No detail, no bright spots.                                     |
| 200–600     | Screen titles, header buttons, Journey stats pill, Habits greeting and day line           | Calm and low-contrast. Light: background lightness L* ≥ 85. Dark: L* ≤ 25. |
| 600–1496    | Journey: the mountain and trail. Field Notes: camp band. Habits: top of the cards.        | Journey's focal subject. Habits stays soft.                                |
| 1496–2190   | Journey: day caption and details. Habits and Field Notes: cards. Visible on every iPhone. | Journey: valley and lake. Elsewhere: soft.                                 |
| 2190–2920   | Visible on notched iPhones. The tab bar covers 2587–2920 on most.                         | Continuation only; nothing important.                                      |
| 2920–3200   | Never visible at rest; only during vertical parallax and overscroll.                      | Simple continuation (no edges or blank).                                   |

- **Horizontal:** keep 48 px (about 16pt) on the outer left and right edges of the panorama free of focal subjects.
- **Inner borders** (x 1248–1440 and x 2592–2784): this edge band is the screen edge at rest. Paint continuously
  across it, with nothing that looks cut off.
- **Habit cards** cover x 16pt to (width − 16pt) from about y 450 px down and are opaque, so the art shows only in
  the gutters and the 8pt gaps between cards. Don't spend detail there.

## 4. Intensity by region

**Paint the intensity into the artwork, and add one light code veil.** The painted gradient guarantees continuity.
The veil keeps text readable and can be tuned without repainting.

| Region      | In the artwork                                                                                                                         | Code veil (background colour over the world) |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Habits      | Pale, misty, low contrast (luminance range within about 25 L*), saturation about 60% of Journey's; the mountain only distant and faint | Light 45%, dark 50%                          |
| Journey     | Full contrast, depth and light; the richest detail                                                                                     | 0%                                           |
| Field Notes | Atmospheric and reflective; contrast about 75% of Journey's                                                                            | 15–20%                                       |

- The veil's opacity follows the camera position continuously (for example `interpolate(camera, [0, 1, 2],
[0.45, 0, 0.18])`). Brightness changes smoothly during a pan, never in a jump, provided the artwork's own grading
  also eases across the edge bands.
- **Legibility:** habit cards are opaque (`#FFFFFF` / `#1C1B25`), so they're legible on any art. Text directly on
  the world (greetings, section labels, the stats pill) relies on the veil plus the header-band lightness rule. Aim
  for at least 4.5 : 1 contrast. With iOS "Reduce Transparency" or "Increase Contrast" on, the veil rises (Habits
  70%, Field Notes 40%).

## 5. Files, formats and budgets

**Deliverables from the artist:** two master files, light and dark, in the existing candidates folder and naming
scheme.

| File                                                              | Contents                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `design/artwork-candidates/world-pano-light-v1.png`               | 4032 × 3200, 16-bit PNG (or layered PSD/TIFF alongside), sRGB                               |
| `design/artwork-candidates/world-pano-dark-v1.png`                | Same geometry: identical ridgelines, trail, lake and camp, so day and night line up exactly |
| _(optional)_ `design/artwork-candidates/world-pano-guides-v1.png` | Transparent overlay marking the summit, the trail and the five camp spots                   |

**Shipped files (we generate them by slicing and encoding; no repainting):**

```
assets/world/
  pano-light-habits.webp      1360 × 3200   (region + 16 px bleed on the right)
  pano-light-journey.webp     1376 × 3200   (16 px bleed on both sides)
  pano-light-fieldnotes.webp  1360 × 3200   (16 px bleed on the left)
  pano-dark-habits.webp       …same three in dark
  pano-dark-journey.webp
  pano-dark-fieldnotes.webp
```

- **Format:** ship **WebP**, lossy at quality about 80. It's opaque, about 30% smaller than JPEG, and supported by
  React Native's image loader on iOS 14 and later. Fall back to progressive JPEG (quality 85) only if a sky bands
  visibly. Never ship PNG for these: the files would be several MB with no visible gain.
- **Anti-banding:** add 1–2% fine grain in the master. Large soft skies and mist band after compression without it.
- **One image or tiles:** **three tiles per theme.** The active region can load first, tiles can be replaced
  independently, and the app avoids one 52 MB decode for a 4032-wide image. The 16 px bleed lets tiles overlap by a
  few pixels in code, so no hairline seam appears at fractional positions.
- **Light and dark:** **yes, two versions**, as today. A single asset can't be both pale-misty for light mode and
  dusk for dark mode and stay legible behind text.

**Budgets:**

|                | Per tile (compressed)  | Per theme                                                                                | Both themes                                      |
| -------------- | ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Habits         | ≤ 350 KB               |                                                                                          |                                                  |
| Journey        | ≤ 800 KB               |                                                                                          |                                                  |
| Field Notes    | ≤ 500 KB               | ≤ 1.65 MB                                                                                | **≤ 3.3 MB** in the app (today's world: 0.97 MB) |
| Decoded (RGBA) | about 17.6 MB per tile | **about 53 MB** with all three tiles of one theme held (today: about 44 MB, both themes) | Never hold both themes at once (see §7)          |

## 6. Journey trail registration

The trail overlay (day markers, landmarks, today's orb) is drawn in code from fixed waypoints. A new Journey
painting must either keep the trail on these points or supply a replacement set.

Panorama coordinates in px, valley floor to summit:

`1438,1406 · 1801,1424 · 2177,1380 · 2446,1299 · 2150,1227 · 1747,1191 · 1559,1111 · 1801,1030 · 2177,1003 ·
2419,932 · 2177,860 · 2016,797 · 2150,734 · 2285,694` (summit).

- These are today's `WAYPOINTS` mapped into the Journey painting (x 1344–2688, y 600–1496). The existing guide
  `design/artwork-guides/ascent-guide-1500x1000.png` shows the same route.
- Landmarks sit on days 7 (first week, footsteps), 21 (base camp, bonfire), 44 (high camp, flag) and 66 (summit, star).
- Keep the trail's line a little lighter than its surroundings, with no busy texture under it, so the markers read.

## 7. Recommended implementation (not built yet)

1. **One persistent world layer.** A `WorldLayer` rendered once in `src/app/(tabs)/_layout.tsx`, behind the `Tabs`
   navigator.
   - The three scenes become transparent (`sceneStyle: { backgroundColor: 'transparent' }`), and the tab screens
     stop drawing their own `WorldBackdrop`.
   - The tiles stay mounted, so switching tabs never reloads or resets the background.
   - Testing builds only; the public release keeps today's Today screen as it is.
2. **Camera.** A Reanimated shared value `camera` (0 = Habits, 1 = Journey, 2 = Field Notes) set from the focused
   tab and animated with `withTiming(index, { duration: 420, easing: Easing.inOut(Easing.cubic) })`.
   - The layer's `translateX = −camera × screenWidth` runs on the UI thread with no React re-render.
   - The foreground uses the tabs' built-in `animation: 'shift'`, so content slides the same way as the world.
3. **Vertical position, shared but not forced.** Each tab keeps its own scroll.
   - Each tab's scroll handler writes its offset to a per-tab shared value.
   - The world's `translateY` is the camera-weighted blend of each tab's parallax offset: Habits 0.2 × scroll,
     Field Notes 0.2 × scroll, Journey 0, clamped to the 280 px travel margin.
   - No screen scrolls another, and a pan eases from one tab's height to the other's without a jump.
4. **Journey stays registered.** The mountain doesn't scroll on Journey (Part A made the page short).
   - The trail overlay moves into the world layer with the Journey tile, so it pans with the mountain.
   - The page keeps a transparent hit area over the painting for day taps.
   - The day details are the only part that scrolls.
5. **Field Notes:** its five camps are drawn today on the Ascent's coordinates. When the lakeside region exists, the
   camps need their own route in the camp band. That's a later product decision; nothing changes now.
6. **Safe areas:** the world is edge to edge, under the status bar and tab bar. Foreground content keeps using the
   insets. The world's top always aligns with the screen top.
7. **Memory and loading:**
   - Bundle the tiles; resolve and prefetch the current theme's three tiles at startup and keep them mounted.
   - On a theme change, fade the world to the background colour, swap the tiles, then fade back, rather than
     holding both themes (today's world crossfades both).
   - Check decoded memory with Xcode Instruments on an iPhone SE. If it's too high, generate @2× variants at build
     time, which React Native picks per device.
8. **Accessibility:**
   - The world is decorative (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`).
   - **Reduce Motion:** no pan (a 150 ms crossfade instead), no vertical parallax, and tabs `animation: 'none'`.
   - **Reduce Transparency / Increase Contrast:** a stronger veil (§4).
9. **Layered assets:** not needed for the first version; a single flattened layer per region keeps seams and memory
   simple. Optional later: one transparent mist strip (4032 × 900, WebP with alpha) that moves at 1.1× the camera
   for depth during pans (off with Reduce Motion), about 14.5 MB decoded at full size, or 6.5 MB if generated at 2×.

## 8. Approval checklist for the artwork

- [ ] 4032 × 3200, light and dark, identical geometry, sRGB, 16-bit master with light grain.
- [ ] Seamless at x 1344 and x 2688, with no focal subjects in the 96 px edge bands.
- [ ] Bands follow §3: quiet sky to y 600, header band calm, nothing important below y 2920.
- [ ] Journey: summit and trail on the §6 waypoints (or a replacement set supplied); lake and valley in y 1496–2190.
- [ ] Habits: pale, low-contrast, mountain distant; Field Notes: lakeside camp or overlook in the camp band.
- [ ] Intensity eases across the borders (no brightness step), dark version stays dark behind header text.
