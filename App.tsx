import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeStackParams } from './src/navigation/types';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ManagementProvider } from './src/context/ManagementContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { VehiclesScreen } from './src/screens/VehiclesScreen';
import { VehicleHistoryScreen } from './src/screens/VehicleHistoryScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import {
  NotificationsScreen,
  NotificationDetailsScreen,
} from './src/screens/NotificationsScreen';
import {
  CreateVehicleScreen,
  PaymentAccountsScreen,
} from './src/screens/DirectoryScreens';
import {
  NoorVehiclesScreen,
  VehicleDetailsScreen,
  NoorRoutesScreen,
  RouteDetailsScreen,
} from './src/screens/NoorFleetScreens';
import {
  NoorMenuScreen,
  EmergencyScreen,
  WelcomeScreen,
} from './src/screens/NoorMenuScreen';
import {
  StudentsScreen,
  StudentProfileScreen,
  DriversScreen,
  DriverProfileScreen,
  AttendanceScreen,
  MaintenanceScreen,
  AccountsScreen,
  NoticesScreen,
  RequestsScreen as OperationalRequestsScreen,
  CommunicationScreen,
  ReportsScreen,
  SettingsScreen,
} from './src/screens/admin';
import {
  AdmissionScreen,
  ApplicationStatusScreen,
  ParentStudentScreen,
  ParentJourneyScreen,
  ParentContactScreen,
  ParentTrackingScreen,
} from './src/screens/parent/ParentScreens';
import { ReceiptsScreen } from './src/screens/parent/ReceiptsScreen';
import { NoorBrand, NoorIcon } from './src/components/Noor';
import { colors } from './src/theme';
import { LanguageProvider } from './src/i18n/LanguageProvider';

