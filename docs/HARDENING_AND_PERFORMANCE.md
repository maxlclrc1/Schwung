# Security hardening and performance pass (v1.0)

Starting point: `94ef74c` (RevenueCat tips) plus the two onboarding crash fixes (`4dcfc49`, `1269b88`). No features,
no design changes; all 20 languages, Minimum Effort off, RevenueCat and the privacy model unchanged.

## Security

### Checked, nothing to fix

| Area | Result |
| --- | --- |
| Git history (all 300+ commits, all branches) | No keys, tokens, certificates, `.p8`/`.p12`/`.pem`/`.env` files. The only key-like strings are made-up values in the tests (a fake public key, and a fake secret key the tests check is refused). **No credential needs rotation.** |
| RevenueCat key | `release.config.json` → `revenueCat.appleApiKey` is empty. Only a public `appl_…` key is accepted: the app ignores anything else (`lib/tips.ts isPublicAppleKey`), and `secrets.test.ts`, `appConfig.test.ts` and `npm run release:check` fail on an `sk_…` key or key files. |
| Production iOS bundle (`expo export`, production channel) | No `appl_`/`sk_` key, no private keys, no build-tool packages (`node-forge` etc.), no dev clock UI (`PilotClock` stripped). `localhost`/`http://` strings are framework defaults and SVG namespaces, never used by the app. |
| Logging | The app's own `console.*` calls run only in development (`__DEV__`); nothing about habits, health answers or purchases is logged in a release build. |
| Network | Unchanged: no fetch/XHR/WebSocket in app code (`noNetwork.test.ts`); RevenueCat only after Support opens or while a tip is unfinished. |
| User text (habit names, notes) | Rendered only as React Native text: no HTML, no WebView, no `eval`. Exports are JSON only (no CSV, so no spreadsheet-formula injection). |
| External links | Three, all fixed by the app: the privacy policy URL, `mailto:` the support address, the phone's Settings. |
| Backup restore | Size cap before reading, schema validation, 3,000-case corruption fuzz (`backupFuzz.test.ts`), dev day offset forced to 0. |
| Purchases | Thank-you only for a RevenueCat-recorded matching transaction; one purchase at a time; errors after a possible charge never say "failed" (unchanged from `94ef74c`). |
| Debug functionality | The development clock (`devDayOffset`) works only when `__DEV__` and the development channel; its setter clamps to 0 and saves drop it otherwise. |
| Permissions | iOS: only "add to Photos" (asked when saving the story). No tracking, no push entitlement, no background modes. |
| Dependencies (`npm audit --omit=dev`) | 9 moderate, 0 high/critical, all in Expo's command-line build tools (`glob`, `minimatch`, `node-forge` via `@expo/cli`), which run on the developer's machine and aren't in the app. Fixing needs an Expo SDK change; not a launch risk. |

### Fixed

1. **A link could write a reflection answer.** Expo Router opens any screen from a `schwung://` link (from Safari, a
   message, another app). `schwung://life-reset/reflect?week=1&answer=harder` saved "harder" for week 1 without a tap,
   and any week, finished or not, could be opened. The app itself never passed an answer. Now the route takes no
   answer, the auto-save on open is gone, and only finished weeks open (as from the app). Test:
   `src/store/__tests__/reflectLink.test.ts` (fails on the old code).
2. **App Store build allowed plain HTTP to the local network** (`NSAllowsLocalNetworking`), needed only by
   development builds to reach Metro. The production channel now gets `NSAllowsArbitraryLoads: false` and nothing
   else (`app.config.ts`; test in `appConfig.test.ts`; confirmed with `expo config --type introspect`).

### Considered, not changed

- **Stronger file protection** (`NSFileProtectionComplete`): saves are written when the app goes to the background,
  which can be after the phone locks; with Complete protection those writes could fail and lose progress. The iOS
  default (protected until first unlock) stays.
- Any link still opens screens (as on every Expo Router app); no screen changes saved data on opening any more.

## Performance

### Theme switch (the ~2 s on iPhone)

**Measured** on the production web build (`--no-minify`, Chromium, 390 × 844, real Day 12 program with the clock
pinned, React commits counted via the DevTools hook; script in the session scratchpad, not shipped):

A switch already fades every animated colour and painting on the UI thread at once (220 ms; both versions of every
painting stay decoded, so nothing loads). What arrived late was React's re-render, which updates everything that
draws a colour from React: icons, the SVG drawings (Journey's map, card scenes), gradients. That render covered the
**whole app, including the two tabs not on screen**, and the root layout added an urgent re-render of the navigator
before it.

| Per switch | Before | After |
| --- | --- | --- |
| Urgent render when the switch shows | 29–220 components | 4 |
| Render behind the visible switch | 2,500 components | 990 (the visible page) |
| …lands after the tap, full CPU | 140–260 ms | 45–115 ms |
| …lands after the tap, CPU ×4 | 730–910 ms | 500–575 ms |
| Hidden tabs | in the same render | their own low-priority render right after (1,576 + 262), interruptible |

The render time scales with CPU (≈270 ms at ×1, ≈870 ms at ×4, ≈1.7 s at ×6 before), so it's real work; in Expo
Go (React in development mode) on a phone it plausibly reached the ~2 s reported.

Changes (no visual change):
- `components/PagerTabs.tsx` + `theme/pageScheme.ts`: the page on screen follows a switch in the theme's render; a
  hidden page catches up after that commit, in its own transition. A page swiped to shows the current theme at once,
  and a page swiped away from never goes back a theme (test: `theme/__tests__/pageScheme.test.ts`, which caught that
  case during this pass).
- `app/_layout.tsx`: the status bar and window colour live in a tiny `SystemChrome`; the navigator (`AppStack`)
  follows the theme in the same low-priority render as the screens, so a switch no longer re-renders it urgently.

### Other flows, measured, no change needed

| Flow | Measured (CPU ×1) | Verdict |
| --- | --- | --- |
| Habit completion (Today, Day 12) | one commit, 352 components | Journey/Insights legitimately change with the data |
| Tab switch | 345–983 components, commit ~25–45 ms after the router update, no long tasks | the page slide runs on the UI thread |
| Journey scroll (1,500 px) | ~6 components per frame, no long tasks | fine |
| Storage writes | debounced 250 ms, serialised lazily, flushed on background | fine (theme switch writes only the small preferences key) |

Startup was not re-measured in this pass: painting decode is already prefetched after hydration (`artPrefetch`), and
nothing measurable pointed there.

### Still requires a physical iPhone

- The theme switch's feel in a **release build** (TestFlight). Expo Go runs React in development mode, several times
  slower than a release build; judge speed on TestFlight, not Expo Go.
- First switch after launch (both paintings' first decode), and a switch while on Journey (the visible page is then
  the heavy one: ~1,576 components).
- Native view cost of the trait change (`Appearance.setColorScheme`) — not measurable on the web.
- All web numbers are relative (same machine, same build, before vs after), not phone timings.

## Visual QA

Quick matrix (20 languages × core screens × small/large-text): 440 cases. 10 cases flag text overflow (long
translated labels at large accessibility text or 320 pt). The same 10 appear on the build before this pass;
pre-existing, cosmetic, for v1.1.
