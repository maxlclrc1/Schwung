# Schwung V2 — Plan Validation

**Purpose:** a go/no-go input. Six realistic users (plus two small-plan profiles) are run through
`HABIT_SCIENCE_V2_ARCHITECTURE.md` **revision 4** exactly as written, then the resulting plans are critiqued.

**How this was done:**
- The simulation is by hand, following the spec's rules step by step (no code exists yet).
- The profiles were written before running them and were **not adjusted afterwards**.
- Where the rules produce a poor plan, the cause is named.

**Nothing has been implemented or changed in the app.**

**Shared mechanics** (current code, unchanged):
- Day 1: every habit starts at Easy.
- **Day 22** (Momentum): every habit moves up one level automatically.
- **Day 45** (Mastery): up one more level; Hard stays Hard.
- Before that, after 7 completions in a row the app *offers* an early level-up.
- After 3 missed final days in a row, a habit steps down one level.
- A day counts at 80% of that day's habits.

**Swaps** (V2, per spec F.3): long-press a habit → Swap. The list shows eligible V2 habits that pass the same
age, safety and routine filters, same domain first. The new habit's targets use the user's baseline window
(see problem L10 about its starting level).

---

## Task 1 checks (spec issues)

| Issue | Status in revision 4 | Check |
|---|---|---|
| 1. Strength Starter is never automatic | #7 has no goal role and is add-only; the pool excludes add-only habits before every step | ✔ No simulated plan contains it. F (fitness, 67) and B (confidence) don't get it. **But see L5:** question 4b is still asked even though its answer no longer changes any plan |
| 2. Bedtime vs. sleep onset | W2 asks "What time do you usually **get into bed**"; targets say "In bed by…"; sleep-onset is never asked or used | ✔ (A and C). The ceiling is computed on time in bed, which is the behavior targeted |
| 3. Fruit and veg independent of meals | Target is "Eat N portions today" | ✔. **But** the window shift makes Easy fall below the baseline for 3–4-portion eaters (L3) |
| 4. One authoritative spec | Revisions 1–3 replaced by revision 4; superseded rules removed | ✔ |

### Four-habit plans and the 80% rule (tested)
- `dayQualifies` requires `done / planned ≥ 0.8` [FACT].
- So **4 habits need 4/4 (3/4 = 75% fails), and 3 need 3/3**, while 5 allow one slip (4/5) and 6 allow one
  (5/6).
- **A smaller plan is stricter, not easier.** This is counter-intuitive for exactly the users who end up with
  small plans (people already doing most things).
- See profiles G1 and G2, where the engine produces **2** and **3** habits, below the 4 the spec promises.

---

## Profile A — Mia, 16, student. Goal: Better focus
**Answers:**
- Age 16–17.
- Goal: Better focus.
- Sleep 6–7 h; trouble: Rarely.
- Active days: 1–2 (4b not shown).
- Fruit and veg 1–2 (5b not shown: teen).
- Phone 6 h+, mostly social media.
- Routines: None of these.
- Precautions: None.
- W1 06:45; W2 in bed at 00:15.

**Needs:** sleep 3 (teen 6–7 h), activity 3, nutrition 3, digital 4.

**Excluded, and why:**
- Unsweetened drinks: under 18.
- Strength preparation, water with meals: add-only.
- App limit: needs 6b = videos or games.
- Phone-free start: same overlap group as social-free start.
- Deep work, first task, reading: no room. The plan was full after the need picks.

