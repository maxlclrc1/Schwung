# Schwung V2 — Accessible Movement and Fitness Positioning

**Status:**
- Both habits below are **HELD**: `release: 'held'` in the engine, never shown to users.
- Targets are product drafts that **need review by a physiotherapist** before any release.
- They are based on NHS-style exercises found via search (see `SCHWUNG_V2_EVIDENCE_REGISTER.md`, sources
  NHS-BAL and NHS-SIT, checked 2026-10-24 via search results, full pages not opened). Repetitions differ
  between NHS trusts.
- Population guidance (older adults should add balance; strength 2+ days a week) is **not** proof that this
  progression is safe for every user.

---

## A. Supported Balance Practice (`move_balance`, HELD)
**Purpose:** daily practice of standing balance with support, for older adults who can stand safely.

**Who could be offered it (when released):**
- age 65+ (or 50+ by user choice) with a fitness or calm goal, **and**
- a new conditional screen answered *Yes*: **"Can you get up from a chair and stand for about a minute
  without help from another person?"** (Yes · No · Not sure).

**Never offered if any of these apply:**
- the answer is No or Not sure
- precaution "walking or standing is difficult"
- unknown precautions
- the (proposed) precautions "fall in the last year", "dizziness or vertigo", or "recent surgery or fracture"

These need individual advice, not an app.

**Set-up (shown every time):**
- Stand at a kitchen worktop or the back of a sturdy chair that won't move, with clear floor around you.
- Wear supportive shoes or go barefoot (no socks on a smooth floor).
- If you're unsure, have someone nearby.

**Movement (one behavior across levels: a supported one-leg stand), based on the single-leg stand in
NHS-BAL:**
- Hold the support. Stand tall, then lift one foot slightly off the floor and hold, without leaning on the
  support more than needed.
- Swap legs. Breathe normally.

| Level | Target [PRODUCT, VERIFY] | Support |
|---|---|---|
| Easy | 3 holds of 5 seconds on each leg | Both hands on the support |
| Medium | 3 holds of 10 seconds on each leg | One hand on the support |
| Hard | 3 holds of 15 seconds on each leg | Fingertips resting on the support |

- The NHS-trust sheet describes holds up to 30 s; ours stops at 15 s by design.
- Progression is **only** via the existing mechanics (early level-up offer, day 22, day 45). Step-down still
  applies. **Reviewers must confirm** whether mandatory phase level-ups are acceptable here, or whether
  balance should be excluded from automatic phase progression (that would be a mechanic change, so it
  needs owner approval).

**Stop conditions (shown with the habit):** stop and sit down if you feel dizzy, faint, unsteady beyond
what the support can handle, or have chest pain or new pain. Tell a professional if this happens.

**Release requirements:**
- physiotherapist review of the exercise, holds, support levels and the screening question
- copy review
- confirmation that the habit doesn't conflict with falls-service advice

---

## B. Seated Mobility (`move_seated`, HELD, new design)
**Purpose:** a daily seated movement routine for people who find prolonged walking or standing difficult.

**Who could be offered it (when released):**
- only through the choice step or Add, **never automatically**, because people with mobility limitations
  have very varied needs;
- the precaution "walking or standing is difficult" makes it visible as a choice.

**Moves (from NHS-SIT), all seated upright in a sturdy chair without wheels, feet flat:**
1. **Chest stretch:** open the arms and push the chest forward; hold 5–10 s.
2. **Upper-body twist:** arms crossed, turn the upper body (not the hips) to one side; hold 5 s; each side.
3. **Hip march:** hold the chair sides; lift one knee as far as is comfortable, lower with control;
   alternate.
4. **Arm raises:** raise the arms, breathing out on the way up and in on the way down.
5. **Ankle stretch:** straighten one leg, pull the toes toward you, then point them away.
6. **Neck rotation:** turn the head gently to each side; hold 5 s. *Offered only if the user hasn't flagged
   neck problems (proposed option).*

**Ladder (one behavior: the seated routine, more of it):**

| Level | Target [PRODUCT, VERIFY] |
|---|---|
| Easy | 2 moves of your choice, 5 times each (or 5 holds) |
| Medium | 4 moves, 5 times each |
| Hard | All moves you can do comfortably, 5 times each |

NHS-SIT suggests at least twice a week. A daily, small version is a habit choice, not a clinical dose.

**Stop conditions:** stop if anything hurts, if you feel dizzy, or if you're short of breath. Move only as
far as is comfortable.

