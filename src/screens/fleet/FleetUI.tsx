import React from 'react';
import { Text, View } from 'react-native';
import { Vehicle } from '../../api/types';
import { NoorIcon, NoorBadge } from '../../components/Noor';
import { useTranslation } from '../../i18n';
import { f } from './styles';

export function VehicleMark() {
  return (
    <View style={f.vehicleMark}>
      <NoorIcon name="vehicles" color="#CE9F1B" size={35} />
    </View>
  );
}

export function VehicleStatus({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  return (
    <NoorBadge
      label={
        vehicle.status === 'MAINTENANCE'
          ? t('Maintenance')
          : vehicle.status === 'INACTIVE'
          ? t('Inactive')
          : t('Running')
      }
      tone={
        vehicle.status === 'MAINTENANCE'
          ? 'red'
          : vehicle.status === 'INACTIVE'
          ? 'gray'
          : 'green'
      }
    />
  );
}

export function Detail({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={f.detail}>
      <NoorIcon name={icon} size={17} />
      <Text style={f.detailLabel}>{label}</Text>
      <Text style={f.detailValue}>{value || t('Not added')}</Text>
    </View>
  );
}
