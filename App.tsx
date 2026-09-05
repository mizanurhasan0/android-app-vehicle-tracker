import React from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VehicleHistoryScreen } from './src/screens/VehicleHistoryScreen';
import { HomeStackParams } from './src/navigation/types';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider, useData } from './src/context/DataContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { colors } from './src/theme';
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParams>();
function HomeNavigator() {
  const { session } = useAuth();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Fleet" component={HomeScreen} />
      {session?.user.role === 'ADMIN' ? (
        <HomeStack.Screen
          name="VehicleHistory"
          component={VehicleHistoryScreen}
        />
      ) : null}
    </HomeStack.Navigator>
  );
}
const icons: Record<string, string> = {
  Home: '⌂',
  Bills: '৳',
  Requests: '≡',
  Setup: '⚙',
  Inbox: '✉',
};
function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <Text accessible={false} style={[local.icon, { color }]}>
      {icons[name]}
    </Text>
  );
}
const tabIcons = Object.fromEntries(
  Object.keys(icons).map(name => [
    name,
    ({ color }: { color: string }) => <TabIcon name={name} color={color} />,
  ]),
);
function Tabs() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { data } = useData();
  const unread = data.notifications.filter(item => !item.readAt).length;
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: [
            local.tabBar,
            {
              height: 64 + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ],
          tabBarLabelStyle: local.tabLabel,
          tabBarIcon: tabIcons[route.name],
        })}
      >
        <Tab.Screen name="Home" component={HomeNavigator} />
        <Tab.Screen name="Bills" component={PaymentsScreen} />
        <Tab.Screen name="Requests" component={RequestsScreen} />
        {session!.user.role === 'ADMIN' ? (
          <Tab.Screen name="Setup" component={SetupScreen} />
        ) : null}
        <Tab.Screen
          name="Inbox"
          component={NotificationsScreen}
          options={{
            tabBarBadge: unread ? (unread > 99 ? '99+' : unread) : undefined,
            tabBarBadgeStyle: local.badge,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
function Root() {
  const { ready, session } = useAuth();
  if (!ready)
    return (
      <View style={local.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={local.splashText}>Opening PathSathi…</Text>
      </View>
    );
  if (!session) return <AuthScreen />;
  return (
    <DataProvider key={session.token}>
      <Tabs />
    </DataProvider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <AuthProvider>
        <Root />
      </AuthProvider>
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
  icon: { fontSize: 25, fontWeight: '600' },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: colors.line,
    paddingTop: 7,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  badge: { backgroundColor: colors.primary },
});
