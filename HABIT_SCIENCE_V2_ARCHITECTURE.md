# Schwung Habit Science 2.0 — Architecture Proposal

**Status:** proposal only. No app code, habit library, quiz, saved data or program behavior has been changed.
**Builds on:** `HABIT_SCIENCE_AUDIT.md`.

**How to read this.**
- **[AGREED]** is product direction the owner has approved.
- **[PROPOSED]** is a mechanic or design Claude proposes, for approval.
- **[FACT]** is the current code.
- **[REVIEW]** is a target, threshold or claim that needs scientific or safety review before release.

No health claim or number in this document has been verified.

---

## 0. Agreed principles [AGREED]
1. **Audience:** one app for ages 16–17 and adults 18+. Six primary goals stay. Plans have 5–6 habits
   (minimum 3). 66 days, with Foundation / Momentum / Mastery.
2. **Selection is baseline-aware and age-appropriate.** Inputs may include age, sleep, activity, nutrition,
   digital behavior, existing routines and optional limitations.
3. **Not collected or used:** height, weight, BMI, calories, weight loss. **No restrictive diet or weight
   management for minors.**
4. **Mechanics unchanged unless explicitly approved:** daily success at 80%, XP, streaks, early level-up,
   step-down, and the mandatory phase level-ups.
5. **"Make your bed" stays as the always-first foundation habit.**
6. **Existing plans and history are preserved.**
7. **Technical limits:** offline, deterministic, no backend, analytics or AI messages, no new libraries,
   works in Expo Go.

---

## 1. Habit specification [PROPOSED]

### 1.1 Versioning
- The library becomes **data with a version**: `HABIT_LIBRARY_VERSION = 2`. It still ships inside the app.
- Each habit has a stable `id` and its own `specVersion`.
- Saved plans record which spec version each habit uses, so a later library update can never silently
  change a running plan's targets.

### 1.2 Types
```ts
type AgeBand = 'teen' /* 16–17 */ | 'adult';                       // derived from the quiz's age range
type PrecautionTag =
  | 'joint_or_back' | 'heart_or_bp' | 'pregnancy' | 'fluid_limit'
  | 'sleep_disorder' | 'skip_food_habits' | 'shift_work';
type Domain = 'sleep' | 'activity' | 'strength' | 'nutrition' | 'digital' | 'mind' | 'focus' | 'social' | 'foundation';
type GoalRole = 'core' | 'support';

type EvidenceRef = {
  claim: string;               // the exact sentence it backs, e.g. user-facing "why"
  status: 'unverified' | 'verified' | 'rejected';
  sources: string[];           // citations, filled during research; empty while unverified
  reviewedOn?: string;         // YYYY-MM-DD
};

type TargetLadder =
  // Each rung is one concrete daily (or per-session) target; levels map onto 3 consecutive rungs.
  | { kind: 'minutes'; rungs: number[]; template: string }          // "Walk {n} min"
  | { kind: 'count'; rungs: number[]; unit: string; template: string }  // "Read {n} pages"
  | { kind: 'clockBefore'; anchor: 'bedtime'; rungsMin: number[]; template: string } // "No phone after {t}"
  | { kind: 'clockAfter'; anchor: 'wake'; rungsMin: number[]; template: string }     // "No social apps until {t}"
  | { kind: 'bedtime'; sleepOpportunityMin: number[]; template: string }             // "In bed by {t}"
  | { kind: 'steps'; rungs: string[] };                                // fixed text steps (same practice, more of it)

type HabitSpec = {
  id: string;
  specVersion: number;
  title: string;
  icon: string;
  domain: Domain;
  practice: string;            // one practice for all levels (audit: no breathe→meditate switches)
  frequency: { kind: 'daily' } | { kind: 'weekly'; sessions: 2 | 3 };   // weekly = not active until approved (§6)
  ages: { teen: 'allowed' | 'adapted' | 'excluded'; adult: 'allowed' };
  teenLadder?: TargetLadder;   // when ages.teen === 'adapted'
  precautions: { tag: PrecautionTag; effect: 'exclude' | 'adapt' | 'note' }[];
  adaptedLadder?: Partial<Record<PrecautionTag, TargetLadder>>;
  ladder: TargetLadder;
  baseline: BaselineRule;      // §2: how the starting rung is chosen
  goals: Partial<Record<Goal, GoalRole>>;
  alreadyDoneBy: RoutineKey[]; // quiz routines that mean "the user already does this"
  overlapGroup?: string;       // at most one habit per group in a plan
  phoneRule?: boolean;         // counts toward the max-2 phone rules
  opportunityDependent?: boolean; // needs other people / situations (conversation, compliment)
  cues: string[];              // implementation-intention suggestions: "After you brush your teeth"
  copy: { why: string; precautionNote?: string };   // short, plain; only verified claims ship
  evidence: EvidenceRef[];
};
```

