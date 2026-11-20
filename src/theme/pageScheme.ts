import { startTransition, useEffect, useState } from 'react';
import type { Scheme } from './index';

/*
 * The scheme a pager page renders with (components/PagerTabs.tsx Page). The page on screen follows a theme switch in
 * the theme's own render; a page beside it (rendered, but not seen) keeps the scheme it has until that render has
 * committed, then catches up in a low-priority render of its own. The visible switch so stops waiting for the hidden
 * pages' drawings (on a real program, Journey's map alone is over 1,500 components). Kept free of React Native, so
 * it's tested on its own (theme/__tests__/pageScheme.test.ts).
 */
export function usePageScheme(scheme: Scheme, shown: boolean): Scheme {
  const [behind, setBehind] = useState(scheme);
  // On screen, it draws `scheme`: kept in step (React's adjust-state-while-rendering), so a page swiped away from
  // never goes back a theme. Only the page's wrapper renders again; what it draws already has this scheme.
  if (shown && behind !== scheme) setBehind(scheme);
  useEffect(() => {
    if (shown || behind === scheme) return;
    // Hidden: after the commit that showed the switch, never in it.
    const id = setTimeout(() => startTransition(() => setBehind(scheme)), 0);
    return () => clearTimeout(id);
  }, [shown, scheme, behind]);
  return shown ? scheme : behind;
}
