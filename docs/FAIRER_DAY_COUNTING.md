# Fairer Day Counting: decision document

**Status:** approved at `6c0913e` (decisions 1–3 as recommended; no per-habit streaks) and **implemented**.

- **Implementation:**
  - `progression.ts` `dayNeed`/`dayQualifies` and `pilot.ts` `streakWalk` (shared by `pilotStreak`,
    `journeyStats`, `sinceSummit` and `graceDays`);
  - the Journey mountain takes "climbed" from the engine (`journeySource` `counted`);
  - a grace day's Journey entry and the Insights streak note explain the grace;
  - the VoiceOver label now says "days climbed".
- **Tests:** `src/core/__tests__/fairDayCounting.test.ts`, plus the simulation below, which now checks that the
  engine is the approved model day for day.
- **Wording:** 3 strings, machine-translated into 19 languages and awaiting native review.
- The sections below are the decision as approved; "today" there means the rule before it.
- **Baseline:** `0031623`, the Minimum Effort release candidate. Its flag stays off.
- **Sources:**
  - `docs/66_DAY_EXPERIENCE_AUDIT.md` (W3, D3);
  - `docs/MINIMUM_EFFORT_SPEC.md` (§2: consistency versus completion);
  - the engine: `pilot.ts` (`dayResult`, `dayOutcome`, `pilotStreak`, `journeyStats`, `sinceSummit`, `recentDays80`),
    plus `charts.ts`, `story.ts`, `moments.ts`, `comeback.ts` and `ascent.ts`.

**Evidence:** `scripts/audit/__tests__/dayCounting.test.ts`, with the models in `scripts/audit/dayModels.ts`.

- The rules' own checks always run.
- The simulations run on request: `AUDIT=1 npx jest scripts/audit/__tests__/dayCounting.test.ts`.
- Every model reads the days the **real engine** saved: completions, minimums, partial progress, skips, rest days and
  weekly habits.
- The "today" model is checked day for day against the engine's own `dayOutcome` and `journeyStats`.
- Users A, B and C are the audit's people, now shared in `scripts/audit/people.ts`. The audit's output is
  unchanged.

## 1. Recommendation

Keep the two measures Minimum Effort approved, and change only how a day earns consistency.

| Measure                      | Rule                                                                                                                                                                                      | Change      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Full completion**          | **Complete day:** every habit the day asked for is done (`dayFull`)                                                                                                                       | None        |
| **Consistency** (showing up) | **A day counts** when at least **80% of its habits, rounded down (at least 1)**, are done. It's **kept** when that's met only with minimums                                               | Rounds down |
| **Streak**                   | Consecutive counted or kept days. Rest days are neutral. **One missed day in any 7 is tolerated:** it adds nothing and breaks nothing. Two in a row, or two within a week, end the streak | New grace   |

**In plain words:**

- With up to five habits, a day counts when you do all but one.
- One missed day a week won't break your streak.
- A complete day still means everything was done.

**Why this one:**

1. **It fixes the people the audit worried about, in the range set-up recommends (2–4 habits).**
   - B's longest streak goes from **6 to 47**, though B did 50 of 66 days.
   - A's goes from **7 to 13**.
   - C's numbers don't change.
2. **It follows the science on both levels.** One missed habit in a day, and one missed day in a week, are treated as
   the single missed opportunity that didn't set habit formation back (Lally et al., 2010).
3. **It stays honest:**
   - Doing everything every other day earns a streak of 2, not 33.
   - An absence of two days or more always ends the streak, and the welcome back still follows it.
   - Partial progress and skips are still "not done".
4. **No number ever goes down.**
   - Over 121 simulated programs, no counted day, kept day, best streak or current streak decreased.
   - The rule never asks more than today's, for any number of habits. This was checked up to 30.
5. **Nothing stored changes,** and no approved screen is redesigned.

**What it doesn't solve:** a day-level rule can't be fair across habit counts (§3). Only per-habit streaks are. They
are recommended as a later addition to Habit Details (§6), not as the headline streak.

