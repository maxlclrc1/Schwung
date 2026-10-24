import { describe, expect, it } from '@jest/globals';
import { ACCEPT_ONLY_LEVEL_UPS } from '../../progression';
import type { Weekday } from '../../types';
import { exclusion } from '../engine';
import {
  canAcceptLevelUp,
  CHECK_BLOCKED_MESSAGE,
  CHECK_FOR,
  CHECK_QUESTIONS,
  checkOutcome,
  EXCLUSIONS,
  EXERCISE_CONTENT,
  EXERCISE_IDS,
  EXERCISE_LADDERS,
  EXERCISE_PREVIEW_GATE,
  EXERCISE_SAFETY,
  validExerciseDays,
  type ExerciseId,
} from '../exercise';
import {
  accept,
  canStart,
  changeDays,
  decline,
  exercisePreview,
  goTo,
  logToday,
  PERSONAS,
  simDue,
  simHabit,
  simOffered,
  simRun,
  startSim,
  type Sim,
} from '../exercisePreview';
import { DEV_CLEARED } from '../gate';
import { BY_ID } from '../library';
import { assemblePlan, previewPlan, swapChoices } from '../program';
import type { ExerciseCheck, ProfileV2 } from '../types';
import { FIXTURES } from './fixtures';
import { sample } from './sample';

const CLEAR: ExerciseCheck = {
  standUnaided: 'yes',
  fallsOrUnsteady: 'no',
  dizziness: 'no',
  recentSurgery: 'no',
  clinicianLimit: 'no',
};
const persona = (name: string) => PERSONAS.find((p) => p.name === name)!.profile;
const inactive35 = persona('Inactive 35-year-old');
const older: ProfileV2 = { ...persona('72, interested in balance'), exerciseCheck: CLEAR };
const joint: ProfileV2 = { ...persona('67, joint discomfort'), exerciseCheck: CLEAR };
const seatedUser: ProfileV2 = { ...persona('Limited walking'), exerciseCheck: CLEAR };
const ex = (id: ExerciseId, p: ProfileV2) => exclusion(BY_ID[id], p, EXERCISE_PREVIEW_GATE);
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

describe('the four exercise prototypes', () => {
  it('are prototypes with exactly three provisional levels each', () => {
    for (const id of EXERCISE_IDS) {
      expect(BY_ID[id].release).toBe('prototype');
      expect(BY_ID[id].ladder(inactive35)).toEqual(EXERCISE_LADDERS[id]);
      expect(EXERCISE_LADDERS[id]).toHaveLength(3);
      expect(ACCEPT_ONLY_LEVEL_UPS.has(id)).toBe(true);
      expect(DEV_CLEARED.has(id)).toBe(false);
    }
    expect(EXERCISE_LADDERS.move_strength_prep).toEqual([
      '1 move, 5 controlled reps (wall push-up, sit-to-stand or calf raise)',
      '2 moves, 5–8 controlled reps each',
      '3 moves, 8–10 controlled reps each',
    ]);
  });

  it('use the agreed movements, never twisting, neck rotation or unsupported balance', () => {
    const names = (id: ExerciseId) => EXERCISE_CONTENT[id].movements.map((m) => m.name);
    expect(names('move_strength_prep')).toEqual(['Wall push-up', 'Sit-to-stand', 'Supported calf raise']);
    expect(names('move_strength_gentle')).toEqual([
      'Supported sit-to-stand',
      'Gentle wall push-up',
      'Supported heel raise',
    ]);
    expect(names('move_balance')).toEqual(['Supported stance']);
    expect(names('move_seated')).toEqual(['Ankle movements', 'Seated marching', 'Arm movements']);
    const all = JSON.stringify(EXERCISE_CONTENT).toLowerCase();
    expect(all).not.toMatch(/twist|neck|single-leg|one leg|let go of/);
    // Balance always holds on, at every level.
    expect(EXERCISE_CONTENT.move_balance.setup).toMatch(/Hold on the whole time/);
    for (const rung of EXERCISE_LADDERS.move_balance.slice(1)) expect(rung).toMatch(/still holding on/);
    expect(EXERCISE_CONTENT.move_seated.setup).toMatch(/Leave out any movement/);
  });

  it('always carry the shared safety lines and the prototype note, and never claim clinical validation', () => {
    const r = previewPlan(inactive35, EXERCISE_PREVIEW_GATE);
    if (r.status !== 'ok') throw new Error();
    const strength = r.picks.find((x) => x.id === 'move_strength_prep')!;
    for (const line of EXERCISE_SAFETY) expect(strength.notes).toContain(line);
    expect(strength.notes.join(' ')).toMatch(/haven’t been clinically reviewed/);
    expect(EXERCISE_SAFETY.join(' ')).toMatch(/without straining or holding your breath/);
    expect(EXERCISE_SAFETY.join(' ')).toMatch(/isn’t medical advice/);
  });
});

