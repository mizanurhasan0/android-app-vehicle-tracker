import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { NoorBrand } from '../components/Noor';
import { useAuth } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ManagementProvider } from '../context/ManagementContext';
import { Navigator } from '../navigation/Navigator';
import { AuthScreen } from '../screens/AuthScreen';
import { WelcomeScreen } from '../screens/NoorMenuScreen';
import { colors } from '../theme';

export function SessionRoot() {
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
      <View style={styles.splash}>
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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 25,
    backgroundColor: '#F1FAF5',
  },
});
