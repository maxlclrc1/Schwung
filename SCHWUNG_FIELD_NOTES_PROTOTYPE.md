# Schwung Field Notes — 14-day prototype

An isolated, internal-only prototype. It tests one idea: that Schwung is more useful as a **personal experiment**
("what actually works for me?") than as a habit checklist. It does not replace V1 or V2, changes no Schwung
data, and is unavailable in public production builds.

## 1. Isolation

| Concern               | How it's handled                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saved state           | Separate Zustand store `src/store/fieldNotes.ts`, key `schwung-fieldnotes` (`schwung-fieldnotes-internal` in Expo Go on the internal channel). Never writes `schwung-state*`.                                                                                                                                                                          |
| Schwung programs      | Field Notes only _reads_ the Schwung V2 profile (age, precautions) to skip questions and apply eligibility. A test runs all 14 days and checks the Schwung state and its disk bytes are unchanged. No migration.                                                                                                                                       |
| Production            | `fieldNotesAvailable() = channel() !== 'production'`. Every Field Notes route also starts with `if (!(__DEV__ \|\| process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') \|\| !fieldNotesAvailable()) return <Redirect href="/" />`, so release production bundles strip the code. Production web export, all chunks scanned: 0 Field Notes strings. |
| Start / leave / reset | Start: Welcome → "Or try Field Notes · 14 days", or Settings → "Try Field Notes · 14 days". Leave: "Switch to Schwung" (Field Notes kept, Schwung opens normally). Reset: "Start Field Notes over" (inline confirm) clears only Field Notes. While active, the app opens on `/fieldnotes`.                                                             |
| Reminders             | While Field Notes is active, its evening reminder (opt-in, 20:00) replaces Schwung's: at most one a day, skipped once today is noted, none after day 14. Switching back restores Schwung's reminders.                                                                                                                                                  |
| Data                  | Local only. "Share my notes (for the study)" exports JSON (run, archive, local open log) through the system share sheet; nothing is sent automatically. No accounts, analytics, backend, or new dependencies.                                                                                                                                          |

## 2. Daily flow

Days are calendar days from the start date; a missed day simply has no record.

| Days  | Stage                | What the person does                                                                                                                                                                                                                                                                                                            |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Setup + question     | Age (skipped with a Schwung profile; under 16 stops), goal (focus / energy / calm / confidence), health question only when the goal includes walking or breathing and no Schwung profile exists, choose 1 of the eligible experiments ("Suggested" first), see the 14-day plan, optional reminder. Day 1: "Today, just notice." |
| 1–3   | Starting point       | Optional 1–5 observation only. Called "your starting days", never a scientific baseline. Day 3 previews tomorrow's action.                                                                                                                                                                                                      |
| 4–10  | Experiment           | Today's small action; "I tried it" / "Not today"; optional When (morning/afternoon/evening); optional 1–5 observation. Day 7: first look + check-in (Easy/Okay/Hard; Hard points to the easier version). Copy varies by day.                                                                                                    |
| 11–14 | Discovery + decision | Discovery card (pattern heading, data lines, caveat). Decide: **Keep**, **Make it easier** (days 12–14 show the easier action), or **Try something different** (pick another eligible experiment for next time). Day 14: the personal field note.                                                                               |

