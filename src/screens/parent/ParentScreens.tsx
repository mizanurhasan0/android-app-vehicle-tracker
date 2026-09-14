import React, { useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RouteSchedule } from '../../api/management';
import { ServiceRequest } from '../../api/types';
import { FleetMap } from '../../components/FleetMap';
import { VehicleCard } from '../../components/VehicleCard';
import { NoorBadge, NoorCard, NoorIcon, NoorRow } from '../../components/Noor';
import {
  Button,
  Empty,
  Field,
  Notice,
  Page,
  Select,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation, translateMessage } from '../../i18n';
import { HomeStackParams } from '../../navigation/types';
import { colors, styles } from '../../theme';
import { dateLabel, money, numberLabel, readable } from '../../utils/format';
import { pickStudentPhoto } from '../../utils/photo';
import {
  contactUrl,
  dhakaDate,
  parentDateLabel,
  scheduleTimeLabel,
  studentSchedule,
} from './parentUtils';
import {
  InfoRow,
  parent,
  Segment,
  StudentAvatar,
  TimelineItem,
} from './ParentUI';

type Props<N extends keyof HomeStackParams> = NativeStackScreenProps<
  HomeStackParams,
  N
>;
const admissionSteps = [
  'Student information',
  'Guardian and address',
  'Route and fare',
  'Submit',
];

