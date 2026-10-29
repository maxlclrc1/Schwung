import { EXPORT_SCHEMA_VERSION } from './dataExport';
import { dayNumber, PROGRAM_DAYS } from './dates';
import { sanitizeReminders, type ReminderSettings } from './reminders';
import * as P from './reset/pilot';
import type { ThemePreference } from './types';

/*
 * "Restore from backup": reads a file made by "Export my data" (core/dataExport.ts) and decides whether it can
 * become this phone's Life Reset. The file is only ever parsed as JSON data, never run, and nothing in it is trusted:
 * the saved program goes through the save's own migrations and the same strict check a save on the phone gets
 * (inspectPilotProgram), and anything it can't fully understand is refused, never partly imported or guessed at.
 * Pure: the store (store/restore.ts) commits an accepted backup.
 */

/** Far above any real backup (a whole Life Reset is tens of kilobytes); anything bigger isn't one. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

/** The save format exports had before they recorded it (every schema-1 export was made with it). */
const SAVE_VERSION_BEFORE_FIELD = 1;

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export type BackupProblem =
  'tooLarge' | 'notBackup' | 'newerVersion' | 'unsupportedVersion' | 'noLifeReset' | 'damaged';

export type Backup = {
  program: P.PilotProgram;
  /** When the backup was made (ISO time), if the file says. */
  exportedAt: string | null;
  /** The preferences worth carrying over; a missing or malformed one is left as it is on this phone. */
  preferences: { themePreference?: ThemePreference; reminders?: ReminderSettings; comebacks?: boolean };
};

export type BackupRead = { ok: true; backup: Backup } | { ok: false; problem: BackupProblem };

/** How the save format is brought up to date (store/resetPilot.ts), passed in so this stays pure. */
export type SaveFormat = {
  version: number;
  /** Throws when there's no way from `from` to the current version. */
  migrate: (state: unknown, from: number) => unknown;
};

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const fail = (problem: BackupProblem): BackupRead => ({ ok: false, problem });

/** Reads a backup file's text. `bytes` is the file's size, checked before anything is parsed. */
export function readBackup(text: string, format: SaveFormat, bytes: number = text.length): BackupRead {
  if (bytes > MAX_BACKUP_BYTES || text.length > MAX_BACKUP_BYTES) return fail('tooLarge');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('notBackup');
  }
  if (!isObj(data) || data.schema !== 'schwung-data-export' || typeof data.schemaVersion !== 'number')
    return fail('notBackup');
  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) return fail('notBackup');
  if (data.schemaVersion > EXPORT_SCHEMA_VERSION) return fail('newerVersion');

  const saveVersion = data.saveVersion === undefined ? SAVE_VERSION_BEFORE_FIELD : data.saveVersion;
  if (typeof saveVersion !== 'number' || !Number.isInteger(saveVersion) || saveVersion < 0) return fail('damaged');
  if (saveVersion > format.version) return fail('newerVersion');

  if (data.lifeReset === null) return fail('noLifeReset');
  if (!isObj(data.lifeReset) || !('savedProgram' in data.lifeReset)) return fail('damaged');

  // The saved program, brought up to date exactly as a save on the phone would be.
  let migrated: unknown;
  try {
    migrated = format.migrate({ program: data.lifeReset.savedProgram, devDayOffset: 0 }, saveVersion);
  } catch {
    return fail('unsupportedVersion');
  }
  if (!isObj(migrated)) return fail('damaged');
  const read = P.inspectPilotProgram(migrated.program);
  // All or nothing: a backup missing any part of its program is refused, never restored in part.
  if (!read.program || read.lost.length) return fail('damaged');
  if (read.program.answers.age === 'u16' || read.program.habits.length === 0) return fail('damaged');

  const exportedAt =
    typeof data.exportedAt === 'string' && !Number.isNaN(Date.parse(data.exportedAt)) ? data.exportedAt : null;
  return { ok: true, backup: { program: read.program, exportedAt, preferences: readPreferences(data.preferences) } };
}

function readPreferences(x: unknown): Backup['preferences'] {
  if (!isObj(x)) return {};
  const out: Backup['preferences'] = {};
  if (typeof x.theme === 'string' && THEMES.includes(x.theme as ThemePreference))
    out.themePreference = x.theme as ThemePreference;
  if (isObj(x.reminders)) out.reminders = sanitizeReminders(x.reminders);
  if (typeof x.welcomeBackMessages === 'boolean') out.comebacks = x.welcomeBackMessages;
  return out;
}

export type BackupSummary = {
  /** The program day it is now (1–66), or past the summit. */
  day: number;
  summit: boolean;
  habits: number;
  /** Days that counted, so far. */
  daysDone: number;
  xp: number;
  collectibles: number;
  reflections: number;
  startedAt: string;
};

/** What the preview shows: where this Life Reset stands today. */
export function summarizeBackup(p: P.PilotProgram, todayKey: string): BackupSummary {
  const today = Math.max(1, dayNumber(p.startedAt, todayKey));
  return {
    day: Math.min(today, PROGRAM_DAYS),
    summit: today > PROGRAM_DAYS,
    habits: p.habits.length,
    daysDone: P.journeyStats(p, today).done,
    xp: P.pilotXp(p),
    collectibles: p.collection?.unlocked.length ?? 0,
    reflections: Object.keys(p.reflections ?? {}).length,
    startedAt: p.startedAt,
  };
}
