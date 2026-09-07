import { useTranslation } from '../i18n';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Empty, Notice, Page } from '../components/ui';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { dateLabel } from '../utils/format';
import { notificationText } from '../i18n/notifications';
export function NotificationsScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useData();
  const action = useAction();
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
      <Notice text={action.error} kind="error" />
      {!data.notifications.length ? (
        <Empty
          title={loading ? t('Loading updates…') : t('No updates yet')}
          detail={t('Service and payment updates appear here.')}
        />
      ) : (
        updates.map(item => {
          const translated = notificationText(item);
          return (
            <Card key={item.id} tinted={!item.readAt}>
              <View style={styles.between}>
                <Text style={styles.heading}>{translated.title}</Text>
                {!item.readAt ? <Badge status="NEW" /> : null}
              </View>
              <Text style={styles.body}>{translated.body}</Text>
              <Text style={styles.muted}>{dateLabel(item.createdAt)}</Text>
              {!item.readAt ? (
                <Button
                  secondary
                  title={t('Mark as read')}
                  busy={action.busy}
                  onPress={() => {
                    action.run(
                      () =>
                        mutate(
                          `/notifications/${item.id}/read`,
                          undefined,
                          'PATCH',
                        ),
                      '',
                    );
                  }}
                />
              ) : null}
            </Card>
          );
        })
      )}
    </Page>
  );
}