export function AdmissionScreen({ navigation }: Props<'Admission'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
  const management = useManagement();
  const action = useAction();
  const [step, setStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [roll, setRoll] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [validation, setValidation] = useState('');
  const route = data.routes.find(item => item.id === routeId);
  const stop = route?.stops.find(item => item.id === stopId);
  const routes = data.routes.filter(item =>
    `${item.name} ${item.vehicleName}`
      .toLocaleLowerCase()
      .includes(routeSearch.trim().toLocaleLowerCase()),
  );

  const validate = (page: number) => {
    if (page === 0 && (studentName.trim().length < 2 || !className.trim()))
      return 'Enter the student name and class.';
    if (page === 1 && !pickupAddress.trim()) return 'Enter the pickup address.';
    if (
      page === 1 &&
      emergencyContact.trim() &&
      !/^(?:\+?88)?01[3-9]\d{8}$/.test(emergencyContact.trim())
    )
      return 'Enter a valid emergency contact number.';
    if (page === 2 && (!route || !stop))
      return 'Select a route and pickup stop.';
    return '';
  };
  const next = () => {
    Keyboard.dismiss();
    const problem = validate(step);
    setValidation(problem);
    if (!problem) setStep(value => Math.min(3, value + 1));
  };
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <View style={local.stepper}>
        {admissionSteps.map((label, index) => (
          <View key={label} style={local.step}>
            <View style={local.stepTop}>
              {
                <View
                  style={[
                    local.connector,
                    index <= step && local.connectorDone,
                    index === 0 && local.connectorEdge,
                  ]}
                />
              }
              <View
                style={[
                  local.stepCircle,
                  index <= step && local.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    local.stepNumber,
                    index <= step && local.stepNumberActive,
                  ]}
                >
                  {index < step ? '✓' : numberLabel(index + 1)}
                </Text>
              </View>
              {
                <View
                  style={[
                    local.connector,
                    index < step && local.connectorDone,
                    index === 3 && local.connectorEdge,
                  ]}
                />
              }
            </View>
            <Text
              style={[local.stepLabel, index === step && local.stepLabelActive]}
            >
              {t(label)}
            </Text>
          </View>
        ))}
      </View>
      <Notice
        text={translateMessage(validation || action.error)}
        kind="error"
      />
      {step === 0 ? (
        <NoorCard>
          <Text style={styles.heading}>{t('Student information')}</Text>
          <Field
            label={t('Student name *')}
            value={studentName}
            onChangeText={setStudentName}
            maxLength={100}
            placeholder={t('Student full name')}
          />
          <Field
            label={t('Class *')}
            value={className}
            onChangeText={setClassName}
            maxLength={40}
            placeholder={t('e.g. Class 6')}
          />
          <Field
            label={t('Roll number')}
            value={roll}
            onChangeText={setRoll}
            maxLength={20}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>{t('Upload photo')}</Text>
          <View style={local.photoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Select a student photo')}
              accessibilityState={{ busy: action.busy, disabled: action.busy }}
              disabled={action.busy}
              onPress={() =>
                action.run(async () => {
                  const photo = await pickStudentPhoto();
                  if (photo) setPhotoUrl(photo);
                }, '')
              }
              style={local.photoPicker}
            >
              <NoorIcon name="plus" size={24} color="#2185DA" />
              <Text style={styles.muted}>{t('Choose photo')}</Text>
            </Pressable>
            <StudentAvatar
              name={studentName || t('Student')}
              photoUrl={photoUrl}
              size={84}
            />
          </View>
          {photoUrl ? (
            <Button
              secondary
              title={t('Remove photo')}
              onPress={() => setPhotoUrl('')}
              disabled={action.busy}
            />
          ) : null}
        </NoorCard>
      ) : step === 1 ? (
        <NoorCard>
          <Text style={styles.heading}>{t('Guardian information')}</Text>
          <InfoRow
            icon="user"
            label={t('Guardian')}
            value={session?.user.name}
          />
          <InfoRow
            icon="phone"
            label={t('Mobile')}
            value={session?.user.phone}
          />
          <View style={parent.divider} />
          <Field
            label={t('Emergency contact number')}
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
            maxLength={14}
            placeholder="01XXXXXXXXX"
          />
          <Field
            label={t('Pickup address *')}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            maxLength={500}
            multiline
            placeholder={t('House, road and area')}
          />
          <Field
            label={t('Drop-off address')}
            value={dropAddress}
            onChangeText={setDropAddress}
            maxLength={500}
            placeholder={t('School name and address')}
          />
        </NoorCard>
      ) : step === 2 ? (
        <>
          <NoorCard>
            <Field
              label={t('Select a route in your area')}
              placeholder={t('Search area or vehicle name')}
              value={routeSearch}
              onChangeText={setRouteSearch}
              maxLength={100}
            />
          </NoorCard>
          <Text style={styles.heading}>{t('Available routes')}</Text>
          {!routes.length ? (
            <Empty
              title={t('No routes found')}
              detail={
                data.routes.length
                  ? t('Try another name.')
                  : t('Routes will appear here when the admin adds them.')
              }
            />
          ) : (
            routes.map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: routeId === item.id }}
                onPress={() => {
                  setRouteId(item.id);
                  setStopId('');
                }}
                style={[
                  local.routeCard,
                  item.id === routeId && local.routeSelected,
                ]}
              >
                <View
                  style={[
                    local.radio,
                    item.id === routeId && local.radioSelected,
                  ]}
                >
                  {item.id === routeId ? <View style={local.radioDot} /> : null}
                </View>
                <View style={parent.grow}>
                  <Text style={styles.heading}>{item.name}</Text>
                  <Text style={styles.muted}>{item.vehicleName}</Text>
                </View>
                <Text style={local.routeFare}>{money(item.monthlyAmount)}</Text>
              </Pressable>
            ))
          )}
          {route ? (
            <NoorCard>
              <Select
                label={t('Pickup stop *')}
                value={stopId}
                onChange={setStopId}
                options={route.stops.map(item => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
              <Text style={styles.muted}>
                {t(
                  'Monthly fare {{amount}}. Service starts after admin approval.',
                  {
                    amount: money(route.monthlyAmount),
                  },
                )}
              </Text>
            </NoorCard>
          ) : null}
        </>
      ) : (
        <>
          <NoorCard>
            <Text style={styles.heading}>{t('Review application')}</Text>
            <View style={parent.identity}>
              <StudentAvatar name={studentName} photoUrl={photoUrl} />
              <View style={parent.grow}>
                <Text style={styles.heading}>{studentName.trim()}</Text>
                <Text style={styles.muted}>
                  {className}
                  {roll ? ` · ${t('Roll {{roll}}', { roll })}` : ''}
                </Text>
              </View>
            </View>
            <InfoRow
              icon="user"
              label={t('Guardian')}
              value={session?.user.name}
            />
            <InfoRow
              icon="phone"
              label={t('Mobile')}
              value={session?.user.phone}
            />
          </NoorCard>
          <NoorCard>
            <InfoRow
              icon="route"
              label={t('Route and fare')}
              value={`${route?.name || '—'} · ${
                route ? money(route.monthlyAmount) : '—'
              }`}
            />
            <InfoRow
              icon="vehicle"
              label={t('Vehicle')}
              value={route?.vehicleName}
            />
            <InfoRow
              icon="pin"
              label={t('Pickup')}
              value={`${stop?.name || ''}${
                pickupAddress ? ` · ${pickupAddress}` : ''
              }`}
            />
            <InfoRow icon="pin" label={t('Drop-off')} value={dropAddress} />
            {emergencyContact ? (
              <InfoRow
                icon="phone"
                label={t('Emergency number')}
                value={emergencyContact}
              />
            ) : null}
          </NoorCard>
        </>
      )}
      {step < 3 ? (
        <Button title={t('Next')} onPress={next} disabled={action.busy} />
      ) : (
        <Button
          title={t('Submit application')}
          busy={action.busy}
          onPress={() =>
            action.run(async () => {
              const problem = [0, 1, 2].map(validate).find(Boolean);
              if (problem) throw new Error(problem);
              const result = await mutate<{ id: string }>(
                '/requests/guardian/new',
                {
                  studentName: studentName.trim(),
                  routeId,
                  stopId,
                  className: className.trim(),
                  roll: roll.trim(),
                  photoUrl,
                  emergencyContact: emergencyContact.trim(),
                  pickupAddress: pickupAddress.trim(),
                  dropAddress: dropAddress.trim(),
                },
              );
              await management.refresh();
              navigation.replace('ApplicationStatus', { id: result.id });
            }, '')
          }
        />
      )}
      {step > 0 ? (
        <Button
          secondary
          title={t('Previous step')}
          disabled={action.busy}
          onPress={() => {
            Keyboard.dismiss();
            setValidation('');
            setStep(value => value - 1);
          }}
        />
      ) : null}
    </Page>
  );
}

