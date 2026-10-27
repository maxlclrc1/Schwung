# Schwung — The 66-Day Life Reset: Habits First

**Status:** specification for review. **No app code changed.** This document **replaces** the flagship-challenge
direction:

- `SCHWUNG_LIFE_RESET_HABIT_AUDIT.md`: its audit findings (sections 1–2) still stand; its challenge, mission and
  destination sections are superseded.
- `SCHWUNG_LIFE_RESET_CHALLENGES.md` and the data-only catalog in `src/core/reset/challenges.ts`: superseded.

Nothing imports the catalog, and it will be replaced by the habit catalog below when implementation starts.

**The founder's correction:** "This is a habit app, not a life-coaching app." The product unit is a **specific,
repeatable habit**:

- a clear action;
- a measurable target;
- one simple way to complete it;
- an optional timer or counter;
- concrete steps through Foundation, Momentum and Mastery.

Nobody has to invent a project, a destination or a mission to start.

**What stays:**

- the 66 days and the three phases;
- intensity chosen per habit (Starter, Standard, Challenge);
- readiness-based progression;
- the illustrated cards with whole-card swipe;
- the supporting microhabits;
- every existing V1 and V2 save and all production behaviour.

**What goes (or becomes optional):**

- **Gone:** mandatory projects, capstones, weekly essays, Week 1 measurement tasks, and a required weekly check-in.
- **Optional:** weekly missions, if they ever return, and a personal Day 66 goal.
- **Gone:** detailed metric entry beyond what completion needs.

---

## 1. Principles

1. **The card says it all.** The title is the habit; the line under it is today's target with a number in it
   ("25 min, phone in another room"). Nothing has to be opened to know what to do.
2. **One way to complete, sometimes with a helper.** Swipe (or tap the check) to complete. Some habits add one
   helper:
   - a **timer** (Focus Time, Read Daily, Practice a Skill, Daily Movement, Tidy Up): finishing it completes the
     habit;
   - a **counter** (Get It Done, Stay Connected): reaching the target completes it.

   The helper is never required: someone who read without the app swipes to complete as now.

3. **Frequencies people actually live with.**
   - **Daily:** for daily habits.
   - **N days a week, any days:** for habits that need rest days (Focus Time, Practice a Skill, Get It Done, Social
     Confidence).
   - **Sessions a week with recovery days:** for Strength Training.
4. **Progression is concrete and achievable.**
   - **The steps:** each phase is a specific number one step above the last.
   - **When it rises:** when the person is ready (section 5), not automatically on Day 22 or 45.
   - **Control:** they can make a habit easier or harder at any time.
5. **Personal where it matters, never homework.** Where a target must be personal, one onboarding answer sets it
   (current phone time for the main app, usual wake time, current strength routine). Everything else has sensible
   defaults.
6. **Nothing extra by surprise.** A habit asks for exactly what its card says. A phone-free wind-down, morning
   daylight or making the bed are separate supporting habits, added only if the person chooses them.

---

## 2. The catalog

Stable IDs reuse an existing ID wherever the behaviour is the same habit, so the illustrated scenes, swap logic
and V2 safety rules carry over. A Life Reset plan saves its own targets with each habit (as V2 plans already do), so
reusing an ID never changes anyone's existing program.

