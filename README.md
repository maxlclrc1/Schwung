# Schwung

Schwung ("momentum" in German) is a free, offline iPhone app for one thing: the **66-day Life Reset**. You choose a
few of 11 habits, start each at an intensity that suits you, and swipe them done every day; they grow with you over
three phases. There's no account, no backend and no paywall.

Built with Expo SDK 58 (React Native 0.88), Expo Router, TypeScript, Zustand, AsyncStorage, Reanimated 4 and
react-native-gesture-handler.

## Run it

```bash
npm install
npx expo start --clear  # scan the QR code with Expo Go, or open a development build
npm test                # unit tests (habit rules, weekly scheduling, readiness, Insights, saves)
npm run typecheck
npm run lint
```

`npm run web` also works for a quick visual check, but iOS is the target.

### Build channels

Every build is the same app. `EXPO_PUBLIC_SCHWUNG_CHANNEL` (`src/lib/flags.ts`) only decides:

| Channel                                        | How to run it                                                                                    | Developer clock             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- |
| `development` (default for `npx expo start`)   | `npx expo start --clear`                                                                         | yes (Habits screen, bottom) |
| `internal` (testers)                           | `EXPO_PUBLIC_SCHWUNG_CHANNEL=internal npx expo start --clear`, or `eas build --profile internal` | no                          |
| `production` (default for every release build) | `eas build --profile production`                                                                 | no                          |

- Use `--clear` when you switch channels: the value is built into the bundle.
- In Expo Go, the `internal` channel keeps a separate save (`schwung-reset-pilot-internal`).
- An internal release build gets its own app identifier (`app.config.ts`: `….internal`), so it installs next to
  the App Store app and never shares its saved progress.

## Structure

```
src/
  app/                    Expo Router screens
    index, welcome          where the app opens; the start screen ("Start my reset")
    life-reset/setup        set-up: about you, habits, only the questions they need, intensity, time, review
    (tabs)/                 Habits, Journey and Insights: one pager over the shared world
    life-reset/[id]         a habit's details, corrections and difficulty (modal)
    life-reset/add          add one of the 11 to the running program (modal)
    settings                your program (end it), appearance, export, privacy, contact
  core/                   Pure, framework-free logic, unit-tested
    reset/                  the Life Reset: catalog (habits.ts), weekly scheduling, tracking, readiness,
                            measures, the program's rules (pilot.ts) and its Insights charts
    dates.ts, progression.ts  calendar-date math; the 80% rule, full days and XP
    ascent.ts, world.ts, pager.ts  the Journey trail, the world's geometry, the tab swipe rules
  store/                  Zustand stores, persisted to AsyncStorage with coalesced writes
    resetPilot.ts           the program (key `schwung-reset-pilot`)
    preferences.ts          the appearance (key `schwung-preferences`)
  components/             cards, the world, the pager, charts; components/pilot/ holds the Life Reset's screens
  theme/                  colour tokens (dark + light), spacing, type; theme switches wait for their paintings
```

The code keeps the names it had while the Life Reset was a pilot (`pilot.ts`, `PilotProgram`, the save key), so
a pilot save carries on unchanged.

## Documentation

- `SCHWUNG_LIFE_RESET_PROGRAM.md`: how the app works now (rules, Insights, Journey, performance, testing).
- `SCHWUNG_LIFE_RESET_HABITS.md`, `SCHWUNG_LIFE_RESET_CATALOG_NOTES.md`: the 11 habits and their rules.
- The other documents are design history, including the earlier V1/V2 program, which was removed from the app
  (it stays in the git history).
