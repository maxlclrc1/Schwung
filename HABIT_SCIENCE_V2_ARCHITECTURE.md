# Schwung Habit Science 2.0 — Authoritative Specification (revision 6)

**Status:** approved direction. The engine is implemented as pure TypeScript in `src/core/v2/`. It is connected
to the app **only behind the development flag** (`SCHWUNG_V2_DEV_INTEGRATION.md`), through the release gate in
`src/core/v2/gate.ts`. It is not released to users.

All scientific and safety claims remain **[VERIFY]**.
- **[AGREED]** is an owner decision.
- **[PROPOSED]** is Claude's design.
- **[FACT]** is the current code.
- **[PRODUCT]** is a product-chosen number.
- **[POP]** is WHO or CDC population guidance (section G). Population guidance is **not** evidence that any
  particular rung works or is universally safe.

## Change log (revision 5 → 6: evidence and safety review, 2026-10-24)
Source access was search-level only; see `SCHWUNG_V2_EVIDENCE_REGISTER.md`.

| # | Change | Why |
|---|---|---|
| 1 | **Earlier bedtime (#2): not for 16–17** (pending sleep-expert review); not when W1 is "varies" or "shift"; never started without W1 and W2 times. Mandatory note: "Go to bed when you feel sleepy. If you lie awake for a long time, it's fine to keep your usual bedtime." | Teen circadian delay and early school starts (AAP 2014); the time-in-bed ceiling needs both times; sleep-hygiene advice to go to bed when sleepy |
| 2 | **Walk (#6): not offered with heart/BP or pregnancy** (needs individual advice; pending expert review). Joint, 65+ and unknown keep it, with the note: "Keep it comfortable and stop if it hurts. Stop and get medical help if you have chest pain, feel faint, or are much more out of breath than usual." | ACOG 804 (safe *without* complications, after clinical evaluation); heart-condition limits are individual |
| 3 | **Slow breathing (#15): not offered with heart/BP or pregnancy** (pending expert review). Mandatory note: "Breathe gently and comfortably, without holding your breath. If you feel dizzy, light-headed or panicky, stop and breathe normally." | No systematic adverse-event data; light-headedness is reported in small trials |
| 4 | **Fruit and veg (#8): not for 16–17** (pending expert review). The note adds: "If counting food ever feels stressful, swap this habit." | Food tracking is associated with disordered eating (cross-sectional) |
| 5 | **Unsweetened drinks (#9):** the note adds "If you have diabetes, your care team's advice comes first." | ADA puts water first for drinks, but individual regimens vary |
| 6 | **Start a conversation (#21):** note "Any short chat counts, even a quick 'how's your day?'. If it feels like too much, swap it for something else." | Voluntary; avoid pressure for socially anxious users |
| 7 | **Plan notes:** heart/BP or pregnancy → "Movement and breathing habits for heart conditions and pregnancy are waiting for expert review. Your clinician or midwife can advise what's right for you." Fitness and 65+ → "Guidelines also recommend balance and strength activities for older adults. Schwung's versions are still being reviewed, so they aren't included yet." Fitness, active 3+ days, no fitness habit → the approved "strong activity routine" copy | Honest gaps, no invented habits |
| 8 | **Strength preparation (#7): not offered to people active 3+ days a week** | Owner instruction: no unnecessary strength preparation |
| 9 | **Development gate:** #2, #4, #6, #8, #9, #10, #15 and #21 join the 12 habits already cleared. #7 stays out (pending expert review). #22, #23 and seated mobility stay held | Evidence register statuses |

## Change log (revision 4 → 5)
| # | Change | Why |
|---|---|---|
| 1 | **Goal-first selection:** foundation → up to 2 goal habits (at least one core where eligible) → up to 2 need habits → prefer 5; a 6th only for an unaddressed need of 4 (the maximum) | Validation L1: focus and confidence plans had 1 goal habit |
| 2 | **Window: Easy = the baseline rung.** If fewer than 3 rungs remain from the baseline, the habit is not offered | L3: Easy fell below baseline |
| 3 | **Confidence:** Reach out ★ and Compliment ★ are core. Start a conversation is **never automatic** (choice step, swaps or Add only) | L4: opportunity and feasibility |
| 4 | **Strength follow-up (old 4b) removed.** Strength preparation, when the user adds it, starts at rung 0 | L5 |
| 5 | **At most 1 nutrition habit automatically**; others via swaps or Add | L7 |
| 6 | **No low-need filler:** fill only with goal-listed habits or domains with need ≥ 2 | L8 |
| 7 | **Plan size and choice step defined exactly**, including the alternatives order and a hard minimum of 3 | L6 |
| 8 | **V2 swaps start at Easy** of the user's baseline window, whatever the phase. Phase progression of existing habits is unchanged | L10 |
| 9 | **Balance practice (#23) designed but held**, along with the gentle Strength preparation variant. A new precaution, "Walking or standing for long is difficult for me", excludes movement habits until a reviewed alternative exists. A note is not treated as a solution | S1, S2 |
| 10 | **Documentation contradictions removed:** Strength preparation has no goal role and is never selected automatically; Phone-free wind-down requires phone use; `food_produce` for a 3–4 baseline is not offered (no room above the baseline) | L2, decision 10 |

---

## 0. Principles [AGREED]
- **Audience:** 16+. The six goals stay.
- **Program:** 66 days and three phases; 80% daily success; XP, streaks, early level-up, step-down and the
  day-22 and day-45 level-ups unchanged [FACT].
- **Make your bed** is always first, at Easy.
- **Never:** weight, BMI, calories, fasting, restrictive diets; no restrictive diet for minors. No cold
  exposure in V2. Hydration is add-only, with no quantities. Reading is in minutes.
- **Existing users:** V1 plans are unchanged; V1 swaps use the legacy library; the voluntary upgrade is
  deferred.
- **Technical limits:** offline, deterministic, no account, backend, analytics, AI messages or new
  dependencies.

## A. Quiz [PROPOSED]
No answer is pre-selected. Skipping precautions means **unknown**, never "none".

| # | Copy | Options | Shown when |
|---|---|---|---|
| 1 | How old are you? | Under 16 · 16–17 · 18–29 · 30–49 · 50–64 · 65 or older | Always. Under 16 → stop screen (C.1) |
| 2 | What do you want most right now? | More energy · Better focus · More discipline · More confidence · Less stress · Get in shape | Always |
| 3a | How many hours do you usually sleep on a school or work night? | Less than 6 · 6–7 · 7–8 · 8–9 · More than 9 | Always |
| 3b | How often do you have trouble falling asleep, staying asleep, or waking too early? | Rarely · 1–2 nights a week · 3+ nights a week | Always (same screen) |
| 4 | On how many days a week do you do at least 20 minutes of activity that makes you breathe harder? | 0 · 1–2 · 3–4 · 5+ | Always |
| 5a | On a typical day, how many portions of fruit and vegetables do you eat? A portion is about a handful (roughly 80 g). Potatoes don't count. | Hardly any · 1–2 · 3–4 · 5+ · I'd rather skip food questions | Always |
| 5b | How often do you have sugary drinks (soda, energy drinks, sweetened coffee or tea, juice)? | Most days · A few times a week · Rarely or never | 18+ and 5a isn't skipped |
| 6a | Outside work or school, about how long are you on your phone each day? | Under 1 h · 1–2 h · 2–4 h · 4–6 h · 6 h+ · Not sure | Always |
| 6b | What takes most of that time? | Social media · Videos · Games · Messages and news · A mix | 6a ≥ 2–4 h or Not sure |
| 7 | Which of these are already part of most of your days (5+ days a week)? | Reading 10+ min · Breathing or meditation · Journaling · Planning my day · A 30+ minute walk · Phone out of reach 30 min before sleep · Waking up at about the same time every day · Making my bed · None of these | Always |
| 8 | Anything we should keep in mind? (optional, stays on your phone) | Joint, back or injury pain · Walking or standing for long is difficult for me · Heart or blood-pressure condition · Pregnant or recently gave birth · A clinician told me to limit fluids · Diagnosed sleep condition · None of these · Skip | Always |
| W1 | What time do you usually get up on school or work days? | Time · It changes a lot · I work shifts or nights | The provisional plan has a wake-anchored or bedtime habit |
| W2 | What time do you usually get into bed on those nights? | Time | Earlier bedtime is in the provisional plan and W1 is a time |

## B. Library [PROPOSED; targets PRODUCT; benefits VERIFY]
**Window:**
- Start rung `r0` comes from the baseline. **Easy = r0, Medium = r0+1, Hard = r0+2.**
- If `r0 + 2` is past the last rung, the habit is **not offered** ("no room above your current level").

**Release status:**
- `candidate`: the engine may use it while it's built and validated. Shipping still requires review (H2).
- `held`: never used.

**Selection modes:**
- **auto:** goal and need steps.
- **choice:** the choice step only.
- **add:** swaps and Add only.

| # | ID | Habit | Mode | Release | Ages | Goal roles | r0 (baseline) | Rungs | Not offered / variants |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `discipline_bed` | Make your bed | foundation | candidate | 16+ | — | 0 | Make your bed · + clear one surface · + 2-min room reset | — |
| 2 | `sleep_bedtime` | Earlier bedtime | auto | candidate | **18+** (16–17 pending review) | energy ★ | 0 | In bed by (usual in-bed − 15/30/45/60); ceiling: time in bed ≤ 9 h [PRODUCT] | Only if sleep is below the band (adult <7 h), trouble is rarely, no sleep condition, precautions are known, and W1 is a time. Started only with W1 and W2 answered. Note: go to bed when sleepy |
| 3 | `sleep_wake` | Steady wake-up | auto | candidate | 16+ | energy ★, discipline ★, focus · | 0 | Up within 60/45/30/15 min of W1 | Not offered: W1 varies/shift; the routine "same wake time" |
| 4 | `sleep_no_phone_bed` | Phone-free wind-down | auto | candidate | 16+ | calm ★, energy · | trouble → 1, else 0 | 15/30/45/60 min before bed | Only if phone ≥ 1–2 h or Not sure; not with the routine "phone out of reach" |
| 5 | `sleep_morning_light` | Morning daylight | auto | candidate | 16+ | energy ★, calm ·, focus · | 0 | Outside within an hour of waking for 5/10/15/20 min | Shift → "after your main sleep" |
| 6 | `move_walk` | Walk | auto | candidate | 16+ | energy ★, calm ★, fitness ★ | days 0 → 5 min; 1–2 → 10; 3–4 → 20; 5+ → 20, only for energy/calm | 5/10/15/20/25/30/40/50/60 min | Not with the routine "30+ min walk", the precaution "walking is difficult", **heart/BP or pregnancy** (pending review). Comfort and warning-sign note for joint, unknown, 65+ |
| 7 | `move_strength_prep` | Strength preparation | choice / add | standard: candidate, **not in the development gate (pending expert review)** · **gentle: held** | 16+ | none (suggested for fitness and confidence in the choice step) | 0 (conservative) | 1 set of 1 move · 1 of 2 · 1 of 3 · 2 sets of 3 | Excluded: heart/BP, pregnancy, walking difficult, **active 3+ days a week**. Joint, 65+ or unknown would need the **gentle** variant, which is **held** → not offered. Copy: "Practice for a strength routine, not a full strength workout. Guidelines recommend strength work on 2+ days a week." |
| 8 | `food_produce` | Fruit and veg | auto | candidate | **18+** (16–17 pending review) | energy ·, fitness · | hardly any → 1 portion; 1–2 → 2; 3–4 → **not offered** (no room); 5+ → not offered | 1/2/3/4/5 portions today | Food skipped. Copy: "Builds the habit; doesn't measure whether your diet meets guidelines. If counting food ever feels stressful, swap this habit." |
| 9 | `food_unsweetened` | Unsweetened drinks | auto | candidate | **18+** | energy ·, fitness · | most → 0; a few times → not offered (no room); rarely → not offered | Swap once · Swap twice · All drinks unsweetened today | Never under 18; food skipped |
| 10 | `food_water_meals` | Water with meals | add | candidate | 16+ | — | 0 | Water with 1/2/3 meals | Fluid limit |
| 11 | `screen_morning` | Phone-free start | auto | candidate | 16+ | energy ·, calm · | 6 h+ → 0; 2–6 h or Not sure → 1; 1–2 h → not offered (no room); <1 h → not offered | First 15/30/45/60 min after waking | Overlap group `morning_phone`; phone rule |
| 12 | `screen_social` | Social-free start | auto | candidate | 16+ | focus ★, calm · | 6 h+ → 0; 4–6 h → 1; 2–4 h → 2 | First 30 min / 1 / 2 / 3 / 4 h after waking without social apps | 6b = social only. Overlap `morning_phone`; phone rule |
| 13 | `screen_app_limit` | App limit | auto | candidate | 16+ | focus ·, calm ·, energy · | 6 h+ → 0; 4–6 h → 1; 2–4 h → 2 | Under 120/90/60/45/30 min | 6b = videos, games or a mix; phone rule |
| 14 | `mind_read` | Read | auto | candidate | 16+ | focus ★, calm · | 0 (focus: 1) | 5/10/15/20/30 min | Routine reading |
| 15 | `mind_breathe` | Slow breathing | auto | candidate | 16+ | calm ★, focus · | 0 | 2/3/5/8/10 min | Routine breathing; **heart/BP or pregnancy** (pending review). Note: gently, no breath-holding, stop if dizzy |
| 16 | `mind_journal` | Journal | auto | candidate | 16+ | discipline ·, confidence ·, calm · | 0 | 1/2/3/5 sentences | Routine journaling |
| 17 | `focus_deepwork` | Deep work | auto | candidate | 16+ | focus ★, discipline · | 1 | 10/15/25/45/60/90 min (teen: up to 60) | — |
| 18 | `focus_top3` | First task | auto | candidate | 16+ | focus ★, discipline ★, calm · | planning routine → 1; else 0 | Write your #1 task · + 10 min on it first · + 25 · + 45 | — |
| 19 | `social_reach_out` | Reach out | auto | candidate | 16+ | **confidence ★**, calm ·, energy · | 0 | Message or call 1/2/3 people | — |
| 20 | `confidence_compliment` | Genuine compliment | auto | candidate | 16+ | confidence ★ | 0 | 1/2/3 genuine compliments (a message counts) | — |
| 21 | `confidence_talk` | Start a conversation | **choice / add** | candidate | 16+ | none | 0 | 1/2/3 conversations | Opportunity-dependent (max 1 per plan) |
| 22 | `move_strength_session` | Strength session | — | held | — | — | — | 2 sessions/week | Scheduled; design only (E) |
| 23 | `move_balance` | Balance practice | auto (when released) | **held** | 50+ or walking difficulty | fitness ★ (65+), calm · | — | Product draft only, e.g. supported single-leg stands. **No target is released until reviewed** | Held |

**Goal lists, in order (★ = core):**
- **energy:** bedtime★, wake★, light★, walk★, then wind-down, produce, unsweetened, phone-free start, app limit,
  reach out
- **focus:** deep work★, first task★, social-free★, read★, then wake, light, breathe, app limit
- **discipline:** first task★, wake★, then deep work, journal
- **confidence:** reach out★, compliment★, then journal
- **calm:** breathe★, wind-down★, walk★, then journal, phone-free start, social-free, app limit, reach out, first
  task, light
- **fitness:** walk★, (balance★ once released), then produce, unsweetened. Sleep habits are not fitness habits
  (they can still come from a sleep need)

**Fitness note** (every fitness plan): "This first version only has daily habits, so it doesn't include the
strength sessions guidelines recommend on 2+ days a week. If you train already, keep going."

## C. Age and safety [PROPOSED; VERIFY]
1. **Under 16:** stop screen. Nothing is saved.
2. **16–17:** teen sleep band (8+ h); never #9; **no #2 or #8 until expert review**; deep work ≤ 60 min. A plan
   keeps its band until Restart.
3. **Precautions:**
   - joint, 65+, unknown → #7 gentle (held) → #7 not offered; walk note
   - walking difficult → no #6, #7 or #23 until reviewed; plan note: "Movement habits for limited mobility
     aren't available yet. A professional can suggest safe options."
   - heart/BP, pregnancy → no #6, #7 or #15 until expert review; plan note
   - fluid limit → no #10
   - sleep condition → no #2
   - food skipped → no #8–10
   - unknown → no #2; plan note
4. **Sleep trouble:** some or most → no #2. Most → professional note [VERIFY wording].

## D. Algorithm [PROPOSED]

### D.1 Need scores (0–4)
- **Sleep** = max(duration, trouble):
  - adult: <6 → 4; 6–7 → 3; else 0
  - teen: <6 → 4; 6–7 → 3; 7–8 → 2; else 0
  - trouble: most → 4; some → 2
- **Activity:** 0 → 4; 1–2 → 3; 3–4 → 1; 5+ → 0.
- **Nutrition** = max(produce, sugary):
  - produce: hardly any → 4; 1–2 → 3; 3–4 → 1
  - sugary (adults): most → 3; some → 1
- **Digital:** 6+ → 4; 4–6 → 3; 2–4 or Not sure → 2; 1–2 → 1; <1 → 0.
- **Focus, mind, social:** no score (goal only).

### D.2 Eligibility
A habit is eligible when it is:
- released (a candidate)
- age-allowed, and not excluded by precautions, trouble or W answers
- not "already doing" (routine, or baseline)
- has room (r0 + 2 within its rungs)
- allowed by the current mode

**Suitability (auto):**
- core goal habits are always suitable
- support habits and need picks must be in a domain with need ≥ 1 (need picks: ≥ 2)
- focus, mind and social habits have no need score, so they're suitable only when goal-listed

### D.3 Domain choice (need step)
- **Sleep:**
  - trouble or sleep condition → wind-down; else wake; else light
  - otherwise (duration need) → bedtime; else wind-down; else light
- **Activity:** walk.
- **Nutrition (one only):** produce if its need ≥ 2; else unsweetened if sugary is most.
- **Digital:**
  - social → social-free
  - videos, games or a mix → app limit
  - otherwise → phone-free start

### D.4 Steps
1. **Foundation.**
2. **Goal, up to 2:**
   - g1 = the first eligible core (in list order) in a domain with need ≥ 2; else the first eligible core;
     else the first eligible suitable support habit.
   - g2 = the next eligible core, preferring a domain different from g1's that has need ≥ 2; else any
     remaining core; else the first suitable support habit.
3. **Needs, up to 2:**
   - unrepresented domains with need ≥ 2, ordered by need (ties: sleep, activity, nutrition, digital)
   - stop at 5 habits
4. **Sixth habit:** if the plan has 5, one more only for an unrepresented domain with need **4**.
5. **Fill to 5:** remaining goal-list habits (eligible and suitable), then remaining unrepresented domains
   with need ≥ 2. Nothing else.
6. **Constraints throughout:**
   - no duplicates, one per overlap group
   - ≤ 2 phone rules, ≤ 2 per domain
   - ≤ 1 nutrition habit, ≤ 1 opportunity-dependent habit
7. **Order:** foundation, then goal habits (by selection order), then the rest.

### D.5 Plan size and choice step
| Plan size | What happens |
|---|---|
| 5–6 | Done |
| 3–4 | Optional "Choose one more?" with alternatives, plus "Keep {n} habits" |
| 1–2 | **Mandatory** "Choose {3 − n} more" (the minimum is 3). Up to 5 alternatives are shown |

- **Alternatives:** eligible in choice mode (auto and choice habits, not add-only ones), ordered:
  1. remaining goal-list habits
  2. habits suggested for the goal (#7 for fitness and confidence; #21 for confidence)
  3. habits in domains with need ≥ 1
  4. library order

  They must fit the plan.
- **80% copy** (the rule is unchanged [FACT]):

  | Habits | A day counts at |
  |---|---|
  | 3 | 3 of 3 |
  | 4 | 4 of 4 |
  | 5 | 4 of 5 |
  | 6 | 5 of 6 |

  Shown when keeping 3 or 4: "With {n} habits, a day counts when all {n} are done. With 5, one can slip."

### D.6 Swaps (V2 programs)
- **Candidates:** eligible habits (auto, choice and add modes) that fit the plan without the replaced habit.
  Same domain first.
- **The swapped-in habit starts at Easy (r0), whatever the phase** [AGREED]. Existing habits keep their
  levels and the phase mechanics.

### D.7 W questions
- Computed with W1 assumed to be a time.
- Ask W1 once if needed, and W2 if bedtime is in the plan.
- Varies or shift → recompute without wake-anchored rules.

## E. Scheduled habits: design only, not approved
- **What it is:** a habit planned on chosen weekdays.
- **Today screen:** shows only today's planned habits.
- **What stays the same:** the 80% rule and XP (both use each day's planned list [FACT]), streaks, phase
  level-ups, yesterday edits, and Journey.
- **What would change (⚠ mechanics):** early level-up and step-down would count scheduled sessions.
- **Moving a session:** "Do it today" once, within the same week, while the original day is still editable.
- **Rest days:** unscheduled days.

## F. Compatibility
1. **V1 is untouched:** `src/core/plan.ts`, `src/core/habits.ts` and the store [FACT]. The V2 engine is a
   separate, unconnected module.
2. **Activation** (later, separately approved):
   - optional `programVersion`, `profile`, and per-habit `spec` fields
   - V2 only on a fresh start or Restart
   - V1 swaps stay legacy
   - no automatic upgrade

## G. Population guidance [POP]
Retrieved via web search results citing these pages (2026-10-23). Wording must be re-checked on the pages.
These are population recommendations, not validation of any habit rung.
- **Adults:** 150–300 min moderate or 75–150 vigorous aerobic activity a week, and strength work on 2+ days
  ([WHO](https://who.int/initiatives/behealthy/physical-activity),
  [CDC](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html)).
- **65+:** add balance; with poor mobility, balance on 3+ days a week
  ([CDC](https://www.cdc.gov/physical-activity-basics/guidelines/older-adults.html)).
- **Ages 5–17:** an average of 60 min/day across the week; muscle and bone strengthening on 3+ days
  ([WHO](https://iris.who.int/server/api/core/bitstreams/f3885485-e7eb-4504-8026-edd9bb53a6ee/content)).
- **Sleep:** teens 8–10 h; adults 7+ h ([CDC](https://www.cdc.gov/sleep/about/index.html)).
- **Diet:** fruit and veg ≥ 400 g a day (about five portions, potatoes excluded); free sugars < 10% of energy
  ([WHO](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)).

## H. Open items
1. **App Store age rating.**
2. **Release gate:** may `candidate` habits ship with claim-free text before their evidence is verified, or
   must each be reviewed first?
3. **Safety and science blockers:** see the engine validation report (`SCHWUNG_V2_PLAN_VALIDATION.md`,
   updated).
