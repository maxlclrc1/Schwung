# Schwung Habit Science 2.0 — Authoritative Specification (revision 4)

**Status:** approved direction, subject to scientific and safety verification. **Not implemented.**

This single document replaces revisions 1–3. Superseded rules have been removed, not marked: if a rule
isn't here, it isn't part of V2.

**How to read this.**
- **[AGREED]** is an owner decision.
- **[PROPOSED]** is Claude's design.
- **[FACT]** is the current code.
- **[PRODUCT]** is a number chosen by product judgment.
- **[VERIFY]** needs scientific or safety review.
- **[POP]** is population guidance from WHO or CDC (G).

**Changes from revision 3:**
1. Strength Starter can never be added automatically, including through the goal guarantee. Fitness plans
   always show the interim-program note.
2. Bedtime targets refer to **getting into bed**. The quiz asks for the usual in-bed time (not
   sleep-onset time), and sleep-onset is not used anywhere.
3. Fruit and veg targets are **portions per day**, independent of how many meals someone eats.
4. Need scores and the domain rules are now explicit (they were implicit before), so plans can be simulated
   exactly.
5. Q7 gains the routine "Waking up at about the same time every day" (so Steady wake-up isn't recommended to
   people who already do it). 5b lists juice. The App limit ladder starts at 120 min. Fruit and veg starts
   at 4 portions for a 3–4 baseline.

---

## 0. Principles [AGREED]
1. **Audience:** ages 16+ (16–17 and adults). The six goals stay.
2. **Plans:** aim for 5 daily habits (6 only via the goal rule); the engine proposes at least 4 (D.6); users
   can remove down to 3 [FACT].
3. **Program:** 66 days, with Foundation 1–21 / Momentum 22–44 / Mastery 45–66.
4. **Mechanics unchanged:** 80% daily success, XP, streaks, early level-up (offered after 7 in a row),
   step-down (after 3 missed final days), and the mandatory level-ups on day 22 and day 45 [FACT].
5. **Make your bed** is always the first habit and starts at easy.
6. **Never:** height, weight, BMI, calories, weight-loss targets or fasting. No restrictive diet for under-18s.
7. **Cold exposure** isn't in V2. **Hydration** is add-only, with no quantities. **Reading** is in minutes.
8. **Existing users:** V1 plans are untouched, and V1 swaps use the legacy library. A voluntary upgrade is
   deferred.
9. **Technical limits:** offline, deterministic, no account, backend, analytics, AI messages or new
   libraries.
10. **Science:** population guidance (G) informs product choices, but **no ladder is described as clinically
    validated**. User-facing claims ship only when verified (H2).

---

## A. Quiz [PROPOSED]
- No answer is pre-selected.
- "Skip" on precautions means **unknown**, never "none".
- Under 16 stops onboarding (C.1).