### 1.3 Release rule [PROPOSED]
**A habit can be offered to new plans only when:**
- every `EvidenceRef` behind its user-facing `why` is `verified`, and
- its teen and precaution rules are reviewed.

**Otherwise** it ships with a neutral, claim-free `why` (e.g. "A small daily walk"), or isn't offered.

---

## 2. Baseline-dependent targets compatible with three levels [PROPOSED]

### 2.1 Principle
- Each habit has a **ladder of rungs** (more steps than three).
- The user's baseline picks a **starting rung `r0`**. Their levels are then **easy = r0, medium = r0+1,
  hard = r0+2**. If r0+2 would go past the top, the window shifts down.
- **The stored level stays `'easy' | 'medium' | 'hard'`.** So phase level-ups, early level-ups, step-downs,
  XP and the 80% rule work exactly as now. Only the text shown for each level becomes personal.

```ts
// Stored per plan habit (new optional field; absent = legacy v1 habit, rendered from old text)
type PlanHabitV2 = PlanHabit & {
  spec?: { id: string; specVersion: number; startRung: number; anchors?: { wake?: string; bed?: string }; variant?: 'teen' | PrecautionTag };
};

function targetText(h: PlanHabitV2): string {
  if (!h.spec) return legacyText(h);                                   // unchanged v1 behavior
  const spec = specFor(h.spec.id, h.spec.specVersion);
  const ladder = pickLadder(spec, h.spec.variant);
  const rung = clamp(h.spec.startRung + levelIndex(h.level), 0, ladder.length - 1);
  return render(ladder, rung, h.spec.anchors);
}
```

### 2.2 Starting-rung rules (illustrative, every number is [REVIEW])
| Habit (v2) | Ladder | Baseline input → start rung |
|---|---|---|
| Walk | 5, 10, 15, 20, 30, 45 min | walking per day: <15 → 5 min; 15–30 → 15; 30–60 → 20; 60+ → not offered (already doing) |
| Strength (bodyweight) | steps: "1 set of 3 moves" → "2 sets" → "3 sets" → "3 sets, harder variation" | none → rung 0; 1×/week → rung 1; 2+×/week → excluded (already doing). Daily is not appropriate: **only offered once weekly scheduling is approved** (§6) |
| In bed by (bedtime) | sleep opportunity before wake, adults: 7:00, 7:30, 8:00 h; teens: 8:00, 8:30, 9:00 h | start = the rung just above the current reported sleep, capped. If reported sleep is far below, start at the lowest rung, not the target |
| Phone-free wind-down | 15, 30, 45, 60 min before bedtime | phone at night: often → 15; sometimes → 30 |
| Social-free start | 30, 60, 90, 120, 180 min after wake | phone use: 8h+ → 30 min; 4–8h → 60; 2–4h → 90 |
| Reading | 5, 10, 15, 20, 30 pages, or minutes (open decision) | reads: no → 5; sometimes → 10 |
| Slow breathing | 2, 3, 5, 8, 10 min (one practice) | never → 2; sometimes → 3 |
| Journal | 1 line → 3 lines → 5 min → 10 min (one prompt family) | never → rung 0 |
| Deep work | 15, 25, 45, 60, 90 min | focus goal + students: start 15; others 25 |
| Vegetables/fruit (additive) | at 1 meal → 2 meals → 3 meals | "hardly any" → rung 0; "about one a day" → rung 1; "2+ a day" → already doing |

