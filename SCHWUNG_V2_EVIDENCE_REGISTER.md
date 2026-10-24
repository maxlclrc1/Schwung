# Schwung V2 — Evidence Register

**Scope:** every V2 `candidate` habit in `src/core/v2/library.ts` (spec revision 5).

## How sources were checked (read this first)
- **The build environment can't open who.int, cdc.gov or nhs.uk directly** (DNS is blocked by its network
  policy). Every source below was checked **through web-search results** (titles, abstracts and summaries
  that cite the source) on the date shown. **No full text was read.**
- So **"Checked (search)"** means the source exists and the stated finding appears in search summaries of
  it. It doesn't mean the full document was reviewed, and **exact figures and wording must be re-checked
  in the original before anything is quoted in the app.**
- **"Unverified"** means no source was checked for that claim.
- Population guidance (WHO, CDC, NHS) supports the **outcome or practice in general**. It is **not** evidence
  that a specific Easy/Medium/Hard rung works, or that it's safe for every user.

**Confidence scale (product recommendation, not clinical certainty):**
- **Moderate:** official guidance or meta-analytic support for the outcome, plus a reasonable practice link.
- **Low:** an observational or mixed evidence base, or the practice link is inferred.
- **Practical:** offered as a routine; no outcome claim is made.
- **Unverified:** not checked.

