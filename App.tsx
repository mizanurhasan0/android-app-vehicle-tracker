import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionRoot } from './src/app/SessionRoot';
import { ToastHost } from './src/components/Toast';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/i18n/LanguageProvider';

export { Navigator } from './src/navigation/Navigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#005C3E" />
      <LanguageProvider>
        <AuthProvider>
          <View style={styles.root}>
            <SessionRoot />
            <ToastHost />
          </View>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