**Anchors:** clock targets render real times from the user's usual wake time (e.g. wake 07:00, teen rung
8:30 h → "In bed by 22:30"). Users with shift or irregular schedules get duration targets ("Phone away
30 min before you sleep") instead of clock times.

### 2.3 Rules [PROPOSED]
- **Same practice, more of it:** levels never switch practice.
- **Rung size:** each rung is a modest increase; the default ratio is at most 1.5× per step [REVIEW].
- **Never above safe maxima** (per age band and precaution variant), whatever the baseline. Maxima are part
  of the spec and tested.
- **Strong baseline:** if r0 would land at the top rung, the habit counts as "already doing" and isn't
  offered. That fixes the "trivial 5,000 steps for an athlete" case.
- **Mandatory phase level-ups stay [AGREED].** Because a level is now one rung (a modest step), the
  automatic day-22 and day-45 increases are smaller than today's big jumps.

---

## 3. Age-aware quiz [PROPOSED]
Eight main questions, plus one optional safety question and two conditional follow-ups.

- Every question has a "Prefer not to say" or "Skip" path where noted; skipping gives conservative defaults.
- All answers stay on the phone.

| # | Question (exact copy) | Type | Options (stored value) | Notes |
|---|---|---|---|---|
| 1 | **How old are you?** | single | 16–17 (`16_17`) · 18–24 (`18_24`) · 25–39 (`25_39`) · 40–59 (`40_59`) · 60+ (`60p`) | Required. Under 16: see §5 |
| 2 | **What do you want most right now?** | single | More energy · Better focus · More discipline · More confidence · Less stress · Get in shape | Unchanged values |
| 3 | **When do you usually wake up?** | time picker (default 07:00) | `HH:MM` | Follow-up 3b |
| 3b | **How regular is your schedule?** | single | Mostly the same every day (`regular`) · Changes a lot (`irregular`) · Shifts or nights (`shift`) | Shift → duration-based sleep and digital targets |
| 4 | **How much do you sleep most nights?** | single | Less than 6 h (`lt6`) · 6–7 h (`6_7`) · 7–8 h (`7_8`) · 8–9 h (`8_9`) · More than 9 h (`gt9`) | Bands shift for teens when scoring (§5) |
| 4b | **How often do you struggle to fall or stay asleep?** | single | Rarely (`rarely`) · Some nights (`some`) · Most nights (`most`) | Most nights → no "more time in bed"; wind-down and wake-consistency instead; plus a gentle "worth talking to a professional" note [REVIEW] |
| 5 | **On how many days a week do you get your heart rate up for 20+ minutes?** | single | 0 · 1–2 · 3–4 · 5+ | Replaces the old exercise question |
| 5b | *(only if goal is Get in shape, or 5 ≥ 3–4)* **Do you do strength training?** | single | No (`none`) · About once a week (`1`) · Twice a week or more (`2p`) | |
| 6 | **On a typical day, how much do you walk?** | single | Under 15 min · 15–30 min · 30–60 min · Over an hour | Walking baseline for walk and steps |
| 7 | **Outside of work or school, how much time do you spend on your phone a day?** | single | Under 1 h · 1–2 h · 2–4 h · 4–6 h · 6 h+ | Rephrased to remove the work-screen ambiguity |
| 7b | *(only if 7 ≥ 2–4 h)* **What takes most of it?** | single | Social media · Videos · Games · Messages/news · Not sure | Picks the digital habit (e.g. social-free start vs. phone-away evenings) |
| 8 | **Which of these are already part of most of your days?** | multi | Reading · Breathing or meditation · Journaling · Planning my day · Fruit or vegetables at 2+ meals · Time outside in the morning · Making my bed · None of these | Unbundles the old mind question; drives "already doing" |
| 9 | *(optional)* **Anything we should go easy on?** | multi | Joint, back or injury pain · Heart or blood-pressure condition · Pregnant · Told to limit fluids · A diagnosed sleep condition · I'd rather skip food habits · None · Prefer not to say | Neutral copy, never required, stored only on the phone |

Notes:
- **The old water question is retired** for new plans pending research. Whether a hydration habit remains is
  an open decision.
- **Nutrition is asked only as an existing routine** (vegetables and fruit, in Q8). It's additive and needs
  no food diary, no weights and no calories.
- **"Making my bed" in Q8 does not remove the foundation habit** [AGREED: keep the rule]. Its reason text
  changes to "You already do this, so it's an easy first check".

---

## 4. Selection algorithm [PROPOSED]

```text
input: Profile (normalized answers), LIBRARY v2
output: Pick[] (5–6), each { spec, startRung, variant, source, reasonTokens, forGoal }

1. normalize(profile)
   - resolve contradictions (§4.2), fill missing optional answers with conservative defaults,
     derive ageBand, precautionTags (Q9 + shift work), anchors (wake, derived bedtime)

2. eligible = LIBRARY.filter(spec =>
       allowedForAge(spec, ageBand)                     // excluded → drop; adapted → use teen ladder
    && !precautions.some(t => spec.excludes(t))        // safety first, before anything else
    && frequencyActive(spec)                             // weekly specs off until approved
    && !alreadyDoing(spec, profile)                      // Q8 routines + top-of-ladder baselines
    && released(spec))                                   // evidence + review gate (§1.3)

3. needs = score each domain 0..4 from the profile (sleep, activity, strength, nutrition, digital, mind)
   - sleep need uses duration (age-adjusted bands) AND quality; activity uses Q5 + Q6; digital uses Q7(+7b)

4. picks = [foundation('discipline_bed')]                // [AGREED] always first, easy

5. for domain in DOMAIN_PRIORITY (sleep, activity, nutrition, digital, mind):
       if needs[domain] >= 2:
           c = bestCandidate(eligible, domain, goal, profile)   // goal breaks ties between valid options
           if c and fits(c, picks): picks.push(answerPick(c))

6. goal guarantee:
       if no pick is core for the goal:
           c = first eligible spec with goals[goal]=='core' that fits (prefer a new domain)
           add it; if picks > 6, drop the area pick with the lowest need that isn't core (tie: DOMAIN_PRIORITY reversed)
       else: tie the covering pick's reason to the goal

7. fill to 5: goal 'support' specs that fit → then general specs with the highest need-matching → stop at 5

8. fits(c, picks) = not already in plan
       && overlapGroup not already used
       && phoneRules(picks + c) <= 2
       && domainCount(c.domain) < 2
       && opportunityDependent(picks + c) <= 1

9. for each pick: startRung = baseline(spec, profile); variant = teen | precaution | none
10. order: foundation, forGoal, answer, other (stable)
11. reasons: built from reasonTokens (e.g. [answer:sleep 6_7, goal:energy]) via fixed templates, never free text
```

### 4.1 Explainability
Every pick carries `reasonTokens`. They are rendered into user-facing sentences by fixed templates (one per
token combination), so every reason is predictable and testable.

### 4.2 Contradictions and missing data [PROPOSED]
| Case | Rule |
|---|---|
| Strength 2+/week but heart-rate days 0 | Raise activity days to at least 1–2 (strength implies activity); no strength habit |
| Heart-rate days 5+ but walking under 15 min | Allowed (gym-goer, sedentary otherwise). Walk or steps stay available as a support habit |
| Sleep 8–9 h + struggles most nights | Duration is fine but quality is low → wind-down and wake consistency; **never** a bedtime extension |
| Reads daily (Q8) but goal is focus | Don't add reading; use deep work or social-free start |
| "None of these" plus other options in Q8 | "None" is ignored |
| Q9 skipped or "Prefer not to say" | No tags, but the most conservative ladder **variants** for intense habits (strength starts at rung 0; no cold exposure offered by default [REVIEW]) |
| Wake time missing (skipped) | Duration-based targets instead of clock times |

---

## 5. Age rules [PROPOSED, all REVIEW]
| Age | Rules |
|---|---|
| **Under 16** (no option to select) | The age question starts at 16–17. Add a small "Schwung is made for ages 16 and up" line in the quiz, with no blocking flow (open decision: block, or just inform) |
| **16–17** | `ageBand = teen`: <br>• **Excluded:** cold exposure; any eating-restriction habit (e.g. sugary-drink elimination, kitchen-closing times); caffeine habits (until reviewed) <br>• **Adapted:** sleep ladders use teen sleep needs [REVIEW]; strength is bodyweight only, at the gentlest rungs; deep work maxes out at 60 min; copy says "school" rather than "work" <br>• **Allowed:** walk, phone-free habits, reading, breathing, journaling, top priorities, vegetables and fruit (additive), conversation and compliment (with "or a message" alternatives) |
| **18** and over | `ageBand = adult`: the full library, subject to precautions |
| **60+** | Adult rules with adapted activity ladders (gentler start rungs; balance-friendly strength variations) [REVIEW] |

**Crossing 18 during a program** [PROPOSED]:
- The app stores only an age range, never a birth date, so it never detects a birthday.
- A teen plan stays a teen plan for its whole run.
- The next Restart asks the age question again.
- This avoids storing a birth date, and avoids changing a running plan's targets.

---

## 6. Weekly habits and the 80% rule (analysis only, not proposed for v2.0)

**Repo fact:** `dayRatio` divides the day's completed habits by **that day's own `planned` list**, which each
log stores.

### Option A: scheduled days (recommended if approved)
- **How it works:** the user picks days, e.g. Mon/Wed/Fri. On scheduled days the habit is in that day's
  planned list; on other days it isn't planned at all.
- **80% rule:** works unchanged, because the ratio is computed on that day's plan.
- **Plan size per day varies.** With 5 daily habits and one 3×/week habit, the plan is 6 habits on some days
  and 5 on others. On a 5-habit day, 4 of 5 is exactly 80%; on a 6-habit day, 5 of 6 is 83%.
- **XP:** per check-off and full-day bonus, unchanged. Weekly habits just earn on fewer days.
- **Needs changes (⚠ these are mechanics):**
  - early level-up (`completionRun`) and step-down (`reconcile`) currently count *consecutive calendar
    days*. They would need to count *consecutive scheduled days*.
  - today's log must be built from the day's schedule.
  - the habit detail and Journey screens show scheduled days.
- **Edge cases:**
  - a day where every habit is weekly and unscheduled can't happen, because the foundation habit is daily;
  - moving schedule days mid-week;
  - yesterday-editing must use yesterday's schedule (already supported, since logs store their own
    planned list).

