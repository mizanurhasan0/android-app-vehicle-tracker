import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Field, Select } from '../../components/ui';
import { NoorIcon } from '../../components/Noor';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { DeskTab } from './types';
export function AdminPaymentFilters({
  tab,
  searchMode,
  setSearchMode,
  query,
  setQuery,
  month,
  setMonth,
  months,
  status,
  setStatus,
  filtered,
}: {
  tab: DeskTab;
  searchMode: boolean;
  setSearchMode: (value: boolean) => void;
  query: string;
  setQuery: (value: string) => void;
  month: string;
  setMonth: (value: string) => void;
  months: string[];
  status: string;
  setStatus: (value: string) => void;
  filtered: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      {searchMode ? (
        <View style={desk.searchRow}>
          <View style={desk.searchField}>
            <Field
              label={t('Search records')}
              value={query}
              onChangeText={setQuery}
              placeholder={t(
                tab === 'bills'
                  ? 'Student or guardian name'
                  : 'Name, transaction ID or phone number',
              )}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={100}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Close search')}
            onPress={() => setSearchMode(false)}
            style={desk.iconButton}
          >
            <NoorIcon name="close" size={21} color={colors.primary} />
          </Pressable>
        </View>
      ) : (
        <>
          <View style={desk.filterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Search records')}
              onPress={() => setSearchMode(true)}
              style={desk.iconButton}
            >
              <NoorIcon name="search" size={21} color={colors.primary} />
            </Pressable>
            <View style={desk.monthControl}>
              <Select
                compact
                label={t('Billing month')}
                value={month || 'ALL'}
                onChange={value => setMonth(value === 'ALL' ? '' : value)}
                options={[
                  { value: 'ALL', label: t('All months') },
                  ...months.map(value => ({ value, label: value })),
                ]}
              />
            </View>
            <View style={desk.statusControl}>
              <Select
                compact
                label={t('Status')}
                value={status || 'ALL'}
                onChange={value => setStatus(value === 'ALL' ? '' : value)}
                options={[
                  { value: 'ALL', label: t('All') },
                  ...(tab === 'review'
                    ? [{ value: 'PENDING', label: t('Pending') }]
                    : tab === 'bills'
                    ? [
                        { value: 'UNPAID', label: t('Due') },
                        { value: 'PENDING', label: t('Pending') },
                        { value: 'PAID', label: t('Paid') },
                        { value: 'WAIVED', label: t('Waived') },
                      ]
                    : [
                        { value: 'APPROVED', label: t('Approved') },
                        { value: 'REJECTED', label: t('Rejected') },
                      ]),
                ]}
              />
            </View>
          </View>
          {filtered ? (
            <Button
              secondary
              title={t('Clear filters')}
              onPress={() => {
                setQuery('');
                setMonth('');
                setStatus('');
              }}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

const desk = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.mint,
    marginBottom: 0,
  },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  searchField: { flex: 1 },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  monthControl: { flex: 1, minWidth: 0 },
  statusControl: { width: 112, flexGrow: 0, flexShrink: 0 },
});
