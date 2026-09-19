import React, { useState } from 'react';
import { Text } from 'react-native';
import { ValidationError } from '../../utils/validation';
import { Button, Card, Field, Notice } from '../../components/ui';
import { useDataActions } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { styles } from '../../theme';
import { currentMonth } from '../../utils/format';
export function BillGenerator() {
  const { t } = useTranslation();
  const { mutate } = useDataActions();
  const [month, setMonth] = useState(currentMonth());
  const action = useAction();
  return (
    <Card tinted>
      <Text style={styles.heading}>{t('Create monthly bills')}</Text>
      <Field
        label={t('Billing month (YYYY-MM)')}
        keyboardType="numbers-and-punctuation"
        value={month}
        error={action.fieldErrors.month}
        onChangeText={value => {
          action.clearFieldError('month');
          setMonth(value);
        }}
        placeholder="2026-09"
        maxLength={7}
        autoCorrect={false}
        editable={!action.busy}
        hint={t(
          'Full monthly fee; no automatic proration. Existing bills are never duplicated.',
        )}
      />
      <Notice text={action.error ? t(action.error) : ''} kind="error" />
      <Notice text={action.success ? t(action.success) : ''} />
      <Button
        title={t('Generate bills')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
              throw new ValidationError({
                month: 'Use a valid month such as 2026-09.',
              });
            }
            await mutate('/admin/bills/generate', { month });
          }, 'Monthly bills are ready. Guardians have been notified.');
        }}
      />
    </Card>
  );
}
