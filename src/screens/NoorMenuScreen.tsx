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
import { useAuth } from '../context/AuthContext';
import { useManagement } from '../context/ManagementContext';
import { useAction } from '../hooks/useAction';
import { colors } from '../theme';

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
      ['emergency', 'জরুরি যোগাযোগ', 'Emergency'],
    ],
  },
];
export function NoorMenuScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'More'>) {
  const { session, signOut } = useAuth();
  const action = useAction();
  const admin = session?.user.role === 'ADMIN';
  const go = (screen: keyof HomeStackParams) =>
    navigation.navigate(screen as 'Fleet');
  return (
    <Page>
      {admin ? (
        groups.map(group => (
          <View key={group.title} style={m.group}>
            <View style={[m.groupTitle, { backgroundColor: group.tint }]}>
              <Text style={m.groupTitleText}>{group.title}</Text>
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
                  <Text style={m.cellText}>{title}</Text>
                  <Text style={m.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      ) : (
        <NoorCard style={m.noPadding}>
          <NoorRow
            icon="student"
            title="My Children (আমার সন্তান)"
            onPress={() => go('ParentProfile')}
          />
          <NoorRow
            icon="route"
            title="Route & Fare (রুট ও ভাড়া)"
            onPress={() => go('Routes')}
          />
          <NoorRow
            icon="attendance"
            title="Attendance (উপস্থিতি)"
            onPress={() => go('TodayJourney')}
          />
          <NoorRow
            icon="payment"
            title="Payment History (পেমেন্ট হিস্ট্রি)"
            onPress={() => go('Bills')}
          />
          <NoorRow
            icon="receipt"
            title="Receipts (রসিদ)"
            onPress={() => go('Receipts')}
          />
          <NoorRow
            icon="admission"
            title="Admission (অনলাইন ভর্তি)"
            onPress={() => go('Admission')}
          />
          <NoorRow
            icon="document"
            title="Application Status (আবেদনের অবস্থা)"
            onPress={() => go('ApplicationStatus')}
          />
          <NoorRow
            icon="document"
            title="Complaints (অভিযোগ)"
            onPress={() => go('Complaints')}
          />
          <NoorRow
            icon="document"
            title="Stop Service (সেবা বন্ধের আবেদন)"
            onPress={() => go('StopRequests')}
          />
          <NoorRow
            icon="phone"
            title="Contact (যোগাযোগ)"
            onPress={() => go('Contact')}
          />
          <NoorRow
            icon="emergency"
            color="#F0415C"
            title="Emergency (জরুরি সহায়তা)"
            onPress={() => go('Emergency')}
          />
          <NoorRow
            icon="settings"
            color="#697988"
            title="Settings (সেটিংস)"
            onPress={() => go('Settings')}
          />
        </NoorCard>
      )}
      {admin ? (
        <Button
          title="পেমেন্ট গ্রহণের নম্বর"
          secondary
          onPress={() => go('PaymentAccounts')}
        />
      ) : null}
      <Notice text={action.error} kind="error" />
      <Button
        title="লগ আউট"
        secondary
        busy={action.busy}
        onPress={() =>
          Alert.alert('লগ আউট', 'আপনি কি লগ আউট করতে চান?', [
            { text: 'বাতিল', style: 'cancel' },
            { text: 'লগ আউট', onPress: () => action.run(signOut) },
          ])
        }
      />
    </Page>
  );
}
export function EmergencyScreen() {
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
        <Text style={m.emergencyTitle}>জরুরি সহায়তা</Text>
        <Text style={m.help}>জরুরি প্রয়োজনে সরাসরি কল করুন।</Text>
        {phone ? (
          <Button title="অফিসে জরুরি কল" onPress={() => call(phone)} />
        ) : (
          <Text style={m.help}>অফিসের জরুরি নম্বর এখনো যোগ করা হয়নি।</Text>
        )}
        {student?.driverPhone ? (
          <Button
            title="ড্রাইভারকে কল"
            secondary
            onPress={() => call(student.driverPhone!)}
          />
        ) : null}
        <Button
          title="জাতীয় জরুরি সেবা — ৯৯৯"
          danger
          onPress={() =>
            Alert.alert('জরুরি কল', '৯৯৯ নম্বরে কল করতে চান?', [
              { text: 'বাতিল', style: 'cancel' },
              { text: 'কল করুন', onPress: () => call('999') },
            ])
          }
        />
        <Notice text={action.error} kind="error" />
      </NoorCard>
      {session?.user.role === 'ADMIN' ? (
        <Text style={m.help}>
          সংশ্লিষ্ট অভিভাবকদের জানাতে নোটিশ ও যোগাযোগ মেনু ব্যবহার করুন।
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
      </View>
      <View style={m.welcomeBottom}>
        <Text style={m.welcomeTag}>নিরাপদ যাত্রা{'\n'}উজ্জ্বল ভবিষ্যৎ</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLogin('parent')}
          style={m.welcomeButton}
        >
          <Text style={m.welcomeButtonText}>Login</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLogin('parent', true)}
          style={m.welcomeButton}
        >
          <Text style={m.welcomeButtonText}>Register</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onLogin('admin')}
          style={m.adminLink}
        >
          <Text style={m.adminLinkText}>Admin Panel ›</Text>
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
  welcomeBrand: { alignItems: 'center', paddingTop: 100 },
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
