import React, { useState } from 'react';
import { Vehicle } from '../../api/types';
import { useData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { NoorCard } from '../../components/Noor';
import { Button, Field, Select, Notice } from '../../components/ui';
import { useTranslation } from '../../i18n';

export function VehicleMetadata({
  vehicle,
  onDone,
}: {
  vehicle: Vehicle;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { mutate } = useData();
  const action = useAction();
  const [model, setModel] = useState(vehicle.model || ''),
    [purchaseDate, setPurchaseDate] = useState(vehicle.purchaseDate || ''),
    [fitnessExpiresAt, setFitness] = useState(vehicle.fitnessExpiresAt || ''),
    [licenseExpiresAt, setLicense] = useState(vehicle.licenseExpiresAt || ''),
    [status, setStatus] = useState(vehicle.status || 'RUNNING');
  return (
    <NoorCard>
      <Field
        label={t('Model')}
        value={model}
        error={action.fieldErrors.model}
        onChangeText={value => {
          action.clearFieldError('model');
          setModel(value);
        }}
        maxLength={100}
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
      />
      <Select
        label={t('Status')}
        value={status}
        error={action.fieldErrors.status}
        onChange={v => {
          action.clearFieldError('status');
          setStatus(v as Vehicle['status'] & string);
        }}
        options={[
          { value: 'RUNNING', label: t('Running') },
          { value: 'MAINTENANCE', label: t('Maintenance') },
          { value: 'INACTIVE', label: t('Inactive') },
        ]}
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Save')}
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            await mutate(
              `/vehicles/${vehicle.id}`,
              {
                model,
                purchaseDate,
                fitnessExpiresAt,
                licenseExpiresAt,
                status,
              },
              'PATCH',
            );
            onDone();
          })
        }
      />
    </NoorCard>
  );
}
