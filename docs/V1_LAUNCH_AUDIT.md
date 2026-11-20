# Schwung v1.0 launch audit

Audited: `43114a9` (`main` = `development`), 2026-11-20. Launch mode: feature freeze except the tip jar and
launch-critical fixes. No app code changed in this audit.

**Launch decisions (from the owner):**
- All 20 languages ship.
- Minimum Effort stays off.
- No accounts, ads, subscriptions, paywalls or analytics.
- One addition: a voluntary tip jar using Apple In-App Purchase.
- The publisher is in Türkiye.

**State of the build**

| Check | Result |
| --- | --- |
| Tests | 767 pass, 14 skipped |
| `tsc` | OK |
| Lint | 1 old warning (`no-redeclare`) |
| Translation check | Passed |
| `MINIMUM_EFFORT_LAUNCHED` | `false` (`src/lib/flags.ts:37`) |

**Confirmed in code:**
- **Network:** the app makes no network requests.
- **Notifications:**
  - Reminders are local only, with no push entitlement.
  - Permission is asked only when reminders are turned on.
  - Reminders are cancelled by Delete my data.
  - Syncs run one at a time through a queue, so they can't create duplicates.
- **Saving:** writes are batched and flushed when the app leaves the foreground. Restore and New Ascent replace the saves in one write and read it back (`commitTogether`).
- **Restore:** the backup file is treated as untrusted. It's capped at 5 MB, validated strictly, and the old state is copied to recovery slots before it's replaced.
- **Privacy and network policy:**
  - The privacy manifest declares no tracking and no collected data.
  - App Transport Security is on, with no arbitrary loads.
  - The only permission is add-only access to Photos.

---

## 1. Launch blockers vs. v1.1

### P0: must be done before submission

**Code and config: next pass (me)**

| # | Issue | Evidence | Fix |
| --- | --- | --- | --- |
| B1 | **The app has no crash screen.** A render error in any screen ends in a crashed or blank app, and there's no recovery path short of reinstalling. | `ErrorBoundary`/`componentDidCatch` appear nowhere in `src/` | Export an Expo Router `ErrorBoundary` from `src/app/_layout.tsx`. It shows a calm "Something went wrong" screen with "Try again", in the user's language. It never touches saved data, and logs only under `__DEV__`. |
| B2 | **Tip jar.** | Owner decision | Section 2 below. |
| B3 | **The privacy text will be incomplete once tips exist.** The policy and the in-app privacy screen describe on-device processing only and never mention payments, but a purchase talks to Apple. | `docs/legal/PRIVACY_POLICY.md` §2/§4; the in-app privacy text (`settings` catalog, `src/app/privacy.tsx`) | Add a "Tips" paragraph: Apple processes payments; Schwung receives no payment or identity details and keeps no purchase record. Mirror it in the in-app privacy screen and update the network claim in the checklist. The App Privacy answer can stay **Data Not Collected**; confirm against Apple's App Privacy guidance at submission. |
| B4 | **The release guard would now fail or give false comfort.** | `src/lib/__tests__/appConfig.test.ts` | Allow exactly the IAP config plugin and capability. Still refuse push, extra permissions and arbitrary loads. |
| B5 | **The TestFlight checklist says the app is for 16+.** The app's minimum age is 18. | `docs/TESTFLIGHT_CHECKLIST.md:21` | Correct the wording. Add the tip-jar device checks (§4). |

**Owner inputs: until they arrive, the build can't be submitted**

