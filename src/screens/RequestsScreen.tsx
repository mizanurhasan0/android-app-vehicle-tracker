import { useManagement } from '../context/ManagementContext';
import {
  TransportSchedule,
  TransportScheduleSummary,
} from '../components/TransportSchedule';
import {
  defaultOperatingDays,
  enrollmentConflicts,
  scheduleValidation,
  serviceShift,
  studentIdentity,
  transportShifts,
  uniqueStudents,
} from '../utils/transport';
import { journeyFare, journeyDestinations } from '../utils/routeFares';
import { useTranslation } from '../i18n';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Notice,
  Page,
  Select,
} from '../components/ui';
import { NoorIcon } from '../components/Noor';
import { ReviewActions } from '../components/ReviewActions';
import { RequestIconKind, RequestTabIcon } from '../components/RequestTabIcon';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ValidationError } from '../utils/validation';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { money, readable } from '../utils/format';

const requestTabs = ['Applications', 'Complaints', 'Stop requests'] as const;
const guardianTabs = ['Form', ...requestTabs] as const;
type RequestTab = (typeof guardianTabs)[number];
const guardianTabDetails: Record<
  RequestTab,
  { label: string; icon: RequestIconKind }
> = {
  Form: { label: 'Request forms', icon: 'form' },
  Applications: { label: 'My applications', icon: 'applications' },
  Complaints: { label: 'My complaints', icon: 'complaints' },
  'Stop requests': { label: 'Stop requests', icon: 'stop' },
};

