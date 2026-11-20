# Schwung V2 — Full Experience Review

**Date:** 2026-10-24 · **Base:** `d4c461c` (20 habits in the development gate) · **Flag:** V2 still `__DEV__`-only.

**How it was tested:**
- **Automated:** the Jest suites below, which test the engine, the store and saved data directly.
- **Real app in a browser:** the Expo **web** build in Chromium, at iPhone size (390×844, @2x), driven by
  Playwright. Each profile used a fresh, isolated browser storage; no real user data was touched.
- **Not tested on a physical iPhone or in Expo Go.** A browser run is not equivalent:
  - The time pickers don't work on web, so wake and bed times stayed at the defaults (07:00 and 23:00).
  - React Native's confirm dialog doesn't run on web, so removing a habit was tested in the store only.
  - Haptics, VoiceOver and native gestures were not exercised.

---

## 1. Executive summary
- **All 8 profiles:** completed onboarding → plan → reminder → Day 1 → Today in the real web build, with **no
  page errors**.
  - The right conditional questions appeared every time, and the saved data was version 2 with
    `programVersion: 2`.
- **Mechanics work in the app:**
  - the 80% rule, XP and streaks
  - the 7-day level-up offer and accepting it
  - Day 22 and Day 45 level-ups with personal targets
  - the gentle step-down
  - swapping in at Easy mid-program
  - saving across a reload
  - resuming an interrupted onboarding
  - switching the preview off mid-program, with nothing changed
  - flag off → V1 onboarding
- **Recommendations are personal and safe.** Every target comes from the person's own baseline; teens get no
  adult habits; precautions exclude as specified; no health claims appear.
- **Fixed (copy and UX only):**
  - reasons now read as one natural sentence
  - the duplicate "Picked for …" line is gone
  - the plan title is right when choices are required
  - fitness notes no longer stack
  - "If you train already" is no longer shown to inactive people
  - "How it grows" now uses a real habit
- **Biggest weakness: the Fitness goal.** It is honest but thin for anyone who can't walk, is pregnant or has a
  heart condition, is 65+, or already trains (section 6).
- **Recommendation:** ready for **wider internal development testing on iPhone (TestFlight or Expo Go)**. **Not
  ready for public release** (section 9).

## 2. Results for all eight profiles
Questions came from the real quiz. ✓ = verified in the browser and by the engine.

| Profile | Conditional questions | Habits | Goal met? | Safety | Notes |
|---|---|---|---|---|---|
| A · 16, focus | No sugary-drinks question (teen) ✓; phone-pull ✓; W1 ✓ | 5 | ✓ Two focus habits | No bedtime, food or drinks habit (teen) ✓; deep work capped at 60 ✓ | W1 asked because Social-free start is wake-anchored |
| B · 19, confidence | sugary ✓; phone-pull ✓; no time questions | 5 | ✓ Two confidence habits | Skipped health questions → no bedtime; walk safety note; "check with a professional" ✓ | Start a conversation not offered (the plan is already full) |
| C · 28, energy | all ✓; W1 and W2 ✓ | 5 | ✓ Four energy habits | 9 h time-in-bed ceiling ✓ | Strongest plan |
| D · 35, calm | all ✓; W1 ✓ | 5 | ✓ Four calm habits | Sleep trouble → no bedtime, wind-down starts one step up, see-a-doctor note ✓; breathing note ✓ | Two phone rules (the maximum) |
| E · 45, discipline | no phone-pull (1–2 h) ✓; W1 ✓ | 4 + optional | ✓ | — | W1 asked only because an *optional* choice uses the wake time |
| F · 67, fitness, joint | no phone-pull ✓; W1 ✓ | 3 + optional | ◐ Walk only | Joint pain → walk safety note; strength and balance held ✓ | Thin; the honest notes show |
| G1 · very active, fitness | W1 ✓ | 1 + **2 required** | ✗ No fitness habit (by design) | "Strong activity routine" copy ✓; no strength preparation ✓ | Required choices aren't fitness-related |
| G2 · organised, discipline | W1 ✓ | 3 + optional | ✓ | — | First task starts one rung up (they already plan) ✓ |

## 3. Habit recommendations and progression (engine output with the exact fixture times)
Easy → Medium → Hard. Easy runs days 1–21, Medium from Day 22, Hard from Day 45. ★ = goal habit. Every plan
starts with **Make your bed**, so it's left out below.