## 2. The models compared

The day's list is the existing one: daily habits, plus weekly habits done that day.

| Habits on the day | Today: 80% rounded up | Majority | 80% rounded down |
| ----------------- | --------------------- | -------- | ---------------- |
| 1                 | 1                     | 1        | 1                |
| 2                 | **2**                 | **2**    | 1                |
| 3                 | **3**                 | 2        | 2                |
| 4                 | **4**                 | 3        | 3                |
| 5                 | 4                     | 3        | 4                |
| 6                 | 5                     | 4        | 4                |

**Per-habit streaks** judge each habit on its own:

- Its opportunities are its daily days, or its finished weeks for a weekly habit.
- Done, or at its minimum, keeps the habit's streak.
- One missed opportunity is tolerated; two in a row end that habit's streak.

**Also run:**

- the audit's option (a), majority with partial progress counted as half;
- "80% rounded down + never miss twice", which is the per-habit tolerance applied to days.

### Users A, B and C (Day 66)

Each cell shows days counted, then best streak and streak at Day 66. Kept days are in brackets.

| Person                                         | Today            | Majority          | 80% rounded down  | **Recommended**       | Per habit, best (Read · Move · Meditate/Sleep) |
| ---------------------------------------------- | ---------------- | ----------------- | ----------------- | --------------------- | ---------------------------------------------- |
| A as audited                                   | 7 · 7 / 0        | 13 · 13 / 0       | 13 · 13 / 0       | **13 · 13 / 0**       | 24 · 13 · 7 / 24                               |
| A, minimums on every habit left on active days | 7 (+28) · 14 / 1 | 13 (+22) · 14 / 1 | 13 (+22) · 14 / 1 | **13 (+22) · 16 / 1** | 24 · 24 · 24 / 24                              |
| A, partial progress instead                    | 7 · 7 / 0        | 13 · 13 / 0       | 13 · 13 / 0       | **13 · 13 / 0**       | as A                                           |
| B as audited                                   | 50 · 6 / 4       | 51 · 6 / 4        | 51 · 6 / 4        | **51 · 47 / 47**      | 47 · 47 · – / 46                               |
| B, minimums on Day 12 and the weekly off day   | 50 · 6 / 4       | 51 (+8) · 55 / 55 | 51 (+8) · 55 / 55 | **51 (+8) · 55 / 55** | 55 · 55 · – / 46                               |
| B, skipping everything on the off day          | 50 · 6 / 4       | 51 · 6 / 4        | 51 · 6 / 4        | **51 · 47 / 47**      | as B                                           |
| C (control; two weekly habits)                 | 66 · 66 / 66     | 66 · 66 / 66      | 66 · 66 / 66      | **66 · 66 / 66**      | 66 each; weekly 9 of 9 weeks                   |

**Notes:**

