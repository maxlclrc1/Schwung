import { Redirect, useLocalSearchParams } from 'expo-router';
import { WeeklyReflection } from '../../components/reflection/WeeklyReflection';
import { REFLECTION_WEEKS, type ReflectionAnswer } from '../../core/reset/reflections';

/** A week's reflection (modal): opened from the invitation on Habits or from Journey's reflections. */
export default function ReflectRoute() {
  const params = useLocalSearchParams<{ week?: string; answer?: string }>();
  const week = Number(params.week);
  if (!Number.isInteger(week) || week < 1 || week > REFLECTION_WEEKS) return <Redirect href="/" />;
  const answer = (['easier', 'right', 'harder'] as const).find((a) => a === params.answer) ?? null;
  return <WeeklyReflection week={week} initial={answer as ReflectionAnswer | null} />;
}
