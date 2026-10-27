# Schwung — Life Reset Habit Catalog: Implementation Notes

**Stage:** the 11-habit catalog only.

- **Specification:** `SCHWUNG_LIFE_RESET_HABITS.md` (commit `70481e6`).
- **Code:** `src/core/reset/habits.ts` (pure data and pure helpers; **nothing in the app imports it**; every habit is
  `active: false`).
- **Tests:** `src/core/__tests__/resetHabits.test.ts`.

**What changed outside the catalog:**

- **Removed:** the superseded flagship catalog (`src/core/reset/challenges.ts`) and its test. Only that test imported
  it; its design document stays, marked superseded, and the code remains in git history (commit `d72875d`).
- **Not changed:** V1 and V2 libraries, engines, onboarding, cards, XP, streaks, saves, navigation, Field Notes,
  artwork and production.

## What the catalog records

- **The habits:** 11 habits with stable IDs. 8 reuse existing habit IDs (`focus_deepwork`, `screen_app_limit`,
  `focus_top3`, `mind_read`, `confidence_talk`, `move_walk`, `sleep_wake`, `social_reach_out`); 3 are new
  (`home_tidy`, `skill_practice`, `strength_log`) and collide with nothing.
- **Per habit:**
  - name, card description, category and art;
  - frequency, with a schedule on every target;
  - nine targets copied from the specification tables, each with its unit and amount;
  - completion (swipe always; optional timer, counter or session log);
  - personalisation inputs, ages, notes, eligibility and an inactive availability status.
- **Approved decisions, as data:**
  - **Less Scrolling:** `SCROLLING_RULES` (self-reported; optional weekly Screen Time check; a missing check never
    undoes a day).
  - **Weekly habits:** `WEEKLY_RULES` (rest days aren't misses; weekly adherence is separate from the daily streak; a
    zero week isn't a success; no streak loss).
  - **Strength Training:** `STRENGTH_RULES` (one credited session a day; consecutive days only show a note; no
    prescribed exercises or load; no automatic frequency increase).
  - **Social Confidence:** `SOCIAL_RULES` and the 12-action `SOCIAL_ACTIONS` library.
- **Safety:**
  - Daily Movement and Sleep Routine reuse V2's own `exclude` rules (only "already do it" answers are neutralised).
  - Less Scrolling reuses App time's phone-time rule.
  - Strength Training excludes the same precautions as the held exercise programmes, without referencing or releasing
    them.
  - Focus and practice blocks respect the shared 16–17 cap.

## Ambiguities in the specification (recorded, not resolved)

1. **Less Scrolling with a low baseline.**
   - **The issue:** the onboarding picker offers 30 min and 1 h, but limits never go below 30 min. So someone at 30
     min gets "Under 30 min" every phase (no progression), and someone at 1 h reaches the floor by Momentum at
     Standard.
   - **Overlap with eligibility:** the 2 h overall-phone rule makes this rarer but doesn't prevent it (a person can
     use the phone 2+ h with only 30 min on the main app).
   - **Decision needed:** offer the habit only when the main-app baseline is above the floor (for example ≥ 60 min),
     or accept a "keep it there" habit at low baselines.
2. **Less Scrolling reuses App time's ID but covers social media too.** V2's App time is only offered when videos or
   games are the main pull (social media goes to "Social media later"). The catalog reuses only App time's
   phone-time rule, not its pull rule, as the specification names the habit after any pull. Confirm.
3. **Get It Done: "workdays" with 3 days at Starter.** Recorded as `{ kind: 'workdays', days: 3 }`: any 3 of the
   person's workdays. Whether they're fixed days or any 3 needs deciding with the scheduling engine.
4. **Stay Connected's frequency** is described as "daily", but Starter Foundation and Momentum are 4 and 5 days a
   week. The schedule is therefore recorded per target, and the habit is marked `mixed`. Social Confidence is
   `mixed` too (Challenge Mastery is daily).
5. **Strength Training, Challenge "their current sessions (2–4)".** Someone training 5+ times a week falls outside
   the stated range. Decide whether to accept their own number above 4 (no increase, just tracking) or cap the
   tracked target at 4.
6. **Strength Training, Starter Mastery "or 3 if it feels good"** and Challenge Mastery "+1 a week only if you
   choose" are recorded as **optional notes**, not targets. Whether choosing them changes the weekly target is a
   scheduling decision.
7. **Focus Time and Practice a Skill at 90 min** (Challenge Mastery) are marked `blocks: 2` ("as 2 × 45 if they
   like"). For 16–17 the two blocks are required (the 60-min cap); for adults they're optional. The UI must show this
   distinction.
8. **Daily Movement for 16–17** has no age restriction in the specification. The pre-production review of 16–17
   targets is recorded in `beforeProduction`.
9. **Sleep Routine:** people who already wake regularly aren't excluded (V2's Steady wake-up would exclude them).
   This follows the "welcome people who already do it" principle; confirm.
10. **The Strength guidance link** ("your national health service's strength guidance") needs a reviewed source
    before release.

## Dependencies for later stages (none built)

| Dependency                                                                                                                                                                 | Needed for                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Weekly scheduling engine (`weekly`, `workdays` and `sessions` schedules; rest days never misses; weekly adherence separate from the streak)                                | Focus Time, Get It Done, Social Confidence, Practice a Skill, Stay Connected (Starter), Strength Training |
| Optional per-habit counts in day logs                                                                                                                                      | Get It Done, Stay Connected counters; Strength's one-a-day credit                                         |
| Numeric targets saved with each plan habit (`spec.reset`) and a Life Reset program marker                                                                                  | Showing timers, counters and limits; keeping V1 and V2 programs unchanged                                 |
| Readiness-based level offers (no automatic Day 22/45 rise for Life Reset programs)                                                                                         | Progression                                                                                               |
| Make it easier / harder, and intensity change, in Habit Detail                                                                                                             | The person's control over difficulty                                                                      |
| Timer helper on the card                                                                                                                                                   | Focus Time, Read Daily, Daily Movement, Tidy Up, Practice a Skill                                         |
| Social Confidence step picker (show, swap, skip)                                                                                                                           | Social Confidence                                                                                         |
| Strength session sheet (optional type and length) and the recovery note                                                                                                    | Strength Training                                                                                         |
| Onboarding answers (main-app time, wake time, active days, skill, strength starting point)                                                                                 | Personal targets                                                                                          |
| A Life Reset release list for internal testing (separate from `DEV_CLEARED`)                                                                                               | Making any habit selectable                                                                               |
| Light and dark scenes for the 8 habits without art (they fall back to world crops)                                                                                         | Cards                                                                                                     |
| Expert reviews: Social Confidence actions (psychologist); Strength guidance, joint-pain and 16–17 rules (exercise professional or physiotherapist); 16–17 movement targets | Production                                                                                                |
