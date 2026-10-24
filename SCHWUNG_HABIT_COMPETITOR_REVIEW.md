# Schwung — Habit Library Competitor Review

Baseline `16b3019`. **This is research only: no habit, mechanic or onboarding change has been made.**

**Method and limits.** Direct page fetches (App Store listings, help centres) were blocked in this environment.
Everything below about competitors comes from search results: app-store text quoted by aggregators, official help
articles as indexed, and third-party reviews. I did not use any of the four apps hands-on. Their in-app libraries
change often, so treat the specific examples as illustrative. Research findings come from search summaries of the
cited papers, not full-text reading.

## 1. Competitors

| | Fabulous | Finch | Streaks | Habitify |
|---|---|---|---|---|
| **Habit examples** | Drink a glass of water on waking (the classic first step), breakfast, exercise, short workouts, breathing; morning and evening routines | Drink water, 2 min of breathing, mood check-ins, gratitude, a kind message to someone, a 5-min walk, stretch break, flossing, "one thing that makes me happy" | User-defined; Health-linked tasks (steps, water, caffeine, mindful minutes); "negative" tasks (e.g. stop smoking); timed tasks (e.g. brushing teeth) | Template gallery (e.g. read a book, drink water) plus custom habits; "bad habit" templates to quit or limit; Apple Health suggestions |
| **Suggested or self-made** | Mostly suggested, through guided "Journeys" | Suggested starter plan after onboarding, plus self-made goals | Almost entirely self-made | Templates plus self-made (and "Magic Fill" from typed text) |
| **Categories** | Journeys: energy, sleep, focus, eating, exercise, self-esteem, discipline… | Self-care: mind, body, connection; activity sets (breathing, kindness, soundscapes, "first aid") | None fixed; 600+ icons | Time of day and "areas of life" (user-defined) |
| **Personalisation** | Choose a journey; content then unlocks step by step | Short onboarding on sleep, struggles and support needs gives a starter plan | None beyond the user's own setup | None automatic; templates are generic |
| **Daily or scheduled** | Daily routines | Daily goals; reminders per goal | Any schedule (days of the week, times per week, every N days) | Daily, chosen weekdays, or every N days |
| **Progression and targets** | One habit at a time, then stacking more into the routine | None formal; the pet grows with completions | Fixed targets set by the user | Completion-only or numerical goals (minutes, count, litres); user edits |
| **Why people like it** | Polished coaching story, "start tiny", routines | Warmth: a pet to care for, no shame, very gentle | Simplicity, design, Apple Health automation, no subscription (one-off price) | Flexibility, statistics, cross-platform, quit/limit habits |
| **Evidence** | Incubated at Duke's Center for Advanced Hindsight (behavioural economics). A 2020 review found **no published peer-reviewed outcome trial** of the app. | No randomized trial of Finch found | No outcome claims | No outcome claims |

Marketing as "science-based" (Fabulous) is not evidence that its habits or targets are validated; I found none for any
of the four apps.

**What Schwung already does better:** a personalised plan from answers, with stated reasons; targets that start where
the person is and rise in three phases; the 80% rule; gentle step-downs; health exclusions; offline and private.

**What competitors do better:**
- They offer much more personal choice: templates and custom habits that are easy to find.
- They offer warmth (Finch) and flexible scheduling (Streaks, Habitify).
- They let people pick a theme first (Fabulous journeys).

## 2. Gap analysis against Schwung V2 (20 cleared habits)

