import { useTranslation } from '../i18n';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Empty, Notice, Page } from '../components/ui';
import { NoorIcon } from '../components/Noor';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { dateLabel } from '../utils/format';
import { notificationText } from '../i18n/notifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
export function NotificationsScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Inbox'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const updates = useMemo(
    () =>
      [...data.notifications].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [data.notifications],
  );
  return (
    <Page loading={loading} refresh={refresh} error={error}>
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
              onPress={() =>
                navigation.navigate('NotificationDetails', { id: item.id })
              }
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
});

export function NotificationDetailsScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'NotificationDetails'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useData();
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
