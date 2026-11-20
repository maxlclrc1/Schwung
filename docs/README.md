# Documentation

Where the code and a document disagree, the code wins: these explain why it is the way it is. Older material is
in [`archive/`](archive/README.md).

## Releasing v1.0

| Document | What it's for |
| --- | --- |
| [V1_LAUNCH_AUDIT.md](V1_LAUNCH_AUDIT.md) | Launch blockers, App Store Connect inputs, the tip-jar and RevenueCat plan, status notes |
| [TESTFLIGHT_CHECKLIST.md](TESTFLIGHT_CHECKLIST.md) | Before and on TestFlight: release config, App Privacy, purchases, device checks |
| [HARDENING_AND_PERFORMANCE.md](HARDENING_AND_PERFORMANCE.md) | Security review, theme-switch performance, what still needs an iPhone |
| [legal/](legal/) | Privacy policy, Terms of Use, wellness note, and the legal review checklist (drafts, not reviewed) |
| [LOCALIZATION.md](LOCALIZATION.md) | The 20 languages, the i18n workflow (`npm run i18n:*`), review status |

## How the program works

| Document | What it's for |
| --- | --- |
| [SCHWUNG_LIFE_RESET_PROGRAM.md](SCHWUNG_LIFE_RESET_PROGRAM.md) | The 66-day program’s rules: phases, the 80% rule, XP, Journey, Insights (parts predate later changes; the code wins) |
| [SCHWUNG_LIFE_RESET_HABITS.md](SCHWUNG_LIFE_RESET_HABITS.md), [SCHWUNG_LIFE_RESET_CATALOG_NOTES.md](SCHWUNG_LIFE_RESET_CATALOG_NOTES.md) | The habit catalogue, its levels and safety rules |
| [SCHWUNG_LIFE_RESET_PROGRESSION.md](SCHWUNG_LIFE_RESET_PROGRESSION.md), [SCHWUNG_LIFE_RESET_TRACKING.md](SCHWUNG_LIFE_RESET_TRACKING.md) | Readiness and step-ups; how each kind of habit is tracked |
| [FAIRER_DAY_COUNTING.md](FAIRER_DAY_COUNTING.md) | How program days are counted (decision) |
| [66_DAY_EXPERIENCE_AUDIT.md](66_DAY_EXPERIENCE_AUDIT.md) | The 66-day experience and habit-science review behind reflections, comebacks and moments |
| [BEYOND_THE_SUMMIT_PLAN.md](BEYOND_THE_SUMMIT_PLAN.md) | After Day 66: momentum, a New Ascent, past journeys |
| [RECOVERY_SYSTEM_PROPOSAL.md](RECOVERY_SYSTEM_PROPOSAL.md) | Recovery and adaptive difficulty (the basis of Minimum Effort) |
| [MINIMUM_EFFORT_SPEC.md](MINIMUM_EFFORT_SPEC.md), [MINIMUM_EFFORT_RELEASE_CHECKLIST.md](MINIMUM_EFFORT_RELEASE_CHECKLIST.md) | "Did the minimum": built, off in production (`MINIMUM_EFFORT_LAUNCHED = false`) until this checklist is done |
| [DECISIONS.md](DECISIONS.md) | Numbered product decisions from the first build |

## Design

| Document | What it's for |
| --- | --- |
| [INTERACTION_AUDIT.md](INTERACTION_AUDIT.md) | The motion vocabulary (`theme/motion.ts`), haptics and selection transitions |
| [SCHWUNG_CONTINUOUS_WORLD_ARTWORK_SPEC.md](SCHWUNG_CONTINUOUS_WORLD_ARTWORK_SPEC.md), [SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md](SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md) | The painted world and the habit cards' scenes: sizes, rules, how to replace art |

## Working on the project

- [`../AGENTS.md`](../AGENTS.md): architecture, rules and checks for anyone (or any agent) changing the code.
- [HANDOFF-CHATGPT.md](HANDOFF-CHATGPT.md): the brief for the product and design partner (ChatGPT).
- [`../scripts/qa/README.md`](../scripts/qa/README.md): the visual QA across languages, sizes and themes.
