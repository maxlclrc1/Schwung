import { describe, expect, it, jest } from '@jest/globals';
import { act, createContext, createElement, memo, useContext, type ReactNode } from 'react';
import { createRoot } from 'test-renderer';
import type { Scheme } from '../index';
import { usePageScheme } from '../pageScheme';

/*
 * Theme switches: the pager page on screen follows at once, a hidden page only after that commit, in a render of its
 * own (components/PagerTabs.tsx). Measured on the web build of a Day 12 program, the render behind the visible
 * switch fell from 2,500 components to 990 this way (docs/HARDENING_AND_PERFORMANCE.md).
 */

const SchemeCtx = createContext<Scheme>('dark');
const renders: Record<string, Scheme[]> = { shown: [], hidden: [] };

/** Stands for a page's content: records each render and the scheme it drew with. */
const Content = memo(function Content({ name }: { name: string }) {
  renders[name].push(useContext(SchemeCtx));
  return null;
});

function Page({ shown, children }: { shown: boolean; children?: ReactNode }) {
  const scheme = usePageScheme(useContext(SchemeCtx), shown);
  return createElement(SchemeCtx.Provider, { value: scheme }, children);
}

function App({ scheme, focused }: { scheme: Scheme; focused: 'a' | 'b' }) {
  return createElement(
    SchemeCtx.Provider,
    { value: scheme },
    createElement(Page, { shown: focused === 'a' }, createElement(Content, { name: 'shown' })),
    createElement(Page, { shown: focused === 'b' }, createElement(Content, { name: 'hidden' })),
  );
}

describe('pager pages and theme switches', () => {
  it('re-renders only the shown page in the switch; the hidden one follows after it', async () => {
    jest.useFakeTimers();
    renders.shown = [];
    renders.hidden = [];
    const root = createRoot();
    await act(async () => root.render(createElement(App, { scheme: 'dark', focused: 'a' })));
    expect(renders).toEqual({ shown: ['dark'], hidden: ['dark'] });

    await act(async () => root.render(createElement(App, { scheme: 'light', focused: 'a' })));
    // The switch's own commit: the page on screen only.
    expect(renders).toEqual({ shown: ['dark', 'light'], hidden: ['dark'] });

    await act(async () => {
      jest.runAllTimers();
    });
    expect(renders).toEqual({ shown: ['dark', 'light'], hidden: ['dark', 'light'] });
    jest.useRealTimers();
  });

  it('a hidden page that is swiped to shows the current theme at once', async () => {
    jest.useFakeTimers();
    renders.shown = [];
    renders.hidden = [];
    const root = createRoot();
    await act(async () => root.render(createElement(App, { scheme: 'dark', focused: 'a' })));
    await act(async () => root.render(createElement(App, { scheme: 'light', focused: 'a' })));
    // Swiped to before it caught up: it draws the current theme in that very render.
    await act(async () => root.render(createElement(App, { scheme: 'light', focused: 'b' })));
    expect(renders.hidden.at(-1)).toBe('light');
    await act(async () => {
      jest.runAllTimers();
    });
    // And the page just left keeps the current theme (nothing goes back).
    expect(renders.shown.at(-1)).toBe('light');
    expect(new Set([...renders.shown.slice(1), ...renders.hidden.slice(1)])).toEqual(new Set(['light']));
    jest.useRealTimers();
  });
});
