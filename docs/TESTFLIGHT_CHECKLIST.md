# TestFlight checklist

What's left before Schwung can be tested through TestFlight, and what to check on a real iPhone. Nothing here has
been uploaded or submitted.

## 1. Blocked on founder decisions

- [ ] **Permanent bundle ID** (`app.json` → `ios.bundleIdentifier`, `android.package`; still `com.example.schwung`).
      It can't change after the first upload. The internal build becomes `<id>.internal` automatically.
- [ ] **Support email and privacy policy URL** (`src/lib/constants.ts`). Until they're real, production builds hide
      the Contact and Privacy Policy rows (`src/lib/legal.ts`).
- [ ] Legal drafts finalised (`docs/legal/LEGAL_REVIEW_CHECKLIST.md`).

## 2. Needs Apple Developer / App Store Connect access

- [ ] Apple Developer Program membership; the App ID for the final bundle ID, with **no** Push Notifications
      capability.
- [ ] An Expo account: `bunx eas-cli login` (or `npx eas-cli@latest`), then `eas init` (adds
      `extra.eas.projectId`).
- [ ] The app record in App Store Connect (name, primary language, SKU).
- [ ] App Privacy: **Data Not Collected**; age rating questionnaire (the app is for 16+); export compliance is
      already set (`ITSAppUsesNonExemptEncryption: false`).
- [ ] TestFlight testers (internal first; external testing needs Beta App Review).

## 3. Signed production build

- `eas build --platform ios --profile production` (EAS creates the certificate and provisioning profile).
- Build numbers come from EAS (`appVersionSource: remote`, `autoIncrement`), so each upload gets a new one;
  bump `version` in `app.json` for a new release.
- `eas submit --platform ios` uploads it to App Store Connect (only when you decide to).

Check in the build (or the upload's validation report):

- [ ] Entitlements: no `aps-environment`.
- [ ] `PrivacyInfo.xcprivacy` in the `.app`: no tracking, no collected data, merged API reasons; no missing-reason
      warning on upload.
- [ ] Info.plist: only `NSPhotoLibraryAddUsageDescription`; no background modes; ATS without arbitrary loads.
- [ ] No developer tools (no time-travel clock on the Habits tab).
- [ ] No network traffic while using the app (optional: check with a proxy).

## 4. On an actual iPhone

**Progress is never lost**

- [ ] Tick and untick habits quickly, then swipe the app away from the app switcher at once: reopen, the last state
      is there.
- [ ] Tick a habit and lock the phone straight away; reopen: it's kept.
- [ ] Add a habit, remove one, make one easier/harder; force-quit and reopen: all kept.
- [ ] Force-quit during set-up: it starts set-up again cleanly; no half-made program.
- [ ] Force-quit during the Day 1 ceremony: reopening shows the program (the ceremony may show again, by design).
- [ ] Install the previous TestFlight build, make progress, install the new one over it: progress kept.
- [ ] Delete my data: back to the start screen; reminders gone; reopen: still empty.

**Speed and memory**

- [ ] First launch and relaunch: the world and habit art appear without a visible wait.
- [ ] Revisiting tabs, the collection and the 66-Day Story: art is there at once.
- [ ] Theme switch: crossfade without a flash; the choice survives a force-quit.
- [ ] Swiping between tabs and habit cards stays smooth (ideally on an older iPhone too).
- [ ] Xcode → Debug Navigator → Memory after visiting every screen: note the figure; it should level off (the image cache is capped at 320 MB), not keep climbing.

**Native features**

- [ ] Reminders: turning them on asks permission once; one arrives at the set time with the app closed; with
      "show habit names" off, no habit names on the lock screen; turning them off cancels them.
- [ ] Denying notification permission: the app explains and links to Settings.
- [ ] 66-Day Story: save to Photos (asks for add-only access; the painting is in the saved image); denying Photos
      shows a calm message; sharing opens the share sheet.
- [ ] Export my data: the share sheet opens with a JSON file; cancelling leaves no files behind after the next launch.
- [ ] Restore from backup (Settings → Privacy & Data, and the start screen): the Files picker opens; a non-Schwung
      file is refused calmly; a real export shows its day, habits, days done, XP and dates; restoring over a
      running Life Reset warns first; after restoring, force-quit and reopen: the restored program, XP, collection,
      theme and reminders are all there.
- [ ] Locked collectibles look like soft silhouettes; the unlock moment shows the full art.

**Beyond the summit** (use a development build's day clock, or a test program started 66 days ago)

- [ ] Day 66 complete: summit ceremony → 66-Day Story → "What's next?"; skipping the story goes straight to it.
- [ ] Decide later: a small card on Habits; habits rest; no reminders arrive; streak isn't broken.
- [ ] Keep My Momentum: Day 67+ can be ticked; XP and streak go on; Journey shows "Since the summit"; Insights
      shows "Lately"; reminders return.
- [ ] Begin a New Ascent: age and health must be confirmed; habits pre-selected at their levels; Day 1 ceremony
      reads "Ascent 2"; lifetime XP and collection kept; Journey → Past journeys opens the old story.
- [ ] Force-quit right after tapping Begin: reopening shows either the old Life Reset or Ascent 2 with the archive.
- [ ] Export, Delete my data, then Restore: the current ascent and past journeys all come back.

## 5. Known limits (not blockers)

- A tick made in the last quarter-second before the app is killed by a crash (not by leaving the app) can be lost;
  leaving the app always saves first.
- Leaving the app starts the save at once; iOS normally allows the few milliseconds it takes. A write that fails is
  retried while the app runs, but not after iOS has ended the app.
