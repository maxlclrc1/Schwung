/*
 * 66-day experience audit (docs/66_DAY_EXPERIENCE_AUDIT.md): three simulated people run through the real program
 * engine (core/reset/pilot.ts and what it joins), day by day. Read-only: nothing here changes the app.
 *
 * Opt-in, so the regular suite is unaffected:  AUDIT=1 npx jest scripts/audit
 * It prints each person's checkpoint days and asserts the engine behaviours the audit relies on.
 */
import { describe, expect, it } from '@jest/globals';
import { PROGRAM_DAYS } from '../../../src/core/dates';
import { playerLevel } from '../../../src/core/progression';
import { DEFAULT_REMINDERS, planReminders } from '../../../src/core/reminders';
import * as C from '../../../src/core/reset/charts';
import { growth } from '../../../src/core/reset/collection';
import { absenceStart } from '../../../src/core/reset/comeback';
import * as P from '../../../src/core/reset/pilot';
import type { Offer } from '../../../src/core/reset/readiness';
import { dueReflection } from '../../../src/core/reset/reflections';
import { storyFacts } from '../../../src/core/reset/story';

const run = process.env.AUDIT ? describe : describe.skip;
const START = '2026-01-05'; // a Monday: program weeks are calendar weeks
const CHECK = [1, 7, 14, 21, 30, 44, 45, 66];

const phaseOf = (d: number) => (d >= 45 ? 'Mastery' : d >= 22 ? 'Momentum' : 'Foundation');
const lvl = (p: P.PilotProgram, id: string, d: number) => {
  const l = P.levelFor(p, id, d);
  return `${l.intensity}/${l.phase}`;
};

type Behaviour = {
  /** Which of the habits asked of the day the person does (ids), given the day. */
  does: (d: number, asked: string[]) => string[];
  /** What the person does with an offer: accept, decline, or leave it (ignore). */
  onOffer: (d: number, o: { habitId: string; offer: Offer }) => 'accept' | 'decline' | 'ignore';
  /** Feedback the person gives on a day ("too easy"/"too hard"), per habit. */
  feedback?: (d: number, id: string) => 'too-easy' | 'too-hard' | null;
  /** Whether the person opens the app that day (default: yes). Only an opened app shows offers, moments, notes. */
  opens?: (d: number) => boolean;
  /** The weekly reflection answer (default: "about right"). */
  reflect?: (week: number) => 'easier' | 'right' | 'harder';
};

type Row = Record<string, string | number | boolean | null>;

/** The habits the day asks for, as Habits shows them: due daily habits, and weekly ones still open. */
const askedOn = (p: P.PilotProgram, d: number) =>
  p.habits.filter((id) => ['due', 'open'].includes(P.stateOn(p, id, d)));

function simulate(p0: P.PilotProgram, b: Behaviour, last = PROGRAM_DAYS) {
  let p = p0;
  const rows: Row[] = [];
  const events: string[] = [];
  const offersSeen: string[] = [];
  for (let d = 1; d <= last; d++) {
    const opened = b.opens?.(d) ?? true;
    // Morning: what the app would show before anything is done today (only if it's opened).
    const offers = opened ? P.offersNow(p, d, false) : [];
    for (const o of offers) {
      const choice = b.onOffer(d, o);
      offersSeen.push(`D${d} ${o.habitId} ${o.offer.kind} → ${o.offer.to.intensity}/${o.offer.to.phase}: ${choice}`);
      if (choice === 'accept') p = P.accept(p, o.habitId, o.offer, d);
      if (choice === 'decline') p = P.decline(p, o.habitId, o.offer, d);
    }
    const cells = C.dayCells(p, d);
    const absence = opened ? absenceStart(cells, d) : null;
    const milestone = opened ? P.milestoneDue(p, d) : null;
    const reflection = opened ? dueReflection(p.reflections, d) : null;
    if (milestone) {
      events.push(`D${d} milestone ${milestone}`);
      p = { ...p, ceremonies: { ...p.ceremonies, milestones: [...(p.ceremonies?.milestones ?? []), milestone] } };
    }
    if (absence !== null && p.comeback?.seen !== absence) {
      events.push(`D${d} welcome back (absence from D${absence})`);
      p = { ...p, comeback: { seen: absence } };
    }
    if (reflection) {
      // Everyone answers the invitation the day it appears ("about right" unless the behaviour says otherwise).
      const answer = b.reflect?.(reflection) ?? 'right';
      if (answer !== 'right') events.push(`D${d} reflection week ${reflection}: ${answer}`);
      p = { ...p, reflections: { ...p.reflections, [reflection]: { week: reflection, answer, day: d } } };
    }
    for (const id of p.habits) {
      const f = b.feedback?.(d, id);
      if (f) p = P.feedback(p, id, f, d);
    }
    const asked = askedOn(p, d);
    if (opened) for (const id of b.does(d, asked)) p = P.complete(p, id, d).program;
    if (opened && P.summitDue(p, d)) {
      events.push(`D${d} summit`);
      p = { ...p, ceremonies: { ...p.ceremonies, summit: true } };
    }
    const stats = P.journeyStats(p, d);
    rows.push({
      day: d,
      opened,
      phase: phaseOf(d),
      asked: asked.length,
      done: asked.filter((id) => P.isDone(p, id, d)).length,
      result: P.dayResult(p, d),
      full: P.dayFull(p, d),
      streak: stats.streak,
      best: stats.best,
      counted: stats.done,
      xp: P.pilotXp(p),
      level: playerLevel(P.pilotXp(p)),
      collection: growth(P.pilotXp(p)).rank,
      offers: offers.map((o) => `${o.habitId}:${o.offer.kind}`).join(' ') || '-',
      levels: p.habits.map((id) => `${id}=${lvl(p, id, d)}`).join(' '),
      minutes: P.busiestDayMinutes(p.habits.map((id) => ({ habitId: id, level: P.levelFor(p, id, d) }))),
      milestone,
      reflection,
      welcome: absence,
    });
  }
  return { p, rows, events, offersSeen };
}

