import {
  isServiceScheduled as journeyServiceScheduled,
  serviceShift as journeyServiceShift,
  transportShifts as journeyShifts,
} from '../../utils/transport';
import { TransportScheduleSummary as JourneyScheduleSummary } from '../../components/TransportSchedule';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { RouteSchedule } from '../../api/management';
import { NoorBadge, NoorCard } from '../../components/Noor';
import { Button, Empty, Page, Select } from '../../components/ui';
import { useManagement } from '../../context/ManagementContext';
import { useTranslation } from '../../i18n';
import { styles } from '../../theme';
import {
  dhakaDate,
  parentDateLabel,
  scheduleTimeLabel,
  studentSchedule,
} from './parentUtils';
import { parent, Segment, TimelineItem } from './ParentUI';
import { Props } from './types';

export function ParentJourneyScreen({ navigation }: Props<'TodayJourney'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const [selectedId, setSelectedId] = useState('');
  const [period, setPeriod] = useState<RouteSchedule['period']>('MORNING');
  const students = (data?.students || []).filter(
    item => item.status === 'ACTIVE',
  );
  const shifts = journeyShifts(data?.settings);
  const student =
    students.find(item => item.id === selectedId) ||
    students.find(item =>
      journeyServiceScheduled(item, dhakaDate(), data?.settings.operatingDays),
    ) ||
    students[0];
  const selectedShift = student
    ? shifts.find(shift => shift.id === journeyServiceShift(student))
    : undefined;
  const hasLegacyTimetable =
    !!student && journeyServiceShift(student) === 'MORNING';
  const scheduledToday =
    !!student &&
    journeyServiceScheduled(student, dhakaDate(), data?.settings.operatingDays);
  const entries =
    student && scheduledToday && hasLegacyTimetable
      ? studentSchedule(data?.schedules || [], student, period)
      : [];
  const attendance = student
    ? data?.attendance.find(
        item => item.studentId === student.id && item.date === dhakaDate(),
      )
    : undefined;
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {students.length > 1 ? (
        <Select
          label={t('Student and shift')}
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: `${item.studentName} · ${t(
              shifts.find(shift => shift.id === journeyServiceShift(item))
                ?.name || journeyServiceShift(item),
            )}`,
          }))}
        />
      ) : null}
      <Segment<RouteSchedule['period']>
        options={[
          { value: 'MORNING', label: t('Outbound') },
          { value: 'AFTERNOON', label: t('Return') },
        ]}
        value={period}
        onChange={setPeriod}
      />
      {!student ? (
        <Empty
          title={t('No transport service yet')}
          detail={t(
            'The assigned route schedule will appear here after admission is approved.',
          )}
        />
      ) : (
        <>
          <NoorCard>
            <View style={styles.between}>
              <Text style={styles.heading}>{student.studentName}</Text>
              <Text style={styles.muted}>{parentDateLabel(dhakaDate())}</Text>
            </View>
            <Text style={styles.muted}>
              {student.routeName} · {student.vehicleName}
            </Text>
            <JourneyScheduleSummary service={student} shifts={shifts} />
            <View style={parent.divider} />
            <View style={styles.between}>
              <Text style={styles.body}>{t("Today's attendance")}</Text>
              <NoorBadge
                label={
                  !scheduledToday
                    ? t('Not scheduled today')
                    : attendance
                    ? {
                        PRESENT: t('Present'),
                        ABSENT: t('Absent'),
                        LEAVE: t('Leave'),
                      }[attendance.status]
                    : t('Not recorded yet')
                }
                tone={
                  !scheduledToday || !attendance
                    ? 'gray'
                    : attendance.status === 'PRESENT'
                    ? 'green'
                    : attendance.status === 'ABSENT'
                    ? 'red'
                    : 'amber'
                }
              />
            </View>
            {attendance?.note ? (
              <Text style={styles.muted}>{attendance.note}</Text>
            ) : null}
          </NoorCard>
          {scheduledToday ? (
            <NoorCard>
              <Text style={styles.heading}>{t('Scheduled journey')}</Text>
              {!hasLegacyTimetable && selectedShift ? (
                <TimelineItem
                  icon="clock"
                  title={t(
                    period === 'MORNING' ? 'Shift departure' : 'Shift return',
                  )}
                  detail={scheduleTimeLabel(
                    period === 'MORNING'
                      ? selectedShift.startTime
                      : selectedShift.endTime,
                  )}
                  last
                >
                  <Text style={styles.muted}>
                    {t('Shift times are not individual stop arrival times.')}
                  </Text>
                </TimelineItem>
              ) : entries.length ? (
                entries.map((entry, index) => (
                  <TimelineItem
                    key={entry.id}
                    icon={
                      index === 0
                        ? 'pin'
                        : index === entries.length - 1
                        ? 'school'
                        : 'clock'
                    }
                    title={entry.label}
                    detail={scheduleTimeLabel(entry.time)}
                    last={index === entries.length - 1}
                  >
                    <NoorBadge label={t('Scheduled time')} tone="gray" />
                  </TimelineItem>
                ))
              ) : (
                <Text style={styles.muted}>
                  {period === 'MORNING'
                    ? t(
                        'The admin has not added a morning schedule for this route.',
                      )
                    : t(
                        'The admin has not added an afternoon schedule for this route.',
                      )}
                </Text>
              )}
              <Text style={styles.muted}>
                {t(
                  "These are scheduled times. View the vehicle's current position in live tracking.",
                )}
              </Text>
            </NoorCard>
          ) : (
            <NoorCard>
              <Text style={styles.body}>
                {t(
                  'No transport is scheduled for this service today. This is not an absence.',
                )}
              </Text>
            </NoorCard>
          )}
          {scheduledToday && student.vehicleId ? (
            <Button
              title={t('View live location')}
              onPress={() =>
                navigation.navigate('LiveTracking', {
                  vehicleId: student.vehicleId,
                })
              }
            />
          ) : null}
          <NoorCard>
            <Text style={styles.heading}>{t('Attendance history')}</Text>
            {(data?.attendance || [])
              .filter(item => item.studentId === student.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15)
              .map(item => (
                <View key={item.id} style={styles.between}>
                  <Text style={styles.body}>{parentDateLabel(item.date)}</Text>
                  <NoorBadge
                    label={
                      {
                        PRESENT: t('Present'),
                        ABSENT: t('Absent'),
                        LEAVE: t('Leave'),
                      }[item.status]
                    }
                    tone={
                      item.status === 'PRESENT'
                        ? 'green'
                        : item.status === 'ABSENT'
                        ? 'red'
                        : 'amber'
                    }
                  />
                </View>
              ))}
            {!data?.attendance.some(item => item.studentId === student.id) ? (
              <Text style={styles.muted}>
                {t('No attendance records yet.')}
              </Text>
            ) : null}
          </NoorCard>
        </>
      )}
    </Page>
  );
}