- The audit's option (a) equals Majority everywhere, except for A with partial progress: 24 counted days, best 14.
  It turns partial notes into counted days, which the approved Minimum Effort model rules out ("partial stays
  separate"), so it isn't recommended.
- "Never miss twice" on days equals the recommendation for B, and gives A with minimums a best of 24. But it also
  gives everything-every-other-day a 33-day streak (§3).
- **A's days 16–50 don't count under any day rule.** A did two of four habits there, and under the recommendation a
  day with four habits needs three. Only the per-habit view shows A's real pattern: Read and Sleep each ran 24 days.
- **Checkpoints, recommended vs today:**
  - **B** (streak on Days 12, 21, 30, 44 and 66): 1, 8, 16, 28, 47 under the recommendation, against 0, 1, 3, 3, 4
    today.
  - **A:** 13 on Day 14, against 0 today. It ends on Day 15, the second missed day in a row.

### Set patterns, 1–6 habits (`MATRIX` in the output)

| Pattern                           | Today                     | Recommended                                      |
| --------------------------------- | ------------------------- | ------------------------------------------------ |
| One habit not done every day      | Counts only at 5–6 habits | Counts at 2–6 habits. With 1 habit, nothing does |
| One habit at its minimum          | Kept at every count       | Kept at every count                              |
| One habit partly done, or skipped | As "not done"             | As "not done"                                    |
| Nothing one day a week            | Best streak 6             | **57**: the whole program, at every count        |
| One habit missed one day a week   | Best 6 below 5 habits     | 66 at 2+ habits; 57 with 1                       |
| Everything every other day        | Best 1                    | **2** (never miss twice: 33)                     |
| Away Days 20–26                   | 40                        | 40: an absence still ends the streak             |

### Fairness: the same effort per habit, 1–6 habits

Each habit is done on each day with probability _q_, over 30 seeded runs per habit count. The table shows the
average best streak.

| q = 0.8                   | 1    | 2       | 3       | 4       | 5    | 6    | largest ÷ smallest |
| ------------------------- | ---- | ------- | ------- | ------- | ---- | ---- | ------------------ |
| Today                     | 13.0 | **7.9** | **5.4** | **4.1** | 10.4 | 8.2  | 3.2                |
| Majority                  | 13.0 | 7.9     | 21.7    | 15.6    | 30.2 | 22.2 | 3.8                |
| 80% rounded down          | 13.0 | 40.8    | 21.7    | 15.6    | 10.4 | 22.2 | 3.9                |
| **Recommended**           | 21.9 | 59.3    | 38.0    | 24.3    | 15.7 | 41.3 | 3.8                |
| Per habit (habit streaks) | 33.4 | 34.6    | 33.9    | 33.9    | 34.9 | 34.5 | **1.0**            |

**What the table shows:**

- **Today's rule is at its worst exactly where set-up points people, 2–4 habits.** At 80% effort per habit, the
  best streak averages 4–8 days.
- The recommendation lifts every habit count. It's lowest at 5, where today's rule already allowed one miss.
- **No day-level rule is fair across habit counts.** Rounding, and more habits giving more chances to miss on a
  day, make the result depend on how many habits someone has. Only per-habit streaks give the same streak for the
  same effort (ratio 1.0 at every _q_).
- At _q_ = 0.9 and 0.6 the pattern is the same: today 3.1 and 4.1, recommended 1.6 and 5.6, per habit 1.1 and 1.1.

## 3. Why not the other models

- **Majority:**
  - With two habits it still needs both, so a two-habit person is all-or-nothing, as today.
  - It does nothing for B's weekly off day.
  - At 5 habits it's more lenient than at 4.
- **80% rounded down alone:**
  - It's the right day rule, but on its own B's best streak stays 6: one empty day a week still resets it.
  - The grace is what addresses B.
- **Never miss twice** (per habit, or on days):
  - It's closest to the study. But a missed day after every done day never ends anything, so every-other-day
    effort reads as an unbroken run (33 days).
  - Limiting the grace to one day in any 7 keeps B's 47 and gives the alternating pattern 2.
- **Per-habit streaks as the headline:**
  - It's the fairest and most faithful model.
  - But Today's streak, the Journey, the Story, the summit, Insights' streak note and the streak carried into a
    New Ascent each show **one** day-based number. Several habit streaks would mean redesigning approved screens,
    and weekly habits count in weeks, not days.

## 4. Exact impact of the recommendation

| Area                                                                                            | What changes                                                                                                                                                                                                 | What doesn't                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Streak** (Today, Journey, Insights' streak note, Since the summit, carried into a New Ascent) | The new day rule and the week's grace. B carries 47 into a New Ascent instead of 4                                                                                                                           | Rest days are neutral; an unfinished today never breaks it; the carry rules                                                                                                  |
| **XP and level**                                                                                | **Nothing.** XP reads completions (10), partial progress or a minimum (5, never stacked) and complete days (+20) only (`dayXp`), never the day rule, so no model can change it                               | 5 XP minimum, no stacking, undo exactness                                                                                                                                    |
| **Journey**                                                                                     | More days marked climbed: A 7 → 13, B 50 → 51. Some seed-marked kept days become counted (A with minimums: 28 kept → 22 kept + 6 more counted). "Days climbed" rises. A tolerated miss still shows as missed | Complete days, the trail's lights and calendar milestones                                                                                                                    |
| **Insights**                                                                                    | Recent days counted/kept (`recentDays80`), Since-the-summit rates and the streak note                                                                                                                        | Consistency % and full-completion % (A 30% / 30%, B 77% / 77%, B with minimums 85% / 77%): they're per habit-opportunity, so the day rule never touches them. Weekly figures |
| **Story and summit**                                                                            | Longest streak (B 6 → 47). The highlight changes only when the best week is under 60% and the longest streak crosses 7. It didn't change for A, B or C                                                       | "Days completed" (complete days: A 7, B 50, C 66), habits done, the summit words, the ceremony                                                                               |
| **Minimum Effort**                                                                              | The same threshold applies to minimums. B's minimums on 2 of 3 habits now keep the off day; Sleep has no minimum                                                                                             | counted / kept / missed, the seed mark, the approved semantics                                                                                                               |
| **Moments, welcome back, readiness, offers**                                                    | Nothing                                                                                                                                                                                                      | They read activity, complete days and per-habit observations                                                                                                                 |
| **Post-66**                                                                                     | The same rule for its days                                                                                                                                                                                   | The pause before a choice                                                                                                                                                    |

