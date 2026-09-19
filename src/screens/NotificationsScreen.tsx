import { useTranslation } from '../i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Empty,
  Notice,
  Page,
  SectionTitle,
} from '../components/ui';
import { NoorIcon } from '../components/Noor';
import { useCoreData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useManagement } from '../context/ManagementContext';
import { notificationTarget } from '../navigation/notificationTarget';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { dateLabel } from '../utils/format';
import { notificationText } from '../i18n/notifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import { listTelegramDeliveries } from '../api/telegram';
import { ApiError } from '../api/client';
import { TelegramDelivery, TelegramDeliveryStatus } from '../api/types';

const telegramStatusLabels: Record<TelegramDeliveryStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Sending',
  SENDING: 'Sending',
  SENT: 'Sent',
  SKIPPED: 'Skipped',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function TelegramStatus({
  status,
  t,
}: {
  status: TelegramDeliveryStatus;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const tone =
    status === 'SENT'
      ? colors.primary
      : status === 'FAILED'
      ? colors.danger
      : colors.amber;
  return (
    <View style={[local.telegramStatus, { backgroundColor: `${tone}18` }]}>
      <Text style={[local.telegramStatusText, { color: tone }]}>
        {t(telegramStatusLabels[status], {
          defaultValue: telegramStatusLabels[status],
        })}
      </Text>
    </View>
  );
}

function TelegramDeliveryCard({
  delivery,
  t,
}: {
  delivery: TelegramDelivery;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const guardian =
    delivery.guardianName ||
    delivery.userName ||
    t('Guardian', { defaultValue: 'Guardian' });
  const sentAt = delivery.sentAt ? dateLabel(delivery.sentAt) : null;
  return (
    <Card>
      <View style={local.telegramHeader}>
        <View style={local.telegramIdentity}>
          <Text style={local.telegramGuardian}>{guardian}</Text>
          <Text style={local.telegramDate}>
            {dateLabel(delivery.createdAt)}
          </Text>
        </View>
        <TelegramStatus status={delivery.status} t={t} />
      </View>
      <Text style={local.telegramTitle}>{delivery.title}</Text>
      <Text style={local.telegramBody}>{delivery.body}</Text>
      <Text style={local.telegramMeta}>
        {t('Attempts', { defaultValue: 'Attempts' })}: {delivery.attempts}
        {sentAt ? ` · ${t('Sent', { defaultValue: 'Sent' })}: ${sentAt}` : ''}
      </Text>
      {delivery.lastError ? (
        <Text style={local.telegramError}>
          {t('Error', { defaultValue: 'Error' })}: {delivery.lastError}
        </Text>
      ) : null}
    </Card>
  );
}
export function NotificationsScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Inbox'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useCoreData();
  const { session, baseUrl, expire } = useAuth();
  const { data: management } = useManagement();
  const action = useAction();
  const isAdmin = session?.user.role === 'ADMIN';
  const token = session?.token;
  const [telegramDeliveries, setTelegramDeliveries] = useState<
    TelegramDelivery[]
  >([]);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const loadTelegramDeliveries = useCallback(async () => {
    if (!isAdmin || !token) {
      setTelegramDeliveries([]);
      setTelegramError('');
      return;
    }
    setTelegramLoading(true);
    setTelegramError('');
    try {
      setTelegramDeliveries(await listTelegramDeliveries(baseUrl, token));
    } catch (problem) {
      if (problem instanceof ApiError && problem.status === 401) {
        await expire();
        return;
      }
      setTelegramError(
        problem instanceof Error
          ? problem.message
          : t('Could not load Telegram delivery details.', {
              defaultValue: 'Could not load Telegram delivery details.',
            }),
      );
    } finally {
      setTelegramLoading(false);
    }
  }, [baseUrl, expire, isAdmin, t, token]);
  useEffect(() => {
    loadTelegramDeliveries().catch(() => undefined);
  }, [loadTelegramDeliveries]);
  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), loadTelegramDeliveries()]);
  }, [loadTelegramDeliveries, refresh]);
  const updates = useMemo(
    () =>
      [...data.notifications].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [data.notifications],
  );
  return (
    <Page
      loading={loading || telegramLoading}
      refresh={refreshAll}
      error={error || telegramError}
    >
      <Notice text={action.error} kind="error" />
      {!data.notifications.length ? (
        <Empty
          title={loading ? t('Loading updates…') : t('No updates yet')}
          detail={t('Service and payment updates appear here.')}
        />
      ) : (
        updates.map(item => {
          const translated = notificationText(item);
          const urgent = /reject|stopp|emergency|জরুরি|প্রত্যাখ্যান/i.test(
            item.title,
          );
          const payment = /payment|bill|পেমেন্ট|ভাড়া|বিল/i.test(item.title);
          const tone = urgent ? '#EC5362' : payment ? '#E89B25' : '#2686E6';
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={translated.title}
              onPress={() => {
                const target = notificationTarget(
                  item,
                  session!.user.role,
                  data,
                  management,
                );
                if (target[0] === 'NotificationDetails') {
                  navigation.navigate(...target);
                } else {
                  // A fresh screen applies this record's selection even when
                  // another instance of its destination is already on the stack.
                  navigation.push(...target);
                  if (!item.readAt)
                    action.run(
                      () =>
                        mutate(
                          `/notifications/${item.id}/read`,
                          undefined,
                          'PATCH',
                        ),
                      '',
                    );
                }
              }}
              style={({ pressed }) => [
                local.notification,
                !item.readAt && local.unread,
                pressed && local.pressed,
              ]}
            >
              <View style={[local.icon, { backgroundColor: `${tone}18` }]}>
                <NoorIcon
                  name={payment ? 'receipt' : 'bell'}
                  size={23}
                  color={tone}
                />
              </View>
              <View style={local.copy}>
                <View style={local.titleRow}>
                  <Text style={local.title}>{translated.title}</Text>
                  {!item.readAt ? (
                    <View
                      accessibilityLabel={t('New')}
                      style={local.unreadDot}
                    />
                  ) : null}
                </View>
                <Text numberOfLines={2} style={local.body}>
                  {translated.body}
                </Text>
                <Text style={local.date}>{dateLabel(item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
      {isAdmin ? (
        <View style={local.telegramSection}>
          <SectionTitle>
            {t('Telegram delivery details', {
              defaultValue: 'Telegram delivery details',
            })}
          </SectionTitle>
          {telegramDeliveries.length ? (
            telegramDeliveries.map(delivery => (
              <TelegramDeliveryCard
                key={delivery.id}
                delivery={delivery}
                t={t}
              />
            ))
          ) : (
            <Card>
              <Text style={styles.muted}>
                {telegramLoading
                  ? t('Loading Telegram delivery details', {
                      defaultValue: 'Loading Telegram delivery details',
                    })
                  : t('No Telegram delivery records yet.', {
                      defaultValue: 'No Telegram delivery records yet.',
                    })}
              </Text>
            </Card>
          )}
        </View>
      ) : null}
    </Page>
  );
}

const local = StyleSheet.create({
  notification: {
    flexDirection: 'row',
    gap: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    padding: 13,
    minHeight: 90,
  },
  unread: { backgroundColor: '#F7FBFF', borderColor: '#DDEBFA' },
  icon: {
    width: 39,
    height: 39,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copy: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    flex: 1,
  },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  date: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2686E6',
  },
  pressed: { opacity: 0.7 },
  telegramSection: { gap: 10, marginTop: 6 },
  telegramHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  telegramIdentity: { flex: 1, gap: 2 },
  telegramGuardian: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  telegramDate: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  telegramStatus: {
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  telegramStatusText: { fontSize: 11, fontWeight: '700' },
  telegramTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  telegramBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  telegramMeta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  telegramError: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  telegramSummary: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  telegramLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
});

export function NotificationDetailsScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'NotificationDetails'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useCoreData();
  const action = useAction();
  const item = data.notifications.find(
    notification => notification.id === route.params.id,
  );
  const translated = item ? notificationText(item) : undefined;
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      {item && translated ? (
        <Card tinted={!item.readAt}>
          <Text style={styles.heading}>{translated.title}</Text>
          <Text style={styles.muted}>{dateLabel(item.createdAt)}</Text>
          <Text style={styles.body}>{translated.body}</Text>
          {item.telegramDelivery ? (
            <View style={local.telegramSummary}>
              <View style={local.telegramHeader}>
                <Text style={local.telegramLabel}>
                  {t('Telegram delivery', {
                    defaultValue: 'Telegram delivery',
                  })}
                </Text>
                <TelegramStatus status={item.telegramDelivery.status} t={t} />
              </View>
              {item.telegramDelivery.sentAt ? (
                <Text style={local.telegramMeta}>
                  {t('Sent', { defaultValue: 'Sent' })}:{' '}
                  {dateLabel(item.telegramDelivery.sentAt)}
                </Text>
              ) : null}
              {item.telegramDelivery.lastError ? (
                <Text style={local.telegramError}>
                  {item.telegramDelivery.lastError}
                </Text>
              ) : null}
            </View>
          ) : null}
          {!item.readAt ? (
            <Button
              secondary
              title={t('Mark as read')}
              busy={action.busy}
              onPress={() =>
                action.run(
                  () =>
                    mutate(
                      `/notifications/${item.id}/read`,
                      undefined,
                      'PATCH',
                    ),
                  '',
                )
              }
            />
          ) : null}
        </Card>
      ) : (
        <Empty
          title={t('Notification unavailable')}
          detail={t('Pull to refresh the latest records.')}
        />
      )}
    </Page>
  );
}
