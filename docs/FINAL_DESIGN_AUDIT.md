# Final design audit: Alpine Field Journal

Baseline `860f3b7`. The redesigned screens (Habits, Journey, Insights, Habit Details, Settings, Privacy & Data and Language) are the reference and were not reviewed again. Everything else that a person can reach was captured from the web build in English, light and dark. The screenshots are in `design-exploration/audit/`: one contact sheet per area (`screens-*.jpg`) and the five biggest problems side by side (`biggest-problems.jpg`).

The reference language: type set on the painting or on the plain page; small-capitals headings on hairlines; full-width ledger rows; one filled action; quiet text links; no cards, pills or icon tiles.

## Screen by screen

Quality: **Strong**: already belongs. **Fair**: works, with a generic layer. **Weak**: clearly a different app. Change: **None**, **Minor** (styling only, an hour or two), **Redesign** (layout changes). Priority from user impact and effort.

| Screen | Quality | Most important inconsistency | Change | Priority |
|---|---|---|---|---|
| Choose language, Welcome | Strong | None. The painting carries the screen, with one action. | None | – |
| Set-up 1 (age) | Strong | None. | None | – |
| Set-up 2 (health) | Fair | White pill rows, each with a peach icon circle: a settings checklist inside the painted flow. | Minor: hairline rows, radio marks, no icon tiles. The wording stays as written. | Medium |
| Set-up 3 (pick habits), Add a habit | Strong | The art cards are right here: the habits are the paintings. "Suggested" badges and "Your own habit" as a white card with an icon tile are the only generic parts. | Minor | Low |
| Set-up 4–6, 8 (phone, app, activity, time) | Strong | None. These are illustrated controls. | None | – |
| Set-up 7 (starting point) | Fair | One white card per habit with a thumbnail and three tinted level tiles. That's eight or more cards on one screen. | Minor: a ledger row per habit with the three levels as quiet choices | Medium |
| Set-up 9 (here's your reset) | Fair | Coloured summary pills ("5 habits · 66 days · From today") and a coloured level pill on every row. | Minor: one line of facts with fine separators, as on Insights | Medium |
| Day 1 and Day 7 ceremonies | Strong | None. The painting and the trail, with type set on it. | None | – |
| Summit ceremony (Day 66) | Fair | The four statistics sit straight on the busy forest in light grey, so they're hard to read. Also "**0** of 66 days completed" sits next to a 51-day streak: see the note under the table. | Minor: set the facts like Insights' records, on the faded page rather than the trees | **High** (the most important moment) |
| Day 21 / 44 ceremonies | n/a | No QA state reaches them. They share the Day 7 component, so they should match it (Strong). | None expected | – |
| Welcome back (comeback) | Fair | A white card, with art and a close button, laid over the Habits tab: a card on top of a page of cards. | Minor: the same art band, set as the first section of the page | Medium |
| Weekly reflection | Fair | Three white tiles with small mountain glyphs. The glyphs are good; the tiles are generic. | Minor: one divided three-way row, like Appearance | Low |
| Collection and XP | Fair | A grid of white tiles, a featured card and a peach progress bar. The objects are painted, but they sit in a generic tile grid. | Redesign (light): objects on the page with captions, the level as a typographic heading | Medium |
| 66-Day Story | Strong | It's a keepsake, so a framed card is right here. Only the Save and Share buttons are generic. | None | – |
| Beyond the Summit (Habits tab card) | Fair | The "Choose what's next" card with a peach flag in a tinted circle. | Minor | Medium |
| What's next | Fair | Two white choice cards with icon tiles (a green arrow and a purple flag) under a strong painted header. | Minor: two editorial choices on hairlines, without icon tiles | **High** (shown to every finisher, at a turning point) |
| Begin a New Ascent | Weak | The most generic screen left: stacked white cards full of pill buttons (age, eight health pills, three levels per habit, "Leave out" pills). It also repeats set-up's questions in a different visual language. | Redesign: reuse the set-up and Habit Details language (ledger rows, radio marks, divided level control) | **High** |
| Keep My Momentum (Habits tab) | Strong | It's the redesigned Habits tab. | None | – |
| Past journeys | Fair | A white card with a numbered circle badge. The habits line is cut off (QA flagged it). | Minor: a ledger row per journey. Fix the cut-off. | Low |
| Wellness note, Terms | Strong | Plain readable text with clear headings. | None | – |
| Restore from backup | Fair | A tinted icon bubble beside the intro, and the backup summary in a card with an icon per statistic. | Minor: as Privacy & Data (plain lede; the summary as a ledger) | Low |
| Recovery ("couldn't be opened") | Fair | A shield icon tile and a white "couldn't be read" card. | Minor | Low (rarely seen) |
| Age limit (18+) | Fair | A shield icon in a grey bubble above the heading. It's otherwise plain and clear. | Minor: drop the bubble | Low |
| Confirmation sheets (end the reset, delete data) | Strong | Native alerts and the delete step are clear and correct. | None | – |
| Reminder permission | n/a | There's no own screen: the system prompt is shown from Settings, which was already redesigned. | None | – |

**Not design: check before the Summit work.** The Summit ceremony and the 66-Day Story both show "0 of 66 days completed" next to "51 days, your longest streak" and 189 habits done. In the QA state every day has its daily habits completed, but the program also has a weekly custom habit, and no day is counted as complete. Either a day with a weekly habit can never count as complete, or the QA state is unrealistic. This is worth confirming in the counting rules (`reset/charts.ts`) before the Summit screen is restyled.

**Resolved:** the counting is correct; the QA state was unrealistic. A complete day needs every daily habit and every weekly habit whose week is still open (tested in `resetPilot.test.ts`), and the fixture never logged its weekly custom habit. It now logs what each day asks for, so the Summit and the Story show 63 of 66 days, matching the 63 counted days and the 51-day streak.

## The five highest-value improvements, in order

1. **Begin a New Ascent:** redesign it with the set-up and Habit Details vocabulary. It is the weakest screen, and it asks sensitive questions in pill clutter. Same questions, same rules.
2. **What's next and the Beyond the Summit card:** two quiet editorial choices instead of icon-tile cards. Small effort, and it sits at the emotional turning point after Day 66.
3. **Summit ceremony statistics:** make the four facts readable and composed (Insights' record style, on the faded page). Do this after the days-completed count is confirmed.
4. **Set-up 2, 7 and 9:** remove the icon circles, the per-habit cards and the coloured pills, so the first five minutes match what follows. Keep the illustrated steps exactly as they are.
5. **Collection:** objects on the page instead of a white tile grid, with the level and XP as type. Then the small rest: the Welcome back card, the reflection tiles, Past journeys, Restore, Recovery and the age limit.
