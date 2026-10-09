import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BusFront,
  CalendarDays,
  CarFront,
  ChevronRight,
  FileText,
  History,
  MapPin,
  Pencil,
  ReceiptText,
  Route as RouteIcon,
  ShieldCheck,
  UsersRound,
  Wrench,
} from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Page, Empty, Notice } from '../../components/ui';
import { VehicleEditSheet } from '../../components/VehicleEditSheet';
import { useCoreData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { useTranslation } from '../../i18n';
import { HomeStackParams } from '../../navigation/types';
import { numberLabel } from '../../utils/format';
import { uniqueStudents } from '../../utils/transport';
import { VehicleStatus } from './FleetUI';
import { fleetDate, scheduleTime } from './format';
import { VehicleMetadata } from './VehicleMetadata';

const INK = '#102944';
const GREEN = '#006B50';
const MUTED = '#718398';

function InformationItem({
  icon,
  label,
  value,
  index,
  narrow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  index: number;
  narrow: boolean;
}) {
  return (
    <View
      style={[
        ui.informationItem,
        narrow && ui.informationItemNarrow,
        (narrow ? index > 0 : index > 1) && ui.informationItemBelow,
        !narrow && index % 2 === 0 && ui.informationItemLeft,
      ]}
    >
      <View style={ui.informationIcon}>{icon}</View>
      <View style={ui.informationCopy}>
        <Text style={ui.informationLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text style={ui.informationValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ToolTile({
  title,
  subtitle,
  icon,
  tone,
  narrow,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'mint' | 'amber' | 'blue' | 'violet';
  narrow: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      style={({ pressed }) => [
        ui.toolTile,
        narrow && ui.toolTileNarrow,
        pressed && ui.pressed,
      ]}
    >
      <View style={[ui.toolIcon, toolTones[tone]]}>{icon}</View>
      <View style={ui.toolCopy}>
        <Text style={ui.toolTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={ui.toolSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={18} color={MUTED} />
    </Pressable>
  );
}

export function VehicleDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'VehicleDetails'>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const core = useCoreData();
  const management = useManagement();
  const { session } = useAuth();
  const [editing, setEditing] = useState(false);
  const [metadata, setMetadata] = useState(false);
  const vehicle = core.data.vehicles.find(item => item.id === route.params.id);

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
    management.data?.schedules.filter(schedule =>
      core.data.routes.some(
        item => item.id === schedule.routeId && item.vehicleId === vehicle.id,
      ),
    ) ?? [];
  const routes = core.data.routes.filter(item => item.vehicleId === vehicle.id);
  const students =
    management.data?.students.filter(
      item => item.vehicleId === vehicle.id && item.status === 'ACTIVE',
    ) ?? [];
  const admin = session?.user.role === 'ADMIN';
  const routeNames =
    routes.map(item => item.name).join(', ') || t('Not assigned');
  const studentCount = management.data
    ? t('{{number}} students', {
        number: numberLabel(uniqueStudents(students).length),
      })
    : t('Students');
  const info = [
    {
      label: t('Model'),
      value: vehicle.model || t('Not added'),
      icon: <CarFront size={20} color={INK} />,
    },
    {
      label: t('License renewal'),
      value: fleetDate(vehicle.licenseExpiresAt) || t('Not added'),
      icon: <FileText size={20} color={INK} />,
    },
    {
      label: t('Purchase date'),
      value: fleetDate(vehicle.purchaseDate) || t('Not added'),
      icon: <CalendarDays size={20} color={INK} />,
    },
    {
      label: t('Fitness expiry'),
      value: fleetDate(vehicle.fitnessExpiresAt) || t('Not added'),
      icon: <ShieldCheck size={20} color={INK} />,
    },
  ];

  return (
    <SafeAreaView style={ui.screen} edges={['bottom', 'left', 'right']}>
      <StatusBar backgroundColor="#F8FAFD" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={ui.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={core.loading || management.loading}
              onRefresh={async () => {
                await Promise.all([core.refresh(), management.refresh()]);
              }}
              tintColor={GREEN}
              colors={[GREEN]}
            />
          }
        >
          <View style={ui.content}>
            <Notice text={core.error || management.error} kind="error" />

            <View style={ui.identity}>
              <View style={[ui.busBadge, narrow && ui.busBadgeNarrow]}>
                <BusFront
                  size={narrow ? 36 : 44}
                  color="#00665D"
                  strokeWidth={1.9}
                />
              </View>
              <View style={ui.identityCopy}>
                <Text
                  accessibilityRole="header"
                  style={[ui.plate, narrow && ui.plateNarrow]}
                  numberOfLines={1}
                >
                  {vehicle.plate}
                </Text>
                <Text style={ui.vehicleName} numberOfLines={1}>
                  {vehicle.name}
                </Text>
                <VehicleStatus vehicle={vehicle} />
              </View>
              {admin ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Edit vehicle')}
                  onPress={() => setEditing(true)}
                  style={({ pressed }) => [
                    ui.editButton,
                    pressed && ui.pressed,
                  ]}
                >
                  <Pencil size={20} color={INK} />
                  <Text style={ui.editText}>{t('Edit')}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={ui.routeRibbon}>
              <View style={ui.routeIcon}>
                <RouteIcon size={28} color={GREEN} />
              </View>
              <View style={ui.routeCopy}>
                <Text style={ui.routeName} numberOfLines={2}>
                  {routeNames}
                </Text>
                <Text style={ui.routeDriver} numberOfLines={2}>
                  {t('Driver: {{name}}', {
                    name: vehicle.driverName || t('Not assigned'),
                  })}
                </Text>
              </View>
              <View style={ui.studentBadge}>
                <UsersRound size={17} color="#005C54" />
                <Text style={ui.studentText} numberOfLines={2}>
                  {studentCount}
                </Text>
              </View>
            </View>

            <View style={ui.toolsGrid}>
              <ToolTile
                title={t('Live location')}
                subtitle={t('Track vehicle in real time')}
                icon={<MapPin size={21} color="#00655A" />}
                tone="mint"
                narrow={narrow}
                onPress={() =>
                  navigation.navigate('LiveTracking', {
                    vehicleId: vehicle.id,
                  })
                }
              />
              {admin ? (
                <>
                  <ToolTile
                    title={t('Maintenance')}
                    subtitle={t('Manage service records')}
                    icon={<Wrench size={21} color="#9C6500" />}
                    tone="amber"
                    narrow={narrow}
                    onPress={() =>
                      navigation.navigate('Maintenance', {
                        vehicleId: vehicle.id,
                      })
                    }
                  />
                  <ToolTile
                    title={t('Expenses')}
                    subtitle={t('Track vehicle expenses')}
                    icon={<ReceiptText size={21} color="#1769B0" />}
                    tone="blue"
                    narrow={narrow}
                    onPress={() =>
                      navigation.navigate('Accounts', { tab: 'EXPENSE' })
                    }
                  />
                  <ToolTile
                    title={t('Travel history')}
                    subtitle={t('View past trips and records')}
                    icon={<History size={21} color="#5145A4" />}
                    tone="violet"
                    narrow={narrow}
                    onPress={() =>
                      navigation.navigate('VehicleHistory', {
                        imei: vehicle.imei,
                        name: vehicle.name,
                      })
                    }
                  />
                </>
              ) : null}
            </View>
            <View style={ui.card}>
              <View style={ui.sectionHeading}>
                <View style={ui.sectionTitleWrap}>
                  <CalendarDays size={21} color={GREEN} />
                  <Text style={ui.sectionTitle}>{t('Daily schedule')}</Text>
                </View>
              </View>
              {schedules.length ? (
                <View style={ui.scheduleList}>
                  {schedules.map(item => (
                    <View key={item.id} style={ui.scheduleRow}>
                      <Text style={ui.scheduleLabel} numberOfLines={2}>
                        {item.period === 'MORNING'
                          ? t('Morning')
                          : t('Afternoon')}{' '}
                        · {item.label}
                      </Text>
                      <Text style={ui.scheduleTime}>
                        {scheduleTime(item.time)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={ui.scheduleEmpty}>
                  <CalendarDays size={39} color="#A6B5C5" strokeWidth={1.5} />
                  <Text style={ui.scheduleEmptyText}>
                    {t('No schedule has been added yet.')}
                  </Text>
                </View>
              )}
            </View>

            <View style={ui.card}>
              <View style={ui.sectionHeading}>
                <View style={ui.sectionTitleWrap}>
                  <FileText size={21} color={GREEN} />
                  <Text style={ui.sectionTitle}>
                    {t('Vehicle information')}
                  </Text>
                </View>
                {admin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Edit vehicle documents and status')}
                    onPress={() => setMetadata(true)}
                    style={({ pressed }) => [
                      ui.smallEdit,
                      pressed && ui.pressed,
                    ]}
                  >
                    <Pencil size={15} color={GREEN} />
                    <Text style={ui.smallEditText}>{t('Edit')}</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={ui.informationGrid}>
                {info.map((item, index) => (
                  <InformationItem
                    key={item.label}
                    {...item}
                    index={index}
                    narrow={narrow}
                  />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <VehicleEditSheet
        vehicle={editing ? vehicle : null}
        onClose={() => setEditing(false)}
        onSaved={async () => {
          await Promise.all([core.refresh(), management.refresh()]);
        }}
      />
      <VehicleMetadata
        vehicle={metadata && admin ? vehicle : null}
        onDone={() => setMetadata(false)}
      />
    </SafeAreaView>
  );
}

const toolTones = StyleSheet.create({
  mint: { backgroundColor: '#DAF5ED' },
  amber: { backgroundColor: '#FFF0D1' },
  blue: { backgroundColor: '#E0EFFD' },
  violet: { backgroundColor: '#EAE6FF' },
});

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFD' },
  scrollContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 30 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 13 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  busBadge: {
    width: 77,
    height: 77,
    borderRadius: 17,
    backgroundColor: '#E2F4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busBadgeNarrow: { width: 63, height: 68 },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 4 },
  plate: { color: INK, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  plateNarrow: { fontSize: 21 },
  vehicleName: { color: MUTED, fontSize: 12 },
  editButton: {
    minWidth: 52,
    minHeight: 59,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5ED',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  editText: { color: INK, fontSize: 11, fontWeight: '700' },
  routeRibbon: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFE8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCopy: { flex: 1, minWidth: 0, gap: 4 },
  routeName: { color: INK, fontSize: 15, fontWeight: '800' },
  routeDriver: { color: MUTED, fontSize: 12, lineHeight: 17 },
  studentBadge: {
    maxWidth: 112,
    minHeight: 35,
    borderRadius: 18,
    backgroundColor: '#E4F7F0',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  studentText: {
    flexShrink: 1,
    color: '#075F56',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E0E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 9,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionTitle: {
    flexShrink: 1,
    color: INK,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  smallEdit: {
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: '#EBF8F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  smallEditText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  informationGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  informationItem: {
    width: '50%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  informationItemNarrow: { width: '100%', minHeight: 62 },
  informationItemBelow: { borderTopWidth: 1, borderTopColor: '#E7ECF1' },
  informationItemLeft: { borderRightWidth: 1, borderRightColor: '#E7ECF1' },
  informationIcon: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  informationCopy: { flex: 1, minWidth: 0, gap: 3 },
  informationLabel: { color: INK, fontSize: 12, fontWeight: '700' },
  informationValue: { color: MUTED, fontSize: 11 },
  scheduleList: { gap: 0 },
  scheduleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF2',
  },
  scheduleLabel: { flex: 1, color: INK, fontSize: 13, fontWeight: '600' },
  scheduleTime: { color: MUTED, fontSize: 12, fontWeight: '700' },
  scheduleEmpty: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scheduleEmptyText: { color: MUTED, fontSize: 12, textAlign: 'center' },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  toolTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E8EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  toolTileNarrow: { flexBasis: '100%' },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: { flex: 1, minWidth: 0, gap: 3 },
  toolTitle: { color: INK, fontSize: 13, fontWeight: '800' },
  toolSubtitle: { color: MUTED, fontSize: 10, lineHeight: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
