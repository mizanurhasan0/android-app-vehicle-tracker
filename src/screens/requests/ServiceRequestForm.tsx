import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, Select } from '../../components/ui';
import { TransportSchedule } from '../../components/TransportSchedule';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import {
  defaultOperatingDays,
  enrollmentConflicts,
  scheduleValidation,
  studentIdentity,
  transportShifts,
  uniqueStudents,
} from '../../utils/transport';
import { journeyFare, journeyDestinations } from '../../utils/routeFares';
import { ValidationError } from '../../utils/validation';
import { money } from '../../utils/format';
import { styles } from '../../theme';

export function ServiceRequestForm({
  action,
}: {
  action: ReturnType<typeof useAction>;
}) {
  const { t } = useTranslation();
  const { data, mutate } = useData();
  const management = useManagement();
  const shifts = transportShifts(management.data?.settings);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [operatingDays, setOperatingDays] = useState<number[]>([]);
  const [scheduleInitialized, setScheduleInitialized] = useState(false);
  const profiles = uniqueStudents(
    [...data.requests, ...(management.data?.students || [])].filter(
      item => item.studentId,
    ),
  );
  useEffect(() => {
    if (management.data && !scheduleInitialized) {
      setShiftId(shifts[0].id);
      setOperatingDays(defaultOperatingDays(management.data.settings));
      setScheduleInitialized(true);
    }
  }, [management.data, scheduleInitialized, shifts]);
  const [studentName, setStudentName] = useState('');
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const conflicts = enrollmentConflicts(
    [...(management.data?.students || []), ...data.requests],
    {
      studentId: selectedStudentId || undefined,
      studentName,
      shiftId,
      operatingDays,
    },
    shifts,
  );
  const route = data.routes.find(item => item.id === routeId);
  const selectedFare = journeyFare(route, stopId, dropoffStopId);
  const availableDestinations = journeyDestinations(route, stopId);
  return (
    <Card>
      <Text style={styles.heading}>{t('Request a transport service')}</Text>
      {profiles.length ? (
        <Select
          label={t('Student profile')}
          value={selectedStudentId}
          options={[
            { value: '', label: t('New student') },
            ...profiles.map(item => ({
              value: studentIdentity(item),
              label: item.studentName,
            })),
          ]}
          onChange={value => {
            setSelectedStudentId(value);
            setStudentName(
              profiles.find(item => item.studentId === value)?.studentName ||
                '',
            );
            action.clearFeedback();
          }}
        />
      ) : null}
      <TransportSchedule
        shiftId={shiftId}
        operatingDays={operatingDays}
        shifts={shifts}
        onShiftChange={value => {
          setShiftId(value);
          action.clearFieldError('shiftId');
        }}
        onDaysChange={value => {
          setOperatingDays(value);
          action.clearFieldError('operatingDays');
        }}
        errors={action.fieldErrors}
        overlap={conflicts.overlap}
      />
      <Field
        label={t('Student name')}
        editable={!selectedStudentId}
        value={studentName}
        error={action.fieldErrors.studentName}
        onChangeText={value => {
          action.clearFieldError('studentName');
          setStudentName(value);
        }}
        maxLength={100}
      />
      <Select
        label={t('Route / road')}
        value={routeId}
        error={action.fieldErrors.routeId}
        onChange={value => {
          action.clearFieldError('routeId');
          action.clearFieldError('stopId');
          action.clearFieldError('dropoffStopId');
          setRouteId(value);
          setStopId('');
          setDropoffStopId('');
        }}
        options={data.routes.map(item => ({
          value: item.id,
          label: item.fares?.length
            ? `${item.name} · ${t('Fare by destination')}`
            : t('{{route}} · {{amount}}/month', {
                route: item.name,
                amount: money(item.monthlyAmount),
              }),
        }))}
      />
      <Select
        label={t('Pickup stop')}
        value={stopId}
        error={action.fieldErrors.stopId}
        onChange={value => {
          action.clearFieldError('stopId');
          action.clearFieldError('dropoffStopId');
          setStopId(value);
          setDropoffStopId('');
        }}
        options={(route?.stops || []).map(item => ({
          value: item.id,
          label: item.name,
        }))}
      />
      {route?.fares?.length ? (
        <>
          <Select
            label={t('Destination stop *')}
            value={dropoffStopId}
            error={action.fieldErrors.dropoffStopId}
            onChange={value => {
              action.clearFieldError('dropoffStopId');
              setDropoffStopId(value);
            }}
            options={availableDestinations.map(item => ({
              value: item.id,
              label: item.name,
            }))}
          />
          {stopId && !availableDestinations.length ? (
            <Text style={styles.muted}>
              {t(
                'No fares are configured from this boarding stop. Choose another stop or contact the admin.',
              )}
            </Text>
          ) : null}
        </>
      ) : null}
      {route ? (
        <Text style={styles.muted}>
          {t(
            'Vehicle: {{name}} · Full monthly fee {{amount}}. The admin will confirm your service.',
            {
              name: route.vehicleName,
              amount:
                route.fares?.length && !dropoffStopId
                  ? '—'
                  : selectedFare === undefined
                  ? '—'
                  : money(selectedFare),
            },
          )}
        </Text>
      ) : null}
      {!data.routes.length ? (
        <Text style={styles.muted}>
          {t('The admin has not added routes yet. Please check back soon.')}
        </Text>
      ) : null}
      <Button
        title={t('Send service request')}
        busy={action.busy}
        disabled={!data.routes.length}
        onPress={() => {
          action.run(async () => {
            if (studentName.trim().length < 2 || !routeId || !stopId)
              throw new ValidationError({
                ...(studentName.trim().length < 2
                  ? {
                      studentName:
                        'Enter at least 2 characters for the student name.',
                    }
                  : {}),
                ...(!routeId ? { routeId: 'Select a route.' } : {}),
                ...(!stopId ? { stopId: 'Select a pickup stop.' } : {}),
              });
            if (
              route?.fares?.length &&
              (!dropoffStopId || selectedFare === undefined)
            )
              throw new ValidationError({
                dropoffStopId: 'Select a destination with a configured fare.',
              });
            const scheduleErrors = scheduleValidation(
              shiftId,
              operatingDays,
              shifts,
              conflicts.duplicate,
            );
            if (Object.keys(scheduleErrors).length)
              throw new ValidationError(scheduleErrors);
            await mutate('/requests/guardian/new', {
              studentId: selectedStudentId || undefined,
              shiftId,
              operatingDays,
              studentName: studentName.trim(),
              routeId,
              stopId,
              ...(dropoffStopId ? { dropoffStopId } : {}),
            });
            setSelectedStudentId('');
            setStudentName('');
            setRouteId('');
            setStopId('');
            setDropoffStopId('');
          }, 'Request sent. You’ll receive an update after admin review.');
        }}
      />
    </Card>
  );
}
