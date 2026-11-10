# Visual QA

The visual QA tool finds clipped, truncated, overflowing and overlapping text and controls in every language, without anyone having to look through screenshots. It is for development only: none of it ships in the app, and it never touches real data. It runs the web build in a throwaway browser, with saved states written into that browser's own storage.

## Running it

```bash
npm run qa:build      # web export to .qa/web (after app changes)
npm run qa:fixtures   # saved states to .qa/fixtures.json (after program/fixture changes)
npm run qa            # quick matrix: 11 core screens × 20 languages × 2 settings ≈ 440 cases, ~8 min (4 workers)
npm run qa:full       # full matrix: 30 screens × 20 languages × 8 settings ≈ 4,800 cases, ~1.5 h
```

Open `.qa/report/index.html`. It shows:

- the number of problems of each kind;
- each screen's cases that have problems, grouped by language;
- the screenshots for those cases, with the suspected problems outlined.

The raw results are in `.qa/report/results.json`. The `.qa/` folder is ignored by git, so screenshots are never committed.

To narrow a run, for example to rerun the affected cases after a fix, pass any of these options. Each takes a comma-separated list:

```bash
node scripts/qa/run.mjs --lang=de,ar --scene=today,setup --config=small,large
node scripts/qa/run.mjs --shots=all   # screenshot every case, not only those with problems
```

**Minimum Effort** (offered only in development and internal builds): build with the internal channel, then run its
scenes and its accessibility pass:

```bash
EXPO_PUBLIC_SCHWUNG_CHANNEL=internal npm run qa:build && npm run qa:fixtures
node scripts/qa/run.mjs --scene=min-today,min-detail-recorded,min-detail-outdoors,min-detail-eatwell,min-journey,min-insights,min-momentum-journey,min-momentum-insights --config=small,large,small-large-dark
node scripts/qa/minimum-a11y.mjs
```

**Requirements:** Playwright with Chromium. It is preinstalled in the cloud dev container, so it isn't a project dependency. Elsewhere, install it once with `npm i -g playwright && npx playwright install chromium`, then set `NODE_PATH` to the global `node_modules`.

## The matrix

The phone settings are defined in `CONFIGS` in `run.mjs`:

| Setting | Width | Theme | Text size |
|---|---|---|---|
| `small` | 320pt (iPhone SE 1st gen) | light | normal |
| `standard` | 390pt | light | normal |
| `large` | 390pt | dark | larger, ×1.3 |
| `*-dark` / `*-light` | | the other theme | |
| `small-large*` | 320pt | | larger, ×1.3 |

- **Quick run (default):** the core screens with `small` and `large`.
- **Full run:** every screen with every setting.
- **Right-to-left:** Arabic and Urdu always run with a right-to-left page (`dir="rtl"`).

## Screens and states

The screens and their saved states are defined in `fixtures.ts`. They are built with the app's own program rules, and `__tests__/fixtures.test.ts` checks that the app reads each one back in full. Every case uses the same pinned date and clock.

| Area | Screens |
|---|---|
| Start | Language selection, Welcome |
| Onboarding | Every set-up step, walked through by answering each step (`flow: 'setup'`). Five habits are picked so that the follow-up questions about them also appear. |
| Main tabs | Habits on Day 12, including a long custom habit name; Journey; Insights |
| Habit screens | Habit details, a custom habit, Add a habit |
| Ceremonies | Day 1, the Day 7 milestone, the Summit, the welcome back |
| Reflections and collection | A weekly reflection, the collection |
| After the summit | The 66-Day Story, Beyond the Summit (Today and What's next), New Ascent, Keep My Momentum (Today and Journey), Past journeys and their story |
| Settings | Settings, Language, Privacy & Data, Wellness, Terms |
| Backup and recovery | Restore, the recovery screen (opened by a damaged save) |

## What it flags

The detector is `detect.js`. It reads the page's own geometry, never pixels. It flags these problems:

| Kind | Problem |
|---|---|
| `truncated` | Text cut short by an ellipsis or a line limit (`numberOfLines`). |
| `clipped` | Text cut off by a container that clips its content. |
| `clipped-script` | The same, for Arabic, Urdu, Devanagari, Bengali or Thai text, where the cause is usually the line height. |
| `overflow-x` | Text wider than the box it sits in. |
| `offscreen-x` | Text running past the edge of the screen. |
| `word-broken` | A line break inside a word, in a script that only breaks lines between words. Chinese, Japanese, Korean and Thai are exempt. A break at a soft hyphen doesn't count. |
| `tight-accents` | Capitals with marks above (İ, Ä, É, Й) in a line height under 1.18× the font size. The web draws the marks; iOS clips them. |
| `obscured` | Text covered by something opaque on top: a header, a bar or another control. |
| `overlap` | Two pieces of text drawn on the same glyph lines. |
| `overlap-controls` | Two controls on the same spot. |
| `control-offscreen` | A control off screen with nothing that scrolls to it. |
| `page-wider` | The whole page scrolls sideways. |

To avoid false alarms, it skips the following:

- Views hidden from screen readers, which are decorative: the painted world and the language ring.
- Invisible views.
- Single glyphs: icons and the rolling digits.
- Content under a sheet or modal that covers most of the screen.
- Content scrolled out of view.
- Content passing under a header while scrolling. It is only judged at the top and the bottom of the scroll, where it comes to rest.

On the web, a scroll view sometimes grows taller than the screen instead of scrolling. In that case the runner moves it up a screenful at a time and checks each position.

Text is measured word by word, so a space hanging at the end of a wrapped line (invisible) never counts as overflow.

To exclude a view by hand, give it `dataSet={{ qa: 'ignore' }}`.

### Known findings that are not bugs

- **Labels with `adjustsFontSizeToFit`** (the Light / Dark / System switch in Settings) are reported as `truncated` in long words (Russian "Системная"). On a phone the text shrinks to fit; the web ignores that property and shows an ellipsis.

### Fixes that keep the design

- **Long single words in narrow places** (the 130pt onboarding habit tiles at 320pt, the three level peaks): a soft hyphen (`\u00AD`) at the natural break in the translation, such as `Schlaf\u00ADrhythmus`. It's invisible unless the line breaks there, where it shows a hyphen, on iOS, Android and the web alike. Font sizes stay as designed.
- **Marks on capitals:** `src/i18n/script.ts` gives display and title styles at least 1.2× line height in languages whose capitals carry marks.

## Limits: what a web run cannot tell

- **Fonts:** text is drawn with the browser's fonts and text layout. iOS and Android use their own system fonts, which have different widths, line heights and fallbacks, especially for complex scripts. A clean run is strong evidence but not proof, so complex scripts still need a check on a device.
- **Right-to-left:** a native right-to-left launch mirrors the layout through React Native (`I18nManager`). On the web, the app keeps a left-to-right layout and the runner only sets `dir="rtl"` on the page. That shows text alignment and wrapping, but not native mirroring: the order of rows, mirrored icons or the tab pager. Those are checked on a device.
- **Text size:** larger text is approximated by scaling every font size and line height by 1.3. On a phone, Dynamic Type and Android font scaling also respect each text's `maxFontSizeMultiplier`, which this approximation ignores.
- **Animations:** they run with Reduce Motion on, so cases are deterministic. Problems that only appear mid-animation, or with motion on, are not seen.
- **Safe areas, keyboards and native sheets:** these are not emulated. Notches, the home indicator and the keyboard covering inputs are checked on a device.
