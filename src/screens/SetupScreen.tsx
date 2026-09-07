import { useTranslation } from '../i18n';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, Notice, Page, Select } from '../components/ui';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { toPoisha } from '../utils/format';
function AccountForm() {
  const { t } = useTranslation();
  const { data, mutate } = useData();
  const [method, setMethod] = useState('BKASH');
  const [number, setNumber] = useState(
    data.accounts.find(item => item.method === 'BKASH')?.number || '',
  );
  const [instructions, setInstructions] = useState(
    data.accounts.find(item => item.method === 'BKASH')?.instructions ||
      'Use Send Money to this personal account.',
  );
  const action = useAction();
  return (
    <Card>
      <Text style={styles.heading}>{t('Where guardians send money')}</Text>
      <Select
        label={t('Payment method')}
        value={method}
        onChange={value => {
          setMethod(value);
          const account = data.accounts.find(item => item.method === value);
          setNumber(account?.number || '');
          setInstructions(
            account?.instructions || 'Use Send Money to this personal account.',
          );
        }}
        options={[
          {
            value: 'BKASH',
            label: t('bKash'),
          },
          {
            value: 'ROCKET',
            label: t('Rocket'),
          },
        ]}
      />
      <Field
        label={t('Receiving account number')}
        value={number}
        onChangeText={setNumber}
        keyboardType="phone-pad"
        maxLength={12}
      />
      <Field
        label={t('Payment instructions')}
        value={instructions}
        onChangeText={setInstructions}
        multiline
        maxLength={300}
        hint={t('Specify Send Money or Payment and the account holder’s name.')}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Save payment number')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (
              !method ||
              !/^01[3-9]\d{8,9}$/.test(number) ||
              !instructions.trim()
            )
              throw new Error(
                'Select a method and enter a valid number and payment instructions.',
              );
            await mutate(
              `/admin/payment-accounts/${method}`,
              {
                number,
                instructions,
              },
              'PUT',
            );
          }, 'Payment details saved. Guardians can now use this number.');
        }}
      />
    </Card>
  );
}
function VehicleForm() {
  const { t } = useTranslation();
  const { mutate } = useData();
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [imei, setImei] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const action = useAction();
  return (
    <Card>
      <Text style={styles.heading}>{t('Add a vehicle')}</Text>
      <Field
        label={t('Vehicle name')}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <Field
        label={t('Registration plate')}
        value={plate}
        onChangeText={setPlate}
        maxLength={30}
      />
      <Field
        label={t('GPS device IMEI')}
        value={imei}
        onChangeText={setImei}
        keyboardType="number-pad"
        maxLength={17}
      />
      <Field
        label={t('Driver name (optional)')}
        value={driverName}
        onChangeText={setDriverName}
        maxLength={60}
      />
      <Field
        label={t('Driver phone (optional)')}
        value={driverPhone}
        onChangeText={setDriverPhone}
        keyboardType="phone-pad"
        maxLength={15}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Add vehicle')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!name.trim() || !plate.trim() || !/^\d{14,17}$/.test(imei))
              throw new Error(
                'Enter a vehicle name, plate and a 14–17 digit IMEI.',
              );
            await mutate('/vehicles', {
              name: name.trim(),
              plate: plate.trim(),
              imei,
              driverName,
              driverPhone,
            });
            setName('');
            setPlate('');
            setImei('');
            setDriverName('');
            setDriverPhone('');
          }, 'Vehicle added. You can now assign it to a route.');
        }}
      />
    </Card>
  );
}
function RouteForm() {
  const { t } = useTranslation();
  const { data, mutate } = useData();
  const [name, setName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [amount, setAmount] = useState('');
  const [stops, setStops] = useState('');
  const action = useAction();
  return (
    <Card>
      <Text style={styles.heading}>{t('Create a route')}</Text>
      <Field
        label={t('Route / road name')}
        value={name}
        onChangeText={setName}
        maxLength={100}
      />
      <Select
        label={t('Assigned vehicle')}
        value={vehicleId}
        onChange={setVehicleId}
        options={data.vehicles.map(item => ({
          value: item.id,
          label: item.name,
        }))}
      />
      <Field
        label={t('Monthly fee (৳)')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Field
        label={t('Pickup stops — one per line')}
        value={stops}
        onChangeText={setStops}
        multiline
        placeholder={t('Main gate\nCentral road\nSchool entrance')}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Create route')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            const stopNames = stops
              .split('\n')
              .map(value => value.trim())
              .filter(Boolean);
            if (name.trim().length < 2 || !vehicleId || !stopNames.length)
              throw new Error(
                'Enter a route name, select a vehicle and add at least one stop.',
              );
            await mutate('/admin/routes', {
              name: name.trim(),
              vehicleId,
              monthlyAmount: toPoisha(amount),
              stops: stopNames,
            });
            setName('');
            setVehicleId('');
            setAmount('');
            setStops('');
          }, 'Route created. Guardians can now apply for this route.');
        }}
      />
    </Card>
  );
}
export function SetupScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  return (
    <Page
      title={t('Service setup')}
      subtitle={t('Add payment details, vehicles and the routes you cover.')}
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <AccountForm key={JSON.stringify(data.accounts)} />
      <VehicleForm />
      <RouteForm />
    </Page>
  );
}
