# Minimum Effort R2b: screens, engine connection and fixes

**Status:** built and tested, **not launched to normal users.** "Did the minimum" is offered only in development and
internal (tester) builds. Production stays off until the safety wording is reviewed by a person and the full
integration is verified on an iPhone. Turning it on is one line: `MINIMUM_EFFORT_LAUNCHED` in `src/lib/flags.ts`.

Release checklist (verified items, iPhone checks, review blockers): `docs/MINIMUM_EFFORT_RELEASE_CHECKLIST.md`.

Rules: `docs/MINIMUM_EFFORT_SPEC.md`. Approved content and mockups: `docs/MINIMUM_EFFORT_APPROVAL.md` (`d7652fc`).

## What was built

| Area | Change |
| --- | --- |
| Catalogue | The six minimums are `approved`. Sleep stays `disabled`. Strength, Less Scrolling, the weekly habits and custom habits have none. |
| Below the target | Each is offered only where the day's target asks strictly more: timed habits by minutes; Eat Well never at Starter; Stay Connected only at 2+ people a day or with a call. Tested level by level against the catalogue's targets. |
| Launch switch | `flags.minimumEffort()`: on in development and internal builds, off in production. Only recording is gated. A minimum already saved is always shown, counted and removable. |
| Habit Details | "Did the minimum" / "Remove minimum" as one more quiet link under "Mark as partially completed", with the same crossfade and `haptic.select` (never the completion haptic or celebration). The state line reads "Minimum done." The hint explains it. Nothing appears where there's no minimum. |
| Habits card | "Minimum done", on the existing secondary line, only once used. The header ("0 of 4 done today") is unchanged. |
| Journey | Mark A, the seed: the partly-done sage ring with a solid centre (r 2.1). The day entry reads "Kept with the minimum. Done: … At the minimum: …". VoiceOver reads "Day 13. Kept with the minimum." |
| Insights | The headline figure, habit rows and their order use consistency. Wherever a percentage includes minimums, the words name them. Habit rows draw completions solid and minimums dotted. The per-habit 14-day strip shows minimum days as the seed, never as misses. |
| Wording | One rule for every count: the approved phrasings, e.g. "17 of 20 · 2 at the minimum". Only the recorded hint changed from the approved package: "Your goal stays the same ({target})", because lower-casing the target ("your goal stays read for 10 minutes") can't be done safely in other languages. |

## The four fixes

1. **After Day 66, kept days showed as missed.** The Since-the-summit strip now uses `dayOutcome` (`P.sinceSummitStrip`).
   Kept days are ringed dots, and the caption "Plus {n} days kept with the minimum…" appears only when there are some.
   Recent Insights adds "Plus {n} days kept with the minimum." beneath its bar. Both VoiceOver labels include the
   kept count.
2. **Insights counts and percentages disagreed.** The trend's `WeekPoint` carries `minimum`, and the "most consistent
   habit" observation has a variant naming its minimums. The screen's figures use `consistency`. Without minimums,
   every word and number is exactly as before (tested).
3. **Archived journeys and older app versions.** `JOURNEYS_VERSION` is 2, with an identity step from 1. An older
   Schwung holds a v2 store for recovery instead of recounting a journey without its kept days.
4. **Edited backups.** A simple versioned catalogue: `MINIMUM_CATALOGUE_VERSION = 1`, and each offered minimum has
   `since: 1`. Entries are never removed and `since` never changes. `minimumOn` counts a saved minimum only for a
   catalogue habit with `since` at a level where it was below the target. So a forged Sleep, Less Scrolling,
   Strength, custom or Starter Eat Well minimum is kept in the record but never counted or given XP. A genuine
   minimum keeps counting even if it's withdrawn later.

**Unchanged:**

- the consistency and full-completion model;
- 5 XP, with no stacking (a completion over a minimum is 10, and undoing it returns to the minimum's 5);
- skips: a skip replaces a minimum, and a minimum clears a skip;
- the existing safety and autonomy rules (the precaution gates and the Stay Connected note stay visible);
- the save version (3).

## Tests

- **`src/core/__tests__/minimumIntegration.test.ts` (30):**
  - each eligible habit, level by level, against its target;
  - record, upgrade, undo and remove, with XP exact at every step;
  - wording in every form;
  - the catalogue;
  - forged minimums;
  - the launch switch;
  - Journey cells and words;
  - Insights trend, observation and wording;
  - post-66 strip, panel and caption, plus the parity of saves without minimums.
- **`src/store/__tests__/minimumStore.test.ts` (8):**
  - store recording per build channel;
  - journeys v2, v1 loading, and a newer store held;
  - backups with minimums and forged ones.
- **Existing:** the Minimum Effort engine and save v3 suites were updated for the approved catalogue (a forged Sleep
  minimum is now ignored).
- **All checks:**
  - `npm test`: 724 passed, 7 skipped;
  - `tsc` passes;
  - lint: only the one old warning;
  - `i18n:check` passes;
  - `AUDIT=1` 66-day simulation: 6 of 6.

**Localization:** 34 new English keys went through `i18n:tasks`, then `i18n:apply` for all 19 other languages
(machine-made, marked for review).

## Screenshots (`docs/minimum-effort/r2b/`)

These are the real app, a web export of an internal-channel build. Chromium at 390 pt, small screen at 375 pt,
Reduce Motion on. Each sheet is light then dark.

- **01–02:** Details, minimum available (Meditation) and recorded (Read Daily).
- **03:** Habits.
- **04:** Journey with the seed mark and Day 13's entry.
- **05–06:** Insights headline and habit rows.
- **07–08:** after Day 66, Journey and Insights.
- **09–10:** Eat Well at Standard; Stay Connected at Challenge with its safety note.
- **15:** small screen.
- **16:** a production build, where no minimum action is shown.

## Needs a person before launch

**Human safety review.** Translations are machine-made, so a native speaker should check each language,
especially Arabic, Urdu, Hindi and Russian. The English needs a review too:

- **Movement:** "Move for 2 minutes, any way you like" (exercise reviewer).
- **Eat Well:** "Fruit or vegetables in one meal" (nutrition reviewer). It must never read as restriction.
- **Stay Connected:** "One short message to someone you care about", beside "Never a prompt to contact someone who
  harmed you".
- **Meditation:** "One quiet minute, any way you like". No breathing technique is prescribed.
- **The hint's claim** "it can keep today in your streak".

**Native iPhone verification:**

- haptics (`select` on recording, never the completion haptic);
- Dynamic Type at the largest sizes: the hint, the link, and the Insights lines with minimums;
- VoiceOver: the action, the live state line, the card summary, Journey days, Insights labels and the post-66
  panels;
- the dotted minimum segment (drawn as views, since one-sided dotted borders don't draw on iOS);
- right-to-left (Arabic, Urdu): the seed mark, the dotted segment and the strip;
- a restore of a tester build's backup into a production build.

**Not offered on purpose:** Read Daily's "one page" minimum, because the pages mode isn't reachable in the app.
