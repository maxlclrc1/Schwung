import {
  BY_ID,
  FITNESS_NOTE,
  GOALS,
  hasPrecaution,
  LIBRARY,
  precautionsUnknown,
  sleepBelowBand,
  type HabitDef,
} from './library';
import type { Alternative, ChoiceStep, NeedDomain, PickV2, PlanResultV2, ProfileV2, Targets } from './types';

/*
 * Habit Science 2.0 plan generation (HABIT_SCIENCE_V2_ARCHITECTURE.md, revision 5, section D).
 * Pure and deterministic: the same profile always gives the same plan. Not connected to the app.
 */

const NEED_ORDER: NeedDomain[] = ['sleep', 'activity', 'nutrition', 'digital'];
const PLAN_TARGET = 5;
const PLAN_MAX = 6;
const PLAN_MIN = 3;

/** D.1: how much room for improvement each answer shows, 0 (fine) to 4. */
export function needs(p: ProfileV2): Record<NeedDomain, number> {
  const teen = p.age === '16_17';
  const duration = { lt6: 4, '6_7': 3, '7_8': teen ? 2 : 0, '8_9': 0, gt9: 0 }[p.sleepHours];
  const trouble = { most: 4, some: 2, rarely: 0 }[p.sleepTrouble];
  const produce = { '0': 4, '1_2': 3, '3_4': 1, '5p': 0, skip: 0 }[p.produce];
  const sugary = p.sugary === 'most' ? 3 : p.sugary === 'some' ? 1 : 0;
  return {
    sleep: Math.max(duration, trouble),
    activity: { '0': 4, '1_2': 3, '3_4': 1, '5p': 0 }[p.activeDays],
    nutrition: Math.max(produce, sugary),
    digital: { '6p': 4, '4_6': 3, '2_4': 2, unknown: 2, '1_2': 1, lt1: 0 }[p.phone],
  };
}

/** Why a habit can't be offered to this person (null = eligible), checking everything but plan fit. */
export function exclusion(h: HabitDef, p: ProfileV2): string | null {
  if (h.release !== 'candidate') return 'not released yet';
  const reason = h.exclude(p);
  if (reason) return reason;
  const start = h.start(p);
  if (start === null) return 'your answers say you already do this';
  // Easy is the baseline rung: it needs Medium and Hard above it.
  if (start + 2 > h.ladder(p).length - 1) return 'no room above your current level';
  return null;
}

export function targetsFor(h: HabitDef, p: ProfileV2): Targets {
  const ladder = h.ladder(p);
  const s = h.start(p)!;
  return { easy: ladder[s], medium: ladder[s + 1], hard: ladder[s + 2] };
}

const needDomain = (h: HabitDef): NeedDomain | null =>
  (NEED_ORDER as string[]).includes(h.domain) ? (h.domain as NeedDomain) : null;

/** D.4 constraints that depend on what's already in the plan. */
function fits(h: HabitDef, plan: HabitDef[]): boolean {
  if (plan.some((x) => x.id === h.id)) return false;
  if (h.overlapGroup && plan.some((x) => x.overlapGroup === h.overlapGroup)) return false;
  if (h.phoneRule && plan.filter((x) => x.phoneRule).length >= 2) return false;
  if (plan.filter((x) => x.domain === h.domain).length >= 2) return false;
  if (h.domain === 'nutrition' && plan.some((x) => x.domain === 'nutrition')) return false; // at most 1 automatic
  if (h.opportunityDependent && plan.some((x) => x.opportunityDependent)) return false;
  return true;
}

