import { describe, expect, it, jest } from '@jest/globals';
import { act, createElement, useState } from 'react';
import { createRoot } from 'test-renderer';

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));
jest.mock('expo-router/build/views/Splash', () => ({ hideAsync: () => {} }));
jest.mock('expo-router/build/rsc/router/errors', () => ({ MetroServerError: class {} }));
// Host components as plain elements: the screen's behaviour is what's tested here, not React Native's drawing.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  Appearance: { getColorScheme: () => 'dark' },
  StyleSheet: { create: (s: unknown) => s },
}));
jest.mock('../../theme', () => ({
  palettes: {
    dark: { bg: '#111116', text: '#F5F3FF', textDim: '#A5A3B5', accent: '#A78BFA', onAccent: '#16112B' },
    light: { bg: '#F7F6FB', text: '#191621', textDim: '#696575', accent: '#7451C8', onAccent: '#FFFFFF' },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage') as {
  setItem: jest.Mock;
  multiSet: jest.Mock;
  removeItem: jest.Mock;
  multiRemove: jest.Mock;
  clear: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Try } = require('expo-router/build/views/Try') as typeof import('expo-router/build/views/Try');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CrashScreen } = require('../CrashScreen') as typeof import('../CrashScreen');

const SRC = path.join(process.cwd(), 'src');
const texts = (node: unknown): string[] => {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === 'string') out.push(n);
    else if (n && typeof n === 'object' && 'children' in n)
      ((n as { children: unknown[] }).children ?? []).forEach(walk);
  };
  walk(node);
  return out;
};

describe('crash recovery screen', () => {
  it('is the root layout’s ErrorBoundary', () => {
    const layout = fs.readFileSync(path.join(SRC, 'app/_layout.tsx'), 'utf8');
    expect(layout).toMatch(
      /export function ErrorBoundary\(props: ErrorBoundaryProps\)\s*\{\s*return <CrashScreen \{\.\.\.props\} \/>;/,
    );
  });

  it('touches no saved data: it imports no store, storage, backup or file code', () => {
    const src = fs.readFileSync(path.join(SRC, 'components/CrashScreen.tsx'), 'utf8');
    const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports.filter((i) => /store|storage|AsyncStorage|file|backup|recovery|delete|export/i.test(i))).toEqual([]);
  });

  it('replaces a screen that fails to draw, writes nothing, and "Try again" draws it again', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    let broken = true;
    function Screen() {
      const [n] = useState(1);
      if (broken) throw new Error('boom');
      return createElement('Text', null, `fine ${n}`);
    }
    const root = createRoot();
    await act(async () => {
      root.render(createElement(Try, { catch: CrashScreen }, createElement(Screen)));
    });
    const shown = texts(root.container.toJSON());
    expect(shown).toContain('Something went wrong');
    expect(shown).toContain('Try again');

    broken = false;
    const button = root.container.queryAll((n) => n.props?.accessibilityRole === 'button')[0];
    await act(async () => {
      await (button.props.onPress as () => Promise<void>)();
    });
    expect(texts(root.container.toJSON())).toEqual(['fine 1']);

    for (const write of [
      AsyncStorage.setItem,
      AsyncStorage.multiSet,
      AsyncStorage.removeItem,
      AsyncStorage.multiRemove,
      AsyncStorage.clear,
    ])
      expect(write).not.toHaveBeenCalled();
  });
});
