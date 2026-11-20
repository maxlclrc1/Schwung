# Editorial copy review (English)

Baseline `43d2901`. Keys refer to `src/i18n/locales/en/*.ts`.

> **Status: implemented, with these adjustments.**
>
> - **Not applied:**
>   - #4 and #5 (the health question): these are safety wording, so they stay as they were.
>   - #14: in the code, a skipped habit still counts as not done in the 80% streak rule, so the line now reads
>     "Skipped today, by choice." and makes no claim about the streak.
> - **Changed from the proposal:**
>   - #1: "66 days to build better habits." This avoids promising an outcome.
>   - #11: "Ready for today".
>   - #13: "Enjoy the rest of your day."
>   - #17 and #18: no day ranges, which the stage card already shows.
>   - #22: "Consistency", "By habit", "Patterns".
>   - #23: Day 1 keeps the mountain, with "The climb starts here." and "Sixty-six days to the summit. Today is the
>     first."
>   - #27: the summit stays emotional with "You made it. All the way up."
>   - #28: the story card keeps a line, "From Day 1 to the summit."
>   - #29: reminders don't show counts, because they're planned days ahead and a count could be wrong on the day.
>     The habit name still appears only when the person turned on showing names.
>   - "Lovely" on the collection button is now "Got it".
> - **Translations:** all 19 languages were updated with machine translations, which are awaiting review.

## What the copy does well

