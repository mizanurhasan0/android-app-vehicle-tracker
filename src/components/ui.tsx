import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from '../theme';
import { normalizeDigits, readable } from '../utils/format';
import { translateMessage, useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CopyrightFooter } from './CopyrightFooter';
export function Page({
  title,
  subtitle,
  children,
  loading = false,
  refresh,
  error,
}: React.PropsWithChildren<{
  title?: string;
  subtitle?: string;
  loading?: boolean;
  refresh?: () => Promise<void>;
  error?: string;
}>) {
  return (
    <SafeAreaView style={ui.safe} edges={['top', 'left', 'right']}>
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
            <View style={ui.header}>
              <View style={styles.between}>
                <Text style={styles.label}>পথসাথী · PATHSATHI</Text>
                <LanguageSwitcher />
              </View>
              {title ? (
                <Text accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
            </View>
            <Notice text={error} kind="error" />
            {children}
            <CopyrightFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  tinted = false,
}: React.PropsWithChildren<{ tinted?: boolean }>) {
  return <View style={[ui.card, tinted && ui.tinted]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  busy,
  disabled,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        danger && ui.danger,
        (disabled || busy) && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.primary : '#FFFFFF'} />
      ) : null}
      <Text style={[ui.buttonText, secondary && ui.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        onChangeText={value =>
          props.onChangeText?.(
            [
              'phone-pad',
              'number-pad',
              'decimal-pad',
              'numeric',
              'numbers-and-punctuation',
            ].includes(props.keyboardType || '')
              ? normalizeDigits(value)
              : value,
          )
        }
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor="#7E8D85"
        style={[
          ui.input,
          props.multiline && ui.multiline,
          focused && ui.focused,
          props.style,
        ]}
      />
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <View style={ui.select}>
        <Picker
          accessibilityLabel={label}
          selectedValue={value}
          enabled={!disabled}
          accessibilityState={{ disabled }}
          onValueChange={item => onChange(String(item))}
          style={ui.picker}
        >
          <Picker.Item label={t('Select an option')} value="" />
          {options.map(option => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}
export function Notice({
  text,
  kind = 'success',
}: {
  text?: string;
  kind?: 'success' | 'error';
}) {
  useTranslation();
  if (!text) return null;
  return (
    <View style={[ui.notice, kind === 'error' && ui.error]}>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.body, kind === 'error' && ui.errorText]}
      >
        {translateMessage(text)}
      </Text>
    </View>
  );
}
export function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  const positive = ['PAID', 'APPROVED', 'ACTIVE', 'RESOLVED', 'live'].includes(
    status,
  );
  const negative = ['REJECTED', 'STOPPED', 'offline'].includes(status);
  return (
    <View
      style={[
        ui.badge,
        positive ? ui.positive : negative ? ui.error : ui.pending,
      ]}
    >
      <Text
        style={[
          ui.badgeText,
          {
            color: positive
              ? colors.primary
              : negative
              ? colors.danger
              : colors.amber,
          },
        ]}
      >
        {status === 'PENDING' ? t('Awaiting review') : readable(status)}
      </Text>
    </View>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.muted}>{detail}</Text>
    </Card>
  );
}
export function SectionTitle({ children }: React.PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', gap: 18 },
  header: { gap: 10, paddingTop: 24, paddingBottom: 8 },
  card: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  tinted: { backgroundColor: colors.mint, borderColor: '#CBE4D4' },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondary: {
    backgroundColor: '#EDF3EE',
    borderColor: colors.line,
    borderWidth: 1,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  buttonText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryText: { color: colors.primary },
  field: { gap: 7 },
  fieldLabel: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: '#FAFCFA',
    fontSize: 16,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary },
  select: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAFCFA',
  },
  picker: { color: colors.ink, minHeight: 52 },
  notice: { padding: 14, borderRadius: 14, backgroundColor: colors.mint },
  error: { backgroundColor: '#FBEAEC' },
  errorText: { color: colors.danger },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  positive: { backgroundColor: colors.mint },
  pending: { backgroundColor: '#FFF2D9' },
});
