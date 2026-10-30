import { describe, expect, it } from '@jest/globals';
import { buildExport, EXPORT_SCHEMA_VERSION } from '../dataExport';
import { MAX_BACKUP_BYTES, readBackup, summarizeBackup, type SaveFormat } from '../dataImport';
import { DEFAULT_REMINDERS } from '../reminders';
import * as P from '../reset/pilot';

const start = () =>
  P.createPilot(
    { age: '30_49', precautions: ['heart'], minutesPerDay: 60 },
    [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'home_tidy', intensity: 'starter' },
    ],
    '2026-11-02',
  )!;

const progressed = () => {
  let p = P.complete(start(), 'mind_read', 1).program;
  p = P.complete(p, 'home_tidy', 1).program;
  return {
    ...p,
    reflections: { 1: { week: 1, day: 8, answer: 'right' as const } },
    collection: { unlocked: ['compass'] },
    ceremonies: { day1: true },
  };
};

const exported = (program: P.PilotProgram | null, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    ...buildExport({
      program,
      saveVersion: 1,
      journeys: [],
      today: 2,
      themePreference: 'dark',
      reminders: { ...DEFAULT_REMINDERS, enabled: true, hour: 7, minute: 30 },
      comebacks: false,
      recoveryCopies: [],
      now: new Date('2026-11-04T09:00:00Z'),
    }),
    ...extra,
  });

const migrations: Record<number, (s: unknown) => unknown> = { 0: (s) => s };
const FORMAT: SaveFormat = {
  version: 1,
  migrate: (state, from) => {
    let s = state;
    for (let v = from; v < 1; v++) {
      if (!migrations[v]) throw new Error('no way');
      s = migrations[v](s);
    }
    return s;
  },
};

describe('Restore from backup: reading a file', () => {
  it('restores everything: habits, history, XP, collectibles, reflections, ceremonies and preferences', () => {
    const p = progressed();
    const r = readBackup(exported(p), FORMAT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.program).toEqual(p);
    expect(P.pilotXp(r.backup.program)).toBe(P.pilotXp(p));
    expect(r.backup.exportedAt).toBe('2026-11-04T09:00:00.000Z');
    expect(r.backup.preferences).toEqual({
      themePreference: 'dark',
      reminders: { ...DEFAULT_REMINDERS, enabled: true, hour: 7, minute: 30 },
      comebacks: false,
    });
  });

  it('reads exports made before they recorded the save format, and older formats through the migrations', () => {
    const p = progressed();
    const noField = JSON.parse(exported(p));
    delete noField.saveVersion;
    expect(readBackup(JSON.stringify(noField), FORMAT).ok).toBe(true);
    expect(readBackup(exported(p, { saveVersion: 0 }), FORMAT).ok).toBe(true);
  });

  it('summarizes where the Life Reset stands', () => {
    const s = summarizeBackup(progressed(), '2026-11-04');
    expect(s).toMatchObject({ day: 3, summit: false, habits: 2, daysDone: 1, collectibles: 1, reflections: 1 });
    expect(summarizeBackup(progressed(), '2027-03-01').summit).toBe(true);
  });

  it('refuses files that aren’t Schwung backups, without throwing', () => {
    for (const text of ['', 'not json', '[]', '{}', '{"schema":"other","schemaVersion":1}', 'null', '"x"'])
      expect(readBackup(text, FORMAT)).toEqual({ ok: false, problem: 'notBackup' });
  });

  it('refuses a file that is too large before parsing it', () => {
    expect(readBackup('', FORMAT, MAX_BACKUP_BYTES + 1)).toEqual({ ok: false, problem: 'tooLarge' });
  });

  it('refuses newer and unsupported versions', () => {
    const p = progressed();
    expect(readBackup(exported(p, { schemaVersion: EXPORT_SCHEMA_VERSION + 1 }), FORMAT)).toEqual({
      ok: false,
      problem: 'newerVersion',
    });
    expect(readBackup(exported(p, { saveVersion: 2 }), FORMAT)).toEqual({ ok: false, problem: 'newerVersion' });
    delete migrations[0];
    try {
      expect(readBackup(exported(p, { saveVersion: 0 }), FORMAT)).toEqual({
        ok: false,
        problem: 'unsupportedVersion',
      });
    } finally {
      migrations[0] = (s) => s;
    }
  });

  it('refuses a backup without a Life Reset', () => {
    expect(readBackup(exported(null), FORMAT)).toEqual({ ok: false, problem: 'noLifeReset' });
  });

  it('refuses a damaged or partial program as a whole, never restoring part of it', () => {
    const p = progressed();
    const cases: unknown[] = [
      { ...p, startedAt: 'yesterday' },
      { ...p, answers: { ...p.answers, age: 'u16' } },
      { ...p, habits: [] },
      { ...p, progression: { ...p.progression, mind_read: 'broken' } },
      { ...p, logs: { '2026-11-02': { nonsense: true } } },
      'a string',
    ];
    for (const savedProgram of cases) {
      const data = JSON.parse(exported(p));
      data.lifeReset.savedProgram = savedProgram;
      expect(readBackup(JSON.stringify(data), FORMAT)).toEqual({ ok: false, problem: 'damaged' });
    }
  });

  it('treats content as data only: unknown fields and prototype keys change nothing', () => {
    const p = progressed();
    const data = JSON.parse(exported(p));
    data.lifeReset.savedProgram.__proto__polluted = true;
    const text = JSON.stringify(data).replace('"lifeReset"', '"__proto__":{"polluted":true},"lifeReset"');
    const r = readBackup(text, FORMAT);
    expect(r.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('ignores malformed preferences instead of importing them', () => {
    const r = readBackup(
      exported(progressed(), { preferences: { theme: 'neon', welcomeBackMessages: 'yes' } }),
      FORMAT,
    );
    expect(r.ok && r.backup.preferences).toEqual({});
  });
});
