import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Vehicle } from '../../api/types';
import { AppIcon } from '../../components/AppIcon';
import { VehicleBottomSheet } from '../../components/VehicleBottomSheet';
import { Button, Field, Notice, Select } from '../../components/ui';
import { useDataActions } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';

export function VehicleMetadata({
  vehicle,
  onDone,
}: {
  vehicle: Vehicle | null;
  onDone: () => void;
}) {
  if (!vehicle) return null;
  return (
    <VehicleMetadataEditor key={vehicle.id} vehicle={vehicle} onDone={onDone} />
  );
}

function VehicleMetadataEditor({
  vehicle,
  onDone,
}: {
  vehicle: Vehicle;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { mutate } = useDataActions();
  const action = useAction();
  const [model, setModel] = useState(vehicle.model || '');
  const [purchaseDate, setPurchaseDate] = useState(vehicle.purchaseDate || '');
  const [fitnessExpiresAt, setFitness] = useState(
    vehicle.fitnessExpiresAt || '',
  );
  const [licenseExpiresAt, setLicense] = useState(
    vehicle.licenseExpiresAt || '',
  );
  const [status, setStatus] = useState(vehicle.status || 'RUNNING');
  const changed =
    model !== (vehicle.model || '') ||
    purchaseDate !== (vehicle.purchaseDate || '') ||
    fitnessExpiresAt !== (vehicle.fitnessExpiresAt || '') ||
    licenseExpiresAt !== (vehicle.licenseExpiresAt || '') ||
    status !== (vehicle.status || 'RUNNING');
  const save = (closeAfterSave: () => void) => {
    if (!changed) return;
    action.run(async () => {
      await mutate(
        `/vehicles/${encodeURIComponent(vehicle.id)}`,
        {
          model,
          purchaseDate,
          fitnessExpiresAt,
          licenseExpiresAt,
          status,
        },
        'PATCH',
      );
      closeAfterSave();
    });
  };

  return (
    <VehicleBottomSheet busy={action.busy} onClose={onDone}>
      {({ requestClose, closeAfterSave }) => (
        <>
          <View accessible={false} style={local.handle} />
          <View style={local.header}>
            <View style={local.vehicleIcon}>
              <AppIcon kind="vehicles" size={24} />
            </View>
            <View style={local.heading}>
              <Text accessibilityRole="header" style={styles.heading}>
                {t('Vehicle information')}
              </Text>
              <Text numberOfLines={1} style={styles.muted}>
                {vehicle.name} · {vehicle.plate}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
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
            <View style={local.group}>
              <Field
                label={t('Model')}
                value={model}
                error={action.fieldErrors.model}
                onChangeText={value => {
                  action.clearFieldError('model');
                  setModel(value);
                }}
                maxLength={100}
                editable={!action.busy}
              />
              <Field
                label={t('Purchase date (YYYY-MM-DD)')}
                value={purchaseDate}
                error={action.fieldErrors.purchaseDate}
                onChangeText={value => {
                  action.clearFieldError('purchaseDate');
                  setPurchaseDate(value);
                }}
                maxLength={10}
                editable={!action.busy}
              />
              <Field
                label={t('Fitness expiry (YYYY-MM-DD)')}
                value={fitnessExpiresAt}
                error={action.fieldErrors.fitnessExpiresAt}
                onChangeText={value => {
                  action.clearFieldError('fitnessExpiresAt');
                  setFitness(value);
                }}
                maxLength={10}
                editable={!action.busy}
              />
              <Field
                label={t('License expiry (YYYY-MM-DD)')}
                value={licenseExpiresAt}
                error={action.fieldErrors.licenseExpiresAt}
                onChangeText={value => {
                  action.clearFieldError('licenseExpiresAt');
                  setLicense(value);
                }}
                maxLength={10}
                editable={!action.busy}
              />
              <Select
                label={t('Status')}
                value={status}
                error={action.fieldErrors.status}
                disabled={action.busy}
                onChange={value => {
                  action.clearFieldError('status');
                  setStatus(value as Vehicle['status'] & string);
                }}
                options={[
                  { value: 'RUNNING', label: t('Running') },
                  { value: 'MAINTENANCE', label: t('Maintenance') },
                  { value: 'INACTIVE', label: t('Inactive') },
                ]}
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
              busy={action.busy}
              disabled={!changed}
              onPress={() => save(closeAfterSave)}
            />
            <Button
              title={t('Cancel')}
              secondary
              disabled={action.busy}
              onPress={requestClose}
            />
          </SafeAreaView>
        </>
      )}
    </VehicleBottomSheet>
  );
}

const local = StyleSheet.create({
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
  footer: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
});
