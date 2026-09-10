import React from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeStackParams } from './src/navigation/types';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
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
  StudentsScreen,
  StudentDetailsScreen,
  PaymentAccountsScreen,
  RoutesScreen,
} from './src/screens/DirectoryScreens';
import { colors } from './src/theme';
import { useTranslation } from './src/i18n';
import { LanguageProvider } from './src/i18n/LanguageProvider';

const Stack = createNativeStackNavigator<HomeStackParams>();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
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
function Navigator() {
  const { t } = useTranslation();
  const { session } = useAuth();
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontSize: 16, fontWeight: '500' },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen
          name="Fleet"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        {session?.user.role === 'ADMIN' ? (
          <>
            <Stack.Screen
              name="CreateVehicle"
              component={CreateVehicleScreen}
              options={{ title: t('Create vehicle') }}
            />
            <Stack.Screen
              name="VehicleHistory"
              component={VehicleHistoryScreen}
              options={{ title: t('Travel history') }}
            />
          </>
        ) : null}
        <Stack.Screen
          name="Students"
          component={StudentsScreen}
          options={{ title: t('Student list') }}
        />
        <Stack.Screen
          name="StudentDetails"
          component={StudentDetailsScreen}
          options={{ title: t('Student details') }}
        />
        <Stack.Screen
          name="Bills"
          component={BillsScreen}
          options={{ title: t('Bills') }}
        />
        <Stack.Screen
          name="DueList"
          component={DueScreen}
          options={{ title: t('Due list') }}
        />
        <Stack.Screen
          name="Requested"
          component={RequestedScreen}
          options={{ title: t('Requested') }}
        />
        <Stack.Screen
          name="Complaints"
          component={ComplaintsScreen}
          options={{ title: t('Complaints') }}
        />
        <Stack.Screen
          name="StopRequests"
          component={StopScreen}
          options={{ title: t('Stop requests') }}
        />
        <Stack.Screen
          name="PaymentAccounts"
          component={PaymentAccountsScreen}
          options={{ title: t('Payment accounts') }}
        />
        <Stack.Screen
          name="Vehicles"
          component={VehiclesScreen}
          options={{ title: t('Vehicles') }}
        />
        <Stack.Screen
          name="Routes"
          component={RoutesScreen}
          options={{ title: t('Routes') }}
        />
        <Stack.Screen
          name="Inbox"
          component={NotificationsScreen}
          options={{ title: t('Notifications') }}
        />
        <Stack.Screen
          name="NotificationDetails"
          component={NotificationDetailsScreen}
          options={{ title: t('Notification details') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
function Root() {
  const { t } = useTranslation();
  const { ready, session } = useAuth();
  if (!ready)
    return (
      <View style={local.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={local.splashText}>{t('Opening PathSathi…')}</Text>
      </View>
    );
  if (!session) return <AuthScreen />;
  return (
    <DataProvider key={session.token}>
      <Navigator />
    </DataProvider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <LanguageProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
const local = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.background,
  },
  splashText: { color: colors.ink, fontSize: 16 },
});
