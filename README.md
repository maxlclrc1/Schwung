# Schwung (v1)

Schwung ("momentum" in German) is a free, offline 66-day reset program for iOS: a 6-question quiz, a personalized daily habit plan,
and a checklist that levels up over 66 days. There's no account, no backend, and no paywall.

Built with Expo SDK 58 (React Native 0.88), Expo Router, TypeScript, Zustand, AsyncStorage, Reanimated 4, and local notifications.
Every dependency is included in Expo Go, so no dev build is needed.

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go on your iPhone
npm test                # unit tests (plan generation, day math, progression)
npm run typecheck
npm run lint
```

`npm run web` also works. It's handy for a quick visual check, but iOS is the target.

### Build channels

One setting, `EXPO_PUBLIC_SCHWUNG_CHANNEL`, decides what a build offers to **new** programs (`src/lib/flags.ts`).
A running program always keeps its own version (V1 or V2), whatever the channel.

| Channel | How to run it | New programs | Developer tools |
|---|---|---|---|
| `development` (default for `npx expo start`) | `npx expo start --clear` | V2 | Settings → Developer |
| `internal` (testers) | `EXPO_PUBLIC_SCHWUNG_CHANNEL=internal npx expo start --clear`, or `eas build --profile internal` | V2 | none |
| `production` (default for every release build) | `eas build --profile production` | V1 (unchanged) | none |

- Use `--clear` whenever you switch channels: the value is built into the bundle, and a cached bundle keeps the old one.
- In Expo Go, the `internal` channel keeps a separate save (`schwung-state-internal`). Trying it never touches the
  progress saved under `development`, and switching back finds that progress as it was.
- An internal release build (`eas.json` profile `internal`) gets its own app identifier (`app.config.ts`:
  `….internal`), so it installs next to the public app and never shares its saved progress.

### Testing the 66 days without waiting 66 days

On the `development` channel, go to **Settings → Developer** to jump the clock (+1/+3/+7 days, day 7/22/66/67) and to
replay ceremonies. Everything else (day number, reconciliation, reminders) runs on that shifted clock.
The developer section and the offset exist only on the `development` channel of a development build, never on
`internal` or in a release build.

## Structure

```
src/
  app/                 Expo Router screens
    welcome, quiz, reveal, reminder      onboarding (welcome → 6 questions → plan → reminder)
    today                                the checklist (the product)
    habit/[id], swap/[id], add           plan editing (modals)
    journey                              66-day grid + stats
    ceremony                             full-screen day 1/7/21/44 moments + day-66 finale & share card
    settings                             reminder, export, restart, privacy, contact, dev tools
  core/                Pure, framework-free logic. Fully unit-tested.
    habits.ts          habit library (19 habits × 3 levels)
    plan.ts            generatePlan(answers) per spec §8
    dates.ts           calendar-date math (DST/timezone safe)
    progression.ts     phases, streak, XP, level-up offers, step-downs, reconcile(), ceremonies
  store/               Zustand store, persisted to AsyncStorage with coalesced writes
  lib/                 notifications, haptics, clock hook, constants
  components/          HabitRow (check-off interaction), ShareCard, UI primitives
  theme/               color tokens (dark + light), spacing, type scale, motion
```

## How the important parts work

- **Day number** is always derived from `startedAt` (a local `YYYY-MM-DD`) and today's local date using
  calendar math, never elapsed milliseconds. DST, timezone changes, and multi-day gaps can't skip or repeat a day.
  Missed days simply have no log, which means 0 completions.
- **Check-off**: tapping starts the spring animation on the UI thread before React re-renders. The store
  update is synchronous, and disk writes are coalesced (250 ms) and flushed whenever the app leaves the
  foreground. This combination keeps rapid tapping smooth and keeps state intact when the app is killed.
- **Progression**: `reconcile()` is idempotent and runs on launch, on foreground, and when the date or the
  noon cutoff rolls over. It applies phase level-ups (day 22, day 45), then gentle step-downs (3 consecutive
  missed *finalized* days drop a habit one level). Yesterday counts as finalized only after noon, because until
  then it can still be fixed. However long the absence, a habit drops at most one level, and all step-downs
  from one absence are combined into a single kind message.
- **XP and streak** are computed from the logs, not stored as counters, so unchecking a habit reverses its XP exactly.
- **Reminders**: instead of one repeating notification, the app schedules one notification per upcoming day
  (30 ahead, rescheduled on every open). Each one carries that day's number ("Day 23 of 66"), and today's is
  skipped once everything is checked.

See `DECISIONS.md` for places where the spec was ambiguous and the interpretation chosen, and `LATER.md` for
deferred scope.
