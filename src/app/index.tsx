import { Redirect } from 'expo-router';
import { useApp } from '../store/useApp';

export default function Index() {
  const started = useApp((s) => s.startedAt !== null);
  return <Redirect href={started ? '/today' : '/welcome'} />;
}
