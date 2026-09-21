import { ValidationError } from '../../utils/validation';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaymentImage } from '../PaymentImage';
import { readable } from '../../utils/format';
import { useCoreData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';
import { numberLabel, toPoisha } from '../../utils/format';
import { Button, Card, Empty, Field, Notice, Select } from '../ui';

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
  const { data, mutate } = useCoreData();
  const [method, setMethod] = useState('');
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { name: string; number: string; instructions: string; imageUrl: string }
    >
  >({});
  const account = data.accounts.find(item => item.method === method);
  const draft = drafts[method] ?? {
    name: account?.name ?? (account ? readable(account.method) : ''),
    number: account?.number ?? '',
    instructions: account?.instructions ?? '',
    imageUrl: account?.imageUrl ?? '',
  };
  const action = useAction();
  const update = (change: Partial<typeof draft>) => {
    Object.keys(change).forEach(action.clearFieldError);
    setDrafts(current => ({
      ...current,
      [method]: { ...(current[method] ?? draft), ...change },
    }));
  };
  return (
    <Card>
      <FormHeading
        title={t('Where guardians send money')}
        detail={t(
          'Add any payment method with its name, account number and QR image.',
        )}
      />
      <Select
        compact
        label={t('Payment method')}
        value={method}
        disabled={action.busy}
        onChange={value => {
          setMethod(value);
          action.clearFeedback();
        }}
        options={[
          { value: '', label: t('Add payment method') },
          ...data.accounts.map(item => ({
            value: item.method,
            label: item.name || readable(item.method),
          })),
        ]}
      />
      <Field
        label={t('Payment method name')}
        value={draft.name}
        maxLength={80}
        error={action.fieldErrors.name}
        editable={!action.busy}
        onChangeText={name => update({ name })}
      />
      <Field
        label={t('Receiving account number')}
        value={draft.number}
        maxLength={100}
        error={action.fieldErrors.number}
        editable={!action.busy}
        autoCorrect={false}
        onChangeText={number => update({ number })}
      />
      <Field
        label={t('Payment instructions')}
        value={draft.instructions}
        multiline
        maxLength={300}
        editable={!action.busy}
        onChangeText={instructions => update({ instructions })}
      />
      <PaymentImage
        label={t('Payment QR image')}
        value={draft.imageUrl}
        disabled={action.busy}
        onChange={imageUrl => update({ imageUrl })}
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Save payment method')}
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            const errors: Record<string, string> = {};
            if (!draft.name.trim())
              errors.name = 'Enter a payment method name.';
            if (!draft.number.trim())
              errors.number = 'Enter an account number.';
            if (Object.keys(errors).length) throw new ValidationError(errors);
            const key = method || `PAY_${Date.now()}`;
            await mutate(
              `/admin/payment-accounts/${key}`,
              {
                ...draft,
                name: draft.name.trim(),
                number: draft.number.trim(),
                instructions: draft.instructions.trim(),
              },
              'PUT',
            );
            setDrafts(current => {
              const next = { ...current };
              delete next[method];
              return next;
            });
            setMethod(key);
          }, 'Payment method saved.')
        }
      />
    </Card>
  );
}

export function VehicleForm() {
  const { t } = useTranslation();
  const { mutate } = useCoreData();
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
          error={action.fieldErrors.name}
          onChangeText={value => {
            action.clearFieldError('name');
            setName(value);
          }}
          maxLength={60}
          editable={!action.busy}
        />
        <Field
          label={t('Registration plate')}
          value={plate}
          error={action.fieldErrors.plate}
          onChangeText={value => {
            action.clearFieldError('plate');
            setPlate(value);
          }}
          maxLength={30}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!action.busy}
        />
        <Field
          label={t('GPS device IMEI')}
          value={imei}
          error={action.fieldErrors.imei}
          onChangeText={value => {
            action.clearFieldError('imei');
            setImei(value);
          }}
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
          error={action.fieldErrors.driverName}
          onChangeText={value => {
            action.clearFieldError('driverName');
            setDriverName(value);
          }}
          maxLength={60}
          editable={!action.busy}
        />
        <Field
          label={t('Driver phone (optional)')}
          value={driverPhone}
          error={action.fieldErrors.driverPhone}
          onChangeText={value => {
            action.clearFieldError('driverPhone');
            setDriverPhone(value);
          }}
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
            const errors: Record<string, string> = {};
            const message =
              'Enter a vehicle name, plate and a 14–17 digit IMEI.';
            if (!name.trim()) errors.name = message;
            if (!plate.trim()) errors.plate = message;
            if (!/^\d{14,17}$/.test(imei)) errors.imei = message;
            if (Object.keys(errors).length) throw new ValidationError(errors);
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
  const { data, mutate, loading } = useCoreData();
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
        detail={t(
          'Choose a vehicle and list boarding and destination stops in order. After creating the route, use Manage route fares to set each journey fee.',
        )}
      />
      <View style={form.group}>
        <Field
          label={t('Route / road name')}
          value={name}
          error={action.fieldErrors.name}
          onChangeText={value => {
            action.clearFieldError('name');
            setName(value);
          }}
          maxLength={100}
          editable={!action.busy}
        />
        <Select
          label={t('Assigned vehicle')}
          value={vehicleId}
          error={action.fieldErrors.vehicleId}
          onChange={value => {
            action.clearFieldError('vehicleId');
            setVehicleId(value);
          }}
          options={data.vehicles.map(item => ({
            value: item.id,
            label: `${item.name} · ${item.plate}`,
          }))}
          disabled={action.busy}
        />
        <Field
          label={t('Monthly fee (৳)')}
          value={amount}
          error={action.fieldErrors.monthlyAmount}
          onChangeText={value => {
            action.clearFieldError('monthlyAmount');
            setAmount(value);
          }}
          keyboardType="decimal-pad"
          maxLength={10}
          editable={!action.busy}
        />
      </View>
      <View style={form.dividedGroup}>
        <Field
          label={t('Pickup stops — one per line')}
          value={stops}
          error={action.fieldErrors.stops}
          onChangeText={value => {
            action.clearFieldError('stops');
            setStops(value);
          }}
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
            const errors: Record<string, string> = {};
            const message =
              'Enter a route name, select a vehicle and add at least one stop.';
            if (name.trim().length < 2) errors.name = message;
            if (!data.vehicles.some(vehicle => vehicle.id === vehicleId))
              errors.vehicleId = message;
            if (!stopNames.length) errors.stops = message;
            else if (
              stopNames.length > 50 ||
              new Set(stopNames).size !== stopNames.length
            )
              errors.stops =
                'Use different stop names, with no more than 50 stops.';
            let monthlyAmount = 0;
            try {
              monthlyAmount = toPoisha(amount);
            } catch (error) {
              errors.monthlyAmount = (error as Error).message;
            }
            if (Object.keys(errors).length) throw new ValidationError(errors);
            await mutate('/admin/routes', {
              name: name.trim(),
              vehicleId,
              monthlyAmount,
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
  sectionLabel: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  preview: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
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
});
