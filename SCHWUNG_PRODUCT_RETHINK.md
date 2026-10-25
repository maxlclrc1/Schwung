# Schwung — Product Rethink

Baseline `436dea9`. This is a strategy document: no code, habit content or mechanics have changed.

**The founder's verdict is correct, and the code confirms it.** Schwung is a well-engineered checklist with a beautiful backdrop. Almost all the sophistication we built — the personalization engine, the safety rules, the ladders, the 80% rule, step-downs and phase reconciliation — runs *before* the user arrives or *underneath* the screen. The thing the user actually touches every day is a list of 5 rows and a counter.

---

## 1. Candid diagnosis: what the app actually is today

### What exists in the code
**One real screen.** `today.tsx` (600 lines) is the product. Everything else is a modal you visit occasionally:
- Settings
- Journey: a 66-cell grid plus three numbers
- Habit detail, reached by a long-press
- Swap and Add
- Five ceremonies

**A day in the app (identical on almost every day):**
1. A reminder: "Day 23 of 66 · Your checklist is ready." (`notifications.ts`)
2. Today shows:
   - a greeting
   - a static mountain painting with 66 trail dots
   - "Phase 2 of 3 · Day 23 / 66"
   - a card with segment bars, "3 more and today counts", a streak and "Lv 9 · 1,610 XP"
   - 5 habit rows
3. Tapping a row gives a ripple, a haptic tick and +10 XP. When all 5 are done: confetti and "Day complete · +20 XP bonus".
4. Close the app. Nothing else to do, read, decide or learn.

**What changes between days:**

| Day | What's different from the day before |
|---|---|
| 1 | Onboarding plus the Day 1 ceremony |
| 2–6 | The number goes up. A dot turns purple. |
| 7 | Ceremony "Week one. Done." Maybe one level-up offer card. |
| 8–20 | The number goes up. |
| 21 / 22 | Ceremony; the next day, targets step up automatically and a notice says "Momentum begins". |
| 23–43 | The number goes up. |
| 44 / 45 | Ceremony; targets step up again. |
| 46–65 | The number goes up. |
| 66 | Finale with stats and a share card; then "Season 2 · Coming soon" and an indefinite "Keep it going". |

That's **about 9 distinct moments in 66 days**. The other ~57 days are the same screen with different numbers. This is exactly what the founder felt.

### Answers to the hard questions
- **What motivates someone to open Schwung tomorrow?** Only the daily reminder and an existing intention. The app offers nothing *new* tomorrow, so nothing pulls you in; it's pure push.
- **What changes between Day 1, 10, 30 and 60?**
  - The day number and the trail dots.
  - Two automatic target bumps (Days 22 and 45).
  - A phase sentence that has three variants.
  - *You* don't change in any way the app can see.
- **What happens beyond checking boxes?** Nothing.
  - The app never asks how a habit went.
  - It never tells you anything you didn't know.
  - It never asks you to decide anything after onboarding, except a level-up offer once every 7 days at most.
- **Does the mountain contribute?** Mostly decoration. The painting is static. The only behavior-driven elements are dot colors and a glowing "today" orb. "34 of 66 days climbed" is a progress bar in a costume. It sets the mood beautifully on Day 1 and is wallpaper by Day 5.
- **Are XP and streaks meaningful?**
  - **XP:** +10 per tap and +20 per full day; your player level rises every 200 XP (roughly every 3 days). It unlocks nothing, means nothing and duplicates the streak. Worse, "Lv 9" next to habits shown as "Foundation · level 1 of 3" means two unrelated level systems on one screen.
  - **The streak** is the only number with emotional weight, and research says its main lever is *fear of breaking it* (§5).
- **Does personalization stay visible after onboarding?** Barely.
  - The reasons ("You sleep 6–7 hours…") appear once on the plan screen and are then buried in a long-press detail screen.
  - Today never mentions why a habit is yours, what you told us, or what's changing for you.
  - After Day 1, the personalization is indistinguishable from a template.
- **Is there discovery, anticipation, achievement or emotional connection?**
  - **Discovery:** none. The library is visible only in Add.
  - **Anticipation:** five ceremonies, two target bumps.
  - **Achievement:** counters only. Nothing tells you what you can do now that you couldn't before.
  - **Connection:** the copy is kind, but nothing in the app knows you.
