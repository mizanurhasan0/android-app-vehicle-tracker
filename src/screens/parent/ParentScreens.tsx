import {
  isServiceScheduled as journeyServiceScheduled,
  serviceShift as journeyServiceShift,
  transportShifts as journeyShifts,
} from '../../utils/transport';
import { TransportScheduleSummary as JourneyScheduleSummary } from '../../components/TransportSchedule';

import {
  TransportSchedule,
  TransportScheduleSummary,
} from '../../components/TransportSchedule';
import {
  defaultOperatingDays,
  enrollmentConflicts,
  scheduleValidation,
  serviceShift,
  studentIdentity,
  transportShifts,
  uniqueStudents,
} from '../../utils/transport';
import { journeyFare, journeyDestinations } from '../../utils/routeFares';
import React, { useEffect, useRef, useState } from 'react';
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
import { ValidationError } from '../../utils/validation';
import { useTranslation } from '../../i18n';
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

export function AdmissionScreen({
  navigation,
  route: screenRoute,
}: Props<'Admission'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
  const management = useManagement();
  const action = useAction();
  const [step, setStep] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState(
    screenRoute.params?.studentId || '',
  );
  const [shiftId, setShiftId] = useState('');
  const [operatingDays, setOperatingDays] = useState<number[]>([]);
  const [scheduleInitialized, setScheduleInitialized] = useState(false);
  const shifts = transportShifts(management.data?.settings);
  const existingStudents = uniqueStudents(
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
  const [className, setClassName] = useState('');
  const [roll, setRoll] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const prefilledStudent = useRef('');
  useEffect(() => {
    if (!selectedStudentId) {
      prefilledStudent.current = '';
      return;
    }
    if (prefilledStudent.current === selectedStudentId) return;
    const selected =
      management.data?.students.find(
        item => item.studentId === selectedStudentId,
      ) || data.requests.find(item => item.studentId === selectedStudentId);
    if (!selected) return;
    prefilledStudent.current = selectedStudentId;
    setStudentName(selected.studentName);
    setClassName(selected.className || '');
    setRoll(selected.roll || '');
    setPhotoUrl(selected.photoUrl || '');
    setEmergencyContact(selected.emergencyContact || '');
    setPickupAddress(selected.pickupAddress || '');
    setDropAddress(selected.dropAddress || '');
  }, [selectedStudentId, management.data?.students, data.requests]);
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
  const stop = route?.stops.find(item => item.id === stopId);
  const destination = route?.stops.find(item => item.id === dropoffStopId);
  const monthlyFare = journeyFare(route, stopId, dropoffStopId);
  const hasJourneyFares = !!route?.fares?.length;
  const availableDestinations = journeyDestinations(route, stopId);
  const routes = data.routes.filter(item =>
    `${item.name} ${item.vehicleName}`
      .toLocaleLowerCase()
      .includes(routeSearch.trim().toLocaleLowerCase()),
  );

  const validate = (page: number) => {
    const fields: Record<string, string> = {};
    if (page === 0) {
      if (studentName.trim().length < 2)
        fields.studentName =
          'Enter at least 2 characters for the student name.';
      if (!selectedStudentId && !className.trim())
        fields.className = 'Enter the class.';
    }
    if (page === 1) {
      if (!pickupAddress.trim())
        fields.pickupAddress = 'Enter the pickup address.';
      if (
        emergencyContact.trim() &&
        !/^(?:\+?88)?01[3-9]\d{8}$/.test(emergencyContact.trim())
      )
        fields.emergencyContact = 'Enter a valid emergency contact number.';
    }
    if (page === 2) {
      Object.assign(
        fields,
        scheduleValidation(shiftId, operatingDays, shifts, conflicts.duplicate),
      );
      if (!route) fields.routeId = 'Select a route.';
      if (!stop) fields.stopId = 'Select a pickup stop.';
      if (hasJourneyFares && (!destination || monthlyFare === undefined))
        fields.dropoffStopId = 'Select a destination with a configured fare.';
    }
    return Object.keys(fields).length ? new ValidationError(fields) : undefined;
  };
  useEffect(() => {
    if (step !== 3) return;
    const groups = [
      ['studentName', 'className', 'roll', 'photoUrl'],
      ['pickupAddress', 'dropAddress', 'emergencyContact'],
      ['routeId', 'stopId', 'dropoffStopId', 'shiftId', 'operatingDays'],
    ];
    const invalidStep = groups.findIndex(fields =>
      fields.some(field => action.fieldErrors[field]),
    );
    if (invalidStep >= 0) setStep(invalidStep);
  }, [action.fieldErrors, step]);
  const next = () => {
    Keyboard.dismiss();
    const problem = validate(step);
    if (problem) action.reportError(problem);
    else {
      action.clearFeedback();
      setStep(value => Math.min(3, value + 1));
    }
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
      <Notice text={action.error} kind="error" />
      {step === 0 ? (
        <NoorCard>
          <Text style={styles.heading}>{t('Student information')}</Text>
          {existingStudents.length ? (
            <Select
              label={t('Student profile')}
              value={selectedStudentId}
              options={[
                { value: '', label: t('New student') },
                ...existingStudents.map(item => ({
                  value: studentIdentity(item),
                  label: item.studentName,
                })),
              ]}
              onChange={value => {
                setSelectedStudentId(value);
                action.clearFeedback();
                if (!value) {
                  setStudentName('');
                  setClassName('');
                  setRoll('');
                  setPhotoUrl('');
                  setEmergencyContact('');
                  setPickupAddress('');
                  setDropAddress('');
                }
              }}
            />
          ) : null}
          <Field
            label={t('Student name *')}
            editable={!selectedStudentId}
            value={studentName}
            error={action.fieldErrors.studentName}
            onChangeText={value => {
              action.clearFieldError('studentName');
              setStudentName(value);
            }}
            maxLength={100}
            placeholder={t('Student full name')}
          />
          <Field
            label={t('Class *')}
            editable={!selectedStudentId}
            value={className}
            error={action.fieldErrors.className}
            onChangeText={value => {
              action.clearFieldError('className');
              setClassName(value);
            }}
            maxLength={40}
            placeholder={t('e.g. Class 6')}
          />
          <Field
            label={t('Roll number')}
            editable={!selectedStudentId}
            value={roll}
            error={action.fieldErrors.roll}
            onChangeText={value => {
              action.clearFieldError('roll');
              setRoll(value);
            }}
            maxLength={20}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>{t('Upload photo')}</Text>
          <View style={local.photoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Select a student photo')}
              accessibilityState={{
                busy: action.busy,
                disabled: action.busy || !!selectedStudentId,
              }}
              disabled={action.busy || !!selectedStudentId}
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
              disabled={action.busy || !!selectedStudentId}
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
            editable={!selectedStudentId}
            value={emergencyContact}
            error={action.fieldErrors.emergencyContact}
            onChangeText={value => {
              action.clearFieldError('emergencyContact');
              setEmergencyContact(value);
            }}
            keyboardType="phone-pad"
            maxLength={14}
            placeholder="01XXXXXXXXX"
          />
          <Field
            label={t('Pickup address *')}
            value={pickupAddress}
            error={action.fieldErrors.pickupAddress}
            onChangeText={value => {
              action.clearFieldError('pickupAddress');
              setPickupAddress(value);
            }}
            maxLength={500}
            multiline
            placeholder={t('House, road and area')}
          />
          <Field
            label={t('Drop-off address')}
            value={dropAddress}
            error={action.fieldErrors.dropAddress}
            onChangeText={value => {
              action.clearFieldError('dropAddress');
              setDropAddress(value);
            }}
            maxLength={500}
            placeholder={t('School name and address')}
          />
        </NoorCard>
      ) : step === 2 ? (
        <>
          <NoorCard>
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
          </NoorCard>
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
          {action.fieldErrors.routeId ? (
            <Text
              style={{ color: colors.danger }}
              accessibilityLiveRegion="polite"
            >
              {t(action.fieldErrors.routeId)}
            </Text>
          ) : null}
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
                  ['routeId', 'stopId', 'dropoffStopId'].forEach(
                    action.clearFieldError,
                  );
                  setRouteId(item.id);
                  setStopId('');
                  setDropoffStopId('');
                }}
                style={[
                  local.routeCard,
                  item.id === routeId && local.routeSelected,
                  !!action.fieldErrors.routeId && {
                    borderColor: colors.danger,
                  },
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
                <Text style={local.routeFare}>
                  {item.fares?.length
                    ? t('Fare by destination')
                    : money(item.monthlyAmount)}
                </Text>
              </Pressable>
            ))
          )}
          {route ? (
            <NoorCard>
              <Select
                label={t('Pickup stop *')}
                value={stopId}
                error={action.fieldErrors.stopId}
                onChange={value => {
                  action.clearFieldError('stopId');
                  action.clearFieldError('dropoffStopId');
                  setStopId(value);
                  setDropoffStopId('');
                }}
                options={route.stops.map(item => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
              {hasJourneyFares ? (
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
              <Text style={styles.muted}>
                {t(
                  'Monthly fare {{amount}}. Service starts after admin approval.',
                  {
                    amount:
                      hasJourneyFares && !dropoffStopId
                        ? '—'
                        : monthlyFare === undefined
                        ? '—'
                        : money(monthlyFare),
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
            <TransportScheduleSummary
              service={{ shiftId, operatingDays }}
              shifts={shifts}
            />
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
                monthlyFare === undefined ? '—' : money(monthlyFare)
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
            <InfoRow
              icon="pin"
              label={t('Drop-off')}
              value={[destination?.name, dropAddress]
                .filter(Boolean)
                .join(' · ')}
            />
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
              for (const page of [0, 1, 2]) {
                const problem = validate(page);
                if (problem) {
                  setStep(page);
                  throw problem;
                }
              }
              const result = await mutate<{ id: string }>(
                '/requests/guardian/new',
                {
                  studentId: selectedStudentId || undefined,
                  shiftId,
                  operatingDays,
                  studentName: studentName.trim(),
                  routeId,
                  stopId,
                  ...(dropoffStopId ? { dropoffStopId } : {}),
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
            action.clearFeedback();
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
  const management = useManagement();
  const shifts = transportShifts(management.data?.settings);
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
            label: `${item.studentName} · ${t(
              shifts.find(shift => shift.id === serviceShift(item))?.name ||
                serviceShift(item),
            )}`,
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
                <TransportScheduleSummary service={request} shifts={shifts} />
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
