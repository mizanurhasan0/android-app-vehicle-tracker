/**
 * Madrasa Transport — live GPS vehicle tracking
 * @format
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { TrackingProvider } from './src/context/TrackingContext';
import { initI18n } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initI18n()
      .catch(() => undefined)
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TrackingProvider>
          <NavigationContainer>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={colors.background}
            />
            <RootNavigator />
          </NavigationContainer>
        </TrackingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
