import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Route, RouteFare } from '../api/types';
import { useDataActions } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { money, toPoisha } from '../utils/format';
import { Button, Card, Field, Select } from './ui';
import { FormModal, useAction } from '../screens/admin/AdminUi';
import { styles } from '../theme';
import { ValidationError } from '../utils/validation';

function fareAmount(value: string, field: string) {
  try {
    return toPoisha(value);
  } catch (problem) {
    throw new ValidationError({ [field]: (problem as Error).message });
  }
}

type FareDraft = Omit<RouteFare, 'monthlyAmount'> & { amount: string };

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
  const [visible, setVisible] = useState(false);
  const [fares, setFares] = useState<FareDraft[]>([]);
  const [boardingStopId, setBoardingStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [amount, setAmount] = useState('');
  const stopName = (id: string) =>
    route.stops.find(stop => stop.id === id)?.name || id;
  const open = () => {
    setFares(
      (route.fares || []).map(fare => ({
        ...fare,
        amount: String(fare.monthlyAmount / 100),
      })),
    );
    setBoardingStopId('');
    setDropoffStopId('');
    setAmount('');
    action.clearFeedback();
    setVisible(true);
  };
  return (
    <Card>
      <Text style={styles.heading}>{t('Stop-to-stop monthly fares')}</Text>
      <Text style={styles.body}>{route.name}</Text>
      <Text style={styles.muted}>
        {t('Default monthly fee')}: {money(route.monthlyAmount)}
      </Text>
      {(route.fares || []).map(fare => (
        <Text
          key={`${fare.boardingStopId}:${fare.dropoffStopId}`}
          style={styles.body}
        >
          {stopName(fare.boardingStopId)} → {stopName(fare.dropoffStopId)} ·{' '}
          {money(fare.monthlyAmount)}
        </Text>
      ))}
      {!route.fares?.length ? (
        <Text style={styles.muted}>
          {t(
            'No stop-to-stop fares yet. The default fee applies without an end point.',
          )}
        </Text>
      ) : null}
      {editable ? (
        <>
          <Button title={t('Manage route fares')} secondary onPress={open} />
          <FormModal
            title={t('Manage route fares')}
            visible={visible}
            onClose={() => setVisible(false)}
            busy={action.busy}
            error={action.error}
            saveTitle="Save fares"
            onSave={() =>
              action.run(async () => {
                if (boardingStopId || dropoffStopId || amount.trim())
                  throw new ValidationError({
                    ...(boardingStopId
                      ? {
                          boardingStopId:
                            'Add the entered fare before saving, or clear its fields.',
                        }
                      : {}),
                    ...(dropoffStopId
                      ? {
                          dropoffStopId:
                            'Add the entered fare before saving, or clear its fields.',
                        }
                      : {}),
                    ...(amount.trim()
                      ? {
                          amount:
                            'Add the entered fare before saving, or clear its fields.',
                        }
                      : {}),
                  });
                await mutate(
                  `/admin/routes/${route.id}/fares`,
                  {
                    fares: fares.map(({ amount: value, ...fare }, index) => ({
                      ...fare,
                      monthlyAmount: fareAmount(
                        value,
                        `fares.${index}.monthlyAmount`,
                      ),
                    })),
                  },
                  'PUT',
                );
                setVisible(false);
              })
            }
          >
            <Text style={styles.heading}>{route.name}</Text>
            <Text style={styles.muted}>
              {t(
                'Set a monthly fee for each start and end point pair. The reverse journey needs its own fare.',
              )}
            </Text>
            <Text style={styles.muted}>
              {t(
                'Fare changes apply to new assignments. Existing student fees and bills stay unchanged until their journey changes.',
              )}
            </Text>
            {fares.map((fare, index) => (
              <View
                key={`${fare.boardingStopId}:${fare.dropoffStopId}`}
                style={styles.section}
              >
                <Field
                  label={`${stopName(fare.boardingStopId)} → ${stopName(
                    fare.dropoffStopId,
                  )} (৳)`}
                  value={fare.amount}
                  error={action.fieldErrors[`fares.${index}.monthlyAmount`]}
                  keyboardType="decimal-pad"
                  editable={!action.busy}
                  onChangeText={value => {
                    action.clearFieldError(`fares.${index}.monthlyAmount`);
                    setFares(current =>
                      current.map((item, i) =>
                        i === index ? { ...item, amount: value } : item,
                      ),
                    );
                  }}
                />
                <Button
                  title={t('Remove fare')}
                  secondary
                  disabled={action.busy}
                  onPress={() => {
                    action.clearFeedback();
                    setFares(current => current.filter((_, i) => i !== index));
                  }}
                />
              </View>
            ))}
            {route.stops.length < 2 ? (
              <Text style={styles.muted}>
                {t(
                  'This route needs at least two stops. Create a route with start and end points first.',
                )}
              </Text>
            ) : null}
            <Select
              label={t('Start point')}
              value={boardingStopId}
              error={action.fieldErrors.boardingStopId}
              disabled={action.busy}
              onChange={value => {
                action.clearFieldError('boardingStopId');
                action.clearFieldError('dropoffStopId');
                setBoardingStopId(value);
                setDropoffStopId('');
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
            <Button
              title={t('Add fare')}
              disabled={action.busy || route.stops.length < 2}
              onPress={() =>
                action.run(async () => {
                  if (
                    !boardingStopId ||
                    !dropoffStopId ||
                    boardingStopId === dropoffStopId
                  )
                    throw new ValidationError({
                      ...(!boardingStopId
                        ? { boardingStopId: 'Select a start point.' }
                        : {}),
                      ...(!dropoffStopId || boardingStopId === dropoffStopId
                        ? {
                            dropoffStopId: 'Select a different end point.',
                          }
                        : {}),
                    });
                  fareAmount(amount, 'amount');
                  if (
                    fares.some(
                      fare =>
                        fare.boardingStopId === boardingStopId &&
                        fare.dropoffStopId === dropoffStopId,
                    )
                  )
                    throw new ValidationError({
                      dropoffStopId:
                        'This journey already has a fare. Edit its amount above.',
                    });
                  setFares(current => [
                    ...current,
                    { boardingStopId, dropoffStopId, amount },
                  ]);
                  setBoardingStopId('');
                  setDropoffStopId('');
                  setAmount('');
                })
              }
            />
          </FormModal>
        </>
      ) : null}
    </Card>
  );
}
