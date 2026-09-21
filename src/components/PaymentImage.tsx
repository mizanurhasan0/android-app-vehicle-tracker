import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import { useAction } from '../hooks/useAction';
import { pickPaymentPhoto } from '../utils/photo';
import { styles } from '../theme';
import { Button, Notice } from './ui';

/** Shared QR/evidence picker with an uncropped, full-screen preview. */
export function PaymentImage({
  value,
  label,
  onChange,
  disabled = false,
}: {
  value?: string;
  label: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const action = useAction();
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('View image')}
          onPress={() => setOpen(true)}
        >
          <Image
            accessibilityLabel={label}
            source={{ uri: value }}
            style={image.preview}
            resizeMode="contain"
          />
        </Pressable>
      ) : null}
      {onChange ? (
        <>
          <Button
            secondary
            title={t(value ? 'Replace image' : 'Upload image')}
            disabled={disabled}
            busy={action.busy}
            onPress={() =>
              action.run(async () => {
                const selected = await pickPaymentPhoto();
                if (selected) onChange(selected);
              }, '')
            }
          />
          {value ? (
            <Button
              secondary
              title={t('Remove image')}
              disabled={disabled || action.busy}
              onPress={() => onChange('')}
            />
          ) : null}
          <Notice text={action.error} kind="error" />
        </>
      ) : null}
      {open && value ? (
        <Modal visible onRequestClose={() => setOpen(false)}>
          <View style={image.fullscreen}>
            <Image
              accessibilityLabel={label}
              source={{ uri: value }}
              style={image.fullImage}
              resizeMode="contain"
            />
            <Button title={t('Close')} onPress={() => setOpen(false)} />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
const image = StyleSheet.create({
  preview: { width: '100%', height: 260, backgroundColor: '#fff' },
  fullscreen: { flex: 1, padding: 24, backgroundColor: '#fff' },
  fullImage: { flex: 1, width: '100%' },
});
