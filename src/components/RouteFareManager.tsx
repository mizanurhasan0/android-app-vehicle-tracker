import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { Route, RouteFare } from '../api/types';
import { useDataActions } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { money, toPoisha } from '../utils/format';
import { Button, Card, Field, Select } from './ui';
import { useAction } from '../screens/admin/AdminUi';
import { ValidationError } from '../utils/validation';

function fareAmount(value: string, field: string) {
  try {
    return toPoisha(value);
  } catch (problem) {
    throw new ValidationError({ [field]: (problem as Error).message });
  }
}

type FareDraft = Omit<RouteFare, 'monthlyAmount'> & { amount: string };

function routeFares(route: Route): FareDraft[] {
  return (route.fares || []).map(fare => ({
    ...fare,
    amount: String(fare.monthlyAmount / 100),
  }));
}

export function RouteFareManager({
  route,
  editable = false,
}: {
  route: Route;
  editable?: boolean;
}) {
  const { t } = useTranslation();
  const { mutate } = useDataActions();
  const action = useAction();
  const [fares, setFares] = useState<FareDraft[]>(() => routeFares(route));
  const [boardingStopId, setBoardingStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [amount, setAmount] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const stopName = (id: string) =>
    route.stops.find(stop => stop.id === id)?.name || id;

  const clearForm = () => {
    setBoardingStopId('');
    setDropoffStopId('');
    setAmount('');
    setEditingIndex(null);
    action.clearFeedback();
  };

  const addOrUpdate = () =>
    action.run(async () => {
      if (!boardingStopId || !dropoffStopId || boardingStopId === dropoffStopId)
        throw new ValidationError({
          ...(!boardingStopId
            ? { boardingStopId: 'Select a start point.' }
            : {}),
          ...(!dropoffStopId || boardingStopId === dropoffStopId
            ? { dropoffStopId: 'Select a different end point.' }
            : {}),
        });
      fareAmount(amount, 'amount');
      const matchingIndex = fares.findIndex(
        fare =>
          fare.boardingStopId === boardingStopId &&
          fare.dropoffStopId === dropoffStopId,
      );
      if (matchingIndex >= 0 && matchingIndex !== editingIndex)
        throw new ValidationError({
          dropoffStopId:
            'This journey already has a fare. Edit its amount in the table.',
        });
      const next = { boardingStopId, dropoffStopId, amount };
      setFares(current =>
        editingIndex === null
          ? [...current, next]
          : current.map((fare, index) =>
              index === editingIndex ? next : fare,
            ),
      );
      clearForm();
    });

  const save = () =>
    action.run(async () => {
      await mutate(
        `/admin/routes/${route.id}/fares`,
        {
          fares: fares.map(({ amount: value, ...fare }, index) => ({
            ...fare,
            monthlyAmount: fareAmount(value, `fares.${index}.monthlyAmount`),
          })),
        },
        'PUT',
      );
      clearForm();
    });

  return (
    <Card>
      <View style={ui.heading}>
        <View>
          <Text style={ui.title}>{t('Monthly transport fees')}</Text>
          <Text style={ui.routeName}>{route.name}</Text>
        </View>
        <Text style={ui.defaultFee}>{money(route.monthlyAmount)}</Text>
      </View>

      {editable ? (
        <View style={ui.form}>
          <Text style={ui.formTitle}>
            {editingIndex === null
              ? t('Add transport fee')
              : t('Edit transport fee')}
          </Text>
          <Select
            label={t('Start point')}
            value={boardingStopId}
            error={action.fieldErrors.boardingStopId}
            disabled={action.busy}
            onChange={value => {
              action.clearFieldError('boardingStopId');
              action.clearFieldError('dropoffStopId');
              setBoardingStopId(value);
              if (value === dropoffStopId) setDropoffStopId('');
            }}
            options={route.stops.map(stop => ({
              value: stop.id,
              label: stop.name,
            }))}
          />
          <Select
            label={t('End point')}
            value={dropoffStopId}
            error={action.fieldErrors.dropoffStopId}
            disabled={action.busy}
            onChange={value => {
              action.clearFieldError('dropoffStopId');
              setDropoffStopId(value);
            }}
            options={route.stops
              .filter(stop => stop.id !== boardingStopId)
              .map(stop => ({ value: stop.id, label: stop.name }))}
          />
          <Field
            label={t('Journey monthly fee (৳)')}
            value={amount}
            error={action.fieldErrors.amount}
            onChangeText={value => {
              action.clearFieldError('amount');
              setAmount(value);
            }}
            keyboardType="decimal-pad"
            editable={!action.busy}
          />
          <View style={ui.formActions}>
            <Button
              title={editingIndex === null ? t('Add fare') : t('Update fare')}
              disabled={action.busy || route.stops.length < 2}
              onPress={addOrUpdate}
            />
            {editingIndex !== null ? (
              <Button title={t('Cancel')} secondary onPress={clearForm} />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={ui.table}>
        <View style={ui.tableHeader}>
          <Text style={[ui.headerCell, ui.journeyCell]}>{t('Journey')}</Text>
          <Text style={[ui.headerCell, ui.amountCell]}>{t('Amount')}</Text>
          {editable ? <View style={ui.actionCell} /> : null}
        </View>
        {fares.length ? (
          fares.map((fare, index) => (
            <View
              key={`${fare.boardingStopId}:${fare.dropoffStopId}`}
              style={ui.tableRow}
            >
              <Text style={[ui.bodyCell, ui.journeyCell]} numberOfLines={1}>
                {stopName(fare.boardingStopId)} → {stopName(fare.dropoffStopId)}
              </Text>
              <Text style={[ui.bodyCell, ui.amountCell]}>
                {money(fareAmount(fare.amount, `fares.${index}.monthlyAmount`))}
              </Text>
              {editable ? (
                <View style={ui.actionCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Edit transport fee')}: ${stopName(
                      fare.boardingStopId,
                    )} to ${stopName(fare.dropoffStopId)}`}
                    onPress={() => {
                      action.clearFeedback();
                      setBoardingStopId(fare.boardingStopId);
                      setDropoffStopId(fare.dropoffStopId);
                      setAmount(fare.amount);
                      setEditingIndex(index);
                    }}
                    style={ui.iconButton}
                  >
                    <Pencil size={16} color="#00735A" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Remove fare')}: ${stopName(
                      fare.boardingStopId,
                    )} to ${stopName(fare.dropoffStopId)}`}
                    onPress={() => {
                      setFares(current =>
                        current.filter((_, item) => item !== index),
                      );
                      if (editingIndex === index) clearForm();
                    }}
                    style={ui.iconButton}
                  >
                    <Trash2 size={16} color="#C73737" />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={ui.empty}>{t('No stop-to-stop fares yet.')}</Text>
        )}
      </View>
      {editable ? (
        <Button
          title={t('Save monthly fees')}
          disabled={action.busy}
          onPress={save}
        />
      ) : null}
    </Card>
  );
}

const ui = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { color: '#14283D', fontSize: 16, fontWeight: '800' },
  routeName: { color: '#65798C', fontSize: 13, marginTop: 4 },
  defaultFee: { color: '#00735A', fontSize: 18, fontWeight: '800' },
  form: { gap: 10, marginTop: 14 },
  formTitle: { color: '#14283D', fontSize: 14, fontWeight: '700' },
  formActions: { flexDirection: 'row', gap: 8 },
  table: {
    borderColor: '#E2ECEA',
    borderWidth: 1,
    borderRadius: 9,
    overflow: 'hidden',
    marginTop: 16,
  },
  tableHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F4',
    paddingHorizontal: 10,
  },
  tableRow: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: '#E6EEEE',
    borderTopWidth: 1,
    paddingHorizontal: 10,
  },
  headerCell: { color: '#5B7284', fontSize: 11, fontWeight: '700' },
  bodyCell: { color: '#233C52', fontSize: 12 },
  journeyCell: { flex: 1 },
  amountCell: { width: 72, textAlign: 'right' },
  actionCell: {
    width: 58,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 2,
  },
  iconButton: {
    width: 27,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: '#6B8090', fontSize: 12, padding: 12 },
});