## Sources
| ID | Source | What was confirmed (search level) | Checked |
|---|---|---|---|
| WHO-PA | WHO physical activity guidance / 2020 guidelines ([WHO](https://who.int/initiatives/behealthy/physical-activity); [Guidelines at a glance](https://iris.who.int/server/api/core/bitstreams/f3885485-e7eb-4504-8026-edd9bb53a6ee/content)) | Adults: 150–300 min moderate or 75–150 vigorous a week, plus muscle-strengthening on 2+ days. 65+: plus balance. Ages 5–17: an average of 60 min/day across the week, plus muscle and bone strengthening on 3+ days. Pregnant and postpartum without contraindication: ≥150 min moderate | 2026-10-23 / 2026-10-24 |
| CDC-PA | CDC adult and older-adult activity ([adults](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html), [older adults](https://www.cdc.gov/physical-activity-basics/guidelines/older-adults.html)) | 150 min moderate a week; strength for all major muscle groups on 2+ days; bodyweight counts; older adults add balance | 2026-10-23 |
| CDC-SLEEP | CDC sleep ([About Sleep](https://www.cdc.gov/sleep/about/index.html), [schools](https://www.cdc.gov/healthy-schools/sleep/index.html)) | Teens 8–10 h (13–17 on one page, 13–18 on another; based on AASM); adults 18–60 7+ h | 2026-10-23 |
| WHO-DIET | WHO healthy diet ([fact sheet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)) | Fruit and veg ≥ 400 g a day (about five portions, excluding potatoes and other starchy roots); free sugars < 10% of energy (strong), < 5% (conditional); juice counts as free sugar | 2026-10-23 |
| NHS-SIT | NHS sitting exercises ([nhs.uk](https://www.nhs.uk/live-well/exercise/sitting-exercises/); [Oxford Health PDF copy](https://www.oxfordhealth.nhs.uk/wp-content/uploads/2020/04/NHS-sitting-exercises.pdf)) | Chest stretch (hold 5–10 s, ×5); upper-body twist (hold 5 s, ×5 each side); hip marching (×5 each leg); arm raises (×5); neck rotation; ankle stretch. At least twice a week | 2026-10-24 |
| NHS-BAL | NHS-trust balance and strength sheets ([Leicestershire class sheet](https://www.leicspart.nhs.uk/wp-content/uploads/2020/08/Older-Adults-Class-Exercises.pdf), [Torbay PSSB programme](https://www.torbayandsouthdevon.nhs.uk/uploads/pssb-home-exercise-programme.pdf), [North Tees standing exercises](https://www.nth.nhs.uk/resources/standing-exercises/), [NHS older-adult guidelines](https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-older-adults/)) | Heel-to-toe walk and stand (widen the base to make it easier); single-leg stand up to 30 s; marching holding a chair; heel raises at a support (2 × 10); sit-to-stand (×5–10); wall push-up (2 × 10). **Repetitions differ between trusts.** I didn't find a single national NHS balance page | 2026-10-24 |
| AASM-INS | AASM 2021 behavioral treatment of chronic insomnia ([AASM news](https://aasm.org/new-guideline-supports-behavioral-psychological-treatments-for-insomnia/)) | CBT-I is the only strong recommendation; stimulus control, sleep restriction and relaxation are conditional | 2026-10-24 |
| NHS-INS | NHS insomnia ([nhs.uk](https://www.nhs.uk/conditions/insomnia/)) | See a GP if changing sleep habits hasn't worked, or trouble sleeping has lasted months; talking therapy is the usual route; possible referral for suspected sleep apnoea | 2026-10-24 |
| SCREEN-SLEEP | Reviews of device use and sleep ([adolescent umbrella review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12564284/); [16–25 systematic review](https://portal.findresearcher.sdu.dk/da/publications/digital-media-use-and-sleep-in-late-adolescence-and-young-adultho/); [Scottish Government review](https://gov.scot/publications/systematic-literature-review-relationship-between-adolescents-screen-time-sleep-mental-health/pages/7)) | Bedtime and night-time phone or social media use is **associated** with later bedtimes, shorter sleep and poorer quality. **Mostly observational; causation unclear**; experimental evidence is small and low quality | 2026-10-24 |
| STEPS | Paluch et al. 2022, *Lancet Public Health* 7(3):e219–28, 15 cohorts, 47,471 adults ([UCL open access](https://discovery.ucl.ac.uk/id/eprint/10170017/1/1-s2.0-S2468266721003029-main.pdf)) | Higher daily steps are associated with lower all-cause mortality (Q4 vs Q1 HR 0.47); "little evidence" for 10,000 specifically. **The plateau and age findings weren't confirmed** | 2026-10-24 |
| BREATH | Fincham et al. 2023, *Sci Rep* 13:432, breathwork meta-analysis of RCTs ([figshare](https://sussex.figshare.com/articles/journal_contribution/Effect_of_breathwork_on_stress_and_mental_health_a_meta-analysis_of_randomised-controlled_trials/23494097/1)) | Lower self-reported stress vs control, g = −0.35 (small to medium). **Slow-versus-fast subgroup not confirmed** | 2026-10-24 |
| WRITE | Frattaroli 2006, *Psychol Bull* 132(6):823–65, 146 studies ([PDF](https://Www.Gwern.net/doc/psychology/2006-frattaroli.pdf)) | Expressive writing: a small average effect (r = .075); later meta-analyses are weaker or null in some domains | 2026-10-24 |
| SOCIAL | Holt-Lunstad et al. 2010, *PLoS Med* 7(7):e1000316, 148 studies ([DOAJ](https://doaj.org/article/c9833ba608474b048444b92ae7ee48ad)) | Stronger social relationships are associated with survival, OR 1.50. **Observational** | 2026-10-24 |
| II | Gollwitzer & Sheeran 2006, *Adv Exp Soc Psychol* 38:69–119 ([record](https://stafforini.com/works/gollwitzer-2006-implementation-intentions-and/)) | Implementation intentions improve goal attainment, d ≈ 0.65 (94 tests). **Only secondary summaries were found** | 2026-10-24 |
| SM-LIMIT | Hunt et al. 2018, *J Soc Clin Psychol* (143 students), and a later replication reported by APS ([APS](https://www.psychologicalscience.org/news/2026-aug-young-adults-social-media-well-being.html)) | Limiting social media to 10 min per platform reduced loneliness and depression in the original study; **a replication with 644 participants found no well-being benefit, and adherence was poor** | 2026-10-24 |
| FV-MA | Aune et al. 2017, *Int J Epidemiol*, 95 studies ([White Rose](https://eprints.whiterose.ac.uk/106013)) | Higher fruit and veg intake is associated with lower CVD and all-cause mortality, up to about 800 g/day. **Observational** ("if causal") | 2026-10-24 |
| HYPO | NHS low blood sugar ([nhs.uk](https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/); [Guy's and St Thomas'](https://www.guysandstthomas.nhs.uk/health-information/diabetes-treatment-and-safe-use-insulin/low-blood-sugar-hypoglycaemia-or-hypos)) | Hypos are treated with a sugary drink or juice (150–200 ml), recheck after 10–15 min, and follow your care team's plan | 2026-10-24 |
| AAP-ED | AAP 2016, "Preventing obesity and eating disorders in adolescents", *Pediatrics* (secondary coverage only, e.g. [AJMC](https://www.ajmc.com/newsroom/preventing-obesity-and-eating-disorders-in-teenagers)) | Don't encourage dieting; avoid weight talk; promote family meals and exercise for fitness, not weight. **Primary not seen** | 2026-10-24 |
| HABIT66 | Lally et al. 2010, *Eur J Soc Psychol* 40:998–1009 ([BPS digest](https://bps.org.uk/research-digest/how-form-habit)) | Median about 66 days to automaticity, range about 18–254. **The 66 days may describe only the well-fitting subset; 254 is extrapolated** | 2026-10-24 |
| LIGHT | Reviews of light exposure ([Frontiers 2021](https://public-pages-files-2025.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.765750/text); [Sleep Health 2021](https://pubmed.ncbi.nlm.nih.gov/34420891/); [Cochrane CD012243](https://www.cochrane.org/evidence/CD012243_workplace-lighting-improving-alertness-and-mood-daytime-workers)) | Bright light's alerting effect is supported; **evidence on morning daylight specifically is thin and conflicting** | 2026-10-24 |
| BP-STRENGTH | Resistance-exercise breathing guidance (ACSM as summarized in [JMIR Cardio](https://cardio.jmir.org/2020/1/e16354); [BJSM study](https://bjsm.bmj.com/content/26/2/97)) | Breathe normally, without breath-holding (Valsalva); breath-holding raises blood-pressure response. **No NHS or AHA page found** | 2026-10-24 |
| APPLE-AGE | Apple age-rating update ([9to5Mac](https://9to5mac.com/2025/07/24/apple-notifies-developers-of-new-app-store-age-rating-system/)) | New ratings include 13+, **16+** and 18+; regional ratings; a wellness-content question. **Secondary reporting from 2025** | 2026-10-24 |

---

## Register by habit
**Legend:**
- **Outcome** = evidence for the underlying health or behavioral outcome.
- **Practice** = evidence for this practice.
- **Rungs** = evidence for the Easy/Medium/Hard targets (none are evidence-based: all are [PRODUCT]).

| # | Habit | Outcome | Practice | Rungs | Age | Precautions | Supported user-facing explanation | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | Make your bed | None claimed | None found | Product | All | — | "A small win to start the day." (no outcome claim) | Practical |
| 2 | Earlier bedtime | Sleep duration: guidance exists (CDC-SLEEP) | Unverified that stepwise earlier bedtimes increase sleep | Product (15-min steps; 9 h / 10 h ceilings unverified) | Teen band 8–10 h (CDC-SLEEP). Teen bedtimes face school start times (unverified) | Not with insomnia symptoms (AASM-INS: CBT-I is the treatment; time-in-bed changes belong in clinician-guided therapy). Not with a sleep condition or unknown precautions | "Getting into bed a little earlier than you do now." Optional factual line: "Health guidance suggests at least 7 hours for adults (8–10 for teens)." | Low |
| 3 | Steady wake-up | Unverified | Unverified | Product | All | Shift or irregular schedules excluded | "Getting up at about the same time each day." (no claim) | Unverified |
| 4 | Phone-free wind-down | Sleep: association only (SCREEN-SLEEP) | Unverified as an intervention | Product | Strongest associations in adolescents and young adults | — | "A screen-free stretch before bed." **Don't claim it improves sleep** | Low |
| 5 | Morning daylight | Mixed (LIGHT) | Thin evidence for morning daylight specifically | Product | All | Shift workers: variant | "Daylight early in your day." (no claim) | Low |
| 6 | Walk | Strong for physical activity in general (WHO-PA, CDC-PA); steps associated with mortality (STEPS) | Walking counts as moderate activity when brisk (CDC-PA) | Product (5 → 60 min) | WHO 5–17 average 60 min/day; 65+ add balance | Pregnancy: activity recommended without contraindication (WHO-PA). Heart/BP, joint, 65+: comfort note; not medical clearance | "A daily walk at a comfortable pace." Optional factual line: "Guidelines suggest about 150 minutes of moderate activity a week for adults." | Moderate |
| 7 | Strength preparation (add or choice only) | Strong for muscle-strengthening in general (WHO-PA, CDC-PA) | Bodyweight counts (CDC-PA); single-set micro-dose unverified | Product | Teens: guidance is 3+ days for muscle and bone | Heart/BP: no breath-holding (BP-STRENGTH); excluded in V2. Pregnancy excluded. Gentle variant held | Mandatory: "Practice for a strength routine, not a full strength workout. Guidelines recommend strength work on 2+ days a week." | Low (as a habit bridge) |
| 8 | Fruit and veg | Associated with lower CVD and mortality (FV-MA); WHO ≥ 400 g (WHO-DIET) | Additive portions: unverified as an intervention | Product (1–5 portions; top = about the WHO amount) | Teens: additive only; no weight talk (AAP-ED) | Food opt-out | "Adding fruit and veg to your day." + "Builds the habit; doesn't measure whether your diet meets guidelines." | Moderate (outcome), Low (practice) |
| 9 | Unsweetened drinks (18+) | WHO free-sugar limits (WHO-DIET) | Swapping sugary drinks: unverified as an intervention | Product | Adults only | **Diabetes: hypos are treated with sugary drinks (HYPO).** Mandatory note added to the engine | "An easy swap for a sugary drink." + "If you use a sugary drink or juice to treat low blood sugar, always do that. It never counts against this habit." | Moderate (outcome), Low (practice) |
| 10 | Water with meals (add-only) | Unverified | Unverified | Product | All | Fluid limit excluded | "A glass of water with meals, if it suits you." (no claim) | Unverified |
| 11 | Phone-free start | Unverified | Unverified | Product | — | — | No claim | Unverified |
| 12 | Social-free start | Mixed: one RCT positive, a replication null (SM-LIMIT) | Morning-window limits specifically: unverified | Product | Young adults: adherence problems (SM-LIMIT) | — | "Keep social apps out of your first hours." **No well-being claim** | Low |
| 13 | App limit | Same as 12 | Unverified | Product | — | — | No claim | Low |
| 14 | Read | Unverified | Unverified | Product (minutes) | — | — | No claim | Unverified |
| 15 | Slow breathing | Breathwork lowers self-reported stress, small to medium effect (BREATH) | Slow-paced specifically: subgroup unconfirmed | Product (2 → 10 min) | — | Low-quality sources only: stop if dizzy or faint; caution with panic susceptibility, cardiovascular disease, pregnancy; no breath-holding (BP-STRENGTH principle) | "A few slow minutes to take the edge off." Optional: "Breathing exercises have been found to lower stress a little in studies." | Moderate (outcome), Low (dose) |
| 16 | Journal | Expressive writing: small and inconsistent (WRITE) | Our prompt isn't expressive writing per se | Product | — | Rumination risk: unverified | "A sentence or two to clear your head." (no claim) | Low |
| 17 | Deep work | Unverified | Unverified | Product | Teens ≤ 60 min | — | No claim | Unverified |
| 18 | First task | Implementation intentions improve goal attainment (II, secondary) | Plan-then-start is similar but not identical | Product | — | — | "Decide your most important task and start with it." | Low |
| 19 | Reach out | Social connection is associated with survival (SOCIAL) | Daily messages: unverified | Product | — | — | "A quick message to someone you care about." (no mortality claim) | Low |
| 20 | Genuine compliment | Unverified | Unverified | Product | — | — | No claim | Unverified |
| 21 | Start a conversation (choice only) | Unverified for confidence | Graded exposure: unverified here | Product | — | Social anxiety: caution (unverified) | No claim | Unverified |
| — | Program length (66 days) | Habit automaticity takes weeks to months, very variable (HABIT66) | — | — | — | — | "Habits take time to stick, often around two months." **Avoid "66 days makes a habit"** | Low |

## What the register changes
1. **Engine correction (verified):** Unsweetened drinks now carries the low-blood-sugar note (HYPO). Test
   added.
2. **Copy rule:** reasons stay claim-free. Optional factual lines may quote **population guidance only**, in
   neutral words, and only after the source is re-checked in full.
3. **Not supported, so never claim:**
   - "phone-free improves sleep"
   - "limiting social media improves well-being"
   - "10,000 steps"
   - "66 days builds a habit"
   - any mortality or "live longer" framing
