import type { ProfileV2 } from '../types';

/** Deterministic sample of profiles across every answer (seeded, so CI is stable). */
export function sample(n: number): ProfileV2[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const routines = ['reading', 'breathing', 'journaling', 'planning', 'walk', 'phoneAway', 'sameWake', 'bed'] as const;
  const precautions = ['joint', 'walkingDifficult', 'heart', 'pregnancy', 'fluidLimit', 'sleepCondition'] as const;
  const out: ProfileV2[] = [];
  for (let i = 0; i < n; i++) {
    const age = pick(['16_17', '18_29', '30_49', '50_64', '65p'] as const);
    const produce = pick(['0', '1_2', '3_4', '5p', 'skip'] as const);
    const phone = pick(['lt1', '1_2', '2_4', '4_6', '6p', 'unknown'] as const);
    const wakeKind = pick(['time', 'varies', 'shift', 'none'] as const);
    out.push({
      age,
      goal: pick(['energy', 'focus', 'discipline', 'confidence', 'calm', 'fitness'] as const),
      sleepHours: pick(['lt6', '6_7', '7_8', '8_9', 'gt9'] as const),
      sleepTrouble: pick(['rarely', 'some', 'most'] as const),
      activeDays: pick(['0', '1_2', '3_4', '5p'] as const),
      produce,
      sugary: age !== '16_17' && produce !== 'skip' ? pick(['most', 'some', 'rarely'] as const) : undefined,
      phone,
      phonePull: ['2_4', '4_6', '6p', 'unknown'].includes(phone)
        ? pick(['social', 'video', 'games', 'messages', 'mix'] as const)
        : undefined,
      routines: routines.filter(() => rnd() < 0.3),
      precautions: rnd() < 0.15 ? 'unknown' : precautions.filter(() => rnd() < 0.12),
      wake:
        wakeKind === 'time'
          ? { kind: 'time', time: pick(['05:30', '06:30', '07:00', '08:00', '09:30']) }
          : wakeKind === 'none'
            ? undefined
            : { kind: wakeKind },
      inBed: wakeKind === 'time' ? pick(['21:30', '22:30', '23:15', '00:00', '01:00']) : undefined,
    });
  }
  return out;
}
