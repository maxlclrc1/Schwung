import { FlatList, StyleSheet, View } from 'react-native';
import { SheetHeader } from '../components/SheetHeader';
import { Screen, T } from '../components/ui';
import { useT } from '../i18n/react';
import { APP_NAME } from '../lib/constants';
import notices from '../legal/notices.json';
import { space, useTheme } from '../theme';

type Entry = { name: string; version?: string; license: string; via?: string; text: number };
const ENTRIES = notices.entries as Entry[];

/**
 * Settings → About → Open Source Licences (modal): the copyright and licence notices of everything the app ships,
 * bundled with it, so they're there offline. Generated from the production build by scripts/licenses/notices.mjs
 * (the same content as THIRD_PARTY_NOTICES.md). The notices are legal texts and stay in English.
 */
export default function Licenses() {
  const { c } = useTheme();
  const t = useT();
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.licenses.title')} />
      <FlatList
        data={ENTRIES}
        keyExtractor={(e) => e.name}
        contentContainerStyle={styles.scroll}
        initialNumToRender={6}
        ListHeaderComponent={<T color={c.textDim}>{t('settings.licenses.intro', { app: APP_NAME })}</T>}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <T v="bodyStrong" accessibilityRole="header">
              {item.version ? `${item.name} ${item.version}` : item.name}
            </T>
            <T v="caption" color={c.textDim}>
              {item.via ? `${item.license} · ${item.via}` : item.license}
            </T>
            <T v="caption" color={c.textDim} style={styles.text} selectable>
              {notices.texts[item.text]}
            </T>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  entry: { gap: space.xs },
  text: { marginTop: space.xs },
});