describe('eligibility: ages, baselines and health answers', () => {
  it('beginner strength: 16–64, inactive or lightly active, no relevant precautions', () => {
    for (const age of ['16_17', '18_29', '30_49', '50_64'] as const)
      expect(ex('move_strength_prep', { ...inactive35, age })).toBeNull();
    expect(ex('move_strength_prep', { ...inactive35, activeDays: '1_2' })).toBeNull();
    expect(ex('move_strength_prep', { ...inactive35, age: '65p' })).toMatch(/gentle version/);
    expect(ex('move_strength_prep', { ...inactive35, precautions: ['joint'] })).toMatch(/gentle version/);
    for (const activeDays of ['3_4', '5p'] as const)
      expect(ex('move_strength_prep', { ...inactive35, activeDays })).toMatch(/already active/);
  });

  it('gentle strength: older adults or joint discomfort, after a clear check', () => {
    expect(ex('move_strength_gentle', joint)).toBeNull();
    expect(ex('move_strength_gentle', older)).toBeNull();
    expect(ex('move_strength_gentle', { ...inactive35, exerciseCheck: CLEAR })).toMatch(/older adults or joint/);
    expect(ex('move_strength_gentle', { ...joint, exerciseCheck: { ...CLEAR, standUnaided: 'no' } })).toBe(
      CHECK_BLOCKED_MESSAGE,
    );
  });

  it('balance: older adults only; seated mobility: only when walking or standing is difficult', () => {
    expect(ex('move_balance', older)).toBeNull();
    expect(ex('move_balance', { ...older, age: '50_64' })).toMatch(/older adults/);
    expect(ex('move_seated', seatedUser)).toBeNull();
    expect(ex('move_seated', { ...older })).toMatch(/walking or standing difficult/);
  });

  it('heart, pregnancy and unanswered health questions rule out all four, without saying exercise is forbidden', () => {
    for (const id of EXERCISE_IDS) {
      for (const p of [
        { ...older, precautions: ['heart'] },
        { ...older, precautions: ['pregnancy'] },
        { ...older, precautions: 'unknown' },
        { ...seatedUser, precautions: ['walkingDifficult', 'heart'] },
      ] as ProfileV2[]) {
        const reason = ex(id, p)!;
        expect(reason).not.toBeNull();
        expect(reason).not.toMatch(/must not|never exercise|forbidden|dangerous/i);
      }
    }
    // Walking or standing difficulty rules out every standing exercise.
    for (const id of ['move_strength_prep', 'move_strength_gentle', 'move_balance'] as const)
      expect(ex(id, seatedUser)).toMatch(/can’t tailor exercises/);
  });
});

describe('the safety check', () => {
  it('needs every question answered with the safe answer; "not sure" blocks, as does any unsafe answer', () => {
    expect(checkOutcome('move_strength_prep', undefined)).toBe('not-needed');
    for (const id of ['move_strength_gentle', 'move_balance', 'move_seated'] as const) {
      expect(checkOutcome(id, undefined)).toBe('needed');
      expect(checkOutcome(id, CLEAR)).toBe('clear');
      for (const k of CHECK_FOR[id]) {
        const unsafe = CHECK_QUESTIONS[k].safe === 'yes' ? 'no' : 'yes';
        expect(checkOutcome(id, { ...CLEAR, [k]: unsafe })).toBe('blocked');
        expect(checkOutcome(id, { ...CLEAR, [k]: 'unsure' })).toBe('blocked');
        expect(checkOutcome(id, { [k]: unsafe })).toBe('blocked'); // even before the rest is answered
        const partial = { ...CLEAR };
        delete partial[k];
        expect(checkOutcome(id, partial)).toBe('needed');
      }
    }
    // Seated mobility doesn't ask about standing.
    expect(CHECK_FOR.move_seated).not.toContain('standUnaided');
    expect(CHECK_FOR.move_balance).toEqual([
      'standUnaided',
      'fallsOrUnsteady',
      'dizziness',
      'recentSurgery',
      'clinicianLimit',
    ]);
  });

  it('a prototype can only be started once eligible and, where needed, cleared', () => {
    expect(canStart('move_balance', { ...older, exerciseCheck: undefined }).ok).toBe(false);
    expect(canStart('move_balance', older).ok).toBe(true);
    expect(canStart('move_balance', { ...older, exerciseCheck: { ...CLEAR, dizziness: 'unsure' } }).ok).toBe(false);
    expect(startSim('move_balance', { ...older, exerciseCheck: undefined })).toBeNull();
    expect(canStart('move_strength_prep', inactive35).ok).toBe(true);
    for (const id of EXERCISE_IDS) expect(EXCLUSIONS[id].length).toBeGreaterThan(3);
  });
});

