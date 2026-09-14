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
import { ToastHost } from './src/components/Toast';
import { LanguageProvider } from './src/i18n/LanguageProvider';
import { useTranslation } from './src/i18n';

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
  ['Fleet', 'Home', 'home'],
  ['Vehicles', 'Vehicles', 'vehicle'],
  ['Students', 'Students', 'students'],
  ['Bills', 'Payment', 'payment'],
  ['More', 'Menu', 'menu'],
];
const parentTabs: [keyof HomeStackParams, string, string][] = [
  ['Fleet', 'Home', 'home'],
  ['TodayJourney', 'Trip', 'vehicle'],
  ['Bills', 'Payment', 'payment'],
  ['Inbox', 'Notice', 'bell'],
  ['More', 'More', 'more'],
];
export function Navigator() {
  const { t } = useTranslation();
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
            options={{ title: t(admin ? 'NOOR TRANSPORT · Admin' : 'More') }}
          />
          <Stack.Screen
            name="Vehicles"
            component={NoorVehiclesScreen}
            options={{ title: t('Vehicle list') }}
          />
          <Stack.Screen
            name="VehicleDetails"
            component={VehicleDetailsScreen}
            options={{ title: t('Vehicle profile') }}
          />
          <Stack.Screen
            name="FleetMap"
            component={FleetMapScreen}
            options={{ title: t('Live location') }}
          />
          <Stack.Screen
            name="Routes"
            component={NoorRoutesScreen}
            options={{ title: t('Routes') }}
          />
          <Stack.Screen
            name="RouteDetails"
            component={RouteDetailsScreen}
            options={{ title: t('Route and schedule') }}
          />
          <Stack.Screen
            name="Bills"
            component={BillsScreen}
            options={{ title: t('Payment') }}
          />
          <Stack.Screen
            name="DueList"
            component={DueScreen}
            options={{ title: t('Due list') }}
          />
          <Stack.Screen
            name="Requested"
            component={RequestedScreen}
            options={{ title: t('Admission applications') }}
          />
          <Stack.Screen
            name="Complaints"
            component={ComplaintsScreen}
            options={{ title: t('Complaints') }}
          />
          <Stack.Screen
            name="StopRequests"
            component={StopScreen}
            options={{ title: t('Stop service requests') }}
          />
          <Stack.Screen
            name="PaymentAccounts"
            component={PaymentAccountsScreen}
            options={{ title: t('Payment accounts') }}
          />
          <Stack.Screen
            name="Inbox"
            component={NotificationsScreen}
            options={{ title: t('Notifications') }}
          />
          <Stack.Screen
            name="NotificationDetails"
            component={NotificationDetailsScreen}
            options={{ title: t('Notifications') }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: t('Settings') }}
          />
          <Stack.Screen
            name="Emergency"
            component={EmergencyScreen}
            options={{ title: t('Emergency help') }}
          />
          <Stack.Screen
            name="LiveTracking"
            component={ParentTrackingScreen}
            options={{ title: t('Live Tracking') }}
          />
          {admin ? (
            <>
              <Stack.Screen
                name="CreateVehicle"
                component={CreateVehicleScreen}
                options={{ title: t('Add vehicle') }}
              />
              <Stack.Screen
                name="VehicleHistory"
                component={VehicleHistoryScreen}
                options={{ title: t('Travel history') }}
              />
              <Stack.Screen
                name="Students"
                component={StudentsScreen}
                options={{ title: t('Student list') }}
              />
              <Stack.Screen
                name="StudentDetails"
                component={StudentProfileScreen}
                options={{ title: t('Student profile') }}
              />
              <Stack.Screen
                name="Drivers"
                component={DriversScreen}
                options={{ title: t('Driver list') }}
              />
              <Stack.Screen
                name="DriverDetails"
                component={DriverProfileScreen}
                options={{ title: t('Driver profile') }}
              />
              <Stack.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{ title: t('Attendance') }}
              />
              <Stack.Screen
                name="Maintenance"
                component={MaintenanceScreen}
                options={{ title: t('Maintenance') }}
              />
              <Stack.Screen
                name="Accounts"
                component={AccountsScreen}
                options={{ title: t('Income and expenses') }}
              />
              <Stack.Screen
                name="Notices"
                component={NoticesScreen}
                options={{ title: t('Notices') }}
              />
              <Stack.Screen
                name="OperationalRequests"
                component={OperationalRequestsScreen}
                options={{ title: t('Requests') }}
              />
              <Stack.Screen
                name="Communication"
                component={CommunicationScreen}
                options={{ title: t('Communication') }}
              />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ title: t('Reports') }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Receipts"
                component={ReceiptsScreen}
                options={{ title: t('Receipts') }}
              />
              <Stack.Screen
                name="ParentProfile"
                component={ParentStudentScreen}
                options={{ title: t('Student profile') }}
              />
              <Stack.Screen
                name="Admission"
                component={AdmissionScreen}
                options={{ title: t('Online admission form') }}
              />
              <Stack.Screen
                name="ApplicationStatus"
                component={ApplicationStatusScreen}
                options={{ title: t('Application status') }}
              />
              <Stack.Screen
                name="TodayJourney"
                component={ParentJourneyScreen}
                options={{ title: t("Today's journey") }}
              />
              <Stack.Screen
                name="Contact"
                component={ParentContactScreen}
                options={{ title: t('Contact') }}
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
                  accessibilityLabel={t(title)}
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
                    {t(title)}
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
          <View style={local.root}>
            <Root />
            <ToastHost />
          </View>
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
  tabLabel: { fontSize: 11, color: '#677C88', textAlign: 'center' },
  selected: { color: colors.primary, fontWeight: '700' },
});
