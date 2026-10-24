/*
 * The scientific release gate for the development preview. Only these habits may be offered anywhere in the
 * app: plans, the choice step and swaps. Strength preparation stays out (pending expert review); held habits
 * are excluded by the engine anyway. See SCHWUNG_V2_RELEASE_READINESS.md.
 */
export const DEV_CLEARED: ReadonlySet<string> = new Set([
  'discipline_bed',
  'sleep_wake',
  'sleep_morning_light',
  'screen_morning',
  'screen_social',
  'screen_app_limit',
  'mind_read',
  'focus_deepwork',
  'focus_top3',
  'social_reach_out',
  'confidence_compliment',
  'mind_journal',
  // Unlocked after the evidence and safety review of 2026-10-24 (SCHWUNG_V2_EVIDENCE_REGISTER.md), each with its
  // restrictions in library.ts: no Walk or Slow breathing with heart conditions or pregnancy; no Earlier bedtime
  // or Fruit and veg for 16–17; Unsweetened drinks 18+ only; Water with meals add-only; conversations choice-only.
  'move_walk',
  'sleep_bedtime',
  'sleep_no_phone_bed',
  'mind_breathe',
  'food_produce',
  'food_unsweetened',
  'food_water_meals',
  'confidence_talk',
]);
