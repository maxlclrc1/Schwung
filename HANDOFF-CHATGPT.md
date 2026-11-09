# Schwung — Project Handoff for ChatGPT

You're joining an in-progress project as a **product and design partner**. The code is built and maintained by
Claude, working directly in the repository. Your job is to help the owner with direction, behavioural design, copy,
artwork and review, and to produce outputs the owner can bring back to Claude to implement. Please read this whole
document before suggesting anything.

This document was rewritten from the code on `main` at `5364be2` (November 2026). Where an older document disagrees,
the code wins. Earlier versions of this file described a removed program (a 6-question quiz, a 19-habit library,
automatic step-downs); none of that is in the app any more.

---

## 1. What Schwung is

**Schwung** (German for "momentum") is a **free, private, offline-first** iPhone app for one program: the **66-day
Life Reset**. The person chooses a few of 11 habits, starts each at an intensity that suits them, and swipes them done
each day, while a painted alpine world shows their climb.

- **Pitch:** "Get your momentum back." / "Free. No account. No tracking. Everything stays on this phone."
- **Philosophy:** progress over perfection; the person decides every change of difficulty; a missed day is never
  punished.
- **Repo:** https://github.com/maxlclrc1/Schwung (`main` and `development` are kept in sync).

### Non-negotiables (never propose otherwise)

- Free forever: **no paywalls, trials, premium tiers, ads or accounts.**
- Offline and local-first. No backend, no analytics, no AI-generated messages. Data stays on the phone (export and
  restore are files the person handles).
- No guilt, fake urgency, streak threats, fabricated statistics or unsupported promises in any copy. Words describe
  what was actually recorded (see "truthful moments" below).
- **Difficulty never changes without the person's yes.** The app offers; the person accepts or declines.
- Safety, age and health rules are never loosened by a feature (see section 4).
- Saved data is never lost or silently rewritten. A save the app can't fully read is kept for recovery, not deleted.
- Approved screens are not redesigned without the owner's permission.
- No new dependencies without a strong reason and the owner's approval.

---

## 2. Architecture (for context)

- **Stack:** Expo SDK 58, React Native 0.88, React 19.3, TypeScript, Expo Router (routes in `src/app/`), Zustand +
  AsyncStorage, Reanimated 4, react-native-gesture-handler, expo-image, expo-notifications (local only),
  react-native-view-shot + expo-sharing (share image). iPhone only.
- **Pure engine** (`src/core/`, no React, heavily unit-tested, ~640 tests):
  - `core/reset/habits.ts`: the 11-habit catalogue, every target at every level, eligibility and safety notes.
  - `core/reset/pilot.ts`: the program — set-up, adding/removing habits, day rules, XP, streaks, saves. (It keeps
    the name it had as a pilot, as do `PilotProgram` and the save key `schwung-reset-pilot`.)
  - `core/reset/readiness.ts`: when a step up or down is offered; "Make it easier/harder".
  - `core/reset/weekly.ts`, `tracking.ts`: weekly scheduling, completion, skips, partial progress, corrections.
  - `core/reset/comeback.ts` (welcome back), `reflections.ts` (weekly question), `moments.ts` (milestone and summit
    words), `collection.ts` (XP titles and alpine collectibles), `story.ts` (the 66-Day Story), `core/reminders.ts`.
- **Stores** (`src/store/`): the program, preferences (appearance, language, reminders, welcome back on/off), past
  journeys, recovery of unreadable saves, restore from a backup.
- **Screens:** `src/components/pilot/` (Habits, set-up, habit details, Insights, Settings section), `components/
ceremony/`, `components/reflection/`, `components/beyond/` (after Day 66).
- **Localisation:** 20 languages (`src/i18n/locales/`). New strings are machine-translated and marked for review.
- **Build channels:** development (with a developer clock), internal (testers) and production, all the same app.

---

## 3. The experience, screen by screen

1. **Choose language** (first launch): 20 languages on a turning wheel.
2. **Welcome:** the painted mountain, "Get your momentum back.", **Start my reset**.
3. **Set-up** (about a minute, nothing saved until the end):
   1. **Age** (a band only; under 18 cannot start).
   2. **Health:** precautions (joint pain, walking difficulty, heart condition, pregnancy, fluid limit, sleep
      condition), "None of these", or "Rather not say".
   3. **Habits:** choose from the 11 ("Two to four is a good start"; the program allows up to 30 habits in all,
      catalogue and own). "Start with a suggested three" offers Read Daily, Daily Movement
      and Sleep Routine; nothing is pre-selected. Unavailable habits show why.
   4. **Only the questions those habits need:** phone time and main-app minutes (Less Scrolling), usual wake time
      (Sleep Routine), active days (Daily Movement), which skill (Practice a Skill), strength starting point and
      current sessions (Strength Training).
   5. **Intensity** per habit: Starter, Standard or Challenge, with a suggestion (Starter by default; Movement,
      Strength and Less Scrolling suggested from their answers). Blocked intensities are greyed out with a reason.
   6. **Time available a day** (20 min to 3 h), checked against the busiest day.
   7. **Review**, then **Begin Day 1** (Day 1 ceremony).
