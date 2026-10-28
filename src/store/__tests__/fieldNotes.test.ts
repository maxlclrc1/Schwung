import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay } from '../../core/dates';
import type { Answers } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { previewPlan } from '../../core/v2/program';
import { fieldNotesAvailable, fieldNotesKey, fnToday, sanitizeFieldNotes, useFieldNotes } from '../fieldNotes';
import { useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(file: string, encoding: 'utf8'): string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const f = () => useFieldNotes.getState();
const s = () => useApp.getState();
const ADULT = { age: '18_29' as const, precautions: [] as [], fromSchwung: false };
const at = (day: number) => f().setDevDayOffset(day - 1);
const schwungSnapshot = () => {
  const { startedAt, plan, logs, programVersion, profile, notices, seenCeremonies, appliedPhase, answers } = s();
  return JSON.parse(
    JSON.stringify({ startedAt, plan, logs, programVersion, profile, notices, seenCeremonies, appliedPhase, answers }),
  );
};

beforeEach(async () => {
  f().reset();
  f().setDevDayOffset(0);
  s().restart();
  s().setDevDayOffset(0);
  await wait(400);
});

describe('Field Notes is separate from Schwung', () => {
  it('has its own save key, next to Schwung’s', () => {
    expect(fieldNotesKey('development', true)).toBe('schwung-fieldnotes');
    expect(fieldNotesKey('internal', true)).toBe('schwung-fieldnotes-internal');
    expect(fieldNotesKey('internal', false)).toBe('schwung-fieldnotes');
    expect(fieldNotesKey('internal', true)).not.toBe('schwung-state-internal');
  });

  it('starting, recording, deciding and restarting never touch a running Schwung program or its save', async () => {
    s().setProfile(FIXTURES['C · 28, energy']);
    const r = previewPlan(FIXTURES['C · 28, energy']);
    if (r.status !== 'ok') throw new Error();
    expect(s().startProgramV2(r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id))).toBe(true);
    s().toggleHabit(1, s().plan[0].habitId);
    await wait(400);
    const before = schwungSnapshot();
    const disk = await AsyncStorage.getItem('schwung-state');

    expect(f().start('focus', ADULT, 'focus_read', s().profile)).toBe(true);
    for (let d = 1; d <= 14; d++) {
      at(d);
      f().record(d <= 3 ? { rating: 3 } : { tried: true, rating: 4 });
      if (d === 7) f().setCheckIn('okay');
      if (d === 11) expect(f().decide('keep')).toBe(true);
    }
    f().finish();
    f().reset();
    await wait(400);
    expect(schwungSnapshot()).toEqual(before);
    expect(await AsyncStorage.getItem('schwung-state')).toBe(disk);
  });

  it('is retired in every build: no screens, no entry points, no reminders (Insights took its tab)', () => {
    for (const ch of ['production', 'internal', 'development'] as const) expect(fieldNotesAvailable(ch)).toBe(false);
    const exists = (f: string) => {
      try {
        fs.readFileSync(`${process.cwd()}/src/${f}`, 'utf8');
        return true;
      } catch {
        return false;
      }
    };
    for (const f of ['app/(tabs)/fieldnotes.tsx', 'app/fieldnotes/setup.tsx', 'app/fieldnotes/note.tsx'])
      expect([f, exists(f)]).toEqual([f, false]);
    for (const f of ['app/welcome.tsx', 'app/settings.tsx', 'app/index.tsx', 'app/(tabs)/_layout.tsx'])
      expect([f, fs.readFileSync(`${process.cwd()}/src/${f}`, 'utf8').includes('/fieldnotes')]).toEqual([f, false]);
  });

  it('keeps saved Field Notes data loadable and untouched (never deleted automatically)', async () => {
    f().start('focus', ADULT, 'focus_read', null);
    f().record({ rating: 3 });
    await wait(400);
    const disk = await AsyncStorage.getItem('schwung-fieldnotes');
    // A relaunch: memory cleared, the save on disk loaded again.
    useFieldNotes.setState({ run: null });
    await wait(400);
    await AsyncStorage.setItem('schwung-fieldnotes', disk!);
    await useFieldNotes.persist.rehydrate();
    expect(f().run?.days).toEqual(JSON.parse(disk!).state.run.days);
    expect(await AsyncStorage.getItem('schwung-fieldnotes')).toBe(disk);
  });
});

