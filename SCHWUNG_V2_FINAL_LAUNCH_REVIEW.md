# Schwung — Final Product QA & Launch Readiness

Baseline `871660c` (305 tests). Scope was frozen: no new habits, routines, mechanics or major UI.

## 1. Overall assessment
**Verdict: GO for wider internal testing. NO-GO for public release** (reasons in §8).

The app that would ship (V1; V2 is development-only and off) works end to end in a production build:
- onboarding, the plan, Day 1, check and uncheck, habit detail and swap, Settings, reload
- the Day 66 finale and maintenance mode after the program
- the comeback after missed days

Phase level-ups, step-downs, XP, streaks and the 80% rule held across three full 66-day scenarios. Six issues were found and fixed, two of them significant. Nothing found needs a product decision to fix.

The remaining blockers are launch logistics (placeholder identifiers, privacy URL, store setup) and the fact that nothing has run on a real iPhone yet.

## 2. Environments tested
| Environment | What ran |
|---|---|
| **Production web export** (`expo export --platform web`, served statically), Chromium | V1 journey from a fresh install; saved-progress scenarios: Day 66, Day 70, the Day 34 comeback. Developer routes and flags probed. Light and dark, 375×667 and 390×844. |
| **Production iOS bundle** (`expo export --platform ios`, Hermes `.hbc`) | Builds; developer strings absent. **Not run on a device.** |
| **Development web build** (V2 preview on via env), Chromium | All 8 reference profiles through V2 onboarding at 375×667 and 390×844, light and dark (32 runs, 0 errors); V2 progression (Day 7 offer, 22, step-down, swap, removal, 45, flag toggle, reload); Exercise Preview (light and dark); 18 damaged-save cases. |
| **Jest** (314 tests) | Full suite in `Europe/Berlin` (the program crosses the 25 Oct DST change on day 2), `America/New_York`, `Pacific/Auckland`, `Asia/Kolkata` and `UTC`: all pass. |
| **Not tested** | iPhone, Android, Expo Go, TestFlight, VoiceOver, Dynamic Type, native time picker, notifications, haptics, share sheet. Browser emulation is not native testing. |

## 3. Issues found and fixed
| # | Severity | Issue | Fix | Verified |
|---|---|---|---|---|
| 1 | **High** (unlikely, but permanent) | A damaged save (e.g. `plan: null`, a log without its `completed` list, a malformed start date, `notices: null`) blanked the app on **every** launch, with no way to reach Settings → Restart. 9 of 18 damaged shapes crashed. | `sanitize` now repairs shapes field by field: wrong types fall back to defaults; logs, days and plan entries are repaired from what remains; a lost start date is recovered from the logged days; a lost phase is set to what the logs reached, so no level-up repeats. No valid day, XP or habit is dropped. | 18/18 cases open on Today in the browser; 2 regression tests (fail on the old code) |
| 2 | **Medium** | Development and release builds share a bundle ID. A tester who added the synthetic "Test session (dev)" habit, then installed a release build, would keep that habit in production. A tampered save could do the same with an exercise prototype. | Release builds drop `devsched_*` and exercise-prototype habits from the plan when loading. Past days and XP are kept. | Regression test |
| 3 | Low (accessibility) | Habit rows didn't announce their level, and the edit/swap/remove menu was reachable only by long-press. | The label ends "Level n of 3"; VoiceOver and TalkBack get a "longpress" action and an "Edit, swap or remove" action. | Labels checked in the production build; the actions need a device |
| 4 | Low (copy) | A target identical to its title was shown twice (V2 "Make your bed / Make your bed"). | The duplicate line is hidden. | Browser |
| 5 | Low (touch target) | The "Journey" pill's hit area was 43 pt. | `hitSlop` raised from 6 to 8 (47 pt). Every other control measured ≥ 44 pt with its `hitSlop`. | Browser measurement |
| 6 | Low (config) | Android inherited unused storage and overlay permissions. | `android.blockedPermissions`: READ/WRITE_EXTERNAL_STORAGE and SYSTEM_ALERT_WINDOW. Exports use the app's private cache. | Introspected manifest shows `tools:node="remove"`; **no Android build made** |

There are no changes to progression, habits, the design or V1 behavior.

## 4. 66-day findings (`src/store/__tests__/longprogram.test.ts`, plus the browser)
These are driven day by day through the store, the way the app runs them (it reconciles on open, then toggles).
- **A · consistent (V1 and V2):**
  - Levels are Easy until Day 21, Medium on Day 22 and Hard on Day 45.
  - XP is exactly 66 × (10 × habits + 20), and undo/redo never pays twice.
  - Current and best streak are 66, with 66 days completed.
  - No step-downs; the finale is due on Day 66.
  - Days 67–71: no new phases or ceremonies; the plan doesn't change; the finale stats stay at 66.
- **B · inconsistent (V1):**
  - 4 of 5 habits counts a day, 3 of 5 doesn't, and an unfinished today never breaks a streak.
  - Being away at Easy causes no step-down.
  - Missing 3 days at Medium gives exactly one step-down and one message, even when the app is opened twice.
  - A day that can still be fixed before noon isn't counted as a miss.
  - Phase 3 lifts Easy to Medium, never straight to Hard.
  - A 15-day absence costs at most one level.
  - A missed Day 66 still gets its finale on the next open.
- **C · changes (V2):**
  - A scheduled habit was added (Day 5), a habit swapped (Day 10), the schedule changed (Day 20) and a habit removed (Day 30).
  - Every day was full under the plan of that day.
  - Past days keep what was planned then, and the removed habit keeps its earlier days and XP.
  - The scheduled habit was due Mon/Wed until Day 19 and Tue/Thu from Day 20, and it stays at Easy.
  - Frozen names were kept.