| Profile | Habit | Easy | Medium | Hard | Reason shown |
|---|---|---|---|---|---|
| A | Social-free start ★ | 30 min after waking | 1 h | 2 h | "You're on your phone 6+ hours a day, mostly social media." |
| A | Deep work ★ | 15 min | 25 min | 45 min (teen cap 60) | "One protected block of focus." |
| A | Phone-free wind-down | 15 min before bed | 30 | 45 | "You sleep 6–7 hours." |
| A | Walk | 10 min | 15 | 20 | "You're active 1–2 days a week." |
| B | Reach out ★ | 1 person | 2 | 3 | "A quick message to someone you care about." |
| B | Genuine compliment ★ | 1 | 2 | 3 | "Noticing what others do well." |
| B | Walk (+ safety note) | 10 min | 15 | 20 | "You're active 1–2 days a week." |
| B | Fruit and veg | 2 portions | 3 | 4 | "You eat 1–2 portions of fruit and veg a day." |
| C | Earlier bedtime ★ | in bed by 00:15 | 00:00 | 23:45 | "You sleep 6–7 hours." |
| C | Walk ★ | 5 min | 10 | 15 | "You're not active on most days yet." |
| C | Fruit and veg ★ | 1 portion | 2 | 3 | "You eat hardly any fruit and veg." |
| C | App limit ★ | videos under 60 min | 45 | 30 | "You're on your phone 2–4 hours a day, mostly videos." |
| D | Phone-free wind-down ★ | 30 min | 45 | 60 | "You have trouble sleeping on most nights." |
| D | Walk ★ | 10 min | 15 | 20 | "You're active 1–2 days a week." |
| D | Social-free start ★ | 30 min | 1 h | 2 h | "You're on your phone 6+ hours a day, mostly social media." |
| D | Slow breathing ★ (+ note) | 2 min | 3 | 5 | "A few slow minutes to take the edge off." |
| E | First task ★ | write #1 task | + 10 min on it first | + 25 min | — |
| E | Deep work ★ | 15 min | 25 | 45 | — |
| E | Journal ★ | 1 sentence | 2 | 3 | — |
| F | Walk ★ (+ safety note) | 5 min | 10 | 15 | "You're not active on most days yet." |
| F | Steady wake-up | within 60 min of 07:30 | 45 | 30 | "You have trouble sleeping 1–2 nights a week." |
| G1 | (required choice of 2 from) | Morning daylight, Deep work, First task, Reach out, Compliment | | | |
| G2 | First task ★ | + 10 min first | + 25 | + 45 | — |
| G2 | Deep work ★ | 15 min | 25 | 45 | — |

**Are the new habits realistic by Day 45?**

| Habit | Assessment |
|---|---|
| Walk | Practical. The largest Hard is 30 min (for people active 3–4 days) |
| Earlier bedtime | Practical: at most 45 min earlier by Day 45, under the ceiling |
| Phone-free wind-down | 60 min at Hard for heavy users with sleep trouble is ambitious but stepwise |
| Slow breathing | Gentle (2 → 5 min) |
| Fruit and veg | +2 portions over 66 days. Practical |
| Unsweetened drinks | ~~The step from "twice today" to "all drinks unsweetened" is large~~ **Resolved:** swap 1 → up to 2 → up to 3 |
| Water with meals | Practical |
| Start a conversation | **3 conversations a day at Hard may be unrealistic** for the people who choose it (see 6.4) |

## 4. UX problems identified
| # | Problem | Status |
|---|---|---|
| U1 | Reasons stitched three fragments together ("You sleep 6–7 hours. Getting into bed a little earlier than you do now. Picked for more energy.") and repeated the "For your goal" tag | **Fixed:** one sentence: the person's answer, or what the habit is |
| U2 | With a required choice, the title read "1 habit. Starting where you are." | **Fixed:** counts the required picks ("3 habits") |
| U3 | Fitness plans with heart, pregnancy or mobility precautions showed 3 stacked notes, including a strength-sessions line and "None of our current fitness habits suit…" | **Fixed:** only the precaution note shows |
| U4 | Inactive people were told "If you train already, keep going." | **Fixed:** only for people active 1+ days |
| U5 | "How it grows" showed Make your bed for plans with only the foundation habit | **Fixed:** uses the first chosen habit |
| U6 | W1 (wake time) is asked even when only an *optional* alternative needs it (E, G1, G2) | **Needs approval** (6.1) |
| U7 | Onboarding is 10–11 questions plus 0–2 time questions, against 6 in V1. Sleep hours and sleep trouble are separate steps; the spec puts them on one screen | **Needs approval** (6.2) |
| U8 | Required choices for fitness offer non-fitness habits (daylight, deep work…), because nothing else is cleared | Honest; fixed only by the held fitness habits (section 6) |
| U9 | Quiz answers aren't saved until the last question, so leaving mid-quiz restarts it (same as V1). Leaving at the time questions resumes correctly ✓ | Note |
| U10 | The level-up offer card is translucent; scrolled over the artwork, trail markers show through its text (pre-existing Today style, also in V1) | Note; not changed (visual identity) |
| — | Questions are clear and the safety notes are calm, not alarming. The "How it grows" plus the two rule lines explain Day 22/45, early level-ups and step-downs. The design matches Quiet Ascent | OK |

## 5. Bugs fixed
U1–U5 (copy and presentation; no change to thresholds, eligibility, precautions or mechanics). New tests cover
reason wording, fitness-note de-duplication, and removing V2 habits down to the minimum of 3.

**No functional bugs** were found in navigation, conditional questions, baselines, ordering, persistence or
migration.

## 6. Changes requiring owner approval
1. **Ask W1 only when needed:** skip the wake-time question if only an optional alternative uses it, and ask
   it after the choice if one is picked. This saves a question for E, G1 and G2.