**Wording:**

- The streak's details need one new explanation line ("One missed day a week won't break your streak"). It goes
  through the i18n workflow and needs native review.
- One existing inconsistency should be fixed at the same time. The Journey's VoiceOver label
  (`journeyTab.ascent.labelSummit`) says "{done} of 66 days **completed**", but `done` is the climbed count.
  - The Story and summit use "days completed" for complete days.
  - It should read "days climbed", as the visible caption already does.

## 5. Existing saves and migration

- **Nothing is stored differently.** Every number is derived from the saved days, so:
  - there's no save-version bump and no migration step;
  - backups and archived journeys stay valid as they are.
- An older Schwung reading the same save shows the old, lower numbers, which is harmless.
- **Re-scoring is automatic and only upward:** every past day, active program and archived journey is judged by the
  new rule. Verified over 121 programs.
- **Recommended:** re-score everything.
  - The alternative is a per-program rule version that freezes old programs on the old rule. It would need a save
    field, sanitising, backup handling and both rules kept forever.
  - Its only gain would be keeping past numbers that were, by the audit's finding, less accurate.
  - A Story image already shared keeps its old numbers, as any image does.
- **Tests:** a trial of the threshold alone made 10 existing tests in 7 files fail. They pin today's numbers in
  fixtures, mostly Minimum Effort's kept-day examples and the QA fixture. The grace adds new streak tests. Both are
  expected updates, not regressions.
- **Implementation outline** (after approval):
  - one day-need function in `pilot.ts`, used by `dayResult` and `dayOutcome`;
  - the Journey trail's status (`ascent.ts`) taken from `dayOutcome` instead of `dayQualifies` over the stored list;
  - one streak walk with the grace, shared by `pilotStreak`, `journeyStats` and `sinceSummit`;
  - the legacy pre-Life-Reset screen (`progress.tsx`) left as it is.

## 6. Decisions for you

1. **Approve the model:** 80% rounded down (at least 1), plus one missed day in any 7 tolerated by the streak.
   Complete days and XP are unchanged.
2. **Re-score existing and archived programs** (recommended), or freeze them on the old rule.
3. **A one-time explanation** when numbers rise after the update: the streak details line only (recommended), or
   also a one-time note.
4. **Later, separately:** per-habit streaks in Habit Details, the only fair-across-habit-counts measure (A's Read
   and Sleep each ran 24 days). They need design and approval first.
