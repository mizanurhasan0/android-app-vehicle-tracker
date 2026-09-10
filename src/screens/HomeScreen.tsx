import React, { useEffect, useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { HomeStackParams } from '../navigation/types';
import { Page } from '../components/ui';
import { AppIcon, AppIconKind } from '../components/AppIcon';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import { money, numberLabel } from '../utils/format';

type Destination =
  | 'CreateVehicle'
  | 'Students'
  | 'Bills'
  | 'DueList'
  | 'Requested'
  | 'Complaints'
  | 'StopRequests'
  | 'PaymentAccounts'
  | 'Vehicles'
  | 'Routes';
export const dashboardItems: {
  screen: Destination;
  label: string;
  icon: AppIconKind;
  adminOnly?: boolean;
}[] = [
  {
    screen: 'CreateVehicle',
    label: 'Create vehicle',
    icon: 'createVehicle',
    adminOnly: true,
  },
  { screen: 'Students', label: 'Student list', icon: 'students' },
  { screen: 'Bills', label: 'Bills', icon: 'bills' },
  { screen: 'DueList', label: 'Due list', icon: 'due' },
  { screen: 'Requested', label: 'Requested', icon: 'applications' },
  { screen: 'Complaints', label: 'Complaints', icon: 'complaints' },
  { screen: 'StopRequests', label: 'Stop requests', icon: 'stop' },
  { screen: 'PaymentAccounts', label: 'Payment accounts', icon: 'payments' },
  { screen: 'Vehicles', label: 'Vehicles', icon: 'vehicles' },
  { screen: 'Routes', label: 'Routes', icon: 'routes' },
];
const shortcutColors = [
  { background: '#E4F4EF', ink: '#08776C' },
  { background: '#ECEDFC', ink: '#6555A4' },
  { background: '#E7F2FC', ink: '#276694' },
  { background: '#FFF2DE', ink: '#946218' },
  { background: '#E5F3F2', ink: '#167771' },
  { background: '#FBECEE', ink: '#AA5261' },
  { background: '#F4EAF7', ink: '#87579A' },
  { background: '#E6F1FB', ink: '#3A6F9D' },
  { background: '#EAF4E4', ink: '#507B36' },
  { background: '#FFF0E6', ink: '#AB6537' },
];

export function HomeScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Fleet'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  const [profileVisible, setProfileVisible] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const entrance = useRef(new Animated.Value(1)).current;
  const user = session!.user;
  const unread = data.notifications.filter(item => !item.readAt).length;
  const totals = data.bills.reduce(
    (sum, bill) => ({
      collected: sum.collected + (bill.status === 'PAID' ? bill.amount : 0),
      due: sum.due + (bill.status === 'UNPAID' ? bill.amount : 0),
    }),
    { collected: 0, due: 0 },
  );
  const balanceUnknown = (loading || !!error) && !data.bills.length;
  const collectedBalance = balanceUnknown ? '—' : money(totals.collected);
  const dueBalance = balanceUnknown ? '—' : money(totals.due);
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toLocaleUpperCase();
  const collectedLabel =
    user.role === 'ADMIN' ? 'Total collected' : 'Total paid';
  const compactGrid = width < 360 || fontScale > 1.2;
  // Give larger amounts a full row instead of shrinking readable balance text.
  const stackedBalances =
    width < 380 ||
    fontScale > 1.4 ||
    Math.max(collectedBalance.length, dueBalance.length) > 9;

  useEffect(() => {
    let cancelled = false;
    let motionDisabled = false;
    const show = () => {
      entrance.stopAnimation();
      entrance.setValue(1);
    };
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduced => {
        motionDisabled = reduced;
        if (reduced) show();
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (cancelled || reduced || motionDisabled) return;
        entrance.setValue(0);
        Animated.timing(entrance, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }).start();
      })
      .catch(() => {
        if (!cancelled) show();
      });
    return () => {
      cancelled = true;
      listener.remove();
      entrance.stopAnimation();
    };
  }, [entrance]);

  return (
    <Page dashboard loading={loading} refresh={refresh} error={error}>
      <View style={local.content}>
        <View style={local.banner}>
          <View pointerEvents="none" style={local.haloLarge} />
          <View pointerEvents="none" style={local.haloSmall} />
          <View style={local.topbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('Open profile')}, ${user.name}`}
              accessibilityState={{ expanded: profileVisible }}
              onPress={() => setProfileVisible(true)}
              style={({ pressed }) => [local.profile, pressed && local.pressed]}
            >
              <View style={local.avatar}>
                <Text style={local.initials}>{initials || 'P'}</Text>
              </View>
              <View style={local.identity}>
                <Text style={local.brand}>PATHSATHI</Text>
                <Text numberOfLines={1} style={local.name}>
                  {user.name}
                </Text>
              </View>
              <View style={local.profileChevron}>
                <AppIcon kind="back" size={14} color={colors.surface} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                unread
                  ? t('Notifications, {{number}} unread', {
                      number: numberLabel(unread),
                    })
                  : t('Notifications')
              }
              onPress={() => navigation.navigate('Inbox')}
              style={({ pressed }) => [
                local.notification,
                pressed && local.pressed,
              ]}
            >
              <AppIcon kind="bell" size={22} color={colors.surface} />
              {unread > 0 ? (
                <View style={local.dot}>
                  <Text style={local.dotText}>
                    {unread > 99 ? `${numberLabel(99)}+` : numberLabel(unread)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <Text style={local.overview}>{t('Your transport, at a glance')}</Text>
          <View
            style={[local.balances, stackedBalances && local.stackedBalances]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t(collectedLabel)}, ${collectedBalance}`}
              onPress={() => navigation.navigate('Bills')}
              style={({ pressed }) => [local.balance, pressed && local.pressed]}
            >
              <Text style={local.balanceLabel}>{t(collectedLabel)}</Text>
              <Text style={local.amount}>{collectedBalance}</Text>
            </Pressable>
            <View
              style={stackedBalances ? local.horizontalDivider : local.divider}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('Due balance')}, ${dueBalance}`}
              onPress={() => navigation.navigate('DueList')}
              style={({ pressed }) => [local.balance, pressed && local.pressed]}
            >
              <Text style={local.balanceLabel}>{t('Due balance')}</Text>
              <Text style={[local.amount, local.dueAmount]}>{dueBalance}</Text>
            </Pressable>
          </View>
          <Text style={local.period}>{t('Across all months')}</Text>
        </View>
        <Animated.View
          style={[
            local.shortcuts,
            {
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text accessibilityRole="header" style={local.sectionTitle}>
            {t('Quick access')}
          </Text>
          <View style={local.grid}>
            {dashboardItems
              .filter(item => !item.adminOnly || user.role === 'ADMIN')
              .map((item, index) => {
                const accent = shortcutColors[index % shortcutColors.length];
                return (
                  <Pressable
                    key={item.screen}
                    accessibilityRole="button"
                    accessibilityLabel={t(item.label)}
                    onPress={() => navigation.navigate(item.screen)}
                    style={({ pressed }) => [
                      local.tile,
                      compactGrid && local.wideTile,
                      pressed && local.tilePressed,
                    ]}
                  >
                    <View
                      style={[
                        local.circle,
                        { backgroundColor: accent.background },
                      ]}
                    >
                      <AppIcon kind={item.icon} size={27} color={accent.ink} />
                    </View>
                    <Text style={local.tileLabel}>{t(item.label)}</Text>
                  </Pressable>
                );
              })}
          </View>
        </Animated.View>
      </View>
      {profileVisible ? (
        <ProfileDrawer
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
        />
      ) : null}
    </Page>
  );
}
const local = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingTop: 12,
  },
  banner: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  haloLarge: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FFFFFF',
    opacity: 0.045,
    top: -100,
    right: -100,
  },
  haloSmall: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 28,
    borderColor: '#FFFFFF',
    opacity: 0.04,
    bottom: -140,
    left: -50,
  },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFFB3',
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 17, fontWeight: '700', color: colors.primary },
  identity: { flex: 1, gap: 3 },
  brand: {
    color: '#D5EFEB',
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  name: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  profileChevron: { transform: [{ rotate: '-90deg' }] },
  notification: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF17',
    borderWidth: 1,
    borderColor: '#FFFFFF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: -4,
    top: -3,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#FFDBA4',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: { fontSize: 9, color: colors.ink, fontWeight: '800' },
  overview: {
    color: '#E2F3F0',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 22,
    marginBottom: 14,
  },
  balances: { flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  stackedBalances: { flexDirection: 'column' },
  balance: { flex: 1, minHeight: 60, justifyContent: 'center', gap: 7 },
  balanceLabel: {
    color: '#E2F3F0',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  amount: {
    color: colors.surface,
    fontSize: 25,
    lineHeight: 33,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  dueAmount: { color: '#FFE4BB' },
  divider: { width: 1, backgroundColor: '#FFFFFF33', marginVertical: 5 },
  horizontalDivider: { height: 1, backgroundColor: '#FFFFFF33' },
  period: { color: '#D5EFEB', fontSize: 10, marginTop: 12, lineHeight: 16 },
  shortcuts: {
    marginTop: -16,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  tile: {
    width: '25%',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 3,
    paddingVertical: 7,
    minHeight: 104,
    borderRadius: 16,
  },
  wideTile: { width: '33.333333%' },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.ink,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
  tilePressed: {
    backgroundColor: colors.background,
    transform: [{ scale: 0.97 }],
  },
});
