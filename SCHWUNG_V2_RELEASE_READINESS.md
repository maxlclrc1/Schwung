# Schwung V2 — Release Readiness

**State:**
- The V2 engine (`src/core/v2/`) is implemented, tested and **disconnected**.
- V1 behavior, the quiz, onboarding and saved data are unchanged.
- Sources were checked 2026-10-23/24 **via web-search results only** (see the evidence register).

**Engine changes in this phase (both verified or owner-directed):**
1. A low-blood-sugar note on Unsweetened drinks (NHS hypo advice).
2. Sleep habits removed from the fitness goal list.

**Checks:** 154 tests pass across 11 suites; typecheck and lint are clean.

---

## Task 4 — Final safety review

### Resolved (direction decided and supported at search level)
| Topic | Resolution | Basis |
|---|---|---|
| Teen sleep duration | Teen band is 8–10 h; the engine scores teens under 8 h as a need | CDC-SLEEP |
| Insomnia and bedtime | No bedtime extension with trouble 1–2+ nights a week, a sleep condition, or unknown precautions. Insomnia treatment (CBT-I, including sleep restriction) is clinician-guided, not an app habit | AASM-INS |
| Sleep-referral wording | Trouble 3+ nights: "Trouble sleeping on most nights is worth mentioning to a doctor or another health professional." Consistent with NHS advice to see a GP if habit changes don't help or it lasts months | NHS-INS |
| Diabetes and drinks | A mandatory note on Unsweetened drinks: treating low blood sugar always comes first | HYPO |
| Teen nutrition | Food habits additive only; no weight, calorie or diet language; never the drink restriction; food opt-out available | AAP-ED (secondary) |
| Strength and blood pressure | V2 excludes Strength preparation with heart/BP. If later allowed, the copy must say "breathe normally, don't hold your breath" | BP-STRENGTH |
| Pregnancy | Movement allowed by guidance for those without contraindications, but **V2 keeps Strength preparation excluded** and shows a walk note | WHO-PA |
| Under-16 | Stop screen, nothing saved. **Set the App Store age rating to 16+**, which Apple added in 2025 | APPLE-AGE (secondary; re-check in App Store Connect) |

### Unresolved (needs expert or primary-source review)
1. **Sleep ceilings** (9 h adult, 10 h teen time in bed): product choices, not checked against any source.
2. **Teen bedtime pacing and school start times:** unverified.
3. **Whether trouble 1–2 nights a week should block bedtime** (possibly over-cautious): needs sleep-medicine
   review.
4. **Breathing cautions:** only low-quality sources found (stop if dizzy; care with panic, cardiovascular
   disease, pregnancy). Needs a clinical source.
5. **Pregnancy and heart/BP walking-note wording:** must not read as medical clearance. Needs review.
6. **Teen disordered-eating safeguards:** the AAP primary paper wasn't seen. Does a portions habit carry
   any risk for teens with an eating-disorder history? Should the food opt-out be more prominent? Expert
   review needed.
7. **Diabetes beyond hypos** (e.g. people on glucose-lowering medication changing drink habits): should
   there be a diabetes precaution option? Needs review.
8. **Re-check every figure** in WHO, CDC and NHS sources against the full documents (search-level only so
   far).
9. **Regional age and consent rules** beyond the App Store rating (e.g. data-protection age of consent):
   not reviewed. The app stores data only on the device, but this needs confirming.

---

## Task 5 — Release checklist

### ✅ Safe to implement (and activate once wired, subject to the release-gate decision)
These have practical, claim-free copy, low risk, and no unresolved safety issue:
- **Engine mechanics:** goal-first selection, eligibility, the baseline window, the choice step and the
  minimum of 3, swaps at Easy, determinism.
- **Habits:**
  - Make your bed
  - Steady wake-up
  - Morning daylight
  - Phone-free start
  - Social-free start
  - App limit
  - Read
  - Deep work (teen cap)
  - First task
  - Reach out
  - Genuine compliment
  - Journal
- **Notes and screens:** under-16 stop screen; unknown-precautions note; sleep-trouble referral note;
  fitness note.

### 🟡 Safe to implement but not activate (needs review first)
- **Walk:** low risk, but the precaution-note wording (#5) must be reviewed.
- **Earlier bedtime:** ceilings and teen pacing (#1–3).
- **Phone-free wind-down:** fine to ship claim-free. It's listed here only because its sleep claim is
  unsupported, so it ships with no claim.
- **Fruit and veg:** teen safeguard review (#6).
- **Unsweetened drinks (18+):** diabetes review beyond hypos (#7).
- **Slow breathing:** caution wording (#4).
- **Strength preparation** (choice or add, standard variant): blood-pressure breathing copy; "if you don't
  already train" copy.
- **Water with meals (add-only):** low risk; claim-free.
- **Start a conversation (choice only):** social-anxiety framing.
- **Wiring:** quiz V2 screens, the V2 program flag, swaps UI, and migration fields. Build them behind a flag;
  activate only on a fresh start or Restart, after approval.

### ⏸ Held pending scientific or physiotherapy review
- Supported Balance Practice (`move_balance`)
- Seated Mobility (`move_seated`, not yet in the engine)
- the gentle Strength preparation variant (65+, joint, unknown precautions)
- Scheduled habits and Strength session (`move_strength_session`): a mechanics change, which also needs
  owner approval

### ❌ Not suitable for Schwung
- Cold exposure
- Calorie counting, weight-loss targets, BMI, fasting challenges, restrictive diets (for anyone; especially
  under 18s)
- Universal water quantities
- Clinical insomnia treatment (sleep restriction, stimulus control) as self-guided habits
- Any habit for under-16s
- Outcome claims the evidence doesn't support: "improves sleep", "improves well-being", "live longer",
  "10,000 steps", "66 days makes a habit"

---

## Remaining decisions for the owner
Decided on 2026-10-24 (see `SCHWUNG_V2_DEV_INTEGRATION.md`): the 12 ✅ habits are cleared for **development
testing only**; the audience is 16+ with the stop screen kept; the "already training" copy is applied; V2 is
wired behind a development flag that is off by default.

Still open:
1. **Release gate:** public activation of any V2 habit.
2. **App Store age rating:** verify 16+ in App Store Connect before release (not assumed anywhere in code).
3. **Expert reviewers** (sleep, physio, dietitian) for the 🟡 and ⏸ items: who, and when?
