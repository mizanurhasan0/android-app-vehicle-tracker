import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Maintenance } from '../../../api/management';
import { NoorIcon } from '../../../components/Noor';
import { useManagement } from '../../../context/ManagementContext';
import { useData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { money } from '../../../utils/format';
import {
  AdminPage,
  Box,
  C,
  Choice,
  Detail,
  EmptyState,
  Heading,
  Pill,
  SmallButton,
  niceDate,
  s,
} from '../AdminUi';
import { MaintenanceForm } from './MaintenanceForm';

export function MaintenanceScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const initial = (params || {}) as { vehicleId?: string };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [vehicle, setVehicle] = useState(initial.vehicleId || '');
  const [editing, setEditing] = useState<Maintenance | null | undefined>();
  const records = (data?.maintenance || [])
    .filter(item => !vehicle || item.vehicleId === vehicle)
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading
        title={t('Vehicle service and repairs')}
        action={t('+ Add')}
        onAction={() => setEditing(null)}
      />
      <Choice
        label={t('Filter by vehicle')}
        value={vehicle}
        onChange={setVehicle}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: item.name,
        }))}
      />
      {records.map(item => (
        <Box key={item.id}>
          <View style={s.row}>
            <View style={[s.avatar, { backgroundColor: C.mint }]}>
              <NoorIcon name="vehicles" size={28} color={C.green} />
            </View>
            <View style={s.flex}>
              <Text style={s.heading}>{item.vehicleName}</Text>
              <Text style={s.body}>{item.title}</Text>
            </View>
            <Pill
              value={
                item.status === 'IN_PROGRESS'
                  ? 'MAINTENANCE'
                  : item.status === 'PLANNED'
                  ? 'PENDING'
                  : 'COMPLETED'
              }
            />
          </View>
          <Detail label={t('Service')} value={niceDate(item.serviceDate)} />
          <Detail
            label={t('Next service')}
            value={niceDate(item.nextServiceDate)}
          />
          {item.description ? (
            <Text style={s.body}>{item.description}</Text>
          ) : null}
          <Detail label={t('Cost')} value={money(item.amount)} />
          <SmallButton
            title={t('Service details / Edit')}
            secondary
            onPress={() => setEditing(item)}
          />
        </Box>
      ))}
      {!records.length ? (
        <EmptyState
          text={t('No maintenance records')}
          detail={t('Add the first service record.')}
        />
      ) : null}
      <MaintenanceForm
        visible={editing !== undefined}
        item={editing || undefined}
        vehicleId={vehicle}
        onClose={() => setEditing(undefined)}
      />
    </AdminPage>
  );
}
