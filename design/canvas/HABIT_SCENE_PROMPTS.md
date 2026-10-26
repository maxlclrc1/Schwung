# Habit card scenes: ChatGPT prompts (pilots)

Three pilot scenes (Read, Focused work, Walk), each in **dark first, then a light relight** of the same image.

- **ChatGPT size:** 1536 × 1024 (landscape, ChatGPT's own size).
- **Conversion:** Claude crops each to 1536 × 953 (a little off the bottom) and scales it to 1290 × 800 for the card;
  see `SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md`.
- **Composition:**
  - The subject sits in the **upper 40%** of the frame.
  - The **lower 40% stays calm**: it lies under the habit's name, target and swipe track.
  - Nothing important goes in the **bottom 7%**, which gets trimmed.

**Upload as:** `design/artwork-candidates/scene-mind_read-dark-v1.png`, `scene-mind_read-light-v1.png`,
`scene-focus_deepwork-dark-v1.png`, `scene-focus_deepwork-light-v1.png`, `scene-move_walk-dark-v1.png`,
`scene-move_walk-light-v1.png`. Use the original download, not a screenshot. Then tell Claude "scenes uploaded".

## 1. Setup message

Send this once, first. Attach `design/canvas/review/panorama-dark-v2-overview.jpg`,
`design/canvas/review/panorama-light-v2-overview.jpg`, `design/artwork-candidates/a1-dark-v2.png` and
`design/canvas/review/habit-cards-dark-before-after.jpg`.

```
I'm making a set of small scenes for my app, Schwung. Each one is the full background of a habit card: the
habit's name, today's target and a "swipe to complete" bar are written over the lower part of the image.

Attached: our world — one continuous painted landscape (dark and light versions), the mountain painting it's built
around, and a screenshot of the habit cards (the scenes on them now are placeholders cropped from the world).

Every scene must look like it belongs in this same world, painted by the same hand:
- the same quiet, painterly, atmospheric style and fine grain — not photographic, not illustration-cartoon
- dark version: deep indigo twilight, violet-grey mist, a thin warm glow only along the far horizon
- light version (later, as a relight): pale morning mist, soft lavender-grey, airy alpine calm
- calm, confident, premium; restrained colour; soft depth and mist

Composition rules for every scene:
- exactly 1536×1024, landscape
- the subject and focal point sit in the UPPER 40% of the frame
- the LOWER 40% is calm and even in tone (soft mist, meadow, water or shadow) with no bright spots, no busy
  texture and nothing important — text sits there
- keep the subject inside the central 80% of the width; nothing important in the bottom 7%

Never: text, letters, logos, UI, people's faces or close-up figures, animals, loud gradients, neon, lens flare,
emoji-like or cartoon objects, stock-photo looks, or anything that looks like generic AI art.

I'll ask for three scenes, one at a time, dark first. Reply with the image and the prompt you used.
```

## 2. Read (`mind_read`), dark

```
Scene 1: READ. A quiet reading place in the Schwung world at twilight.
An open book resting on a flat, weathered stone at the edge of a high alpine meadow, a small folded wool blanket
beside it, looking out over the misty valley toward distant ridges and the thin warm glow on the horizon. The
book and stone sit in the upper part of the frame, seen from a little below so the view opens behind them; the
pages catch a faint warm light. The lower part of the frame is soft, dark meadow grass melting into mist —
calm and even. No person, no lantern flames, no text on the pages (just soft blank texture).
```

## 3. Focused work (`focus_deepwork`), dark

```
Scene 2: FOCUSED WORK. One steady point of focus in the Schwung world at twilight.
A small, simple timber mountain hut alone on a calm ridge, a single window glowing warm and steady, a thin
straight path of pale stones leading up to it. Around it, the indigo sky, the far ridges and still mist; nothing
else competes for attention — the lit window is the clear focal point, in the upper part of the frame, slightly
off-centre. The lower part of the frame is the dark, smooth slope of the ridge falling into soft mist — calm
and even. No people, no smoke plumes, no signs.
```

## 4. Walk (`move_walk`), dark

```
Scene 3: WALK. A gentle walk through the Schwung world at twilight.
A narrow footpath winding through a quiet alpine meadow and between a few tall pines, curving away toward the
mountain in the distance; the path and the pines lead the eye into the upper part of the frame, where the path
disappears into soft mist below the far ridges and the warm horizon glow. Very small and far away on the path,
a single walker in silhouette (no detail, no face), or no figure at all if it looks better. The lower part of
the frame is the near meadow in deep shadow and low mist — calm and even.
```

## 5. Light versions (one per approved dark scene)

Attach the approved dark scene, then:

```
Relight this exact image as the light version: the same composition, everything in the same place, the same
style and grain. Pale morning in the Schwung world: soft lavender-grey mist, airy alpine calm, a pale warm glow
along the horizon, light falling gently. Keep the lower 40% calm and even, now light in tone (text in dark ink
will sit there). Exactly 1536×1024. Reply with the image.
```

## Review checklist

- [ ] Looks painted by the same hand as the world: palette, mist and grain.
- [ ] Subject in the upper 40%, lower 40% calm, nothing in the bottom 7%.
- [ ] No text, faces, logos or cartoon objects.
- [ ] The light version has the same composition as the dark one (no shifted objects).
