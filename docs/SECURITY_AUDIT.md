# Schwung — Security & Privacy Audit (Launch Readiness, Phase 1)

Audited commit: `d83ad8d` (the latest on `main` at the time; it includes `a07887e`). Scope: the app as it ships
from this repository (Expo SDK 58, React Native 0.88, iOS first). No fixes are made in this phase.

**Labels used below**

- **Verified** — confirmed in the code (file and line given).
- **Potential risk** — a real path in the code, but it depends on circumstances (corruption, a future change).
- **Needs iPhone verification** — depends on the native build or iOS behaviour and can't be confirmed from source.

**Overall:** Schwung is genuinely local-only: no network requests, no analytics, crash reporting, accounts or
remote push in the app code, and nothing leaves the phone except files the person explicitly shares. There are
**no critical vulnerabilities**. The most important issues are one **silent data-loss path** on a damaged save,
**placeholder App Store identity and policy URLs**, and an **unused push-notification entitlement**.

---

## Summary

| #   | Severity | Finding                                                                                     | Type                      | Before submission?                       |
| --- | -------- | ------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------- |
| H1  | High     | A damaged or unrecognized save is silently discarded, and the next save overwrites it       | Potential risk            | **Yes**                                  |
| H2  | High     | Placeholder bundle ID, privacy policy URL and support email                                 | Verified                  | **Yes**                                  |
| M1  | Medium   | Remote push entitlement (`aps-environment`) added though push is never used                 | Needs iPhone verification | **Yes** (recommended)                    |
| M2  | Medium   | Privacy manifest (required-reason APIs) not declared for the app's own use                  | Needs iPhone verification | **Yes**                                  |
| M3  | Medium   | A future save-version bump without a migration would discard every user's data              | Potential risk            | No (guard before the next format change) |
| M4  | Medium   | The data export includes health answers and is written to a cache file that isn't removed   | Verified                  | Recommended                              |
| L1  | Low      | Old V1/V2 saves (`schwung-state*`) are never removed from testers' phones                   | Verified                  | No                                       |
| L2  | Low      | Ending a reset keeps preferences, the export file and story images until iOS purges them    | Verified                  | No                                       |
| L3  | Low      | Changing the device clock lets past days be completed (XP and collectibles)                 | Verified                  | No                                       |
| L4  | Low      | npm audit: 4 high / 5 low in build tooling, none in the shipped app                         | Verified                  | No                                       |
| L5  | Low      | Data is protected by iOS defaults (not "complete" protection) and included in backups       | Needs iPhone verification | No                                       |
| L6  | Low      | Habit names in reminders are opt-in, but custom names can be personal                       | Verified                  | No                                       |
| —   | Info     | Things that are already right (logging, dev tools, network, age gate, health rules, photos) | Verified                  | —                                        |

---

## High

### H1 — A damaged or unrecognized save is silently discarded, then overwritten (data loss)

**Status: resolved** (Phase 2A): damaged, unreadable and newer-version saves are copied to write-once recovery
slots before anything else, valid parts are recovered and lost parts named, saves are held back until the person
chooses on a recovery screen (`src/store/recovery.ts`, `src/store/resetPilot.ts`, `src/components/RecoveryScreen.tsx`).

**Type:** Potential risk (requires a corrupted, truncated or hand-edited save, or an app bug that writes an
invalid program). **Must fix before submission.**

**Where**

- `src/store/resetPilot.ts` — `sanitizeResetPilot()`:
  `const program = p.program === null || p.program === undefined ? null : P.sanitizePilotProgram(p.program);`
  If `sanitizePilotProgram` rejects the program (returns `null`), the store starts **without a program**.
- `src/core/reset/pilot.ts` — `sanitizePilotProgram()` returns `null` for the whole program if, for example, any
  chosen habit's progression fails validation (`if (!validState(s, id)) return null;`).
- `src/store/resetPilot.ts` — `merge: (persisted, current) => ({ ...current, ...sanitizeResetPilot(persisted) })`.

