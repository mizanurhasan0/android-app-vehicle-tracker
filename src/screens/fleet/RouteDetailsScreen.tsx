import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useCoreData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { NoorCard } from '../../components/Noor';
import { Page, Button, Select, Empty } from '../../components/ui';
import { RouteFareManager } from '../../components/RouteFareManager';
import { money, numberLabel } from '../../utils/format';
import {
  isServiceScheduled,
  serviceShift,
  transportShifts,
  uniqueStudents,
} from '../../utils/transport';
import { useDhakaDate } from '../../hooks/useDhakaDate';
import { useTranslation } from '../../i18n';
import { f } from './styles';
import { VehicleMark } from './FleetUI';
import { scheduleTime } from './format';
import { ScheduleEditor } from './ScheduleEditor';
import { PickupPointEditor } from '../../components/PickupPointEditor';

export function RouteDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'RouteDetails'>) {
  const { t } = useTranslation();
  const today = useDhakaDate();
  const { data } = useCoreData();
  const { session } = useAuth();
  const management = useManagement();
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [shiftId, setShiftId] = useState('');
  const selected = data.routes.find(r => r.id === route.params.id);
  if (!selected)
    return (
      <Page>
        <Empty
          title={t('Route not found')}
          detail={t('Return to the route list.')}
        />
      </Page>
    );
  const vehicle = data.vehicles.find(v => v.id === selected.vehicleId);
  const schedules = (management.data?.schedules || []).filter(
    s => s.routeId === selected.id,
  );
  const students = (management.data?.students || []).filter(
    s => s.routeId === selected.id && s.status === 'ACTIVE',
  );
  const shifts = transportShifts(management.data?.settings);
  const scheduled = students.filter(
    student =>
      isServiceScheduled(
        student,
        today,
        management.data?.settings.operatingDays,
      ) &&
      (!shiftId || serviceShift(student) === shiftId),
  );
  return (
    <Page
      loading={management.loading}
      error={management.error}
      refresh={management.refresh}
    >
      <NoorCard>
        <Text style={f.title}>{t("Today's passengers")}</Text>
        <Select
          label={t('Transport shift')}
          value={shiftId}
          onChange={setShiftId}
          options={[
            { value: '', label: t('All shifts') },
            ...shifts.map(shift => ({ value: shift.id, label: t(shift.name) })),
          ]}
        />
        {scheduled.map(student => (
          <View key={student.id} style={f.tableRow}>
            <View style={f.flex}>
              <Text style={f.title}>{student.studentName}</Text>
              <Text style={f.sub}>
                {student.stopName} →{' '}
                {student.dropoffStopName ||
                  student.dropAddress ||
                  t('Destination')}
              </Text>
            </View>
            <Text style={f.sub}>
              {t(
                shifts.find(shift => shift.id === serviceShift(student))
                  ?.name || serviceShift(student),
              )}
            </Text>
          </View>
        ))}
        {!scheduled.length ? (
          <Text style={f.sub}>
            {t('No students scheduled for this date and shift.')}
          </Text>
        ) : null}
      </NoorCard>
      <RouteFareManager
        route={selected}
        editable={session?.user.role === 'ADMIN'}
      />
      {session?.user.role === 'ADMIN' ? (
        <NoorCard>
          <Text style={f.title}>{t('Pickup points')}</Text>
          <Text style={f.sub}>
            {t('Set the location and geofence radius for each stop.')}
          </Text>
          {selected.stops.map(stop => (
            <PickupPointEditor key={stop.id} stop={stop} />
          ))}
        </NoorCard>
      ) : null}
      <NoorCard>
        <View style={f.vehicleRow}>
          <VehicleMark />
          <View style={f.flex}>
            <Text style={f.title}>{vehicle?.name || selected.vehicleName}</Text>
            <Text style={f.sub}>
              {t('Driver: {{name}}', {
                name: vehicle?.driverName || t('Not assigned'),
              })}
            </Text>
            <Text style={f.sub}>
              {t('Students: {{number}}', {
                number: numberLabel(uniqueStudents(students).length),
              })}{' '}
              · {money(selected.monthlyAmount)}
            </Text>
          </View>
        </View>
        <View style={f.actionRow}>
          {(['MORNING', 'AFTERNOON'] as const).map(p => (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: p === period }}
              onPress={() => setPeriod(p)}
              style={[f.period, p === period && f.periodSelected]}
            >
              <Text style={p === period ? f.white : f.sub}>
                {p === 'MORNING' ? t('Pickup order') : t('Return schedule')}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={f.tableHeader}>
          <Text style={f.number}>#</Text>
          <Text style={[f.detailLabel, f.bold]}>
            {t('Student name / stop')}
          </Text>
          <Text style={[f.sub, f.bold]}>{t('Time')}</Text>
        </View>
        {schedules
          .filter(s => s.period === period)
          .sort((a, b) => a.position - b.position)
          .map((s, i) => (
            <View key={s.id} style={f.tableRow}>
              <Text style={f.number}>{numberLabel(i + 1)}</Text>
              <Text style={f.detailLabel}>{s.label}</Text>
              <Text style={f.sub}>{scheduleTime(s.time)}</Text>
            </View>
          ))}
        {!schedules.some(s => s.period === period)
          ? selected.stops.map((s, i) => (
              <View key={s.id} style={f.tableRow}>
                <Text style={f.number}>{numberLabel(i + 1)}</Text>
                <Text style={f.detailLabel}>{s.name}</Text>
                <Text style={f.sub}>—</Text>
              </View>
            ))
          : null}
        {session?.user.role === 'ADMIN' ? (
          <Button
            title={editing ? t('Close') : t('Edit schedule')}
            onPress={() => setEditing(!editing)}
          />
        ) : (
          <Button
            title={t('Apply for this route')}
            onPress={() => navigation.navigate('Admission')}
          />
        )}
        {editing ? (
          <ScheduleEditor
            routeId={selected.id}
            initial={schedules.map(
              ({ id: _id, routeId: _routeId, ...entry }) => entry,
            )}
            stops={selected.stops}
            onDone={() => setEditing(false)}
          />
        ) : null}
        <Button
          title={t('View on live map')}
          secondary
          onPress={() =>
            navigation.navigate('LiveTracking', {
              vehicleId: selected.vehicleId,
            })
          }
        />
      </NoorCard>
    </Page>
  );
}
