import {
  TransportSchedule,
  TransportScheduleSummary,
} from '../../components/TransportSchedule';
import {
  defaultOperatingDays,
  enrollmentConflicts,
  scheduleValidation,
  studentIdentity,
  transportShifts,
  uniqueStudents,
} from '../../utils/transport';
import { journeyFare, journeyDestinations } from '../../utils/routeFares';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { NoorCard, NoorIcon } from '../../components/Noor';
import {
  Button,
  Empty,
  Field,
  Notice,
  Page,
  Select,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCoreData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { ValidationError } from '../../utils/validation';
import { useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';
import { money, numberLabel } from '../../utils/format';
import { pickStudentPhoto } from '../../utils/photo';
import { InfoRow, parent, StudentAvatar } from './ParentUI';
import { Props } from './types';
import { local } from './screenStyles';

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
  const { data, loading, error, refresh, mutate } = useCoreData();
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