- **What would make someone tell a friend?** Today, nothing. The only share moment is the Day 66 card, which few will reach.
- **Why choose it over Apple Reminders or Streaks?**
  - Today, honestly, the personalized starting plan and the prettier screen.
  - After the first week, Streaks does tracking better (Apple Health auto-completion, any schedule) and Reminders does reminders better.
  - **Our differentiation is all in onboarding, and onboarding happens once.**

### Contradictions we built in
1. **We call it evidence-based and hide all the evidence.** The evidence register, the reasons and the safety logic are invisible in daily use. Users get the cost (a long quiz) without the benefit (understanding *why*, or learning *what works for them*).
2. **The 66-day promise misreads the science.** Lally et al. (2010) found a *median* of 66 days to automaticity in a small sample, with a range of **18–254 days**. "66 days" is a nice season length, not a habit-formation guarantee. Our step-ups on fixed days 22/45 also ignore how the person is actually doing.
3. **Five parallel progress systems, none of which the user asked for:**
   - player XP levels
   - the streak
   - the 80% day rule
   - three phases
   - per-habit levels

   Each is defensible on its own. Together they produce noise: "Lv 9, 12-day streak, Phase 2, Momentum, 3 more and today counts."
4. **We overload Day 1:** 5–6 new habits at once, from a 2-minute quiz. The plan is generated, not chosen, so the user doesn't own it.
5. **We avoid manipulative mechanics but rely on the most anxiety-driven one we have** (the streak), and offer nothing intrinsically rewarding in its place.

---

## 2. The three biggest product weaknesses
1. **Nothing happens.** No daily novelty, no arc, no anticipation. The core loop is "tap 5 boxes", identical for 66 days. Novelty decays in a week, and there's nothing behind it.
2. **The app doesn't know you after Day 1.** It never asks how things went, never learns, never shows you anything about yourself. Personalization is a one-time sort, not a relationship.
3. **The rewards are counters, not meaning.** XP, levels, dots and streaks reward *logging*, not *change*. Nothing connects a habit to what it did for the person: no "you're sleeping better", no "your afternoons are calmer", no "you now do 20-minute walks without thinking".

The beautiful art and the careful engine can't compensate for these three; they make the gap more visible.

---

## 3. Three different product directions

### Direction A — **Expedition**: a 66-day climb where real-life days move you through a world
**Positioning:** for people who respond to journeys and atmosphere: a calm adventure, not a task list. Broad 16+ audience.

