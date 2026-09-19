import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { NoticeInput } from '../../../api/management';
import { NoorIcon } from '../../../components/Noor';
import { useCoreData } from '../../../context/DataContext';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { ValidationError } from '../../../utils/validation';
import {
  AdminPage,
  Box,
  C,
  Choice,
  EmptyState,
  FormModal,
  Heading,
  Input,
  niceDate,
  s,
  useAction,
} from '../AdminUi';

const noticeCategories = [
  { value: 'PAYMENT', label: 'Monthly fare payment' },
  { value: 'DELAY', label: 'Vehicle delay' },
  { value: 'VEHICLE_CHANGE', label: 'Vehicle change' },
  { value: 'HOLIDAY', label: 'Holiday notice' },
  { value: 'EMERGENCY', label: 'Emergency notice' },
  { value: 'GENERAL', label: 'General notice' },
];

export function NoticesScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useCoreData();
  const action = useAction();
  const [adding, setAdding] = useState(false);
  const blank = () => ({
    title: '',
    body: '',
    category: 'GENERAL',
    audience: 'ALL' as NoticeInput['audience'],
    targetId: '',
  });
  const [form, setForm] = useState(blank);
  const targets =
    form.audience === 'STUDENT'
      ? (data?.students || []).map(item => ({
          value: item.id,
          label: `${item.studentName} · ${
            item.studentCode || item.guardianName
          }`,
        }))
      : form.audience === 'ROUTE'
      ? transport.routes.map(item => ({ value: item.id, label: item.name }))
      : transport.vehicles.map(item => ({ value: item.id, label: item.name }));
  const open = () => {
    setForm(blank());
    action.clearFeedback();
    setAdding(true);
  };
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading
        title={t('Notices for guardians')}
        action={t('+ Create')}
        onAction={open}
      />
      {(data?.notices || []).map(item => (
        <Box key={item.id}>
          <View style={s.row}>
            <View
              style={[
                s.avatar,
                item.category === 'EMERGENCY' ? s.emergencyFill : s.warningFill,
              ]}
            >
              <NoorIcon
                name="bell"
                size={22}
                color={item.category === 'EMERGENCY' ? C.red : C.amber}
              />
            </View>
            <View style={s.flex}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.muted}>{niceDate(item.createdAt)}</Text>
            </View>
          </View>
          <Text style={s.body}>{item.body}</Text>
          <Text style={s.muted}>
            {item.audience === 'ALL'
              ? t('All guardians')
              : item.audience === 'STUDENT'
              ? t("Selected student's guardian")
              : item.audience === 'ROUTE'
              ? t('Guardians on a selected route')
              : t('Guardians of a selected vehicle')}
          </Text>
        </Box>
      ))}
      {!data?.notices.length ? (
        <EmptyState
          text={t('No notices yet')}
          detail={t('Create a notice to inform guardians.')}
        />
      ) : null}
      <FormModal
        title={t('New notice')}
        visible={adding}
        onClose={() => setAdding(false)}
        busy={action.busy}
        error={action.error}
        saveTitle={t('Send notice')}
        onSave={() =>
          action.run(async () => {
            const errors: Record<string, string> = {};
            if (form.title.trim().length < 2)
              errors.title = 'Enter a title of at least 2 characters.';
            if (form.body.trim().length < 2)
              errors.body = 'Enter a message of at least 2 characters.';
            if (form.audience !== 'ALL' && !form.targetId)
              errors.targetId = 'Select who should receive the notice.';
            if (Object.keys(errors).length) throw new ValidationError(errors);
            await mutate('/admin/notices', {
              title: form.title.trim(),
              body: form.body.trim(),
              category: form.category,
              audience: form.audience,
              ...(form.audience !== 'ALL' ? { targetId: form.targetId } : {}),
            } satisfies NoticeInput);
            setAdding(false);
          })
        }
      >
        <Choice
          label={t('Notice category')}
          value={form.category}
          error={action.fieldErrors.category}
          optional={false}
          options={noticeCategories.map(item => ({
            ...item,
            label: t(item.label),
          }))}
          onChange={category => {
            action.clearFieldError('category');
            setForm(current => ({ ...current, category }));
          }}
        />
        <Input
          label={t('Title *')}
          value={form.title}
          error={action.fieldErrors.title}
          onChangeText={title => {
            action.clearFieldError('title');
            setForm(current => ({ ...current, title }));
          }}
          maxLength={160}
        />
        <Input
          label={t('Message *')}
          value={form.body}
          error={action.fieldErrors.body}
          onChangeText={body => {
            action.clearFieldError('body');
            setForm(current => ({ ...current, body }));
          }}
          multiline
          maxLength={2000}
        />
        <Choice
          label={t('Send to')}
          value={form.audience}
          error={action.fieldErrors.audience}
          optional={false}
          options={[
            { value: 'ALL', label: t('All guardians') },
            { value: 'ROUTE', label: t('Selected route') },
            { value: 'VEHICLE', label: t('Selected vehicle') },
            { value: 'STUDENT', label: t('Selected student') },
          ]}
          onChange={audience => {
            action.clearFieldError('audience');
            action.clearFieldError('targetId');
            setForm(current => ({
              ...current,
              audience: audience as NoticeInput['audience'],
              targetId: '',
            }));
          }}
        />
        {form.audience !== 'ALL' ? (
          <Choice
            label={t('Select recipient')}
            value={form.targetId}
            error={action.fieldErrors.targetId}
            options={targets}
            onChange={targetId => {
              action.clearFieldError('targetId');
              setForm(current => ({ ...current, targetId }));
            }}
          />
        ) : null}
        <Text style={s.note}>
          {t(
            'Selected guardians will see this message in app notifications and notices.',
          )}
        </Text>
      </FormModal>
    </AdminPage>
  );
}
