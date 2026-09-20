import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Maintenance, MaintenanceInput } from '../../../api/management';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { toPoisha } from '../../../utils/format';
import { ValidationError, isValidDate } from '../../../utils/validation';
import {
  C,
  Choice,
  FormModal,
  Heading,
  Input,
  s,
  today,
  useAction,
} from '../AdminUi';

const services = [
  { value: 'বৈদ্যুতিক পরীক্ষা', label: 'Electrical inspection' },
  { value: 'ব্যাটারি', label: 'Battery' },
  { value: 'টায়ার', label: 'Tyres' },
  { value: 'মেরামত', label: 'Repair' },
  { value: 'যন্ত্রাংশ', label: 'Parts' },
];

export function MaintenanceForm({
  item,
  visible,
  onClose,
  vehicleId,
}: {
  item?: Maintenance;
  visible: boolean;
  onClose: () => void;
  vehicleId?: string;
}) {
  const { t } = useTranslation();
  const { data: transport } = useCoreData();
  const { mutate } = useManagement();
  const action = useAction();
  const empty = () => ({
    vehicleId: vehicleId || '',
    title: '',
    description: '',
    serviceDate: today(),
    nextServiceDate: '',
    amount: '',
    status: 'PLANNED' as Maintenance['status'],
  });
  const [form, setForm] = useState(empty);
  const [checks, setChecks] = useState<string[]>([]);
  useEffect(() => {
    if (visible) {
      action.clearFeedback();
      setChecks([]);
      setForm(
        item
          ? {
              vehicleId: item.vehicleId,
              title: item.title,
              description: item.description,
              serviceDate: item.serviceDate,
              nextServiceDate: item.nextServiceDate || '',
              amount: String(item.amount / 100),
              status: item.status,
            }
          : empty(),
      );
    }
  }, [visible, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: string) => {
    action.clearFieldError(key);
    setForm(current => ({ ...current, [key]: value }));
  };
  return (
    <FormModal
      title={item ? t('Edit maintenance') : t('Add maintenance')}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          const errors: Record<string, string> = {};
          if (!form.vehicleId) errors.vehicleId = 'Select a vehicle.';
          if (form.title.trim().length < 2)
            errors.title = 'Enter a title of at least 2 characters.';
          if (!isValidDate(form.serviceDate))
            errors.serviceDate = 'Enter the date in YYYY-MM-DD format.';
          if (form.nextServiceDate && !isValidDate(form.nextServiceDate))
            errors.nextServiceDate = 'Enter the date in YYYY-MM-DD format.';
          let amount = 0;
          if (
            form.amount.trim() &&
            !/^0+(\.0{1,2})?$/.test(form.amount.trim())
          ) {
            try {
              amount = toPoisha(form.amount);
            } catch (problem) {
              errors.amount = (problem as Error).message;
            }
          }
          if (Object.keys(errors).length) throw new ValidationError(errors);
          const input: MaintenanceInput = {
            ...form,
            title: form.title.trim(),
            nextServiceDate: form.nextServiceDate || null,
            amount,
            description: [
              form.description.trim(),
              checks.length ? `কাজ: ${checks.join(', ')}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          };
          await mutate(
            item ? `/admin/maintenance/${item.id}` : '/admin/maintenance',
            input,
            item ? 'PATCH' : 'POST',
          );
          onClose();
        })
      }
    >
      <Choice
        label={t('Vehicle *')}
        value={form.vehicleId}
        error={action.fieldErrors.vehicleId}
        onChange={v => set('vehicleId', v)}
        options={transport.vehicles.map(v => ({
          value: v.id,
          label: `${v.name} · ${v.plate}`,
        }))}
      />
      <Input
        label={t('Work title *')}
        value={form.title}
        error={action.fieldErrors.title}
        onChangeText={v => set('title', v)}
        maxLength={120}
      />
      <Heading title={t('Service tasks')} />
      {services.map(({ value: service, label }) => (
        <Pressable
          key={service}
          accessibilityRole="checkbox"
          accessibilityLabel={t(label)}
          accessibilityState={{ checked: checks.includes(service) }}
          onPress={() =>
            setChecks(current =>
              current.includes(service)
                ? current.filter(v => v !== service)
                : [...current, service],
            )
          }
          style={[s.row, s.choiceRow]}
        >
          <View
            style={[
              s.checkbox,
              {
                backgroundColor: checks.includes(service) ? C.green : C.white,
              },
            ]}
          >
            <Text style={s.white}>{checks.includes(service) ? '✓' : ''}</Text>
          </View>
          <Text style={s.body}>{t(label)}</Text>
        </Pressable>
      ))}
      <Input
        label={t('Details')}
        value={form.description}
        error={action.fieldErrors.description}
        onChangeText={v => set('description', v)}
        multiline
        maxLength={2000}
      />
      <Input
        label={t('Service date (YYYY-MM-DD)')}
        value={form.serviceDate}
        error={action.fieldErrors.serviceDate}
        onChangeText={v => set('serviceDate', v)}
        maxLength={10}
      />
      <Input
        label={t('Next service (YYYY-MM-DD)')}
        value={form.nextServiceDate}
        error={action.fieldErrors.nextServiceDate}
        onChangeText={v => set('nextServiceDate', v)}
        maxLength={10}
      />
      <Input
        label={t('Total cost (৳)')}
        value={form.amount}
        error={action.fieldErrors.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      <Choice
        label={t('Status')}
        value={form.status}
        error={action.fieldErrors.status}
        optional={false}
        onChange={v => set('status', v)}
        options={[
          { value: 'PLANNED', label: t('Planned') },
          { value: 'IN_PROGRESS', label: t('In progress') },
          { value: 'COMPLETED', label: t('Completed') },
        ]}
      />
      <Text style={s.note}>
        {t(
          'Completed work costs are automatically added to Income and expenses. Planned or ongoing work is not counted as an expense yet.',
        )}
      </Text>
    </FormModal>
  );
}
