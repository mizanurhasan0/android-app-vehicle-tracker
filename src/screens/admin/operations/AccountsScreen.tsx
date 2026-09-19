import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { LedgerEntry } from '../../../api/management';
import { NoorIcon } from '../../../components/Noor';
import { useManagement } from '../../../context/ManagementContext';
import { useData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { currentMonth, money } from '../../../utils/format';
import { monthInDhaka } from '../reportUtils';
import {
  AdminPage,
  Box,
  C,
  Detail,
  EmptyState,
  Heading,
  Input,
  Tabs,
  niceDate,
  s,
} from '../AdminUi';
import { categoryLabels } from './ledgerCategories';
import { LedgerForm } from './LedgerForm';

export function AccountsScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const { tab: initialTab } = (params || {}) as { tab?: LedgerEntry['type'] };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [tab, setTab] = useState<LedgerEntry['type']>(initialTab || 'INCOME');
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const [month, setMonth] = useState(currentMonth);
  const [adding, setAdding] = useState(false);
  const ledger = (data?.ledger || []).filter(item =>
    item.date.startsWith(month),
  );
  const sum = (type: LedgerEntry['type']) =>
    ledger
      .filter(item => item.type === type)
      .reduce((total, item) => total + item.amount, 0);
  const fare = transport.bills
    .filter(
      item => item.status === 'PAID' && monthInDhaka(item.paidAt) === month,
    )
    .reduce((total, item) => total + item.amount, 0);
  const income = sum('INCOME') + fare;
  const expenses = sum('EXPENSE');
  const entries = ledger
    .filter(item => item.type === tab)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Input
        label={t('Month (YYYY-MM)')}
        value={month}
        onChangeText={setMonth}
        maxLength={7}
      />
      <Box>
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={s.muted}>{t('Total income')}</Text>
            <Text style={s.summaryValue}>{money(income)}</Text>
          </View>
          <View style={[s.summary, s.dangerFill]}>
            <Text style={s.muted}>{t('Total expenses')}</Text>
            <Text style={[s.summaryValue, s.red]}>{money(expenses)}</Text>
          </View>
        </View>
        <View style={s.profit}>
          <Text style={s.white}>
            {income - expenses >= 0 ? t('Net profit') : t('Net loss')}
          </Text>
          <Text style={[s.summaryValue, s.white]}>
            {money(income - expenses)}
          </Text>
        </View>
        {tab === 'INVESTMENT' ? (
          <Detail
            label={t('Total investment')}
            value={money(sum('INVESTMENT'))}
          />
        ) : null}
      </Box>
      <Tabs
        value={tab}
        onChange={v => setTab(v as LedgerEntry['type'])}
        options={[
          { value: 'INCOME', label: t('Income') },
          { value: 'EXPENSE', label: t('Expense') },
          { value: 'INVESTMENT', label: t('Investment') },
        ]}
      />
      <Box>
        <Heading
          title={
            tab === 'INCOME'
              ? t('Income records')
              : tab === 'EXPENSE'
              ? t('Expense records')
              : t('Investment records')
          }
          action={t('+ Add')}
          onAction={() => setAdding(true)}
        />
        {tab === 'INCOME' && fare > 0 ? (
          <View style={s.tableRow}>
            <NoorIcon name="payments" size={20} color={C.green} />
            <View style={s.flex}>
              <Text style={s.body}>{t('Student fares')}</Text>
              <Text style={s.muted}>{t('Paid payments')}</Text>
            </View>
            <Text style={[s.body, s.green]}>{money(fare)}</Text>
          </View>
        ) : null}
        {entries.map(item => (
          <View key={item.id} style={s.tableRow}>
            <NoorIcon
              name={item.type === 'EXPENSE' ? 'expense' : 'payments'}
              size={20}
              color={item.type === 'EXPENSE' ? C.red : C.green}
            />
            <View style={s.flex}>
              <Text style={s.body}>{item.title}</Text>
              <Text style={s.muted}>
                {Object.prototype.hasOwnProperty.call(
                  categoryLabels,
                  item.category,
                )
                  ? t(categoryLabels[item.category])
                  : item.category}{' '}
                · {niceDate(item.date)}
              </Text>
              {item.note ? <Text style={s.muted}>{item.note}</Text> : null}
            </View>
            <Text style={[s.body, tab === 'EXPENSE' ? s.red : s.green]}>
              {money(item.amount)}
            </Text>
          </View>
        ))}
        {!entries.length && !(tab === 'INCOME' && fare > 0) ? (
          <EmptyState text={t('No account entries this month')} />
        ) : null}
      </Box>
      <LedgerForm
        visible={adding}
        initialType={tab}
        onClose={() => setAdding(false)}
      />
    </AdminPage>
  );
}
