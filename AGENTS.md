# Working on Schwung

Schwung is an offline, privacy-first iPhone app (Expo SDK 58, React Native 0.88, Expo Router, TypeScript, Zustand,
Reanimated 4, react-native-svg) for one program: the 66-day Life Reset. Read this before changing code. Product
documents are indexed in [`docs/README.md`](docs/README.md); where a document and the code disagree, the code wins.

## Expo changes between SDKs: check the docs, not memory

Read the `expo` major version in `package.json`, then the matching docs (`https://docs.expo.dev/versions/v58.0.0/`,
or the index at https://docs.expo.dev/llms.txt). Add packages with `npx expo install <package>` so versions match
the SDK. `ios/` and `android/` are generated (Continuous Native Generation): never create or edit them; native
behaviour is configured in `app.json`, `app.config.ts` and config plugins. Expo Go has only its bundled native modules
(so no RevenueCat there); everything else needs a development or EAS build.

## Layout

```
src/
  app/          Expo Router routes only (every file is a screen; _layout.tsx files are navigators)
  core/         pure, framework-free rules, unit-tested: core/reset/ is the Life Reset (catalog habits.ts, pilot.ts,
                weekly, tracking, readiness, reflections, minimum, story…); dates, progression (80% rule, XP), the
                Journey trail, backups (dataExport/dataImport), tips.ts (the tip jar's logic without the SDK)
  store/        Zustand stores persisted through store/storage.ts (debounced, flushed on background)
  lib/          platform glue: flags (channels, Minimum Effort), constants (from release.config.json), tips
                (RevenueCat), reminders, files, haptics, navigation guard
  components/   screens' parts; components/pilot/ holds the Life Reset's screens
  theme/        palettes, type, motion tokens, theme transitions (fade.ts, gate.ts, transition.tsx, pageScheme.ts)
  i18n/         t(), plurals, direction, scripts; locales/<lang>/ (en is the source)
scripts/        i18n workflow, visual QA (qa/), 66-day simulations (audit/), release check (release/)
docs/           active references; docs/archive/ is history
design/         artwork sources and tools (not bundled)
```

Names from the Life Reset's pilot days (`pilot.ts`, `PilotProgram`, `schwung-reset-pilot`) are kept on purpose: the
save key must not change.

## Rules that protect people's data and privacy

- **Saved data must keep loading.** Keys: `schwung-reset-pilot` (v3), `schwung-journeys` (v2),
  `schwung-preferences` (v1), plus `schwung-reminder-*` and `schwung-tip-unsettled`. Changing a saved shape means a
  version bump with a migration, and tests that load the old shape. Backups (`core/dataImport.ts`) accept every
  earlier format; `backupFuzz.test.ts` must keep passing. Every key starts with `schwung-` so Delete my data finds it.
- **No network of the app's own.** No fetch/XHR/WebSocket, no analytics, crash-reporting or ad SDKs
  (`noNetwork.test.ts` enforces it, including a dependency allowlist). The only exception is RevenueCat in
  `lib/tips.ts`: started only when Support opens or a tip is unfinished, anonymous (`appUserID: null`, no
  attributes, no device identifiers). A thank-you only for a transaction RevenueCat recorded; errors after a possible
  charge never say "failed".
- **No secrets in the repository.** Only RevenueCat's public Apple key (`appl_…`) may go in `release.config.json`;
  never an `sk_` key, `.p8`/`.p12` or certificate (`secrets.test.ts`, `npm run release:check`).
- **Links can open any screen** (`schwung://…`). A route may read parameters to show something, never to change
  saved data (`reflectLink.test.ts`).
- **Release identity** (name, bundle ID, email, URLs, tip product IDs, RevenueCat key and offering) comes only from
  `release.config.json`; nothing hard-codes it (`appConfig.test.ts`). Don't finalize or invent these values.
- **Minimum Effort** ("Did the minimum") is built and stays off in production: `MINIMUM_EFFORT_LAUNCHED = false` in
  `lib/flags.ts` until `docs/MINIMUM_EFFORT_RELEASE_CHECKLIST.md` is done. Keep its code and saved fields.
- **Health answers and the age gate** (18+) shape which habits are offered; don't loosen them.

## Rules for the code

- **Every user-facing string** goes through `t()` with an English source in `src/i18n/locales/en/`. New or changed
  copy: `npm run i18n:tasks` → fill `scripts/i18n/tasks.json` → `npm run i18n:apply` → `npm run i18n:check`
  (`docs/LOCALIZATION.md`). Use `{app}` for the app's name in new copy (it may be renamed). Right-to-left: use the
  `logical`/`physical` helpers in `i18n/direction.ts`.
- **Theme colours** come from `useTheme().c`; views and text fade with `ThemedView` / `T` on the UI thread. A theme
  switch re-renders React once, at low priority (`theme/transition.tsx`); hidden pager pages follow after the
  visible one (`theme/pageScheme.ts`). Paintings use `ThemedImage` (both themes stay decoded).
- **Worklets** (`useAnimatedStyle`, `'worklet'` functions) may call only worklets: a plain function called on the UI
  thread crashes iOS while working on the web (`worklets.test.ts` checks every worklet).
- **Motion and haptics** use the shared tokens (`theme/motion.ts`, `lib/haptics.ts`) and respect Reduce Motion.
- **Approved screens are not redesigned** in passing; visual changes are deliberate, reviewed tasks.
- **Open-source notices** (Settings → About → Open Source Licences, `THIRD_PARTY_NOTICES.md`) are generated from the
  production build: after adding or updating a dependency, run `npm run licenses` (`release:check` fails until it
  matches). Import icon sets one by one (`@expo/vector-icons/Ionicons`), so only the fonts used are bundled.

## Before calling a change done

```bash
npm test                 # all unit, regression and guard tests
npm run typecheck
npm run lint
npm run i18n:check
AUDIT=1 npx jest scripts/audit                          # 66-day simulations
npm run qa:build && npm run qa:fixtures && npm run qa   # visual QA (20 languages × sizes × themes)
npx expo export --platform ios                          # the production bundle builds
```

`npm run release:check` lists what still blocks an App Store build (it fails until release.config.json is real).
The web build is for QA only: it can't show native crashes (test on a phone, Expo Go or TestFlight).

## Builds

`EXPO_PUBLIC_SCHWUNG_CHANNEL`: `development` (default, developer clock), `internal` (`eas build --profile internal`,
its own `.internal` app identifier and save) or `production` (`eas build --profile production`). Run EAS as
`npx eas-cli@latest <command>`. Releasing: `docs/TESTFLIGHT_CHECKLIST.md`.
