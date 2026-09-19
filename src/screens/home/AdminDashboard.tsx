import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  NoorBadge,
  NoorCard,
  NoorIcon,
  NoorSection,
} from '../../components/Noor';
import { BannerCarousel, BannerItem } from '../../components/BannerCarousel';
import { HomeStackParams } from '../../navigation/types';
import { useTranslation, locale } from '../../i18n';
import { money, numberLabel, readable } from '../../utils/format';
import { uniqueStudents } from '../../utils/transport';
import { DashboardData, HomeNavigation } from './useDashboardData';
import { AlertRow, Stat } from './DashboardCards';
import { h } from './styles';

export const dashboardItems = [
  {
    screen: 'Students' as const,
    label: 'শিক্ষার্থী যোগ',
    icon: 'student',
    tint: '#E2F1FF',
    color: '#1998DE',
  },
  {
    screen: 'Bills' as const,
    label: 'পেমেন্ট যোগ',
    icon: 'payment',
    tint: '#DCF5E4',
    color: '#118C55',
  },
  {
    screen: 'Accounts' as const,
    label: 'খরচ যোগ',
    icon: 'receipt',
    tint: '#FFE9EB',
    color: '#EB4559',
  },
  {
    screen: 'Notices' as const,
    label: 'নোটিশ পাঠান',
    icon: 'bell',
    tint: '#EEE6FF',
    color: '#8043CF',
  },
];

export function AdminDashboard({
  dashboard,
  navigation,
  openBanner,
}: {
  dashboard: DashboardData;
  navigation: HomeNavigation;
  openBanner: (banner: BannerItem) => void;
}) {
  const { t } = useTranslation();
  const {
    core,
    management,
    data,
    extra,
    today,
    expected,
    paid,
    due,
    duePeople,
    unknown,
    students,
    active,
    absent,
    maintenance,
    activeMaintenanceIds,
    running,
    requestCount,
    banners,
  } = dashboard;
  const go = (screen: keyof HomeStackParams) =>
    navigation.navigate(screen as 'Fleet');
  return (
    <>
      <View style={h.dateRow}>
        <NoorIcon name="calendar" size={18} />
        <Text style={h.date}>
          {t('Today')}:{' '}
          {new Date(`${today}T12:00:00+06:00`).toLocaleDateString(locale(), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Dhaka',
          })}
        </Text>
      </View>
      <View style={h.stats}>
        <Stat
          color="#0087D4"
          icon="students"
          title={t('Total students')}
          value={extra ? numberLabel(uniqueStudents(students).length) : '—'}
          subtitle={t('Scheduled today: {{active}}  |  Absent: {{absent}}', {
            active: numberLabel(active),
            absent: numberLabel(absent),
          })}
          onPress={() => go('Students')}
        />
        <Stat
          color="#06933E"
          icon="vehicles"
          title={t('Total vehicles')}
          value={
            core.loading && !data.vehicles.length
              ? '—'
              : numberLabel(data.vehicles.length)
          }
          subtitle={t('Running: {{running}}  |  Issues: {{issues}}', {
            running: numberLabel(running),
            issues: numberLabel(activeMaintenanceIds.size),
          })}
          onPress={() => go('Vehicles')}
        />
        <Stat
          color="#F0A20A"
          icon="payment"
          title={t('Billed this month')}
          value={unknown ? '—' : money(expected)}
          subtitle={t('Paid: {{amount}}', {
            amount: unknown ? '—' : money(paid),
          })}
          onPress={() => go('Bills')}
        />
        <Stat
          color="#EE435B"
          icon="due"
          title={t('Outstanding dues')}
          value={unknown ? '—' : money(due)}
          subtitle={t('Total: {{number}} people', {
            number: numberLabel(duePeople),
          })}
          onPress={() => go('DueList')}
        />
      </View>
      <View style={h.urgent}>
        <View style={h.urgentTitle}>
          <View style={h.inline}>
            <NoorIcon name="emergency" size={19} color="#EB3B55" />
            <Text style={h.urgentText}>{t('Urgent matters')}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => go('Emergency')}>
            <Text style={h.viewAll}>{t('View all')} ›</Text>
          </Pressable>
        </View>
        {maintenance.slice(0, 1).map(item => (
          <AlertRow
            key={item.id}
            color="#EE405E"
            text={`${item.vehicleName} - ${item.title}`}
            onPress={() =>
              navigation.navigate('Maintenance', {
                vehicleId: item.vehicleId,
              })
            }
          />
        ))}
        {due > 0 ? (
          <AlertRow
            color="#ECAA15"
            text={t('Payments overdue for {{number}} people', {
              number: numberLabel(duePeople),
            })}
            onPress={() => go('DueList')}
          />
        ) : null}
        {requestCount > 0 ? (
          <AlertRow
            color="#168E51"
            text={t('{{number}} new applications / requests', {
              number: numberLabel(requestCount),
            })}
            onPress={() =>
              go(
                data.requests.some(r => r.status === 'PENDING')
                  ? 'Requested'
                  : 'OperationalRequests',
              )
            }
          />
        ) : null}
        {!maintenance.length && !due && !requestCount ? (
          <Text style={h.emptyText}>
            {core.loading || management.loading
              ? t('Loading data…')
              : t('No urgent matters right now.')}
          </Text>
        ) : null}
      </View>
      <BannerCarousel banners={banners} onPress={openBanner} />
      <NoorSection title={t('Quick actions')}>
        <View style={h.quickGrid}>
          {dashboardItems.map(item => (
            <Pressable
              key={item.screen}
              accessibilityRole="button"
              accessibilityLabel={t(item.label)}
              onPress={() =>
                item.screen === 'Accounts'
                  ? navigation.navigate('Accounts', { tab: 'EXPENSE' })
                  : go(item.screen)
              }
              style={h.quick}
            >
              <View style={[h.quickIcon, { backgroundColor: item.tint }]}>
                <NoorIcon name={item.icon} size={29} color={item.color} />
              </View>
              <Text style={h.quickLabel}>{t(item.label)}</Text>
            </Pressable>
          ))}
        </View>
      </NoorSection>
      <NoorSection
        title={t("Today's trips")}
        action={t('View all')}
        onAction={() => go('FleetMap')}
      >
        {data.vehicles.slice(0, 3).map(v => {
          const loc = data.locations.find(l => l.imei === v.imei);
          return (
            <Pressable
              key={v.id}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('VehicleDetails', { id: v.id })
              }
            >
              <NoorCard style={h.vehicle}>
                <View style={h.bus}>
                  <NoorIcon name="vehicles" color="#DFA81C" size={32} />
                </View>
                <View style={h.flex}>
                  <Text style={h.name}>{v.name}</Text>
                  <Text style={h.small}>
                    {t('Driver: {{name}}', {
                      name: v.driverName || t('Not assigned'),
                    })}
                  </Text>
                </View>
                <NoorBadge
                  label={
                    loc?.status === 'live'
                      ? `● ${readable('live')}`
                      : loc?.status === 'lastKnown'
                      ? readable('lastKnown')
                      : readable('offline')
                  }
                  tone={loc?.status === 'live' ? 'green' : 'gray'}
                />
              </NoorCard>
            </Pressable>
          );
        })}
        {!data.vehicles.length ? (
          <Text style={h.emptyText}>
            {t('Trips will appear here after adding a vehicle.')}
          </Text>
        ) : null}
      </NoorSection>
    </>
  );
}
