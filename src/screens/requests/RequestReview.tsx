import React, { useState } from 'react';
import { Keyboard, Linking, Pressable, Text, View } from 'react-native';
import { Button, Field, Notice } from '../../components/ui';
import { NoorIcon } from '../../components/Noor';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { useAction } from '../../hooks/useAction';
import { ValidationError } from '../../utils/validation';
import { colors, styles } from '../../theme';
import { local } from './styles';

export function RequestActions({
  label,
  initiallyExpanded = false,
  children,
}: React.PropsWithChildren<{ label: string; initiallyExpanded?: boolean }>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <View style={local.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t(
          expanded ? 'Hide details' : 'View details',
        )} · ${label}`}
        accessibilityState={{ expanded }}
        onPress={() => {
          Keyboard.dismiss();
          setExpanded(!expanded);
        }}
        style={({ pressed }) => [local.disclosure, pressed && local.pressed]}
      >
        <Text style={local.link}>
          {t(expanded ? 'Hide details' : 'View details')}
        </Text>
        <NoorIcon
          name={expanded ? 'minus' : 'plus'}
          size={20}
          color={colors.primary}
        />
      </Pressable>
      <View
        style={[local.actionFields, !expanded && local.hidden]}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </View>
    </View>
  );
}

export function CallGuardian({ id, phone }: { id: string; phone: string }) {
  const { t } = useTranslation();
  const { mutate } = useData();
  const action = useAction();
  const [note, setNote] = useState('');
  return (
    <View style={styles.section}>
      <Button
        secondary
        title={t('Call guardian · {{phone}}', { phone })}
        onPress={() => {
          action.run(
            () => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`),
            '',
          );
        }}
      />
      <Field
        label={t('Call note')}
        value={note}
        error={action.fieldErrors.note}
        onChangeText={value => {
          action.clearFieldError('note');
          setNote(value);
        }}
        maxLength={500}
      />
      <Button
        secondary
        title={t('Save call note')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!note.trim())
              throw new ValidationError({ note: 'Add a call note first.' });
            await mutate(`/admin/requests/${id}/call-notes`, {
              note,
            });
            setNote('');
          });
        }}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
    </View>
  );
}
