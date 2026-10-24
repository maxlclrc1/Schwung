# Schwung V2 — Fitness Exercise Prototypes (final, development-only)

**Status:** the four exercise habits are fully implemented as **prototypes**: content, targets, eligibility,
safety check, scheduling, progression, presentation and tests. They are **never offered** in normal V2 plans,
choices, swaps or onboarding, and never in release builds. The only way in is **Settings → Developer →
Exercise preview** (development builds), which runs the real engine and progression on synthetic profiles and an
in-memory mock program. **No clinical sign-off exists**: every target is provisional
(`SCHWUNG_V2_PHYSIO_REVIEW_PACKET.md`).

## The four habits
| Habit | Who (all rules enforced in `library.ts`) | Movements | Easy → Medium → Hard | Rhythm |
|---|---|---|---|---|
| **Beginner strength preparation** (`move_strength_prep`) | 16–64, active 0–2 days a week, no relevant precautions. **Automatic** for the fitness goal in the preview | Wall push-up · sit-to-stand from a stable chair · supported calf raise | 1 move × 5 controlled reps → 2 moves × 5–8 → 3 moves × 8–10 | 2 days a week, never consecutive (user's choice; Sat/Sun count as consecutive) |
| **Gentle strength preparation** (`move_strength_gentle`) | 65+ or joint discomfort, active 0–2 days, **clear safety check**. Choice only | Supported sit-to-stand (chair arms) · gentle wall push-up · supported heel raise | 1 move × about 5 comfortable reps → 2 × about 5–8 → 3 × about 8–10 | 2 days a week, never consecutive |
| **Supported balance practice** (`move_balance`) | 65+, **clear safety check**. Choice only | Supported stance at a worktop: hold on the whole time, feet a little closer than usual | 3 holds of about 10 s → 20 s → 30 s, **still holding on** (support is never reduced) | 3 days a week |
| **Seated mobility** (`move_seated`) | "Walking or standing for long is difficult", **clear safety check**. Choice only | Ankle movements · seated marching · arm movements (no twisting, no neck rotation; leave out anything uncomfortable) | 2 movements × about 5 → 3 × about 5 → 3 × about 8, only if comfortable | Daily, with rest any day |

## Shared safety layer (`src/core/v2/exercise.ts`)
- **Never offered** with: a heart or blood-pressure condition, pregnancy or recent birth, skipped health
  questions, or (for standing exercises) walking or standing difficulty. The wording explains that Schwung can't
  tailor exercises safely. It never says exercise is forbidden.
- **Safety check** (asked before a check-gated habit, never in the main quiz):
  - can stand safely without help
  - recent falls or significant unsteadiness
  - dizziness or fainting
  - recent fracture, surgery or joint replacement
  - clinician-imposed activity limits

  Seated mobility skips the standing question. Any unsafe answer, or **"Not sure"**, blocks the habit with a
  neutral message pointing to individual advice. Answers are stored only on the profile; there is no medical
  record.
- **Shown with every exercise habit:** the set-up, the four safety lines ("Move comfortably, without straining
  or holding your breath…"), and "Development prototype: these targets are provisional and haven't been
  clinically reviewed."

## Progression (isolated to the exercise habits)
- **No automatic level-ups at Day 22/45** for all four (`ACCEPT_ONLY_LEVEL_UPS`).
- **Offer after 7 completed sessions in a row** (scheduled: sessions; seated: days). Accepting **requires the
  self-check** "This level feels comfortable, controlled and manageable for me". Without it, the store and the
  mock program refuse. "Not yet" restarts the run, with no penalty. Staying at Easy all program is fine.
- **Step-down** after 3 missed sessions (never below Easy). **"Rest today"** (exercise habits only, on due days)
  removes the session from that day's plan: never a miss, never "done", never breaks a run. Non-scheduled days
  are never misses.
- **Schedule changes** use the schedule-history infrastructure (they apply from the day of the change).
- Every other habit's progression is unchanged.

## Fitness personas (preview gate)
| Persona | Result |
|---|---|
| Inactive 19 / 35 | Make your bed, Walk, Beginner strength (no filler) |
| Active 40 | "You already have a strong activity routine…"; no beginner exercises |
| 67, joint discomfort | Walk + choice of Supported balance or Gentle strength, after the safety check |
| 72, balance | As above |
| Limited walking | Seated mobility as a choice, after the safety check |
| Heart condition | No exercise habit; clinician note; non-fitness choices, never presented as fitness |

**Normal V2 is unchanged:** engine output for the 8 fixtures and 3,000 sampled profiles (plans, choices, notes,
limitations, swaps) is byte-identical to `5a0012c`.

## Remaining limits
- **Clinical:** physiotherapist review of every movement, target, the safety check and the stop wording
  (packet ready). Balance and seated mobility were made more conservative than the packet: supported stance
  instead of single-leg; no twisting or neck movement.
- **Release:** activating any of the four needs owner approval, then adding them to the release gate and building
  the in-app safety-check step. The logic and tests exist; that screen is only in the developer preview.
- **Native:** not tested on an iPhone. Browser testing (Chromium, 375×667, light and dark) covered the preview
  flow end to end. Dynamic Type and VoiceOver need a device. On web, checkbox state isn't exposed as
  `aria-checked`; iOS uses `accessibilityState`, which is set.
