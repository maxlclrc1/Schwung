import { createContext, use, useEffect, useMemo } from 'react';
import { Keyboard } from 'react-native';
import { GestureStateManager, type GestureTouchEvent, useManualGesture } from 'react-native-gesture-handler';
import { makeMutable } from 'react-native-reanimated';

/*
 * Who owns a sideways drag between the tabs (testing builds; the pager itself is components/PagerTabs.tsx). The
 * pager's pan runs on the UI thread, so these rules are native too, never a flag read from JS mid-gesture:
 * - a touch that starts on a habit card belongs to the card: the card stamps the moment it begins, on the UI thread
 *   (useCardBlock), and the pager, which only activates itself (manual activation), never does for a touch that began
 *   with a card's, so the card's own swipe always wins;
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

/** When the latest touch on a habit card began (ms, UI thread); the pager compares it with its own touch's start. */
export const cardDownAt = makeMutable(-1);

/** Whether this subtree is inside the pager (habit cards only mark touches there). */
export const InPager = createContext(false);

/**
 * A gesture for a habit card: it stamps the moment a touch begins on the card and fails at once, so it never
 * activates, never lingers and has no relation to any other gesture (the card's own swipe is its JS responder,
 * untouched). Null outside the pager (the public release), where there is nothing to mark.
 */
export function useCardBlock() {
  const inPager = use(InPager);
  // The config is memoized: a new config object would re-send it to the native handler on every render.
  const config = useMemo(
    () => ({
      enabled: inPager,
      onTouchesDown: (e: GestureTouchEvent) => {
        'worklet';
        cardDownAt.set(Date.now());
        GestureStateManager.fail(e.handlerTag);
      },
      onTouchesUp: (e: GestureTouchEvent) => {
        'worklet';
        GestureStateManager.fail(e.handlerTag);
      },
    }),
    [inPager],
  );
  const gesture = useManualGesture(config);
  return inPager ? gesture : null;
}
