# Schwung V2 — Fitness Scheduling Decision Memo

**Status:** recommendation only. Nothing here is implemented. Strength Preparation, Supported Balance, Seated
Mobility and Strength Sessions all stay **HELD**. Guidelines (WHO, CMO, ACSM) inform *frequency*; they don't
validate any rep count, hold time or progression step. All of those remain product drafts for a
physiotherapist to set.

## How the current mechanics treat a skipped exercise day (from the code)
- **A day counts** when at least 80% of *that day's planned* habits are done. Today every plan habit is planned
  every day.
  - With 5–6 habits, one skipped habit still counts (4/5, 5/6).
  - **With 3–4 habits, any skip breaks the day.**
- **XP:** 10 per habit, plus 20 for a full day.
- **Streak:** consecutive counting days.
- **Early level-up:** offered after **7 consecutive completions** of that habit.
- **Step-down:** after **3 consecutive missed** days.
- **Day 22 and 45:** every habit moves up one level automatically, unless it was added on or after that day.
- **Per-day planned lists already exist** in the saved logs, so XP and the 80% rule could handle scheduled
  days. Early level-up and step-down could not: they count *calendar days*.

## The four options
| | A. Daily gentle strength | B. Scheduled strength (2–3 days a week) | C. Daily supported balance | D. Balance on selected days |
|---|---|---|---|---|
| **Safety and recovery** | Acceptable only if the daily dose stays low (1–3 moves, a few reps, well short of fatigue) **and** the copy says "rest when sore". Daily loading of the same muscles is the open question | Best match to recovery norms: rest days are built in | Static, supported holds have a low recovery need; the main risk is falling during practice, handled by support and screening | Same as C; rest days add little |
| **Evidence-informed frequency** | Guidance is 2+ days a week (WHO, CMO), 2–3 for beginners (ACSM 2009). Daily is *more often* than needed: a practice habit, not a training dose | Matches guidance | WHO: balance and strength on 3+ days a week for 65+; daily exceeds it harmlessly | Matches "3+ days a week" exactly |
| **Beginners and older adults** | Good for building the routine; volume must stay tiny | Good, but missing a fixed day is common for beginners | Good for 65+ who pass the chair-stand screen | Good |
| **66-day mechanics** | **No change** | **Change:** per-weekday planning | **No change** | **Change** (same as B) |
| **80% rule** | A rest-day skip is free in 5–6-habit plans, but **breaks the day in 3–4-habit plans** (common for fitness users) | Rest days aren't planned, so no penalty | Not an issue (no rest days needed) | As B |
| **Streak, XP, rest days** | Rest days cost streak and XP in small plans | Fair: fewer planned habits that day | Fair | Fair |
| **7-completion early level-up** | Rewards daily loading, the opposite of the "rest when sore" copy | **Must change** to 7 *sessions* (about 3 weeks at 2–3 a week) | Works as is | Must change, as B |
| **3-miss step-down** | Three rest or sore days step it down: gentle, arguably correct | **Must change** to missed *scheduled* sessions | Works | Must change |
| **Day 22 and 45 automatic level-ups** | Raise volume whatever the readiness; the physio must accept, or exempt it | Same question | **Risky:** support is reduced (two hands → one → fingertips) by the calendar, not by ability | Same |
| **Implementation complexity** | Low: library entry plus copy | High: weekday picker, Today filtering, session-based counters, "move a session", migration | Low, plus a screening step | High |
| **UX simplicity** | Simple | More complex (choose days; why isn't it on Today?) | Simple | More complex |

## Recommendation
**Release in two steps. Step 1 changes no core mechanics.**

**Step 1 (after physiotherapist sign-off): A + C as daily habits, choice-only at first.**
- **Gentle Strength Preparation**, daily "practice" dose:
  - named moves: sit-to-stand from a chair, wall push-up, heel raises at a support
  - Easy 1 move × 5 · Medium 2 moves × 5–8 · Hard 3 moves × 8–10, stopping well before it gets hard
  - copy: "Breathe normally. Stop if anything hurts. On a sore day, rest. That's fine."
- **Supported Balance Practice**, daily, only for people who pass the chair-stand screen.
- **Both choice-only** (offered in the choice step and swaps, never automatic) for the first testing round. Promote
  to automatic later, once real-device testing is done.
- **Exempt both from the automatic Day 22 and Day 45 level-ups** (they level up only by accepting the 7-day
  offer). This is a small, contained mechanics exception; see approval 3.

**Step 2 (separate approval, after Step 1 testing): B, scheduled strength sessions.** The only meaningful
option for already-active adults, and the evidence-aligned frequency for beginners. Skip D: daily balance (C)
already satisfies the frequency, so D's complexity buys little.

**Tradeoffs we accept in Step 1:**
- Daily strength practice is more frequent than guidance requires.
- In 3–4-habit plans a rest day breaks the 80% day.

Both are mitigated by the tiny dose and the "rest when sore" copy, and both go away in Step 2.

## Smallest safe path by group (no new quiz questions unless approved)
| Group | Today | Step 1 (after review) | Needs |
|---|---|---|---|
| **Inactive adults** | Walk (5–10 min) + a required choice of non-fitness habits | Strength Preparation (standard, named moves) offered in the choice step and swaps | Physio or exercise-professional sign-off on moves and reps |
| **65+** | Walk + honest note | Gentle Strength (choice) + Supported Balance (choice, **after the chair-stand screen**) | Physio sign-off; **approval for the screen** (a quiz question, or a check shown when Balance is chosen) |
| **Joint discomfort** | Walk + safety note | Gentle Strength (choice) | Physio wording for joint pain (stop if it hurts, or NICE's "pain may rise at first") |
| **Limited mobility** | No movement habit + note | Seated Mobility (choice only; visible with the existing "walking or standing is difficult" answer) | Physio review, including wheelchair users. No new question needed for the first version; a neck-problems option is optional |
| **Already active (3+ days)** | No fitness habit + "strong activity routine" | **No change.** A daily habit would be invented busywork | Step 2 (scheduled sessions) |
| *Heart/BP, pregnancy* | No movement habit + clinician or midwife note | No change | Clinician and midwife review |

## Owner approvals needed
1. **Physiotherapist review and sign-off** of the protocols: moves, reps, hold times, support levels, stop
   rules and joint-pain wording (questions are in `SCHWUNG_V2_NEXT_MILESTONE.md`, §2).
2. **Daily frequency for strength practice** (Option A), with the "rest when sore" copy, knowing a rest day
   breaks the 80% day in 3–4-habit plans.
3. **Mechanics exception:** exclude Gentle Strength and Supported Balance from the **automatic Day 22 and
   Day 45 level-ups**, so they level up only through the accepted 7-day offer. Step-down stays as is.
4. **The balance screen:** a new quiz question ("Can you get up from a chair and stand for about a minute without
   help?"), **or** a one-time check shown when Balance is chosen.
5. **Choice-only first release** for Gentle Strength, Strength Preparation and Balance; later promotion to
   automatic needs a further decision.
6. **Optional new precautions:** fall in the last year, dizziness or vertigo, recent surgery or fracture, neck
   problems.
7. **Step 2 (separate approval):** scheduled habits. Per-weekday planning, Today showing only scheduled habits,
   early level-up counted in sessions, step-down on missed scheduled sessions, moving a session, and the
   saved-data change.
