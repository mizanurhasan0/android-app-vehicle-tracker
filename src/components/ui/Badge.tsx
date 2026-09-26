import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import { readable } from '../../utils/format';
import { useTranslation } from '../../i18n';

export function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  const positive = [
    'PAID',
    'WAIVED',
    'APPROVED',
    'ACTIVE',
    'RESOLVED',
    'live',
  ].includes(status);
  const negative = ['REJECTED', 'STOPPED', 'offline'].includes(status);
  return (
    <View
      style={[
        ui.badge,
        positive ? ui.positive : negative ? ui.error : ui.pending,
      ]}
    >
      <Text
        style={[
          ui.badgeText,
          {
            color: positive
              ? colors.primary
              : negative
              ? colors.danger
              : colors.amber,
          },
        ]}
      >
        {status === 'PENDING' ? t('Awaiting review') : readable(status)}
      </Text>
    </View>
  );
}

const ui = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  positive: { backgroundColor: colors.mint },
  error: { backgroundColor: '#FBEAEC' },
  pending: { backgroundColor: '#FFF2D9' },
});
