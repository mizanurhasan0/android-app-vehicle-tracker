import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import { NoorIcon } from '../../components/Noor';
import { normalizeDigits } from '../../utils/format';

export const C = {
  green: '#006A45',
  dark: '#005239',
  text: '#20394B',
  muted: '#748590',
  line: '#E4ECEF',
  mint: '#E9F7EF',
  white: '#FFFFFF',
  red: '#EE4662',
  amber: '#E5A11B',
  blue: '#1678D3',
  background: '#F5FAF8',
};
export const today = () =>
  new Date(Date.now() + 6 * 60 * 60_000).toISOString().slice(0, 10);
export const niceDate = (date?: string | null) =>
  date
    ? new Date(
        date.length === 10 ? `${date}T00:00:00+06:00` : date,
      ).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      })
    : '—';
export const labelStatus = (value: string) =>
  ({
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    STOPPED: 'Inactive',
    PAID: 'Paid',
    UNPAID: 'Due',
    PRESENT: 'উপস্থিত',
    ABSENT: 'অনুপস্থিত',
    LEAVE: 'ছুটি',
    PENDING: 'অপেক্ষমান',
    APPROVED: 'অনুমোদিত',
    REJECTED: 'প্রত্যাখ্যাত',
    OPEN: 'চলমান',
    COMPLETED: 'সম্পন্ন',
    RUNNING: 'চলমান',
    MAINTENANCE: 'রক্ষণাবেক্ষণ',
  }[value] || value);
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
              accessibilityLabel="তথ্য লোড হচ্ছে"
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
  return message ? (
    <View style={s.error}>
      <Text accessibilityLiveRegion="polite" style={s.errorText}>
        {message}
      </Text>
    </View>
  ) : null;
}
export function EmptyState({
  text = 'এখনো কোনো তথ্য নেই',
  detail,
}: {
  text?: string;
  detail?: string;
}) {
  return (
    <View style={s.empty}>
      <NoorIcon name="reports" size={28} color={C.muted} />
      <Text style={s.title}>{text}</Text>
      {detail ? <Text style={s.muted}>{detail}</Text> : null}
    </View>
  );
}
export function Pill({ value }: { value: string }) {
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
export function SmallButton({
  title,
  onPress,
  icon,
  secondary,
  danger,
  busy,
  disabled,
}: {
  title: string;
  onPress: () => void;
  icon?: string;
  secondary?: boolean;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && s.dangerButton,
        (busy || disabled || pressed) && s.dim,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? C.green : C.white} />
      ) : icon ? (
        <NoorIcon name={icon} size={17} color={secondary ? C.green : C.white} />
      ) : null}
      <Text style={[s.buttonText, secondary && s.green]}>{title}</Text>
    </Pressable>
  );
}
export function SearchBar({
  value,
  onChange,
  onAdd,
  placeholder = 'খুঁজুন…',
}: {
  value: string;
  onChange: (text: string) => void;
  onAdd?: () => void;
  placeholder?: string;
}) {
  return (
    <View style={s.row}>
      <View style={s.search}>
        <NoorIcon name="search" size={18} color={C.muted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          accessibilityLabel={placeholder}
          style={s.searchInput}
          multiline={false}
          numberOfLines={1}
          autoCorrect={false}
        />
      </View>
      {onAdd ? (
        <SmallButton title="যোগ করুন" icon="plus" onPress={onAdd} />
      ) : null}
    </View>
  );
}
export function Tabs({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={s.tabs}>
      {options.map(option => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[s.tab, value === option.value && s.tabActive]}
        >
          <Text style={[s.tabLabel, value === option.value && s.white]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Input({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={C.muted}
        onChangeText={value =>
          props.onChangeText?.(
            props.keyboardType &&
              ['number-pad', 'decimal-pad', 'phone-pad', 'numeric'].includes(
                props.keyboardType,
              )
              ? normalizeDigits(value)
              : value,
          )
        }
        style={[s.input, props.multiline && s.multiline, props.style]}
      />
    </View>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  optional = true,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.select}>
        <Picker
          selectedValue={value}
          onValueChange={item => onChange(String(item))}
          accessibilityLabel={label}
          style={s.picker}
        >
          {optional ? <Picker.Item label="নির্বাচন করুন" value="" /> : null}
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
export function Detail({
  icon,
  label,
  value,
}: {
  icon?: string;
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={s.detail}>
      {icon ? <NoorIcon name={icon} size={17} color={C.green} /> : null}
      <Text style={s.detailLabel}>{label}</Text>
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
  return (
    <View style={s.between}>
      <Text accessibilityRole="header" style={s.heading}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={s.linkHit}
        >
          <Text style={s.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
export function FormModal({
  title,
  visible,
  onClose,
  children,
  onSave,
  saveTitle = 'সংরক্ষণ করুন',
  busy,
  error,
}: React.PropsWithChildren<{
  title: string;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  saveTitle?: string;
  busy?: boolean;
  error?: string;
}>) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView style={s.safe}>
        <View style={s.modalHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ফিরে যান"
            disabled={busy}
            onPress={onClose}
            style={s.back}
          >
            <NoorIcon name="back" color={C.white} size={22} />
          </Pressable>
          <Text style={s.modalTitle}>{title}</Text>
        </View>
        <KeyboardAvoidingView
          style={s.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.form}
            keyboardShouldPersistTaps="handled"
          >
            <ErrorText message={error} />
            {children}
            <SmallButton title={saveTitle} busy={busy} onPress={onSave} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const run = async (task: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}
export async function contact(
  phone: string,
  channel: 'call' | 'sms' | 'whatsapp',
  message = '',
) {
  let cleaned = normalizeDigits(phone).replace(/[^+\d]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned))
    throw new Error('একটি সঠিক মোবাইল নম্বর যোগ করুন।');
  if (channel === 'whatsapp' && cleaned.startsWith('01'))
    cleaned = `88${cleaned}`;
  const url =
    channel === 'call'
      ? `tel:${cleaned}`
      : channel === 'sms'
      ? `sms:${cleaned}${
          Platform.OS === 'ios' ? '&' : '?'
        }body=${encodeURIComponent(message)}`
      : `https://wa.me/${cleaned.replace(/^\+/, '')}?text=${encodeURIComponent(
          message,
        )}`;
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error(
      channel === 'whatsapp'
        ? 'WhatsApp খোলা যায়নি। অ্যাপটি ইনস্টল আছে কি না দেখুন।'
        : 'এই ডিভাইসে যোগাযোগের অ্যাপ খোলা যায়নি।',
    );
  }
}
export function ContactActions({
  phone,
  onEdit,
}: {
  phone: string;
  onEdit?: () => void;
}) {
  const action = useAction();
  return (
    <View style={s.stack}>
      <ErrorText message={action.error} />
      <View style={s.row}>
        <View style={s.flex}>
          <SmallButton
            title="কল"
            icon="phone"
            disabled={!phone}
            busy={action.busy}
            onPress={() => action.run(() => contact(phone, 'call'))}
          />
        </View>
        <View style={s.flex}>
          <SmallButton
            title="WhatsApp"
            icon="whatsapp"
            disabled={!phone}
            busy={action.busy}
            onPress={() => action.run(() => contact(phone, 'whatsapp'))}
          />
        </View>
        <View style={s.flex}>
          <SmallButton
            title={onEdit ? 'এডিট' : 'SMS'}
            icon={onEdit ? 'edit' : 'sms'}
            onPress={onEdit || (() => action.run(() => contact(phone, 'sms')))}
            disabled={!onEdit && !phone}
          />
        </View>
      </View>
    </View>
  );
}
export const s = StyleSheet.create({
  compactAvatar: { width: 34, height: 34, borderRadius: 17 },
  compactInitial: { fontSize: 17 },
  personListRow: { minHeight: 52, paddingVertical: 8 },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.mint,
  },
  studentColumn: { flex: 1.7 },
  driverColumn: { flex: 1.8 },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  dangerFill: { backgroundColor: '#FFF0F2' },
  emergencyFill: { backgroundColor: '#FFE8ED' },
  warningFill: { backgroundColor: '#FFF4D9' },
  contactRow: { minHeight: 48 },
  contactIcon: { width: 32, height: 32, borderRadius: 16 },
  centered: { textAlign: 'center' },
  wrap: { flexWrap: 'wrap' },
  attendanceChoice: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  choiceRow: { minHeight: 38 },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profit: {
    backgroundColor: C.green,
    borderRadius: 7,
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  reportRow: { minHeight: 40 },
  safe: { flex: 1, backgroundColor: C.background },
  page: { padding: 12, gap: 11, paddingBottom: 24 },
  box: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    padding: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  flex: { flex: 1 },
  stack: { gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  heading: { fontSize: 15, color: C.green, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 20, color: C.text },
  muted: { fontSize: 12, lineHeight: 18, color: C.muted },
  green: { color: C.green },
  red: { color: C.red },
  amber: { color: C.amber },
  white: { color: C.white },
  button: {
    minHeight: 40,
    borderRadius: 7,
    backgroundColor: C.green,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  buttonText: {
    fontSize: 12,
    lineHeight: 19,
    color: C.white,
    fontWeight: '600',
    flexShrink: 1,
  },
  secondary: { backgroundColor: C.mint },
  dangerButton: { backgroundColor: C.red },
  dim: { opacity: 0.55 },
  error: { padding: 10, borderRadius: 7, backgroundColor: '#FFF0F2' },
  errorText: { color: '#A3203E', fontSize: 13, lineHeight: 20 },
  empty: { alignItems: 'center', padding: 25, gap: 9 },
  pill: {
    backgroundColor: '#DBF6E5',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  pillBad: { backgroundColor: '#FFE6EB' },
  pillPending: { backgroundColor: '#FFF2D8' },
  pillText: { color: C.green, fontSize: 11, fontWeight: '600' },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1F0F7',
  },
  driverAvatar: { backgroundColor: '#E3F2E6' },
  initial: { color: C.green, fontSize: 21, fontWeight: '700' },
  search: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 7,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    gap: 7,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 12, padding: 7 },
  tabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 7,
    backgroundColor: '#EDF3F7',
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
  },
  tabActive: { backgroundColor: C.green },
  tabLabel: {
    fontSize: 12,
    color: C.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  field: { gap: 5 },
  label: { fontSize: 12, color: C.text, fontWeight: '600' },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 7,
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: C.text,
    fontSize: 14,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  select: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 7,
    overflow: 'hidden',
  },
  picker: { minHeight: 44, color: C.text },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
  },
  detailLabel: { fontSize: 12, color: C.text, flex: 1 },
  detailValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '63%',
    textAlign: 'right',
  },
  linkHit: { minHeight: 38, justifyContent: 'center' },
  link: { fontSize: 12, color: C.green, fontWeight: '600' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.dark,
    paddingRight: 12,
    minHeight: 54,
  },
  back: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { color: C.white, fontSize: 18, fontWeight: '600' },
  form: { padding: 16, gap: 14, paddingBottom: 35 },
  line: { height: 1, backgroundColor: C.line },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F4',
  },
  tableHeader: {
    backgroundColor: '#F0F5F8',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 7,
  },
  cell: { flex: 1, fontSize: 11, color: C.text },
  smallCell: { width: 65, fontSize: 11, color: C.text },
  summary: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: C.mint,
    padding: 10,
    gap: 5,
  },
  summaryValue: { color: C.green, fontWeight: '700', fontSize: 20 },
  listTouch: { minHeight: 62 },
  note: {
    color: C.green,
    backgroundColor: C.mint,
    borderRadius: 7,
    padding: 10,
    fontSize: 12,
    lineHeight: 19,
  },
});