const Stack = createNativeStackNavigator<HomeStackParams>();
const navigationRef = createNavigationContainerRef<HomeStackParams>();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: '#005C3E',
    text: colors.ink,
    border: colors.line,
    notification: colors.primary,
  },
};
function BillsScreen() {
  return <PaymentsScreen initialTab="bills" />;
}
function DueScreen() {
  return <PaymentsScreen initialTab="bills" dueOnly />;
}
function RequestedScreen() {
  return <RequestsScreen section="Applications" />;
}
function ComplaintsScreen() {
  return <RequestsScreen section="Complaints" />;
}
function StopScreen() {
  return <RequestsScreen section="Stop requests" />;
}
function FleetMapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParams, 'Vehicles'>>();
  return (
    <VehiclesScreen
      navigation={navigation}
      route={{ key: 'vehicle-map', name: 'Vehicles' }}
    />
  );
}
const adminTabs: [keyof HomeStackParams, string, string][] = [
  ['Fleet', 'হোম', 'home'],
  ['Vehicles', 'গাড়ি', 'vehicle'],
  ['Students', 'শিক্ষার্থী', 'students'],
  ['Bills', 'পেমেন্ট', 'payment'],
  ['More', 'মেনু', 'menu'],
];
const parentTabs: [keyof HomeStackParams, string, string][] = [
  ['Fleet', 'Home', 'home'],
  ['TodayJourney', 'Trip', 'vehicle'],
  ['Bills', 'Payment', 'payment'],
  ['Inbox', 'Notice', 'bell'],
  ['More', 'More', 'more'],
];
function Navigator() {
  const { session } = useAuth();
  const admin = session?.user.role === 'ADMIN';
  const [active, setActive] = useState<string>('Fleet');
  const tabs = admin ? adminTabs : parentTabs;
  const showTabs = tabs.some(([name]) => name === active);
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onStateChange={() =>
        setActive(navigationRef.getCurrentRoute()?.name || 'Fleet')
      }
    >
      <View style={local.root}>
        <Stack.Navigator
          screenOptions={{
            headerTintColor: '#FFFFFF',
            headerStyle: { backgroundColor: '#005C3E' },
            headerTitleStyle: { fontSize: 18, fontWeight: '600' },
            headerTitleAlign: 'left',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen
            name="Fleet"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="More"
            component={NoorMenuScreen}
            options={{ title: admin ? 'NOOR TRANSPORT · Admin' : 'More' }}
          />
          <Stack.Screen
            name="Vehicles"
            component={NoorVehiclesScreen}
            options={{ title: 'গাড়ি তালিকা' }}
          />
          <Stack.Screen
            name="VehicleDetails"
            component={VehicleDetailsScreen}
            options={{ title: 'গাড়ির প্রোফাইল' }}
          />
          <Stack.Screen
            name="FleetMap"
            component={FleetMapScreen}
            options={{ title: 'লাইভ লোকেশন' }}
          />
          <Stack.Screen
            name="Routes"
            component={NoorRoutesScreen}
            options={{ title: 'রুট সমূহ' }}
          />
          <Stack.Screen
            name="RouteDetails"
            component={RouteDetailsScreen}
            options={{ title: 'রুট ও সময়সূচি' }}
          />
          <Stack.Screen
            name="Bills"
            component={BillsScreen}
            options={{ title: 'পেমেন্ট' }}
          />
          <Stack.Screen
            name="DueList"
            component={DueScreen}
            options={{ title: 'বকেয়া তালিকা' }}
          />
          <Stack.Screen
            name="Requested"
            component={RequestedScreen}
            options={{ title: 'ভর্তি আবেদন' }}
          />
          <Stack.Screen
            name="Complaints"
            component={ComplaintsScreen}
            options={{ title: 'অভিযোগ' }}
          />
          <Stack.Screen
            name="StopRequests"
            component={StopScreen}
            options={{ title: 'সেবা বন্ধের আবেদন' }}
          />
          <Stack.Screen
            name="PaymentAccounts"
            component={PaymentAccountsScreen}
            options={{ title: 'পেমেন্ট গ্রহণের নম্বর' }}
          />
          <Stack.Screen
            name="Inbox"
            component={NotificationsScreen}
            options={{ title: 'নোটিফিকেশন' }}
          />
          <Stack.Screen
            name="NotificationDetails"
            component={NotificationDetailsScreen}
            options={{ title: 'নোটিফিকেশন' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'সেটিংস' }}
          />
          <Stack.Screen
            name="Emergency"
            component={EmergencyScreen}
            options={{ title: 'জরুরি সহায়তা' }}
          />
          <Stack.Screen
            name="LiveTracking"
            component={ParentTrackingScreen}
            options={{ title: 'Live Tracking' }}
          />
          {admin ? (
            <>
              <Stack.Screen
                name="CreateVehicle"
                component={CreateVehicleScreen}
                options={{ title: 'গাড়ি যোগ করুন' }}
              />
              <Stack.Screen
                name="VehicleHistory"
                component={VehicleHistoryScreen}
                options={{ title: 'ভ্রমণ ইতিহাস' }}
              />
              <Stack.Screen
                name="Students"
                component={StudentsScreen}
                options={{ title: 'শিক্ষার্থী তালিকা' }}
              />
              <Stack.Screen
                name="StudentDetails"
                component={StudentProfileScreen}
                options={{ title: 'শিক্ষার্থী প্রোফাইল' }}
              />
              <Stack.Screen
                name="Drivers"
                component={DriversScreen}
                options={{ title: 'ড্রাইভার তালিকা' }}
              />
              <Stack.Screen
                name="DriverDetails"
                component={DriverProfileScreen}
                options={{ title: 'ড্রাইভার প্রোফাইল' }}
              />
              <Stack.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{ title: 'উপস্থিতি' }}
              />
              <Stack.Screen
                name="Maintenance"
                component={MaintenanceScreen}
                options={{ title: 'মেইনটেন্যান্স' }}
              />
              <Stack.Screen
                name="Accounts"
                component={AccountsScreen}
                options={{ title: 'আয়–ব্যয়' }}
              />
              <Stack.Screen
                name="Notices"
                component={NoticesScreen}
                options={{ title: 'নোটিশ' }}
              />
              <Stack.Screen
                name="OperationalRequests"
                component={OperationalRequestsScreen}
                options={{ title: 'রিকোয়েস্ট' }}
              />
              <Stack.Screen
                name="Communication"
                component={CommunicationScreen}
                options={{ title: 'যোগাযোগ' }}
              />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ title: 'রিপোর্ট' }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Receipts"
                component={ReceiptsScreen}
                options={{ title: 'রসিদ' }}
              />
              <Stack.Screen
                name="ParentProfile"
                component={ParentStudentScreen}
                options={{ title: 'শিক্ষার্থীর প্রোফাইল' }}
              />
              <Stack.Screen
                name="Admission"
                component={AdmissionScreen}
                options={{ title: 'অনলাইন ভর্তি ফরম' }}
              />
              <Stack.Screen
                name="ApplicationStatus"
                component={ApplicationStatusScreen}
                options={{ title: 'আবেদনের স্ট্যাটাস' }}
              />
              <Stack.Screen
                name="TodayJourney"
                component={ParentJourneyScreen}
                options={{ title: 'আজকের যাত্রা' }}
              />
              <Stack.Screen
                name="Contact"
                component={ParentContactScreen}
                options={{ title: 'যোগাযোগ' }}
              />
            </>
          )}
        </Stack.Navigator>
        {showTabs ? (
          <SafeAreaView edges={['bottom']} style={local.tabSafe}>
            <View style={local.tabs}>
              {tabs.map(([name, title, icon]) => (
                <Pressable
                  key={name}
                  accessibilityRole="tab"
                  accessibilityLabel={title}
                  accessibilityState={{ selected: active === name }}
                  onPress={() =>
                    navigationRef.isReady() &&
                    navigationRef.navigate(name as 'Fleet')
                  }
                  style={local.tab}
                >
                  <NoorIcon
                    name={icon}
                    size={23}
                    color={active === name ? colors.primary : '#677C88'}
                  />
                  <Text
                    style={[local.tabLabel, active === name && local.selected]}
                  >
                    {title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        ) : null}
      </View>
    </NavigationContainer>
  );
}
function Root() {
  const { ready, session } = useAuth();
  const [entry, setEntry] = useState<{
    variant: 'admin' | 'parent';
    register?: boolean;
  } | null>(null);
  useEffect(() => {
    if (session || !entry) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setEntry(null);
      return true;
    });
    return () => listener.remove();
  }, [session, entry]);
  if (!ready)
    return (
      <View style={local.splash}>
        <NoorBrand />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (!session)
    return entry ? (
      <AuthScreen variant={entry.variant} initialRegister={entry.register} />
    ) : (
      <WelcomeScreen
        onLogin={(variant, register) => setEntry({ variant, register })}
      />
    );
  return (
    <DataProvider key={session.token}>
      <ManagementProvider>
        <Navigator />
      </ManagementProvider>
    </DataProvider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#005C3E" />
      <LanguageProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
const local = StyleSheet.create({
  root: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 25,
    backgroundColor: '#F1FAF5',
  },
  tabSafe: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tabs: {
    flexDirection: 'row',
    height: 62,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 11, color: '#677C88' },
  selected: { color: colors.primary, fontWeight: '700' },
});
