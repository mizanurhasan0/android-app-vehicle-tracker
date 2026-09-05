import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Empty,
  Field,
  Notice,
  Page,
  Select,
} from '../components/ui';
import { HistoryMap } from '../components/HistoryMap';
import { useAuth } from '../context/AuthContext';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { HomeStackParams } from '../navigation/types';
import {
  dhakaDate,
  historyRange,
  historyTime,
  HistoryPeriod,
  parseDay,
  shiftPeriod,
} from '../utils/historyDates';
import { styles } from '../theme';
export function VehicleHistoryScreen({
  route: navigationRoute,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'VehicleHistory'>) {
  const { session } = useAuth();
  const { imei, name } = navigationRoute.params;
  const [day, setDay] = useState(dhakaDate());
  const [input, setInput] = useState(day);
  const [dateError, setDateError] = useState('');
  const [period, setPeriod] = useState<HistoryPeriod>('day');
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const range = historyRange(day, period);
  const history = useVehicleHistory(imei, range.from, range.to);
  const points =
    history.route?.segments.flatMap(segment => segment.points) ?? [];
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
  const selectDay = (value: string) => {
    setDay(value);
    setInput(value);
    setDateError('');
  };
  if (session?.user.role !== 'ADMIN')
    return (
      <Page title="Travel history">
        <Notice
          kind="error"
          text="History is available to administrators only."
        />
      </Page>
    );
  return (
    <Page
      title={`${name} history`}
      subtitle={`${imei} · All dates and times: Asia/Dhaka (UTC+6)`}
      loading={history.loading}
      error={history.error}
    >
      <Button
        secondary
        title="Back to fleet"
        onPress={() => navigation.goBack()}
      />
      <Select
        label="Period"
        value={period}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week (Monday–Sunday)' },
          { value: 'month', label: 'Calendar month' },
        ]}
        onChange={value => {
          if (['day', 'week', 'month'].includes(value))
            setPeriod(value as HistoryPeriod);
        }}
      />
      <Field
        label="Date (YYYY-MM-DD)"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <Notice text={dateError} kind="error" />
      <Button
        title="Show selected date"
        onPress={() => {
          try {
            parseDay(input);
            selectDay(input);
          } catch (error) {
            setDateError((error as Error).message);
          }
        }}
      />
      <Button
        secondary
        title="Today"
        onPress={() => {
          setPeriod('day');
          selectDay(dhakaDate());
        }}
      />
      <Text style={styles.heading}>{range.label}</Text>
      <Button
        secondary
        title="Previous period"
        onPress={() => selectDay(shiftPeriod(day, period, -1))}
      />
      <Button
        secondary
        title="Next period"
        disabled={range.to > new Date().toISOString()}
        onPress={() => selectDay(shiftPeriod(day, period, 1))}
      />
      <Button
        secondary
        title={history.error ? 'Retry history' : 'Refresh history'}
        busy={history.loading}
        onPress={history.retry}
      />
      {history.loading ? (
        <Text style={styles.muted}>Loading recorded journey…</Text>
      ) : null}
      {history.route ? (
        <>
          {!history.route.freshness.complete ? (
            <Notice
              kind="error"
              text={`${history.route.freshness.pendingPoints} positions are waiting to sync. This history is incomplete; refresh shortly.`}
            />
          ) : null}
          {!points.length ? (
            <Empty
              title="No recorded positions in this period"
              detail="History starts when recording is enabled. Earlier journeys cannot be recovered from the latest location."
            />
          ) : (
            <>
              <Card>
                <Text style={styles.heading}>
                  {(history.route.distanceMeters / 1000).toFixed(2)} km
                  estimated
                </Text>
                <Text style={styles.body}>
                  {history.route.pointCount} recorded positions ·{' '}
                  {history.route.gapCount} reporting gaps
                </Text>
                <Text style={styles.muted}>
                  {historyTime(points[0].gpsTime)} —{' '}
                  {historyTime(points[points.length - 1].gpsTime)}
                </Text>
              </Card>
              <HistoryMap route={history.route} selected={points[index]} />
              <Text style={styles.muted}>
                Recorded samples show the observed path. Gaps are left
                disconnected; exact roads between reports are unknown.
                {history.route.simplified
                  ? ` Overview simplified to ${history.route.displayedPointCount} points.`
                  : ''}
              </Text>
              <Text style={styles.body}>
                {historyTime(points[index]?.gpsTime ?? points[0].gpsTime)} ·{' '}
                {points[index]?.speed ?? 0} km/h · Point {index + 1}/
                {points.length}
              </Text>
              <Button
                title={playing ? 'Pause playback' : 'Play recorded samples'}
                disabled={points.length < 2}
                onPress={() => {
                  if (index >= points.length - 1) setIndex(0);
                  setPlaying(value => !value);
                }}
              />
              <Button
                secondary
                title="Restart playback"
                onPress={() => {
                  setPlaying(false);
                  setIndex(0);
                }}
              />
              <Text style={styles.muted}>
                Playback advances one displayed sample at a time and skips gaps.
                It does not reproduce actual journey timing.
              </Text>
            </>
          )}
        </>
      ) : null}
      {period !== 'day'
        ? history.summary?.days.map(item => (
            <Card key={item.date}>
              <Text style={styles.heading}>{item.date}</Text>
              <Text style={styles.body}>
                {(item.distanceMeters / 1000).toFixed(2)} km · {item.pointCount}{' '}
                positions · {item.gapCount} gaps
              </Text>
              <Button
                secondary
                title={`View ${item.date} route`}
                onPress={() => {
                  setPeriod('day');
                  selectDay(item.date);
                }}
              />
            </Card>
          ))
        : null}
    </Page>
  );
}
