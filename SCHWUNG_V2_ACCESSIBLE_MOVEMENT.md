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

**Engine status for C:**
- The "already training" copy change is a recommended next step. It's copy-only, but it isn't done yet, to
  keep this phase review-only except for the verified fixes.
- Everything else above reflects the current engine.