const show = (name: string, r: ReturnType<typeof simulate>) => {
  const lines = r.rows.filter((x) => CHECK.includes(x.day as number)).map((x) => JSON.stringify(x));
  console.log(
    `\n===== ${name}\n${lines.join('\n')}\nEVENTS ${r.events.join(' | ')}\nOFFERS (${r.offersSeen.length}) ${r.offersSeen.slice(0, 40).join(' | ')}`,
  );
};

// --- The three people ---

const answersA: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 45,
  activeDays: '1_2',
  wake: { kind: 'time', time: '07:00' },
};
const startA = () =>
  P.createPilot(
    answersA,
    ['mind_read', 'move_walk', 'sleep_wake', 'mind_meditation'].map((habitId) => ({
      habitId,
      intensity: P.suggestedIntensity(habitId, answersA)!,
    })),
    START,
  )!;
/** A: everything in week 1; one habit dropped in week 2; from Day 14 two habits on two days in three; from Day 31
 *  one habit every other day; gone Days 51–65; back on Day 66 for one habit. */
const behaviourA: Behaviour = {
  does: (d, asked) => {
    if (d <= 7) return asked;
    if (d <= 13) return asked.filter((id) => id !== 'mind_meditation');
    if (d <= 30) return d % 3 === 0 ? [] : asked.filter((id) => id === 'mind_read' || id === 'sleep_wake');
    if (d <= 50) return d % 2 === 0 ? asked.filter((id) => id === 'sleep_wake') : [];
    if (d <= 65) return [];
    return asked.filter((id) => id === 'sleep_wake');
  },
  onOffer: () => 'ignore',
  opens: (d) => !(d >= 51 && d <= 65),
  reflect: (w) => (w >= 2 ? 'harder' : 'right'),
};

const answersB: P.PilotAnswers = {
  age: '18_29',
  precautions: [],
  minutesPerDay: 45,
  activeDays: '3_4',
  wake: { kind: 'time', time: '06:30' },
};
const startB = () =>
  P.createPilot(
    answersB,
    ['mind_read', 'move_walk', 'sleep_wake'].map((habitId) => ({
      habitId,
      intensity: P.suggestedIntensity(habitId, answersB)!,
    })),
    START,
  )!;
/** B: four good days, then a week away (Days 5–11), back on Day 12 with two of three, then steady with a miss a
 *  week; accepts an easier target when offered. */
const behaviourB: Behaviour = {
  does: (d, asked) => {
    if (d <= 4) return asked;
    if (d <= 11) return [];
    if (d === 12) return asked.slice(0, 2);
    return d % 7 === 6 ? [] : asked;
  },
  onOffer: (_d, o) => (o.offer.kind === 'step-down' ? 'accept' : 'decline'),
  opens: (d) => !(d >= 5 && d <= 11),
};

