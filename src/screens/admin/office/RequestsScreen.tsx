import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ManagementRequest } from '../../../api/management';
import { NoorIcon } from '../../../components/Noor';
import { useData } from '../../../context/DataContext';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../../navigation/types';
import { ValidationError, isValidDate } from '../../../utils/validation';
import { numberLabel } from '../../../utils/format';
import {
  AdminPage,
  Box,
  C,
  Choice,
  EmptyState,
  FormModal,
  Heading,
  Input,
  Pill,
  SmallButton,
  Tabs,
  niceDate,
  s,
  today,
  useAction,
} from '../AdminUi';

const requestCategories = [
  { value: 'ABSENCE', label: 'Student absence' },
  { value: 'LEAVE', label: 'Driver leave' },
  { value: 'MAINTENANCE', label: 'Vehicle service' },
  { value: 'OTHER', label: 'Other' },
];

export function RequestsScreen({
  route,
}: Partial<
  NativeStackScreenProps<HomeStackParams, 'OperationalRequests'>
> = {}) {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useData();
  const action = useAction();
  const [focusedId, setFocusedId] = useState(route?.params?.id);
  const [tab, setTab] = useState<string>(
    data?.requests.find(item => item.id === focusedId)?.status || 'PENDING',
  );
  const [selected, setSelected] = useState<ManagementRequest>();
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adding, setAdding] = useState(false);
  const blank = () => ({
    category: 'ABSENCE' as ManagementRequest['category'],
    title: '',
    description: '',
    studentId: '',
    driverId: '',
    vehicleId: '',
    date: today(),
  });
  const [form, setForm] = useState(blank);
  const records = (data?.requests || []).filter(item =>
    focusedId ? item.id === focusedId : item.status === tab,
  );
  const review = (item: ManagementRequest, next: 'APPROVED' | 'REJECTED') => {
    setSelected(item);
    setDecision(next);
    setNote('');
    action.clearFeedback();
  };
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading
        title={t('Guardian and driver requests')}
        action={t('+ Add')}
        onAction={() => {
          setForm(blank());
          action.clearFeedback();
          setAdding(true);
        }}
      />
      {focusedId ? (
        <SmallButton
          title={t('Show all records')}
          onPress={() => setFocusedId(undefined)}
        />
      ) : null}
      <Tabs
        value={tab}
        onChange={value => {
          setFocusedId(undefined);
          setTab(value);
        }}
        options={[
          {
            value: 'PENDING',
            label: t('New ({{number}})', {
              number: numberLabel(
                data?.requests.filter(item => item.status === 'PENDING')
                  .length || 0,
              ),
            }),
          },
          { value: 'APPROVED', label: t('Approved') },
          { value: 'REJECTED', label: t('Rejected') },
        ]}
      />
      {records.map(item => (
        <Box key={item.id}>
          <View style={s.row}>
            <NoorIcon name="requests" size={27} color={C.amber} />
            <View style={s.flex}>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.muted}>
                {item.userName}
                {item.studentName ? ` · ${item.studentName}` : ''}
              </Text>
            </View>
            <Pill value={item.status} />
          </View>
          <Text style={s.body}>{item.description}</Text>
          <Text style={s.muted}>{niceDate(item.date || item.createdAt)}</Text>
          {item.note ? <Text style={s.note}>{item.note}</Text> : null}
          {item.status === 'PENDING' ? (
            <View style={s.row}>
              <View style={s.flex}>
                <SmallButton
                  title={t('Approve')}
                  onPress={() => review(item, 'APPROVED')}
                />
              </View>
              <View style={s.flex}>
                <SmallButton
                  title={t('Reject')}
                  danger
                  onPress={() => review(item, 'REJECTED')}
                />
              </View>
            </View>
          ) : null}
        </Box>
      ))}
      {!records.length ? (
        <EmptyState text={t('No requests in this category')} />
      ) : null}
      <FormModal
        title={
          decision === 'APPROVED' ? t('Approve request') : t('Reject request')
        }
        visible={!!selected}
        onClose={() => setSelected(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle={t('Confirm decision')}
        onSave={() =>
          action.run(async () => {
            if (!selected) return;
            if (decision === 'REJECTED' && !note.trim())
              throw new ValidationError({
                note: 'Enter a reason for rejection.',
              });
            await mutate(
              `/admin/management-requests/${selected.id}/decision`,
              { decision, note },
              'PATCH',
            );
            setSelected(undefined);
          })
        }
      >
        <Text style={s.title}>{selected?.title}</Text>
        <Text style={s.body}>{selected?.description}</Text>
        <Input
          label={
            decision === 'REJECTED'
              ? t('Reason for rejection *')
              : t('Comment (optional)')
          }
          value={note}
          error={action.fieldErrors.note}
          onChangeText={value => {
            action.clearFieldError('note');
            setNote(value);
          }}
          multiline
          maxLength={500}
        />
      </FormModal>
      <FormModal
        title={t('New request')}
        visible={adding}
        onClose={() => setAdding(false)}
        busy={action.busy}
        error={action.error}
        onSave={() =>
          action.run(async () => {
            const errors: Record<string, string> = {};
            if (form.title.trim().length < 2)
              errors.title = 'Enter a title of at least 2 characters.';
            if (form.description.trim().length < 5)
              errors.description =
                'Enter a description of at least 5 characters.';
            if (form.category === 'ABSENCE' && !form.studentId)
              errors.studentId = 'Select a student.';
            if (form.category === 'LEAVE' && !form.driverId)
              errors.driverId = 'Select a driver.';
            if (form.category === 'MAINTENANCE' && !form.vehicleId)
              errors.vehicleId = 'Select a vehicle.';
            if (form.date && !isValidDate(form.date))
              errors.date = 'Enter the date in YYYY-MM-DD format.';
            if (Object.keys(errors).length) throw new ValidationError(errors);
            await mutate('/management/requests', {
              category: form.category,
              title: form.title.trim(),
              description: form.description.trim(),
              ...(form.date ? { date: form.date } : {}),
              ...(form.studentId ? { studentId: form.studentId } : {}),
              ...(form.driverId ? { driverId: form.driverId } : {}),
              ...(form.vehicleId ? { vehicleId: form.vehicleId } : {}),
            });
            setAdding(false);
          })
        }
      >
        <Choice
          label={t('Type')}
          value={form.category}
          error={action.fieldErrors.category}
          optional={false}
          options={requestCategories.map(item => ({
            ...item,
            label: t(item.label),
          }))}
          onChange={category => {
            action.clearFeedback();
            setForm(current => ({
              ...current,
              category: category as ManagementRequest['category'],
              studentId: '',
              driverId: '',
              vehicleId: '',
            }));
          }}
        />
        {form.category === 'ABSENCE' ? (
          <Choice
            label={t('Student')}
            value={form.studentId}
            error={action.fieldErrors.studentId}
            options={(data?.students || []).map(item => ({
              value: item.id,
              label: item.studentName,
            }))}
            onChange={studentId => {
              action.clearFieldError('studentId');
              setForm(current => ({ ...current, studentId }));
            }}
          />
        ) : form.category === 'LEAVE' ? (
          <Choice
            label={t('Driver')}
            value={form.driverId}
            error={action.fieldErrors.driverId}
            options={(data?.drivers || []).map(item => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={driverId => {
              action.clearFieldError('driverId');
              setForm(current => ({ ...current, driverId }));
            }}
          />
        ) : form.category === 'MAINTENANCE' ? (
          <Choice
            label={t('Vehicle')}
            value={form.vehicleId}
            error={action.fieldErrors.vehicleId}
            options={transport.vehicles.map(item => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={vehicleId => {
              action.clearFieldError('vehicleId');
              setForm(current => ({ ...current, vehicleId }));
            }}
          />
        ) : null}
        <Input
          label={t('Title')}
          value={form.title}
          error={action.fieldErrors.title}
          onChangeText={title => {
            action.clearFieldError('title');
            setForm(current => ({ ...current, title }));
          }}
          maxLength={160}
        />
        <Input
          label={t('Description')}
          value={form.description}
          error={action.fieldErrors.description}
          onChangeText={description => {
            action.clearFieldError('description');
            setForm(current => ({ ...current, description }));
          }}
          multiline
          maxLength={2000}
        />
        <Input
          label={t('Date (YYYY-MM-DD)')}
          value={form.date}
          error={action.fieldErrors.date}
          onChangeText={date => {
            action.clearFieldError('date');
            setForm(current => ({ ...current, date }));
          }}
          maxLength={10}
        />
      </FormModal>
    </AdminPage>
  );
}
