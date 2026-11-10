# Minimum Effort: release checklist

**Status:**

- `6c5645a` is the baseline.
- **Internal iPhone testing is on:** `eas build --profile internal` builds the internal channel, where minimums are
  offered.
- **Production stays gated:** `MINIMUM_EFFORT_LAUNCHED` is `false`, so normal users can't record a minimum. Nothing below is marked approved on anyone's behalf: the specialist and native-speaker items are
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
| Recorded hint never nests parentheses ("Your goal stays the same: {target}.") | `minimumRelease.test.ts`, for every eligible habit |
| Time Outdoors shows its safety note with the minimum; no other minimum has one | `minimumRelease.test.ts`; screenshot `r2b/18` |
| Movement minimum not offered for "Rather not say" or 16–17 programs; the habit's eligibility is unchanged; saved minimums still count | `minimumRelease.test.ts` |
| Milestones (Days 7, 21, 44) reached by the calendar, in peach, never as a completion; a kept milestone day keeps its seed | `landmarkReached`, `minimumRelease.test.ts` |
| "can keep today in your streak" kept word for word | `minimumRelease.test.ts` |
| Insights: counts and percentages agree; minimums named | Trend, habit rows, observation |
| After Day 66: strip, caption, Recent Insights | `sinceSummitStrip`, `sinceSummit`, `recentDays80` tests; screenshots `r2b/07–08` |
| Saves (v0–v3), past-journeys store v1 → v2, and a newer store held for recovery | `minimumSave.test.ts`, `minimumStore.test.ts` |
| Backups: minimums restored exactly; forged ones kept in the record but never counted | `minimumStore.test.ts`, `minimumIntegration.test.ts` |
| Production build shows no minimum action; development and internal builds do | `minimumStore.test.ts`, screenshot `r2b/16` |
| Translations: every key in all 19 languages; placeholders and plural forms valid | `i18n:check`. An automated scan found no stray Latin text in Arabic or Urdu, no capitalisation slips and no spacing errors. |

**Checks:**

- `npm test`: 743 passed, 7 skipped;
- `tsc` passes;
- lint: only the one old warning;
- `i18n:check` passes;
- `AUDIT=1` 66-day simulation: 6 of 6.

## E. Internal testing: verified in the cloud environment (no iPhone or simulator)

The cloud container has no Xcode or iOS Simulator, so **nothing in this section was run on iOS**. It used the
internal-channel web export in Chromium.

- **Accessibility tree** (what VoiceOver is given; `node scripts/qa/minimum-a11y.mjs`, 14 of 14):
  - "Did the minimum" and "Remove minimum" are named buttons;
  - the state line is a polite live region that changes to "Minimum done." and back;
  - the card summary ends "Minimum done";
  - Journey reads "Day 13. Kept with the minimum." and never calls a full day kept;
  - Insights labels name their minimums;
  - the Since-the-summit label counts kept days;
  - the Arabic Journey labels are translated.
- **Haptics (by code only):** the minimum's only entry point fires `haptic.select` (iOS selection feedback). It never
  fires `completionHaptic` or a celebration. Not felt on a device.
- **Reduce Motion:** every pass ran with reduced motion and showed no page errors. The minimum link uses the
  existing `REVEAL`/`CONCEAL` crossfade, which follows the system setting.
- **Right to left, Dynamic Type stand-in and every language:** visual QA (`scripts/qa`, new `min-*` scenes) ran
  across 20 languages at 320 pt, 390 pt with ×1.3 text, and 320 pt with ×1.3 text in dark mode. Arabic and Urdu ran
  with `dir="rtl"`.
  - 480 cases, compared case by case with the same matrix on the existing screens (360 cases) on the same build.
  - **No new layout problem comes from a Minimum Effort element.**
  - The problems it reports are pre-existing, and the baseline shows them too:
    - the Spanish and Russian "Too hard" button at 320 pt;
    - the hero's streak and title chips at ×1.3;
    - the Russian Eat Well target clamped to two lines;
    - week-chart and trail tap targets crowding at 320 pt;
    - the Dutch "gewoontemomenten" breaking mid-word at ×1.3. The minimum variant of that line inherits it.
  - None was changed here; they belong to the existing layout backlog.
