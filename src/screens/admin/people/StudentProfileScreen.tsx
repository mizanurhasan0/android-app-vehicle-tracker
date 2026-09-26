import { TransportScheduleSummary } from '../../../components/TransportSchedule';
import {
  serviceShift,
  studentIdentity,
  transportShifts,
} from '../../../utils/transport';
import { NoorIcon } from '../../../components/Noor';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { locale, useTranslation } from '../../../i18n';
import { money } from '../../../utils/format';
import {
  AdminPage,
  Box,
  C,
  Choice,
  Detail,
  EmptyState,
  Heading,
  IconButton,
  Pill,
  Tabs,
  contact,
  niceDate,
  s,
} from '../AdminUi';
import { useAction } from '../ui/useAction';
import { StudentPhoto } from './StudentPhoto';
import { StudentForm } from './StudentForm';

const studentProfileTopStyles = StyleSheet.create({
  transportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.mint,
  },
  addService: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    flexShrink: 1,
  },
  addServiceText: {
    fontSize: 11,
    lineHeight: 15,
    color: C.green,
    fontWeight: '700',
    textAlign: 'right',
  },
  servicePanel: {
    gap: 9,
    padding: 11,
    borderRadius: 12,
    backgroundColor: C.background,
  },
  serviceIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  serviceIdentityText: { flex: 1, minWidth: 0 },
  serviceName: { fontSize: 13, color: C.text, fontWeight: '700' },
  serviceRoute: { fontSize: 11, lineHeight: 17, color: C.muted },
  schedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  profileIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityText: { flex: 1, minWidth: 0 },
  profileNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  profileName: { flex: 1, minWidth: 0 },
  profileMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  profileMeta: { flexShrink: 1 },
  profileActions: { alignItems: 'flex-end', alignSelf: 'flex-start', gap: 8 },
  guardianGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guardianItem: {
    width: '31%',
    minHeight: 78,
    padding: 9,
    borderRadius: 11,
    backgroundColor: C.background,
    gap: 5,
  },
  guardianIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianLabel: { fontSize: 10, lineHeight: 13, color: C.muted },
  guardianValue: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: C.text,
  },
});

const guardianTones = [
  { background: '#E7F7EE', foreground: C.green },
  { background: '#E8F2FC', foreground: C.blue },
  { background: '#EAF7F2', foreground: '#23866A' },
  { background: '#F0ECFC', foreground: '#6957B5' },
  { background: '#E7F6F2', foreground: '#328A72' },
  { background: '#E8F5F4', foreground: '#287D78' },
  { background: '#FFF2DD', foreground: '#D88A15' },
  { background: '#EAF1FB', foreground: '#4B74B8' },
  { background: '#FDE9ED', foreground: C.red },
];

