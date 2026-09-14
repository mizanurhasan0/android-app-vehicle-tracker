import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TransportShift } from '../api/management';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { serviceDays, serviceShift, WEEKDAY_NAMES } from '../utils/transport';
import { Notice, Select } from './ui';

export function TransportSchedule({
  shiftId,
  operatingDays,
  shifts,
  onShiftChange,
  onDaysChange,
  errors = {},
  overlap = false,
}: {
  shiftId: string;
  operatingDays: number[];
  shifts: TransportShift[];
  onShiftChange: (id: string) => void;
  onDaysChange: (days: number[]) => void;
  errors?: Record<string, string>;
  overlap?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={layout.container}>
      <Select
        label={t('Transport shift')}
        value={shiftId}
        onChange={onShiftChange}
        error={errors.shiftId}
        options={shifts.map(shift => ({
          value: shift.id,
          label: `${t(shift.name)} · ${shift.startTime}–${shift.endTime}`,
        }))}
      />
      <WeekdaySelector
        value={operatingDays}
        onChange={onDaysChange}
        error={errors.operatingDays}
      />
      {overlap ? (
        <Text accessibilityRole="alert" style={styles.body}>
          {t(
            'Travel times overlap with another shift for this student. Please review the schedule.',
          )}
        </Text>
      ) : null}
    </View>
  );
}
export function WeekdaySelector({
  value,
  onChange,
  error,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={layout.container}>
      <Text style={styles.heading}>{t('Travel days')}</Text>
      <View style={layout.days}>
        {WEEKDAY_NAMES.map((day, index) => {
          const selected = value.includes(index);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityLabel={t(day)}
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange(
                  selected
                    ? value.filter(dayIndex => dayIndex !== index)
                    : [...value, index].sort(),
                )
              }
              style={[layout.day, selected && layout.selected]}
            >
              <Text style={selected ? layout.selectedText : styles.body}>
                {t(day)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Notice text={error} kind="error" />
    </View>
  );
}
export function TransportScheduleSummary({
  service,
  shifts,
}: {
  service: { shiftId?: string; operatingDays?: number[] };
  shifts: TransportShift[];
}) {
  const { t } = useTranslation();
  const shift = shifts.find(item => item.id === serviceShift(service));
  return (
    <Text style={styles.muted}>
      {shift
        ? `${t(shift.name)} · ${shift.startTime}–${shift.endTime}`
        : serviceShift(service)}
      {'\n'}
      {serviceDays(service)
        .map(day => t(WEEKDAY_NAMES[day]))
        .join(', ')}
    </Text>
  );
}
const layout = StyleSheet.create({
  container: { gap: 8 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedText: { color: '#ffffff' },
});