function RequestSection({
  label,
  visible,
  children,
}: React.PropsWithChildren<{
  label: RequestTab;
  visible: boolean;
}>) {
  // Keep form and review drafts mounted when switching tabs.
  return (
    <View
      testID={`request-section-${label}`}
      style={[local.section, !visible && local.hidden]}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

function RequestCard({
  compact,
  children,
}: React.PropsWithChildren<{ compact: boolean }>) {
  return compact ? (
    <View style={local.card}>{children}</View>
  ) : (
    <Card>{children}</Card>
  );
}

function RequestActions({
  label,
  initiallyExpanded = false,
  children,
}: React.PropsWithChildren<{ label: string; initiallyExpanded?: boolean }>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <View style={local.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t(
          expanded ? 'Hide details' : 'View details',
        )} · ${label}`}
        accessibilityState={{ expanded }}
        onPress={() => {
          Keyboard.dismiss();
          setExpanded(!expanded);
        }}
        style={({ pressed }) => [local.disclosure, pressed && local.pressed]}
      >
        <Text style={local.link}>
          {t(expanded ? 'Hide details' : 'View details')}
        </Text>
        <NoorIcon name={expanded ? 'minus' : 'plus'} size={20} color={colors.primary} />
      </Pressable>
      <View
        style={[local.actionFields, !expanded && local.hidden]}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </View>
    </View>
  );
}

function CallGuardian({ id, phone }: { id: string; phone: string }) {
  const { t } = useTranslation();
  const { mutate } = useData();
  const action = useAction();
  const [note, setNote] = useState('');
  return (
    <View style={styles.section}>
      <Button
        secondary
        title={t('Call guardian · {{phone}}', { phone })}
        onPress={() => {
          action.run(
            () => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`),
            '',
          );
        }}
      />
      <Field
        label={t('Call note')}
        value={note}
        error={action.fieldErrors.note}
        onChangeText={value => {
          action.clearFieldError('note');
          setNote(value);
        }}
        maxLength={500}
      />
      <Button
        secondary
        title={t('Save call note')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!note.trim())
              throw new ValidationError({ note: 'Add a call note first.' });
            await mutate(`/admin/requests/${id}/call-notes`, {
              note,
            });
            setNote('');
          });
        }}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
    </View>
  );
}
export function RequestsScreen({
  section,
  targetId,
}: { section?: RequestTab; targetId?: string } = {}) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
  const admin = session!.user.role === 'ADMIN';
  const [tab, setTab] = useState<RequestTab>(
    section || (admin ? 'Applications' : 'Form'),
  );
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
  const [subscriptionId, setSubscriptionId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const action = useAction();
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
  const active = data.subscriptions.filter(item => item.status === 'ACTIVE');
  const [focusedId, setFocusedId] = useState(targetId);
  const requests = data.requests.filter(
    item => !focusedId || item.id === focusedId,
  );
  const complaints = data.complaints.filter(
    item => !focusedId || item.id === focusedId,
  );
  const stops = data.stops.filter(item => !focusedId || item.id === focusedId);
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      {focusedId ? (
        <Button
          secondary
          title={t('Show all records')}
          onPress={() => setFocusedId(undefined)}
        />
      ) : null}
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t(
          admin ? 'Service requests' : 'Your transport service',
        )}
        style={local.tabs}
      >
        {(section
          ? admin
            ? [section]
            : (['Form', section] as RequestTab[])
          : admin
          ? requestTabs
          : guardianTabs
        ).map(label => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityLabel={t(
              admin ? label : guardianTabDetails[label].label,
            )}
            accessibilityState={{ selected: tab === label }}
            onPress={() => {
              Keyboard.dismiss();
              action.clearFeedback();
              setTab(label);
            }}
            style={({ pressed }) => [
              local.tab,
              !admin && local.guardianTab,
              tab === label && local.selectedTab,
              pressed && local.pressed,
            ]}
          >
            {!admin ? (
              <RequestTabIcon
                kind={guardianTabDetails[label].icon}
                selected={tab === label}
              />
            ) : null}
            <Text
              style={[local.tabText, tab === label && local.selectedTabText]}
            >
              {t(admin ? label : guardianTabDetails[label].label)}
            </Text>
          </Pressable>
        ))}
      </View>
      {!admin ? (
        <RequestSection label="Form" visible={tab === 'Form'}>
          <Card>
            <Text style={styles.heading}>
              {t('Request a transport service')}
            </Text>
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
                    profiles.find(item => item.studentId === value)
                      ?.studentName || '',
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
                {t(
                  'The admin has not added routes yet. Please check back soon.',
                )}
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
                      dropoffStopId:
                        'Select a destination with a configured fare.',
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
          {!admin && active.length ? (
            <Card>
              <Text style={styles.heading}>
                {t('Need help with your service?')}
              </Text>
              <Select
                label={t('Active service')}
                value={subscriptionId}
                error={action.fieldErrors.subscriptionId}
                onChange={value => {
                  action.clearFieldError('subscriptionId');
                  setSubscriptionId(value);
                }}
                options={active.map(item => ({
                  value: item.id,
                  label: `${item.studentName} · ${t(
                    shifts.find(shift => shift.id === serviceShift(item))
                      ?.name || serviceShift(item),
                  )} · ${item.routeName}`,
                }))}
              />
              <Select
                label={t('Complaint category')}
                value={category}
                error={action.fieldErrors.category}
                onChange={value => {
                  action.clearFieldError('category');
                  setCategory(value);
                }}
                options={[
                  'LATE_PICKUP',
                  'DRIVER_BEHAVIOUR',
                  'VEHICLE_SAFETY',
                  'PAYMENT',
                  'OTHER',
                ].map(value => ({
                  value,
                  label: readable(value),
                }))}
              />
              <Field
                label={t('Tell us what happened')}
                value={description}
                error={action.fieldErrors.description}
                onChangeText={value => {
                  action.clearFieldError('description');
                  setDescription(value);
                }}
                multiline
                maxLength={2000}
              />
              <Notice text={action.error} kind="error" />
              <Notice text={action.success} />
              <Button
                title={t('Submit complaint')}
                busy={action.busy}
                onPress={() => {
                  action.run(async () => {
                    if (
                      !subscriptionId ||
                      !category ||
                      description.trim().length < 10
                    )
                      throw new ValidationError({
                        ...(!subscriptionId
                          ? { subscriptionId: 'Select an active service.' }
                          : {}),
                        ...(!category
                          ? { category: 'Select a complaint category.' }
                          : {}),
                        ...(description.trim().length < 10
                          ? {
                              description:
                                'Add at least 10 characters of detail.',
                            }
                          : {}),
                      });
                    await mutate('/complaints', {
                      subscriptionId,
                      category,
                      description,
                    });
                    setDescription('');
                  }, 'Complaint submitted. The admin has been notified.');
                }}
              />
              <Field
                label={t('Reason for stopping service')}
                value={reason}
                error={action.fieldErrors.reason}
                onChangeText={value => {
                  action.clearFieldError('reason');
                  setReason(value);
                }}
                multiline
                maxLength={500}
              />
              <Text style={styles.muted}>
                {t(
                  'Your service continues until the admin approves. Existing monthly bills remain payable; no automatic refund or proration.',
                )}
              </Text>
              <Notice text={action.error} kind="error" />
              <Notice text={action.success} />
              <Button
                secondary
                title={t('Request to stop service')}
                busy={action.busy}
                onPress={() => {
                  action.run(async () => {
                    if (!subscriptionId || reason.trim().length < 5)
                      throw new ValidationError({
                        ...(!subscriptionId
                          ? { subscriptionId: 'Select an active service.' }
                          : {}),
                        ...(reason.trim().length < 5
                          ? {
                              reason:
                                'Add a reason with at least 5 characters.',
                            }
                          : {}),
                      });
                    await mutate('/stop-requests', {
                      subscriptionId,
                      reason,
                    });
                    setReason('');
                  }, 'Stop request submitted. Your service remains active until approved.');
                }}
              />
            </Card>
          ) : !admin ? (
            <Text style={styles.muted}>
              {t(
                'Complaint and stop-service forms become available after your transport service is approved.',
              )}
            </Text>
          ) : null}
        </RequestSection>
      ) : null}
      <RequestSection label="Applications" visible={tab === 'Applications'}>
        {!requests.length ? (
          <Empty
            title={t('No applications yet')}
            detail={t(
              'Submitted service requests will appear here with their status.',
            )}
          />
        ) : (
          requests.map(request => (
            <RequestCard key={request.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {request.studentName}
                </Text>
                <TransportScheduleSummary service={request} shifts={shifts} />
                <Badge status={request.status} />
              </View>
              <Text style={admin ? local.body : styles.body}>
                {request.routeName} · {request.stopName}
                {request.dropoffStopName ? ` → ${request.dropoffStopName}` : ''}
              </Text>
              <Text style={styles.muted}>
                {request.vehicleName}
                {admin ? ` · ${request.guardianName}` : ''}
              </Text>
              {request.monthlyAmount !== undefined ? (
                <Text style={styles.muted}>
                  {t('Monthly fare')}: {money(request.monthlyAmount)}
                </Text>
              ) : null}
              {request.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {request.note}
                </Text>
              ) : null}
              {admin && request.status === 'PENDING' ? (
                <RequestActions
                  label={request.studentName}
                  initiallyExpanded={request.id === targetId}
                >
                  <CallGuardian id={request.id} phone={request.guardianPhone} />
                  <ReviewActions
                    path={`/admin/requests/${request.id}/decision`}
                    confirmation={t(
                      'Approve the selected route and stop? The guardian will gain tracking access to the assigned vehicle.',
                    )}
                  />
                </RequestActions>
              ) : null}
            </RequestCard>
          ))
        )}
      </RequestSection>
      <RequestSection label="Complaints" visible={tab === 'Complaints'}>
        {!complaints.length ? (
          <Text style={styles.muted}>{t('No complaints to show.')}</Text>
        ) : (
          complaints.map(complaint => (
            <RequestCard key={complaint.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {readable(complaint.category)}
                </Text>
                <Badge status={complaint.status} />
              </View>
              <Text style={styles.muted}>
                {complaint.studentName}
                {admin ? ` · ${complaint.guardianName}` : ''}
              </Text>
              <Text style={admin ? local.body : styles.body}>
                {complaint.description}
              </Text>
              {complaint.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {complaint.note}
                </Text>
              ) : null}
              {admin && complaint.status === 'OPEN' ? (
                <RequestActions
                  initiallyExpanded={complaint.id === targetId}
                  label={`${complaint.studentName} · ${readable(
                    complaint.category,
                  )}`}
                >
                  <ReviewActions
                    resolve
                    path={`/admin/complaints/${complaint.id}`}
                    confirmation={t(
                      'Mark this complaint as resolved and notify the guardian?',
                    )}
                  />
                </RequestActions>
              ) : null}
            </RequestCard>
          ))
        )}
      </RequestSection>
      <RequestSection label="Stop requests" visible={tab === 'Stop requests'}>
        {!stops.length ? (
          <Text style={styles.muted}>{t('No stop requests to show.')}</Text>
        ) : (
          stops.map(stop => (
            <RequestCard key={stop.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {stop.studentName}
                </Text>
                <Badge status={stop.status} />
              </View>
              <Text style={admin ? local.body : styles.body}>
                {stop.reason}
              </Text>
              {stop.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {stop.note}
                </Text>
              ) : null}
              {admin && stop.status === 'PENDING' ? (
                <RequestActions
                  initiallyExpanded={stop.id === targetId}
                  label={`${t('Stop requests')} · ${stop.studentName}`}
                >
                  <ReviewActions
                    path={`/admin/stop-requests/${stop.id}/decision`}
                    confirmation={t(
                      'Stop this service now? Tracking access will end, and existing bills will remain in payment history.',
                    )}
                  />
                </RequestActions>
              ) : null}
            </RequestCard>
          ))
        )}
      </RequestSection>
    </Page>
  );
}

const local = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 3,
    borderRadius: 7,
    backgroundColor: '#EEF5F2',
  },
  tab: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 44,
    paddingHorizontal: 7,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  selectedTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  guardianTab: { flexBasis: '40%', flexDirection: 'row', gap: 8 },
  tabText: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedTabText: { color: colors.surface },
  section: { gap: 9 },
  card: {
    padding: 12,
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  actions: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  disclosure: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  actionFields: { gap: 12, paddingTop: 4 },
  hidden: { display: 'none' },
  pressed: { opacity: 0.7 },
});