### Option B: flexible "N times a week"
- The habit isn't tied to days. It's shown daily until N completions in the week.
- **This breaks the daily ratio.** It would have to be excluded from the 80% rule or counted specially.
  Either way it changes success semantics, so it's not recommended.

### Recommendation
- Ship v2.0 with **daily habits only**. Strength stays out, or appears as a daily "mobility / 5-minute
  bodyweight" habit [REVIEW], until Option A is approved and built.

---

## 7. Compatibility and migration [PROPOSED]
1. **New optional saved fields:**
   - `programVersion?: 1 | 2` (absent = 1)
   - `profile?: ProfileV2`
   - per-habit `spec?` (§2.1)

   The saved-data version stays 1, because the store merges saved data over defaults (that's how the theme
   preference was added).
2. **Running v1 programs are untouched.** Old `answers`, plan, levels, text targets and history keep
   rendering through the current `habits.ts` text (`legacyText`). The legacy library becomes a frozen,
   read-only copy.
3. **v2 applies only on a new start:** a fresh install, or **Settings → Restart** (which already clears the
   program and asks the quiz again). Restart keeps reminder and theme, as now.
4. **No automatic upgrade** of running plans [PROPOSED]. Optionally, a later "Try the new plan" entry in
   Settings could explain the upgrade and restart with consent. That's an open decision.
