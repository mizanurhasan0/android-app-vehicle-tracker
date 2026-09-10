import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Vehicle } from '../api/types';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import {
  dhakaDate,
  historyRange,
  historyTime,
  parseDay,
  shiftPeriod,
} from '../utils/historyDates';
import { numberLabel } from '../utils/format';
import { HistoryMap } from './HistoryMap';
import { Button, Empty, Field, Notice } from './ui';

export function RecordedJourney({
  vehicle,
  onBack,
  onFullHistory,
}: {
  vehicle: Vehicle;
  onBack: () => void;
  onFullHistory: () => void;
}) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [day, setDay] = useState(dhakaDate());
  const [input, setInput] = useState(day);
  const [dateOpen, setDateOpen] = useState(false);
  const [dateError, setDateError] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const range = historyRange(day, 'day');
  const history = useVehicleHistory(vehicle.imei, range.from, range.to);
  const points =
    history.route?.segments.flatMap(segment => segment.points) ?? [];
  const selected = points.find(point => point.id === selectedId) ?? points[0];
  const changeDay = (value: string) => {
    setDay(value);
    setInput(value);
    setSelectedId(undefined);
    setDateError('');
  };
  return (
    <>
      <View
        style={[
          local.mapArea,
          { height: Math.max(180, Math.min(360, height * 0.3)) },
        ]}
      >
        {history.route && points.length ? (
          <HistoryMap
            route={history.route}
            selected={selected}
            style={local.map}
          />
        ) : (
          <View style={local.placeholder}>
            {history.loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
            <Text style={local.placeholderTitle}>
              {history.loading
                ? t('Loading recorded journey…')
                : history.error
                ? t('Unable to load history.')
                : t('No recorded positions in this period')}
            </Text>
            <Text style={local.caption}>
              {vehicle.name} · {day}
            </Text>
          </View>
        )}
      </View>
      <View style={local.sheet}>
        <View style={local.handle} />
        <FlatList
          data={points}
          keyExtractor={point => point.id}
          extraData={selected?.id}
          contentContainerStyle={local.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={local.header}>
              <View style={local.headingRow}>
                <View style={local.identity}>
                  <Text style={local.eyebrow}>{t('RECORDED JOURNEY')}</Text>
                  <Text style={local.title}>{vehicle.name}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={onBack}
                  style={local.lightButton}
                >
                  <Text style={local.link}>{t('Change vehicle')}</Text>
                </Pressable>
              </View>
              <View style={local.dates}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Previous day')}
                  disabled={day <= '2000-01-01'}
                  onPress={() => changeDay(shiftPeriod(day, 'day', -1))}
                  style={local.arrow}
                >
                  <Text style={local.arrowText}>‹</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Choose journey date')}
                  accessibilityState={{ expanded: dateOpen }}
                  onPress={() => setDateOpen(value => !value)}
                  style={local.dateLabel}
                >
                  <Text style={local.dateText}>
                    {day === dhakaDate() ? t('Today') : day}
                  </Text>
                  <Text style={local.caption}>
                    {t('Tap to change date · UTC+6')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Next day')}
                  accessibilityState={{ disabled: day >= dhakaDate() }}
                  disabled={day >= dhakaDate()}
                  onPress={() => changeDay(shiftPeriod(day, 'day', 1))}
                  style={[local.arrow, day >= dhakaDate() && local.disabled]}
                >
                  <Text style={local.arrowText}>›</Text>
                </Pressable>
              </View>
              {dateOpen ? (
                <View style={local.header}>
                  <Field
                    label={t('Date (YYYY-MM-DD)')}
                    value={input}
                    onChangeText={setInput}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Notice text={dateError} kind="error" />
                  <Button
                    title={t('Show selected date')}
                    onPress={() => {
                      try {
                        parseDay(input);
                        if (input > dhakaDate())
                          throw new Error(
                            t('Choose today or an earlier date.'),
                          );
                        changeDay(input);
                        setDateOpen(false);
                      } catch (error) {
                        setDateError((error as Error).message);
                      }
                    }}
                  />
                </View>
              ) : null}
              <Notice text={history.error} kind="error" />
              {history.error ? (
                <Button
                  secondary
                  title={t('Retry history')}
                  onPress={history.retry}
                  busy={history.loading}
                />
              ) : null}
              {history.route ? (
                <>
                  {!history.route.freshness.complete ? (
                    <Notice
                      kind="error"
                      text={t(
                        '{{number}} positions are waiting to sync. This history is incomplete; refresh shortly.',
                        {
                          number: numberLabel(
                            history.route.freshness.pendingPoints,
                          ),
                        },
                      )}
                    />
                  ) : null}
                  <View style={local.metrics}>
                    <View style={local.metric}>
                      <Text style={local.metricValue}>
                        {numberLabel(history.route.distanceMeters / 1000, 2)}{' '}
                        <Text style={local.unit}>{t('km')}</Text>
                      </Text>
                      <Text style={local.caption}>
                        {t('Estimated distance')}
                      </Text>
                    </View>
                    <View style={local.metric}>
                      <Text style={local.metricValue}>
                        {numberLabel(history.route.pointCount)}
                      </Text>
                      <Text style={local.caption}>
                        {t('Recorded positions')}
                      </Text>
                    </View>
                  </View>
                  {history.route.simplified ? (
                    <Text style={local.caption}>
                      {t(' Overview simplified to {{number}} points.', {
                        number: numberLabel(history.route.displayedPointCount),
                      })}
                    </Text>
                  ) : null}
                </>
              ) : null}
              <View style={local.headingRow}>
                <Text style={local.sectionTitle}>
                  {t('Recorded positions')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onFullHistory}
                  style={local.lightButton}
                >
                  <Text style={local.link}>{t('Full history')}</Text>
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selected?.id === item.id }}
              accessibilityLabel={t('Show recorded position {{number}}', {
                number: numberLabel(index + 1),
              })}
              onPress={() => setSelectedId(item.id)}
              style={[
                local.point,
                selected?.id === item.id && local.selectedPoint,
              ]}
            >
              <View style={local.pointNumber}>
                <Text style={local.link}>{numberLabel(index + 1)}</Text>
              </View>
              <View style={local.identity}>
                <Text style={local.pointTime}>{historyTime(item.gpsTime)}</Text>
                <Text style={local.caption}>
                  {numberLabel(item.latitude, 5)},{' '}
                  {numberLabel(item.longitude, 5)}
                </Text>
              </View>
              <Text style={local.speed}>
                {numberLabel(item.speed)} {t('km/h')}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            !history.loading && !history.error ? (
              <Empty
                title={t('No recorded positions in this period')}
                detail={t(
                  'History starts when recording is enabled. Earlier journeys cannot be recovered from the latest location.',
                )}
              />
            ) : null
          }
          ListFooterComponent={
            history.route ? (
              <View style={local.header}>
                <Text style={local.caption}>
                  {t(
                    'Recorded samples show the observed path. Gaps are left disconnected; exact roads between reports are unknown.',
                  )}
                </Text>
                <Button
                  secondary
                  title={t('Refresh history')}
                  onPress={history.retry}
                  busy={history.loading}
                />
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}
const local = StyleSheet.create({
  mapArea: { minHeight: 180, paddingBottom: 14 },
  map: { flex: 1, height: undefined },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: '#EAF1EF',
  },
  placeholderTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheet: {
    flex: 1,
    marginTop: -14,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#BACFCC',
    alignSelf: 'center',
    marginVertical: 12,
  },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  header: { gap: 14 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  identity: { flex: 1, gap: 4 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  lightButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  dates: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 4,
  },
  arrow: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: colors.primary, fontSize: 28 },
  dateLabel: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 },
  dateText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  disabled: { opacity: 0.3 },
  metrics: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  metric: { flex: 1, gap: 4 },
  unit: { color: colors.muted, fontSize: 11 },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    minHeight: 68,
  },
  selectedPoint: { backgroundColor: colors.mint, borderColor: colors.primary },
  pointNumber: { minWidth: 30, alignItems: 'center' },
  pointTime: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  speed: { color: colors.primary, fontSize: 11, fontWeight: '600' },
});
