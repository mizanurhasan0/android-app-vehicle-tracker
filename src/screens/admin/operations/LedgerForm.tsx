import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { LedgerEntry, LedgerInput } from '../../../api/management';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { toPoisha } from '../../../utils/format';
import { ValidationError, isValidDate } from '../../../utils/validation';
import { Choice, FormModal, Input, s, today, useAction } from '../AdminUi';
import { categoryLabels } from './ledgerCategories';

export function LedgerForm({
  visible,
  onClose,
  initialType,
}: {
  visible: boolean;
  onClose: () => void;
  initialType: LedgerEntry['type'];
}) {
  const { t } = useTranslation();
  const { data, mutate } = useManagement();
  const { data: transport } = useCoreData();
  const action = useAction();
  const [form, setForm] = useState({
    type: initialType,
    category: 'OTHER',
    title: '',
    amount: '',
    date: today(),
    note: '',
    vehicleId: '',
    driverId: '',
  });
  useEffect(() => {
    if (visible) {
      action.clearFeedback();
      setForm({
        type: initialType,
        category: 'OTHER',
        title: '',
        amount: '',
        date: today(),
        note: '',
        vehicleId: '',
        driverId: '',
      });
    }
  }, [visible, initialType]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: string) => {
    action.clearFieldError(key);
    setForm(current => ({ ...current, [key]: value }));
  };
  const categories =
    form.type === 'EXPENSE'
      ? ['SALARY', 'CHARGING', 'REPAIR', 'PARTS', 'TAX', 'OFFICE', 'OTHER']
      : form.type === 'INVESTMENT'
      ? ['VEHICLE', 'CAPITAL', 'OTHER']
      : ['OTHER'];
  return (
    <FormModal
      title={
        form.type === 'EXPENSE'
          ? t('Add expense')
          : form.type === 'INVESTMENT'
          ? t('Add investment')
          : t('Add income')
      }
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          const errors: Record<string, string> = {};
          if (form.title.trim().length < 2)
            errors.title = 'Enter a title of at least 2 characters.';
          if (form.category === 'SALARY' && !form.driverId)
            errors.driverId = 'Select a driver for the salary payment.';
          if (!isValidDate(form.date))
            errors.date = 'Enter the date in YYYY-MM-DD format.';
          let amount = 0;
          try {
            amount = toPoisha(form.amount);
          } catch (problem) {
            errors.amount = (problem as Error).message;
          }
          if (Object.keys(errors).length) throw new ValidationError(errors);
          const input: LedgerInput = {
            type: form.type,
            category: form.category,
            title: form.title.trim(),
            amount,
            date: form.date,
            note: form.note,
            ...(form.vehicleId ? { vehicleId: form.vehicleId } : {}),
            ...(form.driverId ? { driverId: form.driverId } : {}),
          };
          await mutate('/admin/ledger', input);
          onClose();
        })
      }
    >
      <Choice
        label={t('Entry type')}
        value={form.type}
        error={action.fieldErrors.type}
        optional={false}
        options={[
          { value: 'INCOME', label: t('Income') },
          { value: 'EXPENSE', label: t('Expense') },
          { value: 'INVESTMENT', label: t('Investment') },
        ]}
        onChange={v => {
          action.clearFeedback();
          setForm(current => ({
            ...current,
            type: v as LedgerEntry['type'],
            category: 'OTHER',
            driverId: '',
          }));
        }}
      />
      <Choice
        label={t('Category')}
        value={form.category}
        error={action.fieldErrors.category}
        optional={false}
        options={categories.map(value => ({
          value,
          label: t(categoryLabels[value]),
        }))}
        onChange={v => set('category', v)}
      />
      <Input
        label={t('Title *')}
        value={form.title}
        error={action.fieldErrors.title}
        onChangeText={v => set('title', v)}
        maxLength={120}
      />
      <Input
        label={t('Amount (৳) *')}
        value={form.amount}
        error={action.fieldErrors.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      <Input
        label={t('Date (YYYY-MM-DD)')}
        value={form.date}
        error={action.fieldErrors.date}
        onChangeText={v => set('date', v)}
        maxLength={10}
      />
      <Choice
        label={t('Vehicle (if applicable)')}
        value={form.vehicleId}
        error={action.fieldErrors.vehicleId}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: item.name,
        }))}
        onChange={v => set('vehicleId', v)}
      />
      {form.type === 'EXPENSE' ? (
        <Choice
          label={
            form.category === 'SALARY'
              ? t('Driver *')
              : t('Driver (if applicable)')
          }
          value={form.driverId}
          error={action.fieldErrors.driverId}
          onChange={v => set('driverId', v)}
          options={(data?.drivers || []).map(item => ({
            value: item.id,
            label: item.name,
          }))}
        />
      ) : null}
      <Input
        label={
          form.type === 'INVESTMENT'
            ? t('Investor / Purpose / Note')
            : t('Note')
        }
        value={form.note}
        error={action.fieldErrors.note}
        onChangeText={v => set('note', v)}
        multiline
        maxLength={2000}
      />
      {form.type === 'INCOME' ? (
        <Text style={s.note}>
          {t(
            'Paid student fares are added automatically from payments. Enter additional income here.',
          )}
        </Text>
      ) : null}
    </FormModal>
  );
}