function GuardianItem({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value?: string | number | null;
  tone: number;
}) {
  const colors = guardianTones[tone % guardianTones.length];
  const displayValue =
    value === '' || value === undefined || value === null ? '—' : String(value);
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${displayValue}`}
      style={studentProfileTopStyles.guardianItem}
    >
      <View
        style={[
          studentProfileTopStyles.guardianIcon,
          { backgroundColor: colors.background },
        ]}
      >
        <NoorIcon name={icon} size={14} color={colors.foreground} />
      </View>
      <Text numberOfLines={1} style={studentProfileTopStyles.guardianLabel}>
        {label}
      </Text>
      <Text
        selectable
        numberOfLines={2}
        style={studentProfileTopStyles.guardianValue}
      >
        {displayValue}
      </Text>
    </View>
  );
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const [tab, setTab] = useState('PAYMENTS');
  const callAction = useAction();
  const archiveAction = useAction();
  const profile = data?.students.find(item => item.id === id);
  const services = profile
    ? (data?.students || []).filter(
        item => studentIdentity(item) === studentIdentity(profile),
      )
    : [];
  const student =
    services.find(item => item.id === selectedServiceId) || profile;
  if (!student)
    return (
      <AdminPage loading={loading} error={error} refresh={refresh}>
        <EmptyState
          text={loading ? t('Loading students…') : t('Student unavailable')}
        />
      </AdminPage>
    );
  const bills = transport.bills.filter(
    item =>
      (item as typeof item & { subscriptionId?: string }).subscriptionId ===
      student.id,
  );
  const paid = bills
    .filter(item => item.status === 'PAID')
    .reduce((sum, item) => sum + item.amount, 0);
  const due = bills
    .filter(item => item.status !== 'PAID')
    .reduce((sum, item) => sum + item.amount, 0);
  const attendance =
    data?.attendance
      .filter(item => item.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date)) || [];
  const notices =
    data?.notices.filter(
      item =>
        item.audience === 'ALL' ||
        (item.audience === 'STUDENT' && item.targetId === student.id) ||
        (item.audience === 'VEHICLE' && item.targetId === student.vehicleId) ||
        (item.audience === 'ROUTE' && item.targetId === student.routeId),
    ) || [];
  const shifts = transportShifts(data?.settings);
  const selectedShift = shifts.find(
    shift => shift.id === serviceShift(student),
  );
  const guardianItems = [
    { icon: 'user', label: t('Name'), value: student.guardianName },
    { icon: 'mobile', label: t('Mobile'), value: student.guardianPhone },
    {
      icon: 'address',
      label: t('Address'),
      value: student.pickupAddress || student.stopName,
    },
    { icon: 'routes', label: t('Route'), value: student.routeName },
    { icon: 'pin', label: t('Start point'), value: student.stopName },
    { icon: 'vehicles', label: t('Vehicle'), value: student.vehicleName },
    { icon: 'drivers', label: t('Driver'), value: student.driverName },
    {
      icon: 'dropoff',
      label: t('End point'),
      value: student.dropoffStopName || student.dropAddress,
    },
    {
      icon: 'emergency',
      label: t('Emergency contact'),
      value: student.emergencyContact,
    },
  ];
  const archiveStudent = () =>
    Alert.alert(
      t('Archive student'),
      t(
        'Archive {{name}}? All transport services will stop, but payment and attendance history will be kept.',
        { name: student.studentName },
      ),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Archive'),
          style: 'destructive',
          onPress: () =>
            archiveAction.run(async () => {
              await mutate(
                `/admin/students/${student.id}/archive`,
                undefined,
                'PATCH',
              );
              navigation.goBack();
            }, 'Student archived.'),
        },
      ],
    );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <View style={studentProfileTopStyles.profileHeader}>
          <View style={studentProfileTopStyles.profileIdentity}>
            <StudentPhoto student={student} />
            <View style={studentProfileTopStyles.identityText}>
              <View style={studentProfileTopStyles.profileNameLine}>
                <Text
                  numberOfLines={1}
                  style={[s.title, studentProfileTopStyles.profileName]}
                >
                  {student.studentName}
                </Text>
              </View>
              <Text style={s.body}>{student.studentCode || '—'}</Text>
              <View style={studentProfileTopStyles.profileMetaLine}>
                <Text
                  numberOfLines={1}
                  style={[s.muted, studentProfileTopStyles.profileMeta]}
                >
                  {t('Class {{className}} | Roll: {{roll}}', {
                    className:
                      student.className.replace(/^\s*class\s+/i, '') || '—',
                    roll: student.roll || '—',
                  })}
                </Text>
                <Pill value={student.status} />
              </View>
            </View>
          </View>
          <View style={studentProfileTopStyles.profileActions}>
            <View style={s.compactActions}>
              <IconButton
                title="Call"
                icon="phone"
                disabled={!student.guardianPhone}
                busy={callAction.busy}
                onPress={() =>
                  callAction.run(() => contact(student.guardianPhone, 'call'))
                }
              />
              <IconButton
                title="Edit"
                icon="edit"
                onPress={() => setEdit(true)}
              />
              <IconButton
                title="Archive student"
                icon="delete"
                onPress={archiveStudent}
                busy={archiveAction.busy}
                danger
              />
            </View>
          </View>
        </View>
      </Box>
      <Box>
        <View style={studentProfileTopStyles.transportHeader}>
          <View style={studentProfileTopStyles.sectionTitle}>
            <View style={studentProfileTopStyles.sectionIcon}>
              <NoorIcon name="bus" size={18} color={C.green} />
            </View>
            <Text style={s.heading}>{t('Transport services')}</Text>
          </View>
          {student.studentId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Add service in another shift')}
              onPress={() => setAddingService(true)}
              style={studentProfileTopStyles.addService}
            >
              <NoorIcon name="plus" size={15} color={C.green} />
              <Text style={studentProfileTopStyles.addServiceText}>
                {t('Add service in another shift')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={studentProfileTopStyles.servicePanel}>
          {services.length > 1 ? (
            <Choice
              label={t('Transport service')}
              value={student.id}
              onChange={setSelectedServiceId}
              options={services.map(item => ({
                value: item.id,
                label: `${t(
                  shifts.find(shift => shift.id === serviceShift(item))?.name ||
                    serviceShift(item),
                )} · ${item.routeName} · ${t(item.status)}`,
              }))}
            />
          ) : (
            <View style={studentProfileTopStyles.serviceIdentity}>
              <View style={studentProfileTopStyles.sectionIcon}>
                <NoorIcon name="clock" size={17} color={C.green} />
              </View>
              <View style={studentProfileTopStyles.serviceIdentityText}>
                <Text style={studentProfileTopStyles.serviceName}>
                  {t(selectedShift?.name || serviceShift(student))}
                </Text>
                <Text
                  numberOfLines={1}
                  style={studentProfileTopStyles.serviceRoute}
                >
                  {student.routeName}
                </Text>
              </View>
              <Pill value={student.status} />
            </View>
          )}
          <View style={studentProfileTopStyles.schedule}>
            <NoorIcon name="calendar" size={18} color={C.green} />
            <TransportScheduleSummary service={student} shifts={shifts} />
          </View>
        </View>
      </Box>
      <Box>
        <View style={studentProfileTopStyles.sectionTitle}>
          <View style={studentProfileTopStyles.sectionIcon}>
            <NoorIcon name="shield" size={18} color={C.green} />
          </View>
          <Heading title={t('Guardian')} />
        </View>
        <View style={studentProfileTopStyles.guardianGrid}>
          {guardianItems.map((item, index) => (
            <GuardianItem key={item.label} {...item} tone={index} />
          ))}
        </View>
      </Box>
      <Box>
        <Detail
          icon="payments"
          label={t('Monthly fee')}
          value={money(student.monthlyAmount)}
        />
        <Heading title={t('Payment summary')} />
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={s.muted}>{t('Paid')}</Text>
            <Text style={s.summaryValue}>{money(paid)}</Text>
          </View>
          <View style={[s.summary, s.dangerFill]}>
            <Text style={s.muted}>{t('Due')}</Text>
            <Text style={[s.summaryValue, s.red]}>{money(due)}</Text>
          </View>
        </View>
      </Box>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'PAYMENTS', label: t('Payment history') },
          { value: 'ATTENDANCE', label: t('Attendance') },
          { value: 'NOTICES', label: t('Notices') },
        ]}
      />
      <Box>
        {tab === 'PAYMENTS' ? (
          bills.length ? (
            bills.map(item => (
              <View key={item.id} style={s.tableRow}>
                <Text style={s.cell}>
                  {new Date(
                    `${item.month}-01T00:00:00+06:00`,
                  ).toLocaleDateString(locale(), {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Asia/Dhaka',
                  })}
                </Text>
                <Text style={s.body}>{money(item.amount)}</Text>
                <Pill value={item.status} />
              </View>
            ))
          ) : (
            <EmptyState text={t('No payment history yet')} />
          )
        ) : tab === 'ATTENDANCE' ? (
          attendance.length ? (
            attendance.map(item => (
              <View key={item.id} style={s.between}>
                <Text style={s.body}>{niceDate(item.date)}</Text>
                <Pill value={item.status} />
              </View>
            ))
          ) : (
            <EmptyState text={t('No attendance records')} />
          )
        ) : notices.length ? (
          notices.map(item => (
            <View key={item.id} style={s.stack}>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.muted}>{niceDate(item.createdAt)}</Text>
            </View>
          ))
        ) : (
          <EmptyState text={t('No notices')} />
        )}
      </Box>
      <StudentForm
        visible={addingService}
        existingStudent={student}
        onClose={() => setAddingService(false)}
      />
      <StudentForm
        visible={edit}
        student={student}
        onClose={() => setEdit(false)}
      />
    </AdminPage>
  );
}