- **End-of-program screens (production build):**
  - Day 66 → "You did it": days, streak, max-level habits and a share card.
  - "What's next" → "Season 2 · Coming soon" → Day 70 shows "Summit reached · Maintenance · Keep it going".
- **Recommendation:** no new post-program system. The existing maintenance mode is enough. The only open point is copy: "Season 2 · Coming soon. New programs are on the way" makes a promise, so keep it only if a second program is really planned. Otherwise the simplest change is to drop that screen's promise (owner's call).

## 5. Accessibility and native limitations
**Verified in source or the browser:**
- labels on all icon buttons, habit rows (now including the level), the mission card and the trail
- `maxFontSizeMultiplier` caps on dense text
- touch targets ≥ 44 pt with `hitSlop`
- safe-area insets on every screen
- light and dark render correctly at both sizes
- no network code: the app works offline

**Needs an iPhone (manual checklist):**
1. **Time pickers:** the reminder; V2 wake/bed times, including a bedtime after midnight (00:30) and night shifts.
2. **Notifications:**
   - the permission prompt and the "Open Settings" path after a denial
   - a reminder fires at the set time and is skipped on a fully done day
   - Day 1/7/22/45/66 copy appears on those days
3. **Backgrounding:** check off, swipe the app away immediately, reopen: the check-off is still there (writes flush when the app backgrounds). Crossing midnight with the app open moves to the next day.
4. **VoiceOver:** every Today element is read in order; a habit row reads "title. target. Level n of 3"; the Actions rotor offers "Edit, swap or remove"; ceremonies can be dismissed.
5. **Dynamic Type:** at the largest accessibility size, Today, the plan, onboarding and Settings stay usable. Long titles are truncated to one line by design; check they stay readable.
6. **Native dialogs** (no-ops on web): Restart confirmation, removing a habit below the minimum, export failure.
7. **Share:** the finale share card (view-shot) and Export my data (share sheet).
8. **Haptics, light/dark switching while open, small (SE) and large (Pro Max) screens, airplane mode.**

## 6. Data integrity
| Check | Result |
|---|---|
| V1 never becomes V2 | Verified (tests; the production build ignores a save with `devV2Preview: true`) |
| V2 frozen names and targets kept; new programs use current definitions | Verified (tests; scenario C) |
| Time zones and DST | Verified (5 zones; day math uses calendar keys only) |
| Past scheduled sessions survive edits | Verified (scenario C, schedule history) |
| Streaks, XP and the 80% rule; no duplicate XP; no accidental level-ups or step-downs | Verified (scenarios A, B, C; XP is always derived from logs, never stored) |
| Damaged and older saves | **Fixed** (issue 1); version-0 and version-1 saves load as V1 |
| Restart and deletion | Restart clears the program and keeps the reminder and theme (existing tests) |
| No PII leaves the device | Verified in source: no network calls, analytics or push tokens; local notifications only; export only through the user's own share sheet |

## 7. Production configuration
| Item | Status |
|---|---|
| V2 disabled (`__DEV__ &&` flag) | **Verified in a production build:** V2 routes redirect, the V1 quiz is shown, and a tampered save can't enable it |
| Developer routes and controls inaccessible | **Verified in a production build:** `/dev/exercise` redirects; Settings has no Developer section; no dev strings in the web or iOS bundles |
| No synthetic or prototype habits in production | Verified in source plus tests (issue 2) |
| Exercise prototypes contained | Verified: not in V1's library, a V1 swap refuses them, a V2 swap refuses them, the preview gate is used only by the dev screen, and release saves drop them. Labelled provisional; **no clinical approval exists** |
| Permissions | iOS: notifications only, requested at runtime, no usage strings needed. Android: unused permissions blocked (introspected, **not built**) |
| Privacy claims ("No account. No tracking. Everything stays on this phone.") | Match the code |
| Debug leakage | No app logging; 4 `console.log` calls belong to libraries (Expo Router's error path, Reanimated) |
| Identifiers and links | **Not ready:** `com.example.schwung`, `hello@example.com`, `example.github.io/.../privacy` |
| Store metadata, screenshots, age rating, App Privacy answers, `eas.json` | **Not present in the repo; not yet verified** |
| Actual native production build (EAS or Xcode) | **Not yet verified** |

## 8. Public-release blockers
1. Replace the placeholder bundle ID/package, support email and privacy-policy URL. Publish the privacy policy (Settings links to it).
2. Set up EAS (`eas.json`, signing) and make a real production iOS build.
3. Run the §5 checklist on at least one small and one large iPhone with that build.
4. App Store listing: screenshots, description, age rating and App Privacy ("Data Not Collected").
5. **Owner decision:** the app is meant for 16+, but V1 (the version that ships) has no age question; only V2 does. Decide whether the store age rating is enough or V1 needs a gate. Adding one changes V1 behavior, so it needs approval.

V2 isn't a blocker: it isn't part of a public release and stays off.

## 9. Optional improvements (not blockers)
- V2 time targets show 24-hour times ("Up within 60 min of 07:00"); they could follow the device's locale.
- The Day 22 reminder says "Your habits leveled up", which isn't true for scheduled or exercise habits (V2, development only).
- The notification-denied alert says "iOS Settings", including on Android.
- There's no import for the data export, so a reinstall without an iCloud backup loses progress.
- The "Season 2 · Coming soon" promise (§4).
- Expo Go compatibility with SDK 57 is unconfirmed; the README assumes it.

## 10. Final state
- **Tests:** 314 passing (18 suites); `tsc --noEmit`, `expo lint` and `prettier --check` are clean.
- **Commit:** see the commit that adds this file on `main`; `development` is synced to it.
