import { describe, expect, it, jest } from '@jest/globals';
import { inspectPilotProgram, journeyStats } from '../../../src/core/reset/pilot';
import { storyFacts } from '../../../src/core/reset/story';
import { tIn } from '../../../src/i18n';
import { READY_LANGUAGES } from '../../../src/i18n/languages';
import { sanitizeResetPilot } from '../../../src/store/resetPilot';
import { programOn, QA_NOW, scenes } from '../fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The QA states must be ones the app reads back whole (else the audit would screenshot the recovery screen).
describe('visual QA fixtures', () => {
  it('are well-formed saves', () => {
    for (const s of scenes()) {
      const pilot = s.state.pilot;
      if (!pilot || 'raw' in pilot) continue;
      expect([s.id, inspectPilotProgram(pilot).lost]).toEqual([s.id, []]);
      expect(sanitizeResetPilot({ program: pilot }).lost).toBeUndefined();
      for (const j of s.state.journeys ?? []) expect(inspectPilotProgram(j.program).lost).toEqual([]);
    }
  });

  // Every day but the three misses is done in full, the weekly custom habit included, so the Summit and the Story
  // show the days the streak counts (not "0 of 66 days completed" from a weekly habit never logged).
  it('complete every day that counts', () => {
    const p = programOn(67);
    const facts = storyFacts(p, 67);
    expect([facts.daysCompleted, journeyStats(p, 67).done, facts.longestStreak]).toEqual([63, 63, 51]);
    expect(Object.values(p.logs).some((l) => l.completed.includes('custom_1'))).toBe(true);
  });

  it('keep the recovery case unreadable', () => {
    const rec = scenes().find((s) => s.id === 'recovery')!.state.pilot as { raw: string };
    expect(sanitizeResetPilot(JSON.parse(rec.raw).state).lost?.length).toBeGreaterThan(0);
  });

  // `npm run qa:fixtures` writes them for the runner (scripts/qa/run.mjs).
  const out = process.env.QA_FIXTURES_OUT;
  (out ? it : it.skip)('are written for the runner', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as {
      mkdirSync: (p: string, o: object) => void;
      writeFileSync: (p: string, d: string) => void;
    };
    fs.mkdirSync(out!.replace(/\/[^/]*$/, ''), { recursive: true });
    // Per language: the set-up's button labels (the runner walks the steps by them) and the layout direction.
    const languages = READY_LANGUAGES.map((l) => ({
      code: l.code,
      rtl: !!l.rtl,
      continue: tIn(l.code, 'setup.q.continue'),
      confirm: tIn(l.code, 'setup.q.confirm'),
      more: [tIn(l.code, 'setup.clock.laterStep'), tIn(l.code, 'setup.meter.more')],
    }));
    fs.writeFileSync(out!, JSON.stringify({ now: QA_NOW, languages, scenes: scenes() }));
  });
});

// The Minimum Effort scenes hold what they're meant to show (kept days, a milestone among them, today's minimum).
describe('Minimum Effort QA fixtures', () => {
  it('Day 20: kept days 7, 8 and 13, a miss on 11, and Read Daily at the minimum today', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const P = require('../../../src/core/reset/pilot') as typeof import('../../../src/core/reset/pilot');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { minimumProgram, minimumMomentum } = require('../fixtures') as typeof import('../fixtures');
    const p = minimumProgram();
    expect([7, 8, 11, 13].map((d) => P.dayOutcome(p, d))).toEqual(['kept', 'kept', 'missed', 'kept']);
    expect(P.minimumsOn(p, 20)).toEqual(['mind_read']);
    const m = minimumMomentum();
    expect([P.dayOutcome(m, 70), P.dayOutcome(m, 72), P.sinceSummit(m, 80).kept]).toEqual(['kept', 'kept', 2]);
  });
});
