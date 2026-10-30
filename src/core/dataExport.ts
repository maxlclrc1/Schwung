import { dateForDay, PROGRAM_DAYS } from './dates';
import { COLLECTIBLES, growth } from './reset/collection';
import * as P from './reset/pilot';
import type { ReminderSettings } from './reminders';
import type { ThemePreference } from './types';

/*
 * "Export my data": everything Schwung keeps about the person, as one machine-readable JSON file, made on the phone
 * and shared only through the share sheet the person opens. Readable sections first (clear field names), and the
 * saved program itself in full, so nothing is ever left out. No technical secrets: Schwung has none.
 */

/** 2: adds past journeys (Beyond the Summit). Version 1 files are still restored. */
export const EXPORT_SCHEMA_VERSION = 2;

/** What the confirmation says the file may contain, before anything is made. */
export const EXPORT_CONTAINS = ['habits', 'history', 'answers', 'sleep', 'reflections', 'journeys'] as const;

export type ExportInput = {
  program: P.PilotProgram | null;
  /** The version of the saved program's format (store/resetPilot.ts), so a restore knows how to read it. */
  saveVersion: number;
  today: number;
  themePreference: ThemePreference;
  reminders: ReminderSettings;
  comebacks: boolean;
  /** Finished Life Resets (Past journeys). */
  journeys: P.ArchivedJourney[];
  /** Recovery copies of saves that couldn't be read (kept text, exported as they are). */
  recoveryCopies: string[];
  now: Date;
};

export function buildExport(i: ExportInput) {
  const p = i.program;
  const xp = p ? P.pilotXp(p) : 0;
  return {
    schema: 'schwung-data-export',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: i.now.toISOString(),
    saveVersion: i.saveVersion,
    lifeReset: p
      ? {
          startedOn: p.startedAt,
          endsOn: dateForDay(p.startedAt, PROGRAM_DAYS),
          currentDay: i.today,
          setupAnswers: p.answers,
          habits: P.allHabits(p).map((id) => ({
            id,
            name: P.nameOf(p, id),
            active: p.habits.includes(id),
            ownHabit: p.custom?.[id] ?? null,
            currentTarget: p.habits.includes(id) ? P.targetText(p, id, Math.max(1, i.today)) : null,
            level: p.habits.includes(id) ? P.levelLineFor(p, id, Math.max(1, i.today)) : null,
          })),
          completionHistory: Object.values(p.logs)
            .sort((a, b) => a.day - b.day)
            .map((l) => ({ date: l.date, day: l.day, completed: l.completed, planned: l.planned, details: l })),
          weeklyReflections: Object.values(p.reflections ?? {}),
          screenTimeEntries: Object.values(p.measures?.screen_app_limit ?? {}),
          ascent: P.ascentOf(p),
          achievements: {
            xp,
            lifetimeXp: P.lifetimeXp(p),
            title: growth(xp).title,
            collection: (p.collection?.unlocked ?? []).map((id) => COLLECTIBLES.find((c) => c.id === id)?.name ?? id),
            ceremoniesSeen: p.ceremonies ?? {},
          },
          keepMomentum: p.after ? { sinceDay: p.after.since } : null,
          // The program exactly as saved on the phone, so nothing is left out.
          savedProgram: p,
        }
      : null,
    pastJourneys: i.journeys.map((j) => ({
      id: j.id,
      archivedAt: j.archivedAt,
      ascent: P.ascentOf(j.program),
      startedOn: j.program.startedAt,
      xp: P.pilotXp(j.program),
      habits: P.allHabits(j.program).map((id) => P.nameOf(j.program, id)),
      // The journey exactly as kept, so nothing is left out.
      savedProgram: j.program,
    })),
    preferences: { theme: i.themePreference, reminders: i.reminders, welcomeBackMessages: i.comebacks },
    recoveryCopies: i.recoveryCopies,
  };
}
