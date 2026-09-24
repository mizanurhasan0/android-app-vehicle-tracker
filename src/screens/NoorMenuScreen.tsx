import React from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import { Page, Button, Notice } from '../components/ui';
import { NoorBrand, NoorIcon, NoorRow, NoorCard } from '../components/Noor';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useManagement } from '../context/ManagementContext';
import { useAction } from '../hooks/useAction';
import { colors } from '../theme';
import { useTranslation } from '../i18n';

const groups: {
  title: string;
  tint: string;
  items: [string, string, keyof HomeStackParams][];
}[] = [
  {
    title: 'ম্যানেজমেন্ট',
    tint: '#E5F2FF',
    items: [
      ['student', 'শিক্ষার্থী', 'Students'],
      ['driver', 'ড্রাইভার', 'Drivers'],
      ['vehicle', 'গাড়ি', 'Vehicles'],
      ['route', 'রুট', 'Routes'],
    ],
  },
  {
    title: 'অর্থ ও হিসাব',
    tint: '#E8F6ED',
    items: [
      ['payment', 'পেমেন্ট', 'Bills'],
      ['money', 'আয়–ব্যয়', 'Accounts'],
      ['driver', 'ড্রাইভার বেতন', 'Drivers'],
      ['due', 'বকেয়া', 'DueList'],
    ],
  },
  {
    title: 'যোগাযোগ',
    tint: '#FFF4DA',
    items: [
      ['sms', 'এসএমএস', 'Communication'],
      ['bell', 'নোটিশ', 'Notices'],
      ['notice', 'ব্যানার', 'Banners'],
      ['whatsapp', 'হোয়াটসঅ্যাপ', 'Communication'],
      ['bell', 'নোটিফিকেশন', 'Inbox'],
    ],
  },
  {
    title: 'অপারেশন',
    tint: '#FFF1D9',
    items: [
      ['attendance', 'অ্যাটেনডেন্স', 'Attendance'],
      ['maintenance', 'মেইনটেন্যান্স', 'Maintenance'],
      ['document', 'রিকোয়েস্ট', 'OperationalRequests'],
      ['admission', 'ভর্তি আবেদন', 'Requested'],
    ],
  },
  {
    title: 'রিপোর্ট',
    tint: '#F0E8FC',
    items: [
      ['report', 'রিপোর্ট', 'Reports'],
      ['money', 'ইনভেস্টমেন্ট', 'Accounts'],
    ],
  },
  {
    title: 'সিস্টেম',
    tint: '#EAF3FF',
    items: [
      ['settings', 'সেটিংস', 'Settings'],
      ['document', 'ডাটা ও ব্যাকআপ', 'DataBackup'],
      ['emergency', 'জরুরি যোগাযোগ', 'Emergency'],
    ],
  },
];
export function NoorMenuScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'More'>) {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const action = useAction();
  const admin = session?.user.role === 'ADMIN';
  const go = (screen: keyof HomeStackParams) =>
    navigation.navigate(screen as 'Fleet');
  return (
    <Page>
      <LanguageSwitcher />
      {admin ? (
        groups.map(group => (
          <View key={group.title} style={m.group}>
            <View style={[m.groupTitle, { backgroundColor: group.tint }]}>
              <Text style={m.groupTitleText}>{t(group.title)}</Text>
            </View>
            <View style={m.grid}>
              {group.items.map(([icon, title, screen]) => (
                <Pressable
                  key={title}
                  accessibilityRole="button"
                  onPress={() =>
                    title === 'ইনভেস্টমেন্ট'
                      ? navigation.navigate('Accounts', { tab: 'INVESTMENT' })
                      : go(screen)
                  }
                  style={m.cell}
                >
                  <View
                    style={[
                      m.cellIcon,
                      group.title === 'যোগাযোগ'
                        ? m.communicationIcon
                        : m.primaryIcon,
                    ]}
                  >
                    <NoorIcon name={icon} color="#FFFFFF" size={20} />
                  </View>
                  <Text style={m.cellText}>{t(title)}</Text>
                  <NoorIcon name="chevron" size={20} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))
      ) : (
        <NoorCard style={m.noPadding}>
          <NoorRow
            icon="student"
            title={t('My children')}
            onPress={() => go('ParentProfile')}
          />
          <NoorRow
            icon="route"
            title={t('Route and fare')}
            onPress={() => go('Routes')}
          />
          <NoorRow
            icon="attendance"
            title={t('Attendance')}
            onPress={() => go('TodayJourney')}
          />
          <NoorRow
            icon="payment"
            title={t('Payment history')}
            onPress={() => go('Bills')}
          />
          <NoorRow
            icon="receipt"
            title={t('Receipts')}
            onPress={() => go('Receipts')}
          />
          <NoorRow
            icon="admission"
            title={t('Online admission form')}
            onPress={() => go('Admission')}
          />
          <NoorRow
            icon="document"
            title={t('Application status')}
            onPress={() => go('ApplicationStatus')}
          />
          <NoorRow
            icon="document"
            title={t('Complaints')}
            onPress={() => go('Complaints')}
          />
          <NoorRow
            icon="document"
            title={t('Stop service requests')}
            onPress={() => go('StopRequests')}
          />
          <NoorRow
            icon="phone"
            title={t('Contact')}
            onPress={() => go('Contact')}
          />
          <NoorRow
            icon="emergency"
            color="#F0415C"
            title={t('Emergency help')}
            onPress={() => go('Emergency')}
          />
          <NoorRow
            icon="settings"
            color="#697988"
            title={t('Settings')}
            onPress={() => go('Settings')}
          />
        </NoorCard>
      )}
      {admin ? (
        <Button
          title={t('Payment receiving numbers')}
          secondary
          onPress={() => go('PaymentAccounts')}
        />
      ) : null}
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Sign out')}
        secondary
        busy={action.busy}
        onPress={() =>
          Alert.alert(t('Sign out'), t('Do you want to sign out?'), [
            { text: t('Cancel'), style: 'cancel' },
            { text: t('Sign out'), onPress: () => action.run(signOut) },
          ])
        }
      />
    </Page>
  );
}
export function EmergencyScreen() {
  const { t } = useTranslation();
  const { data } = useManagement();
  const { session } = useAuth();
  const action = useAction();
  const phone = data?.settings.emergencyPhone || data?.settings.phone;
  const student = data?.students.find(s => s.status === 'ACTIVE');
  const call = (value: string) =>
    action.run(() => Linking.openURL(`tel:${value.replace(/[^+\d]/g, '')}`));
  return (
    <Page>
      <NoorCard>
        <View style={m.emergencyBadge}>
          <NoorIcon name="emergency" size={35} color="#FFFFFF" />
        </View>
        <Text style={m.emergencyTitle}>{t('Emergency help')}</Text>
        <Text style={m.help}>{t('Call directly in an emergency.')}</Text>
        {phone ? (
          <Button
            title={t('Emergency office call')}
            onPress={() => call(phone)}
          />
        ) : (
          <Text style={m.help}>
            {t('The office emergency number has not been added yet.')}
          </Text>
        )}
        {student?.driverPhone ? (
          <Button
            title={t('Call driver')}
            secondary
            onPress={() => call(student.driverPhone!)}
          />
        ) : null}
        <Button
          title={t('National emergency service — 999')}
          danger
          onPress={() =>
            Alert.alert(t('Emergency call'), t('Call 999?'), [
              { text: t('Cancel'), style: 'cancel' },
              { text: t('Call'), onPress: () => call('999') },
            ])
          }
        />
        <Notice text={action.error} kind="error" />
      </NoorCard>
      {session?.user.role === 'ADMIN' ? (
        <Text style={m.help}>
          {t('Use Notices and Communication to inform the relevant guardians.')}
        </Text>
      ) : null}
    </Page>
  );
}
export function WelcomeScreen({
  onLogin,
}: {
  onLogin: (variant: 'parent' | 'admin', register?: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={m.welcome}>
      <StatusBar barStyle="dark-content" />
      <Image
        source={require('../../assets/branding/noor-login-background.png')}
        style={m.welcomeImage}
        resizeMode="stretch"
      />
      <View style={m.welcomeBrand}>
        <NoorBrand />
        <LanguageSwitcher />
      </View>
      <View style={m.welcomeBottom}>
        <Text style={m.welcomeTag}>{t('Safe journey\nBright future')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLogin('parent')}
          style={m.welcomeButton}
        >
          <Text style={m.welcomeButtonText}>{t('Sign in')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLogin('parent', true)}
          style={m.welcomeButton}
        >
          <Text style={m.welcomeButtonText}>{t('Register')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLogin('admin')}
          style={m.adminLink}
        >
          <Text style={m.adminLinkText}>{t('Admin Panel')} ›</Text>
        </Pressable>
      </View>
    </View>
  );
}
const m = StyleSheet.create({
  communicationIcon: { backgroundColor: '#EAA310' },
  primaryIcon: { backgroundColor: colors.primary },
  group: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 7,
    overflow: 'hidden',
  },
  groupTitle: { paddingHorizontal: 9, paddingVertical: 5 },
  groupTitleText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFFFFF' },
  cell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F2',
  },
  cellIcon: {
    height: 30,
    width: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { flex: 1, fontSize: 13, color: colors.ink },
  chevron: { fontSize: 20, color: colors.muted },
  noPadding: { padding: 0, overflow: 'hidden' },
  emergencyBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EF4761',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  emergencyTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  help: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  welcomeImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  welcome: { flex: 1, backgroundColor: colors.primary },
  welcomeBrand: { alignItems: 'center', paddingTop: 100, gap: 12 },
  welcomeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 28,
    backgroundColor: '#006340',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 14,
    gap: 10,
  },
  welcomeTag: {
    fontSize: 18,
    lineHeight: 27,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeButton: {
    height: 43,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006340B8',
  },
  welcomeButtonText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  adminLink: { height: 40, alignItems: 'center', justifyContent: 'center' },
  adminLinkText: { fontSize: 12, color: '#FFFFFF' },
});
