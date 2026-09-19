import { TransportScheduleSummary } from '../../../components/TransportSchedule';
import {
  serviceShift,
  studentIdentity,
  transportShifts,
} from '../../../utils/transport';
import { NoorIcon } from '../../../components/Noor';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useData } from '../../../context/DataContext';
import { locale, useTranslation } from '../../../i18n';
import { money } from '../../../utils/format';
import {
  AdminPage,
  Box,
  C,
  Choice,
  ContactActions,
  Detail,
  EmptyState,
  Heading,
  Pill,
  Tabs,
  niceDate,
  s,
} from '../AdminUi';
import { StudentPhoto } from './StudentPhoto';
import { StudentForm } from './StudentForm';

const studentProfileTopStyles = StyleSheet.create({
  transportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  transportHeaderRight: {
    alignItems: 'flex-end',
    gap: 3,
    flexShrink: 1,
  },
  servicePanel: {
    gap: 10,
    padding: 10,
    borderRadius: 9,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.line,
  },
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
  profileActions: { alignItems: 'flex-end', gap: 8 },
});

export function StudentProfileScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const { id } = (params || {}) as { id?: string };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [edit, setEdit] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const [tab, setTab] = useState('PAYMENTS');
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
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <View style={studentProfileTopStyles.transportHeader}>
          <Text style={s.heading}>{t('Transport services')}</Text>
          <View style={studentProfileTopStyles.transportHeaderRight}>
            <Pill value={student.status} />
            {student.studentId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Add service in another shift')}
                onPress={() => setAddingService(true)}
                style={s.linkHit}
              >
                <Text style={s.link}>{t('Add service in another shift')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={studentProfileTopStyles.servicePanel}>
          <Choice
            label={t('Transport service')}
            value={student.id}
            onChange={setSelectedServiceId}
            options={services.map(item => ({
              value: item.id,
              label: `${t(
                transportShifts(data?.settings).find(
                  shift => shift.id === serviceShift(item),
                )?.name || serviceShift(item),
              )} · ${item.routeName} · ${t(item.status)}`,
            }))}
          />
          <View style={studentProfileTopStyles.schedule}>
            <NoorIcon name="calendar" size={18} color={C.green} />
            <TransportScheduleSummary
              service={student}
              shifts={transportShifts(data?.settings)}
            />
          </View>
        </View>
        <View style={studentProfileTopStyles.profileHeader}>
          <View style={studentProfileTopStyles.profileIdentity}>
            <StudentPhoto student={student} />
            <View style={studentProfileTopStyles.identityText}>
              <Text style={s.title}>{student.studentName}</Text>
              <Text style={s.body}>{student.studentCode || '—'}</Text>
              <Text style={s.muted}>
                {t('Class {{className}} | Roll: {{roll}}', {
                  className:
                    student.className.replace(/^\s*class\s+/i, '') || '—',
                  roll: student.roll || '—',
                })}
              </Text>
            </View>
          </View>
          <View style={studentProfileTopStyles.profileActions}>
            <ContactActions
              phone={student.guardianPhone}
              onEdit={() => setEdit(true)}
              compact
            />
          </View>
        </View>
        <View style={s.line} />
        <Heading title={t('Guardian')} />
        <Text style={s.body}>{student.guardianName}</Text>
        <Detail
          icon="mobile"
          label={t('Mobile')}
          value={student.guardianPhone}
        />
        <Detail
          icon="address"
          label={t('Address')}
          value={student.pickupAddress || student.stopName}
        />
        <Detail icon="routes" label={t('Route')} value={student.routeName} />
        <Detail
          icon="pin"
          label={t('Boarding stop')}
          value={student.stopName}
        />
        <Detail
          icon="vehicles"
          label={t('Vehicle')}
          value={student.vehicleName}
        />
        <Detail icon="drivers" label={t('Driver')} value={student.driverName} />
        <Detail
          icon="dropoff"
          label={t('Drop-off stop')}
          value={student.dropoffStopName || student.dropAddress}
        />
        <Detail
          icon="emergency"
          label={t('Emergency contact')}
          value={student.emergencyContact}
        />
        <View style={s.line} />
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
