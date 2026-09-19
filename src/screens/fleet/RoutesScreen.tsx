import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { NoorIcon, NoorCard } from '../../components/Noor';
import { Page, Button, Field, Empty } from '../../components/ui';
import { RouteForm } from '../../components/setup/SetupForms';
import { money, numberLabel } from '../../utils/format';
import { colors, styles } from '../../theme';
import { useTranslation } from '../../i18n';
import { f } from './styles';

export function NoorRoutesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Routes'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const { data: extra } = useManagement();
  const { session } = useAuth();
  const [query, setQuery] = useState(''),
    [adding, setAdding] = useState(false);
  return (
    <Page refresh={refresh} loading={loading} error={error}>
      <View style={f.toolbar}>
        <Text style={styles.heading}>{t('Routes')}</Text>
        {session?.user.role === 'ADMIN' ? (
          <Button
            title={adding ? t('Close') : t('+ Add')}
            onPress={() => setAdding(!adding)}
          />
        ) : null}
      </View>
      <Field
        label={t('Search routes')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('Route name')}
      />
      {adding ? (
        <RouteForm onAddVehicle={() => navigation.navigate('CreateVehicle')} />
      ) : null}
      {data.routes
        .filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()))
        .map(r => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('RouteDetails', { id: r.id })}
          >
            <NoorCard style={f.vehicleRow}>
              <View style={f.routeMark}>
                <NoorIcon name="route" color="#FFFFFF" size={23} />
              </View>
              <View style={f.flex}>
                <Text style={f.title}>{r.name}</Text>
                <Text style={f.sub}>
                  {r.stops
                    .map(s => s.name)
                    .slice(0, 2)
                    .join(' → ')}
                </Text>
                <Text style={f.sub}>
                  {r.fares?.length
                    ? `${t('Stop-to-stop monthly fares')} · `
                    : ''}
                  {r.vehicleName} ·{' '}
                  {extra
                    ? t('{{number}} people', {
                        number: numberLabel(
                          extra.students.filter(
                            s => s.routeId === r.id && s.status === 'ACTIVE',
                          ).length,
                        ),
                      })
                    : money(r.monthlyAmount)}
                </Text>
              </View>
              <NoorIcon name="chevron" size={20} color={colors.muted} />
            </NoorCard>
          </Pressable>
        ))}
      {!data.routes.length ? (
        <Empty
          title={t('No routes yet')}
          detail={t('Add routes, vehicles and pickup stops.')}
        />
      ) : null}
    </Page>
  );
}
