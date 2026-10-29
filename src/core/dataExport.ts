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

export const EXPORT_SCHEMA_VERSION = 1;

/** What the confirmation says the file may contain, before anything is made. */
export const EXPORT_CONTAINS = [
  'Your habits, including any you created, and their targets',
  'Your completion history and progress',
  'Your set-up answers, including health precautions',
  'Sleep (wake-up time) and activity information',
  'Your weekly reflections, Screen Time entries and personal statistics',
];

export type ExportInput = {
  program: P.PilotProgram | null;
  today: number;
  themePreference: ThemePreference;
  reminders: ReminderSettings;
  comebacks: boolean;
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
          achievements: {
            xp,
            title: growth(xp).title,
            collection: (p.collection?.unlocked ?? []).map((id) => COLLECTIBLES.find((c) => c.id === id)?.name ?? id),
            ceremoniesSeen: p.ceremonies ?? {},
          },
          // The program exactly as saved on the phone, so nothing is left out.
          savedProgram: p,
        }
      : null,
    preferences: { theme: i.themePreference, reminders: i.reminders, welcomeBackMessages: i.comebacks },
    recoveryCopies: i.recoveryCopies,
  };
}
