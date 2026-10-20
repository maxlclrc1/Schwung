import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { space, useTheme } from '../theme';
import { T } from './ui';

/** Header for modal sheets: grabber + title + Done. */
export function SheetHeader({ title, action = 'Done' }: { title: string; action?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.grabber, { backgroundColor: c.border }]} />
      <View style={styles.row}>
        <T v="heading" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </T>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <T v="bodyStrong" color={c.accentInk}>
            {action}
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.sm, paddingHorizontal: space.xl, paddingBottom: space.md },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
});
