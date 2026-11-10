/*
 * Fairer Day Counting (docs/FAIRER_DAY_COUNTING.md): the candidate day-counting models run over the real engine's
 * saved days for the audit's Users A, B and C (with and without minimums, partial progress and skips), and a matrix
 * of 1–6 habits under set patterns and random adherence. Read-only: the app is unchanged.
 *
 * The rules' own checks always run. The simulations are opt-in, as the 66-day audit is:  AUDIT=1 npx jest scripts/audit
 */
import { describe, expect, it } from '@jest/globals';
import { PROGRAM_DAYS } from '../../../src/core/dates';
import * as C from '../../../src/core/reset/charts';
import * as P from '../../../src/core/reset/pilot';
import { storyFacts } from '../../../src/core/reset/story';
import {
  CURRENT,
  dayStats,
  FLOOR80,
  habitStreaks,
  MAJORITY,
  MODELS,
  type Model,
  outcome,
  type Outcome,
  readDays,
  runModel,
} from '../dayModels';
import {
  answersA,
  askedOn,
  behaviourA,
  behaviourB,
  behaviourC,
  type Behaviour,
  START,
  startA,
  startB,
  startC,
} from '../people';

const audit = process.env.AUDIT ? describe : describe.skip;
const say = (s: string) => {
  if (process.env.AUDIT) console.log(s);
};

/** The audit's day loop (offers, feedback, completions), plus minimums, partial progress and skips. */
function simulate(p0: P.PilotProgram, b: Behaviour, last = PROGRAM_DAYS): P.PilotProgram {
  let p = p0;
  for (let d = 1; d <= last; d++) {
    const opened = b.opens?.(d) ?? true;
    if (!opened) continue;
    for (const o of P.offersNow(p, d, false)) {
      const c = b.onOffer(d, o);
      if (c === 'accept') p = P.accept(p, o.habitId, o.offer, d);
      if (c === 'decline') p = P.decline(p, o.habitId, o.offer, d);
    }
    for (const id of p.habits) {
      const f = b.feedback?.(d, id);
      if (f) p = P.feedback(p, id, f, d);
    }
    const asked = askedOn(p, d);
    for (const id of b.does(d, asked)) p = P.complete(p, id, d).program;
    const open = asked.filter((id) => !P.isDone(p, id, d));
    for (const id of b.minimums?.(d, open) ?? []) p = P.setMinimum(p, id, d, true).program;
    for (const id of b.partials?.(d, open) ?? []) p = P.setPartial(p, id, d, true).program;
    for (const id of b.skips?.(d, open) ?? []) p = P.setSkipped(p, id, d, true).program;
  }
  return p;
}

// --- The people, as audited and with Minimum Effort, partial progress or skips ---

const activeA = (d: number) => d <= 13 || (d <= 30 && d % 3 !== 0) || (d >= 31 && d <= 50 && d % 2 === 0) || d === 66;
const PEOPLE: { key: string; label: string; start: () => P.PilotProgram; b: Behaviour }[] = [
  { key: 'A', label: 'A as audited', start: startA, b: behaviourA },
  {
    key: 'A+min',
    label: 'A, minimums on every habit left on active days',
    start: startA,
    b: { ...behaviourA, minimums: (d, open) => (activeA(d) ? open : []) },
  },
  {
    key: 'A+partial',
    label: 'A, partial progress instead of those minimums',
    start: startA,
    b: { ...behaviourA, partials: (d, open) => (activeA(d) ? open : []) },
  },
  { key: 'B', label: 'B as audited', start: startB, b: behaviourB },
  {
    key: 'B+min',
    label: 'B, minimums on Day 12 and on the weekly off day',
    start: startB,
    b: { ...behaviourB, minimums: (d, open) => (d === 12 || (d > 12 && d % 7 === 6) ? open : []) },
  },
  {
    key: 'B+skip',
    label: 'B, skipping everything on the weekly off day',
    start: startB,
    b: { ...behaviourB, skips: (d, open) => (d > 12 && d % 7 === 6 ? open : []) },
  },
  { key: 'C', label: 'C as audited (control; two weekly habits)', start: startC, b: behaviourC },
];