| #   | Card name             | Stable ID          | Status of the ID        | What you do                                                    | Frequency                       | Completion                            | Helper                           |
| --- | --------------------- | ------------------ | ----------------------- | -------------------------------------------------------------- | ------------------------------- | ------------------------------------- | -------------------------------- |
| 1   | **Focus Time**        | `focus_deepwork`   | Existing (V1, V2)       | Work on one thing for N min, phone in another room             | N days a week                   | Swipe                                 | Timer                            |
| 2   | **Less Scrolling**    | `screen_app_limit` | Existing (V2)           | Keep your main app (social, video, games) under a daily limit  | Daily                           | Swipe in the evening ("Stayed under") | —                                |
| 3   | **Get It Done**       | `focus_top3`       | Existing (V1, V2)       | Write today's top tasks and finish them                        | Workdays (N a week)             | Counter: tick each task               | Counter                          |
| 4   | **Read Daily**        | `mind_read`        | Existing (V1, V2)       | Read for N min (books, e-books, audiobooks)                    | Daily                           | Swipe                                 | Timer (optional pages mode)      |
| 5   | **Social Confidence** | `confidence_talk`  | Existing (V1, V2)       | Do today's social step from Schwung's list                     | N days a week                   | Swipe                                 | "Another step" shuffle           |
| 6   | **Daily Movement**    | `move_walk`        | Existing (V1, V2)       | Move for N min: walk, cycle, dance, sport, anything you choose | Daily                           | Swipe                                 | Timer                            |
| 7   | **Sleep Routine**     | `sleep_wake`       | Existing (V1, V2)       | Be up by your time (your usual wake time plus a window)        | Daily                           | Swipe                                 | —                                |
| 8   | **Tidy Up**           | `home_tidy`        | **New**                 | Tidy your room or desk for N min                               | Daily                           | Swipe                                 | Timer                            |
| 9   | **Practice a Skill**  | `skill_practice`   | **New**                 | Practise the skill you picked for N min                        | N days a week                   | Swipe                                 | Timer                            |
| 10  | **Stay Connected**    | `social_reach_out` | Existing (V2)           | Message or call people you care about (more than a like)       | Daily                           | Counter                               | Counter                          |
| 11  | **Strength Training** | `strength_log`     | **New** (tracking only) | Do a strength session from a routine you follow or choose      | Sessions a week, with rest days | Log a session (swipe)                 | Optional session type and length |

**Supporting microhabits** stay available, unchanged, as separate habits:

- Make your bed (`discipline_bed`), Phone-free wind-down (`sleep_no_phone_bed`), Morning daylight
  (`sleep_morning_light`), Phone-free morning (`screen_morning`);
- Slow breathing (`mind_breathe`), Journal (`mind_journal`), Genuine compliment (`confidence_compliment`);
- Fruit and veg (`food_produce`, adults), Unsweetened drinks (`food_unsweetened`, 18+) and Water with meals
  (`food_water_meals`, add-only).

All of them keep their existing V2 rules and ladders.

**Never offered in a Life Reset plan:**

- **Retired V1 habits:** cold showers, water quotas, Workout, Step count, Screen time cap, V1 Breathe.
- **Held exercise programs:** strength preparation, gentle strength, balance, seated mobility, and the held
  instructional strength session.

---

## 3. The habits, one by one

Each table lists the target for the **Foundation (Days 1–21) → Momentum (22–44) → Mastery (45–66)** levels. These are
**design defaults**: the person can make any habit easier or harder in Habit Detail at any time. Phase changes are
offered when ready (section 5), never forced.

### 3.1 Focus Time — `focus_deepwork`

- **Typical day:** at a time that suits them, they tap **Start 25:00**, put the phone in another room and work on
  whatever matters today (homework, a report, revision, a side project). No project needs naming. When the timer
  ends (or when they come back and swipe), it's done.
- **Frequency:** N days a week, any days (default 5). Days off never count as misses.
- **Completion:** swipe, or the timer finishing.

| Intensity | Foundation | Momentum | Mastery                         |
| --------- | ---------- | -------- | ------------------------------- |
| Starter   | 15 min     | 20 min   | 30 min                          |
| Standard  | 25 min     | 40 min   | 50 min                          |
| Challenge | 45 min     | 60 min   | 90 min (as 2 × 45 if they like) |

- **Days a week:** Starter 4, Standard 5, Challenge 5.
- **16–17:** no single block over 60 min; Challenge Mastery shows "2 × 45 min" (the existing focus cap).
- **Card:** "Focus Time" · "25 min, phone in another room" · _Start 25:00_.

### 3.2 Less Scrolling — `screen_app_limit` (named after the main pull: "Less Social Media", "Less Video", "Less Gaming")

- **Onboarding** asks one thing: "About how long a day do you spend on [social media] now?" (30 min, 1 h, 1 h 30,
  2 h, 3 h, 4 h+). It's a picker, not homework.
- **Typical day:** the card shows the day's limit as a time ("Social media under 2 h 30 today"). They use the
  phone's own Screen Time to check if they like. In the evening they swipe if they stayed under.
- **Note:** Schwung can't read Screen Time (Apple doesn't give apps that data without special approval), so the swipe
  is the person's own check.
