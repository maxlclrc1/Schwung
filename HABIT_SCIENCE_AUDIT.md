# Schwung — Habit Science & Personalization Audit

**Purpose.** A critical audit of how Schwung chooses, sets and progresses habits today, written to hand to
ChatGPT as the starting point for a Habit Science Specification. Nothing in the app was changed.

**How to read this.**
- **[FACT]** means confirmed in the repository (file paths given).
- **[REC]** means a recommendation from Claude.
- **[VERIFY]** means a scientific claim that must be checked against real sources before we rely on it.

Claude has not looked anything up for this document. Every health claim below, including ones that sound
familiar (activity guidelines, step counts, hydration, sleep, cold exposure), is marked [VERIFY] and must not
be shown to users until verified.

**Non-negotiables this audit respects.**
- Free forever. No accounts, backend, analytics or cloud processing. No AI-generated messages.
- Personal data stays on the device. No guilt, fake urgency or unsupported promises.
- 66 days and three phases. A successful day is 80% of that day's habits.
- XP, streaks, milestones, early level-up and gentle step-down stay as they are. Users keep control of
  their habits. No UI or artwork changes.

---

## A. Current Habit Inventory

### A.1 How the system works [FACT]
Sources: `src/core/habits.ts`, `src/core/plan.ts`, `src/core/progression.ts`, `src/store/useApp.ts`.

- **Habits:** 19 library habits, each with exactly three text targets (easy / medium / hard).
  - Targets are plain text. The app holds no numbers behind them (for example, "30 min walk" is a string,
    not a value of 30).
- **Frequency:** every habit is **daily**. There are no weekly, rest-day or "X times a week" habits.
- **Completion:** a single self-reported tap per habit per day (done / not done). There's no partial credit,
  no measured value, and no Apple Health integration.
- **Plan size:** 5–6 habits (minimum 3 after removals). "Make your bed" (`discipline_bed`, easy) is always
  first, for everyone.
- **Starting level:** always **easy**. The only exception is water for people drinking 4–8 glasses, who
  start at medium.
- **Phase level-ups** (`reconcile`): on day 22 and day 45, every non-custom habit added before that day
  goes up one level, whatever the user's recent completion. Hard stays hard.
- **Early level-up offer:** after 7 completions in a row (since the last level change), the app offers
  "Level up?". The user can accept or decline.
- **Gentle step-down:** after 3 final days in a row without completing a habit, it drops one level (never
  below easy). One notice is shown for all habits that stepped down.
- **Swapped-in habits** start at the current phase's level: easy in Foundation, medium in Momentum, hard in
  Mastery. **Custom habits** have no levels.
- **Manual control:** the user can set any habit's level on the habit detail screen, swap or remove habits
  (minimum 3), and add custom ones.

### A.2 The 19 habits [FACT, with REC/VERIFY assessments]

**Abbreviations.**
- *Triggers*: quiz answers that select the habit through the answer-to-habit mapping (A).
- *Goal*: goals that list it in their goal list; ★ marks a core habit for that goal.
- *Filler*: used to fill a plan to 5 when the answers don't produce enough habits.

