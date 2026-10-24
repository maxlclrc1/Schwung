# Schwung V2 — Scheduled Habits (development-only foundation)

**Status:** infrastructure is built and tested. **No scheduled habit is offered to anyone.** Strength sessions and
balance stay HELD, no exercise targets were added, and V2 stays behind the `__DEV__` preview flag. The only
scheduled habits that can exist are synthetic **"Test session (dev)"** habits, added from Settings → Developer
in development builds.

## Data and compatibility
- `PlanHabit.schedule?: { days: Weekday[]; phaseLevelUps?: boolean }`: weekdays are Sunday = 0 … Saturday = 6;
  2–3 days allowed.
- **No schedule = due every day.** Every existing V1 and V2 plan has none, so their behaviour is identical
  (tested: planned lists are the whole plan every day, and V1 plans and progression tests are unchanged).
- **Saved data:** the field is optional, with no version bump. On load, a damaged schedule (wrong shape, 1 or 4+
  days) is dropped and the habit becomes daily. Level, history and everything else are kept.
- **Weekdays** come from the program's local calendar date keys (`YYYY-MM-DD`), never from elapsed time.
- **Pure logic** lives in `src/core/schedule.ts`: `isDueOn`, `dueOn`, `nextDueDay`, `nextSessionLabel`,
  `validDays`, `coversEveryWeekday`.

## Behaviour
| Area | Rule |
|---|---|
| **Today** | Shows only the habits due today, and "x of N done" counts them. Under the list: "Rest day for {habit} · next session {tomorrow / Monday…}" |
| **Planned lists** | Each day's log plans the habits due that day. A session already done today stays planned if its schedule changes (it never disappears) |
| **80% rule** | Unchanged: at least 80% of *that day's planned* habits. Rest days aren't planned, so they're never misses |
| **XP and streak** | Unchanged formulas. They already read each day's planned list, so a rest day is an ordinary day of the remaining habits |
| **Early level-up** | The existing offer after **7 consecutive sessions** (rest days skipped). With 3 sessions a week that's about 15 days; with 2, about 22. Accept or decline resets the run, as today |
| **Step-down** | The existing gentle step-down after **3 consecutive missed sessions**. Rest days never count; never below Easy |
| **Day 22 and 45** | **Not raised automatically** unless `phaseLevelUps: true` is set for that habit (approval needed per habit). Daily habits rise as before |
| **Next session** | Today's rest-day line and habit detail ("Due on 3 days a week. Next session: Wednesday.") |
| **Choosing days** | Habit detail → Schedule: 7 weekday chips (Mon first). A draft can pass through an invalid count while changing days ("Choose 2 or 3 days."); only valid schedules are saved |
| **Yesterday edits** | Unchanged window (until noon). A new log for yesterday plans the habits due *yesterday*, not today's |
| **History** | Past logs are never rewritten by schedule changes, swaps or removals |
| **Swaps** | A swapped-in habit replaces the scheduled one as a normal (daily) habit at Easy. V2 swaps only offer reviewed library habits, so a synthetic test habit has none |
| **Removal** | The existing minimum of 3, **plus**: a removal that would leave a weekday with nothing due is refused ("Every day needs at least one habit… Swap it instead.") |
| **Run counter** | Habit detail shows "Current run: n sessions" for scheduled habits |

## Edge cases
| Case | Behaviour now | Decision needed? |
|---|---|---|
| **Only 1–2 habits due on a day** | The 80% rule applies unchanged: 1 of 1 and 2 of 2 must be done (as 3 of 3 and 4 of 4 already must) | Optional: confirm this is acceptable for plans that are mostly scheduled |
| **No habits due on a day** | **Prevented:** every weekday must keep at least one due habit (the daily foundation habit normally covers this). Schedule changes and removals that would break it are refused | If a future design needs all-scheduled plans: (a) treat the day as neutral (doesn't count or break the streak), (b) count it as a successful day, or (c) keep it prevented. **(a) or (b) changes the streak rule and needs approval** |
| **Moving one session to another day** | **Not built.** Changing the schedule's days is permanent from today | Options: (a) "Do it today" once a week while the original day is still editable (the spec E proposal); (b) allow completing it on any non-due day that week, counting once; (c) no moves. (a) and (b) change the planned-list logic and need approval |
| **Missed session edited later** | Yesterday's session can be ticked until noon, using yesterday's due list. Older days can't be edited (unchanged) | — |
| **Week boundaries** | No "week" counting is involved: due-ness is by weekday, and runs and misses count sessions | — |
| **Timezone or DST changes** | Weekdays come from local date keys; a time-zone change behaves like the existing day logic (the day can't repeat or vanish) | — |
| **Repeated early level-up offers** | After accept or decline, the next offer needs 7 more sessions. No offer at Hard | — |
| **Step-down then recovery** | After a step-down the run restarts; 7 sessions bring the offer again | — |

## Testing the scheduler (development builds only)
Settings → Developer → **"+ Test session Mon/Wed/Fri"** or **"+ Test session Tue/Thu"** adds a synthetic habit:
- targets "Test session · level 1/2/3"
- not in the V2 library or release gate, never in plans, choices or swaps
- refused in release builds

Combine it with the Developer time travel (+1 day, Day 22…) to check rest days, offers, step-downs and Day 22/45.

## Remaining product decisions
1. Which habits may be scheduled, and with which defaults (e.g. strength: 2–3 days; balance: daily). This needs
   the physiotherapist review.
2. Per habit: whether Day 22/45 may raise it (`phaseLevelUps`).
3. Moving a single session (options above).
4. Whether plans may ever be all-scheduled (empty-day options above).
5. Where users first choose their days (when the habit is added, or a default they can change in detail).
6. Whether Today's "x of N" should mention rest days explicitly beyond the rest-day line.
