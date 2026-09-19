import { TransportScheduleSummary } from '../../components/TransportSchedule';
import {
  serviceShift,
  studentIdentity,
  transportShifts,
  uniqueStudents,
} from '../../utils/transport';
import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { NoorBadge, NoorCard, NoorIcon, NoorRow } from '../../components/Noor';
import { Button, Empty, Notice, Page, Select } from '../../components/ui';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { styles } from '../../theme';
import { money, readable } from '../../utils/format';
import { contactUrl } from './parentUtils';
import { InfoRow, parent, StudentAvatar } from './ParentUI';
import { Props } from './types';

export function ParentStudentScreen({
  navigation,
  route,
}: Props<'ParentProfile'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState(route.params?.id || '');
  const students = data?.students || [];
  const profiles = uniqueStudents(students);
  const student =
    students.find(item => item.id === selectedId) ||
    (!selectedId ? students[0] : undefined);
  const services = student
    ? students.filter(
        item => studentIdentity(item) === studentIdentity(student),
      )
    : [];
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      {profiles.length > 1 ? (
        <Select
          label={t('My child')}
          value={student ? studentIdentity(student) : ''}
          onChange={value =>
            setSelectedId(
              students.find(item => studentIdentity(item) === value)?.id || '',
            )
          }
          options={profiles.map(item => ({
            value: studentIdentity(item),
            label: item.studentName,
          }))}
        />
      ) : null}
      {!student ? (
        <>
          <Empty
            title={t('Student information not found')}
            detail={t(
              'The student profile will appear here after admission is approved.',
            )}
          />
          <Button
            title={t('Apply for admission')}
            onPress={() => navigation.navigate('Admission')}
          />
        </>
      ) : (
        <>
          <NoorCard>
            <Text style={styles.heading}>{t('Transport services')}</Text>
            {services.length > 1 ? (
              <Select
                label={t('Transport service')}
                value={student.id}
                onChange={setSelectedId}
                options={services.map(item => ({
                  value: item.id,
                  label: `${t(
                    transportShifts(data?.settings).find(
                      shift => shift.id === serviceShift(item),
                    )?.name || serviceShift(item),
                  )} · ${item.routeName} · ${readable(item.status)}`,
                }))}
              />
            ) : null}
            <TransportScheduleSummary
              service={student}
              shifts={transportShifts(data?.settings)}
            />
            {student.studentId ? (
              <Button
                secondary
                title={t('Add service in another shift')}
                onPress={() =>
                  navigation.navigate('Admission', {
                    studentId: student.studentId,
                  })
                }
              />
            ) : null}
          </NoorCard>
          <NoorCard>
            <View style={parent.identity}>
              <StudentAvatar
                name={student.studentName}
                photoUrl={student.photoUrl}
                size={65}
              />
              <View style={parent.grow}>
                <Text style={styles.heading}>{student.studentName}</Text>
                <Text style={styles.muted}>
                  {student.className || t('Class not provided')}
                  {student.roll
                    ? ` · ${t('Roll: {{roll}}', { roll: student.roll })}`
                    : ''}
                </Text>
                {student.studentCode ? (
                  <Text style={styles.muted}>{student.studentCode}</Text>
                ) : null}
              </View>
              <NoorBadge
                label={readable(student.status)}
                tone={student.status === 'ACTIVE' ? 'green' : 'gray'}
              />
            </View>
            <View style={parent.divider} />
            <InfoRow
              icon="vehicle"
              label={t('Vehicle')}
              value={student.vehicleName}
            />
            <InfoRow
              icon="user"
              label={t('Driver')}
              value={student.driverName}
            />
            <InfoRow
              icon="route"
              label={t('Route')}
              value={student.routeName}
            />
            <InfoRow
              icon="pin"
              label={t('Boarding stop')}
              value={student.stopName}
            />
            {student.dropoffStopName ? (
              <InfoRow
                icon="pin"
                label={t('Destination stop')}
                value={student.dropoffStopName}
              />
            ) : null}
            <InfoRow
              icon="money"
              label={t('Monthly fare')}
              value={money(student.monthlyAmount)}
            />
            <View style={parent.divider} />
            <Text style={styles.heading}>{t('Guardian information')}</Text>
            <InfoRow
              icon="user"
              label={t('Name')}
              value={student.guardianName}
            />
            <InfoRow
              icon="phone"
              label={t('Mobile')}
              value={student.guardianPhone}
            />
            <InfoRow
              icon="pin"
              label={t('Pickup')}
              value={student.pickupAddress || student.stopName}
            />
            <InfoRow
              icon="pin"
              label={t('Drop-off')}
              value={[student.dropoffStopName, student.dropAddress]
                .filter(Boolean)
                .join(' · ')}
            />
            <View style={parent.divider} />
            <Text style={styles.heading}>{t('Contact the driver')}</Text>
            <View style={parent.compactActions}>
              {(['call', 'whatsapp', 'sms'] as const).map(kind => (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  accessibilityLabel={t('{{method}} - {{name}}', {
                    method:
                      kind === 'call'
                        ? t('Call')
                        : kind === 'whatsapp'
                        ? t('WhatsApp')
                        : t('SMS'),
                    name: student.driverName || t('Driver'),
                  })}
                  accessibilityState={{
                    disabled: !student.driverPhone || action.busy,
                  }}
                  disabled={!student.driverPhone || action.busy}
                  onPress={() =>
                    action.run(
                      () =>
                        Linking.openURL(contactUrl(student.driverPhone!, kind)),
                      '',
                    )
                  }
                  style={[
                    parent.compactAction,
                    (!student.driverPhone || action.busy) && parent.disabled,
                  ]}
                >
                  <NoorIcon
                    name={kind === 'call' ? 'phone' : kind}
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={parent.compactActionText}>
                    {kind === 'call'
                      ? t('Call')
                      : kind === 'whatsapp'
                      ? t('WhatsApp')
                      : t('SMS')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </NoorCard>
          <NoorCard>
            <NoorRow
              icon="calendar"
              title={t("Today's journey and attendance")}
              onPress={() => navigation.navigate('TodayJourney')}
            />
            <NoorRow
              icon="receipt"
              title={t('Payment history')}
              onPress={() => navigation.navigate('Bills')}
            />
            <NoorRow
              icon="bell"
              title={t('Notices')}
              onPress={() => navigation.navigate('Inbox')}
            />
          </NoorCard>
        </>
      )}
    </Page>
  );
}
