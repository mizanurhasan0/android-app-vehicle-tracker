import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import { Vehicle } from '../api/types';
import { ScheduleInput } from '../api/management';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useManagement } from '../context/ManagementContext';
import { ValidationError } from '../utils/validation';
import { useAction } from '../hooks/useAction';
import { NoorIcon, NoorCard, NoorBadge, NoorSection } from '../components/Noor';
import { Page, Button, Field, Select, Notice, Empty } from '../components/ui';
import { VehicleEditSheet } from '../components/VehicleEditSheet';
import { RouteFareManager } from '../components/RouteFareManager';
import { RouteForm } from '../components/setup/SetupForms';
import { money, numberLabel } from '../utils/format';
import { colors, styles } from '../theme';
import {
  isServiceScheduled,
  serviceShift,
  transportShifts,
  uniqueStudents,
} from '../utils/transport';
import { dhakaDate } from '../utils/historyDates';
import { locale, useTranslation } from '../i18n';

function fleetDate(value?: string | null) {
  if (!value) return value;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+06:00` : value,
  );
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      });
}

function scheduleTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  return new Date(`2000-01-01T${value}:00+06:00`).toLocaleTimeString(locale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dhaka',
  });
}

function VehicleMark() {
  return (
    <View style={f.vehicleMark}>
      <NoorIcon name="vehicles" color="#CE9F1B" size={35} />
    </View>
  );
}
function VehicleStatus({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  return (
    <NoorBadge
      label={
        vehicle.status === 'MAINTENANCE'
          ? t('Maintenance')
          : vehicle.status === 'INACTIVE'
          ? t('Inactive')
          : t('Running')
      }
      tone={
        vehicle.status === 'MAINTENANCE'
          ? 'red'
          : vehicle.status === 'INACTIVE'
          ? 'gray'
          : 'green'
      }
    />
  );
}
export function NoorVehiclesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Vehicles'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const vehicles = data.vehicles.filter(v =>
    `${v.name} ${v.plate} ${v.driverName}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <Page loading={loading} error={error} refresh={refresh}>
      <View style={f.toolbar}>
        <Text style={styles.heading}>{t('Vehicle list')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Live location map')}
          onPress={() => navigation.navigate('FleetMap')}
          style={({ pressed }) => [f.mapButton, pressed && f.pressed]}
        >
          <NoorIcon name="pin" size={19} color={colors.primary} />
        </Pressable>
      </View>
      <View style={f.searchToolbar}>
        <View style={f.searchBox}>
          <NoorIcon name="search" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel={t('Search vehicles')}
            value={query}
            onChangeText={setQuery}
            placeholder={t('Search name, plate or driver')}
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            returnKeyType="search"
            style={f.searchInput}
          />
        </View>
        {session?.user.role === 'ADMIN' ? (
          <Button
            title={t('+ Add')}
            onPress={() => navigation.navigate('CreateVehicle')}
          />
        ) : null}
      </View>
      <NoorCard style={f.list}>
        {vehicles.map(vehicle => (
          <Pressable
            key={vehicle.id}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('VehicleDetails', { id: vehicle.id })
            }
            style={f.vehicleRow}
          >
            <VehicleMark />
            <View style={f.flex}>
              <Text style={f.title}>{vehicle.name}</Text>
              <Text style={f.sub}>{vehicle.plate}</Text>
              <Text style={f.sub}>
                {t('Driver: {{name}}', {
                  name: vehicle.driverName || t('Not assigned'),
                })}
              </Text>
            </View>
            <VehicleStatus vehicle={vehicle} />
          </Pressable>
        ))}
      </NoorCard>
      {!vehicles.length ? (
        <Empty
          title={t('No matching vehicles')}
          detail={
            loading
              ? t('Loading data…')
              : t('Add a vehicle or search for another name.')
          }
        />
      ) : null}
    </Page>
  );
}
export function VehicleDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'VehicleDetails'>) {
  const { t } = useTranslation();
  const core = useData(),
    management = useManagement(),
    { session } = useAuth();
  const [editing, setEditing] = useState(false),
    [metadata, setMetadata] = useState(false);
  const vehicle = core.data.vehicles.find(v => v.id === route.params.id);
  if (!vehicle)
    return (
      <Page>
        <Empty
          title={t('Vehicle not found')}
          detail={t('Return to the list and try again.')}
        />
      </Page>
    );
  const schedules =
    management.data?.schedules.filter(s =>
      core.data.routes.some(
        r => r.id === s.routeId && r.vehicleId === vehicle.id,
      ),
    ) || [];
  const routes = core.data.routes.filter(r => r.vehicleId === vehicle.id);
  const students =
    management.data?.students.filter(
      s => s.vehicleId === vehicle.id && s.status === 'ACTIVE',
    ) || [];
  const admin = session?.user.role === 'ADMIN';
  return (
    <Page
      refresh={async () => {
        await Promise.all([core.refresh(), management.refresh()]);
      }}
      loading={core.loading || management.loading}
      error={core.error || management.error}
    >
      <NoorCard>
        <View style={f.vehicleRow}>
          <VehicleMark />
          <View style={f.flex}>
            <Text style={f.title}>{vehicle.plate}</Text>
            <VehicleStatus vehicle={vehicle} />
          </View>
          {admin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Edit vehicle')}
              onPress={() => setEditing(true)}
              style={f.iconButton}
            >
              <NoorIcon name="edit" />
            </Pressable>
          ) : null}
        </View>
        <Detail icon="driver" label={t('Driver')} value={vehicle.driverName} />
        <Detail
          icon="route"
          label={t('Route')}
          value={routes.map(r => r.name).join(', ')}
        />
        <Detail
          icon="students"
          label={t('Student count')}
          value={
            management.data ? numberLabel(uniqueStudents(students).length) : '—'
          }
        />
        <Detail icon="vehicle" label={t('Model')} value={vehicle.model} />
        <Detail
          icon="calendar"
          label={t('Purchase date')}
          value={fleetDate(vehicle.purchaseDate)}
        />
        <Detail
          icon="document"
          label={t('License renewal')}
          value={fleetDate(vehicle.licenseExpiresAt)}
        />
        <Detail
          icon="document"
          label={t('Fitness expiry')}
          value={fleetDate(vehicle.fitnessExpiresAt)}
        />
        {admin ? (
          <Button
            title={
              metadata ? t('Close') : t('Edit vehicle documents and status')
            }
            secondary
            onPress={() => setMetadata(!metadata)}
          />
        ) : null}
        {metadata && admin ? (
          <VehicleMetadata
            vehicle={vehicle}
            onDone={() => setMetadata(false)}
          />
        ) : null}
        <NoorSection title={t('Daily schedule')}>
          {schedules.length ? (
            schedules.map(s => (
              <Detail
                key={s.id}
                icon="clock"
                label={`${
                  s.period === 'MORNING' ? t('Morning') : t('Afternoon')
                } · ${s.label}`}
                value={scheduleTime(s.time)}
              />
            ))
          ) : (
            <Text style={f.sub}>{t('No schedule has been added yet.')}</Text>
          )}
        </NoorSection>
        <View style={f.actionRow}>
          <View style={f.flex}>
            <Button
              title={t('Live location')}
              onPress={() =>
                navigation.navigate('LiveTracking', { vehicleId: vehicle.id })
              }
            />
          </View>
          {admin ? (
            <View style={f.flex}>
              <Button
                title={t('Maintenance')}
                onPress={() =>
                  navigation.navigate('Maintenance', { vehicleId: vehicle.id })
                }
              />
            </View>
          ) : null}
        </View>
        {admin ? (
          <>
            <Button
              title={t('Fuel / expenses')}
              secondary
              onPress={() =>
                navigation.navigate('Accounts', { tab: 'EXPENSE' })
              }
            />
            <Button
              title={t('Travel history')}
              secondary
              onPress={() =>
                navigation.navigate('VehicleHistory', {
                  imei: vehicle.imei,
                  name: vehicle.name,
                })
              }
            />
          </>
        ) : null}
      </NoorCard>
      <VehicleEditSheet
        vehicle={editing ? vehicle : null}
        onClose={() => setEditing(false)}
        onSaved={async () => {
          await Promise.all([core.refresh(), management.refresh()]);
        }}
      />
    </Page>
  );
}
function VehicleMetadata({
  vehicle,
  onDone,
}: {
  vehicle: Vehicle;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { mutate } = useData();
  const action = useAction();
  const [model, setModel] = useState(vehicle.model || ''),
    [purchaseDate, setPurchaseDate] = useState(vehicle.purchaseDate || ''),
    [fitnessExpiresAt, setFitness] = useState(vehicle.fitnessExpiresAt || ''),
    [licenseExpiresAt, setLicense] = useState(vehicle.licenseExpiresAt || ''),
    [status, setStatus] = useState(vehicle.status || 'RUNNING');
  return (
    <NoorCard>
      <Field
        label={t('Model')}
        value={model}
        error={action.fieldErrors.model}
        onChangeText={value => {
          action.clearFieldError('model');
          setModel(value);
        }}
        maxLength={100}
      />
      <Field
        label={t('Purchase date (YYYY-MM-DD)')}
        value={purchaseDate}
        error={action.fieldErrors.purchaseDate}
        onChangeText={value => {
          action.clearFieldError('purchaseDate');
          setPurchaseDate(value);
        }}
        maxLength={10}
      />
      <Field
        label={t('Fitness expiry (YYYY-MM-DD)')}
        value={fitnessExpiresAt}
        error={action.fieldErrors.fitnessExpiresAt}
        onChangeText={value => {
          action.clearFieldError('fitnessExpiresAt');
          setFitness(value);
        }}
        maxLength={10}
      />
      <Field
        label={t('License expiry (YYYY-MM-DD)')}
        value={licenseExpiresAt}
        error={action.fieldErrors.licenseExpiresAt}
        onChangeText={value => {
          action.clearFieldError('licenseExpiresAt');
          setLicense(value);
        }}
        maxLength={10}
      />
      <Select
        label={t('Status')}
        value={status}
        error={action.fieldErrors.status}
        onChange={v => {
          action.clearFieldError('status');
          setStatus(v as Vehicle['status'] & string);
        }}
        options={[
          { value: 'RUNNING', label: t('Running') },
          { value: 'MAINTENANCE', label: t('Maintenance') },
          { value: 'INACTIVE', label: t('Inactive') },
        ]}
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Save')}
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            await mutate(
              `/vehicles/${vehicle.id}`,
              {
                model,
                purchaseDate,
                fitnessExpiresAt,
                licenseExpiresAt,
                status,
              },
              'PATCH',
            );
            onDone();
          })
        }
      />
    </NoorCard>
  );
}
function Detail({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={f.detail}>
      <NoorIcon name={icon} size={17} />
      <Text style={f.detailLabel}>{label}</Text>
      <Text style={f.detailValue}>{value || t('Not added')}</Text>
    </View>
  );
}
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
export function RouteDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'RouteDetails'>) {
  const { t } = useTranslation();
  const { data } = useData();
  const { session } = useAuth();
  const management = useManagement();
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [shiftId, setShiftId] = useState('');
  const selected = data.routes.find(r => r.id === route.params.id);
  if (!selected)
    return (
      <Page>
        <Empty
          title={t('Route not found')}
          detail={t('Return to the route list.')}
        />
      </Page>
    );
  const vehicle = data.vehicles.find(v => v.id === selected.vehicleId);
  const schedules = (management.data?.schedules || []).filter(
    s => s.routeId === selected.id,
  );
  const students = (management.data?.students || []).filter(
    s => s.routeId === selected.id && s.status === 'ACTIVE',
  );
  const shifts = transportShifts(management.data?.settings);
  const scheduled = students.filter(
    student =>
      isServiceScheduled(
        student,
        dhakaDate(),
        management.data?.settings.operatingDays,
      ) &&
      (!shiftId || serviceShift(student) === shiftId),
  );
  return (
    <Page
      loading={management.loading}
      error={management.error}
      refresh={management.refresh}
    >
      <NoorCard>
        <Text style={f.title}>{t("Today's passengers")}</Text>
        <Select
          label={t('Transport shift')}
          value={shiftId}
          onChange={setShiftId}
          options={[
            { value: '', label: t('All shifts') },
            ...shifts.map(shift => ({ value: shift.id, label: t(shift.name) })),
          ]}
        />
        {scheduled.map(student => (
          <View key={student.id} style={f.tableRow}>
            <View style={f.flex}>
              <Text style={f.title}>{student.studentName}</Text>
              <Text style={f.sub}>
                {student.stopName} →{' '}
                {student.dropoffStopName ||
                  student.dropAddress ||
                  t('Destination')}
              </Text>
            </View>
            <Text style={f.sub}>
              {t(
                shifts.find(shift => shift.id === serviceShift(student))
                  ?.name || serviceShift(student),
              )}
            </Text>
          </View>
        ))}
        {!scheduled.length ? (
          <Text style={f.sub}>
            {t('No students scheduled for this date and shift.')}
          </Text>
        ) : null}
      </NoorCard>
      <RouteFareManager
        route={selected}
        editable={session?.user.role === 'ADMIN'}
      />
      <NoorCard>
        <View style={f.vehicleRow}>
          <VehicleMark />
          <View style={f.flex}>
            <Text style={f.title}>{vehicle?.name || selected.vehicleName}</Text>
            <Text style={f.sub}>
              {t('Driver: {{name}}', {
                name: vehicle?.driverName || t('Not assigned'),
              })}
            </Text>
            <Text style={f.sub}>
              {t('Students: {{number}}', {
                number: numberLabel(uniqueStudents(students).length),
              })}{' '}
              · {money(selected.monthlyAmount)}
            </Text>
          </View>
        </View>
        <View style={f.actionRow}>
          {(['MORNING', 'AFTERNOON'] as const).map(p => (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: p === period }}
              onPress={() => setPeriod(p)}
              style={[f.period, p === period && f.periodSelected]}
            >
              <Text style={p === period ? f.white : f.sub}>
                {p === 'MORNING' ? t('Pickup order') : t('Return schedule')}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={f.tableHeader}>
          <Text style={f.number}>#</Text>
          <Text style={[f.detailLabel, f.bold]}>
            {t('Student name / stop')}
          </Text>
          <Text style={[f.sub, f.bold]}>{t('Time')}</Text>
        </View>
        {schedules
          .filter(s => s.period === period)
          .sort((a, b) => a.position - b.position)
          .map((s, i) => (
            <View key={s.id} style={f.tableRow}>
              <Text style={f.number}>{numberLabel(i + 1)}</Text>
              <Text style={f.detailLabel}>{s.label}</Text>
              <Text style={f.sub}>{scheduleTime(s.time)}</Text>
            </View>
          ))}
        {!schedules.some(s => s.period === period)
          ? selected.stops.map((s, i) => (
              <View key={s.id} style={f.tableRow}>
                <Text style={f.number}>{numberLabel(i + 1)}</Text>
                <Text style={f.detailLabel}>{s.name}</Text>
                <Text style={f.sub}>—</Text>
              </View>
            ))
          : null}
        {session?.user.role === 'ADMIN' ? (
          <Button
            title={editing ? t('Close') : t('Edit schedule')}
            onPress={() => setEditing(!editing)}
          />
        ) : (
          <Button
            title={t('Apply for this route')}
            onPress={() => navigation.navigate('Admission')}
          />
        )}
        {editing ? (
          <ScheduleEditor
            routeId={selected.id}
            initial={schedules.map(
              ({ id: _id, routeId: _routeId, ...entry }) => entry,
            )}
            stops={selected.stops}
            onDone={() => setEditing(false)}
          />
        ) : null}
        <Button
          title={t('View on live map')}
          secondary
          onPress={() =>
            navigation.navigate('LiveTracking', {
              vehicleId: selected.vehicleId,
            })
          }
        />
      </NoorCard>
    </Page>
  );
}
function ScheduleEditor({
  routeId,
  initial,
  stops,
  onDone,
}: {
  routeId: string;
  initial: ScheduleInput[];
  stops: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { mutate } = useManagement();
  const action = useAction();
  const [entries, setEntries] = useState<ScheduleInput[]>(
    initial.length
      ? initial
      : stops.map((stop, i) => ({
          stopId: stop.id,
          studentId: null,
          label: stop.name,
          time: '',
          period: 'MORNING',
          position: i,
        })),
  );
  const update = (i: number, change: Partial<ScheduleInput>) => {
    Object.keys(change).forEach(key =>
      action.clearFieldError(`entries.${i}.${key}`),
    );
    setEntries(current =>
      current.map((entry, index) =>
        index === i ? { ...entry, ...change } : entry,
      ),
    );
  };
  return (
    <NoorCard>
      {entries.map((entry, i) => (
        <View key={i} style={f.scheduleEdit}>
          <Field
            label={t('Stop {{number}}', { number: numberLabel(i + 1) })}
            value={entry.label}
            error={action.fieldErrors[`entries.${i}.label`]}
            onChangeText={label => update(i, { label })}
          />
          <View style={f.actionRow}>
            <View style={f.flex}>
              <Field
                label={t('Time (HH:mm)')}
                value={entry.time}
                error={action.fieldErrors[`entries.${i}.time`]}
                maxLength={5}
                onChangeText={time => update(i, { time })}
              />
            </View>
            <View style={f.flex}>
              <Select
                label={t('Trip')}
                value={entry.period}
                error={action.fieldErrors[`entries.${i}.period`]}
                options={[
                  { value: 'MORNING', label: t('Morning') },
                  { value: 'AFTERNOON', label: t('Afternoon') },
                ]}
                onChange={period =>
                  update(i, { period: period as ScheduleInput['period'] })
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Remove stop')}
              onPress={() => {
                action.clearFeedback();
                setEntries(current =>
                  current.filter((_, index) => index !== i),
                );
              }}
            >
              <NoorIcon name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      ))}
      <Button
        title={t('+ Add stop')}
        secondary
        onPress={() =>
          setEntries(current => [
            ...current,
            {
              stopId: null,
              studentId: null,
              label: '',
              time: '',
              period: 'MORNING',
              position: current.length,
            },
          ])
        }
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Save schedule')}
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            const errors: Record<string, string> = {};
            entries.forEach((entry, index) => {
              if (!entry.label.trim())
                errors[`entries.${index}.label`] = 'Enter the stop name.';
              if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time))
                errors[`entries.${index}.time`] =
                  'Enter a valid time as HH:mm.';
            });
            if (Object.keys(errors).length) throw new ValidationError(errors);
            await mutate(
              `/admin/routes/${routeId}/schedule`,
              {
                entries: entries.map((e, i) => ({
                  ...e,
                  label: e.label.trim(),
                  position: i,
                })),
              },
              'PUT',
            );
            onDone();
          })
        }
      />
    </NoorCard>
  );
}
const f = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 8,
    color: colors.ink,
    fontSize: 14,
  },
  mapButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  list: { padding: 0, overflow: 'hidden' },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  vehicleMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F6F2DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 3 },
  title: { fontSize: 16, color: colors.ink, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 20, color: colors.muted },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 33 },
  detailLabel: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 21 },
  detailValue: { flex: 1, fontSize: 13, color: colors.ink, textAlign: 'right' },
  iconButton: {
    height: 42,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  routeMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontSize: 23, color: colors.muted },
  period: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: '#F0F6F2',
  },
  periodSelected: { backgroundColor: colors.primary },
  white: { fontSize: 13, color: '#FFFFFF' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F4',
    padding: 9,
    gap: 8,
  },
  number: { width: 25, fontSize: 12, color: colors.ink },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 9,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  bold: { fontWeight: '700' },
  scheduleEdit: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 12,
  },
  remove: { fontSize: 29, color: colors.danger, padding: 8 },
});