- **Backup and restore:** unit and store tests cover v0–v3 saves, past journeys v1 and v2, exact restores, forged
  minimums and the production-gated store. Not run through the iOS file picker.

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
- [ ] A kept milestone day: the seed inside the trail's diamond, and the small seed beside the mountain's badge.
- [ ] Time Outdoors: the safety note under the hint at the largest text sizes.
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
  - "Move for 2 minutes, any way you like". It's no longer offered for "Rather not say" or 16–17 programs, but it is
    offered to everyone else who has Daily Movement.
  - The habit's own 16–17 target exercise review is still pending in the catalogue.
- [ ] **Nutrition:** "Fruit or vegetables in one meal", which must never read as restriction. Eat Well's own wording
  review is still pending in the catalogue, and the set-up doesn't ask about eating-disorder history.
- [ ] **Mental health / mindfulness:** "One quiet minute, any way you like". No breathing technique is prescribed;
  check the wording with anxiety or trauma in mind.
- [ ] **Safeguarding / social:** "One short message to someone you care about", beside "Never a prompt to contact
  someone who harmed you".
- [ ] **Outdoors:** "Step outside for 2 minutes", with its new note "A doorstep, balcony or garden counts. Don't go
  outside when conditions aren't safe."
- **Owner / copy:** decided. "Can keep today in your streak" stays, and the nested parentheses are gone.

**Native-speaker review:** all 684 minimum strings are machine-made (36 keys × 19 languages, including the removal
note, the Outdoors note and the reworded hint). Every language needs review. Points to check:

- [ ] **Arabic and Urdu (RTL):** the safety meaning of the six minimums, and the plural forms of "Plus {n} days kept
  with the minimum".
- [ ] **Hindi:** the default masculine verb forms; and "हाज़िरी" for "showing up".
- [ ] **Russian:** "Сохранено минимумом" reads awkwardly; a native phrasing is needed.
- [ ] **German, Dutch, Vietnamese, Thai:** the action label currently reads the same as the state ("Minimum
  geschafft"). Confirm it reads as a button.
- [ ] **Spanish:** "Sal afuera" is regional; check it for the intended audience.
- [ ] **Dutch:** "gewoontemomenten" breaks mid-word at large text in the Insights consistency line, with or without
  minimums. That's pre-existing; a shorter word would fix both.
- [ ] **All languages:** the Stay Connected and Eat Well minimums keep their non-pressuring, non-restrictive meaning.
- [ ] **All languages:** the Outdoors note keeps its safety meaning (don't go out when conditions aren't safe) and
  doesn't read as an obligation to go out.

**Known limitation (unchanged):** health precautions change only at set-up or a New Ascent. That's older than
Minimum Effort, and the minimum adds no new risk to it.

## D. Final product changes (owner decisions after `c264a32`)

1. **Recorded hint:** "Your goal stays the same: {target}. Doing it in full still counts as done." No nested
   parentheses.
2. **Time Outdoors:** a safety note shown with the minimum: "A doorstep, balcony or garden counts. Don't go outside
   when conditions aren't safe."
3. **Milestones are calendar-based:**
   - On the mountain, a badge lights in peach once its day comes, whatever was done that day. Before, it lit only
     after a full day; completion stays sage.
   - On the trail, the diamond was already calendar-based.
   - A kept milestone day keeps its seed: inside the diamond, and as a small seed beside the mountain's badge.
4. **Movement minimum:**
   - Not offered for "Rather not say" to health precautions, or for 16–17 programs. Those programs are already
     paused until the person confirms they're 18+; this is a backstop.
   - The habit's own eligibility is unchanged, and other minimums are unaffected.
   - A Movement minimum already saved counts as it was recorded.
5. **"Can keep today in your streak"** is kept word for word.

## Launch steps (after B and C)

**The production release is one change:** `MINIMUM_EFFORT_LAUNCHED = true` in `src/lib/flags.ts`. No other code or
test depends on its value; this was checked by flipping it with every blocker still open.

`src/core/__tests__/minimumLaunch.test.ts` fails if the flag is set while:

- any `- [ ]` remains in section B or C; or
- any of the 36 Minimum Effort strings is still awaiting review in `scripts/i18n/state.json`.

So the sign-offs are recorded where they happen:

1. A person ticks each item in B and C, naming who signed it off.
2. Native speakers review each language, then the reviewed strings are marked with `npm run i18n:approve -- <lang>
   <key>`, or a prefix such as `engine.minimum`.
3. Set the flag, run every check, build `eas build --profile production` for TestFlight, and repeat B there before
   release.
