/** Navigation, headers and small shared controls. */
export const nav = {
  tabs: { habits: 'Habits', journey: 'Journey', insights: 'Insights' },
  settings: 'Settings',
  done: 'Done',
  lightMode: 'Switch to light mode',
  darkMode: 'Switch to dark mode',
};

/** Weekly reflections: the invitation, the history and the reflection itself. */
export const reflection = {
  history: {
    title: 'Weekly reflections',
    row: 'Week {week}, days {from} to {to}: {answer}',
    rowChanged: { one: ', {count} target changed', other: ', {count} targets changed' },
    notYet: 'not reflected on yet',
    week: 'Week {week}',
    days: 'Days {from}–{to}',
    changed: { one: ' · {count} target changed', other: ' · {count} targets changed' },
    reflect: 'Reflect',
    first: 'Your first reflection comes after Day 7: a quick check-in on how your habits felt.',
  },
  invite: {
    behind: 'Week {week} is behind you',
    question: 'How did your habits feel this week?',
    easier: 'Easier',
    right: 'About right',
    harder: 'Harder',
    easierA11y: 'Easier than expected',
    harderA11y: 'Harder than expected',
    notNowA11y: 'Not now. You can reflect later from Journey.',
    notNow: 'Not now',
  },
};