/** D.3: the habit that answers a need in a domain. */
function domainChoice(d: NeedDomain, p: ProfileV2, n: number, ok: (id: string) => boolean): string | null {
  const first = (...ids: string[]) => ids.find(ok) ?? null;
  switch (d) {
    case 'sleep': {
      const troubled = p.sleepTrouble !== 'rarely' || hasPrecaution(p, 'sleepCondition');
      return troubled || !sleepBelowBand(p)
        ? first('sleep_no_phone_bed', 'sleep_wake', 'sleep_morning_light')
        : first('sleep_bedtime', 'sleep_no_phone_bed', 'sleep_morning_light');
    }
    case 'activity':
      return first('move_walk');
    case 'nutrition': {
      const produceNeed = { '0': 4, '1_2': 3, '3_4': 1, '5p': 0, skip: 0 }[p.produce];
      if (produceNeed >= 2 && ok('food_produce')) return 'food_produce';
      return p.sugary === 'most' ? first('food_unsweetened') : null;
    }
    case 'digital':
      return p.phonePull === 'social'
        ? first('screen_social', 'screen_morning')
        : p.phonePull === 'video' || p.phonePull === 'games' || p.phonePull === 'mix'
          ? first('screen_app_limit', 'screen_morning')
          : n >= 2
            ? first('screen_morning')
            : null;
  }
}

const NEED_WORDS: Record<NeedDomain, (p: ProfileV2) => string> = {
  sleep: (p) =>
    p.sleepTrouble === 'most'
      ? 'You have trouble sleeping on most nights.'
      : p.sleepTrouble === 'some'
        ? 'You have trouble sleeping 1–2 nights a week.'
        : `You sleep ${{ lt6: 'less than 6', '6_7': '6–7', '7_8': '7–8', '8_9': '8–9', gt9: 'more than 9' }[p.sleepHours]} hours.`,
  activity: (p) =>
    p.activeDays === '0'
      ? 'You’re not active on most days yet.'
      : `You’re active ${{ '1_2': '1–2', '3_4': '3–4', '5p': '5+' }[p.activeDays as '1_2' | '3_4' | '5p']} days a week.`,
  nutrition: (p) =>
    p.produce === '0'
      ? 'You eat hardly any fruit and veg.'
      : p.produce === '1_2'
        ? 'You eat 1–2 portions of fruit and veg a day.'
        : 'You have sugary drinks most days.',
  digital: (p) =>
    p.phone === 'unknown'
      ? 'You’re not sure how long you’re on your phone. Screen Time in Settings shows the real number.'
      : `You’re on your phone ${{ lt1: 'under 1', '1_2': '1–2', '2_4': '2–4', '4_6': '4–6', '6p': '6+', unknown: '' }[p.phone]} hours a day${
          p.phonePull
            ? `, mostly ${{ social: 'social media', video: 'videos', games: 'games', messages: 'messages and news', mix: 'a mix' }[p.phonePull]}`
            : ''
        }.`,
};

const GOAL_TIE: Record<ProfileV2['goal'], string> = {
  energy: 'Picked for more energy.',
  focus: 'Picked for better focus.',
  discipline: 'Picked for more discipline.',
  confidence: 'Picked for more confidence.',
  calm: 'Picked for less stress.',
  fitness: 'Picked for getting in shape.',
};

const RULE_NOTE = (n: number) => `With ${n} habits, a day counts when all ${n} are done. With 5, one can slip.`;

