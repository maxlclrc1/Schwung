import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { radius, space, type, useTheme } from '../theme';
import { T } from './ui';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={c.textFaint}
        selectionColor={c.accentInk}
        {...props}
        style={[type.body, styles.input, { color: c.text, backgroundColor: c.surface }, props.style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 52 },
});
