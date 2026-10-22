# Schwung — Project Handoff for ChatGPT

You're joining an in-progress project as a **creative and product partner**. The code is built and
maintained by another AI assistant (Claude) working directly in the repository. Your job is to help the
owner with direction, artwork, copy, and ideas, and to produce outputs the owner can bring back to Claude
to implement. Please read this whole document before suggesting anything.

---

## 1. What Schwung is

**Schwung** (German for "momentum") is a **completely free** iPhone app that runs a guided **66-day life
reset**. You answer a short quiz, get a personalized plan of 5–6 small daily habits, check them off every day,
and the habits level up across three phases.

- **Pitch:** "Get your momentum back. Free. No account. No paywall."
- **Philosophy:** changing your life shouldn't cost a thing. Progress over perfection. A missed day is a
  pause, not the end.
- **Repo:** https://github.com/maxlclrc1/Schwung (branch `main`)

### Non-negotiables (never propose otherwise)
- Free forever: **no paywalls, trials, premium tiers, habit limits, or accounts.**
- Offline and local-first. All data stays on the phone. No backend, no analytics, no AI-generated messages.
- No guilt, fake urgency, fabricated statistics, or unsupported predictions in any copy.
- No manipulative subscription-funnel patterns, even if competitors use them.
- "66" stays out of the **branding** (name, icon, welcome screen, share card). It's fine inside the program.
- Must keep working in **Expo Go** (no native modules beyond what Expo Go ships). No new dependencies
  without a strong reason and the owner's approval.

---

## 2. How the program works (the real rules, don't change them)

- **66 days in three phases:** Foundation (days 1–21), Momentum (22–44), Mastery (45–66). Day 67+ is
  "Maintenance": same checklist, no countdown.
- **Habit levels:** each habit has easy / medium / hard targets. Every habit steps up one level at day 22 and
  day 45.