export function generatePlanV2(p: ProfileV2): PlanResultV2 {
  if (p.age === 'u16') {
    return {
      status: 'not_eligible',
      message: 'Schwung is made for people 16 and older. We hope you’ll come back when you’re 16.',
    };
  }
  const need = needs(p);
  const goal = GOALS[p.goal];
  const goalIds = [...goal.core, ...goal.support];
  const eligible = (id: string) => exclusion(BY_ID[id], p) === null;
  const plan: HabitDef[] = [BY_ID.discipline_bed];
  const meta = new Map<string, { source: PickV2['source']; domainNeed?: NeedDomain }>([
    ['discipline_bed', { source: 'foundation' }],
  ]);
  const auto = (id: string) => BY_ID[id].mode === 'auto' && eligible(id) && fits(BY_ID[id], plan);
  // Support habits in a need domain must address some need; core goal habits are the goal itself.
  const suitable = (id: string) => {
    const d = needDomain(BY_ID[id]);
    return goal.core.includes(id) || d === null || need[d] >= 1;
  };
  const add = (id: string, source: PickV2['source'], domainNeed?: NeedDomain) => {
    plan.push(BY_ID[id]);
    meta.set(id, { source, domainNeed });
  };
  const represented = (d: NeedDomain) => plan.some((x) => x.domain === d);
  const strongNeed = (id: string) => {
    const d = needDomain(BY_ID[id]);
    return d !== null && need[d] >= 2;
  };

  // 2. Goal: up to two, at least one core where eligible.
  const cores = goal.core.filter(auto);
  const g1 = cores.find(strongNeed) ?? cores[0] ?? goal.support.find((id) => auto(id) && suitable(id));
  if (g1) add(g1, 'goal');
  const restCores = goal.core.filter(auto);
  const g2 =
    restCores.find((id) => strongNeed(id) && BY_ID[id].domain !== BY_ID[g1 ?? ''].domain) ??
    restCores.find((id) => BY_ID[id].domain !== BY_ID[g1 ?? ''].domain) ??
    restCores[0] ??
    goal.support.find((id) => auto(id) && suitable(id));
  if (g2) add(g2, 'goal');

  // 3. Needs: up to two unrepresented domains with need >= 2, strongest first.
  const byNeed = NEED_ORDER.filter((d) => need[d] >= 2).sort((a, b) => need[b] - need[a]);
  let needPicks = 0;
  for (const d of byNeed) {
    if (needPicks >= 2 || plan.length >= PLAN_TARGET) break;
    if (represented(d)) continue;
    const id = domainChoice(d, p, need[d], auto);
    if (id) {
      add(id, 'need', d);
      needPicks++;
    }
  }

  // 4. A sixth only for an unaddressed need at the maximum.
  if (plan.length === PLAN_TARGET) {
    for (const d of byNeed) {
      if (need[d] < 4 || represented(d)) continue;
      const id = domainChoice(d, p, need[d], auto);
      if (id) {
        add(id, 'need', d);
        break;
      }
    }
  }

  // 5. Fill to 5: goal habits, then unaddressed needs >= 2. Never anything else.
  for (const id of goalIds) {
    if (plan.length >= PLAN_TARGET) break;
    if (auto(id) && suitable(id)) add(id, 'fill');
  }
  for (const d of byNeed) {
    if (plan.length >= PLAN_TARGET) break;
    if (represented(d)) continue;
    const id = domainChoice(d, p, need[d], auto);
    if (id) add(id, 'fill', d);
  }

  // Reasons and order: foundation, goal habits, then the rest.
  const picks: PickV2[] = plan.map((h) => {
    const m = meta.get(h.id)!;
    const forGoal = goalIds.includes(h.id);
    const d = needDomain(h);
    const lead =
      h.id === 'discipline_bed' && p.routines.includes('bed')
        ? 'You already do this, so it’s an easy first check.'
        : '';
    const answer = d && need[d] >= 2 ? NEED_WORDS[d](p) : '';
    const reason = [lead || answer, lead ? '' : h.why, forGoal ? GOAL_TIE[p.goal] : ''].filter(Boolean).join(' ');
    return {
      id: h.id,
      title: h.title,
      source: m.source,
      forGoal,
      startRung: h.start(p)!,
      targets: targetsFor(h, p),
      reason,
      notes: habitNotes(h, p),
    };
  });
  const rank = (x: PickV2) => (x.source === 'foundation' ? 0 : x.forGoal ? 1 : 2);
  const ordered = picks
    .map((x, i) => ({ x, i }))
    .sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i)
    .map((e) => e.x);

  return {
    status: 'ok',
    picks: ordered,
    choice: choiceStep(p, plan, need),
    planNotes: planNotes(p, plan),
    needsWake: plan.some((h) =>
      ['sleep_bedtime', 'sleep_wake', 'screen_morning', 'screen_social', 'sleep_morning_light'].includes(h.id),
    ),
    needsBedtime: plan.some((h) => h.id === 'sleep_bedtime'),
  };
}