- **Frequency:** daily. **Completion:** swipe.
- **Targets** are the current time minus a step, never below 30 min. Shown for someone at 3 h a day:

| Intensity | Foundation   | Momentum     | Mastery      | Rule                 |
| --------- | ------------ | ------------ | ------------ | -------------------- |
| Starter   | Under 2 h 45 | Under 2 h 30 | Under 2 h 15 | −15 / −30 / −45 min  |
| Standard  | Under 2 h 30 | Under 2 h    | Under 1 h 30 | −30 / −60 / −90 min  |
| Challenge | Under 2 h 15 | Under 1 h 30 | Under 1 h    | −45 / −90 / −120 min |

- **Floor and rounding:** limits never go below 30 min, and they round to 15 min.
- **Low starting points:** it isn't offered when the person's overall phone time is under 2 h a day. That's V2's
  existing rule for App time; it also means the 30 min floor is rarely reached.
- **No added rules:** phone-free mornings, meals or bedtimes are separate supporting habits, never added to this one.
- **Card:** "Less Social Media" · "Under 2 h 30 today".

### 3.3 Get It Done — `focus_top3`

- **Typical day:** in the morning (or the evening before) they type up to three short task names into the card,
  or just tap the counter without typing. They tick each task as it's finished; reaching the day's target completes
  the habit.
- **Frequency:** workdays, N days a week (default Monday–Friday, editable). **Completion:** counter.
  - **"Before noon" targets:** count the task as done only if it's ticked before 12:00. The time is editable;
    one-tap honesty, nothing checked.

| Intensity | Foundation              | Momentum                         | Mastery                                |
| --------- | ----------------------- | -------------------------------- | -------------------------------------- |
| Starter   | Finish your #1 task     | Finish your #1 task before 15:00 | Finish your top 2 tasks                |
| Standard  | Finish your top 2 tasks | Finish your top 3 tasks          | Finish your top 3, your #1 before noon |
| Challenge | Finish your top 3 tasks | Top 3, your #1 before noon       | Top 3, your #1 before 10:00            |

- **Days a week:** Starter 3, Standard 5, Challenge 5.
- **Card:** "Get It Done" · "Finish your top 3 tasks" · _0 / 3_ (tap to tick; long-press to name them).

### 3.4 Read Daily — `mind_read`

- **Typical day:** they read (a book, an e-reader, an audiobook) and swipe, or start the timer and let it complete.
  A **pages mode** (chosen in Habit Detail) shows pages instead of minutes, for people who prefer that.
- **Optional:** a "Finished a book" button in Habit Detail adds to a books count shown on the Journey. Never
  required, never a target.
- **Frequency:** daily. **Completion:** swipe or timer.

| Intensity | Foundation | Momentum | Mastery | Pages mode         |
| --------- | ---------- | -------- | ------- | ------------------ |
| Starter   | 10 min     | 15 min   | 20 min  | 5 → 10 → 15 pages  |
| Standard  | 20 min     | 25 min   | 30 min  | 10 → 15 → 20 pages |
| Challenge | 30 min     | 45 min   | 60 min  | 20 → 30 → 40 pages |

- **Card:** "Read Daily" · "20 min" · _Start 20:00_.

### 3.5 Social Confidence — `confidence_talk`

- **Typical day:** the card shows **today's step**, picked from Schwung's own list for the current level. If it
  doesn't fit the day, "Another step" swaps it. They do it whenever it comes up and swipe. Nobody writes a ladder.
- **Frequency:** N days a week (any days). **Completion:** swipe.

**The step lists** (examples; final copy needs review, section 7). Every step involves everyday situations and
people the person already meets. **Strangers are never required.**

- **Level 1 (Foundation):**
  - Ask someone how their day is going and ask one follow-up question.
  - Thank someone by name for something specific.
  - Say hello first to someone you see often.
  - Reply to a group chat with your own opinion, not just a reaction.
- **Level 2 (Momentum):**
  - Start a conversation with a classmate or colleague you rarely talk to.
  - Ask a question in class, a meeting or a shop.
  - Share an opinion in a group conversation.
  - Give someone a specific compliment out loud.
- **Level 3 (Mastery):**
  - Speak up once in a class, meeting or group.
  - Suggest a plan to a friend (coffee, a walk, studying together).
  - Introduce yourself to someone new at school, work or a club.
  - Disagree politely when you see things differently.