Other screens: History (every day's record, earlier field notes), Field note (dates, question, what was tried,
counts, 14-day strip, what was noticed, check-in, caveat, what's carried forward, "Start your next 14 days").
After 2+ days with no record: a neutral "welcome back" card — no streak, no penalty.

**Never present:** streaks, XP, levels, confetti, guilt copy, "you broke your…", manipulative notifications.

### Camps (the mountain)

The Ascent trail is reused; day _d_ sits at `(d−1)/13` of its length. Five camps mark real moments, each tappable
to show what it holds: **Your question** (day 1), **Starting point** (day 4, starting-day summary), **First look**
(day 7), **Discovery** (day 11), **Field note** (day 14 _and_ a decision made).

## 3. Experiments and eligibility

12 experiments, 3 per goal, each a reviewed habit in the V2 release gate (`DEV_CLEARED`); no held Fitness exercise
habits. The daily action is the first rung of that habit's own ladder for the person; each has a hand-written
easier version.

| Goal       | Experiments (habit)                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Focus      | Phone-free start (`screen_morning`), Read (`mind_read`), Focus block (`focus_deepwork`)                                 |
| Energy     | Short walk (`move_walk`), Morning daylight (`sleep_morning_light`), Phone-free wind-down (`sleep_no_phone_bed`)         |
| Calm       | Slow breathing (`mind_breathe`), One line journal (`mind_journal`), Phone-free wind-down (`sleep_no_phone_bed`)         |
| Confidence | Reach out (`social_reach_out`), Genuine compliment (`confidence_compliment`), One real conversation (`confidence_talk`) |

Eligibility = the V2 `exclusion()` rules on either the Schwung profile (copied, read-only) or neutral answers.
Additionally, walking and breathing are **not offered** when health answers are "Prefer not to say" / unknown.
`start()` refuses any experiment not on offer for those answers.

## 4. Observation

One question per goal, labelled 1–5 (e.g. focus: "How focused did today feel?" 1 = Scattered … 5 = Very focused).
Always optional, clearable, today only. Self-report — never described as a measurement.

## 5. Insight rules (`src/core/fieldnotes/insights.ts`)

Deterministic; the same data always gives the same sentences.

| Rule                                                                             | Value                        |
| -------------------------------------------------------------------------------- | ---------------------------- |
| `minBaseline` — starting-day notes needed to compare                             | 2                            |
| `minTriedNotes` — notes on tried days needed to compare                          | 3                            |
| `minPerGroup` — notes in each of tried / not-tried to compare them               | 2                            |
| `meaningfulDiff` — smallest average gap mentioned (1–5 scale)                    | 0.5                          |
| `consistentShare` — share of tried-day notes on one side of the starting average | 2/3                          |
| `minTimes` / `timeShare` — "mostly in the …"                                     | ≥ 3 answers, one time ≥ 60 % |

- **Counts:** "You tried it on X of Y days" (Y = experiment days so far); "You noted your {noun} on N of M days".
- **Today** is included only once something is recorded for it (`summaryThrough`).
- **Missing ≠ zero:** unrecorded days and skipped observations are left out of every average; "not answered"
  is its own count. Invalid saved values are dropped on load, never converted to 0.
- **Pattern** (tried-day notes vs starting-day average), only if `minBaseline` and `minTriedNotes` are met:
  - _higher_: avg gap ≥ +0.5 **and** ≥ 2/3 of tried-day notes above the starting average
  - _lower_: avg gap ≤ −0.5 **and** ≥ 2/3 below
  - _same_: |gap| < 0.5
  - _mixed_: otherwise
  - _notEnough_: thresholds not met → "There aren't enough notes yet to compare with your starting days."
- Higher/lower are stated as day counts ("on 4 of the 4 days you tried it and noted it") plus both averages to
  one decimal. Never percentages.
- Tried vs not-tried averages appear only with ≥ 2 notes each and a gap ≥ 0.5.
- Headings are never more positive than the data ("A pattern worth noticing"; lower → "Not the direction you
  hoped, and worth knowing").
- Every insight shows the caveat: _"These are your own notes from a few days: patterns worth noticing, not
  proof of what caused what."_
- A 4000-run randomized test checks that every sentence follows these rules and none uses causal wording
  (improved, because, caused, boost, works, proves, %).

## 6. Decision, archive, reset

- `decide()` only from day 11. _Easier_ sets the easier action for the remaining days and as what's carried
  forward; _Different_ needs another eligible experiment.
- `finish()` archives a field note only when day ≥ 14 with a decision; earlier, it discards the run (Field Notes
  only).
- `reset()` clears the run and archive, keeping the reminder setting and the local open log.

## 7. Comparison study (proposed)

|          |                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design   | ~5 people use Schwung (V2, internal build) and ~5 use Field Notes, 14 days each, same internal build. Assign alternately by sign-up order.                                                         |
| Data     | Local only. At the end, the participant chooses to share: Field Notes → "Share my notes (for the study)"; Schwung → Settings export (includes `studyOpens`, the local open log).                   |
| Measures | Days opened on days 8–14 (from the open log); optional notes given; a short exit interview: can they say what they learned about themselves, would they start another 14 days, would they miss it. |
| Caveat   | 10 people cannot show a statistically meaningful difference. Treat results as qualitative signal for whether to invest further, not as proof. Participants know they're testing.                   |

## 8. Testing

**Automated (all pass):** 397 tests in 26 suites (Field Notes adds insight rules incl. the randomized test,
catalog/eligibility/journey, store isolation, route guards, recording rules, decisions, archive, cold-start
restore, sanitizing, V1 coexistence); `tsc --noEmit` clean; `expo lint` clean; Prettier clean.

**Browser (Playwright, Expo web, 375×667, light and dark), controlled dates via the dev clock:**

- Fresh onboarding → all 14 days, including skipped observations, missed days 8–9 (welcome back), reload
  persistence, day 11 discovery (higher pattern), "Make it easier" (day 12 action changes), day 14 field note,
  history, "Start your next 14 days" (archived).
- Existing V2 user: age/health reused from Schwung, Schwung save byte-identical, relaunch opens Field Notes,
  sparse data shows "Not enough notes to compare yet", "Switch to Schwung" returns to Today unchanged.
- Accessibility semantics on web: all controls labelled (buttons, radio group for the 1–5 scale, switch,
  headings); the 14-day strip has a text summary.
- Production web export: no Field Notes entry, `/fieldnotes*` redirects, V1 regression passes. Internal
  release export: Field Notes works with its own key, no developer tools. Internal iOS export bundles.

**Not tested:** a real iPhone, VoiceOver on device, Dynamic Type at the largest sizes, native notifications,
small-screen behaviour on real hardware. These need the device checks below.

## 9. On an iPhone (Expo Go, SDK 58)

```bash
git checkout main && git pull && npm install
EXPO_PUBLIC_SCHWUNG_CHANNEL=internal npx expo start --clear
```

Scan the QR code with the iPhone camera (Expo Go installed, same Wi-Fi; add `--tunnel` if it can't connect).
On Welcome tap **Or try Field Notes · 14 days**, or for an existing program: Settings → **Try Field Notes · 14
days**. The internal channel uses separate saves (`schwung-state-internal`, `schwung-fieldnotes-internal`), so it
won't touch any data from other runs.

To step through all 14 days quickly, use the development channel instead (`npx expo start --clear`): the Field
Notes screen then shows a developer clock (−1 / +1 day). Always use `--clear` when switching channels.

Device checklist: VoiceOver through one full day; Larger Text at the largest setting; iPhone SE-size screen;
light/dark; reminder arrives at the chosen time and not after today is noted.

## 10. Limitations

- 14 days, one experiment at a time; no 66-day Field Notes, no AI coaching.
- Starting days are 3 self-reported days — a rough reference, not a baseline.
- Day boundaries follow the device clock; travel across time zones may shift a day.
- The study has no randomization guarantee or blinding; results are qualitative.
