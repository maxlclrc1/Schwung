# Decisions and spec interpretations

Places where the handoff was ambiguous or silent, what was chosen, and why. Each one is easy to change.

1. **Plan rule 9 ("drop from the bottom, discipline/confidence extras first")**: when a plan has 7 habits, the
   first ones dropped are `discipline_cold`, then `confidence_talk`. If neither is in the plan, the last habit
   in the list goes. For a **focus** goal with every other answer triggering a habit, that last habit is
   `focus_deepwork`, so that user loses their goal habit. This follows the literal rule. If you'd rather always
   keep the goal habit, change `DROP_FIRST` in `src/core/plan.ts` and update the test
   "drops from the bottom of the list when there is no extra to drop".
2. **Ceremony timing**: milestone N (7, 21, 44, 66) plays when day N is fully completed. If the user doesn't
   finish day N, it plays the next time they open the app on a later day. Day 21 and day 44 are framed as
   "Phase 1/2 complete, next phase unlocks tomorrow", because the actual level-up happens at the start of
   days 22 and 45 (with an in-app "Phase 2 unlocked" note). Day 1 plays right after onboarding.
3. **Step-down timing**: a day counts as missed only once it's final. Yesterday stays open until noon because it
   can still be fixed. So "skip 3 days then open" steps habits down immediately if opened after noon, or at noon
   if opened in the morning.
4. **Phase level-ups vs. step-downs**: both apply in timeline order. Someone away across day 22 gets the phase
   level-up and then, if they missed 3+ days after it, a single step back down.
5. **Early level-up offers** appear inline on Today, one at a time. "Not yet" restarts the 7-day count, and so
   does any level change. Offers count today as soon as it's checked, so the offer shows up on the 7th check-off.
6. **Manual level changes**: the habit detail screen lets users pick a level directly. This supports the
   spec's "goals only kind of fit my life" complaint.
7. **Swapped or added habits** start at the current phase's level (easy/medium/hard). Custom habits have no
   levels and are never changed by progression.
8. **XP and level** are derived from logs, not stored. Unchecking a habit removes its XP.
9. **"Habits mastered"** on the finale means habits at max (hard) level.
10. **Maintenance mode** (day 67+): the header reads "Maintenance", the checklist works the same, early
    level-up offers and step-downs still apply, and phases no longer change.
11. **Each day's log stores its own plan snapshot** (`planned`), so editing the plan later doesn't change past
    days' completion ratios or streaks. Today's snapshot follows plan edits.
12. **Habit library**: the 14 habits from the spec, plus 5 original additions so swaps have options in every
    category: `sleep_wake`, `screen_social`, `move_steps`, `focus_top3`, `confidence_compliment`.
    `discipline_bed` is titled "Clean start" so its title doesn't repeat its easy task ("Make your bed").
13. **iPad**: `supportsTablet: false` for v1 (iPhone only), which avoids iPad screenshot and review requirements.
14. **Name: Schwung.** "66" is kept out of the branding (name, icon, welcome screen, share card) because the
    66-day framing is the competitor's identity. The program is still 66 days long internally ("Day 12 / 66").
15. **Placeholders to replace before launch**: `CONTACT_EMAIL` and `PRIVACY_URL` in `src/lib/constants.ts`, and
    the `com.example.schwung` bundle identifier in `app.json` (use a reverse domain you own).