type Application = ServiceRequest & {
  createdAt?: string;
  reviewedAt?: string | null;
  className?: string;
  roll?: string;
  photoUrl?: string;
};
export function ApplicationStatusScreen({
  navigation,
  route,
}: Props<'ApplicationStatus'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [selectedId, setSelectedId] = useState(route.params?.id || '');
  const requests: Application[] = data.requests;
  const request =
    requests.find(item => item.id === selectedId) ||
    (!selectedId ? requests[0] : undefined);
  const approved = request?.status === 'APPROVED';
  const rejected = request?.status === 'REJECTED';
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {requests.length > 1 ? (
        <Select
          label={t('Select application')}
          value={request?.id || ''}
          onChange={setSelectedId}
          options={requests.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      {!request ? (
        <>
          <Empty
            title={t('Application not found')}
            detail={t('Apply for transport service or refresh the list.')}
          />
          <Button
            title={t('New admission application')}
            onPress={() => navigation.navigate('Admission')}
          />
        </>
      ) : (
        <>
          <View style={parent.successPanel}>
            <View style={[parent.successIcon, rejected && local.rejected]}>
              <NoorIcon
                name={rejected ? 'close' : approved ? 'check' : 'document'}
                size={33}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.heading, parent.center]}>
              {approved
                ? t('Application approved')
                : rejected
                ? t('Application not approved')
                : t('Application submitted')}
            </Text>
            <Text style={[styles.muted, parent.center]}>
              {approved
                ? t("Your child's transport service has been approved.")
                : rejected
                ? t('See the admin decision and reason below.')
                : t(
                    'The admin will review your application. You will be notified of the decision.',
                  )}
            </Text>
          </View>
          <NoorCard>
            <View style={parent.identity}>
              <StudentAvatar
                name={request.studentName}
                photoUrl={request.photoUrl}
              />
              <View style={parent.grow}>
                <Text style={styles.heading}>{request.studentName}</Text>
                <Text style={styles.muted}>
                  {request.routeName} · {request.vehicleName}
                </Text>
              </View>
            </View>
            <View style={parent.divider} />
            <TimelineItem
              icon="check"
              title={t('Application submission')}
              active
              detail={
                request.createdAt ? dateLabel(request.createdAt) : undefined
              }
            />
            <TimelineItem
              icon="document"
              title={
                approved || rejected
                  ? t('Review completed')
                  : t('Awaiting review')
              }
              active={approved || rejected}
              detail={
                request.reviewedAt ? dateLabel(request.reviewedAt) : undefined
              }
            />
            <TimelineItem
              icon={rejected ? 'close' : 'check'}
              title={
                approved
                  ? t('Approved')
                  : rejected
                  ? t('Rejected')
                  : t('Awaiting decision')
              }
              active={approved}
              last
            >
              {request.note ? (
                <View
                  style={[local.reviewNote, rejected && local.reviewNoteError]}
                >
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.body, rejected && local.reviewNoteErrorText]}
                  >
                    {request.note}
                  </Text>
                </View>
              ) : null}
            </TimelineItem>
          </NoorCard>
          {approved ? (
            <Button
              title={t('Student profile')}
              onPress={() => navigation.navigate('ParentProfile')}
            />
          ) : null}
          <Button
            secondary
            title={t('Go back')}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Fleet')
            }
          />
        </>
      )}
    </Page>
  );
}

