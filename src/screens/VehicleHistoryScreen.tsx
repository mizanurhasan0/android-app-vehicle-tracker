import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BusFront, Pause, Play, RotateCw } from 'lucide-react-native';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Empty, Notice, Page } from '../components/ui';
import { HistoryMap } from '../components/HistoryMap';
import { useAuth } from '../context/AuthContext';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { useRecordedHistoryDays } from '../hooks/useRecordedHistoryDays';
import { useTranslation } from '../i18n';
import { HomeStackParams } from '../navigation/types';
import { colors } from '../theme';
import { numberLabel } from '../utils/format';
import {
  dhakaDate,
  historyRange,
  historyTime,
  HistoryPeriod,
  shiftPeriod,
} from '../utils/historyDates';
import { HistoryRangeControls } from './history/HistoryRangeControls';
import { HistoryMetrics, RecordedDays } from './history/HistorySummarySections';

const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export function VehicleHistoryScreen({
  route: navigationRoute,
}: NativeStackScreenProps<HomeStackParams, 'VehicleHistory'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const { imei, name } = navigationRoute.params;
  const [day, setDay] = useState(dhakaDate());
  const [period, setPeriod] = useState<HistoryPeriod>('day');
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [trackWidth, setTrackWidth] = useState(1);
  const range = historyRange(day, period);
  const history = useVehicleHistory(imei, range.from, range.to);
  const recordedDays = useRecordedHistoryDays(
    imei,
    day,
    period === 'day',
    refreshRevision,
  );
  const points =
    history.route?.segments.flatMap(segment => segment.points) ?? [];
  const selectedPoint = points[Math.min(index, points.length - 1)];

  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    setPlaying(false);
    setIndex(0);
  }, [history.route]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') setPlaying(false);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!playing) return;
    if (index >= points.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex(value => value + 1), 400);
    return () => clearTimeout(timer);
  }, [playing, index, points.length]);
  useEffect(() => {
    if (!history.loading && (history.route || history.summary))
      setUpdatedAt(new Date());
  }, [history.loading, history.route, history.summary]);

  if (session?.user.role !== 'ADMIN')
    return (
      <Page title={t('Travel history')}>
        <Notice
          kind="error"
          text={t('History is available to administrators only.')}
        />
      </Page>
    );

  const chooseDay = (value: string) => {
    setPlaying(false);
    setDay(value);
  };
  const choosePoint = (value: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(points.length - 1, value)));
  };
  const scrub = (x: number) =>
    choosePoint(
      Math.round(
        Math.max(0, Math.min(1, x / trackWidth)) * (points.length - 1),
      ),
    );
  const mapHeight = Math.max(295, Math.min(470, width * 0.75));
  return (
    <SafeAreaView style={ui.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={ui.scroll}
        contentContainerStyle={ui.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={ui.hero}>
          <View style={ui.heroInner}>
            <View style={ui.heroCopy}>
              <Text
                accessibilityRole="header"
                numberOfLines={2}
                style={ui.vehicleName}
              >
                {name}
              </Text>
              <Text numberOfLines={1} style={ui.imei}>
                {imei} · Asia/Dhaka (UTC+6)
              </Text>
            </View>
            <View style={ui.busIcon}>
              <BusFront size={27} color="#FFFFFF" />
            </View>
          </View>
        </View>
        <View style={ui.sheet}>
          <View style={ui.content}>
            <HistoryRangeControls
              period={period}
              day={day}
              onPeriodChange={value => {
                setPlaying(false);
                setPeriod(value);
              }}
              onDateApply={chooseDay}
              onToday={() => {
                setPeriod('day');
                chooseDay(dhakaDate());
              }}
              onPrevious={() => chooseDay(shiftPeriod(day, period, -1))}
              onNext={() => chooseDay(shiftPeriod(day, period, 1))}
              nextDisabled={range.to > new Date().toISOString()}
            />
            {period !== 'day' ? (
              <Text style={ui.rangeLabel}>{range.label}</Text>
            ) : null}
            <Notice text={history.error} kind="error" />
            {history.loading ? (
              <View style={ui.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={ui.muted}>{t('Loading recorded journey…')}</Text>
              </View>
            ) : null}
            {!history.loading && (history.route || history.summary) ? (
              <>
                {history.route && !history.route.freshness.complete ? (
                  <Notice
                    kind="warning"
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
                <HistoryMetrics
                  route={history.route}
                  summary={history.summary}
                />
                {history.route && points.length ? (
                  <View style={ui.mapBlock}>
                    <HistoryMap
                      route={history.route}
                      selected={selectedPoint}
                      style={{ height: mapHeight }}
                    />
                    <Text style={ui.caption}>
                      {t(
                        'Recorded samples show the observed path. Gaps are left disconnected; exact roads between reports are unknown.',
                      )}
                      {history.route.simplified
                        ? ` ${t('Overview simplified to {{number}} points.', {
                            number: numberLabel(
                              history.route.displayedPointCount,
                            ),
                          })}`
                        : ''}
                    </Text>
                  </View>
                ) : history.summary?.days.some(item => item.pointCount > 0) ? (
                  <Notice
                    kind="warning"
                    text={t(
                      'Route map is unavailable for this period. Choose a recorded day to view its path.',
                    )}
                  />
                ) : (
                  <Empty
                    title={t('No recorded positions in this period')}
                    detail={t(
                      'History starts when recording is enabled. Earlier journeys cannot be recovered from the latest location.',
                    )}
                  />
                )}
                <RecordedDays
                  days={recordedDays ?? history.summary?.days ?? []}
                  selectedDay={day}
                  onSelectDay={value => {
                    setPeriod('day');
                    chooseDay(value);
                  }}
                />
              </>
            ) : null}
            <View style={ui.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  history.error ? t('Retry history') : t('Refresh history')
                }
                disabled={history.loading}
                onPress={() => {
                  history.retry();
                  setRefreshRevision(value => value + 1);
                }}
                style={({ pressed }) => [ui.action, pressed && ui.pressed]}
              >
                <View style={ui.refreshIcon}>
                  <RotateCw size={23} color={colors.primary} />
                </View>
                <View style={ui.actionText}>
                  <Text style={ui.actionTitle}>
                    {history.error ? t('Retry history') : t('Refresh history')}
                  </Text>
                  {updatedAt ? (
                    <Text style={ui.actionSubtitle} numberOfLines={1}>
                      {t('Last updated')} {timeLabel(updatedAt.toISOString())}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <View style={ui.divider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  playing ? t('Pause playback') : t('Play recorded samples')
                }
                accessibilityState={{ disabled: points.length < 2 }}
                disabled={points.length < 2}
                onPress={() => {
                  if (index >= points.length - 1) setIndex(0);
                  setPlaying(value => !value);
                }}
                style={({ pressed }) => [
                  ui.action,
                  points.length < 2 && ui.disabled,
                  pressed && ui.pressed,
                ]}
              >
                <View style={ui.playIcon}>
                  {playing ? (
                    <Pause size={21} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Play size={21} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </View>
                <View style={ui.actionText}>
                  <Text style={ui.actionTitle}>
                    {playing ? t('Pause playback') : t('Play route')}
                  </Text>
                  <Text style={ui.actionSubtitle} numberOfLines={1}>
                    {selectedPoint
                      ? historyTime(selectedPoint.gpsTime)
                      : range.label}
                  </Text>
                </View>
              </Pressable>
            </View>
            {points.length > 1 ? (
              <View style={ui.scrubber}>
                <Text style={ui.scrubTime}>{timeLabel(points[0].gpsTime)}</Text>
                <View
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={t('Route playback position')}
                  accessibilityValue={{
                    min: 1,
                    max: points.length,
                    now: index + 1,
                  }}
                  accessibilityActions={[
                    { name: 'increment' },
                    { name: 'decrement' },
                  ]}
                  onAccessibilityAction={event =>
                    choosePoint(
                      index +
                        (event.nativeEvent.actionName === 'increment' ? 1 : -1),
                    )
                  }
                  style={ui.trackArea}
                  onLayout={event =>
                    setTrackWidth(event.nativeEvent.layout.width)
                  }
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderMove={event => scrub(event.nativeEvent.locationX)}
                  onResponderRelease={event =>
                    scrub(event.nativeEvent.locationX)
                  }
                >
                  <View style={ui.track}>
                    <View
                      style={[
                        ui.progress,
                        { width: `${(index / (points.length - 1)) * 100}%` },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      ui.thumb,
                      { left: `${(index / (points.length - 1)) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={ui.scrubTime}>
                  {timeLabel(points[points.length - 1].gpsTime)}
                </Text>
              </View>
            ) : null}
            {selectedPoint ? (
              <Text style={ui.playbackNote}>
                {t('{{speed}} km/h · Point {{index}}/{{total}}', {
                  speed: numberLabel(selectedPoint.speed),
                  index: numberLabel(index + 1),
                  total: numberLabel(points.length),
                })}
                {' · '}
                {t(
                  'Playback advances one displayed sample at a time and skips gaps. It does not reproduce actual journey timing.',
                )}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: '#005C3E' },
  hero: {
    backgroundColor: '#005C3E',
    paddingHorizontal: 18,
    paddingTop: 7,
    paddingBottom: 22,
  },
  heroInner: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: { flex: 1, gap: 4 },
  vehicleName: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  imei: { color: '#D5F0E4', fontSize: 12 },
  busIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A8B69',
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 28,
  },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 18 },
  rangeLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  muted: { color: colors.muted, fontSize: 14 },
  mapBlock: { gap: 7 },
  caption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 76,
    gap: 8,
  },
  action: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 2,
  },
  refreshIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F7FBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#006B47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, gap: 2 },
  actionTitle: { color: '#132F38', fontSize: 14, fontWeight: '800' },
  actionSubtitle: { color: colors.muted, fontSize: 11 },
  divider: { width: 1, backgroundColor: colors.line, marginVertical: 12 },
  scrubber: {
    minHeight: 69,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: '#EAF7F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  scrubTime: { color: '#17463F', fontSize: 12, fontWeight: '700' },
  trackArea: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 6,
    borderRadius: 8,
    backgroundColor: '#BADBD0',
    overflow: 'hidden',
  },
  progress: { height: '100%', backgroundColor: '#006B47' },
  thumb: {
    position: 'absolute',
    top: 12,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    backgroundColor: '#006B47',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playbackNote: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.74 },
  disabled: { opacity: 0.45 },
});
