import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { i18n, translateMessage, useTranslation } from '../i18n';

export type ToastKind = 'error' | 'warning' | 'success' | 'info';
type Toast = { id: number; message: string; kind: ToastKind };
type Snapshot = { toast: Toast | null; host: number | null };
let sequence = 0;
let announcedToast: number | null = null;
let snapshot: Snapshot = { toast: null, host: null };
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const hosts = new Map<number, boolean>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;
function update(next: Snapshot) {
  snapshot = next;
  listeners.forEach(listener => listener());
}
function selectHost() {
  const entries = [...hosts.entries()];
  const host =
    entries.filter(([, modal]) => modal).pop()?.[0] ?? entries[0]?.[0] ?? null;
  update({ ...snapshot, host });
}
export function dismissToast(id?: number) {
  if (id !== undefined && snapshot.toast?.id !== id) return;
  clearTimeout(timer);
  update({ ...snapshot, toast: null });
}
export function showToast(message: string, kind: ToastKind = 'error') {
  if (!message.trim()) return;
  // A request can be reported by both a page and its modal. Show it once.
  if (snapshot.toast?.message === message && snapshot.toast.kind === kind)
    return snapshot.toast.id;
  clearTimeout(timer);
  update({ ...snapshot, toast: { id: ++sequence, message, kind } });
  return sequence;
}

/** Bridges existing state-based feedback to the single toast presenter. */
export function ToastMessage({
  message,
  kind = 'error',
}: {
  message?: string;
  kind?: ToastKind;
}) {
  useEffect(() => {
    if (message) showToast(message, kind);
  }, [message, kind]);
  return null;
}

/** Mount another host inside native modals, which sit above the app window. */
export function ToastHost({ modal = false }: { modal?: boolean }) {
  const [id] = useState(() => ++sequence);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  useEffect(() => {
    hosts.set(id, modal);
    selectHost();
    return () => {
      hosts.delete(id);
      selectHost();
      if (!hosts.size) dismissToast();
    };
  }, [id, modal]);
  const toast = state.host === id ? state.toast : null;
  const message = toast ? translateMessage(toast.message) : '';
  useEffect(() => {
    if (!toast) return;
    if (announcedToast !== toast.id) {
      AccessibilityInfo.announceForAccessibility(message);
      announcedToast = toast.id;
    }
    let active = true;
    const duration = toast.kind === 'success' ? 4500 : 8000;
    const schedule = (timeout: number) => {
      if (!active) return;
      clearTimeout(timer);
      timer = setTimeout(
        () => dismissToast(toast.id),
        Math.max(duration, timeout || duration),
      );
    };
    // Respect Android's accessibility setting for time to take action.
    if (AccessibilityInfo.getRecommendedTimeoutMillis)
      Promise.resolve(
        AccessibilityInfo.getRecommendedTimeoutMillis(duration),
      ).then(schedule, () => schedule(duration));
    else schedule(duration);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [toast, message]);
  if (!toast) return null;
  const bangla = i18n.language === 'bn';
  const title =
    toast.kind === 'success'
      ? bangla
        ? 'সফল হয়েছে'
        : 'Success'
      : toast.kind === 'warning' || toast.kind === 'info'
      ? bangla
        ? 'দয়া করে খেয়াল করুন'
        : 'Please note'
      : bangla
      ? 'দয়া করে ঠিক করুন'
      : 'Please check';
  return (
    <View
      pointerEvents="box-none"
      style={[s.overlay, { top: insets.top + 12 }]}
    >
      <View testID="feedback-toast" style={[s.toast, s[toast.kind]]}>
        <Text accessible={false} style={s.icon}>
          {toast.kind === 'success' ? '✓' : toast.kind === 'info' ? 'i' : '!'}
        </Text>
        <View style={s.copy}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Dismiss notification', {
            defaultValue: bangla ? 'বার্তা বন্ধ করুন' : 'Dismiss notification',
          })}
          onPress={() => dismissToast(toast.id)}
          hitSlop={4}
          style={s.dismiss}
        >
          <Text style={s.close}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 30,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 600,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#152B22',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  error: { backgroundColor: '#FFF4F5', borderColor: '#AC2944' },
  warning: { backgroundColor: '#FFF8E8', borderColor: '#956100' },
  success: { backgroundColor: '#EDFAF2', borderColor: '#006A45' },
  info: { backgroundColor: '#F0F7FF', borderColor: '#2465A2' },
  icon: {
    width: 24,
    height: 24,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#20394B',
  },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '700', color: '#20394B' },
  message: { fontSize: 13, lineHeight: 20, color: '#20394B' },
  dismiss: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: { fontSize: 26, color: '#20394B' },
});
