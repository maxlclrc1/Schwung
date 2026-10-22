# Later (not in v1)

From the handoff's out-of-scope list and roadmap:

- **v1.1**: home screen widget (needs a dev build: WidgetKit extension). Tip jar: one-time IAP, asked only at
  days 7/30/66, with a supporter badge/icon.
- **v1.2**: Seasons (Body, Mind, Money, People), maintenance mode improvements, Turkish localization.
- **v2**: Android release, optional iCloud sync.
- Not planned: social features and leaderboards, AI-generated messages, analytics of any kind.

Ideas that came up while building v1 (not built):

- A read-only detail view for past days from the Journey grid. Right now the grid shows each day's status but
  you can't tap a day to see what was checked.
- Per-habit history and stats on the habit detail screen beyond "current run".
- A custom font. v1 uses SF Pro (system) in heavy weights, which already looks good and adds no assets or load time.
- Icon polish. The current icon is a generated placeholder: a lavender "S" on charcoal.
- A data **import** to go with export, for moving to a new phone until iCloud sync exists.
- A widget-friendly shared data store (App Group) so v1.1 widgets can read state.
- **Nutrition habits** (deliberately not in v1, which has no food category): e.g. protein with breakfast,
  a vegetable with lunch and dinner, no sugary drinks, a cut-off time for eating, cooking at home N times
  a week. It would need its own quiz question so recommendations stay grounded in answers.
- **Finer quiz baselines** for more precise starting targets, e.g. current bedtime and wake time (so sleep
  targets can use real clock times), exact daily screen time, and which of reading/meditating/journaling
  someone already does (the quiz currently asks about all three together).
- **Ascent polish:**
  - per-day history detail when a marker is selected (today it opens the Journey grid)
  - optionally `react-native-svg` for a continuous lit trail line instead of dots
  - a hand-painted landscape to replace the generated art

