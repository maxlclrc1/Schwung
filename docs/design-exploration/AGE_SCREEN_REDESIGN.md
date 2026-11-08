# Age screen: Mountain Path (Option C)

**Status: approved and implemented** (`src/components/onboarding/AgeBands.tsx`, geometry and labels in `ageTrail.ts`,
rules in `core/reset/profile.ts`: `SETUP_AGE_BANDS`, `ageAllowsSetup`; tests in `core/__tests__/ageBands.test.ts`).
The implementation screenshots are `age-path-impl.png` and `age-path-impl-checks.png`. It differs from the mockups in four ways:
- Rows are at least 48 pt everywhere, including the iPhone SE.
- The drawing is mirrored by the launch's layout direction (`flipX`). The web build is always left-to-right, so the Arabic screenshots show it unmirrored.
- The under-18 note scrolls into view when it appears below the visible area, and VoiceOver reads it out.
- The ruler's `AgeDial` and its six labels were removed.


Mockups only. They're screenshots of a temporary version of the real set-up screen in the web build (same header, progress trail, backdrop and footer). That temporary code was removed afterwards, so no production code, logic, data, translations or navigation changed.

| Board | What it shows |
|---|---|
| `age-path-before-after.png` | The current ruler (nothing chosen, 29, and 17) next to the proposal (nothing chosen, 18–29, Under 18) |
| `age-path-light-dark.png` | Mockups 1–4: light and dark, with nothing chosen and with 18–29 |
| `age-path-under-18.png` | Mockup 5: Under 18 in light, dark, German and Arabic |
| `age-path-checks.png` | Mockups 6–9: 320 pt, 375 × 667, German, Arabic (right-to-left), larger text |

## The design

- **Header unchanged.** The eyebrow, question, hint, progress trail, chapter label, Back button and Continue button stay as they are.
- **The path.**
  - **What it is:** a fine line in the same style as Journey's trail ahead (1.3 pt, the same inks), with five small paper waypoints and a few uneven contour lines that fade out at both sides.
  - **What it isn't:** a control. It can't be tapped and screen readers skip it.
  - **Why it's never a climb:** it wanders up and down, and the first and last waypoints sit at almost the same height. Nothing rises from left to right and nothing fills in, so it can't read as progress or as "older is higher".
  - **How it shows the choice:** the selected band's waypoint gets a violet ring, matching the selected row. In right-to-left languages the drawing is mirrored.
- **Stated up front.** The rows are introduced by the app's existing wording: "Schwung is made for people 18 and older." It's already translated in every language.
- **Five rows.** Full width, with hairlines, a radio mark and a label (17 pt). They're 48 pt tall (46 pt on short phones).
  - **Selected:** a violet radio, a semibold label and a very light violet wash.
  - **Not selected:** quiet.
  - **Weight:** no row carries more visual weight than another.
- **Continue.** It turns on only for 18–29, 30–49, 50–64 and 65 or older.
- **Under 18.**
  - **What appears:** a short note under the rows with a thin peach line beside it. It's never red and has no icon.
  - **Continue:** stays off.
  - **The way out:** Back is still available.
  - **Draft wording, for your approval:** "Thanks for telling us. Schwung can't set up a Life Reset for anyone under 18. Nothing you've entered has been saved."
- **Fitting the screen.** The drawing takes whatever space is left. It gets more room on tall phones and becomes a shallower drawing on short ones, or while the under-18 note shows. On a 390 pt phone the rows end up within thumb reach.

## Rules preserved (checked against the code)

- **Saved value:** only the `AgeBand` is stored. The rows map to the same values `bandOf` gives today:
  - Under 18 → `u16`
  - 18–29 → `18_29`
  - 30–49 → `30_49`
  - 50–64 → `50_64`
  - 65 or older → `65p`
  - Set-up never creates `16_17`, now or under this design.
- **No exact age anywhere.** Removing the ruler removes the only place an exact age was ever asked, and it was never saved. The `years` state, `AgeDial`, `bandOf` and `YEARS_OF` would no longer be needed.
- **Eligibility:** unchanged.
  - Continue still uses `age !== null && !isMinor(age)`.
  - `setupProblems` still refuses under-18s.
  - `habitExclusion` still excludes every habit for minors.
  - Restore and import (`dataImport.ts`) still reject `u16`.
  - The age-limit notice for older programs is untouched.
- **Age-related safety notes:** unchanged.
  - The strength note for 65 and older (`engine.notes.strengthOlder`) still comes from `65p`.
  - The rules for 16–17-year-olds (`isTeen`, the teen focus limit) still only apply to old `16_17` programs.
- **New Ascent:** its age question stays a compact segmented control (`AGES`, "65+") and isn't affected.

## For implementation (if approved)

- **New wording:** "65 or older" needs a new key, not a change to `setup.age.65p`, because New Ascent uses that label too. The under-18 note also needs a new key. Both would be machine translations marked `source:"machine"` (`i18n:tasks` → `i18n:apply` → `i18n:check`). The German and Arabic text in these mockups is only a draft.
- **Accessibility:** the rows form a `radiogroup` of `radio` items with `checked` state (`aria-checked` on web). The note is announced politely when it appears.
- **Numbers in right-to-left languages:** wrap number-only labels with New Ascent's `isolateNumbers` so "18–29" never comes out as "29–18". Keep "Life Reset" together on one line in the Arabic note.
- **Small screens:** when the note appears off-screen (iPhone SE, larger text), scroll it into view.

## Fit (measured in the web build, inside each phone's safe area)

| Screen | Nothing chosen / band chosen | Under 18 |
|---|---|---|
| iPhone 14/15 class, 390 × 763 and 393 × 773 | no scrolling | no scrolling in English; German 6 pt over |
| Pro Max class, 430 × 853 | no scrolling | no scrolling |
| iPhone SE, 375 × 647 | 0 in English; German 37 pt over (three-line title) | scrolls (61 pt) |
| 320 × 548 | scrolls (≈120 pt) | scrolls |

## Limits

- **Web build only:** no iPhone or simulator was used.
- **Right-to-left:** emulated with `document.dir`.
- **Larger text:** approximated by enlarging all text by 130%.
- **Motion:** reduced motion was on, so no transitions are shown.
- **Native checks still needed:** fonts, hairline weight and contrast on a real iPhone.
