import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import {
  NoorAvatar,
  NoorBadge,
  NoorBrand,
  NoorIcon,
  NoorCard,
  NoorSection,
} from '../components/Noor';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { Notice } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useManagement } from '../context/ManagementContext';
import { money, numberLabel } from '../utils/format';
import { dhakaDate } from '../utils/historyDates';
import { colors } from '../theme';

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
export function HomeScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Fleet'>) {
  const { session } = useAuth();
  const core = useData();
  const management = useManagement();
  const [profileVisible, setProfileVisible] = useState(false);
  const user = session!.user,
    admin = user.role === 'ADMIN';
  const data = core.data;
  const extra = management.data;
  const today = dhakaDate(),
    month = today.slice(0, 7);
  const monthBills = data.bills.filter(b => b.month === month);
  const expected = monthBills.reduce((s, b) => s + b.amount, 0);
  const paid = monthBills
    .filter(b => b.status === 'PAID')
    .reduce((s, b) => s + b.amount, 0);
  const due = data.bills
    .filter(b => b.status === 'UNPAID')
    .reduce((s, b) => s + b.amount, 0);
  const duePeople = new Set(
    data.bills.filter(b => b.status === 'UNPAID').map(b => b.guardianName),
  ).size;
  const unknown = (core.loading || !!core.error) && !data.bills.length;
  const unread = data.notifications.filter(n => !n.readAt).length;
  const student =
    extra?.students.find(s => s.status === 'ACTIVE') || extra?.students[0];
  const students = extra?.students || [];
  const active = students.filter(s => s.status === 'ACTIVE').length;
  const absent =
    extra?.attendance.filter(
      a => a.studentId && a.date === today && a.status === 'ABSENT',
    ).length || 0;
  const maintenance =
    extra?.maintenance.filter(m => m.status === 'IN_PROGRESS') || [];
  const activeMaintenanceIds = new Set(maintenance.map(m => m.vehicleId));
  const running = data.vehicles.filter(
    v =>
      v.status === 'RUNNING' || (!v.status && !activeMaintenanceIds.has(v.id)),
  ).length;
  const requestCount =
    data.requests.filter(r => r.status === 'PENDING').length +
    (extra?.requests.filter(r => r.status === 'PENDING').length || 0);
  const vehicle =
    data.vehicles.find(v => v.id === student?.vehicleId) || data.vehicles[0];
  const location = data.locations.find(l => l.imei === vehicle?.imei);
  const pending = data.requests.find(r => r.status === 'PENDING');
  const refresh = async () => {
    await Promise.all([core.refresh(), management.refresh()]);
  };
  const go = (screen: keyof HomeStackParams) =>
    navigation.navigate(screen as 'Fleet');
  return (
    <SafeAreaView style={h.safe} edges={['top', 'left', 'right']}>
      <View style={h.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="মেনু"
          onPress={() => go('More')}
          style={h.headerButton}
        >
          <NoorIcon name="menu" color="#FFFFFF" size={25} />
        </Pressable>
        <View style={h.brand}>
          <NoorBrand
            compact
            light
            subtitle={admin ? 'Admin' : 'Parent Dashboard'}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`নোটিফিকেশন, ${unread} অপঠিত`}
          onPress={() => go('Inbox')}
          style={h.headerButton}
        >
          <NoorIcon name="bell" color="#FFFFFF" size={23} />
          {unread > 0 ? (
            <View style={h.unread}>
              <Text style={h.unreadText}>{numberLabel(unread)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={h.scroll}
        refreshControl={
          <RefreshControl
            refreshing={core.loading || management.loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={h.content}>
          <Notice text={core.error || management.error} kind="error" />
          {admin ? (
            <>
              <View style={h.dateRow}>
                <NoorIcon name="calendar" size={18} />
                <Text style={h.date}>
                  আজ:{' '}
                  {new Date(`${today}T12:00:00+06:00`).toLocaleDateString(
                    'bn-BD',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'Asia/Dhaka',
                    },
                  )}
                </Text>
              </View>
              <View style={h.stats}>
                <Stat
                  color="#0087D4"
                  icon="students"
                  title="মোট শিক্ষার্থী"
                  value={extra ? numberLabel(students.length) : '—'}
                  subtitle={`সক্রিয়: ${numberLabel(
                    active,
                  )}  |  অনুপস্থিত: ${numberLabel(absent)}`}
                  onPress={() => go('Students')}
                />
                <Stat
                  color="#06933E"
                  icon="vehicles"
                  title="মোট গাড়ি"
                  value={
                    core.loading && !data.vehicles.length
                      ? '—'
                      : numberLabel(data.vehicles.length)
                  }
                  subtitle={`চলমান: ${numberLabel(
                    running,
                  )}  |  সমস্যা: ${numberLabel(activeMaintenanceIds.size)}`}
                  onPress={() => go('Vehicles')}
                />
                <Stat
                  color="#F0A20A"
                  icon="payment"
                  title="এই মাসের পাওনা"
                  value={unknown ? '—' : money(expected)}
                  subtitle={`পরিশোধিত: ${unknown ? '—' : money(paid)}`}
                  onPress={() => go('Bills')}
                />
                <Stat
                  color="#EE435B"
                  icon="due"
                  title="বকেয়া"
                  value={unknown ? '—' : money(due)}
                  subtitle={`মোট: ${numberLabel(duePeople)} জন`}
                  onPress={() => go('DueList')}
                />
              </View>
              <View style={h.urgent}>
                <View style={h.urgentTitle}>
                  <View style={h.inline}>
                    <NoorIcon name="emergency" size={19} color="#EB3B55" />
                    <Text style={h.urgentText}>জরুরি বিষয়</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => go('Emergency')}
                  >
                    <Text style={h.viewAll}>View All ›</Text>
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
                    text={`${numberLabel(duePeople)} জনের পেমেন্ট বকেয়া`}
                    onPress={() => go('DueList')}
                  />
                ) : null}
                {requestCount > 0 ? (
                  <AlertRow
                    color="#168E51"
                    text={`${numberLabel(
                      requestCount,
                    )}টি নতুন আবেদন / রিকোয়েস্ট`}
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
                      ? 'তথ্য লোড হচ্ছে…'
                      : 'এই মুহূর্তে কোনো জরুরি বিষয় নেই।'}
                  </Text>
                ) : null}
              </View>
              <NoorSection title="দ্রুত কার্যক্রম">
                <View style={h.quickGrid}>
                  {dashboardItems.map(item => (
                    <Pressable
                      key={item.screen}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      onPress={() =>
                        item.screen === 'Accounts'
                          ? navigation.navigate('Accounts', { tab: 'EXPENSE' })
                          : go(item.screen)
                      }
                      style={h.quick}
                    >
                      <View
                        style={[h.quickIcon, { backgroundColor: item.tint }]}
                      >
                        <NoorIcon
                          name={item.icon}
                          size={29}
                          color={item.color}
                        />
                      </View>
                      <Text style={h.quickLabel}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </NoorSection>
              <NoorSection
                title="আজকের ট্রিপ"
                action="সব দেখুন"
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
                            ড্রাইভার: {v.driverName || 'নির্ধারিত হয়নি'}
                          </Text>
                        </View>
                        <NoorBadge
                          label={
                            loc?.status === 'live'
                              ? '● Live'
                              : loc?.status === 'lastKnown'
                              ? 'শেষ অবস্থান'
                              : 'অফলাইন'
                          }
                          tone={loc?.status === 'live' ? 'green' : 'gray'}
                        />
                      </NoorCard>
                    </Pressable>
                  );
                })}
                {!data.vehicles.length ? (
                  <Text style={h.emptyText}>
                    গাড়ি যোগ করলে এখানে ট্রিপ দেখা যাবে।
                  </Text>
                ) : null}
              </NoorSection>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`প্রোফাইল, ${user.name}`}
                onPress={() => setProfileVisible(true)}
              >
                <Text style={h.greeting}>আসসালামু আলাইকুম</Text>
                <Text style={h.parentName}>{user.name}</Text>
                <Text style={h.small}>Parent Dashboard</Text>
              </Pressable>
              {student ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate('ParentProfile', { id: student.id })
                  }
                >
                  <NoorCard style={h.studentCard}>
                    <NoorAvatar
                      name={student.studentName}
                      photoUrl={student.photoUrl}
                    />
                    <View style={h.flex}>
                      <Text style={h.name}>{student.studentName}</Text>
                      <Text style={h.small}>
                        {student.className ? student.className : 'শিক্ষার্থী'}
                        {student.roll ? `  |  Roll: ${student.roll}` : ''}
                      </Text>
                    </View>
                    <Text style={h.arrow}>›</Text>
                  </NoorCard>
                </Pressable>
              ) : (
                <NoorCard>
                  <Text style={h.name}>
                    {pending
                      ? 'আপনার আবেদন পর্যালোচনায় আছে'
                      : 'আপনার সন্তানকে পরিবহন সেবায় যুক্ত করুন'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      go(pending ? 'ApplicationStatus' : 'Admission')
                    }
                  >
                    <Text style={h.link}>
                      {pending ? 'আবেদনের অবস্থা দেখুন' : 'অনলাইনে ভর্তি করুন'}{' '}
                      ›
                    </Text>
                  </Pressable>
                </NoorCard>
              )}
              {vehicle ? (
                <View style={h.vehiclePill}>
                  <NoorIcon name="vehicles" size={15} />
                  <Text style={h.vehiclePillText}>
                    {vehicle.name} ·{' '}
                    {location?.status === 'live'
                      ? 'চলমান'
                      : 'শেষ অবস্থান দেখুন'}
                  </Text>
                </View>
              ) : null}
              <View style={h.stats}>
                <Stat
                  color="#078254"
                  icon="pin"
                  title="লোকেশন দেখুন"
                  value="Live Tracking"
                  small
                  onPress={() =>
                    navigation.navigate(
                      'LiveTracking',
                      vehicle ? { vehicleId: vehicle.id } : undefined,
                    )
                  }
                />
                <Stat
                  color="#F05B66"
                  icon="due"
                  title="পেমেন্ট"
                  value={unknown ? '—' : money(due)}
                  subtitle="মোট বকেয়া"
                  onPress={() => go('Bills')}
                />
                <Stat
                  color="#F27783"
                  icon="calendar"
                  title="নোটিশ"
                  value={`${numberLabel(unread)}টি নতুন`}
                  small
                  onPress={() => go('Inbox')}
                />
                <Stat
                  color="#4F83F2"
                  icon="document"
                  title="আবেদন"
                  value="নতুন ভর্তি"
                  small
                  onPress={() => go('Admission')}
                />
              </View>
              <NoorSection
                title="গাড়ির বর্তমান অবস্থা"
                action="দেখুন"
                onAction={() => go('LiveTracking')}
              >
                {vehicle ? (
                  <NoorCard style={h.vehicle}>
                    <View style={h.bus}>
                      <NoorIcon name="vehicles" color="#DFA81C" size={32} />
                    </View>
                    <View style={h.flex}>
                      <Text style={h.name}>{vehicle.name}</Text>
                      <Text style={h.small}>
                        Driver: {vehicle.driverName || 'নির্ধারিত হয়নি'}
                      </Text>
                      <Text style={h.small}>
                        {location?.positionAt
                          ? `আপডেট: ${new Date(
                              location.positionAt,
                            ).toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Dhaka',
                            })}`
                          : 'অবস্থান অপেক্ষমাণ'}
                      </Text>
                    </View>
                    <NoorBadge
                      label={location?.status === 'live' ? '● Live' : 'অফলাইন'}
                      tone={location?.status === 'live' ? 'green' : 'gray'}
                    />
                  </NoorCard>
                ) : (
                  <Text style={h.emptyText}>
                    আবেদন অনুমোদনের পর নির্ধারিত গাড়ি দেখা যাবে।
                  </Text>
                )}
              </NoorSection>
            </>
          )}
        </View>
      </ScrollView>
      {profileVisible ? (
        <ProfileDrawer visible onClose={() => setProfileVisible(false)} />
      ) : null}
    </SafeAreaView>
  );
}
function Stat({
  color,
  icon,
  title,
  value,
  subtitle,
  onPress,
  small = false,
}: {
  color: string;
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        h.stat,
        { backgroundColor: color },
        pressed && h.pressed,
      ]}
    >
      <View style={h.statTop}>
        <NoorIcon name={icon} color="#FFFFFF" size={28} />
        <Text style={h.statTitle}>{title}</Text>
      </View>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[h.statValue, small && h.statValueSmall]}
      >
        {value}
      </Text>
      {subtitle ? <Text style={h.statSub}>{subtitle}</Text> : null}
    </Pressable>
  );
}
function AlertRow({
  text,
  color,
  onPress,
}: {
  text: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={h.alertRow}>
      <View style={[h.dot, { backgroundColor: color }]} />
      <Text style={h.alertText}>{text}</Text>
      <Text style={h.arrow}>›</Text>
    </Pressable>
  );
}
const h = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#005C3E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
    gap: 4,
    backgroundColor: '#005C3E',
  },
  headerButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { flex: 1 },
  unread: {
    position: 'absolute',
    top: 1,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4761',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  scroll: { flexGrow: 1, backgroundColor: '#FFFFFF', padding: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 13 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  date: { fontSize: 13, fontWeight: '500', color: colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '48.4%',
    flexGrow: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 115,
    gap: 4,
  },
  statTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  statTitle: { fontSize: 13, color: '#FFFFFF', flexShrink: 1 },
  statValue: {
    fontSize: 29,
    lineHeight: 37,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statValueSmall: { fontSize: 20, lineHeight: 28 },
  statSub: { fontSize: 11, color: '#FFFFFF', lineHeight: 18 },
  urgent: {
    borderWidth: 1,
    borderColor: '#F3E4E5',
    borderRadius: 7,
    overflow: 'hidden',
  },
  urgentTitle: {
    backgroundColor: '#FFE5E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentText: { fontSize: 15, fontWeight: '700', color: '#DC3C51' },
  viewAll: { fontSize: 12, color: '#DB3E56' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 38,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F3',
  },
  dot: { height: 11, width: 11, borderRadius: 6 },
  alertText: { fontSize: 12, color: colors.ink, flex: 1 },
  arrow: { fontSize: 23, color: colors.muted },
  emptyText: { fontSize: 12, color: colors.muted, padding: 10, lineHeight: 21 },
  quickGrid: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: {
    width: '100%',
    height: 61,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 11, color: colors.ink, textAlign: 'center' },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F3DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 3 },
  name: { fontSize: 14, color: colors.ink, fontWeight: '700' },
  small: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  greeting: { fontSize: 13, color: colors.ink },
  parentName: { fontSize: 19, fontWeight: '700', color: colors.ink },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5FBFF',
    gap: 10,
  },
  link: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    paddingVertical: 6,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: '#E4F5E5',
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 15,
    marginTop: -7,
  },
  vehiclePillText: { fontSize: 11, color: colors.primary },
  pressed: { opacity: 0.8 },
});
