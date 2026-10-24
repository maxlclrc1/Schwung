# Schwung V2 — Evidence Register

**Scope:** every V2 habit in `src/core/v2/library.ts` (spec revision 6). Last review: **2026-10-24**.

## How sources were checked (read this first)
- **No primary source was opened in full.** This build environment can't reach who.int, cdc.gov, nhs.uk,
  PubMed, PMC, journal sites, Crossref, OpenAlex or Semantic Scholar. Each one was tried on 2026-10-24 and
  refused by the network policy.
- Every source below was checked through **web-search results** only: titles, abstract excerpts and
  summaries quoted in the results.
- **Review level** says exactly what was seen:
  - **Search result (abstract excerpt):** the results quoted the source's own abstract or figures.
  - **Search result (secondary):** only third-party summaries of the source were seen.
- Nothing here counts as "verified in full text". **Before public release, every figure and every quoted
  recommendation must be re-checked in the original** (release-readiness doc, blocker P1).
- Evidence levels are kept apart:
  - **Behaviour:** evidence that the behaviour is beneficial.
  - **Habit:** evidence that this habit, as designed, improves the intended outcome.
  - **Targets:** evidence for the specific Easy/Medium/Hard numbers.
  - **Product:** a design choice, not evidence.
- **Population guidance (WHO, CDC, NHS, CMO) is never treated as proof that a daily target is clinically
  validated.**

**Statuses**
- **READY FOR DEV TESTING:** enough evidence and safety review for controlled development use (behind the
  `__DEV__` flag), with the stated restrictions. **Not a release approval.**
- **PENDING EXPERT REVIEW:** a qualified reviewer must sign off before activation.
- **HELD:** not eligible for selection.
- **RETIRED:** excluded from V2.

## Sources
All verification dates: **2026-10-24** unless marked 2026-10-23. Publication dates as reported in the
results.

