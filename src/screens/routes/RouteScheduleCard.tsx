import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Route, Vehicle } from '../../api/types';
import type { RouteSchedule } from '../../api/management';
import { Icon } from '../../components/Icon';
import { useTranslation } from '../../i18n';
import { money, numberLabel } from '../../utils/format';
import { scheduleTime } from '../fleet/format';
import { ScheduleEditor } from '../fleet/ScheduleEditor';

type Period = 'MORNING' | 'AFTERNOON';

export function RouteScheduleCard({
  route,
  vehicle,
  schedules,
  studentCount,
  isAdmin,
  editing,
  onOpenEdit,
  onCloseEdit,
}: {
  route: Route;
  vehicle?: Vehicle;
  schedules: RouteSchedule[];
  studentCount: number;
  isAdmin: boolean;
  editing: boolean;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
}) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('MORNING');
  const [expanded, setExpanded] = useState(true);

  const rows = useMemo(() => {
    const entries = schedules
      .filter(entry => entry.period === period)
      .sort((a, b) => a.position - b.position);
    return entries.length
      ? entries.map(entry => ({
          id: entry.id,
          label: entry.label,
          time: scheduleTime(entry.time),
        }))
      : route.stops.map(stop => ({ id: stop.id, label: stop.name, time: '—' }));
  }, [period, route.stops, schedules]);

  const status =
    vehicle?.status === 'MAINTENANCE'
      ? t('Maintenance')
      : vehicle?.status === 'INACTIVE'
      ? t('Inactive')
      : vehicle?.status === 'RUNNING'
      ? t('Active')
      : null;

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Vehicle schedule')}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)}
          style={s.vehicleHeader}
        >
          <View style={s.vehicleIcon}>
            <Icon name="bus" size={32} color="#C88D00" />
          </View>
          <View style={s.vehicleText}>
            <View style={s.vehicleTitleLine}>
              <Text style={s.vehicleTitle} numberOfLines={1}>
                {vehicle?.name || route.vehicleName}
              </Text>
              {status ? (
                <View
                  style={[
                    s.statusBadge,
                    vehicle?.status === 'MAINTENANCE' && s.maintenanceBadge,
                    vehicle?.status === 'INACTIVE' && s.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      s.statusText,
                      vehicle?.status === 'MAINTENANCE' && s.maintenanceText,
                      vehicle?.status === 'INACTIVE' && s.inactiveText,
                    ]}
                  >
                    {status}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={s.subtext} numberOfLines={1}>
              {t('Driver: {{name}}', {
                name: vehicle?.driverName || t('Not assigned'),
              })}
            </Text>
            <Text style={s.subtext} numberOfLines={1}>
              {t('Students: {{number}}', { number: numberLabel(studentCount) })}
              {'  ·  '}
              {money(route.monthlyAmount)} ({t('monthly fee')})
            </Text>
          </View>
          <View style={expanded && s.chevronExpanded}>
            <Icon name="chevron" size={21} color="#18283D" />
          </View>
        </Pressable>

        {expanded ? (
          <>
            <View style={s.tabs} accessibilityRole="tablist">
              {(['MORNING', 'AFTERNOON'] as const).map(value => {
                const selected = value === period;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setPeriod(value)}
                    style={[s.tab, selected ? s.selectedTab : s.unselectedTab]}
                  >
                    <Icon
                      name={value === 'MORNING' ? 'home' : 'route'}
                      size={19}
                      color={selected ? '#FFFFFF' : '#637384'}
                    />
                    <Text
                      style={[
                        s.tabText,
                        selected ? s.selectedTabText : s.unselectedTabText,
                      ]}
                    >
                      {value === 'MORNING'
                        ? t('Pickup order')
                        : t('Return schedule')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.tableHead}>
              <Text style={[s.tableHeadText, s.numberColumn]}>#</Text>
              <Text style={[s.tableHeadText, s.stopColumn]}>
                {t('Student name / stop')}
              </Text>
              <Text style={[s.tableHeadText, s.timeColumn]}>{t('Time')}</Text>
              {isAdmin ? <View style={s.moreColumn} /> : null}
            </View>
            {rows.map((row, index) => (
              <View key={row.id} style={s.tableRow}>
                <View style={s.numberColumn}>
                  <View style={s.numberCircle}>
                    <Text style={s.numberText}>{numberLabel(index + 1)}</Text>
                  </View>
                </View>
                <Text style={[s.cellText, s.stopColumn]} numberOfLines={2}>
                  {row.label}
                </Text>
                <Text style={[s.cellText, s.timeColumn]} numberOfLines={1}>
                  {row.time}
                </Text>
                {isAdmin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Edit schedule')}: ${row.label}`}
                    onPress={onOpenEdit}
                    style={s.moreColumn}
                    hitSlop={6}
                  >
                    <Text style={s.moreText}>⋯</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </>
        ) : null}
      </View>

      {editing && isAdmin ? (
        <ScheduleEditor
          routeId={route.id}
          initial={schedules.map(
            ({ id: _id, routeId: _routeId, ...entry }) => entry,
          )}
          stops={route.stops}
          onDone={onCloseEdit}
        />
      ) : null}
    </View>
  );
}

export function RouteScheduleActions({
  isAdmin,
  editing,
  onEdit,
  onApplyRoute,
  onViewMap,
}: {
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onApplyRoute: () => void;
  onViewMap: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.footer}>
      <View style={s.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={isAdmin ? onEdit : onApplyRoute}
          style={[s.action, s.primaryAction]}
        >
          <Icon name={isAdmin ? 'edit' : 'plus'} size={20} color="#FFFFFF" />
          <Text style={s.primaryActionText}>
            {isAdmin
              ? editing
                ? t('Close')
                : t('Edit schedule')
              : t('Apply for this route')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onViewMap}
          style={[s.action, s.mapAction]}
        >
          <Icon name="routes" size={21} color="#006B56" />
          <Text style={s.mapActionText}>{t('View on live map')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5EFED',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#376653',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 74,
    marginBottom: 12,
  },
  vehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleText: { flex: 1, gap: 3 },
  vehicleTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleTitle: {
    color: '#14253B',
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  statusBadge: {
    borderRadius: 8,
    backgroundColor: '#E6F6EF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  maintenanceBadge: { backgroundColor: '#FFF2D4' },
  inactiveBadge: { backgroundColor: '#EEF2F3' },
  statusText: { color: '#00664A', fontWeight: '700', fontSize: 11 },
  maintenanceText: { color: '#98600A' },
  inactiveText: { color: '#68798C' },
  subtext: { color: '#68798C', fontSize: 12, lineHeight: 17 },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  tabs: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  tab: {
    flex: 1,
    minHeight: 43,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 6,
  },
  selectedTab: { backgroundColor: '#008563' },
  unselectedTab: { backgroundColor: '#F1F4F4' },
  tabText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  selectedTabText: { color: '#FFFFFF' },
  unselectedTabText: { color: '#627182' },
  tableHead: {
    backgroundColor: '#F1F7F6',
    borderRadius: 7,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
  },
  tableHeadText: { color: '#66798C', fontSize: 11, fontWeight: '700' },
  numberColumn: { width: 38 },
  stopColumn: { flex: 1, paddingRight: 5 },
  timeColumn: { width: 57 },
  moreColumn: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderBottomColor: '#E7EFF1',
    borderBottomWidth: 1,
    paddingHorizontal: 9,
  },
  numberCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#EFF3F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: { fontSize: 12, fontWeight: '700', color: '#182D46' },
  cellText: { color: '#354B62', fontSize: 12, lineHeight: 18 },
  moreText: {
    color: '#8DA0B2',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
  actions: { flexDirection: 'row', gap: 8 },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: '#E5EFED',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  action: {
    flex: 1,
    borderRadius: 9,
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 7,
  },
  primaryAction: { backgroundColor: '#008563' },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  mapAction: { backgroundColor: '#D7F3E8' },
  mapActionText: {
    color: '#006B56',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
});