/** D.5: alternatives in a fixed order; required when the plan is under the minimum of 3. */
function choiceStep(p: ProfileV2, plan: HabitDef[], need: Record<NeedDomain, number>): ChoiceStep {
  const n = plan.length;
  if (n >= PLAN_TARGET) return null;
  const goal = GOALS[p.goal];
  const choosable = (h: HabitDef) =>
    (h.mode === 'auto' || h.mode === 'choice') && exclusion(h, p) === null && fits(h, plan);
  const order: string[] = [];
  const push = (id: string) => {
    if (!order.includes(id) && choosable(BY_ID[id])) order.push(id);
  };
  [...goal.core, ...goal.support].forEach(push);
  goal.suggest.forEach(push);
  for (const h of LIBRARY) {
    const d = needDomain(h);
    if (d && need[d] >= 1) push(h.id);
  }
  LIBRARY.forEach((h) => push(h.id));
  const required = Math.max(0, PLAN_MIN - n);
  const alternatives: Alternative[] = order
    .slice(0, required > 0 ? 5 : 3)
    .map((id) => ({ id, title: BY_ID[id].title, targets: targetsFor(BY_ID[id], p) }));
  const ruleNote =
    required > 0
      ? `Plans need at least ${PLAN_MIN} habits, so choose ${required} more. ${RULE_NOTE(PLAN_MIN)}`
      : RULE_NOTE(n);
  return { required, optional: required === 0, alternatives, ruleNote };
}

function habitNotes(h: HabitDef, p: ProfileV2): string[] {
  const notes: string[] = [];
  if (h.note) notes.push(h.note);
  if (h.id === 'move_walk') {
    const careful =
      precautionsUnknown(p) ||
      p.age === '65p' ||
      hasPrecaution(p, 'joint') ||
      hasPrecaution(p, 'heart') ||
      hasPrecaution(p, 'pregnancy');
    if (careful) notes.push('Keep it comfortable and stop if it hurts. Follow any advice from your clinician.');
  }
  return notes;
}

function planNotes(p: ProfileV2, plan: HabitDef[]): string[] {
  const notes: string[] = [];
  if (p.goal === 'fitness') notes.push(FITNESS_NOTE);
  if (precautionsUnknown(p)) notes.push('If you have a health condition, check these with a professional.');
  if (p.sleepTrouble === 'most')
    notes.push('Trouble sleeping on most nights is worth mentioning to a doctor or another health professional.');
  if (hasPrecaution(p, 'walkingDifficult'))
    notes.push('Movement habits for limited mobility aren’t available yet. A professional can suggest safe options.');
  if (p.goal === 'fitness' && !plan.some((h) => GOALS.fitness.core.includes(h.id)))
    notes.push('None of our current fitness habits suit your answers yet.');
  return notes;
}

/** D.6: swap candidates for a V2 plan. A swapped-in habit always starts at Easy of its baseline window. */
export function swapOptionsV2(
  p: ProfileV2,
  planIds: string[],
  replacing: string,
): { id: string; level: 'easy'; targets: Targets }[] {
  const rest = planIds.filter((id) => id !== replacing).map((id) => BY_ID[id]);
  const replaced = BY_ID[replacing];
  const candidates = LIBRARY.filter(
    (h) => h.mode !== 'foundation' && h.id !== replacing && exclusion(h, p) === null && fits(h, rest),
  );
  const sameDomain = candidates.filter((h) => h.domain === replaced.domain);
  const other = candidates.filter((h) => h.domain !== replaced.domain);
  return [...sameDomain, ...other].map((h) => ({ id: h.id, level: 'easy' as const, targets: targetsFor(h, p) }));
}

/** Every habit that can't be offered to this person, with the reason (for review screens and tests). */
export function exclusionsV2(p: ProfileV2): { id: string; reason: string }[] {
  return LIBRARY.filter((h) => h.mode !== 'foundation')
    .map((h) => ({ id: h.id, reason: exclusion(h, p) }))
    .filter((x): x is { id: string; reason: string } => x.reason !== null);
}

export const V2_LIMITS = { PLAN_TARGET, PLAN_MAX, PLAN_MIN };
