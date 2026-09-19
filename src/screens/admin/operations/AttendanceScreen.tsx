import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Attendance, AttendanceInput } from '../../../api/management';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { numberLabel } from '../../../utils/format';
import { ValidationError, isValidDate } from '../../../utils/validation';
import {
  isServiceScheduled,
  serviceShift,
  transportShifts,
} from '../../../utils/transport';
import {
  AdminPage,
  Avatar,
  Box,
  C,
  Choice,
  EmptyState,
  ErrorText,
  Heading,
  Input,
  SmallButton,
  Tabs,
  labelStatus,
  s,
  today,
  useAction,
} from '../AdminUi';

export function AttendanceScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useCoreData();
  const action = useAction();
  const [tab, setTab] = useState('STUDENT');
  const [date, setDate] = useState(today);
  const [vehicleId, setVehicleId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const shifts = transportShifts(data?.settings);
  const [draft, setDraft] = useState<Record<string, Attendance['status']>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft({});
    setSaved(false);
    action.clearFeedback();
  }, [tab, date, vehicleId, shiftId]); // eslint-disable-line react-hooks/exhaustive-deps
  const people =
    tab === 'STUDENT'
      ? (data?.students || [])
          .filter(
            item =>
              item.status === 'ACTIVE' &&
              isServiceScheduled(item, date, data?.settings.operatingDays) &&
              (!shiftId || serviceShift(item) === shiftId) &&
              (!vehicleId || item.vehicleId === vehicleId),
          )
          .map(item => ({
            id: item.id,
            name: item.studentName,
            vehicle: `${item.vehicleName} · ${t(
              shifts.find(shift => shift.id === serviceShift(item))?.name ||
                serviceShift(item),
            )}`,
          }))
      : (data?.drivers || [])
          .filter(
            item =>
              item.status !== 'INACTIVE' &&
              (!vehicleId || item.vehicleId === vehicleId),
          )
          .map(item => ({
            id: item.id,
            name: item.name,
            vehicle: item.vehicleName || '',
          }));
  const statusFor = (id: string) =>
    draft[id] ||
    data?.attendance.find(
      item =>
        item.date === date &&
        (tab === 'STUDENT' ? item.studentId : item.driverId) === id,
    )?.status;
  const count = (status: Attendance['status']) =>
    people.filter(item => statusFor(item.id) === status).length;
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'STUDENT', label: t('Student') },
          { value: 'DRIVER', label: t('Driver') },
        ]}
      />
      <View style={s.row}>
        <View style={s.flex}>
          <Input
            label={t('Date (YYYY-MM-DD)')}
            value={date}
            error={action.fieldErrors.date}
            onChangeText={value => {
              action.clearFieldError('date');
              setDate(value);
            }}
            maxLength={10}
          />
        </View>
        <View style={s.flex}>
          <Choice
            label={t('Vehicle')}
            value={vehicleId}
            onChange={setVehicleId}
            options={transport.vehicles.map(item => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </View>
      </View>
      {tab === 'STUDENT' ? (
        <Choice
          label={t('Transport shift')}
          value={shiftId}
          onChange={setShiftId}
          options={shifts.map(shift => ({
            value: shift.id,
            label: t(shift.name),
          }))}
        />
      ) : null}
      <Box>
        <View style={s.row}>
          {[
            { label: 'Present', count: count('PRESENT'), color: C.green },
            { label: 'Absent', count: count('ABSENT'), color: C.red },
            { label: 'Leave', count: count('LEAVE'), color: C.amber },
          ].map(item => (
            <View key={item.label} style={s.summary}>
              <Text style={s.muted}>{t(item.label)}</Text>
              <Text style={[s.summaryValue, { color: item.color }]}>
                {numberLabel(item.count)}
              </Text>
            </View>
          ))}
        </View>
        <Heading
          title={t('Total people: {{number}}', {
            number: numberLabel(people.length),
          })}
          action={t('Mark all present')}
          onAction={() => {
            setDraft(
              Object.fromEntries(people.map(item => [item.id, 'PRESENT'])),
            );
            setSaved(false);
          }}
        />
        <Text style={s.muted}>{t('Select attendance beside each name.')}</Text>
        {people.map(person => (
          <View key={person.id} style={[s.tableRow, s.wrap]}>
            <Avatar name={person.name} driver={tab === 'DRIVER'} />
            <View style={s.flex}>
              <Text style={s.body}>{person.name}</Text>
              <Text style={s.muted}>{person.vehicle}</Text>
            </View>
            <View style={s.row}>
              {(['PRESENT', 'ABSENT', 'LEAVE'] as const).map(status => (
                <Pressable
                  key={status}
                  accessibilityRole="radio"
                  accessibilityLabel={`${person.name}: ${labelStatus(status)}`}
                  accessibilityState={{
                    checked: statusFor(person.id) === status,
                  }}
                  onPress={() => {
                    setDraft(current => ({ ...current, [person.id]: status }));
                    setSaved(false);
                  }}
                  style={[
                    s.attendanceChoice,
                    {
                      borderColor:
                        statusFor(person.id) === status
                          ? status === 'ABSENT'
                            ? C.red
                            : C.green
                          : C.line,
                      backgroundColor:
                        statusFor(person.id) === status
                          ? status === 'ABSENT'
                            ? '#FFE6EB'
                            : C.mint
                          : C.white,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.bold,
                      {
                        color:
                          status === 'ABSENT'
                            ? C.red
                            : status === 'LEAVE'
                            ? C.amber
                            : C.green,
                      },
                    ]}
                  >
                    {status === 'PRESENT'
                      ? '✓'
                      : status === 'ABSENT'
                      ? '×'
                      : t('L')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {!people.length ? (
          <EmptyState
            text={t(
              tab === 'STUDENT'
                ? 'No students scheduled for this date and shift.'
                : 'No records for this vehicle',
            )}
          />
        ) : null}
        <Text style={s.muted}>
          {t('Not selected: {{number}}', {
            number: numberLabel(
              people.filter(item => !statusFor(item.id)).length,
            ),
          })}
        </Text>
        <ErrorText message={action.error} />
        {saved ? <Text style={s.note}>{t('Attendance saved.')}</Text> : null}
        <SmallButton
          title={t('Save')}
          busy={action.busy}
          disabled={!Object.keys(draft).length}
          onPress={() =>
            action.run(async () => {
              if (!isValidDate(date))
                throw new ValidationError({
                  date: 'Enter the date in YYYY-MM-DD format.',
                });
              const entries: AttendanceInput[] = people
                .filter(item => draft[item.id])
                .map(item => ({
                  ...(tab === 'STUDENT'
                    ? { studentId: item.id }
                    : { driverId: item.id }),
                  date,
                  status: draft[item.id],
                }));
              if (!entries.length) throw new Error('Select attendance first.');
              await mutate('/admin/attendance', { entries }, 'PUT');
              setDraft({});
              setSaved(true);
            })
          }
        />
      </Box>
    </AdminPage>
  );
}
