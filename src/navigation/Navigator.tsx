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
                name="Banners"
                component={BannersScreen}
                options={{ title: t('Dashboard banners') }}
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
