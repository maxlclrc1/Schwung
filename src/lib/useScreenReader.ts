import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether VoiceOver (or TalkBack) is on, kept up to date while the screen is open. */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => live && setEnabled(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
