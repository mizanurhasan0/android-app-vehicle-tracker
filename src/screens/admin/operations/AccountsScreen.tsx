import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { LedgerEntry } from '../../../api/management';
import { NoorIcon } from '../../../components/Noor';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { locale, useTranslation } from '../../../i18n';
import { currentMonth, money } from '../../../utils/format';
import { monthInDhaka } from '../reportUtils';
import { AdminPage, C, niceDate } from '../AdminUi';
import { categoryLabels } from './ledgerCategories';
import { LedgerForm } from './LedgerForm';

function moveMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale(), {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const accountTabs = ['INCOME', 'EXPENSE', 'INVESTMENT'] as const;

export function AccountsScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const { tab: initialTab } = (params || {}) as { tab?: LedgerEntry['type'] };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useCoreData();
  const [tab, setTab] = useState<LedgerEntry['type']>(initialTab || 'INCOME');
  const tabMotion = useRef(
    new Animated.Value(
      Math.max(0, accountTabs.indexOf(initialTab || 'INCOME')),
    ),
  ).current;
  const recordsMotion = useRef(new Animated.Value(1)).current;
  const previousTab = useRef(tab);
  const [tabWidth, setTabWidth] = useState(0);
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  useLayoutEffect(() => {
    if (previousTab.current === tab) return;
    previousTab.current = tab;
    Animated.timing(tabMotion, {
      toValue: accountTabs.indexOf(tab),
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    recordsMotion.setValue(0);
    Animated.timing(recordsMotion, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tab, tabMotion, recordsMotion]);
  const [month, setMonth] = useState(currentMonth);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(Number(month.slice(0, 4)));
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
  const net = income - expenses;
  const entries = ledger
    .filter(item => item.type === tab)
    .sort((a, b) => b.date.localeCompare(a.date));
  const hasFare = tab === 'INCOME' && fare > 0;
  const recordTitle =
    tab === 'INCOME'
      ? t('Income records')
      : tab === 'EXPENSE'
      ? t('Expense records')
      : t('Investment records');

  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <View style={styles.monthRow}>
        {([-1, 0, 1] as const).map(offset => {
          const value = moveMonth(month, offset);
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={
                offset < 0
                  ? `${t('Previous month')}: ${monthLabel(value)}`
                  : offset > 0
                  ? `${t('Next month')}: ${monthLabel(value)}`
                  : monthLabel(value)
              }
              accessibilityState={{ selected: offset === 0 }}
              onPress={() => {
                if (offset === 0) {
                  setPickerYear(Number(month.slice(0, 4)));
                  setMonthPickerOpen(true);
                } else {
                  setMonth(value);
                }
              }}
              style={({ pressed }) => [
                styles.monthChip,
                offset === 0 && styles.monthChipActive,
                pressed && styles.pressed,
              ]}
            >
              {offset === 0 ? (
                <NoorIcon name="calendar" size={15} color={C.white} />
              ) : null}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.monthText, offset === 0 && styles.white]}
              >
                {monthLabel(value)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceCopy}>
            <Text style={styles.eyebrow}>
              {net >= 0 ? t('Net profit') : t('Net loss')}
            </Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.balanceValue}
            >
              {money(Math.abs(net))}
            </Text>
            <Text style={styles.balanceMonth}>{monthLabel(month)}</Text>
          </View>
          <View style={styles.balanceIcon}>
            <NoorIcon
              name={net >= 0 ? 'income' : 'expense'}
              size={26}
              color={C.green}
            />
          </View>
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <View style={[styles.metricIcon, styles.incomeIcon]}>
              <NoorIcon name="income" size={17} color={C.green} />
            </View>
            <Text style={styles.metricLabel}>{t('Total income')}</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.metricValue}
            >
              {money(income)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <View style={[styles.metricIcon, styles.expenseIcon]}>
              <NoorIcon name="expense" size={17} color={C.red} />
            </View>
            <Text style={styles.metricLabel}>{t('Total expenses')}</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.metricValue}
            >
              {money(expenses)}
            </Text>
          </View>
        </View>
        {tab === 'INVESTMENT' ? (
          <View style={styles.investmentRow}>
            <Text style={styles.metricLabel}>{t('Total investment')}</Text>
            <Text style={styles.investmentValue}>
              {money(sum('INVESTMENT'))}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={styles.tabs}
        onLayout={event =>
          setTabWidth((event.nativeEvent.layout.width - 16) / 3)
        }
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabIndicator,
              {
                width: tabWidth,
                transform: [
                  {
                    translateX: Animated.multiply(tabMotion, tabWidth + 4),
                  },
                ],
              },
            ]}
          />
        ) : null}
        {accountTabs.map((value, index) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Animated.Text
              style={[
                styles.tabText,
                {
                  color: tabMotion.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: accountTabs.map((_, tabIndex) =>
                      tabIndex === index ? C.white : C.text,
                    ),
                  }),
                },
              ]}
            >
              {t(
                value === 'INCOME'
                  ? 'Income'
                  : value === 'EXPENSE'
                  ? 'Expense'
                  : 'Investment',
              )}
            </Animated.Text>
          </Pressable>
        ))}
      </View>

      <Animated.View
        style={[
          styles.recordsCard,
          {
            opacity: recordsMotion,
            transform: [
              {
                translateY: recordsMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.recordsHeader}>
          <View style={styles.recordHeading}>
            <Text accessibilityRole="header" style={styles.recordsTitle}>
              {recordTitle}
            </Text>
            <Text style={styles.recordsMonth}>{monthLabel(month)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('+ Add')}
            onPress={() => setAdding(true)}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
            ]}
          >
            <NoorIcon name="plus" size={18} color={C.white} />
            <Text style={styles.addText}>{t('Add')}</Text>
          </Pressable>
        </View>
        {hasFare ? (
          <View style={styles.entryRow}>
            <View style={[styles.entryIcon, styles.incomeIcon]}>
              <NoorIcon name="payments" size={19} color={C.green} />
            </View>
            <View style={styles.entryCopy}>
              <Text style={styles.entryTitle}>{t('Student fares')}</Text>
              <Text style={styles.entryMeta}>{t('Paid payments')}</Text>
            </View>
            <Text style={styles.entryAmount}>{money(fare)}</Text>
          </View>
        ) : null}
        {entries.map(item => (
          <View key={item.id} style={styles.entryRow}>
            <View
              style={[
                styles.entryIcon,
                item.type === 'EXPENSE'
                  ? styles.expenseIcon
                  : styles.incomeIcon,
              ]}
            >
              <NoorIcon
                name={item.type === 'EXPENSE' ? 'expense' : 'payments'}
                size={19}
                color={item.type === 'EXPENSE' ? C.red : C.green}
              />
            </View>
            <View style={styles.entryCopy}>
              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.entryMeta}>
                {Object.prototype.hasOwnProperty.call(
                  categoryLabels,
                  item.category,
                )
                  ? t(categoryLabels[item.category])
                  : item.category}{' '}
                · {niceDate(item.date)}
              </Text>
              {item.note ? (
                <Text style={styles.entryMeta}>{item.note}</Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.entryAmount,
                item.type === 'EXPENSE' && styles.expenseAmount,
              ]}
            >
              {money(item.amount)}
            </Text>
          </View>
        ))}
        {!entries.length && !hasFare ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <NoorIcon name="receipt" size={29} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {t('No account entries this month')}
            </Text>
            <Text style={styles.emptyDetail}>
              {t('Add an entry to start tracking this month.')}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <LedgerForm
        visible={adding}
        initialType={tab}
        onClose={() => setAdding(false)}
      />
      <Modal
        visible={monthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={t('Cancel')}
            onPress={() => setMonthPickerOpen(false)}
          />
          <View style={styles.monthPicker}>
            <View style={styles.pickerHeading}>
              <Text style={styles.pickerTitle}>{t('Select month')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
                onPress={() => setMonthPickerOpen(false)}
                style={styles.pickerClose}
              >
                <NoorIcon name="close" size={18} color={C.text} />
              </Pressable>
            </View>
            <View style={styles.yearRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Previous year')}
                onPress={() => setPickerYear(year => year - 1)}
                style={styles.yearArrow}
              >
                <NoorIcon name="chevronLeft" size={19} color={C.text} />
              </Pressable>
              <Text style={styles.yearLabel}>{pickerYear}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Next year')}
                onPress={() => setPickerYear(year => year + 1)}
                style={styles.yearArrow}
              >
                <NoorIcon name="chevron" size={19} color={C.text} />
              </Pressable>
            </View>
            <View style={styles.pickerGrid}>
              {Array.from({ length: 12 }, (_, index) => {
                const value = `${pickerYear}-${String(index + 1).padStart(
                  2,
                  '0',
                )}`;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={monthLabel(value)}
                    accessibilityState={{ selected: month === value }}
                    onPress={() => {
                      setMonth(value);
                      setMonthPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.pickerMonth,
                      month === value && styles.pickerMonthActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerMonthText,
                        month === value && styles.white,
                      ]}
                    >
                      {new Date(
                        Date.UTC(pickerYear, index, 1),
                      ).toLocaleDateString(locale(), {
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', gap: 7 },
  monthChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  monthChipActive: {
    flex: 1.17,
    backgroundColor: C.green,
    borderColor: C.green,
  },
  monthText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  white: { color: C.white },
  pressed: { opacity: 0.72 },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    padding: 16,
    gap: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: C.muted, fontSize: 13, fontWeight: '600' },
  balanceValue: {
    color: C.green,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 2,
  },
  balanceMonth: { color: C.muted, fontSize: 12, marginTop: 2 },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 13,
  },
  metric: { flex: 1, minWidth: 0, gap: 5 },
  metricDivider: { width: 1, backgroundColor: C.line, marginHorizontal: 13 },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIcon: { backgroundColor: C.mint },
  expenseIcon: { backgroundColor: '#FFF0F2' },
  metricLabel: { color: C.muted, fontSize: 11, fontWeight: '600' },
  metricValue: { color: C.text, fontSize: 18, fontWeight: '700' },
  investmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 11,
  },
  investmentValue: { color: C.text, fontSize: 14, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 13,
    backgroundColor: C.mint,
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 10,
    backgroundColor: C.green,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  recordsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    padding: 15,
    minHeight: 200,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recordHeading: { flex: 1, minWidth: 0 },
  recordsTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  recordsMonth: { color: C.muted, fontSize: 12, marginTop: 3 },
  addButton: {
    backgroundColor: C.green,
    minHeight: 37,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: { color: C.white, fontSize: 12, fontWeight: '700' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginTop: 12,
  },
  entryIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCopy: { flex: 1, minWidth: 0 },
  entryTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  entryMeta: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  entryAmount: {
    color: C.green,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  expenseAmount: { color: C.red },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 7,
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDetail: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 27, 45, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  monthPicker: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: C.white,
    padding: 18,
    gap: 18,
  },
  pickerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  pickerClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: { color: C.text, fontSize: 18, fontWeight: '700' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerMonth: {
    width: '22%',
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerMonthActive: { backgroundColor: C.green },
  pickerMonthText: { color: C.text, fontSize: 12, fontWeight: '600' },
});
