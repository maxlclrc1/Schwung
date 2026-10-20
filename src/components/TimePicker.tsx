import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { formatTime, parseTime } from '../core/dates';
import { radius, space, useTheme } from '../theme';
import { T } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');

/** Inline wheel on iOS; tap-to-open dialog on Android. Value is "HH:MM". */
export function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const { c, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const { hour, minute } = parseTime(value);
  const date = new Date(2000, 0, 1, hour, minute);

  const picker = (
    <DateTimePicker
      value={date}
      mode="time"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      minuteInterval={5}
      themeVariant={isDark ? 'dark' : 'light'}
      textColor={c.text}
      onChange={(_, d) => {
        setOpen(false);
        if (d) onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }}
    />
  );

  if (Platform.OS === 'ios') return picker;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ backgroundColor: c.surface, borderRadius: radius.md, padding: space.lg, alignItems: 'center' }}
      >
        <T v="title">{formatTime(value)}</T>
      </Pressable>
      {open ? picker : null}
    </>
  );
}
