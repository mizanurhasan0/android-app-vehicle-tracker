import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { Button, Field, Notice } from './ui';
export function ReviewActions({
  path,
  confirmation = 'Approve this request?',
  resolve = false,
}: {
  path: string;
  confirmation?: string;
  resolve?: boolean;
}) {
  const { mutate } = useData();
  const [note, setNote] = useState('');
  const action = useAction();
  function decide(approved: boolean) {
    action.run(
      async () => {
        if ((!approved || resolve) && !note.trim())
          throw new Error(
            resolve
              ? 'Add a resolution note first.'
              : 'Add a rejection reason first.',
          );
        await mutate(
          path,
          resolve
            ? { status: 'RESOLVED', note }
            : { decision: approved ? 'APPROVED' : 'REJECTED', note },
          'PATCH',
        );
      },
      approved
        ? 'Approved and guardian notified.'
        : 'Rejected and guardian notified.',
    );
  }
  return (
    <View style={styles.section}>
      <Field
        label={resolve ? 'Resolution note' : 'Review note / rejection reason'}
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={resolve ? 'Mark resolved' : 'Approve'}
        busy={action.busy}
        onPress={() =>
          Alert.alert(
            resolve ? 'Resolve complaint' : 'Confirm approval',
            confirmation,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm', onPress: () => decide(true) },
            ],
          )
        }
      />
      {!resolve ? (
        <Button
          secondary
          title="Reject with reason"
          disabled={action.busy}
          onPress={() => decide(false)}
        />
      ) : null}
    </View>
  );
}
