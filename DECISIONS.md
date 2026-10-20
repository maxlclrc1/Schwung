# Decisions and spec interpretations

Places where the handoff was ambiguous or silent, what was chosen, and why. Each one is easy to change.

1. **Plan rule 9** (drop from the bottom when over 6) was replaced (owner-approved): the goal habit is never
   dropped. The area habit with the mildest answer goes instead. See item 16.
2. **Ceremony timing**: milestones 7, 21 and 44 play when that day is fully completed. The day-66 finale
   plays once day 66 is a successful day by the streak rule: at least 80% of that day's planned habits
   (`dayQualifies`; the minimum is ceil(0.8 × planned), so 3 of 3, 4 of 4, 4 of 5, 5 of 6). If the user
   doesn't get there on the day, it plays the next time they open the app on a later day. Day 21 and day 44 are framed as
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
16. **Plan generation** (`src/core/plan.ts`, `buildPlan`) replaces the spec's §8 rules. Each habit comes
    with a source and a reason shown on the plan reveal.
    - *Foundation*: "Make your bed" is always first.
    - *Areas*: one habit per area where the answer shows room to improve. Sleep: <5h/5–6h → earlier
      bedtime, 6–7h → phone-free wind-down. Screen: 2–4h → phone-free morning, 4–6h → social-free mornings,
      6h+ → screen cap. Exercise: never → walk, a few times a month → steps, 1–2×/week → workout. Water: up
      to 2L → water. Mind: never → journal, rarely → breathe, weekly → read. Healthy answers add nothing.
    - *Goal*: always represented. If a habit already in a full plan serves the goal, it carries the goal
      (its reason says so). Otherwise a goal habit is added, and if that makes 7, the area habit with the
      mildest answer is dropped (ties: mind, then screen, water, exercise, sleep). The goal habit is never dropped.
    - *Fillers* (only to reach 5): more habits for the goal, then habits the quiz doesn't cover
      (top priorities, compliment, cold finish, deep work, conversation).
    - *Never assigned*: anything the answers say the user already does. Regular exercise means no walk or
      workout; 2L+ water means no water habit; reading/meditating/journaling most days means no mind habits;
      7h+ sleep means no bedtime habit; under 2h of screen time means no screen habits.
    - *Starting level*: easy, except water at 4–8 glasses, which starts at medium (6 glasses), because many
      people in that range already drink 4.
17. **Starting targets rewritten** so "easy" is reachable. Water: 4 / 6 / 8 glasses (was 1.5 / 2 / 2.5L).
    Screen cap: under 7h / 5h / 3h (was 5h / 4h / 2.5h). Earlier bedtime: "30 minutes earlier than usual",
    then 7h and 8h in bed before your alarm (was fixed clock times). Saved plans show the new text at their
    current level. No data changes.
18. **Theme preference** (`themePreference: 'system' | 'light' | 'dark'` in the saved store, default `system`).
    The sun/moon button switches directly to the opposite of what's on screen, which saves an explicit choice.
    Settings → Appearance also offers "System" to go back to following the phone. Data saved before this
    existed loads as `system`, which was the existing behavior, so no migration is needed. Restarting the
    program keeps the choice. The native appearance (`Appearance.setColorScheme`) is set to match where the
    platform supports it, so iOS alerts, the keyboard and the time picker agree. Ceremonies and the share card
    stay dark regardless (see `ceremonyColors`).

