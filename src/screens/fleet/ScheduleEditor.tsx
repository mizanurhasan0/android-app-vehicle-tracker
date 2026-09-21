import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ScheduleInput } from '../../api/management';
import { useManagement } from '../../context/ManagementContext';
import { ValidationError } from '../../utils/validation';
import { useAction } from '../../hooks/useAction';
import { NoorIcon, NoorCard } from '../../components/Noor';
import { Button, Field, Select, Notice } from '../../components/ui';
import { numberLabel } from '../../utils/format';
import { colors } from '../../theme';
import { useTranslation } from '../../i18n';
import { f } from './styles';

export function ScheduleEditor({
  routeId,
  initial,
  stops,
  onDone,
}: {
  routeId: string;
  initial: ScheduleInput[];
  stops: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { mutate } = useManagement();
  const action = useAction();
  const [entries, setEntries] = useState<ScheduleInput[]>(
    initial.length
      ? initial
      : stops.map((stop, i) => ({
          stopId: stop.id,
          studentId: null,
          label: stop.name,
          time: '',
          period: 'MORNING',
          position: i,
        })),
  );
  const update = (i: number, change: Partial<ScheduleInput>) => {
    Object.keys(change).forEach(key =>
      action.clearFieldError(`entries.${i}.${key}`),
    );
    setEntries(current =>
      current.map((entry, index) =>
        index === i ? { ...entry, ...change } : entry,
      ),
    );
  };
  return (
    <NoorCard>
      {entries.map((entry, i) => (
        <View key={i} style={f.scheduleEdit}>
          <Field
            label={t('Stop {{number}}', { number: numberLabel(i + 1) })}
            value={entry.label}
            error={action.fieldErrors[`entries.${i}.label`]}
            maxLength={100}
            onChangeText={label => update(i, { label })}
          />
          <View style={f.actionRow}>
            <View style={f.flex}>
              <Field
                label={t('Time (HH:mm)')}
                value={entry.time}
                error={action.fieldErrors[`entries.${i}.time`]}
                maxLength={5}
                onChangeText={time => update(i, { time })}
              />
            </View>
            <View style={f.flex}>
              <Select
                label={t('Trip')}
                value={entry.period}
                error={action.fieldErrors[`entries.${i}.period`]}
                options={[
                  { value: 'MORNING', label: t('Morning') },
                  { value: 'AFTERNOON', label: t('Afternoon') },
                ]}
                onChange={period =>
                  update(i, { period: period as ScheduleInput['period'] })
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Remove stop')}
              onPress={() => {
                action.clearFeedback();
                setEntries(current =>
                  current.filter((_, index) => index !== i),
                );
              }}
            >
              <NoorIcon name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      ))}
      <Button
        title={t('+ Add stop')}
        secondary
        onPress={() =>
          setEntries(current => [
            ...current,
            {
              stopId: null,
              studentId: null,
              label: '',
              time: '',
              period: 'MORNING',
              position: current.length,
            },
          ])
        }
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Save schedule')}
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            const errors: Record<string, string> = {};
            entries.forEach((entry, index) => {
              const label = entry.label.trim();
              if (!label)
                errors[`entries.${index}.label`] = 'Enter the stop name.';
              else if (label.length > 100)
                errors[`entries.${index}.label`] =
                  'Stop names can be at most 100 characters.';
              if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time))
                errors[`entries.${index}.time`] =
                  'Enter a valid time as HH:mm.';
            });
            if (Object.keys(errors).length) throw new ValidationError(errors);
            await mutate(
              `/admin/routes/${routeId}/schedule`,
              {
                entries: entries.map((e, i) => ({
                  ...e,
                  label: e.label.trim(),
                  position: i,
                })),
              },
              'PUT',
            );
            onDone();
          })
        }
      />
    </NoorCard>
  );
}