| Intensity | Foundation             | Momentum                 | Mastery                |
| --------- | ---------------------- | ------------------------ | ---------------------- |
| Starter   | 3 days a week, Level 1 | 4 days a week, Level 1   | 4 days a week, Level 2 |
| Standard  | 4 days a week, Level 1 | 5 days a week, Level 2   | 5 days a week, Level 3 |
| Challenge | 5 days a week, Level 2 | 6 days a week, Level 2–3 | Daily, Level 3         |

- **Card:** "Social Confidence" · "Ask a question in class or a meeting" · small _Another step_.

### 3.6 Daily Movement — `move_walk`

- **Typical day:** they move for the day's minutes, in any activity that gets them breathing a little harder (a brisk
  walk, cycling, dancing, a sport, a class), and swipe or use the timer. Schwung never prescribes exercises or
  intensity.
- **Frequency:** daily. **Completion:** swipe or timer.
- **Starting point:** onboarding asks how many days a week they're already active (the existing V2 question).
  Experienced people start at Challenge, not at 10 minutes.

| Intensity | Foundation | Momentum | Mastery |
| --------- | ---------- | -------- | ------- |
| Starter   | 10 min     | 15 min   | 20 min  |
| Standard  | 20 min     | 25 min   | 30 min  |
| Challenge | 30 min     | 40 min   | 45 min  |

- **Active people:** someone who already moves more than the Challenge target keeps their own number (they set
  it in Habit Detail); it's never lowered.
- **Safety:** V2's Walk rules apply: no automatic movement habit with heart conditions, pregnancy or walking
  difficulty, and the stop-if-unwell note for 65+, joint pain or unknown precautions.
- **Card:** "Daily Movement" · "25 min of movement you choose" · _Start 25:00_.

### 3.7 Sleep Routine — `sleep_wake`

- **Onboarding** asks the person's usual wake time (the existing W1 question). That's their anchor; Schwung never
  moves it earlier.
- **Typical day:** the card shows a clock time ("Up by 07:45"). They swipe when they're up.
- **Frequency:** daily. **Completion:** swipe.
- **Targets** are the window after the anchor time (anchor 07:15 shown):

| Intensity | Foundation                  | Momentum              | Mastery               |
| --------- | --------------------------- | --------------------- | --------------------- |
| Starter   | Up within 60 min (by 08:15) | within 45 min (08:00) | within 30 min (07:45) |
| Standard  | within 45 min (08:00)       | within 30 min (07:45) | within 20 min (07:35) |
| Challenge | within 30 min (07:45)       | within 20 min (07:35) | within 15 min (07:30) |

