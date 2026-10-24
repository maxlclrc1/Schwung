# Schwung V2 — Next Milestone

## 1. Start a conversation: proposed daily ladder (awaiting approval, not implemented)
**Principle:** go deeper, not more often. Every level is **one** conversation a day; naturally occurring chats
count; no strangers required.

| Level | Daily target (proposed copy) |
|---|---|
| Easy | Have one real conversation today, about more than logistics (in person or a call; family, friends and colleagues count) |
| Medium | In one conversation today, ask a follow-up question about something they said |
| Hard | Start one conversation yourself today (anyone you know counts) |

- **Safety and pressure:** keep the current note ("Any short chat counts… If it feels like too much, swap it
  for something else").
- **Unchanged:** still choice-only, never automatic, at most one opportunity-dependent habit per plan.
- **Mechanics:** the 3-rung personal window works as is, with no new mechanics.
- **Review:** a psychologist should check the social-anxiety framing before public release.

## 2. Fitness: the smallest meaningful upgrade (all habits stay HELD)
**Who benefits most:**
1. **Gentle Strength Preparation.** It covers 65+, joint pain, unknown precautions, and inactive adults as the
   standard variant. That's the largest gap, and strength is in every guideline (WHO, UK CMO, CDC).
2. **Supported Balance Practice.** 65+. The falls evidence is strongest here (Cochrane: balance and
   functional exercise lowers fall rates by about 24%), and larger effects come with professional delivery.
3. **Seated Mobility.** For people who find walking or standing difficult, who currently get no movement
   habit.
4. **Scheduled Strength Sessions.** The only meaningful option for people who already train, but it needs
   new mechanics.

**Smallest implementation:** release #1 and #2 as ordinary daily habits within the existing 3-rung mechanics.
That needs no mechanics change and no new screens. Seated Mobility follows as a choice-only habit.

**Proposed eligibility (for the reviewer to confirm):**

| Habit | Who | Never |
|---|---|---|
| Gentle Strength | 16+; standard: inactive or lightly active adults, teens. Gentle: 65+, joint pain, unknown | Heart/BP, pregnancy, walking difficulty; active 3+ days (not needed) |
| Supported Balance | 65+ (or 50+ by choice) with a fitness or calm goal **and** "Can you get up from a chair and stand for about a minute without help?" = Yes | No/Not sure, walking difficulty, unknown precautions; (new options) fall in the last year, dizziness, recent surgery or fracture |
| Seated Mobility | Choice only; visible with "walking or standing is difficult" | Recent surgery, fracture or joint replacement; unexplained pain; (new option) neck problems for the neck move |

**Exact questions for a physiotherapist:**
1. Are the gentle strength moves (sit-to-stand from a chair, wall push-up, heel raises at a support) safe as
   unsupervised daily practice for 65+ and for joint pain? What rep ranges: 5 / 5–8 / 8–10?
2. Is *daily* practice acceptable, or should the habit say "most days, rest when sore"? Does daily conflict
   with recovery for beginners?
3. For joint pain: "stop if it hurts", or NICE's "pain may rise at first; stop if it's sharp or lasting"?
4. Balance: are 3 × 5 s (two hands) → 3 × 10 s (one hand) → 3 × 15 s (fingertips) safe steps with a kitchen
   worktop or chair? Is the chair-stand screening question enough?
5. Should Day 22 and Day 45 automatic level-ups apply to balance, or should balance only level up when the
   person accepts (a mechanics change)?
6. Which seated moves are unsuitable for wheelchair users or people with osteoporosis (twisting)?
7. What stop-signs copy do you require (dizziness, chest pain, new pain)?
8. Should balance and strength always carry a referral line ("Ask your GP about a local strength and balance
   class")?

**Changes that need owner approval to existing mechanics:**
- balance excluded from automatic phase level-ups (Q5)
- new quiz items: the chair-stand screen, "fall in the last year", "dizziness", "recent surgery or fracture",
  "neck problems"
- Scheduled Strength Sessions (planned weekdays; changes level-up and step-down counting; separate approval)

## 3. Native iPhone test checklist (Expo Go or a dev build with the V2 preview on)
Use a test device or a fresh install. **Never use a real person's running program.** Record the device and
iOS version.

**Time pickers (W1 and W2)**
- [ ] The wheel opens, scrolls in 5-minute steps, and is readable in light and dark mode.
- [ ] The chosen time appears on the button ("Usually up at 6:45 AM").
- [ ] W2 shows only for adults with Earlier bedtime in the plan; "It changes a lot" and "shifts" skip W2 and
  drop wake-based habits.
- [ ] A bedtime after midnight (e.g. 00:30) gives sensible targets (00:15 → 00:00 → 23:45).

**Combined sleep screen**
- [ ] Both questions fit without overlap on the smallest supported iPhone; no option is preselected.
- [ ] Continue stays dimmed until both are answered.
- [ ] With Larger Text (Dynamic Type) on, the chips wrap rather than clip.

**Conditional wake-time question**
- [ ] E, G1 and G2: no wake question after the quiz.
- [ ] Choosing Morning daylight opens it; Back returns with earlier choices intact and daylight not added.
- [ ] Answering adds daylight; "It changes a lot" keeps daylight but removes Steady wake-up from the list.

**Plan choices**
- [ ] A required choice blocks Begin until done; optional "Keep N habits and begin" works.
- [ ] Conflicting choices dim correctly (e.g. two morning-phone habits).

**Habit removal (not testable in the browser)**
- [ ] The native confirm appears; removing down to 3 works; the 4th removal is disabled with "Keep at least 3
  habits".

**Accessibility and VoiceOver**
- [ ] Quiz options read as radio buttons or checkboxes with selected or checked state, and sleep groups read
  their question.
- [ ] Nothing auto-advances while VoiceOver is on (Continue appears).
- [ ] Plan habits read the target, "For your goal", the reason and the safety notes.
- [ ] The Today rows' "long press for details" hint works.

**Swaps, persistence, progression** (Settings → Developer time travel)
- [ ] A swap mid-program starts at Easy.
- [ ] Force-quit and reopen: the same program, targets and progress.
- [ ] 7 full days → the level-up offer; accepting raises one habit.
- [ ] Day 22 and Day 45: every habit steps up its own target.
- [ ] 3 missed days → the step-down message.
- [ ] 4 of 5 habits keeps the streak; 3 of 4 doesn't.
- [ ] Switching the preview off mid-program changes nothing; a V1 program on another install is untouched.
- [ ] Haptics on check-off and level-up feel right; reminders arrive at the chosen time.
