# Health screen: two directions

**Status: Option B implemented** (replacing a first implementation of Option A at your request).
- **Code:** `src/components/onboarding/HealthList.tsx`. The toggle rule is `togglePrecaution` in `core/reset/profile.ts`, with tests in `core/__tests__/healthAnswer.test.ts`.
- **Screenshots:** `health-impl.png`, `health-impl-checks.png`, `health-impl-before-after.png`.

Differences from the Option B mockup:
- **Original icons kept:** each precaution's waypoint carries the screen's original small icon (bandage, walk, heart, flower, water, moon) on a soft peach disc.
- **Original selection colours kept:** a chosen precaution's waypoint fills peach and its icon turns into a tick with a quarter turn, as before. The row takes the peach card colour and its label turns peach ink, semibold.
- **None of these / Rather not say:** they keep their original leaf and eye-off icons. When chosen they take sage and mist, as before.
- **Last selection:** unticking the last precaution returns the question to unanswered, so Continue is off again. The meanings of a saved `[]` and `'unknown'` are unchanged.

## Option A: Expedition journal

- **Header:** the same as today, sitting where the Age question sits.
- **Contour rule:** a slim band of three faint contour lines, fading out at both ends, sits under the hint. It's the Age trail without waypoints, and it's purely decorative.
- **Precaution rows:** six full-width rows on hairlines, each at least 52 pt tall, with the same type, padding and hairlines as Age.
  - **Unselected:** an outlined rounded-square tick box.
  - **Selected:** the box fills violet with a tick, the label turns semibold, and the row gets Age's light violet wash.
  - **Why squares:** square boxes mean "choose any", while Age's round marks meant "choose one". The difference teaches multi-select without any extra words.
- **None of these / Rather not say:** a separate strip below the list, split by a hairline, with small round marks and dimmer text. When selected, the mark turns violet, the text turns semibold and the half gets the wash. It never looks like a button.

## Option B: Alpine field notes

- **Painting window:** a clear window onto the real world painting (the summit at dusk) opens the page. It fades on its alpha channel into the paper, so the question rises out of the mist with no edge.
- **Precaution trail:** the precautions are waypoints on one fine trail down the margin, echoing Age's waypoints and the Journey route.
  - **Unselected:** a hollow waypoint.
  - **Selected:** a violet waypoint with a tick and a semibold label.
  - **Hairlines:** each starts after the waypoint, like a ledger.
- **None of these / Rather not say:** a field-journal break (a hairline with a short peach rule at its start, as on the Habits journal entry) introduces two quiet inline choices with small round marks.

## Recommendation: Option A

- **It reads as Age's next page.** It uses the same header position, the same 17 pt rows on hairlines, the same violet radio/box language and wash, and the same atmosphere. The contour rule is the Age trail with the waypoints taken away, so moving from Age to Health feels like turning a page, not entering a new interface.
- **Multi-select is unmistakable.** Square tick boxes are the iOS-familiar "any that apply" sign. In Option B, ticked circles sit close to Age's single-choice circles.
- **It fits.** On an iPhone 14/15 or 15 Pro (390 × 763 inside the safe area) every answer and the footer show without scrolling in English. Option B scrolls about 60–70 pt there because the painting window takes space above the question.
- **The tone is right.** These are personal health questions. A calm page with one accent reassures. A large painting here would compete with the words, and with Welcome and the finale, where the painting is the point.

Worth keeping from Option B: the hairline with a peach rule could replace Option A's plain gap before "None of these / Rather not say" if you'd like one more journal detail.

## Behaviour preserved (both options)

- **Answers:** the same six precautions, in the same order, with the exact existing wording, plus "None of these" and "Rather not say". Nothing is added or removed.
- **The same state and toggling as `PilotSetup` today:**
  - Tapping a precaution adds or removes it, and any number can be chosen.
  - Choosing a precaution while "None" or "Rather not say" is selected replaces that answer.
  - "None of these" stores `[]`, and "Rather not say" stores `'unknown'`, which is never treated as "no limitations".
  - Continue is available once anything is answered (`health !== null`).
- **Existing behaviour, kept as is:** removing the last ticked precaution leaves `[]`, which shows as "None of these" selected. That's the current logic. The mockups keep it so the engine is untouched, but say if you'd rather it go back to "nothing chosen".
- **Downstream rules are unchanged:** habit exclusions, strength notes, and `setupProblems`. The two precautions the audit found with no effect yet (fluids, sleep condition) stay as they are.
- **Accessibility:** precautions are `checkbox` with a checked state. "None of these" and "Rather not say" are `radio` with a checked state, as today. Decorations are hidden from screen readers.

## Scrolling and footer

The footer (Back, Continue) stays fixed, and only the question scrolls, as on every set-up screen. Overflow measured inside each phone's safe area:

| Screen | Option A | Option B |
|---|---|---|
| 390 × 763 / 393 × 773 (iPhone 14/15) | no scrolling | 62–72 pt |
| German, 390 × 763 | 57 pt | 122 pt |
| 430 × 853 (Pro Max) | no scrolling | no scrolling |
| iPhone SE, 375 × 647 | 151 pt | 226 pt |
| 320 × 548 | 326 pt | 417 pt |

On short screens the list scrolls naturally under a fixed footer. The rows end cleanly at the footer's top edge, with no fade. That's the shared set-up chrome, so it is unchanged here. A soft fade there could be considered later for every step, not just Health.

## Trade-offs

- **Translation:** German labels wrap to two lines in a few rows ("Gelenk-, Rücken- oder Verletzungsschmerzen"). Both options handle that in full-width rows. In Option A at 320 pt, "None of these / Rather not say" wrap inside their halves but stay at least 52 pt tall.
- **RTL:** rows mirror with the layout direction, and the contour rule (A) and margin trail (B) are symmetric or follow the leading edge. Arabic was emulated on web.
- **Larger text:** rows grow with their text. Both options scroll at 130% text, which is the expected behaviour.
- **Testing limits:** web build only, so no iPhone or simulator was used. Larger text was approximated, and reduced motion was on.

## If Option A is approved: what would change

- **Code changes:**
  - A new `HealthList` component in `src/components/onboarding/`, containing the rows, tick boxes, contour rule and the "None / Rather not say" strip. The contour rule reuses `smoothPath` from `ageTrail.ts`.
  - The `health` case of `PilotSetup` renders `HealthList` instead of the `Token` pills and two `SoftChoice` pills. `HEALTH_ICON` is removed. `Token` would then be unused, so it can be removed too. `SoftChoice` stays because other steps use it.
  - Tests cover the toggling and exclusivity rules (precautions are multi-select; None and Rather not say replace them) and the stored values.
- **Untouched:**
  - All copy and translations, with no new strings.
  - `Precaution` values, `HEALTH` order, stored answers and the `health !== null` gate.
  - Every engine rule and downstream restriction.
  - The header, progress trail, chapter label, footer and navigation.
  - Every other onboarding screen.