5. **Habit IDs:**
   - v2 keeps an existing ID when the practice is the same.
   - A changed practice gets a new ID (e.g. `mind_breathe` replaces `mind_meditate`; `move_strength` is
     new).
   - Specs are looked up by `(id, specVersion)`.
   - **Logs store IDs only, so history stays valid.**
6. **Swaps:**
   - In a v2 program, swaps offer eligible v2 specs (same safety filtering), starting at rung r0 from the
     stored profile.
   - In a v1 program, swaps keep using the v1 library (open decision: offer v2 habits with default
     baselines).
7. **Export** includes the new fields. **Import** stays out of scope.

---

## 8. Test strategy [PROPOSED]

### Input space
The full product (5 ages × 6 goals × schedules × sleep × quality × activity × strength × walk × phone ×
2^8 routines × 2^8 precautions) is too large to test exhaustively. So:
- **Exhaustive** over the core dimensions: age × goal × sleep × quality × activity × walk × phone. That's
  5·6·5·3·4·4·5 = 36,000 profiles, with routines and precautions at none.
- **Pairwise / covering arrays** across all dimensions, including routines and precautions.
- **Seeded random sampling:** 100k profiles per CI run, fixed seed.

### Property tests (must hold for every generated profile)
- **Validity:**
  - 5–6 habits (fewer only if not enough are eligible, with a minimum of 3)
  - the foundation habit first
  - no duplicates
  - one habit per overlap group, at most 2 phone rules, at most 2 per domain, at most 1
    opportunity-dependent habit
- **Safety:**
  - no habit excluded for the age band or a tag ever appears
  - adapted variants are used when required
  - targets never exceed the age or precaution maxima
- **Teens:**
  - no cold exposure, eating restriction or caffeine habits
  - sleep ladders use teen bands
  - deep work at most 60 min
  - copy says "school"
- **Baseline:**
  - start rung never exceeds what the baseline supports
  - easy < medium < hard, with each step at most 1.5×
  - nothing the user already does is assigned; top-of-ladder baselines are excluded
