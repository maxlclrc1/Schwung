import { describe, expect, it, jest } from '@jest/globals';
import { inspectPilotProgram } from '../../../src/core/reset/pilot';
import { tIn } from '../../../src/i18n';
import { READY_LANGUAGES } from '../../../src/i18n/languages';
import { sanitizeResetPilot } from '../../../src/store/resetPilot';
import { QA_NOW, scenes } from '../fixtures';

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
      more: [tIn(l.code, 'setup.ageDial.older'), tIn(l.code, 'setup.clock.laterStep'), tIn(l.code, 'setup.meter.more')],
    }));
    fs.writeFileSync(out!, JSON.stringify({ now: QA_NOW, languages, scenes: scenes() }));
  });
});
