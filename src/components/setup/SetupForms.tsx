import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaymentAccount } from '../../api/types';
import { useData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';
import { numberLabel, toPoisha } from '../../utils/format';
import { Button, Card, Empty, Field, Notice, Select } from '../ui';

type Wallet = PaymentAccount['method'];
type AccountDraft = Pick<PaymentAccount, 'number' | 'instructions'>;

function FormHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={form.heading}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      <Text style={styles.muted}>{detail}</Text>
    </View>
  );
}

export function AccountForm() {
  const { t } = useTranslation();
  const { data, mutate } = useData();
  const [method, setMethod] = useState<Wallet>('BKASH');
  // Only edited wallets have overrides, so refreshes still populate untouched forms.
  const [drafts, setDrafts] = useState<Partial<Record<Wallet, AccountDraft>>>(
    {},
  );
  const [resultMethod, setResultMethod] = useState<Wallet | null>(null);
  const account = data.accounts.find(item => item.method === method);
  const draft = drafts[method] ?? {
    number: account?.number ?? '',
    instructions:
      account?.instructions ?? t('Use Send Money to this personal account.'),
  };
  const action = useAction();
  const updateDraft = (change: Partial<AccountDraft>) => {
    setDrafts(current => ({
      ...current,
      [method]: { ...(current[method] ?? draft), ...change },
    }));
    setResultMethod(null);
  };

  return (
    <Card>
      <FormHeading
        title={t('Where guardians send money')}
        detail={t('Choose a wallet and save its receiving details.')}
      />
      <View style={form.group}>
        <Text style={form.fieldLabel}>{t('Payment method')}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('Payment method')}
          style={form.wallets}
        >
          {(['BKASH', 'ROCKET'] as const).map(wallet => (
            <Pressable
              key={wallet}
              accessibilityRole="radio"
              accessibilityLabel={wallet === 'BKASH' ? t('bKash') : t('Rocket')}
              accessibilityState={{
                checked: method === wallet,
                disabled: action.busy,
              }}
              disabled={action.busy}
              onPress={() => setMethod(wallet)}
              style={({ pressed }) => [
                form.wallet,
                method === wallet && form.walletSelected,
                action.busy && form.disabled,
                pressed && form.pressed,
              ]}
            >
              <Text
                style={[
                  form.walletName,
                  method === wallet && form.walletNameSelected,
                ]}
              >
                {wallet === 'BKASH' ? t('bKash') : t('Rocket')}
              </Text>
              <View
                accessible={false}
                style={[form.radio, method === wallet && form.radioSelected]}
              >
                {method === wallet ? <View style={form.radioDot} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      {account ? (
        <View style={form.preview}>
          <Text style={form.sectionLabel}>{t('Current receiving number')}</Text>
          <Text selectable style={form.accountNumber}>
            {account.number}
          </Text>
          <Text style={styles.muted}>{t('Visible to guardians')}</Text>
        </View>
      ) : null}
      <Field
        label={t('Receiving account number')}
        value={draft.number}
        onChangeText={number => updateDraft({ number })}
        keyboardType="phone-pad"
        autoCorrect={false}
        maxLength={12}
        editable={!action.busy}
      />
      <Field
        label={t('Payment instructions')}
        value={draft.instructions}
        onChangeText={instructions => updateDraft({ instructions })}
        multiline
        maxLength={300}
        editable={!action.busy}
        hint={t('Specify Send Money or Payment and the account holder’s name.')}
      />
      <Notice text={resultMethod === method ? action.error : ''} kind="error" />
      <Notice text={resultMethod === method ? action.success : ''} />
      <Button
        title={t('Save payment number')}
        busy={action.busy}
        onPress={() => {
          setResultMethod(method);
          action.run(async () => {
            const number = draft.number.trim();
            const instructions = draft.instructions.trim();
            if (!/^01[3-9]\d{8,9}$/.test(number) || !instructions) {
              throw new Error(
                'Select a method and enter a valid number and payment instructions.',
              );
            }
            await mutate(
              `/admin/payment-accounts/${method}`,
              { number, instructions },
              'PUT',
            );
            setDrafts(current => {
              const next = { ...current };
              delete next[method];
              return next;
            });
          }, 'Payment details saved. Guardians can now use this number.');
        }}
      />
    </Card>
  );
}

export function VehicleForm() {
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
      <FormHeading
        title={t('Add a vehicle')}
        detail={t('Register the vehicle and connect its GPS device.')}
      />
      <View style={form.group}>
        <Field
          label={t('Vehicle name')}
          value={name}
          onChangeText={setName}
          maxLength={60}
          editable={!action.busy}
        />
        <Field
          label={t('Registration plate')}
          value={plate}
          onChangeText={setPlate}
          maxLength={30}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!action.busy}
        />
        <Field
          label={t('GPS device IMEI')}
          value={imei}
          onChangeText={setImei}
          keyboardType="number-pad"
          maxLength={17}
          hint={t('Find the 14–17 digit number on your GPS device.')}
          editable={!action.busy}
        />
      </View>
      <View style={form.dividedGroup}>
        <Text accessibilityRole="header" style={form.sectionLabel}>
          {t('Driver details')}
        </Text>
        <Field
          label={t('Driver name (optional)')}
          value={driverName}
          onChangeText={setDriverName}
          maxLength={60}
          editable={!action.busy}
        />
        <Field
          label={t('Driver phone (optional)')}
          value={driverPhone}
          onChangeText={setDriverPhone}
          keyboardType="phone-pad"
          maxLength={15}
          editable={!action.busy}
        />
      </View>
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Add vehicle')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!name.trim() || !plate.trim() || !/^\d{14,17}$/.test(imei)) {
              throw new Error(
                'Enter a vehicle name, plate and a 14–17 digit IMEI.',
              );
            }
            await mutate('/vehicles', {
              name: name.trim(),
              plate: plate.trim(),
              imei,
              driverName: driverName.trim(),
              driverPhone: driverPhone.trim(),
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

export function RouteForm({ onAddVehicle }: { onAddVehicle: () => void }) {
  const { t } = useTranslation();
  const { data, mutate, loading } = useData();
  const [name, setName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [amount, setAmount] = useState('');
  const [stops, setStops] = useState('');
  const action = useAction();
  const stopNames = stops
    .split('\n')
    .map(value => value.trim())
    .filter(Boolean);

  if (!data.vehicles.length) {
    return (
      <View style={styles.section}>
        <Empty
          title={loading ? t('Loading vehicles…') : t('Add a vehicle first')}
          detail={t(
            'Each route needs a vehicle. Add one to start creating routes.',
          )}
        />
        <Button title={t('Add vehicle')} secondary onPress={onAddVehicle} />
      </View>
    );
  }

  return (
    <Card>
      <FormHeading
        title={t('Create a route')}
        detail={t('Choose a vehicle, set the fee and add pickup stops.')}
      />
      <View style={form.group}>
        <Field
          label={t('Route / road name')}
          value={name}
          onChangeText={setName}
          maxLength={100}
          editable={!action.busy}
        />
        <Select
          label={t('Assigned vehicle')}
          value={vehicleId}
          onChange={setVehicleId}
          options={data.vehicles.map(item => ({
            value: item.id,
            label: `${item.name} · ${item.plate}`,
          }))}
          disabled={action.busy}
        />
        <Field
          label={t('Monthly fee (৳)')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          maxLength={10}
          editable={!action.busy}
        />
      </View>
      <View style={form.dividedGroup}>
        <Field
          label={t('Pickup stops — one per line')}
          value={stops}
          onChangeText={setStops}
          multiline
          placeholder={t('Main gate\nCentral road\nSchool entrance')}
          hint={t('List stops in the order the vehicle visits them.')}
          editable={!action.busy}
        />
        {stopNames.length ? (
          <View style={form.preview}>
            <Text style={form.sectionLabel}>
              {t('Pickup order')} · {numberLabel(stopNames.length)}
            </Text>
            {stopNames.slice(0, 5).map((stop, index) => (
              <View key={index} style={form.stop}>
                <View style={form.stopNumber}>
                  <Text style={form.stopNumberText}>
                    {numberLabel(index + 1)}
                  </Text>
                </View>
                <Text style={form.stopName}>{stop}</Text>
              </View>
            ))}
            {stopNames.length > 5 ? (
              <Text style={styles.muted}>
                {t('And {{number}} more stops', {
                  number: numberLabel(stopNames.length - 5),
                })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Create route')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (
              name.trim().length < 2 ||
              !data.vehicles.some(vehicle => vehicle.id === vehicleId) ||
              !stopNames.length
            ) {
              throw new Error(
                'Enter a route name, select a vehicle and add at least one stop.',
              );
            }
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

const form = StyleSheet.create({
  heading: { gap: 6, paddingBottom: 4 },
  group: { gap: 16 },
  dividedGroup: {
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 18,
    marginTop: 4,
  },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  sectionLabel: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  wallets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wallet: {
    flex: 1,
    minWidth: 108,
    minHeight: 60,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  walletSelected: { backgroundColor: colors.mint, borderColor: colors.primary },
  walletName: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  walletNameSelected: { color: colors.primary },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: colors.muted,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  preview: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  accountNumber: { color: colors.ink, fontSize: 23, fontWeight: '700' },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopNumber: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  stopName: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 21 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
