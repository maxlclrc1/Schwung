import { ScrollView, StyleSheet, View } from 'react-native';
import type { LegalDoc } from '../core/legal';
import { space, useTheme } from '../theme';
import { SheetHeader } from './SheetHeader';
import { Screen, T } from './ui';

/** A legal text from core/legal.ts (Settings → About): a title, then headed sections of plain paragraphs. */
export function LegalText({ doc }: { doc: LegalDoc }) {
  const { c } = useTheme();
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={doc.title} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {doc.sections.map((s, i) => (
          <View key={s.heading ?? i} style={styles.section}>
            {s.heading ? (
              <T v="bodyStrong" accessibilityRole="header">
                {s.heading}
              </T>
            ) : null}
            {s.body.map((p) => (
              <T key={p} color={c.textDim}>
                {p}
              </T>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  section: { gap: space.sm },
});
