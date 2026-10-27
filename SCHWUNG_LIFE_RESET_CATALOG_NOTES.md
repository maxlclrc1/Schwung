# Schwung — Life Reset Habit Catalog: Implementation Notes

**Stages:** the 11-habit catalog (commit `957af62`) and the flexible weekly scheduling foundation
(`src/core/reset/weekly.ts`, tests in `src/core/__tests__/resetWeekly.test.ts`). Neither is used by the app.

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

## Confirmed decisions (2026-10-27)

The founder confirmed these after the catalog stage. **Recorded** means it's in the catalog or scheduling code and
tested. **Not built** means it's behaviour that later stages still have to implement.

| #   | Decision                                                                                                                                                                                    | Recorded (data, tested)                                                                                                                                                                                                                          | Not built yet                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | Less Scrolling covers social media, video and gaming; recommended automatically from 60 min a day on the chosen app; can be chosen below that without being pushed below the person's needs | `SCROLLING_AUTO_RECOMMEND_MIN` (60) and `scrollingRecommended`; `scrollingLimit` never goes below the 30-min floor or the person's stated need, and a starting point under the floor is kept as it is; only App time's phone-time rule is reused | The recommendation itself (onboarding and the plan builder); asking for the stated need |
| 2   | Get It Done at Starter: any three eligible workdays a week                                                                                                                                  | `{ kind: 'workdays', days: 3 }`; `weekly.ts` credits any 3 of the person's workdays                                                                                                                                                              | Choosing workdays in the UI                                                             |
| 3   | Frequencies may differ between intensities and phases                                                                                                                                       | Schedules are per target; `erasFor` turns intensity and phase changes into schedule eras                                                                                                                                                         | Saving those changes in a program                                                       |
| 4   | Strength Training keeps an experienced lifter's frequency, including above four sessions, and never raises it                                                                               | Challenge amount is `{ kind: 'own', min: 2, max: 7 }` (one credited session a day) and the text "Your current sessions (2 or more)"; `fullWeekGoal` uses the person's own number and never raises it                                             | Asking for that number; the session log                                                 |
| 5   | 90-minute focus blocks are split for 16–17; adults may split them                                                                                                                           | `blocks: 2` on 90-minute targets and `BLOCK_SPLIT` (`teen: 'required'`, `adult: 'optional'`)                                                                                                                                                     | Showing the split on the card and timer                                                 |
| 6   | Sleep Routine is available to people who already wake at a consistent time                                                                                                                  | `resetExclusion` neutralises only the "already do it" answer; the shift and varying wake-time exclusions stay                                                                                                                                    | —                                                                                       |
| 7   | Existing safety restrictions and holds remain                                                                                                                                               | Unchanged and tested (V2 rules, the release gate, held exercise programmes)                                                                                                                                                                      | —                                                                                       |
| 8   | The catalog stays inactive until later integration                                                                                                                                          | Every habit `active: false`; nothing in the app imports `src/core/reset/`                                                                                                                                                                        | Integration                                                                             |

These replace ambiguities 1–7 and 9 below. Items 8 (Daily Movement for 16–17) and 10 (the Strength guidance source)
remain open.

## Weekly scheduling rules

`src/core/reset/weekly.ts` is a pure foundation. It reads the existing day logs and decides nothing in the app yet.
`schedule.ts` (V1/V2 daily and fixed-weekday scheduling) is untouched.

**Weeks**

- **Calendar weeks, Monday to Sunday.** People think in "this week"; a Monday-to-Sunday week is what the examples
  assume ("Sunday not yet finished"). Program-relative 7-day weeks would end on a different weekday for every person.
- **Week 1** is the calendar week containing Day 1. The last week ends on Day 66.
- **Partial weeks:**
  - **At either end:** a program starting mid-week has a partial first week, and Day 66 usually ends a partial last
    week.
  - **Every day is in exactly one week** (tested for programs starting on different weekdays).
- **Dates, not time:**
  - Weekdays come from the program's local date keys (`weekdayOfDay`, as fixed-weekday schedules already do), never
    from elapsed time.
  - Daylight-saving changes and travel across time zones can't move a day or a week; this is tested across the EU
    and US clock changes.

**A week's goal**

- **Full week:**
  - Daily = 7.
  - "N days a week" = N.
  - Workdays = N, at most the number of the person's workdays (Monday–Friday by default).
  - Sessions = N, or the person's own number at Challenge.
- **Changes within a week:** the goal is the **lowest goal in effect on any day of that week**.
  - **Effect:** a rise (a phase step-up, Starter → Standard) starts the following week; an easier goal applies at
    once.
  - **Why:** nobody is asked for more in the middle of a week, and making it easier always helps straight away.
- **Partial weeks** (program start or end, or a habit added mid-week): the goal is scaled to the eligible days the
  week has, rounded down, and never more than those days. For example, 5 a week over a 3-day week needs 2. A week too
  short for one completion has **no goal**: completions still show, as extras.

**Counting**

- **One per day:** a day counts at most once (one credited session a day for Strength Training).
- **Workdays habits:** only the person's workdays count toward the goal. Completions on other days are recorded as
  "outside" and never become misses.
- **Extras:** completions beyond the goal are counted separately.

**Week status**

- **Achieved:** as soon as the goal is met, even early. The rest of that week's days then show "goal met", with
  nothing outstanding.
- **Pending:** the week isn't closed yet and the goal isn't met. It also reports whether the goal is still possible.
- **Closing:** a week closes when its last day is final. That's the day after it, or, while yesterday is still
  editable (before noon), the day after that, the same rule Schwung already uses.
- **Not achieved:** a closed week short of its goal, when anything was recorded that week (the app was used). A week
  with zero completions against a goal is therefore not achieved.
- **Unrecorded:** a closed week with no records at all is neither achieved nor failed. Unknown is never treated as a
  failure.
- **No missed days are invented:** an incomplete week is an incomplete week. Its rest days stay rest days.

**Daily view and the daily streak**

- **What each day shows** (`dayState`):
  - `due` for daily habits;
  - `done`;
  - `open` (a weekly goal is still open: an invitation, never a miss);
  - `goal-met`;
  - `not-eligible`;
  - `inactive`.
- **The 80% rule:** a weekly habit counts in a day's 80% only on a day it's done (`countsTowardDay`), so rest days can
  never pull a day under 80%.
- **Weekly adherence** (`weeklyAdherence`) is the share of achieved weeks among achieved and not-achieved weeks. It's
  separate from the daily streak, which is unchanged.

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
| Wiring the weekly scheduling foundation into plans, Today, the 80% count and streak display (the rules exist in `weekly.ts`)                                               | Focus Time, Get It Done, Social Confidence, Practice a Skill, Stay Connected (Starter), Strength Training |
| Wiring the tracking foundations (`tracking.ts`, `timer.ts`; see `SCHWUNG_LIFE_RESET_TRACKING.md`) into Today and the card controls                                         | Timers, counters, strength sessions                                                                       |
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