describe('held in normal V2: the preview gate is the only way in, and never bypasses a rule', () => {
  it('normal plans, choices and swaps never contain an exercise prototype', () => {
    for (const p of [
      ...Object.values(FIXTURES),
      ...PERSONAS.map((x) => ({ ...x.profile, exerciseCheck: CLEAR })),
      ...sample(3000),
    ]) {
      const r = previewPlan(p);
      if (r.status !== 'ok') continue;
      const ids = [...r.picks.map((x) => x.id), ...r.options.map((o) => o.id)];
      for (const id of EXERCISE_IDS) expect(ids).not.toContain(id);
      const plan = assemblePlan({ ...p, wake: { kind: 'time', time: '07:00' }, inBed: p.inBed ?? '23:00' }, []);
      if (plan)
        for (const h of plan.slice(1))
          for (const s of swapChoices(p, plan, h.habitId))
            expect(EXERCISE_IDS as readonly string[]).not.toContain(s.id);
    }
    // Without the preview gate, even a perfectly eligible person gets "prototype".
    expect(exclusion(BY_ID.move_strength_prep, inactive35)).toMatch(/development prototype/);
    expect(exclusion(BY_ID.move_strength_prep, inactive35, DEV_CLEARED)).toMatch(/development prototype/);
  });

  it('with the preview gate every offered prototype still passes its own rules; check-gated ones are choice-only', () => {
    for (const p of sample(3000)) {
      for (const check of [undefined, CLEAR]) {
        const q = { ...p, exerciseCheck: check };
        const r = previewPlan(q, EXERCISE_PREVIEW_GATE);
        if (r.status !== 'ok') continue;
        for (const id of [...r.picks.map((x) => x.id), ...r.options.map((o) => o.id)]) {
          if (!(EXERCISE_IDS as readonly string[]).includes(id)) continue;
          expect(BY_ID[id].exclude(q)).toBeNull();
          expect(checkOutcome(id as ExerciseId, q.exerciseCheck)).not.toBe('blocked');
        }
        for (const id of r.picks.map((x) => x.id))
          expect(['move_strength_gentle', 'move_balance', 'move_seated']).not.toContain(id);
      }
    }
  });
});

describe('fitness personas (preview gate)', () => {
  const run = (name: string, check?: ExerciseCheck) => {
    const out = exercisePreview({ ...persona(name), exerciseCheck: check });
    if (out.plan.status !== 'ok') throw new Error();
    return { ...out, plan: out.plan, ids: out.plan.picks.map((x) => x.id), options: out.plan.options.map((o) => o.id) };
  };

  it('inactive 19- and 35-year-olds get walking and beginner strength, without filler exercises', () => {
    for (const name of ['Inactive 19-year-old', 'Inactive 35-year-old']) {
      const r = run(name);
      expect(r.ids).toEqual(['discipline_bed', 'move_walk', 'move_strength_prep']);
      expect(r.plan.planNotes.join(' ')).not.toMatch(/doesn’t include the strength sessions/);
    }
  });

  it('an active 40-year-old gets their routine acknowledged, no beginner exercises', () => {
    const r = run('Active 40-year-old');
    expect(r.plan.planNotes).toContain(
      'You already have a strong activity routine. Let’s focus on the other changes that matter to you.',
    );
    for (const id of EXERCISE_IDS) {
      expect(r.ids).not.toContain(id);
      expect(r.options).not.toContain(id);
    }
  });

  it('67 with joint discomfort and 72 interested in balance: gentle strength and balance offered as choices', () => {
    for (const name of ['67, joint discomfort', '72, interested in balance']) {
      const r = run(name);
      expect(r.ids).toContain('move_walk');
      expect(r.options.slice(0, 2).sort()).toEqual(['move_balance', 'move_strength_gentle']);
      expect(r.plan.planNotes.join(' ')).toMatch(/after a short safety check/);
      expect(r.exercises.find((e) => e.id === 'move_balance')!.check).toBe('needed');
    }
  });

  it('limited walking: seated mobility as a choice; a medical precaution: an honest note and non-fitness choices', () => {
    const w = run('Limited walking');
    expect(w.options[0]).toBe('move_seated');
    expect(w.plan.planNotes.join(' ')).toMatch(/Seated mobility is available as a choice/);
    const h = run('Heart condition', CLEAR);
    for (const id of EXERCISE_IDS) expect([...h.ids, ...h.options]).not.toContain(id);
    expect(h.plan.planNotes.join(' ')).toMatch(/clinician or midwife/);
    for (const e of h.exercises) expect(e.excluded).toMatch(/can’t tailor exercises/);
  });
});

