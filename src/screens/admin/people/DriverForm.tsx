import React, { useEffect, useState } from 'react';
import { Driver, DriverInput } from '../../../api/management';
import { useManagement } from '../../../context/ManagementContext';
import { useData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { ValidationError } from '../../../utils/validation';
import { Choice, FormModal, Input, today, useAction } from '../AdminUi';
import { validatedAmount } from './validatedAmount';

export function DriverForm({
  driver,
  visible,
  onClose,
}: {
  driver?: Driver;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: transport } = useData();
  const { mutate } = useManagement();
  const action = useAction();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    nid: '',
    address: '',
    joiningDate: today(),
    salary: '',
    vehicleId: '',
    status: 'ACTIVE' as Driver['status'],
  });
  useEffect(() => {
    if (visible) {
      action.clearFeedback();
      setForm(
        driver
          ? {
              name: driver.name,
              phone: driver.phone,
              nid: driver.nid,
              address: driver.address,
              joiningDate: driver.joiningDate,
              salary: String(driver.monthlySalary / 100),
              vehicleId: driver.vehicleId || '',
              status: driver.status,
            }
          : {
              name: '',
              phone: '',
              nid: '',
              address: '',
              joiningDate: today(),
              salary: '',
              vehicleId: '',
              status: 'ACTIVE',
            },
      );
    }
  }, [visible, driver?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: string) => {
    action.clearFieldError(key);
    if (key === 'salary') action.clearFieldError('monthlySalary');
    setForm(current => ({ ...current, [key]: value }));
  };
  return (
    <FormModal
      title={driver ? t('Edit driver details') : t('Add driver')}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          if (!form.name.trim() || !form.phone.trim())
            throw new ValidationError({
              ...(!form.name.trim() ? { name: 'Enter the driver name.' } : {}),
              ...(!form.phone.trim()
                ? { phone: 'Enter the mobile number.' }
                : {}),
            });
          const input: DriverInput = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            nid: form.nid,
            address: form.address,
            ...(form.joiningDate ? { joiningDate: form.joiningDate } : {}),
            monthlySalary:
              form.salary.trim() && Number(form.salary) !== 0
                ? validatedAmount(form.salary, 'monthlySalary')
                : 0,
            vehicleId: form.vehicleId || null,
            status: form.status,
          };
          await mutate(
            driver ? `/admin/drivers/${driver.id}` : '/admin/drivers',
            input,
            driver ? 'PATCH' : 'POST',
          );
          onClose();
        })
      }
    >
      <Input
        label={t('Name *')}
        value={form.name}
        error={action.fieldErrors.name}
        onChangeText={v => set('name', v)}
        maxLength={100}
      />
      <Input
        label={t('Mobile number *')}
        value={form.phone}
        error={action.fieldErrors.phone}
        onChangeText={v => set('phone', v)}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Input
        label={t('NID')}
        value={form.nid}
        error={action.fieldErrors.nid}
        onChangeText={v => set('nid', v)}
        keyboardType="number-pad"
        maxLength={20}
      />
      <Input
        label={t('Address')}
        value={form.address}
        error={action.fieldErrors.address}
        onChangeText={v => set('address', v)}
        multiline
        maxLength={400}
      />
      <Input
        label={t('Joining date (YYYY-MM-DD)')}
        value={form.joiningDate}
        error={action.fieldErrors.joiningDate}
        onChangeText={v => set('joiningDate', v)}
        maxLength={10}
      />
      <Choice
        label={t('Assigned vehicle')}
        value={form.vehicleId}
        error={action.fieldErrors.vehicleId}
        onChange={v => set('vehicleId', v)}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: `${item.name} · ${item.plate}`,
        }))}
      />
      <Input
        label={t('Monthly salary (৳)')}
        value={form.salary}
        error={action.fieldErrors.salary || action.fieldErrors.monthlySalary}
        onChangeText={v => set('salary', v)}
        keyboardType="decimal-pad"
      />
      <Choice
        label={t('Status')}
        value={form.status}
        error={action.fieldErrors.status}
        optional={false}
        onChange={v => set('status', v)}
        options={[
          { value: 'ACTIVE', label: t('Active') },
          { value: 'LEAVE', label: t('Leave') },
          { value: 'INACTIVE', label: t('Inactive') },
        ]}
      />
    </FormModal>
  );
}
