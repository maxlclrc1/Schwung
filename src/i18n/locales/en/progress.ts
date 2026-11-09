/** Journey, Insights, the collection and the reflections: the words the engine's numbers come with. */
export const progress = {
  phase: { 1: 'Foundation', 2: 'Momentum', 3: 'Mastery' },
  landmark: { 7: 'First week', 21: 'Base camp', 44: 'High camp', 66: 'Summit' },
  describeDay: {
    base: 'Day {day} · {phase}',
    ahead: '{base} · still ahead',
    today: '{base} · today',
    nothing: '{base} · nothing logged',
    done: '{base} · {done} of {planned} done',
  },
  cell: {
    skipped: ' Skipped: {list}.',
    doneOne: 'Done: {list}.',
    doneAll: 'All {count} done: {list}.',
    partial: '{done} of {planned} done: {list}.{skipped}',
    todaySoFar: 'Today, so far {done} of {planned} done: {list}.{skipped}',
    todayOpen: 'Today, still open.{skipped}',
    missed: {
      one: 'Recorded, but none of the day’s habit done.',
      other: 'Recorded, but none of the day’s {count} habits done.',
    },
    skippedOnly: 'Nothing done.{skipped}',
    rest: 'A rest day: nothing was due.',
    unrecorded: 'No record: nothing was checked off that day.',
    future: 'Not reached yet.',
  },
  observation: {
    steady: 'Week {week} held steady at {pct}, close to Week {prev}’s {prevPct}.',
    up: 'Week {week} came in at {pct}, up from {prevPct} in Week {prev}.',
    down: 'Week {week} came in at {pct}, down from {prevPct} in Week {prev}.',
    weekday: '{days} have been your most complete days: {full} of {count} fully done.',
    habit: '{habit} is your most consistent habit: {done} of {eligible} times ({pct}).',
    goals: '{habit}: weekly goal met in {met} of {judged} finished weeks.',
    streak: 'You’re on your longest streak so far: {count} days in a row.',
  },
  /** Weekdays as a group, Monday first ("Mondays have been…"). */
  weekdaysPlural: {
    0: 'Mondays',
    1: 'Tuesdays',
    2: 'Wednesdays',
    3: 'Thursdays',
    4: 'Fridays',
    5: 'Saturdays',
    6: 'Sundays',
  },
  comeback: {
    0: {
      title: 'Your path is still here.',
      body: 'Welcome back. Pick up from here, at whatever pace today allows.',
    },
    1: { title: 'Every step forward counts.', body: 'Good to see you. The trail continues from right here.' },
    2: {
      title: 'Welcome back. Pick up where you are.',
      body: 'The mountain isn’t going anywhere, and neither is your Journey.',
    },
  },
  answer: { easier: 'Easier than expected', right: 'About right', harder: 'Harder than expected' },
  story: {
    bestWeek: 'Best week: Week {week}, {pct} of habits done',
    run: 'A {count}-day run along the way',
    milestones: { one: '{count} milestone day completed', other: '{count} milestone days completed' },
  },
  collection: {
    startTitle: 'Wanderer',
    compass: {
      short: 'Compass',
      title: 'Explorer',
      name: 'The Compass',
      reflection: 'You chose a direction. Everything since has been finding your way along it.',
    },
    edelweiss: {
      short: 'Edelweiss',
      title: 'Trailblazer',
      name: 'Pressed Edelweiss',
      reflection: 'It only grows where it’s hard to reach. Kept here, like the first days that took real effort.',
    },
    trail_journal: {
      short: 'Trail Journal',
      title: 'Pathfinder',
      name: 'The Trail Journal',
      reflection: 'Small entries, day after day. Read back, they become a story about who you’re becoming.',
    },
    mountain_lantern: {
      short: 'Mountain Lantern',
      title: 'Ridgewalker',
      name: 'The Mountain Lantern',
      reflection: 'For the early starts and the long evenings: a steady light you carry yourself.',
    },
    climbing_rope: {
      short: 'Climbing Rope',
      title: 'Mountaineer',
      name: 'The Climbing Rope',
      reflection: 'Each strand holds a little; woven together, they hold you. Like habits, repeated.',
    },
    walking_staff: {
      short: 'Walking Staff',
      title: 'Alpinist',
      name: 'The Walking Staff',
      reflection: 'Worn smooth where your hand rests. Proof of how far it has carried you, and you it.',
    },
    summit_pennant: {
      short: 'Summit Pennant',
      title: 'Summit Keeper',
      name: 'The Summit Pennant',
      reflection: 'Raised where few go. Not for the view: for every ordinary day that led here.',
    },
  },
};

/** The daily reminder's words (notifications). */
export const reminders = {
  line: {
    0: { title: 'Today’s habits are ready.', body: 'A few minutes is enough to start.' },
    1: { title: 'A good moment to check in?', body: 'Your habits for today are in Schwung.' },
    2: { title: 'Got a few minutes?', body: 'Tick off one habit and see how the day goes.' },
    3: { title: 'One habit at a time.', body: 'Start with whichever feels easiest today.' },
    4: { title: 'Still on the trail.', body: 'Today’s habits are waiting when you are.' },
    5: { title: 'Time for today’s habits?', body: 'Swipe one off whenever you’re ready.' },
    6: { title: 'Your day in Schwung.', body: 'See what’s on today’s list.' },
  },
  habitTitle: 'A good moment for {habit}?',
  habitBody: 'Today’s habits are ready when you are.',
  dayTitle: 'Day {day} of your Life Reset.',
};