| # | Habit | Easy (day 1) | Medium (day 22) | Hard (day 45) | Reason shown |
|---|---|---|---|---|---|
| 1 | Make your bed | Make your bed | + clear one surface | + 2-min room reset | "A small win to start the day." |
| 2 | Social-free start ★focus | No social apps for the first 1 h after waking (until 07:45) | 2 h (08:45) | 3 h (09:45) | "You're on your phone 6+ hours a day, mostly social media. Keeping social apps out of your first hours protects your focus." |
| 3 | Earlier bedtime | In bed by 00:00 | 23:45 | 23:30 | "You sleep 6–7 hours on school nights. Getting into bed a little earlier than you do now." |
| 4 | Walk | 10 min | 15 min | 20 min | "You're active 1–2 days a week. A daily walk at a comfortable pace." |
| 5 | Fruit and veg | 2 portions today | 3 | 4 | "You eat 1–2 portions a day. Adding fruit and veg to your day." (+ "Builds the habit; doesn't measure whether your diet meets guidelines.") |

**Safety:** teen rules applied (no drink restriction; additive food; deep work cap not relevant).

**Critique:**
- **Goal fit: weak.** One of five habits serves focus. Deep work and first task, the habits most directly
  about focus, never get in, because the four need picks fill the plan before the goal step. *Cause: D.4
  order (needs before goal) and the goal guarantee being satisfied by a single habit.* The plan reads as
  "teen wellness", not "better focus".
- **Evidence:** sleep and activity are plausible for focus [VERIFY]; social-free start is a practical
  routine.
- **Difficulty:** realistic. **Progression:** bedtime only reaches 7.5 h in bed by day 45, still below the
  teen band (8–10 h [POP]). That's acceptable as small steps, but the copy must not imply it's enough.
  Teen bedtimes also face school start times [VERIFY].
- **Distinct behaviors:** yes. **Schedule:** feasible for a student. **Personal:** partly. The reasons quote
  her answers.

## Profile B — Leo, 19, university. Goal: More confidence
**Answers:**
- Age 18–29.
- Goal: More confidence.
- Sleep 7–8 h; trouble: 1–2 nights.
- Active days: 1–2; strength (4b): Not at the moment.
- Fruit and veg 1–2; sugary drinks: A few times a week.
- Phone 4–6 h, mostly videos.
- Routines: None.
- Precautions: **Skip**.
- W not asked (no wake-anchored habit was picked).

**Needs:** sleep 2 (trouble), activity 3, nutrition 3, digital 3.

**Excluded, and why:**
- Earlier bedtime: trouble 1–2 nights, and precautions are unknown.
- Unsweetened drinks: sugary = some, not most.
- Strength preparation: add-only.
- Social-free start: 6b isn't social.
- Compliment, reach out, journal: no room.

| # | Habit | Easy | Medium | Hard | Reason |
|---|---|---|---|---|---|
| 1 | Make your bed | as A | | | |
| 2 | Start a conversation ★confidence | 1 conversation | 2 | 3 | "Small conversations make the next one easier." |
| 3 | Phone-free wind-down | Phone away 30 min before bed | 45 | 60 | "You have trouble sleeping 1–2 nights a week. A screen-free stretch before bed." |
| 4 | Walk | 10 min | 15 | 20 | "You're active 1–2 days a week…" + "keep it comfortable" note (unknown precautions) |
| 5 | Fruit and veg | 2 portions | 3 | 4 | as A |
| 6 | App limit | Videos under 90 min | 60 | 45 | "You're on your phone 4–6 hours a day, mostly videos." |

Plan note: "If you have a health condition, check these with a professional."

**Critique:**
- **Goal fit: weak.** One of six habits is about confidence. *Same cause as A.*
- **"Start a conversation" for someone with limited social contact** is opportunity-dependent. Missing it 3
  days running steps it down, which feels like failure. Compliment (a message counts) or Reach out would be
  a gentler core for him. *Cause: the goal-list order puts talk before compliment, and nothing in the quiz
  asks about social opportunity.*
- **Plan size 6** for someone with "inconsistent routines" is a lot (6 new behaviors). *Cause: four need
  picks plus the goal rule.*
- **Question 4b was asked and had no effect** (L5).
- **His irregular schedule was never captured** (the schedule question only appears inside W1). It didn't
  matter here.
- **Distinct behaviors:** yes. **Progression:** sensible.

