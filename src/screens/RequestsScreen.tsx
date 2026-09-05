import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
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
import { styles } from '../theme';
import { money, readable } from '../utils/format';
function CallGuardian({ id, phone }: { id: string; phone: string }) {
  const { mutate } = useData();
  const action = useAction();
  const [note, setNote] = useState('');
  return (
    <View style={styles.section}>
      <Button
        secondary
        title={`Call guardian · ${phone}`}
        onPress={() => {
          action.run(
            () => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`),
            '',
          );
        }}
      />
      <Field
        label="Call note"
        value={note}
        onChangeText={setNote}
        maxLength={500}
      />
      <Button
        secondary
        title="Save call note"
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!note.trim()) throw new Error('Add a call note first.');
            await mutate(`/admin/requests/${id}/call-notes`, { note });
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
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
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
      title={admin ? 'Service requests' : 'Your transport service'}
      subtitle={
        admin
          ? 'Review coverage, speak with guardians and manage service.'
          : 'Find your route and let us take care of the next step.'
      }
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      {!admin ? (
        <Card>
          <Text style={styles.heading}>Request a transport service</Text>
          <Field
            label="Student name"
            value={studentName}
            onChangeText={setStudentName}
            maxLength={100}
          />
          <Select
            label="Route / road"
            value={routeId}
            onChange={value => {
              setRouteId(value);
              setStopId('');
            }}
            options={data.routes.map(item => ({
              value: item.id,
              label: `${item.name} · ${money(item.monthlyAmount)}/month`,
            }))}
          />
          <Select
            label="Pickup stop"
            value={stopId}
            onChange={setStopId}
            options={(route?.stops || []).map(item => ({
              value: item.id,
              label: item.name,
            }))}
          />
          {route ? (
            <Text style={styles.muted}>
              Vehicle: {route.vehicleName} · Full monthly fee{' '}
              {money(route.monthlyAmount)}. The admin will confirm your service.
            </Text>
          ) : null}
          {!data.routes.length ? (
            <Text style={styles.muted}>
              The admin has not added routes yet. Please check back soon.
            </Text>
          ) : null}
          <Button
            title="Send service request"
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
      <SectionTitle>Applications</SectionTitle>
      {!data.requests.length ? (
        <Empty
          title="No applications yet"
          detail="Submitted service requests will appear here with their status."
        />
      ) : (
        data.requests.map(request => (
          <Card key={request.id}>
            <View style={styles.between}>
              <Text style={styles.heading}>{request.studentName}</Text>
              <Badge status={request.status} />
            </View>
            <Text style={styles.body}>
              {request.routeName} → {request.stopName}
            </Text>
            <Text style={styles.muted}>
              {request.vehicleName}
              {admin ? ` · ${request.guardianName}` : ''}
            </Text>
            {request.note ? (
              <Text style={styles.body}>Admin note: {request.note}</Text>
            ) : null}
            {admin && request.status === 'PENDING' ? (
              <>
                <CallGuardian id={request.id} phone={request.guardianPhone} />
                <ReviewActions
                  path={`/admin/requests/${request.id}/decision`}
                  confirmation="Approve the selected route and stop? The guardian will gain tracking access to the assigned vehicle."
                />
              </>
            ) : null}
          </Card>
        ))
      )}
      {!admin && active.length ? (
        <Card>
          <Text style={styles.heading}>Need help with your service?</Text>
          <Select
            label="Active service"
            value={subscriptionId}
            onChange={setSubscriptionId}
            options={active.map(item => ({
              value: item.id,
              label: `${item.studentName} · ${item.routeName}`,
            }))}
          />
          <Select
            label="Complaint category"
            value={category}
            onChange={setCategory}
            options={[
              'LATE_PICKUP',
              'DRIVER_BEHAVIOUR',
              'VEHICLE_SAFETY',
              'PAYMENT',
              'OTHER',
            ].map(value => ({ value, label: readable(value) }))}
          />
          <Field
            label="Tell us what happened"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
          />
          <Notice text={action.error} kind="error" />
          <Notice text={action.success} />
          <Button
            title="Submit complaint"
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
            label="Reason for stopping service"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
          />
          <Text style={styles.muted}>
            Your service continues until the admin approves. Existing monthly
            bills remain payable; no automatic refund or proration.
          </Text>
          <Notice text={action.error} kind="error" />
          <Notice text={action.success} />
          <Button
            secondary
            title="Request to stop service"
            busy={action.busy}
            onPress={() => {
              action.run(async () => {
                if (!subscriptionId || reason.trim().length < 5)
                  throw new Error(
                    'Select a service and add a reason (at least 5 characters).',
                  );
                await mutate('/stop-requests', { subscriptionId, reason });
                setReason('');
              }, 'Stop request submitted. Your service remains active until approved.');
            }}
          />
        </Card>
      ) : !admin ? (
        <Text style={styles.muted}>
          Complaint and stop-service forms become available after your transport
          service is approved.
        </Text>
      ) : null}
      <SectionTitle>Complaints</SectionTitle>
      {!data.complaints.length ? (
        <Text style={styles.muted}>No complaints to show.</Text>
      ) : (
        data.complaints.map(complaint => (
          <Card key={complaint.id}>
            <View style={styles.between}>
              <Text style={styles.heading}>{readable(complaint.category)}</Text>
              <Badge status={complaint.status} />
            </View>
            <Text style={styles.muted}>
              {complaint.studentName}
              {admin ? ` · ${complaint.guardianName}` : ''}
            </Text>
            <Text style={styles.body}>{complaint.description}</Text>
            {complaint.note ? (
              <Text style={styles.body}>Admin note: {complaint.note}</Text>
            ) : null}
            {admin && complaint.status === 'OPEN' ? (
              <ReviewActions
                resolve
                path={`/admin/complaints/${complaint.id}`}
                confirmation="Mark this complaint as resolved and notify the guardian?"
              />
            ) : null}
          </Card>
        ))
      )}
      <SectionTitle>Stop requests</SectionTitle>
      {!data.stops.length ? (
        <Text style={styles.muted}>No stop requests to show.</Text>
      ) : (
        data.stops.map(stop => (
          <Card key={stop.id}>
            <View style={styles.between}>
              <Text style={styles.heading}>{stop.studentName}</Text>
              <Badge status={stop.status} />
            </View>
            <Text style={styles.body}>{stop.reason}</Text>
            {stop.note ? (
              <Text style={styles.body}>Admin note: {stop.note}</Text>
            ) : null}
            {admin && stop.status === 'PENDING' ? (
              <ReviewActions
                path={`/admin/stop-requests/${stop.id}/decision`}
                confirmation="Stop this service now? Tracking access will end, and existing bills will remain in payment history."
              />
            ) : null}
          </Card>
        ))
      )}
    </Page>
  );
}