- **Successful day:** at least **80%** of that day's habits checked. Streaks count successful days.
- **XP:** 10 per check-off, +20 bonus for a full day. Player level every 200 XP. XP is derived from logs.
- **Early level-up:** 7 days in a row on a habit → the app *offers* (doesn't force) a level-up.
- **Gentle step-down:** a habit left for 3 days in a row steps back one level (never below easy). One kind
  message, never a pile.
- **Yesterday** can still be edited until noon.
- **Ceremonies:** full-screen moments on Day 1, 7, 21, 44 and the Day 66 finale (finale plays at 80%).
  Ceremonies are **always dark**, whatever the app theme. The finale includes a shareable image card.
- **Comeback:** after one or more days with nothing checked, Today shows a calm "Welcome back" card with one
  small first step. It disappears once they check something. Nothing is erased or back-filled.

### The quiz and plan
- Quiz (6 questions, goal first): **goal** (more energy, better focus, more discipline, more confidence,
  less stress, get in shape), **sleep**, **screen time**, **exercise**, **water**, **read/meditate/journal**.
  5–6 options each.
- The plan is built deterministically on the phone (`src/core/plan.ts`): "Make your bed" is always first;
  each area where an answer shows room to improve gets one habit; the goal always gets at least one core habit;
  nothing the user already does is assigned; near-duplicates are avoided; every habit shows a one-line reason
  quoting the user's answer or naming their goal.
- **Habit library (19):** earlier bedtime, phone-free wind-down, consistent wake time, phone-free morning,
  screen cap, social-free mornings, daily walk, short workout, step count, water, reading, breathing/meditation,
  journaling, deep work, top 3 priorities, cold finish, make your bed, start a conversation, genuine compliment.
  Users can swap, edit, add custom habits, or remove them (min 3).

---

## 3. Screens and current flow

1. **Welcome:** mountain artwork with an empty trail and a glowing violet orb at the trailhead. "Get your
   momentum back." "Free. No account. No paywall." → "Start my reset".
2. **Quiz:** 6 screens, goal first, progress shown as trail markers.
3. **Starting point:** your goal, "most room to grow" (your hardest answer that the plan addresses), and
   "already working".
4. **Plan reveal:** the habits with reasons, "For your goal" tags, and "How it grows" (one real habit through
   the three phases).
5. **Reminder** (optional): one daily local notification at a chosen time.
6. **Day 1 ceremony**, then **Today**.
7. **Today:** greeting, **the Schwung Ascent** (an interactive mountain with a 66-marker trail; tap a day to see
   it), the daily mission card (progress, streak, level/XP), the comeback card when relevant, and the habit
   checklist.
8. **Journey** (66-day grid), **Habit detail**, **Swap**, **Add**, **Settings** (theme, reminder, export,
   restart).

---

## 4. Visual system today

- **Dark theme:** background #111116, surface #1C1B25, text #F5F3FF / #A5A3B5, lavender accent #A78BFA.
- **Light theme:** background #F7F6FB, surface #FFFFFF, text #191621 / #696575, deeper violet accent #7451C8.
- **Gold** (#F2B84B dark / #A76A00 light) is reserved for milestones and the summit, never everyday UI.
- Typography: system font (SF Pro), heavy weights for headlines.
- Theme: System / Light / Dark, with a smooth fade between them. Splash and ceremonies are always dark.
- Rule learned the hard way: never scale views that contain text or icons (they look pixelated on iOS).

### Current artwork (honest assessment)
- `assets/ascent-dark.jpg` / `ascent-light.jpg` (1500×1000) are **procedurally generated** placeholder
  mountains: flat, a visible shading seam, empty sky. They're the biggest visual quality gap.
- The app icon is a placeholder violet "S" on charcoal.
- Everything else (trail, markers, orb, rings, confetti, share card) is drawn in code.

---

## 5. Where we are now: Step 10A, visual identity ("The Quiet Ascent")

The owner wants a distinctive, premium, cinematic but calm identity. **Do not imitate** Life Reset's anime
characters or any other app's recognizable style (also avoid the flat orange layered-ridge "Firewatch" look).

### Art direction (proposed, awaiting owner sign-off)
- **One world, many vantage points:** the same mountain and trail seen from the trailhead (Welcome), the whole
  mountain (Today), the camps (Day 7 / 21 / 44), and the summit (Day 66).
- **Light follows progress:** blue hour (Day 1, Foundation), first light (Momentum), sunrise (Mastery, Day 66).
  Dark theme = pre-dawn; light theme = the same scene in soft morning haze.
- **Elevation follows phase:** valley mist, then above the tree line, then above the clouds.
- **Artwork palette:** night ink #0E0D14, indigo #1A1830, slate violet #2A2742, ridge haze #3B3858,
  mist #5A5678; day lilac haze #D9D6EA, periwinkle #C3C1DD, cloud #F4F3F9, faint warm horizon #EFE3D6.
- **Reserved colors:** the artwork itself contains **no violet hot spots** (violet glow = the user, drawn by
  the app on top). **Gold only at the summit sunrise** (faint on Today, full only on Day 66 and the share card).
- Soft atmospheric light, haze, deliberate negative space, fine film grain, faint topographic contour lines.
- **No people** by default (the violet orb is the user). Optional: a tiny ambiguous silhouette on the summit
  in the Day 66 image only.
- **Avoid:** anime, mascots, cartoon, stock fitness photos, RPG UI, neon, random 3D objects, lens flares.

### Asset list (priority order)
| ID | Asset | Specs |
|---|---|---|
| **A1** | **Ascent landscape** (Today) | 3:2, master 3000×2000, delivered 1800×1200 JPEG ≤250 KB, **dark + light**. Must match the existing trail geometry (a guide image will be provided): the main mountain's ridgeline, summit at about 70% across / 10% down, the switchback corridor kept calm and low-contrast so the app's markers sit on rock, quiet zones top-left (for "Day N") and where phase labels sit. |
| **A2** | **Trailhead** (Welcome, full-bleed) | Portrait 3:4, 1320×1760 JPEG ≤280 KB, dark + light. Key content in the top 60%; bottom 35% fades into the exact background color (#111116 / #F7F6FB) so text sits on flat color. A clear spot where the trail begins (the app draws the orb there). |
| **A7** | **App icon + splash mark** | 1024×1024. Concept: a peak whose switchback trail suggests an "S", with a small violet dot at the trailhead, on a dark ground. Must read at 60px. iOS dark/tinted variants if supported. |
| **A4** | **Summit at sunrise** (Day 66 finale + share card) | Dark. Tall master 1290×2796 containing a 4:5 safe area (share card is 1080×1350). The one scene flooded with gold. |
| **A3** | **Ceremony backdrops** Day 1 (trailhead at blue hour), Day 7 (first switchback, frost), Day 21 (base camp, violet-white lantern in mist), Day 44 (high camp above a sea of clouds, first warm hint at the horizon) | Dark, 1179×2556 JPEG ≤300 KB. Low-detail circle at ~35% height for the big number and rings; bottom 40% dark for text. |
| A5 | Topographic contour texture | Made in code by Claude; no help needed. |

Total budget for all new art: about 2 MB.

### Open decisions the owner still has to make
1. Who makes the art: AI image generation + retouching, an illustrator, or a mix.
2. Day 66 silhouette: yes or no (default no).
3. Gold on ceremonies: none on Day 1/7, small accent on 21/44, full on 66?
4. Phase lighting on Today: code-drawn tints first, or separate images per phase.
5. Share card shows the user's own trail on the summit art (recommended: yes).

---

## 6. How you can help most

1. **Image-generation prompts** for A1–A4 (and icon concepts for A7) that follow the art direction above.
   Keep prompts free of artist names and other apps' names. Give a base style prompt plus per-asset variations
   so every image looks like the same world. Include negative prompts (anime, cartoon, neon, people, text,
   logos, lens flare, saturated orange).
2. **Style frames / critique:** when the owner shows you generated images, judge them against this guide:
   palette, no violet hot spots, gold only at the summit, calm zones where UI sits, both themes matching.
3. **Copy:** App Store description, subtitle, keywords, screenshot captions, and in-app microcopy. Calm,
   warm, specific, no hype, no guilt, no fake numbers, no promises the app can't keep.
4. **Product thinking** for later versions (see section 8), always within the non-negotiables.

### How to hand work back
The owner relays your output to Claude, who implements it. So please deliver:
- final copy as exact strings, marked with where it goes;
- art specs as sizes, aspect ratios, safe areas, and file budgets (as above);
- images as files the owner can drop in (Claude handles grading, compression, and integration).

**Please don't** write or rewrite app code, propose new libraries, change the program rules, or redesign
screens that are already done (onboarding, comeback, Today's layout). If you think something there is
wrong, flag it as a suggestion for the owner to bring to Claude.

---

## 7. Tech facts (for context only)

- Expo SDK 57 (Expo Go compatible), React Native 0.86, TypeScript, Expo Router (routes in `src/app/`),
  Zustand + AsyncStorage (local persistence), Reanimated 4, expo-notifications (local only),
  react-native-view-shot + expo-sharing (share card).
- Images use React Native's built-in `Image` with JPEG/PNG. Both theme versions of an image crossfade.
- iPhone only for v1.
- Decisions and their reasons are logged in `DECISIONS.md`; the app overview is `OVERVIEW.md`;
  future ideas are in `LATER.md`.

---

## 8. Later (not now)

- v1.1: home-screen widget; optional one-time tip jar (asked only at days 7/30/66) with a supporter badge.
- v1.2: Seasons (Body, Mind, Money, People), Turkish localization.
- v2: Android release, optional iCloud sync.
- Ideas: tap a past day in Journey to see what was checked; per-habit history; data import; nutrition habits
  (would need its own quiz question); finer quiz baselines (bedtime/wake time).
- Never: social features, leaderboards, analytics, AI-generated messages.