## Profile C — Sam, 28, sedentary office worker. Goal: More energy
**Answers:**
- Age 18–29.
- Goal: More energy.
- Sleep 6–7 h; trouble: Rarely.
- Active days: 0.
- Fruit and veg: Hardly any; sugary drinks: Most days.
- Phone 2–4 h, videos.
- Routines: Making my bed.
- Precautions: None.
- W1 07:00; W2 in bed at 00:30.

**Needs:** sleep 3, activity 4, nutrition 4, digital 2.

**Excluded:** strength and water (add-only); social-free start (6b isn't social). Light, wake and reach out:
no room.

| # | Habit | Easy | Medium | Hard | Reason |
|---|---|---|---|---|---|
| 1 | Make your bed | | | | "You already do this, so it's an easy first check." |
| 2 | Earlier bedtime ★ | In bed by 00:15 | 00:00 | 23:45 | "You sleep 6–7 hours. Getting into bed a little earlier…" + energy tie |
| 3 | Walk ★ | 5 min | 10 | 15 | "You're not active on most days. A daily walk…" + energy tie |
| 4 | Fruit and veg · | 1 portion | 2 | 3 | as A |
| 5 | Unsweetened drinks · | Swap 1 sugary drink | Swap 2 | All drinks unsweetened | "You have sugary drinks most days. An easy swap." |
| 6 | App limit · | Videos under 60 min | 45 | 30 | "You're on your phone 2–4 hours, mostly videos." |

**Critique:**
- **Goal fit: good.** Bedtime and walk are the strongest energy levers in the library [VERIFY].
- **Load: too much.** Six changes, two of them food, for someone starting from zero. *Cause: every domain
  need ≥ 2 adds a habit, and nutrition may add two.*
- **App limit starts at 60 min** because the ladder window shifted (L3). That may not be a real change for a
  2–4 h total-phone user who watches about an hour of video.
- **Swap ladder for drinks:** "All drinks unsweetened" by day 45 is a big change for a daily-soda drinker.
  It's acceptable only because step-down exists.
- **Personal:** yes.

## Profile D — Ana, 35, manager. Goal: Less stress
**Answers:**
- Age 30–49.
- Goal: Less stress.
- Sleep under 6 h; trouble: 3+ nights.
- Active days: 1–2.
- Fruit and veg 3–4; sugary drinks: Rarely.
- Phone 6 h+, social media.
- Routines: None.
- Precautions: None.
- W1 06:30.

**Needs:** sleep 4, activity 3, nutrition 1, digital 4.

**Excluded:**
- Earlier bedtime: trouble 3+ nights.
- Unsweetened drinks: Rarely.
- Fruit and veg: nutrition need 1.
- Phone-free start: overlap with social-free.

| # | Habit | Easy | Medium | Hard | Reason |
|---|---|---|---|---|---|
| 1 | Make your bed | | | | |
| 2 | Phone-free wind-down ★ | 30 min | 45 | 60 | "You have trouble sleeping most nights. A screen-free stretch before bed." + professional note |
| 3 | Walk ★ | 10 min | 15 | 20 | + calm tie |
| 4 | Social-free start · | First 1 h after waking (until 07:30) | 2 h | 3 h | + calm tie |
| 5 | Slow breathing ★ | 2 min | 3 | 5 | "A few slow minutes to take the edge off." |

**Critique:**
- **Goal fit: good**, with four calm-related habits.
- **Safety: correct.** No time-in-bed extension; a professional note for frequent sleep trouble.
- **Difficulty:** realistic.
- **One question:** her sleep-trouble problem might be better served by Steady wake-up [VERIFY]. It wasn't
  added because the fill took breathing first. That's acceptable for a calm goal.
- **This is the strongest plan of the six.**

## Profile E — Jon, 45, runs 5×/week. Goal: More discipline
**Answers:**
- Age 30–49.
- Goal: More discipline.
- Sleep 7–8 h; trouble: Rarely.
- Active days: 5+ (4b not shown).
- Fruit and veg 3–4; sugary drinks: Rarely.
- Phone 1–2 h.
- Routines: A 30+ min walk, Reading 10+ min, Waking up at about the same time. Struggles with planning, so
  "Planning my day" isn't ticked.
- Precautions: None.
- W not asked.

**Needs:** sleep 0, activity 0, nutrition 1, digital 1.

**Excluded:**
- Steady wake-up: routine.
- Walk, reading: routines.
- Unsweetened drinks: Rarely.
- Strength: add-only.

| # | Habit | Easy | Medium | Hard | Reason |
|---|---|---|---|---|---|
| 1 | Make your bed | | | | |
| 2 | First task ★ | Write your #1 task | …and work on it 10 min first | 25 min | "Decide your most important task and start with it." + discipline tie |
| 3 | Deep work · | 15 min | 25 | 45 | "One protected block of focus." |
| 4 | Journal · | 1 sentence | 2 | 3 | "A sentence or two to clear your head." |
| 5 | Fruit and veg | **3 portions** | 4 | 5 | "You eat 3–4 portions a day…" |

**Critique:**
- **Goal fit: good** for items 2–4. Planning is exactly his problem.
- **Item 5 is a filler with a flaw.** He already eats 3–4 portions, yet Easy is 3. *Cause: the window shift
  `s = min(r0, rungs − 3)` puts Easy below the baseline (L3), and the fill accepts a domain with need 1
  (L8).* It's irrelevant to discipline, and it makes the plan feel generic.
- **Deep work at 15 min** may be trivial for a 45-year-old professional. There's no baseline input (L12).
- **Phone-free start** (need 1) wasn't reached. That's fine.

## Profile F — Rosa, 67, beginner, stiff knees. Goal: Get in shape
**Answers:**
- Age 65+.
- Goal: Get in shape.
- Sleep 7–8 h; trouble: 1–2 nights.
- Active days: 0; strength (4b): Not at the moment.
- Fruit and veg 3–4; sugary drinks: Rarely.
- Phone under 1 h (6b not shown).
- Routines: Reading, Making my bed.
- Precautions: Joint, back or injury pain.
- W1 07:30.

**Needs:** sleep 2 (trouble), activity 4, nutrition 1, digital 0.

**Excluded:**
- Earlier bedtime: trouble.
- Unsweetened drinks: Rarely.
- Strength preparation: add-only, even though the gentle variant exists for her.
- Reading: routine.

| # | Habit | Easy | Medium | Hard | Reason |
|---|---|---|---|---|---|
| 1 | Make your bed | | | | "You already do this…" |
| 2 | Walk ★ | 5 min | 10 | 15 | "You're not active yet…" + note "At a comfortable pace; stop if it hurts." |
| 3 | Fruit and veg · | **3 portions** | 4 | 5 | "You eat 3–4 portions…" |
| 4 | Steady wake-up · | Up within 60 min of 07:30 | 45 | 30 | "Getting up at about the same time each day." |
| 5 | Phone-free wind-down | 30 min before bed | 45 | 60 | "You have trouble sleeping 1–2 nights a week…" |

Fitness note shown.

**Critique:**
- **Goal fit: poor.** "Get in shape" at 67 yields only a 5-minute walk. There's no strength or balance work,
  which population guidance specifically recommends for older adults (balance, plus strength 2+ days a week
  [POP]). *Cause: Strength preparation is add-only (correct per decision 1), and the library has no
  balance habit.* The fitness note helps, but the plan doesn't meet the goal.
- **Wind-down is irrelevant.** She's on her phone less than an hour a day. *Cause: D.3 sleep rule picks #4
  for any sleep trouble without checking phone use (L2).*
- **Fruit and veg:** Easy is below her baseline (L3).
- **Walking with knee pain:** a note only. The quiz doesn't ask whether walking itself is difficult (L9).
- **Distinct behaviors:** yes. **Feasible:** yes. **Personal:** weak.

## Small-plan profiles (testing D.6)
**G1 — very healthy adult, goal fitness:**
- 30–49; sleep 7–8 h, trouble rarely; 5+ active days, strength twice or more; fruit and veg 5+; sugary
  rarely; phone 1–2 h.
- Routines: walk, reading, breathing, journaling, planning, phone out of reach, same wake time, bed.

Results:
- **Fitness core walk:** excluded (routine). **Goal guarantee:** nothing eligible.
- **Fill from the fitness list:** all excluded or not candidates.
- **Other domains:** digital need 1 → Phone-free start (30/45/60 after a window shift).
- **Plan: 2 habits** (bed + phone-free start). D.6 is triggered, but:
  - it **doesn't define which 3 alternatives to show**;
  - **"Keep 2" would go below the 3-habit floor**;
  - a 2-habit plan needs 2/2 every day.

**G2 — organized adult, goal discipline:**
- 30–49; sleep fine; 3–4 active days; fruit and veg 5+; phone under 1 h.
- Routines: planning, same wake time, journaling, reading, walk.

Results:
- **First task** (from rung 1, because planning is a routine) and **deep work**.
- **Walk:** excluded by the routine.
- **Plan: 3 habits** → choice step.
- If the user adds one → 4 habits → **every day needs 4/4**.
- Strength preparation would appear as an alternative, but **its baseline is undefined**, because 4b wasn't
  asked (age under 50, goal discipline) (L5).

---

## Comparison
| | A (16, focus) | B (19, confidence) | C (28, energy) | D (35, calm) | E (45, discipline) | F (67, fitness) |
|---|---|---|---|---|---|---|
| Habits | 5 | 6 | 6 | 5 | 5 | 5 |
| Habits serving the goal | 1 | 1 | 5 | 4 | 3 | 3 (but only the walk is fitness) |
| Goal fit | ✗ weak | ✗ weak | ✔ | ✔ strong | ✔ (with a filler issue) | ✗ poor |
| Realistic start | ✔ | ✔ | ⚠ load (6) | ✔ | ⚠ Easy below baseline | ⚠ Easy below baseline |
| Distinct behaviors | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Age / limits respected | ✔ | ✔ (unknown handled) | ✔ | ✔ (no bed extension) | ✔ | ⚠ walking with knee pain is note-only |
| Feels personal | partly | partly | ✔ | ✔ | partly | ✗ |
| Cause of failures | L1 | L1, L4, L5 | L7, L3 | — | L3, L8, L12 | L2, L3, L9, S1 |

---

## Problems and corrections

### Logic bugs and contradictions (fix in the spec before coding)
| # | Problem | Seen in | Precise correction |
|---|---|---|---|
| **L1** | Need picks fill the plan before the goal, so focus and confidence plans get 1 goal habit out of 5–6 | A, B | **Reorder D.4:** foundation → **up to 2 goal habits** (first core, then a second core or support that fits) → need picks by **descending need**, at most 2 → fill. The plan is capped at 5 unless the goal adds a 6th |
| **L2** | Sleep trouble always picks Phone-free wind-down, even for people barely on their phone | F | **D.3 sleep:** #4 only if phone ≥ 1–2 h or unknown; otherwise #3 (if a wake time is regular), else #5 |
| **L3** | The window shift `s = min(r0, rungs − 3)` puts Easy **below** the user's baseline | C, E, F | **Easy is never below the baseline:** s = r0. If fewer than 3 rungs remain above it, the habit counts as "already doing" (not offered), or the ladder gets more rungs where it's meaningful |
| **L4** | Confidence's first core (Start a conversation) is opportunity-dependent, which suits people with limited social contact badly | B | Reorder confidence core: **compliment (a message counts) first**, talk second. Or make Reach out core for confidence [PRODUCT decision] |
| **L5** | Question 4b no longer changes any automatic plan (Strength preparation is add-only), but costs a tap. #7's baseline is undefined when 4b wasn't asked | B, F, G2 | **Remove 4b from V2.0.** Strength preparation always starts at rung 0 when added. Bring 4b back with scheduled strength sessions |
| **L6** | The choice step has no defined alternative order and can leave plans under 3. The engine can produce 1–2 habits | G1, G2 | **D.6:** alternatives = eligible habits ordered goal list → descending need → library order, showing 3. **The user must reach at least 3**; the default is to suggest reaching 5. Copy explains that 4 habits need 4 of 4 every day |
| **L7** | Six changes for beginners (two food habits, plus 4 others) | C, B | Cap need picks at 2 (see L1). At most 1 food habit at onboarding (#9 only if #8 isn't picked, or as a swap) |
| **L8** | Fill accepts domains with need 1, giving irrelevant fillers | E | Fill only with goal-listed habits. Need-1 domains go to the choice-step alternatives instead |
| **L10** | V2 swap starting level is ambiguous: the baseline window, but which level? (The phase level is a V1 rule) | all | Decide: a V2 swap starts at the **phase level within the baseline window** (consistent with V1), or at Easy. Write it into F.3 |

### Science and safety (must be resolved before release)
| # | Issue | Seen in |
|---|---|---|
| **S1** | **Older adults wanting fitness get no strength or balance work.** Guidance recommends balance (and strength 2+ days a week) for 65+ [POP]. Options: a gentle daily **balance practice** habit for 65+ (e.g. supported single-leg stands) [VERIFY safety], or prioritize scheduled strength sessions (E) | F |
| **S2** | **Walking with joint pain or limited mobility** gets a note only. Should there be a "Walking is difficult for me" precaution, with a seated or standing movement alternative? [VERIFY] | F |
| **S3** | **Teen bedtime steps** reach only about 7.5 h in bed by day 45 for a 6.5 h baseline. Are 15-minute steps right for teens, and how do we handle school start times? [VERIFY] | A |
| **S4** | **Withholding bedtime at 1–2 nights of sleep trouble** may be over-cautious; confirm against insomnia guidance [VERIFY] | B, F |
| **S5** | Everything in rev 4 H3 (wording for sleep referrals, the 9 h / 10 h ceilings, gentle strength for 65+ and heart/BP, pregnancy walking notes, teen nutrition and disordered eating, unsweetened drinks and diabetes care plans, breathing cautions, under-16 rules, re-checking the WHO and CDC figures) | — |
| **S6** | Evidence that **wind-down, social-free start and app limits** actually help sleep, focus or stress, needed to justify their goal roles [VERIFY] | A, B, D |

### Product refinements (can wait)
| # | Refinement |
|---|---|
| L9 | Capture schedule regularity even when W1 isn't shown (only if a future habit needs it) |
| L11 | "All drinks unsweetened" as a hard target for daily soda drinkers; consider "at most 1" as the top rung |
| L12 | Deep work has no baseline: consider a W-style conditional ("How long can you usually focus?") for focus and discipline goals only |
| P1 | Teen copy: bedtime reasons must never imply the target is "enough" |
| P2 | Show which habits serve the goal more clearly on the plan screen (the tag exists [FACT]) |

---

## Recommendation
**No-go for coding until L1–L8 and L10 are fixed in the spec.** These are all spec edits, with no new
mechanics. Then re-run this validation (ideally as automated tests, since the profiles above become the
first scenario fixtures).

**S1–S6 must be settled before release, but don't block building the engine.** Habits with open safety
questions can be held back by the release gate (H2).

**Expected effect of the L-fixes on the six profiles:**
- **A:** Social-free start + deep work (focus) + bedtime + walk; produce drops out.
- **B:** Compliment + reach out (confidence) + wind-down + walk.
- **C:** Five habits, one food habit.
- **E:** No produce filler.
- **F:** The walk + wake-up plan stays weak until S1 is decided. That's the main remaining product gap.
