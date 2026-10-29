import { useIsFocused } from 'expo-router';
import { useCallback, useRef } from 'react';
import type * as P from '../core/reset/pilot';
import { useResetPilot } from '../store/resetPilot';

/**
 * The program, for a tab that isn't always on screen (Journey, Insights): it follows every change while its tab is
 * shown, and holds still while it isn't, so checking off a habit on Habits never re-renders (or recomputes) the
 * pages beside it. Coming back to the tab shows the latest at once.
 */
export function useShownProgram(): P.PilotProgram | null {
  const focused = useIsFocused();
  const kept = useRef<P.PilotProgram | null>(null);
  const select = useCallback(
    (s: { program: P.PilotProgram | null }) => {
      // While hidden, the last program seen; while shown (or before anything was seen), the live one.
      if (focused || kept.current === null) kept.current = s.program;
      return kept.current;
    },
    [focused],
  );
  return useResetPilot(select);
}
