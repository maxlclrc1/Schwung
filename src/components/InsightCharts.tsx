import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

/*
 * When the Insights charts (InsightsViz.tsx) mount and what they show: their numbers come from core/charts.ts
 * (memoized by the screen); none of it mounts until Insights is first shown, or recomputes behind the page.
 */

/**
 * True once the page has been shown, a frame after it first came into focus, so the charts never mount during
 * the slide to the page (or at all, for someone who never opens Insights).
 */
export function useShownOnce(): boolean {
  const focused = useIsFocused();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!focused || shown) return;
    const f = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(f);
  }, [focused, shown]);
  return shown;
}

/**
 * The value as it was when the page was last in focus: a change made on another tab (a habit checked off on
 * Habits) is picked up when Insights is next shown, not recomputed behind the page meanwhile.
 */
export function useWhileFocused<V>(value: V): V {
  const focused = useIsFocused();
  const [kept, setKept] = useState(value);
  // Adjusting state while rendering (React's pattern for following a prop), only while shown.
  if (focused && kept !== value) setKept(value);
  return focused ? value : kept;
}