**Strong already**
- Make your bed, as a tiny foundation (the same "start tiny" idea as Fabulous's glass of water).
- Earlier bedtime and steady wake-up, both personalised to the person's own times.
- Morning daylight, Walk, Fruit and veg, Unsweetened drinks and Water with meals (with no universal water quota).
- Phone-free and social-free starts, App limit, Read, Slow breathing, Journal, Reach out, Genuine compliment and Meaningful conversation.
- Coverage of sleep, digital, mind and social is broader and better justified than any competitor's suggested set.

**Popular or valuable and missing** (low-risk only)
- Movement breaks from sitting
- A caffeine cut-off for sleep
- Planning tomorrow the evening before
- Gratitude as a distinct choice
- A small act of kindness
- Time outdoors in green space

**Poorly named or more complicated than needed**
- **"First task"** (`focus_top3`): unclear. "Most important task" says what it is.
- **"Deep work"**: jargon. "Focused work" is plainer.
- **"App limit"**: the target is about whichever app pulls the person most ("Videos under 120 min today"). Naming it after that pull ("Video time", "Social media time") would match the target.
- **"Phone-free start" vs "Social-free start"**: easy to confuse side by side.
- **"Journal"**: the target asks for two things at once ("what went well, what's on your mind"). One prompt is simpler.
- **Times** show in 24-hour format ("In bed by 22:45") instead of the phone's format.

**Where recommendations feel restrictive**
- **No way to add a library habit later:** after onboarding, "Add a habit" only creates custom habits. Competitors all offer a browsable list.
- **Thin plans:**
  - Discipline has only 2 core and 2 support habits.
  - Fitness is mostly Walk while the exercise habits are held.
  - Some reference profiles end with 3 habits ("Keep 3 habits and begin"), against 6 in V1.
- **Choices appear only when the plan is short.** A person who would like one extra habit can't pick one during onboarding.

**More choice without overwhelming onboarding:** keep the automatic plan as it is, and add optional extras *after* it.
That means a short "you could also add" list from the same eligible, reviewed pool, capped so a plan never exceeds 6.

## 3. Ranked shortlist (recommendations only)

Evidence columns:
- **General:** the behaviour helps.
- **Intervention:** a habit like this works.
- **Target:** the exact numbers are supported.

| # | Proposal | Value | Goal | Auto or choice | General | Intervention | Target | Safety limits | Complexity |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Add from Schwung's library** in "Add a habit": any eligible, reviewed habit not already in the plan | The biggest gap against every competitor; more choice with no new habits | All | Choice | n/a (existing reviewed habits) | n/a | Existing ladders | Existing eligibility and exclusions; cap of 6 | Medium (UI; reuses swap and plan code) |
| 2 | **Clearer names and copy**: Most important task, Focused work, app limit named by pull, one Journal prompt, the phone's time format | Plainer, more consumer-like | All | — | — | — | — | Existing programs keep their frozen names | Low (copy; new programs only) |
| 3 | **Plan tomorrow**: "Before bed, write tomorrow's first task" (ladder: write it → plus when you'll start → plus where) | Strengthens the thin Discipline goal; complements the morning "first task" | Discipline, Focus | Auto for Discipline | Strong for planning | Good: implementation intentions meta-analysis, d ≈ 0.65 for goal attainment (Gollwitzer & Sheeran 2006) | Not tested; the ladder is a design choice | None | Low |
| 4 | **Movement break**: "Stand up and move for 2 min after sitting an hour" × 1 → 2 → 3 a day | Energy and focus for desk-bound and student profiles | Energy, Focus | Choice | Moderate: breaking up sitting lowers post-meal glucose in lab trials (Loh 2020; 2022 meta-analysis) | Limited (mostly lab, short-term) | Lab breaks are every 20–60 min; "2 min" is a design choice | Same rules as Walk; exclude "walking or standing is difficult". Light movement, not exercise, but **confirm it stays outside the held fitness scope** | Low–medium |
| 5 | **Caffeine cut-off**: "No caffeine after [bedtime − 8 h]" (ladder from 6 h → 8 h) | A popular, concrete sleep lever (Streaks tracks caffeine) | Energy (sleep) | Choice; automatic would need a caffeine question | Good: caffeine cuts total sleep by ~45 min and efficiency by 7% (Gardiner 2023 meta-analysis) | Limited: no habit trials found | ~8.8 h for a coffee is a pooled-lab average; individuals vary | Wording must not imply medical advice; no quotas | Low (time derived from bedtime) |
| 6 | **Three good things** as its own choice, separate from Journal | Gratitude is among the best-known well-being habits (Finch, Fabulous) | Calm, Confidence | Choice (alternative to Journal) | Small but consistent: g ≈ 0.19–0.22 (Choi 2025; Kirca 2023) | Same meta-analyses | 3 items is the classic format; 1 → 2 → 3 is a design choice | None | Low |
| 7 | **One kind act**: "Do one small kind thing for someone" | Broader and warmer than "compliment"; Finch's most loved category | Confidence, Calm | Choice (alternative to Genuine compliment) | Small–medium: δ = 0.28 for the doer's well-being (Curry 2018) | Same | The count is a design choice | None | Low |
| 8 | **Optional extras on the plan screen**: "You could also add (optional)", 2–3 eligible picks for plans under 6 | Fixes thin plans without forcing more | All | Choice | n/a | n/a | n/a | Cap of 6; never pre-selected | Medium |
| 9 | **Green time**: "Spend 10 → 15 → 20 min somewhere green" | Calm-goal variety; overlaps less with Walk if it can be seated or still | Calm | Choice | Associational only: ≥120 min a week linked to better health and well-being (White 2019; observational) | Weak | 120 min a week is an association, not a guideline | None notable | Low |

**Not recommended** (even though competitors offer them):
- Water quotas, and weight, calorie or fasting goals.
- Cold showers.
- Stretching or workout routines: these stay with the held fitness review and the physio packet.
- Medication reminders: medical, outside Schwung's scope.
- Flossing and other personal-care tasks: low value against Schwung's goals, and better as custom habits.

## 4. What I couldn't verify
- Current in-app habit lists, categories and prices for all four apps. Apple's and Habitify's own pages couldn't be fetched; the details come from search summaries, aggregators and reviews (2018–2026), some of them dated.
- Whether Fabulous or Finch have published outcome trials since the sources I found. Neither search surfaced one.
- The full text of the cited papers. The effect sizes are as reported in their abstracts and summaries; Loh 2020's pooled figures in particular weren't retrieved.

## Sources
- Fabulous: [App Store](https://apps.apple.com/US/app/id1203637303), [Healthline review](https://www.healthline.com/healthy/fabulous-app-review), [Healthify NZ](https://healthify.nz/apps/f/fabulous-self-care-app), [Digital News Asia (Duke CAH)](https://digitalnewsasia.com/startups/realise-your-fabulous-self), [Nibble review](https://nibble-app.com/blog/fabulous-app-review)
- Finch: [Internet Matters](https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/finch/), [Android Authority hands-on](https://androidauthority.com/finch-habit-tracker-app-hands-on-3537434), [WhistleOut review](https://www.whistleout.com/CellPhones/Apps/finch-self-care-app-review), [YourStory review](https://yourstory.com/2022/06/app-review-self-care-pet-finch-gamifies-mental-wellbeing), [spunout.ie](https://spunout.ie/navigator/book-podcasts-apps/finch-self-care-pet/)
- Streaks: [App Store](https://apps.apple.com/np/app/id963034692), [Stuff review](https://www.stuff.tv/review/app-of-the-week-streaks-review), [CRM review](https://crm.org/news/streaks-app-review)
- Habitify: [Add a good habit (help centre)](https://intercom.help/habitify-app/en/articles/6113506-add-a-good-habit-setting-goal-repeat-and-schedule-your-habit), [Add a bad habit](https://intercom.help/habitify-app/en/articles/6113518-add-a-bad-habit-set-goal-to-quit-or-limit), [App Store](https://apple.co/2CE91vX)
- Evidence:
  - [Gardiner 2023, caffeine and sleep](https://eprints.leedsbeckett.ac.uk/id/eprint/9625)
  - [Loh 2020, breaking up sitting](https://eprints.kingston.ac.uk/44026) and [2022 meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC9325803/)
  - [Gollwitzer & Sheeran 2006](https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f)
  - [Gratitude meta-analyses](https://researchonline.jcu.edu.au/83467/1/Huston_et_al_2024.pdf) (Choi 2025 and Kirca 2023 as summarised)
  - [Curry 2018, kindness](https://eprints.bournemouth.ac.uk/30561/)
  - [White 2019, nature](https://neurosciencenews.com/nature-health-wellbeing-14233/)
