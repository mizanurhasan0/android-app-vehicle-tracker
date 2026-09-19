import React from 'react';
import { Linking, Platform, View } from 'react-native';
import { useTranslation } from '../../../i18n';
import { normalizeDigits } from '../../../utils/format';
import { IconButton, SmallButton } from './buttons';
import { ErrorText } from './layout';
import { s } from './styles';
import { useAction } from './useAction';

export async function contact(
  phone: string,
  channel: 'call' | 'sms' | 'whatsapp',
  message = '',
) {
  let cleaned = normalizeDigits(phone).replace(/[^+\d]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned))
    throw new Error('Enter a valid mobile number.');
  if (channel === 'whatsapp' && cleaned.startsWith('01'))
    cleaned = `88${cleaned}`;
  const url =
    channel === 'call'
      ? `tel:${cleaned}`
      : channel === 'sms'
      ? `sms:${cleaned}${
          Platform.OS === 'ios' ? '&' : '?'
        }body=${encodeURIComponent(message)}`
      : `https://wa.me/${cleaned.replace(/^\+/, '')}?text=${encodeURIComponent(
          message,
        )}`;
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error(
      channel === 'whatsapp'
        ? 'Could not open WhatsApp. Check that the app is installed.'
        : 'Could not open the contact app on this device.',
    );
  }
}

export function ContactActions({
  phone,
  onEdit,
  compact = false,
}: {
  phone: string;
  onEdit?: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const action = useAction();
  return (
    <View style={s.stack}>
      <ErrorText message={action.error} />
      {compact ? (
        <View style={s.compactActions}>
          <IconButton
            title="Call"
            icon="phone"
            disabled={!phone}
            busy={action.busy}
            onPress={() => action.run(() => contact(phone, 'call'))}
          />
          <IconButton
            title="WhatsApp"
            icon="whatsapp"
            disabled={!phone}
            busy={action.busy}
            onPress={() => action.run(() => contact(phone, 'whatsapp'))}
          />
          <IconButton
            title={onEdit ? 'Edit' : 'SMS'}
            icon={onEdit ? 'edit' : 'sms'}
            onPress={onEdit || (() => action.run(() => contact(phone, 'sms')))}
            disabled={!onEdit && !phone}
          />
        </View>
      ) : (
        <View style={s.row}>
          <View style={s.flex}>
            <SmallButton
              title={t('Call')}
              icon="phone"
              disabled={!phone}
              busy={action.busy}
              onPress={() => action.run(() => contact(phone, 'call'))}
            />
          </View>
          <View style={s.flex}>
            <SmallButton
              title={t('WhatsApp')}
              icon="whatsapp"
              disabled={!phone}
              busy={action.busy}
              onPress={() => action.run(() => contact(phone, 'whatsapp'))}
            />
          </View>
          <View style={s.flex}>
            <SmallButton
              title={t(onEdit ? 'Edit' : 'SMS')}
              icon={onEdit ? 'edit' : 'sms'}
              onPress={
                onEdit || (() => action.run(() => contact(phone, 'sms')))
              }
              disabled={!onEdit && !phone}
            />
          </View>
        </View>
      )}
    </View>
  );
}
