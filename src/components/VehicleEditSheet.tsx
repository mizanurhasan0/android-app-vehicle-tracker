import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Vehicle } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { AppIcon } from './AppIcon';
import { Button, Field, Notice } from './ui';

interface VehicleEditSheetProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function VehicleEditSheet({
  vehicle,
  onClose,
  onSaved,
}: VehicleEditSheetProps) {
  const { session } = useAuth();
  if (!vehicle || session?.user.role !== 'ADMIN') return null;
  // Remount for a different vehicle while preserving drafts during live refreshes.
  return (
    <VehicleEditor
      key={vehicle.id}
      vehicle={vehicle}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function VehicleEditor({
  vehicle,
  onClose,
  onSaved,
}: Omit<VehicleEditSheetProps, 'vehicle'> & { vehicle: Vehicle }) {
  const { t } = useTranslation();
  const { mutate } = useData();
  const action = useAction();
  const [name, setName] = useState(vehicle.name);
  const [plate, setPlate] = useState(vehicle.plate);
  const [imei, setImei] = useState(vehicle.imei);
  const [driverName, setDriverName] = useState(vehicle.driverName ?? '');
  const [driverPhone, setDriverPhone] = useState(vehicle.driverPhone ?? '');
  const draft = {
    name: name.trim(),
    plate: plate.trim(),
    imei: imei.trim(),
    driverName: driverName.trim(),
    driverPhone: driverPhone.trim(),
  };
  const changed = (Object.keys(draft) as Array<keyof typeof draft>).some(
    key => draft[key] !== (vehicle[key] ?? '').trim(),
  );
  const requestClose = () => {
    if (!action.busy) onClose();
  };
  const save = () => {
    if (!changed) return;
    action.run(async () => {
      if (!draft.name || !draft.plate || !/^\d{14,17}$/.test(draft.imei)) {
        throw new Error('Enter a vehicle name, plate and a 14–17 digit IMEI.');
      }
      await mutate<Vehicle>(
        `/vehicles/${encodeURIComponent(vehicle.id)}`,
        draft,
        'PATCH',
      );
      await onSaved();
      onClose();
    }, 'Vehicle details updated.');
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={local.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          disabled={action.busy}
          onPress={requestClose}
          style={local.scrim}
        />
        <View style={local.sheet} accessibilityViewIsModal>
          <View accessible={false} style={local.handle} />
          <View style={local.header}>
            <View style={local.vehicleIcon}>
              <AppIcon kind="vehicles" size={24} />
            </View>
            <View style={local.heading}>
              <Text accessibilityRole="header" style={styles.heading}>
                {t('Edit vehicle')}
              </Text>
              <Text numberOfLines={1} style={styles.muted}>
                {vehicle.name} · {vehicle.plate}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Close vehicle editor')}
              accessibilityState={{ disabled: action.busy }}
              disabled={action.busy}
              onPress={requestClose}
              style={({ pressed }) => [
                local.close,
                (pressed || action.busy) && local.dimmed,
              ]}
            >
              <Text accessible={false} style={local.closeIcon}>
                ×
              </Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={local.content}
          >
            <Text style={styles.muted}>
              {t('Update vehicle and driver details.')}
            </Text>
            <View style={local.group}>
              <Field
                label={t('Vehicle name')}
                value={name}
                onChangeText={setName}
                maxLength={60}
                editable={!action.busy}
                autoCapitalize="words"
              />
              <Field
                label={t('Registration plate')}
                value={plate}
                onChangeText={setPlate}
                maxLength={30}
                editable={!action.busy}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Field
                label={t('GPS device IMEI')}
                value={imei}
                onChangeText={setImei}
                keyboardType="number-pad"
                maxLength={17}
                editable={!action.busy}
                hint={t('Find the 14–17 digit number on your GPS device.')}
              />
            </View>
            <View style={local.driverGroup}>
              <Text accessibilityRole="header" style={local.sectionTitle}>
                {t('Driver details')}
              </Text>
              <Field
                label={t('Driver name (optional)')}
                value={driverName}
                onChangeText={setDriverName}
                maxLength={60}
                editable={!action.busy}
                autoCapitalize="words"
              />
              <Field
                label={t('Driver phone (optional)')}
                value={driverPhone}
                onChangeText={setDriverPhone}
                keyboardType="phone-pad"
                maxLength={30}
                editable={!action.busy}
              />
            </View>
            <Notice text={action.error} kind="error" />
          </ScrollView>
          <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={local.footer}
          >
            <Button
              title={t('Save changes')}
              onPress={save}
              busy={action.busy}
              disabled={!changed}
            />
            <Button
              title={t('Cancel')}
              onPress={requestClose}
              secondary
              disabled={action.busy}
            />
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const local = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', paddingTop: 48 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#102A3280' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '100%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  heading: { flex: 1, gap: 4 },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
  },
  closeIcon: { fontSize: 28, lineHeight: 32, color: colors.muted },
  dimmed: { opacity: 0.5 },
  content: { padding: 20, gap: 20 },
  group: { gap: 16 },
  driverGroup: {
    gap: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  footer: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
});
