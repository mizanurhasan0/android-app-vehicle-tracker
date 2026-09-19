import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { NoorIcon, NoorCard, NoorSection } from '../../components/Noor';
import { Page, Button, Empty } from '../../components/ui';
import { VehicleEditSheet } from '../../components/VehicleEditSheet';
import { numberLabel } from '../../utils/format';
import { uniqueStudents } from '../../utils/transport';
import { useTranslation } from '../../i18n';
import { f } from './styles';
import { VehicleMark, VehicleStatus, Detail } from './FleetUI';
import { fleetDate, scheduleTime } from './format';
import { VehicleMetadata } from './VehicleMetadata';

export function VehicleDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'VehicleDetails'>) {
  const { t } = useTranslation();
  const core = useData(),
    management = useManagement(),
    { session } = useAuth();
  const [editing, setEditing] = useState(false),
    [metadata, setMetadata] = useState(false);
  const vehicle = core.data.vehicles.find(v => v.id === route.params.id);
  if (!vehicle)
    return (
      <Page>
        <Empty
          title={t('Vehicle not found')}
          detail={t('Return to the list and try again.')}
        />
      </Page>
    );
  const schedules =
    management.data?.schedules.filter(s =>
      core.data.routes.some(
        r => r.id === s.routeId && r.vehicleId === vehicle.id,
      ),
    ) || [];
  const routes = core.data.routes.filter(r => r.vehicleId === vehicle.id);
  const students =
    management.data?.students.filter(
      s => s.vehicleId === vehicle.id && s.status === 'ACTIVE',
    ) || [];
  const admin = session?.user.role === 'ADMIN';
  return (
    <Page
      refresh={async () => {
        await Promise.all([core.refresh(), management.refresh()]);
      }}
      loading={core.loading || management.loading}
      error={core.error || management.error}
    >
      <NoorCard>
        <View style={f.vehicleRow}>
          <VehicleMark />
          <View style={f.flex}>
            <Text style={f.title}>{vehicle.plate}</Text>
            <VehicleStatus vehicle={vehicle} />
          </View>
          {admin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Edit vehicle')}
              onPress={() => setEditing(true)}
              style={f.iconButton}
            >
              <NoorIcon name="edit" />
            </Pressable>
          ) : null}
        </View>
        <Detail icon="driver" label={t('Driver')} value={vehicle.driverName} />
        <Detail
          icon="route"
          label={t('Route')}
          value={routes.map(r => r.name).join(', ')}
        />
        <Detail
          icon="students"
          label={t('Student count')}
          value={
            management.data ? numberLabel(uniqueStudents(students).length) : '—'
          }
        />
        <Detail icon="vehicle" label={t('Model')} value={vehicle.model} />
        <Detail
          icon="calendar"
          label={t('Purchase date')}
          value={fleetDate(vehicle.purchaseDate)}
        />
        <Detail
          icon="document"
          label={t('License renewal')}
          value={fleetDate(vehicle.licenseExpiresAt)}
        />
        <Detail
          icon="document"
          label={t('Fitness expiry')}
          value={fleetDate(vehicle.fitnessExpiresAt)}
        />
        {admin ? (
          <Button
            title={
              metadata ? t('Close') : t('Edit vehicle documents and status')
            }
            secondary
            onPress={() => setMetadata(!metadata)}
          />
        ) : null}
        {metadata && admin ? (
          <VehicleMetadata
            vehicle={vehicle}
            onDone={() => setMetadata(false)}
          />
        ) : null}
        <NoorSection title={t('Daily schedule')}>
          {schedules.length ? (
            schedules.map(s => (
              <Detail
                key={s.id}
                icon="clock"
                label={`${
                  s.period === 'MORNING' ? t('Morning') : t('Afternoon')
                } · ${s.label}`}
                value={scheduleTime(s.time)}
              />
            ))
          ) : (
            <Text style={f.sub}>{t('No schedule has been added yet.')}</Text>
          )}
        </NoorSection>
        <View style={f.actionRow}>
          <View style={f.flex}>
            <Button
              title={t('Live location')}
              onPress={() =>
                navigation.navigate('LiveTracking', { vehicleId: vehicle.id })
              }
            />
          </View>
          {admin ? (
            <View style={f.flex}>
              <Button
                title={t('Maintenance')}
                onPress={() =>
                  navigation.navigate('Maintenance', { vehicleId: vehicle.id })
                }
              />
            </View>
          ) : null}
        </View>
        {admin ? (
          <>
            <Button
              title={t('Fuel / expenses')}
              secondary
              onPress={() =>
                navigation.navigate('Accounts', { tab: 'EXPENSE' })
              }
            />
            <Button
              title={t('Travel history')}
              secondary
              onPress={() =>
                navigation.navigate('VehicleHistory', {
                  imei: vehicle.imei,
                  name: vehicle.name,
                })
              }
            />
          </>
        ) : null}
      </NoorCard>
      <VehicleEditSheet
        vehicle={editing ? vehicle : null}
        onClose={() => setEditing(false)}
        onSaved={async () => {
          await Promise.all([core.refresh(), management.refresh()]);
        }}
      />
    </Page>
  );
}