export function ParentStudentScreen({
  navigation,
  route,
}: Props<'ParentProfile'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState(route.params?.id || '');
  const students = data?.students || [];
  const student =
    students.find(item => item.id === selectedId) ||
    (!selectedId ? students[0] : undefined);
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      {students.length > 1 ? (
        <Select
          label={t('My child')}
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
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
              value={student.dropAddress}
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

export function ParentJourneyScreen({ navigation }: Props<'TodayJourney'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const [selectedId, setSelectedId] = useState('');
  const [period, setPeriod] = useState<RouteSchedule['period']>('MORNING');
  const students = data?.students || [];
  const student = students.find(item => item.id === selectedId) || students[0];
  const entries = student
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
          label={t('Student')}
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      <Segment<RouteSchedule['period']>
        options={[
          { value: 'MORNING', label: t('Morning') },
          { value: 'AFTERNOON', label: t('Afternoon') },
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
            <View style={parent.divider} />
            <View style={styles.between}>
              <Text style={styles.body}>{t("Today's attendance")}</Text>
              <NoorBadge
                label={
                  attendance
                    ? {
                        PRESENT: t('Present'),
                        ABSENT: t('Absent'),
                        LEAVE: t('Leave'),
                      }[attendance.status]
                    : t('Not recorded yet')
                }
                tone={
                  !attendance
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
          <NoorCard>
            <Text style={styles.heading}>{t('Scheduled journey')}</Text>
            {entries.length ? (
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
          <Button
            title={t('View live location')}
            onPress={() =>
              navigation.navigate('LiveTracking', {
                vehicleId: student.vehicleId,
              })
            }
          />
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

export function ParentContactScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState('');
  const students = data?.students || [];
  const student = students.find(item => item.id === selectedId) || students[0];
  const office = data?.settings.phone || '';
  const whatsapp = data?.settings.whatsappNumber || office;
  const open = (phone: string, kind: 'call' | 'sms' | 'whatsapp') =>
    action.run(() => Linking.openURL(contactUrl(phone, kind)), '');
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {students.length > 1 ? (
        <Select
          label={t("Student's driver")}
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      <Notice text={action.error} kind="error" />
      <NoorCard>
        <NoorRow
          icon="phone"
          title={t('Call the driver')}
          subtitle={
            student?.driverPhone
              ? `${student.driverName || t('Driver')} · ${student.driverPhone}`
              : t('Driver phone number not added')
          }
          onPress={
            student?.driverPhone && !action.busy
              ? () => open(student.driverPhone!, 'call')
              : undefined
          }
        />
        <NoorRow
          icon="whatsapp"
          title={t('WhatsApp the driver')}
          subtitle={
            student?.driverPhone
              ? t('Write a message on WhatsApp')
              : t('Driver phone number not added')
          }
          onPress={
            student?.driverPhone && !action.busy
              ? () => open(student.driverPhone!, 'whatsapp')
              : undefined
          }
        />
        <NoorRow
          icon="phone"
          title={t('Contact the office')}
          subtitle={office || t('Office phone number not added')}
          onPress={
            office && !action.busy ? () => open(office, 'call') : undefined
          }
        />
        <NoorRow
          icon="sms"
          title={t('Send SMS')}
          subtitle={
            office
              ? t('Message the office')
              : t('Office phone number not added')
          }
          onPress={
            office && !action.busy ? () => open(office, 'sms') : undefined
          }
        />
        <NoorRow
          icon="whatsapp"
          title={t('WhatsApp contact')}
          subtitle={whatsapp || t('WhatsApp number not added')}
          onPress={
            whatsapp && !action.busy
              ? () => open(whatsapp, 'whatsapp')
              : undefined
          }
        />
      </NoorCard>
      {data?.settings.emergencyPhone ? (
        <NoorCard>
          <NoorRow
            icon="bell"
            title={t('Emergency contact')}
            subtitle={data.settings.emergencyPhone}
            color={colors.danger}
            onPress={
              !action.busy
                ? () => open(data.settings.emergencyPhone, 'call')
                : undefined
            }
          />
        </NoorCard>
      ) : null}
      {data?.settings.address ? (
        <NoorCard>
          <InfoRow
            icon="pin"
            label={t('Office')}
            value={data.settings.address}
          />
        </NoorCard>
      ) : null}
    </Page>
  );
}

export function ParentTrackingScreen({ route }: Props<'LiveTracking'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const [selectedId, setSelectedId] = useState(route.params?.vehicleId || '');
  const vehicle =
    data.vehicles.find(item => item.id === selectedId) ||
    (!selectedId ? data.vehicles[0] : undefined);
  const location = data.locations.find(item => item.imei === vehicle?.imei);
  const service = data.subscriptions.find(
    item => item.vehicleId === vehicle?.id && item.status === 'ACTIVE',
  );
  const fresh =
    location?.status === 'live' &&
    Date.now() - Date.parse(location.lastSeen) < 180_000;
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      {data.vehicles.length > 1 ? (
        <Select
          label={t('Select vehicle')}
          value={vehicle?.id || ''}
          onChange={setSelectedId}
          options={data.vehicles.map(item => ({
            value: item.id,
            label: item.name,
          }))}
        />
      ) : null}
      {!vehicle ? (
        <Empty
          title={t('No vehicle to track')}
          detail={t(
            "The assigned vehicle's location will appear after transport service is approved.",
          )}
        />
      ) : (
        <>
          <NoorCard>
            <View style={parent.identity}>
              <View style={local.vehicleIcon}>
                <NoorIcon name="vehicle" size={28} color="#FFFFFF" />
              </View>
              <View style={parent.grow}>
                <Text style={styles.heading}>{vehicle.name}</Text>
                <Text style={styles.muted}>
                  {t('Driver: {{name}}', { name: vehicle.driverName || '—' })}
                </Text>
                <Text style={styles.muted}>
                  {t('Route: {{name}}', { name: service?.routeName || '—' })}
                </Text>
              </View>
              <NoorBadge
                label={readable(fresh ? 'live' : 'lastKnown')}
                tone={fresh ? 'green' : 'gray'}
              />
            </View>
          </NoorCard>
          <FleetMap
            vehicles={[vehicle]}
            locations={location ? [location] : []}
            selectedId={vehicle.id}
            onSelect={setSelectedId}
            style={parent.map}
          />
          <NoorCard>
            <Text style={styles.heading}>{t('Current location')}</Text>
            <Text style={styles.body}>
              {location?.latitude != null && location.longitude != null
                ? `${location.latitude.toFixed(
                    5,
                  )}, ${location.longitude.toFixed(5)}`
                : t('No location received from the tracker.')}
            </Text>
            {location?.lastSeen ? (
              <Text style={styles.muted}>
                {t('Last updated: {{time}}', {
                  time: dateLabel(location.lastSeen),
                })}
              </Text>
            ) : null}
            {location && !fresh ? (
              <Text style={local.stale}>
                {t('Showing an older location. Waiting for a new GPS update.')}
              </Text>
            ) : null}
          </NoorCard>
          <VehicleCard
            vehicle={vehicle}
            location={location}
            busy={action.busy}
            onOpenURL={url => action.run(() => Linking.openURL(url), '')}
          />
        </>
      )}
    </Page>
  );
}

const local = StyleSheet.create({
  reviewNote: { padding: 10, borderRadius: 7, backgroundColor: colors.mint },
  reviewNoteError: { backgroundColor: '#FBEAEC' },
  reviewNoteErrorText: { color: colors.danger },
  stepper: { flexDirection: 'row', paddingVertical: 5 },
  step: { flex: 1, alignItems: 'center', gap: 7 },
  stepTop: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#EDF1EF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    maxWidth: 70,
  },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  connector: { height: 2, backgroundColor: '#DDE7E1', flex: 1 },
  connectorDone: { backgroundColor: colors.primary },
  connectorEdge: { opacity: 0 },
  photoRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoPicker: {
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: colors.line,
    flex: 1,
    minHeight: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    gap: 6,
  },
  routeCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 13,
    minHeight: 75,
  },
  routeSelected: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  routeFare: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ABBAB2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rejected: { backgroundColor: colors.danger },
  vehicleIcon: {
    backgroundColor: colors.primary,
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stale: { color: '#98701F', fontSize: 12, lineHeight: 19 },
});
