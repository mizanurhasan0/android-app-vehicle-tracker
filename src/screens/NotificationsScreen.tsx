import { useTranslation } from '../i18n';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, Empty, Notice, Page } from '../components/ui';
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
    <Page
      title={t('Latest updates')}
      loading={loading}
      refresh={refresh}
      error={error}
    >
      {!data.notifications.length ? (
        <Empty
          title={loading ? t('Loading updates…') : t('No updates yet')}
          detail={t('Service and payment updates appear here.')}
        />
      ) : (
        updates.map(item => {
          const translated = notificationText(item);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={translated.title}
              onPress={() =>
                navigation.navigate('NotificationDetails', { id: item.id })
              }
            >
              <Card tinted={!item.readAt}>
                <View style={styles.between}>
                  <Text style={styles.heading}>{translated.title}</Text>
                  {!item.readAt ? <Badge status="NEW" /> : null}
                </View>
                <Text numberOfLines={2} style={styles.body}>
                  {translated.body}
                </Text>
                <Text style={styles.muted}>{dateLabel(item.createdAt)}</Text>
                <Text style={{ color: colors.primary }}>
                  {t('View details')} →
                </Text>
              </Card>
            </Pressable>
          );
        })
      )}
    </Page>
  );
}

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
