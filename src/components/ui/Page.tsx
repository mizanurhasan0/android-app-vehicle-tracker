import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, styles } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notice } from './Notice';

export function Page({
  title,
  subtitle,
  children,
  loading = false,
  refresh,
  error,
  dashboard = false,
}: React.PropsWithChildren<{
  dashboard?: boolean;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  refresh?: () => Promise<void>;
  error?: string;
}>) {
  return (
    <SafeAreaView
      style={ui.safe}
      edges={
        dashboard
          ? ['top', 'bottom', 'left', 'right']
          : ['bottom', 'left', 'right']
      }
    >
      <KeyboardAvoidingView
        style={ui.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.scroll}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={loading}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          <View style={ui.content}>
            {!dashboard && (title || subtitle) ? (
              <View style={ui.header}>
                {title ? (
                  <Text accessibilityRole="header" style={styles.title}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
              </View>
            ) : null}
            <Notice text={error} kind="error" />
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 10 },
  header: { gap: 6, paddingTop: 8, paddingBottom: 4 },
});
