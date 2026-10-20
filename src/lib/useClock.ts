import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { canEditYesterday, toDateKey } from '../core/dates';
import { appNow, useApp } from '../store/useApp';

/**
 * Re-renders when the calendar day or the "yesterday is editable" window changes:
 * on foreground, and on a light tick while open (so midnight and noon roll over live).
 */
export function useClock() {
  const offset = useApp((s) => s.devDayOffset);
  const [now, setNow] = useState(() => appNow(offset));

  useEffect(() => {
    const refresh = () =>
      setNow((prev) => {
        const next = appNow(offset);
        const same = toDateKey(prev) === toDateKey(next) && canEditYesterday(prev) === canEditYesterday(next);
        return same ? prev : next;
      });
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const id = setInterval(refresh, 30_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [offset]);

  return { now, todayKey: toDateKey(now), yesterdayEditable: canEditYesterday(now) };
}