// --- The matrix: 1–6 daily habits at Starter ---

const SIX = ['mind_read', 'move_walk', 'mind_meditation', 'outdoor_time', 'sleep_wake', 'eat_well'];
const answersN: P.PilotAnswers = { ...answersA, minutesPerDay: 120 };
const startN = (n: number) =>
  P.createPilot(
    answersN,
    SIX.slice(0, n).map((habitId) => ({ habitId, intensity: 'starter' as const })),
    START,
  )!;
// The patterns act on Read Daily ("one habit"), which has a minimum and logs minutes.
const ONE = 'mind_read';
const PATTERNS: { key: string; label: string; b: Behaviour }[] = [
  { key: 'all', label: 'Everything, every day', b: { does: (_d, a) => a, onOffer: () => 'ignore' } },
  {
    key: 'oneShort',
    label: 'One habit not done, every day',
    b: { does: (_d, a) => a.filter((id) => id !== ONE), onOffer: () => 'ignore' },
  },
  {
    key: 'oneMinimum',
    label: 'One habit at its minimum, every day',
    b: { does: (_d, a) => a.filter((id) => id !== ONE), minimums: (_d, o) => o, onOffer: () => 'ignore' },
  },
  {
    key: 'onePartial',
    label: 'One habit partly done, every day',
    b: { does: (_d, a) => a.filter((id) => id !== ONE), partials: (_d, o) => o, onOffer: () => 'ignore' },
  },
  {
    key: 'oneSkip',
    label: 'One habit skipped, every day',
    b: { does: (_d, a) => a.filter((id) => id !== ONE), skips: (_d, o) => o, onOffer: () => 'ignore' },
  },
  {
    key: 'offDay',
    label: 'Nothing one day a week',
    b: { does: (d, a) => (d % 7 === 6 ? [] : a), onOffer: () => 'ignore' },
  },
  {
    key: 'oneOffDay',
    label: 'One habit missed one day a week',
    b: { does: (d, a) => (d % 7 === 6 ? a.filter((id) => id !== ONE) : a), onOffer: () => 'ignore' },
  },
  {
    key: 'alternate',
    label: 'Everything every other day',
    b: { does: (d, a) => (d % 2 === 1 ? a : []), onOffer: () => 'ignore' },
  },
  {
    key: 'absence',
    label: 'Away Days 20–26 (app not opened)',
    b: { does: (_d, a) => a, onOffer: () => 'ignore', opens: (d) => d < 20 || d > 26 },
  },
];

/** A seeded generator, so the random runs are the same every time. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randomly = (q: number, seed: number): Behaviour => {
  const r = rng(seed);
  return { does: (_d, a) => a.filter(() => r() < q), onOffer: () => 'ignore' };
};

// --- What each model gives a program ---

type Result = {
  run: number[];
  counted: number;
  kept: number;
  best: number;
  streak: number;
  resets: number;
  recent: string;
  outcomes: Outcome[];
};
function judge(p: P.PilotProgram, m: Model): Result {
  const r = runModel(readDays(p), m, PROGRAM_DAYS);
  // Recent Insights (recentDays80) on Day 66: the last 28 days that counted or were kept, of those judged.
  const last = r.outcomes.slice(PROGRAM_DAYS - 28);
  const ok = last.filter((o) => o === 'counted' || o === 'kept').length;
  const judged = last.filter((o, i) => o === 'counted' || o === 'kept' || (o === 'missed' && i < 27)).length;
  return { ...r, recent: `${ok}/${judged}` };
}

/** The Story's highlight (story.ts) with a given longest streak. */
function highlightWith(p: P.PilotProgram, best: number): string {
  const week = C.records(p, PROGRAM_DAYS).bestWeek;
  if (week && week.share >= 0.6) return `best week ${week.week}`;
  if (best >= 7) return `run of ${best}`;
  const f = storyFacts(p, PROGRAM_DAYS);
  return [7, 21, 44].some((d) => f.complete.includes(d)) ? 'milestones' : 'none';
}

const pad = (s: string | number, n: number) => String(s).padEnd(n);