**Core loop:** each day that counts (the 80% rule) moves you one stage up the route. Each stage reveals a new piece of the world: a scene, a landmark, a short trail note (2–3 sentences of story, or a fact about the habit you're building). Weekly camps are bigger reveals. Consistency shapes the weather and light: a run of good days clears the fog. Missed days don't push you back, but the trail waits.

**A normal day:**
```
┌─────────────────────────────────┐
│ STAGE 23 · THE BIRCH SWITCHBACKS│
│  [painted scene, fog lifting]   │
│ Today's climb: 4 habits          │
│ ○ 10 min walk   ○ Phone-free AM  │
│ ○ In bed by 23:15 ○ Make your bed│
│ — complete today to reach —     │
│   THE OLD SIGNAL HUT  (locked)  │
└─────────────────────────────────┘
After the last habit:
  "You reach the Old Signal Hut. Inside, someone has carved
   a tally of days into the beam — 23 marks. You add yours."
```
- **Day 7 vs Day 2:** first camp. A new region unlocks, and the art palette changes.
- **Day 21:** base camp, with a camp journal summarising your first three weeks.
- **Day 45:** the high ridge; the summit is visible for the first time.
- **Day 66:** the summit scene, with the whole route drawn from your actual days.
- **Inconsistent users:** the trail waits and nothing is lost; a "rest at the hut" scene after absences. But the world only advances on good days, so a struggling user sees a stalled world.
- **Mountain identity:** this is the mountain at full strength. It needs ~25–66 bespoke scenes and story text.
- **Why it might motivate:** anticipation of the next reveal (variable, narrative) is a real pull. Narrative and "game fiction" were among the few moderators of gamification's behavioral effects in Sailer & Homner's meta-analysis.
- **Why people would abandon it:**
  - The reward is unrelated to the habit's real value. Once you've seen the world, the pull is gone.
  - It's still "tap boxes → watch a scene".
  - It's expensive to make good, and mediocre art or story is worse than none.
- **Effort and risk:** high. Art and narrative production is the bottleneck (weeks to months). Technically easy (offline, local).
- **Smallest prototype:** 10 painted stages (reusing the existing art with overlays) plus text beats, run for 10 days.

### Direction B — **Field Notes**: 66 days of small experiments on yourself
**Positioning:** "Find out what actually works for you." For students and young adults (16–30) who want more energy, focus and discipline and are sceptical of generic advice. The product's job changes from *making you do habits* to *helping you discover which habits change your days*, then keeping the ones that do.

**Core loop:**
- **Week 1 (baseline):** the foundation habit (Make your bed), plus a 5-second evening check-in: rate your day on the 1–2 outcomes you care about (from your goal: energy, focus, calm, confidence), e.g. "Energy today: 1–5".
- **Weeks 2–9 (experiments):**
  - Each week you pick **one experiment** from 3 personalized options. The existing engine and library supply them; for example, "Phone-free first 30 min", "10 min walk after lunch", "In bed by 23:15".
  - You run it for 7 days, at your chosen level (Easy/Medium/Hard become **dials** you choose).
  - The evening check-in stays the same 5 seconds: "Did it? · Energy today?"
- **Day 7 of each experiment:** a **result card** from your own numbers, with an honest caveat:
  ```
  ┌──────────────────────────────────┐
  │ EXPERIMENT 2 · RESULT             │
  │ Phone-free first 30 min           │
  │ Done 6 of 7 days                  │
  │ Your focus, 1–5                   │
  │   on phone-free days  ████▌ 3.9   │
  │   your baseline week  ███   3.0   │
  │ "A clear signal for you. Small    │
  │  sample, so it's a hint, not      │
  │  proof."                          │
  │ [Keep it]  [Keep, easier]  [Drop] │
  └──────────────────────────────────┘
  ```
- **Kept habits go into your stack.** They stay on the daily list, so habits accumulate: a typical person ends with 3–5 kept habits they *chose because of their own evidence*. That is also gentler than today's 5–6 habits on Day 1.

**A normal day:** open in the evening (or tap the notification) → the check-in sheet shows today's experiment and your kept habits → 3–4 taps → "Day 4 of 7 · 3 days to your result". Total: 10–20 seconds. On result days: 1–2 minutes and a decision.

- **Day 7 vs Day 2:** Day 7 is a **reveal about you**, the strongest anticipation hook available without fiction. Every week has its own arc: choose → run → result → decide.
- **Day 21:** "Your first three experiments": what moved your energy and what didn't.
- **Day 45:** "Your stack", with the option to dial a kept habit up (Momentum/Mastery) *because you know it works for you*.
- **Day 66:** **your field guide**, a one-page summary of what you tested, kept and dropped, and your measured differences. Shareable as text or image, offline. It's also a natural sequel: "Season 2: new experiments on top of your stack". That fixes today's dead end.
- **Inconsistent users:** an experiment with fewer than 4 of 7 days done gives "Not enough data — rerun or try another?" No streak to break and no penalty; a missed week is simply an unfinished experiment. A fresh week is a built-in fresh start (§5).
- **Mountain identity:**
  - The mountain becomes the **map of your experiments**: ~9 weekly camps instead of 66 identical dots.
  - Each finished camp is labelled with what you found ("Camp 3 · Phone-free mornings · focus +0.9"). Kept habits become the **trail markings** you climb on.
  - The painting stays; it now means something.
- **Why it might create real motivation:**
  - It turns the app from a *demand* into a *source of information about yourself*, which is intrinsically interesting.
  - It builds competence ("I know what fixes my afternoons") and autonomy ("I chose it"), with self-monitoring as the engine (Harkin et al. 2016: monitoring progress improves goal attainment, d ≈ 0.40).
  - It differentiates for real: Reminders and Streaks can't tell you that a walk made your afternoons better.
- **Why people would abandon it:**
  - Rating fatigue.
  - Noisy results ("nothing changed"), and conclusions that feel obvious.
  - People who want to be *told* what to do rather than to test.
  - Weekly switching could undermine automaticity if experiments don't accumulate (which is why kept habits stay on).
- **Effort and risk:** moderate (3–5 weeks for an MVP). It reuses the library, eligibility, ladders, logs, the 80% rule and the art.
  - **New:** a daily rating field (an additive migration), an experiment model, a result screen with simple statistics, a decision step and the camp map.
  - **Main risk:** honest statistics with n=7. The result needs careful wording (a difference shown as a hint, never "proven"), and the app should refuse to show a result when there's too little data.
- **Smallest prototype:** a 3-day baseline, one 5-day experiment and one result card, then a second experiment, in Expo Go, over 14 days (§8).

### Direction C — **Basecamp**: a 2-minute evening coach that adapts tomorrow
**Positioning:** a calm daily debrief that plans tomorrow with you. For people who know *what* to do but keep failing on *when* and *how*.

**Core loop:** an evening check-in conversation (scripted and offline, not an AI chatbot):
```
Basecamp · Tuesday
How did today go?           [Good]  [Mixed]  [Rough]
› Mixed
What got in the way?        [No time] [Tired] [Forgot]
                            [Didn't feel like it] [Other]
› Forgot — 10 min walk
Let's make tomorrow easier. Pick a cue:
  After lunch, I'll walk for 10 minutes.
  When I get off the bus, I'll walk the long way home.
  [Write my own]
✓ Saved. You'll see it tomorrow at lunch.
```
The next day, Today opens with your own if-then plan instead of a generic list. Each week, a short "letter from basecamp" sums up what got in the way and what worked.

- **Day 7 vs Day 2:** by Day 7 the coach has learned your obstacles ("Tired" 4 times) and changes the suggestions it offers: an easier level, a different time, a swap.
- **Days 21 / 45 / 66:** reviews of your patterns ("you're most consistent on weekdays; weekends need a different cue"), and a final letter.
- **Inconsistent users:** the debrief is *for* bad days. "Rough" leads to a smaller tomorrow, never guilt.
- **Mountain identity:** basecamp at the mountain's foot; the art is a setting, not a mechanic.
- **Why it might motivate:** it applies the strongest *behavior-change* evidence available (implementation intentions, d ≈ 0.65 in Gollwitzer & Sheeran's 2006 meta-analysis; context cues over reminders, Stawarz et al. 2015), and the user sees it respond.
- **Why people would abandon it:**
  - Scripted conversations repeat by Week 2.
  - The writing and answering get tiring.
  - Users may expect a real AI coach, which our offline, no-backend stance doesn't allow.
- **Effort and risk:** moderate (4–6 weeks). The cost is copywriting and branching logic. Risk: it feels like a form.
- **Smallest prototype:** the debrief for 10 days, with if-then plans shown the next morning.

*(Direction E, a focused audience, isn't a separate concept: it's a choice applied to whichever direction wins. I recommend 16–25-year-olds seeking focus, energy and discipline. The library already leans that way: phone, sleep and focus habits.)*

---

## 4. Concrete journeys

**Expedition, Maya (19, student), Days 1–8.**
- **Day 1:** sees the valley and four habits. Completes them; the first stage reveals a footbridge and a line of story.
- **Day 3:** skips; the trail waits.
- **Day 7:** camp unlocks a new region. "Ooh."
- **Day 8:** opens to see what's next, completes 4 of 5, and reads a two-line trail note.
- **Week 3:** the pull to see the next scene fades, and checking boxes remains.
- **Risk point:** Week 3–4, when the novelty is gone.

**Field Notes, Jonas (23, energy goal), Days 1–16.**
- **Days 1–7:**
  - Makes his bed and rates his energy each evening (3, 2, 3, 3, 2, 4, 3; baseline 2.9).
  - Day 7: "Pick your first experiment" gives 3 options from his answers (sleeps 6–7 h, heavy video use).
  - He picks "In bed by 23:30" at the Easy dial.
- **Days 8–14:** 5 of 7 nights done. Day 14 result: "Energy on in-bed-by-23:30 days: 3.6 vs baseline 2.9. A clear signal for you." He keeps it.
- **Day 15:**
  - Experiment 2 options: walk, phone-free morning, fruit and veg. He picks "Phone-free first 30 min".
  - The mountain now shows Camp 1, labelled with his result.
- **Day 16:** he tells a friend: "Apparently going to bed by 11:30 is literally my whole energy problem."

**Basecamp, Lea (27, discipline goal), Days 1–10.**
- **Day 2 evening:** "Mixed", forgot to journal. She sets an if-then: "After I brush my teeth, I'll write one sentence."
- **Day 3 morning:** Today shows her own sentence at the top.
- **Day 6:** "Rough". The coach offers the Easy version for tomorrow; she accepts.
- **Day 10:** the weekly letter: "You hit 3 of 4 habits on every day you'd set a cue. On the two days without one, 1 of 4." She sets cues for everything.

---

## 5. What the research supports
*Labels:* **Behavior** = evidence for real-world behavior change. **Engagement** = evidence for app use. **Hypothesis** = our reasoning, untested. Sources are mostly abstracts and summaries; full papers were not available here.

| Lever | What we know | Implication for Schwung |
|---|---|---|
| **Monitoring progress** | **Behavior:** monitoring improved goal attainment, d ≈ 0.40, more so when recorded or reported (Harkin et al. 2016, 138 studies). | Logging is fine, but it should be monitoring of *progress toward something the person cares about*, not of taps. Supports B. |
| **Implementation intentions and cues** | **Behavior:** if-then plans, d ≈ 0.65 for goal attainment (Gollwitzer & Sheeran 2006). Context cues built automaticity better than reminders, which *supported repetition but hindered habit development* (Stawarz et al. 2015, CHI). | Our daily reminder is the weakest tool. Anchor habits to cues ("after lunch…"). Supports C, and fits B. |
| **Habit timelines** | **Behavior:** median 66 days with a range of 18–254 in a small sample; a single missed opportunity didn't materially derail formation, as reported in secondary sources (Lally et al. 2010). | Keep 66 days as a *season*, not a promise. Missing days must never feel catastrophic. |
| **Streaks** | **Engagement:** visible streaks increase continued engagement, but broken streaks reduce it, especially when people blame themselves; the ability to "repair" a streak softens this (Silverman & Barasch 2023, 7 studies). Duolingo reports streak freezes raised daily active learners slightly (+0.38%) and that early days are most fragile (first-party blog and secondhand accounts). | A streak is a retention hook with a cliff. Replace it with weekly consistency ("5 of 7 days") or make repair possible. |
| **Fresh starts** | **Behavior/Engagement:** temporal landmarks (Mondays, new months) increase aspirational behavior (Dai, Milkman & Riis 2014, archival field data). | Weekly structure creates 9 fresh starts in 66 days. Supports B and C. |
| **Gamification** | **Mixed:** small positive effects in learning (g ≈ 0.25 behavioral, 0.36 motivational; Sailer & Homner 2020), with game fiction and social interaction as moderators. Effects decline over time, which many reviewers attribute to novelty (Koivisto & Hamari 2019, as cited). Badges and leaderboards *lowered* motivation over a semester in one study (Hanus & Fox 2015). Habitica users all reported counterproductive effects, e.g. punishment during busy periods (Diefenbach & Müssig 2019). | Don't add points, badges or leaderboards. XP should go. Narrative (A) has some support but decays. |
| **Competence and self-efficacy** | **Theory plus diary evidence:** mastery experiences are the strongest source of self-efficacy (Bandura); "small wins" in meaningful work drive motivation (Amabile & Kramer 2011). | Show capability gained ("you now do 20-minute walks"), not points earned. |
| **Identity framing** | **Behavior:** "be a voter" beat "vote" for real turnout (Bryan et al. 2011, PNAS). | Low-cost copy lever: "You're someone who protects their mornings" after evidence, not as an empty slogan. |
| **App retention reality** | **Engagement:** median 30-day retention of mental-health apps was 3.3%; peer support (8.9%) and trackers (6.1%) did best (Baumel et al. 2019). | Expect most users to leave in Week 1. The first 7 days must produce a reason to return, and **B's first result is exactly at Day 7**. |

**Hypotheses specific to Schwung (untested):**
1. Personal evidence ("this worked *for me*") motivates sceptical young adults more than generic science or points do.
2. Weekly arcs beat a single 66-day arc for anticipation.
3. People keep habits they chose based on their own results longer than habits assigned by a quiz.

---

## 6. Competitors: engagement mechanics
*Verified* means reported by the company or several independent reviews; *Assumed* is my inference. Nothing was tested hands-on.

| App | Why people return | Visible progress and rewards | How it evolves | Learn | Avoid |
|---|---|---|---|---|---|
| **Fabulous** | Guided "journeys" that add one habit at a time; coaching content (*verified via reviews*) | Journey steps, routines | Unlocks new steps and content over weeks | Start tiny; add one thing at a time; content gives a reason to open | Paywall pressure; science branding without published outcomes (a 2020 review found none) |
| **Finch** | Caring for a pet; daily mood check-ins and reflections; very gentle tone (*verified*) | The pet grows; accessories | Pet adventures; new goals | Reflection and warmth; check-ins *about the person* | Reward-driven attachment; at least one long-term user reported it became stressful (secondhand) |
| **Rise** | A 66-day "life reset" program (*verified as positioning*); feature details unverified | Assumed: program days and levels | Assumed: escalating program | A clear 66-day promise sells | Paywall complaints in reviews; universal escalating targets (our own constraint) |
| **Streaks** | Speed, simplicity, Apple Health auto-completion; one-off price (*verified*) | Streak per task | Doesn't evolve, by design | Make logging effortless; automate where possible (Apple Health) | It's what we'd lose to if we stay a checklist |
| **Habitica** | RPG character, party quests, social accountability (*verified*) | XP, gold, gear, HP damage for missed dailies | Character progression, quests | Social quests can bind people | Punishment and gaming the system; counterproductive effects documented |
| **Duolingo** | Streak, freezes, notifications, short lessons with new content daily (*verified via their blog and talks*) | Streak, XP, leagues | New content every day | **Every session has new content**; a protected first week; a simple streak definition | Guilt notifications; leagues (thin evidence); streak anxiety |

**The pattern:** products that people return to give them something *new* each time — content (Duolingo, Fabulous), a creature's reaction (Finch), or data (Streaks with Health). Schwung gives nothing new after Day 1.

---

## 7. The mountain, evaluated without bias
**The proposal:** "a 66-day climb where real-life progress changes the world you're exploring."

**What it could do well:**
- Anticipation (the next scene) and a sense of distance travelled.
- It uses the asset we already have and love.
- Narrative is one of the few things gamification research credits with helping behavior.

**Where it fails:**
- **The reward is disconnected from the habit.** The world changes because you tapped, not because your life improved. Once you've seen the world, the pull ends; at that point it really is "a checklist with animations".
- **It's expensive.** Good scenes and writing are the bottleneck, and mediocre content is worse than none.
- **It punishes strugglers.** Their world stalls exactly when they most need encouragement.

**Verdict:** as the *engine*, no. As the *frame* for something with intrinsic value, yes. In Field Notes:
- **The structure:** the mountain becomes a map of ~9 camps, one per week, and each camp is named by **what you discovered**. Kept habits are the waymarks you climb on.
- **Ordinary days:** you're "en route to Camp 4, Day 3 of 7"; the trail between camps fills as you check in.
- **Milestones:** each camp's result card, and the summit view at Day 66 showing your field guide carved into the route.
- **Why it stays interesting after the novelty:** the world isn't the reward; *the findings are*, and they're different for every person and every week.

---

## 8. Comparison and recommendation

| Criterion (1–5) | A · Expedition | **B · Field Notes** | C · Basecamp |
|---|---|---|---|
| Likely motivation | 3 (novelty, then fades) | **4** (personal results every 7 days) | 3 (useful, can feel like a form) |
| Meaningful differentiation | 3 | **5** (no mainstream habit app tells you what worked for you) | 3 |
| Sustained 66-day use | 2 | **4** | 3 |
| Fit for free and offline | 4 | **5** | 5 |
| Implementation cost (5 = cheapest) | 1 | **4** | 3 |
| Resistance to novelty wearing off | 1 | **4** | 2 |
| Feasible for a small team | 2 | **4** | 4 |
| **Total** | 16 | **30** | 23 |

**Recommendation: Direction B, Field Notes.** It's the only direction where the thing that brings you back (a result about yourself) *is* the benefit, not a decoration on top of it. It keeps the engine, library, safety rules, ladders, offline architecture and art, and gives each a reason to be visible. **Borrow one thing from C:** the if-then cue when you choose an experiment ("When will you do it? After ___"). It's cheap and has the best behavior-change evidence.

**What would change my mind:**
- If test users find the 5-second rating a chore (check-ins below ~50% by Day 10) or say the results are noise or obvious → move to C. The debrief gives value without needing numbers.
- If the reveal of the next place, not the data, is what makes people open the app → revisit A as a frame.
- If people overwhelmingly ask for accountability with a friend → test a minimal, offline-compatible pact feature (share your experiment with one person, by text) before anything bigger.

---

## 9. Validation experiment (before rebuilding)
**What to prototype:** a thin Field Notes build on the internal channel in Expo Go (development builds only; no backend, no analytics). It reuses the existing V2 engine, library and logs.
- **Days 1–3, baseline:** Make your bed, plus an evening check-in rating the 1–2 outcomes picked from the person's goal (1–5 taps).
- **Day 4:** choose experiment 1 from 3 personalized options, with an if-then cue.
- **Days 4–8:** run it, with the same 5-second check-in.
- **Day 9:** result card, then Keep / Keep easier / Drop.
- **Days 9–13:** experiment 2, the kept habit stays on the list. **Day 14:** result card 2.
- **Local only:** the app records local timestamps of opens and check-ins, kept on the device. Participants send the existing **Export my data** file voluntarily at the end.

**Participants:** 8–10 people aged 16–25 who say they want more focus, energy or discipline. They should not be friends of the team, to avoid politeness bias. Use a between-subjects comparison: **5 use the current V2 app and 5 use the prototype**, each for 14 days, with the same single daily reminder.

**What they do:** use the app as they like. Short calls on Day 1 (set-up), Day 7 and Day 14. No daily nudging from us.

**Measure — behaviour first:**
1. Unprompted opens (not from the notification) on days 8–14, after the novelty.
2. Check-in completion rate per day, especially on days 10–14.
3. Whether people start experiment 2 without being asked.
4. Keep/drop decisions, and whether kept habits are still being done in days 10–14.
5. **The silent follow-up:** on Day 14, say "the study is over; keep the app if you want", and collect the export again on Day 21. How many still used it in days 15–21?
6. In the interviews: can they state their own finding unprompted ("what did you learn about yourself?")? Did they mention it to anyone?

**Success:**
- At least 60% of prototype users still checking in on 4 or more of days 10–14.
- At least 70% start experiment 2 voluntarily.
- At least half can state a personal finding unprompted.
- Days 15–21 use is clearly higher than the current-app group: at least 2 more people.

**Reject the concept if:**
- check-in completion drops below 50% by Day 10, or
- most people call the results obvious or meaningless, or
- the prototype group's days 8–21 behaviour isn't better than the current app's.

---

## 10. Minimum viable redesign (if the experiment succeeds)
1. **Today becomes a 10-second check-in**, not a list to admire.
   - Top: "Experiment 3 · Phone-free first 30 min · Day 4 of 7 · result on Sunday".
   - Below: your kept habits, as compact rows.
   - The evening rating appears as one row of 1–5 dots.
2. **The weekly result card** (the new centrepiece), then **the decision step:** Keep / Keep easier / Keep harder / Drop.
3. **The experiment picker:** 3 personalized options from the existing engine, each with its reason (personalization made visible), a dial (Foundation/Momentum/Mastery as user-chosen difficulty) and an if-then cue.
4. **The mountain as a camp map:** about 9 camps, each labelled with its finding. It reuses the art and today's trail renderer, with fewer, more meaningful markers.
5. **Day 66 becomes "Your field guide"** (shareable), plus "Season 2: new experiments on your stack" instead of "Coming soon".
6. **Onboarding gets shorter:**
   - Keep the safety and eligibility questions and the goal.
   - Drop the 5–6-habit plan reveal.
   - The first week is baseline plus one foundation habit.

### Preserve / change / remove

| Component | Decision | Why |
|---|---|---|
| Personalization engine and eligibility/safety rules | **Preserve**, repurposed as the experiment recommender | Its value finally becomes visible: "options picked for your answers", each with a reason. |
| Evidence-informed library and ladders | **Preserve**; ladders become user-chosen dials | Content is good; automatic escalation isn't. |
| Offline-first, no account, export | **Preserve** | A genuine trust advantage; the experiment needs nothing more. |
| Quiet Ascent art | **Preserve as the frame**; change its meaning (camps = findings) | The best-loved asset; currently decorative. |
| Existing logs and history | **Preserve**; migrate additively (rating fields) | Never lose user data. |
| 66 days | **Change** to "a season of 9 experiments" | Honest about the science; weekly arcs create fresh starts. |
| Automatic Day 22/45 level-ups | **Change** to step-ups the person chooses, from their results | Fixed-day escalation ignores the person; choice builds autonomy. |
| Streak | **Change** to weekly consistency ("5 of 7"), never a breakable chain | Broken-streak research; our own forgiving philosophy. |
| 80% rule | **Change:** keep the forgiveness, drop the jargon ("a day counts at 4 of 5") | Good idea, invisible today. |
| Ceremonies (1/7/21/44/66) | **Change** into weekly results plus the Day 66 field guide | Tied to real findings, not dates. |
| Daily reminder | **Change** to one reminder at the user's chosen check-in time, with a cue-based plan for the habit itself | Reminders support repetition but not automaticity. |
| XP and player levels ("Lv 9 · 1,610 XP") | **Remove** | Meaningless, conflicts with habit levels, research-weak. |
| The 7-day level-up offer card | **Remove** (folded into the weekly decision) | One decision moment a week is clearer. |
| Journey grid of 66 cells | **Remove** (the camp map replaces it) | It duplicates the dots and the stats. |
| Confetti and the "+20 XP bonus" toast | **Remove** (replace with "Day 4 of 7 logged · result Sunday") | Celebrates logging, not change. |
| "Season 2 · Coming soon" | **Remove** | A promise we haven't made a plan for. |
| A 5–6-habit plan on Day 1 | **Remove** | Overload; generated rather than owned. |

---

## Executive recommendation
**If Schwung were my product, here's what I would do next:** build the 14-day Field Notes prototype on the internal channel, reusing the engine, library, logs and art. Run it with 10 people aged 16–25 against the current app, and decide based on what they *do* on days 8–21, not on what they say. If it works, rebuild Today around one weekly experiment, a 10-second evening check-in and a result card about *them*, and turn the mountain into a map of what they discovered.

**What I would stop doing:**
- Polishing the checklist.
- Adding habits, counters, phases or ceremonies.
- Treating XP, streaks and confetti as motivation.
- Spending more effort on mechanics the user never sees.

The engine is good. The product has been hiding it. Stop asking people to *do* 66 days of a list, and start helping them *find out* what changes their days.

---

### Sources (as accessed; mostly abstracts and summaries, not full texts)
- Lally et al. 2010: [Surrey interview](https://www.surrey.ac.uk/news/does-it-really-take-66-days-form-habit-we-asked-expert-dr-pippa-lally), [summary](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit)
- Harkin et al. 2016: [White Rose](https://eprints.whiterose.ac.uk/91437/)
- Gollwitzer & Sheeran 2006: [Konstanz](https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f)
- Stawarz, Cox & Blandford 2015: [UCL Discovery](https://discovery.ucl.ac.uk/id/eprint/1468224/)
- Silverman & Barasch 2023: [UD summary](https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb)
- Dai, Milkman & Riis 2014: [paper](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf)
- Sailer & Homner 2020: [Augsburg](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056)
- Novelty effect, citing Koivisto & Hamari 2019: [Frontiers 2023](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1051227/full)
- Hanus & Fox 2015: [summary](https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf)
- Diefenbach & Müssig 2019: [LMU](https://epub.ub.uni-muenchen.de/77668)
- Baumel et al. 2019: [JMIR](https://www.jmir.org/2019/9/E14567/)
- Bryan et al. 2011: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3150938)
- Duolingo: [streak blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit), [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- Finch: [Headway review](https://makeheadway.com/blog/finch-app-review/), [Internet Matters](https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/finch/)
- Fabulous: [Healthline review](https://www.healthline.com/healthy/fabulous-app-review)
- Rise: [listing summary](https://screensdesign.com/apps/rise-life-reset-in-66-days/), [reviews](https://justuseapp.com/en/app/6478942469/rise-life-reset-in-66-days/reviews)
- Habitica: [Wikipedia](https://en.wikipedia.org/wiki/Habitica)
- Amabile & Kramer, *The Progress Principle* (2011): [summary](https://prime.mindtools.com/pages/article/progress-theory.htm)
