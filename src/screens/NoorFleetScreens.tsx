import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import { Vehicle } from '../api/types';
import { ScheduleInput } from '../api/management';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useManagement } from '../context/ManagementContext';
import { useAction } from '../hooks/useAction';
import { NoorIcon, NoorCard, NoorBadge, NoorSection } from '../components/Noor';
import { Page, Button, Field, Select, Notice, Empty } from '../components/ui';
import { VehicleEditSheet } from '../components/VehicleEditSheet';
import { RouteForm } from '../components/setup/SetupForms';
import { money, numberLabel } from '../utils/format';
import { colors, styles } from '../theme';

function VehicleMark() {
  return (
    <View style={f.vehicleMark}>
      <NoorIcon name="vehicles" color="#CE9F1B" size={35} />
    </View>
  );
}
function VehicleStatus({ vehicle }: { vehicle: Vehicle }) {
  return (
    <NoorBadge
      label={
        vehicle.status === 'MAINTENANCE'
          ? 'রক্ষণাবেক্ষণ'
          : vehicle.status === 'INACTIVE'
          ? 'নিষ্ক্রিয়'
          : 'চলমান'
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
        <Text style={styles.heading}>গাড়ি তালিকা</Text>
        {session?.user.role === 'ADMIN' ? (
          <Button
            title="+ যোগ করুন"
            onPress={() => navigation.navigate('CreateVehicle')}
          />
        ) : null}
      </View>
      <Field
        label="গাড়ি খুঁজুন"
        value={query}
        onChangeText={setQuery}
        placeholder="নাম, গাড়ির নম্বর অথবা ড্রাইভার"
      />
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
                ড্রাইভার: {vehicle.driverName || 'নির্ধারিত হয়নি'}
              </Text>
            </View>
            <VehicleStatus vehicle={vehicle} />
          </Pressable>
        ))}
      </NoorCard>
      {!vehicles.length ? (
        <Empty
          title="কোনো গাড়ি পাওয়া যায়নি"
          detail={
            loading ? 'তথ্য লোড হচ্ছে…' : 'গাড়ি যোগ করুন অথবা অন্য নামে খুঁজুন।'
          }
        />
      ) : null}
      <Button
        title="লাইভ লোকেশন ম্যাপ"
        secondary
        onPress={() => navigation.navigate('FleetMap')}
      />
    </Page>
  );
}
export function VehicleDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'VehicleDetails'>) {
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
          title="গাড়ি পাওয়া যায়নি"
          detail="তালিকায় ফিরে আবার চেষ্টা করুন।"
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
              accessibilityLabel="গাড়ি সম্পাদনা"
              onPress={() => setEditing(true)}
              style={f.iconButton}
            >
              <NoorIcon name="edit" />
            </Pressable>
          ) : null}
        </View>
        <Detail icon="driver" label="ড্রাইভার" value={vehicle.driverName} />
        <Detail
          icon="route"
          label="রুট"
          value={routes.map(r => r.name).join(', ')}
        />
        <Detail
          icon="students"
          label="শিক্ষার্থী সংখ্যা"
          value={management.data ? numberLabel(students.length) : '—'}
        />
        <Detail icon="vehicle" label="মডেল" value={vehicle.model} />
        <Detail
          icon="calendar"
          label="ক্রয় তারিখ"
          value={vehicle.purchaseDate}
        />
        <Detail
          icon="document"
          label="লাইসেন্স নবায়ন"
          value={vehicle.licenseExpiresAt}
        />
        <Detail
          icon="document"
          label="ফিটনেস"
          value={vehicle.fitnessExpiresAt}
        />
        {admin ? (
          <Button
            title={metadata ? 'বন্ধ করুন' : 'গাড়ির নথি ও স্ট্যাটাস সম্পাদনা'}
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
        <NoorSection title="দৈনিক সময়সূচি">
          {schedules.length ? (
            schedules.map(s => (
              <Detail
                key={s.id}
                icon="clock"
                label={`${s.period === 'MORNING' ? 'সকাল' : 'বিকাল'} · ${
                  s.label
                }`}
                value={s.time}
              />
            ))
          ) : (
            <Text style={f.sub}>সময়সূচি এখনো যোগ করা হয়নি।</Text>
          )}
        </NoorSection>
        <View style={f.actionRow}>
          <View style={f.flex}>
            <Button
              title="লোকেশন"
              onPress={() =>
                navigation.navigate('LiveTracking', { vehicleId: vehicle.id })
              }
            />
          </View>
          {admin ? (
            <View style={f.flex}>
              <Button
                title="মেইনটেন্যান্স"
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
              title="জ্বালানি / খরচ"
              secondary
              onPress={() =>
                navigation.navigate('Accounts', { tab: 'EXPENSE' })
              }
            />
            <Button
              title="ভ্রমণ ইতিহাস"
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
        label="মডেল"
        value={model}
        onChangeText={setModel}
        maxLength={100}
      />
      <Field
        label="ক্রয় তারিখ (YYYY-MM-DD)"
        value={purchaseDate}
        onChangeText={setPurchaseDate}
        maxLength={10}
      />
      <Field
        label="ফিটনেস মেয়াদ (YYYY-MM-DD)"
        value={fitnessExpiresAt}
        onChangeText={setFitness}
        maxLength={10}
      />
      <Field
        label="লাইসেন্স মেয়াদ (YYYY-MM-DD)"
        value={licenseExpiresAt}
        onChangeText={setLicense}
        maxLength={10}
      />
      <Select
        label="স্ট্যাটাস"
        value={status}
        onChange={v => setStatus(v as Vehicle['status'] & string)}
        options={[
          { value: 'RUNNING', label: 'চলমান' },
          { value: 'MAINTENANCE', label: 'রক্ষণাবেক্ষণ' },
          { value: 'INACTIVE', label: 'নিষ্ক্রিয়' },
        ]}
      />
      <Notice text={action.error} kind="error" />
      <Button
        title="সংরক্ষণ"
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
  return (
    <View style={f.detail}>
      <NoorIcon name={icon} size={17} />
      <Text style={f.detailLabel}>{label}</Text>
      <Text style={f.detailValue}>{value || 'যোগ করা হয়নি'}</Text>
    </View>
  );
}
export function NoorRoutesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Routes'>) {
  const { data, loading, error, refresh } = useData();
  const { data: extra } = useManagement();
  const { session } = useAuth();
  const [query, setQuery] = useState(''),
    [adding, setAdding] = useState(false);
  return (
    <Page refresh={refresh} loading={loading} error={error}>
      <View style={f.toolbar}>
        <Text style={styles.heading}>রুট সমূহ</Text>
        {session?.user.role === 'ADMIN' ? (
          <Button
            title={adding ? 'বন্ধ করুন' : '+ যোগ করুন'}
            onPress={() => setAdding(!adding)}
          />
        ) : null}
      </View>
      <Field
        label="রুট খুঁজুন"
        value={query}
        onChangeText={setQuery}
        placeholder="রুটের নাম"
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
                  {r.vehicleName} ·{' '}
                  {extra
                    ? `${numberLabel(
                        extra.students.filter(
                          s => s.routeId === r.id && s.status === 'ACTIVE',
                        ).length,
                      )} জন`
                    : money(r.monthlyAmount)}
                </Text>
              </View>
              <Text style={f.arrow}>›</Text>
            </NoorCard>
          </Pressable>
        ))}
      {!data.routes.length ? (
        <Empty
          title="রুট যোগ করা হয়নি"
          detail="রুট, গাড়ি এবং পিকআপ পয়েন্ট যোগ করুন।"
        />
      ) : null}
    </Page>
  );
}
export function RouteDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'RouteDetails'>) {
  const { data } = useData();
  const { session } = useAuth();
  const management = useManagement();
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const selected = data.routes.find(r => r.id === route.params.id);
  if (!selected)
    return (
      <Page>
        <Empty title="রুট পাওয়া যায়নি" detail="রুট তালিকায় ফিরে যান।" />
      </Page>
    );
  const vehicle = data.vehicles.find(v => v.id === selected.vehicleId);
  const schedules = (management.data?.schedules || []).filter(
    s => s.routeId === selected.id,
  );
  const students = (management.data?.students || []).filter(
    s => s.routeId === selected.id && s.status === 'ACTIVE',
  );
  return (
    <Page
      loading={management.loading}
      error={management.error}
      refresh={management.refresh}
    >
      <NoorCard>
        <View style={f.vehicleRow}>
          <VehicleMark />
          <View style={f.flex}>
            <Text style={f.title}>{vehicle?.name || selected.vehicleName}</Text>
            <Text style={f.sub}>
              ড্রাইভার: {vehicle?.driverName || 'নির্ধারিত হয়নি'}
            </Text>
            <Text style={f.sub}>
              শিক্ষার্থী: {numberLabel(students.length)} জন ·{' '}
              {money(selected.monthlyAmount)}
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
                {p === 'MORNING' ? 'পিকআপ ক্রম' : 'ফেরার সময়সূচি'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={f.tableHeader}>
          <Text style={f.number}>#</Text>
          <Text style={[f.detailLabel, f.bold]}>শিক্ষার্থীর নাম / স্টপ</Text>
          <Text style={[f.sub, f.bold]}>সময়</Text>
        </View>
        {schedules
          .filter(s => s.period === period)
          .sort((a, b) => a.position - b.position)
          .map((s, i) => (
            <View key={s.id} style={f.tableRow}>
              <Text style={f.number}>{numberLabel(i + 1)}</Text>
              <Text style={f.detailLabel}>{s.label}</Text>
              <Text style={f.sub}>{s.time}</Text>
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
            title={editing ? 'বন্ধ করুন' : 'সময়সূচি সম্পাদনা'}
            onPress={() => setEditing(!editing)}
          />
        ) : (
          <Button
            title="এই রুটে ভর্তি আবেদন"
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
          title="লাইভ ম্যাপে দেখুন"
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
  const update = (i: number, change: Partial<ScheduleInput>) =>
    setEntries(current =>
      current.map((entry, index) =>
        index === i ? { ...entry, ...change } : entry,
      ),
    );
  return (
    <NoorCard>
      {entries.map((entry, i) => (
        <View key={i} style={f.scheduleEdit}>
          <Field
            label={`স্টপ ${numberLabel(i + 1)}`}
            value={entry.label}
            onChangeText={label => update(i, { label })}
          />
          <View style={f.actionRow}>
            <View style={f.flex}>
              <Field
                label="সময় (HH:mm)"
                value={entry.time}
                maxLength={5}
                onChangeText={time => update(i, { time })}
              />
            </View>
            <View style={f.flex}>
              <Select
                label="যাত্রা"
                value={entry.period}
                options={[
                  { value: 'MORNING', label: 'সকাল' },
                  { value: 'AFTERNOON', label: 'বিকাল' },
                ]}
                onChange={period =>
                  update(i, { period: period as ScheduleInput['period'] })
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="স্টপ সরান"
              onPress={() =>
                setEntries(current => current.filter((_, index) => index !== i))
              }
            >
              <Text style={f.remove}>×</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Button
        title="+ স্টপ যোগ করুন"
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
        title="সময়সূচি সংরক্ষণ"
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            if (
              entries.some(
                e =>
                  !e.label.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time),
              )
            )
              throw new Error('স্টপের নাম ও সঠিক সময় লিখুন।');
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