describe('scheduling rules', () => {
  it('strength: exactly 2 days, never next to each other (Saturday and Sunday are neighbours)', () => {
    for (const a of ALL_DAYS)
      for (const b of ALL_DAYS) {
        if (a >= b) continue;
        const adjacent = b - a === 1 || (a === 0 && b === 6);
        for (const id of ['move_strength_prep', 'move_strength_gentle'] as const)
          expect(validExerciseDays(id, [a, b])).toBe(!adjacent);
      }
    expect(validExerciseDays('move_strength_prep', [1, 3, 5])).toBe(false);
    expect(validExerciseDays('move_balance', [1, 3, 5])).toBe(true);
    expect(validExerciseDays('move_balance', [1, 4])).toBe(false);
    expect(validExerciseDays('move_seated', [])).toBe(true);
  });
});

describe('the mock program runs the real progression', () => {
  /** Completes `n` sessions, moving day by day; returns the sim on the day after the last one. */
  function completeSessions(sim: Sim, n: number): Sim {
    let s = sim;
    let done = 0;
    while (done < n) {
      if (simDue(s)) {
        s = logToday(s, 'done');
        done++;
      }
      s = goTo(s, s.day + 1);
    }
    return s;
  }

  it('strength: rest days aren’t misses; 7 sessions bring the offer; accepting needs the self-check', () => {
    let s = startSim('move_strength_prep', inactive35, [1, 4])!;
    expect(simHabit(s).schedule!.days).toEqual([1, 4]);
    s = completeSessions(s, 6);
    expect(simOffered(s)).toBe(false);
    s = completeSessions(s, 1);
    expect(simRun(s)).toBe(7);
    expect(simOffered(s)).toBe(true);
    expect(accept(s, false)).toBeNull();
    expect(canAcceptLevelUp('move_strength_prep', false)).toBe(false);
    expect(canAcceptLevelUp('mind_read', false)).toBe(true); // other habits unchanged
    const up = accept(s, true)!;
    expect(simHabit(up).level).toBe('medium');
    expect(simHabit(up).spec!.targets.medium).toBe('2 moves, 5–8 controlled reps each');
    // Declining: no penalty, no level change, the run just restarts.
    const no = decline(s);
    expect(simHabit(no).level).toBe('easy');
    expect(simOffered(no)).toBe(false);
  });

  it('an easy-level person may stay at Easy all program; Day 22 and 45 never raise any prototype', () => {
    for (const [id, p] of [
      ['move_strength_prep', inactive35],
      ['move_strength_gentle', joint],
      ['move_balance', older],
      ['move_seated', seatedUser],
    ] as const) {
      let s = startSim(id, p)!;
      s = goTo(s, 22);
      expect(s.plan[0].level).toBe('medium'); // the foundation habit still rises as before
      expect(simHabit(s).level).toBe('easy');
      s = goTo(s, 45);
      s = goTo(s, 66);
      expect(s.appliedPhase).toBe(3);
      expect(simHabit(s).level).toBe('easy');
    }
  });

  it('three missed sessions step down gently, never below Easy; a rested session is never a miss', () => {
    let s = startSim('move_balance', older, [1, 3, 5])!;
    s = { ...s, plan: [s.plan[0], { ...simHabit(s), level: 'medium' }] };
    // Rest on three due days in a row: still Medium.
    for (let i = 0; i < 3; i++) {
      while (!simDue(s)) s = goTo(s, s.day + 1);
      s = logToday(s, 'rest');
      s = goTo(s, s.day + 1);
    }
    expect(simHabit(s).level).toBe('medium');
    // Then three sessions missed without opening the app: step down to Easy, and never lower.
    s = goTo(s, s.day + 7);
    expect(simHabit(s).level).toBe('easy');
    expect(s.events.some((e) => e.kind === 'stepDown')).toBe(true);
    s = goTo(s, s.day + 14);
    expect(simHabit(s).level).toBe('easy');
  });

  it('seated mobility is daily, with rest any day; rest doesn’t break the run', () => {
    let s = startSim('move_seated', seatedUser)!;
    expect(simHabit(s).schedule).toBeUndefined();
    for (let d = 1; d <= 9; d++) {
      s = logToday(s, d === 4 || d === 6 ? 'rest' : 'done');
      s = goTo(s, s.day + 1);
    }
    expect(simRun(s)).toBe(7);
    expect(simOffered(s)).toBe(true);
    expect(s.events.filter((e) => e.kind === 'stepDown')).toEqual([]);
  });

  it('changing days keeps the past (schedule history) and the run', () => {
    let s = startSim('move_strength_prep', inactive35, [1, 4])!;
    s = completeSessions(s, 4);
    const run = simRun(s);
    const changed = changeDays(s, [2, 5])!;
    expect(simRun(changed)).toBe(run);
    expect(simHabit(changed).schedule!.history).toEqual([{ days: [1, 4], until: s.day - 1 }]);
    expect(changeDays(s, [2, 3])).toBeNull(); // consecutive days refused
  });
});
