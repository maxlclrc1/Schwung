# Localization

Schwung is prepared for 20 languages (`src/i18n/languages.ts`). **Phase 1** ships six: English (source), Turkish,
Spanish, French, German and Brazilian Portuguese. Phase 2 adds Italian, Dutch, Indonesian, Japanese, Korean and
Simplified Chinese (glossary for these in `scripts/i18n/glossary.json`; Traditional Chinese devices stay in English
until zh-Hant is ready); Phase 3 brings right-to-left
(Arabic, Hebrew).

## How it works

- Every user-facing string lives in a catalog: `src/i18n/locales/en/*.ts` (English, by area) and one file per
  language (`tr.ts`, `es.ts`, `fr.ts`, `de.ts`, `pt-BR.ts`) with the same shape. All bundled: nothing is fetched or
  machine-translated at run time.
- `t(key, params)` fills `{placeholders}` (numbers formatted for the language) and picks plural forms
  (`{ one, few, many, other }`, chosen by `params.count` with the CLDR rules in `src/i18n/plural.ts`).
- Dates use `formatDate`, numbers `formatNumber`, percentages `formatPercent` (Intl, in the app's language).
- Screens call `useT()` (`src/i18n/react.ts`), so a language change re-renders every mounted screen at once; the
  program, progress and navigation are untouched. Reminders are planned again in the new language.
- Settings → Language: **Follow device** (the first of the phone's preferred languages Schwung has, else English) or
  a language chosen explicitly. Each language is listed in its own name. The choice is saved with the preferences,
  kept by Delete my data, and never taken from a restored backup.
- **What is never translated:** the person's own habit names and notes (shown exactly as typed), stored ids, keys,
  saved data and file names. Saved answers keep their English ids (`'Instrument'`, `'full body'`) and are labelled at
  display time.
- **Not translated in Phase 1:** the Terms of Use draft and the Wellness note (English until the legal review in
  `docs/legal/LEGAL_REVIEW_CHECKLIST.md` approves final wording), and the contents of a data export file (its field
  names and values are data).

## Checks (`src/i18n/__tests__/catalogs.test.ts`)

- Every key in English exists in every Phase 1 language; any key a language lacks is listed (and shown in English in
  the app, with a warning in development builds).
- No language has keys English doesn't.
- Placeholders match English exactly in every string and plural form.
- Plural entries give every category the language needs (and none it doesn't have).
- English catalog text matches the habit catalog's own data (names, descriptions, notes, social steps), so the two
  can't drift apart.

## Workflow for new and changed strings (`scripts/i18n/`)

English is the source of truth; translation happens offline, never in the app. `state.json` records the English each
translation was made against, so only new, changed or missing strings are ever sent for translation.

1. Change English in `src/i18n/locales/en/*.ts`.
2. `npm run i18n:tasks` writes `scripts/i18n/tasks.json`: only the keys that need work, with the previous English,
   placeholders, required plural forms, the files that use the key, matching glossary terms (`glossary.json`) and a
   flag on health, safety, privacy and legal wording.
3. Fill `translations.<lang>.text` (by a translator, or any tool outside the app) and set `source: "human"` for text a
   person wrote or reviewed. Anything else is recorded as machine-made, awaiting review.
4. `npm run i18n:apply` validates everything first (placeholders, plural forms, edge spaces, line breaks) and applies
   all or nothing. Current translations are never replaced unless English changed (`--force` to override). Keys
   English dropped are removed from every catalog.
5. `npm run i18n:check` (and `npm test`) fails while any ready language is missing a key, has an outdated or invalid
   translation, or English has changed since the last apply. `-- --strict` also fails on unreviewed sensitive text.
6. After a person reviews: `npm run i18n:approve -- <lang|all> [key-prefix]`. `npm run i18n:status` shows the totals.

The Phase 1 catalogs were machine-written, so every translation starts as awaiting review.

## Glossary

| Concept                     | English                         | Türkçe                               | Español                            | Français                         | Deutsch                               | Português (BR)               |
| --------------------------- | ------------------------------- | ------------------------------------ | ---------------------------------- | -------------------------------- | ------------------------------------- | ---------------------------- |
| Brand                       | Schwung                         | Schwung                              | Schwung                            | Schwung                          | Schwung                               | Schwung                      |
| The 66-day program (a name) | Life Reset                      | Life Reset                           | Life Reset                         | Life Reset                       | Life Reset                            | Life Reset                   |
| Tabs                        | Habits · Journey · Insights     | Alışkanlıklar · Yolculuk · İçgörüler | Hábitos · Recorrido · Perspectivas | Habitudes · Parcours · Tendances | Gewohnheiten · Weg · Einblicke        | Hábitos · Jornada · Insights |
| Phase 1 · 2 · 3             | Foundation · Momentum · Mastery | Temel · İvme · Ustalık               | Base · Impulso · Maestría          | Fondations · Élan · Maîtrise     | Fundament · Aufwind · Meisterschaft   | Base · Impulso · Maestria    |
| Intensity                   | Starter · Standard · Challenge  | Başlangıç · Standart · Zorlu         | Inicio · Estándar · Desafío        | Initiation · Standard · Défi     | Einstieg · Standard · Herausforderung | Iniciante · Padrão · Desafio |
| Summit                      | summit                          | zirve                                | cumbre                             | sommet                           | Gipfel                                | cume                         |
| Ascent                      | ascent                          | tırmanış                             | ascenso                            | ascension                        | Aufstieg                              | subida                       |
| Keep My Momentum            | Keep My Momentum                | İvmemi Koru                          | Mantener mi impulso                | Garder mon élan                  | Im Schwung bleiben                    | Manter meu impulso           |
| Begin a New Ascent          | Begin a New Ascent              | Yeni Bir Tırmanışa Başla             | Comenzar un nuevo ascenso          | Commencer une nouvelle ascension | Neuen Aufstieg beginnen               | Começar uma nova subida      |
| Streak                      | streak                          | seri                                 | racha                              | série                            | Serie                                 | sequência                    |
| Rest day                    | rest day                        | dinlenme günü                        | día de descanso                    | jour de repos                    | Ruhetag                               | dia de descanso              |
| XP                          | XP                              | XP                                   | XP                                 | XP                               | XP                                    | XP                           |
| Collection                  | collection                      | koleksiyon                           | colección                          | collection                       | Sammlung                              | coleção                      |
| Weekly reflection           | weekly reflection               | haftalık değerlendirme               | reflexión semanal                  | bilan de la semaine              | Wochenrückblick                       | reflexão semanal             |
| Past journeys               | Past journeys                   | Geçmiş yolculuklar                   | Recorridos anteriores              | Parcours passés                  | Frühere Wege                          | Jornadas anteriores          |
| Address                     | —                               | sen                                  | tú                                 | vous                             | du                                    | você                         |

**Tone:** warm, calm and plain; encouraging without pressure; never guilt, urgency or medical claims. Mountain
metaphors (trail, summit, base camp, climb) are kept where they read naturally in the language.

**Safety wording** (health precautions, strength notes, eligibility reasons, "stop and get medical help") is
translated literally in meaning, never softened or embellished.

## Adding a language

1. Mark it `ready` in `languages.ts` and add its loader in `src/i18n/index.ts`.
2. Copy a complete catalog, translate, and run the checks above (missing keys are listed by name).
3. Add it to `supportedLocales` for `expo-localization` in `app.json` (iOS per-app language).
4. For right-to-left languages (Phase 3): enable RTL in the `expo-localization` plugin and review mirrored layouts.
