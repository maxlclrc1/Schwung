# Schwung — Design Critique

An independent design review of the app as it renders now (commit `fb5c232`), from the visual QA screenshots:
every screen in English at 390 pt in light mode, the main tabs in dark mode, and the full set-up flow
(`node scripts/qa/run.mjs --matrix=full --lang=en --config=standard,large --shots=all`). Nothing was changed.

**Verdict:** the painted mountain artwork is the one genuinely distinctive asset, and the interface works against
it. Most screens are a stack of rounded white cards with pills inside, floating on a lavender-hazed copy of the
painting. There is an eyebrow label and a bold headline on almost every block, and a motivational line under every
title. Each part is competent. Together they read as a well-prompted template: too many systems, too much
explanation, and no single confident idea per screen.

---

## 1. The Habits screen spends a whole screen on two habits

**Where:** Today, Habits tab (`today`, `beyond-today`, `momentum`, `comeback`).

**What's wrong:** each habit is a ~150 pt tall painted card. On top of the painting sit:

- a level line ("Starter · Foundation");
- the name, in large white-on-painting type;
- the target;
- "Every day";
- "Swipe right to complete";
- a check button.

The same instruction is repeated on every card, and again in a footer ("Swipe a card to complete it. Long-press
for details…"). Above the list, the summary card and the weekly reflection card push the first habit below the
fold. In the light theme the names sit on busy, hazy art with weak contrast. In the resting state, every card
fades to grey and looks disabled or broken.

**Why it matters:** this is the screen people open every day, to tick things off. You see one and a half habits
per screen, and you have to scroll to answer "what's left today?". The art is cropped into strips, so it reads as
texture, not as scenes.

**What should change:**

- Make the list compact: one row per habit, with the name, the target and a large completion control. Four to
  six habits should fit without scrolling.
- Show "Swipe to complete" once, the first time, then never again.
- Put the scene art in one place, such as the habit's details or the moment a habit is completed, not behind
  every row.
- Give the resting state its own clear treatment (a single "Resting today" line), not a grey wash.

**Priority:** High.

## 2. Cards inside cards, pills everywhere, one corner radius for everything

**Where:** almost every screen. The worst cases:

- the Today summary card: a ring, a title and a paragraph, then a streak pill and a rank pill, the rank pill with
  its own progress bar;
- the Journey stats card;
- New Ascent, with chip rows plus a "Leave out Read Daily" pill under every habit;
- set-up step 9, with three pill "facts" and a pill on each row;
- Insights, where every section is a card.

**What's wrong:** nearly every piece of content gets the same white rounded rectangle (about 22 pt radius) and
soft shadow. Small facts become pills: streak, XP, rank, level, "Suggested", "You are here", "Kept". Buttons are
pills too, so a pill can be a label, a choice or an action, and you can't tell which at a glance.

**Why it matters:** the "glass cards on a gradient" look is what makes AI-built apps look alike. When everything
is a container, nothing has more weight than anything else. The repetition also makes every screen look about
equally busy.

**What should change:**

- Use plain sections on the background, separated by space and headings, and keep cards for things you can
  pick up or open.
- Use a pill only for something you can choose.
- Show plain facts as text: "2-day streak · 270 XP".
- Use two corner radii at most, and drop shadows on anything that doesn't move.

**Priority:** High.

## 3. The mountain artwork is wallpaper, not the hero

**Where:**

- the background of every tab, behind a lavender haze;
- inside every habit card, which puts a second painting on top of the first;
- the Journey map, with tiny "MASTERY / MOMENTUM / FOUNDATION" tags;
- the Day 1 and Day 7 ceremonies and the Summit.

**What's wrong:** the paintings are washed out so text stays readable, and that removes most of what makes them
beautiful. On Today, the painted cards sit on top of the painted background, so the two compete. The moments that
should showcase the art are almost empty:

- the Day 7 milestone is the same mountain with a thin line and a faint blurred green dot;
- Day 1 is a short line ending in a glow;
- the Summit is a yellow squiggle, drawn as a flat stroke over a soft painting.

**Why it matters:** the art is the brand, and the interface keeps diluting it. The overlays drawn on top (dots,
squiggles, tags, map pins) look like a different, cheaper style than the painting under them.

**What should change:**

- Show the full painting at full strength in a few places: the welcome screen, the Journey map and the
  ceremonies.
- Use calm, plain backgrounds for working screens (Habits, Insights, Settings).
- Draw the route and markers in the painting's own style and colours: warm, hand-drawn and on the terrain, not
  floating UI pins.
- Each ceremony should show something new: a new part of the mountain, a new view, a changed scene.

**Priority:** High.

## 4. Too many progress systems competing on one screen

**Where:** the Today summary card, Journey, the Collection and the Summit.

**What's wrong:** the person is asked to track nine things at once:

- a daily ring (0/4);
- a streak;
- XP;
- a rank ("Trailblazer", "Pathfinder", "Alpinist") with its own progress bar;
- collectibles bought with XP;
- three phases (Foundation, Momentum, Mastery) with "days to Base camp";
- a 66-day count;
- habit levels (Starter, Standard, Challenge);
- numbered Ascents.

The Summit then shows "0 of 66 days completed" next to "189 habits completed in all", which contradict each
other at a glance.

**Why it matters:** stacked gamification is a hallmark of a generated habit app. Each system dilutes the others,
and the one that matters (did I do today's habits?) gets a ring the same size as a rank pill.

**What should change:**

- Choose one main measure of progress: the climb, meaning days on the mountain.
- Keep XP and rank, if at all, in the Collection.
- Tie the streak to the climb rather than giving it its own pill.
- Never show two counts that seem to disagree on the same screen.

**Priority:** High.

## 5. The copy sounds generated: motivational lines and over-explanation

**Where:** everywhere, for example:

- "Every ascent begins with a single step. Today, you take yours."
- "Look how far you've come." (used twice)
- "Get your momentum back."
- "Now the fun part"
- "Two to four is a lovely start"
- "A rhythm is forming, one day at a time."
- "Every step forward counts."
- "It's ready. This one is yours."
- "66 days. One journey."
- "Sixty-six days ago you chose to begin. Not every day went to plan, and you kept climbing anyway."

Then there's the explanation under almost every title:

- "Weekly habits count on the days you do them. Rest days are never missed days." (on the daily summary, every
  day)
- "Saved and shared exactly as you see it…"
- "It leaves from today. Its past days stay in your Journey and Insights."

**Why it matters:** fortune-cookie lines and climbing metaphors in every sentence are the most recognisable sign
of AI-written copy. The constant reassurance makes the product feel unsure of itself and buries the few lines
that matter.

**What should change:**

- Make one pass with a strict voice: short, specific and factual. Day 1: "Day 1. Do one habit today." Day 7:
  "One week. You did 18 of 21."
- Keep the mountain metaphor for names (Summit, Ascent) and drop it from sentences.
- Keep each rule explanation in one place (a help sheet or the first time it applies), not under titles.
- Rewrite the English source, then update the translations through the usual workflow.

**Priority:** High.

## 6. A headline template repeated everywhere, and loose typography

**Where:** set-up ("WELCOME TO YOUR RESET / First things first. How old are you?"), Today ("LIFE RESET / Day 12
of 66", "WEEK 1 IS BEHIND YOU / How did your habits feel…"), Insights ("— 01 / How am I doing?"), ceremonies
("DAY 7 · FINDING YOUR FOOTING / You've taken your first steps."), New Ascent and Add a habit.

**What's wrong:**

- The same formula appears on nearly every block: a tiny spaced-out small-caps eyebrow, then an oversized
  black headline, then a grey subline.
- Insights adds magazine-style "01 / 02 / 03" numbering.
- "Day 80 · beyond the summit" wraps badly beside the round icon buttons.
- The welcome headline runs into its paragraph.
- Heavy display weights sit next to small light body text with nothing in between.
- Sizes and weights aren't consistent: a card title can be bigger than the screen title.

**Why it matters:** a single layout formula applied to everything is a template tell, and with so many headlines
none of them carries weight.

**What should change:**

- Use a type scale of four or five steps, and give each screen one display headline at most.
- Use eyebrows only where they add context (the day number), never as decoration.
- Remove the section numbering.
- Fix the header so the title and the icon buttons share one baseline and never wrap.

**Priority:** Medium-high.

## 7. A generic purple accent and a pastel palette that ignores the art

**Where:**

- the primary buttons, links and tab bar are violet;
- there are five pastel tints (lavender, sage, mist, peach, indigo);
- the streak uses terracotta, completed things green and calendar markers red rings;
- "Keep My Momentum" has a green title while "Begin a New Ascent" has a purple one.

**What's wrong:** the paintings are warm (sunrise orange, pine green, cool blue snow), and the UI is
lavender-on-lavender. Purple is the default accent of generated apps. The disabled Continue button is pale lilac
on lilac and hard to read as disabled versus loading. The tints are given out by position, not by meaning, so
the same colour means different things on different screens.

**Why it matters:** the colour doesn't belong to the brand or to the artwork, so the app feels assembled rather
than designed.

**What should change:**

- Take one accent and one or two neutrals from the paintings, for example a deep alpine blue or the sunrise
  orange.
- Use a single success colour.
- Give each colour one fixed meaning and drop the positional tint rotation.
- Make the disabled state clearly different, for example an outline or low-contrast grey.

**Priority:** Medium-high.

## 8. The same decision appears in four different designs

**Where:**

- **Habit level:** mountain-icon tiles (set-up), pill chips (New Ascent), "Make it easier / Make it harder"
  buttons and "Too easy / Too hard" chips (habit details).
- **Weekly reflection:** pills in a Today card, illustrated tiles on its own screen.
- **Closing a sheet:** "Done", "Cancel", "Close" and an ✕, depending on the screen.
- **Lists:** Settings uses iOS grouped lists, Privacy uses icon rows, the Collection uses tiles and Past journeys
  uses a card.

**Why it matters:** this looks like each screen was built in its own session, which is exactly the feel you want
to remove. People also have to learn the same choice again on each screen.

**What should change:**

- Build one component for each recurring decision (the level picker, the reflection answer) and use it
  everywhere.
- Use one rule for closing sheets: "Done" when something is saved, "Cancel" when it isn't.
- Use one list style.

**Priority:** Medium.

## 9. Each set-up step is in a different illustration style

**Where:** the set-up flow:

- a ruler with a blank "––" age;
- a phone mockup with empty app squares and "Drag up or down";
- a flat vector mountain with a dotted trail and orange rings;
- a time dial;
- mountain-silhouette level tiles;
- painted habit cards.

**What's wrong:** flat vector drawings, skeuomorphic gadgets and painterly scenes are mixed within one minute of
onboarding, and each "instrument" is a small design system of its own. The flat green mountain on the movement
step clashes directly with the paintings on the next step. Several steps leave half the screen empty around a
small control.

**Why it matters:** onboarding is the first impression, and this one feels like a demo of interaction ideas rather
than one product.

**What should change:**

- Use plain, large choice lists for most questions: they're faster and more accessible.
- Keep at most one or two signature interactions (for example the age ruler), drawn in the painting's style.
- Show the painted world once, at the start and the end of set-up, not as a flat redraw in the middle.

**Priority:** Medium.

## 10. Decoration and motion that slow the app down instead of guiding it

**Where:**

- **Seen on screen:** the Journey screen has a 66-circle calendar grid with scattered red rings and dots.
- **Seen on screen:** the Today summary has a decorative mini progress bar inside the rank pill.
- **From the code, not visible in stills:** content rises in with staggered delays (up to about a second on the
  set-up review), the background colour shifts between chapters, digits roll, cards fan out, and ceremonies
  draw their lines slowly.

**What's wrong:** almost every element moves or decorates something. The calendar shows 66 equal circles, where
past days and future days look nearly the same and the markers are hard to decode.

**Why it matters:** lots of soft motion on every element is a "vibe-coded" signature. It makes the app feel slower
and less precise, and the decoration adds noise without information.

**What should change:**

- Keep motion for feedback only: completing a habit, finishing a day, a ceremony.
- Remove the staggered entrances from working screens.
- Redraw the calendar with clear states: done (filled), missed (empty), today (outlined) and future (faint), with
  no extra rings.
- Remove the progress bars inside pills.

**Priority:** Medium (low effort, high payoff).

---

## What to keep

- The painted artwork itself and the idea of a 66-day climb.
- The plainness of Settings and the legal screens.
- Plain, honest privacy statements ("Everything stays on your phone").
- The bottom tab bar's restraint.

## Suggested order

1. Copy pass (5) and a compact Habits list (1): the biggest change in feel for the least work.
2. Fewer containers, one radius and no pills except for choices (2); a palette taken from the artwork (7).
3. One progress system (4) and the art as hero in a few places only (3).
4. Shared components and one sheet rule (8), the type scale (6), onboarding (9), and motion and calendar (10).

Each step changes how the app looks, not what it does. Saved progress, the artwork and the translations are
unaffected, apart from the rewritten English copy, which goes through the translation workflow again.
