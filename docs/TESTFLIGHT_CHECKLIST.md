# TestFlight checklist

What's left before Schwung can be tested through TestFlight, and what to check on a real iPhone. Nothing here has
been uploaded or submitted.

## 1. Blocked on founder decisions

- [ ] **Everything in `release.config.json`** (the one place for the publisher's identity; the app may be renamed):
      app name, **permanent bundle ID** (it can't change after the first upload), Android package, support email,
      privacy policy URL, support URL and the three tip product IDs. Until they're real, production builds hide the
      Contact, Privacy Policy and Support rows (`src/lib/legal.ts`).
- [ ] `npm run release:check` passes (it lists everything still missing).
- [ ] Legal drafts finalised (`docs/legal/LEGAL_REVIEW_CHECKLIST.md`).

## 2. Needs Apple Developer / App Store Connect access

- [ ] Apple Developer Program membership; the App ID for the final bundle ID, with **no** Push Notifications
      capability.
- [ ] An Expo account: `bunx eas-cli login` (or `npx eas-cli@latest`), then `eas init` (adds
      `extra.eas.projectId`).
- [ ] The app record in App Store Connect (name, primary language, SKU).
- [ ] App Privacy (because tips use RevenueCat): **Purchases → Purchase History** is collected, **not linked** to the
      user (anonymous RevenueCat ID, no account), **not used for tracking**, purpose **App Functionality**. Nothing
      else: no identifiers, contact info, health data, usage data or diagnostics are collected (the app sets no app
      user ID, attribution IDs or device identifiers, and RevenueCat diagnostics are off). Check it against Xcode's
      privacy report for the archive (Organizer → Generate Privacy Report), which includes RevenueCat's own
      manifest (it declares Purchase History, not linked, App Functionality). Age rating
      questionnaire: answer for the app's content; the app itself is for people **18 and older** (self-declared at
      set-up). Export compliance is already set (`ITSAppUsesNonExemptEncryption: false`).
- [ ] **Age rating:** after the questionnaire, set the rating to **18+** if App Store Connect offers a higher rating,
      so parental controls match the app's 18+ rule (`FINAL_LEGAL_READINESS.md` H5).
- [ ] **EU Digital Services Act trader status** (Business → Compliance): needed to distribute in the EU; as a trader
      your address, phone and email are shown on the EU product page (`FINAL_LEGAL_READINESS.md` C4).
- [ ] **Licence agreement:** leave App Store Connect's License Agreement as **Apple's standard EULA** for v1.0 (our own
      Terms stay hidden until reviewed: `LEGAL_READY.terms = false`).
- [ ] **Paid Apps Agreement active** (Business: bank account, tax forms, contacts). Tip products can't load, even in
      TestFlight, until it is.
- [ ] **RevenueCat** (dashboard: app.revenuecat.com): the project, the App Store app, its In-App Purchase key, the
      three products, the `tips` offering with packages `tip_small`, `tip_medium`, `tip_large`, and the public Apple
      SDK key in `release.config.json` → `revenueCat.appleApiKey`. No entitlements, no paywall.
- [ ] **Three consumable In-App Purchases** with the IDs in `release.config.json`: reference name, price, display name
      and description (localized), and a review screenshot each. Submit them **with the app version** (Apple reviews
      the first purchases together with a version). Review note: “Optional tips; consumable; unlock nothing.”
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
- [ ] Info.plist: only `NSPhotoLibraryAddUsageDescription` (naming the app from `release.config.json`); no background
      modes; ATS without arbitrary loads.
- [ ] No developer tools (no time-travel clock on the Habits tab).
- [ ] No network traffic while using the app, except Apple and RevenueCat (`api.revenuecat.com`) after Support is
      opened, or at launch while a tip is unfinished (optional: check with a proxy). With no unfinished tip and
      Support never opened: no traffic at all.

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

**Crash screen**

- [ ] (Development build) make a screen throw while drawing: the “Something went wrong” screen appears in the app's
      language, Try again redraws, and after a force-quit every habit, day and setting is unchanged.

**Support (tips)** (TestFlight purchases are free; also test with a Sandbox Apple Account in Settings → App Store)

- [ ] Settings → About → Support: the three tips show prices in your region's currency; the screen reads well in
      Arabic (right to left), at the largest Dynamic Type size and with VoiceOver.
- [ ] Each tip: Apple's sheet, then “Thank you”; the same tip again works (repeatable). Nothing else in the app
      changes (habits, XP, collection, Insights). Each tip appears once in RevenueCat's dashboard (sandbox data).
- [ ] Cancel on Apple's sheet: nothing is shown, tips can be chosen again.
- [ ] Ask to Buy (a child Sandbox account): “Waiting for approval”; approve it later with the app closed; reopen: no
      error, no second charge (the purchase is finished quietly).
- [ ] Airplane mode: “Tips aren't available right now” with Try again; back online, Try again loads them.
- [ ] Airplane mode switched on right after paying (before the thank-you): “couldn't be confirmed just now”; back
      online, relaunch: the tip is confirmed in RevenueCat's dashboard once, with no second charge.
- [ ] Screen Time → Content & Privacy → iTunes & App Store Purchases → Don't Allow: “Purchases are turned off”.
- [ ] Force-quit while Apple's sheet is open or right after paying; reopen: no error; the purchase doesn't come back
      on later launches.
- [ ] Export my data after a tip: the file has nothing about tips. Delete my data and Restore are unaffected.
- [ ] No tip prompt appears anywhere else in the app.
