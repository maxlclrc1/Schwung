import { describe, expect, it } from '@jest/globals';
import { buildExport } from '../dataExport';
import { MAX_BACKUP_BYTES, readBackup, type SaveFormat } from '../dataImport';
import { DEFAULT_REMINDERS } from '../reminders';
import * as P from '../reset/pilot';

/*
 * A backup file is untrusted input. Thousands of corrupted versions of a real export (deleted fields, wrong types,
 * absurd numbers, injected prototype keys, truncation, flipped characters) must each be refused calmly or read in
 * full and valid: never an exception, never a half-read program, never a polluted object.
 */
const FORMAT: SaveFormat = {
  version: 1,
  migrate: (state, from) => {
    if (from !== 0 && from !== 1) throw new Error('no way');
    return state;
  },
};

function realExport() {
  let p = P.createPilot(
    { age: '30_49', precautions: ['heart'], minutesPerDay: 60 },
    [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'outdoor_time', intensity: 'starter' },
    ],
    '2026-11-02',
  )!;
  for (let d = 1; d <= 9; d++) for (const id of ['mind_read', 'outdoor_time']) p = P.complete(p, id, d).program;
  p = {
    ...p,
    reflections: { 1: { week: 1, day: 8, answer: 'right' as const } },
    collection: { unlocked: ['compass'] },
  };
  const journey = { v: 1 as const, id: 'j1', archivedAt: '2026-10-01T10:00:00.000Z', program: p };
  return buildExport({
    program: p,
    saveVersion: 1,
    journeys: [journey],
    today: 10,
    themePreference: 'dark',
    reminders: { ...DEFAULT_REMINDERS, enabled: true, hour: 7, minute: 30 },
    comebacks: false,
    recoveryCopies: [],
    now: new Date('2026-11-11T09:00:00Z'),
  });
}

// A small seeded generator, so a failure can be replayed.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type Json = unknown;
const paths = (x: Json, at: (string | number)[] = [], out: (string | number)[][] = []) => {
  out.push(at);
  if (Array.isArray(x)) x.forEach((v, i) => paths(v, [...at, i], out));
  else if (x && typeof x === 'object')
    for (const k of Object.keys(x)) paths((x as Record<string, Json>)[k], [...at, k], out);
  return out;
};

const WEIRD: Json[] = [
  null,
  '',
  'x',
  -1,
  0,
  1e308,
  -1e308,
  3.7,
  true,
  [],
  {},
  [null],
  { __proto__: { polluted: true } },
  '2026-02-30',
  '99:99',
  'u16',
  Array.from({ length: 2000 }, (_, i) => i),
];

function mutate(base: Json, r: () => number): string {
  const doc = JSON.parse(JSON.stringify(base));
  const all = paths(doc).filter((p) => p.length > 0);
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const p = all[Math.floor(r() * all.length)];
    let parent: Record<string | number, Json> = doc;
    for (const k of p.slice(0, -1)) {
      const next = parent?.[k];
      if (!next || typeof next !== 'object') break;
      parent = next as Record<string | number, Json>;
    }
    const key = p[p.length - 1];
    if (!parent || typeof parent !== 'object') continue;
    const roll = r();
    if (roll < 0.3) delete parent[key];
    else if (roll < 0.85) parent[key] = WEIRD[Math.floor(r() * WEIRD.length)];
    else (parent as Record<string, Json>)['__proto__'] = { polluted: true, habits: ['x'] };
  }
  let text = JSON.stringify(doc);
  const tail = r();
  if (tail < 0.05)
    text = text.slice(0, Math.floor(r() * text.length)); // cut off
  else if (tail < 0.1) {
    const at = Math.floor(r() * text.length);
    text = text.slice(0, at) + String.fromCharCode(32 + Math.floor(r() * 90)) + text.slice(at + 1); // a flipped character
  } else if (tail < 0.13) text = text.replace('"habits"', '"__proto__":{"polluted":true},"habits"');
  return text;
}

const PROBLEMS = ['tooLarge', 'notBackup', 'newerVersion', 'unsupportedVersion', 'noLifeReset', 'damaged'];

describe('restore from backup: corrupted files', () => {
  it('the untouched export restores', () => {
    expect(readBackup(JSON.stringify(realExport()), FORMAT).ok).toBe(true);
  });

  it('3,000 corrupted backups: each is refused calmly or read whole and valid, never thrown, never polluting', () => {
    const base = realExport();
    const r = rng(20261120);
    let accepted = 0;
    for (let i = 0; i < 3000; i++) {
      const text = mutate(base, r);
      let read: ReturnType<typeof readBackup>;
      try {
        read = readBackup(text, FORMAT);
      } catch (e) {
        throw new Error(`case ${i} threw ${String(e)}: ${text.slice(0, 300)}`);
      }
      if (read.ok) {
        accepted++;
        const again = P.inspectPilotProgram(read.backup.program);
        expect(again.lost).toEqual([]);
        expect(read.backup.program.habits.length).toBeGreaterThan(0);
        expect(Number.isFinite(P.pilotXp(read.backup.program))).toBe(true);
        for (const j of read.backup.journeys) expect(P.inspectPilotProgram(j.program).lost).toEqual([]);
      } else expect(PROBLEMS).toContain(read.problem);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(({} as Record<string, unknown>).habits).toBeUndefined();
    }
    // Some harmless changes (a preference, an unknown field) still restore; most corruption is refused.
    expect(accepted).toBeGreaterThan(0);
    expect(accepted).toBeLessThan(3000);
  });

  it('refuses an oversized file before reading it', () => {
    expect(readBackup('{}', FORMAT, MAX_BACKUP_BYTES + 1)).toEqual({ ok: false, problem: 'tooLarge' });
  });
});
