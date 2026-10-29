# Collectible illustrations

Drop the finished art here, named exactly (1024 × 1024 PNG, transparent background, same geometry in both themes):

| Collectible | Dark theme | Light theme |
|---|---|---|
| The Compass | `compass-dark.png` | `compass-light.png` |
| Pressed Edelweiss | `edelweiss-dark.png` | `edelweiss-light.png` |
| The Trail Journal | `trail_journal-dark.png` | `trail_journal-light.png` |
| The Mountain Lantern | `mountain_lantern-dark.png` | `mountain_lantern-light.png` |
| The Climbing Rope | `climbing_rope-dark.png` | `climbing_rope-light.png` |
| The Walking Staff | `walking_staff-dark.png` | `walking_staff-light.png` |
| The Summit Pennant | `summit_pennant-dark.png` | `summit_pennant-light.png` |

Then list each pair in `src/components/collection/art.ts` (one line each; the commented template is there).
Nothing else changes: the collection uses the art when it's listed, and its vector placeholder until then.
Prompts: `design/XP_COLLECTIBLE_ART_PROMPTS.md`.
