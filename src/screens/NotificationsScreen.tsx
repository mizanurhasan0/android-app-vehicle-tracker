import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Empty, Notice, Page } from '../components/ui';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { dateLabel } from '../utils/format';
export function NotificationsScreen() {
  const { data, loading, error, refresh, mutate } = useData();
  const action = useAction();
  return (
    <Page
      title="Your inbox"
      subtitle="Service decisions and payment confirmations, all in one place."
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <Text style={styles.muted}>
        Updates refresh while the app is open. Pull down to check now.
      </Text>
      <Notice text={action.error} kind="error" />
      {!data.notifications.length ? (
        <Empty
          title="You’re all caught up"
          detail="We’ll keep your service and payment updates here."
        />
      ) : (
        data.notifications.map(item => (
          <Card key={item.id} tinted={!item.readAt}>
            <View style={styles.between}>
              <Text style={styles.heading}>{item.title}</Text>
              {!item.readAt ? <Badge status="NEW" /> : null}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.muted}>{dateLabel(item.createdAt)}</Text>
            {!item.readAt ? (
              <Button
                secondary
                title="Mark as read"
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
        ))
      )}
    </Page>
  );
}
