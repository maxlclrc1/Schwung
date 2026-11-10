# Minimum Effort: release checklist

**Status:** conditionally approved (`1439345`). **`MINIMUM_EFFORT_LAUNCHED` stays `false`**, so normal users can't
record a minimum. Nothing below is marked approved on anyone's behalf: the specialist and native-speaker items are
open until a person signs them off.

Reviewed against `docs/MINIMUM_EFFORT_R2B.md`.

## A. Verified (automated, on the web build, or in code)

| Item | Evidence |
| --- | --- |
| Six minimums, exact English, approved package wording | `minimumIntegration.test.ts` ("the approved English, word for word") |
| Each offered only where genuinely below the target (every intensity × phase) | Timed habits by minutes; Eat Well never at Starter; Stay Connected only at 2+ people a day or a call |
| Sleep, Strength, Less Scrolling, weekly and custom habits: never offered, never counted | Catalogue, `minimumAvailable` / `minimumCounted` tests |
| Existing contraindications apply unchanged | Movement is unavailable with walking difficulty, a heart condition or pregnancy. Programs paused for age offer nothing. The minimum never re-enables an excluded habit (`minimumFor` needs the habit in the program). |
| Stay Connected safety note stays visible beside the minimum | Details screenshot `r2b/10` |
| Read Daily pages mode isn't reachable, so no "one page" option is ever shown | No set-up question or saved answer selects pages; targets, progress and the minimum are in minutes (`minimumRelease.test.ts`) |
| Complete → minimum → undo, and the skip ↔ minimum flows | `minimumRelease.test.ts`: XP 5 / 10, never stacked; undoing a completion returns to the minimum; skip and minimum replace each other; partial + minimum = 5 once |
| Counters: reaching the number completes; going back under returns to the minimum | Eat Well, Stay Connected |
| Kept-day streaks, best run, completed days kept apart | `minimumRelease.test.ts`, `minimumEffort.test.ts` |
| Journey trail (seed mark, day entry, VoiceOver text) | `minimumIntegration.test.ts`, screenshot `r2b/04` |
| Mountain overview: kept days use the seed mark, never the missed mark | **Fixed here**; screenshot `r2b/17` |
| Removal note after today's minimum says "It leaves from tomorrow (today's minimum stays)" | **Fixed here**; Habit Details and the weekly reflection; `minimumRelease.test.ts` |
| Insights: counts and percentages agree; minimums named | Trend, habit rows, observation |
| After Day 66: strip, caption, Recent Insights | `sinceSummitStrip`, `sinceSummit`, `recentDays80` tests; screenshots `r2b/07–08` |
| Saves (v0–v3), past-journeys store v1 → v2, and a newer store held for recovery | `minimumSave.test.ts`, `minimumStore.test.ts` |
| Backups: minimums restored exactly; forged ones kept in the record but never counted | `minimumStore.test.ts`, `minimumIntegration.test.ts` |
| Production build shows no minimum action; development and internal builds do | `minimumStore.test.ts`, screenshot `r2b/16` |
| Translations: every key in all 19 languages; placeholders and plural forms valid | `i18n:check`. An automated scan found no stray Latin text in Arabic or Urdu, no capitalisation slips and no spacing errors. |

**Checks:**

- `npm test`: 734 passed, 7 skipped;
- `tsc` passes;
- lint: only the one old warning;
- `i18n:check` passes;
- `AUDIT=1` 66-day simulation: 6 of 6.

## B. Native iPhone checks (not possible on the web build)

- [ ] Haptics: recording or removing a minimum uses `select`, never the completion haptic or a celebration.
- [ ] Dynamic Type at the largest sizes:
  - the minimum hint (three or more lines);
  - "Did the minimum" / "Remove minimum";
  - Insights lines with minimums;
  - the Since-the-summit caption.
- [ ] VoiceOver:
  - the action button;
  - the state line as a polite live region ("Minimum done.");
  - the card summary;
  - Journey days ("Day 13. Kept with the minimum.");
  - Insights ring and habit labels;
  - both post-66 panels;
  - the habit's 14-day strip.
- [ ] The dotted minimum segment in Insights habit rows. It's drawn with views, because one-sided dotted borders
  don't draw on iOS.
- [ ] The mountain overview's seed mark at 7 pt, on the painting, in light and dark.
- [ ] Right to left (Arabic, Urdu), after the restart:
  - the seed marks;
  - the dotted segment's direction;
  - the strips;
  - the hint's mixed "(+5 XP)" text.
- [ ] Reduce Motion: the minimum link uses the existing crossfade only.
- [ ] A backup from an internal (tester) build restored into a production build: minimums shown, counted and
  removable, but none can be recorded.
- [ ] An internal TestFlight build where a minimum is recorded at the day boundary and yesterday-before-noon. Minimums
  are today-only by design.

## C. Human-review blockers (must be signed off before launch)

**Specialist approval (not given here):**

- [ ] **Exercise:**
  - "Move for 2 minutes, any way you like", including people who answered "Rather not say" to health precautions.
    Movement is offered to them today.
  - The 16–17 programs started before the age change. The habit's own teen-target exercise review is still pending
    in the catalogue.
- [ ] **Nutrition:** "Fruit or vegetables in one meal", which must never read as restriction. Eat Well's own wording
  review is still pending in the catalogue, and the set-up doesn't ask about eating-disorder history.
- [ ] **Mental health / mindfulness:** "One quiet minute, any way you like". No breathing technique is prescribed;
  check the wording with anxiety or trauma in mind.
- [ ] **Safeguarding / social:** "One short message to someone you care about", beside "Never a prompt to contact
  someone who harmed you".
- [ ] **Outdoors:** "Step outside for 2 minutes". Decide whether the note should add that a doorstep, balcony or
  garden counts, and that the person should never go out in the dark or bad weather for it.
- [ ] **Owner / copy:**
  - the claim "it can keep today in your streak";
  - the recorded hint's nested parentheses for targets that already have one, e.g. "Your goal stays the same (Reach
    out to 2 people (more than a like))".

**Native-speaker review:** all 665 minimum strings are machine-made (35 keys × 19 languages, including the removal
note added here). Every language needs review. Points to check:

- [ ] **Arabic and Urdu (RTL):** the safety meaning of the six minimums, and the plural forms of "Plus {n} days kept
  with the minimum".
- [ ] **Hindi:** the default masculine verb forms; and "हाज़िरी" for "showing up".
- [ ] **Russian:** "Сохранено минимумом" reads awkwardly; a native phrasing is needed.
- [ ] **German, Dutch, Vietnamese, Thai:** the action label currently reads the same as the state ("Minimum
  geschafft"). Confirm it reads as a button.
- [ ] **Spanish:** "Sal afuera" is regional; check it for the intended audience.
- [ ] **All languages:** the Stay Connected and Eat Well minimums keep their non-pressuring, non-restrictive meaning.

**Product decision (not a bug, not changed):**

- [ ] **Milestone badges (Days 7, 21, 44):** on the mountain they light only when the milestone day was completed in
  full, so a kept milestone day stays unlit. This follows "no retroactive change to achievements". Confirm it's
  wanted.
- [ ] **Health precautions:** they change only at set-up or a New Ascent. That limitation is older than Minimum
  Effort; the minimum adds no new risk to it.

## Launch steps (after B and C)

1. Set `MINIMUM_EFFORT_LAUNCHED = true` in `src/lib/flags.ts`. It's the only change needed.
2. Run every check, then a production TestFlight build, and repeat B there.