| # | Missing | Where it goes | Why it blocks |
| --- | --- | --- | --- |
| B6 | Permanent **bundle ID** (it's still `com.example.schwung`) | `app.json` | It can't change after the first upload. The tip product IDs are built from it. |
| B7 | **Privacy policy URL** (still a placeholder) | `src/lib/constants.ts` `PRIVACY_URL` | Apple requires a privacy policy link both in the App Store listing and inside the app (guideline 5.1.1). Production builds hide the link while it's a placeholder. |
| B8 | **Support email** and a **Support URL** | `CONTACT_EMAIL`; App Store Connect | App Store Connect requires a Support URL with a way to reach you. |
| B9 | Final **privacy policy**: 20 `TODO`s in `docs/legal/`, and the legal checklist items (operator, address, KVKK/GDPR position on health answers) | `docs/legal/LEGAL_REVIEW_CHECKLIST.md` | The policy has to be published before the URL in B7 can exist. |
| B10 | **Terms:** our draft isn't final (`LEGAL_READY.terms = false`). Recommendation: launch with **Apple's standard licence agreement (EULA)** and keep our Terms hidden until a lawyer approves them. | `src/core/legal.ts` | You need to decide. With Apple's licence agreement this stops being a blocker. |
| B11 | Apple Developer Program enrolment, an **active Paid Apps Agreement** (bank and tax info), and an Expo account (`eas init`) | Section 3 | Tip products can't load, even in testing, until the Paid Apps Agreement is active. |
| B12 | **iPhone checks in `docs/TESTFLIGHT_CHECKLIST.md` §3–4** on a signed build: saving, reminders, Photos, export and restore, VoiceOver, Dynamic Type, RTL, and now the tips | A device you hold | No signed build has run on an iPhone since the native dependency updates. These can't be checked in the cloud. |

**Fallback if the Paid Apps Agreement is slow (B11):** the tip section hides itself whenever its products can't load (section 2). So 1.0 could ship without tips and they can switch on in 1.0.1, with no other change. However, Apple requires the first IAP products to be submitted together with an app version.

### P1: should be done before launch; cheap, and doesn't block submission

- **Translations: no critical errors found.** I scanned all 20 catalogs:
  - **Structure:** every key is present in every language. Placeholders and plural forms match English (enforced by tests).
  - **Leftover English:** none, apart from the brand name and correct loanwords (FR "minute", ID "target").
  - **Scripts and lengths:** no string is in the wrong writing system, and none has a suspicious length.
  - **What remains:** 20,710 strings are still machine-made, awaiting review. 2,489 of them are health, safety, privacy or legal wording.
  - **Recommendation:** before launch, a native speaker reads only the **health precaution and safety strings**, in Turkish (you) and in the 2–3 biggest target markets. Everything else waits.
- **The Wellness note is English in every language** (by design, until legal sign-off). It's the safety note, so I recommend sending it through the normal translation workflow, marked machine-made, for v1.0. Your call.
- **Settle the App Store age rating** in Apple's questionnaire. The app's own minimum (18+, self-declared) is separate from the content rating.

### Can wait for v1.1

- **`npm audit`: 30 moderate findings, 0 high, 0 critical.** All are in build and test tooling: `glob`/`minimatch` (Expo CLI, config plugins, fingerprint), `node-forge` (Expo dev server), Jest, and typescript-eslint. None is in the app bundle. Take the next Expo SDK 58 patch. Don't use `npm audit fix --force`, which downgrades Expo.
- Human review of the remaining machine-made translations, and App Store listing text in 19 more languages (the listing can launch in English while the app itself is in all 20).
- Minimum Effort: stays off until its native and human checks are done (`MINIMUM_EFFORT_RELEASE_CHECKLIST.md` B/C).
- Our own Terms (if 1.0 uses Apple's licence agreement); the KVKK aydınlatma metni and VERBİS question, if your lawyer says they aren't needed at launch.
- Android: the package ID is a placeholder; 1.0 is iOS only.
- The lint warning; 11 plain `Pressable`s to recheck during the VoiceOver pass (214 elements already have labels or roles; Reduce Motion is respected in 40 files).

---

## 2. Tip jar: implementation plan

**What people see:**
- A **Support Schwung** row in Settings → About opens a short screen. It uses the existing Settings rows; no new visual language.
- The screen says: "Schwung has no ads, accounts or subscriptions. If it helps you, you can leave a tip. Tips are one-time and don't unlock anything."
- **Three tips** (small, medium, large), each priced by StoreKit in the person's currency and language. Prices are never hard-coded.
- After a tip: a calm thank-you with a light haptic. No badge, no reward, no XP, and nothing changes in the program.
- The app never asks for a tip: no prompts, no nudges, not in onboarding, not after milestones.

**Technical:**
- **Library:** `expo-iap` (StoreKit 2, Expo config plugin), pinned to an exact version at least two weeks old. It needs a development or EAS build; the app already uses those.
- **Products:** three **consumable** IAPs with IDs `<bundleID>.tip.small|medium|large` (the IDs depend on B6). Each needs a reference name, a price point, a display name and description in all 20 languages (I'll generate these through the i18n workflow for you to paste into App Store Connect), and a review screenshot.
- **Purchase flow:**
  - Connect and load the products when the screen opens.
  - `requestPurchase` → on a verified success, show the thanks, then `finishTransaction({ isConsumable: true })`.
  - One purchase at a time: rows are disabled while one is in progress.
- **Purchases that complete later:** at launch, a transaction listener in the root layout finishes any purchase completed outside the screen, so Apple doesn't keep re-delivering it. This covers Ask to Buy approvals, interrupted purchases and the app being closed mid-purchase. Those purchases are finished quietly, without a thank-you, because the person isn't on that screen.
- **Nothing is stored:** no purchase record or count, so the tips feature adds nothing to backups or the export. Delete my data and restore are unaffected.

**Restoration semantics:**
- StoreKit doesn't restore consumables, by design, and Apple requires a Restore button only for non-consumables and subscriptions. Since a tip unlocks nothing, there's nothing to restore.
- No Restore button. One FAQ line on the screen: "Tips are one-time thank-yous, so there's nothing to restore on a new phone."
- A reinstall or a new phone shows the same screen. No state depends on past tips.

**Failures:**

| Case | Behaviour |
| --- | --- |
| The person cancels | Nothing is shown, and the rows are enabled again. |
| Pending (Ask to Buy, extra bank verification) | "Waiting for approval. You'll get no charge unless it's approved." When it completes, the launch listener finishes it. |
| Products fail to load (offline, store down, agreement not active) | Rows hidden; "Tips aren't available right now", with Try again. Never a broken button. |
| Payments restricted (Screen Time, `canMakePayments` false) | "Purchases are turned off on this iPhone." No buttons. |
| A network or store error during purchase | "The tip didn't go through. You haven't been charged." Retry is allowed. |
| Apple can't verify the transaction | No thank-you, a generic failure message, and the transaction is finished so it doesn't keep coming back. |

**Localization:**
- About 12 new strings go through the normal workflow (`i18n:tasks` → `apply` → `check`), marked machine-made. The payment wording is flagged as legal.
- Prices and currency come from StoreKit.
- The screen is checked in Arabic and Urdu (right-to-left) and at the largest Dynamic Type sizes.

**Privacy and config:**
- Add the In-App Purchase capability. The config guard (B4) still refuses push and any other permission.
- The privacy text changes described in B3.
- No identifiers are logged anywhere.

**Testing:**
- **Automated, with `expo-iap` mocked:**
  - every state above (loading, loaded, unavailable, restricted, success, cancel, pending, error, unverified);
  - a double tap never starts two purchases;
  - every success calls `finish` as consumable;
  - the launch listener finishes stray transactions;
  - a successful tip leaves every saved store, XP and feature flag byte-for-byte unchanged.
- **On the device (TestFlight, where purchases are free, plus a Sandbox Apple account):**
  - each tip;
  - cancel;
  - Ask to Buy;
  - airplane mode;
  - Screen Time purchase restriction;
  - killing the app mid-purchase;
  - localized prices in a non-US region;
  - VoiceOver;
  - Dynamic Type;
  - Arabic.
- **Review notes for Apple:** "Optional tips, consumable, unlock nothing (guideline 3.1.1)."

---

## 3. What you must supply

I haven't invented any of this. Items marked *(advisor)* need confirmation from a Turkish accountant (mali müşavir) or a lawyer before you answer.

**Identity and enrolment**
1. **Enrol in the Apple Developer Program** as an **individual** or as an **organization**:
   - **Individual:** your legal name is shown as the seller.
   - **Organization:** needs a legal entity, a D-U-N-S number and a website.
2. **Exact legal name** (individual or company), **postal address**, **phone** and **email**.
3. **Developer and seller name** as it should appear on the App Store.
4. Whether you are a **"trader" under the EU Digital Services Act**. Apple asks this for distribution in the EU. Traders must publish an address, phone and email on the App Store, and tips are income *(advisor)*.

**Paid Apps Agreement (required for tips)**

5. **Bank account:**
   - bank name;
   - account holder name, matching the legal name exactly;
   - IBAN;
   - SWIFT/BIC;
   - account currency.

   Accept the agreement in App Store Connect → Business.
6. **US tax form** in App Store Connect:
   - W-8BEN for an individual, W-8BEN-E for a company;
   - your Turkish tax ID (TCKN or VKN);
   - whether to claim benefits under the US–Türkiye tax treaty *(advisor)*.
7. **Türkiye tax position** *(advisor)*:
   - whether you use the mobile-app developer exemption in **Gelir Vergisi Kanunu Art. 20/B** (it needs a dedicated bank account at a Turkish bank, with withholding by the bank), or register as a business (şahıs şirketi or a company);
   - how App Store income is reported;
   - how Apple's handling of Turkish VAT and digital service tax shows in your proceeds.
8. **Contacts** for Apple's roles (senior management, finance, technical, legal, marketing); one person can fill all of them.

**App and listing**

9. **Bundle ID.**
10. **Three tip price points.**
11. **App name** (up to 30 characters) and **subtitle** (up to 30); **primary language**; **category** (Health & Fitness suggested); **SKU**.
12. **Description**, **keywords** (100 characters) and **promotional text**.
13. **Support URL**, **privacy policy URL** (both hosted publicly; a simple static page is enough), and an optional marketing URL.
14. **Support email** (also in the app).
15. **Copyright line** (e.g. "2026 <legal name>").
16. **Age rating** questionnaire answers.
17. **Countries and regions** to sell in.
18. **Price:** free.
19. **App Privacy:** Data Not Collected.
20. **Content rights declaration:** confirm you own or license all art, including any AI-assisted images, and the credits for open-source code.
21. **Screenshots:** iPhone 6.9″ is required; I can produce them from the web build for you to approve.
22. **App Review contact** (name, phone, email) and review notes.
23. **Privacy policy operator details** (`docs/legal/PRIVACY_POLICY.md` TODOs):
   - operator;
   - address;
   - privacy contact;
   - effective date;
   - whether you'll read Apple's crash reports;
   - your EU/UK representative position *(advisor)*;
   - KVKK aydınlatma metni and VERBİS *(advisor)*.
24. **Terms:** Apple's standard licence agreement (recommended for 1.0), or our Terms once approved by a lawyer.

---

## 4. Security and regression tests

**To add in the next pass (automated):**
1. **Crash screen:**
   - a screen that throws shows the recovery screen;
   - "Try again" re-renders;
   - the saves are byte-identical before and after.
2. **Tip jar:** the state-machine tests in section 2, plus a guard that a tip changes no persisted key, XP, flag or feature.
3. **No network code:** a static guard that `src/` has no `fetch`, `XMLHttpRequest`, `WebSocket` or analytics or crash-reporting SDK imports. StoreKit stays the only connection outside the phone.
4. **Config guard (extended):**
   - exactly the IAP capability;
   - no `aps-environment`, background modes or extra usage descriptions;
   - remote push still off;
   - developer tools need `__DEV__` and the development channel;
   - `MINIMUM_EFFORT_LAUNCHED` false.
5. **`npm run release:check`.** Not part of `npm test`, so development isn't blocked. It fails when any of these is still a placeholder:
   - the bundle ID;
   - `CONTACT_EMAIL`;
   - `PRIVACY_URL`;
   - the tip product IDs;
   - the Expo `projectId`.

   It runs before every production build.
6. **Restore fuzzing:** many random corruptions of a valid backup (types, dates, huge arrays, prototype keys, truncation). Every one is refused calmly, or restored whole; never a partial save, never an exception.
7. **Translations:** turn the audit scan into a test: every language has every key, uses its own writing system, and has no untranslated English beyond an allowlist.

**Run before upload:** full `jest`, `tsc`, lint, `i18n:check`, `AUDIT=1` simulations, `npm audit --omit=dev` (must show no high or critical findings), and `npm run release:check`.

**On the device (TestFlight):** everything in `docs/TESTFLIGHT_CHECKLIST.md` §3–4 plus the tip-jar matrix in section 2. Optionally, check with a proxy that the only traffic goes to Apple's StoreKit hosts.
