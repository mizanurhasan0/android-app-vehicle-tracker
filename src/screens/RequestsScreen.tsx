import { useTranslation } from '../i18n';
import React, { useState } from 'react';
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
  SectionTitle,
  Select,
} from '../components/ui';
import { ReviewActions } from '../components/ReviewActions';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { money, readable } from '../utils/format';

const requestTabs = ['Applications', 'Complaints', 'Stop requests'] as const;
type RequestTab = (typeof requestTabs)[number];

function RequestSection({
  label,
  tabbed,
  visible,
  children,
}: React.PropsWithChildren<{
  label: RequestTab;
  tabbed: boolean;
  visible: boolean;
}>) {
  const { t } = useTranslation();
  if (!tabbed) {
    return (
      <>
        <SectionTitle>{t(label)}</SectionTitle>
        {children}
      </>
    );
  }
  // Keep review drafts mounted when switching tabs.
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
  children,
}: React.PropsWithChildren<{ label: string }>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
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
        <Text style={local.link}>{expanded ? '−' : '+'}</Text>
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
        onChangeText={setNote}
        maxLength={500}
      />
      <Button
        secondary
        title={t('Save call note')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!note.trim()) throw new Error('Add a call note first.');
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
export function RequestsScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
  const [tab, setTab] = useState<RequestTab>('Applications');
  const [studentName, setStudentName] = useState('');
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const action = useAction();
  const admin = session!.user.role === 'ADMIN';
  const route = data.routes.find(item => item.id === routeId);
  const active = data.subscriptions.filter(item => item.status === 'ACTIVE');
  return (
    <Page
      title={admin ? undefined : t('Your transport service')}
      subtitle={
        admin
          ? undefined
          : t('Find your route and let us take care of the next step.')
      }
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      {admin ? (
        <View
          accessibilityRole="tablist"
          accessibilityLabel={t('Service requests')}
          style={local.tabs}
        >
          {requestTabs.map(label => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityLabel={t(label)}
              accessibilityState={{ selected: tab === label }}
              onPress={() => {
                Keyboard.dismiss();
                setTab(label);
              }}
              style={({ pressed }) => [
                local.tab,
                tab === label && local.selectedTab,
                pressed && local.pressed,
              ]}
            >
              <Text
                style={[local.tabText, tab === label && local.selectedTabText]}
              >
                {t(label)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!admin ? (
        <Card>
          <Text style={styles.heading}>{t('Request a transport service')}</Text>
          <Field
            label={t('Student name')}
            value={studentName}
            onChangeText={setStudentName}
            maxLength={100}
          />
          <Select
            label={t('Route / road')}
            value={routeId}
            onChange={value => {
              setRouteId(value);
              setStopId('');
            }}
            options={data.routes.map(item => ({
              value: item.id,
              label: t('{{route}} · {{amount}}/month', {
                route: item.name,
                amount: money(item.monthlyAmount),
              }),
            }))}
          />
          <Select
            label={t('Pickup stop')}
            value={stopId}
            onChange={setStopId}
            options={(route?.stops || []).map(item => ({
              value: item.id,
              label: item.name,
            }))}
          />
          {route ? (
            <Text style={styles.muted}>
              {t(
                'Vehicle: {{name}} · Full monthly fee {{amount}}. The admin will confirm your service.',
                { name: route.vehicleName, amount: money(route.monthlyAmount) },
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
                  throw new Error(
                    'Enter the student’s name and select a route and pickup stop.',
                  );
                await mutate('/requests/guardian/new', {
                  studentName: studentName.trim(),
                  routeId,
                  stopId,
                });
                setStudentName('');
                setRouteId('');
                setStopId('');
              }, 'Request sent. You’ll receive an update after admin review.');
            }}
          />
        </Card>
      ) : null}
      <RequestSection
        label="Applications"
        tabbed={admin}
        visible={tab === 'Applications'}
      >
        {!data.requests.length ? (
          <Empty
            title={t('No applications yet')}
            detail={t(
              'Submitted service requests will appear here with their status.',
            )}
          />
        ) : (
          data.requests.map(request => (
            <RequestCard key={request.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {request.studentName}
                </Text>
                <Badge status={request.status} />
              </View>
              <Text style={admin ? local.body : styles.body}>
                {request.routeName} → {request.stopName}
              </Text>
              <Text style={styles.muted}>
                {request.vehicleName}
                {admin ? ` · ${request.guardianName}` : ''}
              </Text>
              {request.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {request.note}
                </Text>
              ) : null}
              {admin && request.status === 'PENDING' ? (
                <RequestActions label={request.studentName}>
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
      {!admin && active.length ? (
        <Card>
          <Text style={styles.heading}>
            {t('Need help with your service?')}
          </Text>
          <Select
            label={t('Active service')}
            value={subscriptionId}
            onChange={setSubscriptionId}
            options={active.map(item => ({
              value: item.id,
              label: `${item.studentName} · ${item.routeName}`,
            }))}
          />
          <Select
            label={t('Complaint category')}
            value={category}
            onChange={setCategory}
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
            onChangeText={setDescription}
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
                  throw new Error(
                    'Select a service, category and add at least 10 characters of detail.',
                  );
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
            onChangeText={setReason}
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
                  throw new Error(
                    'Select a service and add a reason (at least 5 characters).',
                  );
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
      <RequestSection
        label="Complaints"
        tabbed={admin}
        visible={tab === 'Complaints'}
      >
        {!data.complaints.length ? (
          <Text style={styles.muted}>{t('No complaints to show.')}</Text>
        ) : (
          data.complaints.map(complaint => (
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
      <RequestSection
        label="Stop requests"
        tabbed={admin}
        visible={tab === 'Stop requests'}
      >
        {!data.stops.length ? (
          <Text style={styles.muted}>{t('No stop requests to show.')}</Text>
        ) : (
          data.stops.map(stop => (
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
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  selectedTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedTabText: { color: colors.surface },
  section: { gap: 12 },
  card: {
    padding: 14,
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
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
    fontSize: 16,
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
