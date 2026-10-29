import { describe, expect, it } from '@jest/globals';
import { DEFAULT_REMINDERS, planReminders, REMINDER_DAYS, reminderText, sanitizeReminders } from '../reminders';

const ON = { ...DEFAULT_REMINDERS, enabled: true, hour: 9, minute: 0 };
const PROGRAM = { startedAt: '2026-11-02' };
const opts = { todayComplete: false, habitNames: ['Reading', 'Daily Movement'] };

describe('the daily reminder plan', () => {
  it('is off by default and without a program', () => {
    expect(DEFAULT_REMINDERS.enabled).toBe(false);
    expect(planReminders(DEFAULT_REMINDERS, PROGRAM, new Date(2026, 10, 2, 8), opts)).toEqual([]);
    expect(planReminders(ON, null, new Date(2026, 10, 2, 8), opts)).toEqual([]);
  });

  it('plans one a day at the chosen time, never in the past, one id per date', () => {
    const plan = planReminders(ON, PROGRAM, new Date(2026, 10, 2, 8), opts);
    expect(plan).toHaveLength(REMINDER_DAYS);
    expect(plan[0].date).toEqual(new Date(2026, 10, 2, 9, 0));
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
    // Past today's time: tomorrow first.
    expect(planReminders(ON, PROGRAM, new Date(2026, 10, 2, 10), opts)[0].date).toEqual(new Date(2026, 10, 3, 9, 0));
  });

  it('skips a day that is already complete', () => {
    const plan = planReminders(ON, PROGRAM, new Date(2026, 10, 2, 8), { ...opts, todayComplete: true });
    expect(plan[0].date).toEqual(new Date(2026, 10, 3, 9, 0));
  });

  it('names habits only when asked, and never with guilt or urgency', () => {
    const quiet = planReminders(ON, PROGRAM, new Date(2026, 10, 2, 8), opts);
    expect(quiet.some((r) => /Reading|Movement/.test(r.title + r.body))).toBe(false);
    const named = planReminders({ ...ON, showHabits: true }, PROGRAM, new Date(2026, 10, 2, 8), opts);
    expect(named.some((r) => /Reading|Movement/.test(r.title))).toBe(true);
    for (let d = 1; d <= 28; d++) {
      const t = reminderText(`2026-11-${String(d).padStart(2, '0')}`, d, ['Reading']);
      expect(`${t.title} ${t.body}`).not.toMatch(/streak|don’t|miss|lose|hurry|last chance|!/i);
    }
  });

  it('keeps only a well-formed saved setting', () => {
    expect(sanitizeReminders({ enabled: 'yes', hour: 25, minute: 7 })).toEqual({ ...DEFAULT_REMINDERS, minute: 7 });
  });
});
