import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { VehicleHistoryScreen } from '../screens/VehicleHistoryScreen';
import {
  NotificationsScreen,
  NotificationDetailsScreen,
} from '../screens/NotificationsScreen';
import {
  CreateVehicleScreen,
  PaymentAccountsScreen,
} from '../screens/DirectoryScreens';
import {
  NoorVehiclesScreen,
  VehicleDetailsScreen,
  NoorRoutesScreen,
  RouteDetailsScreen,
} from '../screens/fleet';
import { NoorMenuScreen, EmergencyScreen } from '../screens/NoorMenuScreen';
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
  DataBackupScreen,
  SettingsScreen,
  BannersScreen,
} from '../screens/admin';
import {
  AdmissionScreen,
  ApplicationStatusScreen,
  ParentStudentScreen,
  ParentJourneyScreen,
  ParentContactScreen,
  ParentTrackingScreen,
} from '../screens/parent';
import { ReceiptsScreen } from '../screens/parent/ReceiptsScreen';
import {
  BillsScreen,
  ComplaintsScreen,
  DueScreen,
  FleetMapScreen,
  RequestedScreen,
  StopScreen,
} from './routeScreens';
import { TabBar } from './TabBar';
import { adminTabs, parentTabs } from './tabs';
import { HomeStackParams } from './types';

const Stack = createNativeStackNavigator<HomeStackParams>();
// getComponent keeps Metro's inline requires lazy until a route is first visited.
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

export function Navigator() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const admin = session?.user.role === 'ADMIN';
  const [active, setActive] = useState<string>('Fleet');
  const tabs = admin ? adminTabs : parentTabs;
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onStateChange={() =>
        setActive(navigationRef.getCurrentRoute()?.name || 'Fleet')
      }
    >
      <View style={styles.root}>
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
            getComponent={() => HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="More"
            getComponent={() => NoorMenuScreen}
            options={{ title: t(admin ? 'NOOR TRANSPORT · Admin' : 'More') }}
          />
          <Stack.Screen
            name="Vehicles"
            getComponent={() => NoorVehiclesScreen}
            options={{ title: t('Vehicle list') }}
          />
          <Stack.Screen
            name="VehicleDetails"
            getComponent={() => VehicleDetailsScreen}
            options={{ title: t('Vehicle profile') }}
          />
          <Stack.Screen
            name="FleetMap"
            getComponent={() => FleetMapScreen}
            options={{ title: t('Vehicles') }}
          />
          <Stack.Screen
            name="Routes"
            getComponent={() => NoorRoutesScreen}
            options={{ title: t('Routes') }}
          />
          <Stack.Screen
            name="RouteDetails"
            getComponent={() => RouteDetailsScreen}
            options={{ title: t('Route and schedule') }}
          />
          <Stack.Screen
            name="Bills"
            getComponent={() => BillsScreen}
            options={{ title: t('Payment') }}
          />
          <Stack.Screen
            name="DueList"
            getComponent={() => DueScreen}
            options={{ title: t('Due list') }}
          />
          <Stack.Screen
            name="Requested"
            getComponent={() => RequestedScreen}
            options={{ title: t('Admission applications') }}
          />
          <Stack.Screen
            name="Complaints"
            getComponent={() => ComplaintsScreen}
            options={{ title: t('Complaints') }}
          />
          <Stack.Screen
            name="StopRequests"
            getComponent={() => StopScreen}
            options={{ title: t('Stop service requests') }}
          />
          <Stack.Screen
            name="PaymentAccounts"
            getComponent={() => PaymentAccountsScreen}
            options={{ title: t('Payment accounts') }}
          />
          <Stack.Screen
            name="Inbox"
            getComponent={() => NotificationsScreen}
            options={{ title: t('Notifications') }}
          />
          <Stack.Screen
            name="NotificationDetails"
            getComponent={() => NotificationDetailsScreen}
            options={{ title: t('Notifications') }}
          />
          <Stack.Screen
            name="Settings"
            getComponent={() => SettingsScreen}
            options={{ title: t('Settings') }}
          />
          <Stack.Screen
            name="Emergency"
            getComponent={() => EmergencyScreen}
            options={{ title: t('Emergency help') }}
          />
          <Stack.Screen
            name="LiveTracking"
            getComponent={() => ParentTrackingScreen}
            options={{ title: t('Live Tracking') }}
          />
          {admin ? (
            <>
              <Stack.Screen
                name="CreateVehicle"
                getComponent={() => CreateVehicleScreen}
                options={{ title: t('Add vehicle') }}
              />
              <Stack.Screen
                name="VehicleHistory"
                getComponent={() => VehicleHistoryScreen}
                options={{ title: t('Travel history') }}
              />
              <Stack.Screen
                name="Students"
                getComponent={() => StudentsScreen}
                options={{ title: t('Student list') }}
              />
              <Stack.Screen
                name="StudentDetails"
                getComponent={() => StudentProfileScreen}
                options={{ title: t('Student profile') }}
              />
              <Stack.Screen
                name="Drivers"
                getComponent={() => DriversScreen}
                options={{ title: t('Driver list') }}
              />
              <Stack.Screen
                name="DriverDetails"
                getComponent={() => DriverProfileScreen}
                options={{ title: t('Driver profile') }}
              />
              <Stack.Screen
                name="Attendance"
                getComponent={() => AttendanceScreen}
                options={{ title: t('Attendance') }}
              />
              <Stack.Screen
                name="Maintenance"
                getComponent={() => MaintenanceScreen}
                options={{ title: t('Maintenance') }}
              />
              <Stack.Screen
                name="Accounts"
                getComponent={() => AccountsScreen}
                options={{ title: t('Income and expenses') }}
              />
              <Stack.Screen
                name="Notices"
                getComponent={() => NoticesScreen}
                options={{ title: t('Notices') }}
              />
              <Stack.Screen
                name="Banners"
                getComponent={() => BannersScreen}
                options={{ title: t('Dashboard banners') }}
              />
              <Stack.Screen
                name="OperationalRequests"
                getComponent={() => OperationalRequestsScreen}
                options={{ title: t('Requests') }}
              />
              <Stack.Screen
                name="Communication"
                getComponent={() => CommunicationScreen}
                options={{ title: t('Communication') }}
              />
              <Stack.Screen
                name="Reports"
                getComponent={() => ReportsScreen}
                options={{ title: t('Reports') }}
              />
              <Stack.Screen
                name="DataBackup"
                getComponent={() => DataBackupScreen}
                options={{ title: t('Data and backup') }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Receipts"
                getComponent={() => ReceiptsScreen}
                options={{ title: t('Receipts') }}
              />
              <Stack.Screen
                name="ParentProfile"
                getComponent={() => ParentStudentScreen}
                options={{ title: t('Student profile') }}
              />
              <Stack.Screen
                name="Admission"
                getComponent={() => AdmissionScreen}
                options={{ title: t('Online admission form') }}
              />
              <Stack.Screen
                name="ApplicationStatus"
                getComponent={() => ApplicationStatusScreen}
                options={{ title: t('Application status') }}
              />
              <Stack.Screen
                name="TodayJourney"
                getComponent={() => ParentJourneyScreen}
                options={{ title: t("Today's journey") }}
              />
              <Stack.Screen
                name="Contact"
                getComponent={() => ParentContactScreen}
                options={{ title: t('Contact') }}
              />
            </>
          )}
        </Stack.Navigator>
        <TabBar
          tabs={tabs}
          activeRoute={active}
          onNavigate={name => {
            if (navigationRef.isReady()) navigationRef.navigate(name);
          }}
        />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