- **No bedtime rule:** Sleep Routine never adds a bedtime, a phone rule or less sleep.
  - **Earlier bedtime and Phone-free wind-down** stay separate supporting habits with their existing V2 rules
    (Earlier bedtime isn't offered to 16–17 or with insomnia, and stays under the time-in-bed ceiling).
  - **Excluded** (as V2): varying or shift wake times.
- **Card:** "Sleep Routine" · "Up by 07:45".

### 3.8 Tidy Up — `home_tidy` (new)

- **Typical day:** in the evening, they tidy their room, desk or kitchen for the day's minutes (timer optional) and
  swipe.
- **Frequency:** daily. **Completion:** swipe or timer.

| Intensity | Foundation | Momentum | Mastery |
| --------- | ---------- | -------- | ------- |
| Starter   | 5 min      | 8 min    | 10 min  |
| Standard  | 10 min     | 12 min   | 15 min  |
| Challenge | 15 min     | 20 min   | 25 min  |

- **Make your bed** stays its own tiny supporting habit; it isn't folded in.
- **Card:** "Tidy Up" · "10 min" · _Start 10:00_.

### 3.9 Practice a Skill — `skill_practice` (new)

- **Onboarding** has one picker: Language, Instrument, Drawing, Coding, Writing, Sport skill, or Other (type a word).
  The card title becomes "Practise Spanish". No goal, project or demonstration is needed.
- **Typical day:** they practise for the day's minutes (timer optional) and swipe.
- **Frequency:** N days a week, any days (default 5). **Completion:** swipe or timer.

| Intensity | Foundation | Momentum | Mastery                         |
| --------- | ---------- | -------- | ------------------------------- |
| Starter   | 10 min     | 15 min   | 20 min                          |
| Standard  | 20 min     | 30 min   | 40 min                          |
| Challenge | 40 min     | 60 min   | 90 min (as 2 × 45 if they like) |

- **Days a week:** Starter 4, Standard 5, Challenge 5.
- **16–17:** blocks of at most 60 min, as with focus.
- **Sport skills** are self-directed; no drills are prescribed.
- **Card:** "Practise Spanish" · "20 min" · _Start 20:00_.

### 3.10 Stay Connected — `social_reach_out`

- **Typical day:** they message or call people they care about (anything more than a like or a reaction) and tap
  **+1** for each. Reaching the day's number completes it.
- **Frequency:** daily, or N days a week at Starter. **Completion:** counter (or swipe for the whole target).

| Intensity | Foundation              | Momentum                | Mastery                            |
| --------- | ----------------------- | ----------------------- | ---------------------------------- |
| Starter   | 1 person, 4 days a week | 1 person, 5 days a week | 1 person a day                     |
| Standard  | 1 person a day          | 2 people a day          | 2 people a day, one of them a call |
| Challenge | 2 people a day          | 3 people a day          | 3 people a day, one of them a call |

- **Card:** "Stay Connected" · "Reach out to 2 people" · _+1 · 1 / 2_.

### 3.11 Strength Training — `strength_log` (new, tracking only)

**What it is:** a **tracker for strength sessions the person does** from a routine they already follow or choose.
That could be gym training, a PE or club programme, a coach's plan, or a bodyweight routine from a reputable source.
Schwung tracks sessions, spacing and consistency. **It does not prescribe exercises, sets, repetitions or weights.**

**Onboarding (when chosen):**

1. **Where are you starting?**
   - **New to strength training:** Starter.
   - **I train sometimes (up to about 6 months, or on and off):** Standard.
   - **I train regularly (6+ months):** Challenge.
2. **Which days suit you?** They pick their planned days, with at least one rest day between sessions suggested; the
   choice is editable.
3. **Guidance, shown once and kept in Habit Detail.** Novices see: "If you don't have a routine yet, start with one
   from a qualified coach, PE teacher, physiotherapist, or your national health service's strength guidance." Links
   need review before release.

**Typical session day:**

- **The card:** "Strength Training" · "Session 2 of 3 this week · 30 min".
- **Logging:** they train and swipe. An optional sheet records the session type (full body, upper, lower, other)
  and length. That's the only extra entry, and it's skippable.

**Weekly scheduling and recovery:**

- **Sessions:** a weekly target, done on any days; planned days only order the week and show rest days.
- **Rest days:** one session a day at most. Logging a session on the day after another shows a gentle note
  ("Rest days help you recover. Did you train different muscles?"). It's never blocked, never penalised.
- **Counting:** days without a session are never misses. The habit is evaluated weekly (section 5).

| Starting point       | Foundation                   | Momentum          | Mastery                                          |
| -------------------- | ---------------------------- | ----------------- | ------------------------------------------------ |
| Starter (new)        | 2 sessions a week, ~20 min   | 2 a week, ~30 min | 2 a week, ~30 min, or 3 if it feels good         |
| Standard (sometimes) | 2 a week, ~30 min            | 3 a week, ~40 min | 3 a week, ~45 min                                |
| Challenge (regular)  | Their current sessions (2–4) | Same, kept steady | Same, kept steady; +1 a week only if they choose |

- **Session length** is a guide shown on the card, not a requirement; completion is the session itself.
- **Challenge** isn't "more volume": for experienced lifters, the habit protects consistency. Schwung never
  pushes their training load.

**Age and safety:**

- **Precautions:** heart or blood-pressure conditions, pregnancy or recent birth, walking or standing being
  difficult, or **precautions skipped** (unknown) → **not offered**. The same conditions the held exercise
  prototypes exclude, with the existing "a health professional can advise" message.
- **Joint, back or injury pain:**
  - **Starter:** not offered.
  - **Standard and Challenge** (people with an existing routine): offered, with a note — "Keep to what your
    physiotherapist or clinician has advised".
- **16–17:** Starter and Standard only, with participation guidance:
  - learn technique from a qualified coach or PE teacher first;
  - build up gradually;
  - no maximal lifts;
  - stop if anything hurts.

  Needs expert review before production.

- **65+:** offered with a note pointing to balance and strength guidance from a professional. Schwung's own balance
  and gentle-strength programmes stay held.
- **Every session:** the existing stop rule shows: stop and get medical help for chest pain, feeling faint or unusual
  breathlessness.

### 3.12 Strength tracking versus instructional exercise programmes

|                           | **Strength Training** (`strength_log`)                                                                                         | **Held exercise programmes** (`move_strength_prep`, `move_strength_gentle`, `move_balance`, `move_seated`, `move_strength_session`) |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| What Schwung provides     | A place to log sessions, weekly targets, rest-day spacing                                                                      | The exercises themselves: moves, sets, progressions, form cues                                                                      |
| Who decides the exercises | The person, from their own routine or a professional or reputable source                                                       | Schwung (would need clinical sign-off)                                                                                              |
| Release                   | **Internal testing builds**, behind its own flag, after founder approval of section 3.11                                       | **Held**: development-only Exercise Preview, unchanged                                                                              |
| Safety basis              | Precaution exclusions as above; no load or exercise advice                                                                     | Physiotherapist and exercise-protocol review (pending)                                                                              |
| Shares                    | Nothing: no exercise content, ladders or Exercise Preview screens. Turning on Strength Training doesn't release any held habit | —                                                                                                                                   |

---

## 4. Example cards

The card keeps today's design: the illustrated scene fills it, the level sits top-left, and the title and target sit
lower down. The status row shows **how to complete**, with a helper where the habit has one. Mock-ups (text only):

```
┌─────────────────────────────────────────┐
│ ▬ ▬ ▬  Foundation                         │   (scene: the hut with the lit window)
│                                           │
│                                           │
│ Focus Time                                │
│ 25 min, phone in another room             │
│ 3 of 5 this week                          │
│  [ ▶ Start 25:00 ]            ( ✓ )       │   swipe right or tap ✓ = done; Start opens the timer
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ▬ ▬ ▬  Momentum                           │
│ Less Social Media                         │
│ Under 2 h today                           │
│  › Swipe in the evening if you stayed under (✓) │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ▬ ▬ ▬  Foundation                         │
│ Get It Done                               │
│ Finish your top 3 tasks                   │
│  [ + ]  1 / 3                  ( ✓ )      │   + ticks a task; at 3 / 3 it completes itself
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ▬ ▬ ▬  Foundation                         │
│ Social Confidence                         │
│ Ask a question in class or a meeting      │
│  ↻ Another step                ( ✓ )      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ▬ ▬ ▬  Momentum                           │
│ Strength Training                         │
│ Session 2 of 3 this week · ~40 min        │
│  › Swipe to log a session      ( ✓ )      │   optional: session type and length after logging
│  (rest day tomorrow)                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✓ Done for today              ↶ Undo      │   done state, as today
└─────────────────────────────────────────┘
```

**On a running timer:**

- **The card:** shows the countdown in place of the target ("18:42 left").
- **The phone:** can be locked; the time is based on the clock, not a running process.
- **When it ends:** a haptic and the done state. The habit completes when the timer reaches zero, or by swipe.
- **Pause and stop:** a paused or stopped timer doesn't complete anything.

**Weekly habits on days they're not needed:**

- **This week's target met:** the card shows "5 of 5 this week ✓" and moves below the day's other habits.
- **Not yet met:** it still invites ("3 of 5 this week"), but a day without it is never a miss.

**Habit Detail** adds, per habit:

- intensity (Starter, Standard, Challenge);
- **Make it easier** / **Make it harder** (one level, any time);
- days a week, where relevant;
- the timer length, and pages mode for Read Daily.

Existing Swap and Remove stay.

---

## 5. Progression

> **Superseded for Life Reset programs** by the readiness rules in `SCHWUNG_LIFE_RESET_PROGRESSION.md` (Stage 4):
> 14-opportunity window, 80% / 90% + "too easy" / under 60%, minimum coverage, closed weeks for weekly habits.

- **Levels are the phases:** a habit's Easy, Medium and Hard levels are its Foundation, Momentum and Mastery targets
  for the chosen intensity. Habit Detail and the card already show them that way.
- **When it rises:**
  - **Life Reset plans:** there's **no automatic rise** on Day 22 or Day 45.
  - **The offer:** from Day 22 (to Momentum) and Day 45 (to Mastery), a habit is **offered** the next level when it
    was done on at least **80% of its recorded due days over the last 14 days**. Weekly habits use the last two
    weeks: the weekly target met both weeks. Days with nothing recorded are left out, and with fewer than 7 recorded
    days there's no offer yet.
  - **The banner:** the existing "Level up / Not yet" offer is reused. "Not yet" is asked again after 7 days.
- **Early offers:** the existing 7-day run offer stays: done 7 due days in a row, offered early.
- **Easier:**
  - **Daily habits:** the existing rule stays, one level down after 3 missed due days in a row, never below
    Foundation, with the existing kind message.
  - **Weekly habits:** under half the weekly target for 2 weeks running → **suggested**, not automatic.
- **Always the person's choice:** Make it easier and Make it harder in Habit Detail, any time. Changing intensity
  recomputes the three levels and keeps the current phase.
- **No extra check-ins:** "too easy / too hard" is just those two buttons.

---

## 6. Onboarding (outline; designed in its own step)

1. Age (unchanged, 16+).
2. "What do you want to work on?": pick up to two (Focus, Phone, Getting things done, Reading, Confidence, Movement,
   Sleep, Organisation, A skill, Relationships, Strength).
3. **Suggested habits** for those areas (2–4), each with its card preview; the person adds, removes and swaps.
4. **Per habit, one short question** where needed:
   - phone time for the main app;
   - wake time;
   - active days;
   - skill picker;
   - strength starting point and days.
5. **Intensity per habit**, defaulting from that answer: a low baseline suggests Starter, moderate Standard,
   regular Challenge.
6. Precautions (existing question; skipping = unknown).
7. **Optional:** supporting microhabits, and an optional one-line "what would make Day 66 feel good?" (never used to
   judge anything).

The plan stays within the existing limit of 6 habits; the 12-habit limit is a separate decision.

---

## 7. Minimum engine changes (none made yet)

Everything is new or optional, and applies only to programs created as Life Reset programs. Existing V1 and V2
programs never see it.

| #   | Change                                                                                                                                                                                                                                                                | Where                          | Existing data                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------ |
| 1   | **Habit catalog:** a pure module with the 11 habits, the targets above, units, frequency, helper (timer or counter), and eligibility (reusing V2 `exclude` rules; new `home_tidy`, `skill_practice` and `strength_log` defs). Replaces `src/core/reset/challenges.ts` | `src/core/reset/`              | —                                          |
| 2   | **Program marker:** an optional `program: 'reset'` on the saved state, so rules can differ per program                                                                                                                                                                | store                          | Absent = today's behaviour                 |
| 3   | **Saved targets with numbers:** `spec.targets` keeps its three texts; an optional `spec.reset` adds `{ intensity, unit, amounts per level, frequency, helper }`, so the card can show a timer or counter                                                              | `HabitSpec`                    | Absent on old habits                       |
| 4   | **Weekly target frequency:** `Schedule` gains an optional `{ perWeek }` (any days). A weekly habit counts in a day's success **only on days it's done**, so it never causes a missed day. The week's progress ("3 of 5") comes from the logs                          | `schedule.ts`, `plannedForDay` | Existing fixed-weekday schedules unchanged |
| 5   | **Counters:** `DayLog` gains an optional `counts: { [habitId]: number }`; the habit completes when the count reaches the target (and still by swipe)                                                                                                                  | `DayLog`                       | Absent on old logs                         |
| 6   | **Timer:** a card helper only; nothing is saved except the completion. Times come from the start timestamp, so locking the phone doesn't stop it                                                                                                                      | `HabitCard`                    | —                                          |
| 7   | **Readiness offers:** for `program: 'reset'`, `reconcile` skips the automatic Day 22/45 rise; `levelUpOffers` adds the 80%-of-recorded-days rule from those days on; weekly habits use the weekly rule                                                                | `progression.ts`               | V1 and V2 rules untouched                  |
| 8   | **Intensity and easier/harder:** a store action that recomputes a habit's saved levels from the catalog, plus Habit Detail buttons                                                                                                                                    | store, `habit/[id].tsx`        | —                                          |
| 9   | **Onboarding:** a testing-build flow that creates a Life Reset program (section 6)                                                                                                                                                                                    | `src/app/`                     | V1 and V2 flows unchanged                  |
| 10  | **Release gate:** a separate internal list for the Life Reset habits, including `strength_log`. `DEV_CLEARED` and the held prototypes are untouched                                                                                                                   | `gate.ts` or a new file        | —                                          |

**Not needed:** missions, weekly check-ins, destinations, quantity entry beyond counters, a new XP formula, or a
change to the habit limit.

**Order:**

1. 1 → 2 → 3 (catalog and saved targets).
2. 4 and 5 (weekly targets, counters).
3. 7 and 8 (progression and difficulty).
4. 6 (timer UI).
5. 9 (onboarding).
6. 10 (release to internal testers).

Each step is separately committed and tested.

---

## 8. Compatibility

- **Saved programs:** V1 and V2 programs are never converted. Their habits, levels, logs, XP, streaks, ceremonies
  and automatic phase rises stay exactly as now. New fields are all optional; old saves load unchanged.
- **Reused IDs:**
  - **Safe because:** every plan saves its own targets, so a V2 program's `focus_deepwork` keeps "15 min of focused
    work…" while a Life Reset program's says "25 min, phone in another room".
  - **What carries over:** scenes keyed by ID (Read, Focused work, Walk), and V2 safety rules.
  - **Swap lists** in a Life Reset program only offer the Life Reset catalog and supports.
- **Daily success, XP and streaks:** the formulas are unchanged.
  - **Weekly habits** only ever add a done habit to a day, so the 80% rule can't be broken by a rest day.
  - **Counters** complete like any habit.
  - **Full-day ceremonies** (7, 21, 44) aren't blocked by weekly habits.
- **Production:** all of this is gated to testing builds (like `tabs()`). The public V1 release, its quiz and its
  habits stay as they are until a separate approval. That includes the audit's recommendation to stop V1 suggesting
  cold showers and water quotas, which also needs its own approval.
- **Field Notes and navigation:** untouched.

---

## 9. Safety

- **V2 rules carry over unweakened:**
  - Daily Movement uses Walk's rules.
  - Sleep Routine uses Steady wake-up's (the anchor is the person's own time, never earlier, never less sleep).
  - Less Scrolling isn't offered under 2 h of overall phone use (App time's existing rule).
  - Focus and practice blocks respect the 16–17 cap of 60 min.
  - Supporting habits keep their own age, precaution and add-only rules.
  - Under-16s are never eligible.