4. **Habits tab:** an illustrated card per habit with today's target. Swipe right to complete, left to undo.
   Counters (tasks, people), strength sessions, skips, optional partial progress and minutes live on the card or in
   its details. Offers (a step up or down) appear here one at a time. **Add a habit** (catalogue or the person's own,
   up to 30 in all). The welcome back and the weekly reflection invitation also appear here.
5. **Journey tab:** the trail of 66 days up the mountain, stats (days completed, streak, best), any day's habits and a
   66-day calendar.
6. **Insights tab:** consistency, weekly trend, per-habit bars and history, a 66-day heatmap and personal records,
   from saved days only.
7. **Habit details** (long-press a card): today, a correction for yesterday (until noon), "too easy" / "too hard",
   **Make it easier / Make it harder**, safety notes, **Remove from my Life Reset**.
8. **Settings:** your program (day, what's next, end it), appearance, language, reminders, privacy and data (export,
   restore, delete), about and legal.
9. **After Day 66:** summit ceremony and the 66-Day Story, then **What's next?**: **Keep My Momentum** (same habits
   continue with no end) or **Begin a New Ascent** (a fresh 66 days; the previous journey is kept in Past journeys).
   Until a choice is made, tracking and reminders rest.

The three tabs are one swipeable pager over a single painted world (dark and light themes).

---

## 4. The habit catalogue (the 11)

Targets shown are **Starter Foundation** (the easiest level and where most people start). Every habit has nine
levels: three intensities × three phases.

| Habit             | Starter Foundation target                                        | How often             |
| ----------------- | ---------------------------------------------------------------- | --------------------- |
| Eat Well          | Fruit or vegetables with one meal                                | Every day             |
| Less Scrolling    | Main app 15 min under the person's own daily time (floor 30 min) | Every day             |
| Get It Done       | Finish your #1 task                                              | Any 3 workdays a week |
| Read Daily        | Read for 10 minutes (or 5 pages)                                 | Every day             |
| Meditation        | Meditate for 2 minutes                                           | Every day             |
| Daily Movement    | Move for 10 minutes, any way you like                            | Every day             |
| Sleep Routine     | Up within 60 min of the person's own wake time                   | Every day             |
| Time Outdoors     | 5 minutes outdoors, by choice                                    | Every day             |
| Practice a Skill  | Practise the chosen skill for 10 minutes                         | Any 4 days a week     |
| Stay Connected    | Reach out to 1 person (more than a like)                         | Any 4 days a week     |
| Strength Training | 2 sessions a week, about 20 min                                  | Sessions, any days    |

Plus **the person's own habits**: a name, what counts, and every day or 1–6 days a week. They count like any habit
but have no levels or offers.

**Retired** (never reuse): Focus Time, Social Confidence, Tidy Up.

### Safety and eligibility (never weaken)

- **Age:** 18+ only. A program started at 16–17 under an older rule is paused until the person confirms they're 18.
- **Daily Movement:** not offered with walking difficulty, or with heart or pregnancy advice.
- **Strength Training:** not offered if health was "Rather not say", or with heart, pregnancy or walking difficulty;
  joint pain rules out Starter. It tracks sessions only — never prescribes exercises, sets or weights. Notes:
  qualified guidance, and "stop and get medical help" warning signs.
- **Sleep Routine:** not offered when the wake time varies or the person works shifts. The person's own wake time is
  the anchor: never earlier, never less sleep.
- **Less Scrolling:** not offered under 2 hours of phone use a day; the limit never goes below 30 min, the time the
  person says they need, or where they already are.
- **Stay Connected:** "Never a prompt to contact someone who harmed you."
- Every change of level (offered or manual) is re-checked against these rules and the person's time a day.

---

## 5. The rules (habit science as implemented)

- **66 days, three phases:** Foundation (Days 1–21), Momentum (22–44), Mastery (45–66). A phase only makes the next
  target **available**; nothing changes unless the person accepts.
