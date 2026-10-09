import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CalendarDays, ListFilter, Search, X } from 'lucide-react-native';
import { Select } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { DeskTab } from './types';

export function AdminPaymentFilters({
  tab,
  query,
  setQuery,
  month,
  setMonth,
  months,
  status,
  setStatus,
  showClear,
}: {
  tab: DeskTab;
  query: string;
  setQuery: (value: string) => void;
  month: string;
  setMonth: (value: string) => void;
  months: string[];
  status: string;
  setStatus: (value: string) => void;
  showClear: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={filterStyles.container}>
      <View style={filterStyles.search}>
        <Search size={19} color={colors.primary} />
        <TextInput
          accessibilityLabel={t('Search records')}
          value={query}
          onChangeText={setQuery}
          placeholder={t(
            tab === 'bills'
              ? 'Student or guardian name'
              : 'Name, transaction ID or phone number',
          )}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxLength={100}
          style={filterStyles.searchInput}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Clear search')}
            onPress={() => setQuery('')}
            style={filterStyles.clearSearch}
          >
            <X size={17} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <View style={filterStyles.controls}>
        <View style={filterStyles.control}>
          <Select
            compact
            filterCard
            hideLabel
            leadingIcon={<CalendarDays size={18} color={colors.primary} />}
            label={t('Billing month')}
            value={month || 'ALL'}
            onChange={value => setMonth(value === 'ALL' ? '' : value)}
            options={[
              { value: 'ALL', label: t('All months') },
              ...months.map(value => ({ value, label: value })),
            ]}
          />
        </View>
        <View style={filterStyles.control}>
          <Select
            compact
            filterCard
            hideLabel
            leadingIcon={<ListFilter size={18} color={colors.primary} />}
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
      {showClear ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setQuery('');
            setMonth('');
            setStatus('');
          }}
          style={filterStyles.clearFilters}
        >
          <Text style={filterStyles.clearFiltersText}>
            {t('Clear filters')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const filterStyles = StyleSheet.create({
  container: { gap: 8 },
  search: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    padding: 0,
    color: colors.ink,
    fontSize: 13,
  },
  clearSearch: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: { flexDirection: 'row', gap: 8 },
  control: { flex: 1, minWidth: 0 },
  clearFilters: {
    alignSelf: 'flex-end',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  clearFiltersText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
