import React, { useState } from 'react';
import { Alert, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation, useRoute } from '@react-navigation/native';
import { TransportScheduleSummary } from '../../../components/TransportSchedule';
import { NoorAvatar, NoorIcon } from '../../../components/Noor';
import { serviceShift, studentIdentity, transportShifts } from '../../../utils/transport';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { locale, useTranslation } from '../../../i18n';
import { money, readable } from '../../../utils/format';
import { AdminPage, C, EmptyState, IconButton, Pill, contact, niceDate } from '../AdminUi';
import { useAction } from '../ui/useAction';
import { StudentForm } from './StudentForm';
import { StopServiceForm } from './StopServiceForm';

const ink = '#112B3B';
const muted = '#607588';
const green = '#07875C';
const soft = '#EAF7F1';
const cardShadow = { shadowColor: '#477365', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 2 } as const;

type ProfileTab = 'OVERVIEW' | 'PAYMENT' | 'TRANSPORT';

function Card({ children, style }: React.PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function IconTile({ name, size = 17 }: { name: string; size?: number }) {
  return <View style={styles.iconTile}><NoorIcon name={name} size={size} color={green} /></View>;
}
function TitleRow({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.titleRow}>
    <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={8}><Text style={styles.actionText}>{action}</Text></Pressable> : null}
  </View>;
}
function DataRow({ icon, label, value }: { icon: string; label: string; value?: string | number | null }) {
  return <View style={styles.dataRow}>
    <NoorIcon name={icon} size={16} color="#496577" />
    <Text style={styles.dataLabel}>{label}</Text>
    <Text selectable style={styles.dataValue}>{value === undefined || value === null || value === '' ? '—' : value}</Text>
  </View>;
}
function ProfileTabs({ value, onChange }: { value: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  const { t } = useTranslation();
  return <View style={styles.tabs}>{(['OVERVIEW', 'PAYMENT', 'TRANSPORT'] as const).map(tab =>
    <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={t(tab === 'OVERVIEW' ? 'Overview' : tab === 'PAYMENT' ? 'Payment' : 'Transport')} accessibilityState={{ selected: value === tab }} onPress={() => onChange(tab)} style={[styles.tab, value === tab && styles.activeTab]}>
      <Text style={[styles.tabText, value === tab && styles.activeTabText]}>{t(tab === 'OVERVIEW' ? 'Overview' : tab === 'PAYMENT' ? 'Payment' : 'Transport')}</Text>
    </Pressable>,
  )}</View>;
}

export function StudentProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { params } = useRoute();
  const { id } = (params || {}) as { id?: string };
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useCoreData();
  const [edit, setEdit] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [stoppingService, setStoppingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const [tab, setTab] = useState<ProfileTab>('OVERVIEW');
  const callAction = useAction();
  const archiveAction = useAction();
  const profile = data?.students.find(item => item.id === id);
  const services = profile ? (data?.students || []).filter(item => studentIdentity(item) === studentIdentity(profile)) : [];
  const student = services.find(item => item.id === selectedServiceId) || profile;
  if (!student) return <AdminPage topSafe loading={loading} error={error} refresh={refresh}><EmptyState text={loading ? t('Loading students…') : t('Student unavailable')} /></AdminPage>;
  const bills = transport.bills.filter(item => item.subscriptionId === student.id).sort((a, b) => b.month.localeCompare(a.month));
  const paid = bills.filter(item => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0);
  const due = bills.filter(item => item.status === 'UNPAID').reduce((sum, item) => sum + item.amount, 0);
  const total = bills.reduce((sum, item) => sum + item.amount, 0);
  const shifts = transportShifts(data?.settings);
  const archiveStudent = () => Alert.alert(
    t('Archive student'),
    t('Archive {{name}}? All transport services will stop. Payment history will be kept.', { name: student.studentName }),
    [{ text: t('Cancel'), style: 'cancel' }, { text: t('Archive'), style: 'destructive', onPress: () => archiveAction.run(async () => { await mutate(`/admin/students/${student.id}/archive`, undefined, 'PATCH'); navigation.goBack(); }, 'Student archived.') }],
  );
  const openMore = () => Alert.alert(t('Student profile'), undefined, [
    { text: t('Edit'), onPress: () => setEdit(true) },
    { text: t('Add service in another shift'), onPress: () => setAddingService(true) },
    { text: t('Archive student'), style: 'destructive', onPress: archiveStudent },
    { text: t('Cancel'), style: 'cancel' },
  ]);
  return <AdminPage topSafe scrollKey={tab} loading={loading} error={error} refresh={refresh}>
    <StatusBar backgroundColor="#075443" barStyle="light-content" />
    <View style={styles.hero}>
      <View style={styles.heroGlow} />
      <View style={styles.heroTop}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Back')} onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}><NoorIcon name="chevronLeft" size={25} color="#FFFFFF" /></Pressable>
        <Text style={styles.heroTitle}>{t('Student profile')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('More options')} onPress={openMore} hitSlop={10} style={styles.moreButton}><NoorIcon name="moreVertical" size={21} color="#FFFFFF" /></Pressable>
      </View>
      <View style={styles.heroBody}>
        <View style={styles.avatarRing}><NoorAvatar name={student.studentName} photoUrl={student.photoUrl} size={58} /></View>
        <View style={styles.heroInfo}>
          <Text numberOfLines={1} style={styles.heroName}>{student.studentName}</Text>
          <Text numberOfLines={1} style={styles.heroMeta}>{t('Class {{className}} | Roll: {{roll}}', { className: student.className.replace(/^\s*class\s+/i, '') || '—', roll: student.roll || '—' })}</Text>
        </View>
        <View style={styles.heroActions}>
          <IconButton title="Call" icon="phone" disabled={!student.guardianPhone} busy={callAction.busy} onPress={() => callAction.run(() => contact(student.guardianPhone, 'call'))} style={styles.heroAction} iconColor="#FFFFFF" iconSize={16} />
          <IconButton title="Edit" icon="edit" onPress={() => setEdit(true)} style={styles.heroAction} iconColor="#FFFFFF" iconSize={16} />
          <IconButton title="Archive student" icon="delete" onPress={archiveStudent} busy={archiveAction.busy} danger style={styles.heroDanger} iconColor="#FFFFFF" iconSize={16} />
        </View>
      </View>
    </View>
    <ProfileTabs value={tab} onChange={setTab} />
    {tab === 'OVERVIEW' ? <>
      <Card><TitleRow title={t('Basic information')} action={t('Edit')} onAction={() => setEdit(true)} />
        <DataRow icon="user" label={t('Full name')} value={student.studentName} />
        <DataRow icon="school" label={t('Class')} value={student.className} />
        <DataRow icon="receipt" label={t('Roll')} value={student.roll} />
        <DataRow icon="calendar" label={t('Date of birth')} value={student.dateOfBirth ? niceDate(student.dateOfBirth) : ''} />
        <DataRow icon="emergency" label={t('Blood group')} value={student.bloodGroup} />
        <DataRow icon="receipt" label={t('Student ID')} value={student.studentCode} />
      </Card>
      <Card><TitleRow title={t('Guardian information')} action={t('Edit')} onAction={() => setEdit(true)} />
        <DataRow icon="user" label={t('Name')} value={student.guardianName} />
        <DataRow icon="phone" label={t('Mobile')} value={student.guardianPhone} />
        <DataRow icon="address" label={t('Address')} value={student.pickupAddress || student.stopName} />
        <DataRow icon="emergency" label={t('Emergency contact')} value={student.emergencyContact} />
      </Card>
    </> : null}
    {tab === 'PAYMENT' ? <>
      <Card style={styles.feeCard}><View style={styles.feeHeader}><IconTile name="wallet" size={23} /><View style={styles.feeText}><Text style={styles.mutedText}>{t('Monthly fee')}</Text><Text style={styles.feeAmount}>{money(student.monthlyAmount)}</Text></View></View>
        <View style={styles.paymentTiles}>
          <View style={[styles.paymentTile, styles.paidTile]}><Text style={styles.tileLabel}>{t('Paid')}</Text><Text style={[styles.tileValue, styles.paidValue]}>{money(paid)}</Text></View>
          <View style={[styles.paymentTile, styles.dueTile]}><Text style={[styles.tileLabel, styles.dueLabel]}>{t('Due')}</Text><Text style={[styles.tileValue, styles.dueValue]}>{money(due)}</Text></View>
          <View style={[styles.paymentTile, styles.totalTile]}><Text style={styles.tileLabel}>{t('Total')}</Text><Text style={styles.tileValue}>{money(total)}</Text></View>
        </View>
      </Card>
      <Card style={styles.historyCard}><TitleRow title={t('Payment history')} />{bills.length ? bills.map(item => <View key={item.id} style={styles.billRow}><View style={styles.billText}><Text style={styles.mutedText}>{new Date(`${item.month}-01T00:00:00+06:00`).toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' })}</Text><Text style={styles.rowStrong}>{money(item.amount)}</Text></View><Pill value={item.status} /><NoorIcon name="receipt" size={19} color="#496577" /></View>) : <EmptyState text={t('No payment history yet')} />}</Card>
    </> : null}
    {tab === 'TRANSPORT' ? <>
      <Card style={styles.servicesCard}><View style={styles.servicesHeader}><View style={styles.serviceHeading}><IconTile name="bus" size={20} /><Text style={styles.cardTitle}>{t('Transport services')}</Text></View>{student.studentId ? <Pressable accessibilityRole="button" accessibilityLabel={t('Add service in another shift')} onPress={() => setAddingService(true)} style={styles.addService}><NoorIcon name="plus" size={16} color="#FFFFFF" /><Text style={styles.addServiceText}>{t('Add service')}</Text></Pressable> : null}</View>
        <View style={styles.tableHead}><Text style={[styles.tableCell, styles.shiftCell]}>{t('Shift')}</Text><Text style={[styles.tableCell, styles.routeCell]}>{t('Route')}</Text><Text style={[styles.tableCell, styles.pickupCell]}>{t('Pickup')}</Text><Text style={[styles.tableCell, styles.vehicleCell]}>{t('Vehicle')}</Text><Text style={[styles.tableCell, styles.statusCell]}>{t('Status')}</Text></View>
        {services.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${t('Transport service')}: ${t(shifts.find(shift => shift.id === serviceShift(item))?.name || serviceShift(item))}, ${item.routeName}`} onPress={() => setSelectedServiceId(item.id)} style={[styles.serviceRow, student.id === item.id && styles.selectedService]}><View style={styles.shiftCell}><Text style={styles.tableValue}>{t(shifts.find(shift => shift.id === serviceShift(item))?.name || serviceShift(item))}</Text><Text style={styles.smallMuted}>{shifts.find(shift => shift.id === serviceShift(item))?.startTime || ''}</Text></View><Text numberOfLines={2} style={[styles.tableValue, styles.routeCell]}>{item.routeName}</Text><Text numberOfLines={2} style={[styles.tableValue, styles.pickupCell]}>{item.stopName}</Text><Text numberOfLines={2} style={[styles.tableValue, styles.vehicleCell]}>{item.vehicleName}</Text><View style={styles.statusCell}><View style={[styles.statusDot, item.status === 'STOPPED' && styles.stoppedDot]} /><Text style={[styles.statusText, item.status === 'STOPPED' && styles.stoppedText]}>{readable(item.status)}</Text></View></Pressable>)}
        <View style={styles.selectedDetails}><View style={styles.scheduleRow}><NoorIcon name="calendar" size={17} color={green} /><TransportScheduleSummary service={student} shifts={shifts} /></View>
          <DataRow icon="routes" label={t('Route')} value={student.routeName} /><DataRow icon="pin" label={t('Start point')} value={student.stopName} /><DataRow icon="dropoff" label={t('End point')} value={student.dropoffStopName || student.dropAddress} /><DataRow icon="vehicles" label={t('Vehicle')} value={student.vehicleName} /><DataRow icon="drivers" label={t('Driver')} value={student.driverName} />
          {student.status === 'ACTIVE' ? <Pressable accessibilityRole="button" accessibilityLabel={t('Stop this service')} onPress={() => setStoppingService(true)} style={styles.stopButton}><NoorIcon name="minus" size={16} color={C.red} /><Text style={styles.stopText}>{t('Stop this service')}</Text></Pressable> : null}
          {student.status === 'STOPPED' && student.stoppedOn ? <><DataRow icon="calendar" label={t('Stopped on')} value={niceDate(student.stoppedOn)} /><DataRow icon="payments" label={t('Final monthly fee')} value={student.finalMonthlyFee != null ? money(student.finalMonthlyFee) : ''} /><DataRow icon="info" label={t('Stop reason')} value={student.stopReason} /></> : null}
        </View>
      </Card>
      <Card><View style={styles.serviceHeading}><IconTile name="phone" size={19} /><Text style={styles.cardTitle}>{t('Emergency contact')}</Text></View><Text style={styles.mutedText}>{t('Transport helpline')}</Text><View style={styles.helplineRow}><Text selectable style={styles.helpline}>{student.emergencyContact || student.guardianPhone || '—'}</Text><IconButton title="Call" icon="phone" disabled={!student.emergencyContact && !student.guardianPhone} onPress={() => callAction.run(() => contact(student.emergencyContact || student.guardianPhone, 'call'))} /></View></Card>
    </> : null}
    <StudentForm visible={addingService} existingStudent={student} onClose={() => setAddingService(false)} />
    <StopServiceForm visible={stoppingService} student={student} onClose={() => setStoppingService(false)} />
    <StudentForm visible={edit} student={student} onClose={() => setEdit(false)} />
  </AdminPage>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 154, borderRadius: 20, overflow: 'hidden', padding: 14, gap: 18, backgroundColor: '#075443', ...cardShadow },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -90, top: -80, backgroundColor: 'rgba(109,225,178,0.08)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 27, height: 30, justifyContent: 'center' },
  heroTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  moreButton: { width: 27, height: 30, alignItems: 'flex-end', justifyContent: 'center' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarRing: { width: 64, height: 64, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroInfo: { flex: 1, minWidth: 0, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  heroMeta: { color: '#E8FAF3', fontSize: 11 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroAction: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.17)', borderWidth: 0 },
  heroDanger: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F44268', borderWidth: 0 },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 3 },
  tab: { flex: 1, minHeight: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: '#007356' },
  tabText: { color: muted, fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 16, gap: 12, ...cardShadow },
  cardTitle: { color: ink, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 2 },
  actionText: { color: green, fontSize: 13, fontWeight: '700' },
  iconTile: { width: 37, height: 37, borderRadius: 19, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' },
  dataRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 24, gap: 13 },
  dataLabel: { color: muted, fontSize: 13, flex: 0.9, lineHeight: 21 },
  dataValue: { color: ink, fontSize: 13, lineHeight: 21, flex: 1.2 },
  rowText: { color: ink, fontSize: 13, lineHeight: 20 },
  rowStrong: { color: ink, fontSize: 15, fontWeight: '700' },
  mutedText: { color: muted, fontSize: 13, lineHeight: 19 },
  feeCard: { gap: 22 },
  feeHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  feeText: { gap: 3 },
  feeAmount: { color: ink, fontSize: 22, fontWeight: '800' },
  paymentTiles: { flexDirection: 'row', gap: 8 },
  paymentTile: { flex: 1, minHeight: 74, padding: 11, borderRadius: 12, justifyContent: 'center', gap: 5 },
  paidTile: { backgroundColor: '#EAF8F1' },
  dueTile: { backgroundColor: '#FFF7EC' },
  totalTile: { backgroundColor: '#F2F6F8' },
  tileLabel: { color: muted, fontSize: 13 },
  tileValue: { color: ink, fontSize: 16, fontWeight: '700' },
  paidValue: { color: green },
  dueLabel: { color: '#DA7A00' },
  dueValue: { color: '#E88400' },
  historyCard: { gap: 2 },
  billRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13, borderTopColor: '#EFF3F3', borderTopWidth: 1 },
  billText: { flex: 1, gap: 4 },
  servicesCard: { paddingHorizontal: 10, gap: 0 },
  servicesHeader: { minHeight: 67, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  serviceHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  addService: { backgroundColor: '#078E60', minHeight: 36, borderRadius: 10, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addServiceText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  tableHead: { flexDirection: 'row', gap: 3, paddingVertical: 10, backgroundColor: '#F7FBFA' },
  tableCell: { color: ink, fontSize: 10, fontWeight: '700' },
  shiftCell: { flex: 1 }, routeCell: { flex: 1.25 }, pickupCell: { flex: 0.95 }, vehicleCell: { flex: 0.8 }, statusCell: { flex: 0.9 },
  serviceRow: { minHeight: 73, flexDirection: 'row', alignItems: 'center', gap: 3, borderBottomColor: '#E9EEEE', borderBottomWidth: 1, paddingVertical: 9 },
  selectedService: { backgroundColor: '#F6FBF8' },
  tableValue: { color: ink, fontSize: 10, lineHeight: 15 },
  smallMuted: { color: muted, fontSize: 9, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#13A66C' },
  stoppedDot: { backgroundColor: '#E88A2F' },
  statusText: { color: green, fontSize: 10, fontWeight: '700' },
  stoppedText: { color: '#BD762C' },
  selectedDetails: { paddingVertical: 12, gap: 9 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  stopButton: { alignSelf: 'flex-start', borderRadius: 14, borderWidth: 1, borderColor: '#F8CBD3', backgroundColor: '#FFF1F3', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stopText: { color: C.red, fontSize: 12, fontWeight: '700' },
  helplineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helpline: { color: ink, fontSize: 18, fontWeight: '700' },
});