**Not for automatic recommendation; these need individual medical or physio guidance:**
- recent surgery, fracture or joint replacement
- severe or unexplained pain
- neurological conditions affecting movement or balance (stroke, MS, Parkinson's)
- osteoporosis with a fracture history (twisting moves)
- neck problems (neck moves)
- heart conditions with exercise restrictions
- pressure-injury risk for wheelchair users
- anyone told by a clinician to limit activity

Release requirements are the same as for A, plus a review of which moves are safe for wheelchair users.

---

## C. Fitness goal positioning
**Rules in the engine (revision 5, plus today's correction):**
- Walk is the only automatic fitness core.
- Strength preparation is choice or add only.
- **Sleep habits are no longer listed as fitness habits** (owner instruction). They can still appear for a
  real sleep need, but are never tagged as fitness.

| Group | What V2 does now | What's honest to say | Proposed improvement |
|---|---|---|---|
| **Sedentary adult** | Walk (5–10 min start) as the fitness core, plus needs. Strength preparation offered in the choice step if the plan is short | "Start with daily walking. Strength sessions on 2+ days a week are recommended, and come with a later update" (fitness note) | Scheduled strength sessions (design E) are the real fix |
| **Active adult already training** | Walk excluded at 5+ days (unless energy or calm); no strength habit; fitness support habits only if nutrition needs exist; plan may be short, so a choice step | **"You're already doing the core of getting in shape. We won't invent a fitness habit you don't need. Your plan focuses on what supports it."** (new copy) | Show this message instead of "None of our current fitness habits suit your answers yet" when activity is 3+ days. Don't suggest Strength preparation to people who may already train: add "if you don't already train" to its choice copy |
| **Older beginner (65+)** | Walk (5 min) + comfort note. Balance and gentle strength **held** | "Balance and gentle strength exercises are important at your age; we're adding reviewed ones soon. Until then: walking" | Release A (and gentle strength) after review |
| **Joint discomfort** | Walk with a comfort note; strength preparation excluded (gentle variant held) | "Keep it comfortable; stop if it hurts" | After review: gentle strength variant; seated mobility as a choice |
| **Difficulty standing or walking** | No movement habit at all, plus an honest note | "Movement habits for limited mobility aren't available yet. A professional can suggest safe options." | Seated Mobility (B) as a **choice** after review; never automatic |

**Engine status for C (updated with the development integration):**
- Applied, with the owner's approved wording: when the goal is fitness, activity is 3+ days and no fitness
  habit is in the plan, the plan shows "You already have a strong activity routine. Let's focus on the other
  changes that matter to you." instead of the fitness note or "None of our current fitness habits suit your
  answers yet".
- Strength preparation is no longer offered (plan, choice step or swap) to anyone active 3+ days a week.
- Everything else above reflects the current engine.

---

## D. Evidence update and improved designs (2026-10-24)
**Review level:** search results only (abstract excerpts and secondary summaries); see the evidence register.
**Status:** all four habits stay **HELD**. None is activated, and none is claimed to be safe for all older
adults.

### What the evidence supports, and doesn't
- **Falls (FALLS-CR, Cochrane 2019, high certainty):** balance and functional exercise lowers the fall rate by
  about 24%, and adding strength gives about 34%. Effects are **larger when a health professional (usually a
  physiotherapist) delivers the programme**. An unsupervised app habit can't assume the same effect.
- **WHO 2020 (secondary):** older adults should do multicomponent activity emphasising balance and strength
  on **3+ days a week**, at moderate or greater intensity.
- **Otago (OTAGO):** a physiotherapist-prescribed home programme reduced falls (IRR 0.68). **Adherence was
  only about 37% at 12 months.**
- **Chair-based exercise (CHAIR-EX):** better grip, arm-curl and chair-stand performance in people aged 50+.
  Mobility and balance outcomes not confirmed.
- **Progressive resistance training in older adults (PRT-OLD, Cochrane):** large strength gains and small gains
  in physical ability. **Adverse events were poorly reported**, and the authors urge caution for clinical
  populations.

### Changes to the designs (for physiotherapist review)
**A. Supported Balance Practice**
- Keep the screening question and the exclusions (falls, dizziness, recent surgery or fracture, walking
  difficulty, unknown precautions).
- Add a **3+ days a week** framing in copy: "Most days is ideal; at least 3 days a week."
- Daily remains the habit default, consistent with the 66-day mechanics.
- **New question for the reviewer:** should balance be offered only together with a referral suggestion
  ("Ask your GP about a local strength and balance class")? Supervised programmes show the larger effect.

**B. Seated Mobility**
- Keep it choice-only. Add one seated strength move (a sit-to-stand from a high chair with arms, only if the
  person can already stand up unaided), so the routine covers strength as well as mobility.
- The reviewer must confirm which moves suit wheelchair users.

**C. Gentle Strength Preparation** (for 65+, joint pain, unknown precautions)

| Level | Target [PRODUCT, VERIFY] |
|---|---|
| Easy | 1 move, 5 slow reps, holding a support |
| Medium | 2 moves, 5–8 reps each |
| Hard | 3 moves, 8–10 reps each |

- **Moves:** sit-to-stand from a chair, wall push-up, heel raises at a support (NHS-trust sheets).
- **Copy:** "Breathe normally. Stop if anything hurts." Excluded with heart/BP and pregnancy.
- **Reviewer:** joint-pain progressions, and whether daily practice needs built-in rest days.

**D. Scheduled Strength Sessions** (`move_strength_session`)
- Evidence supports **2–3 days a week** for beginners (ACSM-RT 2009; the 2026 update wasn't seen) rather than
  daily.
- The scheduled-habit design (spec section E) is unchanged and **needs owner approval** before any build,
  because it changes level-up and step-down counting.

### Fitness positioning now in the engine
- **Older beginner (65+), fitness goal:** Walk (5 min start) with the safety note, plus "Guidelines also
  recommend balance and strength activities for older adults. Schwung's versions are still being reviewed, so
  they aren't included yet."
- **Heart/BP or pregnancy:** no Walk or Slow breathing, plus "Movement and breathing habits for heart
  conditions and pregnancy are waiting for expert review. Your clinician or midwife can advise what's right
  for you."
- **Already active 3+ days with no fitness habit:** "You already have a strong activity routine. Let's focus on
  the other changes that matter to you."
- **Walking difficult:** no movement habit, and the limited-mobility note.