| # | Copy | Options (value) | Shown when |
|---|---|---|---|
| 1 | How old are you? | Under 16 (`u16`) · 16–17 · 18–29 · 30–49 · 50–64 · 65 or older | Always |
| 2 | What do you want most right now? | More energy · Better focus · More discipline · More confidence · Less stress · Get in shape | Always |
| 3a | How many hours do you usually sleep on a school or work night? | Less than 6 · 6–7 · 7–8 · 8–9 · More than 9 | Always |
| 3b | How often do you have trouble falling asleep, staying asleep, or waking too early? | Rarely · 1–2 nights a week (`some`) · 3+ nights a week (`most`) | Always (same screen) |
| 4a | On how many days a week do you do at least 20 minutes of activity that makes you breathe harder? | 0 · 1–2 · 3–4 · 5+ | Always |
| 4b | Do you do muscle-strengthening exercise (weights, bodyweight, bands, climbing)? | Not at the moment · About once a week · Twice a week or more | Goal is fitness or confidence, or age 50+ (same screen) |
| 5a | On a typical day, how many portions of fruit and vegetables do you eat? A portion is about a handful (roughly 80 g). Potatoes don't count. | Hardly any (`0`) · 1–2 · 3–4 · 5+ · I'd rather skip food questions (`skip`) | Always |
| 5b | How often do you have sugary drinks (soda, energy drinks, sweetened coffee or tea, juice)? | Most days · A few times a week (`some`) · Rarely or never | 18+ and 5a ≠ skip (same screen) |
| 6a | Outside work or school, about how long are you on your phone each day? | Under 1 h · 1–2 h · 2–4 h · 4–6 h · 6 h+ · Not sure (`unknown`) | Always |
| 6b | What takes most of that time? | Social media · Videos · Games · Messages and news · A mix | 6a ≥ 2–4 h or unknown (same screen) |
| 7 | Which of these are already part of most of your days (5+ days a week)? | Reading 10+ min · Breathing or meditation · Journaling · Planning my day · A 30+ minute walk · Phone out of reach 30 min before sleep · Waking up at about the same time every day · Making my bed · None of these | Always |
| 8 | Anything we should keep in mind? (optional, stays on your phone) | Joint, back or injury pain · Heart or blood-pressure condition · Pregnant or recently gave birth · A clinician told me to limit fluids · Diagnosed sleep condition · None of these · Skip | Always |
| W1 | What time do you usually get up on school or work days? | Time picker (no preset) · It changes a lot · I work shifts or nights | The provisional plan (D.7) has a wake-anchored or bedtime habit |
| W2 | What time do you usually **get into bed** on those nights? | Time picker (no preset) | Bedtime (#2) is in the provisional plan and W1 is a time |

---

## B. Library V2 [PROPOSED; targets PRODUCT; benefits VERIFY]
**Levels from rungs:**
- Start rung `r0` comes from the baseline. The window starts at `s = min(r0, rungs − 3)`.
- **Easy = rung s, Medium = s+1, Hard = s+2.** The stored level stays easy/medium/hard [FACT].
- Every rung in a user's ladder variant is an appropriate target for that user. The top rung is the
  ceiling.

**Already doing:** a habit isn't offered when a routine (Q7) is the same behavior, or when the baseline is
at or above the top rung.

**Goal roles:** ★ = core, · = support. Strength Starter has **no** goal role (add-only).

| # | ID | Habit | Ages | Goals | Start rung | Ladder | Exclusions / variants | Draft "why" (claim-free) |
|---|---|---|---|---|---|---|---|---|
| 1 | `discipline_bed` | Make your bed | 16+ | foundation | 0 | Make your bed · + clear one surface · + 2-min room reset | — | "A small win to start the day." Routine ticked: "You already do this, so it's an easy first check." |
| 2 | `sleep_bedtime` | Earlier bedtime | 16+ | energy ★, fitness · | 0 | In bed by (usual in-bed time − 15 / 30 / 45 / 60 min). Ceiling: wake − in-bed ≤ 9 h adult, 10 h teen; rungs above the ceiling are removed, and the habit isn't offered if fewer than 3 remain | **Candidate only if** sleep is below the age band (adult <7 h, teen <8 h) **and** trouble = rarely **and** no sleep condition **and** precautions ≠ unknown. W1 varies/shift → "In bed 15 / 30 / 45 / 60 min earlier than usual" | "Getting into bed a little earlier than you do now." |
| 3 | `sleep_wake` | Steady wake-up | 16+ | energy ★, discipline ★, focus · | 0 | Up within 60 / 45 / 30 / 15 min of {W1} | Not offered: W1 varies/shift, or the routine "same wake time" | "Getting up at about the same time each day." |
| 4 | `sleep_no_phone_bed` | Phone-free wind-down | 16+ | calm ★, energy · | trouble some/most → 1, else 0 | Phone away 15 / 30 / 45 / 60 min before bed | Not offered: routine "phone out of reach" | "A screen-free stretch before bed." |
| 5 | `sleep_morning_light` | Morning daylight | 16+ | energy ★, calm ·, focus · | 0 | Outside within an hour of waking for 5 / 10 / 15 / 20 min | Shift → "after your main sleep" | "Daylight early in your day." |
| 6 | `move_walk` | Walk | 16+ | energy ★, calm ★, fitness ★ | days 0 → 5 min; 1–2 → 10; 3–4 → 20; 5+ → offered only for energy or calm (20) | 5 / 10 / 15 / 20 / 25 / 30 / 40 / 50 / 60 min | Not offered: routine 30+ min walk. Notes: joint, heart/BP, pregnancy, unknown, 65+ ("at a comfortable pace; stop if it hurts") | "A daily walk at a comfortable pace." |
| 7 | `move_strength_starter` | Strength preparation | 16+ | none (add-only) | strength none → 0; once a week → 2; twice+ → not offered | 1 set of 1 move · 1 set of 2 · 1 set of 3 · 2 sets of 3. Gentle variant (65+, joint, unknown): sit-to-stands from a chair · + wall push-ups · + heel raises holding support · 2 rounds | **Never auto.** Excluded: heart/BP, pregnancy. Mandatory copy: "Practice for a strength routine, not a full strength workout. Guidelines recommend strength work on 2+ days a week." | — |
| 8 | `food_produce` | Fruit and veg | 16+ | energy ·, fitness · | hardly any → 1 portion; 1–2 → 2; 3–4 → 4; 5+ → not offered | Eat 1 / 2 / 3 / 4 / 5 portions of fruit or veg today | Excluded: food skip. Additive only. Mandatory copy: "Builds the habit. It doesn't measure whether your diet meets guidelines." | "Adding fruit and veg to your day." |
| 9 | `food_unsweetened` | Unsweetened drinks | **18+** | energy ·, fitness · | most → 0; some → 1; rarely → not offered | Choose water or an unsweetened drink instead of a sugary one: once / twice today · All drinks today unsweetened | Never under 18. Excluded: food skip | "An easy swap for a sugary drink." |
| 10 | `food_water_meals` | Water with meals | 16+ | — | add-only | A glass of water with 1 / 2 / 3 meals | Excluded: fluid limit | "A glass of water with meals, if it suits you." |
| 11 | `screen_morning` | Phone-free start | 16+ | energy ·, calm · | 6 h+ → 0; 2–6 h → 1; 1–2 h → 2; <1 h → not offered; unknown → 1 | No phone for the first 15 / 30 / 45 / 60 min after waking (an alarm doesn't count) | Overlap group `morning_phone`; phone rule | "Start the day before your phone does." |
| 12 | `screen_social` | Social-free start | 16+ | focus ★, calm · | 6 h+ → 0; 4–6 h → 1; 2–4 h → 2 | No social apps for the first 1 / 2 / 3 / 4 h after waking | Only if 6b = social. Overlap group `morning_phone`; phone rule | "Keep social apps out of your first hours." |
| 13 | `screen_app_limit` | App limit | 16+ | focus ·, calm ·, energy · | 6 h+ → 0; 4–6 h → 1; 2–4 h → 2 | Keep {videos / games / that app} under 120 / 90 / 60 / 45 / 30 min | Only if 6b = videos, games or a mix. Phone rule | "A daily limit on what pulls you in most." |
| 14 | `mind_read` | Read | 16+ | focus ★, calm · | 0 (focus: 1) | Read 5 / 10 / 15 / 20 / 30 min | Not offered: routine reading | "A few minutes of reading." |
| 15 | `mind_breathe` | Slow breathing | 16+ | calm ★, focus · | 0 | 2 / 3 / 5 / 8 / 10 min of slow breathing | Not offered: routine breathing. No breath-holding | "A few slow minutes to take the edge off." |
| 16 | `mind_journal` | Journal | 16+ | discipline ·, confidence ·, calm · | 0 | Write 1 / 2 / 3 / 5 sentences ("What went well? What's on your mind?") | Not offered: routine journaling | "A sentence or two to clear your head." |
| 17 | `focus_deepwork` | Deep work | 16+ (teen max 60) | focus ★, discipline · | 1 | 10 / 15 / 25 / 45 / 60 / 90 min, phone in another room | — | "One protected block of focus." |
| 18 | `focus_top3` | First task | 16+ | focus ★, discipline ★, calm · | routine planning → 1; else 0 | Write your #1 task · …and work on it 10 min first · 25 min · 45 min | — | "Decide your most important task and start with it." |
| 19 | `social_reach_out` | Reach out | 16+ | confidence ·, calm ·, energy · | 0 | Message or call 1 / 2 / 3 people you care about | — | "A quick message to someone you care about." |
| 20 | `confidence_talk` | Start a conversation | 16+ | confidence ★ | 0 | Start 1 / 2 / 3 conversations (in person or a call) | Opportunity-dependent (max 1 per plan) | "Small conversations make the next one easier." |
| 21 | `confidence_compliment` | Genuine compliment | 16+ | confidence ★ | 0 | Give 1 / 2 / 3 genuine compliments (a message counts) | — | "Noticing what others do well." |
| 22 | `move_strength_session` | Strength session | 16+ | fitness ★ | — | 2 sessions a week | **Scheduled: design only (E)** | — |

**Goal lists, in priority order:**
- **energy:** bedtime★, wake★, light★, walk★, then wind-down, produce, unsweetened, phone-free start, app
  limit, reach out
- **focus:** deep work★, first task★, social-free★, read★, then wake, light, breathe, app limit
- **discipline:** first task★, wake★, then deep work, journal
- **confidence:** talk★, compliment★, then reach out, journal
- **calm:** breathe★, wind-down★, walk★, then journal, phone-free start, social-free, app limit, reach out,
  first task, light
- **fitness:** walk★, then produce, unsweetened, bedtime, wake

**Fitness note (mandatory on every fitness plan):** "This first version only has daily habits, so it doesn't
include the strength sessions health guidelines recommend on 2+ days a week. If you train already, keep
going. You can add a Strength preparation routine any time."

---

## C. Age and safety [PROPOSED; VERIFY]
1. **Under 16:** a stop screen ("Schwung is made for people 16 and older…"). Nothing is saved. Back to start.
2. **16–17:** teen sleep band (needs 8+ h); never #9; food habits additive only; deep work ≤ 60 min; "school"
   wording. Plans keep their age band until Restart.
3. **65+:** gentle variant for #7 (if added); walk note.
4. **Precautions:**
   - joint → gentle #7, walk note
   - heart/BP → no #7, walk note
   - pregnancy → no #7, walk note
   - fluid limit → no #10
   - sleep condition → no #2
   - food skip → no #8–10
   - **unknown** → gentle #7, walk note, no #2, plus a plan note: "If you have a health condition, check
     these with a professional."
5. **Sleep trouble:** `most` → no #2, plus a professional note [VERIFY wording]. `some` → no #2.

---

## D. Algorithm [PROPOSED]

### D.1 Need scores (0–4)
- **Sleep** = max(duration, trouble):
  - duration, adult: <6 → 4; 6–7 → 3; 7–8 or more → 0
  - duration, teen: <6 → 4; 6–7 → 3; 7–8 → 2; 8+ → 0
  - trouble: most → 4; some → 2; rarely → 0
- **Activity:** days 0 → 4; 1–2 → 3; 3–4 → 1; 5+ → 0.
- **Nutrition** = max(produce, sugary):
  - produce: hardly any → 4; 1–2 → 3; 3–4 → 1; 5+ or skip → 0
  - sugary (adults): most → 3; some → 1; rarely → 0
- **Digital:** 6 h+ → 4; 4–6 → 3; 2–4 → 2; unknown → 2; 1–2 → 1; <1 → 0.
- **Mind:** no question. Mind habits enter only through the goal.

### D.2 Pool
1. Released specs only.
2. Age-allowed.
3. Not excluded by precautions, trouble or W answers.
4. Daily only.
5. Not "already doing".
6. Not add-only (#7, #10).

### D.3 Domain choice (when need ≥ 2)
- **Sleep:**
  - trouble most/some or a sleep condition → #4, else #5
  - otherwise (duration need) → #2 if a candidate, else #4
- **Activity:** #6.
- **Nutrition:**
  - produce need ≥ 2 → #8
  - additionally, for adults with sugary = most and goal energy or fitness → #9 (at most 2 food habits)
  - produce need < 2 and sugary = most → #9
- **Digital:**
  - 6b social → #12
  - videos, games or a mix → #13
  - otherwise → #11

### D.4 Steps
1. **Foundation:** #1.
2. **Needs:** for each domain in order sleep, activity, nutrition, digital with need ≥ 2, add the domain
   choice if it `fits`.
3. **Goal guarantee:**
   - if no pick is core for the goal, add the first core in goal order that `fits` (preferring a new domain)
   - if that makes 7, drop the answer pick with the lowest need that isn't core (ties drop the later domain)
   - if no core is eligible, the plan has none and says so
4. **Fill to 5:** goal list in order, then other domains by need (≥ 1). Each must `fit` and be **suitable**
   (domain need ≥ 1, or listed for the goal).
5. **Fewer than 4:** go to the choice step (D.6).
6. **Order:** foundation, then habits for the goal (core or support) in selection order, then the rest.

**fits:**
- not already in the plan
- overlap group unused
- at most 2 phone rules (#4, #11, #12, #13)
- at most 2 per domain
- at most 1 opportunity-dependent habit

### D.5 Reasons
Fixed templates from tokens, e.g. "You sleep 6–7 hours. {why}", plus a goal tie when the habit serves the
goal.

### D.6 Choice step (fewer than 4)
Show "Choose one more?" with up to 3 eligible habits (they pass every filter, including add-only ones) and a
"Keep {n}" option.

The 80% rule is unchanged [FACT], so the threshold depends on plan size:

| Habits | A day counts at | Habits that can slip |
|---|---|---|
| 3 | 3 of 3 | 0 |
| 4 | 4 of 4 | 0 |
| 5 | 4 of 5 | 1 |
| 6 | 5 of 6 | 1 |

### D.7 W questions
1. Compute the provisional plan as if W1 were a regular time.
2. If it needs W1 or W2, ask them **once**, then recompute.
3. "Changes a lot" or "shifts" → #3 is excluded, and the other habits switch to their relative or duration
   forms. Never asked twice.

---

## E. Scheduled habits: design only, not approved
- **What it is:** a habit planned on chosen weekdays.
- **Today screen:** shows only today's planned habits, plus a "Not today" line for scheduled habits that
  aren't due.
- **What stays the same:**
  - **80% rule:** uses each day's own planned list [FACT].
  - **XP and streaks:** unchanged.
  - **Phase level-ups:** unchanged.
  - **Yesterday edits:** each day's log keeps its own planned list [FACT].
  - **Journey:** unchanged.
- **What would change (⚠ mechanics):**
  - **early level-up** would count consecutive scheduled sessions
  - **step-down** would count consecutive missed scheduled sessions
- **Moving a session:** "Do it today" once per session, within the same week, only while the original day
  is still editable.
- **Rest days:** unscheduled days are rest days.

---

## F. Compatibility [AGREED and PROPOSED]
1. **New optional saved fields:** `programVersion`, `profile`, and per-habit `spec` (id, version, startRung,
   variant, anchors). Saved-data version stays 1 [FACT: the store merges saved data over defaults].
2. **V1 plans stay unchanged.** They render through the frozen legacy library, and V1 swaps use that library
   with the phase level [FACT].
3. **V2 starts only on a fresh start or Restart.** V2 swaps take the user's baseline window.
4. **No automatic upgrade.** A voluntary upgrade is deferred.
5. **Logs store only habit IDs,** so history stays valid.

---

## G. Population guidance [POP]
Retrieved via web search results citing these pages, 2026-10-23. The pages couldn't be opened from the
build environment, so wording must be re-checked before anything is quoted in the app.
- **Adults:** 150–300 min/week moderate (or 75–150 vigorous) aerobic activity, and muscle-strengthening on 2+
  days/week ([WHO](https://who.int/initiatives/behealthy/physical-activity),
  [CDC](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html)).
- **65+:** add balance; with poor mobility, balance activity on 3+ days/week
  ([WHO](https://who.int/initiatives/behealthy/physical-activity),
  [CDC](https://www.cdc.gov/physical-activity-basics/guidelines/older-adults.html)).
- **Ages 5–17:** an average of 60 min/day of moderate-to-vigorous activity across the week; muscle and bone
  strengthening on 3+ days/week ([WHO](https://iris.who.int/server/api/core/bitstreams/f3885485-e7eb-4504-8026-edd9bb53a6ee/content)).
- **Sleep:** teens 8–10 h; adults 18–60, 7+ h ([CDC](https://www.cdc.gov/sleep/about/index.html)).
- **Diet:** at least 400 g fruit and veg a day (about five portions; potatoes excluded); free sugars under 10%
  of energy ([WHO](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)).

---

## H. Open items
1. **App Store age rating.**
2. **Release gate:** may habits ship with claim-free text before their evidence is verified?
3. **Safety questions** (unchanged from rev 3): unknown precautions and bedtime; sleep-trouble wording and
   referral; the 9 h / 10 h ceilings; gentle strength for 65+, joint and heart/BP; walking notes for
   pregnancy and heart/BP; teen nutrition and disordered eating; unsweetened drinks and diabetes care plans;
   breathing cautions; under-16 and regional rules; re-checking the WHO and CDC figures.
4. **Findings from `SCHWUNG_V2_PLAN_VALIDATION.md`** (must be resolved before coding).
