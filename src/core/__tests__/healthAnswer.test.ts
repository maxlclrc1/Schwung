import { describe, expect, it } from '@jest/globals';
import * as P from '../reset/pilot';
import { hasPrecaution, precautionsUnknown, togglePrecaution, type HealthAnswer } from '../reset/profile';
import { setLanguage, t } from '../../i18n';

/** What set-up hands the program for an answer (PilotSetup: `precautions: health ?? 'unknown'`). */
const answers = (h: HealthAnswer): P.PilotAnswers => ({ age: '30_49', precautions: h ?? 'unknown', minutesPerDay: 60 });

describe('Set-up health answer', () => {
  it('ticks any number of precautions, in the order chosen', () => {
    let h: HealthAnswer = null;
    h = togglePrecaution(h, 'joint');
    h = togglePrecaution(h, 'heart');
    h = togglePrecaution(h, 'sleepCondition');
    expect(h).toEqual(['joint', 'heart', 'sleepCondition']);
    expect(togglePrecaution(h, 'heart')).toEqual(['joint', 'sleepCondition']);
  });

  it('returns to unanswered when the last precaution is unticked, never to "None of these"', () => {
    const h = togglePrecaution(togglePrecaution(null, 'pregnancy'), 'pregnancy');
    expect(h).toBeNull();
    expect(h).not.toEqual([]);
    // Continue needs an answer (PilotSetup: health !== null), so it is off again.
    expect(h !== null).toBe(false);
  });

  it('replaces "None of these" or "Rather not say" when a precaution is ticked', () => {
    expect(togglePrecaution([], 'fluidLimit')).toEqual(['fluidLimit']);
    expect(togglePrecaution('unknown', 'walkingDifficult')).toEqual(['walkingDifficult']);
  });

  it('keeps the meaning of the saved answers', () => {
    // "None of these": no precautions, and known.
    expect(precautionsUnknown({ precautions: [] })).toBe(false);
    expect(hasPrecaution({ precautions: [] }, 'joint')).toBe(false);
    // "Rather not say": unknown, never treated as "no limitations".
    expect(precautionsUnknown({ precautions: 'unknown' })).toBe(true);
    expect(hasPrecaution({ precautions: 'unknown' }, 'joint')).toBe(false);
  });

  it('leaves the health-based habit restrictions as they were', () => {
    setLanguage('en');
    const mv = (h: HealthAnswer) => P.habitExclusion('move_walk', answers(h));
    expect(mv(['walkingDifficult'])).toBe(t('engine.exclusion.walking'));
    expect(mv(['heart'])).toBe(t('engine.exclusion.movementAdvice'));
    expect(mv(['pregnancy'])).toBe(t('engine.exclusion.movementAdvice'));
    expect(mv([])).toBeNull();
    // A precaution unticked again counts for nothing: the same as never having ticked it.
    const back = togglePrecaution(togglePrecaution([], 'heart'), 'heart');
    expect(back).toBeNull();
    const joint = togglePrecaution(togglePrecaution(['joint'], 'pregnancy'), 'pregnancy');
    expect(joint).toEqual(['joint']);
    for (const id of P.PILOT_HABITS)
      expect(P.habitExclusion(id, answers(joint))).toBe(P.habitExclusion(id, answers(['joint'])));
  });
});
