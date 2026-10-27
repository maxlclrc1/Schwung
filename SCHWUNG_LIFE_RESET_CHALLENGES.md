# Schwung — Life Reset Challenge Definitions (Stage 1)

**Status:** a data-only catalog. Nothing in the app imports it:

- **No changes to:** onboarding, recommendations, programs, progress, XP, streaks, cards, navigation, Field Notes or
  production.
- **No challenge can be recommended yet:** every one has `recommendable: false`.

**Code:** `src/core/reset/challenges.ts`. **Tests:** `src/core/__tests__/resetChallenges.test.ts`.
**Source proposal:** `SCHWUNG_LIFE_RESET_HABIT_AUDIT.md` (commit `f89ce7e`).

## What the catalog contains

- **10 flagships**, each with:
  - a stable ID (`reset_*`), name, area and description;
  - its transformations (primary and paired);
  - the habits it absorbs, the retired V1 habits it replaces, and its supporting microhabits;
  - its components (one core measure plus opt-in options);
  - 3 intensities × 3 phases of target defaults, with a unit, days per week, blocks and an estimated time cost;
  - a personal destination, a measurement type, age rules, safety sources and a review status.
- **Strength Foundations**, held separately (`HELD_CHALLENGES`). It isn't a challenge: it can't be selected, and it
  only names the held exercise content it waits for.
- **Supporting microhabits** (`SUPPORTING_HABITS`): reviewed V2 habits that stay separate habits.
- **Retired and prohibited lists:** `RETIRED_V1` (never supports); `PROHIBITED` (cold and water quotas: not even
  replaced).
- **Pure helpers**, none of them used by the app:
  - `phaseMinutes` and `fitsTime`: whether a combined plan fits the person's time, checked in every phase;
  - `personalAmount`: a target from the person's own baseline;
  - `shareOfObserved`: a completion share where unknown days don't count;
  - `challengeExclusion` and `optionExclusion`: who can take a challenge or turn on an option.

## How the eight corrections were resolved

1. **Time versus later phases.** Every target carries an estimated time cost on a day it's due, and each intensity
   has a peak per challenge: Starter 30, Standard 60, Challenge 120 minutes. `fitsTime` checks a combined plan in
   **every** phase, so a plan that fits on Day 1 but not by Mastery is rejected. The tests guarantee:
   - any one Starter challenge fits 30 minutes, and any two fit an hour, through Mastery;
   - Deep Work, Reading and Skill at Standard fit 90 minutes in Foundation but not in Mastery, and are rejected.

   Changes from the audit: Deep Work Starter now peaks at 30 min (was 45); Challenge Mastery is 2 × 60 min (was
   2 × 75).

2. **Personal destinations.** Destinations are a prompt the person answers, with a suggested **range** per intensity
   (for example, books: Starter 1–2, Standard 2–4, Challenge 3–6). There is no universal number. Phone budgets are
   **shares of the person's own Week 1 average** (Standard ends at 0.6× by default), never below the minutes they
   say they need. With no baseline yet, no number is guessed: the first week measures it.
3. **Targets are defaults.** Every number is a design default the person can adjust, not a proven outcome or a
   minimum. The catalog makes no claims, and the tests reject overclaiming words ("proven", "validated",
   "scientific", "guarantee").
4. **Experienced people.**
   - **Intensity:** `SUGGESTED_INTENSITY` maps an experienced baseline to Challenge.
   - **Move Every Day at Challenge:** starts from the person's own weekly minutes (×1.0, then ×1.1, then ×1.2).
     Increases stop at 300 min a week, but nobody is asked for less than they already do.
   - **Every phase:** targets never get easier from Starter to Challenge.
5. **Light measurement.** One tap a day (Social Courage and Real Connections count taps), at most one **optional**
   number a week (the Screen Time average, a book finished, minutes if they differed), and an optional weekly
   check-in. Most challenges need no number at all.
6. **Missing data isn't failure.** Every challenge records a missing day as `unknown`. `shareOfObserved` leaves
   unknown days out of the share, and returns no decision with fewer than 7 recorded days in the 14-day window.
7. **Existing protections, unweakened.**
   - **Rules reused, not copied:** `challengeExclusion` reuses V2's own `exclude` rules for Walk (Move Every Day)
     and Steady wake-up (Sleep Anchor). Options use Earlier bedtime's rules (the in-bed time: not for 16–17, not
     with insomnia, under the time-in-bed ceiling), Phone-free wind-down's and Morning daylight's.
   - **Only one kind of answer is neutralised:** answers saying the person _already does_ the habit (routines, 5+
     active days). So experienced people aren't excluded, while every age, precaution and feasibility rule applies
     as in V2.
   - **Teen cap:** the 16–17 focus cap is now one shared constant (`TEEN_FOCUS_MAX_MIN`, 60). Focused work's ladder
     uses it, with exactly the same result (tested), and every focus or practice block in the catalog stays within
     it.
   - **Release:** held and prototype habits appear nowhere; all supports and safety sources are in the release
     gate.
8. **No silent commitments.** Each challenge has exactly **one core measure**, and only that measure's targets
   scale. Phone-free zones, the wind-down, the in-bed time, morning daylight, weekly reviews and weekly quality time
   are **options** the person turns on. Only Phone Under Control commits to a phone rule by default, only Sleep
   Anchor to a sleep commitment, and only Move Every Day to activity (tested). The audit's cumulative zones ("+
   meals", "+ last 30 min") are gone.

## Decisions still needed before any challenge is recommended

**Product:**

1. Approve the target defaults, intensity peaks (30/60/120 min) and time budgets (15/30/60/90/120 min).
2. **Weekly quota:** challenges due 4–6 days a week on days the person chooses need a weekly-quota habit type.
   `schedule.ts` supports only 2–3 fixed weekdays.
3. **Quantities:** weekly numbers (Screen Time, minutes, books) need optional amounts in day logs, and a weekly
   check-in record.
4. **Baselines:** confirm the Week 1 baseline-measurement approach for Phone Under Control (no budget until it's
   measured) and Move Every Day at Challenge.
5. **Readiness defaults:** 14-day window, at least 7 recorded days, offer at 80%, early offer at 90%, suggest a step
   down below 60%. These are constants only, and they don't touch the 66-day engine.
6. **Wording:** user-facing copy for each challenge, destination prompt and option needs a copy pass. The catalog's
   strings are working text.

**Safety and evidence:** 7. **Social Courage Ladder:** a psychologist should review the graded-exposure framing and signposting
(`needs-expert-review`). 8. **Move Every Day:**

- an exercise professional should review the weekly increases (≤ ~15% a week within a phase);
- 16–17 are **Starter only** until the WHO adolescent guidance is in the evidence register and reviewed
  (`needs-expert-review`).

9. **Sleep Anchor for 16–17:** the core (a wake window around their own time) uses Steady wake-up's existing rules.
   The in-bed-time option stays unavailable to them, pending the existing sleep-expert review.
10. **Unreviewed principles:** single-tasking, graded exposure, deliberate practice and weekly review must be added
    to the evidence register before any benefit is described.
11. **Strength Foundations** stays held until the physiotherapist and exercise-protocol reviews. Nothing in the
    catalog activates exercise prototypes.