describe('the candidate rules', () => {
  it('how many of a day’s habits each rule needs', () => {
    const need = (f: (n: number) => number) => [1, 2, 3, 4, 5, 6].map(f);
    expect(need(CURRENT.need)).toEqual([1, 2, 3, 4, 4, 5]);
    expect(need(MAJORITY.need)).toEqual([1, 2, 2, 3, 3, 4]);
    expect(need(FLOOR80.need)).toEqual([1, 1, 2, 3, 4, 4]);
    // Neither alternative ever asks more than today's rule, so no day that counts today stops counting.
    for (let n = 1; n <= 30; n++) {
      expect(MAJORITY.need(n)).toBeLessThanOrEqual(CURRENT.need(n));
      expect(FLOOR80.need(n)).toBeLessThanOrEqual(CURRENT.need(n));
    }
  });

  it('partial progress and skips are not done; a minimum keeps a day, never counts it', () => {
    const day = (...s: ('done' | 'minimum' | 'partial' | 'skipped' | 'none')[]) => ({
      day: 1,
      rest: false,
      habits: s.map((x, i) => ({ id: `h${i}`, s: x })),
    });
    expect(outcome(day('done', 'done', 'done', 'partial'), FLOOR80)).toBe('counted');
    expect(outcome(day('done', 'done', 'partial', 'partial'), FLOOR80)).toBe('missed');
    expect(outcome(day('done', 'done', 'minimum', 'skipped'), FLOOR80)).toBe('kept');
    expect(outcome(day('done', 'done', 'done', 'minimum'), CURRENT)).toBe('kept');
    expect(outcome(day('minimum'), FLOOR80)).toBe('kept');
    expect(outcome(day('skipped'), FLOOR80)).toBe('missed');
  });

  it('the week’s grace: one missed day in any 7 is tolerated; two in a row, or two in a week, end the run', () => {
    const o = (s: string): Outcome[] => [...s].map((c) => (c === 'x' ? 'missed' : c === 'r' ? 'rest' : 'counted'));
    const s = (x: string, g: 'none' | 'week' | 'twice') => dayStats(o(x), 99, g);
    expect(s('ccccxcccc', 'none')).toMatchObject({ best: 4, streak: 4, resets: 1 });
    expect(s('ccccxcccc', 'week')).toMatchObject({ best: 8, streak: 8, resets: 0, missed: 1 });
    expect(s('ccccxxcccc', 'week')).toMatchObject({ streak: 4, resets: 1 }); // two in a row: ended
    expect(s('ccxcccxccc', 'week')).toMatchObject({ streak: 3, resets: 1 }); // two within a week
    expect(s('ccxccccccxccc', 'week')).toMatchObject({ streak: 11, resets: 0 }); // a week apart: both tolerated
    expect(s('cxcxcxcxcx', 'twice').streak).toBe(5); // "never miss twice" lets every other day run on
    expect(s('cxcxcxcxcx', 'week').best).toBeLessThanOrEqual(2);
    expect(s('ccrrxcc', 'week')).toMatchObject({ streak: 4, resets: 0 }); // rest days are neutral
    expect(s('xccc', 'week')).toMatchObject({ streak: 3, resets: 0 }); // nothing to keep before Day 2
  });
});