describe('the 14 days', () => {
  it('records only today; starting days never record "tried"; missing days stay missing', () => {
    f().start('energy', ADULT, 'energy_daylight', null);
    at(2);
    f().record({ tried: true, rating: 2 });
    const run = f().run!;
    expect(run.days[dateForDay(run.startedAt, 2)]).toEqual({ rating: 2 });
    expect(run.days[dateForDay(run.startedAt, 1)]).toBeUndefined();
    at(5);
    f().record({ tried: false, when: 'morning' });
    expect(f().run!.days[dateForDay(run.startedAt, 5)]).toEqual({ tried: false });
    f().record({ tried: true, when: 'morning', rating: 4 });
    f().clearRating();
    expect(f().run!.days[dateForDay(run.startedAt, 5)]).toEqual({ tried: true, when: 'morning' });
    at(20);
    f().record({ rating: 5 });
    expect(Object.keys(f().run!.days)).toHaveLength(2); // nothing recorded after day 14
  });

  it('the decision waits for day 11; "easier" and "different" set what is carried forward', () => {
    f().start('focus', ADULT, 'focus_read', null);
    at(10);
    expect(f().decide('keep')).toBe(false);
    at(11);
    expect(f().decide('easier')).toBe(true);
    expect(f().run!.next).toEqual({ action: 'Read one page' });
    expect(f().decide('different', 'focus_read')).toBe(false); // not the same experiment
    expect(f().decide('different', 'focus_block')).toBe(true);
    expect(f().run!.next?.experimentId).toBe('focus_block');
  });

  it('finishing keeps a complete field note; finishing early discards only Field Notes', () => {
    f().start('calm', ADULT, 'calm_journal', null);
    at(5);
    f().finish();
    expect(f().archive).toHaveLength(0);
    f().setDevDayOffset(0);
    f().start('calm', ADULT, 'calm_journal', null);
    at(14);
    f().record({ tried: true, rating: 4 });
    f().decide('keep');
    f().finish();
    expect(f().archive).toHaveLength(1);
    expect(f().archive[0]).toMatchObject({
      goal: 'calm',
      decision: 'keep',
      next: { action: 'Write 1 sentence about your day' },
    });
    expect(f().run).toBeNull();
  });

  it('refuses an experiment that isn’t on offer for these answers', () => {
    expect(f().start('energy', { ...ADULT, precautions: 'unknown' }, 'energy_walk', null)).toBe(false);
    expect(f().start('energy', { ...ADULT, precautions: ['heart'] }, 'energy_walk', null)).toBe(false);
    expect(f().run).toBeNull();
  });

  it('survives a restart of the app, day by day', async () => {
    f().start('confidence', ADULT, 'confidence_reach_out', null);
    at(4);
    f().record({ tried: true, rating: 3, when: 'evening' });
    await wait(400);
    const saved = JSON.parse(JSON.stringify(f().run));
    // A cold start: whatever is on disk now is what the next launch loads, after memory is wiped.
    const disk = await AsyncStorage.getItem('schwung-fieldnotes');
    expect(disk).not.toBeNull();
    useFieldNotes.setState({ run: null });
    await wait(400);
    await AsyncStorage.setItem('schwung-fieldnotes', disk!);
    await useFieldNotes.persist.rehydrate();
    expect(f().run).toEqual(saved);
    expect(fnToday()).toBe(4);
  });

  it('damaged notes are dropped, never turned into zeros', () => {
    const out = sanitizeFieldNotes({
      active: true,
      run: {
        startedAt: '2026-03-02',
        goal: 'focus',
        profile: ADULT,
        experiment: { id: 'focus_read', habitId: 'mind_read', question: 'q', action: 'Read' },
        days: {
          '2026-03-02': { rating: 0 },
          '2026-03-03': { rating: '3', tried: 'yes' },
          '2026-03-04': { rating: 6, when: 'night' },
          '2026-03-05': { rating: 4, tried: true, when: 'morning' },
          nonsense: { rating: 3 },
        },
      },
    });
    expect(out.run!.days).toEqual({
      '2026-03-02': {},
      '2026-03-03': {},
      '2026-03-04': {},
      '2026-03-05': { rating: 4, tried: true, when: 'morning' },
    });
    expect(sanitizeFieldNotes(null)).toEqual({});
    expect(sanitizeFieldNotes({ run: { startedAt: 'yesterday' } }).run).toBeUndefined();
  });

  it('a V1 program and Field Notes coexist; switching back changes nothing in Schwung', () => {
    s().setAnswers({
      goal: 'calm',
      sleep: '6-7h',
      screen: '6-8h',
      exercise: 'rarely',
      water: '0.5-1L',
      mind: 'rarely',
    } as Answers);
    expect(s().startProgram()).toBe(true);
    const before = schwungSnapshot();
    f().setActive(true);
    f().start('focus', ADULT, 'focus_block', null);
    f().setActive(false);
    expect(schwungSnapshot()).toEqual(before);
    expect(s().programVersion).toBe(1);
  });
});
