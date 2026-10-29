import { useLocalSearchParams } from 'expo-router';
import { LegalText } from '../components/LegalText';
import { TERMS, WELLNESS } from '../core/legal';
import { legalVisible } from '../lib/legal';

/** Settings → About → Wellness note or Terms of Use (modal); the draft Terms only where this build may show them. */
export default function LegalRoute() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  return <LegalText doc={doc === 'terms' && legalVisible.terms() ? TERMS : WELLNESS} />;
}