- **No silent commitments:** no habit adds a bedtime, phone rule or activity the person didn't choose.
- **Strength Training:** tracking only. Exclusions follow the precautions above; it releases nothing that's held.
- **No prohibited content:** no cold exposure, water quotas, restrictive eating, forced early waking, unsafe social
  challenges (strangers are never required) or punitive mechanics. Missing records are never misses.
- **Claims:** targets are design defaults. The app describes actions, not outcomes, and the 66 days stay a structured
  challenge, not a promise of automatic habits.

**Reviews needed before production** (testing builds can proceed after founder approval):

| Item                                                                              | Reviewer                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Strength Training guidance copy, the joint-pain and 16–17 rules, and source links | Exercise professional or physiotherapist                       |
| Social Confidence step lists                                                      | Psychologist (copy and signposting)                            |
| Daily Movement targets for 16–17                                                  | Exercise review; WHO adolescent guidance added to the register |

## 10. Decisions for the founder

1. Approve the 11 habits, their card names and IDs (reusing 8 existing IDs; new `home_tidy`, `skill_practice`,
   `strength_log`).
2. Approve the target tables, the default days a week, and "levels = phases".
3. **Less Scrolling relies on the person's own check:** Schwung can't read Screen Time. Is a self-checked limit
   acceptable?
4. **Weekly habits never cause a missed day:** confirm.
5. **Strength Training:** the starting-point questions, rest-day handling (a note, never blocked), the joint-pain and
   16–17 rules, and the internal-testing release.
6. Remove the superseded challenge catalog (`src/core/reset/challenges.ts`) when the habit catalog lands.
