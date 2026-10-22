# Schwung: app overview

**Schwung** (German for "momentum") is a free iPhone app that runs a guided 66-day reset program.
You answer a short quiz, get a personalized daily habit plan, check habits off every day, and level up
as you go. There's no account, no paywall, no ads and no tracking. Everything stays on the phone and
works offline.

**Pitch:** "Get your momentum back. Free. No account. No paywall."

**Competitor:** "Life Reset" (formerly "Rise"). Its users complain about a hard paywall after the quiz,
check buttons that don't respond, login problems, Monday-only start dates, and plans they can't customize.
Schwung answers each of those: it's free, check-off is instant, there's no login, you can start any day,
and the plan is fully editable.

## Screens and flow

1. **Welcome**: an animated "momentum" illustration (a glowing core with orbiting dots), the headline
   "Get your momentum back.", "Free. No account. No paywall.", and a "Start my reset" button.
2. **Quiz**: 6 questions, one per screen, each with an animated icon and a progress bar.
   - Sleep: <5h, 5–6h, 6–7h, 7–8h, 8h+
   - Screen time: <2h, 2–4h, 4–6h, 6–8h, 8h+
   - Exercise: never, a few times a month, 1–2/week, 3–4/week, 5+/week
   - Water: <2 glasses up to 12+ glasses (5 options)
   - Read/meditate/journal: never, rarely, weekly, most days, daily
   - Main goal: energy, focus, discipline, confidence, less stress, get in shape
3. **Plan reveal**: the 5–6 habits picked for you, each with an icon and a one-line "why".
   Button: "Begin Day 1".
4. **Reminder**: pick a daily reminder time. Notification permission is asked only here, after the plan.
5. **Day 1 ceremony**: a full-screen animated moment.
6. **Today** (the core screen):
   - **Header:** the Schwung wordmark and a time-of-day greeting, with theme and Settings buttons.
   - **The Schwung Ascent:** a winding trail of 66 day markers up a misty mountain, in three phases
     (Foundation 1–21, Momentum 22–44, Mastery 45–66).
     - Successful days are lit, missed days stay on the walked trail but dimmer, and future days are faint.
     - Today is a glowing violet orb. Landmarks mark days 7, 21 and 44, and a gold star marks the summit (66).
     - Tap a day to see it (for example "Day 12 · Foundation · 5 of 5 done"), then open it in Journey.
   - **Daily mission:** date, phase line, a progress bar per habit, a gentle message (e.g. "2 more and today
     counts"), the streak, and the level with an XP bar.
   - **Habits:** tap to check with instant feedback and haptics; tap again to uncheck; long-press for details.
     Before noon you can switch to yesterday and fix it. Level-up offers and kind step-down messages appear here.
   - Finishing every habit triggers a confetti burst, a success haptic, and "+20 XP bonus".
7. **Habit detail**: the "why", a level picker (Lv 1–3), the current run, plus swap and remove.
8. **Swap**: choose another habit from the library, with similar habits listed first.
9. **Add**: create a custom habit with a title and optional details.
10. **Journey**: a 66-day grid colored by completion, plus days done, current streak and best streak.
    A day picked on the Ascent is outlined.
11. **Ceremonies**: full-screen moments with confetti on days 1, 7, 21, 44 and 66. Day 66 shows final stats
    and a shareable image card ("I got my momentum back.") through the iOS share sheet, followed by
    "Season 2 coming soon" and the option to keep going in maintenance mode.
12. **Settings**: reminder on/off and time, export data as JSON, restart the program, privacy policy and contact.
    A developer-only time-travel tool helps with testing.

## How progression works

- **Phases:** days 1–21, 22–44 and 45–66. At each new phase, every habit levels up one step
  (easy → medium → hard).
- **Early level-up:** 7 days in a row on a habit triggers a "Level up now?" offer, which you can decline.
- **Gentle step-down:** missing a habit 3 days in a row drops it one level, with a kind message. A long
  absence never drops a habit more than one level.
- **Streak:** a day counts toward the streak when at least 80% of habits are done.
- **XP:** +10 per habit and +20 for a full day. Every 200 XP is a new player level.
- **Day number:** calculated from the start date and the calendar, so it's safe across time zones and
  daylight saving changes, and missed days simply count as 0.

## Habit library (19 habits, 3 levels each)

| Area | Habits |
|---|---|
| Sleep | earlier bedtime, phone-free wind-down, steady wake-up |
| Screen | phone-free morning, screen time cap, social-free mornings |
| Exercise | daily walk, workout, step count |
| Water | hydrate |
| Mind | read, breathe/meditate, journal |
| Focus | deep work, top priorities |
| Discipline | cold finish to the shower, make your bed ("Clean start") |
| Confidence | start a conversation, genuine compliment |

The quiz answers map to habits deterministically. "Make your bed" is always included as an easy first win.
Each area where the answers show room to improve gets one habit, the stated goal always gets a habit, and
nothing the user already does regularly is assigned. Each habit on the plan reveal says why it was picked
(quoting the answer, or naming the goal). Starting targets are set to be reachable from the answer given,
for example 4 glasses of water for someone drinking under 2, or a 7h screen cap for 8h+ users.

## Design

- **Dark mode:** violet-black background (#111116), surfaces #1C1B25, lavender accent (#A78BFA), text #F5F3FF / #A5A3B5.
- **Light mode:** soft violet-white background (#F7F6FB), white surfaces, deeper violet accent (#7451C8), text #191621 / #696575.
- **Theme choice:** a sun/moon button on the welcome screen and the Today header switches between light and dark;
  Settings → Appearance offers System / Light / Dark. The choice is saved on the device. Ceremonies and the
  share card stay dark by design.
- Switching themes fades colors smoothly over about 220 ms (instant with Reduce Motion).
- Gold (#F2B84B) is reserved for milestone ceremonies, never an everyday accent.
- Large, bold system typography, generous spacing, and one accent color per screen.
- Fast, subtle motion (150–250 ms) with a spring on check-off. Bolder, cinematic ceremonies.
- All illustrations are drawn in code (glowing icon orbs, orbit animation, confetti), so there are no image files.
- The app icon is a lavender "S" on charcoal (a placeholder).

## Tech

Expo SDK 57, React Native, TypeScript, Expo Router, Zustand with AsyncStorage (on-device only),
Reanimated 4, expo-haptics, expo-notifications (local only), and react-native-view-shot + expo-sharing
for the share card. It runs in Expo Go with no backend. The core logic is unit-tested.

## Not built yet (roadmap)

Home-screen widgets, a tip jar (one-time purchase), Seasons 2+ (Body, Mind, Money, People),
a Turkish translation, an Android release, and iCloud sync.
