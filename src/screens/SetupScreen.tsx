import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, Notice, Page, Select } from '../components/ui';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { toPoisha } from '../utils/format';
function AccountForm() {
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
      <Text style={styles.heading}>Where guardians send money</Text>
      <Select
        label="Payment method"
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
          { value: 'BKASH', label: 'bKash' },
          { value: 'ROCKET', label: 'Rocket' },
        ]}
      />
      <Field
        label="Receiving account number"
        value={number}
        onChangeText={setNumber}
        keyboardType="phone-pad"
        maxLength={12}
      />
      <Field
        label="Payment instructions"
        value={instructions}
        onChangeText={setInstructions}
        multiline
        maxLength={300}
        hint="Specify Send Money or Payment and the account holder’s name."
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title="Save payment number"
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
              { number, instructions },
              'PUT',
            );
          }, 'Payment details saved. Guardians can now use this number.');
        }}
      />
    </Card>
  );
}
function VehicleForm() {
  const { mutate } = useData();
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [imei, setImei] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const action = useAction();
  return (
    <Card>
      <Text style={styles.heading}>Add a vehicle</Text>
      <Field
        label="Vehicle name"
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <Field
        label="Registration plate"
        value={plate}
        onChangeText={setPlate}
        maxLength={30}
      />
      <Field
        label="GPS device IMEI"
        value={imei}
        onChangeText={setImei}
        keyboardType="number-pad"
        maxLength={17}
      />
      <Field
        label="Driver name (optional)"
        value={driverName}
        onChangeText={setDriverName}
        maxLength={60}
      />
      <Field
        label="Driver phone (optional)"
        value={driverPhone}
        onChangeText={setDriverPhone}
        keyboardType="phone-pad"
        maxLength={15}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title="Add vehicle"
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
  const { data, mutate } = useData();
  const [name, setName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [amount, setAmount] = useState('');
  const [stops, setStops] = useState('');
  const action = useAction();
  return (
    <Card>
      <Text style={styles.heading}>Create a route</Text>
      <Field
        label="Route / road name"
        value={name}
        onChangeText={setName}
        maxLength={100}
      />
      <Select
        label="Assigned vehicle"
        value={vehicleId}
        onChange={setVehicleId}
        options={data.vehicles.map(item => ({
          value: item.id,
          label: item.name,
        }))}
      />
      <Field
        label="Monthly fee (৳)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Field
        label="Pickup stops — one per line"
        value={stops}
        onChangeText={setStops}
        multiline
        placeholder={'Main gate\nCentral road\nSchool entrance'}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title="Create route"
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
  const { data, loading, error, refresh } = useData();
  return (
    <Page
      title="Service setup"
      subtitle="Add payment details, vehicles and the routes you cover."
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
