import { describe, expect, it } from '@jest/globals';
import { buildExport, EXPORT_CONTAINS, EXPORT_SCHEMA_VERSION } from '../dataExport';
import { DEFAULT_REMINDERS } from '../reminders';
import * as P from '../reset/pilot';
import { ABANDONED_MS, filesToClean, parseTempName, tempName } from '../tempFiles';

const start = () =>
  P.createPilot(
    { age: '30_49', precautions: ['heart'], minutesPerDay: 60, wake: { kind: 'time', time: '06:45' } },
    [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'sleep_wake', intensity: 'starter' },
    ],
    '2026-11-02',
  )!;

describe('Export my data', () => {
  it('says up front that it may hold health, sleep and activity information', () => {
    const text = EXPORT_CONTAINS.join(' ');
    expect(text).toMatch(/health/i);
    expect(text).toMatch(/sleep/i);
    expect(text).toMatch(/activity/i);
    expect(text).toMatch(/reflections/i);
  });

  it('holds everything kept, readable and in full, with a schema version and date', () => {
    let p = P.complete(start(), 'mind_read', 1).program;
    p = {
      ...p,
      reflections: { 1: { week: 1, day: 8, answer: 'right' } },
      collection: { unlocked: ['compass'] },
      ceremonies: { day1: true },
      measures: {
        screen_app_limit: {
          1: { v: 1, habitId: 'screen_app_limit', week: 1, minutesPerDay: 45, source: 'self-reported' },
        },
      },
    };
    const out = buildExport({
      saveVersion: 1,
      program: p,
      today: 9,
      themePreference: 'dark',
      reminders: { ...DEFAULT_REMINDERS, enabled: true },
      comebacks: true,
      recoveryCopies: ['damaged text'],
      now: new Date('2026-11-10T08:00:00Z'),
    });
    expect(out).toMatchObject({ schema: 'schwung-data-export', schemaVersion: EXPORT_SCHEMA_VERSION });
    expect(out.exportedAt).toBe('2026-11-10T08:00:00.000Z');
    const life = out.lifeReset!;
    expect(life.setupAnswers.precautions).toEqual(['heart']);
    expect(life.setupAnswers.wake).toEqual({ kind: 'time', time: '06:45' });
    expect(life.habits.map((h) => h.name)).toEqual(['Read Daily', 'Sleep Routine']);
    expect(life.completionHistory[0]).toMatchObject({ day: 1, completed: ['mind_read'] });
    expect(life.weeklyReflections).toEqual([{ week: 1, day: 8, answer: 'right' }]);
    expect(life.screenTimeEntries[0]).toMatchObject({ minutesPerDay: 45 });
    expect(life.achievements.collection).toEqual(['The Compass']);
    // Nothing left out: the program exactly as saved.
    expect(life.savedProgram).toBe(p);
    expect(out.preferences.reminders.enabled).toBe(true);
    expect(out.recoveryCopies).toEqual(['damaged text']);
  });

  it('still exports preferences and recovery copies without a program', () => {
    const out = buildExport({
      saveVersion: 1,
      program: null,
      today: 0,
      themePreference: 'system',
      reminders: DEFAULT_REMINDERS,
      comebacks: false,
      recoveryCopies: [],
      now: new Date(),
    });
    expect(out.lifeReset).toBeNull();
    expect(out.preferences.welcomeBackMessages).toBe(false);
  });
});

describe('temporary share files', () => {
  it('only ever cleans Schwung’s own temporary files, and only once they’re old enough', () => {
    const now = 1_800_000_000_000;
    const fresh = tempName('data', 'json', now - 1000);
    const old = tempName('story', 'png', now - ABANDONED_MS - 1);
    const names = [fresh, old, 'schwung-reset-pilot-recovery', 'IMG_0001.png', 'story-abc.png', 'data-12.json'];
    expect(filesToClean(names, now, ABANDONED_MS)).toEqual([old]);
    expect(parseTempName('recovery-1800000000000.txt')).toEqual({ kind: 'recovery', at: 1_800_000_000_000 });
    expect(parseTempName('../data-1800000000000.json')).toBeNull();
  });
});