- It is honest and specific about data, privacy and rules ("It never leaves your phone", "Nothing changes unless
  you confirm"). Keep that.
- Rest days and skips are described without guilt. Keep that too.

## The main problems

1. **Poster lines at the big moments.** The ceremonies, the comeback screens and the reminders lean on lines like
   "Every ascent begins with a single step", "Look how far you've come" and "The view gets better from here". They
   could be in any habit app, and "Look how far you've come" appears twice.
2. **Too many mountains.** Trail, climb, step and summit turn up in almost every reminder, check-in reply and
   comeback line. The metaphor works better when it is kept for the moments that carry it: Day 1, the phase
   changes, the summit, and Journey.
3. **"Small step" everywhere.** "One small step is plenty" (or a variant of it) appears at least six times. Each
   repeat makes it sound less sincere.
4. **Nannying words.** "Lovely", "a lovely start", "That's fine", "Thank you for being honest". These read as a coach
   talking down to the person.
5. **Long reassurances.** Several hints explain a rule in two clauses when one would do.

## Highest-impact changes

The priority order is: Welcome, Habits, Journey, Insights, onboarding, ceremonies, and then everything else.

### Welcome and onboarding

| #   | Current                                                                  | Proposed                                                                                     | Where                            | Why                                                                                                                      |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Get your momentum back.                                                  | 66 days to build habits that stay.                                                           | `welcome.headline`               | "Momentum back" assumes the person lost it. The proposal says what the app actually is, and the number is the hook.      |
| 2   | A few small habits a day, built around your life. They grow as you do.   | A few small habits, fitted to your day. You choose when they get harder.                     | `welcome.body`                   | "They grow as you do" is vague. The real promise, that you control the difficulty, is more specific and more reassuring. |
| 3   | Welcome to your reset                                                    | Let's set you up                                                                             | `setup.q.welcome`                | It comes straight after a welcome screen, so a second "welcome" adds nothing. The proposal says what happens next.       |
| 4   | Anything your body would like us to know?                                | Anything we should plan around?                                                              | `setup.q.healthTitle`            | Asking what your body "would like" is twee on a health question. The proposal is plain and still warm.                   |
| 5   | We'll keep every habit safe for you. It never leaves your phone.         | We'll leave out or adjust anything that isn't safe for you. Your answer stays on this phone. | `setup.q.healthHint`             | "Keep every habit safe" is vague. The proposal says what we actually do with the answer.                                 |
| 6   | Now the fun part                                                         | Your habits                                                                                  | `setup.q.funPart`                | Calling it "the fun part" implies the earlier questions were a chore. The chapter label already sets the mood.           |
| 7   | Two to four is a lovely start. You can add more, and your own, any time. | Two to four is a good start. You can add more, or your own, later.                           | `setup.q.habitsHint`             | "Lovely" is coaching. "and your own" reads awkwardly.                                                                    |
| 8   | Days a week you're active now. Every trail starts somewhere.             | Days a week you're active now. Zero is a fine answer.                                        | `setup.q.activeHint`             | It's a mountain cliché. The proposal reassures the people who need it most, with no metaphor.                            |
| 9   | It's ready. This one is yours.                                           | Here's your reset.                                                                           | `setup.q.readyTitle`             | "This one is yours" reads like a translation. Keep the emotion for Day 1, which follows right after.                     |
| 10  | Your journey is taking shape / Your 66-day reset starts here.            | Ready when you are / Day 1 starts today.                                                     | `setup.finale.kicker` / `.title` | "Taking shape" is filler. The proposal is concrete and hands over to the Day 1 ceremony.                                 |

### Habits (Today)

| #   | Current                                                                                        | Proposed                                                                      | Where                     | Why                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | A fresh day                                                                                    | Nothing done yet                                                              | `today.hero.fresh`        | "A fresh day" is greeting-card language. The summary card should say the state plainly.                                                   |
| 12  | Weekly habits count on the days you do them. Rest days are never missed days.                  | Weekly habits count on any days you choose.                                   | `today.hero.body`         | It explains the rules on every visit. The rest-day reassurance is already on each resting card and in the habit details.                  |
| 13  | Every habit done. See you tomorrow.                                                            | All done for today.                                                           | `today.hero.completeBody` | The title already says "Today is complete", so "Every habit done" repeats it. "See you tomorrow" sounds like it's showing the person out. |
| 14  | Skipped today. That's fine: it never counts as a failure.                                      | Skipped today. It doesn't break your streak.                                  | `today.habit.skipped`     | "That's fine" is patronising. Tell the person the fact they're actually worried about. Check the streak rule before shipping.             |
| 15  | You also trained yesterday. That's fine; going lighter on back-to-back days can help recovery. | You trained yesterday too. Going lighter on back-to-back days helps recovery. | `today.habit.recovery`    | Another "That's fine". The useful advice was buried.                                                                                      |
| 16  | Not now is fine: nothing changes and nothing is lost.                                          | Not now keeps everything as it is.                                            | `today.offer.upNote`      | Shorter, with no reassurance-speak.                                                                                                       |

### Journey

| #   | Current                                                                                  | Proposed                                                                    | Where                    | Why                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 17  | Showing up. Every habit starts at its Foundation targets, small enough to keep.          | Days 1–21. Every habit starts at its smallest target, so it's easy to keep. | `journeyTab.meaning.1`   | "Showing up." is a fragment slogan. The proposal says what the phase is.                                                           |
| 18  | The last stretch to the summit. Mastery targets open, and the habits are becoming yours. | Days 45–66. Mastery targets open, if you want them.                         | `journeyTab.meaning.3`   | "Becoming yours" is vague and is used again in the summit text. Matching the format of #17 makes the three phases easy to compare. |
| 19  | Your {count} complete days are still on the mountain.                                    | You've still got {count} complete days. Nothing was lost.                   | `welcomeBack.stillThere` | The metaphor gets in the way of the reassurance, which should be literal.                                                          |

### Insights

| #   | Current                                                                                                              | Proposed                                            | Where                         | Why                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| 20  | Patterns show here once there are a couple of weeks to look at. For now, every day you mark is the beginning of one. | Patterns appear after about two weeks of check-ins. | `insights.observations.early` | The second sentence is a fortune cookie. One plain line is enough.                                        |
| 21  | Nothing stands out yet. Observations appear when your days show a clear pattern.                                     | No clear patterns yet.                              | `insights.observations.none`  | It repeats #20. Short is enough here.                                                                     |
| 22  | How am I doing? / What's working? / What can I learn?                                                                | This week / What's working / Patterns               | `insights.chapter.*`          | These read like journalling prompts. Plain labels scan faster. Keep the meaning, drop the question marks. |

### Ceremonies

| #   | Current                                                                    | Proposed                                                                         | Where                              | Why                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | Every ascent begins with a single step. / Today, you take yours.           | Day 1. / Your 66 days start now.                                                 | `ceremony.day1.headline` / `.sub`  | The headline is a famous proverb, slightly reworded. The moment matters, so give it plain, confident words. Keep "Take my first step" on the button: that's where the metaphor earns its place. |
| 24  | You've taken your first steps. / A rhythm is forming, one day at a time.   | One week in. / Seven days of showing up. That's where habits start.              | `ceremony.milestone.7`             | It doubles up on "steps" and "one day at a time". The proposal is warm and specific.                                                                                                            |
| 25  | Look what you've started. / The Foundation is laid. Momentum begins today. | Foundation done. / Three weeks in. Momentum targets are open when you want them. | `ceremony.milestone.21`            | "Look what you've started" is vague. Say what has changed.                                                                                                                                      |
| 26  | You've come further than you think.                                        | Two thirds of the way.                                                           | `ceremony.milestone.44.title`      | Telling the person what they think is presumptuous. A concrete fraction feels earned. Keep "The summit is in view."                                                                             |
| 27  | Look how far you've come.                                                  | 66 days. You did it.                                                             | `ceremony.summit.headline`         | The same line is on the story card (#28). The summit needs its own words, and simple ones carry the most weight. Keep the body paragraph, which is the best writing in the app.                 |
| 28  | 66 days.\nOne journey. / Look how far you've come.                         | 66 days.\nOne climb. / (remove the line)                                         | `story.headline` / `story.message` | The message repeats the summit line. The image already shows the numbers, so it doesn't need a caption.                                                                                         |

### Reminders and reflections

| #   | Current                                                                                                                                                                           | Proposed                                                                                                                                     | Where                                     | Why                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 29  | The view gets better from here. / Fresh air on the trail today. / One small step is plenty. (and the other variants)                                                              | {count} habits for today. / A good moment for {habit}? / Today's habits are ready.                                                           | `reminders.line.*`, `reminders.habitBody` | Seven poster-style headlines, and "small step" appears three times. Notifications should be useful at a glance, and rotating useful lines is enough variety. |
| 30  | Lovely. When the steps feel light, you could take a slightly bigger one, only if you want to. / Thank you for being honest. Harder weeks happen, and a lighter step still counts. | Good sign. If you want, you can try a bigger target for one habit below. / Some weeks are harder. A lighter target for one habit might help. | `weekly.response.easier` / `.harder`      | "Lovely" and "Thank you for being honest" are coaching tones. The proposal points to the actual choice underneath.                                           |

## Applying these

- Most of these can be changed in place. The exceptions:
  - #22 changes how the Insights headings read.
  - #29 needs `{count}` and `{habit}` placeholders where reminder lines have none today.
- The QA tool should check every changed string for length. The German and Thai versions of the ceremony and Insights
  headings are likely to be the tightest.
- Treat any existing translation as out of date once its English changes. Retranslate with `source:"machine"`, and
  never auto-approve the result.
- Leave these as they are: Schwung, Life Reset, XP, the phase names, the landmark names, the collection reflections,
  the summit body, and all safety and privacy wording.
