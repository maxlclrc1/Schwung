# Schwung V2 — Development-Only Integration

**Status:** V2 is connected to onboarding, Today, habit detail and swaps **behind a development flag that is
off by default and can't be on in a release build**. V1 is unchanged and stays the default. Not for public
release.

## Feature flag
- `v2PreviewEnabled()` in `src/lib/flags.ts` is `__DEV__ && (developer switch || EXPO_PUBLIC_SCHWUNG_V2_PREVIEW=1)`.
  In a release build it is always false.
- **Turning it on:** run the bundler with `EXPO_PUBLIC_SCHWUNG_V2_PREVIEW=1 npx expo start`, or tap the
  "Developer · Habit Science V2 preview" line on Welcome. That line is shown in development builds only. You
  can also use Settings → Developer → "V2 preview".
- **What the flag decides:** only which onboarding a *new* program uses. A running program always keeps its own
  `programVersion`. Turning the flag on never converts a V1 plan, and turning it off never changes a V2 plan.
  Restart (Settings) is the only way to start over, as before.

## Release gate
- `src/core/v2/gate.ts` lists the 12 habits cleared for development testing. Every plan, choice-step option
  and swap goes through `src/core/v2/program.ts`, which always applies the gate.
- A test checks that no screen or store file calls the engine directly.
- Pending-review and held habits are never shown and never substituted in to fill a plan.
- When the gate removes something the person would otherwise get, the plan screen names it in a
  development-only note: "Development preview: Walk would suit your answers, but it is still waiting for
  scientific review…".
- If reviewed habits can't reach the minimum of 3, the plan can't be started and the screen says so. No
  current answer combination hits this, but it's handled and tested.

## Saved data
- Storage version 2 adds three fields:
  - `programVersion` (1 or 2)
  - `profile` (the V2 answers)
  - per-habit `spec`: title, icon, why, and the personal Easy/Medium/Hard targets, frozen when the habit joins
    the plan
- Version-1 saves load as V1 programs with all progress intact.
- Damaged saves fall back safely:
  - an unknown version → V1
  - an invalid profile → null
  - a V2 habit missing its spec → rebuilt from the profile
- The 66-day mechanics are untouched (80% rule, XP, streaks, early level-up, step-down, day 22/45). They
  operate on `level` as before; the text for each level comes from `spec.targets` when present.

## Onboarding paths you can test (flag on)
1. Welcome → `/v2/quiz`. Questions in order:
   - age, goal, sleep hours, sleep trouble, active days, fruit and veg
   - sugary drinks: adults only, and not if food questions were skipped
   - phone time
   - what takes the time: only at 2–4 h or more, or Not sure
   - routines (multi-select)
   - precautions (multi-select; "Skip" saves as unknown)
2. **Under 16** → stop screen; nothing is saved; "I chose the wrong age" goes back.
3. **W1 (wake time)** at `/v2/time`, only when a wake-anchored habit is in the plan or among the choices. The
   options are a time, "It changes a lot", or shifts. **W2 (bedtime)** is never reached in the preview,
   because Earlier bedtime is pending review. Unit tests cover it with the full candidate pool.
4. `/v2/plan` shows:
   - picks with personal Easy targets, reasons and notes
   - the development limitation, if any
   - plan notes
   - the choice step: **mandatory** "Choose N more" when under 3; **optional** "Choose one more?" or "Keep N
     habits" at 3–4
   - "How it grows" from the person's own Easy/Medium/Hard
5. → reminder → Day 1 ceremony ("Built for {goal}") → Today with the personal targets. On Today, Habit detail
   shows the personal Lv 1–3, and Swap offers gated, age- and precaution-aware options that start at Easy.
6. "Pick up where you left off" on Welcome resumes an unfinished V2 draft.

## Known limits of the preview
- On iPhone, the sleep hours and sleep trouble questions are separate steps rather than one screen.
- Plans for some goals are thin, because their core habits are pending review:
  - Fitness: Walk is withheld, so plans need choices.
  - Calm: Slow breathing and Phone-free wind-down are withheld.
  - Energy: Earlier bedtime and Walk are withheld.

  The screen says so; nothing is substituted.
- Export includes `programVersion` and `profile`.