**Why it matters:** one invalid field (a damaged write, a bug in one habit's state) makes the app open on the
start screen as if the person never began. Nothing tells them. The original text is still on disk, but the next
save (for example starting a new reset, or any preference change that rewrites the key) replaces it, and weeks of
progress are gone for good.

**Fix (proportionate):** before dropping an unreadable program, copy the raw saved text to a separate key (for
example `schwung-reset-pilot-recovery`) and never overwrite that key automatically. Show a calm message ("We
couldn't open your Life Reset") with **Export it** (so it can be recovered) and **Start again**. Prefer repairing
over rejecting where possible: drop only the habit whose state is invalid rather than the whole program. Add a
test that a damaged program is kept for recovery.

### H2 — Placeholder App Store identity, privacy policy and support contact

**Status: open, founder decision.** Recommended identifier: reverse-DNS of a domain the founder owns,
`<reversed domain>.schwung` (for example `com.<yourcompany>.schwung`). It's permanent once published, so it needs the
founder's approval and a matching App ID in the Apple Developer account. Insert it in `app.json`
(`ios.bundleIdentifier`, and `android.package`); the internal build derives `<id>.internal` from it
(`app.config.ts`). The privacy policy URL and support address go in `src/lib/constants.ts` (`PRIVACY_URL`,
`CONTACT_EMAIL`) and in App Store Connect.

**Type:** Verified. **Must fix before submission.**

**Where**

- `app.json` — `"bundleIdentifier": "com.example.schwung"` (and Android `"package": "com.example.schwung"`).
- `src/lib/constants.ts` — `PRIVACY_URL = 'https://example.github.io/schwung/privacy'` (`// TODO`) and
  `CONTACT_EMAIL = 'hello@example.com'` (`// TODO`); both are linked from Settings → About.

**Why it matters:** App Store Connect requires a real, reachable privacy policy URL, and a placeholder support
address breaks the Settings links and user trust. `com.example.*` can't be registered as your app's identifier,
and the bundle ID is permanent once the app is published (changing it later means a new app, and users' local data
would not carry over).

**Fix:** choose the final reverse-DNS bundle ID now; publish a privacy policy that matches what the app actually
does (all data on the phone, no tracking, optional notifications and Photos save, user-initiated exports) and set
both constants.

---

## Medium

### M1 — Remote push entitlement added although only local notifications are used

**Status: configured** (Phase 2C): `expo-notifications` runs with `enableRemoteNotifications: false`. A prebuild
generates an empty `Schwung.entitlements` (no `aps-environment`) and no `UIBackgroundModes`. Still to confirm on a
signed EAS build: no Push Notifications capability, and scheduled reminders still arrive.

**Type:** Needs iPhone verification (inspect the built app's entitlements). **Recommended before submission.**

**Where:** `app.json` → `"plugins": [..., "expo-notifications", ...]` with no options. In
`node_modules/expo-notifications/plugin/build/withNotificationsIOS.js` the plugin defaults to
`enableRemoteNotifications = true`, which adds the `aps-environment` (Push Notifications) entitlement.

**Why it matters:** Schwung never registers for remote push (no push token calls in `src/`). An unused push
capability widens the app's native surface, requires push provisioning, and invites App Review questions.

**Fix:** configure the plugin with `{ "enableRemoteNotifications": false }`, rebuild, and confirm the built app has
no `aps-environment` entitlement while scheduled reminders still arrive.

### M2 — Privacy manifest for required-reason APIs not declared

**Status: configured** (Phase 2C): `ios.privacyManifests` in `app.json` declares no tracking, no tracking domains,
no collected data, and the reasons for the APIs used by the code shipped in the app:

- file timestamps `C617.1` (files in the app's own container: AsyncStorage, temporary share files);
- `UserDefaults` `CA92.1` (React Native, expo-constants, expo-notifications, expo-system-ui; this app only);
- system boot time `35F9.1` (React Native's timing, elapsed time only).

The installed SDKs ship their own manifests (expo-file-system and expo-media-library add `0A2A.1`, `3B52.1` and
disk-space reasons); React Native's pod install merges them into the app's file (`privacy_file_aggregation_enabled`
is on). Still to confirm on a signed EAS build: the final `PrivacyInfo.xcprivacy` in the `.app`, Xcode's privacy
report, and no missing-reason warnings on upload.

**Type:** Needs iPhone verification. **Must be resolved before submission** (App Store Connect rejects uploads
missing required-reason declarations).

**Where:** `app.json` has no `ios.privacyManifests`. The app relies on AsyncStorage, file timestamps and
`UserDefaults`-based modules through Expo and React Native.

**Why it matters:** Apple requires each app (and its SDKs) to declare why it uses certain APIs (for example
`NSPrivacyAccessedAPICategoryUserDefaults`, `NSPrivacyAccessedAPICategoryFileTimestamp`). Expo modules ship their
own manifests, but the app-level manifest must be complete, and the App Privacy answers in App Store Connect must
match ("Data Not Collected").

**Fix:** after an EAS build, check the generated `PrivacyInfo.xcprivacy` and the upload's validation warnings;
add any missing reasons through `expo.ios.privacyManifests` in `app.json` (no tracking, no collected data types).

### M3 — A future save-version bump would discard every user's data

**Status: resolved** (Phase 2A): explicit `SAVE_MIGRATIONS` with `migrateSave()`; a version with no way forward,
or a newer one, is kept and shown on the recovery screen instead of reset.

**Type:** Potential risk (no current bug). Fix before the next change to the saved format.

**Where:** `src/store/resetPilot.ts` — `version: RESET_PILOT_VERSION` (`1`) with **no `migrate`** in the persist
options; `src/store/preferences.ts` — `version: 1`, no `migrate`.

**Why it matters:** with zustand's `persist`, if the stored version differs from the code's version and no
`migrate` is given, the stored state is ignored. Raising the version for a format change would reset every
user's Life Reset without warning.

**Fix:** add a `migrate(persisted, version)` that returns the persisted state unchanged (and sanitizes it) for
known older versions, plus a test; only then bump the version.

### M4 — The export contains health answers and stays in the cache

**Status: resolved** (Phase 2B): Settings → Privacy & Data shows what the export contains (health, sleep and
activity information) and asks before exporting; exports are temporary files in an app-managed folder, removed
after the share sheet closes and on later launches (`src/components/PrivacyData.tsx`, `src/core/dataExport.ts`,
`src/lib/appFiles.ts`).

**Type:** Verified. Recommended before submission.

**Where:** `src/app/settings.tsx` — `exportJson()` writes `{ exportedAt, lifeReset: program, themePreference }` to
`new File(Paths.cache, 'schwung-export.json')` and opens the share sheet. `program.answers` includes `precautions`
(heart condition, pregnancy, fluid limits, sleep condition, joint pain), age band, wake time and phone use, and
`program.custom` includes the person's own habit names.

**Why it matters:** exporting is the person's choice, but they may not realise the file contains health
information before sending it to someone or an app. The file also stays in the app's cache after sharing (until
iOS purges it).

**Fix:** say what's inside before exporting ("Includes your answers about health and habits"), and delete the
cache file after the share sheet closes (`file.delete()` in a `finally`). Optionally offer an export without
health answers.

---

## Low

### L1 — Old V1/V2 saves are never removed

**Status: partly resolved** (Phase 2B): Delete my data removes them; they're still not removed automatically.

**Type:** Verified (low impact: only test devices ran those versions).

**Where:** the pre-Life-Reset app saved under `schwung-state` / `schwung-state-internal`
(`git show 1e962b7^:src/lib/flags.ts`, `storageKey()`). Commit `1e962b7` removed the code but nothing deletes
those keys; there is no `removeItem`/`multiRemove` for them in `src/`.

**Why it matters:** old habit history (and the old app's answers) can remain on testers' phones indefinitely,
unreadable by the app and not removable from it.

**Fix:** on start, `AsyncStorage.multiRemove(['schwung-state', 'schwung-state-internal'])` once (idempotent).

### L2 — "End the Life Reset" leaves some data behind

**Status: resolved** (Phase 2B): ending a reset also removes its temporary share files; Delete my data removes
every `schwung-` record (program, recovery copies, preferences except the theme, old V1/V2 and Field Notes
saves), pending reminders and temporary files, and reports anything it couldn't remove (`src/store/deleteData.ts`).

**Type:** Verified.

**Where:** `src/store/resetPilot.ts` — `end: () => set({ ...initial })` clears the program (its logs, answers,
reflections, collection) and the reminders are then cancelled by `ReminderSync`. Left behind: preferences
(`schwung-preferences`: theme, reminder time, welcome-back choice), `schwung-export.json` in the cache (M4) and
any captured story images in the temporary directory (`captureRef(..., { result: 'tmpfile' })` in
`src/components/story/StoryKeepsake.tsx`).

**Why it matters:** nothing sensitive stays in preferences, but people expect "delete" to remove everything,
including exports that contain health answers.

**Fix:** on end, also delete the export file and the story's temporary images; consider a **Delete all data**
action that also resets preferences. Make sure the deletion is flushed (`flushStorage()`), so a quick app close
can't resurrect the old program.

### L3 — Changing the device clock lets past days be completed

**Type:** Verified (self-only effect).

**Where:** `src/store/resetPilot.ts` — `pilotToday()` and `toggle()` use the device's date; only today and (until
noon) yesterday are editable, but setting the clock back makes earlier days "today".

**Why it matters:** someone can award themselves completions, XP, titles and collectibles. There's no shared or
competitive element, so the only harm is to the person's own record. XP is derived from the logs (no double
award), and ceremonies, milestones and collectibles are stored once, so nothing duplicates.

**Fix:** none required for launch. Optionally record the latest date seen and ignore completions dated before it.

### L4 — Dependency vulnerabilities (build tooling only)

**Type:** Verified with `npm audit` (production tree: 4 high, 5 low; whole tree: 4 high, 9 low).

**Where:** `node-forge` and `zod` under `@expo/cli`, `deepmerge` under `@expo/config`, `zod` under
`eslint-plugin-react-hooks`.

**Why it matters:** these run on the developer's machine during builds and linting; none of them is bundled into
the iPhone app, which uses no network. Risk to users is negligible.

**Fix:** update when Expo publishes patched SDK 58 releases (`npx expo install --fix`); don't force-upgrade
outside the SDK.

### L5 — iOS file protection and backups use the defaults

**Type:** Needs iPhone verification.

**Where:** all data is in AsyncStorage (`src/store/storage.ts`), which iOS keeps in the app's container with the
default data protection (normally "complete until first unlock") and includes in iCloud and computer backups.

**Why it matters:** this is appropriate for habit data: it's encrypted at rest by iOS, and backups let people keep
their progress when they change phones (iCloud backups are encrypted). Health answers are the most sensitive
part; "complete" protection would make them unreadable while the phone is locked, which would break reminders that
check the day in the background.

**Fix:** keep the defaults; confirm on a device that the save file is in the app container (not shared), and
state in the privacy policy that data is stored on the device and in the person's own backups.

### L6 — Habit names in reminders

**Type:** Verified (handled correctly; noted for the policy).

**Where:** `src/core/reminders.ts` / `src/components/reminders/RemindersSettings.tsx` — habit names appear only if
"Mention my habits" is turned on (off by default, with a lock-screen note). Custom habit names are the person's own
words and could be personal.

**Fix:** none required. Optionally set the notification category to hide previews when locked.

---

## Already right (verified)

- **No data leaves the phone on its own.** No `fetch`, HTTP, WebSocket, analytics, crash reporting, ads or
  `expo-updates` in `src/` or `package.json`; the only URLs are the Settings links (`src/lib/constants.ts`). Sharing
  and exporting happen only through the share sheet the person opens.
- **Notifications** are local only, permission is asked only when reminders are turned on, nothing is scheduled
  without a program, and ending the reset cancels them (`src/lib/reminders.ts`, `ReminderSync.tsx`).
- **Photos:** add-only permission, requested only when saving the 66-Day Story (`photosPermission: false`,
  `savePhotosPermission` in `app.json`); the story image contains no habit names
  (`src/core/reset/story.ts`, `StoryKeepsake.tsx`).
- **Developer tools are excluded from release builds:** the time-travel clock needs `__DEV__` and the development
  channel (`src/lib/flags.ts` `devTools()`, `PilotToday.tsx`), and `devDayOffset` is only applied when they're on.
  The temporary haptic test screen and native diagnostic module were removed (`6c69f2b`).
- **Logging:** the only `console` call is `console.warn` behind `__DEV__` in `src/lib/haptics.ts`, with no
  personal data.
- **Loading saved data:** every field is validated on load (`sanitizePilotProgram`, `sanitizeReflections`,
  `sanitizeCollection`, `sanitizeReminders`); malformed values are dropped rather than trusted. There is no import
  feature, so tampered files can't be brought in. (See H1 for the over-strict case.)
- **Save reliability:** writes are coalesced, flushed when the app goes to the background, kept and retried
  automatically after a failure (`src/store/storage.ts`), and the program is confirmed on disk before Day 1 is
  offered. Interrupted writes rely on AsyncStorage's own file handling (Needs iPhone verification under force-quit).
- **Age 16+:** set-up refuses under-16s (`setupProblems` returns only "Schwung is made for people 16 and older.").
  Set the App Store age rating to match.
- **Health precautions** exclude unsafe habits and intensities (`habitExclusion`, `intensityOptions`), and Strength
  shows clinician notes. Only the answers the chosen habits need are kept (`keptAnswers`); precautions are kept
  because they decide what can be added later.
- **Encryption export compliance:** `ITSAppUsesNonExemptEncryption: false` is correct (no custom cryptography).
- **Secrets:** none in the repository; `eas.json` sets only `EXPO_PUBLIC_SCHWUNG_CHANNEL`.

---

## Suggested order

1. **H2** (identity, policy, contact) and **H1** (no silent loss on a damaged save).
2. **M1** (remove the push entitlement) and **M2** (privacy manifest), verified on an EAS build.
3. **M4** and **L2** (export disclosure, cleanup on delete), then **M3** before any save-format change.
4. **L1**, **L4** as routine housekeeping.
