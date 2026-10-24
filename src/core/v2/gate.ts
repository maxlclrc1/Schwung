/*
 * The scientific release gate for the development preview (owner approval, 2026-10-24).
 * Only these habits may be offered anywhere in the app: plans, the choice step and swaps. Every other
 * candidate stays inactive until it is explicitly approved; held habits are excluded by the engine anyway.
 * See SCHWUNG_V2_RELEASE_READINESS.md ("Safe to implement").
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
]);
