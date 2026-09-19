import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MessageCircle } from './icons';
import { Card, Notice } from './ui';
import { useCoreData, useDataActions } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';

interface TelegramStatus {
  enabled: boolean;
  connected: boolean;
  connectedAt: string | null;
  username: string | null;
  firstName: string | null;
  chatIdLast4: string | null;
}

interface TelegramConnectResponse {
  enabled: true;
  url: string;
  expiresAt: string;
}

type Action = 'connect' | 'disconnect' | null;

export function TelegramConnectionCard() {
  const { t } = useTranslation();
  const { data, loading, error: dataError } = useCoreData();
  const { mutate } = useDataActions();
  const mounted = useRef(true);
  const [statusOverride, setStatusOverride] = useState<TelegramStatus | null>(
    null,
  );
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState('');
  const [linkOpened, setLinkOpened] = useState(false);

  const status = statusOverride || data.telegram || null;
  const statusLoading = loading && !data.telegram;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (data.telegram) setStatusOverride(null);
  }, [data.telegram]);

  const connect = async () => {
    if (action) return;
    setAction('connect');
    setError('');
    setLinkOpened(false);
    try {
      const response = await mutate<TelegramConnectResponse>(
        '/telegram/connect',
        undefined,
        'GET',
      );
      if (!response?.url) throw new Error(t('Telegram link is unavailable.'));
      await Linking.openURL(response.url);
      if (mounted.current) setLinkOpened(true);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : t('Could not open Telegram. Please try again.'),
        );
    } finally {
      if (mounted.current) setAction(null);
    }
  };

  const disconnect = async () => {
    if (action) return;
    setAction('disconnect');
    setError('');
    try {
      await mutate<void>('/telegram', undefined, 'DELETE');
      if (mounted.current) {
        setStatusOverride(
          status ? { ...status, connected: false, connectedAt: null } : null,
        );
        setLinkOpened(false);
      }
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : t('Could not disconnect Telegram. Please try again.'),
        );
    } finally {
      if (mounted.current) setAction(null);
    }
  };

  const confirmDisconnect = () => {
    Alert.alert(
      t('Disconnect Telegram?'),
      t('You will stop receiving bus alerts in this Telegram chat.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Disconnect'),
          style: 'destructive',
          onPress: disconnect,
        },
      ],
    );
  };

  const displayName = status?.username
    ? `@${status.username}`
    : status?.firstName || t('Private Telegram chat');

  return (
    <Card>
      <View style={local.header}>
        <View style={local.icon} accessible={false}>
          <MessageCircle size={21} color="#FFFFFF" strokeWidth={2} />
        </View>
        <View style={local.heading}>
          <Text accessibilityRole="header" style={styles.heading}>
            {t('Telegram notifications')}
          </Text>
          <Text style={styles.muted}>
            {t('Receive private bus alerts in Telegram.')}
          </Text>
        </View>
        {statusLoading ? (
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel={t('Loading Telegram status')}
          />
        ) : null}
      </View>

      <Notice text={error || (!statusLoading ? dataError : '')} kind="error" />

      {!statusLoading && status?.enabled === false ? (
        <Text style={styles.muted}>
          {t('Telegram notifications are not available right now.')}
        </Text>
      ) : null}

      {!statusLoading && status?.connected ? (
        <View style={local.connected}>
          <View style={local.statusLine}>
            <View style={local.dot} />
            <Text style={local.connectedText}>{t('Connected')}</Text>
          </View>
          <Text style={styles.muted}>
            {t('Connected to {{name}}', { name: displayName })}
            {status.chatIdLast4 ? ` · ••••${status.chatIdLast4}` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Disconnect Telegram')}
            accessibilityState={{ disabled: action !== null, busy: action === 'disconnect' }}
            disabled={action !== null}
            onPress={confirmDisconnect}
            style={({ pressed }) => [
              local.secondaryButton,
              (pressed || action !== null) && local.dimmed,
            ]}
          >
            {action === 'disconnect' ? (
              <ActivityIndicator color={colors.danger} />
            ) : null}
            <Text style={local.secondaryButtonText}>{t('Disconnect')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!statusLoading && status?.enabled && !status.connected ? (
        <View style={local.connectArea}>
          <Text style={styles.muted}>
            {linkOpened
              ? t('In Telegram, tap Start to finish connecting your account.')
              : t('Connect Telegram to receive pickup arrival alerts.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Connect Telegram')}
            accessibilityState={{ disabled: action !== null, busy: action === 'connect' }}
            disabled={action !== null}
            onPress={connect}
            style={({ pressed }) => [
              local.primaryButton,
              (pressed || action !== null) && local.dimmed,
            ]}
          >
            {action === 'connect' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : null}
            <Text style={local.primaryButtonText}>
              {linkOpened ? t('Open Telegram again') : t('Connect Telegram')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!statusLoading && !status && !error && !dataError ? (
        <Text style={styles.muted}>{t('Telegram status is unavailable.')}</Text>
      ) : null}
    </Card>
  );
}

const local = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#229ED9',
  },
  heading: { flex: 1, gap: 2 },
  connected: { gap: 9 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  connectedText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  connectArea: { gap: 10 },
  primaryButton: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#F0C9CC',
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  dimmed: { opacity: 0.55 },
});
