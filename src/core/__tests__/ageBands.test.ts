import { describe, expect, it } from '@jest/globals';
import { ageBandLabel, WAYPOINT_HEIGHTS } from '../../components/onboarding/ageTrail';
import { strengthNotes } from '../reset/habits';
import * as P from '../reset/pilot';
import { ageAllowsSetup, isMinor, SETUP_AGE_BANDS, type AgeBand } from '../reset/profile';
import { setLanguage, t, tIn } from '../../i18n';
import { isolateNumbers } from '../../i18n/direction';
import { READY_LANGUAGES } from '../../i18n/languages';

const answers = (age: AgeBand): P.PilotAnswers => ({ age, precautions: [], minutesPerDay: 60 });
const ADULT: AgeBand[] = ['18_29', '30_49', '50_64', '65p'];

describe('Age bands in set-up', () => {
  it('offers exactly the five bands, in order, and never the old 16–17 band', () => {
    expect([...SETUP_AGE_BANDS]).toEqual(['u16', '18_29', '30_49', '50_64', '65p']);
    expect(SETUP_AGE_BANDS).not.toContain('16_17');
  });

  it('lets set-up continue only with an adult band chosen', () => {
    expect(ageAllowsSetup(null)).toBe(false);
    expect(ageAllowsSetup('u16')).toBe(false);
    expect(ageAllowsSetup('16_17')).toBe(false);
    for (const a of ADULT) expect(ageAllowsSetup(a)).toBe(true);
    for (const a of SETUP_AGE_BANDS) expect(ageAllowsSetup(a)).toBe(!isMinor(a));
  });

  it('keeps the program’s own 18+ guardrails for every band', () => {
    const choices: P.PilotChoice[] = [{ habitId: 'mind_read', intensity: 'starter' }];
    expect(P.setupProblems(answers('u16'), choices)).toEqual([t('engine.problems.under18')]);
    for (const id of P.PILOT_HABITS) expect(P.habitExclusion(id, answers('u16'))).toBe(t('engine.exclusion.under18'));
    for (const a of ADULT) {
      expect(P.setupProblems(answers(a), choices)).not.toContain(t('engine.problems.under18'));
      expect(P.habitExclusion('mind_read', answers(a))).toBeNull();
    }
  });

  // Restoring an under-18 program from a backup stays refused: dataImport.test.ts.
  it('keeps the strength note for 65 and older, and only there', () => {
    const older = t('engine.notes.strengthOlder');
    expect(strengthNotes({ age: '65p', precautions: [] })).toContain(older);
    for (const a of ['18_29', '30_49', '50_64'] as AgeBand[])
      expect(strengthNotes({ age: a, precautions: [] })).not.toContain(older);
  });
});

describe('Age band labels', () => {
  it('reads "65 or older" in set-up while New Ascent keeps "65+"', () => {
    setLanguage('en');
    expect(ageBandLabel('65p')).toBe('65 or older');
    expect(t('setup.age.65p')).toBe('65+');
    expect(ageBandLabel('u16')).toBe('Under 18');
  });

  it('isolates number-only ranges so right-to-left text never reverses them', () => {
    expect(isolateNumbers('18–29')).toBe('⁦18–29⁩');
    expect(isolateNumbers('65+')).toBe('⁦65+⁩');
    expect(isolateNumbers('Under 18')).toBe('Under 18');
    expect(isolateNumbers('أقل من 18')).toBe('أقل من 18');
    expect(ageBandLabel('18_29')).toBe('⁦18–29⁩');
  });

  it('has the under-18 note in every ready language, names kept untranslated', () => {
    for (const l of READY_LANGUAGES) {
      const note = tIn(l.code, 'setup.ageBands.under18Note');
      expect(note).toContain('Schwung');
      expect(note).toContain('Life Reset');
      expect(tIn(l.code, 'setup.ageBands.older')).toMatch(/65|৬৫/);
    }
  });
});

describe('The age trail', () => {
  it('never climbs: its first and last waypoints sit level, and it goes both up and down', () => {
    const h = WAYPOINT_HEIGHTS;
    expect(h).toHaveLength(SETUP_AGE_BANDS.length);
    expect(Math.abs(h[0] - h[h.length - 1])).toBeLessThanOrEqual(3);
    const steps = h.slice(1).map((y, i) => y - h[i]);
    expect(steps.some((d) => d > 0)).toBe(true);
    expect(steps.some((d) => d < 0)).toBe(true);
  });
});