const answersC: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 90,
  activeDays: '5p',
  wake: { kind: 'time', time: '06:00' },
  strengthStart: 'regular',
  ownSessions: 3,
};
const startC = () =>
  P.createPilot(
    answersC,
    ['focus_top3', 'mind_read', 'move_walk', 'sleep_wake', 'strength_log'].map((habitId) => ({
      habitId,
      intensity: P.suggestedIntensity(habitId, answersC)!,
    })),
    START,
  )!;
/** C: everything asked, every day; accepts every step up; says "too easy" on Day 8 of every habit. */
const behaviourC: Behaviour = {
  does: (_d, asked) => asked,
  onOffer: (_d, o) => (o.offer.kind === 'step-up' ? 'accept' : 'decline'),
  feedback: (d) => (d === 8 ? 'too-easy' : null),
};

run('66-day audit: three simulated people through the real engine', () => {
  it('prints the targets each habit asks at every level', () => {
    const out: string[] = [];
    for (const id of P.PILOT_HABITS) {
      const a: P.PilotAnswers = {
        ...answersC,
        phone: '4_6',
        pullMinutes: 120,
        skill: 'Language',
        strengthStart: 'sometimes',
      };
      for (const intensity of ['starter', 'standard', 'challenge'] as const) {
        const ok = !P.intensityOptions(id, a).find((o) => o.intensity === intensity)?.reason;
        if (!ok) continue;
        const cells = (['foundation', 'momentum', 'mastery'] as const).map((phase) => {
          const l = { intensity, phase };
          const p = P.createPilot(a, [{ habitId: id, intensity }], START)!;
          const q = {
            ...p,
            progression: { [id]: { ...p.progression[id], eras: [{ ...l, fromDay: 1, reason: 'start' as const }] } },
          };
          return `${phase}: ${P.targetText(q, id, 1)} (${P.frequencyText(q, id, 1)}, ${P.minutesFor(id, l)} min)`;
        });
        out.push(`${id} ${intensity} | ${cells.join(' | ')}`);
      }
    }
    console.log('\n===== TARGETS\n' + out.join('\n'));
  });

  it('User A, the enthusiastic starter who fades', () => {
    const r = simulate(startA(), behaviourA);
    show('USER A', r);
    const row = (d: number) => r.rows[d - 1];
    // Starting at Starter Foundation, a fading person is never offered anything easier: there is no step below.
    expect(r.offersSeen.filter((o) => o.includes('step-down'))).toEqual([]);
    expect(P.easier(r.p, 'mind_meditation', 20)).toHaveProperty('blocked');
    // Day 66 not complete: the summit (and its ceremony) waits for Day 67.
    expect(row(66).full).toBe(false);
    expect(P.summitDue(r.p, 66)).toBe(false);
    expect(P.summitDue(r.p, 67)).toBe(true);
    // After Day 66, nothing is tracked or reminded until a choice is made.
    expect(P.awaitingChoice(r.p, 67)).toBe(true);
    const plan = planReminders({ ...DEFAULT_REMINDERS, enabled: true }, r.p, new Date('2026-03-13T08:00:00'), {
      todayComplete: false,
      habitNames: [],
    });
    console.log('A reminders planned on Day 67:', plan.length);
    console.log('A story facts:', JSON.stringify(storyFacts(r.p, 67)));
  });

  it('User B, the inconsistent person who comes back', () => {
    const r = simulate(startB(), behaviourB);
    show('USER B', r);
    const d12 = r.rows[11];
    console.log('B day 12:', JSON.stringify(d12));
    console.log(
      'B days 11-16:',
      r.rows
        .slice(10, 16)
        .map((x) => `D${x.day} streak ${x.streak} offers ${x.offers} levels ${x.levels}`)
        .join(' || '),
    );
    // The welcome back appears once, on the day they return, and changes nothing about the day.
    expect(r.events.some((e) => e.startsWith('D12 welcome back'))).toBe(true);
    // Their targets on return are what they were before the absence (nothing eased automatically).
    expect(lvl(r.p, 'move_walk', 12)).toBe(lvl(r.p, 'move_walk', 4));
  });

  it('User C, the ambitious person who wants more', () => {
    const r = simulate(startC(), behaviourC);
    show('USER C', r);
    for (const id of r.p.habits) {
      const tried = P.harder(r.p, id, 66);
      console.log(
        `C at Day 66, ${id}: ${lvl(r.p, id, 66)}; make harder → ${'blocked' in tried ? `blocked: ${tried.blocked}` : `${tried.level.intensity}/${tried.level.phase}`}`,
      );
    }
    console.log(
      'C level history:',
      JSON.stringify(
        Object.fromEntries(
          r.p.habits.map((id) => [
            id,
            r.p.progression[id].eras.map((e) => `${e.intensity}/${e.phase}@${e.fromDay}(${e.reason})`),
          ]),
        ),
      ),
    );
  });

  it('After the summit: Keep My Momentum, an absence, and the welcome back', () => {
    const r = simulate(startC(), behaviourC);
    let p = P.keepMomentum({ ...r.p, ceremonies: { ...r.p.ceremonies, summit: true } }, 67);
    for (let d = 67; d <= 80; d++) for (const id of askedOn(p, d)) p = P.complete(p, id, d).program;
    // Away Days 81–90, back on Day 91.
    const cells = C.dayCells(p, 91);
    console.log('Momentum: cells cover', cells.length, 'days; welcome back on Day 91 →', absenceStart(cells, 91));
    console.log('Momentum stats Day 91:', JSON.stringify(P.sinceSummit(p, 91)), 'streak', P.pilotStreak(p, 91));
    console.log(
      'Offers after Day 66:',
      P.offersNow(p, 91, false).length,
      '| reflection due:',
      dueReflection(p.reflections, 91),
    );
    expect(absenceStart(cells, 91)).toBeNull();
  });
  it('Probes: the 80% rule, overload at set-up, step-ups that change nothing, and a "harder" week at Starter', () => {
    // How many habits of a day must be done for it to count, by number of daily habits.
    const need = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${n} habits → ${Math.ceil(n * 0.8 - 1e-9)} needed`);
    console.log('80% rule:', need.join(', '));
    // Everything at once: all 11 habits at Starter with the most time a day.
    const all: P.PilotAnswers = {
      ...answersC,
      minutesPerDay: 180,
      phone: '4_6',
      pullMinutes: 120,
      skill: 'Language',
      strengthStart: 'new',
    };
    const choices = P.PILOT_HABITS.map((habitId) => ({ habitId, intensity: P.suggestedIntensity(habitId, all)! }));
    console.log(
      'All 11 at set-up: problems',
      JSON.stringify(P.setupProblems(all, choices)),
      'minutes on the busiest day',
      P.busiestDayMinutes(
        choices.map((c) => ({ habitId: c.habitId, level: { intensity: c.intensity, phase: 'foundation' as const } })),
      ),
    );
    const at45 = { ...all, minutesPerDay: 45 };
    const six = ['mind_read', 'mind_meditation', 'sleep_wake', 'eat_well', 'outdoor_time', 'social_reach_out'].map(
      (habitId) => ({ habitId, intensity: 'starter' as const }),
    );
    console.log('Six habits in 45 min/day: problems', JSON.stringify(P.setupProblems(at45, six)));
    // Step-ups whose target is the same as the current one.
    const same: string[] = [];
    for (const id of P.PILOT_HABITS)
      for (const intensity of ['starter', 'standard', 'challenge'] as const)
        for (const [from, to] of [
          ['foundation', 'momentum'],
          ['momentum', 'mastery'],
        ] as const) {
          const p = P.createPilot(
            all,
            [
              {
                habitId: id,
                intensity:
                  P.intensityOptions(id, all).find((o) => o.intensity === intensity && !o.reason)?.intensity ??
                  'starter',
              },
            ],
            START,
          );
          if (!p) continue;
          const at = (phase: 'foundation' | 'momentum' | 'mastery') => ({
            ...p,
            progression: {
              [id]: { ...p.progression[id], eras: [{ intensity, phase, fromDay: 1, reason: 'start' as const }] },
            },
          });
          if (
            P.targetText(at(from), id, 1) === P.targetText(at(to), id, 1) &&
            P.frequencyText(at(from), id, 1) === P.frequencyText(at(to), id, 1)
          )
            same.push(`${id} ${intensity} ${from}→${to}`);
        }
    console.log(`Step-ups that change nothing (${same.length}):`, same.join(', '));
    // A, at Starter, says the week felt harder: what can be made easier?
    const a = simulate(startA(), behaviourA, 15).p;
    console.log(
      'A on Day 15, make easier:',
      a.habits
        .map((id) => {
          const r = P.easier(a, id, 15);
          return `${id}: ${'blocked' in r ? 'blocked (' + r.blocked + ')' : 'ok'}`;
        })
        .join('; '),
    );
    console.log('A can remove a habit on Day 15:', P.removeProblem(a, 'mind_meditation') ?? 'yes');
  });
});
