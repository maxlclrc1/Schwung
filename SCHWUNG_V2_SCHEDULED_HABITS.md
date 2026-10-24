# Schwung V2 — Scheduled Habits (development-only foundation)

## Approved product decisions (owner, after commit `5c03099`)
1. Strength sessions start at **2 days a week**; an optional third day depends on the exercise-protocol review.
2. Balance may be daily or scheduled, as the professional review decides.
3. **Strength and balance never rise at Day 22 or Day 45.** Progression only through an accepted offer.
4. Moving a session once within the same week, without double counting, is approved in principle. **Not built
   yet.**
5. **Fully scheduled plans are not supported.** Make your bed stays the daily foundation habit.
6. People choose or confirm the weekdays when a scheduled habit is added; Habit Detail edits them later.
7. Today keeps only the existing rest-day line.

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

## Audit against the decisions (2026-10-24)
| Check | Result |
|---|---|
| **Historical logs after schedule edits** | ✅ Past logs are never rewritten (tested byte-for-byte). **Bug found and fixed:** runs and step-downs judged *past* days by the *current* schedule. Editing Mon/Wed/Fri → Tue/Thu after six done sessions reset the run to 0 and **stepped the habit down at once**. Past days are now judged by that day's own record (`wasDueOn`): its planned list, or the current schedule only when no log exists |
| **Yesterday view after an edit** | **Fixed** with the same rule: yesterday shows what was due yesterday, not under today's schedule (daily habits unchanged) |
| **XP and streak** | ✅ Formulas unchanged and read each day's planned list. Tested across a full week with sessions and rest days |
| **Rest days never misses** | ✅ Tested for runs, step-downs and the 80% rule |
| **Session-based level-up and step-down** | ✅ 7 consecutive sessions → offer; 3 consecutive missed sessions → step-down; rest days skipped |
| **Day 22/45 exclusion** | ✅ for scheduled habits. **Gap fixed (decision 3):** a *daily* balance habit would still have risen. Strength and balance ids (`move_strength_prep`, `move_strength_session`, `move_balance`) now never rise at Day 22/45, daily or scheduled, even if a phase flag is set |
| **Calendar and daylight saving** | ✅ Weekdays come from local date keys; 400 consecutive days across both DST changes step one weekday per day (tested) |
| **Damaged saved data** | ✅ Invalid days → the habit becomes daily (history and level kept). **Improved:** valid days with a damaged phase flag now keep the days and drop only the flag, so no automatic level-ups appear |
| **Decision 5 (no fully scheduled plans)** | ✅ Every weekday must keep a due habit. Make your bed has no schedule and can't be given one. Removing it is still allowed if other daily habits cover every day (existing V1/V2 behaviour, unchanged) |
| **Decision 6 (confirm days on add)** | Development: the test-session buttons now open the new habit straight away to confirm or change its days. Real scheduled habits will need this in their add flow when they're built |
| **Known limitation** | A day with no log at all (app not opened) is judged by the current schedule, because schedule history isn't stored. This only matters if days are changed after missed, unlogged sessions |

## Native iPhone test: Expo Go
**Not yet performed.** Nothing here has been tested on an iPhone.

**Protect real progress first.**
- Expo Go keeps this project's data per project. If Schwung has been used in Expo Go on that iPhone for a real
  program, **use a different iPhone**, or Settings → Export my data first. Export is a backup copy only: the app
  can't import it, so a second device is the safer choice.
- A TestFlight or App Store build is a separate app and is unaffected.

**Setup**
1. On the iPhone, install **Expo Go** from the App Store. It must support **Expo SDK 57** (this project's SDK);
   if it doesn't, use a development build instead (`npx eas-cli@latest build --profile development`).
2. On the computer:
   ```bash
   git checkout main && git pull
   npm install
   EXPO_PUBLIC_SCHWUNG_V2_PREVIEW=1 npx expo start --clear
   ```
   (Windows PowerShell: `$env:EXPO_PUBLIC_SCHWUNG_V2_PREVIEW="1"; npx expo start --clear`.) If the phone is on a
   different network, add `--tunnel`.
3. Scan the QR code with the iPhone camera, which opens it in Expo Go.
4. Welcome should show "Developer · Habit Science V2 preview: on (from environment)". Complete a V2 onboarding.
   B (19, confidence) is quick: no time questions.

**Checklist** (Settings → Developer gives time travel: −1/+1/+3/+7 days, Day 22, Reset clock.)
- [ ] **Add:** Settings → Developer → "+ Test session Mon/Wed/Fri". Habit Detail opens straight away, with
  Mon/Wed/Fri highlighted.
- [ ] **Choose weekdays:** untick one day → "Choose 2 or 3 days."; tick another → saved, "Next session: …"
  updates. A 4th day is refused.
- [ ] **Rest day:** on a non-due day, Today doesn't list the session; under the list: "Rest day for Test session
  (dev) · next session {tomorrow/weekday}". "x of N done" counts only the due habits.
- [ ] **Due day:** +1 day until it's due. It appears on Today; checking it gives the usual animation and
  haptic, and XP goes up by 10.
- [ ] **80% rule:** on a due day with 6 habits, 5 done keeps the streak and 4 doesn't. On a rest day with 5
  habits, 4 done keeps it.
- [ ] **Seven sessions:** complete only the due sessions across about 15 days (+1 day each time). The "7 days
  straight" offer appears after the 7th session, not after 7 calendar days. Accept: Lv 2, "Test session · level
  2".
- [ ] **Three missed sessions:** skip three due sessions in a row. The next day shows "Let's make this one easier
  for now." Rest days in between never count.
- [ ] **Day 22 and 45:** Developer → Day 22. Daily habits rise one level; the test session **doesn't** (Habit
  Detail explains why). Repeat at Day 45 (Day 22 + 7 + 7 + 7 + 1 + 1).
- [ ] **Change days mid-program:** after a few sessions, change the days. The run (Habit Detail, "Current run:
  n sessions") and the level stay; the Journey screen and past days look the same.
- [ ] **Yesterday:** before noon on the day after a due session, the "Yesterday" tab lists that session; ticking
  it counts.
- [ ] **Remove:** removing the test session works. Make your bed can be removed only while other daily habits
  cover every day; otherwise it's refused ("Every day needs at least one habit…").
- [ ] **Force-quit and reopen** (swipe it away in the app switcher): same plan, days, levels, XP and streak.
- [ ] **VoiceOver:** the day chips read "Monday, checkbox, checked"; the rest-day line is read; habit rows read
  title and target; the schedule message is announced after a change.
- [ ] **Release safety:** a build without `EXPO_PUBLIC_SCHWUNG_V2_PREVIEW` and with the switch off shows no V2
  onboarding. The test-session buttons exist only in development builds.

## Remaining product decisions
Most are now decided (see the top). Still open:
1. Whether strength gets a third day (exercise-protocol review), and whether balance is daily or scheduled
   (professional review).
2. Session moving: the build and its exact rules (once a week, no double counting: approved in principle).
3. The real add flow for scheduled habits (choose or confirm the days), when the first one is released.