audit('Fairer Day Counting: the models over the real engine', () => {
  const sims = PEOPLE.map((x) => ({ ...x, p: simulate(x.start(), x.b) }));

  it('the approved model ("recommended") is the engine’s own rule, day for day', () => {
    for (const s of sims) {
      const r = judge(
        s.p,
        MODELS.find((m) => m.key === 'recommended')!,
      );
      for (let d = 1; d <= PROGRAM_DAYS; d++)
        expect([s.key, d, r.outcomes[d - 1]]).toEqual([s.key, d, P.dayOutcome(s.p, d)]);
      const j = P.journeyStats(s.p, PROGRAM_DAYS);
      expect([r.counted, r.kept, r.best, r.streak]).toEqual([j.done, j.kept, j.best, j.streak]);
    }
  });

  it('Users A, B and C under every model', () => {
    const out: string[] = [];
    for (const s of sims) {
      out.push(`\n${s.key}: ${s.label}`);
      out.push(
        `  complete days ${C.dayCells(s.p, PROGRAM_DAYS).filter((c) => c.state === 'full').length}` +
          ` | XP ${P.pilotXp(s.p)} | overall consistency ${Math.round((P.consistency(P.overallTally(s.p, PROGRAM_DAYS)) ?? 0) * 100)}%` +
          ` | full ${Math.round((P.fullShare(P.overallTally(s.p, PROGRAM_DAYS)) ?? 0) * 100)}%`,
      );
      for (const m of MODELS) {
        const r = judge(s.p, m);
        out.push(
          `  ${pad(m.name, 44)} counted ${pad(r.counted, 3)} kept ${pad(r.kept, 3)} best ${pad(r.best, 3)}` +
            ` at 66 ${pad(r.streak, 3)} resets ${pad(r.resets, 3)} last 28 ${pad(r.recent, 6)} story ${highlightWith(s.p, r.best)}`,
        );
      }
      const h = habitStreaks(s.p);
      out.push(
        `  ${pad('Per habit, one missed opportunity tolerated', 44)} ` +
          h
            .map((x) => `${x.id} best ${x.best} now ${x.streak} (${x.kept}/${x.of}${x.kind === 'weekly' ? ' wk' : ''})`)
            .join('; '),
      );
    }
    say('\n===== PEOPLE' + out.join('\n'));
  });

  it('checkpoints for A and B: the streak on Days 7, 12, 14, 21, 30, 44 and 66', () => {
    const at = [7, 12, 14, 21, 30, 44, 66];
    const out: string[] = [];
    for (const s of sims.filter((x) => ['A', 'A+min', 'B', 'B+min'].includes(x.key)))
      for (const m of [MODELS[0], MODELS[1], MODELS[3], MODELS[5]]) {
        const r = judge(s.p, m);
        out.push(`${pad(s.key, 6)} ${pad(m.key, 12)} ${at.map((d) => `D${d}:${r.run[d - 1]}`).join(' ')}`);
      }
    say('\n===== CHECKPOINTS\n' + out.join('\n'));
  });

  it('1–6 habits under set patterns', () => {
    const out: string[] = [];
    out.push(`${pad('pattern', 34)} n | ` + MODELS.map((m) => pad(m.key, 14)).join('') + 'per habit (Read: best/now)');
    for (const pat of PATTERNS)
      for (let n = 1; n <= 6; n++) {
        const p = simulate(startN(n), pat.b);
        const cells = MODELS.map((m) => {
          const r = judge(p, m);
          return pad(`${r.counted + r.kept}d ${r.best}/${r.streak}`, 14);
        });
        const read = habitStreaks(p).find((h) => h.id === ONE)!;
        out.push(`${pad(pat.label, 34)} ${n} | ${cells.join('')}${read.best}/${read.streak}`);
      }
    say('\n===== MATRIX (days counted or kept, best streak / streak at Day 66)\n' + out.join('\n'));
  });

  it('fairness: the same effort per habit, 1–6 habits (random, 30 seeds each)', () => {
    const out: string[] = [];
    const spread: Record<string, number[]> = {};
    for (const q of [0.9, 0.8, 0.6]) {
      out.push(`\nEach habit done on a day with probability ${q}`);
      out.push(`${pad('n', 3)}| ` + MODELS.map((m) => pad(m.key, 16)).join('') + 'per habit best');
      const bests: Record<string, number[]> = {};
      for (let n = 1; n <= 6; n++) {
        const runs = Array.from({ length: 30 }, (_, i) => simulate(startN(n), randomly(q, 1000 * n + i + q * 7)));
        const cells = MODELS.map((m) => {
          const rs = runs.map((p) => judge(p, m));
          const days = rs.reduce((a, r) => a + r.counted + r.kept, 0) / rs.length;
          const best = rs.reduce((a, r) => a + r.best, 0) / rs.length;
          (bests[m.key] ??= []).push(best);
          return pad(`${days.toFixed(0)}d best ${best.toFixed(1)}`, 16);
        });
        const hb = runs.flatMap((p) => habitStreaks(p).map((h) => h.best));
        const habitBest = hb.reduce((a, b) => a + b, 0) / hb.length;
        (bests.perHabit ??= []).push(habitBest);
        out.push(`${pad(n, 3)}| ${cells.join('')}${habitBest.toFixed(1)}`);
      }
      for (const [k, v] of Object.entries(bests)) (spread[`${k}@${q}`] ??= []).push(...v);
    }
    // How much the best streak depends on the number of habits alone, for the same effort per habit: the largest
    // average best streak across habit counts ÷ the smallest (1 = fair), over 1–6 habits and over set-up's 2–4.
    out.push('\nBest streak, largest ÷ smallest across habit counts (1 = the same effort gives the same streak):');
    for (const [k, v] of Object.entries(spread)) {
      const ratio = (xs: number[]) => (Math.max(...xs) / Math.min(...xs)).toFixed(1);
      out.push(`  ${pad(k, 20)} 1–6 habits ${pad(ratio(v), 5)} 2–4 habits ${ratio(v.slice(1, 4))}`);
    }
    say('\n===== FAIRNESS' + out.join('\n'));
  });

  it('existing saves: re-scored with the recommendation, no number goes down', () => {
    const rec = MODELS.find((m) => m.key === 'recommended')!;
    const programs = [
      ...sims.map((s) => s.p),
      ...PATTERNS.flatMap((pat) => [1, 2, 3, 4, 5, 6].map((n) => simulate(startN(n), pat.b))),
      ...Array.from({ length: 60 }, (_, i) => simulate(startN((i % 6) + 1), randomly(0.5 + (i % 5) / 10, i))),
    ];
    for (const p of programs) {
      const before = judge(p, MODELS[0]);
      const after = judge(p, rec);
      expect(after.counted).toBeGreaterThanOrEqual(before.counted);
      expect(after.counted + after.kept).toBeGreaterThanOrEqual(before.counted + before.kept);
      expect(after.best).toBeGreaterThanOrEqual(before.best);
      expect(after.streak).toBeGreaterThanOrEqual(before.streak);
      // Day by day: a day that counted still counts; a kept day is kept or counted.
      before.outcomes.forEach((o, i) => {
        if (o === 'counted') expect(after.outcomes[i]).toBe('counted');
        if (o === 'kept') expect(['counted', 'kept']).toContain(after.outcomes[i]);
        if (o === 'rest') expect(after.outcomes[i]).toBe('rest');
      });
    }
    say(
      `\n===== MONOTONE over ${programs.length} programs: no counted day, kept day, best or current streak decreased`,
    );
  });

  it('the recommendation’s numbers for A, B and C (pinned for the decision document)', () => {
    const rec = MODELS.find((m) => m.key === 'recommended')!;
    const pick = (k: string) => {
      const r = judge(sims.find((s) => s.key === k)!.p, rec);
      return { counted: r.counted, kept: r.kept, best: r.best, streak: r.streak };
    };
    expect(pick('A')).toEqual({ counted: 13, kept: 0, best: 13, streak: 0 });
    expect(pick('A+min')).toEqual({ counted: 13, kept: 22, best: 16, streak: 1 });
    expect(pick('B')).toEqual({ counted: 51, kept: 0, best: 47, streak: 47 });
    expect(pick('B+min')).toEqual({ counted: 51, kept: 8, best: 55, streak: 55 });
    expect(pick('C')).toEqual({ counted: 66, kept: 0, best: 66, streak: 66 });
    // The engine gives the same numbers; the rule before (80% rounded up, no grace) gave the audit's
    // (docs/66_DAY_EXPERIENCE_AUDIT.md §2).
    const engine = (k: string) => P.journeyStats(sims.find((s) => s.key === k)!.p, PROGRAM_DAYS);
    expect([engine('A').done, engine('A').best, engine('B').done, engine('B').best]).toEqual([13, 13, 51, 47]);
    const before = (k: string) => judge(sims.find((s) => s.key === k)!.p, MODELS[0]);
    expect([before('A').counted, before('A').best, before('B').counted, before('B').best]).toEqual([7, 7, 50, 6]);
  });
});
