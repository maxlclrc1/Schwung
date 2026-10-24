import { describe, expect, it } from '@jest/globals';
import { previewPlan } from '../program';
import { toggledAnswer, toProfile, visibleQuestions, withAnswer, type Draft } from '../quiz';
import { FIXTURES } from './fixtures';

/*
 * The V2 quiz's answer updates (app/v2/quiz.tsx applies these to the latest draft). Deselecting must remove the
 * answer from what is stored and from everything computed from it.
 */
const C = FIXTURES['C · 28, energy'];

describe('multi-choice answers', () => {
  it('tapping a chosen option again removes it; tapping again adds it back', () => {
    let d: Draft = { ...C, routines: [] };
    d = toggledAnswer(d, 'routines', 'reading');
    expect(d.routines).toEqual(['reading']);
    d = toggledAnswer(d, 'routines', 'reading');
    expect(d.routines).toEqual([]);
    d = toggledAnswer(d, 'routines', 'reading');
    expect(d.routines).toEqual(['reading']);
  });

  it('quick taps applied in turn to the latest draft all count, and only the tapped option changes', () => {
    const taps = ['reading', 'journaling', 'planning', 'journaling'];
    const d = taps.reduce((acc, v) => toggledAnswer(acc, 'routines', v), { ...C, routines: [] } as Draft);
    expect(d.routines).toEqual(['reading', 'planning']);
    expect({ ...d, routines: C.routines }).toEqual(C);
  });

  it('a skipped question starts from nothing chosen', () => {
    expect(toggledAnswer({ ...C, precautions: 'unknown' }, 'precautions', 'joint').precautions).toEqual(['joint']);
  });

  it('a deselected option leaves no trace in the profile or the plan', () => {
    const never = toProfile({ ...C, routines: [] })!;
    const undone = toProfile(
      toggledAnswer(toggledAnswer({ ...C, routines: [] }, 'routines', 'bed'), 'routines', 'bed'),
    )!;
    expect(undone).toEqual(never);
    expect(JSON.stringify(previewPlan(undone))).toBe(JSON.stringify(previewPlan(never)));
    // And selecting it does change the plan (Make your bed is already a routine), so the test is meaningful.
    const bed = toProfile(toggledAnswer({ ...C, routines: [] }, 'routines', 'bed'))!;
    expect(JSON.stringify(previewPlan(bed))).not.toBe(JSON.stringify(previewPlan(never)));
  });
});

describe('single-choice answers', () => {
  it('switching replaces the answer; choosing it again keeps it (never empty)', () => {
    let d: Draft = {};
    d = withAnswer(d, 'sleepHours', '6_7');
    d = withAnswer(d, 'sleepHours', '7_8');
    expect(d.sleepHours).toBe('7_8');
    d = withAnswer(d, 'sleepHours', '7_8');
    expect(d.sleepHours).toBe('7_8');
  });

  it('both answers on the shared sleep screen are kept when picked in quick succession', () => {
    const d = [
      ['sleepHours', '6_7'],
      ['sleepTrouble', 'most'],
      ['sleepHours', 'lt6'],
    ].reduce((acc, [k, v]) => withAnswer(acc, k as 'sleepHours', v), {} as Draft);
    expect([d.sleepHours, d.sleepTrouble]).toEqual(['lt6', 'most']);
  });

  it('changing an answer that hides a follow-up question drops the stale follow-up answer', () => {
    const heavy = withAnswer({ ...C, phone: '4_6' }, 'phonePull', 'social');
    expect(visibleQuestions(heavy).some((q) => q.key === 'phonePull')).toBe(true);
    expect(toProfile(heavy)!.phonePull).toBe('social');
    const light = withAnswer(heavy, 'phone', 'lt1');
    expect(visibleQuestions(light).some((q) => q.key === 'phonePull')).toBe(false);
    expect(toProfile(light)!.phonePull).toBeUndefined();
  });
});
