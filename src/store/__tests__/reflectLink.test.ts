import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, createElement } from 'react';
import { createRoot } from 'test-renderer';
import * as P from '../../core/reset/pilot';
import { useResetPilot } from '../resetPilot';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  Redirect: 'Redirect',
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('../../components/reflection/WeeklyReflection', () => ({ WeeklyReflection: 'WeeklyReflection' }));

/*
 * The reflection route is reachable by a `schwung://` link from outside the app (Expo Router opens any screen). A link
 * can open the sheet for a finished week, as the app itself does, but can never save an answer or open a week that
 * hasn't finished.
 */

const r = () => useResetPilot.getState();
const ANSWERS: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 60 };

async function open(params: Record<string, string>) {
  mockParams.current = params;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Route = (require('../../app/life-reset/reflect') as { default: () => null }).default;
  const root = createRoot();
  await act(async () => root.render(createElement(Route)));
  return root.container.children[0] as { type: string; props: Record<string, unknown> };
}

beforeEach(async () => {
  r().end();
  expect(r().start(ANSWERS, [{ habitId: 'mind_read', intensity: 'starter' }])).toBe(true);
  r().setDevDayOffset(14); // Day 15: weeks 1 and 2 have finished
});

describe('the reflection link', () => {
  it('opens a finished week’s sheet, as the app does', async () => {
    const el = await open({ week: '2', from: 'invite' });
    expect(el.type).toBe('WeeklyReflection');
    expect(el.props).toMatchObject({ week: 2, invite: true });
  });

  it('never saves an answer it carries', async () => {
    const before = JSON.stringify(r().program);
    const el = await open({ week: '1', answer: 'harder' });
    expect(el.type).toBe('WeeklyReflection');
    expect(el.props).not.toHaveProperty('initial');
    expect(JSON.stringify(r().program)).toBe(before);
    expect(r().program!.reflections?.[1]).toBeUndefined();
  });

  it('refuses a week that hasn’t finished, or isn’t a week', async () => {
    for (const week of ['3', '9', '0', '-1', '1.5', 'x', '']) expect((await open({ week })).type).toBe('Redirect');
  });
});
