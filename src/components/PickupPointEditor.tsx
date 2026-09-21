import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Route } from '../api/types';
import { useManagement } from '../context/ManagementContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { ValidationError } from '../utils/validation';
import { Button, Field, Notice } from './ui';
import { PickupLocationPicker } from './PickupLocationPicker';

const DEFAULT_ENTER_RADIUS = 100;
const DEFAULT_EXIT_RADIUS = 150;
type RouteStop = Route['stops'][number];
type FormValue = {
  latitude: string;
  longitude: string;
  enterRadiusMeters: string;
  exitRadiusMeters: string;
};

type SearchResult = {
  label: string;
  latitude: number;
  longitude: number;
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
  const [locationOpen, setLocationOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    setForm(initialValue(stop));
    setLocationOpen(false);
    setManualOpen(false);
    setAdvancedOpen(false);
    setSearch('');
    setResults([]);
    setSearchError('');
  }, [stop]);

  const set = (key: keyof FormValue, value: string) => {
    action.clearFieldError(key);
    setForm(current => ({ ...current, [key]: value }));
  };

  const selectedLatitude = Number(form.latitude);
  const selectedLongitude = Number(form.longitude);
  const hasSelectedLocation =
    !!form.latitude.trim() &&
    !!form.longitude.trim() &&
    Number.isFinite(selectedLatitude) &&
    Number.isFinite(selectedLongitude) &&
    Math.abs(selectedLatitude) <= 90 &&
    Math.abs(selectedLongitude) <= 180;

  const chooseLocation = (point: SearchResult) => {
    action.clearFieldError('latitude');
    action.clearFieldError('longitude');
    setForm(current => ({
      ...current,
      latitude: point.latitude.toFixed(6),
      longitude: point.longitude.toFixed(6),
    }));
    setResults([]);
  };

  const searchLocation = async () => {
    const query = search.trim();
    if (!query) {
      setSearchError('Enter a location to search.');
      return;
    }
    setSearching(true);
    setSearchError('');
    setResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) throw new Error('Location search failed.');
      const payload: unknown = await response.json();
      const found = Array.isArray(payload)
        ? payload.flatMap(item => {
            if (!item || typeof item !== 'object') return [];
            const value = item as Record<string, unknown>;
            const latitude = Number(value.lat);
            const longitude = Number(value.lon);
            return typeof value.display_name === 'string' &&
              value.display_name.trim() &&
              Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              Math.abs(latitude) <= 90 &&
              Math.abs(longitude) <= 180
              ? [{ label: value.display_name, latitude, longitude }]
              : [];
          })
        : [];
      setResults(found);
      if (!found.length) setSearchError('No locations found. Try a more specific search.');
    } catch {
      setSearchError('Location search is unavailable. Check your internet connection.');
    } finally {
      setSearching(false);
    }
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
        <View style={ui.stopSummary}>
          <Text style={styles.heading}>{stop.name}</Text>
          <Text style={styles.muted}>
            {stop.pickupPoint
              ? t('Location is ready for arrival alerts.')
              : t('Location still needs to be set.')}
          </Text>
        </View>
        <Text style={stop.pickupPoint ? ui.ready : ui.pending}>
          {stop.pickupPoint ? t('Configured') : t('Not configured')}
        </Text>
      </View>
      <Button
        title={
          locationOpen
            ? t('Hide location fields')
            : stop.pickupPoint
            ? t('Change location')
            : t('Set location')
        }
        secondary
        onPress={() => setLocationOpen(open => !open)}
      />
      {locationOpen ? (
        <View style={ui.setup}>
          <Field
            label={t('Search location')}
            value={search}
            placeholder={t('Example: Mirpur 10, Dhaka')}
            maxLength={160}
            returnKeyType="search"
            onChangeText={value => {
              setSearch(value);
              setSearchError('');
            }}
            onSubmitEditing={searchLocation}
          />
          <Button
            title={t('Search')}
            secondary
            busy={searching}
            disabled={!search.trim()}
            onPress={searchLocation}
          />
          {searchError ? (
            <Text style={ui.searchError}>{t(searchError)}</Text>
          ) : null}
          {results.map(result => (
            <Pressable
              key={`${result.latitude}:${result.longitude}:${result.label}`}
              accessibilityRole="button"
              accessibilityLabel={result.label}
              onPress={() => chooseLocation(result)}
              style={ui.searchResult}
            >
              <Text numberOfLines={2} style={ui.searchResultText}>
                {result.label}
              </Text>
            </Pressable>
          ))}
          <Text style={styles.muted}>
            {t('Tap the exact pickup spot on the map. Then save the selected location below.')}
          </Text>
          <PickupLocationPicker
            latitude={hasSelectedLocation ? selectedLatitude : 23.8103}
            longitude={hasSelectedLocation ? selectedLongitude : 90.4125}
            onPick={point => chooseLocation({ ...point, label: '' })}
          />
          <Text style={styles.muted}>
            {hasSelectedLocation
              ? t('Selected location: {{latitude}}, {{longitude}}', {
                  latitude: selectedLatitude.toFixed(5),
                  longitude: selectedLongitude.toFixed(5),
                })
              : t('Tap a point to select the pickup location.')}
          </Text>
          <Button
            title={
              manualOpen
                ? t('Hide manual coordinates')
                : t('Enter coordinates manually')
            }
            secondary
            onPress={() => setManualOpen(open => !open)}
          />
          {manualOpen ? (
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
          ) : null}
        </View>
      ) : null}
      <Button
        title={
          advancedOpen ? t('Hide alert settings') : t('Alert settings')
        }
        secondary
        onPress={() => setAdvancedOpen(open => !open)}
      />
      {advancedOpen ? (
        <View style={ui.setup}>
          <Text style={styles.muted}>
            {t('The default alert area is 100 metres. Change this only when needed.')}
          </Text>
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
        </View>
      ) : null}
      <Notice text={action.error} kind="error" />
      {(locationOpen || advancedOpen) && (
        <Button
          title={t('Save pickup point')}
          busy={action.busy}
          onPress={save}
        />
      )}
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
  stopSummary: { flex: 1, gap: 2 },
  ready: {
    color: colors.primary,
    backgroundColor: colors.mint,
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  pending: {
    color: colors.amber,
    backgroundColor: '#FFF2D9',
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  setup: { gap: 8 },
  searchError: { color: colors.danger, fontSize: 13 },
  searchResult: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchResultText: { color: colors.ink, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  field: { flex: 1, minWidth: 0 },
});
