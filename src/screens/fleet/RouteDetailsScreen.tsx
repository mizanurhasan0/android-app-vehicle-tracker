import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useCoreData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { Page, Button, Empty } from '../../components/ui';
import {
  isServiceScheduled,
  serviceShift,
  transportShifts,
  uniqueStudents,
} from '../../utils/transport';
import { useDhakaDate } from '../../hooks/useDhakaDate';
import { useTranslation } from '../../i18n';
import {
  AlertRadiusSettings,
  initialAlertRadiusSettings,
} from '../../components/PickupPointEditor';
import { RouteScheduleHeader, RouteScheduleOverview } from './RouteScheduleTop';
import {
  RouteScheduleActions,
  RouteScheduleCard,
} from '../routes/RouteScheduleCard';

export function RouteDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'RouteDetails'>) {
  const { t } = useTranslation();
  const today = useDhakaDate();
  const { data } = useCoreData();
  const { session } = useAuth();
  const management = useManagement();
  const [shiftId, setShiftId] = useState('MORNING');
  const [editing, setEditing] = useState(false);
  const selected = data.routes.find(item => item.id === route.params.id);
  const [alertSettings, setAlertSettings] = useState<AlertRadiusSettings>(() =>
    initialAlertRadiusSettings(selected?.stops || []),
  );
  const shifts = transportShifts(management.data?.settings);
  useEffect(() => {
    if (shiftId && !shifts.some(shift => shift.id === shiftId))
      setShiftId(
        shifts.find(shift => shift.id === 'MORNING')?.id || shifts[0]?.id || '',
      );
  }, [shiftId, shifts]);

  if (!selected)
    return (
      <Page dashboard>
        <StatusBar barStyle="dark-content" backgroundColor="#F4FAF7" />
        <Button
          title={t('Back')}
          secondary
          onPress={() => navigation.goBack()}
        />
        <Empty
          title={t('Route not found')}
          detail={t('Return to the route list.')}
        />
      </Page>
    );

  const vehicle = data.vehicles.find(item => item.id === selected.vehicleId);
  const schedules = (management.data?.schedules || []).filter(
    item => item.routeId === selected.id,
  );
  const students = (management.data?.students || []).filter(
    item => item.routeId === selected.id && item.status === 'ACTIVE',
  );
  const scheduled = students.filter(
    student =>
      isServiceScheduled(
        student,
        today,
        management.data?.settings.operatingDays,
      ) &&
      (!shiftId || serviceShift(student) === shiftId),
  );
  const isAdmin = session?.user.role === 'ADMIN';
  const onViewMap = () =>
    navigation.navigate('LiveTracking', { vehicleId: selected.vehicleId });

  return (
    <Page
      dashboard
      loading={management.loading}
      error={management.error}
      refresh={management.refresh}
      footer={
        <RouteScheduleActions
          isAdmin={isAdmin}
          editing={editing}
          onEdit={() => setEditing(value => !value)}
          onApplyRoute={() => navigation.navigate('Admission')}
          onViewMap={onViewMap}
        />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F4FAF7" />
      <RouteScheduleHeader
        onBack={() => navigation.goBack()}
        onMap={onViewMap}
      />
      <RouteScheduleOverview
        route={selected}
        scheduled={scheduled}
        shifts={shifts}
        shiftId={shiftId}
        onShiftChange={setShiftId}
        editable={isAdmin}
        alertSettings={alertSettings}
        onAlertSettingsChange={setAlertSettings}
      />
      <RouteScheduleCard
        route={selected}
        vehicle={vehicle}
        schedules={schedules}
        studentCount={uniqueStudents(students).length}
        isAdmin={isAdmin}
        editing={editing}
        onOpenEdit={() => setEditing(true)}
        onCloseEdit={() => setEditing(false)}
      />
    </Page>
  );
}
