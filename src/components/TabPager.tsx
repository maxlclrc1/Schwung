import { createContext, use, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { type PanGesture, useManualGesture } from 'react-native-gesture-handler';
import { makeMutable } from 'react-native-reanimated';

/*
 * Who owns a sideways drag between the tabs (testing builds; the pager itself is components/PagerTabs.tsx). The
 * pager's pan runs on the UI thread, so these rules are native too, never a flag read from JS mid-gesture:
 * - a touch that starts on a habit card belongs to the card: each card holds a gesture that blocks the pager until
 *   the touch ends (useCardBlock), so the card's own swipe always wins;
 * - nobody's while a sheet or modal is open over a tab (usePagerBlock) or the keyboard is up (text entry);
 * - otherwise the pager's, once the drag is clearly sideways (vertical and diagonal drags stay the page's scroll).
 */

/** Whether the pager may take a drag (false under a modal, or while the keyboard is up). Read on the UI thread. */
export const pagerOpen = makeMutable(true);

let blocks = 0;
let keyboard = false;
const update = () => pagerOpen.set(blocks === 0 && !keyboard);

Keyboard.addListener('keyboardDidShow', () => {
  keyboard = true;
  update();
});
Keyboard.addListener('keyboardDidHide', () => {
  keyboard = false;
  update();
});

/** While `active` (a sheet or modal open over a tab), swiping between tabs is off. */
export function usePagerBlock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    blocks += 1;
    update();
    return () => {
      blocks -= 1;
      update();
    };
  }, [active]);
}

/** The pager's gesture, for children that must block it (habit cards). Null outside the pager. */
export const PagerGesture = createContext<PanGesture | null>(null);

/**
 * A gesture for a habit card: it begins with any touch on the card and never activates, and the pager waits for it
 * to end before it may activate, so a touch that starts on a card is the card's (its swipe is the card's own JS
 * responder, untouched). Null outside the pager (the public release), where there is nothing to block.
 */
export function useCardBlock() {
  const pager = use(PagerGesture);
  const gesture = useManualGesture({ block: pager ?? undefined, enabled: pager !== null });
  return pager ? gesture : null;
}
