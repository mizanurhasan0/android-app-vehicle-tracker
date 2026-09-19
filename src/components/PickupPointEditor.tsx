import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Route } from '../api/types';
import { useManagement } from '../context/ManagementContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { ValidationError } from '../utils/validation';
import { Button, Field, Notice } from './ui';

const DEFAULT_ENTER_RADIUS = 100;
const DEFAULT_EXIT_RADIUS = 150;
type RouteStop = Route['stops'][number];
type FormValue = {
  latitude: string;
  longitude: string;
  enterRadiusMeters: string;
  exitRadiusMeters: string;
};

function initialValue(stop: RouteStop): FormValue {
  const point = stop.pickupPoint;
  return {
    latitude: point ? String(point.latitude) : '',
    longitude: point ? String(point.longitude) : '',
    enterRadiusMeters: String(point?.enterRadiusMeters ?? DEFAULT_ENTER_RADIUS),
    exitRadiusMeters: String(point?.exitRadiusMeters ?? DEFAULT_EXIT_RADIUS),
  };
}

export function PickupPointEditor({ stop }: { stop: RouteStop }) {
  const { t } = useTranslation();
  const { mutate } = useManagement();
  const action = useAction();
  const [form, setForm] = useState<FormValue>(() => initialValue(stop));

  useEffect(() => {
    setForm(initialValue(stop));
  }, [stop]);

  const set = (key: keyof FormValue, value: string) => {
    action.clearFieldError(key);
    setForm(current => ({ ...current, [key]: value }));
  };

  const save = () =>
    action.run(
      async () => {
        const latitude = Number(form.latitude);
        const longitude = Number(form.longitude);
        const enterRadiusMeters = Number(form.enterRadiusMeters);
        const exitRadiusMeters = Number(form.exitRadiusMeters);
        const errors: Record<string, string> = {};

        if (
          !form.latitude.trim() ||
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90
        )
          errors.latitude = 'Enter a valid latitude between -90 and 90.';
        if (
          !form.longitude.trim() ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        )
          errors.longitude = 'Enter a valid longitude between -180 and 180.';
        if (
          !Number.isInteger(enterRadiusMeters) ||
          enterRadiusMeters < 10 ||
          enterRadiusMeters > 10000
        )
          errors.enterRadiusMeters =
            'Enter radius must be an integer from 10 to 10000 metres.';
        if (
          !Number.isInteger(exitRadiusMeters) ||
          exitRadiusMeters < 11 ||
          exitRadiusMeters > 20000
        )
          errors.exitRadiusMeters =
            'Exit radius must be an integer from 11 to 20000 metres.';
        else if (exitRadiusMeters <= enterRadiusMeters)
          errors.exitRadiusMeters = 'Exit radius must be greater than enter radius.';
        if (Object.keys(errors).length) throw new ValidationError(errors);

        await mutate(
          `/admin/stops/${stop.id}/pickup-point`,
          { latitude, longitude, enterRadiusMeters, exitRadiusMeters },
          'PUT',
        );
      },
      t('Pickup point saved.'),
    );

  return (
    <View style={ui.editor}>
      <View style={ui.heading}>
        <Text style={styles.heading}>{stop.name}</Text>
        <Text style={styles.muted}>
          {stop.pickupPoint ? t('Configured') : t('Not configured')}
        </Text>
      </View>
      <View style={ui.row}>
        <View style={ui.field}>
          <Field
            label={t('Latitude')}
            value={form.latitude}
            error={action.fieldErrors.latitude}
            keyboardType="decimal-pad"
            onChangeText={value => set('latitude', value)}
          />
        </View>
        <View style={ui.field}>
          <Field
            label={t('Longitude')}
            value={form.longitude}
            error={action.fieldErrors.longitude}
            keyboardType="decimal-pad"
            onChangeText={value => set('longitude', value)}
          />
        </View>
      </View>
      <View style={ui.row}>
        <View style={ui.field}>
          <Field
            label={t('Enter radius (m)')}
            value={form.enterRadiusMeters}
            error={action.fieldErrors.enterRadiusMeters}
            keyboardType="number-pad"
            onChangeText={value => set('enterRadiusMeters', value)}
          />
        </View>
        <View style={ui.field}>
          <Field
            label={t('Exit radius (m)')}
            value={form.exitRadiusMeters}
            error={action.fieldErrors.exitRadiusMeters}
            keyboardType="number-pad"
            onChangeText={value => set('exitRadiusMeters', value)}
          />
        </View>
      </View>
      <Notice text={action.error} kind="error" />
      <Button title={t('Save pickup point')} busy={action.busy} onPress={save} />
    </View>
  );
}

const ui = StyleSheet.create({
  editor: {
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  field: { flex: 1, minWidth: 0 },
});