- **Goal:** a core goal habit is present whenever one is eligible; at least 4 distinct plans across 6 goals
  for typical profiles.
- **Determinism:** the same profile always gives the same plan, targets and reasons.
- **Explainability:** every reason comes from a template, and reasons within a plan are distinct.

### Scenario tests
- **Contradictory answers** (the §4.2 table).
- **Missing optional data:** skipped Q9, skipped wake time, "not sure".
- **Very active users, sedentary users, shift workers, people with poor sleep quality.**
- **Teens with every precaution.**
- **Ages 16, 17, 18:** boundary tests through the age bands. A teen plan stays teen after a simulated
  birthday; Restart re-asks.

### Compatibility tests
- Every v1 snapshot (fixtures of saved states) still loads.
- Legacy targets render byte-identical; levels and history are unchanged.
- Restart produces a v2 program and keeps reminder and theme.

### Mechanics regression
- Phase level-ups, early level-up, step-down, XP and streak tests run on v2 plans and pass unchanged.
- A level maps to a rung index without changing level semantics.

### Spec lint (CI)
- Every spec has a ladder within its maxima.
- Every `why` claim has an `EvidenceRef`.
- Unreleased specs never appear in plans.

---

## 9. Needs scientific or safety review before release [REVIEW]
1. Teen sleep need bands and bedtime ladders; whether bedtime targets suit teens at all (school start times,
   circadian shift).
2. All rung values and the at-most-1.5× step rule for every ladder; safe maxima per age band.
3. Bodyweight strength: daily versus scheduled; teen and 60+ variants; joint/back adaptations.
4. Whether time-in-bed extension is ever appropriate when sleep quality is poor; wording of the
   "talk to a professional" note.
5. Hydration: whether to keep a water habit; fluid-limit precautions.
6. Cold exposure: whether to keep it for adults, and with what precautions; excluded for teens.
7. Nutrition: which additive habits are safe and useful for 16+; wording that avoids weight or body focus;
   how "I'd rather skip food habits" should be presented.
8. Digital: social-free windows versus evening phone-away; minimum and maximum windows; the shift-work
   variants.
9. Breathing durations; who should be cautious with meditation-style practices.
10. Conversation and compliment habits for socially anxious users; the "message counts" alternatives.
11. Age-question wording and the under-16 message; App Store age rating implications.
12. All user-facing `why` sentences (each must map to a verified `EvidenceRef`).

---

## 10. Implementation phases [PROPOSED]
| Phase | Scope | Mechanics change? |
|---|---|---|
| 0. Research | ChatGPT fills `EvidenceRef`s, ladders, maxima, teen and precaution rules (from §9 and the audit's §E) | No |
| 1. Spec and engine (no UI) | `HabitSpec` types and library v2 data; normalize, eligibility, needs, selection and target rendering as pure functions; full test suite (§8); frozen legacy library | No |
| 2. Quiz v2 | New questions (age, wake time and schedule, sleep quality, activity, walking, phone, routines, precautions) in the existing onboarding layout; conditional follow-ups | No |
| 3. Program v2 wiring | `programVersion`, the `spec` field on plan habits, target text through `targetText`; v2 used on fresh start and Restart; v1 untouched | No |
| 4. Swaps and habit detail | v2 swap candidates with safety filtering; precaution notes on habit detail | No |
| 5. (If approved) Weekly scheduling | Option A from §6 | **Yes ⚠** |
| 6. (Optional) Upgrade path | "Try the new plan" with consent | No |

---

## 11. Open decisions for the owner
1. **Under 16:** block with a message, or inform only?
2. **Existing users:** never offer v2 (it only comes with a Restart), or add an optional "Try the new plan"?
3. **Swaps in v1 programs:** v1 library only, or v2 habits with default baselines?
4. **Water habit:** keep, reframe, or retire for new plans (pending research)?
5. **Cold exposure:** keep for adults with precautions, or retire (it's excluded for teens either way)?
6. **Weekly scheduling (Option A):** approve as a mechanic change for a later phase?
7. **Missing precautions (Q9 skipped):** use conservative variants by default (recommended), or the standard
   ladders?
8. **Reading:** measure in pages or in minutes?
9. **Foundation habit:** keep "Make your bed" as is [AGREED for now]. Revisit after research?
10. **Release gate:** may a habit ship with a neutral, claim-free explanation before its evidence is
    verified, or must it wait?