| # | ID · Name | Category · Intended benefit (app's "why") | Easy / Medium / Hard | Selected by | Overlaps | Weaknesses (REC) | Safety (REC / VERIFY) |
|---|---|---|---|---|---|---|---|
| 1 | `sleep_bedtime` · Earlier bedtime | sleep · "More sleep is the cheapest energy upgrade there is." | In bed 30 min earlier than usual / In bed 7 h before your alarm / In bed 8 h before your alarm | A: sleep <5h or 5–6h; 6–7h if the goal is energy or fitness, or if there's any screen habit and the goal isn't calm. Goal: energy★. Never for 7h+ | `sleep_no_phone_bed`, `sleep_wake` (all sleep timing) | Easy is relative to an unknown "usual" bedtime. Medium/hard are absolute. For a <5 h sleeper, the automatic jump on day 22 (to 7 h in bed) can be ~1.5 h, which is large. Measures time in bed, not sleep. Ignores shift work and young children. | Spending more time in bed can backfire for people with insomnia [VERIFY: sleep-restriction approaches in CBT-I]. Short sleep can signal a medical issue such as sleep apnea [VERIFY]. We have no sleep-quality input. |
| 2 | `sleep_no_phone_bed` · Phone-free wind-down | sleep · "Your brain falls asleep faster without a bright feed in front of it." | No phone for the last 15 / 30 / 60 min before sleep | A: sleep 6–7h (when bedtime isn't picked). Goal: calm★ | `screen_morning`, `screen_social`, `screen_limit` (phone rules, capped at 2) | Behavior-based and clear: good. The benefit claim names "bright" screens; the evidence may concern engagement or arousal more than light [VERIFY]. | Low risk. |
| 3 | `sleep_wake` · Steady wake-up | sleep · "A fixed wake time anchors your body clock more than anything else." | Wake within 60 min of your target time / within 30 min / at your target time, weekends too | Never selected by an answer. Goal list: energy, focus, discipline, fitness | other sleep habits | **The app never asks for or stores a target time**, so completion is undefined. The hard level's "weekends too" makes no sense on a daily checklist. The "more than anything else" claim needs evidence [VERIFY]. | Shift workers and new parents may be unable to do it. |
| 4 | `screen_morning` · Phone-free morning | screen · "Start the day on your agenda, not everyone else's." | No phone for the first 15 / 30 / 60 min after waking | A: screen 2–4h. Goal list: energy | `screen_social` (an overlap pair, never both), phone-rule cap | Many people use the phone as an alarm, so "first 15 min" is ambiguous. | Low. |
| 5 | `screen_limit` · Screen time cap | screen · "Every hour you take back is an hour for the life you actually want." | Under 7 h / 5 h / 3 h screen time | A: screen 6–8h or 8h+ | phone-rule cap | **Outcome-based and ambiguous:** phone only, or work screens too? A 6–8 h user starts at "<7 h", which may already be met. 3 h may be impossible for office workers or students. Needs the Screen Time readout to check, so self-report is error-prone. | Low. |
| 6 | `screen_social` · Social-free mornings | screen · "Protect your best hours from the scroll." | No social apps before 10:00 / 12:00 / 17:00 | A: screen 4–6h. Goal: focus, calm | `screen_morning` | Clock times assume a 7–8 am wake-up, so this doesn't fit night shifts or late risers. The step to 17:00 is very large. "Social apps" is undefined (does messaging count?). | Low. |
| 7 | `move_walk` · Daily walk | exercise · "Walking clears your head and lifts your energy with almost no effort." | 15 / 30 / 45 min walk | A: exercise never (if the goal isn't fitness). Goal: energy★, calm★. Never for 3x+/week | `move_steps` (an overlap pair) | Strong, simple, behavior-based. Doesn't say what pace counts. | Mobility limits, injuries, unsafe areas [REC: offer an alternative]. |
| 8 | `move_workout` · Workout | exercise · "A stronger body makes everything else feel lighter." | 10 push-ups + 20 squats / 20 min workout / 40 min workout | A: exercise 1–2x (goal not energy); never or rarely if the goal is fitness. Goal: fitness★, confidence. Never for 3x+/week | — | **Daily** training at 40 min ignores recovery and how strength training is usually structured, which is a few days a week [VERIFY: muscle-strengthening guidance]. Medium and hard are a different, unspecified kind of target from easy. No strength progression for people already training. | Joint, back or heart conditions, pregnancy, beginners. No technique guidance. |
| 9 | `move_steps` · Step count | exercise · "Small movement all day beats one big burst." | 5,000 / 7,500 / 10,000 steps | A: exercise rarely; 1–2x if the goal is energy. Goal: energy★, fitness★ (also offered to people who exercise 3x+/week) | `move_walk` | Outcome measured by phone or watch (self-reported). 5,000 is trivial for some people and a lot for others. 10,000 is a popular number; the evidence curve needs checking [VERIFY]. | Mobility limits. |
| 10 | `water` · Hydrate | water · "Even mild dehydration drains focus and mood." | Drink 4 glasses (1 L) / 6 (1.5 L) / 8 (2 L) | A: water <0.5–1L (easy), 1–2L (medium). Goal: energy★, fitness. Never for 2L+ | — | Fixed amounts ignore body size, climate, activity and the water in food [VERIFY: whether intake targets are meaningful]. The benefit claim needs checking [VERIFY]. | **Heart, kidney or liver conditions with fluid restriction.** Rarely, over-drinking (hyponatremia) [VERIFY]. |
| 11 | `mind_read` · Read | mind · "A few pages a day adds up to a dozen books a year." | Read 5 / 10 / 20 pages | A: mind weekly, or never/rarely/weekly if the goal is focus. Goal: focus. Never for most-days/daily | other mind habits (the quiz treats all three as one) | A page varies by book. "A dozen books" is arithmetic, not evidence. Its link to focus is unverified [VERIFY]. | None. |
| 12 | `mind_meditate` · Breathe | mind · "A calm mind makes better decisions." | 3 min of slow breathing / 10 min meditation / 20 min meditation | A: mind rarely, or never/rarely/weekly if the goal is calm. Goal: calm★ | other mind habits | **Changes practice** between easy (breathing) and medium (meditation), and triples in duration. Hard (20 min) is a lot for a daily beginner habit. | Meditation can be distressing for some people (e.g. trauma history) [VERIFY]. Breathing exercises are generally low risk. |
| 13 | `mind_journal` · Journal | mind · "Writing it down turns a blur of days into lessons." | Write 1 line / 3 lines / a full page | A: mind never, or never/rarely/weekly if the goal is confidence. Goal: discipline, confidence, calm | other mind habits | No prompt, so the content is unspecified. A full page is a big jump. Evidence depends on the type of writing (expressive, gratitude, planning) [VERIFY]. | Rumination for some people [VERIFY]. |
| 14 | `focus_deepwork` · Deep work | focus · "One focused block beats a whole day of half-attention." | 20 / 45 / 90 min focused work, phone in another room | Goal: focus★. Filler | `focus_top3` | Assumes control over your schedule. 90 min daily is unrealistic for many jobs and for caregivers. Behavior-based: good. | None. |
| 15 | `focus_top3` · Top priorities | focus · "Deciding what matters first keeps busy from replacing important." | Write your #1 task / Write top 3 and do #1 / Write top 3 and do all of them | Goal: focus★, discipline★, calm. Filler | `discipline_bed` hard ("plan tomorrow"), `focus_deepwork` | Hard is **outcome-based**: it depends on task size and invites writing small tasks. | None. |
| 16 | `discipline_cold` · Cold finish | discipline · "Doing one hard thing on purpose makes the rest of the day easier." | 30 s / 1 min / 2 min cold at the end of your shower | Goal: discipline★. Filler | — | Mostly symbolic. The claim is motivational, not established [VERIFY]. It's a core habit for an entire goal. | **Heart conditions, Raynaud's, pregnancy** and similar [VERIFY]. Currently shown with no precautions. |
| 17 | `discipline_bed` · Clean start | discipline · "An easy first win sets the tone for the whole day." | Make your bed / + tidy your room / + plan tomorrow | **Always included** (the foundation habit), for everyone, at easy | `focus_top3` (hard) | Forced on people who already make their bed or don't want to. Mostly symbolic. Hard bundles three tasks. It also cushions the 80% rule (an easy guaranteed check), which is a design choice worth stating openly. | None. |
| 18 | `confidence_talk` · Start a conversation | confidence · "Confidence is a muscle. Small reps build it." | Start 1 conversation / 2 conversations / Speak up once in a group | Goal: confidence★. Filler | `confidence_compliment` | **Opportunity-dependent:** remote workers and people living alone may have no daily chance, so they'd get unfair step-downs. Hard depends on being in a group. | Social anxiety: graded exposure is a recognised idea, but it can be distressing without support [VERIFY]. |
| 19 | `confidence_compliment` · Genuine compliment | confidence · "Noticing the good in others makes you easier to be around, including for yourself." | Give 1 / 2 genuine compliments / Tell someone specifically what they did well | Goal: confidence★. Filler | `confidence_talk` | Also opportunity-dependent. Hard is a different kind of task, not a harder version. | None. |

### A.3 Goal lists [FACT] (★ = core: protected when a plan has to drop a habit)
- **energy:** walk★, water★, sleep_wake★, steps★, screen_morning (also bedtime★ as core)
- **focus:** deepwork★, top3★, screen_social, read, sleep_wake
- **discipline:** cold★, top3★, sleep_wake, journal
- **confidence:** talk★, compliment★, workout, journal
- **calm:** meditate★, no_phone_bed★, journal, walk★, screen_social, top3
- **fitness:** workout★, steps★, water, sleep_wake

**Coherence rules:**
- Never walk and steps together, or phone-free morning and social-free mornings together.
- At most 2 phone rules.
- Never a habit the answers say you already do.
- Fillers only to reach 5.
- Order: foundation, then goal habits, then the rest.

---

## B. Quiz & Personalization Map

### B.1 Questions and answers [FACT] (`src/app/quiz.tsx`, `src/core/answers.ts`)
| # | Question | Options (stored value) |
|---|---|---|
| 1 | What do you want most right now? | More energy (energy) · Better focus (focus) · More discipline (discipline) · More confidence (confidence) · Less stress (calm) · Get in shape (fitness) |
| 2 | How much do you sleep most nights? | <5 h · 5–6 h · 6–7 h · 7–8 h · 8 h+ |
| 3 | How much screen time do you have a day? | <2 h · 2–4 h · 4–6 h · 6–8 h · 8 h+ |
| 4 | How often do you work out or play sports? | Never · A few times a month · 1–2×/week · 3–4×/week · 5+/week |
| 5 | How much water do you drink a day? | <2 glasses · 2–4 · 4–8 · 8–12 · 12+ |
| 6 | How often do you read, meditate, or journal? | Never · Rarely · About once a week · Most days · Every day |

### B.2 How each answer shapes the plan [FACT]
| Answer | Habit (level) | Skipped as "already doing" | Severity (0 = healthy, 4 = hardest) |
|---|---|---|---|
| Sleep <5 h / 5–6 h | bedtime (easy) | — | 4 / 3 |
| Sleep 6–7 h | bedtime if energy/fitness, or if there's a screen habit and the goal isn't calm; otherwise no-phone wind-down | — | 2 |
| Sleep 7–8 h / 8 h+ | none | bedtime | 1 / 0 |
| Screen 8 h+ / 6–8 h | screen cap (easy, <7 h) | — | 4 / 3 |
| Screen 4–6 h | social-free mornings | — | 2 |
| Screen 2–4 h | phone-free morning | — | 1 |
| Screen <2 h | none | all three screen habits | 0 |
| Exercise never | walk (or workout if fitness) | — | 4 |
| Exercise rarely | steps (or workout if fitness) | — | 3 |
| Exercise 1–2× | workout (or steps if energy) | — | 2 |
| Exercise 3–4× / 5+ | none | walk, workout (steps stays available) | 1 / 0 |
| Water <2 / 2–4 glasses | water (easy, 4 glasses) | — | 4 / 3 |
| Water 4–8 glasses | water (medium, 6 glasses) | — | 2 |
| Water 8–12 / 12+ | none | water | 1 / 0 |
| Mind never / rarely / weekly | journal / breathe / read (calm → breathe, focus → read, confidence → journal) | — | 4 / 3 / 2 |
| Mind most days / daily | none | read, breathe, journal | 1 / 0 |

### B.3 How the goal changes the plan [FACT]
1. **It chooses between equally valid area habits** (sleep 6–7 h, exercise, mind).
2. **It guarantees a core goal habit.** If an area habit already is one, its reason gets a sentence tying it
   to the goal. Otherwise a goal habit is added.
3. **If that makes 7 habits,** the area habit with the mildest answer is dropped (never a core goal habit
   first; ties go to mind, then screen, water, exercise, sleep).
4. **Fillers to reach 5:** more goal habits, then complements.
5. **Order:** goal habits are listed right after the foundation.

Tests check every one of the 18,750 answer combinations for:
- plan validity
- no duplicates or overlaps
- the phone-rule cap
- a core goal habit in every plan
- at least 4 distinct plans across the 6 goals for each answer set
- distinct reasons

### B.4 What it does well
- It's fully deterministic and explainable: every habit has a reason quoting the answer.
- It never assigns what you already do, and avoids near-duplicates.
- The goal genuinely changes the plan, and starting targets come from the answer (only 2 levels of
  granularity, though).

### B.5 Where personalization breaks down [REC]
1. **Baselines are coarse.** Answers are ranges, but targets are generic text.
   - "30 minutes earlier than usual" doesn't know "usual".
   - Steps start at 5,000 whether you walk 2,000 or 6,000.
   - A screen cap of 7 h for a 6–8 h user may already be met.
2. **There's no "when"** (wake time, bedtime, work schedule), yet four habits depend on clock times
   (bedtime, wake-up, social-free mornings, phone-free morning).
3. **Sleep is duration only.** Quality, consistency and insomnia aren't asked, but they change what's
   appropriate.
4. **Exercise is one frequency number.** We can't tell cardio from strength, sport from gym, or recovery
   needs. Someone who exercises 5×/week gets steps, which is likely meaningless.
5. **The mind question combines three different practices.** A daily reader who never journals is marked as
   doing all three.
6. **Stress and energy aren't measured.** Only the goal implies them.
7. **No safety screen:** cold exposure, water targets, daily workouts and longer time in bed are given to
   everyone.
8. **The foundation habit is forced**, and the always-easy start ignores strong baselines.
9. **Opportunity-dependent habits** (conversations, compliments, group speaking) are treated like
   always-available ones.
10. **Everything is daily**, which doesn't suit strength training, long walks or social habits.

### B.6 Possible new questions [REC]
| Candidate | Usefulness | Privacy | Friction | Recommendation |
|---|---|---|---|---|
| Age range (e.g. under 18 / 18–29 / 30–49 / 50–64 / 65+) | Medium: safety framing and intensity; minors need different defaults (e.g. no cold exposure, sleep needs differ [VERIFY]) | Low if coarse | Low | **Consider**, as an optional single tap |
| Height / weight | Low for current habits; only matters for calorie-based nutrition, which we shouldn't do | **High** (sensitive; body-image risk) | Medium | **Don't ask** |
| Usual wake time (and maybe bedtime) | **High:** fixes 4 clock-time habits and makes bedtime targets concrete | Low | Low (one picker) | **Ask** (it could double as the reminder default) |
| Sleep quality ("How rested do you usually feel?" or "Trouble falling or staying asleep?") | High: separates short sleepers by choice from insomnia | Low–medium | Low | **Ask** (one question) |
| Strength training separate from cardio | Medium–high for fitness plans | Low | Low (split the exercise question, or add a follow-up only for fitness) | **Consider**: follow-up only for the fitness goal |
| Nutrition (e.g. "How often do you eat vegetables / home-cooked meals?") | High if we add nutrition habits | Medium (food can be sensitive) | Low | **Ask only when nutrition habits exist**; behavior-based, no weight talk |
| Stress / energy level (1–5) | Medium: could choose calm habits without the calm goal | Low | Low | **Optional**: the goal mostly covers it |
| Screen time split (phone vs work, social share) | Medium | Low | Medium | **Rephrase** the existing question ("phone, outside work") rather than adding one |
| Existing routines ("What's already part of your day?" multi-select) | **High:** avoids assigning what people do, unbundles the mind question, removes the forced bed habit | Low | Low–medium (one multi-select) | **Strong candidate**: could replace Q6 |
| Physical limitations / precautions ("Anything we should go easy on?" multi-select: joint or back pain, heart condition, pregnancy, mobility limits, none) | **High for safety** | **Sensitive** (stays local, optional, never required) | Low | **Ask**: optional, with neutral wording, used only to exclude or adapt habits |

**Net [REC]:** about +2–3 questions (wake time, sleep quality, an optional precautions multi-select),
possibly turning Q6 into a multi-select of existing routines. Keep it under about 2.5 minutes.

---

## C. Habit Effectiveness Gap Analysis [REC]

### C.1 What works
- Behavior-based, clearly checkable habits: walk minutes, phone-free windows, reading pages, deep-work
  blocks, top-priority writing.
- A small plan (5–6), an easy start, gentle step-downs and offered (not forced) early level-ups.
- Coherence rules (no overlaps, a phone cap) and personal reasons.

### C.2 Progression problems
| Issue | Examples |
|---|---|
| **Automatic day-22 and day-45 level-ups ignore performance** | A user completing a habit 2 days out of 7 still jumps a level on day 22, then probably steps down later. It feels like failure, not progression. [REC: make phase level-ups apply only if recent completion is good, and otherwise *offer* them, like early level-ups. The rule that makes phase level-ups automatic is one of the "mechanics" in scope, so this needs your explicit approval.] |
| **Jumps too large** | breathing 3 min → meditation 10 min → 20 min; journal 3 lines → full page; social-free mornings until 12:00 → until 17:00; workout 10 push-ups → 20 min → 40 min (a change of kind and size); bedtime for <5 h sleepers to 7 h in bed |
| **Too trivial for some** | steps 5,000 for active people; screen cap of 7 h for 6–8 h users; make your bed for people who already do |
| **Outcome- instead of behavior-based** | screen cap (an outcome you only see at day's end); top 3 hard ("do all"); steps (fine if a counter exists) |
| **Level changes the practice, not the dose** | breathe → meditate; compliment → specific feedback; talk → group speaking; workout reps → minutes |
| **Early level-ups stack with phase level-ups** | Leveled early on day 10, a habit is hard by day 22, then flat for 45 days. Mastery has nothing new. |
| **Swaps in Mastery start at hard** | Swapping in "Workout" on day 50 starts at a 40-minute daily workout. A new habit should start easy whatever the phase. [REC] |
| **Opportunity-dependent habits plus step-downs** | Living alone means "start a conversation" gets missed and stepped down, which isn't a real lapse. |
| **Daily-only frequency** | Workouts, cold exposure and long walks can't have rest days without being "missed". |

### C.3 Redundant or weak
- Walk and steps are the same practice (correctly never together).
- The phone-free morning and social-free mornings habits overlap (handled).
- `discipline_bed` hard overlaps `focus_top3`.
- Cold finish and make your bed are mostly symbolic; the rest of the library is behavior with plausible
  health links. [VERIFY all]
- Steady wake-up can't be measured until a target time exists.

### C.4 Missing high-impact areas
**Evidence tiers are for ChatGPT to establish.** The tier below is Claude's unverified expectation, given
only to prioritize research.

| Area | Candidate habits (behavior-based) | Expected tier (to VERIFY) |
|---|---|---|
| **Strength training** | 2–3×/week session ("2 sets of 3 moves"); progression by sets or moves | Expected strong |
| **Cardio / brisk walking** | brisk 10-min bouts; weekly minutes | Expected strong |
| **Nutrition quality** | a vegetable at 2 meals; protein at breakfast; no sugary drinks; home-cooked dinner N×/week; kitchen closes 2–3 h before bed | Expected strong for diet patterns, weaker for single rules |
| **Sleep consistency** | a consistent bedtime window; caffeine cutoff; morning daylight | Expected promising to strong |
| **Alcohol** | alcohol-free days (optional, sensitive) | Expected strong (for reduction); sensitive to ask |
| **Stress** | physiological sigh or slow breathing; nature or outdoor time; worry-time and wind-down list | Promising |
| **Social connection** | message or call someone you care about; plan one meetup a week | Promising to strong (connection overall) |
| **Meaningful planning** | weekly review; evening "tomorrow's first task" | Promising / mostly practical |
| **Digital** | notifications off for 1 app; phone out of the bedroom; grayscale in the evening | Promising |
| **Posture / sedentary breaks** | stand and move every hour | Promising |

Habits that are mainly **symbolic or motivational** (they can stay, but should be presented honestly):
make your bed, cold finish, compliments as a confidence intervention.

---

## D. Architecture & Implementation Constraints

### D.1 Today [FACT]
- **Plan generation:** a pure, deterministic function from 6 enum answers to 5–6 picks
  (`buildPlan`, `src/core/plan.ts`), tested exhaustively across all 18,750 combinations.
- **Stored plan per habit:** `{ habitId, level, addedOnDay, levelSince, custom? }`. Targets come from the
  library text by level.
- **Saved-data migration:** new optional fields default when old data loads, so additions don't need a
  migration (the theme-preference field set this precedent).
- **Progression** (`reconcile`) works on levels only. Logs store the planned and completed IDs per day.

### D.2 Limits
1. **Targets are text.** The app can't compute a target (e.g. "your bedtime minus 15 min") or show a
   personal number.
2. **Three fixed levels.** Personal starting points can only pick from easy, medium or hard.
3. **Daily-only completion.** A weekly habit would need a different completion model, and the 80% rule is
   per day. Mixing weekly habits into a daily percentage needs a clear rule (e.g. a weekly habit counts only
   on days it's scheduled).
4. **Answers are enums.** New inputs (wake time, precautions) need new optional fields, and old users have
   none.
5. **No per-habit precautions,** so safety filtering has nothing to act on.

### D.3 How to grow it without breaking principles [REC]
- **Data-driven habit spec:** each habit becomes structured data, still bundled in the app (no backend):
  - outcome, mechanism and evidence notes
  - precautions as tags (`heart`, `pregnancy`, `joint`, `fluid_restriction`, `minor`…)
  - frequency (`daily` or `weekly: n`)
  - opportunity-dependent (yes/no)
  - target templates with parameters, e.g. `{ kind: 'minutes', values: [10, 20, 30] }` or
    `{ kind: 'beforeTime', anchor: 'bedtime', offsets: [15, 30, 60] }`
  - user-facing explanation
- **Personal targets:** store an optional per-habit parameter (e.g. `anchorTime`, `startValue`), so
  "In bed by 22:45" is computed from the user's wake time and the level, not generic text.
- **Rule-based selection:** answers → needs → candidate habits → filter by precautions and "already doing"
  → pick by goal and severity, all as pure functions with property tests. It stays deterministic,
  explainable and offline.
- **Safety filter first:** precaution tags exclude or adapt habits before anything else.
- **Testing:**
  - keep the exhaustive answer-space tests (the space grows, so mix exhaustive tests on core dimensions
    with sampling)
  - add safety tests (e.g. no cold exposure with a heart tag)
  - add target-math tests
- **Compatibility:**
  - Existing users keep their plans. New fields are optional, and old plans run on the current text.
  - Library IDs never change; retired habits stay loadable but aren't offered.
- **Expo Go:** all of this is plain TypeScript, with no new libraries.
  - Apple Health step reading would need a native module, so it's excluded (keep steps self-reported, or
    replace steps with walking time).

### D.4 Risks
- Personalization complexity can make plans less explainable. Every rule needs a user-facing reason.
- More questions mean more drop-off in onboarding.
- Health data stays local, but the copy must say so plainly, and nothing should feel clinical.
- Changing targets for existing users mid-program would break "what you agreed to". Apply new rules to new
  plans (and optionally on Restart) only.

---

## E. Research Questions for ChatGPT
Please answer each with verified sources (guidelines, systematic reviews or meta-analyses where possible),
the strength of evidence, and practical, safe target ranges.

1. **Habit formation:** what does the evidence say about 66 days (the commonly cited habit-formation
   study), how variable is the time it takes, and does daily versus non-daily practice matter for
   automaticity?
2. **Physical activity:**
   - Current adult guidelines for aerobic and muscle-strengthening activity (amount and frequency).
   - How should a sedentary beginner progress safely over 9 weeks?
   - Are walking minutes or step counts the better target, and what does the step-count dose-response
     evidence show (is 10,000 meaningful)?
3. **Strength training for beginners:** safe minimal effective dose, frequency, rest days, and
   no-equipment options. When is daily training inappropriate?
4. **Sleep:**
   - Does a consistent wake time, more time in bed, or a pre-sleep screen restriction have better evidence?
   - When is spending more time in bed counterproductive (insomnia, CBT-I principles)?
   - What warning signs should prompt "talk to a professional" copy (e.g. possible sleep apnea)?
5. **Screens:**
   - What's the evidence on phone-free mornings and evenings, social-media reduction and well-being, and
     total screen-time caps?
   - Which phone behavior is most worth changing?
6. **Hydration:** is a daily water target evidence-based for healthy adults? What precautions apply?
   Should we drop the water habit, or replace it with something else?
7. **Breathing, meditation, journaling:**
   - Minimal effective doses.
   - Slow breathing versus meditation for stress.
   - Expressive versus gratitude versus planning journaling.
   - Who should be careful with meditation?
8. **Cold exposure:** what's the real evidence (mood, resilience, "discipline"), and what are the
   contraindications? Should it stay in a free general-audience app?
9. **Focus:** evidence for single-tasking blocks, phone distance during work, and implementation
   intentions or "first task" planning.
10. **Confidence and social connection:** graded social exposure for everyday confidence, the benefits of
    social contact, and how to frame these for people with social anxiety or limited daily contact.
11. **Nutrition:** which simple, behavior-based food habits have the best evidence and lowest risk (no
    calorie counting, no weight talk)? How do we avoid harming people with a history of disordered eating?
12. **Progression design:** what does behavior-change research say about stepwise difficulty, how big
    increments should be, self-chosen versus automatic progression, and handling lapses (the
    "what-the-hell" effect)?
13. **Goal fit:** for each of our six goals, which habits have the strongest evidence of affecting that
    outcome in weeks, not years?
14. **Safety screening:** what's the minimal, non-clinical set of precautions a general wellness app should
    ask about, and how should it word the related advice?

---

## F. Prioritized Recommendations [REC]
Ranked by expected usefulness to users relative to effort and risk. Items marked ⚠ touch protected
mechanics and need your explicit approval.

| # | Recommendation | Usefulness | Effort | Risk |
|---|---|---|---|---|
| 1 | **Precautions and safety tags:** an optional "anything we should go easy on?" question, plus per-habit precaution tags and neutral precaution copy (cold exposure, water, workouts, time in bed) | High | Low–med | Low |
| 2 | **Ask the usual wake time** and make the clock habits concrete ("In bed by 22:45", "No social apps until 2 h after you wake") | High | Med | Low |
| 3 | **Fix habits that can't be measured or are mis-sized:** give steady wake-up a real target time; define "social apps" and "screen time" (phone, outside work); turn top-3 hard into a behavior | High | Low | Low |
| 4 | **Keep one practice per habit across levels** (breathing stays breathing; journaling grows by minutes or prompts; workout progresses by sets) and smooth the big jumps | High | Low | Low |
| 5 | **Swapped and added habits start easy** in any phase (currently they take the phase's level) | Med–high | Low | Low (users can still raise the level) |
| 6 | **Make the foundation habit optional:** skip it for people who already make their bed, or replace it with the user's easiest habit | Medium | Low | Low |
| 7 | **Weekly-frequency habits** (strength 2–3×/week, a meetup, a weekly review), with a clear rule for the daily 80% | High | Med–high | Med ⚠ (defines how weekly habits count toward the daily 80%) |
| 8 | **Performance-aware phase level-ups:** on day 22 and 45, level up only habits with good recent completion; otherwise offer it | High | Low | Med ⚠ |
| 9 | **New evidence-backed habits** after research: strength, nutrition (2–4 simple ones), sleep consistency, morning daylight, social contact, notification hygiene | High | Med | Low–med |
| 10 | **Replace the mind question with an "already part of your day" multi-select** (unbundles reading, meditation and journaling; detects existing routines) | Medium | Med | Low |
| 11 | **Opportunity-aware habits:** conversation and compliment habits get "or message someone" alternatives, or a weekly frequency | Medium | Low | Low |
| 12 | **Data-driven habit spec with parametric targets** (the architecture in D.3), enabling 1–11 cleanly | Enabler | Med–high | Med (needs good tests) |
| 13 | **Re-evaluate the water habit and cold finish** once research is in. Keep them, reframe them, or retire them for new users | Med | Low | Low |

**Suggested order:** do research first (E), then 12 → 1 → 3 → 4 → 5 → 2 → 6 → 9 → 10/11, with 7 and 8 only
if you approve the mechanic changes.

---

## Appendix: Proposed Habit Science Specification template (per habit)

| Field | Example (illustrative only, nothing verified) |
|---|---|
| 1. Intended outcome | Better daytime energy via more regular sleep timing |
| 2. Behavioral mechanism | Anchoring the body clock; reducing sleep-timing variability [VERIFY] |
| 3. Evidence strength and verified sources | *(to be filled by ChatGPT with citations)* |
| 4. Appropriate user profiles | Irregular schedule, low energy; not night-shift workers |
| 5. Contraindications / precautions | Shift work; new parents; suspected sleep disorder → suggest a professional |
| 6. Starting-level selection | From the gap between usual and target wake time |
| 7. Easy / medium / hard targets | Within 60 / 30 / 15 min of your wake time |
| 8. Progression and recovery | Level up only after 7 of 10 days; step down after 3 misses (existing mechanic) |
| 9. Recommended frequency | Daily (rest days: none, or weekends ±60 min) |
| 10. Goal relevance | energy ★, focus, discipline |
| 11. Personalization inputs | Usual wake time, schedule type, sleep quality |
| 12. Simple user-facing explanation | "Waking at the same time every day helps your body know when to be awake." (only after verification) |