2. **Merge sleep hours and sleep trouble onto one screen** (as the spec says). This shortens the quiz by one
   step.
3. **Unsweetened drinks Hard:** use "three times today" (or "most drinks today") instead of "all your drinks
   today".
4. **Start a conversation:** a gentler ladder, e.g. 1 a day → 1 a day, including one new person a week → 2 a
   day; or a psychologist reviews it first.
5. **Fitness, in order of benefit:**
   - **a.** Get physiotherapist review and release **Gentle Strength Preparation** and **Supported Balance**
     (biggest gain: 65+, joint pain, inactive adults).
   - **b.** Get expert review and release the standard **Strength preparation** with named moves (inactive
     adults, teens).
   - **c.** **Seated Mobility** (people who find walking or standing difficult; physiotherapist review,
     including wheelchair users).
   - **d.** **Scheduled strength sessions**: this needs a mechanics change; it's the only fitness option for
     people who already train.
6. Optional: when the plan has fewer than 5 habits, offer a referral line ("Ask your GP about a local strength
   and balance class") for 65+ fitness users.

**Where the Fitness goal can't give a meaningful plan today:**

| Group | What V2 gives | Gap |
|---|---|---|
| Completely inactive adult | Walk (5 min) + 1 required choice | No strength (pending review); the plan is 3 habits |
| Teen | Walk + wind-down (if needed) | No strength, which teen guidance stresses (3+ days); food habits excluded |
| Already training (3+ days) | Walk at 20 min (3–4 days) or no fitness habit (5+) + choices | Nothing training-related; needs scheduled sessions |
| 65+ | Walk (5 min) + note | No balance or strength (held). WHO recommends them 3+ days a week |
| Joint pain | Walk + safety note | No gentle strength (held) |
| Limited mobility | No movement habit + note | Seated mobility held |
| Heart condition or pregnancy | No movement habit + note | Waiting for clinician or midwife review |

## 7. Remaining scientific and safety blockers
These are unchanged from `SCHWUNG_V2_RELEASE_READINESS.md`:
- full-text verification of every source (all search-level so far)
- expert review: sleep specialist (9 h ceiling, teens), clinician and midwife (walk and breathing with
  heart/BP or in pregnancy), physiotherapist (joint-pain wording, all fitness designs), psychologist (panic and
  breathing, social anxiety), eating-disorder-informed dietitian (teen fruit and veg), diabetes educator
- App Store age rating and regional consent rules

**Verified in this review (tests and the browser):**
- teens never get Earlier bedtime, Fruit and veg or Unsweetened drinks
- skipped health questions mean no Earlier bedtime and no Strength preparation, plus a "check with a
  professional" note
- heart/BP and pregnancy exclude Walk, Slow breathing and Strength preparation
- walking difficulty excludes all movement habits
- a sleep condition or sleep trouble excludes Earlier bedtime
- the low-blood-sugar note always comes with Unsweetened drinks
- none of the habit copy makes outcome claims ("improve", "boost", "health", "energy" and similar were
  searched for)

## 8. Testing results
- **Automated:**
  - Jest: **224 tests in 13 suites pass**. These cover:
    - V1 plan, progression, comeback, dates, onboarding, ascent, world and theme
    - V2 engine and safety
    - the release gate and adapter
    - the quiz conditions
    - the store: flag, onboarding paths, progression, swaps, removal, persistence, legacy saves
  - TypeScript `--noEmit`, `expo lint` and Prettier: clean.
- **Browser (Expo web, Chromium, 390×844):**
  - Eight onboardings, each in a fresh context: the right questions, the right plans, Day 1 ceremony "Built
    for {goal}", Today shows personal targets, saved data v2. No page errors.
  - Progression run (C answers):
    - Day 1 at 4/5 → "1-day streak" and 40 XP (80% rule); at 5/5 → 70 XP
    - 7 full days → "7 days straight" offer and a 7-day streak; accepting it moved that habit Easy → Medium
      (second run)
    - Day 22 → every habit up one personal step (e.g. "In bed by 22:30", "10 min walk")
    - Days 22–25 missed → the "Let's make this one easier for now" notice, habits back to Easy
    - swap on Day 26 → Steady wake-up at Easy, added on Day 26
    - Day 45 → phase 3 applied (Medium after the step-down, which is correct)
    - reload → same program
  - Flag tests: flag off → `/quiz` (V1). Welcome dev switch on → `/v2/quiz`. Switching the preview off
    mid-program → plan unchanged, `programVersion` 2.
  - Interrupted at the time question → Welcome offers "Pick up where you left off" → resumes at the time
    question.
- **Not done:** physical iPhone or Expo Go; VoiceOver; removing a habit in the browser (the dialog is
  unavailable on web, covered by store tests); custom time-picker values.

## 9. Recommendation
**Ready for broader internal development testing** on real iPhones with the dev flag (TestFlight dev build or
Expo Go). Focus testers on: the time pickers, plans for 16–17-year-olds, the fitness and calm goals, and the
level-up and step-down feel over real days.

**Not ready for public release** until the section 7 blockers are cleared and you decide on 6.1–6.5.