- **Readiness** (per habit, from the current target's own days): at least 7 recorded days (or 2 judged weeks for
  weekly habits).
  - **Ready (≥80% done):** a step up is offered once the next phase is open.
  - **Ready early (≥90% and the person said "too easy"):** offered before the phase opens.
  - **Struggling (<60% of recorded days):** a step down is offered — but only above Starter Foundation, which has no
    easier level.
  - Days the app wasn't opened are **unknown**: they never make a habit look ready and never push it down.
  - A step that changes nothing (some phases ask the same) is never offered or made.
  - After a decline, the same offer waits 7 days. Declined twice in a row, it stops until the person says "too easy".
    "Too hard" holds back step-ups for 14 days.
  - Changes start at the next boundary: tomorrow (daily habits) or next Monday (weekly habits).
- **A day that counts:** at least 80% of the day's due habits done. With 1–4 habits that means all of them; one miss
  is allowed only from 5 habits. A day with nothing due (weekly habits resting) is neutral.
- **Streak:** consecutive counted days; rest days neither count nor break it.
- **XP:** 10 per habit done, 5 for partial progress, +20 for a full day. XP climbs a ladder of titles that unlock
  alpine collectibles (kept for good). XP is derived from the saved days, so an undo takes it back.
- **Weekly habits** count by the week ("any 4 days"); a day without them is never a miss.
- **Skips:** a deliberate skip is recorded, never a failure, and never counts as done.
- **Corrections:** yesterday can be edited until noon.
- **Removing a habit:** it leaves from today (or tomorrow if done today); its past stays in every number. It can be
  added back later.
- **Weekly reflection** (after each program week): "How did the habits feel?" — easier / about right / harder. It
  never changes anything by itself; it can lead to a previewed, confirmed easier or harder target.
- **Welcome back:** after two or more days with something due and no activity, a calm card on Habits, once per
  absence (it can be turned off). It is words only: it doesn't change the day's rules or targets.
- **Ceremonies:** Day 1, milestones on Days 7, 21 and 44, and the summit (Day 66, reached by everyone by the
  calendar). **Truthful moments:** their words follow what was recorded — "Seven days of showing up" only after
  seven active days; "You made it. All the way up." only when most days had activity.
- **Reminders:** optional, off by default, set in Settings. One gentle line a day at the person's time, planned 14
  days ahead (so they go quiet if the app isn't opened), none on a complete day, habit names only if asked for.
- **After Day 66:** Keep My Momentum continues the same targets (no offers or reflections yet); the welcome back
  keeps working.

---

## 6. Development status

**Done:** the full Life Reset, the painted world and its pager, ceremonies, collection, Story, reflections,
reminders, after-66 choices, past journeys, export/restore and save recovery, 20 languages.

**66-day improvement roadmap** (from `docs/66_DAY_EXPERIENCE_AUDIT.md`, read it for the evidence):

| Step | Item                                                                                       | Status                                             |
| ---- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1    | Welcome back after Day 66; no step-ups that change nothing                                 | Done                                               |
| 2    | Respect a "no"; truthful milestone and summit words; honest totals                         | Done                                               |
| 3    | A path down for struggling people: Minimum Effort, recovery after an absence, fewer habits | **In design** — `docs/RECOVERY_SYSTEM_PROPOSAL.md` |
| 4    | How a day counts (the 80% rule with few habits)                                            | Not started                                        |
| 5    | Reminders offered on Day 1; an optional cue per habit                                      | Not started                                        |
| 6    | Progression content for flat habits; offers after Mastery                                  | Not started                                        |
| 7    | A Day 60 review and a real maintenance mode after 66                                       | Not started                                        |

**Open product decision (do not assume an answer):** whether "Minimum Effort" is a permanent fourth level or a
temporary fallback. The owner currently prefers a temporary fallback that keeps the person's original goal while
recognising a smaller action on hard days.

---

## 7. How you can help, and how to hand work back

- **Behavioural design:** challenge proposals against the evidence and the non-negotiables. Label claims as evidence
  or hypothesis, as the audit does.
- **Copy:** exact strings, marked with where they go, calm and specific, describing only what happened.
- **Artwork and review:** judge images against the existing painted world (dark and light) and its calm zones.

Please deliver final copy as exact strings, decisions as clear choices with reasons, and art as specs and files.
**Please don't** write app code, propose new libraries, change the safety rules, or redesign approved screens.
If something looks wrong, flag it for the owner to bring to Claude.

Other references: `docs/66_DAY_EXPERIENCE_AUDIT.md` (current priorities), `SCHWUNG_LIFE_RESET_PROGRESSION.md`
(readiness thresholds), `SCHWUNG_LIFE_RESET_HABITS.md` (catalogue rationale), `docs/BEYOND_THE_SUMMIT_PLAN.md`
(after 66), `DECISIONS.md`, `LATER.md`. Note: `OVERVIEW.md` and `SCHWUNG_LIFE_RESET_PROGRAM.md` still mention some
retired habits and features; this handoff and the code are current.