| ID | Source (link) | Published | Review level | What the results showed |
|---|---|---|---|---|
| AASM-ADULT | Watson et al., *Recommended amount of sleep for a healthy adult*, AASM/SRS joint consensus, J Clin Sleep Med 11(6):591–2 ([AASM PDF](https://www.aasm.org/resources/pdf/adultsleepdurationconsensus.pdf), [PubMed 25979105](https://pubmed.ncbi.nlm.nih.gov/25979105/)) | 2015 | Search result (abstract excerpt) | Adults: 7 h or more regularly. Over 9 h may suit young adults, people recovering sleep debt and people who are ill; for others it is uncertain whether more than 9 h carries health risk |
| AASM-PED | Paruthi et al., pediatric sleep duration consensus, J Clin Sleep Med ([AASM methods PDF](https://aasm.org/resources/pdf/pediatricsleepdurationmethods.pdf)) | June 2016 | Search result (secondary) | 13–18 years: 8–10 h per 24 h; endorsed by the AAP |
| CDC-SLEEP | CDC, About Sleep ([cdc.gov](https://www.cdc.gov/sleep/about/index.html)) | Undated page | Search result (secondary), 2026-10-23 | Teens 8–10 h; adults 7+ h |
| AAP-SST | AAP policy statement, *School Start Times for Adolescents*, Pediatrics; CDC MMWR summary ([MMWR mm6430a1](https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6430a1.htm), [Sleep Review](https://sleepreviewmag.com/2014/08/aap-recommends-delaying-school-start-times-combat-teen-sleep-deprivation)) | Aug/Sep 2014; MMWR 2015 | Search result (secondary) | The adolescent body clock shifts later at puberty (summaries say up to about 2 h). Early school starts plus delayed bedtimes cause insufficient sleep. AAP recommends starts no earlier than 8:30 |
| PARENT-BED | Short et al., *Time for bed: parent-set bedtimes…*, Sleep 34(6):797–800 ([Adelaide](https://digital.library.adelaide.edu.au/items/5e20e973-6f6e-4b63-87b7-e43117dd4da2)); bedtime-rules cohort, J Sleep Res 2023 | 2011; 2023 | Search result (abstract excerpt) | Observational: parent-set bedtimes and bedtime rules are associated with earlier bedtimes and longer sleep (about 20 min in the 2023 cohort). **Not causal** |
| AASM-INS | AASM clinical practice guideline, behavioural treatment of chronic insomnia ([AASM news](https://aasm.org/new-guideline-supports-behavioral-psychological-treatments-for-insomnia/)) | 2021 | Search result (secondary), 2026-10-24 | CBT-I is the only strong recommendation; sleep restriction, stimulus control and relaxation are conditional and clinician-guided |
| NHS-INS | NHS insomnia ([nhs.uk](https://www.nhs.uk/conditions/insomnia/)) and NHS trust sleep-hygiene leaflets ([NHS Inform](https://nhsinform.scot/mind-to-mind/sleeping-better/sleep-hygiene), [Royal Berkshire](https://www.royalberkshire.nhs.uk/media/qowjobz5/sleep-hygiene_dec23.pdf), [UCLH](https://uclh.nhs.uk/patients-and-visitors/patient-information-pages/sleep-hygeine)) | Various | Search result (secondary) | See a GP if habit changes don't help or the problem lasts months. Leaflets: go to bed when sleepy; keep a fixed wake time; stop screens about an hour before sleep. **Wording varies between trusts** |
| SCREEN-SLEEP | Reviews of device use and sleep ([adolescent umbrella review, PMC12564284](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12564284/); [Scottish Government review](https://gov.scot/publications/systematic-literature-review-relationship-between-adolescents-screen-time-sleep-mental-health/pages/7)) | Various | Search result (secondary) | Bedtime phone use is **associated** with later and shorter sleep; mostly observational |
| PHONE-RCT | He et al., pilot RCT, phone restriction 30 min before bed, PLOS One ([PMC7010281](https://pmc.ncbi.nlm.nih.gov/articles/PMC7010281)); registered trial [ISRCTN12324806](https://www.isrctn.com/ISRCTN12324806) | 2020; ongoing | Search result (abstract excerpt) | 38 students. The authors note earlier trials are **contradictory**. The larger Swedish trial has no results yet |
| WHO-PA | WHO 2020 guidelines on physical activity ([WHO](https://who.int/initiatives/behealthy/physical-activity)); older-adult recommendation as indexed in [BIGG](https://bigg-rec.bvsalud.org/en/recommendations/8c64a2551e781460655d7953a0b4b2a45d934c79) | 2020 | Search result (secondary) | Adults 150–300 min moderate a week plus strength on 2+ days. 65+: multicomponent activity emphasising functional balance and strength on 3+ days (strong, moderate certainty). Pregnancy without contraindication: ≥150 min |
| CDC-PA | CDC adult and older-adult guidelines ([adults](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html), [older adults](https://www.cdc.gov/physical-activity-basics/guidelines/older-adults.html)) | Undated pages | Search result (secondary), 2026-10-23 | 150 min moderate a week; strength 2+ days; older adults add balance |
| UK-CMO | UK Chief Medical Officers' physical activity guidelines ([gov.uk](https://gov.uk/government/publications/physical-activity-guidelines-uk-chief-medical-officers-report/uk-chief-medical-officers-physical-activity-guidelines); [Bristol](https://www.bristol.ac.uk/news/2019/september/physical-activity-guidelines.html)) | Sep 2019 (the online page may have been revised since) | Search result (secondary) | Adults: strength on 2+ days; older adults: strength, balance and flexibility twice weekly; 150 min is not an absolute threshold |
| WALK-MA | Hanson & Jones, walking groups systematic review and meta-analysis, BJSM 49(11):710–5 ([UEA](https://ueaeprints.uea.ac.uk/51910/)) | 2015 | Search result (abstract excerpt) | 42 studies, 1,843 people: lower blood pressure (systolic −3.7 mmHg) and higher fitness (VO2max +2.7), depression scores down (SMD −0.67), **few adverse events**. Pre-post pooled, not controlled comparisons |
| STEPS | Paluch et al., Lancet Public Health 7(3):e219–28 ([UCL PDF](https://discovery.ucl.ac.uk/id/eprint/10170017/1/1-s2.0-S2468266721003029-main.pdf)) | 2022 | Search result (abstract excerpt), 2026-10-24 | More daily steps are associated with lower mortality; observational |
| ACOG-804 | ACOG Committee Opinion 804, physical activity in pregnancy and postpartum ([OPQIC summary](https://opqic.org/acog-committee-opinion-no-804-physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period/)) | 2020 | Search result (secondary) | Safe and desirable **without** obstetric or medical complications. Clinical evaluation before starting is suggested. **The warning-sign list was not seen** |
| ACSM-SCREEN | ACSM 2015 preparticipation screening ([ACE summary](https://www.acefitness.org/education-and-resources/professional/expert-articles/6921/new-preparticipation-screening-guidelines-what-health-and-fitness-pros-need-to-know/); [Leeds Beckett PDF](https://eprints.leedsbeckett.ac.uk/id/eprint/5566/1/ACSMPre-participationHealthScreeningGuidelinesAM-PRICE.pdf)) | 2015 | Search result (secondary) | Referral depends on current activity, known cardiovascular, metabolic or renal disease and symptoms, and intended intensity. **The rule for light walking with known disease was not seen** |
| HEART-SIGNS | Exercise warning signs with heart conditions ([Mayo Clinic](https://www.mayoclinic.org/uk/news/should-you-exercise-if-you-have-heart-disease), [Healthline](https://www.healthline.com/health/heart-disease/problems-during-exercise)) | Various | Search result (secondary, **non-guideline sources**) | Stop for chest pain, unusual breathlessness, dizziness or fainting; get help if it doesn't ease. **No BHF or AHA page was retrieved** |
| NICE-OA | NICE NG226, osteoarthritis ([nice.org.uk](https://www.nice.org.uk/guidance/ng226/chapter/Recommendations)) | Oct 2022 | Search result (abstract excerpt) | Offer tailored exercise to everyone with OA (strengthening and general aerobic fitness). Warn that pain may rise at first but exercise still helps |
| AHA-BP | Brook et al., *Beyond medications and diet: alternative approaches to lowering blood pressure*, AHA scientific statement, Hypertension 61:1360–83 ([AHA summary](https://professional.heart.org/en/science-news/beyond-medications-and-diet-alternative-approaches-to-lowering-blood-pressure)) | 2013 | Search result (secondary) | Device-guided slow breathing: Class IIa, level B ("reasonable") for lowering BP; evidence modest |
| BREATH | Fincham et al., breathwork meta-analysis of RCTs, Sci Rep 13:432 ([PMC9828383](https://pmc.ncbi.nlm.nih.gov/articles/PMC9828383/)) | Jan 2023 | Search result (abstract excerpt) | Lower self-reported stress, g ≈ −0.35. Mostly slow-breathing trials at moderate to high risk of bias; the authors urge caution about hype. **Adverse events not seen** |
| SLOW-PHYS | Zaccaro et al. 2018, slow breathing systematic review ([Frontiers](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/text)); physiology review ([PubMed 29209423](https://pubmed.ncbi.nlm.nih.gov/29209423/)) | 2018; 2017 | Search result (abstract excerpt) | Mechanisms (HRV, EEG) in healthy people; no adverse-event synthesis |
| BREATH-AE | Trial registrations reporting light-headedness during paced breathing ([NCT05602220](https://clinicaltrials.gov/study/NCT05602220), [NCT01048424](https://clinicaltrials.gov/study/NCT01048424), [NCT00569166](https://clinicaltrials.gov/study/NCT00569166)) | Various | Search result (abstract excerpt) | Light-headedness in about 1 of 8 to 1 of 31 participants in small trials; no serious events reported. **Too small to estimate risk** |
| NHS-BREATH | NHS breathing exercise for stress, as reproduced by the NI health service ([HealthWell](https://healthwell.eani.org.uk/healthtopic/mental-health/breathing-exercises-stress?type_1=2)) | Undated | Search result (secondary) | Breathe in gently, out without pausing, counting to 5 if helpful; keep going for 3–5 minutes |
| WHO-DIET | WHO healthy diet fact sheet ([who.int](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)) | Undated page | Search result (secondary), 2026-10-23 | At least 400 g fruit and veg a day (excluding starchy roots); free sugars below 10% of energy |
| FV-MA | Aune et al. 2017, Int J Epidemiol ([White Rose](https://eprints.whiterose.ac.uk/106013)) | 2017 | Search result (abstract excerpt) | Higher intake associated with lower CVD and mortality; observational |
| II-DIET | Adriaanse et al., implementation intentions and healthy eating, Appetite 56:183–93 ([summary](https://www.aprifel.com/fr/resume-scientifique/do-implementation-intentions-help-to-eat-a-healthy-diet-a-systematic/)) | 2011 | Search result (secondary) | Planning interventions: d ≈ 0.51 for adding healthy foods, d ≈ 0.29 for cutting unhealthy ones. **Figures from secondary sources** |
| TRACK-ED | Diet and fitness app use and disordered eating, systematic review ([PubMed 39671845](https://pubmed.ncbi.nlm.nih.gov/39671845/)); MyFitnessPal and eating disorders ([PubMed 28843591](https://pubmed.ncbi.nlm.nih.gov/28843591/)) | 2024; 2017 | Search result (abstract excerpt) | App use is **associated** with disordered eating, mostly cross-sectional; adolescents under-studied |
| AAP-ED | AAP 2016, *Preventing obesity and eating disorders in adolescents* (secondary coverage: [AJMC](https://www.ajmc.com/newsroom/preventing-obesity-and-eating-disorders-in-teenagers)) | 2016 | Search result (secondary) | No dieting or weight talk; positive, family-based habits |
| ADA-SOC | ADA Standards of Care in Diabetes 2025 ([ADA press release](https://diabetes.org/newsroom/press-releases/american-diabetes-association-releases-standards-care-diabetes-2025)) | Dec 2024 | Search result (secondary) | Water is preferred over sugar-sweetened and non-nutritive-sweetened drinks |
| SSB-DM | Swapping sugary drinks in type 2 diabetes, BMJ 2023 ([summary](https://dentistry.co.uk/2023/04/20/swapping-sugary-drinks-for-coffee-or-water-linked-to-fewer-deaths-in-diabetic-adults/)); EPIC-Norfolk, Diabetologia 2015 ([Cambridge](https://www.epi.ims.cam.ac.uk/blog/2015/05/01/replacing-sugary-drink/)) | 2023; 2015 | Search result (secondary) | Replacing sugary drinks with water, tea or coffee is associated with lower mortality and lower diabetes incidence; observational |
| HYPO | NHS low blood sugar ([nhs.uk](https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/)) | Undated | Search result (secondary) | Hypos are treated with a sugary drink or juice, following the care team's plan |
| HYDRATE | No source found for water-with-meals benefits | — | — | **No outcome claim is made** |
| CMO-STR / ACSM-RT | ACSM 2009 position stand, progression models in resistance training ([PDF copy](https://www.sportgeneeskunde.com/wp-content/uploads/ACSM-Position-Stand-Progression-Models-in-Resistance-Training-for-Healthy-Adults.pdf)); ACSM 2026 update ([ACSM](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/)) | 2009; 2026 | Search result (abstract excerpt) | Novices: 2–3 days a week, 8–12 RM loads. **The 2026 update supersedes it; its novice advice was not seen.** The 48 h recovery figure was **not** confirmed |
| BP-STRENGTH | Resistance-exercise breathing guidance ([JMIR Cardio](https://cardio.jmir.org/2020/1/e16354)) | 2020 | Search result (secondary), 2026-10-24 | Breathe normally, avoid breath-holding (Valsalva) |
| PRT-OLD | Liu & Latham, *Progressive resistance strength training for improving physical function in older adults*, Cochrane CD002759 ([Cochrane](https://www.cochrane.org/evidence/CD002759_progressive-resistance-strength-training-improving-physical-function-older-adults)) | 2009 (current record cites 2022) | Search result (abstract excerpt) | 121 RCTs, 6,700 people: large strength gains, small improvement in physical ability. **Adverse events poorly reported**; caution transferring to clinical populations |
| FALLS-CR | Sherrington et al., *Exercise for preventing falls in older people living in the community*, Cochrane ([BJSM abridged](https://bjsm.bmj.com/content/54/15/885), [PEDro](https://pedro.org.au/english/systematic-review-found-that-exercise-prevents-falls-in-older-people-living-in-the-community/)) | 2019 (abridged 2020) | Search result (abstract excerpt) | Balance and functional exercise reduces the fall rate by 24% (RaR 0.76, high certainty); adding strength gives 34%. **Larger effects when a health professional (usually a physiotherapist) delivers it** |
| OTAGO | Otago Exercise Programme meta-analyses: Thomas et al., Age Ageing 2010; Wang & Kim, Front Public Health 2025 ([PMC12172654](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12172654/)) | 2010; 2025 | Search result (abstract excerpt) | Fewer falls (IRR 0.68) and lower 12-month mortality; adherence only about 37% at 12 months. A physiotherapist-prescribed programme |
| CHAIR-EX | Klempel et al., chair-based exercise in older adults, IJERPH 18:1902 ([PMC7920319](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7920319/)) | 2021 | Search result (abstract excerpt) | 25 studies, 1,388 people aged 50+: better handgrip, arm-curl and chair-stand performance. **Mobility and balance outcomes not confirmed** |
| NHS-SIT / NHS-BAL | NHS sitting exercises and NHS-trust balance sheets (links in `SCHWUNG_V2_ACCESSIBLE_MOVEMENT.md`) | Various | Search result (secondary), 2026-10-24 | Exercise lists; repetitions vary between trusts |
| STRANGERS | Epley & Schroeder, *Mistakenly seeking solitude*, J Exp Psychol Gen 143(5):1980 ([Chicago Booth](https://www.chicagobooth.edu/media-relations-and-communications/press-releases/mom-was-wrong-you-should-talk-to-strangers), [BPS digest](https://bps.org.uk/research-digest/were-happier-when-we-chat-strangers-our-instinct-ignore-them)) | 2014 | Search result (secondary) | Brief conversations with strangers were rated more positively than expected; one-off, US urban settings |
| — | Earlier sources (WRITE, SOCIAL, II, SM-LIMIT, HABIT66, LIGHT, APPLE-AGE): see the git history of this file (commit `c76dae4`) | — | Search result | Unchanged |

---

## Priority A — core habits

### 1. Walk (`move_walk`) — **READY FOR DEV TESTING** (restricted)
- **Ages:** 16+.
- **Suitable:** inactive or lightly active people; joint pain, 65+ and unknown precautions with the safety note.
- **Not offered:**
  - heart or blood-pressure condition, pregnancy (**pending expert review**: guidance says activity is safe
    *without* complications, after clinical evaluation, which the app can't do)
  - walking or standing is difficult
  - already walking 30+ min most days
  - active 5+ days (unless the goal is energy or calm)
- **Evidence:**
  - Behaviour: moderate to strong. Guidelines (WHO-PA, CDC-PA, UK-CMO); walking-group meta-analysis
    (WALK-MA); observational step data (STEPS).
  - Habit: low to moderate. Walking interventions show small BP and fitness gains (WALK-MA, pre-post).
  - Targets: none. 5 → 60 min ladders are **product**, below guideline amounts at the start by design.
- **Targets:** from the baseline. 0 active days → 5/10/15 min; 1–2 → 10/15/20; 3–4 → 20/25/30 (energy or
  calm only at 5+).
- **66 days:** at most two level-ups (day 22 and 45), plus optional early level-ups; step-down after 3 misses.
  The largest single jump is 10 min (from 30 to 40 min).
- **Safety copy (joint, 65+, unknown):** "Keep it comfortable and stop if it hurts. Stop and get medical help
  if you have chest pain, feel faint, or are much more out of breath than usual." (HEART-SIGNS: non-guideline
  sources.)
- **Supported claim:** "Guidelines recommend about 150 minutes of moderate activity a week for adults."
  (Quote only after a full-text check.)
- **Unsupported:** fixed step counts; mortality claims.
- **Open:** NICE-OA notes pain may rise at first. Our "stop if it hurts" is more conservative; a
  physiotherapist should confirm the wording for joint pain.

### 2. Earlier bedtime (`sleep_bedtime`) — **READY FOR DEV TESTING (18+)**, **PENDING EXPERT REVIEW (16–17)**
- **Ages:** adults. **16–17 excluded** until a sleep expert reviews it. Teen body clocks run later (AAP-SST)
  and an earlier bedtime with an early school start can mean lying awake. Parent-set bedtimes are only
  associated with more sleep (PARENT-BED).
- **Offered only if:**
  - sleep is below the adult band (under 7 h)
  - trouble sleeping is "rarely"
  - no sleep condition, and precautions are known
  - W1 is a time (not "varies" or "shift"), and W1 and W2 have both been answered
- **Ceiling:** time in bed ≤ 9 h. **Product choice**, consistent with AASM-ADULT: over 9 h is appropriate
  only for some groups and uncertain for others. The habit is not offered when fewer than 3 steps fit under
  the ceiling.
- **Targets:** in bed 15, 30, 45 or 60 min before the person's own in-bed time (Easy, Medium, Hard = the first
  three that fit).
- **Safety copy:** "Go to bed when you feel sleepy. If you lie awake for a long time, it's fine to keep your
  usual bedtime." (NHS-INS leaflets: go to bed when sleepy.)
- **Sleep difficulties:** never with trouble 1–2+ nights a week (AASM-INS: insomnia treatment is
  clinician-guided). Trouble on most nights shows: "Trouble sleeping on most nights is worth mentioning to a
  doctor or another health professional."
- **Evidence:**
  - Behaviour: adequate sleep duration (AASM-ADULT, consensus).
  - Habit: unverified that stepwise earlier bedtimes increase sleep.
  - Targets: product.
- **Unsupported:** "improves energy", "fixes sleep".

### 3. Phone-free wind-down (`sleep_no_phone_bed`) — **READY FOR DEV TESTING**
- **Ages:** 16+. Offered only to people using a phone 1 h+ a day, and not if the phone is already out of reach.
- **Evidence:**
  - Behaviour: association only (SCREEN-SLEEP).
  - Habit: small, contradictory trials (PHONE-RCT). NHS-trust leaflets advise stopping screens before sleep.
  - Targets: product (15/30/45/60 min; a sleep-trouble start is one step up).
- **Safety:** no known risks.
- **Copy:** claim-free ("A screen-free stretch before bed."). **Never claim it improves sleep.**

### 4. Slow breathing (`mind_breathe`) — **READY FOR DEV TESTING** (restricted)
- **Ages:** 16+.
- **Not offered:** heart or blood-pressure condition, pregnancy (**pending expert review**). AHA-BP rates slow
  breathing "reasonable" for BP, but that is a clinical context; we keep it out until reviewed.
- **Evidence:**
  - Behaviour: breathwork lowers self-reported stress a little (BREATH, risk of bias moderate to high).
  - Habit: low.
  - Targets: 2–10 min is product, consistent with NHS-BREATH's 3–5 min.
- **Safety:** light-headedness is reported in small trials (BREATH-AE); there is no systematic harm data.
  Mandatory note: "Breathe gently and comfortably, without holding your breath. If you feel dizzy,
  light-headed or panicky, stop and breathe normally."
- **Open before release:** panic disorder and breath-focused anxiety (there's no quiz question for it). A
  clinical psychologist should review the copy.

### 5. Fruit and veg (`food_produce`) — **READY FOR DEV TESTING (18+)**, **PENDING EXPERT REVIEW (16–17)**
- **Ages:** adults. **16–17 excluded** until eating-disorder-informed review. Food tracking is associated with
  disordered eating (TRACK-ED), adolescents are under-studied, and AAP-ED (secondary) advises against diet
  focus.
- **Evidence:**
  - Behaviour: higher intake is associated with lower CVD and mortality (FV-MA); WHO ≥ 400 g (WHO-DIET).
  - Habit: planning-based "add healthy food" interventions have moderate effects (II-DIET, secondary).
  - Targets: 1–5 portions of about 80 g; the top rung roughly matches WHO 400 g (product).
- **Targets:** hardly any → 1/2/3; 1–2 → 2/3/4; 3–4 or 5+ → not offered.
- **Copy:** "This builds the habit. It doesn't measure whether your diet meets guidelines. If counting food ever
  feels stressful, swap this habit."
- **Food opt-out** in the quiz removes all food habits.

## Priority B — supporting habits

### 6. Unsweetened drinks (`food_unsweetened`) — **READY FOR DEV TESTING (18+ only)**
- **Evidence:**
  - Behaviour: WHO free-sugar limits; ADA puts water first (ADA-SOC); observational swap data (SSB-DM).
  - Habit: unverified.
  - Targets: product (swap once, twice, all drinks).
- **Offered only when** sugary drinks are "most days" (others have no room above their baseline).
- **Diabetes:** mandatory note: "If you use a sugary drink or juice to treat low blood sugar, always do that. It
  never counts against this habit. If you have diabetes, your care team's advice comes first." (HYPO, ADA-SOC.)
- **Open before release:** a diabetes educator should confirm whether people on insulin or sulfonylureas need
  more than this note.

### 7. Strength preparation (`move_strength_prep`) — **PENDING EXPERT REVIEW** (not in the development gate)
- **Why not ready:**
  1. The moves are unspecified ("1 strength move"), so technique and choice are left to the user.
  2. Guidance is 2–3 days a week for novices (ACSM-RT); a daily habit conflicts with recovery norms. The 48 h
     figure wasn't confirmed, and the 2026 ACSM update wasn't seen.
  3. No blood-pressure or breathing copy has been reviewed (BP-STRENGTH).
- **Proposed redesign for review:**
  - named moves: wall push-up, sit-to-stand from a chair, heel raises at a support
  - rungs: 1 move × 5–8 reps; 2 moves × 8; 3 moves × 8–10, stopping 2–3 reps before it gets hard
  - breathe normally
  - "rest days are fine" (once scheduled habits exist, 2–3 days a week)
- **Restrictions kept:** not with heart/BP, pregnancy, walking difficulty, 65+, joint pain, unknown precautions,
  or 3+ active days.

### 8. Water with meals (`food_water_meals`) — **READY FOR DEV TESTING** (add-only)
- **Use:** only through swaps and Add; never automatic. No quantities; excluded with a clinician-advised fluid
  limit.
- **Evidence:** no outcome evidence was found (HYDRATE). The copy is claim-free ("A glass of water with meals,
  if it suits you.").
- **Risk:** negligible at 1–3 glasses a day for people without fluid restrictions (product judgement, not
  sourced).

### 9. Start a conversation (`confidence_talk`) — **READY FOR DEV TESTING** (choice-only)
- **Use:** never automatic; at most one opportunity-dependent habit per plan.
- **Evidence:** brief conversations are rated more positively than people expect (STRANGERS, secondary;
  one-off). No evidence that a daily target builds confidence.
- **Copy:** "Any short chat counts, even a quick 'how's your day?'. If it feels like too much, swap it for
  something else."
- **Open before release:** a psychologist should review the framing for social anxiety.

## Other habits (statuses re-confirmed; details unchanged from the previous register)
| Habit | Status | Notes |
|---|---|---|
| Make your bed | READY FOR DEV TESTING | No claim |
| Steady wake-up | READY FOR DEV TESTING | NHS-INS leaflets favour a fixed wake time; no claim |
| Morning daylight | READY FOR DEV TESTING | Evidence on morning daylight specifically is thin; no claim |
| Phone-free start, Social-free start, App limit | READY FOR DEV TESTING | Mixed evidence; no well-being claim |
| Read, Journal, Deep work (teen ≤ 60 min), First task | READY FOR DEV TESTING | No outcome claims |
| Reach out, Genuine compliment | READY FOR DEV TESTING | No mortality claim |
| Supported Balance Practice (`move_balance`) | **HELD** | Physiotherapist review; see the accessible-movement doc |
| Seated Mobility (`move_seated`, not in the engine) | **HELD** | Physiotherapist review |
| Gentle Strength Preparation | **HELD** | Physiotherapist review |
| Strength session (`move_strength_session`) | **HELD** | Scheduled habits need owner approval (mechanics change) |
| Cold exposure, water quantities, step counts, calorie or weight habits, fasting | **RETIRED** | Excluded from V2 by principle (V1 data untouched) |

## Claims we never make
- "Improves sleep", "improves well-being", "boosts energy" as a promise.
- "Live longer", mortality figures.
- "10,000 steps".
- "66 days builds a habit".
- Any weight, BMI or calorie framing.
- Any statement that a habit is safe for a medical condition.
