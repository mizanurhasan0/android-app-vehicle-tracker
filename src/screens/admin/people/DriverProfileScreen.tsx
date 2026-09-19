import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { currentMonth, money } from '../../../utils/format';
import {
  AdminPage,
  Avatar,
  Box,
  ContactActions,
  Detail,
  EmptyState,
  Heading,
  Pill,
  Tabs,
  niceDate,
  s,
} from '../AdminUi';
import { DriverForm } from './DriverForm';

export function DriverProfileScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const { id } = (params || {}) as { id?: string };
  const { data, loading, error, refresh } = useManagement();
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('ATTENDANCE');
  const driver = data?.drivers.find(item => item.id === id);
  if (!driver)
    return (
      <AdminPage loading={loading} error={error} refresh={refresh}>
        <EmptyState
          text={loading ? t('Loading driver...') : t('Driver not found')}
        />
      </AdminPage>
    );
  const attendance = (data?.attendance || [])
    .filter(item => item.driverId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const salaries = (data?.ledger || []).filter(
    item =>
      item.driverId === id &&
      item.type === 'EXPENSE' &&
      item.category === 'SALARY',
  );
  const salaryPaidThisMonth = salaries
    .filter(item => item.date.startsWith(currentMonth()))
    .reduce((sum, item) => sum + item.amount, 0);
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <View style={s.row}>
          <Avatar name={driver.name} driver />
          <View style={s.flex}>
            <Text style={s.title}>{driver.name}</Text>
            <Text style={s.muted}>
              {t('ID: {{id}}', { id: driver.id.slice(0, 8).toUpperCase() })}
            </Text>
          </View>
          <Pill value={driver.status} />
        </View>
        <Detail icon="phone" label={t('Mobile')} value={driver.phone} />
        <Detail icon="students" label={t('NID')} value={driver.nid} />
        <Detail icon="location" label={t('Address')} value={driver.address} />
        <Detail
          icon="calendar"
          label={t('Joining date')}
          value={niceDate(driver.joiningDate)}
        />
        <View style={s.line} />
        <Heading title={t('Assigned vehicle')} />
        <Detail
          icon="vehicles"
          label={t('Vehicle')}
          value={driver.vehicleName}
        />
        <Detail icon="routes" label={t('Route')} value={driver.routeName} />
        <Detail
          icon="payments"
          label={t('Monthly salary')}
          value={money(driver.monthlySalary)}
        />
        <Detail
          label={t('Salary paid this month')}
          value={money(salaryPaidThisMonth)}
        />
        <Detail
          icon="calendar"
          label={t('Last salary payment')}
          value={niceDate(
            [...salaries].sort((a, b) => b.date.localeCompare(a.date))[0]?.date,
          )}
        />
        <ContactActions phone={driver.phone} onEdit={() => setEdit(true)} />
      </Box>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ATTENDANCE', label: t('Attendance') },
          { value: 'SALARY', label: t('Salary history') },
          { value: 'LEAVE', label: t('Leave') },
        ]}
      />
      <Box>
        {tab === 'SALARY' ? (
          salaries.length ? (
            salaries.map(item => (
              <View style={s.tableRow} key={item.id}>
                <Text style={s.cell}>{niceDate(item.date)}</Text>
                <Text style={s.body}>{money(item.amount)}</Text>
                <Pill value="PAID" />
              </View>
            ))
          ) : (
            <EmptyState
              text={t('No salary payment records')}
              detail={t(
                'Driver salary payments added in Income and expenses will appear here.',
              )}
            />
          )
        ) : attendance.filter(
            item => tab !== 'LEAVE' || item.status === 'LEAVE',
          ).length ? (
          attendance
            .filter(item => tab !== 'LEAVE' || item.status === 'LEAVE')
            .map(item => (
              <View key={item.id} style={s.between}>
                <Text style={s.body}>{niceDate(item.date)}</Text>
                <Pill value={item.status} />
              </View>
            ))
        ) : (
          <EmptyState text={t('No records')} />
        )}
      </Box>
      <DriverForm
        driver={driver}
        visible={edit}
        onClose={() => setEdit(false)}
      />
    </AdminPage>
  );
}
