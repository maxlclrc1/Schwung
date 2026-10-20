import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Field } from '../components/Field';
import { SheetHeader } from '../components/SheetHeader';
import { Button, Screen, T } from '../components/ui';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { space, useTheme } from '../theme';

export default function AddHabit() {
  const { c } = useTheme();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const add = () => {
    if (!title.trim()) return;
    useApp.getState().addCustomHabit(title, desc);
    haptic.success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Add your own habit" action="Cancel" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field
            label="Habit"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Call a friend"
            maxLength={60}
            autoFocus
            returnKeyType="next"
          />
          <Field
            label="Details (optional)"
            value={desc}
            onChangeText={setDesc}
            placeholder="e.g. 10 minutes, no texting"
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={add}
          />
          <T v="caption" color={c.textFaint}>
            Your own habits stay at one level. They count toward your streak and XP like any other.
          </T>
          <Button label="Add habit" onPress={add} disabled={!title.trim()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
});
