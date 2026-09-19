import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoorIcon } from '../../../components/Noor';
import { ToastMessage } from '../../../components/Toast';
import { useTranslation } from '../../../i18n';
import { labelStatus } from './formatting';
import { s } from './styles';
import { C } from './tokens';

export function AdminPage({
  children,
  loading,
  refresh,
  error,
}: React.PropsWithChildren<{
  loading?: boolean;
  refresh?: () => Promise<void>;
  error?: string;
}>) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.page}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={!!loading}
                onRefresh={refresh}
                colors={[C.green]}
              />
            ) : undefined
          }
        >
          <ErrorText message={error} />
          {loading ? (
            <ActivityIndicator
              color={C.green}
              accessibilityLabel={t('Loading data')}
            />
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Box({ children }: React.PropsWithChildren) {
  return <View style={s.box}>{children}</View>;
}

export function ErrorText({ message }: { message?: string }) {
  return <ToastMessage message={message} kind="error" />;
}

export function EmptyState({
  text = 'No data yet',
  detail,
}: {
  text?: string;
  detail?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.empty}>
      <NoorIcon name="reports" size={28} color={C.muted} />
      <Text style={s.title}>{t(text)}</Text>
      {detail ? <Text style={s.muted}>{t(detail)}</Text> : null}
    </View>
  );
}

export function Pill({ value }: { value: string }) {
  useTranslation();
  const bad = ['UNPAID', 'ABSENT', 'REJECTED', 'MAINTENANCE'].includes(value);
  const pending = ['PENDING', 'LEAVE', 'OPEN'].includes(value);
  return (
    <View style={[s.pill, bad && s.pillBad, pending && s.pillPending]}>
      <Text style={[s.pillText, bad && s.red, pending && s.amber]}>
        {labelStatus(value)}
      </Text>
    </View>
  );
}

export function Avatar({
  name,
  driver = false,
  compact = false,
}: {
  name: string;
  driver?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[s.avatar, driver && s.driverAvatar, compact && s.compactAvatar]}
    >
      <Text style={[s.initial, compact && s.compactInitial]}>
        {Array.from(name.trim())[0] || 'N'}
      </Text>
    </View>
  );
}

export function Detail({
  icon,
  label,
  value,
}: {
  icon?: string;
  label: string;
  value?: string | number | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.detail}>
      {icon ? <NoorIcon name={icon} size={17} color={C.green} /> : null}
      <Text style={s.detailLabel}>{t(label)}</Text>
      <Text selectable style={s.detailValue}>
        {value === '' || value === undefined || value === null ? '—' : value}
      </Text>
    </View>
  );
}

export function Heading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.between}>
      <Text accessibilityRole="header" style={s.heading}>
        {t(title)}
      </Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={s.linkHit}
        >
          <Text style={s.link}>{t(action)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
