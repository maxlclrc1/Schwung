# Schwung V2 — Release Readiness

**State (2026-10-24, after the evidence and safety review):**
- V2 runs **only behind the `__DEV__` development flag** (`SCHWUNG_V2_DEV_INTEGRATION.md`); it is not
  released. V1 behavior, data and progress are unchanged.
- Sources were checked **via web-search results only**: primary sites, PubMed and journals are blocked in this
  environment. See `SCHWUNG_V2_EVIDENCE_REGISTER.md`, which records the review level of every source.
- **Development gate:** 20 habits are cleared, each with the restrictions below. Strength preparation is
  pending review. Balance, seated mobility, gentle strength and strength sessions are held.
- **Checks:** 221 tests across 13 suites pass; typecheck, lint and Prettier are clean.

---

## Safety review

### Resolved for development testing (search-level evidence; re-check before release)
| Topic | Decision now in the engine | Basis |
|---|---|---|
| Adult sleep band and ceiling | Earlier bedtime only when under 7 h; time in bed never above 9 h; not offered if fewer than 3 steps fit | AASM-ADULT (over 9 h appropriate only for some groups) |
| Teen bedtime and early school starts | **No Earlier bedtime for 16–17** until sleep-expert review; teens with a sleep need get a phone-free wind-down or morning daylight instead | AAP-SST (circadian delay); PARENT-BED (observational only) |
| Irregular schedules | No Earlier bedtime when the wake time varies or with shift work; never started without W1 and W2 | The ceiling needs both times |
| Sleep difficulties | No Earlier bedtime with trouble 1–2+ nights a week, a sleep condition or unknown precautions. Trouble on most nights shows the professional-advice note. Wind-down starts one step up | AASM-INS, NHS-INS |
| Walking with joint pain, 65+, unknown | Walk allowed with: "Keep it comfortable and stop if it hurts. Stop and get medical help if you have chest pain, feel faint, or are much more out of breath than usual." | NICE-OA (exercise is core for OA); HEART-SIGNS (non-guideline) |
| Walking with heart/BP or pregnancy | **Not offered** (pending expert review), with a plan note pointing to the clinician or midwife | ACOG-804 (safe *without* complications, after evaluation); ACSM-SCREEN |
| Breathwork | Gentle, no breath-holding, stop if dizzy or panicky (mandatory note). **Not offered with heart/BP or pregnancy** | BREATH, BREATH-AE (light-headedness in small trials), AHA-BP |
| Teen nutrition | **No Fruit and veg for 16–17** (pending review); no drinks habit under 18; food opt-out; "if counting food ever feels stressful, swap this habit" | TRACK-ED, AAP-ED |
| Diabetes and drinks | Low-blood-sugar treatment always comes first; "your care team's advice comes first" | HYPO, ADA-SOC |
| Strength preparation | Not offered to people active 3+ days; not in the development gate at all | Owner instruction; ACSM-RT |
| Under-16 | Stop screen, nothing saved. **The App Store age rating must be checked in App Store Connect** (not assumed in code) | — |

### Still unresolved (blocks public release)
1. **P1 — Full-text verification:** every source, figure and quoted line is search-level only.
2. **Sleep expert:** the 9 h ceiling (a product choice); teen bedtimes; whether trouble 1–2 nights a week
   should block Earlier bedtime.
3. **Clinician (cardiology or sports medicine) and midwife:** whether Walk and Slow breathing can be offered
   with heart/BP conditions or in pregnancy, and with what copy. The warning-sign wording comes from
   non-guideline sources.
4. **Physiotherapist:** "stop if it hurts" for joint pain (NICE says pain may rise at first); Strength
   preparation redesign; all accessible-movement designs.
5. **Psychologist:** panic and breath-focused anxiety (Slow breathing); social-anxiety framing (Start a
   conversation).
6. **Eating-disorder-informed dietitian:** Fruit and veg for 16–17; whether adults need an opt-out prompt.
7. **Diabetes educator:** whether Unsweetened drinks needs more than the current note.
8. **Regional age and consent rules**, and the App Store 16+ rating.

---

## Habit status
| Habit | Status | Restrictions in the engine |
|---|---|---|
| Make your bed, Steady wake-up, Morning daylight, Phone-free start, Social-free start, App limit, Read, Journal, Deep work, First task, Reach out, Genuine compliment | READY FOR DEV TESTING | As before (teen deep work ≤ 60 min) |
| Walk | READY FOR DEV TESTING | Not with heart/BP, pregnancy, walking difficulty; safety note for joint, 65+, unknown |
| Earlier bedtime | READY FOR DEV TESTING (18+) · PENDING EXPERT REVIEW (16–17) | Adult band, 9 h ceiling, regular wake time, both times answered, no sleep trouble or condition, known precautions |
| Phone-free wind-down | READY FOR DEV TESTING | Phone 1 h+; claim-free |
| Slow breathing | READY FOR DEV TESTING | Not with heart/BP or pregnancy; mandatory safety note |
| Fruit and veg | READY FOR DEV TESTING (18+) · PENDING EXPERT REVIEW (16–17) | Food opt-out; stress note |
| Unsweetened drinks | READY FOR DEV TESTING (18+) | Hypo and care-team note |
| Water with meals | READY FOR DEV TESTING | Add-only (swaps); not with a fluid limit |
| Start a conversation | READY FOR DEV TESTING | Choice-only; gentle note |
| Strength preparation | PENDING EXPERT REVIEW | Out of the gate |
| Supported Balance Practice, Seated Mobility, Gentle Strength, Strength sessions | HELD | Never selectable |
| Cold exposure, water quantities, step counts, calorie or weight habits | RETIRED | Not in V2 |

## What still prevents public release
- the items in "Still unresolved" above (expert reviews and full-text checks)
- the owner's release-gate decision and App Store age-rating verification
- real-device testing of the full V2 flow with VoiceOver
- held accessible-movement habits, which means the fitness goal is still thin for older adults and people with
  limited mobility (they get Walk or an honest note)
- removing the `__DEV__` restriction, which needs explicit owner approval
