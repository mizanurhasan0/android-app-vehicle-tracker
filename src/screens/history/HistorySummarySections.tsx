import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MapPin,
  Route as RouteIcon,
  TriangleAlert,
} from 'lucide-react-native';
import type { HistoryDay, HistoryRoute, HistorySummary } from '../../api/types';
import { locale, useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { numberLabel } from '../../utils/format';

const INK = '#102536';
const GREEN = '#006B50';

type HistoryMetricsProps = {
  route?: HistoryRoute;
  summary?: HistorySummary;
  loading?: boolean;
};

export function HistoryMetrics({
  route,
  summary,
  loading = false,
}: HistoryMetricsProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const narrow = width < 350;
  if (!route && !summary && !loading) return null;
  const totals = summary?.days.reduce(
    (sum, day) => ({
      distanceMeters: sum.distanceMeters + day.distanceMeters,
      pointCount: sum.pointCount + day.pointCount,
      gapCount: sum.gapCount + day.gapCount,
    }),
    { distanceMeters: 0, pointCount: 0, gapCount: 0 },
  );
  const distanceMeters = route?.distanceMeters ?? totals?.distanceMeters;
  const pointCount = route?.pointCount ?? totals?.pointCount;
  const gapCount = route?.gapCount ?? totals?.gapCount;
  const distanceKm = (distanceMeters ?? 0) / 1000;
  const distanceValue =
    distanceMeters === undefined && loading
      ? '—'
      : `${numberLabel(distanceKm, distanceKm < 1 ? 2 : 1)} ${t('km')}`;

  const cards = [
    {
      key: 'distance',
      icon: <RouteIcon size={23} color={GREEN} strokeWidth={2.2} />,
      value: distanceValue,
      label: t('Estimated distance'),
      cardStyle: s.distanceCard,
    },
    {
      key: 'positions',
      icon: <MapPin size={23} color="#244A68" strokeWidth={2.2} />,
      value:
        pointCount === undefined && loading
          ? '—'
          : numberLabel(pointCount ?? 0, 0),
      label: t('Positions'),
      cardStyle: s.positionsCard,
    },
    {
      key: 'gaps',
      icon: <TriangleAlert size={23} color="#CF514A" strokeWidth={2.2} />,
      value:
        gapCount === undefined && loading ? '—' : numberLabel(gapCount ?? 0, 0),
      label: t('Reporting gaps'),
      cardStyle: s.gapsCard,
    },
  ];

  return (
    <View style={s.metrics}>
      {cards.map(card => (
        <View
          key={card.key}
          accessible
          accessibilityLabel={`${card.value}, ${card.label}`}
          style={[s.metricCard, card.cardStyle, narrow && s.metricCardNarrow]}
        >
          {card.icon}
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={1}
            style={[s.metricValue, narrow && s.metricValueNarrow]}
          >
            {card.value}
          </Text>
          <Text
            numberOfLines={2}
            style={[s.metricLabel, narrow && s.metricLabelNarrow]}
          >
            {card.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

type RecordedDaysProps = {
  days?: HistoryDay[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
};

function dayLabels(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const dateLocale = locale();
  return {
    dayNumber: date.toLocaleDateString(dateLocale, {
      timeZone: 'UTC',
      day: 'numeric',
    }),
    title: date.toLocaleDateString(dateLocale, {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    weekday: date.toLocaleDateString(dateLocale, {
      timeZone: 'UTC',
      weekday: 'short',
    }),
  };
}

export function RecordedDays({
  days,
  selectedDay,
  onSelectDay,
}: RecordedDaysProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const narrow = width < 500;
  const recorded = (days ?? [])
    .filter(item => item.pointCount > 0)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!recorded.length) return null;

  const visible = expanded ? recorded : recorded.slice(0, 2);
  return (
    <View style={s.daysSection}>
      <View style={s.daysHeading}>
        <View style={s.daysHeadingLeft}>
          <CalendarDays size={21} color={GREEN} strokeWidth={2} />
          <Text style={s.daysTitle}>{t('Recorded days')}</Text>
        </View>
        <Text style={s.daysCount}>{numberLabel(recorded.length, 0)}</Text>
      </View>

      {visible.map(item => {
        const labels = dayLabels(item.date);
        const selected = item.date === selectedDay;
        const km = item.distanceMeters / 1000;
        return (
          <Pressable
            key={item.date}
            accessibilityRole="button"
            accessibilityLabel={`${labels.title}, ${numberLabel(
              km,
              km < 1 ? 2 : 1,
            )} ${t('km')}, ${numberLabel(item.pointCount, 0)} ${t(
              'Positions',
            )}, ${numberLabel(item.gapCount, 0)} ${t('Reporting gaps')}`}
            accessibilityHint={t('View {{date}} route', { date: labels.title })}
            accessibilityState={{ selected }}
            onPress={() => onSelectDay(item.date)}
            style={({ pressed }) => [
              s.dayRow,
              selected && s.dayRowSelected,
              pressed && s.pressed,
            ]}
          >
            <View style={[s.dayCircle, selected && s.dayCircleSelected]}>
              <Text
                style={[s.dayCircleText, selected && s.dayCircleTextSelected]}
              >
                {labels.dayNumber}
              </Text>
            </View>
            <View style={s.dayMain}>
              <Text style={s.dayDate} numberOfLines={1}>
                {labels.title}
              </Text>
              <Text style={s.dayWeekday}>{labels.weekday}</Text>
              {narrow ? (
                <Text style={s.dayDetailsCompact} numberOfLines={1}>
                  {`${numberLabel(km, km < 1 ? 2 : 1)} ${t(
                    'km',
                  )} · ${numberLabel(item.pointCount, 0)} ${t(
                    'Positions',
                  )} · ${numberLabel(item.gapCount, 0)} ${t('Reporting gaps')}`}
                </Text>
              ) : null}
            </View>
            {!narrow ? (
              <View style={s.dayDetails}>
                <Text style={s.dayMetric} numberOfLines={1}>
                  {numberLabel(km, km < 1 ? 2 : 1)} {t('km')}
                </Text>
                <Text style={s.dayMetric} numberOfLines={1}>
                  {numberLabel(item.pointCount, 0)} {t('Positions')}
                </Text>
                <Text style={s.dayMetric} numberOfLines={1}>
                  {numberLabel(item.gapCount, 0)} {t('Reporting gaps')}
                </Text>
              </View>
            ) : null}
            <ChevronRight size={20} color={INK} strokeWidth={2} />
          </Pressable>
        );
      })}
      {recorded.length > 2 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)}
          style={({ pressed }) => [s.showMore, pressed && s.pressed]}
        >
          <Text style={s.showMoreText}>
            {expanded
              ? t('Show fewer days')
              : t('Show all {{count}} days', { count: recorded.length })}
          </Text>
          {expanded ? (
            <ChevronUp size={17} color={GREEN} />
          ) : (
            <ChevronDown size={17} color={GREEN} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 0,
    minHeight: 108,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  metricCardNarrow: {
    minHeight: 98,
    paddingHorizontal: 5,
  },
  distanceCard: { backgroundColor: '#E7F6F0' },
  positionsCard: { backgroundColor: '#EAF3FC' },
  gapsCard: { backgroundColor: '#FCEEEB' },
  metricValue: {
    color: '#0F1D2A',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  metricValueNarrow: { fontSize: 20 },
  metricLabel: {
    color: '#506879',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  metricLabelNarrow: { fontSize: 11, lineHeight: 14 },
  daysSection: {
    backgroundColor: colors.surface,
    borderColor: '#DBE7E5',
    borderWidth: 1,
    borderRadius: 17,
    padding: 11,
    gap: 9,
  },
  daysHeading: {
    minHeight: 36,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  daysHeadingLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  daysTitle: { color: INK, fontSize: 17, fontWeight: '700' },
  daysCount: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#E9F5F0',
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayRow: {
    minHeight: 72,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E9E9',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dayRowSelected: {
    borderColor: '#D5EEE3',
    backgroundColor: '#E8F8F1',
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E4E9EC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayCircleSelected: { backgroundColor: GREEN },
  dayCircleText: { color: INK, fontSize: 19, fontWeight: '800' },
  dayCircleTextSelected: { color: '#FFFFFF' },
  dayMain: { flex: 1, minWidth: 0 },
  dayDate: { color: INK, fontSize: 14, fontWeight: '700' },
  dayWeekday: { color: '#697E8C', fontSize: 12, marginTop: 2 },
  dayDetails: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: 7,
  },
  dayMetric: { color: '#244953', fontSize: 11, fontWeight: '600' },
  dayDetailsCompact: { color: '#42606C', fontSize: 11, marginTop: 3 },
  showMore: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  showMoreText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
